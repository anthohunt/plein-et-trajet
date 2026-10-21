import { test, expect, D, PTS, avecVoiture, demarrer, arreter, rejouer, lireIdb, ecrireIdb, trajetPrepare, moyenne, rest, virgule, nb, euros2, lignes, prixLigne } from "./_aides";

// ÉTAT PRÉPARÉ : deux trajets écrits en IndexedDB au format de l'appli.
test.describe("V-6.4 — Revoir, corriger, supprimer", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/historique");
    await page.locator('[data-screen="T6"]').waitFor();
    await ecrireIdb(page, [
      trajetPrepare({ id: "s-a", debut: "2026-10-18T10:00:00+02:00", minutes: 75, km: 92.4, litres: 6.01, prix: await moyenne("SP95-E10"), depart: "Albi", arrivee: "Rodez", personnes: 3 }),
      trajetPrepare({ id: "s-b", debut: "2026-10-19T18:00:00+02:00", minutes: 70, km: 76.8, litres: 4.84, prix: await moyenne("SP95-E10"), depart: "Toulouse", arrivee: "Albi" }),
    ]);
    await page.reload();
  });
  test.describe("Happy Path", () => {
    test("V-6.4 — carburant et personnes corrigés : gardés et montrés au retour", async ({ page }) => {
      const gaz = await moyenne("Gazole");
      await page.locator('li.hrow[data-trajet="s-b"] button').tap();
      await page.locator(`${D("carburant-apres")} [data-carburant="Gazole"]`).tap();
      await page.locator(D("personnes-plus")).tap();
      await page.locator(D("retour-historique")).tap();
      await expect(page.locator('li.hrow[data-trajet="s-b"] [data-el="cout-ligne"]')).toHaveText(`${virgule(euros2(4.84 * gaz), 2)} €`);
      await expect(page.locator('li.hrow[data-trajet="s-b"] [data-el="part-ligne"]')).toHaveText(` · ${virgule(euros2(euros2(4.84 * gaz) / 2), 2)} € chacun`);
    });
  });
  test.describe("Edge Case", () => {
    test("V-6.4 — « Supprimer ce trajet » : il disparaît de la liste et des totaux", async ({ page }) => {
      await page.locator('li.hrow[data-trajet="s-a"] button').tap();
      await page.locator(D("supprimer-trajet")).tap();
      await expect(page).toHaveURL(/\/historique$/);
      await expect(page.locator('li.hrow[data-trajet="s-a"]')).toHaveCount(0);
      await expect(page.locator(D("total-trajets"))).toHaveText("1");
      await expect(page.locator(D("total-km"))).toHaveText("77");
    });
  });
});
