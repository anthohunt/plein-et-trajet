import { test, expect, D, PTS, lireGpx, avecVoiture, demarrer, arreter, direct, rejouer, lireIdb, ecrireIdb, trajetPrepare, moyenne, virgule, nb, euros2 } from "./_aides";

const IMM = lireGpx("albi-toulouse-immobile-11min.gpx"); // tracé dérivé : 775 points roulés puis 11 min sur place (±2 m)

async function jusquaAlerte(page: any, context: any) {
  await avecVoiture(context);
  await context.setGeolocation({ latitude: IMM[0].lat, longitude: IMM[0].lon });
  await demarrer(page);
  let tImm = 0;
  await rejouer(context, page, IMM, 1, 774, async (k: number) => { if (k === 773) tImm = await page.evaluate(() => Date.now()); });
  await rejouer(context, page, IMM, 774, 1365);
  for (let k = 1365; k < IMM.length && (await page.locator('[data-screen="T3"]').getAttribute("data-etat")) !== "immobile"; k++) {
    await page.clock.runFor(1000);
    await context.setGeolocation({ latitude: IMM[k].lat, longitude: IMM[k].lon });
    await page.clock.runFor(10);
  }
  return tImm;
}
test.describe("V-3.E1 — Oubli d'arrêter", () => {
  test.describe("Edge Case", () => {
    test("V-3.E1 — 10 min sous 3 km/h dans 50 m : alerte, puis « C'est fini » date l'arrivée du début de l'immobilité", async ({ page, context }) => {
      test.setTimeout(120_000);
      const tImm = await jusquaAlerte(page, context);
      await expect(page.locator(D("alerte-immobile"))).toContainText("Trajet arrêté : immobile depuis 10 min.");
      await expect(page.locator(D("immobile-reprendre"))).toHaveText("Reprendre");
      await expect(page.locator(D("immobile-fini"))).toHaveText("C'est fini");
      await page.locator(D("immobile-fini")).tap();
      await expect(page).toHaveURL(/\/fin$/);
      const a = (await lireIdb(page)).arrete;
      expect(Math.abs(a.fin - tImm)).toBeLessThanOrEqual(2000);
      await expect(page.locator(D("sous-titre-trajet"))).toContainText("· 12 min ·");
    });
    test("V-3.E1 — « Reprendre » : l'enregistrement repart sans perdre les points d'avant", async ({ page, context }) => {
      test.setTimeout(120_000);
      await jusquaAlerte(page, context);
      const n = (await direct(page)).points;
      await page.locator(D("immobile-reprendre")).tap();
      await expect(page.locator('[data-screen="T3"]')).toHaveAttribute("data-etat", "enregistrement");
      expect((await direct(page)).points).toBe(n);
      await rejouer(context, page, IMM, IMM.length - 10, IMM.length);
      expect((await direct(page)).points).toBeGreaterThan(n);
    });
  });
});
