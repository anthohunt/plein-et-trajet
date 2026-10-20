import { test, expect, formulaire, ALBI_, BORDEAUX, calculer, lireResultat, moyenneDuJour, modifieLesMoteurs, restService } from "./_aides";

test.describe("US-4.E4 — Péages indisponibles", () => {
  modifieLesMoteurs();
  test.describe("Edge Case", () => {
    test("US-4.E4 — péages confiés à HERE (aucune clé : service réellement en erreur) : coût carburant affiché, rien ajouté ; retour à PTV : le même trajet retrouve ses péages", async ({ page }) => {
      await restService("moteurs?service=eq.peages", { method: "PATCH", body: JSON.stringify({ actif: "here", secours: null }) });
      await formulaire(page, ALBI_, BORDEAUX);
      await calculer(page);
      const r = await lireResultat(page);
      expect(r.cout).toBeCloseTo(Math.round(r.litres * (await moyenneDuJour("SP95-E10")) * 100) / 100, 1);
      await expect(page.locator('[data-el="peages-indisponibles"]')).toContainText("Péages non disponibles pour l'instant");
      await expect(page.locator('[data-el="total-peages"]')).toHaveCount(0);
      await expect(page.locator('[data-el="repartition-cout"]')).toHaveCount(0);
      await restService("moteurs?service=eq.peages", { method: "PATCH", body: JSON.stringify({ actif: "ptv", secours: null }) });
      await page.locator('[data-el="retour-trajets"]').click();
      await page.locator('[data-el="liste-historique"] li', { hasText: "Bordeaux" }).first().locator("button.go").click();
      await expect(page.locator('[data-screen="S4"][data-etat="ok"]')).toBeVisible({ timeout: 60000 });
      await expect(page.locator('[data-el="peages-indisponibles"]')).toHaveCount(0);
      await expect(page.locator('[data-el="total-peages"]')).toBeVisible();
    });
  });
});
