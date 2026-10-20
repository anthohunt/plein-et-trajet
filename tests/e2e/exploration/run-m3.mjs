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
  S4, carburantAffiche, empreinteCles, env, etatCarte, etatFocus, injecterCle, lireEtatReel, restaurerEtatReel, supprimerClesFausses, totalPeagesPtvDirect, verifierFournisseurs, lignesListe, lireResultat, moyenneDuJour, nombre, ouvrirMoteurs, ouvrirTrajets, propositions, reinitialiserMoteurs, rest, restService,
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

// Étiquettes de test (réponse réseau, mesure, ordre de tabulation) : posées APRÈS la prise brute, en haut de l'écran, retirées juste après.
let enAttente = [];
async function poserEtiquette(page, texte) {
  await page.evaluate((t) => {
    const d = document.createElement("div");
    d.setAttribute("data-annotation-test", "");
    d.textContent = "Annotation de test — " + t;
    Object.assign(d.style, { position: "fixed", left: "4px", right: "4px", top: "4px", zIndex: 9999, background: "#ffb000", color: "#15181a", font: "600 10px/1.25 sans-serif", padding: "4px 6px", borderRadius: "6px", boxShadow: "0 2px 8px rgba(0,0,0,.3)" });
    document.body.appendChild(d);
  }, texte);
}
const annoter = async (_page, texte) => { enAttente.push({ genre: "texte", texte }); };
const pastillesOrdre = async () => { enAttente.push({ genre: "ordre" }); };
async function poserOrdre(page) {
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
 * Deux vraies prises de vue de la même page, sans retouche : la BRUTE (dans m3-captures-brutes/, propre : ni étiquette ni décalage)
 * puis la capture de LIVRAISON (dans delivery/, nom exact du plan) ; seule la livraison peut recevoir une étiquette de test en haut
 * de l'écran (quand la preuve ne peut pas se voir dans l'interface : réponse réseau, mesure, ordre de tabulation).
 * Si deux étapes montrent légitimement le même écran, les octets peuvent coïncider : on ne fabrique aucune différence, on le note.
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
  const brute = await page.screenshot();
  const etiquettes = enAttente;
  enAttente = [];
  for (const e of etiquettes) {
    if (e.genre === "texte") await poserEtiquette(page, e.texte);
    else await poserOrdre(page);
  }
  const liv = await page.screenshot();
  await page.evaluate(() => document.querySelectorAll("[data-annotation-test]").forEach((e) => e.remove()));
  fs.writeFileSync(path.join(BRUTES, nom), brute);
  fs.writeFileSync(path.join(LIVRAISON, nom), liv);
  const autres = empreintes(nom);
  const memes = [...autres.entries()].filter(([h]) => h === sha(liv) || h === sha(brute)).map(([, n]) => n);
  const rappel = memes.length ? ` — même écran que ${[...new Set(memes)].join(", ")} : deux étapes du plan montrent légitimement le même état, aucune différence fabriquée` : "";
  resultats.push({ nom, ok });
  note(section, `- ${ok ? "✓" : "✗"} \`${nom}\` — ${description}${detail ? ` — ${detail}` : ""}${rappel}`);
  return ok;
}
/** Empreintes de toutes les captures déjà écrites (livraison et brutes), sauf celles du même nom (réécrites). */
function empreintes(sauf) {
  const m = new Map();
  for (const d of [LIVRAISON, BRUTES]) for (const f of fs.readdirSync(d)) if (f !== sauf && f.startsWith("US-") && f.endsWith(".png") && /US-(3\.8|4\.[45]|4\.E[456]|1\.8|5\.|A11Y.*-m3|PERF.*-m3)/.test(f)) m.set(sha(fs.readFileSync(path.join(d, f))), f);
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
// ÉTAT RÉEL : les vraies clés (PTV, Stadia) sont lues en mémoire, jamais écrites ; restaurées en fin de run (try/finally)
const ETAT_REEL = await lireEtatReel();
const MANQUANTES = ['ptv', 'stadia'].filter((f) => !ETAT_REEL.cles[f]);
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
    const lignes = l.filter((x) => /^[A-Z]{2} /.test(x.texte) && x.montant && !/Total péages/.test(x.texte));
    const totalLigne = l.find((x) => /Total péages/.test(x.texte));
    expect(lignes.length).toBeGreaterThan(0);
    for (const x of lignes) expect(x.montant).toMatch(/^(\d+,\d{2} €|gratuit)$/);
    const somme = lignes.reduce((s, x) => s + (x.montant === "gratuit" ? 0 : nombre(x.montant)), 0);
    expect(nombre(totalLigne.montant)).toBeCloseTo(somme, 2);
    const split = await pa.locator('[data-el="repartition-cout"]').innerText();
    expect(nombre(split.match(/Péages ([\d,]+) €/)[1])).toBeCloseTo(nombre(totalLigne.montant), 2);
    expect(nombre(split.match(/Carburant ([\d,]+) €/)[1]) + nombre(split.match(/Péages ([\d,]+) €/)[1])).toBeCloseTo(await cout(pa), 2);
    let verif = "";
    if (ETAT_REEL.cles.ptv) {
      const d = await totalPeagesPtvDirect(ETAT_REEL.cles.ptv, { lat: 43.9289, lon: 2.1464 }, { lat: 41.3874, lon: 2.1686 });
      expect(nombre(totalLigne.montant)).toBeCloseTo(d.total, 2);
      verif = ` ; recalcul indépendant par appel direct à PTV + TVA du pays : ${virgule(d.total)} € sur ${d.sections} sections = total affiché`;
    }
    return `${lignes.length} sections : ${lignes.map((x) => `${x.pays} ${x.montant}`).join(", ")} ; total ${totalLigne.montant} ; ${split}${verif}`;
  }, "détail des péages : chaque section en euros TTC (« gratuit » si 0), total ajouté au coût");
  note("happy", "- ✓ montants réels PTV Developer (clé réelle d'Anthony dans Vault, prix HT + TVA du pays) — US-4.4 n'est plus BLOQUÉ-CLÉ.");

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
    expect(r.km).toBeGreaterThan(800);
    return `résultat Albi → Milan ${r.km} km`;
  }, "trajet Albi → Milan calculé (écran Résultat)");
  await versPays(pa);
  await capture(pa, "US-4.5-02-voir-les-pays-traverss-apres.png", async () => {
    const l = await lignesListe(pa, "pays-traverses");
    expect(l.map((x) => x.pays)).toEqual(["FR", "IT"]);
    for (const x of l) expect(x.texte).toMatch(/\d+ km · \d+,\d L × \d,\d{3}.*\d+,\d{2} €$/);
    const somme = l.reduce((s, x) => s + nombre(x.montant), 0);
    const total = await carburantAffiche(pa); // coût total moins péages établis
    expect(somme).toBeCloseTo(total, 2);
    // prix du jour : France = flux officiel du jour, Italie = Bulletin pétrolier UE
    const fr = Number((await rest("moyennes_nationales?select=prix_moyen&pays=eq.FR&carburant=eq.SP95-E10&order=jour.desc&limit=1"))[0].prix_moyen);
    const it = Number((await rest("moyennes_nationales?select=prix_moyen,source&pays=eq.IT&carburant=eq.SP95-E10&order=jour.desc&limit=1"))[0].prix_moyen);
    expect(l[0].texte).toContain(virgule(fr, 3));
    expect(l[1].texte).toContain(virgule(it, 3));
    return `FR ${virgule(fr, 3)} €/L (flux du jour), IT ${virgule(it, 3)} €/L (Bulletin UE) ; Σ coûts pays = ${virgule(somme)} € = coût carburant affiché ${virgule(total)} € (le coût total y ajoute les péages)`;
  }, "pays traversés : km, litres, prix moyen du jour, coût ; somme = coût carburant");
});

