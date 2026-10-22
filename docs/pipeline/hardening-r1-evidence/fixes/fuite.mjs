import { chromium } from "/home/claude/webapp-runs/prix-carburant-trajets-2026-10-20-114307/node_modules/playwright/index.mjs";
import fs from "fs";
const [BASE, OUT, SHOT, CSP] = process.argv.slice(2);
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "fr-FR", geolocation: { latitude: 43.9289, longitude: 2.1464 }, permissions: ["geolocation"] });
const page = await ctx.newPage();
const violations = []; const erreursPage = [];
page.on("console", (m) => { if (/Content Security Policy|Refused to/.test(m.text())) violations.push(m.text().slice(0, 200)); });
page.on("pageerror", (e) => erreursPage.push(String(e.message).slice(0, 150)));
await page.addInitScript(() => { document.addEventListener("securitypolicyviolation", (e) => (window.__csp = window.__csp || []).push(e.violatedDirective + " " + e.blockedURI)); });
if (CSP) {
  const csp = JSON.parse(fs.readFileSync(CSP)).headers[0].headers.filter((h) => h.key === "Content-Security-Policy")[0].value;
  await page.route("**/*", async (r) => { if (r.request().resourceType() !== "document") return r.fallback(); const resp = await r.fetch(); await r.fulfill({ response: resp, headers: { ...resp.headers(), "content-security-policy": csp } }); });
}
const st = (id, lat) => ({ id, nom: "S" + id, enseigne: "E", adresse: "1 rue", cp: "81000", ville: "Albi", lat, lon: 2.15, services: [], automate_24_24: false, distance_km: 1, pays: "FR" });
const stations = [st("a", 43.93), st("b", 43.94), st("c", 43.92)];
await page.route("**/*.supabase.co/**", (r) => {
  const u = r.request().url(); const h = { "access-control-allow-origin": "*" };
  if (u.includes("rpc/stations_autour")) return r.fulfill({ status: 200, contentType: "application/json", headers: h, body: JSON.stringify(stations) });
  if (u.includes("rest/v1/prix")) { const c = decodeURIComponent((u.match(/carburant=eq\.([^&]*)/) || [])[1] || "SP95-E10"); return r.fulfill({ status: 200, contentType: "application/json", headers: h, body: JSON.stringify(stations.map((s, i) => ({ station_id: s.id, carburant: c, prix: 1.7 + i / 100, maj: new Date().toISOString(), rupture: false }))) }); }
  if (u.includes("moyennes_par_pays")) return r.fulfill({ status: 200, contentType: "application/json", headers: h, body: "[]" });
  return r.continue();
});
const cdp = await ctx.newCDPSession(page);
await cdp.send("Performance.enable");
const aller = (p) => page.evaluate((p) => { history.pushState({}, "", p); dispatchEvent(new PopStateEvent("popstate")); }, p);
async function mesure(i) {
  await cdp.send("HeapProfiler.collectGarbage"); await cdp.send("HeapProfiler.collectGarbage");
  const m = Object.fromEntries((await cdp.send("Performance.getMetrics")).metrics.map((x) => [x.name, x.value]));
  const proto = (await cdp.send("Runtime.evaluate", { expression: "HTMLCanvasElement.prototype" })).result.objectId;
  const q = await cdp.send("Runtime.queryObjects", { prototypeObjectId: proto });
  const n = (await cdp.send("Runtime.getProperties", { objectId: q.objects.objectId, ownProperties: true })).result.filter((x) => /^\d+$/.test(x.name)).length;
  return { i, heapMB: +(m.JSHeapUsedSize / 1048576).toFixed(2), nodes: m.Nodes, listeners: m.JSEventListeners, canvasAll: n, canvasLive: await page.evaluate(() => document.querySelectorAll("canvas").length) };
}
await page.goto(BASE + "/stations", { waitUntil: "load" });
await page.waitForSelector('[data-el="pastille-station"]', { timeout: 20000 }).catch(() => {});
await page.waitForTimeout(4000);
const carte = await page.evaluate(() => ({ canvas: document.querySelectorAll(".maplibregl-canvas").length, pastilles: document.querySelectorAll('[data-el="pastille-station"]').length, lignes: document.querySelectorAll('[data-el="liste-stations"] > *').length }));
await page.screenshot({ path: SHOT });
const serie = [];
await aller("/historique"); await page.waitForTimeout(800);
serie.push(await mesure(0));
for (let i = 1; i <= 5; i++) { await aller("/stations"); await page.waitForTimeout(2500); await aller("/historique"); await page.waitForTimeout(800); serie.push(await mesure(i)); }
await aller("/stations"); await page.waitForTimeout(2500);
const csp = await page.evaluate(() => window.__csp || []);
fs.writeFileSync(OUT, JSON.stringify({ base: BASE, carte, serie, csp, violationsConsole: violations.slice(0, 10), erreursPage }, null, 1));
console.log(JSON.stringify({ carte, premier: serie[0], dernier: serie[5], csp, violations: violations.length, erreursPage }));
await browser.close();
