// Exploration du jalon 5 (V1 recentrée) sur l'appli DÉPLOYÉE, bibliothèque Playwright, téléphone émulé (390 × 844, toucher).
// Chaque étape du plan tests/e2e/use-cases/m5-use-case.md : action réelle → lecture du DOM (textes, nombres) → capture au nom
// EXACT (tests/e2e/delivery/) + capture brute (exploration/m5-captures-brutes/). Journal écrit histoire par histoire.
// Simulations déclarées : géolocalisation rejouée (GPX), horloge accélérée (page.clock), « base européenne injoignable »
// (page.route, MOCKED), états préparés en IndexedDB (V-4.3, V-4.4, V-6.2, V-6.3, V-6.4) écrits au format de l'appli.
// Usage : set -a; . ./.env.local; set +a; node tests/e2e/exploration/run-m5.mjs [voiture,trajet,cas,stations,historique,retraits]
import { chromium } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { URL_APP, contexteAvecVoiture, lireGpx, voitureEea } from "./m5-aides.mjs";
import {
  JOURNAL, attr, brancher, cheminM, dormir, ecrireHistoire, ecrireIdb, erreursPage, etape, figerHorloge, heure, histoire, histoiresOuvertes, lireIdb, moyennes,
  nb, noter, pageMaintenant, pointsT3, prixDb, probleme, rejeuFond, reseau, restAnon, resultats, rouler, sqlGestion, stationsDb, surveiller, textesInterdits, txt, verifier, virgule, restService, env,
} from "./m5-explore-outils.mjs";

const PASSAGE = process.env.PASSAGE ?? "essai";
const FLUX = (process.argv[2] ?? "voiture,trajet,cas,stations,historique,retraits").split(",");
const OPTS = { viewport: { width: 390, height: 844 }, hasTouch: true, locale: "fr-FR", timezoneId: "Europe/Paris" };
const ALBI = { latitude: 43.92833, longitude: 2.145916 };
const BARCELONE = { latitude: 41.3874, longitude: 2.1686 };
const DARTFORD = { latitude: 51.4462, longitude: 0.2169 };
const BRUXELLES = { latitude: 50.8467, longitude: 4.3525 };
const MONTAUBAN = { lat: 44.0176, lon: 1.355 };
const PTS = lireGpx("albi-toulouse.gpx");
const IMM = lireGpx("albi-toulouse-immobile-11min.gpx");
const TUN = lireGpx("albi-toulouse-tunnel-90s.gpx");
const BCN = lireGpx("barcelone.gpx");
const navigateur = await chromium.launch();
const VOITURE = await voitureEea("5RBU0C");
const MOY = { E10: await moyennes("SP95-E10"), GAZ: await moyennes("Gazole") };
const CARBS = ["Gazole", "SP95-E10", "SP95", "SP98", "E85", "GPLc"];
const MOY_TOUS = Object.fromEntries(await Promise.all(CARBS.map(async (c) => [c, await moyennes(c)])));
const T3 = '[data-screen="T3"]';
const sel = (el) => `[data-el="${el}"]`;
const touche = (p, el) => p.locator(sel(el)).first().tap();
/** Focus « au clavier » (Maj pressée d'abord : le navigateur affiche alors le contour :focus-visible). */
const focusClavier = async (p, loc) => {
  await p.keyboard.press("Shift");
  await loc.focus();
};
const lireDirect = async (p) => ({ km: nb(await txt(p, sel("direct-km"))), litres: nb(await txt(p, sel("direct-litres"))), euros: nb(await txt(p, sel("direct-euros"))), duree: await txt(p, sel("direct-duree")), moy: await txt(p, sel("direct-moyenne")), l100: await txt(p, sel("direct-l100")), kmh: Number(await attr(p, sel("vitesse"), "data-kmh")), points: await pointsT3(p) });
const directTexte = (d) => `${d.kmh} km/h · ${virgule(d.km, 1)} km · ${virgule(d.litres, 2)} L · ${virgule(d.euros, 2)} € · ${d.duree} · ${d.moy} km/h moy. · ${d.l100} L/100 · ${d.points} points`;
const ongletActif = (p) => attr(p, '[role="tab"][aria-selected="true"]', "data-el");
const prixLigne = async (loc) => nb((await loc.locator(".totem").first().getAttribute("aria-label")) ?? "");
const distLigne = (t) => {
  const m = t.match(/([\d,]+)\s*(km|m)\b/);
  return m ? (m[2] === "km" ? nb(m[1]) : nb(m[1]) / 1000) : NaN;
};
async function lignes(p) {
  const l = p.locator(`${sel("liste-stations")} ${sel("ligne-station")}`);
  const n = await l.count();
  const out = [];
  for (let i = 0; i < n; i++) {
    const x = l.nth(i);
    out.push({ id: await x.getAttribute("data-station"), prix: await prixLigne(x), texte: (await x.innerText()).replace(/\s+/g, " ").trim() });
  }
  return out;
}
const attendreListe = (p) => p.waitForSelector(`${sel("liste-stations")} ${sel("ligne-station")}`, { timeout: 40000 });
const moyFR = (c) => MOY_TOUS[c].get("FR");
const euros2 = (x) => Math.round(x * 100) / 100;

// ---------------------------------------------------------------- journal : en-tête du passage
fs.appendFileSync(
  JOURNAL,
  `\n---\n\n# Passage ${PASSAGE} ${FLUX.join(",")} — début ${new Date().toISOString()}\n\nAppli déployée ${URL_APP}, base Supabase réelle, Playwright (bibliothèque), Chromium headless 390 × 844, toucher, fr-FR, Europe/Paris.\n` +
    `Réel : base EEA (fonction voiture-eea), moyennes du jour (FR SP95-E10 ${virgule(moyFR("SP95-E10"), 3)} €/L, Gazole ${virgule(moyFR("Gazole"), 3)} €/L), stations et prix du jour, géocodage inverse (fonction lieux), refus de localisation (contexte sans permission), coupure réseau (context.setOffline).\n` +
    `Rejoué : géolocalisation par context.setGeolocation depuis tests/e2e/fixtures/albi-toulouse.gpx (et ses dérivés immobile / tunnel, et barcelone.gpx : vrai itinéraire Valhalla fabriqué par creer-gpx.mjs barcelone), horloge de la page accélérée par page.clock (méthode r1a : avancer l'horloge, poser la position, attendre que T3 l'ait comptée), au rythme réel (1 point/s) pendant les passages par Stations.\n`,
);

// ================================================================= 1. Ma voiture (V-1.1 3-4, V-2.x, V-1.2, V-1.1 1-2) — profil persistant (fermer / rouvrir l'appli)
async function fluxVoiture() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "m5-voiture-"));
  const lancer = async () => {
    const c = await chromium.launchPersistentContext(dir, { ...OPTS, permissions: ["geolocation"], geolocation: { ...ALBI, accuracy: 5 } });
    brancher(c, "voiture");
    return c;
  };
  let C = await lancer();
  let p = C.pages()[0] ?? (await C.newPage());
  surveiller(p, "voiture");
  for (const [id, t] of [["V-1.1", "V-1.1 — Ouvrir l'appli"], ["V-1.2", "V-1.2 — Voir ma voiture"], ["V-2.1", "V-2.1 — Saisir le code D.2"], ["V-2.2", "V-2.2 — Vérifier et enregistrer"], ["V-2.3", "V-2.3 — Chercher sans la carte grise"], ["V-2.E1", "V-2.E1 — Code inconnu"]]) histoire(id, t);
  await p.goto(URL_APP);
  await p.waitForSelector('[data-screen="T1"]');
  await etape("V-1.1", 3, p, "V-1.1-03-avant.png", "premier lancement (profil neuf, aucune voiture), j'ouvre l'appli", async () => {
    verifier((await attr(p, sel("ma-voiture"), "data-vide")) === "oui", "la carte voiture n'est pas vide");
    const t = await txt(p, '[data-screen="T1"]');
    verifier(/Enregistre d'abord ta voiture/i.test(t), `texte T1 : ${t}`);
    const o = await ongletActif(p);
    verifier(o === "onglet-trajet", `onglet ${o}`);
    verifier((await p.evaluate(() => localStorage.getItem("pt-voiture-v1"))) === null, "voiture déjà en mémoire");
    return `T1 « ${t} » ; onglet sélectionné : Trajet ; localStorage pt-voiture-v1 absent`;
  });
  await touche(p, "bouton-demarrer");
  await etape("V-1.1", 4, p, "V-1.1-04-apres.png", "je touche « Démarrer » sans voiture", async () => {
    await p.waitForURL("**/voiture", { timeout: 10000 });
    await p.waitForSelector('[data-screen="T2"]');
    const idb = await lireIdb(p);
    verifier(idb.enregistrement == null, "un enregistrement a été créé");
    return `URL /voiture, écran Ma voiture (« ${await txt(p, '[data-screen="T2"] h2')} ») ; aucun enregistrement en IndexedDB`;
  });

  // ---- V-2.1 : D.2
  await p.locator("#d2").tap();
  await etape("V-2.1", 1, p, "V-2.1-01-avant.png", "écran Ma voiture, je touche le champ D.2", async () => {
    verifier((await p.inputValue("#d2")) === "", "champ non vide");
    verifier(await p.locator(sel("enregistrer-voiture")).isDisabled(), "Enregistrer actif");
    return `champ D.2 vide et sélectionné (focus ${await p.evaluate(() => document.activeElement?.id)}) ; « Enregistrer ma voiture » désactivé`;
  });
  const cache5 = await restAnon("versions_eea?select=ve,annee&ve=eq.5RBU0C");
  await p.locator("#d2").pressSequentially("5RBU0C", { delay: 50 });
  await etape("V-2.1", 2, p, "V-2.1-02-apres.png", "je tape « 5RBU0C » (code déjà en cache versions_eea)", async () => {
    await p.waitForSelector(sel("fiche-voiture"), { timeout: 40000 });
    const f = await txt(p, sel("fiche-voiture"));
    const v = { annee: await txt(p, sel("fiche-annee")), kw: await txt(p, sel("fiche-puissance")), cm3: await txt(p, sel("fiche-cylindree")), kg: await txt(p, sel("fiche-masse")), carb: await txt(p, sel("fiche-carburant")), co2: await txt(p, sel("fiche-co2")) };
    verifier(v.annee === "2017" && /87 kW/.test(v.kw) && /118 ch/.test(v.kw) && /1\s?197 cm³/.test(v.cm3) && /1\s?165 kg/.test(v.kg) && v.carb === "SP95-E10" && /118 g\/km/.test(v.co2), `fiche ${JSON.stringify(v)}`);
    verifier(/Base européenne EEA/.test(f), "source EEA absente");
    const nom = await txt(p, `${sel("fiche-voiture")} .nm`);
    noter("V-2.1", `Step 2 — écart de libellé face au plan : l'écran nomme « ${nom} » ; le plan dit « Renault Clio 1.2 TCe 120 ». La base EEA ne porte ni « TCe » ni « 120 » (Cn = CLIO) ; les chiffres sont ceux du plan.`);
    noter("V-2.1", `Step 2 — cache : 5RBU0C présent dans versions_eea AVANT la saisie (${cache5.length} lignes, années ${cache5.map((x) => x.annee).join("/")}) : c'est le chemin « version déjà en cache ».`);
    return `fiche « ${nom} » : année ${v.annee} · ${v.kw} · ${v.cm3} · ${v.kg} · ${v.carb} · ${v.co2} · « Base européenne EEA » ; liste : ${await txt(p, sel("versions-d2"))}`;
  });
  // code partagé par plusieurs marques / années / masses et jamais demandé à l'appli (absent du cache versions_eea) : le premier
  // libre d'une liste tirée de la base EEA (codes D.2 portés par plusieurs marques en 2019) — chaque passage en consomme un ;
  // round 3 : M61A11, AD6DB000M000 et M15DZ000M000 ont leur puissance dans la base (HNSJC1B000 n'en a aucune : « — kW »)
  await p.locator("#d2").fill("");
  let CODE = null;
  for (const c of ["BA1SACEH225", "DAW400L0", "M51AZ1", "HNSJC1B000", "M61A11", "AD6DB000M000", "M15DZ000M000"]) if ((await restAnon(`versions_eea?select=ve&ve=eq.${c}`)).length === 0) { CODE = c; break; }
  const avantCache = await restAnon(`versions_eea?select=ve&ve=eq.${CODE}`);
  await p.locator("#d2").pressSequentially(CODE.slice(0, -1), { delay: 50 });
  await etape("V-2.1", 3, p, "V-2.1-03-avant.png", `code partagé par plusieurs versions, jamais demandé à l'appli : je tape « ${CODE} » sauf le dernier caractère`, async () => {
    verifier(avantCache.length === 0, `${CODE} déjà en cache (${avantCache.length})`);
    verifier((await attr(p, sel("resultat-d2"), "data-etat")) !== "ok", "recherche déjà aboutie");
    return `champ « ${await p.inputValue("#d2")} » ; ${CODE} absent de versions_eea (0 ligne, lu par l'API avant la saisie)`;
  });
  await p.locator("#d2").pressSequentially(CODE.slice(-1), { delay: 50 });
  await p.waitForSelector(`${sel("versions-d2")} button`, { timeout: 60000 }).catch(() => {});
  const vb = p.locator(`${sel("versions-d2")} button`);
  await etape("V-2.1", 4, p, "V-2.1-04-apres.png", `je tape le dernier caractère (« ${CODE} ») puis je choisis la 2e version`, async () => {
    const n = await vb.count();
    verifier(n >= 2, `${n} version(s) listée(s) ; ${await txt(p, sel("resultat-d2"))}`);
    const textes = [];
    for (let i = 0; i < n; i++) textes.push((await vb.nth(i).innerText()).replace(/\s+/g, " "));
    const immat = textes.map((t) => nb(t.match(/([\d\s ]+) immatriculées/)?.[1] ?? "0"));
    verifier(immat.every((x, i) => i === 0 || immat[i - 1] >= x), `ordre des immatriculations ${immat.join(" ≥ ")}`);
    const marques = new Set(textes.map((t) => t.split(" ")[0]));
    const masses = new Set(textes.map((t) => t.match(/· ([\d\s ]+) kg/)?.[1]));
    const annees = new Set(textes.map((t) => t.match(/(?:^|\s)(\d{4}) ·/)?.[1]));
    verifier(marques.size >= 2 || masses.size >= 2 || annees.size >= 2, "versions indiscernables");
    // round 3 (audit r2 lot 1, LOW 6) : un code dont la base EEA porte la puissance — « — kW » refusé
    verifier(textes.every((t) => /\d+ kW/.test(t)), `puissance absente : ${textes.filter((t) => !/\d+ kW/.test(t)).join(" | ")}`);
    const cle = await vb.nth(1).getAttribute("data-cle");
    await vb.nth(1).tap();
    verifier((await vb.nth(1).getAttribute("aria-pressed")) === "true", "choix non retenu");
    verifier((await attr(p, sel("fiche-voiture"), "data-cle")) === cle, "fiche d'une autre version");
    const apres = await restAnon(`versions_eea?select=ve&ve=eq.${CODE}`);
    noter("V-2.1", `Step 4 — chemin « jamais demandée » : ${CODE} absent du cache avant, ${apres.length} ligne(s) dans versions_eea après (écrites par la fonction).`);
    return `${n} versions, la plus immatriculée en tête (${immat.slice(0, 4).join(" ≥ ")}…) ; marques ${[...marques].join(", ")} ; années ${[...annees].join(", ")} ; masses ${[...masses].join(", ")} kg ; 1re : « ${textes[0]} » ; 2e touchée → fiche « ${await txt(p, `${sel("fiche-voiture")} .nm`)} »`;
  });
  await p.locator("#d2").fill("");
  await p.locator("#d2").pressSequentially("r 5rbu", { delay: 50 });
  await etape("V-2.1", 5, p, "V-2.1-05-avant.png", "je commence à taper en minuscules avec espaces : « r 5rbu »", async () => {
    return `champ « ${await p.inputValue("#d2")} » (saisie en minuscules mise en majuscules à la frappe) ; pas de recherche (5 caractères sans espaces)`;
  });
  const reqD2 = [];
  const surReq = (r) => r.url().includes("voiture-eea") && reqD2.push(decodeURIComponent(r.url().split("?")[1] ?? ""));
  p.on("request", surReq);
  await p.locator("#d2").pressSequentially(" 5rbu0c", { delay: 50 });
  await etape("V-2.1", 6, p, "V-2.1-06-apres.png", "je finis « r 5rbu 5rbu0c »", async () => {
    await p.waitForFunction(() => document.querySelector('[data-el="fiche-voiture"]')?.getAttribute("data-cle")?.includes("5RBU0C"), null, { timeout: 40000 });
    const v = await p.inputValue("#d2");
    verifier(v === "R 5RBU 5RBU0C", `champ ${v}`);
    return `champ « ${v} » ; requête envoyée « ${reqD2.slice(-1)[0]} » ; fiche « ${await txt(p, `${sel("fiche-voiture")} .nm`)} · ${await txt(p, sel("fiche-annee"))} » (data-cle ${await attr(p, sel("fiche-voiture"), "data-cle")}) : reconnu comme 5RBU0C`;
  });
  p.off("request", surReq);
  // ---- V-2.E1
  await p.locator("#d2").fill("");
  await p.locator("#d2").pressSequentially("ZZ999", { delay: 50 });
  await etape("V-2.E1", 1, p, "V-2.E1-01-avant.png", "champ D.2, je commence « ZZ999 »", async () => `champ « ${await p.inputValue("#d2")} » ; aucune fiche`);
  await p.locator("#d2").pressSequentially("9", { delay: 50 });
  await etape("V-2.E1", 2, p, "V-2.E1-02-apres.png", "je tape « ZZ9999 » (absent de la base EEA)", async () => {
    await p.waitForSelector(sel("erreur-d2"), { timeout: 40000 });
    const t = await txt(p, sel("erreur-d2"));
    verifier(t === "Code introuvable. Vérifie la case D.2, ou cherche par nom ci-dessous.", t);
    verifier(await p.locator(sel("enregistrer-voiture")).isDisabled(), "Enregistrer actif");
    return `« ${t} » (data-code ${await attr(p, sel("erreur-d2"), "data-code")}) ; « Enregistrer ma voiture » désactivé`;
  });
  // MOCKED: la vraie base EEA ne tombe pas sur commande — réponse 502 simulée côté navigateur pour la fonction voiture-eea
  await p.locator("#d2").fill("");
  await p.route("**/functions/v1/voiture-eea**", (r) => r.fulfill({ status: 502, contentType: "application/json", body: '{"erreur":"base_injoignable"}' }));
  await p.locator("#d2").pressSequentially("5RBF0", { delay: 50 });
  await etape("V-2.E1", 3, p, "V-2.E1-03-avant.png", "MOCKED (page.route : la base européenne ne tombe pas sur commande) — base injoignable, je commence « 5RBF0 »", async () => `champ « ${await p.inputValue("#d2")} » ; réponse de voiture-eea remplacée par un 502 base_injoignable côté navigateur`);
  await p.locator("#d2").pressSequentially("A", { delay: 50 });
  await etape("V-2.E1", 4, p, "V-2.E1-04-apres.png", "MOCKED — je tape « 5RBF0A »", async () => {
    await p.waitForSelector(`${sel("erreur-d2")}[data-code="base_injoignable"]`, { timeout: 20000 });
    const t = await txt(p, sel("erreur-d2"));
    verifier(/La base européenne des voitures ne répond pas/.test(t) && /Réessayer/.test(t), t);
    verifier((await p.inputValue("#d2")) === "5RBF0A", "saisie effacée");
    return `« ${t} » ; champ toujours « 5RBF0A » ; « Enregistrer ma voiture » désactivé : ${await p.locator(sel("enregistrer-voiture")).isDisabled()}`;
  });
  await p.unroute("**/functions/v1/voiture-eea**");
  await touche(p, "reessayer-d2");
  await p.waitForSelector(sel("fiche-voiture"), { timeout: 40000 }).catch(() => {});
  noter("V-2.E1", `Step 4 — route retirée puis « Réessayer » touché : ${(await p.locator(sel("fiche-voiture")).count()) ? `la vraie base répond, fiche « ${await txt(p, `${sel("fiche-voiture")} .nm`)} · ${await txt(p, sel("fiche-carburant"))} »` : "pas de fiche"} (après la capture).`);
  ecrireHistoire("V-2.E1");
  // ---- V-2.2 (désactivé) et V-2.3
  await p.locator("#d2").fill("");
  await p.locator("#q").tap();
  await p.locator("#q").pressSequentially("zz", { delay: 50 });
  await etape("V-2.2", 3, p, "V-2.2-03-avant.png", "aucune version identifiée : D.2 vide, « zz » dans la recherche par nom", async () => `D.2 « ${await p.inputValue("#d2")} », recherche « ${await p.inputValue("#q")} » (moins de 3 caractères : pas de recherche) ; aucune fiche (${await p.locator(sel("fiche-voiture")).count()})`);
  await p.locator("#q").fill("");
  await p.locator("#d2").tap();
  await p.locator("#d2").pressSequentially("5RB", { delay: 50 });
  await etape("V-2.2", 4, p, "V-2.2-04-apres.png", "je regarde « Enregistrer ma voiture » (D.2 incomplet « 5RB »)", async () => {
    verifier(await p.locator(sel("enregistrer-voiture")).isDisabled(), "bouton actif");
    verifier((await p.locator(sel("fiche-voiture")).count()) === 0, "une fiche est affichée");
    return `aucune fiche ; « Enregistrer ma voiture » désactivé (disabled)`;
  }, { cible: sel("enregistrer-voiture") });
  await p.locator("#d2").fill("");
  await p.locator("#q").tap();
  await etape("V-2.3", 1, p, "V-2.3-01-avant.png", "je touche le champ « Nom, année, puissance »", async () => `champ recherche vide et sélectionné (focus #${await p.evaluate(() => document.activeElement?.id)})`, { cible: "#q" });
  await p.locator("#q").pressSequentially("clio 2017 120", { delay: 40 });
  await etape("V-2.3", 2, p, "V-2.3-02-apres.png", "je tape « clio 2017 120 »", async () => {
    await p.waitForSelector(`${sel("suggestions-voiture")} button`, { timeout: 60000 });
    const b = p.locator(`${sel("suggestions-voiture")} button`);
    const n = await b.count();
    const t = [];
    for (let i = 0; i < n; i++) t.push((await b.nth(i).innerText()).replace(/\s+/g, " "));
    for (const x of t) {
      verifier(/clio/i.test(x) && /(^|\s)2017 ·/.test(x), `suggestion hors Clio 2017 : ${x}`);
      const kw = nb(x.match(/· ([\d,]+) kW/)?.[1] ?? "NaN");
      const ch = kw / 0.7355;
      verifier(ch >= 115 && ch <= 125.5, `puissance ${kw} kW = ${ch.toFixed(0)} ch hors 120 ± 5`);
      verifier(/SP95-E10|Gazole|SP98|SP95|E85|GPLc/.test(x), `carburant absent : ${x}`);
    }
    return `${n} suggestions, toutes Clio 2017 entre 115 et 125 ch, avec année, kW et carburant : ${t.join(" | ")}`;
  });
  const premiere = p.locator(`${sel("suggestions-voiture")} button`).first();
  await focusClavier(p, premiere);
  await etape("V-2.3", 3, p, "V-2.3-03-avant.png", "la première suggestion (sélectionnée au clavier)", async () => `« ${(await premiere.innerText()).replace(/\s+/g, " ")} »`, { cible: `${sel("suggestions-voiture")} button` });
  await premiere.tap();
  await etape("V-2.3", 4, p, "V-2.3-04-apres.png", "je la touche", async () => {
    await p.waitForSelector(sel("fiche-voiture"));
    verifier(!(await p.locator(sel("enregistrer-voiture")).isDisabled()), "Enregistrer inactif");
    return `fiche « ${await txt(p, `${sel("fiche-voiture")} .nm`)} » ${await txt(p, sel("fiche-annee"))} · ${await txt(p, sel("fiche-puissance"))} · ${await txt(p, sel("fiche-masse"))} · ${await txt(p, sel("fiche-carburant"))} (data-cle ${await attr(p, sel("fiche-voiture"), "data-cle")}) ; « Enregistrer ma voiture » actif`;
  });
  ecrireHistoire("V-2.3");
  // l'écran de la fiche montre ici la version de la recherche ; on enregistre la Clio de référence par son code D.2
  await p.locator("#d2").tap();
  await p.locator("#d2").pressSequentially("5RBU0C", { delay: 50 });
  await p.waitForFunction(() => document.querySelector('[data-el="fiche-voiture"]')?.getAttribute("data-cle")?.includes("5RBU0C"), null, { timeout: 40000 });
  await etape("V-2.2", 1, p, "V-2.2-01-avant.png", "la fiche de ma version (5RBU0C, 2017) affichée", async () => {
    verifier(!(await p.locator(sel("enregistrer-voiture")).isDisabled()), "bouton inactif");
    return `fiche « ${await txt(p, `${sel("fiche-voiture")} .nm`)} · ${await txt(p, sel("fiche-annee"))} » ; bouton « Enregistrer ma voiture » actif`;
  }, { cible: sel("enregistrer-voiture") });
  ecrireHistoire("V-2.1");
  await touche(p, "enregistrer-voiture");
  await etape("V-2.2", 2, p, "V-2.2-02-apres.png", "je touche « Enregistrer ma voiture »", async () => {
    await p.waitForSelector(sel("nom-voiture"));
    const v = JSON.parse((await p.evaluate(() => localStorage.getItem("pt-voiture-v1"))) ?? "null");
    verifier(v?.ve === "5RBU0C", "voiture non gardée");
    return `accueil : « ${await txt(p, sel("nom-voiture"))} » « ${await txt(p, sel("detail-voiture"))} » ; localStorage pt-voiture-v1 = ${v.marque} ${v.modele} ${v.ve} ${v.annee}`;
  });
  // ---- V-1.2 (1 à 4)
  // round 2 : l'état de départ se voit — l'accueil avec la Clio enregistrée (même image que V-2.2-02 : même écran, même voiture)
  await etape("V-1.2", 1, p, "V-1.2-01-avant.png", "la Clio enregistrée (accueil, juste après « Enregistrer ma voiture »)", async () => {
    verifier((await p.evaluate(() => JSON.parse(localStorage.getItem("pt-voiture-v1")).ve)) === "5RBU0C", "voiture non gardée");
    return `accueil « ${await txt(p, sel("nom-voiture"))} » « ${await txt(p, sel("detail-voiture"))} » ; onglet ${await ongletActif(p)} ; localStorage pt-voiture-v1 = 5RBU0C`;
  });
  await p.reload();
  await etape("V-1.2", 2, p, "V-1.2-02-apres.png", "l'accueil s'affiche (page rechargée)", async () => {
    await p.waitForSelector(sel("nom-voiture"));
    const nom = (await p.locator(sel("nom-voiture")).textContent()).trim();
    const det = (await p.locator(sel("detail-voiture")).textContent()).trim();
    verifier(nom.startsWith("Renault Clio") && det === "1.2 · 118 ch · 2017 · SP95-E10", `écran « ${nom} » « ${det} »`);
    verifier(nom === "Renault Clio IV" && det === "1.2 TCe 120 · 2017 · SP95-E10", `ÉCART DE LIBELLÉ : l'écran montre « ${nom} » et « ${det} », le plan attend « Renault Clio IV » et « 1.2 TCe 120 · 2017 · SP95-E10 » ; la base EEA (Cn = CLIO) ne porte ni « IV » ni « TCe 120 »`);
    return `« ${nom} » « ${det} »`;
  });
  await focusClavier(p, p.locator(sel("changer-voiture")));
  await etape("V-1.2", 3, p, "V-1.2-03-avant.png", "l'accueil, « Changer » sélectionné au clavier", async () => `focus sur « ${await p.evaluate(() => document.activeElement?.textContent)} »`);
  await touche(p, "changer-voiture");
  await etape("V-1.2", 4, p, "V-1.2-04-apres.png", "je touche « Changer »", async () => {
    await p.waitForSelector('[data-screen="T2"]');
    verifier((await p.inputValue("#d2")) === "" && (await p.inputValue("#q")) === "", "champs non vides");
    return `écran Ma voiture, D.2 « » et recherche « » vides ; aucune fiche (${await p.locator(sel("fiche-voiture")).count()})`;
  });
  await touche(p, "retour-trajet-voiture");
  await p.waitForSelector(sel("nom-voiture"));
  // ---- V-1.1 (1-2)
  // round 2 : l'état de départ se voit — une voiture enregistrée, écran Trajet
  await etape("V-1.1", 1, p, "V-1.1-01-avant.png", "une voiture enregistrée sur ce téléphone (écran Trajet)", async () => {
    verifier((await ongletActif(p)) === "onglet-trajet", "onglet");
    return `onglet ${await ongletActif(p)} ; carte « ${await txt(p, sel("nom-voiture"))} · ${await txt(p, sel("detail-voiture"))} » ; voiture ${await p.evaluate(() => JSON.parse(localStorage.getItem("pt-voiture-v1")).ve)}`;
  });
  const p2 = await C.newPage();
  surveiller(p2, "voiture");
  await p2.goto(URL_APP);
  await etape("V-1.1", 2, p2, "V-1.1-02-apres.png", "j'ouvre l'appli (nouvel onglet sur l'adresse de l'appli)", async () => {
    await p2.waitForSelector(sel("nom-voiture"));
    const o = await ongletActif(p2);
    verifier(o === "onglet-trajet", o);
    const t = await txt(p2, '[data-screen="T1"]');
    verifier(!/€|Personnes/i.test(t), `prix ou personnes sur l'accueil : ${t}`);
    verifier((await p2.locator(sel("bouton-demarrer")).textContent()).trim() === "Démarrer", "pas de bouton Démarrer");
    return `onglet Trajet sélectionné ; T1 « ${t} » ; ni prix ni nombre de personnes`;
  });
  await p2.close();
  // ---- V-1.2 (5-6) et V-2.2 : l'appli fermée (contexte fermé) puis rouverte (même profil)
  // round 2 : la capture « avant » est l'appli telle qu'on la laisse, juste avant de fermer le navigateur (une appli fermée ne se
  // photographie pas : r1 montrait l'onglet vide about:blank du navigateur relancé)
  await etape("V-1.2", 5, p, "V-1.2-05-avant.png", "l'appli telle que je la laisse, juste avant de fermer le navigateur (puis relance sur le même profil)", async () => `URL ${p.url()} ; accueil « ${await txt(p, sel("nom-voiture"))} » ; localStorage pt-voiture-v1 = ${await p.evaluate(() => JSON.parse(localStorage.getItem("pt-voiture-v1")).ve)}`);
  await C.close();
  C = await lancer();
  p = C.pages()[0] ?? (await C.newPage());
  surveiller(p, "voiture");
  noter("V-1.2", `Step 5 — navigateur fermé puis relancé sur le même profil : onglet ${p.url()} avant d'ouvrir l'appli.`);
  await p.goto(URL_APP);
  await etape("V-1.2", 6, p, "V-1.2-06-apres.png", "je rouvre l'appli", async () => {
    await p.waitForSelector(sel("nom-voiture"));
    noter("V-2.2", "Step 2 — après fermeture du navigateur et relance sur le même profil, l'accueil rappelle la même voiture (V-1.2-06).");
    return `accueil : « ${await txt(p, sel("nom-voiture"))} » « ${await txt(p, sel("detail-voiture"))} », rien ressaisi`;
  });
  ecrireHistoire("V-1.2");
  ecrireHistoire("V-2.2");
  await C.close();
  fs.rmSync(dir, { recursive: true, force: true });
}

