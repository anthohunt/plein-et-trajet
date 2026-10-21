import { test, expect, D, PTS, avecVoiture, demarrer, arreter, direct, rejouer, lireIdb, moyenne, virgule, nb, euros2 } from "./_aides";

test.describe("V-2.2 — Vérifier et enregistrer", () => {
  test.describe("Happy Path", () => {
    test("V-2.2 — « Enregistrer ma voiture » : accueil avec cette voiture, gardée sur le téléphone", async ({ page }) => {
      await page.goto("/voiture");
      await page.locator("#d2").pressSequentially("5RBU0C");
      await page.locator(D("fiche-voiture")).waitFor({ timeout: 40_000 });
      await page.locator(D("enregistrer-voiture")).tap();
      await expect(page.locator(D("nom-voiture"))).toHaveText("Renault Clio");
      expect(JSON.parse((await page.evaluate(() => localStorage.getItem("pt-voiture-v1")))!).ve).toBe("5RBU0C");
      await page.reload();
      await expect(page.locator(D("detail-voiture"))).toHaveText("1.2 · 118 ch · 2017 · SP95-E10");
    });
  });
  test.describe("Edge Case", () => {
    test("V-2.2 — aucune version identifiée : bouton désactivé", async ({ page }) => {
      await page.goto("/voiture");
      await expect(page.locator(D("enregistrer-voiture"))).toBeDisabled();
      await page.locator("#d2").pressSequentially("5RB");
      await expect(page.locator(D("enregistrer-voiture"))).toBeDisabled();
    });
  });
});
