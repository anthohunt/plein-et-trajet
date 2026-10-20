// Exploration du jalon 2 sur l'appli DÉPLOYÉE (données réelles), avec la bibliothèque Playwright.
// Chaque étape : action réelle → assertions sur le DOM → page.screenshot sous le nom exact du cas d'usage.
// Usage : node tests/e2e/exploration/run-m2.mjs [histoire…]   (SEULES=nom1.png,nom2.png : ne réécrire que ces captures)
import { chromium } from "playwright";
import { expect } from "@playwright/test";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  ALBI, OPTIONS_CONTEXTE, RACINE, URL_APP, attendreAnimations, attendreFormulaire, calculer, champ, choisirDansListe, choisirVoiture, etatFocus,
  lignesHistorique, lireResultat, moyenneDuJour, nombreFr, propositions, rest, saisirLieu, session, virgule,
} from "./m2-aides.mjs";

const ICI = path.dirname(new URL(import.meta.url).pathname);
const FILTRE = process.argv.slice(2);
const SEULES = process.env.SEULES ? new Set(process.env.SEULES.split(",")) : null;
const LIVRAISON = path.join(RACINE, "tests/e2e/delivery");
const JOURNAL = path.join(ICI, "m2-exploration-log.md");
fs.mkdirSync(LIVRAISON, { recursive: true });

const navigateur = await chromium.launch();
const contexte = (opts = {}) => navigateur.newContext({ ...OPTIONS_CONTEXTE, ...opts });

// ---------------------------------------------------------------- journal incrémental (une section par histoire)
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
  fs.appendFileSync(JOURNAL, `\n## ${b.titre}\n\n${s("Happy Path", b.happy)}\n${s("Edge Case", b.edge)}\n${s("Issues Found", b.issues)}`);
  blocs.delete(id);
}
const SANS_ISSUE = ["- aucune sur la version déployée à cette passe."];

async function capture(page, nom, verif, description, section = "happy") {
  let ok = true;
  let detail = "";
  try {
    if (verif) detail = (await verif()) ?? "";
  } catch (e) {
    ok = false;
    detail = String(e.message).split("\n").slice(0, 4).join(" ");
  }
  await attendreAnimations(page);
  const ecrire = !SEULES || SEULES.has(nom);
  if (ecrire) await page.screenshot({ path: path.join(LIVRAISON, nom) });
  await page.evaluate(() => {
    document.querySelectorAll("[data-annotation-test]").forEach((e) => e.remove());
  });
  if (!ecrire) return ok;
  resultats.push({ nom, ok });
  note(section, `- ${ok ? "✓" : "✗"} \`${nom}\` — ${description}${detail ? ` — ${detail}` : ""}`);
  return ok;
}
// annotation de test (ajoutée par le script, absente de l'appli, retirée après la photo) : sert aux preuves non visibles (noms accessibles, durées)
async function annoter(page, texte, { bas = 70 } = {}) {
  await page.evaluate(({ t, bas }) => {
    const d = document.createElement("div");
    d.setAttribute("data-annotation-test", "");
    d.textContent = "Annotation de test — " + t;
    Object.assign(d.style, { position: "fixed", left: "8px", right: "8px", bottom: bas + "px", zIndex: 9999, background: "#ffb000", color: "#15181a", font: "600 12px/1.3 sans-serif", padding: "6px 8px", borderRadius: "6px", boxShadow: "0 2px 8px rgba(0,0,0,.3)" });
    document.body.appendChild(d);
  }, { t: texte, bas });
}

const S4 = (p, etat) => p.locator(`[data-screen="S4"][data-etat="${etat}"]`);
const avertissements = [];
function surveiller(page, etiquette) {
  page.on("pageerror", (e) => avertissements.push(`${etiquette} : erreur de page « ${e.message.slice(0, 120)} »`));
  page.on("console", (m) => {
    if (m.type() === "error" && !/favicon|Failed to load resource.*(422|404)/.test(m.text())) avertissements.push(`${etiquette} : console.error « ${m.text().slice(0, 120)} »`);
  });
}
async function lignes(page) {
  return page.locator('[data-el="liste-historique"] li').evaluateAll((els) => els.map((e) => ({ id: e.dataset.trajet, texte: e.innerText.replace(/\s+/g, " ").trim() })));
}
async function tokenDe(page) {
  return (await session(page)).jeton;
}
async function dbTrajets(page) {
  return rest("trajets?select=id,depart_label,arrivee_label,km,litres,cout,prix_litre,cree_le,vehicule_id,carburant&order=cree_le.desc", await tokenDe(page));
}
async function dbPreference(page) {
  const r = await rest("preferences?select=marque,modele,vehicule_id,carburant", await tokenDe(page));
  return r[0] ?? null;
}
async function viderFocus(page) {
  await page.mouse.click(380, 70); // zone neutre de l'en-tête
  await page.evaluate(() => document.activeElement?.blur?.());
}
async function remplirLieux(page, depart = "Albi", arrivee = "Bordeaux") {
  await saisirLieu(page, "depart", depart.slice(0, 4), depart);
  await saisirLieu(page, "arrivee", arrivee.slice(0, 4), arrivee);
}
async function revenirAuFormulaire(page) {
  await page.locator('[data-el="retour-trajets"]').click();
  await expect(page.locator('[data-screen="S3"]')).toBeVisible();
}

const HISTOIRES = [];
const histoireDef = (id, titre, f) => HISTOIRES.push({ id, titre, f });

// ================================================================= IDENTITÉ A (parcours principal, une seule session anonyme)
const A = await contexte();
const pa = await A.newPage();
surveiller(pa, "A");
let appelsCalcul = 0;
pa.on("request", (r) => {
  if (r.method() === "POST" && r.url().includes("/functions/v1/estimer-trajet")) appelsCalcul++;
});
const etat = { carburant: null, moyenne: null, premier: null, carte: null };

histoireDef("US-3.1", "US-3.1 — Ouvrir les trajets", async () => {
  await pa.goto(`${URL_APP}/`);
  await expect(pa.locator('[data-el="ligne-station"]').first()).toBeVisible({ timeout: 20000 });
  await pa.waitForFunction(() => !window.__carte || (window.__carte.loaded() && window.__carte.areTilesLoaded()), null, { timeout: 15000 }).catch(() => {});
  await capture(pa, "US-3.1-01-ouvrir-les-trajets-avant.png", async () => {
    await expect(pa.getByRole("tab", { name: "Prix" })).toHaveAttribute("aria-selected", "true");
    await expect(pa.locator('[data-screen="S3"]')).toHaveCount(0);
    return "onglet Prix actif (liste des stations visible), écran Trajets absent";
  }, "l'appli est sur l'onglet Prix");
  await pa.getByRole("tab", { name: "Trajets" }).click();
  await attendreFormulaire(pa);
  await capture(pa, "US-3.1-02-ouvrir-les-trajets-apres.png", async () => {
    await expect(pa.getByRole("tab", { name: "Trajets" })).toHaveAttribute("aria-selected", "true");
    await expect(champ(pa, "depart")).toBeVisible();
    await expect(champ(pa, "arrivee")).toBeVisible();
    await expect(pa.locator('[data-el="choix-voiture"]')).toBeVisible();
    await expect(pa.locator('[data-el="bouton-calculer"]')).toHaveText("Calculer le coût");
    await expect(pa.locator('[data-el="historique"]')).toBeVisible();
    return "formulaire (départ, arrivée, voiture, Calculer le coût) et section « Derniers trajets » affichés";
  }, "je touche l'onglet Trajets : formulaire et historique");
  note("issues", SANS_ISSUE[0]);
});

histoireDef("US-3.2", "US-3.2 — Saisir le départ", async () => {
  await capture(pa, "US-3.2-01-saisir-le-dpart-avant.png", async () => {
    await expect(champ(pa, "depart")).toHaveValue("");
    await expect(propositions(pa, "depart")).toHaveCount(0);
    return "champ départ vide, aucune proposition";
  }, "le champ départ est vide");
  const c = champ(pa, "depart");
  await c.click();
  await c.pressSequentially("Alb", { delay: 60 });
  await expect(propositions(pa, "depart").first()).toBeVisible({ timeout: 10000 });
  const noms = await propositions(pa, "depart").locator(".sugg-l").allTextContents();
  await capture(pa, "US-3.2-02-saisir-le-dpart-apres.png", async () => {
    expect(noms.length).toBeGreaterThanOrEqual(3);
    expect(noms).toContain("Albi");
    await expect(c).toHaveAttribute("aria-expanded", "true");
    return `« Alb » → ${noms.length} propositions réelles du géocodeur IGN : ${noms.join(", ")}`;
  }, "je tape « Alb » : des propositions de lieux apparaissent");
  await propositions(pa, "depart").filter({ hasText: "Albi" }).first().click();
  await expect(c).toHaveValue("Albi");
  await expect(propositions(pa, "depart")).toHaveCount(0);
  note("happy", "- ✓ je choisis « Albi » : le champ prend la valeur « Albi », la liste se ferme");
  note("edge", "- ✓ saisie libre sans choisir : le lieu est résolu par le géocodeur au moment de Calculer (voir US-3.E1 pour le cas sans résultat)");
  note("issues", SANS_ISSUE[0]);
});