import * as outils from "./m5-explore-outils.mjs";

// ================================================================= 2. Le trajet de la démonstration (Albi → Toulouse rejoué)
async function fluxTrajet() {
  const C = await navigateur.newContext({ ...OPTS, permissions: ["geolocation"], geolocation: { latitude: PTS[0].lat, longitude: PTS[0].lon, accuracy: 5 } });
  brancher(C, "trajet");
  const p = await C.newPage();
  surveiller(p, "trajet");
  for (const [id, t] of [["V-1.3", "V-1.3 — Démarrer"], ["V-3.1", "V-3.1 — Suivre en direct"], ["V-5.6", "V-5.6 — Trajet en cours"], ["V-5.3", "V-5.3 — Rechercher dans cette zone"], ["V-5.5", "V-5.5 — Utiliser ce prix"], ["V-5.1", "V-5.1 — Stations autour de moi"], ["V-3.4", "V-3.4 — Mettre en pause"], ["V-3.5", "V-3.5 — Arrêter"], ["V-4.7", "V-4.7 — Enregistrer ou supprimer"], ["V-4.5", "V-4.5 — Courbe de vitesse"], ["V-4.6", "V-4.6 — Courbe de consommation"], ["V-1.1", "V-1.1 — Ouvrir l'appli"]]) histoire(id, t);
  await p.clock.install();
  // la Clio, enregistrée par l'écran Ma voiture (vrai code D.2) — non capturé ici (V-2.x)
  await p.goto(URL_APP + "/voiture");
  await p.locator("#d2").pressSequentially("5RBU0C", { delay: 40 });
  await p.waitForSelector(sel("fiche-voiture"), { timeout: 40000 });
  await touche(p, "enregistrer-voiture");
  await p.waitForSelector(sel("nom-voiture"));
  // sans trajet : pas de bandeau dans Stations
  await touche(p, "onglet-stations");
  await attendreListe(p).catch(() => {});
  noter("V-5.6", `Step 2 — sans trajet en cours (même téléphone, avant Démarrer) : bandeau « retour-trajet » présent ${await p.locator(sel("retour-trajet")).count()} fois (attendu 0).`);
  if ((await p.locator(sel("retour-trajet")).count()) !== 0) probleme("V-5.6", "- bandeau affiché sans trajet en cours");
  await touche(p, "onglet-trajet");
  await p.waitForSelector(sel("nom-voiture"));
  await etape("V-1.3", 1, p, "V-1.3-01-avant.png", "la Clio enregistrée, localisation autorisée, position = 1er point du GPX (Albi, place du Vigan)", async () => `accueil « ${await txt(p, sel("nom-voiture"))} » ; permission géolocalisation accordée au contexte`);
  await figerHorloge(p);
  const t0 = Date.now();
  await touche(p, "bouton-demarrer");
  await etape("V-1.3", 2, p, "V-1.3-02-apres.png", "je touche « Démarrer »", async () => {
    await p.waitForURL("**/en-route", { timeout: 15000 });
    await p.waitForFunction(() => Number(document.querySelector('[data-screen="T3"]')?.getAttribute("data-points") ?? 0) >= 1, null, { timeout: 10000 });
    const ms = Date.now() - t0;
    const etat = await txt(p, sel("etat-enregistrement"));
    const anim = await p.locator(`${sel("etat-enregistrement")} i`).evaluate((e) => getComputedStyle(e).animationName + " " + getComputedStyle(e).animationIterationCount);
    verifier(etat === "Enregistrement", etat);
    verifier(!anim.startsWith("none"), `pas d'animation (${anim})`);
    verifier(ms < 10000, `${ms} ms`);
    return `écran En route, « ${etat} » (pastille animée : ${anim}) ; 1re position enregistrée en ${ms} ms (data-points ${await pointsT3(p)}) ; IndexedDB enregistrement : ${(await lireIdb(p)).enregistrement ? "présent" : "absent"}`;
  });
  // ---- V-3.1 (1-4)
  await rouler(C, p, PTS, 1, 200);
  const d1 = await lireDirect(p);
  await etape("V-3.1", 1, p, "V-3.1-01-avant.png", "enregistrement en cours, 200 positions rejouées", async () => directTexte(d1));
  const vitesses = [];
  await rouler(C, p, PTS, 200, 400, { chaque: async () => vitesses.push(Number(await attr(p, sel("vitesse"), "data-kmh"))) });
  const d2 = await lireDirect(p);
  await etape("V-3.1", 2, p, "V-3.1-02-apres.png", "je roule : 200 positions de plus (1 par seconde d'horloge)", async () => {
    let changements = 0, plusLong = 0, courant = 0;
    for (let i = 1; i < vitesses.length; i++) {
      if (vitesses[i] !== vitesses[i - 1]) { changements++; plusLong = Math.max(plusLong, courant); courant = 0; } else courant++;
    }
    verifier(d2.km > d1.km && d2.litres > d1.litres && d2.euros > d1.euros && d2.duree !== d1.duree, `pas d'augmentation ${directTexte(d1)} → ${directTexte(d2)}`);
    const courbe = await attr(p, sel("courbe-direct"), "aria-label");
    return `vitesse lue après chaque position : ${changements} changements sur 200 s (la vitesse est redessinée à chaque position, soit chaque seconde ; plus longue valeur identique : ${plusLong + 1} s, arrêts du GPX compris) ; courbe « ${courbe} » ; ${directTexte(d1)} → ${directTexte(d2)}`;
  });
  await rouler(C, p, PTS, 400, 410);
  await etape("V-3.1", 3, p, "V-3.1-03-avant.png", "aucun prix choisi (aucune station touchée)", async () => {
    const s = await attr(p, sel("prix-direct"), "data-source");
    verifier(s === "moyenne", s);
    return `« ${await txt(p, sel("prix-direct"))} »`;
  }, { cible: sel("prix-direct") });
  await rouler(C, p, PTS, 410, 470);
  await etape("V-3.1", 4, p, "V-3.1-04-apres.png", "le coût en direct s'affiche", async () => {
    const d = await lireDirect(p);
    const prix = Number(await attr(p, sel("prix-direct"), "data-prix"));
    verifier(Math.abs(prix - moyFR("SP95-E10")) < 0.0005, `prix ${prix} ≠ moyenne FR SP95-E10 ${moyFR("SP95-E10")}`);
    verifier(Math.abs(d.euros - d.litres * prix) <= 0.005 * prix + 0.006, `${d.euros} € ≠ ${d.litres} L × ${prix}`);
    return `${virgule(d.litres, 2)} L × ${virgule(prix, 3)} €/L (moyenne France du jour SP95-E10 lue par l'API : ${virgule(moyFR("SP95-E10"), 3)}) = ${virgule(d.litres * prix, 3)} → affiché ${virgule(d.euros, 2)} € ; « ${await txt(p, sel("prix-direct"))} »`;
  }, { cible: sel("prix-direct") });
  await rouler(C, p, PTS, 470, 483);
  // ---- V-1.1 (5-6), V-5.3, V-5.5 (1-2) : la voiture est à la station-service du GPX (points 483 à 664, 182 s) ; horloge réelle,
  // positions au rythme réel en arrière-plan. Round 2 : V-1.1-05 montre le trajet en cours (bandeau « ● Trajet en cours » de
  // l'onglet Stations) au lieu d'un Historique vide.
  await p.clock.resume();
  let fond = rejeuFond(C, PTS, 483);
  await touche(p, "onglet-stations");
  await p.waitForSelector(sel("retour-trajet"), { timeout: 10000 });
  await attendreListe(p).catch(() => {});
  await dormir(1200);
  await etape("V-1.1", 5, p, "V-1.1-05-avant.png", "un trajet en cours d'enregistrement ; je suis sur l'onglet Stations (bandeau « Trajet en cours »)", async () => {
    verifier((await p.locator(sel("retour-trajet")).count()) === 1, "bandeau absent");
    return `onglet ${await ongletActif(p)} ; bandeau « ${await txt(p, sel("retour-trajet"))} » ; IndexedDB enregistrement : ${(await lireIdb(p)).enregistrement?.points.length} points`;
  });
  await touche(p, "onglet-trajet");
  await etape("V-1.1", 6, p, "V-1.1-06-apres.png", "je touche l'onglet Trajet", async () => {
    await p.waitForSelector(T3);
    verifier(p.url().endsWith("/en-route"), p.url());
    verifier((await p.locator('[data-screen="T1"]').count()) === 0, "accueil affiché");
    return `URL /en-route, écran En route « ${await txt(p, sel("etat-enregistrement"))} » (pas l'accueil)`;
  });
  await touche(p, "onglet-stations");
  await attendreListe(p);
  await dormir(1500);
  const avantIds = (await lignes(p)).map((l) => l.id);
  const lieuAvant = await txt(p, sel("lieu"));
  await etape("V-5.3", 1, p, "V-5.3-01-avant.png", "la carte des stations (trajet en cours)", async () => `en-tête « ${lieuAvant} » ; ${avantIds.length} stations ; centre ${await p.evaluate(() => { const c = window.__carte.getCenter(); return c.lat.toFixed(3) + ", " + c.lng.toFixed(3); })} zoom ${await p.evaluate(() => window.__carte.getZoom().toFixed(1))}`);
  const nGlisses = await glisserVers(p, MONTAUBAN.lat, MONTAUBAN.lon + 0.06, 40);
  await dormir(1200);
  await etape("V-5.3", 2, p, "V-5.3-02-apres.png", `je fais glisser la carte vers Montauban (${nGlisses} glissements au doigt-souris)`, async () => {
    await p.waitForSelector(sel("rechercher-zone"), { timeout: 5000 });
    const ids = (await lignes(p)).map((l) => l.id);
    verifier(JSON.stringify(ids) === JSON.stringify(avantIds), "la liste a changé d'elle-même");
    return `bouton « ${await txt(p, sel("rechercher-zone"))} » affiché ; liste inchangée (${ids.length} stations, mêmes id) ; en-tête « ${await txt(p, sel("lieu"))} » ; centre ${await p.evaluate(() => { const c = window.__carte.getCenter(); return c.lat.toFixed(3) + ", " + c.lng.toFixed(3); })}`;
  });
  await glisserVers(p, MONTAUBAN.lat, MONTAUBAN.lon, 30);
  await dormir(1000);
  await etape("V-5.3", 3, p, "V-5.3-03-avant.png", "le bouton « Rechercher dans cette zone » (carte recentrée sur Montauban d'un dernier glissement)", async () => {
    verifier((await p.locator(sel("rechercher-zone")).count()) === 1, "bouton absent");
    return `centre ${await p.evaluate(() => { const c = window.__carte.getCenter(); return c.lat.toFixed(3) + ", " + c.lng.toFixed(3); })} ; liste toujours celle d'avant (${(await lignes(p)).length} stations)`;
  });
  await touche(p, "rechercher-zone");
  await etape("V-5.3", 4, p, "V-5.3-04-apres.png", "je touche « Rechercher dans cette zone »", async () => {
    await p.waitForFunction(() => !document.querySelector('[data-el="rechercher-zone"]'), null, { timeout: 5000 });
    await p.waitForFunction((a) => { const l = [...document.querySelectorAll('[data-el="ligne-station"]')].map((x) => x.getAttribute("data-station")); return l.length > 0 && l.join() !== a; }, avantIds.join(), { timeout: 30000 });
    await p.waitForFunction(() => /Montauban/.test(document.querySelector('[data-el="lieu"]')?.textContent ?? ""), null, { timeout: 15000 }).catch(() => {});
    const l = await lignes(p);
    const st = await stationsDb(l.map((x) => x.id));
    const c = await p.evaluate(() => { const m = window.__carte; const c = m.getCenter(); return { lat: c.lat, lon: c.lng, r: Math.max(3000, Math.min(25000, c.distanceTo(m.getBounds().getNorthEast()))) }; });
    const loin = l.filter((x) => { const s = st.get(x.id); return !s || outils.haversine({ lat: c.lat, lon: c.lon }, s) > c.r + 50; });
    verifier(loin.length === 0, `${loin.length} stations hors de la zone`);
    const pastilles = Number(await attr(p, sel("carte-stations"), "data-pastilles"));
    verifier(pastilles === l.length, `${pastilles} pastilles / ${l.length} lignes`);
    return `bouton disparu ; en-tête « ${await txt(p, sel("lieu"))} » ; ${l.length} stations, toutes à moins de ${(c.r / 1000).toFixed(1)} km du centre affiché (${c.lat.toFixed(3)}, ${c.lon.toFixed(3)}), ${pastilles} pastilles ; 1re (Moins cher) « ${l[0]?.texte} »`;
  });
  ecrireHistoire("V-5.3");
  // Utiliser ce prix : la 1re station « Moins cher » de Montauban
  const premiereL = p.locator(`${sel("liste-stations")} ${sel("ligne-station")}`).first();
  const idStation = await premiereL.getAttribute("data-station");
  await premiereL.tap();
  await p.waitForSelector(sel("utiliser-ce-prix"), { timeout: 15000 });
  const P = Number(await attr(p, sel("utiliser-ce-prix"), "data-prix"));
  await etape("V-5.5", 1, p, "V-5.5-01-avant.png", "trajet en cours ; la fiche de la 1re station « Moins cher » de Montauban", async () => {
    const db = await prixDb([idStation], "SP95-E10");
    verifier(Math.abs(db.get(idStation) - P) < 0.0005, `base ${db.get(idStation)} vs bouton ${P}`);
    return `fiche « ${await txt(p, "#sh-name")} » ; bouton « ${await txt(p, sel("utiliser-ce-prix"))} » ; prix SP95-E10 en base pour ${idStation} : ${virgule(db.get(idStation), 3)} €/L. (Le plan cite 2,103 €/L à titre d'exemple : le prix réel du jour est celui lu ici.)`;
  });
  await touche(p, "utiliser-ce-prix");
  await p.waitForURL("**/en-route", { timeout: 10000 });
  let i = await fond.arreter();
  await figerHorloge(p);
  await etape("V-5.5", 2, p, "V-5.5-02-apres.png", `je touche « Utiliser ${virgule(P, 3)} €/L pour mon trajet »`, async () => {
    await p.waitForSelector(T3);
    verifier((await p.locator(sel("fiche-station")).count()) === 0, "fiche encore ouverte");
    const s = await attr(p, sel("prix-direct"), "data-source");
    const x = Number(await attr(p, sel("prix-direct"), "data-prix"));
    verifier(s === "perso" && Math.abs(x - P) < 0.0005, `${s} ${x}`);
    const d = await lireDirect(p);
    verifier(Math.abs(d.euros - d.litres * P) <= 0.005 * P + 0.006, `${d.euros} € ≠ ${d.litres} × ${P}`);
    return `fiche fermée, écran En route ; « ${await txt(p, sel("prix-direct"))} » ; ${virgule(d.litres, 2)} L × ${virgule(P, 3)} = ${virgule(d.litres * P, 3)} → ${virgule(d.euros, 2)} € (la fin de trajet est relue plus bas)`;
  }, { cible: sel("prix-direct") });
  // ---- V-3.1 (5-6) au prix de la station
  await rouler(C, p, PTS, i, i + 5, { premierEcart: 200 });
  i += 5;
  await etape("V-3.1", 5, p, "V-3.1-05-avant.png", "un prix pris sur une station (« Utiliser ce prix »)", async () => `« ${await txt(p, sel("prix-direct"))} » ; ${directTexte(await lireDirect(p))}`, { cible: sel("prix-direct") });
  await rouler(C, p, PTS, i, i + 60);
  i += 60;
  await etape("V-3.1", 6, p, "V-3.1-06-apres.png", "le coût en direct s'affiche (60 positions plus loin)", async () => {
    const d = await lireDirect(p);
    verifier(Math.abs(d.euros - d.litres * P) <= 0.005 * P + 0.006, `${d.euros} € ≠ ${d.litres} × ${P}`);
    return `${virgule(d.litres, 2)} L × ${virgule(P, 3)} = ${virgule(d.litres * P, 3)} → affiché ${virgule(d.euros, 2)} € ; « ${await txt(p, sel("prix-direct"))} »`;
  }, { cible: sel("prix-direct") });
  ecrireHistoire("V-3.1");
  await rouler(C, p, PTS, i, 900);
  i = 900;
  const eAvantStations = (await lireDirect(p)).euros;
  // ---- V-5.6 : Stations pendant le trajet, la voiture roule (positions au rythme réel en arrière-plan)
  await p.clock.resume();
  fond = rejeuFond(C, PTS, i);
  await touche(p, "onglet-stations");
  await etape("V-5.6", 1, p, "V-5.6-01-avant.png", "un trajet en cours ; je touche l'onglet Stations (positions envoyées au rythme réel, 1 par seconde)", async () => {
    await p.waitForSelector('[data-screen="T5"]');
    return `écran Stations ouvert ; bandeau « ${await txt(p, sel("retour-trajet"))} »`;
  });
  await attendreListe(p);
  await dormir(4000);
  const bandeau1 = await txt(p, sel("retour-trajet"));
  await etape("V-5.6", 2, p, "V-5.6-02-apres.png", "l'onglet Stations est ouvert", async () => {
    verifier(/^● Trajet en cours · [\d,]+ €$/.test(bandeau1), bandeau1);
    const x = nb(bandeau1.split("·")[1]);
    verifier(x >= eAvantStations - 0.001 && x - eAvantStations < 0.3, `${x} € vs ${eAvantStations} € au départ de l'écran`);
    return `bandeau en haut « ${bandeau1} » (coût en direct ; ${virgule(eAvantStations, 2)} € sur En route juste avant) ; ${await p.locator(`${sel("liste-stations")} li`).count()} stations listées`;
  });
  await dormir(6000);
  await etape("V-5.6", 3, p, "V-5.6-03-avant.png", "ce bandeau, 6 s plus tard (la voiture roule)", async () => {
    const t = await txt(p, sel("retour-trajet"));
    verifier(nb(t.split("·")[1]) > nb(bandeau1.split("·")[1]), `${bandeau1} → ${t}`);
    return `« ${t} » (« ${bandeau1} » 6 s plus tôt : le coût du bandeau suit le trajet) ; positions rejouées jusqu'au point ${fond.index()}`;
  });
  const pointsAvantRetour = (await lireIdb(p)).enregistrement?.points.length;
  await touche(p, "onglet-trajet");
  await etape("V-5.6", 4, p, "V-5.6-04-apres.png", "je touche l'onglet Trajet", async () => {
    await p.waitForSelector(T3);
    verifier(p.url().endsWith("/en-route"), p.url());
    return `écran En route revenu ; ${await pointsT3(p)} points (${pointsAvantRetour} au moment du toucher) ; ${directTexte(await lireDirect(p))}`;
  });
  i = await fond.arreter();
  await figerHorloge(p);
  // ---- V-5.1 (3-4) : Stations puis retour, l'enregistrement continue
  await rouler(C, p, PTS, i, 1450, { premierEcart: 200 });
  i = 1450;
  const dAvant = await lireDirect(p);
  await p.clock.resume();
  fond = rejeuFond(C, PTS, i);
  await touche(p, "onglet-stations");
  await attendreListe(p).catch(() => {});
  await etape("V-5.1", 3, p, "V-5.1-03-avant.png", "un trajet en cours (A68, 1 450 positions) ; j'ouvre l'onglet Stations", async () => {
    const ici = { lat: PTS[i].lat, lon: PTS[i].lon };
    const l = await lignes(p);
    const st = await stationsDb(l.map((x) => x.id));
    const loin = l.filter((x) => outils.haversine(ici, st.get(x.id)) > 10050);
    verifier(l.length > 0 && loin.length === 0, `${loin.length}/${l.length} stations à plus de 10 km de la voiture (${ici.lat.toFixed(4)}, ${ici.lon.toFixed(4)})`);
    return `écran Stations autour de la voiture (${ici.lat.toFixed(4)}, ${ici.lon.toFixed(4)}, ${virgule(dAvant.km, 1)} km après Albi) : ${l.length} stations toutes à moins de 10 km d'elle ; 1re « ${l[0].texte} » ; bandeau « ${await txt(p, sel("retour-trajet"))} » ; sur En route juste avant : ${directTexte(dAvant)}`;
  });
  await dormir(12000);
  await touche(p, "onglet-trajet");
  i = await fond.arreter();
  await figerHorloge(p);
  await etape("V-5.1", 4, p, "V-5.1-04-apres.png", "je reviens au trajet (onglet Trajet) après 12 s dans Stations", async () => {
    await p.waitForSelector(T3);
    const d = await lireDirect(p);
    verifier(d.km > dAvant.km && d.points > dAvant.points, `${directTexte(dAvant)} → ${directTexte(d)}`);
    return `distance ${virgule(dAvant.km, 1)} → ${virgule(d.km, 1)} km, points ${dAvant.points} → ${d.points} : l'enregistrement a continué pendant Stations`;
  });
  // ---- V-3.4 Pause
  await rouler(C, p, PTS, i, 1750, { premierEcart: 200 });
  i = 1750;
  await etape("V-3.4", 1, p, "V-3.4-01-avant.png", "un enregistrement en cours (A68)", async () => directTexte(await lireDirect(p)));
  await touche(p, "bouton-pause");
  const dPause = await lireDirect(p);
  await rouler(C, p, PTS, i, i + 20, { attendre: false });
  i += 20;
  await etape("V-3.4", 2, p, "V-3.4-02-apres.png", "je touche « Pause » puis 20 positions arrivent", async () => {
    const d = await lireDirect(p);
    const e = await txt(p, sel("etat-enregistrement"));
    verifier(e === "En pause", e);
    verifier((await txt(p, sel("bouton-pause"))) === "Reprendre", "bouton");
    verifier(d.km === dPause.km && d.litres === dPause.litres, `${directTexte(dPause)} → ${directTexte(d)}`);
    return `« ${e} », bouton « Reprendre » ; km ${virgule(d.km, 1)} et litres ${virgule(d.litres, 2)} inchangés malgré ${virgule(cheminM(PTS, 1750, i) / 1000, 2)} km parcourus sur le GPX`;
  });
  let j = i;
  while (cheminM(PTS, 1750, j) < 2050) j++;
  await rouler(C, p, PTS, i, j + 1, { attendre: false });
  i = j + 1;
  await etape("V-3.4", 3, p, "V-3.4-03-avant.png", "une pause pendant laquelle la voiture s'est déplacée", async () => {
    const d = await lireDirect(p);
    verifier(d.km === dPause.km, `km ${d.km} vs ${dPause.km}`);
    return `déplacement pendant la pause : ${virgule(cheminM(PTS, 1750, j) / 1000, 2)} km (GPX, points 1750 → ${j}) ; affiché toujours ${virgule(d.km, 1)} km, ${virgule(d.litres, 2)} L`;
  });
  await p.locator(sel("bouton-pause")).tap();
  await rouler(C, p, PTS, i, i + 60);
  await etape("V-3.4", 4, p, "V-3.4-04-apres.png", "je touche « Reprendre » puis 60 positions", async () => {
    const d = await lireDirect(p);
    const attendu = cheminM(PTS, i, i + 59) / 1000;
    const delta = d.km - dPause.km;
    verifier(Math.abs(delta - attendu) <= 0.15, `+${delta.toFixed(2)} km affichés ; ${attendu.toFixed(2)} km roulés depuis la reprise`);
    return `« ${await txt(p, sel("etat-enregistrement"))} » ; km ${virgule(dPause.km, 1)} → ${virgule(d.km, 1)} (+${virgule(delta, 1)}) = distance roulée depuis la reprise (${virgule(attendu, 2)} km) ; les ${virgule(cheminM(PTS, 1750, j) / 1000, 2)} km de la pause ne sont ni comptés ni chiffrés`;
  });
  ecrireHistoire("V-3.4");
  i += 60;
  // ---- jusqu'à Toulouse
  await rouler(C, p, PTS, i, PTS.length);
  const dFin = await lireDirect(p);
  await etape("V-3.5", 1, p, "V-3.5-01-avant.png", "un enregistrement de plus de 1 km (arrivée au Capitole, Toulouse)", async () => directTexte(dFin));
  await touche(p, "bouton-arreter");
  await p.waitForURL("**/fin", { timeout: 20000 });
  await p.clock.runFor(500);
  await p.waitForFunction(() => document.querySelector('[data-el="titre-trajet"]')?.getAttribute("data-noms") === "oui", null, { timeout: 20000 }).catch(() => {});
  const idTrajet = await attr(p, '[data-screen="T4"]', "data-trajet");
  await etape("V-3.5", 2, p, "V-3.5-02-apres.png", "je touche « Arrêter »", async () => {
    verifier((await attr(p, sel("titre-trajet"), "data-noms")) === "oui", "noms des lieux absents");
    const litres = Number(await attr(p, sel("fin-litres"), "data-litres"));
    const km = Number(await attr(p, sel("fin-km"), "data-km"));
    const l100 = await txt(p, sel("fin-l100"));
    verifier(Math.abs(nb(l100) - (litres / km) * 100) < 0.051, `L/100 ${l100}`);
    return `« ${await txt(p, sel("titre-trajet"))} » ; « ${await txt(p, sel("sous-titre-trajet"))} » ; ${await txt(p, sel("fin-litres"))} L (${litres.toFixed(3)}), ${await txt(p, sel("fin-km"))} km (${km.toFixed(2)}), ${l100} L/100 km moy.`;
  });
  noter("V-5.5", `Step 2 — la fin de ce même trajet, au prix de la station, est la capture V-4.7-01-avant.png (libellé « Mon prix », 3 personnes) ; fin de trajet : libellé « ${await txt(p, sel("libelle-prix"))} », prix data-prix ${await attr(p, sel("prix-apres"), "data-prix")} (station : ${virgule(P, 3)}), coût ${await txt(p, sel("cout-trajet"))}.`);
  if (Math.abs(Number(await attr(p, sel("prix-apres"), "data-prix")) - P) > 0.0005) probleme("V-5.5", "- la fin de trajet n'utilise pas le prix de la station");
  // ---- démonstration : 3 personnes, courbes, Enregistrer
  await touche(p, "personnes-plus");
  await touche(p, "personnes-plus");
  await etape("V-4.7", 1, p, "V-4.7-01-avant.png", "un trajet qui vient d'être arrêté (3 personnes choisies)", async () => {
    const cout = Number(await attr(p, sel("cout-trajet"), "data-cout"));
    const part = Number(await attr(p, sel("part-personne"), "data-part"));
    verifier(Math.abs(part - euros2(cout / 3)) < 0.001, `${part} vs ${cout}/3`);
    return `prix « ${await txt(p, sel("libelle-prix"))} » ${virgule(P, 3)} €/L ; coût ${virgule(cout, 2)} € ; « ${await txt(p, sel("part-personne"))} » ; boutons « ${await txt(p, sel("enregistrer-ou-supprimer"))} »`;
  }, { cible: sel("enregistrer-ou-supprimer") });
  const coutDemo = Number(await attr(p, sel("cout-trajet"), "data-cout"));
  await touche(p, "enregistrer-trajet");
  await etape("V-4.7", 2, p, "V-4.7-02-apres.png", "je touche « Enregistrer »", async () => {
    await p.waitForURL("**/historique");
    await p.waitForSelector("li.hrow");
    const premiere = await p.locator("li.hrow").first().getAttribute("data-trajet");
    verifier(premiere === idTrajet, `en tête ${premiere} ≠ ${idTrajet}`);
    const rec = (await lireIdb(p)).trajets.find((t) => t.id === idTrajet);
    verifier(rec && rec.enregistre && rec.personnes === 3 && Math.abs(rec.prix_perso - P) < 0.0005 && rec.carburant === "SP95-E10", JSON.stringify({ personnes: rec?.personnes, prix: rec?.prix_perso, carb: rec?.carburant }));
    const ligneCarb = await txt(p, `li.hrow[data-trajet="${idTrajet}"] [data-el="carburant-ligne"]`);
    verifier(ligneCarb === `SP95-E10 à ${virgule(P, 3)} €/L`, `ligne : ${ligneCarb}`);
    verifier(/€ chacun/.test(await txt(p, `li.hrow[data-trajet="${idTrajet}"] [data-el="part-ligne"]`)), "part absente (3 personnes)");
    return `onglet Historique, en tête : « ${(await p.locator("li.hrow").first().innerText()).replace(/\s+/g, " ")} » ; IndexedDB : prix ${rec.prix_perso} (station), carburant ${rec.carburant}, ${rec.personnes} personnes, enregistré ; totaux « ${await txt(p, sel("totaux-historique"))} »`;
  });
  // round 2 : l'état de départ se voit — la fin du trajet enregistré, rouverte depuis l'historique (écran Fin de trajet)
  await p.locator("li.hrow button").first().tap();
  await p.waitForSelector(sel("courbe-vitesse"));
  const rec = (await lireIdb(p)).trajets.find((t) => t.id === idTrajet);
  await etape("V-4.5", 1, p, "V-4.5-01-avant.png", "un trajet enregistré, rouvert depuis l'historique (écran Fin de trajet, haut)", async () => `onglet ${await ongletActif(p)} ; « ${await txt(p, sel("titre-trajet"))} » ; « ${await txt(p, sel("sous-titre-trajet"))} » ; enregistré : ${await attr(p, '[data-screen="T4"]', "data-enregistre")}`, { haut: true });
  await etape("V-4.5", 2, p, "V-4.5-02-apres.png", "la fin de trajet s'affiche (rouverte) — courbe de vitesse", async () => {
    const n = Number(await attr(p, sel("courbe-vitesse"), "data-points"));
    verifier(n > 50 && n <= 600, `${n} points`);
    const moyRoule = (rec.km / rec.duree_s) * 3600;
    const total = (rec.km / ((rec.fin - rec.debut) / 1000)) * 3600;
    return `« ${await txt(p, sel("info-vitesse"))} » ; ${n} points de courbe (≤ 600) pour ${Math.round((rec.fin - rec.debut) / 1000)} s de trajet ; vitesse moyenne affichée ${rec.vitesse_moy} km/h ; km ÷ durée roulée (${rec.duree_s} s, pause exclue) = ${moyRoule.toFixed(1)} km/h ; km ÷ durée totale = ${total.toFixed(1)} km/h ; ${rec.accelerations} accélérations`;
  }, { cible: sel("courbe-vitesse") });
  if (Math.abs(rec.vitesse_moy - (rec.km / rec.duree_s) * 3600) > 2) probleme("V-4.5", `- vitesse moyenne ${rec.vitesse_moy} km/h ≠ km ÷ durée roulée ${((rec.km / rec.duree_s) * 3600).toFixed(1)} km/h (à vérifier : définition de duree_s)`);
  await etape("V-4.6", 1, p, "V-4.6-01-avant.png", "un trajet enregistré (fin rouverte, haut de l'écran)", async () => `onglet ${await ongletActif(p)} ; « ${await txt(p, sel("retour-historique"))} » ; « ${await txt(p, sel("titre-trajet"))} »`, { haut: true });
  await etape("V-4.6", 2, p, "V-4.6-02-apres.png", "la courbe de consommation", async () => {
    const info = await txt(p, sel("info-conso"));
    const moy = (rec.litres / rec.km) * 100;
    const pointe = Math.max(rec.conso_max, ...rec.consos);
    verifier(info === `moy. ${virgule(moy, 1)} · pointe ${virgule(pointe, 1)} L/100`, `${info} vs ${moy}/${pointe}`);
    verifier(pointe < 30, `pointe ${pointe} L/100 : courbe écrasée (round 2 : lissage sur 500 m)`);
    const n = Number(await attr(p, sel("courbe-conso"), "data-points"));
    verifier(n > 50 && n <= 600, `${n} points`);
    const moyCourbe = rec.consos.reduce((s, x) => s + x, 0) / rec.consos.length;
    return `« ${info} » ; litres ÷ km × 100 = ${rec.litres.toFixed(3)} ÷ ${rec.km.toFixed(2)} × 100 = ${moy.toFixed(2)} ; ${n} points (moyenne simple des points de la courbe : ${moyCourbe.toFixed(2)}, non pondérée par la distance)`;
  }, { cible: sel("courbe-conso") });
  ecrireHistoire("V-4.5");
  ecrireHistoire("V-4.6");
  noter("V-4.7", `Démonstration : coût ${virgule(coutDemo, 2)} € au prix de la station ${virgule(P, 3)} €/L, partagé à 3.`);
  await C.close();
}

