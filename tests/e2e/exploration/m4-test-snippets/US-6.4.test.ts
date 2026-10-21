import { test, expect, enregistrerDepuis, KM5, lireDirect, demarrerRejeu, PTS, S6 } from "./_aides";

test.describe("US-6.4 — Mettre en pause", () => {
  test.describe("Happy Path", () => {
    test("US-6.4 — « Pause » : « En pause », distance et litres figés même si la voiture avance ; « Reprendre » relance", async ({ page, context }) => {
      test.setTimeout(150_000);
      await enregistrerDepuis(page, context, KM5);
      const r = demarrerRejeu(context, PTS, { debut: KM5 + 1, fin: KM5 + 60 });
      await page.waitForTimeout(10_000);
      await page.locator('[data-el="bouton-pause"]').click();
      const p0 = await lireDirect(page);
      expect(p0.indicateur).toBe("En pause");
      await expect(page.locator('[data-el="bouton-pause"]')).toHaveText("Reprendre");
      await page.waitForTimeout(10_000); // ≈ 200 m de route pendant la pause
      const p1 = await lireDirect(page);
      expect(p1.km).toBe(p0.km);
      expect(p1.litres).toBe(p0.litres);
      await expect(S6(page)).toHaveAttribute("data-etat", "pause");
      await page.locator('[data-el="bouton-pause"]').click();
      await expect(page.locator('[data-el="bouton-pause"]')).toHaveText("Pause");
      await page.waitForTimeout(8000);
      const p2 = await lireDirect(page);
      expect(p2.indicateur).toBe("Enregistrement");
      expect(p2.km).toBeGreaterThan(p0.km);
      r.arreter();
    });
  });
});
