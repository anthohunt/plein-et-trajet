import { test, expect, formulaire, ALBI_, BORDEAUX, CASTRES, calculer, lireResultat, cout, moyenneDuJour, modifieLesMoteurs, restService } from "./_aides";

test.describe("US-4.E4 — Péages indisponibles", () => {
  modifieLesMoteurs();
  test.describe("Edge Case", () => {
    test("US-4.E4 — sans clé active, les péages sont réellement indisponibles : coût carburant affiché, rien ajouté (aucun mock)", async ({ page }) => {
      const m = await restService("moteurs?select=actif,etat&service=eq.peages");
      expect(m.corps[0]).toMatchObject({ actif: "ptv", etat: "wait" });
      await formulaire(page, ALBI_, BORDEAUX);
      await calculer(page);
      const r = await lireResultat(page);
      expect(r.cout).toBeCloseTo(Math.round(r.litres * (await moyenneDuJour("SP95-E10")) * 100) / 100, 1);
      await expect(page.locator('[data-el="peages-indisponibles"]')).toContainText("Péages non disponibles pour l'instant");
      await expect(page.locator('[data-el="total-peages"]')).toHaveCount(0);
      await expect(page.locator('[data-el="repartition-cout"]')).toHaveCount(0);
    });
    test("US-4.E4 — retour à l'état normal : un trajet sans autoroute payante n'a plus de message d'indisponibilité", async ({ page }) => {
      await formulaire(page, ALBI_, CASTRES);
      await calculer(page);
      await expect(page.locator('[data-el="peages-indisponibles"]')).toHaveCount(0);
      await expect(page.locator('[data-el="detail-peages"]')).toContainText("Aucun péage sur cet itinéraire");
    });
  });
});