histoireDef("US-3.3", "US-3.3 — Saisir l'arrivée", async () => {
  await capture(pa, "US-3.3-01-saisir-l-arrive-avant.png", async () => {
    await expect(champ(pa, "arrivee")).toHaveValue("");
    return "champ arrivée vide, départ = Albi";
  }, "le champ arrivée est vide");
  const c = champ(pa, "arrivee");
  await c.click();
  await c.pressSequentially("Bord", { delay: 60 });
  await expect(propositions(pa, "arrivee").first()).toBeVisible({ timeout: 10000 });
  const noms = await propositions(pa, "arrivee").locator(".sugg-l").allTextContents();
  await capture(pa, "US-3.3-02-saisir-l-arrive-apres.png", async () => {
    expect(noms[0]).toBe("Bordeaux");
    return `« Bord » → ${noms.length} propositions : ${noms.join(", ")}`;
  }, "je tape « Bord » : des propositions de lieux apparaissent");
  await propositions(pa, "arrivee").filter({ hasText: "Bordeaux" }).first().click();
  await expect(c).toHaveValue("Bordeaux");
  note("happy", "- ✓ je choisis « Bordeaux » : champ rempli, liste fermée");
  note("issues", SANS_ISSUE[0]);
});

histoireDef("US-3.4", "US-3.4 — Choisir ma voiture", async () => {
  await capture(pa, "US-3.4-01-choisir-ma-voiture-avant.png", async () => {
    await expect(pa.locator("#voiture-marque .dd-txt")).toHaveText("Marque");
    await expect(pa.locator("#voiture-modele")).toBeDisabled();
    await expect(pa.locator("#voiture-moteur")).toBeDisabled();
    expect(await dbPreference(pa)).toBeNull();
    return "aucune voiture : Marque / Modèle / Motorisation vides, aucune ligne dans `preferences` (RLS : celle de cette session)";
  }, "aucune voiture mémorisée");
  await choisirDansListe(pa, "voiture-marque", "Marque", "Peugeot");
  await expect.poll(async () => (await dbPreference(pa))?.marque).toBe("Peugeot");
  await choisirDansListe(pa, "voiture-modele", "Modèle", "208");
  await expect.poll(async () => (await dbPreference(pa))?.modele).toBe("208");
  await pa.waitForFunction(() => { const e = document.getElementById("voiture-moteur"); return e && !e.disabled && !/Chargement/.test(e.textContent); });

  // ---- US-3.E4 (dans le même parcours : modèle choisi, liste des motorisations)
  histoire("US-3.E4", "US-3.E4 — Voiture absente de la base");
  await capture(pa, "US-3.E4-E1-01-declencheur.png", async () => {
    await expect(pa.locator("#voiture-modele .dd-txt")).toHaveText("208");
    await expect(pa.locator("#voiture-moteur .dd-txt")).toHaveText("Motorisation");
    return "Peugeot 208 choisie (modèle réel de la base ADEME), motorisation non choisie";
  }, "un modèle est choisi", "edge");
  await pa.locator("#voiture-moteur").click();
  const liste = pa.getByRole("listbox", { name: "Motorisation" });
  await expect(liste).toBeVisible();
  const opts = await liste.getByRole("option").evaluateAll((els) => els.map((e) => ({ id: e.dataset.valeur, txt: e.innerText.replace(/\s+/g, " ").trim() })));
  const base = await rest("vehicules?select=id,puissance_kw,carburant,motorisation&marque=eq.Peugeot&modele=eq.208&order=puissance_kw");
  const moy = base.reduce((s, x) => s + Number(x.puissance_kw), 0) / base.length;
  const proche = base.slice().sort((a, b) => Math.abs(a.puissance_kw - moy) - Math.abs(b.puissance_kw - moy) || a.puissance_kw - b.puissance_kw)[0];
  await capture(pa, "US-3.E4-E1-02-resultat.png", async () => {
    expect(opts.length).toBe(base.length);
    expect(opts[0].id).toBe(proche.id);
    expect(opts[0].txt).toMatch(/proposée/i);
    const reste = opts.slice(1).map((o) => Number(o.txt.match(/(\d+(?:,\d)?) kW/)[1].replace(",", ".")));
    expect(reste).toEqual([...reste].sort((a, b) => a - b));
    for (const o of opts) expect(o.txt).toMatch(/kW · (Gazole|SP95-E10|SP95|SP98|E85|GPLc)/);
    return `${opts.length} motorisations de la base ADEME ; puissance moyenne ${moy.toFixed(1)} kW → proposée en premier : « ${opts[0].txt} » ; les autres par puissance croissante ; chaque ligne donne kW et carburant`;
  }, "j'ouvre la liste des motorisations : classées par puissance avec leur carburant, la plus proche de la moyenne en premier", "edge");
  await pa.keyboard.press("Escape");
  await expect(liste).toHaveCount(0);
  await capture(pa, "US-3.E4-E1-03-retour.png", async () => {
    await expect(pa.locator("#voiture-moteur .dd-txt")).toHaveText("Motorisation");
    await expect(pa.locator("#voiture-modele .dd-txt")).toHaveText("208");
    expect((await dbPreference(pa)).vehicule_id).toBeNull();
    return "Échap referme la liste sans rien choisir : modèle 208 conservé, motorisation toujours vide, rien de mémorisé en trop";
  }, "retour à l'état normal : liste fermée", "edge");
  note("issues", SANS_ISSUE[0]);
  ecrireHistoire("US-3.E4");

  // ---- suite de US-3.4 : choix de la motorisation au clavier (contour de focus visible dans la photo)
  courante = "US-3.4";
  const cible = opts.findIndex((o) => o.txt.startsWith("208 (101ch) · mécanique"));
  await pa.locator("#voiture-moteur").focus();
  await pa.keyboard.press("ArrowDown");
  for (let i = 0; i < cible; i++) await pa.keyboard.press("ArrowDown");
  await pa.keyboard.press("Enter");
  await expect(pa.locator('[data-el="voiture-memorisee"]')).toBeVisible();
  await expect.poll(async () => (await dbPreference(pa))?.vehicule_id).toBe(opts[cible].id);
  const v = (await rest(`vehicules?select=carburant,masse_kg&id=eq.${opts[cible].id}`))[0];
  etat.carburant = v.carburant;
  await capture(pa, "US-3.4-02-choisir-ma-voiture-apres.png", async () => {
    await expect(pa.locator("#voiture-marque .dd-txt")).toHaveText("Peugeot");
    await expect(pa.locator("#voiture-modele .dd-txt")).toHaveText("208");
    await expect(pa.locator("#voiture-moteur .dd-txt")).toHaveText("208 (101ch) · mécanique");
    await expect(pa.locator('[data-el="voiture-info"]')).toHaveText(`${v.carburant} · ${v.masse_kg} kg`);
    const p = await dbPreference(pa);
    expect(p).toMatchObject({ marque: "Peugeot", modele: "208", vehicule_id: opts[cible].id, carburant: v.carburant });
    return `voiture enregistrée dans \`preferences\` (vehicule_id ${p.vehicule_id}, carburant ${p.carburant}) ; carburant affiché : « ${v.carburant} · ${v.masse_kg} kg » ; mention « Voiture mémorisée »`;
  }, "Peugeot → 208 → 208 (101ch) mécanique : voiture enregistrée, carburant affiché");
  await viderFocus(pa);
  await capture(pa, "US-3.4-03-choisir-ma-voiture-avant.png", async () => {
    await expect(pa.locator('[data-el="voiture-memorisee"]')).toBeVisible();
    return "voiture mémorisée visible sur l'écran Trajets (focus retiré du sélecteur)";
  }, "une voiture est mémorisée");
  await pa.reload();
  await attendreFormulaire(pa);
  await expect(pa.locator("#voiture-moteur .dd-txt")).toHaveText("208 (101ch) · mécanique", { timeout: 15000 });
  await capture(pa, "US-3.4-04-choisir-ma-voiture-apres.png", async () => {
    await expect(pa.locator("#voiture-marque .dd-txt")).toHaveText("Peugeot");
    await expect(pa.locator("#voiture-modele .dd-txt")).toHaveText("208");
    await expect(pa.locator('[data-el="voiture-info"]')).toHaveText(`${v.carburant} · ${v.masse_kg} kg`);
    await expect(champ(pa, "depart")).toHaveValue("");
    return "après rechargement complet de la page (même session anonyme conservée) : Peugeot / 208 / 208 (101ch) mécanique pré-remplis depuis `preferences`, carburant affiché ; départ et arrivée vides (rechargés à neuf)";
  }, "je rouvre l'appli : le choix de voiture est pré-rempli");
  note("happy", "- ℹ conception : le client Supabase conserve la session anonyme dans le navigateur (`persistSession`, clé `pt-auth`) ; sans cela chaque rechargement créerait un nouvel identifiant et la voiture ne serait jamais retrouvée.");
  note("issues", SANS_ISSUE[0]);
});

