import { test, expect, formulaire, ALBI_, BARCELONE_, CASTRES, calculer, lireResultat, lignesListe, cout, nombre, cleValideEnregistree } from "./_aides";

test.describe("US-4.4 — Voir les péages", () => {
  test.describe("Happy Path", () => {
    test("US-4.4 — trajet sans autoroute payante (Albi → Castres) : « Aucun péage sur cet itinéraire » 0,00 €, total = carburant", async ({ page }) => {
      await formulaire(page, ALBI_, CASTRES);
      await calculer(page);
      const l = await lignesListe(page, "detail-peages");
      expect(l).toHaveLength(1);
      expect(l[0].texte).toContain("Aucun péage sur cet itinéraire");
      expect(l[0].montant).toBe("0,00 €");
      const split = await page.locator('[data-el="repartition-cout"]').innerText();
      expect(split).toMatch(/Péages 0,00 €$/);
      expect(nombre(split.match(/Carburant ([\d,]+) €/)![1])).toBeCloseTo(await cout(page), 2);
    });
    test("US-4.4 — BLOQUÉ-CLÉ : avec une clé PTV/HERE valide, chaque section affiche son montant TTC et le total est ajouté au coût", async ({ page }) => {
      test.info().annotations.push({ type: "BLOQUÉ-CLÉ", description: "aucune clé PTV/HERE n'existe ; ce test s'exécute dès qu'Anthony en colle une valide dans l'écran Moteurs" });
      test.skip(!(await cleValideEnregistree("ptv")) && !(await cleValideEnregistree("here")), "BLOQUÉ-CLÉ : aucune clé fournisseur de péages valide enregistrée");
      await formulaire(page, ALBI_, BARCELONE_);
      await calculer(page);
      const lignes = (await lignesListe(page, "detail-peages")).filter((x: any) => !/Total péages/.test(x.texte));
      expect(lignes.length).toBeGreaterThan(0);
      for (const x of lignes) expect(x.montant).toMatch(/^(\d+,\d{2} €|gratuit)$/);
      const total = nombre((await lignesListe(page, "detail-peages")).find((x: any) => /Total péages/.test(x.texte)).montant);
      const somme = lignes.reduce((s: number, x: any) => s + (x.montant === "gratuit" ? 0 : nombre(x.montant)), 0);
      expect(total).toBeCloseTo(somme, 2);
      const split = await page.locator('[data-el="repartition-cout"]').innerText();
      expect(nombre(split.match(/Péages ([\d,]+) €/)![1])).toBeCloseTo(total, 2);
    });
  });
  test.describe("Edge Case", () => {
    test("US-4.4 — état réel sans clé : Albi → Barcelone affiche le coût carburant et « Péages non disponibles pour l'instant », aucun total de péages", async ({ page }) => {
      await formulaire(page, ALBI_, BARCELONE_);
      await calculer(page);
      await expect(page.locator('[data-el="peages-indisponibles"]')).toContainText("Péages non disponibles pour l'instant");
      await expect(page.locator('[data-el="total-peages"]')).toHaveCount(0);
      const pays = await lignesListe(page, "pays-traverses");
      expect(pays.reduce((s: number, x: any) => s + nombre(x.montant), 0)).toBeCloseTo(await cout(page), 2);
    });
  });
});
