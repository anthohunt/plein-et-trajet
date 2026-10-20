import { test, expect, env, session, attendreFormulaire, trajetCalcule, compterCalculs, moyenneDuJour, lireResultat, dbTrajets, S4, lignesHistorique } from "./_aides";

test.describe("US-3.6 — Rejouer un ancien trajet", () => {
  test.describe("Happy Path", () => {
    test("US-3.6 — la ligne d'historique relance un calcul réel au prix moyen du jour et remonte en tête, sans doublon", async ({ page }) => {
      await trajetCalcule(page, "Albi", "Toulouse");
      await page.locator('[data-el="retour-trajets"]').click();
      const avant = (await dbTrajets(page))[0];
      const calculs = compterCalculs(page);
      await page.waitForTimeout(1100);
      await page.locator('[data-el="ligne-historique"]').click();
      await expect(S4(page, "ok")).toBeVisible({ timeout: 45000 });
      expect(calculs.n).toBe(1);
      await expect(page.locator('[data-el="trajet-rejoue"]')).toHaveText("Trajet recalculé au prix moyen du jour");
      const r = await lireResultat(page);
      const moyenne = await moyenneDuJour("SP95-E10");
      expect(r.detail).toContain(moyenne.toFixed(3).replace(".", ","));
      expect(Math.abs(r.cout - r.litres * moyenne)).toBeLessThan(0.06 * moyenne + 0.01); // les litres affichés sont arrondis au dixième
      const apres = await dbTrajets(page);
      expect(apres).toHaveLength(1);
      expect(new Date(apres[0].cree_le).getTime()).toBeGreaterThan(new Date(avant.cree_le).getTime());
    });
  });
  test.describe("Edge Case", () => {
    test("US-3.6 — le focus revient sur la ligne rejouée à la fermeture du résultat", async ({ page }) => {
      await trajetCalcule(page, "Albi", "Toulouse");
      await page.locator('[data-el="retour-trajets"]').click();
      await page.locator('[data-el="ligne-historique"]').click();
      await expect(S4(page, "ok")).toBeVisible({ timeout: 45000 });
      await page.locator('[data-el="retour-trajets"]').click();
      await expect(page.locator("button.go").first()).toBeFocused();
      await expect(lignesHistorique(page)).toHaveCount(1);
    });
  });
  test.describe("Voiture disparue", () => {
    test("US-3.6 — rejouer une ligne dont la voiture n'est plus en base : message, aucun calcul", async ({ page }) => {
      const calculs = compterCalculs(page);
      await trajetCalcule(page, "Albi", "Toulouse");
      await page.locator('[data-el="retour-trajets"]').click();
      const { jeton } = await session(page);
      const id = (await dbTrajets(page))[0].id;
      const r = await fetch(`${env.VITE_SUPABASE_URL}/rest/v1/trajets?id=eq.${id}`, { method: "PATCH", headers: { apikey: env.VITE_SUPABASE_ANON_KEY, Authorization: `Bearer ${jeton}`, "Content-Type": "application/json" }, body: JSON.stringify({ vehicule_id: null }) });
      expect(r.ok).toBe(true);
      await page.reload();
      await attendreFormulaire(page);
      const avant = calculs.n;
      await page.locator('[data-el="ligne-historique"]').click();
      await expect(page.locator('[data-el="erreur-rejeu"]')).toContainText("n'est plus dans la base");
      expect(calculs.n).toBe(avant);
      await expect(page.locator('[data-screen="S3"]')).toBeVisible();
    });
  });
});
