import { test, expect, connecterAdmin, carte, modifieLesMoteurs, injecterCle, restService, formulaire, ALBI_, BORDEAUX, calculer } from "./_aides";

test.describe("US-5.E3 — Bascule de secours", () => {
  modifieLesMoteurs();
  test.describe("Edge Case", () => {
    test("US-5.E3 — BLOQUÉ-CLÉ (forme du plan) : PTV tombe, les péages viennent de HERE", async () => {
      test.info().annotations.push({ type: "BLOQUÉ-CLÉ", description: "il manque une clé HERE valide" });
      test.skip(true, "BLOQUÉ-CLÉ : la forme du plan (PTV principal → HERE secours) exige une clé HERE valide ; la bascule réelle d'un principal en panne vers un secours qui répond est vérifiée par le test suivant (HERE refusé → PTV)");
    });
    test("US-5.E3 — bascule RÉELLE : HERE principal (clé factice, vrai 401), PTV secours (vraie clé) : les péages s'affichent et l'écran Moteurs note la bascule avec l'heure", async ({ page }) => {
      await injecterCle("here", "FAUX-HERE-CLE-0002");
      await restService("moteurs?service=eq.peages", { method: "PATCH", body: JSON.stringify({ actif: "here", secours: "ptv", bascule_le: null, bascule_de: null, bascule_vers: null }) });
      await formulaire(page, ALBI_, BORDEAUX);
      await calculer(page);
      await expect(page.locator('[data-el="peages-indisponibles"]')).toHaveCount(0);
      await expect(page.locator('[data-el="total-peages"]')).toBeVisible();
      await connecterAdmin(page);
      await expect(page.locator('[data-el="moteur"]')).toHaveCount(6, { timeout: 20000 });
      await expect(carte(page, "peages").locator('[data-el="bascule"]')).toHaveText(/^Bascule HERE → PTV Developer le \d{2}\/\d{2} \d{2}:\d{2}$/);
      await expect(carte(page, "peages").locator('[data-el="incident"]')).toContainText("HERE : clé refusée (401)");
    });
  });
});
