import { test, expect, D, PTS, avecVoiture, demarrer, arreter, rejouer, lireIdb, ecrireIdb, trajetPrepare, moyenne, rest, virgule, nb, euros2, lignes, prixLigne } from "./_aides";

test.describe("V-5.4 — Trier", () => {
  test.describe("Happy Path", () => {
    test("V-5.4 — « Plus proche » : distances croissantes ; « Moins cher » : prix croissants", async ({ page, context }) => {
      await avecVoiture(context);
      await page.goto("/stations");
      await expect(lignes(page).first()).toBeVisible({ timeout: 30_000 });
      const dist = (t: string) => { const m = t.match(/([\d,]+)\s*(km|m)\b/)!; return m[2] === "km" ? nb(m[1]) : nb(m[1]) / 1000; };
      await page.locator(`${D("tri-liste")} button`, { hasText: "Plus proche" }).tap();
      await expect(page.locator(D("liste-stations"))).toHaveAttribute("data-tri", "distance");
      const d = (await lignes(page).allInnerTexts()).map(dist);
      expect(d).toEqual([...d].sort((a, b) => a - b));
      await page.locator(`${D("tri-liste")} button`, { hasText: "Moins cher" }).tap();
      await expect(page.locator(D("liste-stations"))).toHaveAttribute("data-tri", "prix");
      const p: number[] = [];
      for (let i = 0; i < (await lignes(page).count()); i++) p.push(await prixLigne(lignes(page).nth(i)));
      expect(p).toEqual([...p].sort((a, b) => a - b));
    });
  });
});
