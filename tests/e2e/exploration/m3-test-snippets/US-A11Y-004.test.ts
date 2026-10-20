import { test, expect, BARCELONE, connecterAdmin } from "./_aides";

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
