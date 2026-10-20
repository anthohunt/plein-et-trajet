import { test, expect, ouvrirTrajets, saisirLieu, champ, compterCalculs, choisirVoiture, rest, session } from "./_aides";

test.describe("US-3.E2 — Formulaire incomplet", () => {
  test.describe("Edge Case", () => {
    test("US-3.E2 — sans voiture (identité neuve) : « Choisis ta voiture », aucun calcul ; choisir une voiture lève le message", async ({ page }) => {
      const calculs = compterCalculs(page);
      await ouvrirTrajets(page);
      expect(await rest("preferences?select=vehicule_id", (await session(page)).jeton)).toEqual([]);
      await saisirLieu(page, "depart", "Albi", "Albi");
      await saisirLieu(page, "arrivee", "Bord", "Bordeaux");
      await page.locator("#bouton-calculer").click();
      await expect(page.locator('[data-el="voiture-erreur"]')).toHaveText("Choisis ta voiture");
      await expect(page.locator("#voiture-marque")).toHaveAttribute("aria-invalid", "true");
      await expect(page.locator("#voiture-marque")).toBeFocused();
      await page.waitForTimeout(1200);
      expect(calculs.n).toBe(0);
      await choisirVoiture(page, "Dacia", "Sandero", "Sandero");
      await expect(page.locator('[data-el="voiture-erreur"]')).toHaveCount(0);
    });
    test("US-3.E2 — départ vide : « Saisis un lieu » ; formulaire entièrement vide : trois signalements", async ({ page }) => {
      const calculs = compterCalculs(page);
      await ouvrirTrajets(page);
      await page.locator("#bouton-calculer").click();
      await expect(page.locator('[data-el="champ-depart-erreur"]')).toHaveText("Saisis un lieu");
      await expect(page.locator('[data-el="champ-arrivee-erreur"]')).toHaveText("Saisis un lieu");
      await expect(page.locator('[data-el="voiture-erreur"]')).toHaveText("Choisis ta voiture");
      expect(calculs.n).toBe(0);
    });
  });
});
