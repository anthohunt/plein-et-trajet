import { test, expect, ouvrirTrajets, choisirVoiture, S6, trajetsDeLaPage } from "./_aides";

test.describe("US-6.E1 — Localisation refusée", () => {
  test.use({ permissions: [] }); // vrai refus du navigateur : aucune permission de géolocalisation
  test.describe("Edge Case", () => {
    test("US-6.E1 — refus : message avec la façon d'autoriser, aucun écran En route, aucun trajet créé", async ({ page }) => {
      test.setTimeout(90_000);
      await ouvrirTrajets(page);
      await choisirVoiture(page);
      const avant = (await trajetsDeLaPage(page)).length;
      await page.locator('[data-el="bouton-enregistrer"]').click();
      const m = page.locator('[data-el="localisation-refusee"]');
      await expect(m).toBeVisible({ timeout: 15_000 });
      await expect(m).toContainText("L'enregistrement a besoin de ta localisation");
      await expect(m).toContainText("« Position » sur « Autoriser »");
      await expect(S6(page)).toHaveCount(0);
      expect(await page.evaluate(() => localStorage.getItem("pt-en-route"))).toBeNull();
      expect((await trajetsDeLaPage(page)).length).toBe(avant);
    });
  });
});
