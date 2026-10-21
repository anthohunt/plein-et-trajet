import { chromium } from "@playwright/test";
const b = await chromium.launch();
const out = [];
for (const [nom, geo] of [["albi", { latitude: 43.92833, longitude: 2.145916 }], ["barcelone", { latitude: 41.3874, longitude: 2.1686 }]]) {
  const c = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, locale: "fr-FR", permissions: ["geolocation"], geolocation: geo });
  const p = await c.newPage();
  const tuiles = [];
  p.on("response", (r) => { if (/openfreemap/.test(r.url())) tuiles.push(r.status()); });
  await p.goto("http://localhost:4317/stations");
  await p.waitForSelector('[data-el="pastille-station"]', { timeout: 40000 }).catch(() => {});
  await p.waitForFunction(() => window.__carte && window.__carte.areTilesLoaded(), null, { timeout: 20000 }).catch(() => {});
  await p.waitForTimeout(1500);
  await p.screenshot({ path: `/tmp/m5r2-${nom}.png` });
  out.push(`${nom}: ${tuiles.length} réponses openfreemap (${[...new Set(tuiles)].join(",")}), pastilles ${await p.locator('[data-el="pastille-station"]').count()}`);
  await c.close();
}
const c = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, locale: "fr-FR" });
const p = await c.newPage();
await p.goto("http://localhost:4317/voiture");
await p.waitForSelector('[data-el="enregistrer-voiture"]');
const st = await p.locator('[data-el="enregistrer-voiture"]').evaluate((e) => { const s = getComputedStyle(e); return `${s.backgroundColor} ${s.color} ${s.borderStyle} ${e.getAttribute("aria-disabled")} ${e.disabled}`; });
out.push(`bouton désactivé : ${st} ; placeholders ${await p.getAttribute("#d2", "placeholder")} / ${await p.getAttribute("#q", "placeholder")}`);
await p.screenshot({ path: "/tmp/m5r2-voiture.png" });
console.log(out.join("\n"));
await b.close();
