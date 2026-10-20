import { test, expect } from "@playwright/test";
import { autour, choisir, lireLignes, ouvrirPrix, rest } from "./_aides";

test("US-1.2 — Gazole : chaque ligne et pastille au prix gazole de la base", async ({ page }) => {
  await ouvrirPrix(page);
  await expect(page.locator('[data-el="titre-liste"]')).toHaveText("Stations · SP95-E10");
  await choisir(page, "Gazole");
  await expect(page.locator('[data-el="liste-stations"]')).toHaveAttribute("data-carburant", "Gazole");
  const l = await lireLignes(page);
  const db: { station_id: string; prix: number }[] = await rest(`prix?select=station_id,prix&carburant=eq.Gazole&rupture=is.false&station_id=in.(${l.map((x) => x.id).join(",")})`);
  const ref = new Map(db.map((d) => [d.station_id, Number(d.prix)]));
  for (const x of l) expect(x.prix).toBeCloseTo(ref.get(x.id)!, 3);
  const pins = await page.locator('[data-el="pastille-station"]').evaluateAll((e) => e.map((b) => [(b as HTMLElement).dataset.station!, b.textContent!]));
  for (const [id, t] of pins) expect(Number(t.replace(",", "."))).toBeCloseTo(ref.get(id)!, 3);
});

test("US-1.2 — une station qui ne vend pas le carburant choisi disparaît", async ({ page }) => {
  const ids = (await autour()).map((s) => s.id).join(",");
  const e10 = await rest(`prix?select=station_id&carburant=eq.SP95-E10&rupture=is.false&prix=not.is.null&station_id=in.(${ids})`);
  const e85 = new Set((await rest(`prix?select=station_id&carburant=eq.E85&station_id=in.(${ids})`)).map((x: any) => x.station_id));
  const cible = e10.map((x: any) => x.station_id).find((id: string) => !e85.has(id));
  await ouvrirPrix(page);
  await expect(page.locator(`[data-el="ligne-station"][data-station="${cible}"]`)).toHaveCount(1);
  await choisir(page, "E85");
  await expect(page.locator('[data-el="liste-stations"]')).toHaveAttribute("data-carburant", "E85");
  await expect(page.locator(`[data-el="ligne-station"][data-station="${cible}"]`)).toHaveCount(0);
  await expect(page.locator(`[data-el="pastille-station"][data-station="${cible}"]`)).toHaveCount(0);
});
