// Vérification du déploiement du jalon 3 sur la prod (bibliothèque Playwright, vraie session, aucune interception) :
// 1) prix d'un pays européen (Barcelone), 2) trajet Albi → Barcelone avec péages, 3) écran Moteurs en administrateur ÉPHÉMÈRE (supprimé en fin).
// Relève toutes les réponses du serveur (functions/v1, rest/v1) : un code hors 2xx fait échouer la vérification.
// Usage : node tests/e2e/exploration/m3-deploy-verify.mjs
import { chromium } from "playwright";
import { expect } from "@playwright/test";
import path from "node:path";
import {
  BARCELONE, OPTIONS_CONTEXTE, RACINE, URL_APP, adminsEphemeresRestants, calculer, carte, choisirVoiture, connecterAdmin, creerAdminEphemere, etatCarte, lignesListe,
  ouvrirMoteurs, ouvrirTrajets, propositions, champ, saisirLieu, supprimerAdminsEphemeres,
} from "./m3-aides.mjs";

const capture = (n) => path.join(RACINE, `tests/e2e/delivery/m3-deploy-verify-0${n}.png`);
const reponses = [];
const echecs = [];
const suivre = (page) => {
  page.on("response", (r) => {
    const u = new URL(r.url());
    if (/\/(functions|rest)\/v1\//.test(u.pathname)) reponses.push({ methode: r.request().method(), statut: r.status(), chemin: u.pathname });
  });
  page.on("requestfailed", (r) => { if (/\/(functions|rest)\/v1\//.test(r.url())) echecs.push({ chemin: new URL(r.url()).pathname, erreur: r.failure()?.errorText }); });
};

const navigateur = await chromium.launch();
let verdict = "FAIL";
try {
  // 1) Barcelone : stations espagnoles du flux officiel
  const c1 = await navigateur.newContext({ ...OPTIONS_CONTEXTE, geolocation: BARCELONE });
  const p1 = await c1.newPage();
  suivre(p1);
  await p1.goto(`${URL_APP}/`);
  await p1.locator('[data-el="selecteur-carburant"] button', { hasText: "Gazole" }).click();
  await expect(p1.locator('[data-el="liste-stations"]')).toHaveAttribute("data-carburant", "Gazole", { timeout: 20000 });
  await expect(p1.locator('[data-el="ligne-station"]').first()).toBeVisible({ timeout: 20000 });
  const ids = await p1.locator('[data-el="ligne-station"]').evaluateAll((els) => els.map((e) => e.getAttribute("data-station")));
  expect(ids.length).toBeGreaterThan(10);
  expect(ids.every((i) => i.startsWith("ES-"))).toBe(true);
  await expect(p1.locator('[data-el="ecart"]').first()).toContainText("vs Espagne");
  await p1.screenshot({ path: capture(1) });
  console.log(`1) Barcelone : ${ids.length} stations ES, 1re ${ids[0]}, écart « vs Espagne »`);
  await c1.close();

  // 2) Albi → Barcelone : pays traversés et péages
  const c2 = await navigateur.newContext(OPTIONS_CONTEXTE);
  const p2 = await c2.newPage();
  suivre(p2);
  await ouvrirTrajets(p2);
  await saisirLieu(p2, "depart", "Albi", "Albi");
  await champ(p2, "arrivee").pressSequentially("Barce", { delay: 40 });
  const o = propositions(p2, "arrivee").filter({ hasText: "Barcelone" }).filter({ hasText: "Espagne" }).first();
  await expect(o).toBeVisible({ timeout: 20000 });
  await o.click();
  await choisirVoiture(p2);
  await calculer(p2);
  const pays = (await lignesListe(p2, "pays-traverses")).map((l) => l.pays);
  expect(pays).toEqual(["FR", "ES"]);
  await expect(p2.locator('[data-el="peages-indisponibles"]')).toHaveCount(0);
  const peages = await lignesListe(p2, "detail-peages");
  const total = peages.find((x) => /Total péages/.test(x.texte))?.montant;
  expect(total).toMatch(/^\d+,\d{2} €$/);
  await p2.locator('[data-el="detail-peages"]').scrollIntoViewIfNeeded();
  await p2.screenshot({ path: capture(2) });
  console.log(`2) Albi → Barcelone : pays ${pays.join(" → ")}, total péages ${total}, ${peages.length} lignes`);
  await c2.close();

  // 3) écran Moteurs, administrateur éphémère (lien magique réel), test de l'itinéraire (Stadia, aucun appel PTV)
  const email = await creerAdminEphemere();
  const c3 = await navigateur.newContext(OPTIONS_CONTEXTE);
  const p3 = await c3.newPage();
  suivre(p3);
  await connecterAdmin(p3, { vers: "accueil", email });
  await ouvrirMoteurs(p3);
  await expect(etatCarte(p3, "peages")).not.toHaveText("Test en cours…");
  await carte(p3, "itineraire").locator('[data-el="tester-connexion-itineraire"]').click();
  await expect(etatCarte(p3, "itineraire")).toContainText("Connecté · test Albi → Toulouse OK", { timeout: 40000 });
  await expect(carte(p3, "peages").locator('[data-el="choix-fournisseur"]')).toHaveValue("ptv");
  await p3.screenshot({ path: capture(3), fullPage: true });
  console.log(`3) Moteurs (${email.replace(/@.*/, "@…")}) : 6 cartes, péages ptv, itinéraire « ${await etatCarte(p3, "itineraire").innerText()} »`);
  await c3.close();

  const hors2xx = reponses.filter((r) => r.statut < 200 || r.statut > 299);
  const parCode = reponses.reduce((m, r) => ({ ...m, [r.statut]: (m[r.statut] ?? 0) + 1 }), {});
  console.log(`requêtes serveur : ${reponses.length}, codes ${JSON.stringify(parCode)}, échecs réseau ${echecs.length}`);
  const parChemin = reponses.reduce((m, r) => ({ ...m, [`${r.methode} ${r.chemin}`]: (m[`${r.methode} ${r.chemin}`] ?? 0) + 1 }), {});
  for (const [k, n] of Object.entries(parChemin)) console.log(`   ${n} × ${k}`);
  if (hors2xx.length || echecs.length) console.log("HORS 2xx :", JSON.stringify(hors2xx), JSON.stringify(echecs));
  else verdict = "PASS";
} finally {
  await navigateur.close();
  await supprimerAdminsEphemeres();
  console.log(`administrateurs éphémères restants : ${await adminsEphemeresRestants()}`);
  console.log(`VERDICT ${verdict}`);
}
