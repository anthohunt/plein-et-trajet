import { test, expect, formulaire, ALBI_, BARCELONE_, CASTRES, calculer, lireResultat, lignesListe, cout, nombre, env, totalPeagesPtvDirect } from "./_aides";

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
    test("US-4.4 — Albi → Barcelone : chaque section en euros TTC (« gratuit » si 0), total des péages ajouté au coût (montants réels PTV)", async ({ page }) => {
      await formulaire(page, ALBI_, BARCELONE_);
      await calculer(page);
      const l = await lignesListe(page, "detail-peages");
      const lignes = l.filter((x: any) => /^[A-Z]{2} /.test(x.texte) && x.montant && !/Total péages/.test(x.texte));
      expect(lignes.length).toBeGreaterThan(0);
      for (const x of lignes) expect(x.montant).toMatch(/^(\d+,\d{2} €|gratuit)$/);
      const total = nombre(l.find((x: any) => /Total péages/.test(x.texte)).montant);
      expect(total).toBeCloseTo(lignes.reduce((s: number, x: any) => s + (x.montant === "gratuit" ? 0 : nombre(x.montant)), 0), 2);
      const split = await page.locator('[data-el="repartition-cout"]').innerText();
      expect(nombre(split.match(/Péages ([\d,]+) €/)![1])).toBeCloseTo(total, 2);
      expect(nombre(split.match(/Carburant ([\d,]+) €/)![1]) + total).toBeCloseTo(await cout(page), 2);
      await expect(page.locator('[data-el="peages-indisponibles"]')).toHaveCount(0);
    });
    test("US-4.4 — le total affiché égale un recalcul indépendant : appel direct à PTV (clé lue en mémoire) + TVA du pays", async ({ page }) => {
      const cle = (await (await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/moteur_cle`, { method: "POST", headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, "Content-Type": "application/json" }, body: JSON.stringify({ p_fournisseur: "ptv" }) })).json()) as string | null;
      test.skip(!cle, "aucune clé PTV enregistrée : le manager doit la remettre");
      await formulaire(page, ALBI_, BARCELONE_);
      await calculer(page);
      const l = await lignesListe(page, "detail-peages");
      const d = await totalPeagesPtvDirect(cle, { lat: 43.9289, lon: 2.1464 }, { lat: 41.3874, lon: 2.1686 });
      expect(nombre(l.find((x: any) => /Total péages/.test(x.texte)).montant)).toBeCloseTo(d.total, 2);
    });
  });
  test.describe("Edge Case", () => {
  });
});
