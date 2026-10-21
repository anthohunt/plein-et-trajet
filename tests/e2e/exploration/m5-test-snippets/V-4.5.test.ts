import { test, expect, D, PTS, PTS3, lireGpx, avecVoiture, demarrer, arreter, direct, rejouer, lireIdb, ecrireIdb, trajetPrepare, moyenne, virgule, nb, euros2 } from "./_aides";

test.describe("V-4.5 — Courbe de vitesse", () => {
  test.describe("Happy Path", () => {
    test("V-4.5 — courbe sur tout le trajet (≤ 600 points), moyenne sur le temps roulé, accélérations", async ({ page, context }) => {
      test.setTimeout(300_000); // tracé complet à un relevé toutes les 3 s (PTS3) : rejeu ~3 fois plus court qu'à 1 s (audit r2 LOW 2 / LOW 7)
      await avecVoiture(context);
      await demarrer(page);
      await rejouer(context, page, PTS3, 1, PTS3.length);
      await arreter(page);
      const c = page.locator(D("courbe-vitesse"));
      const n = Number(await c.getAttribute("data-points"));
      expect(n).toBeGreaterThan(50);
      expect(n).toBeLessThanOrEqual(600);
      const a = (await lireIdb(page)).arrete;
      expect(Math.abs(a.vitesse_moy - (a.km / a.duree_s) * 3600)).toBeLessThan(1);
      await expect(page.locator(D("info-vitesse"))).toHaveText(new RegExp(`^${a.vitesse_moy} km/h moy\\. · ${a.accelerations} accélérations?$`));
    });
  });
});
