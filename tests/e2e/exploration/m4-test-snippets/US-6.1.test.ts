import { test, expect, enregistrerDepuis, KM5, lireDirect, S6 } from "./_aides";

test.describe("US-6.1 — Enregistrer en roulant", () => {
  test.describe("Happy Path", () => {
    test("US-6.1 — « Enregistrer en roulant » avec la localisation autorisée ouvre l'écran En route, voiture rappelée en haut", async ({ page, context }) => {
      test.setTimeout(120_000);
      await enregistrerDepuis(page, context, KM5);
      await expect(S6(page)).toHaveAttribute("data-etat", "enregistrement");
      const d = await lireDirect(page);
      expect(d.indicateur).toBe("Enregistrement");
      expect(d.voiture).toBe("Peugeot 208 (101ch) · mécanique · SP95-E10");
      const stock = await page.evaluate(() => JSON.parse(localStorage.getItem("pt-en-route") || "null"));
      expect(stock.vehiculeId).toBe("2ed51bbad5ac66a7");
      expect(stock.points.length).toBeGreaterThanOrEqual(1);
    });
  });
});
