import { test, expect, connecterAdmin, carte, etatCarte, modifieLesMoteurs, lireEtatReel } from "./_aides";

test.describe("US-5.4 — Tester la connexion", () => {
  modifieLesMoteurs();
  test.describe("Happy Path", () => {
    test("US-5.4 — clé PTV valide : un vrai calcul Albi → Barcelone part vers PTV, l'état affiche « Connecté »", async ({ page }) => {
      test.skip(!(await lireEtatReel()).cles.ptv, "aucune clé PTV enregistrée : le manager doit la remettre");
      await connecterAdmin(page);
      await expect(page.locator('[data-el="moteur"]')).toHaveCount(6, { timeout: 20000 });
      await carte(page, "peages").locator('[data-el="tester-connexion"]').click();
      await expect(etatCarte(page, "peages")).toContainText("Connecté · test Albi → Barcelone OK", { timeout: 60000 });
      await expect(etatCarte(page, "peages")).toHaveAttribute("data-etat", "ok");
    });
    test("US-5.4 — l'itinéraire se teste aussi : « Connecté · test Albi → Toulouse OK »", async ({ page }) => {
      await connecterAdmin(page);
      await expect(page.locator('[data-el="moteur"]')).toHaveCount(6, { timeout: 20000 });
      await carte(page, "itineraire").locator('[data-el="tester-connexion-itineraire"]').click();
      await expect(etatCarte(page, "itineraire")).toContainText("Connecté · test Albi → Toulouse OK", { timeout: 40000 });
    });
  });
  test.describe("Edge Case", () => {
    test("US-5.4 — HERE sans clé : « Aucune clé : colle-la d'abord » (aucun appel à HERE)", async ({ page }) => {
      await connecterAdmin(page);
      await expect(page.locator('[data-el="moteur"]')).toHaveCount(6, { timeout: 20000 });
      await carte(page, "peages").locator('[data-el="choix-fournisseur"]').selectOption("here");
      await carte(page, "peages").locator('[data-el="tester-connexion"]').click();
      await expect(etatCarte(page, "peages")).toHaveText("Aucune clé : colle-la d'abord");
      await expect(etatCarte(page, "peages")).toHaveAttribute("data-etat", "ko");
    });
  });
});
