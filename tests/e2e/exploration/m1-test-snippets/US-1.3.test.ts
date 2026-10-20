import { test, expect } from "@playwright/test";
import { autour, glisser, lireLignes, ouvrirPrix } from "./_aides";

test("US-1.3 — chaque pastille est à la position réelle de sa station, avec son prix", async ({ page }) => {
  await ouvrirPrix(page);
  const st = Object.fromEntries((await autour()).map((s) => [s.id, s]));
  const e = await page.evaluate((stations: any) => [...document.querySelectorAll<HTMLElement>('[data-el="pastille-station"]')].map((b) => {
    const s = stations[b.dataset.station!], pt = (window as any).__carte.project([s.lon, s.lat]);
    const m = document.querySelector(".map .gl")!.getBoundingClientRect(), r = b.getBoundingClientRect();
    return { dx: Math.abs(r.left + r.width / 2 - (m.left + pt.x)), dy: Math.abs(r.bottom + 8 - (m.top + pt.y)), t: b.textContent };
  }), st);
  expect(e.length).toBeGreaterThan(3);
  for (const x of e) { expect(x.dx).toBeLessThan(3); expect(x.dy).toBeLessThan(4); expect(x.t).toMatch(/^\d,\d{3}$/); }
});

test("US-1.3 — déplacer la carte charge les stations de la nouvelle zone", async ({ page }) => {
  const appels: any[] = [];
  page.on("request", (r) => r.url().includes("/rpc/stations_autour") && appels.push(JSON.parse(r.postData() || "{}")));
  await ouvrirPrix(page);
  const avant = new Set((await lireLignes(page)).map((x) => x.id));
  const ec = await page.evaluate(() => { const m = (window as any).__carte, a = m.project([1.897, 43.9011]), c = m.project(m.getCenter()); return { dx: c.x - a.x, dy: c.y - a.y }; });
  const n = Math.ceil(Math.max(Math.abs(ec.dx), Math.abs(ec.dy)) / 130);
  for (let i = 0; i < n; i++) { await glisser(page, ec.dx / n, ec.dy / n); await page.waitForTimeout(300); }
  await expect.poll(() => appels.length).toBeGreaterThanOrEqual(2);
  await expect.poll(async () => (await lireLignes(page)).filter((x) => !avant.has(x.id)).length).toBeGreaterThan(0);
});
