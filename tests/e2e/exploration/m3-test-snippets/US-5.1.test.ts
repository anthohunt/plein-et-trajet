import { test, expect, connecterAdmin, ouvrirMoteurs, session, env } from "./_aides";

test.describe("US-5.1 — Ouvrir les moteurs", () => {
  test.describe("Happy Path", () => {
    test("US-5.1 — connecté par lien magique : ⚙ visible ; il ouvre l'écran Moteurs et ses 6 services", async ({ page }) => {
      await connecterAdmin(page, { vers: "accueil" });
      const s = await session(page);
      const u = await (await fetch(`${env.SUPABASE_URL}/auth/v1/user`, { headers: { apikey: env.VITE_SUPABASE_ANON_KEY, Authorization: `Bearer ${s.jeton}` } })).json();
      expect(u.app_metadata.role).toBe("admin");
      await ouvrirMoteurs(page);
      expect((await page.locator('[data-el="moteur"] h3').allInnerTexts()).map((t) => t.split("\n")[0].trim())).toEqual(["PRIX DES STATIONS", "PRIX MOYENS PAR PAYS", "ITINÉRAIRE", "PÉAGES", "VOITURES", "RECHERCHE DE LIEUX"]);
      await expect(page.locator('[data-el="etat-moteur"]')).toHaveCount(6);
      await expect(page.locator('[data-el="bouton-moteurs"]')).toHaveAttribute("aria-pressed", "true");
    });
  });
  test.describe("Edge Case", () => {
    test("US-5.1 — l'adresse /moteurs ouverte par le lien magique affiche directement S5 ; « ← Retour » revient aux prix", async ({ page }) => {
      await connecterAdmin(page);
      await expect(page.locator('[data-el="moteur"]')).toHaveCount(6, { timeout: 20000 });
      await page.locator('[data-el="retour-moteurs"]').click();
      await expect(page.locator('[data-screen="S1"]')).toBeVisible();
    });
  });
});
