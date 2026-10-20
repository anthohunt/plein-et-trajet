import { test, expect, ouvrirTrajets, champ, propositions } from "./_aides";

test.describe("US-3.2 — Saisir le départ", () => {
  test.describe("Happy Path", () => {
    test("US-3.2 — « Alb » propose des lieux réels (géocodeur IGN) dont Albi ; je choisis Albi", async ({ page }) => {
      await ouvrirTrajets(page);
      await expect(champ(page, "depart")).toHaveValue("");
      await champ(page, "depart").pressSequentially("Alb", { delay: 50 });
      await expect(propositions(page, "depart").first()).toBeVisible();
      const noms = await propositions(page, "depart").locator(".sugg-l").allTextContents();
      expect(noms.length).toBeGreaterThanOrEqual(3);
      expect(noms).toContain("Albi");
      await propositions(page, "depart").filter({ hasText: "Albi" }).first().click();
      await expect(champ(page, "depart")).toHaveValue("Albi");
      await expect(propositions(page, "depart")).toHaveCount(0);
    });
  });
  test.describe("Edge Case", () => {
    test("US-3.2 — un seul caractère : aucune proposition ; flèches et Entrée choisissent au clavier ; Échap ferme", async ({ page }) => {
      await ouvrirTrajets(page);
      await champ(page, "depart").pressSequentially("A", { delay: 50 });
      await page.waitForTimeout(600);
      await expect(propositions(page, "depart")).toHaveCount(0);
      await champ(page, "depart").pressSequentially("lb", { delay: 50 });
      await expect(propositions(page, "depart").first()).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(propositions(page, "depart")).toHaveCount(0);
      await page.keyboard.press("ArrowDown");
      await expect(propositions(page, "depart").first()).toBeVisible();
      await page.keyboard.press("Enter");
      await expect(champ(page, "depart")).toHaveValue("Albi");
    });
  });
});