// ---- glisser la carte (vrais gestes souris sur le canevas MapLibre ; la projection de la carte sert seulement à viser)
async function glisser(p, dx, dy) {
  const bb = await p.locator(`${sel("carte-stations")} canvas`).first().boundingBox();
  const x0 = bb.x + bb.width / 2 - dx / 2, y0 = bb.y + bb.height / 2 - dy / 2;
  await p.mouse.move(x0, y0);
  await p.mouse.down();
  for (let s = 1; s <= 14; s++) await p.mouse.move(x0 + (dx * s) / 14, y0 + (dy * s) / 14);
  await dormir(180);
  await p.mouse.up();
  await dormir(500);
}
async function glisserVers(p, lat, lon, tolerance = 30) {
  let k = 0;
  for (; k < 16; k++) {
    const r = await p.evaluate(([lon, lat]) => { const m = window.__carte; const q = m.project([lon, lat]); const c = m.getContainer(); return { x: q.x, y: q.y, w: c.clientWidth, h: c.clientHeight }; }, [lon, lat]);
    const dx = r.w / 2 - r.x, dy = r.h / 2 - r.y;
    if (Math.hypot(dx, dy) < tolerance) break;
    const f = Math.min(1, (r.w - 60) / Math.abs(dx || 1), (r.h - 60) / Math.abs(dy || 1));
    await glisser(p, dx * f, dy * f);
  }
  return k;
}

