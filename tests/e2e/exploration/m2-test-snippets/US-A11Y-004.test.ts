import { test, expect, formulairePret, calculer } from "./_aides";

test.describe("US-A11Y-004 — Libellés lisibles", () => {
  test.describe("Happy Path", () => {
    test("US-A11Y-004 — S3 : chaque champ et bouton a un nom ; les icônes ⇅ et ✕ portent un aria-label", async ({ page }) => {
      await formulairePret(page, "Albi", "Toulouse");
      await calculer(page);
      await page.locator('[data-el="retour-trajets"]').click();
      const snap = await page.locator('[data-screen="S3"]').ariaSnapshot();
      for (const n of ["Départ", "Arrivée", "Inverser les deux lieux", "Marque", "Modèle", "Motorisation", "Calculer le coût", "Supprimer le trajet Albi → Toulouse", "Recalculer le trajet Albi → Toulouse au prix du jour"]) expect(snap, n).toContain(n);
      const sansNom = await page.evaluate(() => [...document.querySelectorAll('[data-screen="S3"] button, [data-screen="S3"] input')].filter((e) => !((e as HTMLElement).getAttribute("aria-label") || (e as HTMLInputElement).labels?.[0]?.textContent || e.textContent?.replace(/[✕⇅▾\s]/g, ""))).length);
      expect(sansNom).toBe(0);
    });
    test("US-A11Y-004 — S4 : le coût, le prix et chaque tronçon sont annoncés en entier", async ({ page }) => {
      await formulairePret(page, "Albi", "Toulouse");
      await calculer(page);
      await expect(page.locator("[data-cout]")).toHaveAttribute("aria-label", /^Coût estimé \d+,\d\d euros$/);
      await expect(page.locator('[data-el="prix-perso"] .totem')).toHaveAttribute("aria-label", /euros le litre$/);
      await expect(page.locator('[data-el="retour-trajets"]')).toHaveAttribute("aria-label", "Retour aux trajets");
      for (const b of await page.locator('[data-el="troncons"] button').all()) await expect(b).toHaveAttribute("aria-label", /, \d+,\d km, \d+,\d litres$/);
    });
  });
  test.describe("Edge Case", () => {
    test("US-A11Y-004 — les erreurs sont des alertes liées au champ (aria-invalid, aria-describedby)", async ({ page }) => {
      await formulairePret(page, "Albi", "Toulouse");
      await page.locator('[data-el="champ-arrivee"]').fill("zzzz");
      await page.locator("#bouton-calculer").click();
      const a = page.locator('[data-el="champ-arrivee-erreur"]');
      await expect(a).toHaveAttribute("role", "alert");
      await expect(page.locator('[data-el="champ-arrivee"]')).toHaveAttribute("aria-describedby", "arr-erreur");
      await expect(page.locator('[data-el="champ-arrivee"]')).toHaveAttribute("aria-invalid", "true");
    });
  });
});
