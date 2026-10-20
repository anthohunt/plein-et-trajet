import { test, expect, ouvrirTrajets, saisirLieu, choisirVoiture, champ, compterCalculs, rest } from "./_aides";

test.describe("US-3.E1 — Lieu introuvable", () => {
  test.describe("Edge Case", () => {
    test("US-3.E1 — « zzzz » (géocodeur IGN réel, sans mock) : « Lieu introuvable », aucun calcul lancé ; corriger efface le message", async ({ page }) => {
      const brut = await (await fetch("https://data.geopf.fr/geocodage/search?q=zzzz&limit=3&index=address")).json();
      expect(brut.features).toEqual([]);
      const calculs = compterCalculs(page);
      await ouvrirTrajets(page);
      await saisirLieu(page, "depart", "Albi", "Albi");
      await champ(page, "arrivee").pressSequentially("zzzz", { delay: 40 });
      await choisirVoiture(page);
      await page.locator("#bouton-calculer").click();
      await expect(page.locator('[data-el="champ-arrivee-erreur"]')).toHaveText("Lieu introuvable");
      await expect(champ(page, "arrivee")).toHaveAttribute("aria-invalid", "true");
      await expect(champ(page, "arrivee")).toBeFocused();
      await page.waitForTimeout(1500);
      expect(calculs.n).toBe(0);
      await expect(page.locator('[data-screen="S3"]')).toBeVisible();
      await saisirLieu(page, "arrivee", "Toul", "Toulouse");
      await expect(page.locator('[data-el="champ-arrivee-erreur"]')).toHaveCount(0);
    });
    test("US-3.E1 — départ ET arrivée inconnus : les deux champs sont signalés", async ({ page }) => {
      const calculs = compterCalculs(page);
      await ouvrirTrajets(page);
      await champ(page, "depart").fill("qqqqqq");
      await champ(page, "arrivee").fill("zzzz");
      await choisirVoiture(page);
      await page.locator("#bouton-calculer").click();
      await expect(page.locator('[data-el="champ-depart-erreur"]')).toHaveText("Lieu introuvable");
      await expect(page.locator('[data-el="champ-arrivee-erreur"]')).toHaveText("Lieu introuvable");
      expect(calculs.n).toBe(0);
    });
  });
});
