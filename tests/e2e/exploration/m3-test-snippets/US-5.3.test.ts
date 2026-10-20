import { test, expect, connecterAdmin, carte, etatCarte, modifieLesMoteurs, sqlGestion } from "./_aides";

const FAUSSE = "FAUSSE-CLE-ESSAI-8e4a";
test.describe("US-5.3 — Coller la clé", () => {
  modifieLesMoteurs();
  test.describe("Happy Path", () => {
    test("US-5.3 — la clé collée est rangée dans Vault (chiffrée) ; le champ n'affiche que ses 4 derniers caractères ; jamais dans le réseau", async ({ page }) => {
      const reponses: string[] = [];
      page.on("response", async (r) => { if (/supabase\.co/.test(r.url())) reponses.push(await r.text().catch(() => "")); });
      await connecterAdmin(page);
      await expect(page.locator('[data-el="moteur"]')).toHaveCount(6, { timeout: 20000 });
      const champ = carte(page, "peages").locator('[data-el="champ-cle"]');
      await expect(champ).toHaveAttribute("type", "password");
      await champ.fill(FAUSSE);
      await carte(page, "peages").locator('[data-el="enregistrer-moteur"]').click();
      await expect(champ).toHaveAttribute("placeholder", "Clé enregistrée ••••8e4a — coller pour remplacer", { timeout: 20000 });
      expect(await champ.inputValue()).toBe("");
      const [{ fin }] = await sqlGestion("select fin from public.cles_fournisseurs where fournisseur = 'ptv'");
      expect(fin).toBe("8e4a");
      const [v] = await sqlGestion(`select secret <> '${FAUSSE}' as chiffre from vault.secrets where name = 'cle_ptv'`);
      expect(v.chiffre).toBe(true);
      expect(reponses.some((t) => t.includes(FAUSSE))).toBe(false);
    });
  });
  test.describe("Edge Case", () => {
    test("US-5.3 — après rechargement, la clé complète n'est ni dans la page, ni dans les champs, ni dans les réponses réseau", async ({ page }) => {
      const reponses: string[] = [];
      page.on("response", async (r) => { if (/supabase\.co/.test(r.url())) reponses.push(await r.text().catch(() => "")); });
      await connecterAdmin(page);
      await expect(page.locator('[data-el="moteur"]')).toHaveCount(6, { timeout: 20000 });
      await carte(page, "peages").locator('[data-el="champ-cle"]').fill(FAUSSE);
      await carte(page, "peages").locator('[data-el="enregistrer-moteur"]').click();
      await expect(carte(page, "peages").locator('[data-el="champ-cle"]')).toHaveAttribute("placeholder", /••••8e4a/, { timeout: 20000 });
      reponses.length = 0;
      await page.reload();
      await expect(page.locator('[data-el="moteur"]')).toHaveCount(6, { timeout: 20000 });
      expect(await page.content()).not.toContain(FAUSSE);
      expect((await page.locator("input").evaluateAll((els) => els.map((e: any) => e.value + "|" + e.placeholder))).join("\n")).not.toContain(FAUSSE);
      expect(reponses.some((t) => t.includes(FAUSSE))).toBe(false);
      expect(reponses.some((t) => t.includes('"cle_fin":"8e4a"'))).toBe(true);
    });
    test("US-5.3 — une nouvelle clé remplace l'ancienne (même secret Vault, nouvelle fin)", async ({ page }) => {
      await connecterAdmin(page);
      await expect(page.locator('[data-el="moteur"]')).toHaveCount(6, { timeout: 20000 });
      for (const [cle, fin] of [["PREMIERE-CLE-1111", "1111"], ["SECONDE-CLE-2222", "2222"]]) {
        await carte(page, "peages").locator('[data-el="champ-cle"]').fill(cle);
        await carte(page, "peages").locator('[data-el="enregistrer-moteur"]').click();
        await expect(carte(page, "peages").locator('[data-el="champ-cle"]')).toHaveAttribute("placeholder", new RegExp(`••••${fin}`), { timeout: 20000 });
      }
      const [n] = await sqlGestion("select count(*)::int as n from vault.secrets where name = 'cle_ptv'");
      expect(n.n).toBe(1);
    });
  });
});
