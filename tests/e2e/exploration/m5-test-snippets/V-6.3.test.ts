import { test, expect, D, PTS, avecVoiture, demarrer, arreter, rejouer, lireIdb, ecrireIdb, trajetPrepare, moyenne, rest, virgule, nb, euros2, lignes, prixLigne } from "./_aides";

// ÉTAT PRÉPARÉ : un trajet à 3 personnes et un trajet seul, écrits en IndexedDB au format de l'appli.
test.describe("V-6.3 — Lire un trajet", () => {
  test.describe("Happy Path", () => {
    test("V-6.3 — ligne : date, départ → arrivée, km, coût, « X € chacun » (pas de part pour un trajet seul) ; la toucher rouvre la fin", async ({ page }) => {
      await page.goto("/historique");
      await page.locator('[data-screen="T6"]').waitFor();
      await ecrireIdb(page, [
        trajetPrepare({ id: "s-3p", debut: "2026-10-18T10:00:00+02:00", minutes: 75, km: 92.4, litres: 6.01, prix: 2.156, depart: "Albi", arrivee: "Rodez", personnes: 3 }),
        trajetPrepare({ id: "s-seul", debut: "2026-10-19T18:00:00+02:00", minutes: 70, km: 76.8, litres: 4.84, prix: 2.156, depart: "Toulouse", arrivee: "Albi" }),
      ]);
      await page.reload();
      const cout = euros2(6.01 * 2.156);
      await expect(page.locator('li.hrow[data-trajet="s-3p"]')).toContainText("Albi → Rodez");
      await expect(page.locator('li.hrow[data-trajet="s-3p"]')).toContainText("18 oct. · 92,4 km");
      await expect(page.locator('li.hrow[data-trajet="s-3p"] [data-el="cout-ligne"]')).toHaveText(`${virgule(cout, 2)} €`);
      await expect(page.locator('li.hrow[data-trajet="s-3p"] [data-el="part-ligne"]')).toHaveText(` · ${virgule(euros2(cout / 3), 2)} € chacun`);
      await expect(page.locator('li.hrow[data-trajet="s-seul"] [data-el="part-ligne"]')).toHaveCount(0);
      await page.locator('li.hrow[data-trajet="s-seul"] button').tap();
      await expect(page.locator('[role="tab"][aria-selected="true"]')).toHaveAttribute("data-el", "onglet-historique");
      await expect(page.locator(D("retour-historique"))).toHaveText("← Historique");
    });
  });
});
