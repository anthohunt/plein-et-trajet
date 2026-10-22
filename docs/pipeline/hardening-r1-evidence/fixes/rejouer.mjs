import { chromium } from "/home/claude/webapp-runs/prix-carburant-trajets-2026-10-20-114307/node_modules/playwright/index.mjs";
import fs from "fs";
const BASE = process.argv[2]; const TAG = process.argv[3]; const OUT = process.argv[4] || null;
const voiture = { cle: "RENAULT·R·5RBU·5RBU0C·2017", marque: "Renault", modele: "Clio", t: "R", va: "5RBU", ve: "5RBU0C", annee: 2017, masse_kg: 1165, puissance_kw: 87, cylindree_cm3: 1197, carburant: "SP95-E10", co2_nedc: 120, co2_wltp: null, conso_officielle_l100: 5.5, procedure: "NEDC", immatriculations: 10, conso_phases: { basse: 7, moyenne: 5.5, haute: 5, tres_haute: 6 } };
const station = (o = {}) => ({ id: "s1", nom: "Test", enseigne: "Test", adresse: "1 rue", cp: "81000", ville: "Albi", lat: 43.93, lon: 2.15, services: [], automate_24_24: false, distance_km: 1.2, pays: "FR", ...o });
const browser = await chromium.launch();
const resultats = {};
async function scenario(nom, { setup, idb, ls, route, aller = "/", apres, vp = { width: 390, height: 844 }, esc }) {
  const ctx = await browser.newContext({ viewport: vp, locale: "fr-FR", geolocation: { latitude: 43.9289, longitude: 2.1464 }, permissions: ["geolocation"], hasTouch: true });
  const page = await ctx.newPage();
  const erreurs = [];
  page.on("pageerror", (e) => erreurs.push(String(e.message).slice(0, 120)));
  await page.route("**/*.supabase.co/**", async (r) => {
    const u = r.request().url();
    if (route) { const rep = await route(u, r.request()); if (rep) return r.fulfill({ status: 200, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify(rep) }); }
    if (u.includes("moyennes_par_pays")) return r.fulfill({ status: 200, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: "[]" });
    return r.continue();
  });
  if (ls) await page.addInitScript((ls) => { for (const [k, v] of Object.entries(ls)) localStorage.setItem(k, v); }, ls);
  await page.goto(BASE + "/vide", { waitUntil: "domcontentloaded" });
  if (idb) await page.evaluate(async (idb) => {
    const db = await new Promise((ok, ko) => { const r = indexedDB.open("plein-et-trajet", 1); r.onupgradeneeded = () => { const d = r.result; const t = d.createObjectStore("trajets", { keyPath: "id" }); t.createIndex("debut", "debut"); d.createObjectStore("en_cours"); }; r.onsuccess = () => ok(r.result); r.onerror = ko; });
    await new Promise((ok) => { const tx = db.transaction("en_cours", "readwrite"); tx.objectStore("en_cours").put(idb.valeur, idb.cle); tx.oncomplete = ok; });
    db.close();
  }, idb);
  await page.goto(BASE + aller, { waitUntil: "load" });
  await page.waitForTimeout(2500);
  if (setup) await setup(page);
  await page.waitForTimeout(1500);
  const lire = () => page.evaluate(() => ({ racine: document.getElementById("root")?.innerText.trim().length ?? -1, barriere: !!document.querySelector('[data-el="barriere-erreur"]'), chemin: location.pathname }));
  let etat = await lire();
  // relance (le blocage des cas IDB doit être permanent avant, absent après)
  let relance = null;
  if (idb) { await page.reload({ waitUntil: "load" }); await page.waitForTimeout(2500); relance = await lire(); }
  const blanc = etat.racine === 0 || (relance && relance.racine === 0);
  resultats[nom] = { ...etat, relance, ecranBlanc: blanc, erreurs: erreurs.slice(0, 2) };
  if (OUT) await page.screenshot({ path: `${OUT}/${nom}.png` });
  if (apres) resultats[nom].apres = await apres(page);
  await ctx.close();
}
const arrete = { id: "t1", vitesses: [10, 20] };
const enreg = { version: 2, id: "e1", debut: Date.now() - 60000, points: [null, [Date.now(), null, null]], pauses: [], enPause: false, segment: 0, voiture, pays: "FR", moyennes: {}, prixChoisi: null, immobile: null, ignorerAvant: 0 };
await scenario("D1-idb-arrete-sans-depart", { idb: { cle: "arrete", valeur: arrete } });
await scenario("D2-idb-enregistrement-points-null", { idb: { cle: "enregistrement", valeur: enreg } });
const saisirD2 = async (p) => { await p.fill("#d2", "5RBU0C"); await p.waitForTimeout(3500); };
await scenario("D4-eea-masse-null", { aller: "/voiture", setup: saisirD2, route: (u) => u.includes("voiture-eea") ? { versions: [{ ...voiture, masse_kg: null }, { ...voiture, cle: "x2", masse_kg: null }], source: "eea" } : null });
await scenario("D4-eea-immat-absent", { aller: "/voiture", setup: saisirD2, route: (u) => { if (!u.includes("voiture-eea")) return null; const a = { ...voiture }; delete a.immatriculations; const b = { ...a, cle: "x2" }; return { versions: [a, b], source: "eea" }; } });
const prixRoute = (stations) => (u) => {
  if (u.includes("rpc/stations_autour")) return stations;
  if (u.includes("rest/v1/prix")) { const c = decodeURIComponent((u.match(/carburant=eq\.([^&]*)/) || [])[1] || "SP95-E10"); return stations.map((s, i) => ({ station_id: s.id, carburant: c, prix: 1.7 + i / 100, maj: new Date().toISOString(), rupture: false })); }
  return null;
};
const compte = (p) => p.evaluate(() => ({ lignes: document.querySelectorAll('[data-el="liste-stations"] > *').length, pastilles: document.querySelectorAll('[data-el="pastille-station"]').length }));
await scenario("D5-stations-lat-NaN", { aller: "/stations", route: prixRoute([station({ id: "a", lat: "NaN" }), station({ id: "b" })]), apres: compte });
await scenario("D5-stations-lat-200", { aller: "/stations", route: prixRoute([station({ id: "a", lat: 200 }), station({ id: "b" })]), apres: compte });
const sansServices = station({ id: "b", nom: null, enseigne: null }); delete sansServices.services;
await scenario("D6-station-sans-services-fiche", { aller: "/stations", route: prixRoute([sansServices]), setup: async (p) => { await p.locator('[data-el="liste-stations"] button, [data-el="liste-stations"] a').first().click(); await p.waitForTimeout(1500); }, apres: (p) => p.evaluate(() => ({ fiche: !!document.querySelector(".sheet") })) });
// D3 : une exception de rendu qui passe toutes les validations -> barrière, puis « Effacer les données locales »
await scenario("D3-barriere-erreur", { aller: "/voiture", setup: async (p) => { await p.evaluate(async (v) => { localStorage.setItem("pt-voiture-v1", v); localStorage.setItem("marqueur", "1"); await new Promise((ok) => { const r = indexedDB.open("plein-et-trajet", 1); r.onsuccess = () => { const tx = r.result.transaction("en_cours", "readwrite"); tx.objectStore("en_cours").put({ x: 1 }, "marqueur"); tx.oncomplete = () => { r.result.close(); ok(); }; }; }); }, JSON.stringify(voiture)); await p.evaluate(() => { Number.prototype.toLocaleString = function () { throw new Error("boom"); }; }); await p.fill("#d2", "5RBU0C"); await p.waitForTimeout(3500); }, route: (u) => u.includes("voiture-eea") ? { versions: [voiture, { ...voiture, cle: "x2" }], source: "eea" } : null,
  apres: async (p) => {
    const avant = await p.evaluate(() => ({ barriere: !!document.querySelector('[data-el="barriere-erreur"]'), ls: localStorage.length, racine: document.getElementById("root").innerText.length }));
    if (!avant.barriere) return { avant };
    await p.screenshot({ path: OUT ? `${OUT}/D3-barriere-erreur-ecran.png` : "/dev/null" }).catch(() => {});
    await p.click('[data-el="barriere-effacer"]'); await p.waitForTimeout(2500);
    const apres = await p.evaluate(async () => ({ barriere: !!document.querySelector('[data-el="barriere-erreur"]'), ls: localStorage.length, marqueurIdb: await new Promise((ok) => { const r = indexedDB.open("plein-et-trajet", 1); r.onsuccess = () => { const g = r.result.transaction("en_cours").objectStore("en_cours").get("marqueur"); g.onsuccess = () => ok(g.result ?? null); }; }), chemin: location.pathname, racine: document.getElementById("root").innerText.length }));
    return { avant, apres };
  } });
