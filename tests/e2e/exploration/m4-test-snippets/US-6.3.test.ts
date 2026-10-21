import { test, expect, enregistrerDepuis, KM5, lireDirect, rouler, demarrerRejeu, PTS, S6 } from "./_aides";

test.describe("US-6.3 — Garder l'écran allumé", () => {
  test.describe("Happy Path", () => {
    test("US-6.3 — le verrou d'écran du navigateur est pris et reste actif sans toucher l'écran", async ({ page, context }) => {
      test.setTimeout(120_000);
      await enregistrerDepuis(page, context, KM5);
      await page.waitForTimeout(20_000);
      expect((await lireDirect(page)).verrou).toBe("actif");
      await expect(page.locator('[data-el="ecran-allume"]')).toContainText("L'écran reste allumé pendant l'enregistrement");
    });
    test("US-6.3 — plus de 15 s sans position : « GPS perdu », distance figée ; le retour du signal relance la distance", async ({ page, context }) => {
      test.setTimeout(150_000);
      await enregistrerDepuis(page, context, KM5);
      const r = demarrerRejeu(context, PTS, { debut: KM5 + 1, fin: KM5 + 60 });
      await page.waitForTimeout(10_000);
      r.couper();
      await page.waitForTimeout(1500);
      const coupe = await lireDirect(page);
      await expect(page.locator('[data-el="gps-perdu"]')).toBeVisible({ timeout: 20_000 });
      await expect(page.locator('[data-el="gps-perdu"]')).toContainText("GPS perdu");
      expect((await lireDirect(page)).km).toBe(coupe.km);
      await expect(S6(page)).toHaveAttribute("data-etat", "gps-perdu");
      r.retablir();
      await expect(page.locator('[data-el="gps-perdu"]')).toHaveCount(0, { timeout: 10_000 });
      await page.waitForTimeout(4000);
      expect((await lireDirect(page)).km).toBeGreaterThan(coupe.km);
      r.arreter();
    });
  });
  test.describe("Edge Case", () => {
    test("US-6.3 — sans permission de verrou d'écran, le repli est dit à l'écran", async ({ page, context }) => {
      test.setTimeout(90_000);
      // pas d'accorderVerrouEcran : Chromium piloté refuse la permission « screen-wake-lock »
      const { ouvrirTrajets, choisirVoiture, lancerEnregistrement, position } = await import("./_aides");
      await context.setGeolocation(position(KM5));
      await ouvrirTrajets(page);
      await choisirVoiture(page);
      await lancerEnregistrement(page);
      await expect(page.locator('[data-el="ecran-allume"]')).toHaveAttribute("data-verrou", "indisponible", { timeout: 10_000 });
      await expect(page.locator('[data-el="ecran-allume"]')).toContainText("Ce navigateur ne peut pas garder l'écran allumé");
    });
  });
});
