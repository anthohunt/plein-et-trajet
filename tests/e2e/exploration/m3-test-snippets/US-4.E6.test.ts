import { test, expect, formulaire, ALBI_, BELGRADE, calculer, lignesListe, cout, nombre, rest, virgule } from "./_aides";

test.describe("US-4.E6 — Pays sans prix moyen", () => {
  test.describe("Edge Case", () => {
    test("US-4.E6 — Albi → Belgrade (1 960 km) : la Serbie porte « prix non publié — moyenne européenne appliquée » et le prix de la moyenne UE", async ({ page }) => {
      await formulaire(page, ALBI_, BELGRADE);
      await calculer(page);
      const l = await lignesListe(page, "pays-traverses");
      expect(l.map((x: any) => x.pays)).toEqual(["FR", "IT", "SI", "HR", "RS"]);
      const rs = l.find((x: any) => x.pays === "RS");
      expect(rs).toBeTruthy();
      expect(rs.texte).toContain("prix non publié — moyenne européenne appliquée");
      const eu = Number((await rest("moyennes_nationales?select=prix_moyen&pays=eq.EU&carburant=eq.SP95-E10&order=jour.desc&limit=1"))[0].prix_moyen);
      expect(rs.texte).toContain(virgule(eu, 3));
      expect(l.filter((x: any) => x.pays !== "RS").every((x: any) => !x.texte.includes("prix non publié"))).toBe(true);
      expect(l.reduce((s: number, x: any) => s + nombre(x.montant), 0)).toBeCloseTo(await cout(page), 2);
    });
  });
});
