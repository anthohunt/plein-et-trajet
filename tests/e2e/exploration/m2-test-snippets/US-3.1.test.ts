import { test, expect, ouvrirTrajets, attendreFormulaire, champ, session, rest } from "./_aides";

test.describe("US-3.1 — Ouvrir les trajets", () => {
  test.describe("Happy Path", () => {
    test("US-3.1 — l'onglet Trajets affiche le formulaire et l'historique", async ({ page }) => {
      await page.goto("/");
      await expect(page.locator('[data-el="ligne-station"]').first()).toBeVisible();
      await expect(page.getByRole("tab", { name: "Prix" })).toHaveAttribute("aria-selected", "true");
      await page.getByRole("tab", { name: "Trajets" }).click();
      await attendreFormulaire(page);
      await expect(page.getByRole("tab", { name: "Trajets" })).toHaveAttribute("aria-selected", "true");
      await expect(champ(page, "depart")).toBeVisible();
      await expect(champ(page, "arrivee")).toBeVisible();
      await expect(page.locator('[data-el="choix-voiture"]')).toBeVisible();
      await expect(page.getByRole("button", { name: "Calculer le coût" })).toBeVisible();
      await expect(page.locator('[data-el="historique"]')).toContainText("Derniers trajets");
    });
  });
  test.describe("Edge Case", () => {
    test("US-3.1 — ouverture directe sur /trajets : session anonyme créée, historique chargé depuis la base", async ({ page }) => {
      await ouvrirTrajets(page);
      const s = await session(page);
      expect(s?.userId).toMatch(/^[0-9a-f-]{36}$/);
      expect(await rest("trajets?select=id", s.jeton)).toEqual([]);
      await expect(page.locator('[data-el="historique"]')).toHaveAttribute("data-etat", "ok");
    });
  });
});
