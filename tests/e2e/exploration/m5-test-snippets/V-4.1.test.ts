import { test, expect, D, PTS, lireGpx, avecVoiture, demarrer, arreter, direct, rejouer, lireIdb, ecrireIdb, trajetPrepare, moyenne, virgule, nb, euros2 } from "./_aides";

test.describe("V-4.1 — Prix de l'essence", () => {
  test.describe("Happy Path", () => {
    test("V-4.1 — fin d'un trajet parti de France : SP95-E10 choisi, « Moyenne France du jour » à 3 décimales ; Gazole recalcule", async ({ page, context }) => {
      await avecVoiture(context);
      await demarrer(page);
      await rejouer(context, page, PTS, 1, 900);
      await arreter(page);
      const e10 = await moyenne("SP95-E10"), gaz = await moyenne("Gazole");
      await expect(page.locator(`${D("carburant-apres")} button`)).toHaveText(["Gazole", "SP95-E10", "SP95", "SP98", "E85", "GPLc"]);
      await expect(page.locator(`${D("carburant-apres")} [aria-pressed="true"]`)).toHaveText("SP95-E10");
      await expect(page.locator(D("libelle-prix"))).toHaveText("Moyenne France du jour");
      await expect(page.locator(D("compteur-prix"))).toHaveAttribute("aria-label", new RegExp(virgule(e10, 3)));
      const litres = Number(await page.locator(D("fin-litres")).getAttribute("data-litres"));
      await page.locator(`${D("carburant-apres")} [data-carburant="Gazole"]`).tap();
      await expect(page.locator(D("prix-apres"))).toHaveAttribute("data-prix", String(gaz));
      await expect(page.locator(D("cout-trajet"))).toHaveAttribute("data-cout", String(euros2(litres * gaz)));
    });
  });
  test.describe("Edge Case", () => {
    test.use({ geolocation: { latitude: 41.38706, longitude: 2.17008 } });
    test("V-4.1 — départ de Barcelone : moyenne Espagne du jour, pays nommé", async ({ page, context }) => {
      const BCN = lireGpx("barcelone.gpx"); // vrai itinéraire routier (Valhalla), plaça de Catalunya → Sagrada Família
      await avecVoiture(context);
      await demarrer(page);
      await rejouer(context, page, BCN, 1, BCN.length);
      await arreter(page);
      const es = await moyenne("SP95-E10", "ES");
      await expect(page.locator(D("libelle-prix"))).toHaveText("Moyenne Espagne du jour");
      await expect(page.locator(D("prix-apres"))).toHaveAttribute("data-prix", String(es));
      expect((await lireIdb(page)).arrete.pays_depart).toBe("ES");
    });
  });
});
