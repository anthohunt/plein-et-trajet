import { test, expect, session, env, appelerMoteurs, restService, attendreFormulaire } from "./_aides";

// l'onglet Trajets crée la connexion anonyme de l'appareil
async function ouvrirEnVisiteur(page: import("@playwright/test").Page) {
  await page.goto("/trajets");
  await attendreFormulaire(page);
  await page.getByRole("tab", { name: "Prix" }).click();
  await expect(page.locator('[data-el="ligne-station"]').first()).toBeVisible({ timeout: 20000 });
}

test.describe("US-5.E1 — Moteurs invisibles aux visiteurs", () => {
  test.describe("Edge Case", () => {
    test("US-5.E1 — visiteur anonyme : pas de bouton ⚙ ; /moteurs renvoie aux prix", async ({ page }) => {
      await page.goto("/");
      await expect(page.locator('[data-el="ligne-station"]').first()).toBeVisible({ timeout: 20000 });
      await expect(page.locator('[data-el="bouton-moteurs"]')).toHaveCount(0);
      await page.goto("/moteurs");
      await expect(page.locator('[data-screen="S1"]')).toBeVisible({ timeout: 15000 });
      await expect(page.locator('[data-screen="S5"]')).toHaveCount(0);
      expect(new URL(page.url()).pathname).toBe("/");
    });
    test("US-5.E1 — le serveur refuse toute lecture et écriture de la table des moteurs (RLS), des clés et de la fonction", async ({ page }) => {
      await ouvrirEnVisiteur(page);
      const { jeton } = await session(page);
      const h = { apikey: env.VITE_SUPABASE_ANON_KEY, Authorization: `Bearer ${jeton}`, "Content-Type": "application/json", Prefer: "return=representation" };
      const base = `${env.SUPABASE_URL}/rest/v1`;
      expect((await restService("moteurs?select=service")).corps).toHaveLength(6);
      expect(await (await fetch(`${base}/moteurs?select=service`, { headers: h })).json()).toEqual([]);
      expect((await fetch(`${base}/moteurs`, { method: "POST", headers: h, body: JSON.stringify({ service: "pirate", nom: "x", description: "x", actif: "ptv" }) })).status).toBeGreaterThanOrEqual(400);
      expect(await (await fetch(`${base}/moteurs?service=eq.peages`, { method: "PATCH", headers: h, body: JSON.stringify({ actif: "here" }) })).json()).toEqual([]);
      expect(await (await fetch(`${base}/moteurs?service=eq.peages`, { method: "DELETE", headers: h })).json()).toEqual([]);
      expect((await fetch(`${base}/cles_fournisseurs?select=*`, { headers: h })).status).toBeGreaterThanOrEqual(400);
      expect((await fetch(`${base}/rpc/moteur_cle`, { method: "POST", headers: h, body: JSON.stringify({ p_fournisseur: "ptv" }) })).status).toBeGreaterThanOrEqual(400);
      expect((await appelerMoteurs(jeton, { action: "lister" })).statut).toBe(403);
      expect((await appelerMoteurs(env.VITE_SUPABASE_ANON_KEY, { action: "lister" })).statut).toBe(401);
      expect((await restService("moteurs?select=actif&service=eq.peages")).corps[0].actif).toBe("ptv");
    });
    test("US-5.E1 — un utilisateur ne peut pas se donner le rôle admin (user_metadata ignoré)", async ({ page }) => {
      await ouvrirEnVisiteur(page);
      const { jeton } = await session(page);
      const r = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, { method: "PUT", headers: { apikey: env.VITE_SUPABASE_ANON_KEY, Authorization: `Bearer ${jeton}`, "Content-Type": "application/json" }, body: JSON.stringify({ data: { role: "admin" } }) });
      expect(r.status).toBeLessThan(500);
      const s2 = await (await fetch(`${env.SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, { method: "POST", headers: { apikey: env.VITE_SUPABASE_ANON_KEY, "Content-Type": "application/json" }, body: JSON.stringify({ refresh_token: (await page.evaluate(() => JSON.parse(localStorage.getItem("pt-auth")!).refresh_token)) }) })).json();
      expect((await appelerMoteurs(s2.access_token, { action: "lister" })).statut).toBe(403);
      await page.goto("/");
      await expect(page.locator('[data-el="bouton-moteurs"]')).toHaveCount(0);
    });
  });
});