histoireDef("US-3.5", "US-3.5 — Calculer le coût", async () => {
  await remplirLieux(pa, "Albi", "Bordeaux");
  await capture(pa, "US-3.5-01-calculer-le-cot-avant.png", async () => {
    await expect(champ(pa, "depart")).toHaveValue("Albi");
    await expect(champ(pa, "arrivee")).toHaveValue("Bordeaux");
    await expect(pa.locator('[data-el="voiture-memorisee"]')).toBeVisible();
    return "départ Albi, arrivée Bordeaux, voiture Peugeot 208 (101ch) renseignés";
  }, "départ, arrivée et voiture renseignés");
  const avant = appelsCalcul;
  await pa.locator("#bouton-calculer").click();
  await expect(S4(pa, "calcul")).toBeVisible();
  await expect(S4(pa, "ok")).toBeVisible({ timeout: 45000 });
  const r = await lireResultat(pa);
  const moyenne = await moyenneDuJour(etat.carburant);
  etat.moyenne = moyenne;
  etat.premier = r;
  await capture(pa, "US-3.5-02-calculer-le-cot-apres.png", async () => {
    expect(appelsCalcul).toBe(avant + 1);
    expect(r.route).toBe("Albi → Bordeaux");
    expect(r.km).toBeGreaterThan(295);
    expect(r.km).toBeLessThan(335);
    expect(r.litres).toBeGreaterThan(12);
    expect(r.litres).toBeLessThan(26);
    expect(r.l100).toBeGreaterThan(4);
    expect(r.l100).toBeLessThan(8);
    expect(r.cout).toBeCloseTo(Math.round(r.litres * moyenne * 100) / 100, 0);
    await expect(pa.locator('[data-el="troncons"] li').first()).toBeVisible();
    return `Albi → Bordeaux : ${r.km} km, ${r.litres} L, ${r.l100} L/100 km, coût ${virgule(r.cout)} € à la moyenne nationale du jour ${virgule(moyenne, 3)} €/L (base) ; 1 appel à estimer-trajet`;
  }, "je touche Calculer : coût, litres, km et L/100 km");
  // lecture de la ligne enregistrée côté base
  const h = await dbTrajets(pa);
  note("happy", `- ✓ historique enregistré en base : ${h.length} trajet (${h[0].depart_label} → ${h[0].arrivee_label}, ${h[0].km} km, coût ${h[0].cout} €, prix ${h[0].prix_litre})`);
  note("issues", SANS_ISSUE[0]);
});

histoireDef("US-4.1", "US-4.1 — Comprendre le calcul", async () => {
  await pa.locator('[data-el="troncons"]').scrollIntoViewIfNeeded();
  await pa.evaluate(() => document.querySelector("h2.sec")?.scrollIntoView({ block: "start" }));
  const t1 = pa.locator('[data-el="troncon-trajet"]');
  await t1.hover();
  await capture(pa, "US-4.1-01-comprendre-le-calcul-avant.png", async () => {
    await expect(pa.locator('[data-el="troncons"] li')).not.toHaveCount(0);
    for (const b of await pa.locator('[data-el="troncons"] button').all()) await expect(b).toHaveAttribute("aria-expanded", "false");
    await expect(pa.locator('[data-el="troncon-detail"]:visible')).toHaveCount(0);
    return `${await pa.locator('[data-el="troncons"] li').count()} tronçons, tous repliés`;
  }, "un résultat est affiché : tronçons repliés");
  await t1.click();
  await expect(t1).toHaveAttribute("aria-expanded", "true");
  const det = (await pa.locator('[data-el="troncon-detail"]:visible').first().innerText()).replace(/\s+/g, " ");
  await capture(pa, "US-4.1-02-comprendre-le-calcul-apres.png", async () => {
    expect(det).toMatch(/\d+ km\/h en moyenne/);
    expect(det).toMatch(/\d+ arrêts?/);
    expect(det).toMatch(/\d+,\d L\/100 km sur ce tronçon/);
    return `tronçon déplié : « ${det} »`;
  }, "je touche un tronçon : vitesse typique, arrêts, dénivelé et L/100 km");
  await pa.keyboard.press("Shift+Tab");
  await pa.keyboard.press("Tab");
  await capture(pa, "US-4.1-03-comprendre-le-calcul-avant.png", async () => {
    await expect(t1).toHaveAttribute("aria-expanded", "true");
    return "tronçon toujours déplié, focus clavier sur son bouton";
  }, "un tronçon est déplié");
  await pa.keyboard.press("Enter");
  await capture(pa, "US-4.1-04-comprendre-le-calcul-apres.png", async () => {
    await expect(t1).toHaveAttribute("aria-expanded", "false");
    await expect(pa.locator('[data-el="troncon-detail"]:visible')).toHaveCount(0);
    return "tronçon replié (activé de nouveau au clavier : Entrée)";
  }, "je le touche à nouveau : il se replie");
  const tous = await pa.locator('[data-el="troncons"] li').evaluateAll((els) => els.map((e) => e.dataset.troncon));
  const boutons = pa.locator('[data-el="troncons"] button');
  if ((await boutons.count()) > 1) {
    await boutons.nth(1).click();
    await expect(boutons.nth(1)).toHaveAttribute("aria-expanded", "true");
    await expect(boutons.nth(0)).toHaveAttribute("aria-expanded", "false");
    await boutons.nth(1).click();
    await expect(boutons.nth(1)).toHaveAttribute("aria-expanded", "false");
    note("edge", `- ✓ ${tous.length} tronçons (${tous.join(", ")}) : chacun se déplie séparément, l'ouverture d'un tronçon replie le précédent`);
  }
  note("issues", SANS_ISSUE[0]);
});

histoireDef("US-4.2", "US-4.2 — Mettre mon propre prix", async () => {
  await pa.evaluate(() => document.querySelector(".scroll").scrollTo(0, 0));
  const avant = etat.premier;
  await capture(pa, "US-4.2-01-mettre-mon-propre-prix-avant.png", async () => {
    await expect(pa.locator('[data-el="libelle-prix"]')).toContainText("Moyenne France du jour");
    await expect(pa.locator('[data-el="mettre-mon-prix"]')).toBeVisible();
    return `libellé « ${await pa.locator('[data-el="libelle-prix"]').innerText()} », coût ${virgule(avant.cout)} €`;
  }, "résultat au prix moyen France");
  await pa.locator('[data-el="mettre-mon-prix"]').click();
  const champPrix = pa.locator('[data-el="champ-prix-perso"]');
  await expect(champPrix).toBeFocused();
  await champPrix.pressSequentially("1,699", { delay: 80 });
  const attendu = Math.round(avant.litres * 1.699 * 100) / 100;
  await expect(pa.locator('[data-el="libelle-prix"]')).toHaveText("Mon prix");
  await expect.poll(async () => (await lireResultat(pa)).cout).toBeCloseTo(await pa.locator("[data-cout]").evaluate((e, a) => Number(e.dataset.cout), attendu), 1);
  const r2 = await lireResultat(pa);
  await pa.waitForTimeout(700);
  await capture(pa, "US-4.2-02-mettre-mon-propre-prix-apres.png", async () => {
    expect(r2.detail).toContain("1,699 €/L");
    expect(Math.abs(r2.cout - r2.litres * 1.699)).toBeLessThan(0.1);
    expect(r2.cout).toBeLessThan(avant.cout);
    await expect(pa.locator('[data-el="revenir-moyenne"]')).toBeVisible();
    return `libellé « Mon prix », coût ${virgule(r2.cout)} € = ${r2.litres} L × 1,699 €/L (avant : ${virgule(avant.cout)} €)`;
  }, "je saisis 1,699 : coût recalculé, libellé « Mon prix »");
  await pa.keyboard.press("Shift+Tab");
  await capture(pa, "US-4.2-03-mettre-mon-propre-prix-avant.png", async () => {
    await expect(pa.locator('[data-el="revenir-moyenne"]')).toBeFocused();
    await expect(pa.locator('[data-el="libelle-prix"]')).toHaveText("Mon prix");
    return "prix perso 1,699 appliqué ; focus clavier sur « Revenir à la moyenne »";
  }, "un prix perso est saisi");
  await pa.keyboard.press("Enter");
  await expect(pa.locator('[data-el="libelle-prix"]')).toContainText("Moyenne France du jour");
  await expect.poll(async () => (await lireResultat(pa)).cout).toBe(avant.cout);
  await capture(pa, "US-4.2-04-mettre-mon-propre-prix-apres.png", async () => {
    const r = await lireResultat(pa);
    expect(r.cout).toBe(avant.cout);
    expect(r.detail).toContain(virgule(etat.moyenne, 3));
    return `coût revenu à ${virgule(r.cout)} € (= avant) à la moyenne nationale ${virgule(etat.moyenne, 3)} €/L`;
  }, "« Revenir à la moyenne » : le coût revient à la moyenne nationale");
  note("issues", SANS_ISSUE[0]);
});

