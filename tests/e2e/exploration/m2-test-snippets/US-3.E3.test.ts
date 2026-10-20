import { test, expect, ouvrirTrajets, rest, session, lignesHistorique } from "./_aides";

test.describe("US-3.E3 — Historique vide", () => {
  test.describe("Edge Case", () => {
    test("US-3.E3 — nouvelle identité : « Aucun trajet pour l'instant » et l'invitation à calculer le premier", async ({ page }) => {
      await ouvrirTrajets(page);
      await expect(page.locator('[data-el="historique-vide"] .t')).toHaveText("Aucun trajet pour l'instant");
      await expect(page.locator('[data-el="historique-vide"] .d')).toContainText("Calculer le coût");
      await expect(lignesHistorique(page)).toHaveCount(0);
      expect(await rest("trajets?select=id", (await session(page)).jeton)).toEqual([]);
    });
    test("US-3.E3 — un aller-retour Prix → Trajets garde l'état vide ; l'historique d'une autre identité n'apparaît pas", async ({ page }) => {
      await ouvrirTrajets(page);
      await page.getByRole("tab", { name: "Prix" }).click();
      await page.getByRole("tab", { name: "Trajets" }).click();
      await expect(page.locator('[data-el="historique-vide"]')).toBeVisible();
    });
  });
});
