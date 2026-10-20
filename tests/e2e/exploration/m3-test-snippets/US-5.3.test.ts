import { test, expect, connecterAdmin, carte, etatCarte, modifieLesMoteurs, sqlGestion, empreinteCles, lireEtatReel } from "./_aides";

const FAUSSE = "FAUX-CLE-ESSAI-8e4a";
test.describe("US-5.3 — Coller la clé", () => {
  modifieLesMoteurs();
  test.describe("Happy Path", () => {
    test("US-5.3 — la vraie clé PTV est rangée dans Vault (chiffrée) ; le champ n'affiche que ses 4 derniers caractères ; la clé n'est jamais dans la page ni le réseau", async ({ page }) => {
      const reel = await lireEtatReel(); // en mémoire seulement
      test.skip(!reel.cles.ptv, "aucune clé PTV enregistrée : le manager doit la remettre");
      const reponses: string[] = [];
      page.on("response", async (r) => { if (/supabase\.co/.test(r.url())) reponses.push(await r.text().catch(() => "")); });
      await connecterAdmin(page);
      await expect(page.locator('[data-el="moteur"]')).toHaveCount(6, { timeout: 20000 });
      const champ = carte(page, "peages").locator('[data-el="champ-cle"]');
      await expect(champ).toHaveAttribute("type", "password");
      await expect(champ).toHaveAttribute("placeholder", /^Clé enregistrée ••••.{4} — coller pour remplacer$/);
      expect(await champ.inputValue()).toBe("");
      const [{ fin }] = await sqlGestion("select fin from public.cles_fournisseurs where fournisseur = 'ptv'");
      expect(reel.cles.ptv.endsWith(fin)).toBe(true);
      const [v] = await sqlGestion("select secret is distinct from decrypted_secret as chiffre from vault.decrypted_secrets where name = 'cle_ptv'");
      expect(v.chiffre).toBe(true);
      reponses.length = 0;
      await page.reload();
      await expect(page.locator('[data-el="moteur"]')).toHaveCount(6, { timeout: 20000 });
      for (const cle of Object.values(reel.cles) as string[]) {
        expect(await page.content()).not.toContain(cle);
        expect((await page.locator("input").evaluateAll((els) => els.map((e: any) => e.value + "|" + e.placeholder))).join("\n")).not.toContain(cle);
        expect(reponses.some((t) => t.includes(cle))).toBe(false);
      }
      expect(reponses.some((t) => /"cle_fin":"[^"]{4}"/.test(t))).toBe(true);
    });
  });
  test.describe("Edge Case", () => {
    test("US-5.3 — une clé collée est TESTÉE avant d'être écrite : la clé factice est refusée (401), la vraie clé reste en place", async ({ page }) => {
      const avant = await empreinteCles();
      await connecterAdmin(page);
      await expect(page.locator('[data-el="moteur"]')).toHaveCount(6, { timeout: 20000 });
      await carte(page, "peages").locator('[data-el="champ-cle"]').fill(FAUSSE);
      await carte(page, "peages").locator('[data-el="enregistrer-moteur"]').click();
      await expect(etatCarte(page, "peages")).toContainText("clé non enregistrée", { timeout: 45000 });
      await expect(etatCarte(page, "peages")).toContainText("ancienne clé conservée");
      expect(await empreinteCles()).toBe(avant);
    });
  });
});