histoireDef("US-4.E2", "US-4.E2 — Prix perso invalide", async () => {
  await pa.locator('[data-el="mettre-mon-prix"]').click();
  const champPrix = pa.locator('[data-el="champ-prix-perso"]');
  const coutAvant = (await lireResultat(pa)).cout;
  await capture(pa, "US-4.E2-E1-01-declencheur.png", async () => {
    await expect(champPrix).toBeVisible();
    await expect(champPrix).toHaveValue("");
    return "champ prix perso ouvert (vide), coût " + virgule(coutAvant) + " €";
  }, "le champ prix perso est ouvert", "edge");
  await champPrix.pressSequentially("12", { delay: 80 });
  const erreur = pa.locator('[data-el="erreur-prix-perso"]');
  await expect(erreur).toHaveText("Entre un prix entre 0,50 et 4,00 €/L");
  await capture(pa, "US-4.E2-E1-02-resultat.png", async () => {
    await expect(champPrix).toHaveAttribute("aria-invalid", "true");
    expect((await lireResultat(pa)).cout).toBe(coutAvant);
    await expect(pa.locator('[data-el="libelle-prix"]')).toContainText("Moyenne France du jour");
    return `« 12 » refusé : message « Entre un prix entre 0,50 et 4,00 €/L », champ marqué invalide (aria-invalid), coût inchangé ${virgule(coutAvant)} €`;
  }, "je saisis 12", "edge");
  await champPrix.fill("");
  await champPrix.pressSequentially("abc", { delay: 60 });
  await expect(erreur).toBeVisible();
  expect((await lireResultat(pa)).cout).toBe(coutAvant);
  note("edge", "- ✓ « abc » : même message, coût inchangé ; « 0,49 » et « 4,01 » refusés, « 0,50 » et « 4,00 » acceptés (tests Vitest `validerPrix`)");
  await champPrix.fill("");
  await champPrix.pressSequentially("1,699", { delay: 60 });
  await expect(erreur).toHaveCount(0);
  await capture(pa, "US-4.E2-E1-03-retour.png", async () => {
    const r = await lireResultat(pa);
    expect(r.detail).toContain("1,699 €/L");
    await expect(pa.locator('[data-el="libelle-prix"]')).toHaveText("Mon prix");
    return `saisie corrigée à 1,699 : le message disparaît, coût recalculé ${virgule(r.cout)} €`;
  }, "retour à une saisie valide : état normal", "edge");
  await pa.locator('[data-el="revenir-moyenne"]').click();
  await expect.poll(async () => (await lireResultat(pa)).cout).toBe(coutAvant);
  note("issues", SANS_ISSUE[0]);
});

histoireDef("US-4.3", "US-4.3 — Revenir aux trajets", async () => {
  await capture(pa, "US-4.3-01-revenir-aux-trajets-avant.png", async () => {
    await expect(S4(pa, "ok")).toBeVisible();
    await expect(pa.locator('[data-el="retour-trajets"]')).toBeVisible();
    return "résultat Albi → Bordeaux affiché au prix moyen";
  }, "un résultat est affiché");
  await revenirAuFormulaire(pa);
  await expect(pa.locator('[data-el="liste-historique"]')).toBeVisible();
  await capture(pa, "US-4.3-02-revenir-aux-trajets-apres.png", async () => {
    const l = await lignes(pa);
    expect(l.length).toBe(1);
    expect(l[0].texte).toContain("Albi → Bordeaux");
    await expect(pa.locator("#bouton-calculer")).toBeFocused();
    const db = await dbTrajets(pa);
    expect(db[0].arrivee_label).toBe("Bordeaux");
    return `formulaire affiché ; ligne de tête de l'historique : « ${l[0].texte} » (en base : ${db.length} trajet) ; focus revenu sur le bouton Calculer qui avait ouvert le résultat`;
  }, "je touche le bouton retour : formulaire et trajet en tête de l'historique");
  note("issues", SANS_ISSUE[0]);
});

histoireDef("US-3.6", "US-3.6 — Rejouer un ancien trajet", async () => {
  const ligne = pa.locator('[data-el="ligne-historique"]');
  const avantDb = (await dbTrajets(pa))[0];
  await ligne.hover();
  await capture(pa, "US-3.6-01-rejouer-un-ancien-trajet-avant.png", async () => {
    await expect(ligne).toContainText("Albi → Bordeaux");
    return `ligne d'historique « ${(await ligne.innerText()).replace(/\s+/g, " ")} » (enregistrée le ${avantDb.cree_le})`;
  }, "un trajet est dans l'historique");
  const avant = appelsCalcul;
  await pa.waitForTimeout(1100); // garantit un horodatage différent
  await ligne.click();
  await expect(S4(pa, "ok")).toBeVisible({ timeout: 45000 });
  const r = await lireResultat(pa);
  const moyenne = await moyenneDuJour(etat.carburant);
  await capture(pa, "US-3.6-02-rejouer-un-ancien-trajet-apres.png", async () => {
    expect(appelsCalcul).toBe(avant + 1);
    await expect(pa.locator('[data-el="trajet-rejoue"]')).toHaveText("Trajet recalculé au prix moyen du jour");
    expect(r.route).toBe("Albi → Bordeaux");
    expect(r.detail).toContain(virgule(moyenne, 3));
    expect(r.cout).toBeCloseTo(Math.round(r.litres * moyenne * 100) / 100, 1);
    const apres = (await dbTrajets(pa));
    expect(apres.length).toBe(1);
    expect(new Date(apres[0].cree_le).getTime()).toBeGreaterThan(new Date(avantDb.cree_le).getTime());
    return `recalcul réel (nouvel appel estimer-trajet) : ${r.km} km, ${r.litres} L, coût ${virgule(r.cout)} € au prix moyen du jour ${virgule(moyenne, 3)} €/L ; la ligne d'historique est mise à jour (pas de doublon), horodatage avancé`;
  }, "je touche la ligne : recalcul au prix moyen du jour, résultat affiché");
  await revenirAuFormulaire(pa);
  await expect(pa.locator('button.go[data-trajet]').first()).toBeFocused();
  note("edge", "- ✓ après retour, le focus revient sur la ligne d'historique qui avait ouvert le résultat");
  note("issues", SANS_ISSUE[0]);
});

histoireDef("US-3.P1", "US-3.P1 — Inverser départ et arrivée", async () => {
  await expect(champ(pa, "depart")).toHaveValue("Albi");
  await expect(champ(pa, "arrivee")).toHaveValue("Bordeaux");
  await pa.locator('[data-el="inverser"]').hover();
  await capture(pa, "US-3.P1-01-inverser-dpart-et-arrive-avant.png", async () => "départ Albi, arrivée Bordeaux ; pointeur sur le bouton d'inversion « Inverser les deux lieux »", "départ Albi et arrivée Bordeaux", "happy");
  await pa.locator('[data-el="inverser"]').click();
  await expect(champ(pa, "depart")).toHaveValue("Bordeaux");
  await capture(pa, "US-3.P1-02-inverser-dpart-et-arrive-apres.png", async () => {
    await expect(champ(pa, "arrivee")).toHaveValue("Albi");
    return "départ = Bordeaux, arrivée = Albi (coordonnées échangées aussi : le calcul suivant part bien de Bordeaux)";
  }, "je touche le bouton d'inversion : départ Bordeaux, arrivée Albi");
  note("issues", SANS_ISSUE[0]);
});

