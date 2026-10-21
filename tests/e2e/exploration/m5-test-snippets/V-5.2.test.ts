import { test, expect, D, PTS, avecVoiture, demarrer, arreter, rejouer, lireIdb, ecrireIdb, trajetPrepare, moyenne, rest, virgule, nb, euros2, lignes, prixLigne } from "./_aides";

test.describe("V-5.2 — Choisir le carburant", () => {
  test.describe("Happy Path", () => {
    test("V-5.2 — Clio SP95-E10 : SP95-E10 choisi d'office, même si Gazole était le dernier carburant regardé", async ({ page, context }) => {
      await avecVoiture(context);
      await page.goto("/");
      await page.evaluate(() => localStorage.setItem("pt-carburant", "Gazole"));
      await page.locator(D("onglet-stations")).tap();
      await expect(page.locator(`${D("selecteur-carburant")} [aria-pressed="true"]`)).toHaveText("SP95-E10");
      await expect(page.locator(D("titre-liste"))).toHaveText("Stations · SP95-E10");
    });
  });
  test.describe("Edge Case", () => {
    test("V-5.2 — Gazole : lignes et pastilles au prix du gazole, sans les stations qui n'en vendent pas", async ({ page, context }) => {
      await avecVoiture(context);
      await page.goto("/stations");
      await expect(lignes(page).first()).toBeVisible({ timeout: 30_000 });
      await page.locator(`${D("selecteur-carburant")} button`, { hasText: /^Gazole$/ }).tap();
      await expect(page.locator(D("liste-stations"))).toHaveAttribute("data-carburant", "Gazole");
      const n = await lignes(page).count();
      await expect(page.locator(D("carte-stations"))).toHaveAttribute("data-pastilles", String(n));
      for (let i = 0; i < n; i++) {
        const l = lignes(page).nth(i);
        const base = await rest(`prix?select=prix,rupture&carburant=eq.Gazole&station_id=eq.${await l.getAttribute("data-station")}`);
        expect(base.length && !base[0].rupture).toBeTruthy();
        expect(await prixLigne(l)).toBeCloseTo(Number(base[0].prix), 3);
      }
    });
    test.describe("Prayssac", () => {
      test.use({ geolocation: { latitude: 44.5041, longitude: 1.1885 } });
      test("V-5.2 — une vraie station sans gazole (TotalEnergies Prayssac, 46220005) disparaît de la liste et de la carte en Gazole", async ({ page, context }) => {
        const base = await rest("prix?select=carburant&station_id=eq.46220005");
        expect(base.map((x: any) => x.carburant)).toContain("SP95-E10");
        expect(base.map((x: any) => x.carburant)).not.toContain("Gazole");
        await avecVoiture(context);
        await page.goto("/stations");
        await expect(page.locator(`${D("ligne-station")}[data-station="46220005"]`)).toBeVisible({ timeout: 30_000 });
        await expect(page.locator(`${D("pastille-station")}[data-station="46220005"]`)).toHaveCount(1);
        await page.locator(`${D("selecteur-carburant")} button`, { hasText: /^Gazole$/ }).tap();
        await expect(page.locator(D("liste-stations"))).toHaveAttribute("data-carburant", "Gazole");
        await expect(page.locator(`${D("ligne-station")}[data-station="46220005"]`)).toHaveCount(0);
        await expect(page.locator(`${D("pastille-station")}[data-station="46220005"]`)).toHaveCount(0);
      });
    });
  });
});
