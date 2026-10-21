import { test, expect, D, PTS, avecVoiture, demarrer, arreter, rejouer, lireIdb, ecrireIdb, trajetPrepare, moyenne, rest, virgule, nb, euros2, lignes, prixLigne } from "./_aides";

test.describe("V-5.7 — Europe et Royaume-Uni", () => {
  test.describe("Happy Path", () => {
    test.use({ geolocation: { latitude: 41.3874, longitude: 2.1686 } });
    test("V-5.7 — Barcelone : stations espagnoles au prix du jour, sur un fond de carte", async ({ page, context }) => {
      await avecVoiture(context);
      // round 2 (audit lot 2, MEDIUM 5) : le fond couvre l'Europe — des tuiles OpenFreeMap répondent pour Barcelone
      const tuiles: number[] = [];
      page.on("response", (r) => { if (/tiles\.openfreemap\.org\/planet\//.test(r.url())) tuiles.push(r.status()); });
      await page.goto("/stations");
      await expect(lignes(page).first()).toBeVisible({ timeout: 30_000 });
      const ids = await lignes(page).evaluateAll((l) => l.map((x) => x.getAttribute("data-station")!));
      const st = await rest(`stations?select=id,pays&id=in.(${ids.map((i) => `"${i}"`).join(",")})`);
      expect(new Set(st.map((s: any) => s.pays))).toEqual(new Set(["ES"]));
      await expect.poll(() => tuiles.filter((x) => x === 200).length, { timeout: 20_000 }).toBeGreaterThan(0);
    });
  });
  test.describe("Edge Case", () => {
    test.describe("Royaume-Uni", () => {
      test.use({ geolocation: { latitude: 51.4462, longitude: 0.2169 } });
      test("V-5.7 — Dartford : prix en €/L au taux BCE du jour, prix d'origine en p/L", async ({ page, context }) => {
        await avecVoiture(context);
        await page.goto("/stations");
        const l = lignes(page).first();
        await expect(l).toBeVisible({ timeout: 30_000 });
        const id = await l.getAttribute("data-station");
        await l.tap();
        const [cours] = await rest("cours_change?select=taux&monnaie=eq.GBP&order=jour.desc&limit=1");
        await expect(page.locator(D("cours-du-jour"))).toContainText(`1 € = ${virgule(Number(cours.taux), 4)} £`);
        for (const b of (await rest(`prix?select=carburant,prix,prix_origine&station_id=eq.${id}`)).filter((x: any) => x.prix_origine != null)) {
          await expect(page.locator(`${D("prix-origine")} [data-carburant="${b.carburant}"]`)).toContainText(`${virgule(Number(b.prix_origine), 1)} p/L`);
          expect(Number(b.prix)).toBeCloseTo(Number(b.prix_origine) / 100 / Number(cours.taux), 2);
        }
      });
    });
    test.describe("Pays sans flux", () => {
      test.use({ geolocation: { latitude: 50.8467, longitude: 4.3525 } });
      test("V-5.7 — Belgique : un message au lieu d'une carte vide", async ({ page, context }) => {
        await avecVoiture(context);
        await page.goto("/stations");
        await expect(page.locator(D("pays-sans-flux"))).toContainText("Ce pays ne publie pas les prix station par station", { timeout: 30_000 });
        await expect(page.locator(D("prix-moyen-national"))).toContainText("Moyenne nationale · Belgique · SP95-E10");
      });
    });
  });
});
