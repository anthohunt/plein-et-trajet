import { test, expect, D, PTS, avecVoiture, demarrer, arreter, rejouer, lireIdb, ecrireIdb, trajetPrepare, moyenne, rest, virgule, nb, euros2, lignes, prixLigne } from "./_aides";

// ÉTAT PRÉPARÉ : 4 trajets de 77, 152, 245 et 243 km écrits en IndexedDB au format de l'appli (TrajetV1).
test.describe("V-6.2 — Totaux", () => {
  test.describe("Happy Path", () => {
    test("V-6.2 — 4 trajets, 717 km et la somme de leurs coûts ; recalculés après correction", async ({ page }) => {
      const p = await moyenne("SP95-E10");
      const T = [[77, 4.93], [152, 10.03], [245, 16.91], [243, 16.28]].map(([km, l], k) => trajetPrepare({ id: `s-${km}`, debut: `2026-10-${String(3 + k * 4).padStart(2, "0")}T08:00:00+02:00`, minutes: 120, km, litres: l, prix: p, depart: "Albi", arrivee: "Ailleurs" }));
      await page.goto("/historique");
      await page.locator('[data-screen="T6"]').waitFor();
      await ecrireIdb(page, T);
      await page.reload();
      const somme = euros2(T.reduce((s, t) => s + euros2(t.litres * p), 0));
      await expect(page.locator(D("totaux-historique"))).toHaveAttribute("data-trajets", "4");
      await expect(page.locator(D("total-km"))).toHaveText("717");
      await expect(page.locator(D("total-euros"))).toHaveText(virgule(somme, 2));
      await page.locator('li.hrow[data-trajet="s-152"] button').tap();
      await page.locator(D("compteur-prix")).tap();
      await page.locator(D("champ-prix")).fill("1,899");
      await page.locator(D("champ-prix")).press("Enter");
      await page.locator(D("retour-historique")).tap();
      await expect(page.locator(D("total-euros"))).toHaveText(virgule(euros2(somme - euros2(10.03 * p) + euros2(10.03 * 1.899)), 2));
    });
  });
});