// ================================================================= US-4.E4
histoireDef("US-4.E4", "US-4.E4 — Péages indisponibles", async () => {
  // mise en place RÉELLE sans toucher aux vraies clés : le moteur des péages est basculé sur HERE, qui n'a aucune clé (donc réellement hors service)
  await restService("moteurs?service=eq.peages", { method: "PATCH", body: JSON.stringify({ actif: "here", secours: null }) });
  await formulaireEurope(pa, { saisie: "Albi", label: "Albi" }, { saisie: "Bord", label: "Bordeaux", contexte: "Gironde" });
  await calculer(pa);
  await versPeages(pa);
  await capture(pa, "US-4.E4-E1-01-declencheur.png", async () => {
    await expect(pa.locator('[data-el="peages-indisponibles"]')).toContainText("Péages non disponibles pour l'instant");
    await expect(pa.locator('[data-el="total-peages"]')).toHaveCount(0);
    return "écran Résultat Albi → Bordeaux (autoroute A62) : péages confiés à HERE, qui n'a aucune clé = service réellement en erreur ; le détail dit « Péages non disponibles pour l'instant », aucun total de péages (PTV et sa vraie clé ne sont pas touchés)";
  }, "le service de péages est en erreur : écran Résultat, bloc Péages", "edge");
  await enHaut(pa);
  await capture(pa, "US-4.E4-E1-02-resultat.png", async () => {
    const r = await lireResultat(pa);
    const moyFr = await moyenneDuJour("SP95-E10");
    expect(r.cout).toBeCloseTo(Math.round(r.litres * moyFr * 100) / 100, 1); // coût carburant seul
    await expect(pa.locator('[data-el="repartition-cout"]')).toHaveCount(0);
    return `coût affiché ${virgule(r.cout)} € = carburant seul (${virgule(r.litres, 1)} L × ${virgule(moyFr, 3)} €/L) ; rien n'est ajouté au total pour les péages`;
  }, "le coût carburant s'affiche et rien n'est ajouté au total", "edge");
  // retour à l'état normal : le moteur des péages revient sur PTV, le MÊME trajet est recalculé (clic sur sa ligne d'historique) avec ses péages
  await restService("moteurs?service=eq.peages", { method: "PATCH", body: JSON.stringify({ actif: "ptv", secours: null }) });
  await retourFormulaire(pa);
  await pa.locator('[data-el="liste-historique"] li', { hasText: "Bordeaux" }).first().locator("button.go").click();
  await expect(S4(pa, "ok")).toBeVisible({ timeout: 60000 });
  await versPeages(pa);
  await capture(pa, "US-4.E4-E1-03-retour.png", async () => {
    await expect(pa.locator('[data-el="peages-indisponibles"]')).toHaveCount(0);
    await expect(pa.locator('[data-el="total-peages"]')).toBeVisible();
    return `retour à l'état normal sur LE MÊME trajet (Albi → Bordeaux rejoué depuis l'historique) : péages PTV à nouveau calculés, total ${await pa.locator('[data-el="total-peages"] .lit').innerText()}`;
  }, "retour à l'état normal : le même trajet rejoué, péages rétablis", "edge");
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
  await saisirLieu(pa, "depart", "Albi", "Albi");
  await choisirLieu(pa, "arrivee", "Belgr", "Belgrade", "Serbie");
  await choisirVoiture(pa);
  await capture(pa, "US-4.E6-E1-01-declencheur.png", async () => {
    await expect(champ(pa, "arrivee")).toHaveValue("Belgrade");
    return "Albi → Belgrade (Serbie, absente du Bulletin pétrolier UE) : trajet de 1 960 km, tracé découpé en morceaux de ≤ 800 km pour Valhalla";
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
    expect(l.map((x) => x.pays)).toEqual(["FR", "IT", "SI", "HR", "RS"]);
    const somme = l.reduce((s, x) => s + nombre(x.montant), 0);
    expect(somme).toBeCloseTo(await carburantAffiche(pa), 2);
    const r = await lireResultat(pa);
    expect(r.km).toBeGreaterThan(1800);
    return `RS : « prix non publié — moyenne européenne appliquée » à ${virgule(eu, 3)} €/L (moyenne UE du bulletin) ; ${r.km} km ; pays ${l.map((x) => x.pays).join(", ")} ; Σ coûts = coût`;
  }, "la ligne Serbie porte « prix non publié — moyenne européenne appliquée » et le prix utilisé", "edge");
  await retourFormulaire(pa);
  await capture(pa, "US-4.E6-E1-03-retour.png", async () => {
    await expect(pa.locator('[data-el="liste-historique"] li').first()).toContainText("Belgrade");
    return "retour au formulaire ; le trajet Albi → Belgrade est en tête de l'historique";
  }, "retour à l'état normal", "edge");
  // autres longs trajets du plan : Rome et Lisbonne (tracé au-delà de 1 000 km : découpé), vérifiés sans capture
  for (const [nom, saisie, label, ctx, pays] of [["Rome", "Rome", "Rome", "Italie", ["FR", "IT"]], ["Lisbonne", "Lisb", "Lisbonne", "Portugal", ["FR", "ES", "PT"]]]) {
    await verifier(`Albi → ${nom} (tracé > 1 000 km)`, async () => {
      await retourFormulaire(pa).catch(() => {});
      await ouvrirTrajets(pa);
      await saisirLieu(pa, "depart", "Albi", "Albi");
      await choisirLieu(pa, "arrivee", saisie, label, ctx);
      await choisirVoiture(pa).catch(() => {});
      await calculer(pa);
      const l = (await lignesListe(pa, "pays-traverses")).map((x) => x.pays);
      expect(l).toEqual(pays);
      note("edge", `- ✓ (hors capture) Albi → ${nom} : ${(await lireResultat(pa)).km} km, pays ${l.join(", ")} — avant le correctif, « Trajet trop long » à tort.`);
    });
  }
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
  // round 2 : les autres pays branchés (Rome, Lisbonne, Vienne, Ljubljana, Zagreb) et un pays non branché (Berlin), vérifiés en vrai ; vues complémentaires dans m3-captures-pays/
  const VILLES = [
    ["rome", "Rome", 41.9028, 12.4964, "IT-", "Gazole"], ["lisbonne", "Lisbonne", 38.7223, -9.1393, "PT-", "Gazole"], ["vienne", "Vienne", 48.2082, 16.3738, "AT-", "Gazole"],
    ["ljubljana", "Ljubljana", 46.0569, 14.5058, "SI-", "Gazole"], ["zagreb", "Zagreb", 45.815, 15.9819, "HR-", "Gazole"],
  ];
  for (const [cle, nom, latitude, longitude, prefixe, carburant] of VILLES) {
    await verifier(`stations à ${nom}`, async () => {
      const V = await contexte({ geolocation: { latitude, longitude } });
      const pv = await V.newPage();
      await pv.goto(`${URL_APP}/`);
      await pv.locator('[data-el="selecteur-carburant"] button', { hasText: carburant }).click();
      await expect(pv.locator('[data-el="liste-stations"]')).toHaveAttribute("data-carburant", carburant, { timeout: 30000 });
      const l = pv.locator('[data-el="ligne-station"]');
      await expect(l.first()).toBeVisible({ timeout: 30000 });
      const n = await l.count();
      const ids = await l.evaluateAll((els) => els.map((e) => e.getAttribute("data-station")));
      expect(ids.every((i) => i.startsWith(prefixe))).toBe(true);
      await expect(pv.locator('[data-el="pays-sans-flux"]')).toHaveCount(0);
      await pv.screenshot({ path: path.join(ICI, "m3-captures-pays", `US-1.8-${cle}.png`) });
      note("happy", `- ✓ (vue complémentaire m3-captures-pays/US-1.8-${cle}.png) à ${nom} : ${n} stations « ${prefixe}… » en liste (${carburant}), premier prix ${await l.first().locator(".totem").getAttribute("aria-label")}, aucun message « pays sans flux ».`);
      await V.close();
    });
  }
  await verifier("Berlin : pays non branché, libellé vrai", async () => {
    const V = await contexte({ geolocation: { latitude: 52.52, longitude: 13.405 } });
    const pv = await V.newPage();
    await pv.goto(`${URL_APP}/`);
    await expect(pv.locator('[data-el="pays-sans-flux"]')).toContainText("Prix station par station pas encore disponibles pour ce pays", { timeout: 30000 });
    await expect(pv.locator('[data-el="pays-sans-flux"]')).not.toContainText("ne publie pas");
    await pv.screenshot({ path: path.join(ICI, "m3-captures-pays", "US-1.8-berlin-non-branche.png") });
    note("edge", `- ✓ (vue complémentaire m3-captures-pays/US-1.8-berlin-non-branche.png) Berlin (Allemagne : flux Tankerkönig à clé, pas encore branché) : « Prix station par station pas encore disponibles pour ce pays » + prix moyen national ; la phrase de la spec est réservée aux pays qui ne publient pas (Bruxelles).`);
    await V.close();
  });
  note("issues", "- Dépendance : stations synchronisées par pg_cron — ES (flux MITECO via le relais Vercel `api/relais-es` : TLS 1.2 à échange RSA statique refusé par Deno), IT (Osservaprezzi, ~50 villes × 30 km), PT (DGEG), SI (goriva.si), HR (mzoe-gor.hr, lat/long inversés remis à l'endroit), AT (E-Control : les 10 moins chères par requête, 20 points × 2 carburants), DK (API OK, une seule enseigne), IS (gasvaktin, cours ISK du jour). Non branchés : DE (clé Tankerkönig), RO (certificat TLS invalide), GB (CSV à URL signée).");
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
  await pb.setViewportSize({ width: 390, height: 2300 }); // fenêtre haute : les 6 services sur une seule capture
  await capture(pb, "US-5.1-02-ouvrir-les-moteurs-apres.png", async () => {
    const noms = (await pb.locator('[data-el="moteur"] h3').allInnerTexts()).map((t) => t.split("\n")[0].trim());
    expect(noms).toEqual(["PRIX DES STATIONS", "PRIX MOYENS PAR PAYS", "ITINÉRAIRE", "PÉAGES", "VOITURES", "RECHERCHE DE LIEUX"]);
    const etats = await pb.locator('[data-el="etat-moteur"]').allInnerTexts();
    return `6 services : ${noms.map((n, i) => `${n} (${etats[i]})`).join(" ; ")}`;
  }, "l'écran Moteurs liste les 6 services avec leur fournisseur et leur état (fenêtre haute 390×2300)");
  await pb.setViewportSize({ width: 390, height: 844 });
});

