import { test, expect, type Page } from "@playwright/test";
import { lignes, ouvrirPrix } from "./_aides";

const focus = (p: Page) => p.evaluate(() => {
  const e = document.activeElement as HTMLElement, r = e.getBoundingClientRect(), s = getComputedStyle(e);
  const cadre = (e.closest(".map") ?? document.documentElement).getBoundingClientRect();
  const dans = r.width > 0 && r.left >= cadre.left - 1 && r.right <= cadre.right + 1 && r.top >= cadre.top - 1 && r.bottom <= cadre.bottom + 1 && r.top >= 0 && r.bottom <= innerHeight;
  const d = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
  return { i: [...document.querySelectorAll("*")].indexOf(e), txt: e.getAttribute("aria-label") || e.textContent || "",
    contour: s.outlineStyle !== "none" && parseFloat(s.outlineWidth) >= 2,
    visible: e.tagName === "CANVAS" ? dans : dans && !!d && (d === e || e.contains(d)) };
});

test("US-A11Y-001 — Tab / Maj+Tab : ordre de lecture, élément focalisé visible dans son cadre, contour visible", async ({ page }) => {
  await ouvrirPrix(page);
  await page.locator("body").click({ position: { x: 5, y: 5 } });
  const vus = [];
  for (let i = 0; i < 60; i++) {
    await page.keyboard.press("Tab");
    const o = await focus(page);
    expect(o.contour, `contour : ${o.txt}`).toBe(true);
    expect(o.visible, `visible dans son cadre : ${o.txt}`).toBe(true);
    vus.push(o);
    if (o.txt === "Prix") break;
  }
  expect(vus[0].txt).toBe("Gazole");
  expect(vus.map((v) => v.i)).toEqual([...vus.map((v) => v.i)].sort((a, b) => a - b));
  await page.keyboard.press("Shift+Tab");
  const back = await focus(page);
  expect(back.i).toBe(vus.at(-2)!.i);
  expect(back.visible && back.contour).toBe(true);
  await lignes(page).first().focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#sh-name")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Fermer la fiche" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Coût d'un trajet jusqu'ici" })).toBeFocused();
});
