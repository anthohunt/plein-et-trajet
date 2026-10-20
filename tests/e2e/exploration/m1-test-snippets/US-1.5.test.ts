import { test, expect } from "@playwright/test";
import { croissant, lireLignes, ouvrirPrix } from "./_aides";

test("US-1.5 — Plus proche puis Moins cher", async ({ page }) => {
  await ouvrirPrix(page);
  expect(croissant((await lireLignes(page)).map((x) => x.prix))).toBe(true);
  await page.getByRole("button", { name: "Plus proche", exact: true }).click();
  await expect(page.locator('[data-el="liste-stations"]')).toHaveAttribute("data-tri", "distance");
  expect(croissant((await lireLignes(page)).map((x) => x.km))).toBe(true);
  await page.getByRole("button", { name: "Moins cher", exact: true }).click();
  await expect(page.locator('[data-el="liste-stations"]')).toHaveAttribute("data-tri", "prix");
  expect(croissant((await lireLignes(page)).map((x) => x.prix))).toBe(true);
});
