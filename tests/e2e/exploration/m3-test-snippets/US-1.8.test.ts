import { test, expect, BARCELONE, BRUXELLES, nombre, rest, URL_APP, virgule } from "./_aides";

test.describe("US-1.8 — Stations hors de France", () => {
  test.describe("Happy Path", () => {
    test.use({ geolocation: BARCELONE });
    test("US-1.8 — à Barcelone : stations espagnoles en liste et sur la carte, prix = flux officiel MITECO", async ({ page }) => {
      await page.goto("/");
      await page.locator('[data-el="selecteur-carburant"] button', { hasText: "Gazole" }).click();
      await expect(page.locator('[data-el="liste-stations"]')).toHaveAttribute("data-carburant", "Gazole", { timeout: 20000 });
      const lignes = page.locator('[data-el="ligne-station"]');
      await expect(lignes.first()).toBeVisible({ timeout: 20000 });
      const n = await lignes.count();
      expect(n).toBeGreaterThan(10);
      expect(Number(await page.locator('[data-el="carte-stations"]').getAttribute("data-pastilles"))).toBe(n);
      const id = (await lignes.first().getAttribute("data-station"))!;
      expect(id).toMatch(/^ES-/);
      const flux = await (await fetch(`${URL_APP}/api/relais-es`)).json();
      const st = flux.ListaEESSPrecio.find((x: any) => `ES-${x.IDEESS}` === id);
      expect(st).toBeTruthy();
      expect(nombre(await lignes.first().locator(".totem").getAttribute("aria-label"))).toBeCloseTo(Number(st["Precio Gasoleo A"].replace(",", ".")), 2);
      await expect(page.locator('[data-el="ecart"]').first()).toContainText("vs Espagne");
    });
  });
  test.describe("Edge Case", () => {
    test.use({ geolocation: BRUXELLES });
    test("US-1.8 — à Bruxelles (pas de flux) : « Ce pays ne publie pas les prix station par station » et le prix moyen national", async ({ page }) => {
      await page.goto("/");
      await expect(page.locator('[data-el="pays-sans-flux"]')).toBeVisible({ timeout: 30000 });
      await expect(page.locator('[data-el="pays-sans-flux"]')).toContainText("Ce pays ne publie pas les prix station par station");
      const be = Number((await rest("moyennes_nationales?select=prix_moyen&pays=eq.BE&carburant=eq.SP95-E10&order=jour.desc&limit=1"))[0].prix_moyen);
      await expect(page.locator('[data-el="prix-moyen-national"]')).toContainText(`Belgique · SP95-E10 : ${virgule(be, 3)} €/L`);
    });
  });
  for (const [nom, latitude, longitude, prefixe] of [["Rome", 41.9028, 12.4964, "IT-"], ["Lisbonne", 38.7223, -9.1393, "PT-"], ["Vienne", 48.2082, 16.3738, "AT-"], ["Ljubljana", 46.0569, 14.5058, "SI-"], ["Zagreb", 45.815, 15.9819, "HR-"]] as [string, number, number, string][]) {
    test.describe(`Happy Path — ${nom}`, () => {
      test.use({ geolocation: { latitude, longitude } });
      test(`US-1.8 — à ${nom} : stations officielles du pays (${prefixe}…), pas de message « pays sans flux »`, async ({ page }) => {
        await page.goto("/");
        await page.locator('[data-el="selecteur-carburant"] button', { hasText: "Gazole" }).click();
        await expect(page.locator('[data-el="liste-stations"]')).toHaveAttribute("data-carburant", "Gazole", { timeout: 30000 });
        const l = page.locator('[data-el="ligne-station"]');
        await expect(l.first()).toBeVisible({ timeout: 30000 });
        const ids = await l.evaluateAll((els) => els.map((e) => e.getAttribute("data-station")!));
        expect(ids.length).toBeGreaterThan(0);
        expect(ids.every((i) => i.startsWith(prefixe))).toBe(true);
        await expect(page.locator('[data-el="pays-sans-flux"]')).toHaveCount(0);
        expect(await l.first().locator(".totem").getAttribute("aria-label")).toMatch(/^\d,\d{3} euros le litre$/);
      });
    });
  }
  test.describe("Edge Case (pays non branché : libellé vrai)", () => {
    test.use({ geolocation: { latitude: 52.52, longitude: 13.405 } });
    test("US-1.8 — à Berlin : « Prix station par station pas encore disponibles pour ce pays », jamais « ne publie pas »", async ({ page }) => {
      await page.goto("/");
      await expect(page.locator('[data-el="pays-sans-flux"]')).toContainText("Prix station par station pas encore disponibles pour ce pays", { timeout: 30000 });
      await expect(page.locator('[data-el="pays-sans-flux"]')).not.toContainText("ne publie pas");
    });
  });
  test.describe("Edge Case (France inchangée)", () => {
    test("US-1.8 — à Albi : toujours des stations françaises, écart « vs France »", async ({ page }) => {
      await page.goto("/");
      await expect(page.locator('[data-el="ligne-station"]').first()).toBeVisible({ timeout: 20000 });
      await expect(page.locator('[data-el="ecart"]').first()).toContainText("vs France");
      expect(await page.locator('[data-el="ligne-station"]').first().getAttribute("data-station")).not.toMatch(/^ES-/);
    });
  });
});