// D10 : hauteur de la liste Stations
const stationsOk = [station({ id: "a" }), station({ id: "b", lat: 43.94 }), station({ id: "c", lat: 43.92 })];
for (const vp of [{ width: 195, height: 422 }, { width: 640, height: 320 }, { width: 390, height: 844 }])
  await scenario(`D10-stations-${vp.width}x${vp.height}`, { aller: "/stations", vp, route: prixRoute(stationsOk), apres: (p) => p.evaluate(() => { const r = (s) => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return { h: Math.round(b.height), top: Math.round(b.top) }; }; const lignes = document.querySelector('[data-el="liste-stations"]'); return { scroll: r(".screen .scroll"), carte: r(".map"), liste: r('[data-el="liste-stations"]'), pageDefile: document.scrollingElement.scrollHeight > innerHeight, tabs: r(".tabs") }; }) });
// D11 : couleur du bouton Démarrer en thème sombre
{
  const ctx = await browser.newContext({ colorScheme: "dark", viewport: { width: 390, height: 844 }, locale: "fr-FR" });
  const p = await ctx.newPage(); await p.goto(BASE + "/", { waitUntil: "load" }); await p.waitForTimeout(1500);
  resultats["D11-demarrer-sombre"] = await p.evaluate(() => { const b = document.querySelector(".gobig"); const c = b && getComputedStyle(b); return c ? { couleur: c.color, fond: c.backgroundColor } : null; });
  if (OUT) await p.screenshot({ path: `${OUT}/D11-accueil-sombre.png` });
  await ctx.close();
}
await browser.close();
fs.writeFileSync(process.argv[5] || `${process.env.TMPDIR || "/tmp"}/rejeu-${TAG}.json`, JSON.stringify(resultats, null, 1));
console.log(JSON.stringify(resultats, null, 1));
