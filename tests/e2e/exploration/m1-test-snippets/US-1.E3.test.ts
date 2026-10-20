import { test, expect } from "@playwright/test";
import { autour, choisir, ouvrirPrix, rest } from "./_aides";

// Données réelles : une station du rayon dont le prix déclaré a plus de 48 h (choisie en base au moment du test)
test("US-1.E3 — prix de plus de 48 h : « prix du JJ/MM » atténué", async ({ page }) => {
  const ids = (await autour()).map((s) => s.id).join(",");
  const limite = new Date(Date.now() - 48 * 3600e3).toISOString();
  let carb = "", vieux: any = null;
  for (const c of ["SP95-E10", "Gazole", "SP98", "E85", "GPLc", "SP95"]) {
    const r = await rest(`prix?select=station_id,maj&carburant=eq.${c}&rupture=is.false&prix=not.is.null&maj=lt.${limite}&station_id=in.(${ids})`);
    if (r.length) { carb = c; vieux = r[0]; break; }
  }
  test.skip(!vieux, "aucune station réelle > 48 h dans le rayon aujourd'hui");
  const jjmm = new Date(vieux.maj).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", timeZone: "Europe/Paris" });
  await ouvrirPrix(page);
  await choisir(page, carb);
  const a = page.locator(`[data-el="ligne-station"][data-station="${vieux.station_id}"] [data-el="anciennete"]`);
  await expect(a).toHaveText(`prix du ${jjmm}`);
  await expect(a).toHaveCSS("opacity", "0.8");
  await expect(a).toHaveCSS("color", "rgb(93, 99, 95)");
});
