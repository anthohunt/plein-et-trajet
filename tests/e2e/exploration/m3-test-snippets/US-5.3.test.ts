import { test, expect, connecterAdmin, carte, etatCarte, modifieLesMoteurs, sqlGestion, injecterCle } from "./_aides";

const FAUSSE = "FAUSSE-CLE-ESSAI-8e4a";
test.describe("US-5.3 — Coller la clé", () => {
  modifieLesMoteurs();
  test.describe("Happy Path", () => {
    test("US-5.3 — une clé collée est TESTÉE avant d'être écrite : la clé factice est refusée par le vrai PTV, rien n'est rangé dans Vault", async ({ page }) => {
      await connecterAdmin(page);
      await expect(page.locator('[data-el="moteur"]')).toHaveCount(6, { timeout: 20000 });
      const champ = carte(page, "peages").locator('[data-el="champ-cle"]');
      await expect(champ).toHaveAttribute("type", "password");
      await champ.fill(FAUSSE);
      await carte(page, "peages").locator('[data-el="enregistrer-moteur"]').click();
      await expect(carte(page, "peages").locator('[data-el="etat-moteur"]')).toContainText("clé non enregistrée", { timeout: 45000 });
      await expect(etatCarte(page, "peages")).toContainText("Clé refusée par PTV (401)");
      await expect(champ).toHaveAttribute("placeholder", "Coller la clé d'API");
      const [{ n }] = await sqlGestion("select count(*)::int as n from vault.secrets where name = 'cle_ptv'");
      expect(n).toBe(0);
    });
    test("US-5.3 — BLOQUÉ-CLÉ : avec une clé PTV valide, elle est rangée chiffrée et le champ n'affiche que ses 4 derniers caractères", async () => {
      test.info().annotations.push({ type: "BLOQUÉ-CLÉ", description: "il manque une clé PTV valide" });
      test.skip(true, "BLOQUÉ-CLÉ : aucune clé PTV valide ; le stockage chiffré et le masquage sont prouvés sur une clé amorcée côté serveur (test suivant)");
    });
    test("US-5.3 — clé rangée dans Vault (amorce serveur) : chiffrée, fin « 8e4a » seule affichée, jamais dans la page ni le réseau", async ({ page }) => {
      await injecterCle("ptv", FAUSSE);
      const reponses: string[] = [];
      page.on("response", async (r) => { if (/supabase\.co/.test(r.url())) reponses.push(await r.text().catch(() => "")); });
      await connecterAdmin(page);
      await expect(page.locator('[data-el="moteur"]')).toHaveCount(6, { timeout: 20000 });
      const champ = carte(page, "peages").locator('[data-el="champ-cle"]');
      await expect(champ).toHaveAttribute("placeholder", "Clé enregistrée ••••8e4a — coller pour remplacer");
      expect(await champ.inputValue()).toBe("");
      const [{ fin }] = await sqlGestion("select fin from public.cles_fournisseurs where fournisseur = 'ptv'");
      expect(fin).toBe("8e4a");
      const [v] = await sqlGestion(`select secret <> '${FAUSSE}' as chiffre from vault.secrets where name = 'cle_ptv'`);
      expect(v.chiffre).toBe(true);
      reponses.length = 0;
      await page.reload();
      await expect(page.locator('[data-el="moteur"]')).toHaveCount(6, { timeout: 20000 });
      expect(await page.content()).not.toContain(FAUSSE);
      expect((await page.locator("input").evaluateAll((els) => els.map((e: any) => e.value + "|" + e.placeholder))).join("\n")).not.toContain(FAUSSE);
      expect(reponses.some((t) => t.includes(FAUSSE))).toBe(false);
      expect(reponses.some((t) => t.includes('"cle_fin":"8e4a"'))).toBe(true);
    });
  });
  test.describe("Edge Case", () => {
    test("US-5.3 — une clé invalide collée ne remplace PAS la clé enregistrée (fin inchangée, ancienne clé conservée)", async ({ page }) => {
      await injecterCle("ptv", "ANCIENNE-CLE-1111");
      await connecterAdmin(page);
      await expect(page.locator('[data-el="moteur"]')).toHaveCount(6, { timeout: 20000 });
      await carte(page, "peages").locator('[data-el="champ-cle"]').fill("FAUTE-DE-FRAPPE-2222");
      await carte(page, "peages").locator('[data-el="enregistrer-moteur"]').click();
      await expect(etatCarte(page, "peages")).toContainText("ancienne clé conservée", { timeout: 45000 });
      const [{ fin }] = await sqlGestion("select fin from public.cles_fournisseurs where fournisseur = 'ptv'");
      expect(fin).toBe("1111");
      const [n] = await sqlGestion("select count(*)::int as n from vault.secrets where name = 'cle_ptv'");
      expect(n.n).toBe(1);
    });
  });
});
