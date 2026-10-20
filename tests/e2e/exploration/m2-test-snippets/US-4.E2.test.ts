import { test, expect, trajetCalcule, lireResultat } from "./_aides";

test.describe("US-4.E2 — Prix perso invalide", () => {
  test.describe("Edge Case", () => {
    for (const saisie of ["12", "abc", "0,49", "4,01", "0", "-1,5", "1,6999"]) {
      test(`US-4.E2 — « ${saisie} » : message « Entre un prix entre 0,50 et 4,00 €/L », coût inchangé`, async ({ page }) => {
        const r0 = await trajetCalcule(page, "Albi", "Toulouse");
        await page.locator('[data-el="mettre-mon-prix"]').click();
        const c = page.locator('[data-el="champ-prix-perso"]');
        await c.pressSequentially(saisie, { delay: 40 });
        await expect(page.locator('[data-el="erreur-prix-perso"]')).toHaveText("Entre un prix entre 0,50 et 4,00 €/L");
        await expect(c).toHaveAttribute("aria-invalid", "true");
        expect((await lireResultat(page)).cout).toBe(r0.cout);
        await expect(page.locator('[data-el="libelle-prix"]')).toContainText("Moyenne France du jour");
        await c.fill("1,699");
        await expect(page.locator('[data-el="erreur-prix-perso"]')).toHaveCount(0);
        await expect(page.locator('[data-el="libelle-prix"]')).toHaveText("Mon prix");
      });
    }
  });
});
