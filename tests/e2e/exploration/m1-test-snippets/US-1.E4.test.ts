import { test, expect } from "@playwright/test";
import { autour, choisir, croissant, lireLignes, ouvrirPrix, rest } from "./_aides";

// Données réelles : rupture temporaire de gazole déclarée dans le flux officiel
test("US-1.E4 — une station en rupture de gazole n'apparaît pas en Gazole", async ({ page }) => {
  const ids = (await autour()).map((s) => s.id).join(",");
  const rup = await rest(`prix?select=station_id&carburant=eq.Gazole&rupture=is.true&station_id=in.(${ids})`);
  test.skip(!rup.length, "aucune rupture gazole réelle dans le rayon aujourd'hui");
  const id = rup[0].station_id;
  await ouvrirPrix(page);
  await choisir(page, "Gazole");
  await expect(page.locator('[data-el="liste-stations"]')).toHaveAttribute("data-carburant", "Gazole");
  const l = await lireLignes(page);
  expect(l.map((x) => x.id)).not.toContain(id);
  expect(croissant(l.map((x) => x.prix))).toBe(true);
  await expect(page.locator(`[data-el="pastille-station"][data-station="${id}"]`)).toHaveCount(0);
});