// ================================================================= US-5.2
histoireDef("US-5.2", "US-5.2 — Choisir le fournisseur", async () => {
  await carte(pb, "peages").scrollIntoViewIfNeeded();
  await capture(pb, "US-5.2-01-choisir-le-fournisseur-avant.png", async () => {
    await expect(carte(pb, "peages").locator("select").first()).toHaveValue("ptv");
    await expect(etatCarte(pb, "peages")).toHaveAttribute("data-etat", "ok");
    return "péages : fournisseur PTV Developer, clé enregistrée, état « ok »";
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
const FAUSSE = "FAUX-CLE-ESSAI-7d3f";
histoireDef("US-5.3", "US-5.3 — Coller la clé", async () => {
  const reponses = [];
  pb.on("response", async (r) => {
    if (/supabase\.co/.test(r.url())) reponses.push({ url: r.url().replace(/https:\/\/[^/]+/, ""), corps: await r.text().catch(() => "") });
  });
  await reinitialiserMoteurs();
  const avant = await empreinteCles();
  await pb.reload();
  await expect(pb.locator('[data-el="moteur"]')).toHaveCount(6, { timeout: 20000 });
  await carte(pb, "peages").scrollIntoViewIfNeeded();
  await capture(pb, "US-5.3-01-coller-la-cl-avant.png", async () => {
    const champCle = carte(pb, "peages").locator('[data-el="champ-cle"]');
    await expect(champCle).toHaveAttribute("type", "password");
    const ph = await champCle.getAttribute("placeholder");
    expect(ph).toMatch(/^Clé enregistrée ••••.{4} — coller pour remplacer$/);
    return `champ clé des péages (type password) : « ${ph} » — la vraie clé PTV d'Anthony est déjà rangée, seule sa fin s'affiche`;
  }, "le champ clé des péages (clé réelle déjà enregistrée)");
  // une clé collée est TESTÉE avant d'être écrite : une clé factice est refusée par le vrai PTV, la vraie clé reste en place
  await carte(pb, "peages").locator('[data-el="champ-cle"]').fill(FAUSSE);
  await carte(pb, "peages").locator('[data-el="enregistrer-moteur"]').click();
  await attendreEnregistrement(pb, "peages");
  await capture(pb, "US-5.3-02-coller-la-cl-apres.png", async () => {
    const msg = (await etatCarte(pb, "peages").innerText()).toLowerCase();
    expect(msg).toContain("clé refusée par ptv (401)");
    expect(msg).toContain("clé non enregistrée");
    expect(msg).toContain("ancienne clé conservée");
    expect(await empreinteCles()).toBe(avant); // mêmes clés, mêmes fins : la vraie clé n'a pas bougé
    return `une clé collée est testée avant Vault : la clé factice est refusée par le vrai PTV (401), « clé non enregistrée, ancienne clé conservée » ; clés rangées inchangées (${avant.replace(/"/g, "")})`;
  }, "une clé collée est testée avant d'être écrite : refusée, la vraie clé est conservée");
  await pb.reload();
  await expect(pb.locator('[data-el="moteur"]')).toHaveCount(6, { timeout: 20000 });
  await carte(pb, "peages").scrollIntoViewIfNeeded();
  await capture(pb, "US-5.3-03-coller-la-cl-avant.png", async () => {
    const ph = await carte(pb, "peages").locator('[data-el="champ-cle"]').getAttribute("placeholder");
    expect(ph).toMatch(/^Clé enregistrée ••••.{4} — coller pour remplacer$/);
    const [{ fin }] = await sqlGestion("select fin from public.cles_fournisseurs where fournisseur = 'ptv'");
    const [v] = await sqlGestion("select secret is distinct from decrypted_secret as chiffre, length(secret) as n from vault.decrypted_secrets where name = 'cle_ptv'");
    expect(v.chiffre).toBe(true);
    return `clé PTV rangée dans Supabase Vault (secret chiffré en base, ${v.n} car.), fin « ${fin} » ; champ : « ${ph} »`;
  }, "une clé enregistrée : le champ n'affiche que ses 4 derniers caractères");
  await verifier("la clé complète n'apparaît nulle part (page, champs, stockage, réponses réseau)", async () => {
    reponses.length = 0;
    await pb.reload();
    await expect(pb.locator('[data-el="moteur"]')).toHaveCount(6, { timeout: 20000 });
    const html = await pb.content();
    const champs = (await pb.locator("input").evaluateAll((els) => els.map((e) => e.value + "|" + (e.getAttribute("placeholder") ?? "")))).join("\n");
    const stockage = await pb.evaluate(() => JSON.stringify({ ...localStorage }) + JSON.stringify({ ...sessionStorage }));
    for (const cle of [FAUSSE, ...Object.values(ETAT_REEL.cles)]) {
      expect(html.includes(cle)).toBe(false);
      expect(champs.includes(cle)).toBe(false);
      expect(stockage.includes(cle)).toBe(false);
      expect(reponses.some((r) => r.corps.includes(cle))).toBe(false);
    }
  });
  await carte(pb, "peages").scrollIntoViewIfNeeded();
  await capture(pb, "US-5.3-04-coller-la-cl-apres.png", async () => {
    const lister = reponses.filter((r) => r.url.includes("/functions/v1/moteurs"));
    expect(lister.length).toBeGreaterThan(0);
    for (const cle of [FAUSSE, ...Object.values(ETAT_REEL.cles)]) expect(reponses.some((r) => r.corps.includes(cle))).toBe(false);
    expect(lister.some((r) => /"cle_fin":"[^"]{4}"/.test(r.corps))).toBe(true);
    await annoter(pb, `clés réelles et clé factice absentes de la page, des champs, du stockage local et de ${reponses.length} réponses réseau lues depuis le rechargement ; seule la fin (4 caractères) circule`);
    return `${reponses.length} réponses réseau (dont ${lister.length} de la fonction moteurs) lues : aucune clé complète (réelle ou factice), seule la fin de 4 caractères ; page, champs et stockage du navigateur : absentes`;
  }, "après rechargement, la clé complète n'apparaît nulle part (page, réseau)");
});

// ================================================================= US-5.4
histoireDef("US-5.4", "US-5.4 — Tester la connexion", async () => {
  await reinitialiserMoteurs();
  await pb.reload();
  await expect(pb.locator('[data-el="moteur"]')).toHaveCount(6, { timeout: 20000 });
  await carte(pb, "peages").scrollIntoViewIfNeeded();
  await capture(pb, "US-5.4-01-tester-la-connexion-avant.png", async () => {
    await expect(carte(pb, "peages").locator('[data-el="champ-cle"]')).toHaveAttribute("placeholder", /Clé enregistrée ••••/);
    return "clé PTV valide enregistrée (celle d'Anthony), avant le test";
  }, "une clé PTV valide est enregistrée");
  await carte(pb, "peages").locator('[data-el="tester-connexion"]').click();
  await expect(etatCarte(pb, "peages")).toContainText("Connecté", { timeout: 60000 });
  await capture(pb, "US-5.4-02-tester-la-connexion-apres.png", async () => {
    const msg = await etatCarte(pb, "peages").innerText();
    expect(msg.toLowerCase()).toMatch(/connecté · test albi → barcelone ok \(\d+ sections\)/);
    return `vrai calcul de test Albi → Barcelone envoyé à PTV avec la vraie clé : « ${msg} »`;
  }, "Tester la connexion : un vrai calcul part vers PTV et l'état affiche « Connecté »");
  await carte(pb, "itineraire").locator('[data-el="tester-connexion-itineraire"]').click();
  await verifier("test réel de l'itinéraire (Stadia, clé réelle) → Connecté", async () => {
    await expect(etatCarte(pb, "itineraire")).toContainText("Connecté · test Albi → Toulouse OK", { timeout: 40000 });
    note("happy", `- ✓ (hors plan) itinéraire : « ${await etatCarte(pb, "itineraire").innerText()} » (Stadia Maps, clé réelle d'Anthony).`);
  });
  note("happy", "- ✓ US-5.4 n'est plus BLOQUÉ-CLÉ : la clé PTV réelle est dans Vault, « Connecté » est obtenu en vrai.");
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
    await expect(pa.locator('[data-el="total-peages"]')).toBeVisible();
    return "BLOQUÉ-CLÉ (HERE) : aucune clé HERE → impossible d'enregistrer HERE puis de voir des péages HERE ; état réel : HERE refusé sans clé, le moteur actif reste PTV et ses péages (clé réelle) s'affichent";
  }, "Albi → Barcelone après la tentative (HERE refusé, PTV reste actif)");
  BLOQUE("US-5.5 (péages venant de HERE sans redéploiement) : il manque une clé HERE (plan Base, carte bancaire) collée dans l'écran Moteurs. La lecture du moteur actif à chaque appel est démontrée en vrai sur un autre moteur (itinéraire IGN ↔ Valhalla dans les extraits) ; la bascule vers HERE n'a pas pu être vue avec de vrais montants HERE.");
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
  const avant = await empreinteCles();
  await pb.reload();
  await expect(pb.locator('[data-el="moteur"]')).toHaveCount(6, { timeout: 20000 });
  await carte(pb, "peages").scrollIntoViewIfNeeded();
  await carte(pb, "peages").locator('[data-el="champ-cle"]').fill("cle-invalide-0000-zz91");
  await capture(pb, "US-5.E2-E1-01-declencheur.png", async () => {
    expect(await carte(pb, "peages").locator('[data-el="champ-cle"]').inputValue()).toBe("cle-invalide-0000-zz91");
    return "clé volontairement invalide collée dans le champ des péages (PTV, masquée) ; la vraie clé enregistrée n'est pas touchée par un test";
  }, "une clé invalide collée", "edge");
  await carte(pb, "peages").locator('[data-el="tester-connexion"]').click();
  await expect(etatCarte(pb, "peages")).not.toHaveText("Test en cours…", { timeout: 30000 });
  await capture(pb, "US-5.E2-E1-02-resultat.png", async () => {
    await expect(etatCarte(pb, "peages")).toHaveText("Clé refusée par PTV (401)");
    await expect(etatCarte(pb, "peages")).toHaveAttribute("data-etat", "ko");
    expect(await empreinteCles()).toBe(avant);
    return "vrai appel à api.myptv.com avec la clé candidate → HTTP 401 → « Clé refusée par PTV (401) » (état ko) ; la clé réelle rangée est intacte";
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
    expect(await empreinteCles()).toBe(avant); // rien n'a été écrit dans Vault
    return "HERE + clé invalide + Enregistrer : refusé par le vrai HERE (401), « clé non enregistrée », le fournisseur actif reste PTV après rechargement (base : actif = ptv ; clés rangées inchangées)";
  }, "Enregistrer garde l'ancien fournisseur actif (PTV)", "edge");
});

// ================================================================= US-5.E3
histoireDef("US-5.E3", "US-5.E3 — Bascule de secours", async () => {
  // RÉEL : le moteur principal est HERE (clé factice « FAUX- » → vrai refus 401 de HERE) et PTV, avec sa vraie clé, est le secours.
  // Réglage par le rôle service (une clé factice collée à l'écran serait refusée) ; les vraies clés ne sont pas touchées.
  await reinitialiserMoteurs();
  await injecterCle("here", "FAUX-HERE-CLE-0002");
  await restService("moteurs?service=eq.peages", { method: "PATCH", body: JSON.stringify({ actif: "here", secours: "ptv", bascule_le: null, bascule_de: null, bascule_vers: null }) });
  await pb.reload();
  await expect(pb.locator('[data-el="moteur"]')).toHaveCount(6, { timeout: 20000 });
  await carte(pb, "peages").scrollIntoViewIfNeeded();
  await capture(pb, "US-5.E3-E1-01-declencheur.png", async () => {
    await expect(carte(pb, "peages").locator('[data-el="choix-fournisseur"]')).toHaveValue("here");
    await expect(carte(pb, "peages").locator('[data-el="choix-secours-peages"]')).toHaveValue("ptv");
    return "péages : HERE principal (clé factice : le vrai HERE répond 401 = principal en panne), PTV (clé réelle) en secours — la panne du principal est réelle, pas simulée ; le plan suppose l'inverse (PTV → HERE), impossible sans clé HERE valide";
  }, "le moteur principal est en panne (HERE refuse sa clé) et PTV est enregistré en secours", "edge");
  await retourFormulaire(pa).catch(() => {});
  await formulaireEurope(pa, { saisie: "Albi", label: "Albi" }, { saisie: "Bord", label: "Bordeaux", contexte: "Gironde" });
  await calculer(pa);
  await versPeages(pa);
  await capture(pa, "US-5.E3-E1-02-resultat.png", async () => {
    await expect(pa.locator('[data-el="peages-indisponibles"]')).toHaveCount(0);
    await expect(pa.locator('[data-el="total-peages"]')).toBeVisible();
    return `calcul réel : HERE répond 401, la fonction bascule sur PTV : les péages s'affichent (total ${await pa.locator('[data-el="total-peages"] .lit').innerText()}) sans « Péages non disponibles »`;
  }, "je calcule un trajet : le principal refuse, le secours fournit les péages", "edge");
  await pb.reload();
  await expect(pb.locator('[data-el="moteur"]')).toHaveCount(6, { timeout: 20000 });
  await carte(pb, "peages").scrollIntoViewIfNeeded();
  await capture(pb, "US-5.E3-E1-03-retour.png", async () => {
    const note_ = await carte(pb, "peages").locator('[data-el="bascule"]').innerText();
    expect(note_).toMatch(/^Bascule HERE → PTV Developer le \d{2}\/\d{2} \d{2}:\d{2}$/);
    const inc = await carte(pb, "peages").locator('[data-el="incident"]').innerText();
    expect(inc).toMatch(/Dernier incident · HERE : clé refusée \(401\)/);
    return `l'écran Moteurs note la bascule avec l'heure : « ${note_} » et l'incident : « ${inc} »`;
  }, "l'écran Moteurs note la bascule avec l'heure", "edge");
  BLOQUE("US-5.E3 sous sa forme du plan (péages venant de HERE quand PTV tombe) : il manque une clé HERE valide. La bascule d'un principal en panne vers un secours qui répond est vue en vrai (HERE refusé → PTV), avec la note horodatée.");
  await reinitialiserMoteurs();
});

// ================================================================= US-5.6
histoireDef("US-5.6", "US-5.6 — Où trouver ma clé", async () => {
  await reinitialiserMoteurs();
  await pb.reload();
  await expect(pb.locator('[data-el="moteur"]')).toHaveCount(6, { timeout: 20000 });
  await pb.evaluate(() => window.scrollTo(0, 0));
  await pb.locator(".scroll").first().evaluate((e) => e.scrollTo(0, 0));
  await capture(pb, "US-5.6-01-ou-trouver-ma-cle-avant.png", async () => {
    await expect(pb.locator('[data-screen="S5"]')).toBeVisible();
    return "écran Moteurs, connecté administrateur";
  }, "l'écran Moteurs avant de regarder la fiche Péages");
  await carte(pb, "peages").scrollIntoViewIfNeeded();
  await verifier("lien PTV : href, target, rel, consigne ; le lien charge dans un nouvel onglet", async () => {
    const lien = carte(pb, "peages").locator('[data-el="lien-cle"] a');
    await expect(lien).toHaveText("Où trouver ma clé");
    await expect(lien).toHaveAttribute("href", "https://developer.myptv.com/en");
    await expect(lien).toHaveAttribute("target", "_blank");
    await expect(lien).toHaveAttribute("rel", "noopener noreferrer");
    const [onglet] = await Promise.all([pb.context().waitForEvent("page"), lien.click()]);
    await onglet.waitForLoadState("domcontentloaded");
    const titre = await onglet.title();
    const url = onglet.url();
    await onglet.close();
    expect(url).toContain("developer.myptv.com");
    note("happy", `- ✓ (hors capture) le lien PTV s'ouvre dans un nouvel onglet : ${url} (titre « ${titre} »).`);
  });
  await capture(pb, "US-5.6-02-ou-trouver-ma-cle-apres.png", async () => {
    const lien = carte(pb, "peages").locator('[data-el="lien-cle"] a');
    const href = await lien.getAttribute("href");
    const cible = await lien.getAttribute("target");
    const rel = await lien.getAttribute("rel");
    expect([href, cible, rel]).toEqual(["https://developer.myptv.com/en", "_blank", "noopener noreferrer"]);
    const consigne = await carte(pb, "peages").locator('[data-el="consigne-cle"]').innerText();
    expect(consigne).toContain("API Keys");
    return `fiche Péages (PTV) : « Où trouver ma clé » href=${href} target=${cible} rel=${rel} ; consigne « ${consigne.replace(/^ · /, "")} » (lues en table fournisseurs)`;
  }, "le lien « Où trouver ma clé » sous le champ clé de PTV, avec la consigne « API Keys »");
  await carte(pb, "itineraire").locator("select").first().selectOption("stadia");
  await carte(pb, "itineraire").scrollIntoViewIfNeeded();
  await capture(pb, "US-5.6-03-lien-stadia.png", async () => {
    const lien = carte(pb, "itineraire").locator('[data-el="lien-cle"] a');
    const href = await lien.getAttribute("href");
    expect(href).toBe("https://client.stadiamaps.com/dashboard/");
    expect(await lien.getAttribute("target")).toBe("_blank");
    expect(await lien.getAttribute("rel")).toBe("noopener noreferrer");
    return `Itinéraire basculé sur Stadia (non enregistré) : href=${href} target=_blank rel=noopener noreferrer`;
  }, "l'itinéraire basculé sur Stadia : le lien pointe vers le tableau de bord Stadia");
  await verifier("HERE et Tankerkönig ont leur lien", async () => {
    await carte(pb, "peages").locator('[data-el="choix-fournisseur"]').selectOption("here");
    await expect(carte(pb, "peages").locator('[data-el="lien-cle"] a')).toHaveAttribute("href", "https://platform.here.com/access/apps");
    await carte(pb, "prix").locator("select").first().selectOption("tankerkoenig");
    await expect(carte(pb, "prix").locator('[data-el="lien-cle"] a')).toHaveAttribute("href", "https://creativecommons.tankerkoenig.de/");
    note("happy", "- ✓ (hors capture) HERE → https://platform.here.com/access/apps ; Tankerkönig (stations, Allemagne) → https://creativecommons.tankerkoenig.de/.");
  });
  await carte(pb, "voitures").scrollIntoViewIfNeeded();
  await capture(pb, "US-5.6-04-sans-cle.png", async () => {
    await expect(carte(pb, "voitures").locator('[data-el="lien-cle"]')).toHaveCount(0);
    await expect(carte(pb, "voitures")).toContainText("Aucune clé nécessaire.");
    return "fiche Voitures (ADEME, sans clé) : « Aucune clé nécessaire. », aucun lien de clé (Prix moyens et Recherche de lieux : idem)";
  }, "une fiche sans clé : aucun lien");
  await pb.reload();
});

// ================================================================= Transverses
/** Parcours Tab depuis le haut de la page jusqu'aux onglets : relève chaque contrôle focalisé et le numérote (pastilles posées à la capture). */
async function tabulation(page, max = 60) {
  await page.evaluate(() => document.querySelectorAll("[data-ordre-test]").forEach((e) => e.removeAttribute("data-ordre-test")));
  await page.evaluate(() => document.activeElement?.blur?.());
  await page.locator("body").click({ position: { x: 5, y: 5 } });
  const ordre = [];
  for (let i = 0; i < max; i++) {
    await page.keyboard.press("Tab");
    const e = await etatFocus(page);
    await page.evaluate((k) => document.activeElement.setAttribute("data-ordre-test", String(k)), i + 1);
    ordre.push(e);
    if (e.id.startsWith("onglet")) break;
  }
  return ordre;
}
const resumeOrdre = (o) => o.slice(0, 14).map((e) => e.nom).join(" → ");

histoireDef("US-A11Y-001", "US-A11Y-001 — Navigation au clavier (jalon 3 : S1, S3, S4, S5)", async () => {
  // S3 : formulaire (champs de lieux, inversion, voiture, calcul, historique)
  await ouvrirTrajets(pa);
  const ordreS3 = await tabulation(pa);
  await pastillesOrdre();
  await capture(pa, "US-A11Y-001-01-m3.png", async () => {
    expect(ordreS3.length).toBeGreaterThan(7);
    expect(ordreS3.every((e) => e.contour && e.nom)).toBe(true);
    const i = (id) => ordreS3.findIndex((e) => e.id === id);
    expect(i("dep")).toBeLessThan(i("arr"));
    expect(i("arr")).toBeLessThan(i("voiture-marque"));
    expect(i("voiture-marque")).toBeLessThan(i("bouton-calculer"));
    return `S3 Trajets : ${ordreS3.length} contrôles parcourus (${resumeOrdre(ordreS3)}…), tous avec contour visible, dans l'ordre de lecture (départ, arrivée, voiture, calcul)`;
  }, "Tab : ordre de lecture et contour visible sur S3 Trajets");
  // S4 : résultat d'un trajet Europe (nouveaux blocs Péages et Pays traversés : aucun contrôle caché ; tronçons atteignables)
  await formulaireEurope(pa, { saisie: "Albi", label: "Albi" }, { saisie: "Castr", label: "Castres", contexte: "Tarn" });
  await calculer(pa);
  await verifier("S4 : Tab parcourt retour, prix perso et tronçons avec contour visible", async () => {
    const o = await tabulation(pa);
    expect(o.every((e) => e.contour && e.nom)).toBe(true);
    const i = (id) => o.findIndex((e) => e.id === id);
    expect(i("troncon-0")).toBeGreaterThan(0);
    note("happy", `- ✓ (hors capture) S4 Résultat : ${o.length} contrôles (${resumeOrdre(o)}…), contour visible partout, tronçons atteints dans l'ordre.`);
  });
  // S1 : prix
  await pa.goto(`${URL_APP}/`);
  await expect(pa.locator('[data-el="ligne-station"]').first()).toBeVisible({ timeout: 20000 });
  await verifier("S1 : Tab parcourt carburants, carte, tri et liste avec contour visible", async () => {
    const o = await tabulation(pa);
    expect(o.every((e) => e.contour && e.nom)).toBe(true);
    note("happy", `- ✓ (hors capture) S1 Prix : ${o.length} contrôles (${resumeOrdre(o)}…), contour visible partout.`);
  });
  // S5 : moteurs
  await pb.reload();
  await expect(pb.locator('[data-el="moteur"]')).toHaveCount(6, { timeout: 20000 });
  const ordre = await tabulation(pb);
  await pastillesOrdre();
  await capture(pb, "US-A11Y-001-02-m3.png", async () => {
    const noms = ordre.map((e) => e.nom);
    expect(ordre.length).toBeGreaterThan(15);
    expect(ordre.every((e) => e.contour && e.nom)).toBe(true);
    const i = (id) => ordre.findIndex((e) => e.id === id);
    expect(i("mot-prix-f")).toBeLessThan(i("mot-itineraire-f"));
    expect(i("mot-itineraire-f")).toBeLessThan(i("mot-peages-f"));
    expect(i("mot-peages-f")).toBeLessThan(i("mot-lieux-f"));
    return `S5 Moteurs : ${ordre.length} contrôles (${noms.slice(0, 12).join(" → ")}…), tous avec contour visible, dans l'ordre de lecture`;
  }, "Tab : ordre de lecture et contour visible sur S5 Moteurs");
  await verifier("Maj+Tab revient au contrôle précédent", async () => {
    await pb.evaluate(() => document.querySelectorAll("[data-ordre-test]").forEach((e) => e.removeAttribute("data-ordre-test")));
    const avant = await etatFocus(pb);
    await pb.keyboard.press("Shift+Tab");
    expect((await etatFocus(pb)).i).not.toBe(avant.i);
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
  const idLigne = await ligne.getAttribute("data-station");
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
    expect(id).toBe(idLigne);
    return `à la fermeture, le focus revient sur la ligne qui l'avait ouverte (${id})`;
  }, "fermeture : le focus revient sur l'élément qui l'a ouverte");
  await C.close();
});

histoireDef("US-A11Y-003", "US-A11Y-003 — Touche Échap (jalon 3 : S1, S3, S4)", async () => {
  // S4 : tronçon déplié d'un trajet Europe
  await ouvrirTrajets(pa);
  await saisirLieu(pa, "depart", "Albi", "Albi");
  await choisirLieu(pa, "arrivee", "Barce", "Barcelone", "Espagne");
  await choisirVoiture(pa);
  await calculer(pa);
  const t = pa.locator("#troncon-4");
  await t.focus();
  await pa.keyboard.press("Enter");
  await expect(t).toHaveAttribute("aria-expanded", "true");
  await capture(pa, "US-A11Y-003-01-m3.png", async () => {
    const det = await pa.locator('[data-el="troncon-detail"]:visible').innerText();
    return `S4 Résultat Albi → Barcelone : tronçon espagnol déplié (« ${det.replace(/\s+/g, " ").trim()} »)`;
  }, "un tronçon déplié sur S4");
  await pa.keyboard.press("Escape");
  await capture(pa, "US-A11Y-003-02-m3.png", async () => {
    await expect(t).toHaveAttribute("aria-expanded", "false");
    await expect(t).toBeFocused();
    return "Échap replie le tronçon (aria-expanded=false) et le focus reste sur lui";
  }, "Échap replie le tronçon sur S4");
  // S3 : la liste de propositions de lieux se ferme
  await verifier("S3 : Échap ferme les propositions de lieux", async () => {
    await retourFormulaire(pa);
    const c = champ(pa, "arrivee");
    await c.fill("");
    await c.pressSequentially("Barce", { delay: 40 });
    await expect(propositions(pa, "arrivee").first()).toBeVisible({ timeout: 20000 });
    await pa.keyboard.press("Escape");
    await expect(propositions(pa, "arrivee")).toHaveCount(0);
    note("happy", "- ✓ (hors capture) S3 : « Barce » ouvre les propositions (dont Barcelone), Échap les ferme.");
  });
  // S1 : la fiche d'une station espagnole se ferme
  const C = await contexte({ geolocation: BARCELONE });
  const pc = await C.newPage();
  surveiller(pc, "C3");
  await pc.goto(`${URL_APP}/`);
  await expect(pc.locator('[data-el="ligne-station"]').first()).toBeVisible({ timeout: 20000 });
  await verifier("S1 : Échap ferme la fiche d'une station espagnole", async () => {
    await pc.locator('[data-el="ligne-station"]').first().focus();
    await pc.keyboard.press("Enter");
    await expect(pc.getByRole("dialog")).toBeVisible();
    await pc.keyboard.press("Escape");
    await expect(pc.getByRole("dialog")).toHaveCount(0);
    note("happy", "- ✓ (hors capture) S1 : fiche d'une station espagnole ouverte au clavier, Échap la ferme.");
  });
  await C.close();
});

histoireDef("US-A11Y-004", "US-A11Y-004 — Libellés lisibles (jalon 3 : S1, S3, S4, S5)", async () => {
  // S1 : pastilles et prix annoncés (stations espagnoles)
  const C = await contexte({ geolocation: BARCELONE });
  const pc = await C.newPage();
  surveiller(pc, "C4");
  await pc.goto(`${URL_APP}/`);
  await pc.locator('[data-el="pastille-station"]').first().waitFor({ timeout: 20000 });
  await verifier("S1 : pastilles et prix des stations espagnoles annoncés en euros", async () => {
    const pastilles = await pc.locator('[data-el="pastille-station"]').evaluateAll((els) => els.map((e) => e.getAttribute("aria-label") ?? ""));
    const prix = await pc.locator('[data-el="ligne-station"] .totem').evaluateAll((els) => els.map((e) => e.getAttribute("aria-label") ?? ""));
    expect(pastilles.length).toBeGreaterThan(5);
    expect(pastilles.every((p) => /, \d,\d{3} euros le litre, (moins cher|plus cher)$/.test(p))).toBe(true);
    expect(prix.every((l) => /euros le litre/.test(l))).toBe(true);
    note("happy", `- ✓ (hors capture) S1 Barcelone : ${pastilles.length} pastilles (ex. « ${pastilles[0]} »), ${prix.length} prix de liste annoncés en euros.`);
  });
  await C.close();
  // S3 : chaque champ et bouton a un nom
  await ouvrirTrajets(pa);
  await verifier("S3 : champs, boutons et listes nommés", async () => {
    const sansNom = await pa.evaluate(() => [...document.querySelectorAll("[data-screen='S3'] button, [data-screen='S3'] select, [data-screen='S3'] input")].filter((e) => !(e.getAttribute("aria-label") || e.labels?.[0]?.textContent?.trim() || e.textContent?.trim())).length);
    expect(sansNom).toBe(0);
    await expect(pa.locator('[data-el="inverser"]')).toHaveAttribute("aria-label", "Inverser les deux lieux");
    note("happy", `- ✓ (hors capture) S3 : ${await pa.locator("[data-screen='S3'] button, [data-screen='S3'] input").count()} contrôles, ${sansNom} sans nom ; bouton d'inversion « Inverser les deux lieux ».`);
  });
  // S4 : résultat Europe : tronçons, plaques de prix et boutons nommés
  await saisirLieu(pa, "depart", "Albi", "Albi");
  await choisirLieu(pa, "arrivee", "Barce", "Barcelone", "Espagne");
  await choisirVoiture(pa);
  await calculer(pa);
  const troncons = await pa.locator('[data-el="troncons"] button').evaluateAll((els) => els.map((e) => e.getAttribute("aria-label") ?? ""));
  const plaques = await pa.locator("[data-screen='S4'] .totem").evaluateAll((els) => els.map((e) => e.getAttribute("aria-label") ?? ""));
  await annoter(pa, `S4 : ${troncons.length} tronçons annoncés (ex. « ${troncons[0]} »), plaques de prix « ${plaques.join(" ; ")} »`);
  await capture(pa, "US-A11Y-004-01-m3.png", async () => {
    expect(troncons.length).toBeGreaterThan(5);
    expect(troncons.every((l) => /, \d+,\d km, \d+,\d litres$/.test(l))).toBe(true);
    expect(plaques.every((l) => /euros/.test(l))).toBe(true);
    await expect(pa.locator('[data-el="retour-trajets"]')).toHaveAttribute("aria-label", "Retour aux trajets");
    return `S4 : ${troncons.length} tronçons annoncés « nom, km, litres » ; plaques : ${plaques.join(" ; ")} ; bouton « Retour aux trajets »`;
  }, "libellés sur S4 Résultat : tronçons, plaques de prix, retour");
  // S5 : chaque contrôle nommé
  await pb.reload();
  await expect(pb.locator('[data-el="moteur"]')).toHaveCount(6, { timeout: 20000 });
  const sansNom = await pb.evaluate(() => [...document.querySelectorAll("button, select, input")].filter((e) => !(e.getAttribute("aria-label") || e.labels?.[0]?.textContent?.trim() || e.textContent?.trim())).length);
  const gear = await pb.locator('[data-el="bouton-moteurs"]').getAttribute("aria-label");
  const total = await pb.locator("button, select, input").count();
  await annoter(pb, `S5 : ${total} contrôles, ${sansNom} sans nom accessible ; ⚙ = « ${gear} »`);
  await capture(pb, "US-A11Y-004-02-m3.png", async () => {
    expect(sansNom).toBe(0);
    expect(gear).toBe("Moteurs (administration)");
    return `S5 Moteurs : ${total} contrôles, ${sansNom} sans nom ; bouton ⚙ nommé « ${gear} »`;
  }, "libellés sur S5 Moteurs");
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
let verifFinale = null;
const aJouer = HISTOIRES.filter((h) => FILTRE.length === 0 || FILTRE.includes(h.id));
try {
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
} finally {
  // restauration de l'état réel (clés PTV et Stadia lues en mémoire au départ ; actif peages = ptv, itinéraire = stadia + secours valhalla-public)
  try {
    await restaurerEtatReel(ETAT_REEL);
    verifFinale = await verifierFournisseurs();
  } catch (e) {
    console.error("RESTAURATION", String(e.message).slice(0, 200));
  }
  const manquantes = MANQUANTES.length ? ` Clés absentes au départ du run (non réinventées) : ${MANQUANTES.join(", ")}.` : "";
  const ligneFinale = `- Vérification finale (vrai appel estimer-trajet Albi → Barcelone, sans aucune clé) : ${JSON.stringify(verifFinale)}.${manquantes}`;
  let j = fs.readFileSync(JOURNAL, "utf8").replace(/\n## Vérification finale de l'état des moteurs[\s\S]*$/, "");
  fs.writeFileSync(JOURNAL, j.replace(/\s+$/, "\n") + `\n## Vérification finale de l'état des moteurs\n\n${ligneFinale}\n`);
  console.log(ligneFinale);
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
