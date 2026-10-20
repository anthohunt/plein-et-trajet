import { test, expect, trajetCalcule, compterCalculs, moyenneDuJour, lireResultat, dbTrajets, S4, lignesHistorique } from "./_aides";

test.describe("US-3.6 — Rejouer un ancien trajet", () => {
  test.describe("Happy Path", () => {
    test("US-3.6 — la ligne d'historique relance un calcul réel au prix moyen du jour et remonte en tête, sans doublon", async ({ page }) => {
      await trajetCalcule(page, "Albi", "Toulouse");
      await page.locator('[data-el="retour-trajets"]').click();
      const avant = (await dbTrajets(page))[0];
      const calculs = compterCalculs(page);
      await page.waitForTimeout(1100);
      await page.locator('[data-el="ligne-historique"]').click();
      await expect(S4(page, "ok")).toBeVisible({ timeout: 45000 });
      expect(calculs.n).toBe(1);
      await expect(page.locator('[data-el="trajet-rejoue"]')).toHaveText("Trajet recalculé au prix moyen du jour");
      const r = await lireResultat(page);
      const moyenne = await moyenneDuJour("SP95-E10");
      expect(r.detail).toContain(moyenne.toFixed(3).replace(".", ","));
      expect(r.cout).toBeCloseTo(Math.round(r.litres * moyenne * 100) / 100, 1);
      const apres = await dbTrajets(page);
      expect(apres).toHaveLength(1);
      expect(new Date(apres[0].cree_le).getTime()).toBeGreaterThan(new Date(avant.cree_le).getTime());
    });
  });
  test.describe("Edge Case", () => {
    test("US-3.6 — le focus revient sur la ligne rejouée à la fermeture du résultat", async ({ page }) => {
      await trajetCalcule(page, "Albi", "Toulouse");
      await page.locator('[data-el="retour-trajets"]').click();
      await page.locator('[data-el="ligne-historique"]').click();
      await expect(S4(page, "ok")).toBeVisible({ timeout: 45000 });
      await page.locator('[data-el="retour-trajets"]').click();
      await expect(page.locator("button.go").first()).toBeFocused();
      await expect(lignesHistorique(page)).toHaveCount(1);
    });
  });
});
