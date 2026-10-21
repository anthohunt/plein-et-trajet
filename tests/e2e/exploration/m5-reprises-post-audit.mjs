// Reprises post-audit du jalon 5 (agent tests + déploiement, après les audits round 3) : refait sur l'appli DÉPLOYÉE les seules
// captures signalées, par les mêmes gestes que run-m5.mjs, avec deux vrais page.screenshot() (livrée + brute) :
//   V-5.7-06  (MEDIUM lot 2) : attendre le message du pays APRÈS « Rechercher dans cette zone », pas l'état transitoire
//             « Aucune station… » (≈ 1,2 s, pendant la recherche du pays) ;
//   V-4.1-05  (LOW contre-évaluation) : l'état de départ est l'écran Fin de trajet d'un départ d'Espagne (haut de l'écran) ;
//   V-4.2-05/06, V-6.4-03 (LOW lot 2, cadrage) : le titre du trajet reste visible.
// Simulations déclarées (comme run-m5) : géolocalisation rejouée (GPX), horloge accélérée (page.clock), état préparé en IndexedDB (V-6.4).
// Usage : set -a; . ./.env.local; set +a; node tests/e2e/exploration/m5-reprises-post-audit.mjs [bcn,tunnel,historique,bruxelles]
import { chromium } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { URL_APP, contexteAvecVoiture, lireGpx, voitureEea } from "./m5-aides.mjs";
import { BRUTES, LIVRAISON, attr, dormir, ecrireIdb, figerHorloge, haversine, heure, lireIdb, md5, moyennes, nb, rouler, txt, virgule } from "./m5-explore-outils.mjs";

const FLUX = (process.argv[2] ?? "bcn,tunnel,historique,bruxelles").split(",");
const sel = (el) => `[data-el="${el}"]`;
const touche = (p, el) => p.locator(sel(el)).first().tap();
const ALBI = { latitude: 43.92833, longitude: 2.145916 };
const BRUXELLES = { latitude: 50.8467, longitude: 4.3525 };
const PTS = lireGpx("albi-toulouse.gpx");
const TUN = lireGpx("albi-toulouse-tunnel-90s.gpx");
const BCN = lireGpx("barcelone.gpx");
const CARBS = ["Gazole", "SP95-E10", "SP95", "SP98", "E85", "GPLc"];
const navigateur = await chromium.launch();
const VOITURE = await voitureEea("5RBU0C");
const MOY = Object.fromEntries(await Promise.all(CARBS.map(async (c) => [c, await moyennes(c)])));
const moyFR = (c) => MOY[c].get("FR");
const lignes = [];
const reseau = [];

/** Le titre du trajet en haut de la zone qui défile ; puis, si une cible est donnée et sort par le bas, le défilement minimal qui la montre. */
async function cadrer(p, cible) {
  return p.evaluate((cible) => {
    const sc = document.querySelector(".scroll");
    const t = document.querySelector('[data-el="titre-trajet"]');
    if (!sc || !t) return "sans zone défilante";
    sc.scrollTop = 0;
    const c = cible && document.querySelector(cible);
    if (c) {
      const depasse = c.getBoundingClientRect().bottom - sc.getBoundingClientRect().bottom;
      if (depasse > 0) sc.scrollTop = depasse + 4;
    }
    const z = sc.getBoundingClientRect(), r = t.getBoundingClientRect();
    return `titre ${r.top >= z.top - 0.5 ? "visible" : `coupé de ${Math.round(z.top - r.top)} px`}`;
  }, cible ?? null);
}
async function capturer(id, n, p, nom, action, constat) {
  await p.waitForTimeout(300);
  const liv = await p.screenshot();
  const brute = await p.screenshot();
  fs.writeFileSync(path.join(LIVRAISON, nom), liv);
  fs.writeFileSync(path.join(BRUTES, nom), brute);
  const l = `- Step ${n}: ${action} → ${constat} → capture \`${nom}\` ✓ (${heure()}, md5 ${md5(liv).slice(0, 8)}, brute ${md5(brute).slice(0, 8)})`;
  lignes.push(`${id} ${l}`);
  console.log(l);
}
async function contexte(flux, depart) {
  const c = await contexteAvecVoiture(navigateur, VOITURE, depart);
  c.on("request", (r) => reseau.push(r.url()));
  return c;
}
async function demarrer(c, p, pts) {
  await c.setGeolocation({ latitude: pts[0].lat, longitude: pts[0].lon, accuracy: 5 });
  await p.clock.install();
  await p.goto(URL_APP);
  await p.waitForSelector(sel("bouton-demarrer"));
  await figerHorloge(p);
  await touche(p, "bouton-demarrer");
  await p.waitForURL("**/en-route", { timeout: 15000 });
  await p.waitForFunction(() => document.querySelector('[data-el="prix-direct"]')?.getAttribute("data-prix"), null, { timeout: 20000 }).catch(() => {});
}
async function arreterEtNommer(p) {
  await touche(p, "bouton-arreter");
  await p.waitForURL("**/fin", { timeout: 15000 });
  await p.clock.runFor(500);
  await p.waitForFunction(() => document.querySelector('[data-el="titre-trajet"]')?.getAttribute("data-noms") === "oui", null, { timeout: 20000 }).catch(() => {});
}

