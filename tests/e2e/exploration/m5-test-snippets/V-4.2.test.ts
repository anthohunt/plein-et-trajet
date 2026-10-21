import { test, expect, D, PTS, lireGpx, avecVoiture, demarrer, arreter, direct, rejouer, lireIdb, ecrireIdb, trajetPrepare, moyenne, virgule, nb, euros2 } from "./_aides";

test.describe("V-4.2 — Mettre mon prix", () => {
  test.describe("Happy Path", () => {
    test("V-4.2 — 1,989 : « Mon prix », coût recalculé, « Revenir à la moyenne » rend la moyenne", async ({ page, context }) => {
      await avecVoiture(context);
      await demarrer(page);
      await rejouer(context, page, PTS, 1, 600);
      await arreter(page);
      const litres = Number(await page.locator(D("fin-litres")).getAttribute("data-litres"));
      const e10 = await moyenne("SP95-E10");
      await page.locator(D("compteur-prix")).tap();
      await page.locator(D("champ-prix")).fill("1,989");
      await page.locator(D("champ-prix")).press("Enter");
      await expect(page.locator(D("libelle-prix"))).toHaveText("Mon prix");
      await expect(page.locator(D("cout-trajet"))).toHaveAttribute("data-cout", String(euros2(litres * 1.989)));
      await page.locator(D("revenir-moyenne")).tap();
      await expect(page.locator(D("libelle-prix"))).toHaveText("Moyenne France du jour");
      await expect(page.locator(D("cout-trajet"))).toHaveAttribute("data-cout", String(euros2(litres * e10)));
    });
  });
  test.describe("Edge Case", () => {
    test("V-4.2 — Échap : le prix d'avant reste", async ({ page, context }) => {
      await avecVoiture(context);
      await demarrer(page);
      await rejouer(context, page, PTS, 1, 600);
      await arreter(page);
      const avant = await page.locator(D("prix-apres")).getAttribute("data-prix");
      await page.locator(D("compteur-prix")).tap();
      await page.locator(D("champ-prix")).fill("1,5");
      await page.locator(D("champ-prix")).press("Escape");
      await expect(page.locator(D("champ-prix"))).toHaveCount(0);
      await expect(page.locator(D("prix-apres"))).toHaveAttribute("data-prix", avant!);
    });
  });
});
