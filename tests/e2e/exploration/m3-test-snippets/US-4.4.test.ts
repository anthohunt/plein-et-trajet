import { test, expect, formulaire, ALBI_, BARCELONE_, CASTRES, MILAN, calculer, lignesListe, cout, nombre, peagesSurTraceDirect, estimerDirect, cleEnMemoire } from "./_aides";

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
    // Recalcul INDÉPENDANT (round 4) : le tracé est redemandé à Stadia (même fournisseur que la prod), échantillonné par un code écrit à part,
    // puis tarifé par un appel direct à PTV (clés lues en mémoire) + TVA du pays. Il ne réutilise ni la requête ni le code de l'Edge Function.
    // Round 5 (audit round 3, HIGH 1 d) : c'est le SEUL test qui appelle PTV en direct (2 transactions par passage, Barcelone + Milan) ;
    // tous les autres calculs passent par l'appli, dont le cache par tracé ne repaie pas un trajet déjà tarifé.
    test("US-4.4 — Albi → Barcelone et Albi → Milan : péages tarifés sur LE tracé affiché (recalcul indépendant, mêmes sections, pas de Fréjus hors tracé)", async ({ page }) => {
      test.skip(!(await cleEnMemoire("ptv")) || !(await cleEnMemoire("stadia")), "clé PTV ou Stadia absente : le manager doit la remettre");
      for (const [arrivee, point] of [[BARCELONE_, { lat: 41.3874, lon: 2.1686 }], [MILAN, { lat: 45.4642, lon: 9.19 }]] as const) {
        await formulaire(page, ALBI_, arrivee);
        await calculer(page);
        const l = await lignesListe(page, "detail-peages");
        const d = await peagesSurTraceDirect({ lat: 43.9289, lon: 2.1464 }, point);
        expect(nombre(l.find((x: any) => /Total péages/.test(x.texte)).montant)).toBeCloseTo(d.total, 2);
        const affichees = l.filter((x: any) => /^[A-Z]{2} /.test(x.texte) && !/Total péages/.test(x.texte)).map((x: any) => x.texte);
        expect(affichees).toHaveLength(d.lignes.length);
        // une section de péage n'existe que sur une voie du tracé : le Fréjus n'est tarifé que si le tracé passe par l'A43 / le tunnel
        const tracePasseAuFrejus = d.voies.some((v: string) => /Fréjus|^A ?43$/.test(v));
        expect(affichees.some((t: string) => /Fréjus/.test(t))).toBe(tracePasseAuFrejus);
        await page.goto("/");
      }
    });
    // Round 5 (audit round 3, LOW 5) : stabilité ×2, versionnée. Le 2e calcul du même trajet est servi par le cache des péages : même montant,
    // mêmes sections, aucun appel au fournisseur (consigne : ne pas épuiser le quota PTV).
    test("US-4.4 — stabilité ×2 : deux calculs Albi → Barcelone rendent les mêmes péages ; le second vient du cache (aucun appel PTV)", async () => {
      const a = await estimerDirect({ lat: 43.9289, lon: 2.1464 }, { lat: 41.3874, lon: 2.1686 });
      const b = await estimerDirect({ lat: 43.9289, lon: 2.1464 }, { lat: 41.3874, lon: 2.1686 });
      expect(a.statut).toBe(200);
      expect(b.statut).toBe(200);
      expect(a.corps.peages.etat, `péages : ${a.corps.peages.motif ?? ""}`).toBe("ok");
      expect(b.corps.peages.total).toBe(a.corps.peages.total);
      expect(b.corps.peages.lignes).toEqual(a.corps.peages.lignes);
      expect(b.corps.peages.cache).toBe(true);
    });
  });
  test.describe("Edge Case", () => {
  });
});
