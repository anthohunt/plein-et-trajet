import { test, expect, formulairePret, champ, lireResultat } from "./_aides";

test.describe("US-3.P1 — Inverser départ et arrivée", () => {
  test.describe("Happy Path", () => {
    test("US-3.P1 — le bouton d'inversion échange les textes ET les coordonnées : le calcul part de la nouvelle origine", async ({ page }) => {
      await formulairePret(page, "Albi", "Toulouse");
      await expect(page.locator('[data-el="inverser"]')).toHaveAttribute("aria-label", "Inverser les deux lieux");
      await page.locator('[data-el="inverser"]').click();
      await expect(champ(page, "depart")).toHaveValue("Toulouse");
      await expect(champ(page, "arrivee")).toHaveValue("Albi");
      await page.locator("#bouton-calculer").click();
      await expect(page.locator('[data-screen="S4"][data-etat="ok"]')).toBeVisible({ timeout: 45000 });
      expect((await lireResultat(page)).route).toBe("Toulouse → Albi");
    });
  });
  test.describe("Edge Case", () => {
    test("US-3.P1 — inverser deux fois rétablit l'état d'origine ; l'inversion se fait au clavier", async ({ page }) => {
      await formulairePret(page, "Albi", "Toulouse");
      await page.locator('[data-el="inverser"]').focus();
      await page.keyboard.press("Enter");
      await page.keyboard.press("Enter");
      await expect(champ(page, "depart")).toHaveValue("Albi");
      await expect(champ(page, "arrivee")).toHaveValue("Toulouse");
    });
  });
});
