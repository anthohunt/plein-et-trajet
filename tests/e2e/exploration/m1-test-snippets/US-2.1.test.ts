import { test, expect } from "@playwright/test";
import { choisir, lignes, ouvrirPrix } from "./_aides";

for (const mode of ["bouton", "Échap"]) {
  test(`US-2.1 — fermer la fiche (${mode}) garde le carburant choisi`, async ({ page }) => {
    await ouvrirPrix(page);
    await choisir(page, "Gazole");
    await lignes(page).first().click();
    await expect(page.getByRole("dialog")).toBeVisible();
    if (mode === "bouton") await page.getByRole("button", { name: "Fermer la fiche" }).click();
    else await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Gazole", exact: true })).toHaveAttribute("aria-pressed", "true");
  });
}
