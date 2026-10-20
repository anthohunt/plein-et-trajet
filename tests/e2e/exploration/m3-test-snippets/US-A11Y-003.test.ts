import { test, expect, BARCELONE, formulaire, ALBI_, BARCELONE_, calculer } from "./_aides";

test.describe("US-A11Y-003 — Touche Échap (jalon 3)", () => {
  test.describe("Happy Path", () => {
    test.use({ geolocation: BARCELONE });
    test("US-A11Y-003 — Échap ferme la fiche d'une station espagnole", async ({ page }) => {
      await page.goto("/");
      await expect(page.locator('[data-el="ligne-station"]').first()).toBeVisible({ timeout: 20000 });
      await page.locator('[data-el="ligne-station"]').first().focus();
      await page.keyboard.press("Enter");
      await expect(page.getByRole("dialog")).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(page.getByRole("dialog")).toHaveCount(0);
    });
  });
  test.describe("Edge Case", () => {
    test("US-A11Y-003 — Échap replie un tronçon d'un trajet Europe et lui rend le focus", async ({ page }) => {
      await formulaire(page, ALBI_, BARCELONE_);
      await calculer(page);
      const t = page.locator("#troncon-4");
      await t.focus();
      await page.keyboard.press("Enter");
      await expect(t).toHaveAttribute("aria-expanded", "true");
      await page.keyboard.press("Escape");
      await expect(t).toHaveAttribute("aria-expanded", "false");
      await expect(t).toBeFocused();
    });
  });
});
