import { test, expect } from "@playwright/test";
import { lignes, ouvrirPrix } from "./_aides";

test("US-A11Y-001 — Tab / Maj+Tab suivent l'ordre de lecture avec un contour visible", async ({ page }) => {
  await ouvrirPrix(page);
  await page.locator("body").click({ position: { x: 5, y: 5 } });
  const idx: number[] = [];
  for (let i = 0; i < 10; i++) {
    await page.keyboard.press("Tab");
    const o = await page.evaluate(() => ({ i: [...document.querySelectorAll("*")].indexOf(document.activeElement!), s: getComputedStyle(document.activeElement!).outlineStyle }));
    expect(o.s).not.toBe("none");
    idx.push(o.i);
  }
  expect(idx).toEqual([...idx].sort((a, b) => a - b));
  await page.keyboard.press("Shift+Tab");
  const back = await page.evaluate(() => [...document.querySelectorAll("*")].indexOf(document.activeElement!));
  expect(back).toBe(idx[8]);
  await lignes(page).first().focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#sh-name")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Fermer la fiche" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Coût d'un trajet jusqu'ici" })).toBeFocused();
});
