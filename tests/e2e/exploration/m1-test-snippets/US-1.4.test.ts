import { test, expect } from "@playwright/test";
import { choisir, ouvrirPrix, pastilleDegagee } from "./_aides";

test("US-1.4 — toucher une pastille ouvre la fiche de cette station", async ({ page }) => {
  await ouvrirPrix(page);
  const id = await pastilleDegagee(page);
  const pin = page.locator(`[data-el="pastille-station"][data-station="${id}"]`);
  const label = (await pin.getAttribute("aria-label"))!;
  await pin.click();
  await expect(page.locator('[data-el="fiche-station"]')).toHaveAttribute("data-station", id);
  expect(label.startsWith((await page.locator("#sh-name").textContent())!)).toBe(true);
});

test("US-1.4 — moitié la moins chère en vert, l'autre en orange", async ({ page }) => {
  await ouvrirPrix(page);
  await choisir(page, "Gazole");
  await expect(page.locator('[data-el="carte-stations"]')).toHaveAttribute("data-pastilles", /\d+/);
  const pa = await page.locator('[data-el="pastille-station"]').evaluateAll((e) => e.map((b) => ({ v: Number(b.textContent!.replace(",", ".")), m: (b as HTMLElement).dataset.moitie })));
  const lo = pa.filter((x) => x.m === "lo"), hi = pa.filter((x) => x.m === "hi");
  expect(new Set(pa.map((x) => x.v)).size).toBeGreaterThan(1);
  expect(lo.length).toBeGreaterThanOrEqual(Math.ceil(pa.length / 2));
  expect(Math.max(...lo.map((x) => x.v))).toBeLessThan(Math.min(...hi.map((x) => x.v)));
  await expect(page.locator(".pin.lo").first()).toHaveCSS("box-shadow", /31, 138, 76/);
  await expect(page.locator(".pin.hi").first()).toHaveCSS("box-shadow", /194, 73, 29/);
});
