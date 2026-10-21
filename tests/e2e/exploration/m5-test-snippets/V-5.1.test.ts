import { test, expect, D, PTS, avecVoiture, demarrer, arreter, rejouer, lireIdb, ecrireIdb, trajetPrepare, moyenne, rest, virgule, nb, euros2, lignes, prixLigne } from "./_aides";

test.describe("V-5.1 — Stations autour de moi", () => {
  test.describe("Happy Path", () => {
    test("V-5.1 — carte centrée sur ma position, stations à moins de 10 km au prix officiel du jour", async ({ page, context }) => {
      await avecVoiture(context);
      await page.goto("/");
      await page.locator(D("onglet-stations")).tap();
      await expect(lignes(page).first()).toBeVisible({ timeout: 30_000 });
      const n = await lignes(page).count();
      await expect(page.locator(D("carte-stations"))).toHaveAttribute("data-pastilles", String(n));
      for (let i = 0; i < n; i++) {
        const l = lignes(page).nth(i);
        const [base] = await rest(`prix?select=prix&carburant=eq.SP95-E10&station_id=eq.${await l.getAttribute("data-station")}`);
        expect(await prixLigne(l)).toBeCloseTo(Number(base.prix), 3);
      }
      await expect(page.locator(D("lieu"))).toHaveText("Autour de moi");
    });
  });
  test.describe("Edge Case", () => {
    test("V-5.1 — pendant un trajet : stations autour de la voiture, l'enregistrement continue", async ({ page, context }) => {
      await avecVoiture(context);
      await demarrer(page);
      await rejouer(context, page, PTS, 1, 1450);
      const km = Number((await page.locator(D("direct-km")).textContent())!.replace(",", "."));
      await page.clock.resume();
      await page.locator(D("onglet-stations")).tap();
      await expect(lignes(page).first()).toBeVisible({ timeout: 30_000 });
      for (let i = 1450; i < 1462; i++) { await context.setGeolocation({ latitude: PTS[i].lat, longitude: PTS[i].lon }); await page.waitForTimeout(1000); }
      await page.locator(D("onglet-trajet")).tap();
      await expect.poll(async () => Number((await page.locator(D("direct-km")).textContent())!.replace(",", "."))).toBeGreaterThan(km);
    });
  });
});
