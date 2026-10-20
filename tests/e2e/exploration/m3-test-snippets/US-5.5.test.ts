import { test, expect, connecterAdmin, carte, etatCarte, modifieLesMoteurs, restService, formulaire, ALBI_, BARCELONE_, calculer } from "./_aides";

test.describe("US-5.5 — Enregistrer le moteur", () => {
  modifieLesMoteurs();
  test.describe("Happy Path", () => {
    test("US-5.5 — BLOQUÉ-CLÉ : HERE enregistré, Albi → Barcelone a des péages HERE sans redéploiement", async () => {
      test.info().annotations.push({ type: "BLOQUÉ-CLÉ", description: "il manque une clé HERE valide" });
      test.skip(true, "BLOQUÉ-CLÉ : aucune clé HERE n'existe ; le moteur actif est relu à chaque appel (table moteurs + Vault), la bascule n'a pas pu être vue avec de vrais montants");
    });
    test("US-5.5 — un fournisseur sans clé s'enregistre et devient actif aussitôt (itinéraire → IGN), puis retour à Valhalla", async ({ page }) => {
      await connecterAdmin(page);
      await expect(page.locator('[data-el="moteur"]')).toHaveCount(6, { timeout: 20000 });
      const c = carte(page, "itineraire");
      await c.locator("select").first().selectOption("itineraire-ign");
      await c.locator('[data-el="choix-secours-itineraire"]').selectOption(""); // sans secours : le moteur IGN seul ne couvre que la France
      await c.locator('[data-el="enregistrer-moteur-itineraire"]').click();
      await expect(etatCarte(page, "itineraire")).toContainText("Enregistré · utilisé dès le prochain calcul", { timeout: 30000 });
      expect((await restService("moteurs?select=actif&service=eq.itineraire")).corps[0].actif).toBe("itineraire-ign");
      // sans redéploiement : un trajet à l'étranger est refusé par le moteur IGN (France seule)…
      await formulaire(page, ALBI_, BARCELONE_);
      await page.locator("#bouton-calculer").click();
      await expect(page.locator('[data-el="limite-itineraire"]')).toContainText("Ce fournisseur d'itinéraire ne couvre que la France", { timeout: 30000 });
      // …et accepté dès que Stadia (clé réelle) est rétabli
      await connecterAdmin(page);
      await expect(page.locator('[data-el="moteur"]')).toHaveCount(6, { timeout: 20000 });
      await carte(page, "itineraire").locator("select").first().selectOption("stadia");
      await carte(page, "itineraire").locator('[data-el="enregistrer-moteur-itineraire"]').click();
      await expect(etatCarte(page, "itineraire")).toContainText("Enregistré", { timeout: 40000 });
      await formulaire(page, ALBI_, BARCELONE_);
      await calculer(page);
      await expect(page.locator('[data-el="pays-traverses"] li')).toHaveCount(2);
    });
  });
  test.describe("Edge Case", () => {
    test("US-5.5 — HERE sans clé : l'enregistrement est refusé et PTV reste le moteur actif", async ({ page }) => {
      await connecterAdmin(page);
      await expect(page.locator('[data-el="moteur"]')).toHaveCount(6, { timeout: 20000 });
      await carte(page, "peages").locator('[data-el="choix-fournisseur"]').selectOption("here");
      await carte(page, "peages").locator('[data-el="enregistrer-moteur"]').click();
      await expect(etatCarte(page, "peages")).toContainText("Aucune clé : colle-la d'abord", { timeout: 30000 });
      expect((await restService("moteurs?select=actif&service=eq.peages")).corps[0].actif).toBe("ptv");
    });
  });
});