// ---- V-4.1-05 : départ d'Espagne, l'écran Fin de trajet tel qu'il s'ouvre (haut de l'écran)
if (FLUX.includes("bcn")) {
  const c = await contexte("barcelone", { latitude: BCN[0].lat, longitude: BCN[0].lon });
  const p = await c.newPage();
  await demarrer(c, p, BCN);
  await rouler(c, p, BCN, 1, BCN.length);
  const prixRoute = await txt(p, sel("prix-direct"));
  await arreterEtNommer(p);
  const a = (await lireIdb(p)).arrete;
  if (a?.pays_depart !== "ES") throw new Error(`pays de départ ${a?.pays_depart}`);
  const cadre = await cadrer(p);
  await capturer("V-4.1", 5, p, "V-4.1-05-avant.png", "un départ hors de France : vrai itinéraire dans Barcelone (plaça de Catalunya → Sagrada Família, 3,2 km rejoués), arrêté — l'écran Fin de trajet tel qu'il s'ouvre (haut de l'écran)",
    `En route juste avant « Arrêter » : « ${prixRoute} » ; fin : « ${await txt(p, sel("titre-trajet"))} » · « ${await txt(p, sel("sous-titre-trajet"))} » ; ${await txt(p, sel("fin-litres"))} L, ${await txt(p, sel("fin-km"))} km ; pays de départ enregistré ${a.pays_depart} (IndexedDB) ; ${cadre}`);
  await c.close();
}

// ---- V-4.2-05/06 : même trajet que run-m5 (tracé du tunnel, A68), mêmes gestes ; titre du trajet visible
if (FLUX.includes("tunnel")) {
  const c = await contexte("tunnel", ALBI);
  const p = await c.newPage();
  await demarrer(c, p, TUN);
  const g = TUN.findIndex((x, k) => k > 0 && x.t - TUN[k - 1].t > 15000);
  const trou = TUN[g].t - TUN[g - 1].t;
  await rouler(c, p, TUN, 1, g);
  await p.clock.runFor(16000);
  await p.clock.runFor(trou - 16000 - 1000);
  await rouler(c, p, TUN, g, g + 1, { premierEcart: 1000 });
  await rouler(c, p, TUN, g + 1, TUN.length);
  await arreterEtNommer(p);
  // V-4.1 (3-4) puis V-4.2 (1-4), comme run-m5 : Gazole, retour SP95-E10, mon prix 1,989, « Revenir à la moyenne »
  await p.locator(`${sel("carburant-apres")} [data-carburant="Gazole"]`).tap();
  await p.locator(`${sel("carburant-apres")} [data-carburant="SP95-E10"]`).tap();
  const coutMoy = Number(await attr(p, sel("cout-trajet"), "data-cout"));
  await touche(p, "compteur-prix");
  await p.locator(sel("champ-prix")).fill("1,989");
  await p.locator(sel("champ-prix")).press("Enter");
  await touche(p, "revenir-moyenne");
  await touche(p, "compteur-prix");
  await p.locator(sel("champ-prix")).fill("1,5");
  let cadre = await cadrer(p, sel("prix-apres"));
  await capturer("V-4.2", 5, p, "V-4.2-05-avant.png", "le champ du prix ouvert (« 1,5 » tapé, pas validé)",
    `« ${await txt(p, sel("titre-trajet"))} » ; champ « ${await p.inputValue(sel("champ-prix"))} » ouvert ; coût ${virgule(Number(await attr(p, sel("cout-trajet"), "data-cout")), 2)} € (moyenne : ${virgule(coutMoy, 2)} €) ; ${cadre}`);
  await p.locator(sel("champ-prix")).press("Escape");
  await p.clock.runFor(100);
  const prix = Number(await attr(p, sel("prix-apres"), "data-prix"));
  if ((await p.locator(sel("champ-prix")).count()) !== 0 || Math.abs(prix - moyFR("SP95-E10")) >= 0.0005) throw new Error(`Échap : prix ${prix}`);
  cadre = await cadrer(p, sel("prix-apres"));
  await capturer("V-4.2", 6, p, "V-4.2-06-apres.png", "j'appuie sur Échap",
    `champ fermé ; prix toujours ${virgule(prix, 3)} €/L « ${await txt(p, sel("libelle-prix"))} » ; coût ${virgule(Number(await attr(p, sel("cout-trajet"), "data-cout")), 2)} € ; focus revenu sur « ${await p.evaluate(() => document.activeElement?.getAttribute("aria-label"))} » ; ${cadre}`);
  await c.close();
}

