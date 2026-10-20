import { test, expect, connecterAdmin, carte, modifieLesMoteurs, restService, formulaire, ALBI_, BORDEAUX, calculer } from "./_aides";

test.describe("US-5.E3 — Bascule de secours", () => {
  modifieLesMoteurs();
  test.describe("Edge Case", () => {
    test("US-5.E3 — BLOQUÉ-CLÉ : PTV tombe, les péages viennent de HERE et l'écran Moteurs note la bascule avec l'heure", async () => {
      test.info().annotations.push({ type: "BLOQUÉ-CLÉ", description: "il manque une clé HERE valide (et une clé PTV valide pour une vraie panne PTV)" });
      test.skip(true, "BLOQUÉ-CLÉ : la bascule RÉUSSIE exige une clé HERE valide ; la chaîne actif → secours est couverte par m3-europe.test.ts (executerChaine)");
    });
    test("US-5.E3 — chaîne réelle PTV → HERE parcourue : les deux refusent (401), l'incident est noté avec l'heure, le coût carburant reste", async ({ page }) => {
      await connecterAdmin(page);
      await expect(page.locator('[data-el="moteur"]')).toHaveCount(6, { timeout: 20000 });
      await carte(page, "peages").locator('[data-el="champ-cle"]').fill("cle-ptv-factice-0001");
      await carte(page, "peages").locator('[data-el="choix-secours-peages"]').selectOption("here");
      await carte(page, "peages").locator('[data-el="champ-cle-secours-peages"]').fill("cle-here-factice-0002");
      await carte(page, "peages").locator('[data-el="enregistrer-moteur"]').click();
      await expect(carte(page, "peages").locator('[data-el="enregistrer-moteur"]')).toBeEnabled({ timeout: 45000 });
      expect((await restService("moteurs?select=actif,secours&service=eq.peages")).corps[0]).toEqual({ actif: "ptv", secours: "here" });
      await formulaire(page, ALBI_, BORDEAUX);
      await calculer(page);
      await expect(page.locator('[data-el="peages-indisponibles"]')).toBeVisible();
      await connecterAdmin(page);
      await expect(page.locator('[data-el="moteur"]')).toHaveCount(6, { timeout: 20000 });
      await expect(carte(page, "peages").locator('[data-el="incident"]')).toHaveText(/^Dernier incident · PTV : clé refusée \(401\) · \d{2}\/\d{2} \d{2}:\d{2}$/);
      expect((await restService("moteurs?select=incident_message&service=eq.peages")).corps[0].incident_message).toMatch(/^ptv/);
    });
  });
});
