import { test, expect } from "@playwright/test";
import { lignes, lireLignes, ouvrirPrix, rest } from "./_aides";

test("US-2.2 — Coût d'un trajet jusqu'ici ouvre Trajets avec l'arrivée pré-remplie", async ({ page }) => {
  await ouvrirPrix(page);
  const [l] = await lireLignes(page);
  const s = (await rest(`stations?select=adresse,cp,ville&id=eq.${l.id}`))[0];
  await lignes(page).first().click();
  await page.getByRole("button", { name: "Coût d'un trajet jusqu'ici" }).click();
  await expect(page).toHaveURL(/\/trajets$/);
  await expect(page.getByRole("tab", { name: "Trajets" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByLabel("Arrivée")).toHaveValue(`${s.adresse}, ${s.cp} ${s.ville}`);
});
