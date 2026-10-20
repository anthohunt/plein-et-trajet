import { test, expect } from "@playwright/test";
import { ALBI, centre, km, lignes, pastilles } from "./_aides";

test("US-1.1 — l'onglet Prix affiche carte et liste autour de ma position", async ({ page }) => {
  await page.goto("/trajets");
  await expect(page.getByRole("tab", { name: "Trajets" })).toHaveAttribute("aria-selected", "true");
  await page.getByRole("tab", { name: "Prix" }).click();
  await expect(lignes(page).first()).toBeVisible();
  const n = await lignes(page).count();
  expect(n).toBeGreaterThan(3);
  await expect(pastilles(page)).toHaveCount(n);
  expect(km(await centre(page), { lat: ALBI.latitude, lon: ALBI.longitude })).toBeLessThan(0.5);
});

test.describe("position refusée", () => {
  test.use({ permissions: [] });
  test("US-1.1 — centrée sur Albi par défaut avec un message", async ({ page }) => {
    await page.goto("/trajets");
    await page.getByRole("tab", { name: "Prix" }).click();
    await expect(page.locator('[data-el="message-localisation"]')).toContainText("Localisation désactivée : carte centrée sur Albi");
    await expect(lignes(page).first()).toBeVisible();
    expect(km(await centre(page), { lat: ALBI.latitude, lon: ALBI.longitude })).toBeLessThan(0.5);
  });
});
