import { test, expect, D, PTS, lireGpx, avecVoiture, demarrer, arreter, direct, rejouer, lireIdb, ecrireIdb, trajetPrepare, moyenne, virgule, nb, euros2 } from "./_aides";

// ÉTAT PRÉPARÉ : le trajet arrêté de 89,03 € (41,2 L à 2,161 €/L) écrit en IndexedDB au format de l'appli.
test.describe("V-4.4 — Partager", () => {
  test.beforeEach(async ({ page, context }) => {
    await avecVoiture(context);
    await page.goto("/historique");
    await page.locator('[data-screen="T6"]').waitFor();
    await ecrireIdb(page, [], trajetPrepare({ id: "s-412", debut: "2026-10-21T06:30:00+02:00", minutes: 345, km: 588, litres: 41.2, prix: 2.156, prixPerso: 2.161, depart: "Albi", arrivee: "Paris", enregistre: false }));
    await page.goto("/");
    await expect(page.locator(D("cout-trajet"))).toHaveText(/^89,03\s*€ essence$/);
  });
  test.describe("Happy Path", () => {
    test("V-4.4 — 3 personnes : 29,68 € chacun", async ({ page }) => {
      await page.locator(D("personnes-plus")).tap();
      await page.locator(D("personnes-plus")).tap();
      await expect(page.locator(D("part-personne"))).toHaveText("29,68 € chacun");
    });
  });
  test.describe("Edge Case", () => {
    test("V-4.4 — seul : « Seul : tout pour toi. », bornes 1 et 9", async ({ page }) => {
      await expect(page.locator(D("part-personne"))).toHaveText("Seul : tout pour toi.");
      await expect(page.locator(D("personnes-moins"))).toBeDisabled();
      for (let k = 0; k < 8; k++) await page.locator(D("personnes-plus")).tap();
      await expect(page.locator(D("personnes-apres"))).toHaveAttribute("data-personnes", "9");
      await expect(page.locator(D("personnes-plus"))).toBeDisabled();
    });
  });
});
