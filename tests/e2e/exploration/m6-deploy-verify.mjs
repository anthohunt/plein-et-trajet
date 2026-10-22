// Jalon 6, étape 4.4 — vérification du déploiement sur la prod (bibliothèque Playwright, 390 × 844, toucher), un seul parcours,
// aucune interception : T1 → T2 (voiture par le vrai code D.2, fonction voiture-eea) → T3 (positions du GPX injectées, horloge
// accélérée, verrou d'écran tenu : Chromium complet, permission accordée par CDP) → T4 (fin) → Enregistrer → T6 Historique.
// Toutes les requêtes vers le serveur (functions/v1, rest/v1, auth/v1) sont relevées avec leur code ; aucune ne doit aller vers
// api.myptv.com, estimer-trajet ou trajet-roule. Le trajet vit dans l'IndexedDB du navigateur de test, effacée à la fin.
//   set -a; . ./.env.local; set +a; node tests/e2e/exploration/m6-deploy-verify.mjs
import { chromium, expect } from "@playwright/test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { URL_APP, lireGpx } from "./m5-aides.mjs";
import { LIVRAISON, figerHorloge, heure, lireIdb, rouler, txt } from "./m5-explore-outils.mjs";

const env = process.env;
const BRUTES = path.join(LIVRAISON, "../screenshots/m6");
const sel = (el) => `[data-el="${el}"]`;
const log = (...a) => console.log(`[${heure()}]`, ...a);
const PTS = lireGpx("albi-toulouse.gpx");
const requetes = [];
const toutes = [];
const erreurs = [];
const constats = { url: URL_APP };
/** Une capture = deux vraies prises de l'écran : la livrée et la brute. */
const capturer = async (p, nom) => {
  await p.screenshot({ path: path.join(LIVRAISON, nom) });
  await p.screenshot({ path: path.join(BRUTES, nom) });
};

