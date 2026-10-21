import { chromium } from "@playwright/test";
const b = await chromium.launch();
const ctx = await b.newContext({ permissions: ["geolocation"], geolocation: { latitude: 43.9, longitude: 2.1 }, viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();
await page.goto("http://localhost:4173/trajets");
const r = await page.evaluate(async () => {
  const evts = [];
  navigator.geolocation.watchPosition((p) => evts.push([Date.now(), p.coords.latitude, p.timestamp]), (e) => evts.push(["err", e.code]));
  let wl = "absent";
  try { if ("wakeLock" in navigator) { await navigator.wakeLock.request("screen"); wl = "ok"; } } catch (e) { wl = "refus " + e.name + " " + e.message; }
  window.__evts = evts;
  return wl;
});
console.log("wakelock:", r);
for (let i = 0; i < 4; i++) { await ctx.setGeolocation({ latitude: 43.9 + (i >= 2 ? 0.001 : 0), longitude: 2.1 }); await page.waitForTimeout(1000); }
console.log(JSON.stringify(await page.evaluate(() => window.__evts)));
const ctx2 = await b.newContext({ geolocation: { latitude: 43.9, longitude: 2.1 } });
const p2 = await ctx2.newPage(); await p2.goto("http://localhost:4173/trajets");
console.log("sans permission:", await p2.evaluate(() => new Promise((res) => navigator.geolocation.getCurrentPosition(() => res("ok"), (e) => res("err " + e.code + " " + e.message), { timeout: 5000 }))));
await b.close();
