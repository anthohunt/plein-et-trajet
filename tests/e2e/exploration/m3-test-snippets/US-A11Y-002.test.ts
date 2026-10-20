import { test, expect, BARCELONE } from "./_aides";

test.describe("US-A11Y-002 — Focus de la fiche (jalon 3)", () => {
  test.use({ geolocation: BARCELONE });
  test.describe("Happy Path", () => {
    test("US-A11Y-002 — fiche d'une station espagnole : focus sur son titre, retour sur la ligne à la fermeture", async ({ page }) => {
      await page.goto("/");
      await page.locator('[data-el="selecteur-carburant"] button', { hasText: "Gazole" }).click();
      await expect(page.locator('[data-el="liste-stations"]')).toHaveAttribute("data-carburant", "Gazole", { timeout: 20000 });
      await page.waitForTimeout(1500); // liste stabilisée (prix, moyennes) avant de retenir la première ligne
      const ligne = page.locator('[data-el="ligne-station"]').first();
      const id = await ligne.getAttribute("data-station");
      await ligne.focus();
      await page.keyboard.press("Enter");
      await expect(page.getByRole("dialog")).toBeVisible();
      expect(await page.evaluate(() => document.activeElement?.tagName)).toMatch(/^H\d$/);
      await page.getByRole("button", { name: "Fermer la fiche" }).click();
      expect(await page.evaluate(() => document.activeElement?.getAttribute("data-station"))).toBe(id);
    });
  });
});