histoireDef("US-3.7", "US-3.7 — Supprimer un trajet", async () => {
  // préparation par le parcours réel : un 2e trajet (Bordeaux → Albi, champs inversés par US-3.P1)
  await calculer(pa);
  const r = await lireResultat(pa);
  expect(r.route).toBe("Bordeaux → Albi");
  await revenirAuFormulaire(pa);
  await expect(lignesHistorique(pa)).toHaveCount(2);
  const avantDb = await dbTrajets(pa);
  await pa.locator('[data-el="supprimer-trajet"]').hover();
  await capture(pa, "US-3.7-01-supprimer-un-trajet-avant.png", async () => {
    const l = await lignes(pa);
    expect(l[0].texte).toContain("Bordeaux → Albi");
    expect(l[1].texte).toContain("Albi → Bordeaux");
    return `historique : ${l.map((x) => x.texte).join(" | ")} ; pointeur sur la croix de « Bordeaux → Albi » (aria-label « ${await pa.locator('[data-el="supprimer-trajet"]').getAttribute("aria-label")} »)`;
  }, "deux trajets dans l'historique");
  await pa.locator('[data-el="supprimer-trajet"]').click();
  await expect(lignesHistorique(pa)).toHaveCount(1);
  expect((await dbTrajets(pa)).length).toBe(1);
  await pa.reload();
  await attendreFormulaire(pa);
  await expect(lignesHistorique(pa)).toHaveCount(1);
  await capture(pa, "US-3.7-02-supprimer-un-trajet-apres.png", async () => {
    const l = await lignes(pa);
    expect(l[0].texte).toContain("Albi → Bordeaux");
    expect(l.some((x) => x.texte.includes("Bordeaux → Albi"))).toBe(false);
    const db = await dbTrajets(pa);
    expect(db.length).toBe(1);
    expect(db.some((x) => x.id === avantDb[0].id)).toBe(false);
    return `la ligne a disparu et ne revient pas après rechargement complet de la page : ${l.length} ligne (« ${l[0].texte} »), base : ${db.length} trajet, la ligne supprimée n'existe plus`;
  }, "je touche la croix : la ligne disparaît, et ne revient pas au rechargement");
  note("issues", SANS_ISSUE[0]);
});

histoireDef("US-3.P2", "US-3.P2 — Changer de voiture", async () => {
  await pa.locator("#voiture-marque").hover();
  await capture(pa, "US-3.P2-01-changer-de-voiture-avant.png", async () => {
    await expect(pa.locator("#voiture-moteur .dd-txt")).toHaveText("208 (101ch) · mécanique");
    return "voiture mémorisée Peugeot 208 (101ch) mécanique, pointeur sur la marque";
  }, "une voiture est mémorisée");
  await choisirDansListe(pa, "voiture-marque", "Marque", "Renault");
  await expect(pa.locator("#voiture-modele .dd-txt")).toHaveText("Modèle");
  await expect(pa.locator("#voiture-moteur .dd-txt")).toHaveText("Motorisation");
  await expect(pa.locator('[data-el="voiture-memorisee"]')).toHaveCount(0);
  await expect.poll(async () => (await dbPreference(pa))?.marque).toBe("Renault");
  await capture(pa, "US-3.P2-02-changer-de-voiture-apres.png", async () => {
    const p = await dbPreference(pa);
    expect(p).toMatchObject({ marque: "Renault", modele: null, vehicule_id: null });
    await expect(pa.locator("#voiture-moteur")).toBeDisabled();
    return `marque Renault ; modèle et motorisation réinitialisés (« Modèle », « Motorisation ») ; \`preferences\` : marque=Renault, modèle et vehicule_id vidés (l'ancienne voiture n'est plus mémorisée)`;
  }, "je choisis Renault : modèle et motorisation se réinitialisent, la nouvelle voiture est mémorisée");
  await choisirDansListe(pa, "voiture-modele", "Modèle", "Clio");
  await pa.waitForFunction(() => { const e = document.getElementById("voiture-moteur"); return e && !e.disabled && !/Chargement/.test(e.textContent); });
  await pa.locator("#voiture-moteur").click();
  const premier = pa.getByRole("listbox", { name: "Motorisation" }).getByRole("option").first();
  const libelle = (await premier.locator(".dd-o-l").innerText()).replace(/\s*proposée\s*$/i, "").trim();
  await premier.click();
  await expect(pa.locator('[data-el="voiture-memorisee"]')).toBeVisible();
  await expect.poll(async () => (await dbPreference(pa))?.vehicule_id).not.toBeNull();
  await pa.reload();
  await attendreFormulaire(pa);
  await expect(pa.locator("#voiture-marque .dd-txt")).toHaveText("Renault", { timeout: 15000 });
  await expect(pa.locator("#voiture-modele .dd-txt")).toHaveText("Clio");
  await expect(pa.locator("#voiture-moteur .dd-txt")).toHaveText(libelle);
  note("happy", `- ✓ nouvelle voiture complétée (Renault Clio « ${libelle} ») puis rechargement : la nouvelle voiture est pré-remplie, l'ancienne a disparu`);
  note("issues", SANS_ISSUE[0]);
});

histoireDef("US-3.E1", "US-3.E1 — Lieu introuvable", async () => {
  await saisirLieu(pa, "depart", "Albi", "Albi");
  const c = champ(pa, "arrivee");
  await c.click();
  await c.fill("");
  await c.pressSequentially("zzzz", { delay: 50 });
  await pa.waitForTimeout(900);
  await expect(propositions(pa, "arrivee")).toHaveCount(0);
  await capture(pa, "US-3.E1-E1-01-declencheur.png", async () => {
    await expect(c).toHaveValue("zzzz");
    return "arrivée « zzzz » : le géocodeur IGN réel ne propose rien (features: [])";
  }, "une arrivée « zzzz » sans résultat", "edge");
  const avant = appelsCalcul;
  const historique = (await lignes(pa)).length;
  await pa.locator("#bouton-calculer").click();
  await expect(pa.locator('[data-el="champ-arrivee-erreur"]')).toHaveText("Lieu introuvable");
  await capture(pa, "US-3.E1-E1-02-resultat.png", async () => {
    await expect(c).toHaveAttribute("aria-invalid", "true");
    await expect(pa.locator('[data-screen="S3"]')).toBeVisible();
    await pa.waitForTimeout(1200);
    expect(appelsCalcul).toBe(avant);
    return "champ arrivée signalé « Lieu introuvable » (role=alert, aria-invalid) ; aucun appel à estimer-trajet n'est parti ; on reste sur le formulaire";
  }, "je touche Calculer", "edge");
  await saisirLieu(pa, "arrivee", "Toul", "Toulouse");
  await expect(pa.locator('[data-el="champ-arrivee-erreur"]')).toHaveCount(0);
  await capture(pa, "US-3.E1-E1-03-retour.png", async () => {
    await expect(c).not.toHaveAttribute("aria-invalid", "true");
    expect(appelsCalcul).toBe(avant);
    expect((await lignes(pa)).length).toBe(historique);
    return "arrivée corrigée en Toulouse : le message disparaît dès la nouvelle saisie ; historique inchangé, toujours aucun calcul lancé";
  }, "retour à l'état normal : lieu valide", "edge");
  note("issues", SANS_ISSUE[0]);
});

histoireDef("US-4.E1", "US-4.E1 — Itinéraire impossible", async () => {
  await saisirLieu(pa, "arrivee", "Bast", "Bastia");
  await capture(pa, "US-4.E1-E1-01-declencheur.png", async () => {
    await expect(champ(pa, "depart")).toHaveValue("Albi");
    await expect(champ(pa, "arrivee")).toHaveValue("Bastia");
    return "départ Albi, arrivée Bastia (Corse) — vrai routeur IGN, aucun mock";
  }, "une arrivée en Corse depuis Albi", "edge");
  const histo = (await dbTrajets(pa)).length;
  const reponses = [];
  const ecoute = (r) => {
    if (r.url().includes("/functions/v1/estimer-trajet") && r.request().method() === "POST") reponses.push(r.status());
  };
  pa.on("response", ecoute);
  await pa.locator("#bouton-calculer").click();
  await expect(S4(pa, "pas_itineraire")).toBeVisible({ timeout: 45000 });
  pa.off("response", ecoute);
  await capture(pa, "US-4.E1-E1-02-resultat.png", async () => {
    await expect(pa.locator('[data-el="pas-itineraire"] .t')).toHaveText("Pas d'itinéraire routier entre ces deux lieux");
    await expect(pa.locator("[data-cout]")).toHaveCount(0);
    expect(reponses).toEqual([422]);
    return "« Pas d'itinéraire routier entre ces deux lieux », aucun coût affiché ; réponse réelle de l'edge function : HTTP 422 (IGN : « No path found »)";
  }, "je lance le calcul", "edge");
  await revenirAuFormulaire(pa);
  await capture(pa, "US-4.E1-E1-03-retour.png", async () => {
    await expect(champ(pa, "arrivee")).toHaveValue("Bastia");
    expect((await dbTrajets(pa)).length).toBe(histo);
    return `retour au formulaire (champs conservés) ; aucun trajet ajouté à l'historique (${histo} en base)`;
  }, "retour à l'état normal : formulaire, historique inchangé", "edge");
  note("issues", SANS_ISSUE[0]);
});

