import { test, expect, formulaire, ALBI_, MILAN, calculer, lireResultat, lignesListe, cout, nombre, rest, virgule } from "./_aides";

test.describe("US-4.5 — Voir les pays traversés", () => {
  test.describe("Happy Path", () => {
    test("US-4.5 — Albi → Milan : km, litres, prix du jour et coût par pays ; Σ coûts pays = coût carburant", async ({ page }) => {
      await formulaire(page, ALBI_, MILAN);
      await calculer(page);
      const l = await lignesListe(page, "pays-traverses");
      expect(l.map((x: any) => x.pays)).toEqual(["FR", "IT"]);
      for (const x of l) expect(x.texte).toMatch(/\d+ km · \d+,\d L × \d,\d{3}.*\d+,\d{2} €$/);
      const somme = l.reduce((s: number, x: any) => s + nombre(x.montant), 0);
      expect(somme).toBeCloseTo(await cout(page), 2);
      const fr = Number((await rest("moyennes_nationales?select=prix_moyen&pays=eq.FR&carburant=eq.SP95-E10&order=jour.desc&limit=1"))[0].prix_moyen);
      const it = Number((await rest("moyennes_nationales?select=prix_moyen&pays=eq.IT&carburant=eq.SP95-E10&order=jour.desc&limit=1"))[0].prix_moyen);
      expect(l[0].texte).toContain(virgule(fr, 3));
      expect(l[1].texte).toContain(virgule(it, 3));
      // les litres des pays additionnés = litres du trajet (à l'arrondi près)
      const litres = l.reduce((s: number, x: any) => s + nombre(x.texte.match(/(\d+,\d) L/)[1]), 0);
      expect(litres).toBeCloseTo((await lireResultat(page)).litres, 0);
    });
  });
  test.describe("Edge Case", () => {
    test("US-4.5 — prix perso : appliqué à tous les pays, somme des coûts pays = nouveau coût", async ({ page }) => {
      await formulaire(page, ALBI_, MILAN);
      await calculer(page);
      await page.locator('[data-el="mettre-mon-prix"]').click();
      await page.locator('[data-el="champ-prix-perso"]').fill("1,699");
      await page.locator('[data-el="champ-prix-perso"]').press("Enter");
      await expect(page.locator('[data-el="libelle-prix"]')).toHaveText("Mon prix (tous pays)");
      const l = await lignesListe(page, "pays-traverses");
      expect(l.every((x: any) => x.texte.includes("1,699"))).toBe(true);
      expect(l.reduce((s: number, x: any) => s + nombre(x.montant), 0)).toBeCloseTo(await cout(page), 2);
    });
    test("US-4.5 — trajet 100 % France : une seule ligne France, libellé « Moyenne France du jour »", async ({ page }) => {
      await formulaire(page, ALBI_, ["Castr", "Castres", "Tarn"]);
      await calculer(page);
      expect((await lignesListe(page, "pays-traverses")).map((x: any) => x.pays)).toEqual(["FR"]);
      await expect(page.locator('[data-el="libelle-prix"]')).toContainText("Moyenne France du jour");
    });
  });
});
