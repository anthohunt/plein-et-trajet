// Vérification finale (étape 6) — complément : les captures qu'aucune spec ni run-m5.mjs ne produit (plans m1, m2, m3 lecture seule, m4).
// Joué contre l'appli DÉPLOYÉE, base réelle, bibliothèque Playwright, téléphone émulé 390 × 844 (toucher). Captures sous tests/e2e/final/ (SHOTS_DIR).
// Lancer : set -a; . ./.env.local; set +a; lourd --nom final-complement node tests/e2e/final/final-complement.mjs [m1,m2,m3]  (m2 joue aussi les histoires du jalon 4)
// Injections (// MOCKED) : US-1.E1 (lecture des prix coupée), US-1.E2 (réponse vide pour E85), US-A11Y-004 (latence ajoutée à la vraie réponse).
// Écran Moteurs : lecture seule. Aucune clé collée, aucun test de connexion, rien d'écrit dans Vault, cles_fournisseurs ni moteurs ; un administrateur
// ÉPHÉMÈRE (m3-admin-eph-*) est créé pour la lecture puis supprimé (relu).
import { chromium, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { contexteAvecVoiture, lireGpx, voitureEea, URL_APP, RACINE } from "../exploration/m5-aides.mjs";
import { creerAdminEphemere, supprimerAdminsEphemeres, adminsEphemeresRestants, lienMagique } from "../exploration/m3-aides.mjs";

const env = process.env;
const SORTIE = path.resolve(RACINE, env.SHOTS_DIR ?? "tests/e2e/final");
const AUX = env.SHOTS_AUX_DIR ? path.resolve(RACINE, env.SHOTS_AUX_DIR) : SORTIE;
fs.mkdirSync(SORTIE, { recursive: true });
const GROUPES = (process.argv[2] ?? "m1,m2,m3").split(",");
const ALBI = { latitude: 43.92833, longitude: 2.145916 };
const PTS = lireGpx("albi-toulouse.gpx");
const D = (el) => `[data-el="${el}"]`;
const heure = () => new Date().toISOString().slice(11, 19) + "Z";
const H = { apikey: env.VITE_SUPABASE_ANON_KEY, Authorization: `Bearer ${env.VITE_SUPABASE_ANON_KEY}` };
const rest = async (p) => (await fetch(`${env.VITE_SUPABASE_URL}/rest/v1/${p}`, { headers: H })).json();
const autour = async () => (await fetch(`${env.VITE_SUPABASE_URL}/rest/v1/rpc/stations_autour`, { method: "POST", headers: { ...H, "Content-Type": "application/json" }, body: JSON.stringify({ lat: 43.9289, lon: 2.1464, rayon_m: 10000 }) })).json();

const navigateur = await chromium.launch();
const VOITURE = await voitureEea("5RBU0C");
const resultats = []; // { histoire, nom, ok, note }
const histoires = []; // { id, ok, constat }
const ouverts = [];

async function contexte({ voiture = false, permissions = ["geolocation"], depart = ALBI } = {}) {
  const c = await contexteAvecVoiture(navigateur, voiture ? VOITURE : null, depart, permissions);
  ouverts.push(c);
  return c;
}
/** Capture au nom exact du plan, après attente des tuiles de la carte. */
async function cap(page, nom, note = "") {
  await page.waitForTimeout(300);
  await page.waitForFunction(() => !document.querySelector('[data-el="carte-stations"] canvas') || !window.__carte || window.__carte.areTilesLoaded(), null, { timeout: 8000 }).catch(() => {});
  await page.screenshot({ path: path.join(SORTIE, nom) });
  resultats.push({ nom, note });
  console.log(`[${heure()}]   capture ${nom}${note ? " — " + note : ""}`);
}
const SEULEMENT = env.SEULEMENT ? env.SEULEMENT.split(",") : null; // rejeu ciblé de quelques histoires
async function histoire(id, fn) {
  if (SEULEMENT && !SEULEMENT.includes(id)) return;
  const t = Date.now();
  console.log(`[${heure()}] ===== ${id}`);
  try {
    const constat = await fn();
    histoires.push({ id, ok: true, constat: constat ?? "" });
    console.log(`[${heure()}] ✓ ${id} (${Math.round((Date.now() - t) / 1000)} s) ${constat ?? ""}`);
  } catch (e) {
    histoires.push({ id, ok: false, constat: String(e.message ?? e).split("\n").slice(0, 3).join(" ").slice(0, 500) });
    console.log(`[${heure()}] ✗ ${id} : ${String(e.stack ?? e).split("\n").slice(0, 6).join(" | ")}`);
  }
}
const lignes = (p) => p.locator(D("ligne-station"));
async function ouvrirStations(p) {
  await p.goto(URL_APP + "/stations");
  await expect(lignes(p).first()).toBeVisible({ timeout: 40000 });
  await expect(p.locator(D("carte-stations"))).toHaveAttribute("data-pastilles", /\d+/);
  await expect(p.locator(D("ecart")).first()).toBeVisible();
}
async function choisir(p, c) {
  await p.getByRole("group", { name: "Carburant" }).getByRole("button", { name: c, exact: true }).click();
  await expect(p.locator(D("titre-liste"))).toHaveText(`Stations · ${c}`);
}
const lireLignes = (p) => lignes(p).evaluateAll((els) => els.map((e) => ({ id: e.dataset.station, nom: e.querySelector(".n")?.textContent ?? "", meta: e.querySelector(".m")?.textContent ?? "", prix: Number((e.querySelector(".totem")?.getAttribute("aria-label") ?? "").split(" ")[0].replace(",", ".")) })));
const centre = (p) => p.evaluate(() => { const c = window.__carte.getCenter(); return { lat: c.lat, lon: c.lng }; });
function km(a, b) {
  const r = Math.PI / 180, s = Math.sin(((b.lat - a.lat) * r) / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(((b.lon - a.lon) * r) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(s));
}
async function glisser(p, dx, dy) {
  const b = await p.locator(D("carte-stations")).boundingBox();
  const d = await p.evaluate(({ x, y, w, hh, dx, dy }) => {
    const ok = (a, c) => a > x + 8 && a < x + w - 8 && c > y + 8 && c < y + hh - 8;
    for (let yy = y + 50; yy < y + hh - 40; yy += 10) for (let xx = x + 20; xx < x + w - 20; xx += 10) if (ok(xx + dx, yy + dy) && document.elementFromPoint(xx, yy)?.tagName === "CANVAS") return { x: xx, y: yy };
    return { x: x + w / 2 - dx / 2, y: y + hh / 2 - dy / 2 };
  }, { x: b.x, y: b.y, w: b.width, hh: b.height, dx, dy });
  await p.mouse.move(d.x, d.y);
  await p.mouse.down();
  await p.mouse.move(d.x + dx, d.y + dy, { steps: 12 });
  await p.mouse.up();
}
async function pastilleDegagee(p) {
  const id = await p.evaluate(() => {
    for (const b of document.querySelectorAll('[data-el="pastille-station"]')) {
      const r = b.getBoundingClientRect(), m = document.querySelector('[data-el="carte-stations"]').getBoundingClientRect();
      const x = r.left + r.width / 2, y = r.top + r.height / 2;
      if (x < m.left + 10 || x > m.right - 50 || y < m.top + 30 || y > m.bottom - 30) continue;
      if (document.elementFromPoint(x, y) === b) return b.dataset.station;
    }
    return null;
  });
  if (!id) throw new Error("aucune pastille dégagée sur la carte");
  return id;
}
const idb = (page) => page.evaluate(() => new Promise((ok) => { const q = indexedDB.open("plein-et-trajet"); q.onsuccess = () => { const tx = q.result.transaction(["trajets", "en_cours"]); const a = tx.objectStore("trajets").count(); const b = tx.objectStore("en_cours").count(); tx.oncomplete = () => ok({ trajets: a.result, enCours: b.result }); }; }));

// ================================================================= M1 — Stations
async function groupeM1() {
  await histoire("US-1.4", async () => {
    const c = await contexte(); const p = await c.newPage();
    await ouvrirStations(p);
    await cap(p, "US-1.4-01-toucher-une-pastille-avant.png");
    const id = await pastilleDegagee(p);
    const pin = p.locator(`[data-el="pastille-station"][data-station="${id}"]`);
    const label = await pin.getAttribute("aria-label");
    await pin.click();
    await expect(p.locator(D("fiche-station"))).toHaveAttribute("data-station", id);
    expect(label.startsWith(await p.locator("#sh-name").textContent())).toBe(true);
    await expect(p.locator(D("tableau-prix"))).toHaveAttribute("aria-busy", "false");
    await cap(p, "US-1.4-02-toucher-une-pastille-apres.png", `fiche de ${await p.locator("#sh-name").textContent()}`);
    await c.close();
    const c2 = await contexte(); const q = await c2.newPage();
    await ouvrirStations(q);
    await choisir(q, "Gazole");
    await cap(q, "US-1.4-03-toucher-une-pastille-avant.png");
    await expect(q.locator(D("carte-stations"))).toHaveAttribute("data-pastilles", /\d+/);
    const pa = await q.locator(D("pastille-station")).evaluateAll((e) => e.map((b) => ({ v: Number(b.textContent.replace(",", ".")), m: b.dataset.moitie })));
    const lo = pa.filter((x) => x.m === "lo"), hi = pa.filter((x) => x.m === "hi");
    expect(lo.length).toBeGreaterThan(0); expect(hi.length).toBeGreaterThan(0);
    expect(Math.max(...lo.map((x) => x.v))).toBeLessThan(Math.min(...hi.map((x) => x.v)));
    await expect(q.locator(".pin.lo").first()).toHaveCSS("box-shadow", /31, 138, 76/);
    await expect(q.locator(".pin.hi").first()).toHaveCSS("box-shadow", /194, 73, 29/);
    await cap(q, "US-1.4-04-toucher-une-pastille-apres.png", `${lo.length} pastilles vertes, ${hi.length} orange`);
    await c2.close();
    return `${lo.length} vertes (≤ ${Math.max(...lo.map((x) => x.v))}), ${hi.length} orange (≥ ${Math.min(...hi.map((x) => x.v))})`;
  });

  await histoire("US-1.6", async () => {
    const c = await contexte(); const p = await c.newPage();
    await ouvrirStations(p);
    await p.locator(D("liste-stations")).scrollIntoViewIfNeeded();
    await cap(p, "US-1.6-01-lire-une-station-dans-la-liste-avant.png");
    const [l] = await lireLignes(p);
    const st = (await rest(`stations?select=enseigne,nom&id=eq.${l.id}`))[0];
    expect(l.nom).toContain(st.enseigne ?? st.nom);
    expect(l.meta).toMatch(/^[\d,]+ (km|m) · /);
    expect(l.meta).toMatch(/(il y a \d+ (min|h)|hier|à l'instant|prix du \d\d\/\d\d)/);
    expect(l.meta).toMatch(/[−+][\d,]+ c vs France|= France/);
    await expect(lignes(p).first().locator(".totem")).toHaveAttribute("aria-label", /^\d,\d{3} euros le litre$/);
    await cap(p, "US-1.6-02-lire-une-station-dans-la-liste-apres.png", `ligne : ${l.nom} · ${l.meta} · ${l.prix}`);
    await cap(p, "US-1.6-03-lire-une-station-dans-la-liste-avant.png");
    await lignes(p).first().click();
    await expect(p.locator("#sh-name")).toHaveText(l.nom);
    await expect(p.locator(D("tableau-prix"))).toHaveAttribute("aria-busy", "false");
    await cap(p, "US-1.6-04-lire-une-station-dans-la-liste-apres.png", "fiche ouverte");
    await c.close();
    return `${l.nom} · ${l.meta}`;
  });

  await histoire("US-2.1", async () => {
    const c = await contexte(); const p = await c.newPage();
    await ouvrirStations(p);
    await choisir(p, "Gazole");
    await lignes(p).first().click();
    await expect(p.getByRole("dialog")).toBeVisible();
    await expect(p.locator(D("tableau-prix"))).toHaveAttribute("aria-busy", "false");
    await cap(p, "US-2.1-01-fermer-la-fiche-avant.png");
    await p.getByRole("button", { name: "Fermer la fiche" }).click();
    await expect(p.getByRole("dialog")).toHaveCount(0);
    await expect(p.getByRole("button", { name: "Gazole", exact: true })).toHaveAttribute("aria-pressed", "true");
    await cap(p, "US-2.1-02-fermer-la-fiche-apres.png", "Gazole toujours choisi (aria-pressed)");
    // variante Échap
    await lignes(p).first().click();
    await expect(p.getByRole("dialog")).toBeVisible();
    await p.keyboard.press("Escape");
    await expect(p.getByRole("dialog")).toHaveCount(0);
    await expect(p.getByRole("button", { name: "Gazole", exact: true })).toHaveAttribute("aria-pressed", "true");
    await c.close();
    return "fermeture par le bouton et par Échap, Gazole conservé";
  });

  await histoire("US-1.E1", async () => {
    const c = await contexte(); const p = await c.newPage();
    await ouvrirStations(p);
    await cap(p, "US-1.E1-E1-01-declencheur.png", "écran Stations normal ; la coupure est posée juste après");
    // MOCKED: page.route — coupure réseau de la lecture des prix (impossible à provoquer sur la vraie base) — injection
    await p.route("**/rest/v1/prix*", (r) => r.abort());
    await p.goto(URL_APP + "/stations");
    await expect(p.locator(D("etat-erreur"))).toContainText("Prix indisponibles pour l'instant", { timeout: 40000 });
    await expect(p.getByRole("button", { name: "Réessayer" })).toBeVisible({ timeout: 20000 });
    await expect(lignes(p)).toHaveCount(0);
    await expect(p.locator(D("pastille-station"))).toHaveCount(0);
    await cap(p, "US-1.E1-E1-02-resultat.png", "injection : lecture des prix coupée");
    await p.unroute("**/rest/v1/prix*");
    await p.getByRole("button", { name: "Réessayer" }).click();
    await expect(lignes(p).first()).toBeVisible({ timeout: 30000 });
    await cap(p, "US-1.E1-E1-03-retour.png", "réseau rétabli, Réessayer");
    await c.close();
    return "message « Prix indisponibles pour l'instant » + Réessayer, retour normal (injection)";
  });

  await histoire("US-1.E2", async () => {
    const c = await contexte(); const p = await c.newPage();
    await ouvrirStations(p);
    await cap(p, "US-1.E2-E1-01-declencheur.png", "écran Stations normal ; la réponse vide E85 est posée juste après");
    // MOCKED: page.route — réponse vide pour E85 (il existe de vraies stations E85 autour d'Albi) — injection
    await p.route("**/rest/v1/prix*carburant=eq.E85*", (r) => r.fulfill({ status: 200, contentType: "application/json", body: "[]" }));
    await choisir(p, "E85");
    await expect(p.locator(D("etat-vide"))).toHaveText("Aucune station ne vend ce carburant autour de vous.");
    await expect(p.locator(D("pastille-station"))).toHaveCount(0);
    await cap(p, "US-1.E2-E1-02-resultat.png", "injection : zéro station E85");
    await p.unroute("**/rest/v1/prix*carburant=eq.E85*");
    await choisir(p, "SP95-E10");
    await choisir(p, "E85");
    await expect(lignes(p).first()).toBeVisible();
    await cap(p, "US-1.E2-E1-03-retour.png", "vraies stations E85 revenues");
    await c.close();
    return "message de liste vide, carte sans pastille, retour (injection)";
  });

  await histoire("US-1.E3", async () => {
    const ids = (await autour()).map((s) => s.id).join(",");
    const limite = new Date(Date.now() - 48 * 3600e3).toISOString();
    let carb = "", vieux = null;
    for (const cb of ["SP95-E10", "Gazole", "SP98", "E85", "GPLc", "SP95"]) {
      const r = await rest(`prix?select=station_id,maj&carburant=eq.${cb}&rupture=is.false&prix=not.is.null&maj=lt.${limite}&station_id=in.(${ids})`);
      if (r.length) { carb = cb; vieux = r[0]; break; }
    }
    if (!vieux) throw new Error("aucune station réelle > 48 h dans le rayon aujourd'hui");
    const jjmm = new Date(vieux.maj).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", timeZone: "Europe/Paris" });
    const c = await contexte(); const p = await c.newPage();
    await ouvrirStations(p);
    await cap(p, "US-1.E3-E1-01-declencheur.png", `donnée réelle : station ${vieux.station_id}, ${carb}, prix du ${jjmm}`);
    await choisir(p, carb);
    const a = p.locator(`[data-el="ligne-station"][data-station="${vieux.station_id}"] [data-el="anciennete"]`);
    await expect(a).toHaveText(`prix du ${jjmm}`);
    await expect(a).toHaveCSS("opacity", "0.8");
    await expect(a).toHaveCSS("color", "rgb(93, 99, 95)");
    await a.scrollIntoViewIfNeeded();
    await cap(p, "US-1.E3-E1-02-resultat.png", `ligne « prix du ${jjmm} » atténuée (opacity 0.8)`);
    await choisir(p, "SP95-E10");
    await p.locator(D("liste-stations")).scrollIntoViewIfNeeded();
    await cap(p, "US-1.E3-E1-03-retour.png", "carburant par défaut rétabli");
    await c.close();
    return `station ${vieux.station_id} en ${carb} : « prix du ${jjmm} »`;
  });

  await histoire("US-1.E4", async () => {
    const ids = (await autour()).map((s) => s.id).join(",");
    let rup = await rest(`prix?select=station_id&carburant=eq.Gazole&rupture=is.true&station_id=in.(${ids})`);
    let depart = ALBI, lointain = false;
    if (rup.length === 0) {
      for (const r of await rest("prix?select=station_id&carburant=eq.Gazole&rupture=is.true&limit=40")) {
        if (!/^\d+$/.test(r.station_id)) continue;
        if ((await rest(`prix?select=carburant&station_id=eq.${r.station_id}&rupture=is.false&prix=not.is.null`)).length === 0) continue;
        const [st] = await rest(`stations?select=lat,lon&id=eq.${r.station_id}`);
        if (!st) continue;
        depart = { latitude: Number(st.lat) + 0.0018, longitude: Number(st.lon) };
        rup = [r]; lointain = true;
        break;
      }
    }
    if (!rup.length) throw new Error("aucune rupture gazole réelle en France aujourd'hui");
    const id = rup[0].station_id;
    const c = await contexte({ depart }); const p = await c.newPage();
    await ouvrirStations(p);
    await cap(p, "US-1.E4-E1-01-declencheur.png", `donnée réelle : station ${id} en rupture de gazole${lointain ? " (ailleurs en France, position posée à 200 m)" : ""}`);
    await choisir(p, "Gazole");
    await expect(p.locator(D("liste-stations"))).toHaveAttribute("data-carburant", "Gazole");
    const l = await lireLignes(p);
    expect(l.map((x) => x.id)).not.toContain(id);
    await expect(p.locator(`[data-el="pastille-station"][data-station="${id}"]`)).toHaveCount(0);
    await p.locator(D("liste-stations")).scrollIntoViewIfNeeded();
    await cap(p, "US-1.E4-E1-02-resultat.png", `${l.length} stations en Gazole, la station en rupture n'y est pas`);
    const autres = await rest(`prix?select=carburant&station_id=eq.${id}&rupture=is.false&prix=not.is.null`);
    await choisir(p, autres[0].carburant);
    await expect(p.locator(`[data-el="ligne-station"][data-station="${id}"]`)).toHaveCount(1);
    await p.locator(`[data-el="ligne-station"][data-station="${id}"]`).scrollIntoViewIfNeeded();
    await cap(p, "US-1.E4-E1-03-retour.png", `la même station apparaît en ${autres[0].carburant}`);
    await c.close();
    return `station ${id} absente de la liste Gazole, présente en ${autres[0].carburant}`;
  });

  await histoire("US-2.E1", async () => {
    const st = await autour();
    const gpl = new Set((await rest(`prix?select=station_id&carburant=eq.GPLc&station_id=in.(${st.map((s) => s.id).join(",")})`)).map((x) => x.station_id));
    const c = await contexte(); const p = await c.newPage();
    await ouvrirStations(p);
    const l = (await lireLignes(p)).find((x) => !gpl.has(x.id));
    if (!l) throw new Error("aucune station de la liste sans ligne GPLc");
    await cap(p, "US-2.E1-E1-01-declencheur.png", `donnée réelle : ${l.nom} sans ligne GPLc en base`);
    await p.locator(`[data-el="ligne-station"][data-station="${l.id}"]`).click();
    await expect(p.locator(D("tableau-prix"))).toHaveAttribute("aria-busy", "false");
    await expect(p.locator('[data-carburant="GPLc"] [data-el="non-vendu"]')).toHaveText("non vendu");
    await p.locator('[data-carburant="GPLc"]').scrollIntoViewIfNeeded();
    await cap(p, "US-2.E1-E1-02-resultat.png", "ligne GPLc « non vendu »");
    await p.getByRole("button", { name: "Fermer la fiche" }).click();
    await expect(p.getByRole("dialog")).toHaveCount(0);
    await cap(p, "US-2.E1-E1-03-retour.png", "fiche fermée");
    await c.close();
    return `${l.nom} : GPLc « non vendu »`;
  });

  await histoire("US-1.P1", async () => {
    const appels = [];
    const c = await contexte(); const p = await c.newPage();
    p.on("request", (r) => r.url().includes("/rpc/stations_autour") && appels.push(JSON.parse(r.postData() || "{}")));
    await ouvrirStations(p);
    await glisser(p, -280, 0);
    await expect.poll(async () => km(await centre(p), { lat: ALBI.latitude, lon: ALBI.longitude })).toBeGreaterThan(4);
    await p.locator(D("rechercher-zone")).click();
    await expect(p.locator(D("rechercher-zone"))).toHaveCount(0);
    await expect.poll(() => appels.length).toBeGreaterThanOrEqual(2);
    await expect(lignes(p).first()).toBeVisible();
    await cap(p, "US-1.P1-01-recentrer-sur-ma-position-avant.png", "carte déplacée de plus de 4 km, zone recherchée");
    const n = appels.length;
    await p.getByRole("button", { name: "Recentrer sur ma position" }).click();
    await expect.poll(async () => km(await centre(p), { lat: ALBI.latitude, lon: ALBI.longitude })).toBeLessThan(0.1);
    await expect.poll(() => appels.length).toBeGreaterThan(n);
    await expect(p.locator(D("lieu"))).toHaveText("Autour de moi");
    await cap(p, "US-1.P1-02-recentrer-sur-ma-position-apres.png", "carte recentrée, liste rechargée");
    await c.close();
    return `${appels.length} appels stations_autour ; dernier lat ${appels.at(-1).lat}`;
  });

  // ---- transverses
  await histoire("US-A11Y-001", async () => {
    const c = await contexte({ voiture: true }); const p = await c.newPage();
    await ouvrirStations(p);
    await p.locator("body").click({ position: { x: 5, y: 5 } });
    const focus = () => p.evaluate(() => {
      const e = document.activeElement, r = e.getBoundingClientRect(), s = getComputedStyle(e);
      const cadre = (e.closest(".map") ?? document.documentElement).getBoundingClientRect();
      const dans = r.width > 0 && r.left >= cadre.left - 1 && r.right <= cadre.right + 1 && r.top >= cadre.top - 1 && r.bottom <= cadre.bottom + 1 && r.top >= 0 && r.bottom <= innerHeight;
      const d = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return { i: [...document.querySelectorAll("*")].indexOf(e), txt: e.getAttribute("aria-label") || e.textContent || "", contour: s.outlineStyle !== "none" && parseFloat(s.outlineWidth) >= 2, visible: e.tagName === "CANVAS" ? dans : dans && !!d && (d === e || e.contains(d)) };
    });
    await p.keyboard.press("Tab");
    const premier = await focus();
    expect(premier.txt).toBe("Gazole");
    await cap(p, "US-A11Y-001-01-m1.png", "premier Tab : focus sur Gazole");
    const vus = [premier];
    expect(premier.contour && premier.visible).toBe(true);
    for (let i = 0; i < 60; i++) {
      await p.keyboard.press("Tab");
      const o = await focus();
      expect(o.contour, `contour : ${o.txt}`).toBe(true);
      expect(o.visible, `visible : ${o.txt}`).toBe(true);
      vus.push(o);
      if (o.txt === "Stations") break;
    }
    expect(vus.map((v) => v.i)).toEqual([...vus.map((v) => v.i)].sort((a, b) => a - b));
    await p.keyboard.press("Shift+Tab");
    const back = await focus();
    expect(back.i).toBe(vus.at(-2).i);
    await p.keyboard.press("Tab");
    await cap(p, "US-A11Y-001-02-m1.png", `${vus.length} contrôles parcourus dans l'ordre, contour visible ; focus sur l'onglet « Stations »`);
    await c.close();
    return `${vus.length} contrôles, ordre croissant, contour ≥ 2 px, Maj+Tab revient en arrière`;
  });

  await histoire("US-A11Y-002", async () => {
    const c = await contexte(); const p = await c.newPage();
    await ouvrirStations(p);
    const ligne = lignes(p).nth(1);
    await ligne.scrollIntoViewIfNeeded();
    await ligne.focus();
    await p.keyboard.press("Enter");
    await expect(p.locator("#sh-name")).toBeFocused();
    await cap(p, "US-A11Y-002-01-m1.png", "fiche ouverte, focus sur le titre");
    await p.keyboard.press("Escape");
    await expect(ligne).toBeFocused();
    await cap(p, "US-A11Y-002-02-m1.png", "fiche fermée, focus revenu sur la ligne ouvreuse");
    await c.close();
    return "focus titre à l'ouverture, retour sur la ligne à la fermeture";
  });

  await histoire("US-A11Y-003", async () => {
    const c = await contexte(); const p = await c.newPage();
    await ouvrirStations(p);
    await lignes(p).first().click();
    await expect(p.getByRole("dialog")).toBeVisible();
    await cap(p, "US-A11Y-003-01-m1.png", "fiche ouverte");
    await p.keyboard.press("Escape");
    await expect(p.getByRole("dialog")).toHaveCount(0);
    await cap(p, "US-A11Y-003-02-m1.png", "Échap : fiche fermée");
    await c.close();
    return "Échap ferme la fiche";
  });

  await histoire("US-A11Y-004", async () => {
    const c = await contexte(); const p = await c.newPage();
    await ouvrirStations(p);
    const labels = await p.locator(D("pastille-station")).evaluateAll((e) => e.map((b) => b.getAttribute("aria-label")));
    expect(labels.length).toBeGreaterThan(3);
    for (const l of labels) expect(l).toMatch(/^.+, \d,\d{3} euros le litre, (moins|plus) cher$/);
    for (const t of await lignes(p).locator(".totem").evaluateAll((e) => e.map((x) => x.getAttribute("aria-label")))) expect(t).toMatch(/^\d,\d{3} euros le litre$/);
    await cap(p, "US-A11Y-004-01-m1.png", `${labels.length} pastilles annoncées « station, prix euros le litre, moins/plus cher » (ex. ${labels[0]})`);
    // MOCKED: latence ajoutée à la vraie réponse de la fiche, pour voir l'annonce de chargement — injection (la réponse reste la vraie)
    await p.route("**/rest/v1/prix?*station_id=eq.*", async (r) => { await new Promise((x) => setTimeout(x, 2500)); await r.continue(); });
    await lignes(p).first().click();
    await expect(p.locator('[data-el="tableau-prix"] [role="status"]')).toHaveText("Chargement des prix de la station…");
    await cap(p, "US-A11Y-004-02-m1.png", "injection : latence ajoutée ; « Chargement des prix de la station… » (role=status)");
    await expect(p.locator(D("tableau-prix"))).toHaveAttribute("aria-busy", "false");
    const icones = await p.evaluate(() => [...document.querySelectorAll("button")].filter((b) => !b.textContent.replace(/[✕\s]/g, "").length).map((b) => b.getAttribute("aria-label")));
    for (const l of icones) expect(l).toBeTruthy();
    expect(icones).toEqual(expect.arrayContaining(["Recentrer sur ma position", "Fermer la fiche"]));
    await c.close();
    return `boutons icônes libellés : ${icones.join(" / ")}`;
  });

  await histoire("US-PERF-001", async () => {
    const c = await contexte(); const p = await c.newPage();
    const cdp = await c.newCDPSession(p);
    await cdp.send("Network.enable");
    await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
    await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 85, downloadThroughput: (9 * 1024 * 1024) / 8, uploadThroughput: (1.5 * 1024 * 1024) / 8 });
    const t0 = Date.now();
    await p.goto(URL_APP + "/stations", { waitUntil: "commit" });
    await cap(p, "US-PERF-001-01-m1.png", "ouverture de l'appli en 4G simulée (rendu juste après l'envoi de la requête)");
    const t1 = Date.now();
    await lignes(p).first().waitFor({ timeout: 30000 });
    const ms = Date.now() - t0;
    await cap(p, "US-PERF-001-02-m1.png", `liste affichée en ${ms} ms (4G simulée 85 ms, 9 Mbit/s)`);
    await c.close();
    if (ms >= 2500) throw new Error(`liste affichée en ${ms} ms (seuil 2500 ms, hors compte de la capture ${Date.now() - t1} ms)`);
    return `liste en ${ms} ms`;
  });
}

// ================================================================= M2 / M4 — états du trajet
async function demarrer(page) {
  await page.clock.install();
  await page.goto(URL_APP + "/");
  await page.locator(D("bouton-demarrer")).waitFor();
  await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 1000);
  await page.locator(D("bouton-demarrer")).click();
  await expect(page).toHaveURL(/\/en-route$/);
}
async function rejouer(ctx, page, pts, debut, fin) {
  for (let i = debut; i < fin; i++) {
    const avant = Number((await page.locator('[data-screen="T3"]').getAttribute("data-points").catch(() => null)) ?? -1);
    await page.clock.runFor(i > 0 ? pts[i].t - pts[i - 1].t : 1000);
    await ctx.setGeolocation({ latitude: pts[i].lat, longitude: pts[i].lon, accuracy: 5 });
    await page.waitForFunction((n) => Number(document.querySelector('[data-screen="T3"]')?.getAttribute("data-points") ?? -1) !== n, avant, { timeout: 3000 }).catch(() => {});
  }
}
async function finPreparee(page) {
  const r = await fetch(`${env.VITE_SUPABASE_URL}/rest/v1/rpc/moyennes_par_pays`, { method: "POST", headers: { ...H, "Content-Type": "application/json" }, body: JSON.stringify({ p_carburant: "SP95-E10" }) });
  const fr = Number((await r.json()).find((m) => m.pays === "FR").prix_moyen);
  await page.goto(URL_APP + "/historique");
  await page.locator('[data-screen="T6"]').waitFor();
  await page.evaluate((fr) => new Promise((ok) => {
    const q = indexedDB.open("plein-et-trajet");
    q.onsuccess = () => {
      const t0 = Date.parse("2026-10-21T06:30:00+02:00");
      // ÉTAT PRÉPARÉ : trajet arrêté de 41,2 L au format de l'appli (TrajetV1)
      const t = { id: "final-arrete", debut: t0, fin: t0 + 345 * 60000, depart: { lat: 43.928, lon: 2.146, nom: "Albi" }, arrivee: { lat: 48.857, lon: 2.352, nom: "Paris" }, pays_depart: "FR", km: 588, litres: 41.2, carburant: "SP95-E10", moyennes: { "SP95-E10": { prix: fr, pays: "FR" } }, prix_litre: fr, prix_perso: null, personnes: 1, vitesses: [50, 90, 120, 110, 30], consos: [7, 6.5, 7.2, 7, 6], conso_max: 7.2, vitesse_moy: 102, accelerations: 3, duree_s: 345 * 60, voiture: { nom: "Renault Clio", detail: "1.2 · 118 ch · 2017 · SP95-E10", carburant: "SP95-E10" }, enregistre: false };
      const tx = q.result.transaction("en_cours", "readwrite");
      tx.objectStore("en_cours").put(t, "arrete");
      tx.oncomplete = () => ok(true);
    };
  }), fr);
  await page.goto(URL_APP + "/");
  await expect(page).toHaveURL(/\/fin$/);
  return fr;
}
async function groupeM2M4() {
  await histoire("US-3.E3", async () => {
    const c = await contexte({ voiture: true }); const p = await c.newPage();
    await p.goto(URL_APP + "/");
    await p.locator(D("bouton-demarrer")).waitFor();
    await cap(p, "US-3.E3-E1-01-declencheur.png", "aucun trajet enregistré (contexte neuf), accueil");
    await p.locator(D("onglet-historique")).tap();
    await expect(p.locator(D("historique-vide"))).toHaveText("Aucun trajet enregistré.");
    await expect(p.locator(D("totaux-historique"))).toHaveAttribute("data-trajets", "0");
    await expect(p.locator(D("totaux-historique"))).toHaveAttribute("data-km", "0");
    await expect(p.locator(D("total-euros"))).toHaveText("0,00");
    await cap(p, "US-3.E3-E1-02-resultat.png", "onglet Historique : « Aucun trajet enregistré. », totaux à 0");
    await p.locator(D("onglet-trajet")).tap();
    await expect(p.locator(D("bouton-demarrer"))).toBeVisible();
    await cap(p, "US-3.E3-E1-03-retour.png", "retour à l'onglet Trajet");
    await c.close();
    return "« Aucun trajet enregistré. », 0 trajet, 0 km, 0,00 €";
  });

  await histoire("US-4.E2", async () => {
    const c = await contexte({ voiture: true }); const p = await c.newPage();
    const fr = await finPreparee(p);
    await p.locator(D("compteur-prix")).click();
    await expect(p.locator(D("champ-prix"))).toBeVisible();
    await cap(p, "US-4.E2-E1-01-declencheur.png", "fin de trajet préparée (41,2 L), champ du prix ouvert");
    const coutAvant = await p.locator(D("cout-trajet")).getAttribute("data-cout");
    await p.locator(D("champ-prix")).fill("12");
    await p.locator(D("champ-prix")).press("Enter");
    await expect(p.locator(D("erreur-prix"))).toHaveText("Entre un prix entre 0,50 et 4,00 €/L");
    await cap(p, "US-4.E2-E1-02-resultat.png", "saisie « 12 » : message d'erreur, coût inchangé");
    for (const faux of ["abc", "0,3"]) {
      await p.locator(D("champ-prix")).fill(faux);
      await p.locator(D("champ-prix")).press("Enter");
      await expect(p.locator(D("erreur-prix"))).toHaveText("Entre un prix entre 0,50 et 4,00 €/L");
    }
    await p.locator(D("champ-prix")).press("Escape");
    await expect(p.locator(D("prix-apres"))).toHaveAttribute("data-prix", String(fr));
    await expect(p.locator(D("cout-trajet"))).toHaveAttribute("data-cout", coutAvant);
    await cap(p, "US-4.E2-E1-03-retour.png", `Échap : prix ${String(fr).replace(".", ",")} €/L et coût ${coutAvant} € gardés`);
    await c.close();
    return `« 12 », « abc », « 0,3 » refusés ; coût ${coutAvant} € inchangé`;
  });

  await histoire("US-6.E1", async () => {
    const c = await contexte({ voiture: true, permissions: [] }); const p = await c.newPage();
    await p.goto(URL_APP + "/");
    await p.locator(D("bouton-demarrer")).waitFor();
    await cap(p, "US-6.E1-01-avant.png", "accueil, localisation refusée");
    await p.locator(D("bouton-demarrer")).click();
    await expect(p.locator(D("message-localisation"))).toHaveAttribute("data-erreur", "refusee");
    await expect(p.locator(D("message-localisation"))).toContainText("L'enregistrement a besoin de ta localisation");
    await expect(p).toHaveURL(/\/$/);
    expect(await idb(p)).toEqual({ trajets: 0, enCours: 0 });
    await cap(p, "US-6.E1-02-apres.png", "message de localisation, aucun trajet créé (IndexedDB 0/0)");
    await c.close();
    return "message affiché, 0 trajet créé";
  });

  await histoire("US-6.E2", async () => {
    const c = await contexte({ voiture: true, depart: { latitude: PTS[0].lat, longitude: PTS[0].lon } }); const p = await c.newPage();
    await demarrer(p);
    await rejouer(c, p, PTS, 1, 150);
    await cap(p, "US-6.E2-01-avant.png", `écran En route, ${await p.locator(D("direct-km")).textContent()} km`);
    await p.locator(D("bouton-arreter")).click();
    await expect(p.locator(D("trop-court"))).toContainText(/Trajet trop court : 0,\d km sur 1 minimum\./);
    await expect(p.locator(D("trop-court"))).toContainText("Rien n'est ajouté à l'historique.");
    expect(await idb(p)).toEqual({ trajets: 0, enCours: 0 });
    await cap(p, "US-6.E2-02-apres.png", "« Trajet trop court … Rien n'est ajouté à l'historique. », IndexedDB 0/0");
    await c.close();
    return "trop court, historique vide";
  });

  await histoire("US-6.E3", async () => {
    const c = await contexte({ voiture: true, depart: { latitude: PTS[0].lat, longitude: PTS[0].lon } }); const p = await c.newPage();
    await demarrer(p);
    await rejouer(c, p, PTS, 1, 420);
    const km = await p.locator(D("direct-km")).textContent();
    const points = await p.locator('[data-screen="T3"]').getAttribute("data-points");
    expect(Number(km.replace(",", "."))).toBeGreaterThan(1.5);
    await cap(p, "US-6.E3-01-avant.png", `En route, ${km} km, ${points} points`);
    await p.reload();
    await expect(p).toHaveURL(/\/en-route$/);
    await expect(p.locator('[data-screen="T3"]')).toHaveAttribute("data-points", points);
    await expect(p.locator(D("direct-km"))).toHaveText(km);
    await expect(p.locator(D("bouton-arreter"))).toBeVisible();
    await cap(p, "US-6.E3-02-apres.png", `page rechargée : toujours En route, ${km} km, ${points} points`);
    await c.close();
    return `${km} km et ${points} points conservés`;
  });
}

// ================================================================= M3 — écran Moteurs (lecture seule)
async function groupeM3() {
  // US-5.E1 : visiteur, sans compte
  await histoire("US-5.E1", async () => {
    const c = await contexte({ voiture: true }); const p = await c.newPage();
    await p.goto(URL_APP + "/");
    await p.locator(D("bouton-demarrer")).waitFor();
    const liens = await p.locator('a[href*="moteurs"], a[href*="admin"], [data-el="bouton-moteurs"]').count();
    expect(liens).toBe(0);
    await cap(p, "US-5.E1-E1-01-declencheur.png", "appareil sans compte administrateur : accueil, aucun bouton ni lien Moteurs");
    await p.goto(URL_APP + "/moteurs");
    await expect(p).toHaveURL(/\/$/); // redirigé vers l'accueil
    await expect(p.locator('[data-screen="S5"]')).toHaveCount(0);
    await cap(p, "US-5.E1-E1-02-resultat.png", "ouverture de /moteurs : renvoyé à l'accueil, pas d'écran Moteurs");
    // serveur : lecture et écriture refusées (clé publique = ce que détient un visiteur). Écriture tentée sur un filtre qui ne vise AUCUNE ligne.
    const lire = await fetch(`${env.VITE_SUPABASE_URL}/rest/v1/moteurs?select=service,actif`, { headers: H });
    const lireTxt = await lire.text();
    const ecrire = await fetch(`${env.VITE_SUPABASE_URL}/rest/v1/moteurs?service=eq.__aucune_ligne__`, { method: "PATCH", headers: { ...H, "Content-Type": "application/json", Prefer: "return=representation" }, body: JSON.stringify({ actif: "ptv" }) });
    const ecrireTxt = await ecrire.text();
    const cles = await fetch(`${env.VITE_SUPABASE_URL}/rest/v1/cles_fournisseurs?select=fournisseur`, { headers: H });
    const clesTxt = await cles.text();
    const fonc = await fetch(`${env.VITE_SUPABASE_URL}/functions/v1/moteurs`, { method: "POST", headers: { ...H, "Content-Type": "application/json" }, body: JSON.stringify({ action: "lister" }) });
    const foncTxt = await fonc.text();
    const lignesLues = (() => { try { const j = JSON.parse(lireTxt); return Array.isArray(j) ? j.length : -1; } catch { return -1; } })();
    const clesLues = (() => { try { const j = JSON.parse(clesTxt); return Array.isArray(j) ? j.length : -1; } catch { return -1; } })();
    const ecrireRefuse = !ecrire.ok || ecrireTxt === "[]" || ecrireTxt === "";
    const verdict = { lire: `${lire.status} · ${lignesLues} ligne(s)`, ecrire: `${ecrire.status} · ${ecrireTxt.slice(0, 120)}`, cles: `${cles.status} · ${clesLues} ligne(s)`, fonction: `${fonc.status} · ${foncTxt.slice(0, 120)}` };
    console.log("   refus serveur", JSON.stringify(verdict));
    const q = await c.newPage();
    const esc = (s) => s.replace(/[<&]/g, (m) => (m === "<" ? "&lt;" : "&amp;"));
    await q.setContent(`<html><body style="font:14px system-ui;padding:14px;margin:0;max-width:390px;box-sizing:border-box"><h3>Visiteur (clé publique) face aux moteurs</h3><table border=1 cellpadding=5 style="border-collapse:collapse;font-size:12px;table-layout:fixed;width:100%;word-break:break-all"><colgroup><col style="width:26%"><col style="width:12%"><col></colgroup>
      <tr><th>requête</th><th>statut</th><th>réponse</th></tr>
      <tr><td>GET /rest/v1/moteurs</td><td>${lire.status}</td><td>${esc(lireTxt.slice(0, 140))} → ${lignesLues} ligne(s) visible(s)</td></tr>
      <tr><td>PATCH /rest/v1/moteurs (filtre sans ligne)</td><td>${ecrire.status}</td><td>${esc(ecrireTxt.slice(0, 140)) || "(vide)"}</td></tr>
      <tr><td>GET /rest/v1/cles_fournisseurs</td><td>${cles.status}</td><td>${esc(clesTxt.slice(0, 140))} → ${clesLues} ligne(s)</td></tr>
      <tr><td>POST /functions/v1/moteurs {action: lister}</td><td>${fonc.status}</td><td>${esc(foncTxt.slice(0, 140))}</td></tr></table>
      <p style="color:#666;font-size:12px">Relevé du ${new Date().toISOString()} ; aucune valeur de clé lue ; l'écriture visait un filtre qui ne touche aucune ligne.</p></body></html>`);
    await cap(q, "US-5.E1-E1-03-retour.png", "relevé des refus du serveur (page texte rendue à partir des vraies réponses)");
    expect(lignesLues === 0 || !lire.ok).toBe(true);
    expect(ecrireRefuse).toBe(true);
    expect(clesLues === 0 || !cles.ok).toBe(true);
    expect(fonc.ok).toBe(false);
    await c.close();
    return `lecture ${verdict.lire} ; écriture ${verdict.ecrire} ; clés ${verdict.cles} ; fonction ${verdict.fonction}`;
  });

  // US-5.1, 5.2, 5.6 : administrateur ÉPHÉMÈRE en lecture seule
  let email = null;
  try {
    email = await creerAdminEphemere();
    console.log(`[${heure()}] admin éphémère créé : ${email}`);
    const connecter = async (p) => {
      await p.goto(await lienMagique(email, `${URL_APP}/`));
      await expect(p.locator(D("bouton-demarrer"))).toBeVisible({ timeout: 30000 });
      // la session du lien magique doit être posée dans le navigateur avant de changer de page
      await expect.poll(() => p.evaluate(() => Object.keys(localStorage).some((k) => /auth/i.test(k) && /access_token/.test(localStorage.getItem(k) ?? ""))), { timeout: 30000 }).toBe(true);
    };
    const ouvrirMoteurs = async (p) => {
      await p.goto(URL_APP + "/moteurs");
      await expect(p.locator('[data-screen="S5"]')).toBeVisible({ timeout: 20000 });
      await expect.poll(() => p.locator(D("moteur")).count(), { timeout: 40000 }).toBeGreaterThanOrEqual(6);
      await expect(p.locator('[data-el="etat-moteur"]').first()).not.toHaveText("");
    };
    await histoire("US-5.1", async () => {
      const c = await contexte({ voiture: true }); const p = await c.newPage();
      await connecter(p);
      expect(await p.locator('[data-el="bouton-moteurs"]').count()).toBe(0);
      await cap(p, "US-5.1-01-ouvrir-les-moteurs-avant.png", "administrateur connecté, accueil : plus de bouton ⚙ en V1");
      await ouvrirMoteurs(p);
      const noms = await p.locator("li.mot h3").evaluateAll((e) => e.map((x) => x.textContent.replace(/\s+/g, " ").trim()));
      await cap(p, "US-5.1-02-ouvrir-les-moteurs-apres.png", `écran Moteurs par /moteurs : ${noms.length} services`);
      await c.close();
      return noms.join(" | ");
    });
    await histoire("US-5.2", async () => {
      const c = await contexte({ voiture: true }); const p = await c.newPage();
      await connecter(p); await ouvrirMoteurs(p);
      await p.locator('[data-service="peages"]').scrollIntoViewIfNeeded();
      await cap(p, "US-5.2-01-choisir-le-fournisseur-avant.png", "écran Moteurs, carte Péages (PTV actif)");
      const sel = p.locator(D("choix-fournisseur"));
      const options = await sel.locator("option").allInnerTexts();
      const autre = (await sel.locator("option").evaluateAll((o) => o.map((x) => x.value))).find((v) => v !== "ptv") ?? null;
      const avant = await p.locator('[data-service="peages"] [data-el="etat-moteur"]').innerText();
      if (autre) await sel.selectOption(autre); // choix local seulement : « Enregistrer » n'est PAS touché
      const apres = await p.locator('[data-service="peages"] [data-el="etat-moteur"]').innerText();
      await p.locator('[data-service="peages"]').scrollIntoViewIfNeeded();
      await cap(p, "US-5.2-02-choisir-le-fournisseur-apres.png", `choix local sans enregistrer : péages ${autre ?? "(aucun autre)"} ; état « ${avant} » → « ${apres} »`);
      await c.close();
      return `options ${options.join(" / ")} ; état « ${avant} » → « ${apres} » (rien enregistré)`;
    });
    await histoire("US-5.6", async () => {
      const c = await contexte({ voiture: true }); const p = await c.newPage();
      await connecter(p); await ouvrirMoteurs(p);
      await cap(p, "US-5.6-01-ou-trouver-ma-cle-avant.png", "écran Moteurs, administrateur");
      const ptv = p.locator('[data-service="peages"]');
      await ptv.scrollIntoViewIfNeeded();
      const lien = ptv.locator(`${D("lien-cle")} a`);
      const href = await lien.getAttribute("href");
      const consigne = await ptv.locator(D("consigne-cle")).innerText().catch(() => "");
      expect(href).toBe("https://developer.myptv.com/en");
      expect(consigne).toMatch(/API Keys/i);
      await cap(p, "US-5.6-02-ou-trouver-ma-cle-apres.png", `fiche Péages : ${href} ${consigne.trim()}`);
      const it = p.locator('[data-service="itineraire"]');
      await it.scrollIntoViewIfNeeded();
      const selIt = it.locator("select").first();
      await selIt.selectOption("stadia"); // choix local sans enregistrer
      const hrefIt = await it.locator(`${D("lien-cle")} a`).first().getAttribute("href");
      expect(hrefIt).toBe("https://client.stadiamaps.com/dashboard/");
      await cap(p, "US-5.6-03-lien-stadia.png", `fiche Itinéraire sur Stadia : ${hrefIt}`);
      const vo = p.locator('[data-service="voitures"]');
      const n = await vo.count();
      if (n) {
        await vo.scrollIntoViewIfNeeded();
        expect(await vo.locator(D("lien-cle")).count()).toBe(0);
      }
      await cap(p, "US-5.6-04-sans-cle.png", n ? "fiche Voitures : aucun lien de clé" : "pas de fiche « voitures » (voir les services listés)");
      await c.close();
      return `PTV ${href} (${consigne.trim()}) ; Stadia ${hrefIt} ; Voitures sans lien : ${n ? "oui" : "service introuvable"}`;
    });
  } finally {
    await supprimerAdminsEphemeres();
    const reste = await adminsEphemeresRestants();
    console.log(`[${heure()}] administrateurs éphémères restants (relu) : ${reste}`);
    histoires.push({ id: "nettoyage-admin-ephemere", ok: reste === 0, constat: `${reste} compte(s) m3-admin-eph-* restant(s) après suppression` });
  }
}


// ================================================================= m5 — US-NEW-1 et US-NEW-2 (durcissement D3, D10)
async function groupeNouveaux() {
  await histoire("US-NEW-1", async () => {
    const c = await contexte(); const p = await c.newPage(); // pas de script d'injection de la voiture : « Effacer » doit vraiment la retirer
    await p.goto(URL_APP + "/voiture");
    await p.locator("#d2").waitFor();
    await p.evaluate((v) => localStorage.setItem("pt-voiture-v1", v), JSON.stringify(VOITURE)); // voiture enregistrée, que « Effacer » doit retirer
    // MOCKED: exception de rendu provoquée — Number.prototype.toLocaleString lève une erreur (la fiche d'une version formate ses nombres) — injection
    await p.evaluate(() => { Number.prototype.toLocaleString = function () { throw new Error("boom (injection de test)"); }; });
    await cap(p, "US-NEW-1-01-avant.png", "injection armée sur l'écran Ma voiture (champ D.2 vide)");
    await p.fill("#d2", "5RBU0C");
    await expect(p.locator(D("barriere-erreur"))).toBeVisible({ timeout: 30000 });
    await expect(p.locator(D("barriere-erreur"))).toContainText("L'écran n'a pas pu s'afficher");
    await expect(p.locator(D("barriere-recharger"))).toHaveText("Recharger");
    await expect(p.locator(D("barriere-effacer"))).toHaveText("Effacer les données locales de l'appli");
    const racine = await p.evaluate(() => document.getElementById("root").innerText.trim().length);
    expect(racine).toBeGreaterThan(50); // pas de page blanche
    await cap(p, "US-NEW-1-02-apres.png", "injection : « L'écran n'a pas pu s'afficher » avec Recharger et Effacer les données locales, pas de page blanche");
    await p.locator(D("barriere-effacer")).click();
    await expect(p).toHaveURL(/\/$/, { timeout: 20000 });
    await expect(p.locator(D("ma-voiture"))).toHaveAttribute("data-vide", "oui", { timeout: 20000 });
    expect(await p.evaluate(() => localStorage.getItem("pt-voiture-v1"))).toBeNull();
    await cap(p, "US-NEW-1-03-apres.png", "après « Effacer » : accueil sans voiture (invitation à enregistrer la voiture)");
    await c.close();
    return "barrière affichée (injection), Effacer : accueil sans voiture, pt-voiture-v1 absent";
  });

  await histoire("US-NEW-2", async () => {
    const c = await navigateur.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: false, permissions: ["geolocation"], geolocation: { ...ALBI, accuracy: 5 }, locale: "fr-FR", timezoneId: "Europe/Paris" });
    ouverts.push(c);
    const p = await c.newPage();
    await p.goto(URL_APP + "/");
    await p.locator(D("bouton-demarrer")).waitFor();
    await cap(p, "US-NEW-2-01-avant.png", "écran 844 × 390 (paysage), accueil");
    await p.locator(D("onglet-stations")).tap();
    await expect(lignes(p).first()).toBeVisible({ timeout: 40000 });
    await expect(p.locator(D("carte-stations"))).toHaveAttribute("data-pastilles", /\d+/);
    const mesure = await p.evaluate(() => {
      const sc = document.querySelector(".scroll"), carte = document.querySelector('[data-el="carte-stations"]').getBoundingClientRect(), nav = document.querySelector('[role="tablist"]')?.getBoundingClientRect(), l = document.querySelector('[data-el="ligne-station"]').getBoundingClientRect();
      return { defile: sc ? sc.scrollHeight > sc.clientHeight : document.documentElement.scrollHeight > innerHeight, carteH: Math.round(carte.height), navHaut: nav ? Math.round(nav.top) : null, navBas: nav ? Math.round(nav.bottom) : null, ligneTop: Math.round(l.top), vh: innerHeight };
    });
    console.log("   mesure paysage", JSON.stringify(mesure));
    expect(mesure.carteH).toBeLessThan(300);
    expect(mesure.navBas).toBeGreaterThanOrEqual(mesure.vh - 2);
    await p.waitForTimeout(500);
    // la page défile : la liste monte sous la carte réduite, la barre d'onglets reste en bas
    const top0 = await p.evaluate(() => Math.round(document.querySelector('[data-el="liste-stations"]').getBoundingClientRect().top));
    await p.mouse.move(420, 300);
    await p.mouse.wheel(0, Math.max(0, top0 - 175));
    const defile = { avant: top0, apres: 0 };
    await p.waitForTimeout(300);
    const apres = await p.evaluate(() => { const l = document.querySelector('[data-el="ligne-station"]').getBoundingClientRect(), n = document.querySelector('[role="tablist"]').getBoundingClientRect(), k = document.querySelector('[data-el="carte-stations"]').getBoundingClientRect(); return { ligneVisible: l.top >= 0 && l.bottom <= n.top + 1, ligneTop: Math.round(l.top), navTop: Math.round(n.top), carteBas: Math.round(k.bottom) }; });
    console.log("   défilement", JSON.stringify(defile), "après", JSON.stringify(apres));
    defile.apres = await p.evaluate(() => Math.round(document.querySelector('[data-el="liste-stations"]').getBoundingClientRect().top));
    expect(defile.apres).toBeLessThan(defile.avant); // la page défile : la liste est montée
    expect(apres.ligneVisible).toBe(true);
    await cap(p, "US-NEW-2-02-apres.png", `paysage : carte réduite (${mesure.carteH} px), page défilée de ${defile.avant - defile.apres} px, liste lisible, onglets en bas`);
    await c.close();
    return JSON.stringify({ mesure, apres });
  });
}

// ================================================================= exécution
for (const g of GROUPES) {
  if (g === "m1") await groupeM1();
  else if (g === "m2" || g === "m4") await groupeM2M4();
  else if (g === "m3") await groupeM3();
  else if (g === "nouveaux") await groupeNouveaux();
}
fs.writeFileSync(path.join(AUX, `complement-resultats-${GROUPES.join("-")}.json`), JSON.stringify({ groupes: GROUPES, histoires, resultats }, null, 1));
for (const c of ouverts) await c.close().catch(() => {});
await navigateur.close();
console.log(`[${heure()}] fin : ${histoires.filter((h) => h.ok).length}/${histoires.length} histoires OK ; ${resultats.length} captures`);
process.exit(histoires.some((h) => !h.ok) ? 1 : 0);