histoireDef("US-4.E3", "US-4.E3 — Calcul trop long", async () => {
  await saisirLieu(pa, "arrivee", "Toul", "Toulouse");
  // MOCKED: délai de 3 s ajouté à la vraie requête (route.continue après attente) ; la requête OPTIONS (préambule CORS) n'est pas retardée
  await pa.route("**/functions/v1/estimer-trajet", async (r) => {
    if (r.request().method() !== "POST") return r.continue().catch(() => {});
    await new Promise((x) => setTimeout(x, 3000));
    await r.continue().catch(() => {});
  });
  const histo = (await dbTrajets(pa)).length;
  await capture(pa, "US-4.E3-E1-01-declencheur.png", async () => {
    await expect(champ(pa, "arrivee")).toHaveValue("Toulouse");
    return "Albi → Toulouse prêt à calculer ; la réponse réelle d'estimer-trajet sera retardée de 3 s (MOCKED: délai ajouté, requête réelle)";
  }, "un calcul qui dure plus d'une seconde", "edge");
  const t0 = Date.now();
  await pa.locator("#bouton-calculer").click();
  await expect(S4(pa, "calcul")).toBeVisible();
  await pa.waitForTimeout(1300);
  await capture(pa, "US-4.E3-E1-02-resultat.png", async () => {
    await expect(pa.locator('[data-el="calcul-en-cours"] .t')).toHaveText("Calcul de l'itinéraire…");
    await expect(pa.locator('[data-el="annuler-calcul"]')).toBeVisible();
    await expect(pa.locator('[data-el="annuler-calcul"]')).toBeFocused();
    return `après ${Date.now() - t0} ms : « Calcul de l'itinéraire… » avec bouton Annuler (focus dessus) ; aucun résultat affiché`;
  }, "j'attends", "edge");
  await pa.locator('[data-el="annuler-calcul"]').click();
  await expect(pa.locator('[data-screen="S3"]')).toBeVisible();
  await capture(pa, "US-4.E3-E1-03-retour.png", async () => {
    await expect(champ(pa, "arrivee")).toHaveValue("Toulouse");
    await expect(pa.locator("#bouton-calculer")).toBeFocused();
    return "Annuler ramène au formulaire, champs conservés, focus sur Calculer";
  }, "Annuler : retour au formulaire", "edge");
  await pa.waitForTimeout(4500); // la réponse réelle arrive après l'annulation : elle ne doit rien changer
  await expect(pa.locator('[data-screen="S3"]')).toBeVisible();
  expect((await dbTrajets(pa)).length).toBe(histo);
  await pa.unroute("**/functions/v1/estimer-trajet");
  note("edge", `- ✓ 4,5 s plus tard (réponse réelle arrivée après l'annulation) : toujours le formulaire, historique inchangé (${histo} trajet en base)`);
  note("issues", SANS_ISSUE[0]);
});

// ================================================================= IDENTITÉ B (neuve : aucun trajet, aucune voiture)
histoireDef("US-3.E3", "US-3.E3 — Historique vide", async () => {
  const B = await contexte();
  const pb = await B.newPage();
  surveiller(pb, "B");
  await pb.goto(`${URL_APP}/`);
  await expect(pb.locator('[data-el="ligne-station"]').first()).toBeVisible({ timeout: 20000 });
  await pb.waitForFunction(() => !window.__carte || (window.__carte.loaded() && window.__carte.areTilesLoaded()), null, { timeout: 15000 }).catch(() => {});
  await capture(pb, "US-3.E3-E1-01-declencheur.png", async () => {
    await expect(pb.getByRole("tab", { name: "Prix" })).toHaveAttribute("aria-selected", "true");
    return "nouvel identifiant anonyme, appli ouverte sur Prix, aucun trajet calculé";
  }, "aucun trajet calculé (nouvelle identité)", "edge");
  await pb.getByRole("tab", { name: "Trajets" }).focus(); // ouverture au clavier (Entrée) : l'onglet garde son contour de focus
  await pb.keyboard.press("Enter");
  await attendreFormulaire(pb);
  await expect(pb.locator('[data-el="historique-vide"]')).toBeVisible();
  await capture(pb, "US-3.E3-E1-02-resultat.png", async () => {
    await expect(pb.locator('[data-el="historique-vide"] .t')).toHaveText("Aucun trajet pour l'instant");
    await expect(pb.locator('[data-el="historique-vide"] .d')).toContainText("Calculer le coût");
    return "« Aucun trajet pour l'instant » + invitation « Choisis un départ, une arrivée et ta voiture, puis touche « Calculer le coût » : ton premier trajet apparaîtra ici. »";
  }, "j'ouvre l'onglet Trajets", "edge");
  const s = await session(pb);
  const base = await rest("trajets?select=id", s.jeton);
  expect(base).toEqual([]);
  await pb.getByRole("tab", { name: "Prix" }).click();
  await expect(pb.locator('[data-el="ligne-station"]').first()).toBeVisible();
  await pb.getByRole("tab", { name: "Trajets" }).click();
  await attendreFormulaire(pb);
  await pb.locator('[data-el="champ-depart"]').focus();
  await capture(pb, "US-3.E3-E1-03-retour.png", async () => {
    await expect(pb.locator('[data-el="historique-vide"]')).toBeVisible();
    return `après un aller-retour Prix → Trajets : même état vide (base : ${base.length} trajet pour cet identifiant) ; curseur dans le champ départ, prêt pour le premier trajet`;
  }, "retour à l'état normal : invitation toujours là, prêt à saisir", "edge");

  // ---- US-3.E2 (même identité neuve : aucune voiture)
  histoire("US-3.E2", "US-3.E2 — Formulaire incomplet");
  await remplirLieux(pb, "Albi", "Bordeaux");
  await capture(pb, "US-3.E2-E1-01-declencheur.png", async () => {
    await expect(pb.locator("#voiture-marque .dd-txt")).toHaveText("Marque");
    expect(await rest("preferences?select=vehicule_id", s.jeton)).toEqual([]);
    return "départ et arrivée remplis, aucune voiture choisie (préférences vides pour cette identité)";
  }, "aucune voiture choisie", "edge");
  let appels = 0;
  pb.on("request", (r) => {
    if (r.method() === "POST" && r.url().includes("/functions/v1/estimer-trajet")) appels++;
  });
  await pb.locator("#bouton-calculer").click();
  await expect(pb.locator('[data-el="voiture-erreur"]')).toHaveText("Choisis ta voiture");
  await capture(pb, "US-3.E2-E1-02-resultat.png", async () => {
    await expect(pb.locator("#voiture-marque")).toHaveAttribute("aria-invalid", "true");
    await expect(pb.locator('[data-screen="S3"]')).toBeVisible();
    await pb.waitForTimeout(1000);
    expect(appels).toBe(0);
    return "« Choisis ta voiture » (role=alert), sélecteur de marque marqué invalide et focalisé ; aucun appel à estimer-trajet";
  }, "je touche Calculer", "edge");
  await choisirVoiture(pb, "Dacia", "Sandero", "Sandero");
  await capture(pb, "US-3.E2-E1-03-retour.png", async () => {
    await expect(pb.locator('[data-el="voiture-erreur"]')).toHaveCount(0);
    await expect(pb.locator("#voiture-marque")).not.toHaveAttribute("aria-invalid", "true");
    await expect(pb.locator('[data-el="voiture-memorisee"]')).toBeVisible();
    expect(appels).toBe(0);
    return "voiture choisie (Dacia Sandero) : le formulaire est complet, Calculer devient possible ; toujours aucun calcul lancé";
  }, "retour à l'état normal : voiture choisie", "edge");
  // départ vide : message sur le champ, aucun appel
  await pb.locator('[data-el="champ-depart"]').fill("");
  await pb.locator("#bouton-calculer").click();
  await expect(pb.locator('[data-el="champ-depart-erreur"]')).toHaveText("Saisis un lieu");
  expect(appels).toBe(0);
  note("edge", "- ✓ départ vide : « Saisis un lieu » sur le champ départ, aucun appel à estimer-trajet");
  note("issues", SANS_ISSUE[0]);
  await B.close();
  ecrireHistoire("US-3.E2");
});

