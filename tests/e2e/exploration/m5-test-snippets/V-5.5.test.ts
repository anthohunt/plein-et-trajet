import { test, expect, D, PTS, avecVoiture, demarrer, arreter, rejouer, lireIdb, ecrireIdb, trajetPrepare, moyenne, rest, virgule, nb, euros2, lignes, prixLigne } from "./_aides";

test.describe("V-5.5 — Utiliser ce prix", () => {
  test.describe("Happy Path", () => {
    test("V-5.5 — pendant un trajet : la fiche se ferme, En route revient, coût en direct et fin au prix de la station", async ({ page, context }) => {
      await avecVoiture(context);
      await demarrer(page);
      await rejouer(context, page, PTS, 1, 500);
      await page.clock.resume();
      await page.locator(D("onglet-stations")).tap();
      await lignes(page).first().tap();
      const b = page.locator(D("utiliser-ce-prix"));
      const prix = Number(await b.getAttribute("data-prix"));
      await expect(b).toHaveText(`Utiliser ${virgule(prix, 3)} €/L pour mon trajet`);
      await b.tap();
      await expect(page).toHaveURL(/\/en-route$/);
      await expect(page.locator(D("fiche-station"))).toHaveCount(0);
      await expect(page.locator(D("prix-direct"))).toHaveText(`Prix : mon prix · ${virgule(prix, 3)} €/L`);
      await page.locator(D("bouton-arreter")).tap();
      await expect(page.locator(D("libelle-prix"))).toHaveText("Mon prix");
      await expect(page.locator(D("prix-apres"))).toHaveAttribute("data-prix", String(prix));
    });
  });
  test.describe("Edge Case", () => {
    test("V-5.5 — sans trajet : prix gardé pour le prochain trajet, l'accueil s'ouvre", async ({ page, context }) => {
      await avecVoiture(context);
      await page.goto("/stations");
      await lignes(page).first().tap();
      const prix = Number(await page.locator(D("utiliser-ce-prix")).getAttribute("data-prix"));
      await page.locator(D("utiliser-ce-prix")).tap();
      await expect(page.locator('[data-screen="T1"]')).toBeVisible();
      expect(JSON.parse((await page.evaluate(() => localStorage.getItem("pt-prix-choisi")))!).prix).toBe(prix);
      await page.locator(D("bouton-demarrer")).tap();
      await expect(page.locator(D("prix-direct"))).toHaveText(`Prix : mon prix · ${virgule(prix, 3)} €/L`);
    });
    test("V-5.5 — station sans SP95-E10 : pas de bouton", async ({ page, context }) => {
      await avecVoiture(context);
      await page.goto("/stations");
      await page.locator(`${D("selecteur-carburant")} button`, { hasText: /^Gazole$/ }).tap();
      await expect(page.locator(D("liste-stations"))).toHaveAttribute("data-carburant", "Gazole");
      const ids = await lignes(page).evaluateAll((l) => l.map((x) => x.getAttribute("data-station")!));
      const e10 = new Set((await rest(`prix?select=station_id&carburant=eq.SP95-E10&rupture=is.false&prix=not.is.null&station_id=in.(${ids.join(",")})`)).map((x: any) => x.station_id));
      const sans = ids.find((i) => !e10.has(i))!;
      expect(sans, "aucune station sans SP95-E10 dans la zone").toBeTruthy();
      await page.locator(`${D("ligne-station")}[data-station="${sans}"]`).tap();
      await expect(page.locator(D("tableau-prix"))).toHaveAttribute("aria-busy", "false");
      await expect(page.locator(D("utiliser-ce-prix"))).toHaveCount(0);
    });
  });
});
