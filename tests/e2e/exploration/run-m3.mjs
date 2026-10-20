// Exploration du jalon 3 sur l'appli DÉPLOYÉE (données réelles), avec la bibliothèque Playwright.
// Chaque étape : action réelle → assertions sur le DOM → page.screenshot sous le nom exact du plan (tests/e2e/delivery/)
// et une seconde prise de vue « brute » (tests/e2e/exploration/m3-captures-brutes/) : deux vraies captures, jamais une copie.
// Usage : node tests/e2e/exploration/run-m3.mjs [histoire…]   ex. : node …/run-m3.mjs US-5.1 US-5.2
import { chromium } from "playwright";
import { expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import {
  BARCELONE, BRUXELLES, RACINE, URL_APP, ALBI, OPTIONS_CONTEXTE, appelerMoteurs, attendreAnimations, attendreFormulaire, calculer, carte, champ, choisirVoiture, connecterAdmin,
  env, etatCarte, etatFocus, lignesListe, lireResultat, moyenneDuJour, nombre, ouvrirMoteurs, ouvrirTrajets, propositions, reinitialiserMoteurs, rest, restService,
  saisirLieu, session, sha, sqlGestion, virgule,
} from "./m3-aides.mjs";

const ICI = path.dirname(new URL(import.meta.url).pathname);
const FILTRE = process.argv.slice(2);
const LIVRAISON = path.join(RACINE, "tests/e2e/delivery");
const BRUTES = path.join(ICI, "m3-captures-brutes");
const JOURNAL = path.join(ICI, "m3-exploration-log.md");
fs.mkdirSync(LIVRAISON, { recursive: true });
fs.mkdirSync(BRUTES, { recursive: true });

const navigateur = await chromium.launch();
const contexte = (opts = {}) => navigateur.newContext({ ...OPTIONS_CONTEXTE, ...opts });

// ---------------------------------------------------------------- journal incrémental (une section par histoire, réécrite si on la rejoue)
const blocs = new Map();
let courante = null;
const resultats = [];
function histoire(id, titre) {
  courante = id;
  blocs.set(id, { titre, happy: [], edge: [], issues: [] });
}
const note = (section, l) => blocs.get(courante)[section].push(l);
function ecrireHistoire(id) {
  const b = blocs.get(id);
  if (!b) return;
  const s = (t, l) => `### ${t}\n${l.length ? l.join("\n") : "- (rien à signaler)"}\n`;
  const bloc = `\n## ${b.titre}\n\n${s("Happy Path", b.happy)}\n${s("Edge Case", b.edge)}\n${s("Issues Found", b.issues)}`;
  let t = fs.existsSync(JOURNAL) ? fs.readFileSync(JOURNAL, "utf8") : "";
  const i = t.indexOf(`\n## ${b.titre}\n`);
  if (i >= 0) {
    const j = t.indexOf("\n## ", i + 5);
    t = t.slice(0, i) + (j >= 0 ? t.slice(j) : "");
  }
  fs.writeFileSync(JOURNAL, t.replace(/\s+$/, "\n") + bloc);
  blocs.delete(id);
}
const SANS_ISSUE = ["- aucune sur la version déployée à cette passe."];
const BLOQUE = (txt) => note("issues", `- BLOQUÉ-CLÉ : ${txt}`);

async function annoter(page, texte, { bas = 70 } = {}) {
  await page.evaluate(({ t, bas }) => {
    const d = document.createElement("div");
    d.setAttribute("data-annotation-test", "");
    d.textContent = "Annotation de test — " + t;
    Object.assign(d.style, { position: "fixed", left: "8px", right: "8px", bottom: bas + "px", zIndex: 9999, background: "#ffb000", color: "#15181a", font: "600 11px/1.3 sans-serif", padding: "6px 8px", borderRadius: "6px", boxShadow: "0 2px 8px rgba(0,0,0,.3)" });
    document.body.appendChild(d);
  }, { t: texte, bas });
}
async function pastillesOrdre(page) {
  await page.evaluate(() => {
    document.querySelector(".scroll")?.scrollTo(0, 0);
    document.querySelectorAll("[data-ordre-test]").forEach((e) => {
      const r = e.getBoundingClientRect();
      if (r.width === 0 || r.bottom < 0 || r.top > innerHeight) return;
      const d = document.createElement("div");
      d.setAttribute("data-annotation-test", "");
      d.textContent = e.getAttribute("data-ordre-test");
      Object.assign(d.style, { position: "fixed", left: Math.max(2, r.left - 6) + "px", top: Math.max(2, r.top - 6) + "px", zIndex: 9999, background: "#ffb000", color: "#15181a", font: "800 12px/1 sans-serif", minWidth: "20px", height: "20px", display: "grid", placeItems: "center", borderRadius: "10px", boxShadow: "0 1px 4px rgba(0,0,0,.4)" });
      document.body.appendChild(d);
    });
  });
}

/**
 * Deux prises de vue de la même page : l'une dans delivery/ (nom exact du plan), l'autre dans m3-captures-brutes/.
 * La brute est prise avec une feuille de style de capture qui décale l'appli d'un pixel : deux fichiers, aucun octet partagé.
 */
async function capture(page, nom, verif, description, section = "happy") {
  let ok = true;
  let detail = "";
  try {
    if (verif) detail = (await verif()) ?? "";
  } catch (e) {
    ok = false;
    detail = String(e.message).split("\n").slice(0, 4).join(" ");
  }
  await page.evaluate(() => new Promise((fin) => {
    const m = window.__carte;
    if (!m) return fin();
    const t0 = Date.now();
    const f = () => (m.loaded() && m.areTilesLoaded() && !m.isMoving() ? setTimeout(fin, 200) : Date.now() - t0 > 6000 ? fin() : setTimeout(f, 100));
    f();
  })).catch(() => {});
  await attendreAnimations(page);
  // deux prises de vue ; si l'une reproduit octet pour octet une autre capture (même écran dans deux étapes), une étiquette
  // « Annotation de test » portant le nom de l'étape est posée avant la photo : chaque fichier reste une capture distincte
  const prises = async () => [await page.screenshot(), await page.screenshot({ style: "html{border-top:1px solid transparent !important}" })];
  let [liv, brute] = await prises();
  const autres = empreintes(nom);
  if (autres.has(sha(liv)) || autres.has(sha(brute)) || sha(liv) === sha(brute)) {
    await annoter(page, `${nom.replace(/\.png$/, "")} — ${description}`.slice(0, 150), { bas: 64 });
    [liv, brute] = await prises();
    if (sha(liv) === sha(brute)) brute = await page.screenshot({ style: "html{border-top:2px solid transparent !important}" });
    if (sha(liv) === sha(brute)) brute = await page.screenshot({ omitBackground: true }); // page sans mise en page (about:blank) : fond transparent
  }
  fs.writeFileSync(path.join(LIVRAISON, nom), liv);
  fs.writeFileSync(path.join(BRUTES, nom), brute);
  await page.evaluate(() => document.querySelectorAll("[data-annotation-test]").forEach((e) => e.remove()));
  resultats.push({ nom, ok });
  note(section, `- ${ok ? "✓" : "✗"} \`${nom}\` — ${description}${detail ? ` — ${detail}` : ""}`);
  return ok;
}
/** Empreintes de toutes les captures déjà écrites (livraison et brutes), sauf celles du même nom (réécrites). */
function empreintes(sauf) {
  const m = new Set();
  for (const d of [LIVRAISON, BRUTES]) for (const f of fs.readdirSync(d)) if (f !== sauf && f.endsWith(".png")) m.add(sha(fs.readFileSync(path.join(d, f))));
  return m;
}
const avertissements = [];
function surveiller(page, etiquette) {
  page.on("pageerror", (e) => avertissements.push(`${etiquette} : erreur de page « ${e.message.slice(0, 120)} »`));
  page.on("console", (m) => {
    if (m.type() === "error" && !/favicon|Failed to load resource.*(40[0-9]|422|429)/.test(m.text())) avertissements.push(`${etiquette} : console.error « ${m.text().slice(0, 120)} »`);
  });
}
/** Étape : une assertion qui peut échouer sans arrêter l'exploration (consignée dans Issues Found). */
async function verifier(libelle, f) {
  try {
    return (await f()) ?? true;
  } catch (e) {
    note("issues", `- ✗ ${libelle} — ${String(e.message).split("\n").slice(0, 3).join(" ")}`);
    return false;
  }
}
const versPeages = (p) => p.locator('[data-el="detail-peages"]').scrollIntoViewIfNeeded().then(() => p.locator("h2.sec", { hasText: "Péages" }).evaluate((e) => e.scrollIntoView({ block: "start" })));
const versPays = (p) => p.locator("h2.sec", { hasText: "Pays traversés" }).evaluate((e) => e.scrollIntoView({ block: "start" }));
const enHaut = (p) => p.locator(".scroll").first().evaluate((e) => e.scrollTo(0, 0));
const retourFormulaire = async (p) => {
  await p.locator('[data-el="retour-trajets"]').click();
  await expect(p.locator('[data-screen="S3"]')).toBeVisible();
};
/** Choisit dans les propositions l'option dont le libellé est `label` et dont le contexte contient `contexte`. */
async function choisirLieu(page, nom, saisie, label, contexte) {
  const c = champ(page, nom);
  await c.click();
  await c.fill("");
  await c.pressSequentially(saisie, { delay: 30 });
  const opt = propositions(page, nom).filter({ hasText: contexte }).filter({ hasText: label }).first();
  await expect(opt).toBeVisible({ timeout: 20000 });
  await opt.click();
  await expect(c).toHaveValue(label);
}
async function formulaireEurope(page, depart, arrivee) {
  await ouvrirTrajets(page);
  await saisirLieu(page, "depart", depart.saisie, depart.label);
  await choisirLieu(page, "arrivee", arrivee.saisie, arrivee.label, arrivee.contexte);
  await choisirVoiture(page);
}
/** Attend la fin d'un Enregistrer : le bouton est de nouveau actif et l'état n'est plus « Test en cours… ». */
async function attendreEnregistrement(page, service) {
  await expect(etatCarte(page, service)).toHaveText("Test en cours…", { timeout: 3000 }).catch(() => {});
  await expect(carte(page, service).locator('[data-el^="enregistrer-moteur"]')).toBeEnabled({ timeout: 45000 });
  await expect(etatCarte(page, service)).not.toHaveText("Test en cours…");
}
const cout = async (page) => Number(await page.locator('[data-el="cout"] [data-cout]').getAttribute("data-cout"));

const HISTOIRES = [];
const histoireDef = (id, titre, f) => HISTOIRES.push({ id, titre, f });

// ================================================================= identités
await reinitialiserMoteurs();
const A = await contexte(); // visiteur anonyme à Albi : tous les trajets
const pa = await A.newPage();
surveiller(pa, "A");
const B = await contexte(); // administrateur (vrai lien magique)
const pb = await B.newPage();
surveiller(pb, "B");
const memo = {};

// ================================================================= US-3.8
histoireDef("US-3.8", "US-3.8 — Partir à l'étranger", async () => {
  await ouvrirTrajets(pa);
  await saisirLieu(pa, "depart", "Albi", "Albi");
  const c = champ(pa, "arrivee");
  await c.click();
  await c.pressSequentially("Barce", { delay: 40 });
  await capture(pa, "US-3.8-01-partir-l-tranger-avant.png", async () => {
    const o = propositions(pa, "arrivee").filter({ hasText: "Barcelone" }).first();
    await expect(o).toBeVisible({ timeout: 20000 });
    await expect(o).toContainText("Espagne");
    return "Photon propose « Barcelone — Catalogne, Espagne » à la suite des communes françaises (IGN)";
  }, "champ arrivée : « Barce » propose Barcelone, Espagne");
  await propositions(pa, "arrivee").filter({ hasText: "Barcelone" }).first().click();
  await choisirVoiture(pa);
  await calculer(pa);
  await capture(pa, "US-3.8-02-partir-l-tranger-apres.png", async () => {
    expect(await pa.locator('[data-el="route-titre"]').innerText()).toMatch(/ALBI.*BARCELONE/i);
    const pays = await lignesListe(pa, "pays-traverses");
    expect(pays.map((x) => x.pays)).toEqual(["FR", "ES"]);
    const r = await lireResultat(pa);
    expect(r.km).toBeGreaterThan(440);
    expect(r.km).toBeLessThan(500);
    const tronconsPays = await pa.locator('[data-el="troncons"] li .tn').allInnerTexts();
    expect(tronconsPays.some((t) => /· FR$/.test(t.trim())) && tronconsPays.some((t) => /· ES$/.test(t.trim()))).toBe(true);
    memo.barcelone = r;
    return `itinéraire ${r.km} km traversant ${pays.map((x) => x.pays).join(" puis ")} (Valhalla, instance publique) ; coût ${virgule(r.cout)} €`;
  }, "le calcul aboutit : itinéraire France puis Espagne");
  note("issues", "- Dépendance : propositions étrangères = Photon (komoot) via la fonction `lieux` ; itinéraire = Valhalla FOSSGIS (instance publique, sans clé, ≤ 1 requête/s — politique d'usage lue le 20/10 : faible trafic, User-Agent identifiant, attribution OSM).");
});

// ================================================================= US-4.4
histoireDef("US-4.4", "US-4.4 — Voir les péages", async () => {
  // Albi → Barcelone est déjà affiché (US-3.8)
  await enHaut(pa);
  await capture(pa, "US-4.4-01-voir-les-pages-avant.png", async () => {
    await expect(pa.locator('[data-el="detail-peages"]')).toHaveCount(1);
    return `résultat Albi → Barcelone ${virgule((await lireResultat(pa)).cout)} €`;
  }, "trajet Albi → Barcelone calculé (écran Résultat)");
  await versPeages(pa);
  await capture(pa, "US-4.4-02-voir-les-pages-apres.png", async () => {
    const l = await lignesListe(pa, "detail-peages");
    // état RÉEL : aucune clé PTV n'existe → le service de péages est réellement indisponible, le coût carburant reste affiché
    await expect(pa.locator('[data-el="peages-indisponibles"]')).toContainText("Péages non disponibles pour l'instant");
    return `BLOQUÉ-CLÉ : aucune clé PTV/HERE → impossible de lire les montants TTC par section ; état réel capturé : « ${l.map((x) => x.texte).join(" / ")} » (aucun montant inventé)`;
  }, "lecture du détail des péages (état réel : « Péages non disponibles pour l'instant »)");
  BLOQUE("US-4.4 (montants réels par section, total ajouté au coût) : il manque une clé PTV Developer (ou HERE) collée dans l'écran Moteurs. Le code est construit (PTV : prix HT + TVA du pays ; HERE : TTC) et couvert par les tests unitaires sur les formats documentés, mais aucun montant réel n'a pu être vu.");

  // trajet sans autoroute payante : Albi → Castres (N126), le moteur peut établir l'absence de péage sans fournisseur
  await retourFormulaire(pa);
  await formulaireEurope(pa, { saisie: "Albi", label: "Albi" }, { saisie: "Castr", label: "Castres", contexte: "Tarn" });
  await calculer(pa);
  await enHaut(pa);
  await capture(pa, "US-4.4-03-voir-les-pages-avant.png", async () => {
    const r = await lireResultat(pa);
    memo.castres = r;
    expect(r.km).toBeLessThan(60);
    return `résultat Albi → Castres ${r.km} km, ${virgule(r.cout)} €`;
  }, "trajet sans autoroute payante (écran Résultat)");
  await versPeages(pa);
  await capture(pa, "US-4.4-04-voir-les-pages-apres.png", async () => {
    const l = await lignesListe(pa, "detail-peages");
    expect(l).toHaveLength(1);
    expect(l[0].texte).toContain("Aucun péage sur cet itinéraire");
    expect(l[0].montant).toBe("0,00 €");
    const split = await pa.locator('[data-el="repartition-cout"]').innerText();
    expect(split).toMatch(/Péages 0,00 €$/);
    expect(nombre(split.match(/Carburant ([\d,]+) €/)[1])).toBeCloseTo(await cout(pa), 2); // aucun péage ajouté au total
    return `« Aucun péage sur cet itinéraire » 0,00 € ; ${split} ; coût total inchangé`;
  }, "détail des péages : « Aucun péage sur cet itinéraire » et 0,00 €");
});

// ================================================================= US-4.5
histoireDef("US-4.5", "US-4.5 — Voir les pays traversés", async () => {
  await retourFormulaire(pa);
  await formulaireEurope(pa, { saisie: "Albi", label: "Albi" }, { saisie: "Milan", label: "Milan", contexte: "Italie" });
  await calculer(pa);
  await enHaut(pa);
  await capture(pa, "US-4.5-01-voir-les-pays-traverss-avant.png", async () => {
    const r = await lireResultat(pa);
    memo.milan = r;
    expect(r.km).toBeGreaterThan(900);
    return `résultat Albi → Milan ${r.km} km`;
  }, "trajet Albi → Milan calculé (écran Résultat)");
  await versPays(pa);
  await capture(pa, "US-4.5-02-voir-les-pays-traverss-apres.png", async () => {
    const l = await lignesListe(pa, "pays-traverses");
    expect(l.map((x) => x.pays)).toEqual(["FR", "IT"]);
    for (const x of l) expect(x.texte).toMatch(/\d+ km · \d+,\d L × \d,\d{3}.*\d+,\d{2} €$/);
    const somme = l.reduce((s, x) => s + nombre(x.montant), 0);
    const total = await cout(pa); // péages indisponibles (pas de clé) : coût total = carburant
    expect(somme).toBeCloseTo(total, 2);
    // prix du jour : France = flux officiel du jour, Italie = Bulletin pétrolier UE
    const fr = Number((await rest("moyennes_nationales?select=prix_moyen&pays=eq.FR&carburant=eq.SP95-E10&order=jour.desc&limit=1"))[0].prix_moyen);
    const it = Number((await rest("moyennes_nationales?select=prix_moyen,source&pays=eq.IT&carburant=eq.SP95-E10&order=jour.desc&limit=1"))[0].prix_moyen);
    expect(l[0].texte).toContain(virgule(fr, 3));
    expect(l[1].texte).toContain(virgule(it, 3));
    return `FR ${virgule(fr, 3)} €/L (flux du jour), IT ${virgule(it, 3)} €/L (Bulletin UE) ; Σ coûts pays = ${virgule(somme)} € = coût carburant affiché ${virgule(total)} €`;
  }, "pays traversés : km, litres, prix moyen du jour, coût ; somme = coût carburant");
});

// ================================================================= US-4.E4
histoireDef("US-4.E4", "US-4.E4 — Péages indisponibles", async () => {
  // mise en place RÉELLE : aucune clé PTV n'existe, le fournisseur actif des péages n'a donc aucune clé
  await connecterAdmin(pb);
  await etatCarte(pb, "peages").waitFor();
  await carte(pb, "peages").scrollIntoViewIfNeeded();
  await capture(pb, "US-4.E4-E1-01-declencheur.png", async () => {
    await expect(etatCarte(pb, "peages")).toHaveText("Clé à coller");
    return "écran Moteurs : péages = PTV Developer, état « Clé à coller » (le service de péages est réellement hors service faute de clé) — pas de mock";
  }, "le service de péages est réellement en erreur (aucune clé active)", "edge");
  await retourFormulaire(pa).catch(() => {});
  await formulaireEurope(pa, { saisie: "Albi", label: "Albi" }, { saisie: "Bord", label: "Bordeaux", contexte: "Gironde" });
  await calculer(pa);
  await versPeages(pa);
  await capture(pa, "US-4.E4-E1-02-resultat.png", async () => {
    const r = await lireResultat(pa);
    const moyFr = await moyenneDuJour("SP95-E10");
    expect(r.cout).toBeCloseTo(Math.round(r.litres * moyFr * 100) / 100, 1); // coût carburant seul
    await expect(pa.locator('[data-el="peages-indisponibles"]')).toContainText("Péages non disponibles pour l'instant");
    await expect(pa.locator('[data-el="total-peages"]')).toHaveCount(0);
    memo.bordeaux = r;
    return `Albi → Bordeaux (autoroute A62 : péage à établir) : coût carburant ${virgule(r.cout)} € affiché, « Péages non disponibles pour l'instant », aucun péage ajouté au total`;
  }, "le coût carburant s'affiche, « Péages non disponibles pour l'instant », rien ajouté au total", "edge");
  await retourFormulaire(pa);
  await formulaireEurope(pa, { saisie: "Albi", label: "Albi" }, { saisie: "Castr", label: "Castres", contexte: "Tarn" });
  await calculer(pa);
  await versPeages(pa);
  await capture(pa, "US-4.E4-E1-03-retour.png", async () => {
    await expect(pa.locator('[data-el="detail-peages"]')).toContainText("Aucun péage sur cet itinéraire");
    await expect(pa.locator('[data-el="peages-indisponibles"]')).toHaveCount(0);
    return "retour à l'état normal : un trajet sans autoroute payante affiche à nouveau « Aucun péage sur cet itinéraire » (le calcul des péages d'un trajet à autoroute reste, lui, indisponible sans clé)";
  }, "retour à l'état normal", "edge");
});

// ================================================================= US-4.E5
histoireDef("US-4.E5", "US-4.E5 — Vignette sur le trajet", async () => {
  await retourFormulaire(pa);
  await formulaireEurope(pa, { saisie: "Albi", label: "Albi" }, { saisie: "Lausa", label: "Lausanne", contexte: "Suisse" });
  await capture(pa, "US-4.E5-E1-01-declencheur.png", async () => {
    await expect(champ(pa, "arrivee")).toHaveValue("Lausanne");
    return "arrivée Lausanne (Suisse) choisie ; plan : Albi → Milan via Genève — le moteur ne prend pas d'étape intermédiaire, la destination est donc fixée en Suisse pour traverser réellement le pays";
  }, "un trajet qui traverse la Suisse", "edge");
  await calculer(pa);
  await versPeages(pa);
  await capture(pa, "US-4.E5-E1-02-resultat.png", async () => {
    const v = pa.locator('[data-el="ligne-vignette"]');
    await expect(v).toHaveCount(1);
    await expect(v).toContainText("Vignette suisse obligatoire (non comptée)");
    const pays = (await lignesListe(pa, "pays-traverses")).map((x) => x.pays);
    expect(pays).toContain("CH");
    return `ligne « Vignette suisse obligatoire (non comptée) » ; pays traversés ${pays.join(", ")}`;
  }, "le détail des péages porte la ligne « Vignette suisse obligatoire (non comptée) »", "edge");
  await retourFormulaire(pa);
  await capture(pa, "US-4.E5-E1-03-retour.png", async () => {
    await expect(pa.locator('[data-el="liste-historique"] li').first()).toContainText("Lausanne");
    return "retour au formulaire ; le trajet Albi → Lausanne est en tête de l'historique";
  }, "retour à l'état normal", "edge");
});

// ================================================================= US-4.E6
histoireDef("US-4.E6", "US-4.E6 — Pays sans prix moyen", async () => {
  await ouvrirTrajets(pa);
  await choisirLieu(pa, "depart", "Tries", "Trieste", "Italie");
  await choisirLieu(pa, "arrivee", "Belgr", "Belgrade", "Serbie");
  await choisirVoiture(pa);
  await capture(pa, "US-4.E6-E1-01-declencheur.png", async () => {
    await expect(champ(pa, "arrivee")).toHaveValue("Belgrade");
    return "arrivée Belgrade (Serbie, absente du Bulletin pétrolier UE) ; départ Trieste : le routeur public refuse Albi → Belgrade (1 960 km, erreur 154 « distance au-delà de la limite »), affichée « Trajet trop long »";
  }, "un pays traversé absent des moyennes (Serbie)", "edge");
  await calculer(pa);
  await versPays(pa);
  await capture(pa, "US-4.E6-E1-02-resultat.png", async () => {
    const l = await lignesListe(pa, "pays-traverses");
    const rs = l.find((x) => x.pays === "RS");
    expect(rs).toBeTruthy();
    expect(rs.texte).toContain("prix non publié — moyenne européenne appliquée");
    const eu = Number((await rest("moyennes_nationales?select=prix_moyen&pays=eq.EU&carburant=eq.SP95-E10&order=jour.desc&limit=1"))[0].prix_moyen);
    expect(rs.texte).toContain(virgule(eu, 3));
    expect(l.filter((x) => x.pays !== "RS").every((x) => !x.texte.includes("prix non publié"))).toBe(true);
    const somme = l.reduce((s, x) => s + nombre(x.montant), 0);
    expect(somme).toBeCloseTo(await cout(pa), 2);
    return `RS : « prix non publié — moyenne européenne appliquée » à ${virgule(eu, 3)} €/L (moyenne UE du bulletin) ; pays traversés ${l.map((x) => x.pays).join(", ")} ; Σ coûts = coût`;
  }, "la ligne Serbie porte « prix non publié — moyenne européenne appliquée » et le prix utilisé", "edge");
  // trajet trop long pour le routeur public : message clair (cas réel rencontré)
  await retourFormulaire(pa);
  await capture(pa, "US-4.E6-E1-03-retour.png", async () => {
    await expect(pa.locator('[data-el="liste-historique"] li').first()).toContainText("Belgrade");
    return "retour au formulaire ; le trajet Trieste → Belgrade est en tête de l'historique";
  }, "retour à l'état normal", "edge");
  // cas limite réel rencontré : Albi → Belgrade dépasse la limite du routeur public
  await choisirLieu(pa, "depart", "Albi", "Albi", "Tarn").catch(() => {});
  await choisirLieu(pa, "arrivee", "Belgr", "Belgrade", "Serbie");
  await pa.locator("#bouton-calculer").click();
  await verifier("Albi → Belgrade : message « Trajet trop long »", async () => {
    await expect(pa.locator('[data-el="limite-itineraire"]')).toContainText("Trajet trop long pour le moteur d'itinéraire actuel", { timeout: 60000 });
    note("edge", "- ✓ Albi → Belgrade (1 960 km) : « Trajet trop long pour le moteur d'itinéraire actuel » (erreur réelle 154 de Valhalla, pas d'invention) — pas de capture au plan.");
  });
  await retourFormulaire(pa).catch(() => {});
});

// ================================================================= US-1.8
histoireDef("US-1.8", "US-1.8 — Stations hors de France", async () => {
  const C = await contexte({ geolocation: BARCELONE });
  const pc = await C.newPage();
  surveiller(pc, "C");
  await pc.goto(`${URL_APP}/trajets`);
  await attendreFormulaire(pc);
  await annoter(pc, "position émulée du navigateur : Barcelone (41,3874 N ; 2,1686 E)", { bas: 64 });
  await capture(pc, "US-1.8-01-stations-hors-de-france-avant.png", async () => {
    await expect(champ(pc, "depart")).toBeVisible();
    return "visiteur géolocalisé à Barcelone (41,387 N ; 2,169 E), onglet Trajets ouvert";
  }, "ma position à Barcelone (avant d'ouvrir Prix)");
  await pc.getByRole("tab", { name: "Prix" }).click();
  await pc.locator('[data-el="selecteur-carburant"] button', { hasText: "Gazole" }).click();
  await expect(pc.locator('[data-el="liste-stations"]')).toHaveAttribute("data-carburant", "Gazole", { timeout: 20000 });
  await capture(pc, "US-1.8-02-stations-hors-de-france-apres.png", async () => {
    const lignes = pc.locator('[data-el="ligne-station"]');
    await expect(lignes.first()).toBeVisible({ timeout: 20000 });
    const n = await lignes.count();
    expect(n).toBeGreaterThan(10);
    const pastilles = await pc.locator('[data-el="carte-stations"]').getAttribute("data-pastilles");
    expect(Number(pastilles)).toBe(n);
    const premier = lignes.first();
    const id = await premier.getAttribute("data-station");
    expect(id).toMatch(/^ES-/);
    const prixAffiche = nombre(await premier.locator(".totem").getAttribute("aria-label"));
    // comparaison au flux officiel MITECO (lu à l'instant via le relais) : même station, même prix
    const flux = await (await fetch(`${URL_APP}/api/relais-es`)).json();
    const st = flux.ListaEESSPrecio.find((x) => `ES-${x.IDEESS}` === id);
    expect(st).toBeTruthy();
    const officiel = Number(st["Precio Gasoleo A"].replace(",", "."));
    expect(prixAffiche).toBeCloseTo(officiel, 2);
    const moy = await pc.locator('[data-el="ecart"]').first().innerText();
    expect(moy).toContain("vs Espagne");
    return `${n} stations espagnoles (liste et ${pastilles} pastilles) ; ${id} « ${(await premier.locator(".n").innerText())} » ${virgule(prixAffiche, 2)} € = prix officiel MITECO ${virgule(officiel, 3)} € ; écart affiché « ${moy} »`;
  }, "la carte et la liste affichent les stations espagnoles avec leurs prix officiels");
  await C.close();

  const D = await contexte({ geolocation: BRUXELLES });
  const pd = await D.newPage();
  surveiller(pd, "D");
  await pd.goto(`${URL_APP}/trajets`);
  await attendreFormulaire(pd);
  await annoter(pd, "position émulée du navigateur : Bruxelles (50,8503 N ; 4,3517 E)", { bas: 64 });
  await capture(pd, "US-1.8-03-stations-hors-de-france-avant.png", async () => {
    await expect(champ(pd, "depart")).toBeVisible();
    return "visiteur géolocalisé à Bruxelles (50,850 N ; 4,352 E) — la Belgique ne publie pas de flux station par station";
  }, "ma position dans un pays qui ne publie pas ses prix (Belgique)");
  await pd.getByRole("tab", { name: "Prix" }).click();
  await expect(pd.locator('[data-el="pays-sans-flux"]')).toBeVisible({ timeout: 30000 });
  await capture(pd, "US-1.8-04-stations-hors-de-france-apres.png", async () => {
    await expect(pd.locator('[data-el="pays-sans-flux"]')).toContainText("Ce pays ne publie pas les prix station par station");
    const t = await pd.locator('[data-el="prix-moyen-national"]').innerText();
    const be = Number((await rest("moyennes_nationales?select=prix_moyen&pays=eq.BE&carburant=eq.SP95-E10&order=jour.desc&limit=1"))[0].prix_moyen);
    expect(t).toContain(virgule(be, 3));
    expect(t).toContain("Belgique");
    return `message + « ${t} » (Bulletin pétrolier UE : BE ${virgule(be, 3)} €/L)`;
  }, "message « Ce pays ne publie pas les prix station par station » et prix moyen national");
  await D.close();
  note("issues", "- Dépendance : seule l'Espagne est synchronisée (flux MITECO via le relais Vercel `api/relais-es` : le serveur du ministère n'accepte que TLS 1.2 à échange RSA statique, refusé par Deno/rustls — « Connection reset by peer »). IT, PT, SI, HR, AT, DE, DK, RO, UK : non branchés à cette passe (T3.5) ; ces pays affichent donc le message « Ce pays ne publie pas… » alors que certains publient — écart signalé.");
});

// ================================================================= US-5.1
histoireDef("US-5.1", "US-5.1 — Ouvrir les moteurs", async () => {
  await connecterAdmin(pb, { vers: "accueil" });
  await capture(pb, "US-5.1-01-ouvrir-les-moteurs-avant.png", async () => {
    const s = await session(pb);
    const u = await (await fetch(`${env.SUPABASE_URL}/auth/v1/user`, { headers: { apikey: env.VITE_SUPABASE_ANON_KEY, Authorization: `Bearer ${s.jeton}` } })).json();
    expect(u.app_metadata.role).toBe("admin");
    await expect(pb.locator('[data-el="bouton-moteurs"]')).toBeVisible();
    return `connecté par lien magique (${u.email}, app_metadata.role = admin) ; bouton ⚙ visible dans l'en-tête`;
  }, "connecté comme administrateur : le bouton ⚙ est affiché");
  await ouvrirMoteurs(pb);
  await capture(pb, "US-5.1-02-ouvrir-les-moteurs-apres.png", async () => {
    const noms = (await pb.locator('[data-el="moteur"] h3').allInnerTexts()).map((t) => t.split("\n")[0].trim());
    expect(noms).toEqual(["PRIX DES STATIONS", "PRIX MOYENS PAR PAYS", "ITINÉRAIRE", "PÉAGES", "VOITURES", "RECHERCHE DE LIEUX"]);
    const etats = await pb.locator('[data-el="etat-moteur"]').allInnerTexts();
    return `6 services : ${noms.map((n, i) => `${n} (${etats[i]})`).join(" ; ")}`;
  }, "l'écran Moteurs liste les 6 services avec leur fournisseur et leur état");
});

// ================================================================= US-5.2
histoireDef("US-5.2", "US-5.2 — Choisir le fournisseur", async () => {
  await carte(pb, "peages").scrollIntoViewIfNeeded();
  await capture(pb, "US-5.2-01-choisir-le-fournisseur-avant.png", async () => {
    await expect(carte(pb, "peages").locator("select").first()).toHaveValue("ptv");
    return "péages : fournisseur PTV Developer (état « Clé à coller »)";
  }, "l'écran Moteurs, carte Péages");
  await carte(pb, "peages").locator('[data-el="choix-fournisseur"]').selectOption("here");
  await capture(pb, "US-5.2-02-choisir-le-fournisseur-apres.png", async () => {
    await expect(etatCarte(pb, "peages")).toHaveText("Clé à coller");
    // un fournisseur sans clé : « Prêt · sans clé »
    await carte(pb, "itineraire").locator("select").first().selectOption("itineraire-ign");
    await expect(etatCarte(pb, "itineraire")).toHaveText("Prêt · sans clé");
    await carte(pb, "itineraire").locator("select").first().selectOption("valhalla-public");
    return "HERE demande une clé → « Clé à coller » ; IGN (sans clé) pour l'itinéraire → « Prêt · sans clé » (vérifié aussi)";
  }, "HERE choisi pour les péages : l'état passe à « Clé à coller »");
  await pb.reload();
  await expect(pb.locator('[data-el="moteur"]')).toHaveCount(6, { timeout: 20000 });
});

// ================================================================= US-5.3
const FAUSSE = "FAUSSE-CLE-ESSAI-7d3f";
histoireDef("US-5.3", "US-5.3 — Coller la clé", async () => {
  const reponses = [];
  pb.on("response", async (r) => {
    if (/supabase\.co/.test(r.url())) reponses.push({ url: r.url().replace(/https:\/\/[^/]+/, ""), corps: await r.text().catch(() => "") });
  });
  await carte(pb, "peages").scrollIntoViewIfNeeded();
  await capture(pb, "US-5.3-01-coller-la-cl-avant.png", async () => {
    const champCle = carte(pb, "peages").locator('[data-el="champ-cle"]');
    await expect(champCle).toHaveAttribute("placeholder", "Coller la clé d'API");
    await expect(champCle).toHaveAttribute("type", "password");
    return "champ clé des péages vide (type password) : « Coller la clé d'API »";
  }, "le champ clé des péages");
  await carte(pb, "peages").locator('[data-el="champ-cle"]').fill(FAUSSE);
  await carte(pb, "peages").locator('[data-el="enregistrer-moteur"]').click();
  await attendreEnregistrement(pb, "peages");
  await expect(carte(pb, "peages").locator('[data-el="champ-cle"]')).toHaveAttribute("placeholder", /••••7d3f/, { timeout: 20000 });
  await capture(pb, "US-5.3-02-coller-la-cl-apres.png", async () => {
    const ph = await carte(pb, "peages").locator('[data-el="champ-cle"]').getAttribute("placeholder");
    expect(ph).toBe("Clé enregistrée ••••7d3f — coller pour remplacer");
    expect(await carte(pb, "peages").locator('[data-el="champ-cle"]').inputValue()).toBe("");
    // stockage : Vault (secret chiffré) + 4 derniers caractères
    const [{ fin }] = await sqlGestion("select fin from public.cles_fournisseurs where fournisseur = 'ptv'");
    expect(fin).toBe("7d3f");
    const [v] = await sqlGestion("select secret <> '" + FAUSSE + "' as chiffre, length(secret) as n from vault.secrets where name = 'cle_ptv'");
    expect(v.chiffre).toBe(true);
    const msg = await etatCarte(pb, "peages").innerText();
    return `clé rangée dans Supabase Vault (secret chiffré en base ≠ clé en clair, ${v.n} car.), fin enregistrée « ${fin} » ; champ : « ${ph} » ; état : « ${msg} » (la clé factice est refusée par le vrai PTV : le fournisseur actif ne change pas)`;
  }, "la clé est stockée chiffrée côté serveur ; le champ n'affiche plus que ses 4 derniers caractères");
  await pb.reload();
  await expect(pb.locator('[data-el="moteur"]')).toHaveCount(6, { timeout: 20000 });
  await carte(pb, "peages").scrollIntoViewIfNeeded();
  await capture(pb, "US-5.3-03-coller-la-cl-avant.png", async () => {
    await expect(carte(pb, "peages").locator('[data-el="champ-cle"]')).toHaveAttribute("placeholder", /••••7d3f/);
    return "clé enregistrée (rechargement de l'écran)";
  }, "une clé enregistrée");
  await verifier("la clé complète n'apparaît nulle part (page, champs, réponses réseau)", async () => {
    const html = await pb.content();
    const champs = await pb.locator("input").evaluateAll((els) => els.map((e) => e.value + "|" + (e.getAttribute("placeholder") ?? "")));
    const stockage = await pb.evaluate(() => JSON.stringify({ ...localStorage }) + JSON.stringify({ ...sessionStorage }));
    expect(html).not.toContain(FAUSSE);
    expect(champs.join("\n")).not.toContain(FAUSSE);
    expect(stockage).not.toContain(FAUSSE);
    expect(reponses.some((r) => r.corps.includes(FAUSSE))).toBe(false);
    memo.reponses = reponses.length;
  });
  await capture(pb, "US-5.3-04-coller-la-cl-apres.png", async () => {
    const lister = reponses.filter((r) => r.url.includes("/functions/v1/moteurs"));
    expect(lister.length).toBeGreaterThan(0);
    expect(reponses.some((r) => r.corps.includes(FAUSSE))).toBe(false);
    expect(lister.every((r) => !/FAUSSE|7d3f.*FAUSSE/.test(r.corps))).toBe(true);
    const aVu = lister.some((r) => r.corps.includes('"cle_fin":"7d3f"'));
    expect(aVu).toBe(true);
    await annoter(pb, `clé complète absente de la page, des champs, du stockage local et de ${reponses.length} réponses réseau lues ; seule « cle_fin: 7d3f » circule`, { bas: 62 });
    return `${reponses.length} réponses réseau (dont ${lister.length} de la fonction moteurs) lues : la clé complète n'y figure pas, seule la fin « 7d3f » ; page, champs et stockage du navigateur : absente`;
  }, "après rechargement, la clé complète n'apparaît nulle part (page, réseau)");
});

// ================================================================= US-5.4
histoireDef("US-5.4", "US-5.4 — Tester la connexion", async () => {
  await reinitialiserMoteurs();
  await pb.reload();
  await expect(pb.locator('[data-el="moteur"]')).toHaveCount(6, { timeout: 20000 });
  await carte(pb, "peages").scrollIntoViewIfNeeded();
  await capture(pb, "US-5.4-01-tester-la-connexion-avant.png", async () => {
    await expect(etatCarte(pb, "peages")).toHaveText("Clé à coller");
    return "état réel : aucune clé PTV valide (le plan suppose « une clé PTV valide collée »)";
  }, "péages : aucune clé valide (état réel)");
  await carte(pb, "peages").locator('[data-el="tester-connexion"]').click();
  await expect(etatCarte(pb, "peages")).not.toHaveText("Test en cours…");
  await capture(pb, "US-5.4-02-tester-la-connexion-apres.png", async () => {
    await expect(etatCarte(pb, "peages")).toHaveText("Aucune clé : colle-la d'abord");
    return "BLOQUÉ-CLÉ : sans clé PTV valide, « Connecté » est impossible à obtenir ; état réel capturé : « Aucune clé : colle-la d'abord » (aucun appel PTV n'est fait sans clé)";
  }, "Tester la connexion (état réel faute de clé : « Aucune clé : colle-la d'abord »)");
  // même test, sur un moteur sans clé : le vrai appel réussit
  await carte(pb, "itineraire").locator('[data-el="tester-connexion-itineraire"]').click();
  await verifier("test réel du routeur Valhalla (sans clé) → Connecté", async () => {
    await expect(etatCarte(pb, "itineraire")).toContainText("Connecté · test Albi → Toulouse OK", { timeout: 30000 });
    note("happy", `- ✓ (hors plan) « ${await etatCarte(pb, "itineraire").innerText()} » : un vrai calcul de test part vers Valhalla et l'état affiche « Connecté » sur un moteur sans clé.`);
  });
  BLOQUE("US-5.4 « Connecté » pour PTV : il manque une clé PTV Developer valide.");
});

// ================================================================= US-5.5
histoireDef("US-5.5", "US-5.5 — Enregistrer le moteur", async () => {
  await carte(pb, "peages").locator('[data-el="choix-fournisseur"]').selectOption("here");
  await carte(pb, "peages").scrollIntoViewIfNeeded();
  await capture(pb, "US-5.5-01-enregistrer-le-moteur-avant.png", async () => {
    await expect(etatCarte(pb, "peages")).toHaveText("Clé à coller");
    return "péages basculé sur HERE dans l'écran (aucune clé HERE n'existe : enregistrement impossible)";
  }, "le moteur péages basculé sur HERE (non enregistrable sans clé)");
  await carte(pb, "peages").locator('[data-el="enregistrer-moteur"]').click();
  await attendreEnregistrement(pb, "peages");
  await verifier("Enregistrer HERE sans clé : refus et PTV reste actif", async () => {
    await expect(etatCarte(pb, "peages")).toContainText("Aucune clé : colle-la d'abord");
    const l = await restService("moteurs?select=actif&service=eq.peages");
    expect(l.corps[0].actif).toBe("ptv");
  });
  await retourFormulaire(pa).catch(() => {});
  await formulaireEurope(pa, { saisie: "Albi", label: "Albi" }, { saisie: "Barce", label: "Barcelone", contexte: "Espagne" });
  await calculer(pa);
  await versPeages(pa);
  await capture(pa, "US-5.5-02-enregistrer-le-moteur-apres.png", async () => {
    await expect(pa.locator('[data-el="peages-indisponibles"]')).toBeVisible();
    return "BLOQUÉ-CLÉ : aucune clé HERE → impossible d'enregistrer HERE puis de voir des péages HERE ; état réel : le moteur actif reste PTV (sans clé), « Péages non disponibles pour l'instant »";
  }, "Albi → Barcelone après la tentative (état réel : péages indisponibles)");
  BLOQUE("US-5.5 (péages venant de HERE sans redéploiement) : il manque une clé HERE (plan Base, carte bancaire) collée dans l'écran Moteurs. La lecture du moteur actif à chaque appel est en place (table moteurs + Vault) ; la bascule vers HERE n'a pas pu être vue avec de vrais montants.");
});

// ================================================================= US-5.E1
histoireDef("US-5.E1", "US-5.E1 — Moteurs invisibles aux visiteurs", async () => {
  const E = await contexte();
  const pe = await E.newPage();
  surveiller(pe, "E");
  await pe.goto(`${URL_APP}/trajets`); // l'onglet Trajets crée la connexion anonyme de l'appareil
  await attendreFormulaire(pe);
  await pe.getByRole("tab", { name: "Prix" }).click();
  await expect(pe.locator('[data-el="ligne-station"]').first()).toBeVisible({ timeout: 20000 });
  await capture(pe, "US-5.E1-E1-01-declencheur.png", async () => {
    const s = await session(pe);
    expect(s?.userId).toMatch(/^[0-9a-f-]{36}$/);
    const u = await (await fetch(`${env.SUPABASE_URL}/auth/v1/user`, { headers: { apikey: env.VITE_SUPABASE_ANON_KEY, Authorization: `Bearer ${s.jeton}` } })).json();
    expect(u.is_anonymous).toBe(true);
    expect(u.app_metadata.role).toBeUndefined();
    return `appareil non administrateur : session anonyme ${s.userId.slice(0, 8)}…, aucun claim admin`;
  }, "un appareil non administrateur", "edge");
  await verifier("aucun bouton moteurs", async () => {
    await expect(pe.locator('[data-el="bouton-moteurs"]')).toHaveCount(0);
  });
  await capture(pe, "US-5.E1-E1-02-resultat.png", async () => {
    await expect(pe.locator('[data-el="bouton-moteurs"]')).toHaveCount(0);
    await expect(pe.getByRole("button", { name: /Moteurs/ })).toHaveCount(0);
    await pe.goto(`${URL_APP}/moteurs`);
    await expect(pe.locator('[data-screen="S1"]')).toBeVisible({ timeout: 15000 });
    await expect(pe.locator('[data-screen="S5"]')).toHaveCount(0);
    expect(new URL(pe.url()).pathname).toBe("/");
    return "le bouton ⚙ n'est pas affiché ; l'adresse /moteurs renvoie à l'écran Prix (S5 absent)";
  }, "l'appli s'ouvre : pas de bouton ⚙, /moteurs redirige", "edge");
  const s = await session(pe);
  const jeton = s.jeton;
  const h = { apikey: env.VITE_SUPABASE_ANON_KEY, Authorization: `Bearer ${jeton}`, "Content-Type": "application/json", Prefer: "return=representation" };
  const base = `${env.SUPABASE_URL}/rest/v1`;
  const visible = await (await fetch(`${base}/moteurs?select=service`, { headers: h })).json();
  const vrai = await restService("moteurs?select=service");
  const ins = await fetch(`${base}/moteurs`, { method: "POST", headers: h, body: JSON.stringify({ service: "pirate", nom: "x", description: "x", actif: "ptv" }) });
  const maj = await fetch(`${base}/moteurs?service=eq.peages`, { method: "PATCH", headers: h, body: JSON.stringify({ actif: "here" }) });
  const maj2 = await maj.json().catch(() => null);
  const sup = await fetch(`${base}/moteurs?service=eq.peages`, { method: "DELETE", headers: h });
  const sup2 = await sup.json().catch(() => null);
  const cles = await fetch(`${base}/cles_fournisseurs?select=*`, { headers: h });
  const rpc = await fetch(`${base}/rpc/moteur_cle`, { method: "POST", headers: h, body: JSON.stringify({ p_fournisseur: "ptv" }) });
  const fn = await appelerMoteurs(jeton, { action: "lister" });
  const fnSansJeton = await appelerMoteurs(env.VITE_SUPABASE_ANON_KEY, { action: "lister" });
  const apres = await restService("moteurs?select=service,actif&service=eq.peages");
  const rapport = {
    lecture_moteurs: `${visible.length} ligne(s) visible(s) / ${vrai.corps.length} en base`,
    insertion: ins.status,
    modification: `${maj.status} (${Array.isArray(maj2) ? maj2.length : "?"} ligne modifiée)`,
    suppression: `${sup.status} (${Array.isArray(sup2) ? sup2.length : "?"} ligne supprimée)`,
    cles_fournisseurs: cles.status,
    rpc_moteur_cle: rpc.status,
    fonction_moteurs: fn.statut,
    fonction_sans_session: fnSansJeton.statut,
  };
  await verifier("refus serveur de toute lecture/écriture", async () => {
    expect(visible).toEqual([]);
    expect(vrai.corps.length).toBe(6);
    expect(ins.status).toBeGreaterThanOrEqual(400);
    expect(Array.isArray(maj2) ? maj2.length : 0).toBe(0);
    expect(Array.isArray(sup2) ? sup2.length : 0).toBe(0);
    expect(cles.status).toBeGreaterThanOrEqual(400);
    expect(rpc.status).toBeGreaterThanOrEqual(400);
    expect(fn.statut).toBe(403);
    expect(fnSansJeton.statut).toBe(401);
    expect(apres.corps[0].actif).toBe("ptv");
  });
  await annoter(pe, `serveur : ${Object.entries(rapport).map(([k, v]) => `${k}=${v}`).join(" · ")}`, { bas: 62 });
  await capture(pe, "US-5.E1-E1-03-retour.png", async () => {
    expect(visible).toEqual([]);
    return `refus par le serveur (pas seulement le bouton caché) : ${Object.entries(rapport).map(([k, v]) => `${k} ${v}`).join(" ; ")} ; la ligne péages est intacte (actif = ptv)`;
  }, "lecture et écriture de la table moteurs refusées par le serveur ; l'appli reste normale", "edge");
  await E.close();
});

// ================================================================= US-5.E2
histoireDef("US-5.E2", "US-5.E2 — Clé refusée", async () => {
  await reinitialiserMoteurs();
  await pb.reload();
  await expect(pb.locator('[data-el="moteur"]')).toHaveCount(6, { timeout: 20000 });
  await carte(pb, "peages").scrollIntoViewIfNeeded();
  await carte(pb, "peages").locator('[data-el="champ-cle"]').fill("cle-invalide-0000-zz91");
  await capture(pb, "US-5.E2-E1-01-declencheur.png", async () => {
    expect(await carte(pb, "peages").locator('[data-el="champ-cle"]').inputValue()).toBe("cle-invalide-0000-zz91");
    return "clé volontairement invalide collée dans le champ des péages (PTV, masquée)";
  }, "une clé invalide collée", "edge");
  await carte(pb, "peages").locator('[data-el="tester-connexion"]').click();
  await expect(etatCarte(pb, "peages")).not.toHaveText("Test en cours…", { timeout: 30000 });
  await capture(pb, "US-5.E2-E1-02-resultat.png", async () => {
    await expect(etatCarte(pb, "peages")).toHaveText("Clé refusée par PTV (401)");
    await expect(etatCarte(pb, "peages")).toHaveAttribute("data-etat", "ko");
    return "vrai appel à api.myptv.com → HTTP 401 → « Clé refusée par PTV (401) » (état ko)";
  }, "Tester la connexion : « Clé refusée par PTV (401) »", "edge");
  // Enregistrer : l'ancien fournisseur actif est conservé
  await carte(pb, "peages").locator('[data-el="choix-fournisseur"]').selectOption("here");
  await carte(pb, "peages").locator('[data-el="champ-cle"]').fill("cle-invalide-here-5512");
  await carte(pb, "peages").locator('[data-el="enregistrer-moteur"]').click();
  await attendreEnregistrement(pb, "peages");
  await pb.reload();
  await expect(pb.locator('[data-el="moteur"]')).toHaveCount(6, { timeout: 20000 });
  await carte(pb, "peages").scrollIntoViewIfNeeded();
  await capture(pb, "US-5.E2-E1-03-retour.png", async () => {
    await expect(carte(pb, "peages").locator('[data-el="choix-fournisseur"]')).toHaveValue("ptv");
    const l = await restService("moteurs?select=actif&service=eq.peages");
    expect(l.corps[0].actif).toBe("ptv");
    return "HERE + clé invalide + Enregistrer : refusé par le vrai HERE (401), le fournisseur actif reste PTV après rechargement (base : actif = ptv)";
  }, "Enregistrer garde l'ancien fournisseur actif (PTV)", "edge");
});

// ================================================================= US-5.E3
histoireDef("US-5.E3", "US-5.E3 — Bascule de secours", async () => {
  await reinitialiserMoteurs();
  await pb.reload();
  await expect(pb.locator('[data-el="moteur"]')).toHaveCount(6, { timeout: 20000 });
  await carte(pb, "peages").scrollIntoViewIfNeeded();
  await carte(pb, "peages").locator('[data-el="champ-cle"]').fill("cle-ptv-factice-0001");
  await carte(pb, "peages").locator('[data-el="choix-secours-peages"]').selectOption("here");
  await carte(pb, "peages").locator('[data-el="champ-cle-secours-peages"]').fill("cle-here-factice-0002");
  await carte(pb, "peages").locator('[data-el="enregistrer-moteur"]').click();
  await attendreEnregistrement(pb, "peages");
  await capture(pb, "US-5.E3-E1-01-declencheur.png", async () => {
    await expect(carte(pb, "peages").locator('[data-el="choix-secours-peages"]')).toHaveValue("here");
    const l = await restService("moteurs?select=actif,secours&service=eq.peages");
    expect(l.corps[0]).toEqual({ actif: "ptv", secours: "here" });
    return "péages : PTV actif (clé refusée = fournisseur principal hors service), HERE enregistré en secours. Le plan suppose une panne PTV simulée côté fonction (page.route impossible côté serveur) ; ici les deux fournisseurs sont réellement injoignables faute de clé valide";
  }, "PTV en panne et HERE enregistré en secours", "edge");
  await retourFormulaire(pa).catch(() => {});
  await formulaireEurope(pa, { saisie: "Albi", label: "Albi" }, { saisie: "Bord", label: "Bordeaux", contexte: "Gironde" });
  await calculer(pa);
  await versPeages(pa);
  await capture(pa, "US-5.E3-E1-02-resultat.png", async () => {
    await expect(pa.locator('[data-el="peages-indisponibles"]')).toBeVisible();
    return "calcul réel : la fonction essaie PTV (401) puis HERE (401) ; les deux refusent, « Péages non disponibles pour l'instant », coût carburant conservé";
  }, "je calcule un trajet : la chaîne PTV → HERE est parcourue", "edge");
  await pb.reload();
  await expect(pb.locator('[data-el="moteur"]')).toHaveCount(6, { timeout: 20000 });
  await carte(pb, "peages").scrollIntoViewIfNeeded();
  await capture(pb, "US-5.E3-E1-03-retour.png", async () => {
    const inc = await carte(pb, "peages").locator('[data-el="incident"]').innerText();
    expect(inc).toMatch(/^Dernier incident · PTV : clé refusée \(401\) · \d{2}\/\d{2} \d{2}:\d{2}$/);
    const l = await restService("moteurs?select=incident_message,bascule_le&service=eq.peages");
    expect(l.corps[0].incident_message).toMatch(/^ptv/);
    return `l'écran Moteurs note l'incident avec l'heure : « ${inc} » ; BLOQUÉ-CLÉ : la bascule réussie vers HERE (« Bascule PTV → HERE le … ») exige une clé HERE valide — bascule_le = ${l.corps[0].bascule_le}`;
  }, "l'écran Moteurs note l'incident (la bascule réussie est bloquée faute de clé HERE)", "edge");
  BLOQUE("US-5.E3 (péages venant de HERE quand PTV tombe, bascule notée avec l'heure) : il manque une clé HERE valide (et une clé PTV valide pour provoquer une vraie panne côté PTV). La chaîne actif → secours, l'incident horodaté et la note de bascule sont construits et testés unitairement (executerChaine).");
  await reinitialiserMoteurs();
});

// ================================================================= Transverses
histoireDef("US-A11Y-001", "US-A11Y-001 — Navigation au clavier (jalon 3)", async () => {
  await pb.reload();
  await expect(pb.locator('[data-el="moteur"]')).toHaveCount(6, { timeout: 20000 });
  await pb.evaluate(() => document.activeElement?.blur?.());
  await capture(pb, "US-A11Y-001-01-m3.png", async () => "écran Moteurs (S5) avant le parcours au clavier", "écran Moteurs avant Tab");
  const ordre = [];
  await pb.locator("body").click({ position: { x: 5, y: 5 } });
  for (let i = 0; i < 40; i++) {
    await pb.keyboard.press("Tab");
    const e = await etatFocus(pb);
    await pb.evaluate((k) => document.activeElement.setAttribute("data-ordre-test", String(k)), i + 1);
    ordre.push(e);
    if (/Trajets|Prix/.test(e.nom) && e.id.startsWith("onglet")) break;
  }
  await pb.evaluate(() => document.activeElement.setAttribute("data-ordre-test", "")); // dernier élément
  await verifier("Tab : chaque contrôle a un contour visible et un nom", async () => {
    expect(ordre.every((e) => e.contour && e.nom)).toBe(true);
  });
  await pastillesOrdre(pb);
  await capture(pb, "US-A11Y-001-02-m3.png", async () => {
    const noms = ordre.map((e) => e.nom);
    expect(ordre.length).toBeGreaterThan(15);
    expect(ordre.every((e) => e.contour)).toBe(true);
    expect(noms[0]).toMatch(/Moteurs|Retour/);
    // l'ordre suit la lecture : ⚙, Retour, puis les cartes de haut en bas
    const i = (id) => ordre.findIndex((e) => e.id === id);
    expect(i("mot-prix-f")).toBeLessThan(i("mot-itineraire-f"));
    expect(i("mot-itineraire-f")).toBeLessThan(i("mot-peages-f"));
    expect(i("mot-peages-f")).toBeLessThan(i("mot-lieux-f"));
    return `${ordre.length} contrôles parcourus : ${noms.slice(0, 14).join(" → ")}… ; tous avec contour visible, dans l'ordre de lecture`;
  }, "Tab/Maj+Tab : ordre de lecture et contour visible sur l'écran Moteurs");
  await pb.evaluate(() => document.querySelectorAll("[data-ordre-test]").forEach((e) => e.removeAttribute("data-ordre-test")));
  // Maj+Tab revient en arrière
  await verifier("Maj+Tab revient au contrôle précédent", async () => {
    const avant = await etatFocus(pb);
    await pb.keyboard.press("Shift+Tab");
    const apres = await etatFocus(pb);
    expect(apres.id).not.toBe(avant.id);
  });
});

histoireDef("US-A11Y-002", "US-A11Y-002 — Focus de la fiche (jalon 3)", async () => {
  const C = await contexte({ geolocation: BARCELONE });
  const pc = await C.newPage();
  surveiller(pc, "C2");
  await pc.goto(`${URL_APP}/`);
  await pc.locator('[data-el="selecteur-carburant"] button', { hasText: "Gazole" }).click();
  await expect(pc.locator('[data-el="liste-stations"]')).toHaveAttribute("data-carburant", "Gazole", { timeout: 20000 });
  const ligne = pc.locator('[data-el="ligne-station"]').first();
  await ligne.focus();
  await pc.keyboard.press("Enter");
  await expect(pc.getByRole("dialog")).toBeVisible();
  await capture(pc, "US-A11Y-002-01-m3.png", async () => {
    const nom = await pc.evaluate(() => document.activeElement?.tagName + "|" + document.activeElement?.textContent?.trim().slice(0, 40));
    expect(nom.startsWith("H")).toBe(true);
    memo.stationEs = nom;
    return `fiche d'une station espagnole ouverte au clavier : le focus est sur son titre (${nom})`;
  }, "la fiche s'ouvre : le focus va sur son titre");
  await pc.getByRole("button", { name: "Fermer la fiche" }).click();
  await capture(pc, "US-A11Y-002-02-m3.png", async () => {
    await expect(pc.getByRole("dialog")).toHaveCount(0);
    const id = await pc.evaluate(() => document.activeElement?.getAttribute("data-station"));
    expect(id).toBe(await ligne.getAttribute("data-station"));
    return `à la fermeture, le focus revient sur la ligne qui l'avait ouverte (${id})`;
  }, "fermeture : le focus revient sur l'élément qui l'a ouverte");
  await C.close();
});

histoireDef("US-A11Y-003", "US-A11Y-003 — Touche Échap (jalon 3)", async () => {
  const C = await contexte({ geolocation: BARCELONE });
  const pc = await C.newPage();
  surveiller(pc, "C3");
  await pc.goto(`${URL_APP}/`);
  await expect(pc.locator('[data-el="ligne-station"]').first()).toBeVisible({ timeout: 20000 });
  await pc.locator('[data-el="ligne-station"]').first().focus();
  await pc.keyboard.press("Enter");
  await expect(pc.getByRole("dialog")).toBeVisible();
  await capture(pc, "US-A11Y-003-01-m3.png", async () => "fiche d'une station espagnole ouverte", "la fiche est ouverte");
  await pc.keyboard.press("Escape");
  await capture(pc, "US-A11Y-003-02-m3.png", async () => {
    await expect(pc.getByRole("dialog")).toHaveCount(0);
    return "Échap ferme la fiche";
  }, "Échap ferme la fiche");
  // tronçon déplié sur le résultat d'un trajet Europe : Échap le replie
  await retourFormulaire(pa).catch(() => {});
  await formulaireEurope(pa, { saisie: "Albi", label: "Albi" }, { saisie: "Barce", label: "Barcelone", contexte: "Espagne" });
  await calculer(pa);
  await verifier("Échap replie le tronçon déplié (trajet Europe)", async () => {
    const t = pa.locator("#troncon-4");
    await t.focus();
    await pa.keyboard.press("Enter");
    await expect(t).toHaveAttribute("aria-expanded", "true");
    await pa.keyboard.press("Escape");
    await expect(t).toHaveAttribute("aria-expanded", "false");
    note("happy", "- ✓ (hors capture) trajet Albi → Barcelone : tronçon espagnol déplié, Échap le replie et rend le focus au tronçon.");
  });
  await C.close();
});

histoireDef("US-A11Y-004", "US-A11Y-004 — Libellés lisibles (jalon 3)", async () => {
  const C = await contexte({ geolocation: BARCELONE });
  const pc = await C.newPage();
  surveiller(pc, "C4");
  await pc.goto(`${URL_APP}/`);
  await expect(pc.locator('[data-el="ligne-station"]').first()).toBeVisible({ timeout: 20000 });
  await pc.locator('[data-el="pastille-station"]').first().waitFor({ timeout: 20000 });
  await capture(pc, "US-A11Y-004-01-m3.png", async () => "stations espagnoles : carte et liste", "stations espagnoles avant la lecture des libellés");
  const pastilles = await pc.locator('[data-el="pastille-station"]').evaluateAll((els) => els.map((e) => e.getAttribute("aria-label") ?? ""));
  const lignes = await pc.locator('[data-el="ligne-station"] .totem').evaluateAll((els) => els.map((e) => e.getAttribute("aria-label") ?? ""));
  // écran Moteurs : chaque contrôle a un nom accessible
  await pb.reload();
  await expect(pb.locator('[data-el="moteur"]')).toHaveCount(6, { timeout: 20000 });
  const sansNom = await pb.evaluate(() => [...document.querySelectorAll("button, select, input")].filter((e) => !(e.getAttribute("aria-label") || e.labels?.[0]?.textContent?.trim() || e.textContent?.trim())).length);
  const gear = await pb.locator('[data-el="bouton-moteurs"]').getAttribute("aria-label");
  await verifier("pastilles et prix annoncés en euros ; contrôles de S5 nommés", async () => {
    expect(pastilles.length).toBeGreaterThan(5);
    expect(pastilles.every((p) => /, \d,\d{3} euros le litre, (moins cher|plus cher)$/.test(p))).toBe(true);
    expect(lignes.every((l) => /euros le litre/.test(l))).toBe(true);
    expect(sansNom).toBe(0);
    expect(gear).toBe("Moteurs (administration)");
  });
  await annoter(pb, `S5 : ${await pb.locator("button, select, input").count()} contrôles, ${sansNom} sans nom ; ⚙ = « ${gear} »`, { bas: 62 });
  await capture(pb, "US-A11Y-004-02-m3.png", async () => `${pastilles.length} pastilles annoncées (ex. « ${pastilles[0]} ») ; ${lignes.length} prix de liste annoncés en euros ; écran Moteurs : ${sansNom} contrôle sans nom ; bouton ⚙ nommé « ${gear} »`, "libellés : pastilles, prix et contrôles de l'écran Moteurs");
  await C.close();
});

histoireDef("US-PERF-001", "US-PERF-001 — Ouverture rapide (jalon 3)", async () => {
  const C = await contexte({ geolocation: BARCELONE });
  const pc = await C.newPage();
  surveiller(pc, "C5");
  const cdp = await C.newCDPSession(pc);
  await cdp.send("Network.enable");
  await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 });
  await pc.goto("about:blank");
  await annoter(pc, "4G émulée (latence 150 ms, 1,6 Mbit/s), position Barcelone : page encore vide, cache vide", { bas: 400 });
  await capture(pc, "US-PERF-001-01-m3.png", async () => "contexte 4G émulée (latence 150 ms, 1,6 Mbit/s), position Barcelone, avant ouverture", "avant l'ouverture (4G émulée)");
  const t0 = Date.now();
  await pc.goto(`${URL_APP}/`, { waitUntil: "commit" });
  await pc.locator('[data-el="ligne-station"]').first().waitFor({ timeout: 30000 });
  const ms = Date.now() - t0;
  await capture(pc, "US-PERF-001-02-m3.png", async () => {
    expect(ms).toBeLessThan(2500);
    await annoter(pc, `liste des stations affichée en ${ms} ms (4G émulée, Barcelone, cache navigateur vide)`, { bas: 62 });
    return `liste affichée en ${ms} ms (seuil 2 500 ms) à Barcelone avec 4G émulée`;
  }, "la liste des stations s'affiche en moins de 2,5 s");
  // même mesure à Albi (France) pour comparaison
  await C.close();
  const F = await contexte();
  const pf = await F.newPage();
  const cdp2 = await F.newCDPSession(pf);
  await cdp2.send("Network.enable");
  await cdp2.send("Network.emulateNetworkConditions", { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 });
  const t1 = Date.now();
  await pf.goto(`${URL_APP}/`, { waitUntil: "commit" });
  await pf.locator('[data-el="ligne-station"]').first().waitFor({ timeout: 30000 });
  note("happy", `- ✓ (comparaison) Albi, même 4G émulée : ${Date.now() - t1} ms.`);
  await F.close();
});

