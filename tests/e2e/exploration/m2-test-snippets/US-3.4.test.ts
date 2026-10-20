import { test, expect, ouvrirTrajets, choisirDansListe, choisirVoiture, dbPreference, rest } from "./_aides";

test.describe("US-3.4 — Choisir ma voiture", () => {
  test.describe("Happy Path", () => {
    test("US-3.4 — Peugeot → 208 → motorisation : enregistrée dans `preferences`, carburant affiché, pré-remplie après rechargement", async ({ page }) => {
      await ouvrirTrajets(page);
      await expect(page.locator("#voiture-marque .dd-txt")).toHaveText("Marque");
      expect(await dbPreference(page)).toBeNull();
      await choisirVoiture(page, "Peugeot", "208", "208 (101ch) · mécanique");
      const p = await dbPreference(page);
      expect(p).toMatchObject({ marque: "Peugeot", modele: "208", carburant: "SP95-E10" });
      const v = (await rest(`vehicules?select=masse_kg,carburant,motorisation&id=eq.${p.vehicule_id}`))[0];
      expect(v.motorisation).toBe("208 (101ch) · mécanique");
      await expect(page.locator('[data-el="voiture-info"]')).toHaveText(`SP95-E10 · ${v.masse_kg} kg`);
      await page.reload();
      await ouvrirTrajets(page);
      await expect(page.locator("#voiture-moteur .dd-txt")).toHaveText("208 (101ch) · mécanique");
      await expect(page.locator("#voiture-marque .dd-txt")).toHaveText("Peugeot");
    });
  });
  test.describe("Edge Case", () => {
    test("US-3.4 — modèle et motorisation restent inaccessibles tant que le niveau précédent n'est pas choisi ; le choix partiel est mémorisé", async ({ page }) => {
      await ouvrirTrajets(page);
      await expect(page.locator("#voiture-modele")).toBeDisabled();
      await expect(page.locator("#voiture-moteur")).toBeDisabled();
      await choisirDansListe(page, "voiture-marque", "Marque", "Dacia");
      await expect(page.locator("#voiture-modele")).toBeEnabled();
      await expect(page.locator("#voiture-moteur")).toBeDisabled();
      await expect.poll(async () => (await dbPreference(page))?.marque).toBe("Dacia");
    });
    test("US-3.4 — un diesel donne le carburant Gazole", async ({ page }) => {
      await ouvrirTrajets(page);
      await choisirVoiture(page, "Peugeot", "208", "208 (102ch) · mécanique");
      await expect(page.locator('[data-el="voiture-info"]')).toContainText("Gazole");
    });
  });
});
