import { test, expect, D, PTS, lireGpx, avecVoiture, demarrer, arreter, direct, rejouer, lireIdb, ecrireIdb, trajetPrepare, moyenne, virgule, nb, euros2 } from "./_aides";

const TUN = lireGpx("albi-toulouse-tunnel-90s.gpx"); // tracé dérivé : 90 s sans position sur 3 km (A68)

test.describe("V-3.E2 — GPS perdu", () => {
  test.describe("Edge Case", () => {
    test("V-3.E2 — 15 s sans position : « GPS perdu » ; au retour, les 3 km sont ajoutés et le message disparaît", async ({ page, context }) => {
      await avecVoiture(context);
      await context.setGeolocation({ latitude: TUN[0].lat, longitude: TUN[0].lon });
      await demarrer(page);
      const g = TUN.findIndex((x: any, k: number) => k > 0 && x.t - TUN[k - 1].t > 15_000);
      await rejouer(context, page, TUN, 1, g);
      await page.clock.runFor(16_000);
      await expect(page.locator(D("gps-perdu"))).toHaveText("GPS perdu (tunnel) · la distance est complétée à la sortie.");
      await page.clock.runFor(TUN[g].t - TUN[g - 1].t - 17_000);
      const avant = (await direct(page)).km;
      await rejouer(context, page, TUN, g, g + 1);
      const ajout = (await direct(page)).km - avant;
      expect(ajout).toBeGreaterThanOrEqual(2.9);
      expect(ajout).toBeLessThanOrEqual(3.1);
      await expect(page.locator(D("gps-perdu"))).toHaveCount(0);
    });
  });
});
