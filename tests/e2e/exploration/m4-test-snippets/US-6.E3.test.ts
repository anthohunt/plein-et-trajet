import { test, expect, enregistrerDepuis, KM5, rouler, lireDirect, nombreFr, S6, accorderVerrouEcran } from "./_aides";

test.describe("US-6.E3 — Reprendre après fermeture", () => {
  test.describe("Edge Case", () => {
    test("US-6.E3 — rechargement : reprise proposée avec la distance conservée ; « Reprendre » rouvre l'écran En route", async ({ page, context }) => {
      test.setTimeout(150_000);
      await enregistrerDepuis(page, context, KM5);
      await rouler(context, KM5 + 1, 25);
      const avant = await lireDirect(page);
      expect(avant.km).toBeGreaterThan(0.3);
      await page.reload();
      const b = page.locator('[data-el="reprise-enregistrement"]');
      await expect(b).toBeVisible({ timeout: 20_000 });
      await expect(b).toContainText("Un enregistrement est en cours");
      const km = nombreFr(/([\d,]+) km déjà enregistrés/.exec(await b.innerText())![1]);
      expect(Math.abs(km - avant.km)).toBeLessThanOrEqual(0.1);
      await expect(page.locator('[data-el="arreter-enregistrement"]')).toBeVisible();
      await accorderVerrouEcran(context, page);
      await page.locator('[data-el="reprendre-enregistrement"]').click();
      await expect(S6(page)).toBeVisible();
      expect((await lireDirect(page)).km).toBeGreaterThanOrEqual(avant.km);
    });
  });
});
