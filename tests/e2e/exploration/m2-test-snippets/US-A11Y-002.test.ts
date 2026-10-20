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
  test.describe("Fiche station (jalon 1, règle du plan)", () => {
    test("US-A11Y-002 — fiche réelle ouverte au clavier : focus sur le titre ; Échap : retour sur la ligne ouvrante", async ({ page }) => {
      await page.goto("/");
      const ligne = page.locator('[data-el="ligne-station"]').first();
      await expect(ligne).toBeVisible();
      await ligne.focus();
      await page.keyboard.press("Enter");
      await expect(page.locator("#sh-name")).toBeFocused();
      await page.keyboard.press("Escape");
      await expect(page.locator('[data-el="fiche-station"]')).toHaveCount(0);
      await expect(ligne).toBeFocused();
    });
  });
});