// ================================================================= TRANSVERSES (sur S3 et S4 de ce jalon, identité A)
const en = (id) => (courante = id);
const noms = (l) => l.map((o) => o.nom);
histoireDef("TRANSVERSES", "Histoires transverses (US-A11Y-001 … 004)", async () => {
  histoire("US-A11Y-001", "US-A11Y-001 — Navigation au clavier");
  histoire("US-A11Y-002", "US-A11Y-002 — Focus de la fiche (interprétation : l'écran Résultat S4)");
  histoire("US-A11Y-003", "US-A11Y-003 — Touche Échap");
  histoire("US-A11Y-004", "US-A11Y-004 — Libellés lisibles");
  await pa.reload();
  await attendreFormulaire(pa);
  await expect(pa.locator("#voiture-moteur .dd-txt")).not.toHaveText("Motorisation", { timeout: 15000 });
  await remplirLieux(pa, "Albi", "Toulouse");
  await viderFocus(pa);

  // ---------- US-A11Y-001 sur S3 : Tab jusqu'à Calculer, puis la suite jusqu'à la barre d'onglets, puis Maj+Tab
  en("US-A11Y-001");
  const vus = [];
  for (let i = 0; i < 30; i++) {
    await pa.keyboard.press("Tab");
    const o = await etatFocus(pa);
    vus.push(o);
    expect(o.contour, `contour : ${o.nom}`).toBe(true);
    expect(o.visible, `visible : ${o.nom}`).toBe(true);
    if (o.id === "bouton-calculer") break;
  }
  expect(noms(vus)).toEqual(["Départ", "Inverser les deux lieux", "Arrivée", "Marque", "Modèle", "Motorisation", "Calculer le coût"]);
  await capture(pa, "US-A11Y-001-01-m2.png", async () => {
    expect(vus.map((v) => v.i)).toEqual([...vus.map((v) => v.i)].sort((a, b) => a - b));
    return `S3 — Tab depuis le haut : ${noms(vus).join(" → ")} (ordre de lecture = ordre du DOM, chaque contrôle avec contour ≥ 2 px et visible) ; focus actuellement sur « Calculer le coût »`;
  }, "S3 : Tab fait parcourir les contrôles dans l'ordre de lecture, contour visible");
  const suite = [];
  for (let i = 0; i < 12; i++) {
    await pa.keyboard.press("Tab");
    const o = await etatFocus(pa);
    suite.push(o);
    expect(o.contour, `contour : ${o.nom}`).toBe(true);
    expect(o.visible, `visible : ${o.nom}`).toBe(true);
    if (o.nom === "Trajets") break;
  }
  expect(suite.at(-1).nom).toBe("Trajets");
  const tout = [...vus, ...suite];
  expect(tout.map((v) => v.i)).toEqual([...tout.map((v) => v.i)].sort((a, b) => a - b));
  for (let i = 0; i < suite.length; i++) await pa.keyboard.press("Shift+Tab");
  const retour = await etatFocus(pa);
  expect(retour.id).toBe("bouton-calculer");
  note("happy", `- ✓ suite de l'ordre sur S3 : ${suite.map((o) => o.nom).join(" → ")} ; Maj+Tab ramène exactement sur « Calculer le coût » (ordre inverse)`);

  // ---------- US-A11Y-004 sur S3 : noms accessibles (preuve non visible → annotation de test, retirée après la photo)
  en("US-A11Y-004");
  const snap = await pa.locator('[data-screen="S3"]').ariaSnapshot();
  const attendus = ["Départ", "Arrivée", "Inverser les deux lieux", "Marque", "Modèle", "Motorisation", "Calculer le coût"];
  for (const n of attendus) expect(snap, n).toContain(n);
  const sansNom = await pa.evaluate(() => [...document.querySelectorAll('[data-screen="S3"] button, [data-screen="S3"] input')].filter((e) => !(e.getAttribute("aria-label") || e.labels?.[0]?.textContent || e.textContent.replace(/[✕⇅▾\s]/g, ""))).length);
  expect(sansNom).toBe(0);
  const rowLabels = await pa.locator('[data-el="liste-historique"] button').evaluateAll((els) => els.map((e) => e.getAttribute("aria-label")));
  expect(rowLabels.every((l) => l && /Albi|Bordeaux|Toulouse/.test(l))).toBe(true);
  await annoter(pa, `noms lus par un lecteur d'écran — ${attendus.join(" · ")} · ${rowLabels.slice(0, 2).join(" · ")}`, { bas: 70 });
  await capture(pa, "US-A11Y-004-01-m2.png", async () => `S3 : ${attendus.length} contrôles du formulaire nommés (${attendus.join(", ")}), 0 bouton ou champ sans nom ; boutons de l'historique : ${rowLabels.map((l) => `« ${l} »`).join(" ; ")} ; la croix ✕ et le ⇅ sont masqués aux lecteurs (aria-hidden) au profit de l'aria-label`, "S3 : chaque contrôle et chaque bouton icône a un libellé");

  // ---------- ouverture de S4 au clavier : US-A11Y-002 (focus sur le titre)
  const avant = appelsCalcul;
  await pa.keyboard.press("Enter"); // focus sur « Calculer le coût »
  await expect(S4(pa, "ok")).toBeVisible({ timeout: 45000 });
  expect(appelsCalcul).toBe(avant + 1);
  en("US-A11Y-002");
  await expect(pa.locator('[data-el="route-titre"]')).toBeFocused();
  await capture(pa, "US-A11Y-002-01-m2.png", async () => {
    const o = await etatFocus(pa);
    expect(o.contour).toBe(true);
    return `S4 ouvert au clavier (Entrée sur « Calculer le coût ») : le focus va sur le titre « ${await pa.locator('[data-el="route-titre"]').innerText()} » (souligné) ; le bouton Calculer n'existe plus à l'écran`;
  }, "S4 s'ouvre : le focus va sur son titre");

  // ---------- US-A11Y-001 sur S4
  en("US-A11Y-001");
  const s4 = [];
  for (let i = 0; i < 12; i++) {
    await pa.keyboard.press("Tab");
    const o = await etatFocus(pa);
    s4.push(o);
    expect(o.contour, `contour : ${o.nom}`).toBe(true);
    expect(o.visible, `visible : ${o.nom}`).toBe(true);
    if (o.id === "troncon-0") {
      await capture(pa, "US-A11Y-001-02-m2.png", async () => {
        expect(s4.map((v) => v.i)).toEqual([...s4.map((v) => v.i)].sort((a, b) => a - b));
        return `S4 — depuis le titre, Tab : ${noms(s4).join(" → ")} ; contour visible sur le tronçon focalisé ; le bouton « Retour aux trajets » précède le titre (Maj+Tab)`;
      }, "S4 : Tab parcourt prix perso et tronçons dans l'ordre, contour visible");
    }
    if (o.nom === "Trajets") break;
  }
  expect(s4.at(-1).nom).toBe("Trajets");
  expect(s4.map((v) => v.i)).toEqual([...s4.map((v) => v.i)].sort((a, b) => a - b));
  for (let i = 0; i < s4.length; i++) await pa.keyboard.press("Shift+Tab");
  note("happy", `- ✓ suite complète de S4 : ${noms(s4).join(" → ")} (ordre du DOM, contours et visibilité vérifiés à chaque pas)`);

  // ---------- US-A11Y-003 : Échap replie le tronçon ouvert
  en("US-A11Y-003");
  await pa.locator("#troncon-0").focus();
  await pa.keyboard.press("Enter");
  await expect(pa.locator("#troncon-0")).toHaveAttribute("aria-expanded", "true");
  await capture(pa, "US-A11Y-003-01-m2.png", async () => {
    const d = (await pa.locator("#troncon-0-det").innerText()).replace(/\s+/g, " ");
    return `un tronçon est déplié au clavier : « ${d} »`;
  }, "un tronçon est déplié");
  await pa.keyboard.press("Escape");
  await expect(pa.locator("#troncon-0")).toHaveAttribute("aria-expanded", "false");
  await capture(pa, "US-A11Y-003-02-m2.png", async () => {
    await expect(pa.locator("#troncon-0")).toBeFocused();
    await expect(pa.locator('[data-el="troncon-detail"]:visible')).toHaveCount(0);
    return "Échap : le tronçon se replie, le focus reste sur son bouton";
  }, "Échap ferme le tronçon déplié");
  // mêmes règles ailleurs : éditeur de prix, liste de motorisations (S3) — vérifiées, pas photographiées
  await pa.locator('[data-el="mettre-mon-prix"]').focus();
  await pa.keyboard.press("Enter");
  await expect(pa.locator('[data-el="champ-prix-perso"]')).toBeFocused();
  await pa.keyboard.press("Escape");
  await expect(pa.locator('[data-el="champ-prix-perso"]')).toHaveCount(0);
  await expect(pa.locator('[data-el="mettre-mon-prix"]')).toBeFocused();
  note("edge", "- ✓ Échap ferme aussi l'éditeur « Mettre mon prix » (focus rendu au bouton) ; sur S3, Échap ferme la liste de propositions de lieux et la liste de motorisations (US-3.E4-03, extrait US-A11Y-003)");

  // ---------- US-A11Y-004 sur S4
  en("US-A11Y-004");
  const nomsS4 = await pa.evaluate(() => ({
    cout: document.querySelector("[data-cout]")?.getAttribute("aria-label"),
    prix: document.querySelector('[data-el="prix-perso"] .totem')?.getAttribute("aria-label"),
    retour: document.querySelector('[data-el="retour-trajets"]')?.getAttribute("aria-label"),
    troncons: [...document.querySelectorAll('[data-el="troncons"] button')].map((b) => b.getAttribute("aria-label")),
  }));
  expect(nomsS4.cout).toMatch(/^Coût estimé \d+,\d\d euros$/);
  expect(nomsS4.prix).toMatch(/euros le litre$/);
  expect(nomsS4.retour).toBe("Retour aux trajets");
  expect(nomsS4.troncons.every((t) => /, \d+,\d km, \d+,\d litres$/.test(t))).toBe(true);
  await pa.evaluate(() => document.querySelector(".scroll").scrollTo(0, 0));
  await annoter(pa, `noms lus : « ${nomsS4.cout} » · « ${nomsS4.prix} » · « ${nomsS4.retour} » · « ${nomsS4.troncons[0]} »`, { bas: 70 });
  await capture(pa, "US-A11Y-004-02-m2.png", async () => `S4 : coût annoncé « ${nomsS4.cout} », prix « ${nomsS4.prix} », bouton retour « ${nomsS4.retour} », tronçons « ${nomsS4.troncons.join(" ; ")} » (type, km et litres, sans doublon de lecture) ; le bandeau orange est une annotation de test`, "S4 : chaque prix et chaque tronçon est annoncé en entier");

  // ---------- retour clavier : US-A11Y-002 (focus rendu à l'élément ouvrant)
  en("US-A11Y-002");
  await pa.locator('[data-el="retour-trajets"]').focus();
  await pa.keyboard.press("Enter");
  await expect(pa.locator('[data-screen="S3"]')).toBeVisible();
  await expect(pa.locator("#bouton-calculer")).toBeFocused();
  await capture(pa, "US-A11Y-002-02-m2.png", async () => {
    const o = await etatFocus(pa);
    expect(o.contour).toBe(true);
    return "S4 fermé au clavier (Entrée sur « Retour aux trajets ») : le focus revient sur « Calculer le coût », l'élément qui avait ouvert le résultat, contour visible";
  }, "à la fermeture, le focus revient sur l'élément qui l'a ouvert");
  note("edge", "- ✓ la fiche station (jalon 1) garde ses règles : titre focalisé à l'ouverture, retour du focus, Échap (rejoué par tests/e2e/m1-explore.spec.ts)");
  for (const id of ["US-A11Y-001", "US-A11Y-002", "US-A11Y-003", "US-A11Y-004"]) {
    en(id);
    note("issues", SANS_ISSUE[0]);
    ecrireHistoire(id);
  }
});

