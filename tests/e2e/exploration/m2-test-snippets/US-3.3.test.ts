import { test, expect, ouvrirTrajets, champ, propositions } from "./_aides";

test.describe("US-3.3 — Saisir l'arrivée", () => {
  test.describe("Happy Path", () => {
    test("US-3.3 — « Bord » propose Bordeaux en tête (communes d'abord) ; je le choisis", async ({ page }) => {
      await ouvrirTrajets(page);
      await champ(page, "arrivee").pressSequentially("Bord", { delay: 50 });
      await expect(propositions(page, "arrivee").first()).toBeVisible();
      const noms = await propositions(page, "arrivee").locator(".sugg-l").allTextContents();
      expect(noms[0]).toBe("Bordeaux");
      await expect(propositions(page, "arrivee").first()).toContainText("Gironde");
      await propositions(page, "arrivee").first().click();
      await expect(champ(page, "arrivee")).toHaveValue("Bordeaux");
    });
  });
  test.describe("Edge Case", () => {
    test("US-3.3 — l'arrivée peut être une adresse (chiffres tapés → adresses proposées)", async ({ page }) => {
      await ouvrirTrajets(page);
      await champ(page, "arrivee").pressSequentially("12 rue de la République Albi", { delay: 20 });
      await expect(propositions(page, "arrivee").first()).toBeVisible();
      expect(await propositions(page, "arrivee").first().innerText()).toMatch(/\d/);
    });
  });
});
