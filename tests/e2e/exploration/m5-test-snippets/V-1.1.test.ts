import { test, expect, D, PTS, avecVoiture, demarrer, arreter, direct, rejouer, lireIdb, moyenne, virgule, nb, euros2 } from "./_aides";

test.describe("V-1.1 — Ouvrir l'appli", () => {
  test.describe("Happy Path", () => {
    test("V-1.1 — voiture enregistrée : onglet Trajet sélectionné, voiture et « Démarrer », ni prix ni personnes", async ({ page, context }) => {
      await avecVoiture(context);
      await page.goto("/");
      await expect(page.locator('[role="tab"][aria-selected="true"]')).toHaveAttribute("data-el", "onglet-trajet");
      await expect(page.locator(D("nom-voiture"))).toHaveText("Renault Clio");
      await expect(page.locator(D("detail-voiture"))).toHaveText("1.2 · 118 ch · 2017 · SP95-E10");
      await expect(page.locator(D("bouton-demarrer"))).toHaveText("Démarrer");
      await expect(page.locator('[data-screen="T1"]')).not.toContainText(/€|Personnes/);
    });
  });
  test.describe("Edge Case", () => {
    test("V-1.1 — premier lancement : invitation, « Démarrer » ouvre Ma voiture", async ({ page }) => {
      await page.goto("/");
      await expect(page.locator(D("ma-voiture"))).toHaveAttribute("data-vide", "oui");
      await expect(page.locator('[data-screen="T1"]')).toContainText("Enregistre d'abord ta voiture");
      await page.locator(D("bouton-demarrer")).tap();
      await expect(page).toHaveURL(/\/voiture$/);
    });
    test("V-1.1 — trajet en cours : l'onglet Trajet ramène à En route", async ({ page, context }) => {
      await avecVoiture(context);
      await demarrer(page);
      await rejouer(context, page, PTS, 1, 60);
      await page.locator(D("onglet-historique")).tap();
      await page.locator(D("onglet-trajet")).tap();
      await expect(page).toHaveURL(/\/en-route$/);
      await expect(page.locator(D("etat-enregistrement"))).toHaveText("Enregistrement");
    });
  });
});