// le verrou d'écran exige le Chromium complet (nouveau mode headless) : la coquille headless le refuse toujours
const cache = `${os.homedir()}/.cache/ms-playwright`;
const complet = env.CHROME ?? fs.readdirSync(cache).filter((d) => /^chromium-\d+$/.test(d)).sort().reverse().map((d) => `${cache}/${d}/chrome-linux64/chrome`).find(fs.existsSync);
const navigateur = await chromium.launch({ executablePath: complet });
const c = await navigateur.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, locale: "fr-FR", timezoneId: "Europe/Paris", permissions: ["geolocation"], geolocation: { latitude: PTS[0].lat, longitude: PTS[0].lon, accuracy: 5 } });
c.on("request", (r) => toutes.push(r.url()));
c.on("response", (r) => {
  const u = r.url();
  if (/\/(functions|rest|auth)\/v1\//.test(u)) requetes.push({ statut: r.status(), methode: r.request().method(), url: u.replace(/\?.*/, "").replace(env.VITE_SUPABASE_URL, "") });
});
c.on("requestfailed", (r) => { if (/\/(functions|rest|auth)\/v1\//.test(r.url())) requetes.push({ statut: 0, methode: r.method(), url: r.url().replace(/\?.*/, "").replace(env.VITE_SUPABASE_URL, ""), echec: r.failure()?.errorText }); });
// chaque sentinelle de verrou d'écran rendue à la page, gardée pour lire son état
await c.addInitScript(() => {
  if (!("wakeLock" in navigator)) return;
  const demander = navigator.wakeLock.request.bind(navigator.wakeLock);
  window.__verrous = [];
  navigator.wakeLock.request = async (t) => { const s = await demander(t); window.__verrous.push(s); return s; };
});
const p = await c.newPage();
p.on("pageerror", (e) => erreurs.push(e.message.slice(0, 200)));
const cdp = await c.newCDPSession(p);
const { targetInfo } = await cdp.send("Target.getTargetInfo");
await cdp.send("Browser.setPermission", { permission: { name: "screen-wake-lock" }, setting: "granted", origin: new URL(URL_APP).origin, browserContextId: targetInfo.browserContextId });
const touche = (el) => p.locator(sel(el)).first().tap();
constats.navigateur = navigateur.version();

// T1 → T2 : voiture par le code D.2
await p.clock.install();
await p.goto(URL_APP);
await expect(p.locator('[data-screen="T1"]')).toBeVisible();
constats.bundle = await p.evaluate(() => document.querySelector('script[type="module"]')?.getAttribute("src"));
await touche("bouton-demarrer"); // sans voiture : l'appli mène à Ma voiture
await p.waitForURL("**/voiture");
await p.locator("#d2").pressSequentially("5RBU0C", { delay: 40 });
await expect(p.locator(sel("fiche-carburant"))).toHaveText("SP95-E10", { timeout: 40000 });
constats.voiture = `${await txt(p, `${sel("fiche-voiture")} .nm`)} · ${await txt(p, sel("fiche-puissance"))} · ${await txt(p, sel("fiche-annee"))}`;
await touche("enregistrer-voiture");
await expect(p.locator(sel("nom-voiture"))).toHaveText("Renault Clio");
log("T2", constats.voiture);

// T3 : Démarrer, verrou d'écran tenu, 900 positions du GPX (≈ 15 min de route) rejouées
await figerHorloge(p);
await touche("bouton-demarrer");
await p.waitForURL("**/en-route");
await expect(p.locator(sel("prix-direct"))).toHaveAttribute("data-prix", /\d/, { timeout: 20000 });
await expect(p.locator(sel("ecran-eteint"))).toHaveAttribute("data-verrou", "actif", { timeout: 15000 });
await rouler(c, p, PTS, 1, 900);
const verrous = await p.evaluate(() => (window.__verrous ?? []).map((s) => ({ type: s.type, released: s.released })));
constats.verrou = { attribut: await p.locator(sel("ecran-eteint")).getAttribute("data-verrou"), plateforme: await p.locator(sel("ecran-eteint")).getAttribute("data-plateforme"), sentinelles: verrous, texte: await txt(p, sel("ecran-eteint")) };
constats.enRoute = `${await txt(p, sel("direct-km"))} km · ${await txt(p, sel("direct-litres"))} L · ${await txt(p, sel("direct-euros"))} € · « ${await txt(p, sel("prix-direct"))} »`;
await capturer(p, "m6-deploy-verify-01.png");
log("T3", constats.enRoute, JSON.stringify(constats.verrou));

// T4 : fin de trajet
await touche("bouton-arreter");
await p.waitForURL("**/fin");
await p.clock.runFor(500);
await expect(p.locator(sel("titre-trajet"))).toHaveAttribute("data-noms", "oui", { timeout: 20000 });
constats.verrouApresArret = await p.evaluate(() => (window.__verrous ?? []).every((s) => s.released));
constats.fin = `« ${await txt(p, sel("titre-trajet"))} » · ${await p.locator(sel("fin-km")).getAttribute("data-km")} km · ${await p.locator(sel("fin-litres")).getAttribute("data-litres")} L · ${await txt(p, sel("cout-trajet"))}`;
await p.evaluate(() => { const s = document.querySelector(".scroll"); if (s) s.scrollTop = 0; });
await capturer(p, "m6-deploy-verify-02.png");
log("T4", constats.fin, "verrou relâché :", constats.verrouApresArret);

// Enregistrer → T6 Historique
const id = await p.locator('[data-screen="T4"]').getAttribute("data-trajet");
await touche("enregistrer-trajet");
await p.waitForURL("**/historique");
const ligne = p.locator(`li.hrow[data-trajet="${id}"]`);
await expect(ligne).toBeVisible();
await expect(p.locator("li.hrow").first()).toHaveAttribute("data-trajet", id);
constats.historique = (await ligne.innerText()).replace(/\s+/g, " ");
const idb = await lireIdb(p);
constats.idb = `${idb.trajets.length} trajet en IndexedDB, enregistré : ${idb.trajets.find((t) => t.id === id)?.enregistre}`;
await capturer(p, "m6-deploy-verify-03.png");
log("T6", constats.historique, "|", constats.idb);

// nettoyage : IndexedDB et localStorage du navigateur de test, depuis une page de la même origine sans l'appli
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
const verrouTenu = constats.verrou.attribut === "actif" && constats.verrou.plateforme === "web" && verrous.some((s) => s.type === "screen" && !s.released);
constats.verdict = hors2xx.length === 0 && interdites.length === 0 && verrouTenu && constats.verrouApresArret ? "PASS" : "FAIL";
console.log(JSON.stringify(constats, null, 1));
fs.mkdirSync("/tmp/m6td", { recursive: true });
fs.writeFileSync("/tmp/m6td/deploy-verify.json", JSON.stringify(constats, null, 1));
process.exit(constats.verdict === "PASS" ? 0 : 1);
