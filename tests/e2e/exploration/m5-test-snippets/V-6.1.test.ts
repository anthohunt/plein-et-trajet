import { test, expect, D, PTS, avecVoiture, demarrer, arreter, rejouer, lireIdb, ecrireIdb, trajetPrepare, moyenne, rest, virgule, nb, euros2, lignes, prixLigne } from "./_aides";

test.describe("V-6.1 — Ouvrir l'historique", () => {
  test.describe("Happy Path", () => {
    test("V-6.1 — trajets de septembre et d'octobre : du plus récent au plus ancien, « Octobre 2026 » puis « Septembre 2026 »", async ({ browser }) => {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, permissions: ["geolocation"], geolocation: { latitude: PTS[0].lat, longitude: PTS[0].lon } });
      await avecVoiture(context);
      for (const date of ["2026-09-14T08:00:00+02:00", "2026-10-05T17:30:00+02:00"]) {
        const page = await context.newPage();
        await page.clock.install({ time: new Date(date) }); // vrai trajet rejoué, horloge de la page posée à cette date
        await page.goto("/");
        await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 1000);
        await page.locator(D("bouton-demarrer")).tap();
        await rejouer(context, page, PTS, 1, 600);
        await arreter(page);
        await page.locator(D("enregistrer-trajet")).tap();
        await expect(page).toHaveURL(/\/historique$/);
        await page.close();
      }
      const page = await context.newPage();
      await page.goto("/historique");
      await expect(page.locator("li.mois")).toHaveCount(2);
      expect(await page.locator("li.mois").evaluateAll((l) => l.map((x) => x.getAttribute("data-mois")))).toEqual(["Octobre 2026", "Septembre 2026"]);
      await expect(page.locator("li.hrow").first()).toContainText("5 oct.");
      await expect(page.locator("li.hrow").last()).toContainText("14 sept.");
      await context.close();
    });
  });
  test.describe("Edge Case", () => {
    test("V-6.1 — aucun trajet : « Aucun trajet enregistré. », totaux à 0", async ({ page }) => {
      await page.goto("/historique");
      await expect(page.locator(D("historique-vide"))).toHaveText("Aucun trajet enregistré.");
      await expect(page.locator(D("totaux-historique"))).toHaveAttribute("data-trajets", "0");
      await expect(page.locator(D("total-km"))).toHaveText("0,0"); // une décimale sous 100 km (3a2c194)
      await expect(page.locator(D("total-euros"))).toHaveText("0,00");
    });
  });
});
