import { test, expect, connecterAdmin, carte, etatCarte, modifieLesMoteurs, cleValideEnregistree } from "./_aides";

test.describe("US-5.4 — Tester la connexion", () => {
  modifieLesMoteurs();
  test.describe("Happy Path", () => {
    test("US-5.4 — BLOQUÉ-CLÉ : avec une clé PTV valide, « Tester la connexion » envoie un vrai calcul et affiche « Connecté »", async ({ page }) => {
      test.info().annotations.push({ type: "BLOQUÉ-CLÉ", description: "il manque une clé PTV Developer valide" });
      test.skip(true, "BLOQUÉ-CLÉ : aucune clé PTV valide n'existe (Anthony la colle dans l'écran Moteurs) ; la variable d'environnement PTV_CLE_TEST ne doit jamais être utilisée : rien en dur");
    });
    test("US-5.4 — le même test réel réussit sur un moteur sans clé : Valhalla → « Connecté · test Albi → Toulouse OK »", async ({ page }) => {
      await connecterAdmin(page);
      await expect(page.locator('[data-el="moteur"]')).toHaveCount(6, { timeout: 20000 });
      await carte(page, "itineraire").locator('[data-el="tester-connexion-itineraire"]').click();
      await expect(etatCarte(page, "itineraire")).toContainText("Connecté · test Albi → Toulouse OK", { timeout: 30000 });
      await expect(etatCarte(page, "itineraire")).toHaveAttribute("data-etat", "ok");
    });
  });
  test.describe("Edge Case", () => {
    test("US-5.4 — sans clé : « Aucune clé : colle-la d'abord » (aucun appel à PTV)", async ({ page }) => {
      await connecterAdmin(page);
      await expect(page.locator('[data-el="moteur"]')).toHaveCount(6, { timeout: 20000 });
      await carte(page, "peages").locator('[data-el="tester-connexion"]').click();
      await expect(etatCarte(page, "peages")).toHaveText("Aucune clé : colle-la d'abord");
      await expect(etatCarte(page, "peages")).toHaveAttribute("data-etat", "ko");
    });
  });
});
