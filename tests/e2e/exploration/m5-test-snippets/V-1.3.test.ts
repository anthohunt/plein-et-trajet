import { test, expect, D, PTS, avecVoiture, demarrer, arreter, direct, rejouer, lireIdb, moyenne, virgule, nb, euros2 } from "./_aides";

test.describe("V-1.3 — Démarrer", () => {
  test.describe("Happy Path", () => {
    test("V-1.3 — En route s'ouvre, « Enregistrement » clignote, 1re position en moins de 10 s", async ({ page, context }) => {
      await avecVoiture(context);
      await page.goto("/");
      const t0 = Date.now();
      await page.locator(D("bouton-demarrer")).tap();
      await expect(page).toHaveURL(/\/en-route$/);
      await expect(page.locator('[data-screen="T3"]')).toHaveAttribute("data-points", /^[1-9]/, { timeout: 10_000 });
      expect(Date.now() - t0).toBeLessThan(10_000);
      await expect(page.locator(D("etat-enregistrement"))).toHaveText("Enregistrement");
      expect(await page.locator(`${D("etat-enregistrement")} i`).evaluate((e) => getComputedStyle(e).animationName)).not.toBe("none");
    });
  });
  test.describe("Edge Case", () => {
    test.use({ permissions: [] });
    test("V-1.3 — localisation refusée : message, aucun trajet créé", async ({ page, context }) => {
      await avecVoiture(context);
      await page.goto("/");
      await page.locator(D("bouton-demarrer")).tap();
      await expect(page.locator(D("message-localisation"))).toContainText("L'enregistrement a besoin de ta localisation");
      await expect(page.locator(D("message-localisation"))).toContainText("Autoriser");
      const idb = await lireIdb(page);
      expect([idb.trajets.length, idb.enregistrement]).toEqual([0, null]);
    });
  });
});
