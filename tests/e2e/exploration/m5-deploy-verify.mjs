// Jalon 5, étape 4.4 — vérification du déploiement sur la prod (bibliothèque Playwright, 390 × 844, toucher), un seul parcours,
// aucune interception : T1 → T2 (voiture par le vrai code D.2, fonction voiture-eea) → T3 (positions du GPX injectées, horloge
// accélérée) → T4 (fin, carburant changé, partage à 2) → Enregistrer → T6 (rouvrir, supprimer) → T5 Stations (Albi, puis Barcelone).
// Toutes les requêtes vers le serveur (functions/v1, rest/v1, auth/v1) sont relevées avec leur code ; aucune ne doit aller vers
// api.myptv.com, estimer-trajet ou trajet-roule. Le trajet vit dans l'IndexedDB du navigateur de test, vidée à la fin.
//   set -a; . ./.env.local; set +a; node tests/e2e/exploration/m5-deploy-verify.mjs
import { chromium, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { URL_APP, lireGpx } from "./m5-aides.mjs";
import { LIVRAISON, figerHorloge, heure, lireIdb, nb, rouler, txt } from "./m5-explore-outils.mjs";

const env = process.env;
const sel = (el) => `[data-el="${el}"]`;
const log = (...a) => console.log(`[${heure()}]`, ...a);
const PTS = lireGpx("albi-toulouse.gpx");
const requetes = [];
const toutes = [];
const erreurs = [];
const constats = { url: URL_APP };

const navigateur = await chromium.launch();
const c = await navigateur.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, locale: "fr-FR", timezoneId: "Europe/Paris", permissions: ["geolocation"], geolocation: { latitude: PTS[0].lat, longitude: PTS[0].lon, accuracy: 5 } });
c.on("request", (r) => toutes.push(r.url()));
c.on("response", (r) => {
  const u = r.url();
  if (/\/(functions|rest|auth)\/v1\//.test(u)) requetes.push({ statut: r.status(), methode: r.request().method(), url: u.replace(/\?.*/, "").replace(env.VITE_SUPABASE_URL, "") });
});
c.on("requestfailed", (r) => { if (/\/(functions|rest|auth)\/v1\//.test(r.url())) requetes.push({ statut: 0, methode: r.method(), url: r.url().replace(/\?.*/, "").replace(env.VITE_SUPABASE_URL, ""), echec: r.failure()?.errorText }); });
const p = await c.newPage();
p.on("pageerror", (e) => erreurs.push(e.message.slice(0, 200)));
const touche = (el) => p.locator(sel(el)).first().tap();

// T1 → T2 : voiture par le code D.2
await p.clock.install();
await p.goto(URL_APP);
await expect(p.locator('[data-screen="T1"]')).toBeVisible();
await touche("bouton-demarrer"); // sans voiture : l'appli mène à Ma voiture
await p.waitForURL("**/voiture");
await p.locator("#d2").pressSequentially("5RBU0C", { delay: 40 });
await expect(p.locator(sel("fiche-carburant"))).toHaveText("SP95-E10", { timeout: 40000 });
constats.voiture = `${await txt(p, `${sel("fiche-voiture")} .nm`)} · ${await txt(p, sel("fiche-puissance"))} · ${await txt(p, sel("fiche-annee"))}`;
await touche("enregistrer-voiture");
await expect(p.locator(sel("nom-voiture"))).toHaveText("Renault Clio");
log("T2", constats.voiture);

// T3 : Démarrer, 600 positions du GPX (≈ 10 min de route) rejouées
await figerHorloge(p);
await touche("bouton-demarrer");
await p.waitForURL("**/en-route");
await expect(p.locator(sel("prix-direct"))).toHaveAttribute("data-prix", /\d/, { timeout: 20000 });
await rouler(c, p, PTS, 1, 600);
constats.enRoute = `${await txt(p, sel("direct-km"))} km · ${await txt(p, sel("direct-litres"))} L · ${await txt(p, sel("direct-euros"))} € · « ${await txt(p, sel("prix-direct"))} »`;
log("T3", constats.enRoute);

// T4 : fin, carburant changé (Gazole), partage à 2
await touche("bouton-arreter");
await p.waitForURL("**/fin");
await p.clock.runFor(500);
await expect(p.locator(sel("titre-trajet"))).toHaveAttribute("data-noms", "oui", { timeout: 20000 });
const litres = Number(await p.locator(sel("fin-litres")).getAttribute("data-litres"));
await p.locator(`${sel("carburant-apres")} [data-carburant="Gazole"]`).tap();
await expect(p.locator(sel("libelle-prix"))).toHaveText("Moyenne France du jour");
const prixG = Number(await p.locator(sel("prix-apres")).getAttribute("data-prix"));
const cout = Number(await p.locator(sel("cout-trajet")).getAttribute("data-cout"));
if (Math.abs(cout - Math.round(litres * prixG * 100) / 100) > 0.001) throw new Error(`coût ${cout} ≠ ${litres} × ${prixG}`);
await touche("personnes-plus");
await expect(p.locator(sel("part-personne"))).toHaveText(new RegExp(`^${(Math.round((cout / 2) * 100) / 100).toFixed(2).replace(".", ",")}\\s€ chacun$`));
constats.fin = `« ${await txt(p, sel("titre-trajet"))} » · ${litres.toFixed(3)} L · Gazole ${prixG} €/L · ${await txt(p, sel("cout-trajet"))} · ${await txt(p, sel("part-personne"))}`;
await p.evaluate(() => { const s = document.querySelector(".scroll"); if (s) s.scrollTop = 0; });
await p.screenshot({ path: path.join(LIVRAISON, "m5-deploy-verify-01.png") });
log("T4", constats.fin);

// Enregistrer → T6 : rouvrir, supprimer
const id = await p.locator('[data-screen="T4"]').getAttribute("data-trajet");
await touche("enregistrer-trajet");
await p.waitForURL("**/historique");
const ligne = p.locator(`li.hrow[data-trajet="${id}"]`);
await expect(ligne).toBeVisible();
constats.historique = (await ligne.innerText()).replace(/\s+/g, " ");
await p.screenshot({ path: path.join(LIVRAISON, "m5-deploy-verify-02.png") });
await ligne.locator("button").tap();
await expect(p.locator(sel("supprimer-trajet"))).toBeVisible();
const rouvert = await p.locator('[data-screen="T4"]').getAttribute("data-trajet");
await touche("supprimer-trajet");
await p.waitForURL("**/historique");
await expect(ligne).toHaveCount(0);
const idb = await lireIdb(p);
constats.supprime = `rouvert ${rouvert === id ? "le même trajet" : rouvert} ; après suppression : ${idb.trajets.length} trajet en IndexedDB, ${idb.arrete ? "un trajet arrêté" : "aucun trajet arrêté"}`;
log("T6", constats.historique, "|", constats.supprime);

// T5 : Stations autour d'Albi, puis Barcelone (zone hors de France)
await p.clock.resume();
await touche("onglet-stations");
await p.waitForURL("**/stations");
const lignes = p.locator(`${sel("liste-stations")} ${sel("ligne-station")}`);
await expect(lignes.first()).toBeVisible({ timeout: 40000 });
constats.albi = `${await lignes.count()} stations, 1re « ${(await lignes.first().innerText()).replace(/\s+/g, " ").slice(0, 80)} »`;
await c.setGeolocation({ latitude: 41.3874, longitude: 2.1686, accuracy: 5 });
await p.reload();
await expect(lignes.first()).toBeVisible({ timeout: 40000 });
await expect(p.locator(sel("lieu"))).not.toHaveText(/Albi/);
const ids = await lignes.evaluateAll((l) => l.map((x) => x.getAttribute("data-station")));
const r = await fetch(`${env.VITE_SUPABASE_URL}/rest/v1/stations?select=pays&id=in.(${ids.map((i) => `"${i}"`).join(",")})`, { headers: { apikey: env.VITE_SUPABASE_ANON_KEY, Authorization: `Bearer ${env.VITE_SUPABASE_ANON_KEY}` } });
const paysVus = [...new Set((await r.json()).map((s) => s.pays))];
constats.barcelone = `« ${await txt(p, sel("lieu"))} » ; ${ids.length} stations, pays ${paysVus.join(",")} ; 1re « ${(await lignes.first().innerText()).replace(/\s+/g, " ").slice(0, 80)} »`;
await p.waitForFunction(() => !window.__carte || (window.__carte.loaded() && window.__carte.areTilesLoaded()), null, { timeout: 25000 }).catch(() => {});
await p.waitForTimeout(1500); // dernier rendu du fond après le chargement des tuiles
await p.screenshot({ path: path.join(LIVRAISON, "m5-deploy-verify-03.png") });
log("T5", constats.albi, "|", constats.barcelone);

// nettoyage : IndexedDB et localStorage du navigateur de test. L'appli tient sa base ouverte (suppression « bloquée ») : on ferme
// sa page et on efface depuis une page de la même origine sans l'appli (une feuille de style du déploiement)
const css = await p.evaluate(() => document.querySelector('link[rel="stylesheet"]')?.getAttribute("href"));
await p.close();
const n = await c.newPage();
await n.goto(new URL(css, URL_APP).href);
constats.nettoyage = await n.evaluate(async () => {
  localStorage.clear();
  const etat = await new Promise((ok) => { const q = indexedDB.deleteDatabase("plein-et-trajet"); q.onsuccess = () => ok("effacée"); q.onerror = () => ok("erreur"); q.onblocked = () => ok("bloquée"); });
  return `base plein-et-trajet ${etat} ; bases IndexedDB restantes : ${(await indexedDB.databases()).map((d) => d.name).join(",") || "aucune"} ; localStorage : ${localStorage.length} clé`;
});
await c.close();
await navigateur.close();

const codes = {};
for (const q of requetes) codes[q.statut] = (codes[q.statut] ?? 0) + 1;
const parUrl = {};
for (const q of requetes) parUrl[`${q.methode} ${q.url} ${q.statut}`] = (parUrl[`${q.methode} ${q.url} ${q.statut}`] ?? 0) + 1;
const interdites = toutes.filter((u) => /myptv|estimer-trajet|trajet-roule/.test(u));
const hors2xx = requetes.filter((q) => q.statut < 200 || q.statut >= 300);
constats.reseau = { serveur: requetes.length, codes, parUrl, toutes: toutes.length, interdites: interdites.length, erreursPage: erreurs };
constats.verdict = hors2xx.length === 0 && interdites.length === 0 && paysVus.length === 1 && paysVus[0] === "ES" ? "PASS" : "FAIL";
console.log(JSON.stringify(constats, null, 1));
fs.writeFileSync("/tmp/m5td/deploy-verify.json", JSON.stringify(constats, null, 1));