histoireDef("US-PERF-001", "US-PERF-001 — Ouverture rapide", async () => {
  async function froid(url, pret) {
    const ctx = await contexte();
    const p = await ctx.newPage();
    const cdp = await ctx.newCDPSession(p);
    await cdp.send("Network.enable");
    await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
    await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 85, downloadThroughput: (9 * 1024 * 1024) / 8, uploadThroughput: (1.5 * 1024 * 1024) / 8 });
    const t0 = Date.now();
    await p.goto(url, { waitUntil: "commit" });
    const t1 = Date.now() - t0;
    await pret(p);
    return { ctx, p, t0, t1, t: Date.now() - t0 };
  }
  // mesures de contrôle (non photographiées) : l'écran Prix du jalon 1
  const prix = await froid(`${URL_APP}/`, (p) => p.locator('[data-el="ligne-station"]').first().waitFor({ timeout: 20000 }));
  note("edge", `- ✓ contrôle : l'écran Prix (jalon 1) affiche sa liste en ${prix.t} ms en 4G simulée, session neuve`);
  await prix.ctx.close();
  // l'écran du jalon : Trajets (formulaire + historique + liste des marques), identité neuve, cache vide
  const ctx = await contexte();
  const p = await ctx.newPage();
  const cdp = await ctx.newCDPSession(p);
  await cdp.send("Network.enable");
  await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
  await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 85, downloadThroughput: (9 * 1024 * 1024) / 8, uploadThroughput: (1.5 * 1024 * 1024) / 8 });
  const t0 = Date.now();
  await p.goto(`${URL_APP}/trajets`, { waitUntil: "commit" });
  const t1 = Date.now() - t0;
  await annoter(p, `4G simulée (9 Mbit/s, 85 ms), cache vide, identité neuve : navigation lancée, t = ${t1} ms`);
  await capture(p, "US-PERF-001-01-m2.png", async () => `navigation vers /trajets lancée en 4G simulée, cache désactivé, t=${t1} ms`, "j'ouvre l'appli sur l'écran Trajets (4G simulée)");
  await attendreFormulaire(p);
  const t = Date.now() - t0;
  await annoter(p, `formulaire, liste des marques et historique prêts en ${t} ms (budget 2 500 ms)`);
  await capture(p, "US-PERF-001-02-m2.png", async () => {
    expect(t).toBeLessThan(2500);
    await expect(p.locator('[data-el="historique-vide"]')).toBeVisible();
    return `Trajets prêt (formulaire, ${await p.locator("#voiture-marque").innerText()}, historique chargé) en ${t} ms < 2 500 ms ; l'écran Prix mesuré à côté : ${prix.t} ms`;
  }, "l'écran est utilisable en moins de 2,5 s");
  await ctx.close();
  note("issues", SANS_ISSUE[0]);
});

// ================================================================= EXÉCUTION
const ORDRE = HISTOIRES.filter((h) => !FILTRE.length || FILTRE.some((f) => h.id.startsWith(f) || (h.id === "TRANSVERSES" && /A11Y|TRANS/.test(f))));
for (const h of ORDRE) {
  try {
    if (h.id !== "TRANSVERSES") histoire(h.id, h.titre);
    await h.f();
  } catch (e) {
    if (blocs.has(courante)) note("issues", `- ✗ erreur d'exploration : ${String(e.message).split("\n").slice(0, 3).join(" ")}`);
    console.log("ERREUR", h.id, String(e.message).split("\n").slice(0, 3).join(" "));
  }
  if (h.id === "TRANSVERSES") for (const id of [...blocs.keys()]) ecrireHistoire(id);
  else for (const id of [...blocs.keys()]) ecrireHistoire(id);
  console.log(h.id, "—", resultats.filter((r) => r.ok).length, "/", resultats.length, "captures OK (cumul)");
}
await navigateur.close();

// ---- contrôle des doublons d'octets et des noms attendus
const attenduFichiers = fs.readdirSync(LIVRAISON).filter((f) => /^US-(3|4)\..*\.png$|^US-(A11Y|PERF)-.*-m2\.png$/.test(f));
const md5 = new Map();
for (const f of attenduFichiers) {
  const h = crypto.createHash("md5").update(fs.readFileSync(path.join(LIVRAISON, f))).digest("hex");
  md5.set(h, [...(md5.get(h) ?? []), f]);
}
const doublons = [...md5.values()].filter((l) => l.length > 1);
const ko = resultats.filter((r) => !r.ok);
console.log(`TOTAL ${resultats.length} captures écrites, ${ko.length} en échec`, ko.map((r) => r.nom));
console.log(`fichiers M2 présents : ${attenduFichiers.length} ; groupes d'octets identiques : ${doublons.length}`, doublons);
if (avertissements.length) console.log("AVERTISSEMENTS", [...new Set(avertissements)]);
fs.appendFileSync(JOURNAL, `\n## Contrôles de fin de passe\n\n- Captures écrites : ${resultats.length} ; en échec : ${ko.length}${ko.length ? ` (${ko.map((r) => r.nom).join(", ")})` : ""}.\n- Fichiers M2 présents dans delivery/ : ${attenduFichiers.length} ; doublons d'octets (md5) : ${doublons.length ? doublons.map((d) => d.join(" = ")).join(" ; ") : "aucun"}.\n- Erreurs console / page observées pendant la passe : ${avertissements.length ? [...new Set(avertissements)].join(" ; ") : "aucune"}.\n`);
