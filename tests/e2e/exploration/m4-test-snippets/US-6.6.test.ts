import { test, expect, enregistrerDepuis, KM5, rouler, arreterEtAttendre, champ, propositions } from "./_aides";

test.describe("US-6.6 — Voir ma courbe de vitesse", () => {
  test.describe("Happy Path", () => {
    test("US-6.6 — trajet enregistré : courbe de tout le trajet, vitesse moyenne, accélérations, note sur la vitesse réelle", async ({ page, context }) => {
      test.setTimeout(240_000);
      await enregistrerDepuis(page, context, KM5);
      await rouler(context, KM5 + 1, 75);
      await arreterEtAttendre(page);
      const b = page.locator('[data-el="courbe-vitesse"]');
      await expect(b).toContainText("Ma vitesse enregistrée");
      const info = page.locator('[data-el="vitesse-info"]');
      expect(Number(await info.getAttribute("data-moy"))).toBeGreaterThan(40);
      await expect(info).toHaveText(/^\d+ km\/h moy\. · \d+ accélérations?$/);
      expect(Number(await b.locator("svg").getAttribute("data-points"))).toBeGreaterThan(50);
      await expect(page.locator('[data-el="note-roule"]')).toContainText("Calcul sur ta vitesse réelle, seconde par seconde");
    });
  });
  test.describe("Edge Case", () => {
    test("US-6.6 — trajet calculé (Albi → Castres) : pas de bloc « Ma vitesse enregistrée »", async ({ page }) => {
      test.setTimeout(120_000);
      const { ouvrirTrajets, choisirVoiture } = await import("./_aides");
      await ouvrirTrajets(page);
      for (const [nom, texte] of [["depart", "Albi"], ["arrivee", "Castres"]]) {
        await champ(page, nom).pressSequentially(texte, { delay: 40 });
        const o = propositions(page, nom).filter({ hasText: texte }).first();
        await expect(o).toBeVisible({ timeout: 20_000 });
        await o.click();
      }
      await choisirVoiture(page);
      await page.locator("#bouton-calculer").click();
      await expect(page.locator('[data-screen="S4"][data-etat="ok"]')).toBeVisible({ timeout: 60_000 });
      await expect(page.locator('[data-el="courbe-vitesse"]')).toHaveCount(0);
      await expect(page.locator('[data-el="note-estimation"]')).toBeVisible();
    });
  });
});
