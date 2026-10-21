// Jalon 4, étape 4.4 — preuves en direct des correctifs post-audit (round 1) et captures refaites, sur l'appli DÉPLOYÉE.
//   node tests/e2e/exploration/m4-correctifs.mjs
// • M1 : un enregistrement en attente de reprise ; « Enregistrer en roulant » est désactivé, le toucher n'écrase rien.
// • M3 : l'écran En route dit que ses litres et son € sont sans les montées.
// • LOW 10 : tant que le navigateur n'a pas répondu à la demande de verrou, l'écran ne prétend pas qu'il reste allumé.
// • M2 : le trajet Albi → Toulouse COMPLET est calculé par l'appli (positions du GPX injectées dans l'enregistrement en cours gardé
//   sur le téléphone, puis « Arrêter » du bandeau de reprise) : montée tirée de l'altitude, à comparer aux 586 m d'avant.
//   C'est le même chemin que la reprise US-6.E3 ; le rejeu en temps réel des 73 min est déjà prouvé par l'exploration (run-m4.mjs).
// • Captures refaites : US-6.6-02 (bloc « Ma vitesse enregistrée » + note), US-1.9-01 (Prix à Londres), US-1.9-02 (carte, liste, fiche).
// Chaque capture = deux vraies prises de vue : livraison (tests/e2e/delivery/) et brute (m4-captures-brutes/). Le trajet créé est supprimé.
import { chromium } from "@playwright/test";
import { expect } from "@playwright/test";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { OPTIONS_CONTEXTE, URL_APP, env, rest, session, virgule, ouvrirTrajets, attendreFormulaire, choisirVoiture, lireResultat, LONDRES, lireGpx, accorderVerrouEcran, S6, lancerEnregistrement } from "./m4-aides.mjs";

const ICI = path.dirname(fileURLToPath(import.meta.url));
const RACINE = path.resolve(ICI, "../../..");
const LIVRAISON = path.join(RACINE, "tests/e2e/delivery");
const BRUTES = path.join(ICI, "m4-captures-brutes");
const PREUVES = process.env.PREUVES ?? "/tmp/m4fix";
fs.mkdirSync(PREUVES, { recursive: true });
const md5 = (b) => crypto.createHash("md5").update(b).digest("hex");
const heure = () => new Date().toISOString().slice(11, 19) + "Z";
const log = (...a) => console.log(`[${heure()}]`, ...a);

