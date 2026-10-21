// Outils de l'exploration du jalon 5 (bâtisseur r1b) : journal par histoire, captures (livrée + brute), journal réseau,
// lecture du DOM et de la base (lecture seule), rejeu d'un GPX accéléré (horloge Playwright) ou au rythme réel.
// Méthode d'horloge éprouvée par r1a (m5-aides.mjs) : avancer l'horloge, poser la position, attendre que T3 l'ait comptée.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { RACINE } from "./m5-aides.mjs";

export const env = process.env;
export const LIVRAISON = path.join(RACINE, "tests/e2e/delivery");
export const BRUTES = path.join(RACINE, "tests/e2e/exploration/m5-captures-brutes");
export const JOURNAL = path.join(RACINE, "tests/e2e/exploration/m5-exploration-log.md");
fs.mkdirSync(LIVRAISON, { recursive: true });
fs.mkdirSync(BRUTES, { recursive: true });

export const md5 = (b) => crypto.createHash("md5").update(b).digest("hex");
export const heure = () => new Date().toISOString().slice(11, 19) + "Z";
export const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
/** « 1 197 », « 2,156 », « 0,45 € » → nombre */
export const nb = (s) => Number(String(s).replace(/[\s  ]/g, "").replace(",", ".").replace(/[^\d.-]/g, ""));
export const virgule = (n, d) => n.toFixed(d).replace(".", ",");
/** Texte tel qu'écrit dans le DOM (indépendant de text-transform), nœuds de texte joints par une espace. */
export const txt = async (page, sel) =>
  (
    await page
      .locator(sel)
      .first()
      .evaluate((el) => {
        const parts = [];
        const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        while (w.nextNode()) if (w.currentNode.textContent.trim()) parts.push(w.currentNode.textContent.trim());
        return parts.join(" ");
      }, null, { timeout: 5000 })
      .catch(() => "∅")
  ).replace(/\s+/g, " ").trim();
export const attr = (page, sel, a) => page.locator(sel).first().getAttribute(a, { timeout: 5000 }).catch(() => null);
export function verifier(cond, message) {
  if (!cond) throw new Error(message);
}

