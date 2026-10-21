// Jalon 4, étape 4.4 — vérification du déploiement sur la prod (bibliothèque Playwright, session anonyme réelle créée par l'appli,
// aucun raccourci de démo, aucune interception). Un parcours par histoire qui appelle le serveur :
//   01 enregistrement en roulant (positions du GPX rejouées 75 s sur la N88) arrêté puis calculé par trajet-roule → historique « enregistré » ;
//   02 Prix à Londres : stations britanniques, fiche en pence/L et en € ;
//   03 trajet Albi → Londres (estimer-trajet) : Royaume-Uni au prix du jour, Manche non comptée.
// Toutes les requêtes vers le serveur (functions/v1, rest/v1, auth/v1) sont relevées ; le trajet créé est supprimé.
//   node tests/e2e/exploration/m4-deploy-verify.mjs
import { chromium, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { OPTIONS_CONTEXTE, URL_APP, env, rest, session, virgule, ouvrirTrajets, choisirVoiture, lireResultat, LONDRES, lireGpx, indexAuKm, demarrerRejeu, attendreFinRejeu, accorderVerrouEcran, lancerEnregistrement, arreterEtAttendre, champ, propositions } from "./m4-aides.mjs";

const ICI = path.dirname(fileURLToPath(import.meta.url));
const LIVRAISON = path.resolve(ICI, "../delivery");
const heure = () => new Date().toISOString().slice(11, 19) + "Z";
const log = (...a) => console.log(`[${heure()}]`, ...a);
const requetes = [];
function surveiller(page, etiquette) {
  page.on("response", (r) => {
    const u = r.url();
    if (/\/(functions|rest|auth)\/v1\//.test(u)) requetes.push({ etiquette, statut: r.status(), methode: r.request().method(), url: u.replace(/\?.*/, "").replace(env.VITE_SUPABASE_URL, "") });
  });
  page.on("pageerror", (e) => log(`${etiquette} : erreur de page`, e.message.slice(0, 160)));
}
const constats = { url: URL_APP };
const navigateur = await chromium.launch();

// 01 — enregistrer en roulant, arrêter, voir le coût, retrouver le trajet « enregistré » dans l'historique
{
  const PTS = lireGpx();
  const KM5 = indexAuKm(PTS, 5);
  const C = await navigateur.newContext({ ...OPTIONS_CONTEXTE, geolocation: { latitude: PTS[KM5].lat, longitude: PTS[KM5].lon } });
  const p = await C.newPage();
  surveiller(p, "enregistrement");
  await ouvrirTrajets(p);
  await accorderVerrouEcran(C, p);
  await choisirVoiture(p);
  await lancerEnregistrement(p);
  const r = demarrerRejeu(C, PTS, { debut: KM5 + 1, fin: KM5 + 76 });
  await attendreFinRejeu(r);
  await arreterEtAttendre(p);
  await expect(p.locator('[data-screen="S4"][data-etat="ok"]')).toBeVisible();
  const res = await lireResultat(p);
  expect(res.route).toMatch(/· ENREGISTRÉ$/i);
  await expect(p.locator('[data-el="courbe-vitesse"]')).toContainText("Ma vitesse enregistrée");
  await p.locator('[data-el="retour-trajets"]').click();
  const ligne = p.locator('[data-el="ligne-historique"]').first();
  await expect(ligne).toContainText("enregistré");
  const s = await session(p);
  const base = await rest("trajets?select=id,depart_label,arrivee_label,km,litres,cout,enregistre&order=cree_le.desc&limit=5", s.jeton);
  expect(base[0].enregistre).toBe(true);
  constats.enregistrement = { route: res.route, cout: res.cout, km: res.km, litres: res.litres, historique: (await ligne.innerText()).replace(/\s+/g, " "), base: base[0], session: s.userId ? "anonyme réelle" : "aucune" };
  await p.screenshot({ path: path.join(LIVRAISON, "m4-deploy-verify-01.png") });
  const del = await fetch(`${env.VITE_SUPABASE_URL}/rest/v1/trajets?id=eq.${base[0].id}`, { method: "DELETE", headers: { apikey: env.VITE_SUPABASE_ANON_KEY, Authorization: `Bearer ${s.jeton}`, Prefer: "return=representation" } });
  constats.menage = { trajet: base[0].id, statut: del.status, supprimes: (await del.json()).length, restants: (await rest(`trajets?select=id&id=eq.${base[0].id}`, s.jeton)).length };
  log("01", JSON.stringify(constats.enregistrement), JSON.stringify(constats.menage));
  await C.close();
}

// 02 — Prix à Londres : stations britanniques, fiche en pence/L et en €
{
  const C = await navigateur.newContext({ ...OPTIONS_CONTEXTE, geolocation: LONDRES });
  const p = await C.newPage();
  surveiller(p, "Londres");
  await p.goto(`${URL_APP}/`);
  const lignes = p.locator('[data-el="ligne-station"]');
  await expect(lignes.first()).toBeVisible({ timeout: 30000 });
  const ids = await lignes.evaluateAll((l) => l.map((x) => x.getAttribute("data-station")));
  expect(ids.every((i) => i.startsWith("GB-"))).toBe(true);
  await lignes.first().click();
  const fiche = p.locator('[data-el="fiche-station"]');
  await expect(fiche.locator('[data-el="prix-origine"]')).toContainText("p/L", { timeout: 15000 });
  await expect(fiche.locator('[data-el="cours-du-jour"]')).toContainText("1 € =");
  constats.londres = { stations: ids.length, fiche: (await fiche.locator('[data-el="prix-origine"]').innerText()).replace(/\s+/g, " "), cours: (await fiche.locator('[data-el="cours-du-jour"]').innerText()).replace(/\s+/g, " ") };
  await p.screenshot({ path: path.join(LIVRAISON, "m4-deploy-verify-02.png") });
  log("02", JSON.stringify(constats.londres));
  await C.close();
}

// 03 — trajet Albi → Londres
{
  const C = await navigateur.newContext({ ...OPTIONS_CONTEXTE });
  const p = await C.newPage();
  surveiller(p, "Albi → Londres");
  await ouvrirTrajets(p);
  await champ(p, "depart").pressSequentially("Albi", { delay: 40 });
  await propositions(p, "depart").filter({ hasText: "Albi" }).first().click();
  await champ(p, "arrivee").pressSequentially("Londres", { delay: 40 });
  const o = propositions(p, "arrivee").filter({ hasText: "Royaume-Uni" }).first();
  await expect(o).toContainText("Londres");
  await o.click();
  await choisirVoiture(p);
  await p.locator("#bouton-calculer").click();
  await expect(p.locator('[data-screen="S4"][data-etat="ok"]')).toBeVisible({ timeout: 90000 });
  const res = await lireResultat(p);
  const gb = p.locator('[data-el="pays-traverses"] [data-pays="GB"]');
  await expect(gb).toContainText("Royaume-Uni");
  await expect(p.locator('[data-el="manche-non-comptee"]')).toBeVisible();
  constats.londresTrajet = { route: res.route, cout: res.cout, km: res.km, gb: (await gb.innerText()).replace(/\s+/g, " ") };
  await gb.scrollIntoViewIfNeeded();
  await p.screenshot({ path: path.join(LIVRAISON, "m4-deploy-verify-03.png") });
  // ce calcul est enregistré dans l'historique de la session de test : supprimé
  const s = await session(p);
  const del = await fetch(`${env.VITE_SUPABASE_URL}/rest/v1/trajets?user_id=eq.${s.userId}`, { method: "DELETE", headers: { apikey: env.VITE_SUPABASE_ANON_KEY, Authorization: `Bearer ${s.jeton}`, Prefer: "return=representation" } });
  constats.menage03 = { statut: del.status, supprimes: (await del.json()).length };
  log("03", JSON.stringify(constats.londresTrajet), JSON.stringify(constats.menage03));
  await C.close();
}
await navigateur.close();
const nonOk = requetes.filter((r) => r.statut < 200 || r.statut >= 300);
constats.requetes = { total: requetes.length, parCode: requetes.reduce((m, r) => ((m[r.statut] = (m[r.statut] ?? 0) + 1), m), {}), nonOk, fonctions: [...new Set(requetes.filter((r) => r.url.includes("/functions/v1/")).map((r) => `${r.url.split("/").pop()} ${r.statut}`))] };
constats.verdict = nonOk.length === 0 ? "PASS" : "FAIL";
console.log(JSON.stringify(constats, null, 1));
