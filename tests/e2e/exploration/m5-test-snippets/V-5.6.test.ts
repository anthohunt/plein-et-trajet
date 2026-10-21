import { test, expect, D, PTS, avecVoiture, demarrer, arreter, rejouer, lireIdb, ecrireIdb, trajetPrepare, moyenne, rest, virgule, nb, euros2, lignes, prixLigne } from "./_aides";

test.describe("V-5.6 — Trajet en cours", () => {
  test.describe("Happy Path", () => {
    test("V-5.6 — bandeau « ● Trajet en cours · X € » qui suit le coût ; l'onglet Trajet ramène à En route", async ({ page, context }) => {
      await avecVoiture(context);
      await page.goto("/stations");
      await expect(lignes(page).first()).toBeVisible({ timeout: 30_000 });
      await expect(page.locator(D("retour-trajet"))).toHaveCount(0); // sans trajet, pas de bandeau
      await demarrer(page);
      await rejouer(context, page, PTS, 1, 900);
      const euros = nb(await page.locator(D("direct-euros")).textContent());
      await page.clock.resume();
      await page.locator(D("onglet-stations")).tap();
      await expect(page.locator(D("retour-trajet"))).toHaveText(new RegExp(`^● Trajet en cours · ${virgule(euros, 2).replace(",", "\\,")} €$`));
      await page.locator(D("onglet-trajet")).tap();
      await expect(page).toHaveURL(/\/en-route$/);
    });
  });
});
