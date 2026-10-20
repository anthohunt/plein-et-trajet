import { test, expect, trajetCalcule } from "./_aides";

test.describe("US-4.1 — Comprendre le calcul", () => {
  test.describe("Happy Path", () => {
    test("US-4.1 — un tronçon se déplie (vitesse, arrêts, L/100 km) puis se replie", async ({ page }) => {
      await trajetCalcule(page, "Albi", "Toulouse");
      const t = page.locator('[data-el="troncon-trajet"]');
      await expect(t).toHaveAttribute("aria-expanded", "false");
      await t.click();
      await expect(t).toHaveAttribute("aria-expanded", "true");
      const d = (await page.locator('[data-el="troncon-detail"]:visible').innerText()).replace(/\s+/g, " ");
      expect(d).toMatch(/\d+ km\/h en moyenne/);
      expect(d).toMatch(/\d+ arrêts?/);
      expect(d).toMatch(/\d+,\d L\/100 km sur ce tronçon/);
      await t.click();
      await expect(t).toHaveAttribute("aria-expanded", "false");
      await expect(page.locator('[data-el="troncon-detail"]:visible')).toHaveCount(0);
    });
  });
  test.describe("Edge Case", () => {
    test("US-4.1 — un seul tronçon ouvert à la fois ; la barre de chaque tronçon est proportionnelle à ses litres", async ({ page }) => {
      await trajetCalcule(page, "Albi", "Toulouse");
      const b = page.locator('[data-el="troncons"] button');
      expect(await b.count()).toBeGreaterThan(1);
      await b.nth(0).click();
      await b.nth(1).click();
      await expect(b.nth(0)).toHaveAttribute("aria-expanded", "false");
      await expect(b.nth(1)).toHaveAttribute("aria-expanded", "true");
      const largeurs = await page.locator(".bar i").evaluateAll((els) => els.map((e) => parseFloat((e as HTMLElement).style.width)));
      const litres = (await page.locator('[data-el="troncons"] .lit').allInnerTexts()).map((t) => Number(t.replace(" L", "").replace(",", ".")));
      const max = Math.max(...litres);
      largeurs.forEach((w, i) => expect(Math.abs(w - Math.max(2, (litres[i] / max) * 100))).toBeLessThan(6));
    });
  });
});
