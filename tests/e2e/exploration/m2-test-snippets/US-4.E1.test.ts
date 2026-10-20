import { test, expect, formulairePret, saisirLieu, compterCalculs, S4, dbTrajets, lignesHistorique } from "./_aides";

test.describe("US-4.E1 — Itinéraire impossible", () => {
  test.describe("Edge Case", () => {
    test("US-4.E1 — Albi → Bastia (vrai routeur IGN, sans mock) : HTTP 422, « Pas d'itinéraire routier entre ces deux lieux », aucun coût, historique inchangé", async ({ page }) => {
      const calculs = compterCalculs(page);
      await formulairePret(page, "Albi", "Albi");
      await saisirLieu(page, "arrivee", "Bast", "Bastia");
      await page.locator("#bouton-calculer").click();
      await expect(S4(page, "pas_itineraire")).toBeVisible({ timeout: 45000 });
      await expect(page.locator('[data-el="pas-itineraire"] .t')).toHaveText("Pas d'itinéraire routier entre ces deux lieux");
      await expect(page.locator("[data-cout]")).toHaveCount(0);
      expect(calculs.statuts).toEqual([422]);
      await page.locator('[data-el="retour-trajets"]').click();
      await expect(page.locator('[data-screen="S3"]')).toBeVisible();
      await expect(lignesHistorique(page)).toHaveCount(0);
      expect(await dbTrajets(page)).toEqual([]);
    });
  });
  test.describe("Même lieu", () => {
    test("US-4.E1 — Albi → Albi : message adapté (même lieu), pas de « île sans liaison routière »", async ({ page }) => {
      await formulairePret(page, "Albi", "Albi");
      await page.locator("#bouton-calculer").click();
      await expect(S4(page, "pas_itineraire")).toBeVisible({ timeout: 45000 });
      await expect(page.locator('[data-el="pas-itineraire"] .t')).toHaveText("Pas d'itinéraire routier entre ces deux lieux");
      await expect(page.locator('[data-el="pas-itineraire"] .d')).toContainText("sont le même lieu");
      await expect(page.locator('[data-el="pas-itineraire"] .d')).not.toContainText("île");
    });
  });
});
