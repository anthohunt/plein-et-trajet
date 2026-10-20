import { test, expect } from "@playwright/test";
import { lignes, ouvrirPrix } from "./_aides";

test("US-A11Y-004 — pastilles et prix annoncés, boutons icônes libellés", async ({ page }) => {
  await ouvrirPrix(page);
  const labels = await page.locator('[data-el="pastille-station"]').evaluateAll((e) => e.map((b) => b.getAttribute("aria-label")));
  expect(labels.length).toBeGreaterThan(3);
  for (const l of labels) expect(l).toMatch(/^.+, \d,\d{3} euros le litre, (moins|plus) cher$/);
  for (const t of await lignes(page).locator(".totem").evaluateAll((e) => e.map((x) => x.getAttribute("aria-label"))))
    expect(t).toMatch(/^\d,\d{3} euros le litre$/);
  await lignes(page).first().click();
  const icones = await page.evaluate(() => [...document.querySelectorAll("button")].filter((b) => !b.textContent!.replace(/[✕\s]/g, "").length).map((b) => b.getAttribute("aria-label")));
  for (const l of icones) expect(l).toBeTruthy();
  expect(icones).toEqual(expect.arrayContaining(["Recentrer sur ma position", "Fermer la fiche"]));
});
