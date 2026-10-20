import { test, expect, connecterAdmin, carte, etatCarte, modifieLesMoteurs, sqlGestion, empreinteCles, lireEtatReel, cleEnMemoire } from "./_aides";

const FAUSSE = "FAUX-CLE-ESSAI-8e4a";
test.describe("US-5.3 — Coller la clé", () => {
  modifieLesMoteurs();
  test.use({ permissions: ["geolocation", "clipboard-read", "clipboard-write"] }); // pour COLLER la clé (presse-papiers + Ctrl+V)
  test.describe("Happy Path", () => {
    test("US-5.3 — je colle la VRAIE clé PTV et j'enregistre : testée, rangée chiffrée dans Vault (même valeur), le champ n'affiche que ••••+4", async ({ page }) => {
      const reel = await lireEtatReel(); // en mémoire seulement ; jamais écrite dans un fichier, un log ni une sortie
      test.skip(!reel.cles.ptv, "aucune clé PTV enregistrée : le manager doit la remettre");
      const [{ updated_at: avant }] = await sqlGestion("select updated_at from vault.decrypted_secrets where name = 'cle_ptv'");
      await connecterAdmin(page);
      await expect(page.locator('[data-el="moteur"]')).toHaveCount(6, { timeout: 20000 });
      const champ = carte(page, "peages").locator('[data-el="champ-cle"]');
      await page.evaluate((v) => navigator.clipboard.writeText(v), reel.cles.ptv);
      await champ.focus();
      await page.keyboard.press("Control+V");
      expect((await champ.inputValue()) === reel.cles.ptv).toBe(true); // booléen : la valeur n'apparaît jamais dans un message d'échec
      await page.evaluate(() => navigator.clipboard.writeText(""));
      await carte(page, "peages").locator('[data-el="enregistrer-moteur"]').click();
      await expect(etatCarte(page, "peages")).toHaveText("Enregistré · utilisé dès le prochain calcul", { timeout: 45000 });
      expect(await champ.inputValue()).toBe("");
      await expect(champ).toHaveAttribute("placeholder", `Clé ••••${reel.cles.ptv.slice(-4)} · coller pour changer`);
      const [v] = await sqlGestion("select updated_at, secret is distinct from decrypted_secret as chiffre from vault.decrypted_secrets where name = 'cle_ptv'");
      expect(v.chiffre).toBe(true);
      expect(v.updated_at > avant).toBe(true);
      expect((await cleEnMemoire("ptv")) === reel.cles.ptv).toBe(true);
    });
    test("US-5.3 — la vraie clé PTV est rangée dans Vault (chiffrée) ; le champ n'affiche que ses 4 derniers caractères ; la clé n'est jamais dans la page ni le réseau", async ({ page }) => {
      const reel = await lireEtatReel(); // en mémoire seulement
      test.skip(!reel.cles.ptv, "aucune clé PTV enregistrée : le manager doit la remettre");
      const reponses: string[] = [];
      page.on("response", async (r) => { if (/supabase\.co/.test(r.url())) reponses.push(await r.text().catch(() => "")); });
      await connecterAdmin(page);
      await expect(page.locator('[data-el="moteur"]')).toHaveCount(6, { timeout: 20000 });
      const champ = carte(page, "peages").locator('[data-el="champ-cle"]');
      await expect(champ).toHaveAttribute("type", "password");
      await expect(champ).toHaveAttribute("placeholder", /^Clé ••••.{4} · coller pour changer$/);
      expect(await champ.inputValue()).toBe("");
      const [{ fin }] = await sqlGestion("select fin from public.cles_fournisseurs where fournisseur = 'ptv'");
      expect(reel.cles.ptv.endsWith(fin)).toBe(true);
      const [v] = await sqlGestion("select secret is distinct from decrypted_secret as chiffre from vault.decrypted_secrets where name = 'cle_ptv'");
      expect(v.chiffre).toBe(true);
      reponses.length = 0;
      await page.reload();
      await expect(page.locator('[data-el="moteur"]')).toHaveCount(6, { timeout: 20000 });
      // comparaisons BOOLÉENNES seulement (audit round 3, MEDIUM 2) : un not.toContain(cle) en échec imprimerait la clé ;
      // en cas d'échec, le message ne nomme que le fournisseur concerné
      const contenu = await page.content();
      const champs = (await page.locator("input").evaluateAll((els) => els.map((e: any) => e.value + "|" + e.placeholder))).join("\n");
      for (const [fournisseur, cle] of Object.entries(reel.cles) as [string, string][]) {
        expect(contenu.includes(cle), `clé ${fournisseur} présente dans la page`).toBe(false);
        expect(champs.includes(cle), `clé ${fournisseur} présente dans un champ`).toBe(false);
        expect(reponses.some((t) => t.includes(cle)), `clé ${fournisseur} présente dans une réponse réseau`).toBe(false);
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
      // refus écrit une seule fois (audit round 2, LOW 8)
      await expect(etatCarte(page, "peages")).toHaveText("Clé refusée par PTV (401) · clé non enregistrée, ancienne clé conservée · fournisseur actif inchangé", { timeout: 45000 });
      expect(await empreinteCles()).toBe(avant);
    });
  });
});
