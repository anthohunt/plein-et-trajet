import { test, expect, D, PTS, avecVoiture, demarrer, arreter, direct, rejouer, lireIdb, moyenne, virgule, nb, euros2 } from "./_aides";

test.describe("V-3.1 — Suivre en direct", () => {
  test.describe("Happy Path", () => {
    test("V-3.1 — en roulant, vitesse, km, litres, euros, durée augmentent ; coût = litres × moyenne France SP95-E10", async ({ page, context }) => {
      await avecVoiture(context);
      await demarrer(page);
      await rejouer(context, page, PTS, 1, 200);
      const a = await direct(page);
      const vues: number[] = [];
      await rejouer(context, page, PTS, 200, 400, async () => vues.push(Number(await page.locator(D("vitesse")).getAttribute("data-kmh"))));
      const b = await direct(page);
      const changements = vues.filter((v, i) => i > 0 && v !== vues[i - 1]).length;
      expect(changements).toBeGreaterThan(20); // redessinée à chaque position (1 par seconde) : la vitesse change souvent en 200 s
      expect(b.km).toBeGreaterThan(a.km);
      expect(b.litres).toBeGreaterThan(a.litres);
      expect(b.euros).toBeGreaterThan(a.euros);
      const fr = await moyenne("SP95-E10");
      await expect(page.locator(D("prix-direct"))).toHaveText(`Prix : moyenne France du jour · ${virgule(fr, 3)} €/L`);
      expect(Math.abs(b.euros - b.litres * fr)).toBeLessThanOrEqual(0.005 * fr + 0.006);
    });
  });
  test.describe("Edge Case", () => {
    test("V-3.1 — prix pris sur une station : le coût en direct l'utilise", async ({ page, context }) => {
      await avecVoiture(context);
      await page.goto("/");
      await page.evaluate(() => localStorage.setItem("pt-prix-choisi", JSON.stringify({ prix: 1.99, carburant: "SP95-E10", station: "essai" })));
      await demarrer(page);
      await rejouer(context, page, PTS, 1, 300);
      await expect(page.locator(D("prix-direct"))).toHaveText("Prix : mon prix · 1,990 €/L");
      const d = await direct(page);
      expect(Math.abs(d.euros - d.litres * 1.99)).toBeLessThanOrEqual(0.016);
    });
  });
});
