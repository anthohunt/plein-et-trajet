import { test, expect, D, PTS, avecVoiture, demarrer, arreter, rejouer, lireIdb, ecrireIdb, trajetPrepare, moyenne, rest, virgule, nb, euros2, lignes, prixLigne } from "./_aides";

test.describe("V-5.3 — Rechercher dans cette zone", () => {
  test.describe("Happy Path", () => {
    test("V-5.3 — glisser vers Montauban : bouton, liste inchangée ; le toucher charge la zone et le bouton disparaît", async ({ page, context }) => {
      await avecVoiture(context);
      await page.goto("/stations");
      await expect(lignes(page).first()).toBeVisible({ timeout: 30_000 });
      const avant = await lignes(page).evaluateAll((l) => l.map((x) => x.getAttribute("data-station")).join());
      for (let k = 0; k < 12; k++) {
        const r = await page.evaluate(() => { const m = (window as any).__carte; const q = m.project([1.355, 44.0176]); const c = m.getContainer(); return { dx: c.clientWidth / 2 - q.x, dy: c.clientHeight / 2 - q.y, w: c.clientWidth, h: c.clientHeight }; });
        if (Math.hypot(r.dx, r.dy) < 30) break;
        const f = Math.min(1, (r.w - 60) / Math.abs(r.dx || 1), (r.h - 60) / Math.abs(r.dy || 1));
        const bb = (await page.locator(`${D("carte-stations")} canvas`).boundingBox())!;
        const x0 = bb.x + bb.width / 2 - (r.dx * f) / 2, y0 = bb.y + bb.height / 2 - (r.dy * f) / 2;
        await page.mouse.move(x0, y0);
        await page.mouse.down();
        await page.mouse.move(x0 + r.dx * f, y0 + r.dy * f, { steps: 14 });
        await page.waitForTimeout(180);
        await page.mouse.up();
        await page.waitForTimeout(500);
      }
      await expect(page.locator(D("rechercher-zone"))).toHaveText("Rechercher dans cette zone");
      expect(await lignes(page).evaluateAll((l) => l.map((x) => x.getAttribute("data-station")).join())).toBe(avant);
      await page.locator(D("rechercher-zone")).tap();
      await expect(page.locator(D("rechercher-zone"))).toHaveCount(0);
      await expect(page.locator(D("lieu"))).toHaveText("Autour de Montauban", { timeout: 15_000 });
      await expect.poll(() => lignes(page).evaluateAll((l) => l.map((x) => x.getAttribute("data-station")).join())).not.toBe(avant);
    });
  });
});
