import { test, expect, formulaire, ALBI_, LAUSANNE, BARCELONE_, calculer, lignesListe } from "./_aides";

test.describe("US-4.E5 — Vignette sur le trajet", () => {
  test.describe("Edge Case", () => {
    test("US-4.E5 — Albi → Lausanne traverse la Suisse : « Vignette suisse obligatoire (non comptée) »", async ({ page }) => {
      await formulaire(page, ALBI_, LAUSANNE);
      await calculer(page);
      await expect(page.locator('[data-el="ligne-vignette"]')).toHaveCount(1);
      await expect(page.locator('[data-el="ligne-vignette"]')).toContainText("Vignette suisse obligatoire (non comptée)");
      expect((await lignesListe(page, "pays-traverses")).map((x: any) => x.pays)).toContain("CH");
    });
    test("US-4.E5 — pas de vignette pour un trajet France → Espagne", async ({ page }) => {
      await formulaire(page, ALBI_, BARCELONE_);
      await calculer(page);
      await expect(page.locator('[data-el="ligne-vignette"]')).toHaveCount(0);
    });
  });
});
