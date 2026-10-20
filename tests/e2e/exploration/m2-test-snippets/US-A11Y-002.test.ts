import { test, expect, formulairePret, S4, compterCalculs } from "./_aides";

test.describe("US-A11Y-002 — Focus du résultat (S4, équivalent de la fiche)", () => {
  test.describe("Happy Path", () => {
    test("US-A11Y-002 — S4 ouvert au clavier : le focus va sur son titre ; à la fermeture il revient sur Calculer", async ({ page }) => {
      await formulairePret(page, "Albi", "Toulouse");
      await page.locator("#bouton-calculer").focus();
      await page.keyboard.press("Enter");
      await expect(S4(page, "ok")).toBeVisible({ timeout: 45000 });
      await expect(page.locator('[data-el="route-titre"]')).toBeFocused();
      await page.locator('[data-el="retour-trajets"]').focus();
      await page.keyboard.press("Enter");
      await expect(page.locator("#bouton-calculer")).toBeFocused();
    });
  });
  test.describe("Edge Case", () => {
    test("US-A11Y-002 — l'état de chargement place le focus sur Annuler ; la ligne d'historique rouvre S4 et récupère le focus", async ({ page }) => {
      await formulairePret(page, "Albi", "Toulouse");
      await page.locator("#bouton-calculer").click();
      await expect(S4(page, "calcul")).toBeVisible();
      await expect(page.locator('[data-el="annuler-calcul"]')).toBeFocused();
      await expect(S4(page, "ok")).toBeVisible({ timeout: 45000 });
      await page.locator('[data-el="retour-trajets"]').click();
      await page.locator("button.go").first().focus();
      await page.keyboard.press("Enter");
      await expect(S4(page, "ok")).toBeVisible({ timeout: 45000 });
      await expect(page.locator('[data-el="route-titre"]')).toBeFocused();
      await page.locator('[data-el="retour-trajets"]').click();
      await expect(page.locator("button.go").first()).toBeFocused();
    });
  });
});
