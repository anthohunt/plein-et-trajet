import { test, expect, D, PTS, lireGpx, avecVoiture, demarrer, arreter, direct, rejouer, lireIdb, ecrireIdb, trajetPrepare, moyenne, virgule, nb, euros2 } from "./_aides";

test.describe("V-4.5 — Courbe de vitesse", () => {
  test.describe("Happy Path", () => {
    test("V-4.5 — courbe sur tout le trajet (≤ 600 points), moyenne sur le temps roulé, accélérations", async ({ page, context }) => {
      test.setTimeout(420_000); // 4 300 positions rejouées : 180 s dépassées sous lourd (passe unique du round 2, auditeur lot 2 LOW 13)
      await avecVoiture(context);
      await demarrer(page);
      await rejouer(context, page, PTS, 1, PTS.length);
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
