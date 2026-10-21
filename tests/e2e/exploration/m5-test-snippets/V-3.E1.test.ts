import { test, expect, D, PTS, lireGpx, avecVoiture, demarrer, arreter, direct, rejouer, lireIdb, ecrireIdb, trajetPrepare, moyenne, virgule, nb, euros2 } from "./_aides";

const IMM = lireGpx("albi-toulouse-immobile-11min.gpx"); // tracé dérivé : 775 points roulés puis 11 min sur place (±2 m)

async function jusquaAlerte(page: any, context: any) {
  await avecVoiture(context);
  await context.setGeolocation({ latitude: IMM[0].lat, longitude: IMM[0].lon });
  await demarrer(page);
  let tImm = 0;
  await rejouer(context, page, IMM, 1, 774, async (k: number) => { if (k === 773) tImm = await page.evaluate(() => Date.now()); });
  const a = await direct(page);
  const vitesses: number[] = [];
  await rejouer(context, page, IMM, 774, 1365, async (k: number) => { if (k % 50 === 0) vitesses.push(Number(await page.locator(D("vitesse")).getAttribute("data-kmh"))); });
  const b = await direct(page);
  // round 2 (audit lot 1, MEDIUM 3) : garé à ±2 m pendant 10 min, ni km ni litres de plus, 0 km/h
  expect([b.km, b.litres]).toEqual([a.km, a.litres]);
  expect(vitesses.every((v) => v === 0)).toBe(true);
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
      test.setTimeout(300_000); // 1 400 positions rejouées (LOW 13 lot 1)
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
      test.setTimeout(300_000); // 1 400 positions rejouées (LOW 13 lot 1)
      await jusquaAlerte(page, context);
      const n = (await direct(page)).points;
      await page.locator(D("immobile-reprendre")).tap();
      await expect(page.locator('[data-screen="T3"]')).toHaveAttribute("data-etat", "enregistrement");
      expect((await direct(page)).points).toBe(n);
      const avant = await direct(page);
      await rejouer(context, page, IMM, IMM.length - 10, IMM.length);
      const apres = await direct(page);
      expect(apres.points).toBeGreaterThan(n);
      // toujours garé : 0 km/h, ni km ni litres de plus (r1 : 10 km/h, +0,1 km)
      await expect(page.locator(D("vitesse"))).toHaveAttribute("data-kmh", "0");
      expect([apres.km, apres.litres]).toEqual([avant.km, avant.litres]);
    });
  });
});
