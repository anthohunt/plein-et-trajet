import { test, expect, connecterAdmin, carte, etatCarte, modifieLesMoteurs, restService, sqlGestion } from "./_aides";

test.describe("US-5.E2 — Clé refusée", () => {
  modifieLesMoteurs();
  test.describe("Edge Case", () => {
    test("US-5.E2 — clé PTV invalide : le vrai PTV répond 401 → « Clé refusée par PTV (401) »", async ({ page }) => {
      await connecterAdmin(page);
      await expect(page.locator('[data-el="moteur"]')).toHaveCount(6, { timeout: 20000 });
      await carte(page, "peages").locator('[data-el="champ-cle"]').fill("cle-invalide-0000-zz91");
      await carte(page, "peages").locator('[data-el="tester-connexion"]').click();
      await expect(etatCarte(page, "peages")).toHaveText("Clé refusée par PTV (401)", { timeout: 30000 });
      await expect(etatCarte(page, "peages")).toHaveAttribute("data-etat", "ko");
    });
    test("US-5.E2 — Enregistrer avec une clé HERE invalide garde PTV actif", async ({ page }) => {
      await connecterAdmin(page);
      await expect(page.locator('[data-el="moteur"]')).toHaveCount(6, { timeout: 20000 });
      await carte(page, "peages").locator('[data-el="choix-fournisseur"]').selectOption("here");
      await carte(page, "peages").locator('[data-el="champ-cle"]').fill("cle-invalide-here-5512");
      await carte(page, "peages").locator('[data-el="enregistrer-moteur"]').click();
      await expect(etatCarte(page, "peages")).toContainText("Clé refusée par HERE (401)", { timeout: 30000 });
      await expect(etatCarte(page, "peages")).toContainText("fournisseur actif inchangé");
      await expect(etatCarte(page, "peages")).toContainText("clé non enregistrée");
      expect((await restService("moteurs?select=actif&service=eq.peages")).corps[0].actif).toBe("ptv");
      expect((await sqlGestion("select count(*)::int as n from vault.secrets where name like 'cle_%'"))[0].n).toBe(0);
      await page.reload();
      await expect(page.locator('[data-el="moteur"]')).toHaveCount(6, { timeout: 20000 });
      await expect(carte(page, "peages").locator('[data-el="choix-fournisseur"]')).toHaveValue("ptv");
    });
  });
});
