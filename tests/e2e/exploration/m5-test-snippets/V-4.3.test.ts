import { test, expect, D, PTS, lireGpx, avecVoiture, demarrer, arreter, direct, rejouer, lireIdb, ecrireIdb, trajetPrepare, moyenne, virgule, nb, euros2 } from "./_aides";

// ÉTAT PRÉPARÉ : 41,2 L à 2,161 €/L ne se roulent pas en un essai ; le trajet arrêté est écrit en IndexedDB au format de l'appli.
test.describe("V-4.3 — Coût de l'essence", () => {
  test.describe("Happy Path", () => {
    test("V-4.3 — 41,2 L × 2,161 €/L = 89,03 € essence ; recalculé hors ligne au changement de prix", async ({ page, context }) => {
      await avecVoiture(context);
      await page.goto("/historique");
      await page.locator('[data-screen="T6"]').waitFor();
      await ecrireIdb(page, [], trajetPrepare({ id: "s-412", debut: "2026-10-21T06:30:00+02:00", minutes: 345, km: 588, litres: 41.2, prix: await moyenne("SP95-E10"), prixPerso: 2.161, depart: "Albi", arrivee: "Paris", enregistre: false }));
      await page.goto("/");
      await expect(page).toHaveURL(/\/fin$/);
      await expect(page.locator(D("cout-trajet"))).toHaveText(/^89,03\s*€ essence$/);
      await context.setOffline(true);
      await page.locator(D("compteur-prix")).tap();
      await page.locator(D("champ-prix")).fill("2,050");
      await page.locator(D("champ-prix")).press("Enter");
      await expect(page.locator(D("cout-trajet"))).toHaveText(/^84,46\s*€ essence$/);
    });
  });
});
