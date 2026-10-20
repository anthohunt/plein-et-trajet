import { test, expect, connecterAdmin, etatFocus } from "./_aides";

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
  test.describe("Edge Case", () => {
    test("US-A11Y-001 — Maj+Tab revient au contrôle précédent", async ({ page }) => {
      await connecterAdmin(page);
      await expect(page.locator('[data-el="moteur"]')).toHaveCount(6, { timeout: 20000 });
      await page.keyboard.press("Tab");
      await page.keyboard.press("Tab");
      const a = await etatFocus(page);
      await page.keyboard.press("Shift+Tab");
      expect((await etatFocus(page)).id).not.toBe(a.id);
    });
  });
});
