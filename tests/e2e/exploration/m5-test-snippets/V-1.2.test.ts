import { test, expect, D, PTS, avecVoiture, demarrer, arreter, direct, rejouer, lireIdb, moyenne, virgule, nb, euros2 } from "./_aides";

test.describe("V-1.2 — Voir ma voiture", () => {
  test.describe("Happy Path", () => {
    test("V-1.2 — la Clio enregistrée : nom et version (texte de la base EEA ; le plan dit « Clio IV » / « 1.2 TCe 120 »)", async ({ page, context }) => {
      await avecVoiture(context);
      await page.goto("/");
      // écart déclaré au journal : la base EEA ne porte ni « IV » ni « TCe 120 » ; l'écran montre ce que dit la base
      await expect(page.locator(D("nom-voiture"))).toHaveText("Renault Clio");
      await expect(page.locator(D("detail-voiture"))).toHaveText("1.2 · 118 ch · 2017 · SP95-E10");
    });
    test("V-1.2 — « Changer » ouvre Ma voiture aux champs vides", async ({ page, context }) => {
      await avecVoiture(context);
      await page.goto("/");
      await page.locator(D("changer-voiture")).tap();
      await expect(page.locator("#d2")).toHaveValue("");
      await expect(page.locator("#q")).toHaveValue("");
    });
  });
  test.describe("Edge Case", () => {
    test("V-1.2 — fermée puis rouverte : la même voiture sans rien ressaisir", async ({ page, context }) => {
      await page.goto("/voiture");
      await page.locator("#d2").pressSequentially("5RBU0C");
      await page.locator(D("fiche-voiture")).waitFor({ timeout: 40_000 });
      await page.locator(D("enregistrer-voiture")).tap();
      const p2 = await context.newPage();
      await page.close();
      await p2.goto("/");
      await expect(p2.locator(D("nom-voiture"))).toHaveText("Renault Clio");
    });
  });
});
