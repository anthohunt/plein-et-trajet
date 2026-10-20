import { test, expect } from "@playwright/test";
import { ALBI, centre, glisser, km, ouvrirPrix } from "./_aides";

test("US-1.P1 — recentrer ramène la carte sur ma position et recharge la liste", async ({ page }) => {
  const appels: any[] = [];
  page.on("request", (r) => r.url().includes("/rpc/stations_autour") && appels.push(JSON.parse(r.postData() || "{}")));
  await ouvrirPrix(page);
  await glisser(page, -280, 0); // un glisser vers l'est
  await expect.poll(async () => km(await centre(page), { lat: ALBI.latitude, lon: ALBI.longitude })).toBeGreaterThan(4);
  await expect.poll(() => appels.length).toBeGreaterThanOrEqual(2);
  const n = appels.length;
  await page.getByRole("button", { name: "Recentrer sur ma position" }).click();
  await expect.poll(async () => km(await centre(page), { lat: ALBI.latitude, lon: ALBI.longitude })).toBeLessThan(0.1);
  await expect.poll(() => appels.length).toBeGreaterThan(n);
  expect(appels.at(-1).lat).toBeCloseTo(ALBI.latitude, 4);
  expect(appels.at(-1).rayon_m).toBe(10000);
});
