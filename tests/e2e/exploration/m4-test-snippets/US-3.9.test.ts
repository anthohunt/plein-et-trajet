import { test, expect, ouvrirTrajets, choisirVoiture, champ, propositions, lireResultat, virgule, env } from "./_aides";

test.describe("US-3.9 — Aller au Royaume-Uni", () => {
  test.describe("Happy Path", () => {
    test("US-3.9 — Albi → Londres : Royaume-Uni au prix moyen du jour (€), Manche non comptée, pas d'Eurotunnel dans les péages", async ({ page }) => {
      test.setTimeout(150_000);
      await ouvrirTrajets(page);
      await champ(page, "depart").pressSequentially("Albi", { delay: 40 });
      await propositions(page, "depart").filter({ hasText: "Albi" }).first().click();
      await champ(page, "arrivee").pressSequentially("Londres", { delay: 40 });
      const o = propositions(page, "arrivee").filter({ hasText: "Royaume-Uni" }).first();
      await expect(o).toContainText("Londres");
      await o.click();
      await choisirVoiture(page);
      await page.locator("#bouton-calculer").click();
      await expect(page.locator('[data-screen="S4"][data-etat="ok"]')).toBeVisible({ timeout: 90_000 });
      const r = await lireResultat(page);
      expect(r.route).toMatch(/ALBI → LONDRES/i);
      const moy = await fetch(`${env.VITE_SUPABASE_URL}/rest/v1/rpc/moyennes_par_pays`, { method: "POST", headers: { apikey: env.VITE_SUPABASE_ANON_KEY, "Content-Type": "application/json" }, body: JSON.stringify({ p_carburant: "SP95-E10" }) }).then((x) => x.json());
      const gb = moy.find((x: { pays: string }) => x.pays === "GB");
      const ligne = page.locator('[data-el="pays-traverses"] [data-pays="GB"]');
      await expect(ligne).toHaveAttribute("data-source", "flux");
      await expect(ligne).toContainText(`Royaume-Uni`);
      await expect(ligne).toContainText(virgule(Number(gb.prix_moyen), 3));
      await expect(ligne).toContainText("stations");
      await expect(page.locator('[data-el="manche-non-comptee"]')).toHaveText("Traversée de la Manche (tunnel ou ferry) non comptée : ni son prix, ni ses kilomètres.");
      await expect(page.locator('[data-el="detail-peages"]')).not.toContainText("Eurotunnel");
    });
  });
});
