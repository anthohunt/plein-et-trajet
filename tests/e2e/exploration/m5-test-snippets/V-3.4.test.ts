import { test, expect, D, PTS, avecVoiture, demarrer, arreter, direct, rejouer, lireIdb, moyenne, virgule, nb, euros2 } from "./_aides";

test.describe("V-3.4 — Mettre en pause", () => {
  test.describe("Happy Path", () => {
    test("V-3.4 — Pause : « En pause », km et litres figés, « Reprendre »", async ({ page, context }) => {
      await avecVoiture(context);
      await demarrer(page);
      await rejouer(context, page, PTS, 1, 1000);
      await page.locator(D("bouton-pause")).tap();
      const a = await direct(page);
      for (let i = 1000; i < 1020; i++) {
        await page.clock.runFor(1000);
        await context.setGeolocation({ latitude: PTS[i].lat, longitude: PTS[i].lon });
      }
      const b = await direct(page);
      await expect(page.locator(D("etat-enregistrement"))).toHaveText("En pause");
      await expect(page.locator(D("bouton-pause"))).toHaveText("Reprendre");
      expect([b.km, b.litres]).toEqual([a.km, a.litres]);
    });
  });
  test.describe("Edge Case", () => {
    test("V-3.4 — 2 km parcourus pendant la pause ne sont ni comptés ni chiffrés", async ({ page, context }) => {
      await avecVoiture(context);
      await demarrer(page);
      await rejouer(context, page, PTS, 1, 1750);
      await page.locator(D("bouton-pause")).tap();
      const a = await direct(page);
      for (let i = 1750; i <= 1821; i++) { await page.clock.runFor(1000); await context.setGeolocation({ latitude: PTS[i].lat, longitude: PTS[i].lon }); }
      await page.locator(D("bouton-pause")).tap();
      await rejouer(context, page, PTS, 1822, 1882);
      const b = await direct(page);
      expect(b.km - a.km).toBeGreaterThan(1.5); // ≈ 1,7 km roulés depuis la reprise (GPX)
      expect(b.km - a.km).toBeLessThan(1.9); // et pas les 2,07 km de la pause en plus
    });
  });
});
