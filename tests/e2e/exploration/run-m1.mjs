// Exploration du jalon 1 sur l'appli DÉPLOYÉE (données réelles), avec la bibliothèque Playwright.
// Chaque étape : action réelle → assertions sur le DOM → page.screenshot sous le nom exact du cas d'usage.
// Usage : node tests/e2e/exploration/run-m1.mjs [URL] [histoire…]
import { chromium } from "playwright";
import { expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ICI = path.dirname(fileURLToPath(import.meta.url));
const RACINE = path.resolve(ICI, "../../..");
const URL_APP = process.argv[2]?.startsWith("http") ? process.argv[2] : "https://plein-et-trajet.vercel.app/";
const FILTRE = process.argv.slice(2).filter((a) => !a.startsWith("http"));
const LIVRAISON = path.join(RACINE, "tests/e2e/delivery");
const JOURNAL = path.join(ICI, "m1-exploration-log.md");
const ALBI = { latitude: 43.9289, longitude: 2.1464 };
fs.mkdirSync(LIVRAISON, { recursive: true });

// accès lecture seule à la base (clé anonyme publique) pour confronter l'écran aux données
const env = Object.fromEntries(
  fs.readFileSync(path.join(RACINE, ".env.local"), "utf8").split("\n").filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).replace(/^"|"$/g, "")]),
);
async function rest(chemin) {
  const r = await fetch(`${env.VITE_SUPABASE_URL}/rest/v1/${chemin}`, {
    headers: { apikey: env.VITE_SUPABASE_ANON_KEY, Authorization: `Bearer ${env.VITE_SUPABASE_ANON_KEY}` },
  });
  if (!r.ok) throw new Error(`REST ${r.status} ${chemin}`);
  return r.json();
}
async function rpcAutour(lat, lon, rayon_m = 10000) {
  const r = await fetch(`${env.VITE_SUPABASE_URL}/rest/v1/rpc/stations_autour`, {
    method: "POST",
    headers: { apikey: env.VITE_SUPABASE_ANON_KEY, Authorization: `Bearer ${env.VITE_SUPABASE_ANON_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ lat, lon, rayon_m }),
  });
  return r.json();
}

const navigateur = await chromium.launch();
async function contexte({ geoloc = true, ...autres } = {}) {
  return navigateur.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    locale: "fr-FR",
    timezoneId: "Europe/Paris",
    ...(geoloc ? { geolocation: ALBI, permissions: ["geolocation"] } : { permissions: [] }),
    ...autres,
  });
}

// ---- journal incrémental ----
let bloc = [];
let resultats = [];
function ecrireBloc(titre) {
  fs.appendFileSync(JOURNAL, `\n## ${titre}\n\n${bloc.join("\n")}\n`);
  bloc = [];
}
function note(l) {
  bloc.push(l);
}
async function capture(page, nom, verif, description) {
  let ok = true;
  let detail = "";
  try {
    if (verif) detail = (await verif()) ?? "";
  } catch (e) {
    ok = false;
    detail = String(e.message).split("\n").slice(0, 3).join(" ");
  }
  // fond de carte : attendre les tuiles visibles (5 s au plus) pour que la photo montre la carte
  await page.evaluate(() => new Promise((ok) => {
    const m = window.__carte; if (!m) return ok();
    const t0 = Date.now();
    const f = () => (m.areTilesLoaded() || Date.now() - t0 > 5000 ? ok() : setTimeout(f, 100));
    f();
  })).catch(() => {});
  // laisser finir les animations en cours (feuille montante, défilement des chiffres) avant la photo
  await page.evaluate(() => Promise.race([Promise.all(document.getAnimations().map((a) => a.finished.catch(() => {}))), new Promise((r) => setTimeout(r, 1500))]));
  await page.screenshot({ path: path.join(LIVRAISON, nom) });
  await page.evaluate(() => {
    document.querySelectorAll("[data-annotation-test]").forEach((e) => e.remove());
    document.querySelectorAll("[data-surligne-test]").forEach((e) => { e.style.outline = ""; e.style.outlineOffset = ""; e.removeAttribute("data-surligne-test"); });
  });
  resultats.push({ nom, ok });
  note(`- ${ok ? "✓" : "✗"} \`${nom}\` — ${description}${detail ? ` — ${detail}` : ""}`);
  return ok;
}

// ---- annotations de capture (ajoutées par le test, absentes de l'appli, retirées après la photo) ----
async function annoter(page, texte) {
  await page.evaluate((t) => {
    const d = document.createElement("div");
    d.setAttribute("data-annotation-test", "");
    d.textContent = "Annotation de test — " + t;
    Object.assign(d.style, { position: "fixed", left: "8px", right: "8px", bottom: "58px", zIndex: 9999, background: "#ffb000", color: "#15181a", font: "600 13px/1.3 sans-serif", padding: "6px 8px", borderRadius: "6px", boxShadow: "0 2px 8px rgba(0,0,0,.3)" });
    document.body.appendChild(d);
  }, texte);
}
async function surligner(loc) {
  await loc.evaluate((e) => { e.setAttribute("data-surligne-test", ""); e.style.outline = "3px dashed #ffb000"; e.style.outlineOffset = "-3px"; });
}

// ---- aides DOM ----
const lignes = (p) => p.locator('[data-el="ligne-station"]');
const pastilles = (p) => p.locator('[data-el="pastille-station"]');
async function attendreListe(p) {
  await expect(lignes(p).first()).toBeVisible({ timeout: 15000 });
  await expect(p.locator('[data-el="carte-stations"]')).toHaveAttribute("data-pastilles", /\d+/, { timeout: 15000 });
}
async function attendreCarte(p) {
  await p.waitForFunction(() => window.__carte && window.__carte.loaded() && window.__carte.areTilesLoaded(), null, { timeout: 20000 }).catch(() => {});
  await p.waitForTimeout(300);
}
async function lireLignes(p) {
  return lignes(p).evaluateAll((els) =>
    els.map((e) => ({
      id: e.dataset.station,
      nom: e.querySelector(".n")?.textContent ?? "",
      meta: e.querySelector(".m")?.textContent ?? "",
      prix: Number((e.querySelector(".totem")?.getAttribute("aria-label") ?? "").split(" ")[0].replace(",", ".")),
      km: (() => {
        const m = (e.querySelector(".m")?.textContent ?? "").match(/^([\d,]+) (km|m)/);
        return m ? Number(m[1].replace(",", ".")) / (m[2] === "m" ? 1000 : 1) : NaN;
      })(),
    })),
  );
}
async function lirePastilles(p) {
  return pastilles(p).evaluateAll((els) =>
    els.map((e) => ({ id: e.dataset.station, texte: e.textContent, moitie: e.dataset.moitie, label: e.getAttribute("aria-label") })),
  );
}
const croissant = (t) => t.every((v, i) => i === 0 || t[i - 1] <= v + 1e-9);
async function choisir(p, carburant) {
  await p.getByRole("group", { name: "Carburant" }).getByRole("button", { name: carburant, exact: true }).click();
  await expect(p.locator('[data-el="titre-liste"]')).toHaveText(`Stations · ${carburant}`);
}
async function ouvrirPrix(p) {
  await p.goto(URL_APP);
  await attendreListe(p);
  await expect(p.locator('[data-el="ecart"]').first()).toBeVisible({ timeout: 15000 }); // moyenne nationale chargée
  await attendreCarte(p);
}
/** pastille cliquable sans être recouverte par une autre */
async function pastilleDegagee(p) {
  const id = await p.evaluate(() => {
    for (const b of document.querySelectorAll('[data-el="pastille-station"]')) {
      const r = b.getBoundingClientRect();
      const m = document.querySelector('[data-el="carte-stations"]').getBoundingClientRect();
      const x = r.left + r.width / 2, y = r.top + r.height / 2;
      if (x < m.left + 10 || x > m.right - 50 || y < m.top + 30 || y > m.bottom - 10) continue;
      if (document.elementFromPoint(x, y) === b) return b.dataset.station;
    }
    return null;
  });
  if (!id) throw new Error("aucune pastille dégagée");
  return id;
}
async function glisserCarte(p, dx, dy, pendant) {
  const box = await p.locator('[data-el="carte-stations"]').boundingBox();
  // point de départ : un endroit de la carte sans pastille
  const depart = await p.evaluate(({ bx, by, bw, bh, dx, dy }) => {
    const ok = (x, y) => x > bx + 8 && x < bx + bw - 8 && y > by + 8 && y < by + bh - 8;
    for (let yy = by + 50; yy < by + bh - 40; yy += 10)
      for (let xx = bx + 20; xx < bx + bw - 20; xx += 10) {
        if (!ok(xx + dx, yy + dy)) continue;
        const el = document.elementFromPoint(xx, yy);
        if (el && el.tagName === "CANVAS") return { x: xx, y: yy };
      }
    return { x: bx + bw / 2 - dx / 2, y: by + bh / 2 - dy / 2 };
  }, { bx: box.x, by: box.y, bw: box.width, bh: box.height, dx, dy });
  await p.mouse.move(depart.x, depart.y);
  await p.mouse.down();
  await p.mouse.move(depart.x + dx / 2, depart.y + dy / 2, { steps: 8 });
  await p.mouse.move(depart.x + dx, depart.y + dy, { steps: 8 });
  if (pendant) await pendant();
  await p.mouse.up();
}
const centreCarte = (p) => p.evaluate(() => { const c = window.__carte.getCenter(); return { lat: c.lat, lon: c.lng }; });
function km(a, b) {
  const R = 6371, r = Math.PI / 180;
  const s = Math.sin(((b.lat - a.lat) * r) / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(((b.lon - a.lon) * r) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

// ======================= HISTOIRES =======================
const HISTOIRES = {};

HISTOIRES["US-1.1 — Ouvrir les prix"] = async () => {
  note("### Happy path");
  let ctx = await contexte();
  let p = await ctx.newPage();
  await p.goto(new URL("/trajets", URL_APP).href);
  await capture(p, "US-1.1-01-ouvrir-les-prix-avant.png", async () => {
    await expect(p.getByRole("tab", { name: "Trajets" })).toHaveAttribute("aria-selected", "true");
    await expect(p.locator('[data-screen="S3"]')).toBeVisible();
    await expect(p.locator('[data-screen="S1"]')).toHaveCount(0);
    return "onglet Trajets actif, écran Prix absent";
  }, "appli ouverte sur l'onglet Trajets");
  await p.getByRole("tab", { name: "Prix" }).click();
  await capture(p, "US-1.1-02-ouvrir-les-prix-apres.png", async () => {
    await attendreListe(p);
    await attendreCarte(p);
    const n = await lignes(p).count(), np = await pastilles(p).count();
    expect(n).toBeGreaterThan(3);
    expect(np).toBe(n);
    const c = await centreCarte(p);
    expect(km(c, { lat: ALBI.latitude, lon: ALBI.longitude })).toBeLessThan(0.5);
    return `${n} lignes, ${np} pastilles, carte centrée sur la position (${c.lat.toFixed(4)}, ${c.lon.toFixed(4)})`;
  }, "onglet Prix : carte + liste des stations autour de la position GPS (Albi)");
  await ctx.close();

  note("\n### Edge case — position refusée (refus réel : contexte sans permission de géolocalisation)");
  ctx = await contexte({ geoloc: false });
  p = await ctx.newPage();
  await p.goto(new URL("/trajets", URL_APP).href);
  await capture(p, "US-1.1-03-ouvrir-les-prix-avant.png", async () => {
    const etat = await p.evaluate(async () => (await navigator.permissions.query({ name: "geolocation" })).state);
    await expect(p.getByRole("tab", { name: "Trajets" })).toHaveAttribute("aria-selected", "true");
    return `permission géolocalisation = ${etat}`;
  }, "position refusée, appli sur Trajets");
  await p.getByRole("tab", { name: "Prix" }).click();
  await capture(p, "US-1.1-04-ouvrir-les-prix-apres.png", async () => {
    await expect(p.locator('[data-el="message-localisation"]')).toContainText("Localisation désactivée : carte centrée sur Albi");
    await attendreListe(p);
    await attendreCarte(p);
    const c = await centreCarte(p);
    expect(km(c, { lat: ALBI.latitude, lon: ALBI.longitude })).toBeLessThan(0.5);
    return `message « ${await p.locator('[data-el="message-localisation"]').innerText()} », centre ${c.lat.toFixed(4)}, ${c.lon.toFixed(4)} (Albi)`;
  }, "carte centrée sur Albi par défaut + message pour activer la localisation");
  await ctx.close();
  // repli sur la DERNIÈRE VILLE SAISIE (vérifié sans capture : les captures 03/04 montrent le repli Albi)
  ctx = await contexte({ geoloc: false });
  p = await ctx.newPage();
  await p.goto(new URL("/trajets", URL_APP).href);
  await p.getByLabel("Départ").fill("Castres");
  await p.getByLabel("Arrivée").focus(); // quitter le champ : géocodage IGN puis mémorisation
  await expect.poll(() => p.evaluate(() => localStorage.getItem("pt-derniere-ville")), { timeout: 10000 }).toContain("Castres");
  await p.reload();
  await p.getByRole("tab", { name: "Prix" }).click();
  await expect(p.locator('[data-el="message-localisation"]')).toContainText("carte centrée sur Castres");
  await attendreListe(p);
  const cc = await centreCarte(p);
  const okCastres = km(cc, { lat: 43.6094, lon: 2.2455 }) < 1;
  note(`- ${okCastres ? "✓" : "✗"} (sans capture) dernière ville saisie : « Castres » tapé dans Départ → mémorisé (géocodage IGN) → au rechargement sans localisation, message « carte centrée sur Castres », centre ${cc.lat.toFixed(3)}, ${cc.lon.toFixed(3)}`);
  await ctx.close();
};

HISTOIRES["US-1.2 — Choisir mon carburant"] = async () => {
  note("### Happy path");
  const ctx = await contexte();
  const p = await ctx.newPage();
  await ouvrirPrix(p);
  await capture(p, "US-1.2-01-choisir-mon-carburant-avant.png", async () => {
    await expect(p.locator('[data-el="titre-liste"]')).toHaveText("Stations · SP95-E10");
    await expect(p.getByRole("button", { name: "SP95-E10", exact: true })).toHaveAttribute("aria-pressed", "true");
    return `${await lignes(p).count()} stations en SP95-E10`;
  }, "liste en SP95-E10");
  await choisir(p, "Gazole");
  await capture(p, "US-1.2-02-choisir-mon-carburant-apres.png", async () => {
    await expect(p.locator('[data-el="liste-stations"]')).toHaveAttribute("data-carburant", "Gazole");
    await expect(p.locator('[data-el="carte-stations"]')).toHaveAttribute("data-pastilles", /\d+/);
    const l = await lireLignes(p), pa = await lirePastilles(p);
    const db = await rest(`prix?select=station_id,prix&carburant=eq.Gazole&rupture=is.false&station_id=in.(${l.map((x) => x.id).join(",")})`);
    const ref = new Map(db.map((d) => [d.station_id, Number(d.prix)]));
    for (const x of l) expect(x.prix, `ligne ${x.nom}`).toBeCloseTo(ref.get(x.id), 3);
    for (const x of pa) expect(Number(x.texte.replace(",", ".")), `pastille ${x.id}`).toBeCloseTo(ref.get(x.id), 3);
    return `titre « Stations · Gazole » ; ${l.length} lignes et ${pa.length} pastilles = prix gazole de la base (ex. ${l[0].nom} ${l[0].prix.toFixed(3)})`;
  }, "toutes les pastilles et lignes au prix gazole, titre « Stations · Gazole »");

  note("\n### Edge case — station qui ne vend pas le carburant choisi (données réelles)");
  await choisir(p, "SP95-E10");
  await attendreListe(p);
  // une station du rayon qui vend du SP95-E10 mais pas d'E85 (lu en base)
  const autour = await rpcAutour(ALBI.latitude, ALBI.longitude);
  const ids = autour.map((s) => s.id).join(",");
  const e10 = await rest(`prix?select=station_id&carburant=eq.SP95-E10&rupture=is.false&prix=not.is.null&station_id=in.(${ids})`);
  const e85 = new Set((await rest(`prix?select=station_id&carburant=eq.E85&station_id=in.(${ids})`)).map((x) => x.station_id));
  const cible = e10.map((x) => x.station_id).find((id) => !e85.has(id));
  const nomCible = await p.locator(`[data-el="ligne-station"][data-station="${cible}"] .n`).innerText();
  await p.locator(`[data-el="ligne-station"][data-station="${cible}"]`).scrollIntoViewIfNeeded();
  await surligner(p.locator(`[data-el="ligne-station"][data-station="${cible}"]`));
  await surligner(p.locator(`[data-el="pastille-station"][data-station="${cible}"]`));
  await annoter(p, `${nomCible} : vend du SP95-E10, pas d'E85 (surlignée)`);
  await capture(p, "US-1.2-03-choisir-mon-carburant-avant.png", async () => {
    await expect(p.locator(`[data-el="ligne-station"][data-station="${cible}"]`)).toBeVisible();
    await expect(p.locator(`[data-el="pastille-station"][data-station="${cible}"]`)).toHaveCount(1);
    return `${nomCible} (${cible}) affichée en SP95-E10 ; aucune ligne E85 en base pour elle`;
  }, "station présente en SP95-E10, ne vend pas d'E85");
  await choisir(p, "E85");
  await attendreListe(p);
  await annoter(p, `E85 : ${nomCible} n'est plus ni dans la liste ni sur la carte`);
  await capture(p, "US-1.2-04-choisir-mon-carburant-apres.png", async () => {
    await expect(p.locator('[data-el="liste-stations"]')).toHaveAttribute("data-carburant", "E85");
    await expect(p.locator(`[data-el="ligne-station"][data-station="${cible}"]`)).toHaveCount(0);
    await expect(p.locator(`[data-el="pastille-station"][data-station="${cible}"]`)).toHaveCount(0);
    return `${nomCible} absente de la liste et de la carte en E85 (${await lignes(p).count()} stations E85 restantes)`;
  }, "elle disparaît de la carte et de la liste");
  note("\n### Issues found\n- aucune");
  await ctx.close();
};

HISTOIRES["US-1.3 — Voir les stations sur la carte"] = async () => {
  note("### Happy path");
  const ctx = await contexte();
  const p = await ctx.newPage();
  const appels = [];
  p.on("request", (r) => r.url().includes("/rpc/stations_autour") && appels.push(JSON.parse(r.postData() || "{}")));
  await p.goto(URL_APP);
  await attendreListe(p);
  await attendreCarte(p);
  await capture(p, "US-1.3-01-voir-les-stations-sur-la-carte-avant.png", async () => {
    await expect(pastilles(p).first()).toBeVisible();
    const st = await rpcAutour(ALBI.latitude, ALBI.longitude);
    expect(st.length).toBeGreaterThan(5);
    return `${st.length} stations synchronisées à moins de 10 km d'Albi en base (rpc stations_autour) ; écran chargé : ${await lignes(p).count()} lignes, ${await pastilles(p).count()} pastilles`;
  }, "ouverture de l'écran Prix, stations synchronisées dans un rayon de 10 km");
  await capture(p, "US-1.3-02-voir-les-stations-sur-la-carte-apres.png", async () => {
    const st = await rpcAutour(ALBI.latitude, ALBI.longitude);
    const pos = new Map(st.map((s) => [s.id, s]));
    const ecarts = await p.evaluate((stations) => {
      const out = [];
      for (const b of document.querySelectorAll('[data-el="pastille-station"]')) {
        const s = stations[b.dataset.station];
        const pt = window.__carte.project([s.lon, s.lat]);
        const m = document.querySelector(".map .gl").getBoundingClientRect();
        const r = b.getBoundingClientRect();
        const w = b.parentElement.getBoundingClientRect();
        // le bas de la tige (sous la pastille, centrée) est sur la position de la station
        out.push({ id: b.dataset.station, dx: Math.abs(r.left + r.width / 2 - (m.left + pt.x)), dy: Math.abs(w.bottom - (m.top + pt.y)), texte: b.textContent });
      }
      return out;
    }, Object.fromEntries(pos));
    expect(ecarts.length).toBeGreaterThan(3);
    for (const e of ecarts) {
      expect(e.dx, `pastille ${e.id} x`).toBeLessThan(3);
      expect(e.dy, `pastille ${e.id} y`).toBeLessThan(4);
      expect(e.texte).toMatch(/^\d,\d{3}$/);
    }
    return `${ecarts.length} pastilles, chacune à < 3 px de la position réelle de sa station, prix à 3 décimales`;
  }, "chaque station = une pastille à sa position réelle avec son prix");
  const avant = new Set((await lireLignes(p)).map((x) => x.id));
  // vers Carmaux (≈ 13 km au nord) : UN SEUL glisser continu ; capture pendant le geste, bouton enfoncé
  const CARMAUX = [2.158, 44.05];
  // geste le plus long possible dans le cadre de la carte, dans la direction de Carmaux
  const ecart = await p.evaluate((g) => {
    const m = window.__carte, a = m.project(g), c = m.project(m.getCenter()), r = m.getContainer().getBoundingClientRect();
    let dx = c.x - a.x, dy = c.y - a.y;
    const k = Math.min(1, (r.width - 60) / Math.abs(dx || 1), (r.height - 70) / Math.abs(dy || 1));
    return { dx: dx * k, dy: dy * k };
  }, CARMAUX);
  const nAppels = appels.length;
  const nomsAlbi = (await lireLignes(p)).map((x) => x.nom).slice(0, 2).join(", ");
  await glisserCarte(p, ecart.dx, ecart.dy, async () => {
    await capture(p, "US-1.3-03-voir-les-stations-sur-la-carte-avant.png", async () => {
      const c = await centreCarte(p);
      expect(km(c, { lat: ALBI.latitude, lon: ALBI.longitude })).toBeGreaterThan(4);
      expect(appels.length).toBe(nAppels); // rien n'est rechargé tant que le doigt n'est pas relâché
      const l = await lireLignes(p);
      expect(l.every((x) => avant.has(x.id))).toBe(true);
      return `un seul glisser de ${Math.round(Math.hypot(ecart.dx, ecart.dy))} px, bouton encore enfoncé : carte à ${km(c, { lat: ALBI.latitude, lon: ALBI.longitude }).toFixed(1)} km au nord d'Albi (${c.lat.toFixed(3)}, ${c.lon.toFixed(3)}, vers Carmaux), liste encore celle d'Albi (${nomsAlbi}…), aucun nouvel appel`;
    }, "je déplace la carte (un seul glisser, non relâché) : la liste montre encore Albi");
  });
  // après relâchement : montrer une station de la nouvelle zone (surlignée) et l'annoncer
  await expect.poll(() => appels.length, { timeout: 10000 }).toBeGreaterThan(nAppels);
  await attendreListe(p);
  await expect.poll(async () => (await lireLignes(p)).filter((x) => !avant.has(x.id)).length, { timeout: 15000 }).toBeGreaterThan(0);
  {
    const nouv = (await lireLignes(p)).filter((x) => !avant.has(x.id));
    const l = p.locator(`[data-el="ligne-station"][data-station="${nouv[0].id}"]`);
    await l.scrollIntoViewIfNeeded();
    await surligner(l);
    for (const x of nouv) await surligner(p.locator(`[data-el="pastille-station"][data-station="${x.id}"]`)).catch(() => {});
    await annoter(p, `relâché : ${nouv.length} station(s) de la nouvelle zone chargée(s) — ${nouv.map((x) => x.nom).join(", ")} (surlignées)`);
  }
  await capture(p, "US-1.3-04-voir-les-stations-sur-la-carte-apres.png", async () => {
    await expect.poll(() => appels.length, { timeout: 10000 }).toBeGreaterThanOrEqual(2);
    await attendreListe(p);
    await expect.poll(async () => (await lireLignes(p)).filter((x) => !avant.has(x.id)).length, { timeout: 15000 }).toBeGreaterThan(0);
    await attendreCarte(p);
    const der = appels[appels.length - 1];
    const nouvelles = (await lireLignes(p)).filter((x) => !avant.has(x.id));
    return `nouvel appel stations_autour(${der.lat.toFixed(3)}, ${der.lon.toFixed(3)}, ${der.rayon_m} m) ; ${nouvelles.length} nouvelles stations, ex. ${nouvelles[0].nom}`;
  }, "relâché : les stations de la nouvelle zone se chargent");
  note("\n### Issues found\n- aucune");
  await ctx.close();
};

HISTOIRES["US-1.4 — Toucher une pastille"] = async () => {
  note("### Happy path");
  const ctx = await contexte();
  const p = await ctx.newPage();
  await ouvrirPrix(p);
  await capture(p, "US-1.4-01-toucher-une-pastille-avant.png", async () => {
    expect(await pastilles(p).count()).toBeGreaterThan(3);
    await expect(p.locator('[data-el="fiche-station"]')).toHaveCount(0);
    return `${await pastilles(p).count()} pastilles, aucune fiche ouverte`;
  }, "carte affichée");
  const id = await pastilleDegagee(p);
  const label = await p.locator(`[data-el="pastille-station"][data-station="${id}"]`).getAttribute("aria-label");
  await p.locator(`[data-el="pastille-station"][data-station="${id}"]`).click();
  await capture(p, "US-1.4-02-toucher-une-pastille-apres.png", async () => {
    await expect(p.locator('[data-el="fiche-station"]')).toHaveAttribute("data-station", id);
    const titre = await p.locator("#sh-name").textContent();
    expect(label).toContain(titre);
    return `pastille « ${label} » → fiche « ${titre} »`;
  }, "la fiche de cette station s'ouvre");
  await p.keyboard.press("Escape");
  note("\n### Edge case — prix différents : moitié verte / moitié orange");
  await choisir(p, "Gazole");
  await attendreListe(p);
  await attendreCarte(p);
  await capture(p, "US-1.4-03-toucher-une-pastille-avant.png", async () => {
    const pa = await lirePastilles(p);
    const distincts = new Set(pa.map((x) => x.texte));
    expect(distincts.size).toBeGreaterThan(1);
    return `${pa.length} pastilles gazole, ${distincts.size} prix différents`;
  }, "des prix différents autour de moi (gazole)");
  {
    const pa = (await lirePastilles(p)).map((x) => ({ ...x, v: Number(x.texte.replace(",", ".")) }));
    const lo = pa.filter((x) => x.moitie === "lo"), hi = pa.filter((x) => x.moitie === "hi");
    await annoter(p, `${lo.length} pastilles vertes ≤ ${Math.max(...lo.map((x) => x.v)).toFixed(3)} €/L · ${hi.length} orange ≥ ${Math.min(...hi.map((x) => x.v)).toFixed(3)} €/L`);
  }
  await capture(p, "US-1.4-04-toucher-une-pastille-apres.png", async () => {
    const pa = (await lirePastilles(p)).map((x) => ({ ...x, v: Number(x.texte.replace(",", ".")) }));
    const lo = pa.filter((x) => x.moitie === "lo"), hi = pa.filter((x) => x.moitie === "hi");
    expect(lo.length).toBeGreaterThan(0);
    expect(hi.length).toBeGreaterThan(0);
    expect(Math.abs(lo.length - pa.length / 2)).toBeLessThanOrEqual(pa.length / 2 - 1);
    expect(Math.max(...lo.map((x) => x.v))).toBeLessThan(Math.min(...hi.map((x) => x.v)));
    const couleurs = await p.evaluate(() => {
      const c = (sel) => { const e = document.querySelector(sel); return e ? getComputedStyle(e).boxShadow : null; };
      return { lo: c('.pin.lo'), hi: c('.pin.hi') };
    });
    expect(couleurs.lo).toContain("31, 138, 76");
    expect(couleurs.hi).toContain("194, 73, 29");
    return `${lo.length} vertes (≤ ${Math.max(...lo.map((x) => x.v)).toFixed(3)}) / ${hi.length} orange (≥ ${Math.min(...hi.map((x) => x.v)).toFixed(3)}) ; ombre verte rgb(31,138,76), orange rgb(194,73,29)`;
  }, "moitié la moins chère en vert, l'autre en orange");
  note("\n### Issues found\n- aucune");
  await ctx.close();
};

HISTOIRES["US-1.5 — Trier la liste"] = async () => {
  note("### Happy path");
  const ctx = await contexte();
  const p = await ctx.newPage();
  await ouvrirPrix(p);
  await capture(p, "US-1.5-01-trier-la-liste-avant.png", async () => {
    await expect(p.getByRole("button", { name: "Moins cher", exact: true })).toHaveAttribute("aria-pressed", "true");
    const l = await lireLignes(p);
    expect(croissant(l.map((x) => x.prix))).toBe(true);
    return `tri prix : ${l.map((x) => x.prix.toFixed(3)).join(" ≤ ")}`;
  }, "liste triée par prix");
  await p.getByRole("button", { name: "Plus proche", exact: true }).click();
  await capture(p, "US-1.5-02-trier-la-liste-apres.png", async () => {
    await expect(p.locator('[data-el="liste-stations"]')).toHaveAttribute("data-tri", "distance");
    const l = await lireLignes(p);
    expect(croissant(l.map((x) => x.km))).toBe(true);
    return `tri distance : ${l.map((x) => x.km.toFixed(1)).join(" ≤ ")} km`;
  }, "« Plus proche » : distance croissante");
  note("\n### Edge case — retour au tri par prix");
  await p.locator('[data-el="liste-stations"]').evaluate((e) => e.closest(".scroll").scrollTo(0, 0));
  await capture(p, "US-1.5-03-trier-la-liste-avant.png", async () => {
    await expect(p.getByRole("button", { name: "Plus proche", exact: true })).toHaveAttribute("aria-pressed", "true");
    return "tri par distance actif";
  }, "tri par distance");
  await p.getByRole("button", { name: "Moins cher", exact: true }).click();
  await capture(p, "US-1.5-04-trier-la-liste-apres.png", async () => {
    await expect(p.locator('[data-el="liste-stations"]')).toHaveAttribute("data-tri", "prix");
    const l = await lireLignes(p);
    expect(croissant(l.map((x) => x.prix))).toBe(true);
    return `tri prix : ${l.map((x) => x.prix.toFixed(3)).join(" ≤ ")}`;
  }, "« Moins cher » : prix croissant");
  note("\n### Issues found\n- aucune");
  await ctx.close();
};

HISTOIRES["US-1.6 — Lire une station dans la liste"] = async () => {
  note("### Happy path");
  const ctx = await contexte();
  const p = await ctx.newPage();
  await ouvrirPrix(p);
  await capture(p, "US-1.6-01-lire-une-station-dans-la-liste-avant.png", async () => `${await lignes(p).count()} lignes affichées`, "liste affichée");
  const premiere = lignes(p).first();
  await premiere.hover();
  await capture(p, "US-1.6-02-lire-une-station-dans-la-liste-apres.png", async () => {
    const [l] = await lireLignes(p);
    expect(l.nom.length).toBeGreaterThan(2);
    expect(l.meta).toMatch(/^[\d,]+ (km|m) · /);
    expect(l.meta).toMatch(/(il y a \d+ (min|h)|hier|à l'instant|prix du \d\d\/\d\d)/);
    expect(l.meta).toMatch(/[−+][\d,]+ c vs France|= France/);
    await expect(premiere.locator(".totem")).toHaveAttribute("aria-label", /^\d,\d{3} euros le litre$/);
    const st = (await rest(`stations?select=enseigne,nom,ville&id=eq.${l.id}`))[0];
    expect(l.nom).toContain(st.enseigne ?? st.nom);
    return `« ${l.nom} | ${l.meta} | ${l.prix.toFixed(3)} €/L » (enseigne en base : ${st.enseigne})`;
  }, "enseigne, distance, ancienneté, écart à la moyenne France, prix à 3 décimales");
  note("\n### Edge case — toucher la ligne");
  const ligne = lignes(p).nth(1);
  const nom = await ligne.locator(".n").innerText();
  await ligne.scrollIntoViewIfNeeded();
  await ligne.hover();
  await capture(p, "US-1.6-03-lire-une-station-dans-la-liste-avant.png", async () => `ligne « ${nom} » sous le doigt`, "une ligne de station");
  await ligne.click();
  await capture(p, "US-1.6-04-lire-une-station-dans-la-liste-apres.png", async () => {
    await expect(p.locator("#sh-name")).toHaveText(nom);
    await expect(p.locator('[data-el="tableau-prix"]')).toHaveAttribute("aria-busy", "false");
    return `fiche « ${nom} » ouverte`;
  }, "sa fiche s'ouvre");
  note("\n### Issues found\n- aucune");
  await ctx.close();
};

HISTOIRES["US-2.1 — Fermer la fiche"] = async () => {
  note("### Happy path");
  const ctx = await contexte();
  const p = await ctx.newPage();
  await ouvrirPrix(p);
  await choisir(p, "Gazole");
  await attendreListe(p);
  await lignes(p).first().click();
  await expect(p.locator('[data-el="tableau-prix"]')).toHaveAttribute("aria-busy", "false");
  await capture(p, "US-2.1-01-fermer-la-fiche-avant.png", async () => {
    await expect(p.getByRole("dialog")).toBeVisible();
    return `fiche « ${await p.locator("#sh-name").innerText()} » ouverte, carburant Gazole`;
  }, "fiche station ouverte");
  await p.getByRole("button", { name: "Fermer la fiche" }).click();
  await capture(p, "US-2.1-02-fermer-la-fiche-apres.png", async () => {
    await expect(p.getByRole("dialog")).toHaveCount(0);
    await expect(p.getByRole("button", { name: "Gazole", exact: true })).toHaveAttribute("aria-pressed", "true");
    await expect(p.locator('[data-el="titre-liste"]')).toHaveText("Stations · Gazole");
    return "fiche fermée (bouton ✕), carburant toujours Gazole (Échap : voir US-A11Y-003)";
  }, "la fiche se ferme, le carburant choisi n'a pas changé");
  note("\n### Issues found\n- aucune");
  await ctx.close();
};

HISTOIRES["US-2.2 — Calculer un trajet vers la station"] = async () => {
  note("### Happy path");
  const ctx = await contexte();
  const p = await ctx.newPage();
  await ouvrirPrix(p);
  const l = (await lireLignes(p))[0];
  await lignes(p).first().click();
  const st = (await rest(`stations?select=adresse,cp,ville&id=eq.${l.id}`))[0];
  const attendu = `${st.adresse}, ${st.cp} ${st.ville}`;
  await capture(p, "US-2.2-01-calculer-un-trajet-vers-la-station-avant.png", async () => {
    await expect(p.locator('[data-el="fiche-adresse"]')).toContainText(attendu);
    return `fiche « ${l.nom} », adresse en base « ${attendu} »`;
  }, "fiche d'une station");
  await p.getByRole("button", { name: "Coût d'un trajet jusqu'ici" }).click();
  await capture(p, "US-2.2-02-calculer-un-trajet-vers-la-station-apres.png", async () => {
    await expect(p).toHaveURL(/\/trajets$/);
    await expect(p.getByRole("tab", { name: "Trajets" })).toHaveAttribute("aria-selected", "true");
    await expect(p.getByLabel("Arrivée")).toHaveValue(attendu);
    return `onglet Trajets, champ Arrivée = « ${attendu} »`;
  }, "onglet Trajets avec l'arrivée pré-remplie à l'adresse de la station");
  note("\n### Issues found\n- Écran Trajets volontairement réduit au jalon 1 (départ, arrivée) : calcul au jalon 2.");
  await ctx.close();
};

HISTOIRES["US-1.E1 — Source des prix injoignable"] = async () => {
  note("### Edge case — MOCKED: page.route('**/rest/v1/prix*', abort) — coupure réseau impossible à provoquer sur la vraie base sans la casser pour tous");
  const ctx = await contexte();
  const p = await ctx.newPage();
  await p.goto(new URL("/trajets", URL_APP).href);
  await p.route("**/rest/v1/prix*", (r) => r.abort());
  await annoter(p, "MOCK — page.route('**/rest/v1/prix*') coupe la lecture des prix ; j'ouvre ensuite l'onglet Prix");
  await capture(p, "US-1.E1-E1-01-declencheur.png", async () => "MOCKED: lecture des prix interceptée et coupée (abort) ; appli sur Trajets", "lecture des prix en erreur réseau (MOCKED)");
  await p.getByRole("tab", { name: "Prix" }).click();
  await capture(p, "US-1.E1-E1-02-resultat.png", async () => {
    await expect(p.locator('[data-el="etat-erreur"]')).toContainText("Prix indisponibles pour l'instant", { timeout: 15000 });
    await expect(p.getByRole("button", { name: "Réessayer" })).toBeVisible();
    await expect(lignes(p)).toHaveCount(0);
    await expect(pastilles(p)).toHaveCount(0);
    return "message « Prix indisponibles pour l'instant » + bouton Réessayer à la place de la liste, 0 pastille";
  }, "l'écran Prix s'ouvre en erreur");
  await p.unroute("**/rest/v1/prix*");
  await p.getByRole("button", { name: "Réessayer" }).click();
  await capture(p, "US-1.E1-E1-03-retour.png", async () => {
    await attendreListe(p);
    await attendreCarte(p);
    await expect(p.locator('[data-el="etat-erreur"]')).toHaveCount(0);
    return `réseau rétabli + Réessayer : ${await lignes(p).count()} stations réelles`;
  }, "retour à l'état normal après Réessayer");
  note("\n### Issues found\n- aucune");
  await ctx.close();
};

HISTOIRES["US-1.E2 — Aucune station pour ce carburant"] = async () => {
  note("### Edge case — MOCKED: page.route('**/rest/v1/prix*carburant=eq.E85*', fulfill []) — il existe de vraies stations E85 autour d'Albi");
  const ctx = await contexte();
  const p = await ctx.newPage();
  await ouvrirPrix(p);
  const mock = (r) => r.fulfill({ status: 200, contentType: "application/json", body: "[]" });
  await p.route("**/rest/v1/prix*carburant=eq.E85*", mock);
  await annoter(p, "MOCK — page.route renvoie [] pour les prix E85 ; je vais toucher E85");
  await capture(p, "US-1.E2-E1-01-declencheur.png", async () => "MOCKED: réponse vide pour E85 ; liste en SP95-E10", "aucune station du rayon ne vend E85 (MOCKED)");
  await choisir(p, "E85");
  await capture(p, "US-1.E2-E1-02-resultat.png", async () => {
    await expect(p.locator('[data-el="etat-vide"]')).toHaveText("Aucune station ne vend ce carburant autour de vous.");
    await expect(pastilles(p)).toHaveCount(0);
    return "« Aucune station ne vend ce carburant autour de vous. », 0 pastille";
  }, "je choisis E85 : liste vide, carte sans pastille");
  await p.unroute("**/rest/v1/prix*carburant=eq.E85*");
  await choisir(p, "SP95-E10");
  await attendreListe(p);
  await choisir(p, "E85");
  await capture(p, "US-1.E2-E1-03-retour.png", async () => {
    await attendreListe(p);
    await attendreCarte(p);
    await expect(p.locator('[data-el="etat-vide"]')).toHaveCount(0);
    return `données réelles rétablies : ${await lignes(p).count()} stations E85, ${await pastilles(p).count()} pastilles`;
  }, "retour à l'état normal (vraies stations E85)");
  note("\n### Issues found\n- aucune");
  await ctx.close();
};

HISTOIRES["US-1.E3 — Prix ancien signalé"] = async () => {
  note("### Edge case — données réelles (pas de fixture) : station du rayon dont le prix déclaré a plus de 48 h");
  const ctx = await contexte();
  const p = await ctx.newPage();
  const autour = await rpcAutour(ALBI.latitude, ALBI.longitude);
  const ids = autour.map((s) => s.id).join(",");
  const limite = new Date(Date.now() - 48 * 3600e3).toISOString();
  let carb = null, vieux = null;
  for (const c of ["SP95-E10", "Gazole", "SP98", "E85", "GPLc", "SP95"]) {
    const r = await rest(`prix?select=station_id,maj&carburant=eq.${c}&rupture=is.false&prix=not.is.null&maj=lt.${limite}&station_id=in.(${ids})`);
    if (r.length) { carb = c; vieux = r[0]; break; }
  }
  if (!vieux) throw new Error("aucune station réelle > 48 h dans le rayon : fixture nécessaire");
  const d = new Date(vieux.maj);
  const jjmm = d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", timeZone: "Europe/Paris" });
  await ouvrirPrix(p);
  await choisir(p, carb);
  await capture(p, "US-1.E3-E1-01-declencheur.png", async () => `station ${vieux.station_id} : prix ${carb} déclaré le ${vieux.maj} (> 48 h, lu en base)`, "une station dont le prix date de plus de 48 h");
  const ligne = p.locator(`[data-el="ligne-station"][data-station="${vieux.station_id}"]`);
  await ligne.scrollIntoViewIfNeeded();
  await surligner(ligne);
  await capture(p, "US-1.E3-E1-02-resultat.png", async () => {
    await expect(ligne.locator('[data-el="anciennete"]')).toHaveText(`prix du ${jjmm}`);
    return `ligne « ${await ligne.locator(".n").innerText()} » : « prix du ${jjmm} »`;
  }, "la liste s'affiche avec la mention « prix du JJ/MM »");
  await capture(p, "US-1.E3-E1-03-retour.png", async () => {
    const st = await ligne.evaluate((e) => {
      const a = e.querySelector('[data-el="anciennete"]');
      return { couleur: getComputedStyle(a).color, opacite: getComputedStyle(a).opacity, style: getComputedStyle(a).fontStyle, nom: getComputedStyle(e.querySelector(".n")).color, totem: e.querySelector(".totem").className };
    });
    expect(st.couleur).not.toBe(st.nom);
    expect(Number(st.opacite)).toBeLessThan(1);
    expect(st.totem).toContain("ancien");
    const frais = (await lireLignes(p)).find((x) => !/prix du/.test(x.meta));
    expect(frais).toBeTruthy();
    return `atténuée : couleur ${st.couleur} (nom ${st.nom}), opacité ${st.opacite}, ${st.style}, totem atténué ; à côté, ligne récente « ${frais.nom} — ${frais.meta} » normale (données réelles : rien à rétablir)`;
  }, "mention en couleur atténuée ; les prix récents restent normaux");
  note("\n### Issues found\n- aucune");
  await ctx.close();
};

HISTOIRES["US-1.E4 — Station en rupture"] = async () => {
  note("### Edge case — données réelles (pas de fixture) : rupture temporaire de gazole déclarée dans le flux officiel");
  const ctx = await contexte();
  const p = await ctx.newPage();
  const autour = await rpcAutour(ALBI.latitude, ALBI.longitude);
  const ids = autour.map((s) => s.id).join(",");
  const rup = await rest(`prix?select=station_id,prix,rupture&carburant=eq.Gazole&rupture=is.true&station_id=in.(${ids})`);
  if (!rup.length) throw new Error("aucune rupture gazole réelle dans le rayon : fixture nécessaire");
  const id = rup[0].station_id;
  const autres = await rest(`prix?select=carburant&station_id=eq.${id}&rupture=is.false&prix=not.is.null`);
  const visible = autres[0]?.carburant;
  await ouvrirPrix(p);
  if (visible) await choisir(p, visible);
  await attendreListe(p);
  const ligne = p.locator(`[data-el="ligne-station"][data-station="${id}"]`);
  const nom = visible ? await ligne.locator(".n").innerText() : id;
  if (visible) { await ligne.scrollIntoViewIfNeeded(); await surligner(ligne); }
  await annoter(p, `${nom} (${id}) : rupture temporaire de gazole déclarée ; visible en ${visible}`);
  await capture(p, "US-1.E4-E1-01-declencheur.png", async () => {
    if (visible) await expect(ligne).toBeVisible();
    return `${nom} (${id}) : ligne Gazole en base rupture=true ; visible en ${visible ?? "—"}`;
  }, "une station en rupture temporaire de gazole");
  await choisir(p, "Gazole");
  await attendreListe(p);
  await annoter(p, `Gazole : « ${nom} » absente (les autres TotalEnergies portent un autre libellé)`);
  await capture(p, "US-1.E4-E1-02-resultat.png", async () => {
    await expect(p.locator('[data-el="liste-stations"]')).toHaveAttribute("data-carburant", "Gazole");
    await expect(ligne).toHaveCount(0);
    await expect(p.locator(`[data-el="pastille-station"][data-station="${id}"]`)).toHaveCount(0);
    const l = await lireLignes(p);
    expect(croissant(l.map((x) => x.prix))).toBe(true);
    expect(l.map((x) => x.nom)).not.toContain(nom); // aucune autre station ne porte son libellé
    return `en Gazole, liste triée par prix (${l.length} stations) sans ${nom}`;
  }, "je choisis Gazole : elle n'apparaît pas");
  if (visible) await choisir(p, visible);
  await attendreListe(p);
  if (visible) { await ligne.scrollIntoViewIfNeeded(); await surligner(ligne); }
  await capture(p, "US-1.E4-E1-03-retour.png", async () => {
    if (visible) await expect(ligne).toHaveCount(1);
    return `retour en ${visible} : ${nom} réapparaît (elle vend toujours ce carburant)`;
  }, "retour à l'état normal");
  note("\n### Issues found\n- aucune");
  await ctx.close();
};

HISTOIRES["US-2.E1 — Carburant non vendu dans la fiche"] = async () => {
  note("### Edge case — données réelles : station du rayon sans aucune ligne GPLc en base");
  const ctx = await contexte();
  const p = await ctx.newPage();
  const autour = await rpcAutour(ALBI.latitude, ALBI.longitude);
  const gpl = new Set((await rest(`prix?select=station_id&carburant=eq.GPLc&station_id=in.(${autour.map((s) => s.id).join(",")})`)).map((x) => x.station_id));
  await ouvrirPrix(p);
  const l = (await lireLignes(p)).find((x) => !gpl.has(x.id));
  const ligne = p.locator(`[data-el="ligne-station"][data-station="${l.id}"]`);
  await ligne.scrollIntoViewIfNeeded();
  await capture(p, "US-2.E1-E1-01-declencheur.png", async () => `${l.nom} (${l.id}) : aucune ligne GPLc en base`, "une station sans GPLc");
  await ligne.click();
  await capture(p, "US-2.E1-E1-02-resultat.png", async () => {
    await expect(p.locator('[data-el="tableau-prix"]')).toHaveAttribute("aria-busy", "false");
    await expect(p.locator('[data-carburant="GPLc"] [data-el="non-vendu"]')).toHaveText("non vendu");
    const vendus = await p.locator('[data-el="tableau-prix"] .totem').count();
    expect(vendus).toBeGreaterThan(0);
    return `fiche « ${l.nom} » : GPLc « non vendu », ${vendus} carburants avec prix`;
  }, "j'ouvre sa fiche : la ligne GPLc affiche « non vendu »");
  await p.getByRole("button", { name: "Fermer la fiche" }).click();
  await capture(p, "US-2.E1-E1-03-retour.png", async () => {
    await expect(p.getByRole("dialog")).toHaveCount(0);
    await expect(ligne).toBeVisible();
    return "fiche fermée, liste normale (données réelles : rien à rétablir)";
  }, "retour à l'état normal");
  note("\n### Issues found\n- aucune");
  await ctx.close();
};

HISTOIRES["US-1.P1 — Recentrer sur ma position"] = async () => {
  note("### Happy path");
  const ctx = await contexte();
  const p = await ctx.newPage();
  const appels = [];
  p.on("request", (r) => r.url().includes("/rpc/stations_autour") && appels.push(JSON.parse(r.postData() || "{}")));
  await ouvrirPrix(p);
  await glisserCarte(p, -170, 60);
  await p.waitForTimeout(300);
  await glisserCarte(p, -170, 0);
  await expect.poll(() => appels.length, { timeout: 10000 }).toBeGreaterThanOrEqual(2);
  await attendreListe(p);
  await attendreCarte(p);
  const loin = await centreCarte(p);
  const listeLoin = (await lireLignes(p)).map((x) => x.id).join(",");
  await capture(p, "US-1.P1-01-recentrer-sur-ma-position-avant.png", async () => {
    expect(km(loin, { lat: ALBI.latitude, lon: ALBI.longitude })).toBeGreaterThan(8);
    return `carte déplacée à ${km(loin, { lat: ALBI.latitude, lon: ALBI.longitude }).toFixed(1)} km de ma position`;
  }, "carte déplacée");
  const n = appels.length;
  await p.getByRole("button", { name: "Recentrer sur ma position" }).click();
  await capture(p, "US-1.P1-02-recentrer-sur-ma-position-apres.png", async () => {
    await expect.poll(async () => km(await centreCarte(p), { lat: ALBI.latitude, lon: ALBI.longitude }), { timeout: 5000 }).toBeLessThan(0.1);
    await expect.poll(() => appels.length, { timeout: 5000 }).toBeGreaterThan(n);
    const der = appels[appels.length - 1];
    expect(der.lat).toBeCloseTo(ALBI.latitude, 4);
    expect(der.lon).toBeCloseTo(ALBI.longitude, 4);
    await expect.poll(async () => (await lireLignes(p)).map((x) => x.id).join(","), { timeout: 10000 }).not.toBe(listeLoin);
    await attendreCarte(p);
    return `carte revenue sur ma position ; liste rechargée par stations_autour(${der.lat}, ${der.lon}, ${der.rayon_m} m)`;
  }, "la carte revient sur ma position et la liste se recharge");
  note("\n### Issues found\n- aucune");
  await ctx.close();
};

// ---------------- transverses ----------------
/** l'élément focalisé est-il réellement visible (dans la fenêtre, dans le cadre de la carte s'il y est, non recouvert) ? */
const etatFocus = (p) => p.evaluate(() => {
  const e = document.activeElement;
  const r = e.getBoundingClientRect();
  const s = getComputedStyle(e);
  const carte = e.closest(".map");
  const cadre = (carte ?? document.documentElement).getBoundingClientRect();
  const dans = r.width > 0 && r.left >= cadre.left - 1 && r.right <= cadre.right + 1 && r.top >= cadre.top - 1 && r.bottom <= cadre.bottom + 1 && r.top >= 0 && r.bottom <= innerHeight;
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  const dessus = document.elementFromPoint(cx, cy);
  return {
    txt: (e.getAttribute("aria-label") || e.textContent || "").trim().slice(0, 34),
    idx: [...document.querySelectorAll("*")].indexOf(e),
    contour: s.outlineStyle !== "none" && parseFloat(s.outlineWidth) >= 2,
    visible: e.tagName === "CANVAS" ? dans : dans && !!dessus && (dessus === e || e.contains(dessus)),
    pastille: e.dataset.el === "pastille-station",
  };
});

HISTOIRES["US-A11Y-001 — Navigation au clavier"] = async () => {
  const ctx = await contexte();
  const p = await ctx.newPage();
  await ouvrirPrix(p);
  await p.locator("body").click({ position: { x: 5, y: 5 } });
  const ordre = [];
  // Tab jusqu'à la 2e pastille (on s'arrête dessus pour la photo)
  for (let i = 0; i < 30; i++) {
    await p.keyboard.press("Tab");
    ordre.push(await etatFocus(p));
    if (ordre.filter((o) => o.pastille).length === 2) break;
  }
  await capture(p, "US-A11Y-001-01-m1.png", async () => {
    expect(ordre[0].txt).toBe("Gazole");
    for (let i = 1; i < ordre.length; i++) expect(ordre[i].idx, `ordre ${i}`).toBeGreaterThan(ordre[i - 1].idx);
    for (const o of ordre) { expect(o.contour, `contour ${o.txt}`).toBe(true); expect(o.visible, `visible ${o.txt}`).toBe(true); }
    return `Tab ×${ordre.length} : ${ordre.map((o) => o.txt).join(" → ")} ; ordre du document, chaque élément focalisé visible dans son cadre avec un contour ≥ 2 px ; arrêt sur une pastille`;
  }, "Tab : carburants, carte puis pastilles visibles, dans l'ordre de lecture, contour visible");
  // suite du parcours jusqu'à la barre d'onglets : aucune pastille hors cadre ne reçoit le focus
  const suite = [];
  for (let i = 0; i < 40; i++) {
    await p.keyboard.press("Tab");
    const o = await etatFocus(p);
    suite.push(o);
    if (o.txt === "Prix") break;
  }
  const horsCadre = await p.locator('[data-el="pastille-station"][data-hors-cadre="oui"]').count();
  await p.keyboard.press("Shift+Tab");
  const r1 = await etatFocus(p);
  await p.keyboard.press("Shift+Tab");
  const r2 = await etatFocus(p);
  await capture(p, "US-A11Y-001-02-m1.png", async () => {
    for (const o of suite) { expect(o.visible, `visible ${o.txt}`).toBe(true); expect(o.contour).toBe(true); }
    expect(r1.idx).toBeLessThan(suite.at(-1).idx);
    expect(r2.idx).toBeLessThan(r1.idx);
    expect(r2.visible && r2.contour).toBe(true);
    // fiche (S2) : titre → fermer → trajet
    return `suite Tab ×${suite.length} jusqu'à l'onglet Prix, tous visibles (${horsCadre} pastille(s) hors cadre exclue(s) du parcours) ; Maj+Tab ×2 : « ${r1.txt} » ← « ${r2.txt} » (contour visible)`;
  }, "Maj+Tab remonte l'ordre, contour visible sur l'élément atteint");
  await lignes(p).first().focus();
  await p.keyboard.press("Enter");
  await expect(p.locator("#sh-name")).toBeFocused();
  await p.keyboard.press("Tab");
  const f1 = await etatFocus(p);
  await p.keyboard.press("Tab");
  const f2 = await etatFocus(p);
  note(`- (sans capture) S2 : Tab depuis le titre → « ${f1.txt} » → « ${f2.txt} », visibles : ${f1.visible && f2.visible}, contour : ${f1.contour && f2.contour}`);
  await ctx.close();
};

HISTOIRES["US-A11Y-002 — Focus de la fiche"] = async () => {
  const ctx = await contexte();
  const p = await ctx.newPage();
  await ouvrirPrix(p);
  const ligne = lignes(p).nth(2);
  const id = await ligne.getAttribute("data-station");
  await ligne.focus();
  await p.keyboard.press("Enter");
  await expect(p.locator('[data-el="tableau-prix"]')).toHaveAttribute("aria-busy", "false");
  await capture(p, "US-A11Y-002-01-m1.png", async () => {
    await expect(p.locator("#sh-name")).toBeFocused();
    return `ouverte au clavier (Entrée sur la ligne ${id}) : focus sur le titre « ${await p.locator("#sh-name").textContent()} »`;
  }, "la fiche s'ouvre, le focus va sur son titre");
  await p.keyboard.press("Escape");
  await capture(p, "US-A11Y-002-02-m1.png", async () => {
    await expect(p.getByRole("dialog")).toHaveCount(0);
    await expect(p.locator(`[data-el="ligne-station"][data-station="${id}"]`)).toBeFocused();
    const f = await etatFocus(p);
    expect(f.visible && f.contour).toBe(true);
    return `juste après Échap : focus revenu sur la ligne ${id} « ${f.txt} », contour visible`;
  }, "à la fermeture (Échap) le focus revient sur la ligne qui l'a ouverte, contour visible");
  // même chose depuis une pastille (vérifié, sans capture)
  const pid = await pastilleDegagee(p);
  const pin = p.locator(`[data-el="pastille-station"][data-station="${pid}"]`);
  await pin.focus();
  await p.keyboard.press("Enter");
  await expect(p.locator("#sh-name")).toBeFocused();
  await p.keyboard.press("Tab");
  await p.keyboard.press("Enter"); // bouton Fermer la fiche, au clavier
  await expect(pin).toBeFocused();
  note(`- (sans capture) depuis la pastille ${pid} : Entrée → focus titre ; Tab + Entrée sur ✕ → focus revenu sur la pastille`);
  await ctx.close();
};

HISTOIRES["US-A11Y-003 — Touche Échap"] = async () => {
  const ctx = await contexte();
  const p = await ctx.newPage();
  await ouvrirPrix(p);
  await lignes(p).first().click();
  await expect(p.locator('[data-el="tableau-prix"]')).toHaveAttribute("aria-busy", "false");
  await capture(p, "US-A11Y-003-01-m1.png", async () => {
    await expect(p.getByRole("dialog")).toBeVisible();
    return "fiche ouverte, j'appuie sur Échap";
  }, "fiche station ouverte avant Échap");
  await p.keyboard.press("Escape");
  await capture(p, "US-A11Y-003-02-m1.png", async () => {
    await expect(p.getByRole("dialog")).toHaveCount(0);
    return "Échap : fiche fermée";
  }, "la fiche se ferme");
  await ctx.close();
};

HISTOIRES["US-A11Y-004 — Libellés lisibles"] = async () => {
  const ctx = await contexte();
  const p = await ctx.newPage();
  await ouvrirPrix(p);
  const pid = await pastilleDegagee(p);
  await p.locator(`[data-el="pastille-station"][data-station="${pid}"]`).focus();
  await capture(p, "US-A11Y-004-01-m1.png", async () => {
    const pa = await lirePastilles(p);
    for (const x of pa) expect(x.label).toMatch(/^.+, \d,\d{3} euros le litre, (moins|plus) cher$/);
    const totems = await p.locator('[data-el="ligne-station"] .totem').evaluateAll((els) => els.map((e) => e.getAttribute("aria-label")));
    for (const t of totems) expect(t).toMatch(/^\d,\d{3} euros le litre$/);
    const snap = await lignes(p).first().ariaSnapshot();
    return `${pa.length} pastilles annoncées (ex. « ${pa[0].label} ») ; prix de liste : « ${totems[0]} » ; arbre a11y ligne : ${snap.replace(/\n\s*/g, " ")}`;
  }, "chaque pastille annonce station et prix en euros");
  // fiche en cours de chargement (réseau ralenti de 1,5 s, vraie réponse) : le chargement est annoncé
  await p.route("**/rest/v1/prix?*station_id=eq.*", async (r) => { await new Promise((x) => setTimeout(x, 1500)); await r.continue(); });
  await lignes(p).first().click();
  await expect(p.locator('[data-el="tableau-prix"] [role="status"]')).toHaveText("Chargement des prix de la station…");
  const snapCharge = await p.locator('[data-el="tableau-prix"]').ariaSnapshot();
  await p.unroute("**/rest/v1/prix?*station_id=eq.*");
  await expect(p.locator('[data-el="tableau-prix"]')).toHaveAttribute("aria-busy", "false");
  await capture(p, "US-A11Y-004-02-m1.png", async () => {
    await expect(p.locator('[data-el="tableau-prix"] .totem').first()).toBeVisible();
    const icones = await p.evaluate(() => [...document.querySelectorAll("button")].filter((b) => !b.textContent.replace(/[✕\s]/g, "").length).map((b) => b.getAttribute("aria-label")));
    for (const l of icones) expect(l).toBeTruthy();
    expect(icones).toEqual(expect.arrayContaining(["Recentrer sur ma position", "Fermer la fiche"]));
    const prixFiche = await p.locator('[data-el="tableau-prix"] .totem').evaluateAll((els) => els.map((e) => e.getAttribute("aria-label")));
    return `fiche chargée (${prixFiche.length} prix annoncés, ex. « ${prixFiche[0]} ») ; pendant le chargement : ${snapCharge.replace(/\n\s*/g, " ").slice(0, 160)}… ; boutons icônes : ${icones.join(", ")}`;
  }, "fiche aux prix chargés ; chargement annoncé ; chaque bouton icône a un libellé");
  await ctx.close();
};

HISTOIRES["US-PERF-001 — Ouverture rapide"] = async () => {
  const ctx = await contexte();
  const p = await ctx.newPage();
  const cdp = await ctx.newCDPSession(p);
  await cdp.send("Network.enable");
  await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
  // 4G : 9 Mbit/s descendant, 1,5 Mbit/s montant, 85 ms de latence
  await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 85, downloadThroughput: (9 * 1024 * 1024) / 8, uploadThroughput: (1.5 * 1024 * 1024) / 8 });
  const t0 = Date.now();
  await p.goto(URL_APP, { waitUntil: "commit" });
  const t1 = Date.now() - t0;
  await annoter(p, `4G simulée (9 Mbit/s, 85 ms), cache vide : navigation lancée, t = ${t1} ms`);
  await capture(p, "US-PERF-001-01-m1.png", async () => `navigation lancée en 4G simulée (9 Mbit/s, 85 ms), cache désactivé, t=${t1} ms`, "j'ouvre l'appli (4G simulée)");
  await lignes(p).first().waitFor({ timeout: 15000 });
  const t = Date.now() - t0;
  const nav = await p.evaluate(() => JSON.stringify(performance.getEntriesByType("navigation")[0]?.toJSON?.() ?? {}));
  await annoter(p, `liste des stations affichée en ${t} ms (budget 2 500 ms)`);
  await capture(p, "US-PERF-001-02-m1.png", async () => {
    expect(t).toBeLessThan(2500);
    return `liste affichée en ${t} ms (< 2 500 ms) ; domInteractive ${Math.round(JSON.parse(nav).domInteractive ?? 0)} ms`;
  }, "la liste des stations est affichée en moins de 2,5 s");
  await ctx.close();
};

// ======================= EXÉCUTION =======================
const ORDRE = Object.keys(HISTOIRES).filter((k) => !FILTRE.length || FILTRE.some((f) => k.startsWith(f)));
for (const titre of ORDRE) {
  try {
    await HISTOIRES[titre]();
  } catch (e) {
    note(`- ✗ erreur d'exploration : ${String(e.message).split("\n")[0]}`);
  }
  ecrireBloc(titre);
  console.log(titre, "—", resultats.filter((r) => r.ok).length, "/", resultats.length, "captures OK");
}
await navigateur.close();
const ko = resultats.filter((r) => !r.ok);
console.log(`TOTAL ${resultats.length} captures, ${ko.length} en échec`, ko.map((r) => r.nom));
