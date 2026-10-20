import { test, expect } from "@playwright/test";
import { choisir, lignes, ouvrirPrix, pastilles } from "./_aides";

// MOCKED: page.route — réponse vide pour E85 (il existe de vraies stations E85 autour d'Albi)
test("US-1.E2 — aucune station E85 : message et carte vide", async ({ page }) => {
  await ouvrirPrix(page);
  await page.route("**/rest/v1/prix*carburant=eq.E85*", (r) => r.fulfill({ status: 200, contentType: "application/json", body: "[]" }));
  await choisir(page, "E85");
  await expect(page.locator('[data-el="etat-vide"]')).toHaveText("Aucune station ne vend ce carburant autour de vous.");
  await expect(pastilles(page)).toHaveCount(0);
  await page.unroute("**/rest/v1/prix*carburant=eq.E85*");
  await choisir(page, "SP95-E10");
  await choisir(page, "E85");
  await expect(lignes(page).first()).toBeVisible();
});
