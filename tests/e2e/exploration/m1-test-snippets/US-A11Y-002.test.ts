import { test, expect } from "@playwright/test";
import { lignes, ouvrirPrix } from "./_aides";

test("US-A11Y-002 — focus sur le titre à l'ouverture, retour sur l'élément ouvreur", async ({ page }) => {
  await ouvrirPrix(page);
  const ligne = lignes(page).nth(1);
  await ligne.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#sh-name")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(ligne).toBeFocused();
});