const navigateur = await chromium.launch();
const requetes = [];
function surveiller(page, etiquette) {
  page.on("response", (r) => {
    const u = r.url();
    if (/\/(functions|rest|auth)\/v1\//.test(u)) requetes.push({ etiquette, statut: r.status(), methode: r.request().method(), url: u.replace(/\?.*/, "").replace(env.VITE_SUPABASE_URL, "") });
  });
  page.on("pageerror", (e) => log(`${etiquette} : erreur de page`, e.message.slice(0, 160)));
}
async function capture(page, nom, opts = {}) {
  await page.waitForTimeout(300);
  const brute = await page.screenshot(opts);
  const liv = await page.screenshot(opts);
  fs.writeFileSync(path.join(BRUTES, nom), brute);
  fs.writeFileSync(path.join(LIVRAISON, nom), liv);
  log(`capture ${nom} : livrée ${md5(liv).slice(0, 8)}, brute ${md5(brute).slice(0, 8)}`);
}
/** Cadre (coordonnées de la page) englobant les éléments donnés, marge comprise. */
async function cadre(page, selecteurs, marge = 12) {
  return page.evaluate(([s, m]) => {
    const r = s.map((x) => document.querySelector(x).getBoundingClientRect());
    const haut = Math.max(0, Math.min(...r.map((x) => x.top)) - m);
    const bas = Math.max(...r.map((x) => x.bottom)) + m;
    return { x: 0, y: haut, width: document.documentElement.clientWidth, height: bas - haut };
  }, [selecteurs, marge]);
}
const constats = {};

// ---------------------------------------------------------------- A. M3, LOW 10, M1, M2, US-6.6-02
{
  const PTS = lireGpx();
  const C = await navigateur.newContext({ ...OPTIONS_CONTEXTE, geolocation: { latitude: PTS[0].lat, longitude: PTS[0].lon } });
  const p = await C.newPage();
  surveiller(p, "enregistrement");
  // LOW 10 : la demande de verrou reste sans réponse (navigator.wakeLock.request ne se résout jamais) → état « attente »
  // MOCKED: aucun navigateur réel ne permet de suspendre la réponse du verrou d'écran sur commande
  await p.addInitScript(() => {
    if (sessionStorage.getItem("verrou-suspendu") === "1" && navigator.wakeLock) navigator.wakeLock.request = () => new Promise(() => {});
  });
  await ouvrirTrajets(p);
  await p.evaluate(() => sessionStorage.setItem("verrou-suspendu", "1"));
  await p.reload();
  await attendreFormulaire(p);
  await choisirVoiture(p);
  await lancerEnregistrement(p);
  const allume = p.locator('[data-el="ecran-allume"]');
  await expect(allume).toHaveAttribute("data-verrou", "attente");
  constats.low10 = (await allume.innerText()).trim();
  expect(constats.low10).not.toContain("L'écran reste allumé");
  constats.m3 = (await p.locator('[data-el="direct-sans-montees"]').innerText()).trim();
  expect(constats.m3).toContain("sans les montées");
  await p.screenshot({ path: path.join(PREUVES, "preuve-M3-LOW10.png") });
  log("M3 :", constats.m3, "| LOW 10 :", constats.low10);

  // M1 : l'enregistrement reste en attente de reprise (page rechargée)
  await p.evaluate(() => sessionStorage.removeItem("verrou-suspendu"));
  await p.goto(`${URL_APP}/trajets`);
  await attendreFormulaire(p);
  await expect(p.locator('[data-el="reprise-enregistrement"]')).toBeVisible({ timeout: 20000 });
  const avant = await p.evaluate(() => localStorage.getItem("pt-en-route"));
  const bouton = p.locator('[data-el="bouton-enregistrer"]');
  await expect(bouton).toHaveAttribute("aria-disabled", "true");
  await bouton.click({ force: true }); // un vrai doigt peut toucher un bouton désactivé par aria-disabled : on vérifie qu'il n'écrase rien
  const msg = p.locator('[data-el="message-enregistrer"]');
  await expect(msg).toContainText("Un enregistrement attend déjà ci-dessus");
  await p.waitForTimeout(3000);
  await expect(S6(p)).toHaveCount(0);
  const apres = await p.evaluate(() => localStorage.getItem("pt-en-route"));
  expect(apres).toBe(avant);
  constats.m1 = { ariaDisabled: await bouton.getAttribute("aria-disabled"), message: (await msg.innerText()).trim(), enregistrementIntact: apres === avant, ecranEnRoute: await S6(p).count() };
  await msg.scrollIntoViewIfNeeded();
  await p.screenshot({ path: path.join(PREUVES, "preuve-M1.png") });
  log("M1 :", JSON.stringify(constats.m1));

  // M2 : le trajet complet (positions du GPX) remplace les positions gardées, puis « Arrêter et voir le coût »
  const points = PTS.map((x) => [Date.parse("2026-10-21T01:38:42Z") + x.s * 1000, x.lat, x.lon, 0]);
  await p.evaluate((pts) => {
    const e = JSON.parse(localStorage.getItem("pt-en-route"));
    e.points = pts;
    e.debut = pts[0][0];
    localStorage.setItem("pt-en-route", JSON.stringify(e));
  }, points);
  await p.reload();
  await attendreFormulaire(p);
  await expect(p.locator('[data-el="reprise-distance"]')).toContainText("77,0 km déjà enregistrés");
  await p.locator('[data-el="arreter-enregistrement"]').click();
  await expect(p.locator('[data-screen="S4"][data-etat="ok"]')).toBeVisible({ timeout: 180000 });
  const res = await lireResultat(p);
  const s = await session(p);
  const [t] = await rest("trajets?select=id,km,litres,cout,troncons,vitesse_moy,accelerations&enregistre=eq.true&order=cree_le.desc&limit=1", s.jeton);
  constats.m2 = { route: res.route, cout: res.cout, litres: Number(t.litres), km: Number(t.km), montee_m: t.troncons.reduce((a, x) => a + Number(x.denivele_m), 0), troncons: t.troncons.map((x) => `${x.pays} ${x.type} ${x.km} km ${x.denivele_m} m ${x.litres} L`), vitesse_moy: t.vitesse_moy, accelerations: t.accelerations };
  log("M2 :", JSON.stringify(constats.m2));

  // US-6.6-02 : bloc « Ma vitesse enregistrée » et note sur la vitesse réelle, dans un seul cadre
  await p.setViewportSize({ width: 390, height: 2600 });
  await p.waitForTimeout(800);
  const bloc = p.locator('[data-el="courbe-vitesse"]');
  await expect(bloc).toContainText("Ma vitesse enregistrée");
  await expect(p.locator('[data-el="note-roule"]')).toContainText("Calcul sur ta vitesse réelle, seconde par seconde");
  constats.us66 = { info: (await p.locator('[data-el="vitesse-info"]').innerText()).trim(), points: Number(await bloc.locator("svg").getAttribute("data-points")) };
  await capture(p, "US-6.6-02-apres.png", { clip: await cadre(p, ['[data-el="courbe-vitesse"]', '[data-el="note-roule"]']) });

  // ménage : le trajet créé par ce script
  const del = await fetch(`${env.VITE_SUPABASE_URL}/rest/v1/trajets?id=eq.${t.id}`, { method: "DELETE", headers: { apikey: env.VITE_SUPABASE_ANON_KEY, Authorization: `Bearer ${s.jeton}`, Prefer: "return=representation" } });
  constats.menage = { trajet: t.id, statut: del.status, supprimes: (await del.json()).length, restants: (await rest(`trajets?select=id&id=eq.${t.id}`, s.jeton)).length };
  log("ménage :", JSON.stringify(constats.menage));
  await C.close();
}

// ---------------------------------------------------------------- B. US-1.9 : Prix à Londres, puis fiche d'une station britannique
{
  const C = await navigateur.newContext({ ...OPTIONS_CONTEXTE, geolocation: LONDRES });
  const p = await C.newPage();
  surveiller(p, "Londres");
  await p.goto(`${URL_APP}/`);
  const lignes = p.locator('[data-el="ligne-station"]');
  await expect(lignes.first()).toBeVisible({ timeout: 30000 });
  await expect(p.locator('[data-screen="S1"]')).toBeVisible();
  const ids = await lignes.evaluateAll((l) => l.map((x) => x.getAttribute("data-station")));
  expect(ids.every((i) => i.startsWith("GB-"))).toBe(true);
  const pastilles = Number(await p.locator('[data-el="carte-stations"]').getAttribute("data-pastilles"));
  expect(pastilles).toBe(ids.length);
  const textes = await lignes.evaluateAll((l) => l.map((x) => x.innerText.replace(/\s+/g, " ")));
  expect(textes.some((x) => /(\w+) · \1 ·/.test(x))).toBe(false); // LOW 12 : plus de « Asda · Asda · … »
  constats.us19 = { stations: ids.length, pastilles, premiere: textes[0].slice(0, 120) };
  await capture(p, "US-1.9-01-avant.png");

  // fiche : écran plus haut, pour que la carte et le début de la liste restent visibles au-dessus de la fiche
  await p.setViewportSize({ width: 390, height: 1400 });
  const id = ids[0];
  await lignes.first().click();
  const fiche = p.locator('[data-el="fiche-station"]');
  await expect(fiche.locator('[data-el="prix-origine"]')).toBeVisible({ timeout: 15000 });
  const base = await rest(`prix?select=carburant,prix,prix_origine&station_id=eq.${id}`);
  const cours = await rest("cours_change?select=taux,jour&monnaie=eq.GBP");
  for (const l of base) {
    await expect(fiche.locator(`[data-el="prix-origine"] [data-carburant="${l.carburant}"]`)).toContainText(`${virgule(Number(l.prix_origine), 1)} p/L`);
    expect(Number(l.prix)).toBeCloseTo(Number(l.prix_origine) / 100 / Number(cours[0].taux), 3);
  }
  await expect(fiche.locator('[data-el="cours-du-jour"]')).toContainText(`1 € = ${virgule(Number(cours[0].taux), 4)} £`);
  const titre = (await fiche.locator("#sh-name").innerText()).replace(/\s+/g, " ");
  expect(titre).not.toMatch(/(\w+) · \1 ·/i);
  constats.us19.fiche = { id, titre, prix: base.map((l) => `${l.carburant} ${l.prix} €/L = ${l.prix_origine} p/L`), taux: cours[0].taux, listeVisible: await lignes.nth(1).isVisible() };
  await capture(p, "US-1.9-02-apres.png");
  await C.close();
}
await navigateur.close();

const nonOk = requetes.filter((r) => r.statut < 200 || r.statut >= 300);
constats.requetes = { total: requetes.length, nonOk, parCode: requetes.reduce((m, r) => ((m[r.statut] = (m[r.statut] ?? 0) + 1), m), {}) };
fs.writeFileSync(path.join(PREUVES, "m4-correctifs.json"), JSON.stringify(constats, null, 1));
console.log(JSON.stringify(constats, null, 1));
