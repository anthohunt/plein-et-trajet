import { test, expect } from "@playwright/test";
import { lignes, ouvrirPrix } from "./_aides";

test("US-A11Y-003 — Échap ferme la fiche", async ({ page }) => {
  await ouvrirPrix(page);
  await lignes(page).first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
