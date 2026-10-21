import { test, expect, D, PTS, avecVoiture, demarrer, arreter, direct, rejouer, lireIdb, moyenne, virgule, nb, euros2 } from "./_aides";

test.describe("V-2.1 — Saisir le code D.2", () => {
  test.describe("Happy Path", () => {
    test("V-2.1 — « 5RBU0C » : fiche EEA 2017, 87 kW (118 ch), 1 197 cm³, 1 165 kg, SP95-E10, 118 g/km", async ({ page }) => {
      await page.goto("/voiture");
      await page.locator("#d2").pressSequentially("5RBU0C");
      await page.locator(D("fiche-voiture")).waitFor({ timeout: 40_000 });
      await expect(page.locator(D("fiche-annee"))).toHaveText("2017");
      await expect(page.locator(D("fiche-puissance"))).toContainText("87 kW");
      await expect(page.locator(D("fiche-puissance"))).toContainText("118 ch");
      await expect(page.locator(D("fiche-cylindree"))).toHaveText(/1\s197 cm³/);
      await expect(page.locator(D("fiche-masse"))).toHaveText(/1\s165 kg/);
      await expect(page.locator(D("fiche-carburant"))).toHaveText("SP95-E10");
      await expect(page.locator(D("fiche-co2"))).toContainText("118 g/km");
      await expect(page.locator(D("fiche-voiture"))).toContainText("Base européenne EEA");
    });
  });
  test.describe("Edge Case", () => {
    test("V-2.1 — code partagé : versions listées, la plus immatriculée en tête, choix possible", async ({ page }) => {
      await page.goto("/voiture");
      await page.locator("#d2").pressSequentially("M611Z1"); // Kia Sportage / Hyundai Tucson (base EEA)
      const b = page.locator(`${D("versions-d2")} button`);
      await expect(b.nth(1)).toBeVisible({ timeout: 60_000 });
      const immat = (await b.allInnerTexts()).map((t) => nb(t.match(/([\d\s\u202f]+) immatriculées/)![1]));
      expect(immat).toEqual([...immat].sort((x, y) => y - x));
      await b.nth(1).tap();
      await expect(b.nth(1)).toHaveAttribute("aria-pressed", "true");
      await expect(page.locator(D("fiche-voiture"))).toHaveAttribute("data-cle", (await b.nth(1).getAttribute("data-cle"))!);
    });
    test("V-2.1 — minuscules et espaces : « r 5rbu 5rbu0c » reconnu", async ({ page }) => {
      await page.goto("/voiture");
      await page.locator("#d2").pressSequentially("r 5rbu 5rbu0c");
      await expect(page.locator("#d2")).toHaveValue("R 5RBU 5RBU0C");
      await expect(page.locator(D("fiche-voiture"))).toHaveAttribute("data-cle", /5RBU0C/, { timeout: 40_000 });
    });
  });
});