// ---------------------------------------------------------------- base (lecture seule)
const H = (cle) => ({ apikey: cle, Authorization: `Bearer ${cle}` });
export async function restAnon(p) {
  const r = await fetch(`${env.VITE_SUPABASE_URL}/rest/v1/${p}`, { headers: H(env.VITE_SUPABASE_ANON_KEY) });
  return r.json();
}
export async function restService(p, extra = {}) {
  const r = await fetch(`${env.SUPABASE_URL}/rest/v1/${p}`, { headers: { ...H(env.SUPABASE_SERVICE_ROLE_KEY), ...extra } });
  return { corps: await r.json(), entetes: r.headers };
}
export async function moyennes(carburant) {
  const r = await fetch(`${env.VITE_SUPABASE_URL}/rest/v1/rpc/moyennes_par_pays`, { method: "POST", headers: { ...H(env.VITE_SUPABASE_ANON_KEY), "Content-Type": "application/json" }, body: JSON.stringify({ p_carburant: carburant }) });
  return new Map((await r.json()).map((m) => [m.pays, Number(m.prix_moyen)]));
}
export async function prixDb(ids, carburant) {
  if (ids.length === 0) return new Map();
  const l = await restAnon(`prix?select=station_id,carburant,prix,rupture&carburant=eq.${carburant}&station_id=in.(${ids.map((i) => `"${i}"`).join(",")})`);
  return new Map(l.filter((x) => x.prix != null && !x.rupture).map((x) => [x.station_id, Number(x.prix)]));
}
export async function stationsDb(ids) {
  if (ids.length === 0) return new Map();
  const l = await restAnon(`stations?select=id,lat,lon,pays&id=in.(${ids.map((i) => `"${i}"`).join(",")})`);
  return new Map(l.map((x) => [x.id, x]));
}
/** SQL par l'API de gestion Supabase (lecture seule ici : comptes et noms, jamais une valeur de clé). */
export async function sqlGestion(requete) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${env.SUPABASE_PROJECT_REF}/database/query`, { method: "POST", headers: { Authorization: `Bearer ${env.SUPABASE_ACCESS_TOKEN}`, "Content-Type": "application/json" }, body: JSON.stringify({ query: requete }) });
  return r.json();
}

// ---------------------------------------------------------------- IndexedDB de l'appli (base « plein-et-trajet »)
export function lireIdb(page) {
  return page.evaluate(
    () =>
      new Promise((ok) => {
        const q = indexedDB.open("plein-et-trajet");
        q.onsuccess = () => {
          const d = q.result;
          if (!d.objectStoreNames.contains("trajets")) return ok({ trajets: [], enregistrement: null, arrete: null });
          const tx = d.transaction(["trajets", "en_cours"]);
          const a = tx.objectStore("trajets").getAll();
          const b = tx.objectStore("en_cours").get("enregistrement");
          const c = tx.objectStore("en_cours").get("arrete");
          tx.oncomplete = () => ok({ trajets: a.result, enregistrement: b.result ?? null, arrete: c.result ?? null });
        };
        q.onerror = () => ok({ trajets: [], enregistrement: null, arrete: null });
      }),
  );
}
/** ÉTAT PRÉPARÉ : écrit des trajets dans le format que l'appli écrit elle-même (TrajetV1, src/lib/historique.ts). */
export function ecrireIdb(page, trajets, arrete = null) {
  return page.evaluate(
    ({ trajets, arrete }) =>
      new Promise((ok, ko) => {
        const q = indexedDB.open("plein-et-trajet");
        q.onsuccess = () => {
          const tx = q.result.transaction(["trajets", "en_cours"], "readwrite");
          for (const t of trajets) tx.objectStore("trajets").put(t);
          if (arrete) tx.objectStore("en_cours").put(arrete, "arrete");
          tx.oncomplete = () => ok(true);
          tx.onerror = () => ko(tx.error);
        };
      }),
    { trajets, arrete },
  );
}

// ---------------------------------------------------------------- rejeu GPX
export const pointsT3 = async (page) => Number((await page.locator('[data-screen="T3"]').getAttribute("data-points", { timeout: 1000 }).catch(() => null)) ?? -1);
export const pageMaintenant = (page) => page.evaluate(() => Date.now());
/** Rejeu accéléré pts[a..b[ (horloge en pause) : avance l'horloge de l'écart du GPX, pose la position, attend qu'elle soit comptée. */
export async function rouler(ctx, page, pts, a, b, { attendre = true, chaque, premierEcart } = {}) {
  for (let i = a; i < b; i++) {
    const avant = attendre ? await pointsT3(page) : null;
    const ecart = i === a && premierEcart != null ? premierEcart : i > 0 ? pts[i].t - pts[i - 1].t : 1000;
    await page.clock.runFor(ecart);
    await ctx.setGeolocation({ latitude: pts[i].lat, longitude: pts[i].lon, accuracy: 5 });
    if (attendre) await page.waitForFunction((n) => Number(document.querySelector('[data-screen="T3"]')?.getAttribute("data-points") ?? -1) !== n, avant, { timeout: 3000 }).catch(() => {});
    else await page.waitForTimeout(25);
    if (chaque) await chaque(i);
  }
}
/** Rejeu au rythme RÉEL en arrière-plan (horloge de la page rendue à son cours normal) : un point par seconde du GPX. */
export function rejeuFond(ctx, pts, i0) {
  let i = i0;
  let stop = false;
  const fin = (async () => {
    while (!stop && i < pts.length) {
      await ctx.setGeolocation({ latitude: pts[i].lat, longitude: pts[i].lon, accuracy: 5 });
      const ecart = i + 1 < pts.length ? pts[i + 1].t - pts[i].t : 1000;
      i++;
      await dormir(ecart);
    }
  })();
  return {
    index: () => i,
    async arreter() {
      stop = true;
      await fin;
      return i;
    },
  };
}
/** Remet l'horloge de la page en pause (après un passage au rythme réel). */
export async function figerHorloge(page) {
  await page.clock.pauseAt((await pageMaintenant(page)) + 1000); // marge : l'horloge de la page continue pendant l'aller-retour
}
/** Distance (m) d'un GPX entre deux index. */
export function cheminM(pts, a, b) {
  let s = 0;
  for (let i = a + 1; i <= b; i++) s += haversine(pts[i - 1], pts[i]);
  return s;
}
export function haversine(a, b) {
  const R = 6371000, r = Math.PI / 180;
  const x = Math.sin(((b.lat - a.lat) * r) / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(((b.lon - a.lon) * r) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

// ---------------------------------------------------------------- journal par histoire et captures
const blocs = new Map();
export const resultats = [];
export const textesInterdits = [];
export function histoire(id, titre) {
  if (!blocs.has(id)) blocs.set(id, { titre, etapes: [], issues: [], notes: [] });
}
export function noter(id, ligne) {
  blocs.get(id)?.notes.push(ligne);
}
export function probleme(id, ligne) {
  blocs.get(id)?.issues.push(ligne);
}
export function ecrireHistoire(id) {
  const b = blocs.get(id);
  if (!b) return;
  b.etapes.sort((x, y) => x.n - y.n);
  const notes = b.notes.length ? `\n### Edge Case / constats\n${b.notes.map((n) => `- ${n}`).join("\n")}\n` : "";
  const t = `\n## ${b.titre}\n\n### Happy Path\n${b.etapes.map((e) => e.ligne).join("\n")}\n${notes}\n### Issues Found\n${b.issues.length ? b.issues.join("\n") : "- aucune sur la version déployée à cette passe."}\n`;
  fs.appendFileSync(JOURNAL, t);
  blocs.delete(id);
  console.log(`[${heure()}] journal : ${b.titre} écrite (${b.etapes.length} étapes)`);
}
export function histoiresOuvertes() {
  return [...blocs.keys()];
}
/**
 * Une étape : verif() (assertions, rend le constat), puis capture livrée (tests/e2e/delivery/<nom>) et brute
 * (exploration/m5-captures-brutes/<nom>) : deux vraies prises de vue. Le texte de la page est passé au crible « péage / itinéraire ».
 */
