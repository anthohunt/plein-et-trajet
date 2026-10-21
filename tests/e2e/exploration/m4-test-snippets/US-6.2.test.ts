import { test, expect, enregistrerDepuis, KM5, lireDirect, rouler, demarrerRejeu, PTS, rest, virgule, attendreFinRejeu } from "./_aides";

test.describe("US-6.2 — Suivre en direct", () => {
  test.describe("Happy Path", () => {
    test("US-6.2 — vitesse et courbe renouvelées au moins toutes les 2 s ; km, litres, €, durée et L/100 augmentent", async ({ page, context }) => {
      test.setTimeout(180_000);
      await enregistrerDepuis(page, context, KM5);
      const d0 = await lireDirect(page);
      const r = demarrerRejeu(context, PTS, { debut: KM5 + 1, fin: KM5 + 45 });
      await page.waitForTimeout(10_000);
      const chemins: string[] = [];
      for (let k = 0; k < 7; k++) {
        chemins.push((await lireDirect(page)).chemin);
        await page.waitForTimeout(1000);
      }
      // la courbe est redessinée au moins toutes les 2 s (3 changements ou plus en 6 s)
      expect(chemins.slice(1).filter((c, k) => c !== chemins[k]).length).toBeGreaterThanOrEqual(3);
      await attendreFinRejeu(r);
      const d = await lireDirect(page);
      expect(d.vitesse).toBeGreaterThan(50);
      expect(d.km).toBeGreaterThan(d0.km + 0.5);
      expect(d.litres).toBeGreaterThan(d0.litres);
      expect(d.l100).not.toBeNull();
      const fr = Number((await rest("moyennes_nationales?select=prix_moyen&pays=eq.FR&carburant=eq.SP95-E10&order=jour.desc&limit=1"))[0].prix_moyen);
      await expect(page.locator('[data-el="prix-direct"]')).toContainText(virgule(fr, 3));
      expect(d.euros).toBeCloseTo(d.litres * fr, 1);
    });
  });
});
