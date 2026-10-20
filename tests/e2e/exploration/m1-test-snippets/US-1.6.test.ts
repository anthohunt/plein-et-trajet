import { test, expect } from "@playwright/test";
import { lignes, lireLignes, ouvrirPrix, rest } from "./_aides";

test("US-1.6 — une ligne montre enseigne, distance, ancienneté, écart et prix à 3 décimales ; la toucher ouvre la fiche", async ({ page }) => {
  await ouvrirPrix(page);
  const [l] = await lireLignes(page);
  const st = (await rest(`stations?select=enseigne,nom&id=eq.${l.id}`))[0];
  expect(l.nom).toContain(st.enseigne ?? st.nom);
  expect(l.meta).toMatch(/^[\d,]+ (km|m) · /);
  expect(l.meta).toMatch(/(il y a \d+ (min|h)|hier|à l'instant|prix du \d\d\/\d\d)/);
  expect(l.meta).toMatch(/[−+][\d,]+ c vs France|= France/);
  await expect(lignes(page).first().locator(".totem")).toHaveAttribute("aria-label", /^\d,\d{3} euros le litre$/);
  await lignes(page).first().click();
  await expect(page.locator("#sh-name")).toHaveText(l.nom);
});
