import { test, expect } from "@playwright/test";
import { lignes, pastilles } from "./_aides";

// MOCKED: page.route — coupure réseau de la lecture des prix (impossible à provoquer sur la vraie base)
test("US-1.E1 — prix injoignables : message + Réessayer, puis retour normal", async ({ page }) => {
  await page.route("**/rest/v1/prix*", (r) => r.abort());
  await page.goto("/");
  await expect(page.locator('[data-el="etat-erreur"]')).toContainText("Prix indisponibles pour l'instant");
  await expect(page.getByRole("button", { name: "Réessayer" })).toBeVisible();
  await expect(lignes(page)).toHaveCount(0);
  await expect(pastilles(page)).toHaveCount(0);
  await page.unroute("**/rest/v1/prix*");
  await page.getByRole("button", { name: "Réessayer" }).click();
  await expect(lignes(page).first()).toBeVisible();
});
