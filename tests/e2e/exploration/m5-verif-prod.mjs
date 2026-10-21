// Contrôle du bâtisseur r1a sur la prod (jalon 5) : ce que chaque écran T1-T6 AFFICHE, lu dans le DOM, + journal réseau.
// Usage : set -a; . ./.env.local; set +a; node tests/e2e/exploration/m5-verif-prod.mjs
import { chromium } from "@playwright/test";
import { URL_APP, compterIndexedDb, contexteAvecVoiture, lireGpx, rejouer, voitureEea } from "./m5-aides.mjs";

const SORTIE = process.env.SORTIE ?? "/tmp/m5-verif";
const b = await chromium.launch();
const reqs = [];
const erreurs = [];
const brancher = (page) => {
  page.on("request", (r) => reqs.push(r.url()));
  page.on("pageerror", (e) => erreurs.push(String(e)));
};
const txt = async (page, sel) => (await page.locator(sel).first().innerText({ timeout: 5000 }).catch(() => "∅")).replace(/\s+/g, " ").trim();
const vu = (ecran, quoi) => console.log(`[${ecran}] ${quoi}`);

// ---------------------------------------------------------------- A. sans voiture, puis Ma voiture
{
  const ctx = await contexteAvecVoiture(b, null);
  const page = await ctx.newPage();
  brancher(page);
  const t0 = Date.now();
  await page.goto(URL_APP);
  await page.waitForSelector('[data-screen="T1"]');
  vu("T1 sans voiture", `${await txt(page, '[data-screen="T1"]')} | onglet sélectionné ${await page.locator('[role="tab"][aria-selected="true"]').getAttribute("data-el")} | ${Date.now() - t0} ms`);
  await page.screenshot({ path: `${SORTIE}-t1-vide.png` });
  await page.click('[data-el="bouton-demarrer"]');
  await page.waitForURL("**/voiture");
  vu("T2 vide", `${await txt(page, '[data-screen="T2"]')} | enregistrer désactivé ${await page.locator('[data-el="enregistrer-voiture"]').isDisabled()}`);
  await page.fill("#d2", "5RBU0C");
  await page.waitForSelector('[data-el="fiche-voiture"]', { timeout: 30000 });
  vu("T2 5RBU0C", `${await txt(page, '[data-el="fiche-voiture"]')} | liste : ${await txt(page, '[data-el="versions-d2"]')} | enregistrer désactivé ${await page.locator('[data-el="enregistrer-voiture"]').isDisabled()}`);
  await page.screenshot({ path: `${SORTIE}-t2-5rbu0c.png`, fullPage: true });
  await page.fill("#d2", "r 5rbu 5rbu0c");
  await page.waitForTimeout(2500);
  vu("T2 « r 5rbu 5rbu0c »", `champ « ${await page.inputValue("#d2")} » | ${await txt(page, '[data-el="fiche-voiture"] .nm')} ${await txt(page, '[data-el="fiche-annee"]')}`);
  await page.fill("#d2", "ZZ9999");
  await page.waitForSelector('[data-el="erreur-d2"]', { timeout: 30000 });
  vu("T2 ZZ9999", `${await txt(page, '[data-el="erreur-d2"]')} | enregistrer désactivé ${await page.locator('[data-el="enregistrer-voiture"]').isDisabled()}`);
  await page.fill("#d2", "");
  await page.fill("#q", "clio 2017 120");
  await page.waitForSelector('[data-el="suggestions-voiture"] button', { timeout: 30000 });
  vu("T2 « clio 2017 120 »", await txt(page, '[data-el="suggestions-voiture"]'));
  await page.screenshot({ path: `${SORTIE}-t2-recherche.png`, fullPage: true });
  await page.locator('[data-el="suggestions-voiture"] button').first().click();
  vu("T2 suggestion touchée", `${await txt(page, '[data-el="fiche-voiture"]')} | enregistrer désactivé ${await page.locator('[data-el="enregistrer-voiture"]').isDisabled()}`);
  await page.click('[data-el="enregistrer-voiture"]');
  await page.waitForURL(URL_APP + "/");
  vu("T1 avec voiture", await txt(page, '[data-screen="T1"]'));
  await page.screenshot({ path: `${SORTIE}-t1-voiture.png` });
  await ctx.close();
}

