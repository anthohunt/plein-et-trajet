import { test, expect, rest, virgule, LONDRES, URL_APP } from "./_aides";

test.describe("US-1.9 — Stations au Royaume-Uni", () => {
  test.use({ geolocation: { latitude: 51.5074, longitude: -0.1278 } });
  test.describe("Happy Path", () => {
    test("US-1.9 — à Londres : stations britanniques (carte et liste) en €/L, fiche avec le prix d'origine en pence/L et le cours cité", async ({ page }) => {
      test.setTimeout(90_000);
      void LONDRES;
      await page.goto(URL_APP + "/");
      const lignes = page.locator('[data-el="ligne-station"]');
      await expect(lignes.first()).toBeVisible({ timeout: 30_000 });
      const n = await lignes.count();
      expect(n).toBeGreaterThan(5);
      expect(Number(await page.locator('[data-el="carte-stations"]').getAttribute("data-pastilles"))).toBe(n);
      const id = (await lignes.first().getAttribute("data-station"))!;
      expect(id).toMatch(/^GB-/);
      await lignes.first().click();
      const fiche = page.locator('[data-el="fiche-station"]');
      const base = await rest(`prix?select=carburant,prix,prix_origine,unite_origine&station_id=eq.${id}`);
      const cours = await rest("cours_change?select=taux,jour&monnaie=eq.GBP");
      for (const l of base) {
        await expect(fiche.locator(`[data-el="prix-origine"] [data-carburant="${l.carburant}"]`)).toContainText(`${virgule(Number(l.prix_origine), 1)} p/L`);
        expect(Number(l.prix)).toBeCloseTo(Number(l.prix_origine) / 100 / Number(cours[0].taux), 3);
      }
      await expect(fiche.locator('[data-el="cours-du-jour"]')).toContainText(`1 € = ${virgule(Number(cours[0].taux), 4)} £`);
    });
  });
});
