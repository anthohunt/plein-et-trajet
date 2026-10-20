import { test, expect, trajetCalcule, dbTrajets, lignesHistorique, attendreFormulaire, session, rest } from "./_aides";

test.describe("US-3.7 — Supprimer un trajet", () => {
  test.describe("Happy Path", () => {
    test("US-3.7 — la croix supprime la ligne en base ; elle ne revient pas au rechargement", async ({ page }) => {
      await trajetCalcule(page, "Albi", "Toulouse");
      await page.locator('[data-el="retour-trajets"]').click();
      await expect(lignesHistorique(page)).toHaveCount(1);
      const id = (await dbTrajets(page))[0].id;
      await expect(page.locator('[data-el="supprimer-trajet"]')).toHaveAttribute("aria-label", "Supprimer le trajet Albi → Toulouse");
      await page.locator('[data-el="supprimer-trajet"]').click();
      await expect(page.locator('[data-el="historique-vide"]')).toBeVisible();
      expect((await dbTrajets(page)).some((t) => t.id === id)).toBe(false);
      await page.reload();
      await attendreFormulaire(page);
      await expect(page.locator('[data-el="historique-vide"]')).toBeVisible();
      await expect(lignesHistorique(page)).toHaveCount(0);
    });
  });
  test.describe("Edge Case", () => {
    test("US-3.7 — l'historique est privé : une autre identité anonyme ne voit pas le trajet (RLS)", async ({ page, browser }) => {
      await trajetCalcule(page, "Albi", "Toulouse");
      const autre = await browser.newContext({ baseURL: process.env.APP_URL ?? "https://plein-et-trajet.vercel.app" });
      const p2 = await autre.newPage();
      await p2.goto("/trajets");
      await attendreFormulaire(p2);
      const s2 = await session(p2);
      expect(await rest("trajets?select=id", s2.jeton)).toEqual([]);
      await expect(p2.locator('[data-el="historique-vide"]')).toBeVisible();
      await autre.close();
    });
  });
});
