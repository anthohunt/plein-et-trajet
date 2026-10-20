import { test, expect } from "@playwright/test";
import { autour, choisir, croissant, lireLignes, ouvrirPrix, rest } from "./_aides";

// Données réelles : rupture temporaire de gazole déclarée dans le flux officiel
test("US-1.E4 — une station en rupture de gazole n'apparaît pas en Gazole", async ({ page }) => {
  const ids = (await autour()).map((s) => s.id).join(",");
  const rup = await rest(`prix?select=station_id&carburant=eq.Gazole&rupture=is.true&station_id=in.(${ids})`);
  expect(rup.length, "aucune rupture gazole réelle dans le rayon aujourd'hui : fixture nécessaire").toBeGreaterThan(0);
  const id = rup[0].station_id;
  await ouvrirPrix(page);
  await choisir(page, "Gazole");
  await expect(page.locator('[data-el="liste-stations"]')).toHaveAttribute("data-carburant", "Gazole");
  const l = await lireLignes(page);
  expect(l.map((x) => x.id)).not.toContain(id);
  // libellé départagé sur toute la zone : aucune autre station de la liste ne porte le libellé de la station en rupture
  const autres = await rest(`prix?select=carburant&station_id=eq.${id}&rupture=is.false&prix=not.is.null`);
  await choisir(page, autres[0].carburant);
  const nom = await page.locator(`[data-el="ligne-station"][data-station="${id}"] .n`).textContent();
  await choisir(page, "Gazole");
  expect((await lireLignes(page)).map((x) => x.nom)).not.toContain(nom);
  expect(croissant(l.map((x) => x.prix))).toBe(true);
  await expect(page.locator(`[data-el="pastille-station"][data-station="${id}"]`)).toHaveCount(0);
});
