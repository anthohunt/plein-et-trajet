import { test, expect, BARCELONE, URL_APP } from "./_aides";

test.describe("US-PERF-001 — Ouverture rapide (jalon 3)", () => {
  test.describe("Happy Path", () => {
    test.use({ geolocation: BARCELONE });
    test("US-PERF-001 — 4G émulée à Barcelone : la liste des stations s'affiche en moins de 2,5 s", async ({ page, context }) => {
      const cdp = await context.newCDPSession(page);
      await cdp.send("Network.enable");
      await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 });
      const t0 = Date.now();
      await page.goto(`${URL_APP}/`, { waitUntil: "commit" });
      await page.locator('[data-el="ligne-station"]').first().waitFor({ timeout: 30000 });
      expect(Date.now() - t0).toBeLessThan(2500);
    });
  });
  test.describe("Edge Case", () => {
    test("US-PERF-001 — l'écran Moteurs n'alourdit pas l'ouverture : le code de S5 n'est pas chargé pour un visiteur (aucune requête moteurs)", async ({ page }) => {
      const appels: string[] = [];
      page.on("request", (r) => { if (/functions\/v1\/moteurs|\/moteurs/.test(r.url()) && !r.url().endsWith("/moteurs")) appels.push(r.url()); });
      await page.goto("/");
      await expect(page.locator('[data-el="ligne-station"]').first()).toBeVisible({ timeout: 20000 });
      expect(appels).toEqual([]);
    });
  });
});
