import { test, expect, URL_APP, attendreFormulaire } from "./_aides";

test.describe("US-PERF-001 — Ouverture rapide (écrans du jalon 2)", () => {
  test.describe("Happy Path", () => {
    test("US-PERF-001 — Trajets prêt (formulaire, marques, historique) en moins de 2,5 s en 4G simulée, identité neuve, cache vide", async ({ page, context }) => {
      const cdp = await context.newCDPSession(page);
      await cdp.send("Network.enable");
      await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
      await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 85, downloadThroughput: (9 * 1024 * 1024) / 8, uploadThroughput: (1.5 * 1024 * 1024) / 8 });
      const t0 = Date.now();
      await page.goto(`${URL_APP}/trajets`, { waitUntil: "commit" });
      await attendreFormulaire(page);
      const t = Date.now() - t0;
      expect(t).toBeLessThan(2500);
    });
  });
  test.describe("Edge Case", () => {
    test("US-PERF-001 — l'écran Prix du jalon 1 reste sous le budget", async ({ page, context }) => {
      const cdp = await context.newCDPSession(page);
      await cdp.send("Network.enable");
      await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
      await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 85, downloadThroughput: (9 * 1024 * 1024) / 8, uploadThroughput: (1.5 * 1024 * 1024) / 8 });
      const t0 = Date.now();
      await page.goto(`${URL_APP}/`, { waitUntil: "commit" });
      await page.locator('[data-el="ligne-station"]').first().waitFor({ timeout: 15000 });
      expect(Date.now() - t0).toBeLessThan(2500);
    });
  });
});