// ---- V-6.4-03 : ÉTAT PRÉPARÉ de run-m5 (Albi → Rodez à 3 personnes, trajet seul), le trajet rouvert ; titre visible si le bouton le permet
if (FLUX.includes("historique")) {
  const SPEEDS = PTS.map((x, k) => (k ? (haversine(PTS[k - 1], x) / ((x.t - PTS[k - 1].t) / 1000)) * 3.6 : 0));
  const prepare = ({ id, debut, minutes, km, l100, depart, arrivee, personnes = 1 }) => {
    const n = 300;
    const vitesses = Array.from({ length: n }, (_, k) => Math.round(SPEEDS[Math.floor((k * SPEEDS.length) / n)]));
    const consos = vitesses.map((v) => Math.round(l100 * (0.8 + ((v - 60) * (v - 60)) / 9000) * 10) / 10);
    const t0 = Date.parse(debut);
    return {
      id, debut: t0, fin: t0 + minutes * 60000, depart, arrivee, pays_depart: "FR", km, litres: Math.round(km * l100) / 100, carburant: "SP95-E10",
      moyennes: Object.fromEntries(CARBS.map((c) => [c, { prix: moyFR(c), pays: "FR" }])), prix_litre: moyFR("SP95-E10"), prix_perso: null, personnes, vitesses, consos,
      conso_max: Math.max(...consos), vitesse_moy: Math.round(km / (minutes / 60)), accelerations: 9, duree_s: minutes * 60,
      voiture: { nom: "Renault Clio", detail: "1.2 · 118 ch · 2017 · SP95-E10", carburant: "SP95-E10" }, enregistre: true,
    };
  };
  const L = { albi: { lat: 43.92836, lon: 2.14587, nom: "Albi" }, toulouse: { lat: 43.60445, lon: 1.44406, nom: "Toulouse" }, rodez: { lat: 44.3506, lon: 2.575, nom: "Rodez" } };
  const c = await contexte("historique", ALBI);
  const p = await c.newPage();
  await p.goto(URL_APP);
  await p.waitForSelector(sel("nom-voiture"));
  await ecrireIdb(p, [
    prepare({ id: "prep-3p", debut: "2026-10-18T10:00:00+02:00", minutes: 75, km: 92.4, l100: 6.5, depart: L.albi, arrivee: L.rodez, personnes: 3 }),
    prepare({ id: "prep-seul", debut: "2026-10-19T18:00:00+02:00", minutes: 70, km: 76.8, l100: 6.3, depart: L.toulouse, arrivee: L.albi }),
  ]);
  await touche(p, "onglet-historique");
  await p.waitForSelector("li.hrow");
  await p.locator('li.hrow[data-trajet="prep-3p"] button').tap();
  await p.waitForSelector(sel("supprimer-trajet"));
  const cadre = await cadrer(p, sel("supprimer-trajet"));
  await capturer("V-6.4", 3, p, "V-6.4-03-avant.png", "un trajet rouvert (Albi → Rodez, 3 personnes)",
    `« ${await txt(p, sel("titre-trajet"))} » ; bouton « ${await txt(p, sel("supprimer-trajet"))} » ; ${cadre}`);
  await c.close();
}

