import { test, expect, connecterAdmin, carte, etatCarte, modifieLesMoteurs } from "./_aides";

test.describe("US-5.2 — Choisir le fournisseur", () => {
  modifieLesMoteurs();
  test.describe("Happy Path", () => {
    test("US-5.2 — HERE (clé requise) → « Clé à coller » ; IGN (sans clé) → « Prêt · sans clé »", async ({ page }) => {
      await connecterAdmin(page);
      await expect(page.locator('[data-el="moteur"]')).toHaveCount(6, { timeout: 20000 });
      await carte(page, "peages").locator('[data-el="choix-fournisseur"]').selectOption("here");
      await expect(etatCarte(page, "peages")).toHaveText("Clé à coller");
      await carte(page, "itineraire").locator("select").first().selectOption("itineraire-ign");
      await expect(etatCarte(page, "itineraire")).toHaveText("Prêt · sans clé");
      await expect(carte(page, "peages").locator('[data-el="champ-cle"]')).toBeVisible();
      await expect(carte(page, "itineraire").locator("input")).toHaveCount(0);
    });
  });
  test.describe("Edge Case", () => {
    test("US-5.2 — choisir sans enregistrer ne change rien côté serveur (l'actif reste PTV)", async ({ page }) => {
      await connecterAdmin(page);
      await expect(page.locator('[data-el="moteur"]')).toHaveCount(6, { timeout: 20000 });
      await carte(page, "peages").locator('[data-el="choix-fournisseur"]').selectOption("here");
      await page.reload();
      await expect(page.locator('[data-el="moteur"]')).toHaveCount(6, { timeout: 20000 });
      await expect(carte(page, "peages").locator('[data-el="choix-fournisseur"]')).toHaveValue("ptv");
    });
  });
});
