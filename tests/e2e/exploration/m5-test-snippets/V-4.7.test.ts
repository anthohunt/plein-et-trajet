import { test, expect, D, PTS, lireGpx, avecVoiture, demarrer, arreter, direct, rejouer, lireIdb, ecrireIdb, trajetPrepare, moyenne, virgule, nb, euros2 } from "./_aides";

test.describe("V-4.7 — Enregistrer ou supprimer", () => {
  test.describe("Happy Path", () => {
    test("V-4.7 — « Enregistrer » : Historique avec ce trajet en tête, prix, carburant et personnes gardés", async ({ page, context }) => {
      await avecVoiture(context);
      await demarrer(page);
      await rejouer(context, page, PTS, 1, 600);
      await arreter(page);
      const id = await page.locator('[data-screen="T4"]').getAttribute("data-trajet");
      await page.locator(`${D("carburant-apres")} [data-carburant="Gazole"]`).tap();
      await page.locator(D("personnes-plus")).tap();
      await page.locator(D("enregistrer-trajet")).tap();
      await expect(page).toHaveURL(/\/historique$/);
      await expect(page.locator("li.hrow").first()).toHaveAttribute("data-trajet", id!);
      const t = (await lireIdb(page)).trajets.find((x: any) => x.id === id);
      expect([t.carburant, t.personnes, t.enregistre]).toEqual(["Gazole", 2, true]);
    });
  });
  test.describe("Edge Case", () => {
    test("V-4.7 — « Supprimer » : accueil, rien dans l'historique ni sur le téléphone", async ({ page, context }) => {
      await avecVoiture(context);
      await demarrer(page);
      await rejouer(context, page, PTS, 1, 600);
      await arreter(page);
      await page.locator(D("supprimer-neuf")).tap();
      await expect(page.locator('[data-screen="T1"]')).toBeVisible();
      const idb = await lireIdb(page);
      expect([idb.trajets.length, idb.arrete, idb.enregistrement]).toEqual([0, null, null]);
    });
    test("V-4.7 — appli fermée avant de choisir : la fin revient avec les deux boutons", async ({ page, context }) => {
      await avecVoiture(context);
      await demarrer(page);
      await rejouer(context, page, PTS, 1, 600);
      await arreter(page);
      const id = await page.locator('[data-screen="T4"]').getAttribute("data-trajet");
      const p2 = await context.newPage();
      await page.close();
      await p2.goto("/");
      await expect(p2).toHaveURL(/\/fin$/);
      await expect(p2.locator('[data-screen="T4"]')).toHaveAttribute("data-trajet", id!);
      await expect(p2.locator(D("enregistrer-ou-supprimer"))).toContainText("Supprimer");
      await expect(p2.locator(D("enregistrer-ou-supprimer"))).toContainText("Enregistrer");
    });
  });
});
