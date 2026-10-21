import { test, expect, D, PTS, avecVoiture, demarrer, arreter, direct, rejouer, lireIdb, moyenne, virgule, nb, euros2 } from "./_aides";

test.describe("V-2.E1 — Code inconnu", () => {
  test.describe("Edge Case", () => {
    test("V-2.E1 — « ZZ9999 » : code introuvable, bouton désactivé", async ({ page }) => {
      await page.goto("/voiture");
      await page.locator("#d2").pressSequentially("ZZ9999");
      await expect(page.locator(D("erreur-d2"))).toHaveText("Code introuvable. Vérifie la case D.2, ou cherche par nom ci-dessous.", { timeout: 40_000 });
      await expect(page.locator(D("enregistrer-voiture"))).toBeDisabled();
    });
    // MOCKED: la vraie base européenne ne tombe pas sur commande — la réponse de voiture-eea est remplacée par un 502
    test("V-2.E1 — base injoignable : message, « Réessayer », saisie gardée", async ({ page }) => {
      await page.route("**/functions/v1/voiture-eea**", (r) => r.fulfill({ status: 502, contentType: "application/json", body: '{"erreur":"base_injoignable"}' }));
      await page.goto("/voiture");
      await page.locator("#d2").pressSequentially("5RBF0A");
      await expect(page.locator(D("erreur-d2"))).toContainText("La base européenne des voitures ne répond pas.");
      await expect(page.locator(D("reessayer-d2"))).toHaveText("Réessayer");
      await expect(page.locator("#d2")).toHaveValue("5RBF0A");
      await page.unroute("**/functions/v1/voiture-eea**");
      await page.locator(D("reessayer-d2")).tap();
      await expect(page.locator(D("fiche-carburant"))).toHaveText("Gazole", { timeout: 40_000 });
    });
  });
});
