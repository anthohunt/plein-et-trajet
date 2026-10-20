import { test, expect, formulairePret, calculer, propositions, champ } from "./_aides";

test.describe("US-A11Y-003 — Touche Échap", () => {
  test.describe("Happy Path", () => {
    test("US-A11Y-003 — S4 : Échap replie le tronçon déplié, le focus reste sur son bouton", async ({ page }) => {
      await formulairePret(page, "Albi", "Toulouse");
      await calculer(page);
      await page.locator("#troncon-0").focus();
      await page.keyboard.press("Enter");
      await expect(page.locator("#troncon-0")).toHaveAttribute("aria-expanded", "true");
      await page.keyboard.press("Escape");
      await expect(page.locator("#troncon-0")).toHaveAttribute("aria-expanded", "false");
      await expect(page.locator("#troncon-0")).toBeFocused();
    });
  });
  test.describe("Edge Case", () => {
    test("US-A11Y-003 — Échap ferme l'éditeur de prix (focus rendu au bouton)", async ({ page }) => {
      await formulairePret(page, "Albi", "Toulouse");
      await calculer(page);
      await page.locator('[data-el="mettre-mon-prix"]').focus();
      await page.keyboard.press("Enter");
      await expect(page.locator('[data-el="champ-prix-perso"]')).toBeFocused();
      await page.keyboard.press("Escape");
      await expect(page.locator('[data-el="champ-prix-perso"]')).toHaveCount(0);
      await expect(page.locator('[data-el="mettre-mon-prix"]')).toBeFocused();
    });
    test("US-A11Y-003 — S3 : Échap ferme la liste de propositions de lieux et la liste de marques", async ({ page }) => {
      await formulairePret(page, "Albi", "Toulouse");
      await champ(page, "depart").fill("");
      await champ(page, "depart").pressSequentially("Alb", { delay: 50 });
      await expect(propositions(page, "depart").first()).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(propositions(page, "depart")).toHaveCount(0);
      await expect(champ(page, "depart")).toBeFocused();
      await page.locator("#voiture-marque").focus();
      await page.keyboard.press("Enter");
      await expect(page.getByRole("listbox", { name: "Marque" })).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(page.getByRole("listbox", { name: "Marque" })).toHaveCount(0);
      await expect(page.locator("#voiture-marque")).toBeFocused();
    });
  });
});
