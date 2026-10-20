import { test, expect, connecterAdmin, etatFocus, ouvrirTrajets, formulaire, ALBI_, CASTRES, calculer } from "./_aides";

test.describe("US-A11Y-001 — Navigation au clavier (jalon 3)", () => {
  test.describe("Happy Path", () => {
    test("US-A11Y-001 — écran Moteurs : Tab parcourt tous les contrôles dans l'ordre de lecture, contour visible", async ({ page }) => {
      await connecterAdmin(page);
      await expect(page.locator('[data-el="moteur"]')).toHaveCount(6, { timeout: 20000 });
      await page.locator("body").click({ position: { x: 5, y: 5 } });
      const ordre: any[] = [];
      for (let i = 0; i < 40; i++) {
        await page.keyboard.press("Tab");
        const e = await etatFocus(page);
        ordre.push(e);
        if (e.id.startsWith("onglet")) break;
      }
      expect(ordre.length).toBeGreaterThan(15);
      expect(ordre.every((e) => e.contour && e.nom)).toBe(true);
      const i = (id: string) => ordre.findIndex((e) => e.id === id);
      expect(i("mot-prix-f")).toBeLessThan(i("mot-itineraire-f"));
      expect(i("mot-itineraire-f")).toBeLessThan(i("mot-peages-f"));
      expect(i("mot-peages-f")).toBeLessThan(i("mot-lieux-f"));
    });
  });
  test.describe("Happy Path (S1, S3, S4)", () => {
    async function tab(page: import("@playwright/test").Page, max = 60) {
      await page.locator("body").click({ position: { x: 5, y: 5 } });
      const o: any[] = [];
      for (let i = 0; i < max; i++) {
        await page.keyboard.press("Tab");
        const e = await etatFocus(page);
        o.push(e);
        if (e.id.startsWith("onglet")) break;
      }
      return o;
    }
    test("US-A11Y-001 — S3 Trajets : départ, arrivée, voiture, calcul dans l'ordre de lecture, contour visible", async ({ page }) => {
      await ouvrirTrajets(page);
      const o = await tab(page);
      expect(o.every((e) => e.contour && e.nom)).toBe(true);
      const i = (id: string) => o.findIndex((e) => e.id === id);
      expect(i("dep")).toBeLessThan(i("arr"));
      expect(i("arr")).toBeLessThan(i("voiture-marque"));
      expect(i("voiture-marque")).toBeLessThan(i("bouton-calculer"));
    });
    test("US-A11Y-001 — S4 Résultat : retour, prix perso, tronçons atteints avec contour visible", async ({ page }) => {
      await formulaire(page, ALBI_, CASTRES);
      await calculer(page);
      const o = await tab(page);
      expect(o.every((e) => e.contour && e.nom)).toBe(true);
      expect(o.findIndex((e) => e.id === "troncon-0")).toBeGreaterThan(0);
    });
    test("US-A11Y-001 — S1 Prix : tous les contrôles ont un contour visible", async ({ page }) => {
      await page.goto("/");
      await expect(page.locator('[data-el="ligne-station"]').first()).toBeVisible({ timeout: 20000 });
      const o = await tab(page);
      expect(o.every((e) => e.contour && e.nom)).toBe(true);
    });
  });
  test.describe("Edge Case", () => {
    test("US-A11Y-001 — Maj+Tab revient au contrôle précédent", async ({ page }) => {
      await connecterAdmin(page);
      await expect(page.locator('[data-el="moteur"]')).toHaveCount(6, { timeout: 20000 });
      await page.keyboard.press("Tab");
      await page.keyboard.press("Tab");
      const a = await etatFocus(page);
      await page.keyboard.press("Shift+Tab");
      expect((await etatFocus(page)).i).not.toBe(a.i);
    });
  });
});
