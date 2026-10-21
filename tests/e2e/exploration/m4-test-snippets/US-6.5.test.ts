import { test, expect, enregistrerDepuis, KM5, rouler, lireResultat, arreterEtAttendre, trajetsDeLaPage } from "./_aides";

test.describe("US-6.5 — Arrêter et voir le coût", () => {
  test.describe("Happy Path", () => {
    test("US-6.5 — plus de 1 km : résultat « Départ → Arrivée · enregistré », coût, litres, km, pays, tronçons ; en tête de l'historique", async ({ page, context }) => {
      test.setTimeout(240_000);
      await enregistrerDepuis(page, context, KM5);
      const avant = (await trajetsDeLaPage(page)).length;
      await rouler(context, KM5 + 1, 75);
      await arreterEtAttendre(page);
      await expect(page.locator('[data-screen="S4"][data-etat="ok"]')).toBeVisible();
      const r = await lireResultat(page);
      expect(r.route).toMatch(/^.+ → .+ · ENREGISTRÉ$/i);
      expect(r.km).toBeGreaterThanOrEqual(1);
      expect(r.litres).toBeGreaterThan(0);
      expect(r.cout).toBeGreaterThan(0);
      expect(await page.locator('[data-el="pays-traverses"] [data-pays]').evaluateAll((l) => l.map((x) => x.getAttribute("data-pays")))).toEqual(["FR"]);
      const types = await page.locator('[data-el="troncons"] [data-troncon]').evaluateAll((l) => l.map((x) => x.getAttribute("data-troncon")));
      expect(types.length).toBeGreaterThan(0);
      for (const t of types) expect(["autoroute", "route", "ville"]).toContain(t);
      await expect(page.locator('[data-el="detail-peages"]')).toHaveAttribute("data-etat", "ok");
      await page.locator('[data-el="retour-trajets"]').click();
      const l = page.locator('[data-el="ligne-historique"]');
      await expect(l).toContainText("enregistré");
      const base = await trajetsDeLaPage(page);
      expect(base.length).toBe(avant + 1);
      expect(base[0].enregistre).toBe(true);
      expect(r.route.toUpperCase()).toContain(`${base[0].depart_label} → ${base[0].arrivee_label}`.toUpperCase());
    });
  });
});