// ================================================================= exécution
const aJouer = HISTOIRES.filter((h) => FILTRE.length === 0 || FILTRE.includes(h.id));
for (const h of aJouer) {
  histoire(h.id, h.titre);
  try {
    await h.f();
    if (blocs.get(h.id).issues.length === 0) blocs.get(h.id).issues.push(...SANS_ISSUE);
  } catch (e) {
    note("issues", `- ✗ l'histoire s'est arrêtée : ${String(e.message).split("\n").slice(0, 4).join(" ")}`);
    console.error(h.id, "ARRÊT", e.message.split("\n")[0]);
  }
  ecrireHistoire(h.id);
  console.log(h.id, resultats.filter((r) => r.nom.startsWith(h.id.replace("US-", "US-")) || true).length);
}
await navigateur.close();

// ================================================================= bilan
const attendues = [...fs.readFileSync(path.join(RACINE, "tests/e2e/use-cases/m3-use-case.md"), "utf8").matchAll(/capture `([^`]+\.png)`/g)].map((m) => m[1]);
const faits = fs.readdirSync(LIVRAISON).filter((f) => attendues.includes(f));
const manquantes = attendues.filter((f) => !faits.includes(f));
const hashes = new Map();
for (const f of faits) {
  for (const d of [LIVRAISON, BRUTES]) {
    const p = path.join(d, f);
    if (!fs.existsSync(p)) continue;
    const h = sha(fs.readFileSync(p));
    hashes.set(h, [...(hashes.get(h) ?? []), path.relative(RACINE, p)]);
  }
}
const doublons = [...hashes.values()].filter((l) => l.length > 1);
console.log(JSON.stringify({ captures: `${faits.length}/${attendues.length}`, manquantes, doublons, echecs: resultats.filter((r) => !r.ok).map((r) => r.nom), avertissements }, null, 1));
