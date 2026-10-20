import { test, expect, BARCELONE, connecterAdmin, ouvrirTrajets, formulaire, ALBI_, BARCELONE_, calculer } from "./_aides";

test.describe("US-A11Y-004 — Libellés lisibles (jalon 3)", () => {
  test.describe("Happy Path", () => {
    test.use({ geolocation: BARCELONE });
    test("US-A11Y-004 — pastilles et prix des stations espagnoles annoncés en euros", async ({ page }) => {
      await page.goto("/");
      await expect(page.locator('[data-el="pastille-station"]').first()).toBeVisible({ timeout: 20000 });
      const pastilles = await page.locator('[data-el="pastille-station"]').evaluateAll((els) => els.map((e) => e.getAttribute("aria-label") ?? ""));
      expect(pastilles.length).toBeGreaterThan(5);
      expect(pastilles.every((p) => /, \d,\d{3} euros le litre, (moins cher|plus cher)$/.test(p))).toBe(true);
      const prix = await page.locator('[data-el="ligne-station"] .totem').evaluateAll((els) => els.map((e) => e.getAttribute("aria-label") ?? ""));
      expect(prix.every((p) => /euros le litre/.test(p))).toBe(true);
    });
  });
  test.describe("Happy Path (S3, S4)", () => {
    test("US-A11Y-004 — S3 : chaque champ et bouton a un nom, l'inversion est nommée", async ({ page }) => {
      await ouvrirTrajets(page);
      const sansNom = await page.evaluate(() => [...document.querySelectorAll("[data-screen='S3'] button, [data-screen='S3'] select, [data-screen='S3'] input")].filter((e: any) => !(e.getAttribute("aria-label") || e.labels?.[0]?.textContent?.trim() || e.textContent?.trim())).length);
      expect(sansNom).toBe(0);
      await expect(page.locator('[data-el="inverser"]')).toHaveAttribute("aria-label", "Inverser les deux lieux");
    });
    test("US-A11Y-004 — S4 : tronçons « nom, km, litres », plaques de prix en euros, retour nommé (trajet Europe)", async ({ page }) => {
      await formulaire(page, ALBI_, BARCELONE_);
      await calculer(page);
      const troncons = await page.locator('[data-el="troncons"] button').evaluateAll((els) => els.map((e) => e.getAttribute("aria-label") ?? ""));
      expect(troncons.length).toBeGreaterThan(5);
      expect(troncons.every((l) => /, \d+,\d km, \d+,\d litres$/.test(l))).toBe(true);
      const plaques = await page.locator("[data-screen='S4'] .totem").evaluateAll((els) => els.map((e) => e.getAttribute("aria-label") ?? ""));
      expect(plaques.length).toBeGreaterThan(0);
      expect(plaques.every((l) => /euros/.test(l))).toBe(true);
      await expect(page.locator('[data-el="retour-trajets"]')).toHaveAttribute("aria-label", "Retour aux trajets");
    });
  });
  test.describe("Edge Case", () => {
    test("US-A11Y-004 — écran Moteurs : chaque contrôle a un nom, le bouton ⚙ est nommé", async ({ page }) => {
      await connecterAdmin(page);
      await expect(page.locator('[data-el="moteur"]')).toHaveCount(6, { timeout: 20000 });
      const sansNom = await page.evaluate(() => [...document.querySelectorAll("button, select, input")].filter((e: any) => !(e.getAttribute("aria-label") || e.labels?.[0]?.textContent?.trim() || e.textContent?.trim())).length);
      expect(sansNom).toBe(0);
      await expect(page.locator('[data-el="bouton-moteurs"]')).toHaveAttribute("aria-label", "Moteurs (administration)");
    });
  });
});
