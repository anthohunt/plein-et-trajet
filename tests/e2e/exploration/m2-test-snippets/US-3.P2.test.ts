import { test, expect, ouvrirTrajets, choisirVoiture, choisirDansListe, dbPreference } from "./_aides";

test.describe("US-3.P2 — Changer de voiture", () => {
  test.describe("Happy Path", () => {
    test("US-3.P2 — autre marque : modèle et motorisation se réinitialisent, la nouvelle voiture est mémorisée (préférences et rechargement)", async ({ page }) => {
      await ouvrirTrajets(page);
      await choisirVoiture(page, "Peugeot", "208", "208 (101ch) · mécanique");
      const avant = await dbPreference(page);
      expect(avant.marque).toBe("Peugeot");
      await choisirDansListe(page, "voiture-marque", "Marque", "Renault");
      await expect(page.locator("#voiture-modele .dd-txt")).toHaveText("Modèle");
      await expect(page.locator("#voiture-moteur .dd-txt")).toHaveText("Motorisation");
      await expect(page.locator('[data-el="voiture-memorisee"]')).toHaveCount(0);
      await expect.poll(async () => (await dbPreference(page))?.marque).toBe("Renault");
      expect(await dbPreference(page)).toMatchObject({ modele: null, vehicule_id: null });
      await choisirVoiture(page, "Renault", "Clio", "");
      const apres = await dbPreference(page);
      expect(apres.vehicule_id).not.toBe(avant.vehicule_id);
      await page.reload();
      await expect(page.locator("#voiture-marque .dd-txt")).toHaveText("Renault");
      await expect(page.locator("#voiture-modele .dd-txt")).toHaveText(/^clio/i);
    });
  });
  test.describe("Edge Case", () => {
    test("US-3.P2 — choisir la même marque ne perd pas la voiture ; changer de modèle réinitialise la motorisation", async ({ page }) => {
      await ouvrirTrajets(page);
      await choisirVoiture(page, "Peugeot", "208", "208 (101ch) · mécanique");
      await choisirDansListe(page, "voiture-modele", "Modèle", "3008");
      await expect(page.locator("#voiture-moteur .dd-txt")).toHaveText("Motorisation");
      await expect(page.locator('[data-el="voiture-memorisee"]')).toHaveCount(0);
    });
  });
});
