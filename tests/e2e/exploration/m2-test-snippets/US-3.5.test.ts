import { test, expect, trajetCalcule, compterCalculs, formulairePret, moyenneDuJour, lireResultat, dbTrajets, S4 } from "./_aides";

test.describe("US-3.5 — Calculer le coût", () => {
  test.describe("Happy Path", () => {
    test("US-3.5 — Albi → Toulouse : coût, litres, km et L/100 km cohérents, calcul réel (IGN + ADEME + prix du jour)", async ({ page }) => {
      const calculs = compterCalculs(page);
      const r = await trajetCalcule(page, "Albi", "Toulouse");
      expect(calculs.n).toBe(1);
      expect(calculs.statuts).toEqual([200]);
      expect(r.route).toBe("Albi → Toulouse");
      expect(r.km).toBeGreaterThan(60);
      expect(r.km).toBeLessThan(100);
      expect(r.l100).toBeGreaterThan(4);
      expect(r.l100).toBeLessThan(8);
      expect(r.litres).toBeCloseTo((r.km * r.l100) / 100, 0);
      const moyenne = await moyenneDuJour("SP95-E10");
      expect(r.cout).toBeCloseTo(Math.round(r.litres * moyenne * 100) / 100, 1);
      await expect(page.locator('[data-el="troncons"] li').first()).toBeVisible();
    });
  });
  test.describe("Edge Case", () => {
    test("US-3.5 — le trajet rejoint l'historique en base (une seule ligne) et la somme des tronçons égale le total", async ({ page }) => {
      await trajetCalcule(page, "Albi", "Toulouse");
      const db = await dbTrajets(page);
      expect(db).toHaveLength(1);
      expect(db[0]).toMatchObject({ depart_label: "Albi", arrivee_label: "Toulouse" });
      const litresTroncons = await page.locator('[data-el="troncons"] .lit').allInnerTexts();
      const somme = litresTroncons.map((t) => Number(t.replace(" L", "").replace(",", "."))).reduce((s, x) => s + x, 0);
      const r = await lireResultat(page);
      expect(Math.abs(somme - r.litres)).toBeLessThan(0.3);
    });
    test("US-3.5 — pendant le calcul, l'état « Calcul de l'itinéraire… » s'affiche puis laisse place au résultat", async ({ page }) => {
      await formulairePret(page, "Albi", "Toulouse");
      await page.locator("#bouton-calculer").click();
      await expect(S4(page, "calcul")).toBeVisible();
      await expect(S4(page, "ok")).toBeVisible({ timeout: 45000 });
    });
  });
});
