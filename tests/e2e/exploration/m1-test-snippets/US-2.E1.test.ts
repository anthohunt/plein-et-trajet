import { test, expect } from "@playwright/test";
import { autour, lireLignes, ouvrirPrix, rest } from "./_aides";

// Données réelles : station du rayon sans ligne GPLc en base
test("US-2.E1 — la fiche affiche « non vendu » pour le GPLc", async ({ page }) => {
  const st = await autour();
  const gpl = new Set((await rest(`prix?select=station_id&carburant=eq.GPLc&station_id=in.(${st.map((s) => s.id).join(",")})`)).map((x: any) => x.station_id));
  await ouvrirPrix(page);
  const l = (await lireLignes(page)).find((x) => !gpl.has(x.id))!;
  await page.locator(`[data-el="ligne-station"][data-station="${l.id}"]`).click();
  await expect(page.locator('[data-el="tableau-prix"]')).toHaveAttribute("aria-busy", "false");
  await expect(page.locator('[data-carburant="GPLc"] [data-el="non-vendu"]')).toHaveText("non vendu");
});
