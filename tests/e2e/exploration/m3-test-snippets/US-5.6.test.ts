import { test, expect, connecterAdmin, carte, appelerMoteurs, session } from "./_aides";
import fs from "node:fs";
import path from "node:path";

test.describe("US-5.6 — Où trouver ma clé", () => {
  test.describe("Happy Path", () => {
    test("US-5.6 — PTV : lien « Où trouver ma clé » (nouvel onglet) vers developer.myptv.com avec la consigne « API Keys » ; le lien charge", async ({ page, context }) => {
      await connecterAdmin(page);
      await expect(page.locator('[data-el="moteur"]')).toHaveCount(6, { timeout: 20000 });
      const lien = carte(page, "peages").locator('[data-el="lien-cle"] a');
      await expect(lien).toHaveText("Où trouver ma clé");
      await expect(lien).toHaveAttribute("href", "https://developer.myptv.com/en");
      await expect(lien).toHaveAttribute("target", "_blank");
      await expect(lien).toHaveAttribute("rel", "noopener noreferrer");
      await expect(carte(page, "peages").locator('[data-el="consigne-cle"]')).toContainText("API Keys");
      const [onglet] = await Promise.all([context.waitForEvent("page"), lien.click()]);
      await onglet.waitForLoadState("domcontentloaded");
      expect(onglet.url()).toContain("developer.myptv.com");
      expect(await onglet.title()).toMatch(/PTV/i);
      await onglet.close();
    });
    test("US-5.6 — Stadia (choisi pour l'itinéraire) : lien vers client.stadiamaps.com/dashboard/", async ({ page }) => {
      await connecterAdmin(page);
      await expect(page.locator('[data-el="moteur"]')).toHaveCount(6, { timeout: 20000 });
      await carte(page, "itineraire").locator("select").first().selectOption("stadia");
      await expect(carte(page, "itineraire").locator('[data-el="lien-cle"] a')).toHaveAttribute("href", "https://client.stadiamaps.com/dashboard/");
      await expect(carte(page, "itineraire").locator('[data-el="lien-cle"] a')).toHaveAttribute("target", "_blank");
    });
    test("US-5.6 — HERE (secours des péages) et Tankerkönig (stations) ont leur lien", async ({ page }) => {
      await connecterAdmin(page);
      await expect(page.locator('[data-el="moteur"]')).toHaveCount(6, { timeout: 20000 });
      await carte(page, "peages").locator('[data-el="choix-fournisseur"]').selectOption("here");
      await expect(carte(page, "peages").locator('[data-el="lien-cle"] a')).toHaveAttribute("href", "https://platform.here.com/access/apps");
      await carte(page, "prix").locator("select").first().selectOption("tankerkoenig");
      await expect(carte(page, "prix").locator('[data-el="lien-cle"] a')).toHaveAttribute("href", "https://creativecommons.tankerkoenig.de/");
    });
  });
  test.describe("Edge Case", () => {
    test("US-5.6 — un fournisseur sans clé (Voitures, Prix moyens) n'a aucun lien", async ({ page }) => {
      await connecterAdmin(page);
      await expect(page.locator('[data-el="moteur"]')).toHaveCount(6, { timeout: 20000 });
      for (const s of ["voitures", "moyennes", "lieux"]) await expect(carte(page, s).locator('[data-el="lien-cle"]')).toHaveCount(0);
    });
    test("US-5.6 — le lien et la consigne viennent de la fonction moteurs (table fournisseurs), pas du composant", async ({ page }) => {
      await connecterAdmin(page);
      await expect(page.locator('[data-el="moteur"]')).toHaveCount(6, { timeout: 20000 });
      const { jeton } = await session(page);
      const r = await appelerMoteurs(jeton, { action: "lister" });
      const fs_ = r.corps.moteurs.flatMap((m: any) => m.fournisseurs);
      expect(fs_.find((f: any) => f.id === "ptv").url_cle).toBe("https://developer.myptv.com/en");
      expect(fs_.find((f: any) => f.id === "ptv").consigne_cle).toContain("API Keys");
      expect(fs_.filter((f: any) => !f.cle_requise).every((f: any) => f.url_cle === null && f.consigne_cle === null)).toBe(true);
      // rien en dur dans l'interface : aucune de ces adresses dans le code source du front
      const src = ["src/routes/Moteurs.tsx", "src/lib/textes.ts", "src/lib/moteurs.ts"].map((f) => fs.readFileSync(path.resolve(f), "utf8")).join("\n");
      for (const u of ["myptv.com", "stadiamaps.com", "platform.here.com", "tankerkoenig.de"]) expect(src).not.toContain(u);
    });
  });
});