// ================================================================= 3. Cas limites du trajet (refus, trop court, réseau, immobile, tunnel, prix, Barcelone)
async function fluxCas() {
  for (const [id, t] of [["V-1.3", "V-1.3 — Démarrer (localisation refusée)"], ["V-3.5", "V-3.5 — Arrêter (cas limites)"], ["V-4.7", "V-4.7 — Enregistrer ou supprimer (supprimer, appli fermée)"], ["V-3.E1", "V-3.E1 — Oubli d'arrêter"], ["V-3.E2", "V-3.E2 — GPS perdu"], ["V-4.1", "V-4.1 — Prix de l'essence"], ["V-4.2", "V-4.2 — Mettre mon prix"]]) histoire(id, t);
  // ---- V-1.3 (3-4) : vrai refus (contexte sans permission de géolocalisation)
  {
    const C = await contexteAvecVoiture(navigateur, VOITURE, ALBI, []);
    brancher(C, "cas-refus");
    const p = await C.newPage();
    surveiller(p, "cas-refus");
    await p.goto(URL_APP);
    await p.waitForSelector(sel("nom-voiture"));
    await etape("V-1.3", 3, p, "V-1.3-03-avant.png", "la localisation refusée (contexte sans permission geolocation)", async () => `accueil « ${await txt(p, sel("nom-voiture"))} » ; permission géolocalisation : ${await p.evaluate(async () => (await navigator.permissions.query({ name: "geolocation" })).state)}`);
    await touche(p, "bouton-demarrer");
    await etape("V-1.3", 4, p, "V-1.3-04-apres.png", "je touche « Démarrer »", async () => {
      await p.waitForSelector(sel("message-localisation"), { timeout: 15000 });
      verifier((await attr(p, sel("message-localisation"), "data-erreur")) === "refusee", "erreur ≠ refusee");
      const idb = await lireIdb(p);
      verifier(idb.enregistrement == null && idb.trajets.length === 0, "trajet créé");
      verifier(!p.url().includes("en-route"), p.url());
      return `« ${await txt(p, sel("message-localisation"))} » ; URL ${new URL(p.url()).pathname} ; IndexedDB : enregistrement absent, ${idb.trajets.length} trajet`;
    });
    ecrireHistoire("V-1.3");
    await C.close();
  }
  const C = await contexteAvecVoiture(navigateur, VOITURE, { latitude: PTS[0].lat, longitude: PTS[0].lon });
  brancher(C, "cas");
  const nouvellePage = async (pts) => {
    const p = await C.newPage();
    surveiller(p, "cas");
    await C.setGeolocation({ latitude: pts[0].lat, longitude: pts[0].lon, accuracy: 5 });
    await p.clock.install();
    await p.goto(URL_APP);
    await p.waitForSelector(sel("bouton-demarrer"));
    await figerHorloge(p);
    await touche(p, "bouton-demarrer");
    await p.waitForURL("**/en-route", { timeout: 15000 });
    await p.waitForFunction(() => document.querySelector('[data-el="prix-direct"]')?.getAttribute("data-prix"), null, { timeout: 15000 }).catch(() => {});
    return p;
  };
  // ---- V-3.5 (3-4) : moins de 1 km
  {
    const p = await nouvellePage(PTS);
    await rouler(C, p, PTS, 1, 150);
    await etape("V-3.5", 3, p, "V-3.5-03-avant.png", "un enregistrement de moins de 1 km (150 positions)", async () => directTexte(await lireDirect(p)));
    await touche(p, "bouton-arreter");
    await etape("V-3.5", 4, p, "V-3.5-04-apres.png", "je touche « Arrêter »", async () => {
      await p.waitForSelector(sel("trop-court"), { timeout: 10000 });
      const t = await txt(p, sel("trop-court"));
      verifier(/^Trajet trop court : [\d,]+ km sur 1 minimum\./.test(t) && /Rien n'est ajouté à l'historique/.test(t), t);
      const idb = await lireIdb(p);
      verifier(idb.trajets.length === 0 && !idb.arrete && !idb.enregistrement, JSON.stringify({ t: idb.trajets.length, a: !!idb.arrete }));
      return `« ${t} » ; IndexedDB : 0 trajet, pas de trajet arrêté, pas d'enregistrement`;
    });
    await p.close();
  }
  // ---- V-3.5 (5-6) puis V-4.7 (3-4) : pas de réseau à l'arrêt
  {
    const p = await nouvellePage(PTS);
    await rouler(C, p, PTS, 1, 420);
    await C.setOffline(true);
    await etape("V-3.5", 5, p, "V-3.5-05-avant.png", "aucun réseau (context.setOffline(true)) juste avant l'arrêt — 420 positions", async () => {
      verifier((await p.evaluate(() => navigator.onLine)) === false, "navigator.onLine vrai");
      verifier((await p.locator(sel("hors-ligne")).count()) === 1, "« Hors ligne » non affiché");
      return `navigator.onLine = false ; « ${await txt(p, sel("hors-ligne"))} » ; ${directTexte(await lireDirect(p))} ; « ${await txt(p, sel("prix-direct"))} »`;
    });
    const reqHors = reseau.length;
    await touche(p, "bouton-arreter");
    await p.waitForURL("**/fin", { timeout: 15000 });
    await p.clock.runFor(500);
    await p.waitForSelector(sel("cout-trajet"));
    let avantNoms = "";
    await etape("V-3.5", 6, p, "V-3.5-06-apres.png", "la fin de trajet s'ouvre sans réseau", async () => {
      const litres = Number(await attr(p, sel("fin-litres"), "data-litres"));
      const cout = Number(await attr(p, sel("cout-trajet"), "data-cout"));
      const prix = Number(await attr(p, sel("prix-apres"), "data-prix"));
      verifier(Math.abs(cout - euros2(litres * prix)) < 0.001, `${cout} vs ${litres}×${prix}`);
      verifier((await attr(p, sel("titre-trajet"), "data-noms")) === "non", "noms déjà connus");
      verifier((await p.evaluate(() => navigator.onLine)) === false && (await p.locator(sel("hors-ligne")).count()) === 1, "pas hors ligne à la capture");
      avantNoms = await txt(p, sel("titre-trajet"));
      // round 2 : la capture est prise PENDANT la coupure (r1 rétablissait le réseau avant la capture : elle montrait « ALBI → ALBI »)
      return `hors ligne (capture prise pendant la coupure) : titre « ${avantNoms} » (coordonnées, noms pas encore connus) ; « ${await txt(p, sel("hors-ligne"))} » ; ${virgule(litres, 3)} L × ${virgule(prix, 3)} €/L (moyenne gardée au départ) = ${virgule(cout, 2)} € calculés sur le téléphone`;
    });
    // retour du réseau APRÈS la capture : les noms se complètent seuls (relevé au journal)
    await C.setOffline(false);
    const okNoms = await p.waitForFunction(() => document.querySelector('[data-el="titre-trajet"]')?.getAttribute("data-noms") === "oui", null, { timeout: 30000 }).then(() => true, () => false);
    noter("V-3.5", `Step 6 — après la capture, retour du réseau (setOffline(false) → événement online) : le titre passe de « ${avantNoms} » à « ${await txt(p, sel("titre-trajet"))} » sans rien toucher ${okNoms ? "✓" : "✗ (noms non complétés en 30 s)"} ; « Hors ligne » affiché : ${await p.locator(sel("hors-ligne")).count()} ; requêtes tentées pendant la coupure : ${reseau.length - reqHors} (refusées par le navigateur hors ligne).`);
    if (!okNoms) probleme("V-3.5", "- noms des lieux non complétés au retour du réseau");
    await etape("V-4.7", 3, p, "V-4.7-03-avant.png", "un trajet qui vient d'être arrêté (celui de la coupure réseau, noms complétés)", async () => `« ${await txt(p, sel("titre-trajet"))} » ; boutons « ${await txt(p, sel("enregistrer-ou-supprimer"))} »`, { cible: sel("enregistrer-ou-supprimer") });
    await touche(p, "supprimer-neuf");
    await p.waitForSelector('[data-screen="T1"]', { timeout: 10000 }).catch(() => {});
    await etape("V-4.7", 4, p, "V-4.7-04-apres.png", "je touche « Supprimer »", async () => {
      await p.waitForSelector('[data-screen="T1"]');
      const idb = await lireIdb(p);
      verifier(idb.trajets.length === 0 && !idb.arrete && !idb.enregistrement, "trace restante");
      await touche(p, "onglet-historique");
      await p.waitForSelector(sel("historique-vide"), { timeout: 10000 });
      const h = await txt(p, sel("historique"));
      await touche(p, "onglet-trajet");
      verifier(/Aucun trajet enregistré/.test(h), h);
      return `accueil (URL ${new URL(p.url()).pathname}) ; IndexedDB : 0 trajet, aucun trajet arrêté ni point gardé ; Historique : « ${h} »`;
    });
    await p.close();
  }
  ecrireHistoire("V-3.5");
  // ---- V-3.E1 : immobile 10 min
  const versAlerte = async (p) => {
    let tImm = null;
    await rouler(C, p, IMM, 1, 774, { chaque: async (k) => { if (k === 773) tImm = await pageMaintenant(p); } });
    await rouler(C, p, IMM, 774, 1365);
    let k = 1365;
    while (k < IMM.length && (await attr(p, T3, "data-etat")) !== "immobile") {
      await rouler(C, p, IMM, k, k + 1, { attendre: false });
      await p.clock.runFor(10);
      k++;
    }
    return { k, tImm };
  };
  {
    const p = await nouvellePage(IMM);
    await rouler(C, p, IMM, 1, 700);
    await etape("V-3.E1", 1, p, "V-3.E1-01-avant.png", "un enregistrement en cours (700 positions, 4 km dans Albi)", async () => directTexte(await lireDirect(p)));
    // suite du rejeu jusqu'à l'alerte (point 774 = début de l'immobilité)
    let tImm = null;
    await rouler(C, p, IMM, 700, 774, { chaque: async (k) => { if (k === 773) tImm = await pageMaintenant(p); } });
    const d774 = await lireDirect(p);
    const kmhGare = [];
    await rouler(C, p, IMM, 774, 1365, { chaque: async (j) => { if (j % 37 === 0) kmhGare.push(Number(await attr(p, sel("vitesse"), "data-kmh"))); } });
    const d1365 = await lireDirect(p);
    // round 2 (audit lot 1, MEDIUM 3) : garé à ±2 m pendant ~10 min, ni km, ni litres, ni vitesse
    noter("V-3.E1", `Garé (points 774 → 1365, bruit ±2 m, juste avant l'alerte) : km ${virgule(d774.km, 1)} → ${virgule(d1365.km, 1)}, litres ${virgule(d774.litres, 2)} → ${virgule(d1365.litres, 2)}, vitesse affichée relevée tous les 37 points : ${kmhGare.join(", ")} km/h ${d1365.km === d774.km && d1365.litres === d774.litres && kmhGare.every((x) => x === 0) ? "✓" : "✗"} (r1 : 4,0 → 5,1 km et 5 à 10 km/h).`);
    if (!(d1365.km === d774.km && kmhGare.every((x) => x === 0))) probleme("V-3.E1", "- bruit du GPS à l'arrêt encore compté");
    let k = 1365;
    while (k < IMM.length && (await attr(p, T3, "data-etat")) !== "immobile") {
      await rouler(C, p, IMM, k, k + 1, { attendre: false });
      await p.clock.runFor(10);
      k++;
    }
    const dA = await lireDirect(p);
    await rouler(C, p, IMM, k, Math.min(IMM.length, k + 5), { attendre: false });
    await etape("V-3.E1", 2, p, "V-3.E1-02-apres.png", `vitesse < 3 km/h et position dans 50 m pendant 10 min (points 774 → ${k} du tracé dérivé)`, async () => {
      const t = await txt(p, sel("alerte-immobile"));
      verifier(/Trajet arrêté : immobile depuis 10 min\./.test(t) && /Reprendre/.test(t) && /C'est fini/.test(t), t);
      const depuis = Number(await attr(p, sel("alerte-immobile"), "data-depuis"));
      const d = await lireDirect(p);
      verifier(d.km === dA.km && d.litres === dA.litres, "le trajet compte encore");
      return `« ${t} » au point ${k} (${k - 774} s après le début de l'immobilité) ; début daté ${new Date(depuis).toISOString().slice(11, 19)} (point 774 reçu à ${new Date(tImm).toISOString().slice(11, 19)}, écart ${((depuis - tImm) / 1000).toFixed(0)} s) ; 5 positions de plus : km ${virgule(d.km, 1)} et litres ${virgule(d.litres, 2)} figés ; état « ${await txt(p, sel("etat-enregistrement"))} »`;
    });
    await focusClavier(p, p.locator(sel("immobile-fini")));
    await etape("V-3.E1", 3, p, "V-3.E1-03-avant.png", "cette alerte (« C'est fini » sélectionné)", async () => `focus « ${await p.evaluate(() => document.activeElement?.textContent)} »`);
    await touche(p, "immobile-fini");
    await etape("V-3.E1", 4, p, "V-3.E1-04-apres.png", "je touche « C'est fini »", async () => {
      await p.waitForURL("**/fin", { timeout: 15000 });
      await p.clock.runFor(500);
      await p.waitForFunction(() => document.querySelector('[data-el="titre-trajet"]')?.getAttribute("data-noms") === "oui", null, { timeout: 20000 }).catch(() => {});
      const a = (await lireIdb(p)).arrete;
      const st = await txt(p, sel("sous-titre-trajet"));
      verifier(Math.abs(a.fin - tImm) <= 2000, `fin ${a.fin} vs début immobilité ${tImm}`);
      verifier(/· 12 min ·/.test(st), st);
      return `« ${await txt(p, sel("titre-trajet"))} » « ${st} » ; arrivée datée ${new Date(a.fin).toISOString().slice(11, 19)} = début de l'immobilité (point 774, écart ${((a.fin - tImm) / 1000).toFixed(1)} s) ; durée ${a.duree_s} s : les 10 min d'arrêt ne comptent pas ; ${virgule(a.km, 2)} km`;
    });
    await touche(p, "supprimer-neuf");
    await p.waitForSelector('[data-screen="T1"]', { timeout: 10000 }).catch(() => {});
    await p.close();
  }
  {
    const p = await nouvellePage(IMM);
    await versAlerte(p);
    await p.waitForSelector(sel("alerte-immobile"));
    const nAlerte = await pointsT3(p);
    const dA = await lireDirect(p);
    await focusClavier(p, p.locator(sel("immobile-reprendre")));
    await etape("V-3.E1", 5, p, "V-3.E1-05-avant.png", "cette alerte (2e trajet rejoué ; « Reprendre » sélectionné)", async () => `« ${await txt(p, sel("alerte-immobile"))} » ; ${nAlerte} points gardés`);
    await touche(p, "immobile-reprendre");
    await etape("V-3.E1", 6, p, "V-3.E1-06-apres.png", "je touche « Reprendre »", async () => {
      await p.waitForFunction(() => document.querySelector('[data-screen="T3"]')?.getAttribute("data-etat") === "enregistrement", null, { timeout: 5000 });
      const n = await pointsT3(p);
      verifier(n === nAlerte, `${n} points après reprise, ${nAlerte} avant`);
      const d = await lireDirect(p);
      verifier(d.km === dA.km, "km perdus");
      const k = IMM.length - 10;
      await rouler(C, p, IMM, k, IMM.length);
      const n2 = await pointsT3(p);
      const d2 = await lireDirect(p);
      // round 2 : toujours garé après « Reprendre » : 0 km/h et ni km ni litres de plus (r1 : 10 km/h, +0,1 km, +0,01 L)
      verifier(d2.kmh === 0 && d2.km === d.km && d2.litres === d.litres, `garé après la reprise : ${directTexte(d2)}`);
      noter("V-3.E1", `Step 6 — après « Reprendre », 10 positions de plus (toujours garé) : ${n} → ${n2} points (l'enregistrement repart) ; ${d2.kmh} km/h, ${virgule(d2.km, 1)} km, ${virgule(d2.litres, 2)} L (inchangés).`);
      return `« ${await txt(p, sel("etat-enregistrement"))} » ; ${n} points gardés (autant qu'à l'alerte), ${virgule(d.km, 1)} km conservés`;
    });
    await touche(p, "bouton-arreter");
    await p.waitForURL("**/fin", { timeout: 15000 }).catch(() => {});
    await touche(p, "supprimer-neuf").catch(() => {});
    await p.waitForSelector('[data-screen="T1"]', { timeout: 10000 }).catch(() => {});
    await p.close();
  }
  ecrireHistoire("V-3.E1");
  // ---- V-3.E2 tunnel, puis V-4.1 (1-4) et V-4.2 sur ce trajet
  {
    const g = TUN.findIndex((x, k) => k > 0 && x.t - TUN[k - 1].t > 15000);
    const trou = TUN[g].t - TUN[g - 1].t;
    const p = await nouvellePage(TUN);
    await rouler(C, p, TUN, 1, g);
    const k0 = await lireDirect(p);
    await etape("V-3.E2", 1, p, "V-3.E2-01-avant.png", `un enregistrement en cours (A68, ${g} positions, dernière avant le tunnel)`, async () => directTexte(k0));
    await p.clock.runFor(16000);
    await etape("V-3.E2", 2, p, "V-3.E2-02-apres.png", "aucune position pendant 16 s", async () => {
      await p.waitForSelector(sel("gps-perdu"), { timeout: 5000 });
      const t = await txt(p, sel("gps-perdu"));
      verifier(t === "GPS perdu (tunnel) · la distance est complétée à la sortie.", t);
      return `« ${t} » ; data-etat ${await attr(p, T3, "data-etat")} ; vitesse ${await attr(p, sel("vitesse"), "data-kmh")} km/h`;
    });
    await p.clock.runFor(trou - 16000 - 1000);
    const kAvant = await lireDirect(p);
    await etape("V-3.E2", 3, p, "V-3.E2-03-avant.png", `le signal revient après ${(trou / 1000).toFixed(0)} s sans position (tunnel de ${virgule(outils.haversine(TUN[g - 1], TUN[g]) / 1000, 2)} km)`, async () => `toujours « ${await txt(p, sel("gps-perdu"))} » ; ${virgule(kAvant.km, 1)} km figés`);
    await rouler(C, p, TUN, g, g + 1, { premierEcart: 1000 });
    await etape("V-3.E2", 4, p, "V-3.E2-04-apres.png", "la position suivante arrive", async () => {
      const d = await lireDirect(p);
      const ajout = d.km - kAvant.km;
      verifier(ajout >= 2.9 && ajout <= 3.1, `+${ajout.toFixed(2)} km`);
      verifier((await p.locator(sel("gps-perdu")).count()) === 0, "message encore affiché");
      return `km ${virgule(kAvant.km, 1)} → ${virgule(d.km, 1)} (+${virgule(ajout, 1)} km ; ligne droite entre les 2 positions ${(outils.haversine(TUN[g - 1], TUN[g]) / 1000).toFixed(3)} km, chemin réel 3,0007 km, à ${Math.round((outils.haversine(TUN[g - 1], TUN[g]) / trou) * 3600)} km/h de moyenne) ; message disparu`;
    });
    ecrireHistoire("V-3.E2");
    await rouler(C, p, TUN, g + 1, TUN.length);
    const directAvant = `« ${await txt(p, sel("prix-direct"))} » ; ${directTexte(await lireDirect(p))}`;
    await touche(p, "bouton-arreter");
    await p.waitForURL("**/fin", { timeout: 15000 });
    await p.clock.runFor(500);
    await p.waitForFunction(() => document.querySelector('[data-el="titre-trajet"]')?.getAttribute("data-noms") === "oui", null, { timeout: 20000 }).catch(() => {});
    const litres = Number(await attr(p, sel("fin-litres"), "data-litres"));
    // round 3 (audit r2 lot 2, LOW 4) : l'état de départ est l'écran Fin de trajet lui-même (haut de l'écran : trajet, voiture,
    // litres) ; l'étape 2 montre le sélecteur de carburant et le prix
    await etape("V-4.1", 1, p, "V-4.1-01-avant.png", "la fin d'un trajet en Clio SP95-E10 parti de France (écran Fin de trajet, haut de l'écran)", async () => `En route juste avant « Arrêter » : ${directAvant} ; fin : « ${await txt(p, sel("titre-trajet"))} » · « ${await txt(p, sel("sous-titre-trajet"))} » ; ${virgule(litres, 2)} L`, { haut: true });
    await p.evaluate(() => document.querySelector('[data-el="carburant-apres"]')?.scrollIntoView({ block: "start" }));
    await etape("V-4.1", 2, p, "V-4.1-02-apres.png", "l'écran Fin de trajet s'ouvre (sélecteur et prix)", async () => {
      const choisi = await attr(p, `${sel("carburant-apres")} [aria-pressed="true"]`, "data-carburant");
      const boutons = await p.locator(`${sel("carburant-apres")} button`).allInnerTexts();
      verifier(JSON.stringify(boutons) === JSON.stringify(["Gazole", "SP95-E10", "SP95", "SP98", "E85", "GPLc"]), boutons.join(","));
      verifier(choisi === "SP95-E10", choisi);
      const lib = await txt(p, sel("libelle-prix"));
      verifier(lib === "Moyenne France du jour", lib);
      const prix = Number(await attr(p, sel("prix-apres"), "data-prix"));
      verifier(Math.abs(prix - moyFR("SP95-E10")) < 0.0005, `${prix}`);
      const lab = await attr(p, sel("compteur-prix"), "aria-label");
      verifier(lab.includes(virgule(prix, 3)), lab);
      return `sélecteur ${boutons.join(" · ")}, SP95-E10 choisi ; « ${lib} » ; compteur « ${lab} » (3 décimales) = moyenne France SP95-E10 lue par l'API ${virgule(moyFR("SP95-E10"), 3)} ; coût ${await txt(p, sel("cout-trajet"))}`;
    });
    await focusClavier(p, p.locator(`${sel("carburant-apres")} [data-carburant="Gazole"]`));
    await etape("V-4.1", 3, p, "V-4.1-03-avant.png", "ce sélecteur (Gazole sélectionné au clavier)", async () => `focus « ${await p.evaluate(() => document.activeElement?.textContent)} »`, { cible: sel("carburant-apres") });
    await p.locator(`${sel("carburant-apres")} [data-carburant="Gazole"]`).tap();
    await etape("V-4.1", 4, p, "V-4.1-04-apres.png", "je touche Gazole", async () => {
      const prix = Number(await attr(p, sel("prix-apres"), "data-prix"));
      const cout = Number(await attr(p, sel("cout-trajet"), "data-cout"));
      verifier(Math.abs(prix - moyFR("Gazole")) < 0.0005, `${prix}`);
      verifier(Math.abs(cout - euros2(litres * prix)) < 0.001, `${cout}`);
      return `« ${await txt(p, sel("libelle-prix"))} » ${virgule(prix, 3)} €/L (moyenne France Gazole de l'API ${virgule(moyFR("Gazole"), 3)}) ; coût ${virgule(litres, 3)} × ${virgule(prix, 3)} = ${virgule(cout, 2)} €`;
    }, { cible: sel("cout-trajet") });
    // ---- V-4.2
    await p.locator(`${sel("carburant-apres")} [data-carburant="SP95-E10"]`).tap();
    const coutMoy = Number(await attr(p, sel("cout-trajet"), "data-cout"));
    await etape("V-4.2", 1, p, "V-4.2-01-avant.png", "la fin de trajet (SP95-E10, moyenne du jour)", async () => `« ${await txt(p, sel("libelle-prix"))} » ${await attr(p, sel("prix-apres"), "data-prix")} €/L ; coût ${virgule(coutMoy, 2)} €`, { cible: sel("prix-apres") });
    await touche(p, "compteur-prix");
    await p.locator(sel("champ-prix")).fill("1,989");
    await p.locator(sel("champ-prix")).press("Enter");
    await etape("V-4.2", 2, p, "V-4.2-02-apres.png", "je touche le compteur, tape 1,989 et valide (Entrée)", async () => {
      const lib = await txt(p, sel("libelle-prix"));
      const prix = Number(await attr(p, sel("prix-apres"), "data-prix"));
      const cout = Number(await attr(p, sel("cout-trajet"), "data-cout"));
      verifier(lib === "Mon prix" && prix === 1.989 && Math.abs(cout - euros2(litres * 1.989)) < 0.001, `${lib} ${prix} ${cout}`);
      verifier((await p.locator(sel("revenir-moyenne")).count()) === 1, "lien absent");
      return `« ${lib} » 1,989 €/L ; coût ${virgule(litres, 3)} × 1,989 = ${virgule(cout, 2)} € ; « ${await txt(p, sel("revenir-moyenne"))} » affiché`;
    }, { cible: sel("prix-apres") });
    await focusClavier(p, p.locator(sel("revenir-moyenne")));
    await etape("V-4.2", 3, p, "V-4.2-03-avant.png", "mon prix saisi (« Revenir à la moyenne » sélectionné)", async () => `focus « ${await p.evaluate(() => document.activeElement?.textContent)} »`, { cible: sel("prix-apres") });
    await touche(p, "revenir-moyenne");
    await etape("V-4.2", 4, p, "V-4.2-04-apres.png", "je touche « Revenir à la moyenne »", async () => {
      const prix = Number(await attr(p, sel("prix-apres"), "data-prix"));
      const cout = Number(await attr(p, sel("cout-trajet"), "data-cout"));
      verifier(Math.abs(prix - moyFR("SP95-E10")) < 0.0005 && cout === coutMoy, `${prix} ${cout}`);
      return `« ${await txt(p, sel("libelle-prix"))} » ${virgule(prix, 3)} €/L ; coût ${virgule(cout, 2)} € (comme avant la saisie)`;
    }, { cible: sel("prix-apres") });
    await touche(p, "compteur-prix");
    await p.locator(sel("champ-prix")).fill("1,5");
    await etape("V-4.2", 5, p, "V-4.2-05-avant.png", "le champ du prix ouvert (« 1,5 » tapé, pas validé)", async () => `champ « ${await p.inputValue(sel("champ-prix"))} » ouvert`, { cible: sel("prix-apres") });
    await p.locator(sel("champ-prix")).press("Escape");
    await p.clock.runFor(100); // l'horloge de la page est en pause : laisser passer l'image suivante (le focus revient au compteur)
    await etape("V-4.2", 6, p, "V-4.2-06-apres.png", "j'appuie sur Échap", async () => {
      verifier((await p.locator(sel("champ-prix")).count()) === 0, "champ encore ouvert");
      const prix = Number(await attr(p, sel("prix-apres"), "data-prix"));
      verifier(Math.abs(prix - moyFR("SP95-E10")) < 0.0005, `${prix}`);
      return `champ fermé ; prix toujours ${virgule(prix, 3)} €/L « ${await txt(p, sel("libelle-prix"))} » ; focus revenu sur « ${await p.evaluate(() => document.activeElement?.getAttribute("aria-label"))} »`;
    }, { cible: sel("prix-apres") });
    // US-4.E2 (régression) : prix hors bornes refusé
    await touche(p, "compteur-prix");
    await p.locator(sel("champ-prix")).fill("7");
    await p.locator(sel("champ-prix")).press("Enter");
    const err = await txt(p, sel("erreur-prix"));
    const prixApres = Number(await attr(p, sel("prix-apres"), "data-prix"));
    regression.push(`US-4.E2 (T4) : « 7 » validé → « ${err} », prix gardé ${prixApres} ${err === "Entre un prix entre 0,50 et 4,00 €/L" && Math.abs(prixApres - moyFR("SP95-E10")) < 0.0005 ? "✓" : "✗"}`);
    await p.locator(sel("champ-prix")).press("Escape");
    ecrireHistoire("V-4.2");
    await touche(p, "supprimer-neuf");
    await p.waitForSelector('[data-screen="T1"]', { timeout: 10000 }).catch(() => {});
    await p.close();
  }
  await C.close();
  // ---- V-4.1 (5-6) Barcelone, puis V-4.7 (5-6) : appli fermée avant de choisir (profil persistant)
  {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "m5-bcn-"));
    const lancer = async () => {
      const c = await chromium.launchPersistentContext(dir, { ...OPTS, permissions: ["geolocation"], geolocation: { latitude: BCN[0].lat, longitude: BCN[0].lon, accuracy: 5 } });
      await c.addInitScript((v) => { if (!localStorage.getItem("pt-voiture-v1")) localStorage.setItem("pt-voiture-v1", JSON.stringify(v)); }, VOITURE);
      brancher(c, "barcelone");
      return c;
    };
    let B = await lancer();
    let p = B.pages()[0] ?? (await B.newPage());
    surveiller(p, "barcelone");
    await p.clock.install();
    await p.goto(URL_APP);
    await p.waitForSelector(sel("bouton-demarrer"));
    await figerHorloge(p);
    await touche(p, "bouton-demarrer");
    await p.waitForURL("**/en-route", { timeout: 15000 });
    await p.waitForFunction(() => document.querySelector('[data-el="prix-direct"]')?.getAttribute("data-prix"), null, { timeout: 20000 }).catch(() => {});
    await rouler(B, p, BCN, 1, BCN.length);
    await etape("V-4.1", 5, p, "V-4.1-05-avant.png", "un départ hors de France : vrai itinéraire dans Barcelone (plaça de Catalunya → Sagrada Família, 3,2 km rejoués)", async () => `« ${await txt(p, sel("prix-direct"))} » ; ${directTexte(await lireDirect(p))}`);
    await touche(p, "bouton-arreter");
    await p.waitForURL("**/fin", { timeout: 15000 });
    await p.clock.runFor(500);
    await p.waitForFunction(() => document.querySelector('[data-el="titre-trajet"]')?.getAttribute("data-noms") === "oui", null, { timeout: 20000 }).catch(() => {});
    const es = MOY_TOUS["SP95-E10"].get("ES");
    await etape("V-4.1", 6, p, "V-4.1-06-apres.png", "l'écran Fin de trajet s'ouvre", async () => {
      const lib = await txt(p, sel("libelle-prix"));
      const prix = Number(await attr(p, sel("prix-apres"), "data-prix"));
      const a = (await lireIdb(p)).arrete;
      verifier(a.pays_depart === "ES", `pays ${a.pays_depart}`);
      if (es != null) verifier(lib === "Moyenne Espagne du jour" && Math.abs(prix - es) < 0.0005, `${lib} ${prix} vs ES ${es}`);
      else verifier(/pas de moyenne Espagne/.test(lib), lib);
      return `« ${await txt(p, sel("titre-trajet"))} » ; « ${lib} » ${virgule(prix, 3)} €/L (moyenne Espagne SP95-E10 de l'API : ${es == null ? "aucune" : virgule(es, 3)}) ; pays de départ enregistré ${a.pays_depart}`;
    });
    ecrireHistoire("V-4.1");
    const idB = await attr(p, '[data-screen="T4"]', "data-trajet");
    await etape("V-4.7", 5, p, "V-4.7-05-avant.png", "un trajet arrêté (Barcelone), pas encore tranché ; je ferme l'appli", async () => `trajet ${idB} ; boutons « ${await txt(p, sel("enregistrer-ou-supprimer"))} »`, { cible: sel("enregistrer-ou-supprimer") });
    await B.close();
    B = await lancer();
    p = B.pages()[0] ?? (await B.newPage());
    surveiller(p, "barcelone");
    await p.goto(URL_APP);
    await etape("V-4.7", 6, p, "V-4.7-06-apres.png", "je rouvre l'appli (navigateur relancé, même profil)", async () => {
      await p.waitForURL("**/fin", { timeout: 15000 });
      await p.waitForSelector(sel("enregistrer-ou-supprimer"));
      verifier((await attr(p, '[data-screen="T4"]', "data-trajet")) === idB, "autre trajet");
      return `URL /fin ; même trajet ${idB} « ${await txt(p, sel("titre-trajet"))} » ; « ${await txt(p, sel("enregistrer-ou-supprimer"))} »`;
    }, { cible: sel("enregistrer-ou-supprimer") });
    await touche(p, "supprimer-neuf");
    await p.waitForSelector('[data-screen="T1"]', { timeout: 10000 }).catch(() => {});
    await B.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

// ================================================================= 4. Stations (V-5.1 1-2, V-5.2, V-5.4, V-5.5 3-6, V-5.7) — positions fixes, horloge réelle
async function fluxStations() {
  for (const [id, t] of [["V-5.1", "V-5.1 — Stations autour de moi"], ["V-5.2", "V-5.2 — Choisir le carburant"], ["V-5.4", "V-5.4 — Trier"], ["V-5.5", "V-5.5 — Utiliser ce prix"], ["V-5.7", "V-5.7 — Europe et Royaume-Uni"]]) histoire(id, t);
  const C = await contexteAvecVoiture(navigateur, VOITURE, ALBI);
  brancher(C, "stations");
  const p = await C.newPage();
  surveiller(p, "stations");
  await p.goto(URL_APP);
  await p.waitForSelector(sel("nom-voiture"));
  // round 2 : l'onglet Stations est l'action de l'étape 2 ; avant, la position autorisée se lit dans l'en-tête (« Autour de moi » =
  // position GPS ; refusée, l'en-tête dirait « Albi », la ville de repli)
  await p.waitForFunction(() => document.querySelector('[data-el="lieu"]')?.textContent === "Autour de moi", null, { timeout: 15000 }).catch(() => {});
  await etape("V-5.1", 1, p, "V-5.1-01-avant.png", "la position autorisée (Albi) : accueil, en-tête « Autour de moi »", async () => {
    const lieu = await txt(p, sel("lieu"));
    verifier(lieu === "Autour de moi", `en-tête « ${lieu} »`);
    return `en-tête « ${lieu} » (position GPS reçue) ; position du contexte ${ALBI.latitude}, ${ALBI.longitude} ; permission ${await p.evaluate(async () => (await navigator.permissions.query({ name: "geolocation" })).state)}`;
  });
  await touche(p, "onglet-stations");
  await attendreListe(p);
  await dormir(1500);
  await etape("V-5.1", 2, p, "V-5.1-02-apres.png", "je touche l'onglet Stations", async () => {
    const l = await lignes(p);
    const db = await prixDb(l.map((x) => x.id), "SP95-E10");
    const faux = l.filter((x) => Math.abs((db.get(x.id) ?? -1) - x.prix) > 0.0005);
    verifier(faux.length === 0, `${faux.length} prix ≠ base`);
    const dans = await p.evaluate(([lo, la]) => window.__carte.getBounds().contains([lo, la]), [ALBI.longitude, ALBI.latitude]);
    verifier(dans, "position hors carte");
    const pastilles = Number(await attr(p, sel("carte-stations"), "data-pastilles"));
    verifier(pastilles === l.length, `${pastilles} / ${l.length}`);
    const loin = l.filter((x) => distLigne(x.texte) > 10.05);
    verifier(loin.length === 0, `${loin.length} à plus de 10 km`);
    return `en-tête « ${await txt(p, sel("lieu"))} » ; ma position dans le cadre de la carte ; ${l.length} stations à moins de 10 km, ${pastilles} pastilles ; ${l.length} prix SP95-E10 identiques à la base (table prix) ; 1re « ${l[0].texte} »`;
  });
  ecrireHistoire("V-5.1");
  noter("V-5.6", `Step 2 — contrôle répété sur un téléphone sans trajet (flux Stations) : ${await p.locator(sel("retour-trajet")).count()} bandeau.`);
  // ---- V-5.2 à Prayssac (Lot) — round 2 : une VRAIE station SP95-E10 sans gazole (TotalEnergies Prayssac, 46220005 : SP95-E10
  // et E85 en base, aucune ligne Gazole) ; dernier carburant regardé = Gazole (pt-carburant), pour montrer le « d'office »
  {
    const PRAYSSAC = { latitude: 44.5041, longitude: 1.1885 };
    const Q = await contexteAvecVoiture(navigateur, VOITURE, PRAYSSAC);
    brancher(Q, "stations-prayssac");
    await Q.addInitScript(() => { if (!sessionStorage.getItem("m5-init")) { localStorage.setItem("pt-carburant", "Gazole"); sessionStorage.setItem("m5-init", "1"); } });
    const q = await Q.newPage();
    surveiller(q, "stations-prayssac");
    const enBase = await restAnon("prix?select=carburant,prix,rupture&station_id=eq.46220005");
    await q.goto(URL_APP);
    await q.waitForSelector(sel("nom-voiture"));
    await etape("V-5.2", 1, q, "V-5.2-01-avant.png", "une Clio SP95-E10 enregistrée (accueil) ; dernier carburant regardé dans Stations : Gazole", async () => {
      verifier((await txt(q, sel("detail-voiture"))).endsWith("SP95-E10"), "carburant de la voiture");
      return `accueil « ${await txt(q, sel("nom-voiture"))} · ${await txt(q, sel("detail-voiture"))} » ; localStorage pt-carburant = « ${await q.evaluate(() => localStorage.getItem("pt-carburant"))} » ; position Prayssac ${PRAYSSAC.latitude}, ${PRAYSSAC.longitude}`;
    });
    await touche(q, "onglet-stations");
    await attendreListe(q);
    await dormir(1500);
    await etape("V-5.2", 2, q, "V-5.2-02-apres.png", "j'ouvre l'onglet Stations", async () => {
      const choisi = (await q.locator(`${sel("selecteur-carburant")} [aria-pressed="true"]`).innerText()).trim();
      verifier(choisi === "SP95-E10", choisi);
      await q.waitForSelector(`${sel("liste-stations")}[data-carburant="SP95-E10"]`);
      return `SP95-E10 choisi d'office (aria-pressed), malgré le dernier choix Gazole ; titre « ${await txt(q, sel("titre-liste"))} »`;
    });
    const e10 = await lignes(q);
    await etape("V-5.2", 3, q, "V-5.2-03-avant.png", "la liste en SP95-E10 autour de Prayssac", async () => {
      verifier(e10.some((x) => x.id === "46220005"), "TotalEnergies Prayssac absente de la liste SP95-E10");
      return `${e10.length} stations SP95-E10 : ${e10.map((x) => `${x.id} ${x.texte.split(" ·")[0]}`).join(" | ")} ; 46220005 en base : ${enBase.map((x) => `${x.carburant} ${x.prix}`).join(", ")} (aucune ligne Gazole)`;
    });
    const pastE10 = Number(await attr(q, sel("carte-stations"), "data-pastilles"));
    await q.locator(`${sel("selecteur-carburant")} button`, { hasText: /^Gazole$/ }).tap();
    await q.waitForSelector(`${sel("liste-stations")}[data-carburant="Gazole"]`);
    await dormir(1500);
    await etape("V-5.2", 4, q, "V-5.2-04-apres.png", "je touche Gazole", async () => {
      const g = await lignes(q);
      const db = await prixDb(g.map((x) => x.id), "Gazole");
      const faux = g.filter((x) => Math.abs((db.get(x.id) ?? -1) - x.prix) > 0.0005);
      verifier(faux.length === 0, `${faux.length} prix ≠ base`);
      const gazE10 = await prixDb(e10.map((x) => x.id), "Gazole");
      const sansGaz = e10.filter((x) => !gazE10.has(x.id)).map((x) => x.id);
      verifier(sansGaz.includes("46220005"), "Prayssac non comptée sans gazole");
      const restees = sansGaz.filter((id) => g.some((x) => x.id === id));
      verifier(restees.length === 0, `${restees.length} stations sans gazole encore listées`);
      const pastilles = Number(await attr(q, sel("carte-stations"), "data-pastilles"));
      verifier(pastilles === g.length, "pastilles");
      const surCarte = await q.locator('[data-el="pastille-station"][data-station="46220005"]').count();
      verifier(surCarte === 0, "pastille de Prayssac encore sur la carte");
      return `titre « ${await txt(q, sel("titre-liste"))} » ; ${g.length} lignes et ${pastilles} pastilles au prix gazole de la base (contre ${e10.length} lignes et ${pastE10} pastilles en SP95-E10) ; stations SP95-E10 sans gazole en base : ${sansGaz.join(", ")} → absentes de la liste et de la carte (pastille 46220005 : ${surCarte}) ; lignes : ${g.map((x) => `${x.id} ${virgule(x.prix, 3)}`).join(" | ")}`;
    });
    ecrireHistoire("V-5.2");
    await Q.close();
  }
  // ---- V-5.4
  await p.locator(`${sel("selecteur-carburant")} button`, { hasText: /^SP95-E10$/ }).tap();
  await p.waitForSelector(`${sel("liste-stations")}[data-carburant="SP95-E10"]`);
  await dormir(1000);
  await etape("V-5.4", 1, p, "V-5.4-01-avant.png", "la liste des stations (SP95-E10, tri « Moins cher »)", async () => `tri ${await attr(p, sel("liste-stations"), "data-tri")} ; ${(await lignes(p)).length} stations`, { haut: true });
  await p.locator(`${sel("tri-liste")} button`, { hasText: "Plus proche" }).tap();
  await etape("V-5.4", 2, p, "V-5.4-02-apres.png", "je touche « Plus proche »", async () => {
    await p.waitForSelector(`${sel("liste-stations")}[data-tri="distance"]`);
    const d = (await lignes(p)).map((x) => distLigne(x.texte));
    verifier(d.every((x, k) => k === 0 || d[k - 1] <= x + 1e-9), `distances ${d.join(", ")}`);
    await p.locator(`${sel("tri-liste")} button`, { hasText: "Moins cher" }).tap();
    await p.waitForSelector(`${sel("liste-stations")}[data-tri="prix"]`);
    const pr = (await lignes(p)).map((x) => x.prix);
    verifier(pr.every((x, k) => k === 0 || pr[k - 1] <= x + 1e-9), `prix ${pr.join(", ")}`);
    await p.locator(`${sel("tri-liste")} button`, { hasText: "Plus proche" }).tap();
    await p.waitForSelector(`${sel("liste-stations")}[data-tri="distance"]`);
    return `« Plus proche » : distances croissantes ${d.slice(0, 8).map((x) => virgule(x, 1)).join(" ≤ ")}… (${d.length}) ; « Moins cher » : prix croissants ${pr.slice(0, 6).map((x) => virgule(x, 3)).join(" ≤ ")}… ; capture sur « Plus proche »`;
  }, { haut: true });
  ecrireHistoire("V-5.4");
  // ---- V-5.5 (3-6) sans trajet
  await p.locator(`${sel("tri-liste")} button`, { hasText: "Moins cher" }).tap();
  await p.waitForSelector(`${sel("liste-stations")}[data-tri="prix"]`);
  const l0 = p.locator(`${sel("liste-stations")} ${sel("ligne-station")}`).first();
  await l0.tap();
  await p.waitForSelector(sel("utiliser-ce-prix"), { timeout: 15000 });
  const P2 = Number(await attr(p, sel("utiliser-ce-prix"), "data-prix"));
  await etape("V-5.5", 3, p, "V-5.5-03-avant.png", "aucun trajet en cours ; fiche de la station la moins chère", async () => `fiche « ${await txt(p, "#sh-name")} » ; bouton « ${await txt(p, sel("utiliser-ce-prix"))} » ; pas de bandeau (${await p.locator(sel("retour-trajet")).count()})`);
  await touche(p, "utiliser-ce-prix");
  await etape("V-5.5", 4, p, "V-5.5-04-apres.png", "je touche ce bouton", async () => {
    await p.waitForSelector('[data-screen="T1"]');
    const g = JSON.parse((await p.evaluate(() => localStorage.getItem("pt-prix-choisi"))) ?? "null");
    verifier(g && Math.abs(g.prix - P2) < 0.0005, JSON.stringify(g));
    await touche(p, "bouton-demarrer");
    await p.waitForURL("**/en-route", { timeout: 15000 });
    await p.waitForSelector(sel("prix-direct"));
    const t = await txt(p, sel("prix-direct"));
    verifier(t === `Prix : mon prix · ${virgule(P2, 3)} €/L`, t);
    noter("V-5.5", `Step 4 — trajet démarré ensuite : « ${t} » ; pt-prix-choisi vidé au départ (${await p.evaluate(() => localStorage.getItem("pt-prix-choisi"))}).`);
    await touche(p, "bouton-arreter");
    await p.waitForSelector(sel("trop-court"));
    await p.locator(`${sel("trop-court")} button`).tap();
    await p.waitForSelector('[data-screen="T1"]');
    return `accueil ouvert (URL /) ; prix gardé : pt-prix-choisi = ${JSON.stringify(g)} (la capture montre l'accueil après l'essai de démarrage, revenu par « trop court »)`;
  });
  // station qui ne vend pas le carburant de la voiture
  await touche(p, "onglet-stations");
  let trouve = null;
  for (const c of ["Gazole", "SP98", "E85", "GPLc", "SP95"]) {
    await p.locator(`${sel("selecteur-carburant")} button`, { hasText: new RegExp(`^${c}$`) }).tap();
    await p.waitForSelector(`${sel("liste-stations")}[data-carburant="${c}"]`, { timeout: 30000 }).catch(() => {});
    await dormir(800);
    const l = await lignes(p);
    const e = await prixDb(l.map((x) => x.id), "SP95-E10");
    const sans = l.find((x) => !e.has(x.id));
    if (sans) { trouve = { ...sans, carburant: c }; break; }
  }
  if (trouve) {
    const ligne = p.locator(`${sel("ligne-station")}[data-station="${trouve.id}"]`);
    await ligne.scrollIntoViewIfNeeded();
    await focusClavier(p, ligne);
    await etape("V-5.5", 5, p, "V-5.5-05-avant.png", `une station qui ne vend pas le SP95-E10 de ma voiture (liste ${trouve.carburant})`, async () => `« ${trouve.texte} » (${trouve.id}) : aucun prix SP95-E10 vendu en base (absent ou rupture)`, { cible: `${sel("ligne-station")}[data-station="${trouve.id}"]` });
    await ligne.tap();
    await etape("V-5.5", 6, p, "V-5.5-06-apres.png", "sa fiche s'ouvre", async () => {
      await p.waitForSelector(`${sel("tableau-prix")}[aria-busy="false"]`, { timeout: 15000 });
      verifier((await p.locator(sel("utiliser-ce-prix")).count()) === 0, "bouton présent");
      const e10 = await txt(p, `${sel("tableau-prix")} [data-carburant="SP95-E10"]`);
      return `fiche « ${await txt(p, "#sh-name")} » ; SP95-E10 « ${e10} » ; pas de bouton « Utiliser … pour mon trajet »`;
    });
  } else probleme("V-5.5", "- aucune station sans SP95-E10 trouvée autour d'Albi (Gazole, SP98, E85, GPLc, SP95) : étapes 5-6 non capturées");
  ecrireHistoire("V-5.5");
  ecrireHistoire("V-5.6");
  await C.close();
  // ---- V-5.7 Barcelone, Dartford, Bruxelles
  {
    const B = await contexteAvecVoiture(navigateur, VOITURE, BARCELONE);
    brancher(B, "barcelone-stations");
    const q = await B.newPage();
    surveiller(q, "barcelone-stations");
    await q.goto(URL_APP);
    await q.waitForSelector(sel("nom-voiture"));
    // round 2 : l'onglet Stations est l'action de l'étape 2 ; hors de cet onglet, la V1 n'affiche nulle part la position (l'en-tête
    // dit seulement « Autour de moi ») : l'état de départ (Barcelone) est prouvé par la position du contexte et par l'étape 2
    await etape("V-5.7", 1, q, "V-5.7-01-avant.png", "une position à Barcelone (41,3874, 2,1686) : accueil, en-tête « Autour de moi »", async () => `en-tête « ${await txt(q, sel("lieu"))} » ; position du contexte ${BARCELONE.latitude}, ${BARCELONE.longitude} (Barcelone) ; la V1 ne montre la position que dans l'onglet Stations`);
    await touche(q, "onglet-stations");
    await attendreListe(q);
    await dormir(1500);
    await etape("V-5.7", 2, q, "V-5.7-02-apres.png", "l'onglet Stations s'ouvre", async () => {
      const l = await lignes(q);
      const st = await stationsDb(l.map((x) => x.id));
      const pays = new Set(l.map((x) => st.get(x.id)?.pays));
      verifier(pays.size === 1 && pays.has("ES"), [...pays].join(","));
      const db = await prixDb(l.map((x) => x.id), "SP95-E10");
      const faux = l.filter((x) => Math.abs((db.get(x.id) ?? -1) - x.prix) > 0.0005);
      verifier(faux.length === 0, `${faux.length} prix ≠ base`);
      return `${l.length} stations espagnoles (pays ES en base), ${await attr(q, sel("carte-stations"), "data-pastilles")} pastilles, prix SP95-E10 = base ; 1re « ${l[0].texte} »`;
    });
    await B.close();
  }
  {
    const D = await contexteAvecVoiture(navigateur, VOITURE, DARTFORD);
    brancher(D, "dartford");
    const q = await D.newPage();
    surveiller(q, "dartford");
    await q.goto(URL_APP + "/stations");
    await attendreListe(q);
    await dormir(1500);
    await etape("V-5.7", 3, q, "V-5.7-03-avant.png", "une position à Dartford (Royaume-Uni)", async () => {
      const l = await lignes(q);
      const st = await stationsDb(l.map((x) => x.id));
      return `${l.length} stations, pays ${[...new Set(l.map((x) => st.get(x.id)?.pays))].join(",")} ; 1re « ${l[0].texte} »`;
    });
    const l1 = q.locator(`${sel("liste-stations")} ${sel("ligne-station")}`).first();
    const id = await l1.getAttribute("data-station");
    await l1.tap();
    await etape("V-5.7", 4, q, "V-5.7-04-apres.png", "je lis une station (fiche)", async () => {
      await q.waitForSelector(sel("cours-du-jour"), { timeout: 15000 });
      const base = await restAnon(`prix?select=carburant,prix,prix_origine,unite_origine&station_id=eq.${id}`);
      const cours = await restAnon("cours_change?select=taux,jour&monnaie=eq.GBP&order=jour.desc&limit=1");
      const taux = Number(cours[0].taux);
      const lignesOk = [];
      for (const b of base.filter((x) => x.prix_origine != null)) {
        const o = await q.locator(`${sel("prix-origine")} [data-carburant="${b.carburant}"]`).innerText();
        verifier(o.includes(`${virgule(Number(b.prix_origine), 1)} p/L`), o);
        verifier(Math.abs(Number(b.prix) - Number(b.prix_origine) / 100 / taux) < 0.0015, `${b.carburant} ${b.prix} vs ${b.prix_origine}/100/${taux}`);
        lignesOk.push(`${b.carburant} ${virgule(Number(b.prix), 3)} €/L ← ${o.replace(b.carburant, "").trim()}`);
      }
      return `fiche « ${await txt(q, "#sh-name")} » ; ${lignesOk.join(" ; ")} ; « ${await txt(q, sel("cours-du-jour"))} » (taux BCE en base ${taux})`;
    });
    await D.close();
  }
  {
    const X = await contexteAvecVoiture(navigateur, VOITURE, BRUXELLES);
    brancher(X, "bruxelles");
    const q = await X.newPage();
    surveiller(q, "bruxelles");
    await q.goto(URL_APP + "/stations");
    await q.waitForSelector(sel("pays-sans-flux"), { timeout: 40000 }).catch(() => {});
    await dormir(1500);
    await glisser(q, -90, 40);
    await dormir(800);
    await etape("V-5.7", 5, q, "V-5.7-05-avant.png", "un pays qui ne publie pas ses prix station par station : Belgique (position Bruxelles), carte glissée", async () => {
      await q.waitForSelector(sel("rechercher-zone"), { timeout: 5000 });
      return `statut du pays en base : « aucun » ; bouton « ${await txt(q, sel("rechercher-zone"))} »`;
    });
    await touche(q, "rechercher-zone");
    await etape("V-5.7", 6, q, "V-5.7-06-apres.png", "j'y cherche dans cette zone", async () => {
      await q.waitForFunction(() => !document.querySelector('[data-el="rechercher-zone"]'), null, { timeout: 5000 });
      await q.waitForSelector(sel("pays-sans-flux"), { timeout: 30000 });
      const t = await txt(q, sel("pays-sans-flux"));
      verifier(/Ce pays ne publie pas les prix station par station/.test(t), t);
      return `« ${t} » ; en-tête « ${await txt(q, sel("lieu"))} » ; ${await q.locator(sel("ligne-station")).count()} ligne, pastilles ${await attr(q, sel("carte-stations"), "data-pastilles")}`;
    });
    await X.close();
  }
  ecrireHistoire("V-5.7");
}

// ================================================================= 5. Historique et fin de trajet (V-6.x, V-4.3, V-4.4)
const SPEEDS = PTS.map((x, k) => (k ? (outils.haversine(PTS[k - 1], x) / ((x.t - PTS[k - 1].t) / 1000)) * 3.6 : 0));
function trajetPrepare({ id, debut, minutes, km, l100, depart, arrivee, personnes = 1, prixPerso = null, enregistre = true }) {
  const n = 300;
  const vitesses = Array.from({ length: n }, (_, k) => Math.round(SPEEDS[Math.floor((k * SPEEDS.length) / n)]));
  const consos = vitesses.map((v) => Math.round((l100 * (0.8 + ((v - 60) * (v - 60)) / 9000)) * 10) / 10);
  const litres = Math.round(km * l100) / 100;
  const moyennesFR = Object.fromEntries(CARBS.map((c) => [c, { prix: moyFR(c), pays: "FR" }]));
  const t0 = Date.parse(debut);
  return {
    id, debut: t0, fin: t0 + minutes * 60000, depart, arrivee, pays_depart: "FR", km, litres, carburant: "SP95-E10", moyennes: moyennesFR,
    prix_litre: moyFR("SP95-E10"), prix_perso: prixPerso, personnes, vitesses, consos, conso_max: Math.max(...consos), vitesse_moy: Math.round(km / (minutes / 60)),
    accelerations: 9, duree_s: minutes * 60, voiture: { nom: "Renault Clio", detail: "1.2 · 118 ch · 2017 · SP95-E10", carburant: "SP95-E10" }, enregistre,
  };
}
const L = {
  albi: { lat: 43.92836, lon: 2.14587, nom: "Albi" }, toulouse: { lat: 43.60445, lon: 1.44406, nom: "Toulouse" }, cahors: { lat: 44.4475, lon: 1.4419, nom: "Cahors" },
  bordeaux: { lat: 44.8378, lon: -0.5792, nom: "Bordeaux" }, montpellier: { lat: 43.6108, lon: 3.8767, nom: "Montpellier" }, paris: { lat: 48.8566, lon: 2.3522, nom: "Paris" },
  rodez: { lat: 44.3506, lon: 2.575, nom: "Rodez" },
};
async function nouveauContexte(flux, depart = ALBI) {
  const c = await contexteAvecVoiture(navigateur, VOITURE, depart);
  brancher(c, flux);
  const p = await c.newPage();
  surveiller(p, flux);
  return { c, p };
}
async function fluxHistorique() {
  for (const [id, t] of [["V-6.1", "V-6.1 — Ouvrir l'historique"], ["V-6.2", "V-6.2 — Totaux"], ["V-6.3", "V-6.3 — Lire un trajet"], ["V-6.4", "V-6.4 — Revoir, corriger, supprimer"], ["V-4.3", "V-4.3 — Coût de l'essence"], ["V-4.4", "V-4.4 — Partager"]]) histoire(id, t);
  // ---- V-6.1 (1-2) : deux vrais trajets rejoués, l'un daté de septembre, l'autre d'octobre (horloge de la page posée à ces dates)
  {
    const { c, p: p0 } = await nouveauContexte("historique-reel", { latitude: PTS[0].lat, longitude: PTS[0].lon });
    await p0.close();
    let derniere = null;
    for (const [date, a, b] of [["2026-09-14T08:00:00+02:00", 0, 600], ["2026-10-05T17:30:00+02:00", 0, 900]]) {
      const p = await c.newPage();
      surveiller(p, "historique-reel");
      await c.setGeolocation({ latitude: PTS[a].lat, longitude: PTS[a].lon, accuracy: 5 });
      await p.clock.install({ time: new Date(date) });
      await p.goto(URL_APP);
      await p.waitForSelector(sel("bouton-demarrer"));
      await figerHorloge(p);
      await touche(p, "bouton-demarrer");
      await p.waitForURL("**/en-route");
      await p.waitForFunction(() => document.querySelector('[data-el="prix-direct"]')?.getAttribute("data-prix"), null, { timeout: 15000 }).catch(() => {});
      await rouler(c, p, PTS, a + 1, b);
      await touche(p, "bouton-arreter");
      await p.waitForURL("**/fin", { timeout: 15000 });
      await p.clock.runFor(500);
      await p.waitForFunction(() => document.querySelector('[data-el="titre-trajet"]')?.getAttribute("data-noms") === "oui", null, { timeout: 20000 }).catch(() => {});
      // round 3 (audit r2 lot 2, LOW 4) : l'état de départ sans le résultat — la fin du trajet d'octobre juste avant
      // « Enregistrer », celui de septembre déjà enregistré (lu en IndexedDB) ; l'historique trié n'apparaît qu'à l'étape 2
      if (date.startsWith("2026-10")) {
        const idb = await lireIdb(p);
        await etape("V-6.1", 1, p, "V-6.1-01-avant.png", "des trajets enregistrés en septembre et en octobre 2026 (deux trajets réellement rejoués, horloge de la page posée au 14/09 08:00 et au 05/10 17:30) : la fin du trajet d'octobre juste avant « Enregistrer »", async () => {
          verifier(idb.trajets.length === 1 && new Date(idb.trajets[0].debut).getMonth() === 8, `IndexedDB : ${idb.trajets.length} trajet(s)`);
          return `IndexedDB : ${idb.trajets.map((t) => `${new Date(t.debut).toISOString().slice(0, 10)} ${t.km.toFixed(1)} km`).join(" ; ")} (septembre, enregistré) ; écran : « ${await txt(p, sel("titre-trajet"))} » · « ${await txt(p, sel("sous-titre-trajet"))} » (octobre, pas encore enregistré)`;
        }, { haut: true });
      }
      await touche(p, "enregistrer-trajet");
      await p.waitForURL("**/historique");
      if (derniere) await derniere.close();
      derniere = p;
    }
    await derniere.close();
    const p = await c.newPage();
    surveiller(p, "historique-reel");
    await p.goto(URL_APP);
    await p.waitForSelector(sel("nom-voiture"));
    await touche(p, "onglet-historique");
    await etape("V-6.1", 2, p, "V-6.1-02-apres.png", "je touche l'onglet Historique", async () => {
      await p.waitForSelector("li.hrow");
      const mois = await p.locator("li.mois").evaluateAll((l) => l.map((x) => x.getAttribute("data-mois")));
      verifier(JSON.stringify(mois) === JSON.stringify(["Octobre 2026", "Septembre 2026"]), mois.join(","));
      const rows = (await p.locator("li.hrow").allInnerTexts()).map((x) => x.replace(/\s+/g, " "));
      return `groupes ${mois.join(" puis ")} ; lignes : ${rows.join(" | ")}`;
    });
    await c.close();
  }
  // ---- V-6.1 (3-4) : aucun trajet
  {
    const { c, p } = await nouveauContexte("historique-vide");
    await p.goto(URL_APP);
    await p.waitForSelector(sel("nom-voiture"));
    // round 3 (audit r2 lot 2, LOW 4) : « aucun trajet » ne s'affiche que dans l'Historique, qui est le résultat de l'étape 4 ;
    // l'état de départ est l'appli neuve d'où l'on ouvre l'onglet (IndexedDB lue : 0 trajet)
    await etape("V-6.1", 3, p, "V-6.1-03-avant.png", "aucun trajet enregistré (téléphone neuf, voiture enregistrée) : l'accueil, onglet Historique pas encore ouvert", async () => {
      const n = (await lireIdb(p)).trajets.length;
      verifier(n === 0, `${n} trajet(s)`);
      return `IndexedDB : ${n} trajet ; onglet actif « ${await ongletActif(p)} »`;
    });
    await touche(p, "onglet-historique");
    await etape("V-6.1", 4, p, "V-6.1-04-apres.png", "j'ouvre l'onglet Historique", async () => {
      await p.waitForSelector(sel("historique-vide"));
      const t = await txt(p, sel("historique-vide"));
      const tot = [await attr(p, sel("totaux-historique"), "data-trajets"), await attr(p, sel("totaux-historique"), "data-km"), await attr(p, sel("totaux-historique"), "data-euros")];
      verifier(t === "Aucun trajet enregistré." && tot.join() === "0,0,0", `${t} ${tot}`);
      regression.push(`US-3.E3 (T6) : historique vide → « ${t} », totaux ${await txt(p, sel("totaux-historique"))} ✓`);
      return `« ${t} » ; totaux « ${await txt(p, sel("totaux-historique"))} »`;
    });
    ecrireHistoire("V-6.1");
    await c.close();
  }
  // ---- V-6.2 : 4 trajets de 77, 152, 245 et 243 km — ÉTAT PRÉPARÉ (écrits en IndexedDB au format TrajetV1)
  {
    const { c, p } = await nouveauContexte("historique-prepare");
    await p.goto(URL_APP);
    await p.waitForSelector(sel("nom-voiture"));
    const T4 = [
      trajetPrepare({ id: "prep-77", debut: "2026-10-03T08:10:00+02:00", minutes: 66, km: 77, l100: 6.4, depart: L.albi, arrivee: L.toulouse }),
      trajetPrepare({ id: "prep-152", debut: "2026-10-08T09:00:00+02:00", minutes: 128, km: 152, l100: 6.6, depart: L.albi, arrivee: L.cahors }),
      trajetPrepare({ id: "prep-245", debut: "2026-10-12T07:30:00+02:00", minutes: 150, km: 245, l100: 6.9, depart: L.toulouse, arrivee: L.bordeaux }),
      trajetPrepare({ id: "prep-243", debut: "2026-10-16T14:00:00+02:00", minutes: 165, km: 243, l100: 6.7, depart: L.albi, arrivee: L.montpellier }),
    ];
    await ecrireIdb(p, T4);
    const couts = T4.map((t) => euros2(t.litres * t.prix_litre));
    // round 2 : l'état de départ se voit — les 4 lignes de l'historique (liste défilée jusqu'à la dernière) ; l'étape 2 rouvre
    // l'onglet depuis l'accueil et lit les totaux en haut
    await p.goto(URL_APP + "/historique");
    await p.waitForSelector('li.hrow[data-trajet="prep-77"]');
    await etape("V-6.2", 1, p, "V-6.2-01-avant.png", "ÉTAT PRÉPARÉ : 4 trajets de 77, 152, 245 et 243 km écrits en IndexedDB (format TrajetV1 de l'appli) — leurs lignes dans l'historique", async () => `trajets ${T4.map((t) => `${t.km} km ${virgule(t.litres, 2)} L`).join(", ")} au prix moyen France SP95-E10 du jour ${virgule(moyFR("SP95-E10"), 3)} → coûts ${couts.map((x) => virgule(x, 2)).join(" + ")} ; lignes « ${(await p.locator("li.hrow").allInnerTexts()).map((x) => x.replace(/\s+/g, " ")).join(" | ")} »`, { cible: 'li.hrow[data-trajet="prep-77"]' });
    await touche(p, "onglet-trajet");
    await p.waitForSelector(sel("nom-voiture"));
    await touche(p, "onglet-historique");
    await etape("V-6.2", 2, p, "V-6.2-02-apres.png", "l'historique s'affiche", async () => {
      await p.waitForSelector("li.hrow");
      const somme = euros2(couts.reduce((s, x) => s + x, 0));
      const tot = await txt(p, sel("totaux-historique"));
      verifier((await attr(p, sel("totaux-historique"), "data-trajets")) === "4" && (await attr(p, sel("totaux-historique"), "data-km")) === "717", tot);
      verifier(Math.abs(Number(await attr(p, sel("totaux-historique"), "data-euros")) - somme) < 0.001, `${tot} vs ${somme}`);
      const lignesC = (await p.locator(sel("cout-ligne")).allInnerTexts()).map(nb);
      verifier(Math.abs(lignesC.reduce((s, x) => s + x, 0) - somme) < 0.001, "somme des lignes");
      return `totaux « ${tot} » = 4 trajets, 717 km, ${virgule(somme, 2)} € (somme des coûts des lignes ${lignesC.map((x) => virgule(x, 2)).join(" + ")})`;
    }, { haut: true });
    await p.locator('li.hrow[data-trajet="prep-152"] button').tap();
    await p.waitForSelector(sel("compteur-prix"));
    await touche(p, "compteur-prix");
    await p.locator(sel("champ-prix")).fill("1,899");
    await p.locator(sel("champ-prix")).press("Enter");
    await etape("V-6.2", 3, p, "V-6.2-03-avant.png", "un trajet corrigé : celui de 152 km rouvert, prix passé à 1,899 €/L", async () => `« ${await txt(p, sel("libelle-prix"))} » ; coût ${await txt(p, sel("cout-trajet"))}`, { cible: sel("prix-apres") });
    await touche(p, "retour-historique");
    await etape("V-6.2", 4, p, "V-6.2-04-apres.png", "je reviens à l'historique", async () => {
      await p.waitForSelector("li.hrow");
      const somme = euros2(couts[0] + euros2(T4[1].litres * 1.899) + couts[2] + couts[3]);
      verifier(Math.abs(Number(await attr(p, sel("totaux-historique"), "data-euros")) - somme) < 0.001, `${await txt(p, sel("totaux-historique"))} vs ${somme}`);
      return `totaux recalculés « ${await txt(p, sel("totaux-historique"))} » (= ${virgule(somme, 2)} €) ; ligne 152 km : ${await txt(p, 'li.hrow[data-trajet="prep-152"]')}`;
    });
    ecrireHistoire("V-6.2");
    await c.close();
  }
  // ---- V-6.3 et V-6.4 : un trajet à 3 personnes et un trajet seul — ÉTAT PRÉPARÉ
  {
    const { c, p } = await nouveauContexte("historique-prepare-2");
    await p.goto(URL_APP);
    await p.waitForSelector(sel("nom-voiture"));
    const T2 = [
      trajetPrepare({ id: "prep-3p", debut: "2026-10-18T10:00:00+02:00", minutes: 75, km: 92.4, l100: 6.5, depart: L.albi, arrivee: L.rodez, personnes: 3 }),
      trajetPrepare({ id: "prep-seul", debut: "2026-10-19T18:00:00+02:00", minutes: 70, km: 76.8, l100: 6.3, depart: L.toulouse, arrivee: L.albi }),
    ];
    await ecrireIdb(p, T2);
    await touche(p, "onglet-historique");
    await p.waitForSelector("li.hrow");
    await etape("V-6.3", 1, p, "V-6.3-01-avant.png", "ÉTAT PRÉPARÉ : un trajet enregistré à 3 personnes (Albi → Rodez) et un trajet seul, écrits en IndexedDB", async () => `${T2.map((t) => `${t.id} ${t.km} km ${t.personnes} pers.`).join(" ; ")}`);
    const r3 = p.locator('li.hrow[data-trajet="prep-3p"]');
    await focusClavier(p, r3.locator("button"));
    await etape("V-6.3", 2, p, "V-6.3-02-apres.png", "je lis sa ligne (sélectionnée au clavier)", async () => {
      const t = (await r3.innerText()).replace(/\s+/g, " ");
      const cout = euros2(T2[0].litres * T2[0].prix_litre);
      const part = euros2(cout / 3);
      verifier(t.includes("18 oct.") && t.includes("Albi → Rodez") && t.includes("92,4 km") && t.includes(`${virgule(cout, 2)} €`) && t.includes(`${virgule(part, 2)} € chacun`), t);
      const seul = (await p.locator('li.hrow[data-trajet="prep-seul"]').innerText()).replace(/\s+/g, " ");
      verifier(!/chacun/.test(seul), seul);
      return `ligne « ${t} » (date, départ → arrivée, km, coût, ${virgule(part, 2)} € chacun) ; trajet seul : « ${seul} » sans part`;
    });
    const rs = p.locator('li.hrow[data-trajet="prep-seul"]');
    await focusClavier(p, rs.locator("button"));
    await etape("V-6.3", 3, p, "V-6.3-03-avant.png", "une ligne (le trajet seul, sélectionné au clavier)", async () => `« ${(await rs.innerText()).replace(/\s+/g, " ")} »`);
    await rs.locator("button").tap();
    await etape("V-6.3", 4, p, "V-6.3-04-apres.png", "je la touche", async () => {
      await p.waitForSelector(sel("retour-historique"));
      const o = await ongletActif(p);
      verifier(o === "onglet-historique", o);
      verifier((await attr(p, '[data-screen="T4"]', "data-trajet")) === "prep-seul", "autre trajet");
      return `fin de ce trajet « ${await txt(p, sel("titre-trajet"))} » ; onglet Historique sélectionné ; « ${await txt(p, sel("retour-historique"))} » ; bouton « ${await txt(p, sel("supprimer-trajet"))} »`;
    });
    ecrireHistoire("V-6.3");
    await focusClavier(p, p.locator(sel("personnes-plus")));
    await etape("V-6.4", 1, p, "V-6.4-01-avant.png", "un trajet rouvert depuis l'historique (le trajet seul), réglages de prix et de personnes", async () => `prix « ${await txt(p, sel("libelle-prix"))} » ${await attr(p, sel("prix-apres"), "data-prix")} ; ${await attr(p, sel("personnes-apres"), "data-personnes")} personne`, { cible: sel("personnes-apres") });
    await p.locator(`${sel("carburant-apres")} [data-carburant="Gazole"]`).tap();
    await touche(p, "personnes-plus");
    const coutG = Number(await attr(p, sel("cout-trajet"), "data-cout"));
    await touche(p, "retour-historique");
    await etape("V-6.4", 2, p, "V-6.4-02-apres.png", "je change son carburant (Gazole) et son nombre de personnes (2), puis je reviens à l'historique", async () => {
      await p.waitForSelector("li.hrow");
      const rec = (await lireIdb(p)).trajets.find((t) => t.id === "prep-seul");
      verifier(rec.carburant === "Gazole" && rec.personnes === 2 && Math.abs(rec.prix_litre - moyFR("Gazole")) < 0.0005, JSON.stringify({ c: rec.carburant, p: rec.personnes, x: rec.prix_litre }));
      const ligne = (await p.locator('li.hrow[data-trajet="prep-seul"]').innerText()).replace(/\s+/g, " ");
      verifier(ligne.includes(`${virgule(coutG, 2)} €`) && ligne.includes(`${virgule(euros2(coutG / 2), 2)} € chacun`), ligne);
      return `IndexedDB : Gazole, 2 personnes, ${rec.prix_litre} €/L ; ligne « ${ligne} »`;
    });
    await p.locator('li.hrow[data-trajet="prep-3p"] button').tap();
    await p.waitForSelector(sel("supprimer-trajet"));
    const totAvant = await (async () => { await p.waitForTimeout(100); return null; })();
    void totAvant;
    await etape("V-6.4", 3, p, "V-6.4-03-avant.png", "un trajet rouvert (Albi → Rodez, 3 personnes)", async () => `bouton « ${await txt(p, sel("supprimer-trajet"))} »`, { cible: sel("supprimer-trajet") });
    await touche(p, "supprimer-trajet");
    await etape("V-6.4", 4, p, "V-6.4-04-apres.png", "je touche « Supprimer ce trajet »", async () => {
      await p.waitForURL("**/historique");
      await p.waitForSelector(sel("totaux-historique"));
      verifier((await p.locator('li.hrow[data-trajet="prep-3p"]').count()) === 0, "encore listé");
      const tr = await attr(p, sel("totaux-historique"), "data-trajets");
      const km = await attr(p, sel("totaux-historique"), "data-km");
      verifier(tr === "1" && km === "76.8", `${tr} ${km}`); // total km à une décimale sous 100 km (3a2c194)
      return `disparu de la liste ; totaux « ${await txt(p, sel("totaux-historique"))} » (1 trajet, 76,8 km) ; IndexedDB ${(await lireIdb(p)).trajets.length} trajet`;
    });
    ecrireHistoire("V-6.4");
    await c.close();
  }
  // ---- V-4.3 et V-4.4 : 41,2 L à 2,161 €/L — ÉTAT PRÉPARÉ (trajet arrêté, pas encore tranché)
  {
    const { c, p } = await nouveauContexte("cout-prepare");
    await p.goto(URL_APP + "/historique");
    await p.waitForSelector('[data-screen="T6"]');
    const a = trajetPrepare({ id: "prep-412", debut: "2026-10-21T06:30:00+02:00", minutes: 345, km: 588, l100: 7.007, depart: L.albi, arrivee: L.paris, prixPerso: 2.161, enregistre: false });
    a.litres = 41.2;
    await ecrireIdb(p, [], a);
    const q = await c.newPage();
    surveiller(q, "cout-prepare");
    await p.close();
    await q.goto(URL_APP);
    // round 2 : l'état de départ se voit — la fin de ce trajet, haut de l'écran : 41,2 litres et le prix 2,161 €/L ; l'étape 2 lit le
    // coût (même écran : image voisine, défilée sur le coût)
    await q.waitForURL("**/fin", { timeout: 15000 });
    await q.waitForSelector(sel("fin-litres"));
    await etape("V-4.3", 1, q, "V-4.3-01-avant.png", "ÉTAT PRÉPARÉ : un trajet arrêté de 41,2 L, prix 2,161 €/L (« Mon prix »), écrit en IndexedDB (en_cours/arrete) — sa fin de trajet, haut de l'écran", async () => {
      verifier((await txt(q, sel("fin-litres"))) === "41,20" && Number(await attr(q, sel("prix-apres"), "data-prix")) === 2.161, "litres / prix");
      return `trajet arrêté en attente : ${a.km} km ; écran « ${await txt(q, sel("fin-litres"))} litres », prix data-prix ${await attr(q, sel("prix-apres"), "data-prix")} (« ${await txt(q, sel("libelle-prix"))} »)`;
    }, { haut: true });
    await etape("V-4.3", 2, q, "V-4.3-02-apres.png", "la fin de trajet s'affiche (appli ouverte : le trajet arrêté revient) — le coût", async () => {
      await q.waitForURL("**/fin", { timeout: 15000 });
      await q.waitForSelector(sel("cout-trajet"));
      const t = await txt(q, sel("cout-trajet"));
      verifier(t === "89,03 € essence", t);
      return `« ${t} » (41,2 × 2,161 = ${(41.2 * 2.161).toFixed(4)} → 89,03) ; libellé « ${await txt(q, sel("libelle-prix"))} »`;
    });
    await C_offline(c, true);
    await touche(q, "compteur-prix");
    await q.locator(sel("champ-prix")).fill("2,050");
    await etape("V-4.3", 3, q, "V-4.3-03-avant.png", "le prix changé (réseau coupé : context.setOffline(true)) — « 2,050 » tapé", async () => `navigator.onLine = ${await q.evaluate(() => navigator.onLine)} ; champ « ${await q.inputValue(sel("champ-prix"))} »`, { cible: sel("prix-apres") });
    const nReq = reseau.length;
    await q.locator(sel("champ-prix")).press("Enter");
    await etape("V-4.3", 4, q, "V-4.3-04-apres.png", "je valide (Entrée), toujours sans réseau", async () => {
      const t = await txt(q, sel("cout-trajet"));
      verifier(t === `${virgule(euros2(41.2 * 2.05), 2)} € essence`, t);
      return `« ${t} » = 41,2 × 2,050 recalculé aussitôt, hors ligne (navigator.onLine ${await q.evaluate(() => navigator.onLine)})`;
    }, { cible: sel("prix-apres") });
    await touche(q, "revenir-moyenne");
    const m = Number(await attr(q, sel("cout-trajet"), "data-cout"));
    await q.locator(`${sel("carburant-apres")} [data-carburant="Gazole"]`).tap();
    const g = Number(await attr(q, sel("cout-trajet"), "data-cout"));
    const okMG = Math.abs(m - euros2(41.2 * moyFR("SP95-E10"))) < 0.001 && Math.abs(g - euros2(41.2 * moyFR("Gazole"))) < 0.001;
    noter("V-4.3", `Step 4 — toujours hors ligne : « Revenir à la moyenne » → ${virgule(m, 2)} € (41,2 × ${virgule(moyFR("SP95-E10"), 3)}), puis Gazole → ${virgule(g, 2)} € (41,2 × ${virgule(moyFR("Gazole"), 3)}) ${okMG ? "✓" : "✗"}, sur les moyennes gardées dans le trajet ; requêtes émises pendant ces changements : ${reseau.length - nReq} (${reseau.slice(nReq).map((r) => new URL(r.url).pathname).join(", ") || "aucune"}).`);
    if (!okMG) probleme("V-4.3", "- recalcul hors ligne après changement de carburant faux");
    // retour au cas 89,03 € : SP95-E10, mon prix 2,161
    await C_offline(c, false);
    await q.locator(`${sel("carburant-apres")} [data-carburant="SP95-E10"]`).tap();
    await touche(q, "compteur-prix");
    await q.locator(sel("champ-prix")).fill("2,161");
    await q.locator(sel("champ-prix")).press("Enter");
    ecrireHistoire("V-4.3");
    await etape("V-4.4", 1, q, "V-4.4-01-avant.png", "un coût de 89,03 € (SP95-E10, mon prix 2,161 €/L), 1 personne", async () => {
      verifier((await txt(q, sel("cout-trajet"))) === "89,03 € essence", "coût");
      return `« ${await txt(q, sel("cout-trajet"))} » ; « ${await txt(q, sel("part-personne"))} »`;
    }, { cible: sel("personnes-apres") });
    await touche(q, "personnes-plus");
    await touche(q, "personnes-plus");
    await etape("V-4.4", 2, q, "V-4.4-02-apres.png", "je passe le nombre de personnes à 3 avec « + »", async () => {
      const t = await txt(q, sel("part-personne"));
      verifier(t === "29,68 € chacun", t);
      return `${await attr(q, sel("personnes-apres"), "data-personnes")} personnes → « ${t} » (89,03 ÷ 3 = 29,677)`;
    }, { cible: sel("personnes-apres") });
    await touche(q, "personnes-moins");
    await touche(q, "personnes-moins");
    await etape("V-4.4", 3, q, "V-4.4-03-avant.png", "1 personne", async () => `${await attr(q, sel("personnes-apres"), "data-personnes")} personne ; « ${await txt(q, sel("part-personne"))} »`, { haut: true });
    await etape("V-4.4", 4, q, "V-4.4-04-apres.png", "l'écran s'affiche ; j'essaie de descendre sous 1 et de monter au-delà de 9", async () => {
      verifier((await txt(q, sel("part-personne"))) === "Seul : tout pour toi.", "texte");
      verifier(await q.locator(sel("personnes-moins")).isDisabled(), "− actif à 1");
      await q.locator(sel("personnes-moins")).tap({ force: true }).catch(() => {});
      const a1 = await attr(q, sel("personnes-apres"), "data-personnes");
      for (let k = 0; k < 10; k++) await q.locator(sel("personnes-plus")).tap({ force: true }).catch(() => {});
      const a9 = await attr(q, sel("personnes-apres"), "data-personnes");
      const plusOff = await q.locator(sel("personnes-plus")).isDisabled();
      for (let k = 0; k < 8; k++) await touche(q, "personnes-moins");
      verifier(a1 === "1" && a9 === "9" && plusOff, `${a1} ${a9} ${plusOff}`);
      return `« Seul : tout pour toi. » ; « − » désactivé à 1 (toucher : reste ${a1}) ; 10 touchers sur « + » → ${a9}, « + » désactivé ; revenu à ${await attr(q, sel("personnes-apres"), "data-personnes")} : « ${await txt(q, sel("part-personne"))} »`;
    }, { cible: sel("personnes-apres") });
    noter("V-4.4", "Step 4 — une seule image ne peut pas montrer les deux bornes : la capture est à 1 personne (« Seul : tout pour toi. », « − » désactivé) ; la borne 9 (« + » désactivé après 10 touchers) est relevée dans le constat de l'étape, puis le compteur est ramené à 1.");
    ecrireHistoire("V-4.4");
    await c.close();
  }
}
async function C_offline(c, v) {
  await c.setOffline(v);
}

// ================================================================= 6. Contrôle négatif (V1-retraits)
let nCapturesAutres = 0;
const reseauImporte = [];
const textesImportes = [];
async function fluxRetraits() {
  histoire("V1-retraits", "V1-retraits — Contrôle négatif : ce qui sort de la V1");
  const { c, p } = await nouveauContexte("retraits");
  await p.goto(URL_APP);
  await p.waitForSelector(sel("nom-voiture"));
  await etape("V1-retraits", 1, p, "V1-retraits-01-avant.png", "l'appli déployée, journal réseau Playwright ouvert sur TOUS les contextes du passage (écoute context.on('request'), y compris les processus précédents du même passage, relus dans exploration/m5-resultats-<passage>-*.json)", async () => `${reseau.length} requêtes de ce processus`);
  // flux joués par les processus précédents du même passage (même PASSAGE) : leurs requêtes et leurs textes passés au crible
  const autres = fs.readdirSync(path.dirname(JOURNAL)).filter((f) => f.startsWith(`m5-resultats-${PASSAGE}-`) && f.endsWith(".json")).map((f) => JSON.parse(fs.readFileSync(path.join(path.dirname(JOURNAL), f), "utf8")));
  for (const a of autres) {
    reseauImporte.push(...a.reseau);
    textesImportes.push(...a.textesInterdits.filter((t) => !t.startsWith("V1-retraits-0")));
    nCapturesAutres += a.resultats.length;
  }
  const textes = [];
  for (const route of ["/", "/voiture", "/stations", "/historique", "/en-route", "/fin"]) {
    await p.goto(URL_APP + route);
    await dormir(2500);
    textes.push({ route, url: new URL(p.url()).pathname, corps: await p.evaluate(() => document.body.innerText), liensMoteurs: await p.locator('a[href*="moteurs"], [href*="admin"]').count(), champs: await p.locator("input").evaluateAll((l) => l.map((x) => (x.getAttribute("aria-label") || x.id || x.placeholder || "").toLowerCase())) });
  }
  await p.goto(URL_APP + "/stations");
  await attendreListe(p).catch(() => {});
  await etape("V1-retraits", 2, p, "V1-retraits-02-apres.png", "parcours T1 → T6 (+ tous les flux du passage, dont 5 trajets complets rejoués)", async () => {
    const tout = [...reseauImporte, ...reseau];
    const onglets = (await p.locator('[role="tab"]').allTextContents()).map((x) => x.trim());
    verifier(JSON.stringify(onglets) === JSON.stringify(["Trajet", "Stations", "Historique"]), onglets.join(","));
    const ptv = tout.filter((r) => /myptv/i.test(r.url));
    const peages = tout.filter((r) => /functions\/v1\/(estimer-trajet|trajet-roule|peages|calcul-peages)/.test(r.url));
    verifier(ptv.length === 0 && peages.length === 0, `${ptv.length} PTV, ${peages.length} péages`);
    const mots = textes.filter((t) => /p[ée]age|itin[ée]raire/i.test(t.corps));
    const interdits = [...textesImportes, ...textesInterdits.filter((t) => !t.startsWith("V1-retraits-0"))];
    verifier(mots.length === 0 && interdits.length === 0, `${mots.map((m) => m.route).join(",")} ${interdits.join(",")}`);
    const champs = textes.flatMap((t) => t.champs).filter((x) => /d[ée]part|arriv[ée]e/.test(x));
    verifier(champs.length === 0, champs.join(","));
    verifier(textes.every((t) => t.liensMoteurs === 0 && !/Moteurs/.test(t.corps)), "lien Moteurs");
    const fonctions = {};
    for (const r of tout) { const m = r.url.match(/functions\/v1\/([\w-]+)/); if (m) fonctions[m[1]] = (fonctions[m[1]] ?? 0) + 1; }
    const hotes = {};
    for (const r of tout) { try { const h = new URL(r.url).host; hotes[h] = (hotes[h] ?? 0) + 1; } catch { /* data: */ } }
    return `${tout.length} requêtes journalisées sur ${new Set(tout.map((r) => r.flux)).size} contextes : 0 vers api.myptv.com, 0 vers estimer-trajet / trajet-roule / péages ; fonctions appelées ${JSON.stringify(fonctions)} ; hôtes ${JSON.stringify(hotes)} ; ${resultats.length + nCapturesAutres} captures (contextes ${[...new Set(tout.map((r) => r.flux))].join(", ")}) + 6 routes passées au crible : aucun « péage » ni « itinéraire » ; aucun champ départ / arrivée ; aucun lien Moteurs ; onglets ${onglets.join(" · ")}`;
  });
  await c.close();
  // ---- lectures par l'API (rôle service / API de gestion), sans aucune valeur de clé
  const { c: c2, p: q } = await nouveauContexte("retraits-api");
  const { corps: moteursT } = await restService("moteurs?select=service,nom,actif,en_service,etat&order=ordre");
  const { entetes: hc } = await restService("cles_fournisseurs?select=fournisseur", { Prefer: "count=exact", Range: "0-0" });
  const nCles = Number((hc.get("content-range") ?? "*/?").split("/")[1]);
  const vault = await sqlGestion("select count(*)::int as n, string_agg(name, ', ' order by name) as noms from vault.secrets");
  const anon = await (await fetch(`https://api.supabase.com/v1/projects/${env.SUPABASE_PROJECT_REF}/config/auth`, { headers: { Authorization: `Bearer ${env.SUPABASE_ACCESS_TOKEN}` } })).json();
  const html = (titre, corps) => `<html><body style="font:14px system-ui;padding:14px"><h3>${titre}</h3>${corps}<p style="color:#666;font-size:12px">Lu le ${new Date().toISOString()} par l'API Supabase (${titre.includes("moteurs") ? "rest/v1, rôle service" : "rest/v1 rôle service et API de gestion"}) ; aucune valeur de clé lue ni affichée.</p></body></html>`;
  await q.setContent(html("Table public.moteurs", `<table border=1 cellpadding=4 style="border-collapse:collapse"><tr><th>service</th><th>fournisseur actif</th><th>en_service</th><th>état</th></tr>${moteursT.map((m) => `<tr${m.service === "peages" ? ' style="background:#fde"' : ""}><td>${m.service}</td><td>${m.actif}</td><td>${m.en_service}</td><td>${m.etat}</td></tr>`).join("")}</table>`));
  await etape("V1-retraits", 3, q, "V1-retraits-03-avant.png", "la table public.moteurs lue par l'API Supabase (rôle service), rendue en page texte", async () => `${moteursT.map((m) => `${m.service}:${m.en_service}`).join(", ")}`);
  const peage = moteursT.find((m) => m.service === "peages");
  await q.setContent(html("Service péages, clés et Vault", `<p>Ligne <b>peages</b> de public.moteurs : fournisseur ${peage?.actif}, <b>en_service = ${peage?.en_service}</b></p><p>public.cles_fournisseurs : <b>${nCles}</b> lignes (avant le jalon, relevé r1a 09:45Z : 2)</p><p>vault.secrets : <b>${vault[0]?.n}</b> secrets — noms : ${vault[0]?.noms} (avant le jalon : 3)</p><p>Inscriptions anonymes : limite ${anon.rate_limit_anonymous_users ?? "?"} par heure</p>`));
  await etape("V1-retraits", 4, q, "V1-retraits-04-apres.png", "je lis la ligne du service péages, et le nombre de lignes des clés", async () => {
    verifier(peage && peage.en_service === false, JSON.stringify(peage));
    verifier(nCles === 2 && vault[0]?.n === 3, `${nCles} clés, ${vault[0]?.n} secrets`);
    return `peages : en_service = false (fournisseur ${peage.actif} gardé) ; cles_fournisseurs ${nCles} lignes (2 avant) ; Vault ${vault[0].n} secrets (${vault[0].noms} ; 3 avant) ; limite d'inscriptions anonymes ${anon.rate_limit_anonymous_users}`;
  });
  ecrireHistoire("V1-retraits");
  await c2.close();
}

// ================================================================= exécution
const regression = [];
const FLUXS = { voiture: fluxVoiture, trajet: fluxTrajet, cas: fluxCas, stations: fluxStations, historique: fluxHistorique, retraits: fluxRetraits };
for (const f of FLUX) {
  const t = Date.now();
  console.log(`[${heure()}] ===== flux ${f}`);
  try {
    await FLUXS[f]();
  } catch (e) {
    console.log(`[${heure()}] flux ${f} interrompu : ${e.stack ?? e}`);
    fs.appendFileSync(JOURNAL, `\n> Flux « ${f} » interrompu à ${heure()} : ${String(e.message).split("\n")[0].slice(0, 300)}\n`);
  }
  console.log(`[${heure()}] flux ${f} : ${Math.round((Date.now() - t) / 1000)} s`);
}
for (const id of histoiresOuvertes()) if (!id.endsWith("_ignore")) ecrireHistoire(id);
fs.appendFileSync(JOURNAL, `\n## Régression (passage ${FLUX.join(",")})\n${regression.map((r) => `- ${r}`).join("\n") || "- (rejouée par la spec m5-regression)"}\n\n## Erreurs de page relevées\n${erreursPage.map((e) => `- ${e}`).join("\n") || "- aucune"}\n`);
fs.writeFileSync(path.join(path.dirname(JOURNAL), `m5-resultats-${PASSAGE}-${FLUX.join("-")}.json`), JSON.stringify({ passage: PASSAGE, flux: FLUX, resultats, reseau, textesInterdits, erreursPage, regression }, null, 1));
console.log(`[${heure()}] fin : ${resultats.filter((r) => r.ok).length}/${resultats.length} ✓ ; réseau ${reseau.length} requêtes ; myptv ${reseau.filter((r) => /myptv/i.test(r.url)).length} ; textes interdits ${textesInterdits.length}`);
await navigateur.close();
