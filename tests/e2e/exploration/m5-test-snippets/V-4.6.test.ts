import { test, expect, D, PTS, lireGpx, avecVoiture, demarrer, arreter, direct, rejouer, lireIdb, ecrireIdb, trajetPrepare, moyenne, virgule, nb, euros2 } from "./_aides";

test.describe("V-4.6 — Courbe de consommation", () => {
  test.describe("Happy Path", () => {
    test("V-4.6 — moyenne affichée = litres ÷ km × 100 (à 0,1 près), pointe = maximum de la courbe", async ({ page, context }) => {
      await avecVoiture(context);
      await demarrer(page);
      await rejouer(context, page, PTS, 1, 1500);
      await arreter(page);
      const a = (await lireIdb(page)).arrete;
      const pointe = Math.max(a.conso_max, ...a.consos);
      await expect(page.locator(D("info-conso"))).toHaveText(`moy. ${virgule((a.litres / a.km) * 100, 1)} · pointe ${virgule(pointe, 1)} L/100`);
      expect(Number(await page.locator(D("courbe-conso")).getAttribute("data-points"))).toBeLessThanOrEqual(600);
    });
  });
});
