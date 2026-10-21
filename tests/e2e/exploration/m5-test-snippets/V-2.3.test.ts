import { test, expect, D, PTS, avecVoiture, demarrer, arreter, direct, rejouer, lireIdb, moyenne, virgule, nb, euros2 } from "./_aides";

test.describe("V-2.3 — Chercher sans la carte grise", () => {
  test.describe("Happy Path", () => {
    test("V-2.3 — « clio 2017 120 » : Clio 2017 entre 115 et 125 ch, avec année, kW et carburant ; la toucher affiche la fiche", async ({ page }) => {
      await page.goto("/voiture");
      await page.locator("#q").pressSequentially("clio 2017 120");
      const b = page.locator(`${D("suggestions-voiture")} button`);
      await expect(b.first()).toBeVisible({ timeout: 60_000 });
      for (const t of await b.allInnerTexts()) {
        expect(t).toMatch(/clio/i);
        expect(t).toMatch(/2017 ·/);
        const ch = nb(t.match(/· ([\d,]+) kW/)![1]) / 0.7355;
        expect(ch).toBeGreaterThanOrEqual(115);
        expect(ch).toBeLessThanOrEqual(125.5);
        expect(t).toMatch(/SP95-E10|Gazole|SP98|SP95|E85|GPLc/);
      }
      await b.first().tap();
      await expect(page.locator(D("fiche-voiture"))).toBeVisible();
      await expect(page.locator(D("enregistrer-voiture"))).toBeEnabled();
    });
  });
});