// ---- V-5.7-06 : Belgique, « Rechercher dans cette zone » ; capture quand le message du pays est affiché et stable
if (FLUX.includes("bruxelles")) {
  const c = await contexte("bruxelles", BRUXELLES);
  const q = await c.newPage();
  await q.goto(URL_APP + "/stations");
  await q.waitForSelector(sel("pays-sans-flux"), { timeout: 40000 });
  await dormir(1500);
  const bb = await q.locator(`${sel("carte-stations")} canvas`).first().boundingBox();
  const x0 = bb.x + bb.width / 2 + 45, y0 = bb.y + bb.height / 2 - 20;
  await q.mouse.move(x0, y0);
  await q.mouse.down();
  for (let s = 1; s <= 14; s++) await q.mouse.move(x0 - (90 * s) / 14, y0 + (40 * s) / 14);
  await dormir(180);
  await q.mouse.up();
  await dormir(1300);
  await q.waitForSelector(sel("rechercher-zone"), { timeout: 5000 });
  // le message d'avant la recherche est marqué : seul compte celui qui apparaît APRÈS le toucher
  await q.evaluate(() => document.querySelectorAll('[data-el="pays-sans-flux"]').forEach((e) => (e.dataset.avant = "1")));
  const t0 = Date.now();
  const vus = [];
  const suivi = setInterval(async () => {
    const e = await q.evaluate(() => (document.querySelector('[data-el="etat-vide"]') ? "vide" : document.querySelector('[data-el="pays-sans-flux"]:not([data-avant])') ? "pays" : document.querySelector('[data-el="pays-sans-flux"]') ? "ancien" : "autre")).catch(() => "?");
    if (vus.at(-1)?.[1] !== e) vus.push([Date.now() - t0, e]);
  }, 50);
  await touche(q, "rechercher-zone");
  await q.waitForFunction(() => !document.querySelector('[data-el="rechercher-zone"]'), null, { timeout: 5000 });
  // message du pays présent, sans « Aucune station… », recherche terminée, et stable pendant 1,5 s
  await q.waitForFunction(() => document.querySelector('[data-el="pays-sans-flux"]:not([data-avant])') && !document.querySelector('[data-el="etat-vide"]') && document.querySelector(".scroll")?.getAttribute("aria-busy") === "false", null, { timeout: 30000 });
  await dormir(1500);
  const stable = await q.evaluate(() => !!document.querySelector('[data-el="pays-sans-flux"]:not([data-avant])') && !document.querySelector('[data-el="etat-vide"]'));
  clearInterval(suivi);
  if (!stable) throw new Error("message du pays non stable");
  const t = await txt(q, sel("pays-sans-flux"));
  if (!/Ce pays ne publie pas les prix station par station/.test(t)) throw new Error(t);
  await capturer("V-5.7", 6, q, "V-5.7-06-apres.png", "j'y cherche dans cette zone",
    `« ${t} » (message apparu après le toucher, stable 1,5 s ; suite des états : ${vus.map(([ms, e]) => `${e} ${ms} ms`).join(" → ")}) ; en-tête « ${await txt(q, sel("lieu"))} » ; ${await q.locator(sel("ligne-station")).count()} ligne`);
  await c.close();
}

await navigateur.close();
const interdites = reseau.filter((u) => /myptv|estimer-trajet|trajet-roule/.test(u));
console.log(`réseau : ${reseau.length} requêtes, ${interdites.length} vers myptv / estimer-trajet / trajet-roule`);
fs.writeFileSync("/tmp/m5td/reprises-lignes.txt", lignes.join("\n") + "\n");
