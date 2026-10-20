import { test, expect, trajetCalcule, lireResultat, moyenneDuJour, virgule } from "./_aides";

test.describe("US-4.2 — Mettre mon propre prix", () => {
  test.describe("Happy Path", () => {
    test("US-4.2 — 1,699 recalcule le coût (litres × 1,699), libellé « Mon prix » ; « Revenir à la moyenne » le rétablit", async ({ page }) => {
      const r0 = await trajetCalcule(page, "Albi", "Toulouse");
      const moyenne = await moyenneDuJour("SP95-E10");
      await expect(page.locator('[data-el="libelle-prix"]')).toContainText("Moyenne France du jour");
      await page.locator('[data-el="mettre-mon-prix"]').click();
      await page.locator('[data-el="champ-prix-perso"]').pressSequentially("1,699", { delay: 60 });
      await expect(page.locator('[data-el="libelle-prix"]')).toHaveText("Mon prix");
      const r1 = await lireResultat(page);
      expect(r1.detail).toContain("1,699 €/L");
      expect(Math.abs(r1.cout - r1.litres * 1.699)).toBeLessThan(0.1);
      expect(r1.cout).toBeLessThan(r0.cout);
      await page.locator('[data-el="revenir-moyenne"]').click();
      await expect(page.locator('[data-el="libelle-prix"]')).toContainText("Moyenne France du jour");
      const r2 = await lireResultat(page);
      expect(r2.cout).toBe(r0.cout);
      expect(r2.detail).toContain(virgule(moyenne, 3));
    });
  });
  test.describe("Edge Case", () => {
    test("US-4.2 — bornes : 0,50 et 4,00 acceptés (le coût suit), le prix perso n'est pas enregistré dans l'historique", async ({ page }) => {
      const r0 = await trajetCalcule(page, "Albi", "Toulouse");
      await page.locator('[data-el="mettre-mon-prix"]').click();
      const c = page.locator('[data-el="champ-prix-perso"]');
      await c.fill("4,00");
      await expect(page.locator('[data-el="erreur-prix-perso"]')).toHaveCount(0);
      await expect(page.locator('[data-el="libelle-prix"]')).toHaveText("Mon prix");
      await expect.poll(async () => Math.abs((await lireResultat(page)).cout / 4 - r0.litres)).toBeLessThan(0.06);
      await c.fill("0,50");
      await expect.poll(async () => Math.abs((await lireResultat(page)).cout / 0.5 - r0.litres)).toBeLessThan(0.06);
      await page.locator('[data-el="retour-trajets"]').click();
      await expect(page.locator('[data-el="liste-historique"] .c').first()).toHaveText(`${virgule(r0.cout)} €`);
    });
  });
});
