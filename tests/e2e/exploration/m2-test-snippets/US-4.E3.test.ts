import { test, expect, formulairePret, S4, dbTrajets } from "./_aides";

test.describe("US-4.E3 — Calcul trop long", () => {
  test.describe("Edge Case", () => {
    // MOCKED: délai de 3 s ajouté à la VRAIE requête (route.continue après attente) — le backend réel est appelé
    test("US-4.E3 — « Calcul de l'itinéraire… » + Annuler (focus dessus) ramène au formulaire ; la réponse tardive ne change rien", async ({ page }) => {
      await formulairePret(page, "Albi", "Toulouse");
      await page.route("**/functions/v1/estimer-trajet", async (r) => {
        if (r.request().method() !== "POST") return r.continue();
        await new Promise((x) => setTimeout(x, 3000));
        await r.continue().catch(() => {});
      });
      await page.locator("#bouton-calculer").click();
      await expect(S4(page, "calcul")).toBeVisible();
      await page.waitForTimeout(1200);
      await expect(page.locator('[data-el="calcul-en-cours"] .t')).toHaveText("Calcul de l'itinéraire…");
      await expect(page.locator('[data-el="annuler-calcul"]')).toBeFocused();
      await page.locator('[data-el="annuler-calcul"]').click();
      await expect(page.locator('[data-screen="S3"]')).toBeVisible();
      await expect(page.locator("#bouton-calculer")).toBeFocused();
      await page.waitForTimeout(4500);
      await expect(page.locator('[data-screen="S3"]')).toBeVisible();
      expect(await dbTrajets(page)).toEqual([]);
    });
    test("US-4.E3 — sans délai simulé, un vrai calcul laisse voir l'état de chargement avant le résultat (vrai backend)", async ({ page }) => {
      await formulairePret(page, "Albi", "Bordeaux");
      await page.locator("#bouton-calculer").click();
      await expect(S4(page, "calcul")).toBeVisible();
      await expect(page.locator('[data-el="annuler-calcul"]')).toBeVisible();
      await expect(S4(page, "ok")).toBeVisible({ timeout: 45000 });
    });
  });
});
