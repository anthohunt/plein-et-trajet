import { test, expect, enregistrerDepuis, rouler, arreterEtAttendre, trajetsDeLaPage } from "./_aides";

test.describe("US-6.E2 — Trajet trop court", () => {
  test.describe("Edge Case", () => {
    test("US-6.E2 — moins de 1 km : « trop court pour être calculé », rien dans l'historique ni sur le téléphone", async ({ page, context }) => {
      test.setTimeout(120_000);
      await enregistrerDepuis(page, context, 0);
      const avant = (await trajetsDeLaPage(page)).length;
      await rouler(context, 1, 20);
      await arreterEtAttendre(page);
      const m = page.locator('[data-el="trajet-trop-court"]');
      await expect(m).toContainText("Trajet trop court pour être calculé");
      await expect(m).toContainText("il en faut au moins 1");
      expect((await trajetsDeLaPage(page)).length).toBe(avant);
      expect(await page.evaluate(() => localStorage.getItem("pt-en-route"))).toBeNull();
    });
  });
});