export async function etape(id, n, page, nom, action, verif, { cible, haut } = {}) {
  const b = blocs.get(id);
  let ok = true;
  let constat = "";
  try {
    constat = (await verif()) ?? "";
  } catch (e) {
    ok = false;
    constat = String(e.message).split("\n").slice(0, 4).join(" ").slice(0, 600);
    b.issues.push(`- Step ${n} (${nom}) : ${constat}`);
  }
  if (cible) await page.locator(cible).first().scrollIntoViewIfNeeded({ timeout: 3000 }).catch(() => {});
  if (haut) await page.evaluate(() => document.querySelectorAll(".scroll").forEach((s) => (s.scrollTop = 0))).catch(() => {});
  await page.waitForTimeout(300);
  // carte des stations : attendre que les tuiles du fond de carte soient chargées (sinon fond blanc sur la capture)
  await page.waitForFunction(() => !document.querySelector('[data-el="carte-stations"] canvas') || !window.__carte || window.__carte.areTilesLoaded(), null, { timeout: 6000 }).catch(() => {});
  const corps = await page.evaluate(() => document.body?.innerText ?? "").catch(() => "");
  const interdit = corps.match(/p[ée]age|itin[ée]raire/i);
  if (interdit) textesInterdits.push(`${nom} : « ${interdit[0]} »`);
  const liv = await page.screenshot();
  const brute = await page.screenshot();
  fs.writeFileSync(path.join(LIVRAISON, nom), liv);
  fs.writeFileSync(path.join(BRUTES, nom), brute);
  resultats.push({ nom, ok, liv: md5(liv), brute: md5(brute), url: page.url() });
  b.etapes.push({ n, ligne: `- Step ${n}: ${action} → ${constat} → capture \`${nom}\` ${ok ? "✓" : "✗"} (${heure()}, md5 ${md5(liv).slice(0, 8)})` });
  console.log(`[${heure()}] ${ok ? "✓" : "✗"} ${nom} — ${constat.slice(0, 300)}`);
  return ok;
}

// ---------------------------------------------------------------- journal réseau (tout le parcours)
export const reseau = [];
export function brancher(ctx, flux) {
  ctx.on("request", (r) => reseau.push({ flux, url: r.url(), methode: r.method() }));
}
export const erreursPage = [];
export function surveiller(page, flux) {
  page.on("pageerror", (e) => erreursPage.push(`${flux} : ${String(e.message).slice(0, 200)}`));
}