// ---------------------------------------------------------------- B. trajet rejoué (horloge accélérée), fin, historique, stations
{
  const voiture = await voitureEea("5RBU0C");
  const pts = lireGpx("albi-toulouse.gpx");
  const ctx = await contexteAvecVoiture(b, voiture, { latitude: pts[0].lat, longitude: pts[0].lon });
  const page = await ctx.newPage();
  brancher(page);
  await page.clock.install();
  await page.goto(URL_APP);
  await page.waitForSelector('[data-el="bouton-demarrer"]');
  await page.clock.pauseAt(Date.now() + 1000);
  await page.click('[data-el="bouton-demarrer"]');
  await page.waitForURL("**/en-route", { timeout: 20000 });
  const N = Number(process.env.N ?? 900);
  const debut = Date.now();
  await rejouer(ctx, page, pts, 1, N, async (i) => {
    if (i % 300 === 0) vu(`T3 point ${i}`, `${await txt(page, '[data-el="vitesse"]')} | km ${await txt(page, '[data-el="direct-km"]')} | L ${await txt(page, '[data-el="direct-litres"]')} | € ${await txt(page, '[data-el="direct-euros"]')} | durée ${await txt(page, '[data-el="direct-duree"]')} | moy ${await txt(page, '[data-el="direct-moyenne"]')} | L/100 ${await txt(page, '[data-el="direct-l100"]')}`);
  });
  vu("T3 fin du rejeu", `${N} points en ${Math.round((Date.now() - debut) / 1000)} s réelles | ${await txt(page, '[data-screen="T3"]')}`);
  await page.screenshot({ path: `${SORTIE}-t3.png` });
  await page.click('[data-el="bouton-arreter"]');
  await page.waitForURL("**/fin", { timeout: 20000 });
  await page.clock.runFor(1000);
  await page.waitForFunction(() => document.querySelector('[data-el="titre-trajet"]')?.getAttribute("data-noms") === "oui", null, { timeout: 15000 }).catch(() => {});
  vu("T4 neuf", await txt(page, '[data-screen="T4"]'));
  await page.screenshot({ path: `${SORTIE}-t4.png`, fullPage: true });
  await page.click('[data-el="personnes-plus"]');
  await page.click('[data-el="personnes-plus"]');
  vu("T4 à 3", `${await txt(page, '[data-el="part-personne"]')} | coût ${await txt(page, '[data-el="cout-trajet"]')} | prix ${await page.locator('[data-el="prix-apres"]').getAttribute("data-prix")}`);
  await page.click('[data-el="enregistrer-trajet"]');
  await page.waitForURL("**/historique");
  await page.waitForSelector('[data-el="historique"] .hrow');
  vu("T6", await txt(page, '[data-screen="T6"]'));
  vu("IndexedDB", JSON.stringify(await compterIndexedDb(page)));
  await page.screenshot({ path: `${SORTIE}-t6.png` });
  // stations : l'horloge reprend son cours normal (carte, attentes de l'interface)
  await page.clock.resume();
  await page.click('[data-el="onglet-stations"]');
  await page.waitForSelector('[data-el="liste-stations"] li', { timeout: 30000 });
  vu("T5", `${await txt(page, '[data-el="titre-liste"]')} | carburant ${await txt(page, '.fuels [aria-pressed="true"]')} | ${await page.locator('[data-el="liste-stations"] li').count()} stations | bouton zone ${await page.locator('[data-el="rechercher-zone"]').count()} | bandeau ${await page.locator('[data-el="retour-trajet"]').count()}`);
  const avant = await txt(page, '[data-el="liste-stations"]');
  const bb = await page.locator('[data-el="carte-stations"] canvas').first().boundingBox();
  await page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2);
  await page.mouse.down();
  for (let s = 1; s <= 8; s++) await page.mouse.move(bb.x + bb.width / 2 - s * 8, bb.y + bb.height / 2 + s * 6);
  await page.mouse.up();
  await page.waitForTimeout(1500);
  vu("T5 glissé", `bouton « ${await txt(page, '[data-el="rechercher-zone"]')} » | liste inchangée ${avant === (await txt(page, '[data-el="liste-stations"]'))}`);
  await page.screenshot({ path: `${SORTIE}-t5-glisse.png` });
  await page.click('[data-el="rechercher-zone"]');
  await page.waitForTimeout(3500);
  vu("T5 recherché", `bouton ${await page.locator('[data-el="rechercher-zone"]').count()} | lieu ${await txt(page, '[data-el="lieu"]')} | ${await page.locator('[data-el="liste-stations"] li').count()} stations | 1re : ${await txt(page, '[data-el="liste-stations"] li')} | message : ${await txt(page, '[data-el="etat-vide"], [data-el="pays-sans-flux"], [data-el="etat-erreur"]')}`);
  await page.screenshot({ path: `${SORTIE}-t5.png` });
  await ctx.close();
}
const ptv = reqs.filter((u) => /myptv/i.test(u));
const peages = reqs.filter((u) => /estimer-trajet|trajet-roule/.test(u));
console.log(`[réseau] ${reqs.length} requêtes ; api.myptv.com : ${ptv.length} ; estimer-trajet/trajet-roule : ${peages.length} ; voiture-eea : ${reqs.filter((u) => u.includes("voiture-eea")).length} ; lieux : ${reqs.filter((u) => u.includes("/lieux")).length}`);
console.log(`[erreurs page] ${erreurs.length ? erreurs.join(" | ") : "aucune"}`);
await b.close();
