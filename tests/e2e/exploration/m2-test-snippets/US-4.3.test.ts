import { test, expect, trajetCalcule, lignesHistorique, dbTrajets, lireResultat, virgule } from "./_aides";

test.describe("US-4.3 — Revenir aux trajets", () => {
  test.describe("Happy Path", () => {
    test("US-4.3 — retour : formulaire affiché, trajet en tête de l'historique, focus sur le bouton Calculer", async ({ page }) => {
      const r = await trajetCalcule(page, "Albi", "Toulouse");
      await page.locator('[data-el="retour-trajets"]').click();
      await expect(page.locator('[data-screen="S3"]')).toBeVisible();
      await expect(lignesHistorique(page)).toHaveCount(1);
      await expect(lignesHistorique(page).first()).toContainText("Albi → Toulouse");
      await expect(page.locator('[data-el="liste-historique"] .c').first()).toHaveText(`${virgule(r.cout)} €`);
      await expect(page.locator("#bouton-calculer")).toBeFocused();
      expect((await dbTrajets(page))[0].arrivee_label).toBe("Toulouse");
    });
  });
  test.describe("Edge Case", () => {
    test("US-4.3 — un nouveau trajet passe devant l'ancien", async ({ page }) => {
      await trajetCalcule(page, "Albi", "Toulouse");
      await page.locator('[data-el="retour-trajets"]').click();
      await page.locator('[data-el="inverser"]').click();
      await page.locator("#bouton-calculer").click();
      await expect(page.locator('[data-screen="S4"][data-etat="ok"]')).toBeVisible({ timeout: 45000 });
      expect((await lireResultat(page)).route).toBe("Toulouse → Albi");
      await page.locator('[data-el="retour-trajets"]').click();
      await expect(lignesHistorique(page)).toHaveCount(2);
      await expect(lignesHistorique(page).first()).toContainText("Toulouse → Albi");
      await expect(lignesHistorique(page).nth(1)).toContainText("Albi → Toulouse");
    });
  });
});
