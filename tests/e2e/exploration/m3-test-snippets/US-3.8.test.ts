import { test, expect, formulaire, ALBI_, BARCELONE_, calculer, lireResultat, lignesListe, ouvrirTrajets, champ, propositions, choisirLieu, choisirVoiture, saisirLieu, S4, URL_APP } from "./_aides";

test.describe("US-3.8 — Partir à l'étranger", () => {
  test.describe("Happy Path", () => {
    test("US-3.8 — « Barce » propose Barcelone (Espagne) ; le calcul traverse la France puis l'Espagne", async ({ page }) => {
      await ouvrirTrajets(page);
      await saisirLieu(page, "depart", "Albi", "Albi");
      await champ(page, "arrivee").pressSequentially("Barce", { delay: 40 });
      const o = propositions(page, "arrivee").filter({ hasText: "Barcelone" }).first();
      await expect(o).toBeVisible({ timeout: 20000 });
      await expect(o).toContainText("Espagne");
      await o.click();
      await choisirVoiture(page);
      await calculer(page);
      expect((await lignesListe(page, "pays-traverses")).map((l: any) => l.pays)).toEqual(["FR", "ES"]);
      const r = await lireResultat(page);
      expect(r.km).toBeGreaterThan(440);
      expect(r.km).toBeLessThan(500);
      expect(r.route).toMatch(/ALBI.*BARCELONE/i);
    });
  });
  test.describe("Edge Case", () => {
    test("US-3.8 — un texte absurde reste « Lieu introuvable » (le géocodeur étranger tolérant ne l'emporte pas)", async ({ page }) => {
      await ouvrirTrajets(page);
      await saisirLieu(page, "depart", "Albi", "Albi");
      await champ(page, "arrivee").fill("zzzz");
      await choisirVoiture(page);
      await page.locator("#bouton-calculer").click();
      await expect(champ(page, "arrivee-ligne").or(page.locator('[data-el="champ-arrivee-erreur"]'))).toBeVisible();
      await expect(page.locator('[data-el="champ-arrivee-erreur"]')).toHaveText("Lieu introuvable");
      await expect(page.locator('[data-screen="S4"]')).toHaveCount(0);
    });
    test("US-3.8 — Albi → Rome (1 338 km, tracé découpé pour Valhalla) aboutit : France puis Italie", async ({ page }) => {
      await formulaire(page, ALBI_, ["Rome", "Rome", "Italie"]);
      await calculer(page);
      expect((await lignesListe(page, "pays-traverses")).map((l: any) => l.pays)).toEqual(["FR", "IT"]);
      expect((await lireResultat(page)).km).toBeGreaterThan(1300);
    });
    test("US-3.8 — Albi → Lisbonne (1 343 km) aboutit : France, Espagne, Portugal", async ({ page }) => {
      await formulaire(page, ALBI_, ["Lisb", "Lisbonne", "Portugal"]);
      await calculer(page);
      expect((await lignesListe(page, "pays-traverses")).map((l: any) => l.pays)).toEqual(["FR", "ES", "PT"]);
    });
  });
});
