// Exploration du jalon 4 sur l'appli DÉPLOYÉE (données réelles), avec la bibliothèque Playwright.
// Chaque étape : action réelle → assertions sur le DOM (textes, nombres) → page.screenshot sous le nom EXACT du plan
// (tests/e2e/delivery/) puis une seconde prise de vue brute (tests/e2e/exploration/m4-captures-brutes/) : deux vraies captures.
// SEULE simulation : la géolocalisation, rejouée depuis tests/e2e/fixtures/albi-toulouse.gpx, un point par seconde d'horloge réelle.
// Usage : node tests/e2e/exploration/run-m4.mjs [court|long|tout]   (court : US-6.E1, 6.E2, 3.9, 1.9 ; long : le trajet complet, ≈ 75 min)
import { chromium } from "playwright";
import { expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import {
  LONDRES, OPTIONS_CONTEXTE, env, RACINE, URL_APP, S6, accorderVerrouEcran, arreterEtAttendre, attendreFormulaire, attendreFinRejeu, champ, choisirVoiture, demarrerRejeu,
  indexAuKm, lancerEnregistrement, lireDirect, lireGpx, lireResultat, nombreFr, ouvrirTrajets, propositions, rest, session, trajetsDeLaPage, virgule,
} from "./m4-aides.mjs";

const ICI = path.dirname(new URL(import.meta.url).pathname);
const MODE = process.argv[2] ?? "tout";
const LIVRAISON = path.join(RACINE, "tests/e2e/delivery");
const BRUTES = path.join(ICI, "m4-captures-brutes");
const JOURNAL = path.join(ICI, "m4-exploration-log.md");
fs.mkdirSync(LIVRAISON, { recursive: true });
fs.mkdirSync(BRUTES, { recursive: true });
const PTS = lireGpx();
const navigateur = await chromium.launch();
const contexte = (opts = {}) => navigateur.newContext({ ...OPTIONS_CONTEXTE, ...opts });
const md5 = (b) => crypto.createHash("md5").update(b).digest("hex");
const heure = () => new Date().toISOString().slice(11, 19) + "Z";

// ---------------------------------------------------------------- journal : une section par histoire, écrite dès que l'histoire est finie
const blocs = new Map();
function histoire(id, titre) {
  blocs.set(id, { titre, etapes: [], issues: [], n: 0 });
}
function ecrireHistoire(id) {
  const b = blocs.get(id);
  const t = `\n## ${b.titre}\n\n### Happy Path\n${b.etapes.join("\n")}\n\n### Issues Found\n${b.issues.length ? b.issues.join("\n") : "- aucune sur la version déployée à cette passe."}\n`;
  fs.appendFileSync(JOURNAL, t);
  blocs.delete(id);
  console.log(`[${heure()}] journal : ${b.titre} écrite (${b.etapes.length} étapes)`);
}
const avertissements = [];
function surveiller(page, etiquette) {
  page.on("pageerror", (e) => avertissements.push(`${etiquette} : erreur de page « ${e.message.slice(0, 160)} »`));
  page.on("console", (m) => {
    if (m.type() === "error" && !/favicon|Failed to load resource.*(40[0-9]|422|429)/.test(m.text())) avertissements.push(`${etiquette} : console.error « ${m.text().slice(0, 160)} »`);
  });
}
const resultats = [];
/** Une étape : assertions (verif rend le constat), puis capture brute + capture livrée, md5 de chacune. */
async function etape(id, page, nom, action, verif, { cible } = {}) {
  const b = blocs.get(id);
  b.n++;
  let ok = true;
  let constat = "";
  try {
    constat = (await verif()) ?? "";
  } catch (e) {
    ok = false;
    constat = String(e.message).split("\n").slice(0, 3).join(" ");
    b.issues.push(`- Step ${b.n} (${nom}) : ${constat}`);
  }
  if (cible) await page.locator(cible).first().scrollIntoViewIfNeeded().catch(() => {});
  await page.waitForTimeout(250);
  const brute = await page.screenshot();
  const liv = await page.screenshot();
  fs.writeFileSync(path.join(BRUTES, nom), brute);
  fs.writeFileSync(path.join(LIVRAISON, nom), liv);
  resultats.push({ nom, ok, liv: md5(liv), brute: md5(brute) });
  b.etapes.push(`- Step ${b.n}: ${action} → ${constat} → capture \`${nom}\` ${ok ? "✓" : "✗"} (${heure()}, md5 livrée ${md5(liv).slice(0, 8)}, brute ${md5(brute).slice(0, 8)})`);
  console.log(`[${heure()}] ${ok ? "✓" : "✗"} ${nom} — ${constat}`);
  return ok;
}
const attendreJusqua = async (r, i) => {
  while (r.index < i && !r.fini) await new Promise((x) => setTimeout(x, 250));
};

if (!fs.existsSync(JOURNAL)) {
  fs.writeFileSync(JOURNAL, `# Jalon 4 — Enregistrer en roulant et Royaume-Uni : journal d'exploration\n\nAppli déployée ${URL_APP}, Supabase réel, bibliothèque Playwright (Chromium headless 390 × 844, fr-FR, Europe/Paris).\nSeule simulation : la géolocalisation du navigateur, rejouée point par point (context.setGeolocation, 1 par seconde d'horloge réelle, rejeu non accéléré : l'appli calcule les vitesses sur l'horodatage des positions) depuis \`tests/e2e/fixtures/albi-toulouse.gpx\` — vrai itinéraire routier Valhalla Albi → Toulouse densifié à 1 point/s (fabrication en tête du fichier). Calcul, recalage, péages, géocodage, prix : vrais services.\nVerrou d'écran : Chromium piloté refuse la permission « screen-wake-lock » par défaut ; elle est accordée au contexte par CDP (Browser.grantPermissions), comme Chrome mobile l'accorde à une page visible (sonde \`sondes/m4-sonde-wakelock.mjs\`).\n`);
}
fs.appendFileSync(JOURNAL, `\n---\n\n# Passage ${MODE} — début ${new Date().toISOString()}\n`);

// ================================================================= histoires courtes
async function courtes() {
  // ---------------------------------------------------------------- US-6.E1 : vrai refus du navigateur (contexte SANS permission de géolocalisation)
  histoire("US-6.E1", "US-6.E1 — Localisation refusée");
  {
    const C = await navigateur.newContext({ ...OPTIONS_CONTEXTE, permissions: [] });
    const p = await C.newPage();
    surveiller(p, "E1");
    await ouvrirTrajets(p);
    await choisirVoiture(p);
    const avant = (await trajetsDeLaPage(p)).length;
    await etape("US-6.E1", p, "US-6.E1-01-avant.png", "écran Trajets, voiture Peugeot 208 choisie, contexte sans permission de localisation", async () => {
      await expect(p.locator('[data-el="bouton-enregistrer"]')).toHaveText(/Enregistrer en roulant/);
      return `bouton « Enregistrer en roulant » visible ; ${avant} trajet(s) en base pour cette session`;
    }, { cible: '[data-el="bouton-enregistrer"]' });
    await p.locator('[data-el="bouton-enregistrer"]').click();
    await etape("US-6.E1", p, "US-6.E1-02-apres.png", "« Enregistrer en roulant », le navigateur refuse la localisation (PERMISSION_DENIED réel)", async () => {
      const m = p.locator('[data-el="localisation-refusee"]');
      await expect(m).toBeVisible({ timeout: 15000 });
      await expect(m).toContainText("L'enregistrement a besoin de ta localisation");
      await expect(m).toContainText("Position");
      await expect(m).toContainText("Autoriser");
      await expect(S6(p)).toHaveCount(0);
      const stock = await p.evaluate(() => localStorage.getItem("pt-en-route"));
      expect(stock).toBeNull();
      const apres = (await trajetsDeLaPage(p)).length;
      expect(apres).toBe(avant);
      return `message « ${(await m.innerText()).replace(/\s+/g, " ").slice(0, 120)}… » ; aucun écran En route ; rien dans le téléphone (pt-en-route absent) ; trajets en base ${avant} → ${apres}`;
    }, { cible: '[data-el="localisation-refusee"]' });
    await C.close();
    ecrireHistoire("US-6.E1");
  }

  // ---------------------------------------------------------------- US-6.E2 : enregistrement de moins de 1 km
  histoire("US-6.E2", "US-6.E2 — Trajet trop court");
  {
    const C = await contexte({ geolocation: { latitude: PTS[0].lat, longitude: PTS[0].lon } });
    const p = await C.newPage();
    surveiller(p, "E2");
    await ouvrirTrajets(p);
    await accorderVerrouEcran(C, p);
    await choisirVoiture(p);
    const avant = (await trajetsDeLaPage(p)).length;
    await lancerEnregistrement(p);
    const r = demarrerRejeu(C, PTS, { debut: 0, fin: 40 });
    await attendreFinRejeu(r);
    await p.waitForTimeout(1500);
    const d = await lireDirect(p);
    await etape("US-6.E2", p, "US-6.E2-01-avant.png", `enregistrement de ${r.envoyes} positions (40 s du GPX, départ place du Vigan)`, async () => {
      expect(d.km).toBeLessThan(1);
      expect(d.etat).toBe("enregistrement");
      return `En route : ${virgule(d.km, 1)} km, ${virgule(d.litres, 2)} L, ${d.duree}, vitesse ${d.vitesse} km/h`;
    });
    await arreterEtAttendre(p);
    await etape("US-6.E2", p, "US-6.E2-02-apres.png", "« Arrêter et voir le coût »", async () => {
      const m = p.locator('[data-el="trajet-trop-court"]');
      await expect(m).toBeVisible();
      await expect(m).toContainText("Trajet trop court pour être calculé");
      await expect(m).toContainText("Rien n'a été ajouté à l'historique");
      const apres = (await trajetsDeLaPage(p)).length;
      expect(apres).toBe(avant);
      expect(await p.evaluate(() => localStorage.getItem("pt-en-route"))).toBeNull();
      return `« ${(await m.innerText()).replace(/\s+/g, " ").slice(0, 140)} » ; trajets en base ${avant} → ${apres} ; points effacés du téléphone`;
    });
    await C.close();
    ecrireHistoire("US-6.E2");
  }

  // ---------------------------------------------------------------- US-3.9 : Albi → Londres
  histoire("US-3.9", "US-3.9 — Aller au Royaume-Uni");
  {
    const C = await contexte();
    const p = await C.newPage();
    surveiller(p, "UK");
    await ouvrirTrajets(p);
    await choisirVoiture(p);
    const dep = champ(p, "depart");
    await dep.click();
    await dep.pressSequentially("Albi", { delay: 40 });
    const oDep = propositions(p, "depart").filter({ hasText: "Albi" }).first();
    await expect(oDep).toBeVisible({ timeout: 20000 });
    await oDep.click();
    const arr = champ(p, "arrivee");
    await arr.click();
    await arr.pressSequentially("Londres", { delay: 40 });
    const oArr = propositions(p, "arrivee").filter({ hasText: "Royaume-Uni" }).first();
    await etape("US-3.9", p, "US-3.9-01-avant.png", "départ Albi, « Londres » tapé dans le champ arrivée", async () => {
      await expect(oArr).toBeVisible({ timeout: 20000 });
      return `proposition « ${(await oArr.innerText()).replace(/\s+/g, " ")} »`;
    }, { cible: '[data-el="champ-arrivee"]' });
    await oArr.click();
    await p.locator("#bouton-calculer").click();
    await expect(p.locator('[data-screen="S4"][data-etat="ok"]')).toBeVisible({ timeout: 90000 });
    const gb = p.locator('[data-el="pays-traverses"] [data-pays="GB"]');
    await etape("US-3.9", p, "US-3.9-02-apres.png", "Londres choisi, « Calculer le coût »", async () => {
      const res = await lireResultat(p);
      await expect(gb).toBeVisible();
      const ligneGb = (await gb.innerText()).replace(/\s+/g, " ");
      const moy = await fetch(`${env.VITE_SUPABASE_URL}/rest/v1/rpc/moyennes_par_pays`, { method: "POST", headers: { apikey: env.VITE_SUPABASE_ANON_KEY, "Content-Type": "application/json" }, body: JSON.stringify({ p_carburant: "SP95-E10" }) }).then((x) => x.json());
      const gbMoy = moy.find((x) => x.pays === "GB");
      expect(gbMoy.source).toBe("flux");
      expect(ligneGb).toContain(virgule(Number(gbMoy.prix_moyen), 3));
      expect(ligneGb).toContain("stations");
      await expect(p.locator('[data-el="manche-non-comptee"]')).toContainText("Traversée de la Manche (tunnel ou ferry) non comptée");
      const peages = (await p.locator('[data-el="detail-peages"]').innerText()).replace(/\s+/g, " ");
      expect(peages).not.toMatch(/Eurotunnel/i);
      const dartford = /Dartford/i.test(peages);
      return `${res.route} : ${res.km} km, ${virgule(res.cout, 2)} € ; ligne pays « ${ligneGb.slice(0, 150)} » = moyenne du jour GB ${gbMoy.prix_moyen} €/L (${gbMoy.nb_stations} stations, ${gbMoy.jour}) ; note Manche affichée ; péages « ${peages.slice(0, 160)} » ; Eurotunnel absent ; Dartford ${dartford ? "présent" : "absent (non franchi par cet itinéraire)"}`;
    }, { cible: '[data-el="manche-non-comptee"]' });
    await C.close();
    ecrireHistoire("US-3.9");
  }

  // ---------------------------------------------------------------- US-1.9 : stations britanniques autour de Londres
  histoire("US-1.9", "US-1.9 — Stations au Royaume-Uni");
  {
    const C = await contexte({ geolocation: LONDRES });
    const p = await C.newPage();
    surveiller(p, "Londres");
    await p.goto(`${URL_APP}/trajets`);
    await attendreFormulaire(p);
    await etape("US-1.9", p, "US-1.9-01-avant.png", "navigateur géolocalisé à Londres (51,507 N ; 0,128 O), onglet Trajets ouvert", async () => {
      await expect(champ(p, "depart")).toBeVisible();
      return "position émulée : Londres ; onglet Prix pas encore ouvert";
    });
    await p.getByRole("tab", { name: "Prix" }).click();
    const lignes = p.locator('[data-el="ligne-station"]');
    await expect(lignes.first()).toBeVisible({ timeout: 30000 });
    const premier = lignes.first();
    const id = await premier.getAttribute("data-station");
    await premier.click();
    const fiche = p.locator('[data-el="fiche-station"]');
    await expect(fiche).toBeVisible();
    await expect(fiche.locator('[data-el="prix-origine"]')).toBeVisible({ timeout: 15000 });
    await expect(fiche.locator('[data-el="cours-du-jour"]')).toBeVisible({ timeout: 15000 });
    await etape("US-1.9", p, "US-1.9-02-apres.png", "onglet Prix, puis la première station de la liste (fiche)", async () => {
      const n = await lignes.count();
      expect(id).toMatch(/^GB-/);
      const pastilles = Number(await p.locator('[data-el="carte-stations"]').getAttribute("data-pastilles"));
      expect(pastilles).toBeGreaterThan(5);
      const base = await rest(`prix?select=carburant,prix,prix_origine,unite_origine&station_id=eq.${id}`);
      const cours = await rest("cours_change?select=taux,jour&monnaie=eq.GBP");
      const e10 = base.find((x) => x.carburant === "SP95-E10");
      const orig = fiche.locator('[data-el="prix-origine"] [data-carburant="SP95-E10"]');
      await expect(orig).toContainText(`${virgule(Number(e10.prix_origine), 1)} p/L`);
      expect(Number(e10.prix)).toBeCloseTo(Number(e10.prix_origine) / 100 / Number(cours[0].taux), 3);
      const t = (await fiche.locator('[data-el="cours-du-jour"]').innerText()).replace(/\s+/g, " ");
      expect(t).toContain(virgule(Number(cours[0].taux), 4));
      return `${n} stations britanniques dans la liste, ${pastilles} pastilles ; ${id} : SP95-E10 ${virgule(Number(e10.prix), 3)} €/L = ${e10.prix_origine} p/L ÷ 100 ÷ ${cours[0].taux} ; fiche : « ${(await fiche.locator('[data-el="prix-origine"]').innerText()).replace(/\s+/g, " ").slice(0, 200)} »`;
    }, { cible: '[data-el="prix-origine"]' });
    await C.close();
    ecrireHistoire("US-1.9");
  }
}


/** US-6.2 sur le début du trajet (départ place du Vigan → après le feu rouge de 1,2 km). */
async function suivreEnDirect(p, r) {
  histoire("US-6.2", "US-6.2 — Suivre en direct");
  const d0 = await lireDirect(p);
  await etape("US-6.2", p, "US-6.2-01-avant.png", "enregistrement en cours depuis quelques secondes", async () => {
    expect(d0.km).toBeLessThan(0.2);
    return `départ : ${virgule(d0.km, 1)} km, ${virgule(d0.litres, 2)} L, ${d0.euros == null ? "—" : virgule(d0.euros, 2)} €, durée ${d0.duree}, ${d0.arrets} arrêt, L/100 ${d0.l100 ?? "—"}`;
  });
  // rafraîchissement : vitesse et courbe relevées chaque seconde pendant 8 s
  await attendreJusqua(r, 200);
  const releves = [];
  for (let k = 0; k < 8; k++) {
    const d = await lireDirect(p);
    releves.push([d.vitesse, d.courbe, d.km, d.chemin]);
    await p.waitForTimeout(1000);
  }
  await attendreJusqua(r, 345); // après le feu rouge (arrêt de 40 s à 1,2 km)
  await p.waitForTimeout(1000);
  await etape("US-6.2", p, "US-6.2-02-apres.png", "je roule (1,2 km dans Albi, feu rouge compris)", async () => {
    const d = await lireDirect(p);
    const chemins = releves.map((x) => x[3]);
    const changements = chemins.slice(1).filter((c, k) => c !== chemins[k]).length; // tracé de la courbe redessiné
    expect(changements).toBeGreaterThanOrEqual(3); // nouvelle valeur de courbe au moins toutes les 2 s
    expect(d.km).toBeGreaterThan(d0.km);
    expect(d.litres).toBeGreaterThan(d0.litres);
    expect(d.euros).toBeGreaterThan(0);
    expect(d.arrets).toBeGreaterThanOrEqual(1);
    expect(d.l100).not.toBeNull();
    const prix = (await p.locator('[data-el="prix-direct"]').innerText()).replace(/\s+/g, " ");
    const fr = Number((await rest("moyennes_nationales?select=prix_moyen&pays=eq.FR&carburant=eq.SP95-E10&order=jour.desc&limit=1"))[0].prix_moyen);
    expect(prix).toContain(virgule(fr, 3));
    expect(d.euros).toBeCloseTo(d.litres * fr, 1);
    return `relevés 1/s (vitesse km/h / points de courbe / km) : ${releves.map((x) => x.slice(0, 3).join("/")).join(" ; ")} → courbe renouvelée ${changements} fois en 7 s ; maintenant ${d.vitesse} km/h, ${virgule(d.km, 1)} km, ${virgule(d.litres, 2)} L, ${virgule(d.euros, 2)} €, ${d.duree}, ${d.arrets} arrêt(s), ${virgule(d.l100, 1)} L/100 ; « ${prix} » (moyenne FR du jour ${fr})`;
  });
  ecrireHistoire("US-6.2");
}

// ================================================================= le trajet complet Albi → Toulouse (≈ 73 min de rejeu)
async function long() {
  const C = await contexte({ geolocation: { latitude: PTS[0].lat, longitude: PTS[0].lon } });
  const p = await C.newPage();
  surveiller(p, "trajet");
  await ouvrirTrajets(p);
  await accorderVerrouEcran(C, p);
  await choisirVoiture(p);

  histoire("US-6.1", "US-6.1 — Enregistrer en roulant");
  await etape("US-6.1", p, "US-6.1-01-avant.png", "écran Trajets, voiture Peugeot 208 (101ch) mécanique choisie, position place du Vigan à Albi", async () => {
    await expect(p.locator('[data-el="voiture-memorisee"]')).toBeVisible();
    await expect(p.locator('[data-el="bouton-enregistrer"]')).toHaveText(/Enregistrer en roulant/);
    return "bouton « Enregistrer en roulant » sous « Calculer le coût »";
  }, { cible: '[data-el="bouton-enregistrer"]' });
  await lancerEnregistrement(p);
  const r = demarrerRejeu(C, PTS, { debut: 1 });
  await p.waitForTimeout(3000);
  await etape("US-6.1", p, "US-6.1-02-apres.png", "« Enregistrer en roulant », localisation autorisée", async () => {
    const d = await lireDirect(p);
    expect(d.indicateur).toBe("Enregistrement");
    expect(d.voiture).toContain("Peugeot 208");
    expect(d.voiture).toContain("SP95-E10");
    const stock = await p.evaluate(() => JSON.parse(localStorage.getItem("pt-en-route") || "null"));
    expect(stock?.points?.length).toBeGreaterThan(1);
    return `écran En route ouvert ; indicateur « ${d.indicateur} » ; voiture « ${d.voiture} » ; ${stock.points.length} positions déjà gardées sur le téléphone`;
  });
  ecrireHistoire("US-6.1");

  await suivreEnDirect(p, r);

  histoire("US-6.3", "US-6.3 — Garder l'écran allumé");
  await etape("US-6.3", p, "US-6.3-01-avant.png", "enregistrement en cours", async () => {
    const d = await lireDirect(p);
    return `verrou d'écran : ${d.verrou} ; ${virgule(d.km, 1)} km`;
  }, { cible: '[data-el="ecran-allume"]' });
  await p.waitForTimeout(60000); // le téléphone reste posé, aucune action
  await etape("US-6.3", p, "US-6.3-02-apres.png", "téléphone posé 60 s sans toucher l'écran", async () => {
    const d = await lireDirect(p);
    expect(d.verrou).toBe("actif");
    const vis = await p.evaluate(() => document.visibilityState);
    expect(vis).toBe("visible");
    await expect(p.locator('[data-el="ecran-allume"]')).toContainText("L'écran reste allumé pendant l'enregistrement");
    return `verrou d'écran « actif » (navigator.wakeLock.request("screen") accordé, non relâché après 60 s) ; page « ${vis} » ; texte « L'écran reste allumé pendant l'enregistrement »`;
  }, { cible: '[data-el="ecran-allume"]' });

  histoire("US-6.4", "US-6.4 — Mettre en pause");
  await attendreJusqua(r, 490); // arrêté à la station-service (483 → 662 s)
  await etape("US-6.4", p, "US-6.4-01-avant.png", "arrêt à la station-service (2,5 km), enregistrement en cours", async () => {
    const d = await lireDirect(p);
    expect(d.indicateur).toBe("Enregistrement");
    await expect(p.locator('[data-el="bouton-pause"]')).toHaveText("Pause");
    return `${virgule(d.km, 2)} km, ${virgule(d.litres, 2)} L, vitesse ${d.vitesse} km/h`;
  });
  await p.locator('[data-el="bouton-pause"]').click();
  const pause0 = await lireDirect(p);
  const pos0 = r.envoyes;
  await attendreJusqua(r, 690); // la voiture repart de la station pendant la pause : 28 s de positions qui avancent
  await etape("US-6.4", p, "US-6.4-02-apres.png", "« Pause » (la pause dure ~3 min ; la voiture repart avant « Reprendre »)", async () => {
    const d = await lireDirect(p);
    expect(d.indicateur).toBe("En pause");
    expect(d.etat).toBe("pause");
    expect(d.km).toBe(pause0.km);
    expect(d.litres).toBe(pause0.litres);
    await expect(p.locator('[data-el="bouton-pause"]')).toHaveText("Reprendre");
    return `indicateur « En pause » ; ${r.envoyes - pos0} positions reçues pendant la pause dont ~28 s de route : km ${virgule(pause0.km, 2)} → ${virgule(d.km, 2)}, litres ${virgule(pause0.litres, 2)} → ${virgule(d.litres, 2)} (inchangés) ; bouton « Reprendre »`;
  });
  await p.locator('[data-el="bouton-pause"]').click();
  await p.waitForTimeout(12000);
  {
    const d = await lireDirect(p);
    const b = blocs.get("US-6.4");
    const ok = d.indicateur === "Enregistrement" && d.km > pause0.km;
    b.etapes.push(`- Step 3: « Reprendre » puis 12 s de route → indicateur « ${d.indicateur} », km ${virgule(pause0.km, 2)} → ${virgule(d.km, 2)} (le trajet fait pendant la pause n'est pas compté) → vérification DOM ${ok ? "✓" : "✗"} (pas de capture prévue au plan)`);
    if (!ok) b.issues.push("- Step 3 : la reprise n'a pas relancé le compteur");
  }
  ecrireHistoire("US-6.4");

  histoire("US-6.E3", "US-6.E3 — Reprendre après fermeture");
  await attendreJusqua(r, 900);
  await etape("US-6.E3", p, "US-6.E3-01-avant.png", "enregistrement en cours (≈ 6 km)", async () => {
    const d = await lireDirect(p);
    return `${virgule(d.km, 1)} km, ${virgule(d.litres, 2)} L, ${d.duree}`;
  });
  const avantReload = await lireDirect(p);
  await p.reload();
  await expect(p.locator('[data-el="reprise-enregistrement"]')).toBeVisible({ timeout: 20000 });
  await etape("US-6.E3", p, "US-6.E3-02-apres.png", "la page est rechargée (page.reload())", async () => {
    const t = (await p.locator('[data-el="reprise-enregistrement"]').innerText()).replace(/\s+/g, " ");
    expect(t).toContain("Un enregistrement est en cours");
    const km = nombreFr(/([\d,]+) km déjà enregistrés/.exec(t)[1]);
    expect(Math.abs(km - avantReload.km)).toBeLessThanOrEqual(0.2);
    await expect(p.locator('[data-el="reprendre-enregistrement"]')).toBeVisible();
    await expect(p.locator('[data-el="arreter-enregistrement"]')).toBeVisible();
    return `« ${t.slice(0, 160)} » ; km avant rechargement ${virgule(avantReload.km, 1)} ; boutons « Reprendre l'enregistrement » et « Arrêter et voir le coût »`;
  }, { cible: '[data-el="reprise-enregistrement"]' });
  await accorderVerrouEcran(C, p);
  await p.locator('[data-el="reprendre-enregistrement"]').click();
  await expect(S6(p)).toBeVisible();
  await p.waitForTimeout(5000);
  {
    const d = await lireDirect(p);
    const b = blocs.get("US-6.E3");
    const ok = d.km >= avantReload.km && d.indicateur === "Enregistrement";
    b.etapes.push(`- Step 3: « Reprendre l'enregistrement » → écran En route, ${virgule(d.km, 1)} km (≥ ${virgule(avantReload.km, 1)} avant rechargement), indicateur « ${d.indicateur} » → vérification DOM ${ok ? "✓" : "✗"} (pas de capture prévue au plan)`);
    if (!ok) b.issues.push("- Step 3 : la reprise n'a pas conservé la distance");
  }
  ecrireHistoire("US-6.E3");

  // GPS perdu sur l'A68 (≈ 20 km, 105 km/h)
  await attendreJusqua(r, 1394);
  await etape("US-6.3", p, "US-6.3-03-avant.png", "enregistrement en cours sur l'autoroute (≈ 20 km)", async () => {
    const d = await lireDirect(p);
    return `${d.vitesse} km/h, ${virgule(d.km, 1)} km`;
  });
  r.couper();
  await p.waitForTimeout(1500);
  const coupe = await lireDirect(p);
  await p.waitForTimeout(16500);
  await etape("US-6.3", p, "US-6.3-04-apres.png", "plus aucune position pendant 18 s (rejeu coupé, la voiture avance toujours)", async () => {
    const g = p.locator('[data-el="gps-perdu"]');
    await expect(g).toBeVisible();
    await expect(g).toContainText("GPS perdu");
    const d = await lireDirect(p);
    expect(d.km).toBe(coupe.km);
    expect(d.etat).toBe("gps-perdu");
    return `« ${(await g.innerText()).replace(/\s+/g, " ")} » ; distance figée ${virgule(coupe.km, 1)} → ${virgule(d.km, 1)} km`;
  });
  r.retablir();
  await p.waitForTimeout(6000);
  {
    const d = await lireDirect(p);
    const b = blocs.get("US-6.3");
    const ok = d.km > coupe.km && (await p.locator('[data-el="gps-perdu"]').count()) === 0;
    b.etapes.push(`- Step 5: retour du signal (rejeu rétabli) → bandeau « GPS perdu » retiré, distance ${virgule(coupe.km, 1)} → ${virgule(d.km, 1)} km → vérification DOM ${ok ? "✓" : "✗"} (pas de capture prévue au plan)`);
    if (!ok) b.issues.push("- Step 5 : le retour du signal n'a pas relancé la distance");
  }
  ecrireHistoire("US-6.3");

  // arrivée à Toulouse
  await attendreFinRejeu(r);
  await p.waitForTimeout(2000);
  histoire("US-6.5", "US-6.5 — Arrêter et voir le coût");
  const fin = await lireDirect(p);
  const avant = (await trajetsDeLaPage(p)).length;
  await etape("US-6.5", p, "US-6.5-01-avant.png", `arrivée au Capitole de Toulouse (${r.envoyes} positions envoyées en ${Math.round(r.dureeS() / 60)} min)`, async () => {
    expect(fin.km).toBeGreaterThan(1);
    return `${virgule(fin.km, 1)} km, ${virgule(fin.litres, 2)} L, ${fin.euros == null ? "—" : virgule(fin.euros, 2)} €, ${fin.duree}, ${fin.arrets} arrêts, ${fin.l100 == null ? "—" : virgule(fin.l100, 1)} L/100`;
  });
  await arreterEtAttendre(p);
  await etape("US-6.5", p, "US-6.5-02-apres.png", "« Arrêter et voir le coût »", async () => {
    const res = await lireResultat(p);
    expect(res.route).toMatch(/ALBI → TOULOUSE · ENREGISTRÉ/i);
    expect(res.km).toBeGreaterThan(70);
    expect(res.litres).toBeGreaterThan(2);
    expect(res.cout).toBeGreaterThan(5);
    const types = await p.locator('[data-el="troncons"] [data-troncon]').evaluateAll((l) => l.map((x) => x.getAttribute("data-troncon")));
    expect(types).toContain("autoroute");
    expect(types).toContain("ville");
    const pays = await p.locator('[data-el="pays-traverses"] [data-pays]').evaluateAll((l) => l.map((x) => x.getAttribute("data-pays")));
    expect(pays).toEqual(["FR"]);
    const peages = (await p.locator('[data-el="detail-peages"]').innerText()).replace(/\s+/g, " ");
    return `titre « ${res.route} » (géocodage inverse) ; ${virgule(res.cout, 2)} €, ${res.litres} L, ${res.km} km, ${res.l100} L/100 ; péages « ${peages.slice(0, 140)} » ; pays ${pays.join(",")} ; tronçons ${types.join(", ")}`;
  });
  await etape("US-6.5", p, "US-6.5-03-avant.png", "ce résultat, descendu jusqu'aux péages et aux tronçons", async () => {
    const t = (await p.locator('[data-el="troncons"]').innerText()).replace(/\s+/g, " ");
    return `tronçons « ${t.slice(0, 200)} »`;
  }, { cible: '[data-el="troncons"]' });
  await p.locator('[data-el="retour-trajets"]').click();
  await expect(p.locator('[data-screen="S3"]')).toBeVisible();
  await etape("US-6.5", p, "US-6.5-04-apres.png", "← Trajets", async () => {
    const l = p.locator('[data-el="ligne-historique"]');
    await expect(l).toContainText("Albi → Toulouse");
    await expect(l).toContainText("enregistré");
    const base = await trajetsDeLaPage(p);
    expect(base.length).toBe(avant + 1);
    expect(base[0].enregistre).toBe(true);
    expect(base[0].depart_label).toBe("Albi");
    expect(base[0].arrivee_label).toBe("Toulouse");
    return `1re ligne de l'historique « ${(await l.innerText()).replace(/\s+/g, " ")} » ; en base (RLS) : ${avant} → ${base.length} trajets, le plus récent Albi → Toulouse, enregistre = true, ${base[0].km} km`;
  }, { cible: '[data-el="historique"]' });
  ecrireHistoire("US-6.5");

  histoire("US-6.6", "US-6.6 — Voir ma courbe de vitesse");
  await p.locator('[data-el="ligne-historique"]').click();
  await expect(p.locator('[data-screen="S4"][data-etat="ok"]')).toBeVisible({ timeout: 30000 });
  await etape("US-6.6", p, "US-6.6-01-avant.png", "le trajet enregistré, rouvert depuis l'historique", async () => {
    const res = await lireResultat(p);
    expect(res.route).toMatch(/· ENREGISTRÉ/i);
    return `« ${res.route} » ${virgule(res.cout, 2)} €`;
  });
  await etape("US-6.6", p, "US-6.6-02-apres.png", "je regarde le bloc « Ma vitesse enregistrée »", async () => {
    const b = p.locator('[data-el="courbe-vitesse"]');
    await expect(b).toBeVisible();
    await expect(b).toContainText("Ma vitesse enregistrée");
    const info = p.locator('[data-el="vitesse-info"]');
    const moy = Number(await info.getAttribute("data-moy"));
    const acc = Number(await info.getAttribute("data-acc"));
    expect(moy).toBeGreaterThan(40);
    expect(acc).toBeGreaterThan(0);
    const n = Number(await b.locator("svg").getAttribute("data-points"));
    expect(n).toBeGreaterThan(300);
    await expect(p.locator('[data-el="note-roule"]')).toContainText("Calcul sur ta vitesse réelle");
    return `« ${(await info.innerText())} » ; courbe de ${n} points (tout le trajet) ; note « Calcul sur ta vitesse réelle, seconde par seconde… »`;
  }, { cible: '[data-el="courbe-vitesse"]' });
  // trajet CALCULÉ : Albi → Castres
  await p.locator('[data-el="retour-trajets"]').click();
  await expect(p.locator('[data-screen="S3"]')).toBeVisible();
  for (const [nom, texte, choix] of [["depart", "Albi", "Albi"], ["arrivee", "Castres", "Castres"]]) {
    const c = champ(p, nom);
    await c.click();
    await c.fill("");
    await c.pressSequentially(texte, { delay: 40 });
    const o = propositions(p, nom).filter({ hasText: choix }).first();
    await expect(o).toBeVisible({ timeout: 20000 });
    await o.click();
  }
  await p.locator("#bouton-calculer").click();
  await expect(p.locator('[data-screen="S4"][data-etat="ok"]')).toBeVisible({ timeout: 60000 });
  await etape("US-6.6", p, "US-6.6-03-avant.png", "un trajet calculé (non enregistré) : Albi → Castres", async () => {
    const res = await lireResultat(p);
    expect(res.route).not.toMatch(/ENREGISTRÉ/i);
    return `« ${res.route} » ${res.km} km ${virgule(res.cout, 2)} €`;
  });
  await etape("US-6.6", p, "US-6.6-04-apres.png", "je le regarde, jusqu'à la note de bas de page", async () => {
    await expect(p.locator('[data-el="courbe-vitesse"]')).toHaveCount(0);
    await expect(p.locator('[data-el="note-estimation"]')).toBeVisible();
    await expect(p.locator('[data-el="note-roule"]')).toHaveCount(0);
    return "aucun bloc « Ma vitesse enregistrée » ; note d'estimation habituelle";
  }, { cible: '[data-el="note-estimation"]' });
  ecrireHistoire("US-6.6");
  await C.close();
}

try {
  if (MODE === "court" || MODE === "tout") await courtes();
  if (MODE === "long" || MODE === "tout") await long();
  if (MODE === "us62") {
    // reprise de US-6.2 seule (début du trajet), après correction de l'assertion de rafraîchissement
    const C = await contexte({ geolocation: { latitude: PTS[0].lat, longitude: PTS[0].lon } });
    const p = await C.newPage();
    surveiller(p, "us62");
    await ouvrirTrajets(p);
    await accorderVerrouEcran(C, p);
    await choisirVoiture(p);
    await lancerEnregistrement(p);
    const r = demarrerRejeu(C, PTS, { debut: 1, fin: 400 });
    await p.waitForTimeout(3000);
    await suivreEnDirect(p, r);
    r.arreter();
    await C.close();
  }
} catch (e) {
  console.error(`[${heure()}] ARRÊT : ${e.message}`);
  fs.appendFileSync(JOURNAL, `\n> Arrêt du passage ${MODE} à ${heure()} : ${String(e.message).split("\n")[0]}\n`);
  for (const id of blocs.keys()) ecrireHistoire(id);
} finally {
  await navigateur.close();
  const ok = resultats.filter((x) => x.ok).length;
  const lignes = resultats.map((x) => `| \`${x.nom}\` | ${x.ok ? "✓" : "✗"} | ${x.liv} | ${x.brute} |`).join("\n");
  fs.appendFileSync(JOURNAL, `\n### Bilan du passage ${MODE} (${heure()}) : ${ok}/${resultats.length} étapes ✓\n\n| capture | DOM | md5 livrée | md5 brute |\n|---|---|---|---|\n${lignes}\n${avertissements.length ? `\nAvertissements de page :\n${[...new Set(avertissements)].map((a) => `- ${a}`).join("\n")}\n` : "\nAucune erreur de page ni console.error.\n"}`);
  console.log(`[${heure()}] FIN ${MODE} : ${ok}/${resultats.length}`);
}
