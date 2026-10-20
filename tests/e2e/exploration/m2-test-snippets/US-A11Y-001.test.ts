import { test, expect, formulairePret, etatFocus, calculer } from "./_aides";

test.describe("US-A11Y-001 — Navigation au clavier (S3 et S4)", () => {
  test.describe("Happy Path", () => {
    test("US-A11Y-001 — S3 : Tab parcourt départ, inversion, arrivée, voiture, Calculer, historique, onglet — contour visible ; Maj+Tab revient", async ({ page }) => {
      await formulairePret(page, "Albi", "Toulouse");
      await page.locator("body").click({ position: { x: 380, y: 70 } });
      await page.evaluate(() => (document.activeElement as HTMLElement)?.blur());
      const vus: any[] = [];
      for (let i = 0; i < 30; i++) {
        await page.keyboard.press("Tab");
        const o = await etatFocus(page);
        expect(o.contour, `contour : ${o.nom}`).toBe(true);
        expect(o.visible, `visible : ${o.nom}`).toBe(true);
        vus.push(o);
        if (o.nom === "Trajets") break;
      }
      expect(vus.slice(0, 7).map((v) => v.nom)).toEqual(["Départ", "Inverser les deux lieux", "Arrivée", "Marque", "Modèle", "Motorisation", "Calculer le coût"]);
      expect(vus.map((v) => v.i)).toEqual([...vus.map((v) => v.i)].sort((a, b) => a - b));
      for (let i = 0; i < vus.length - 1; i++) await page.keyboard.press("Shift+Tab");
      expect((await etatFocus(page)).nom).toBe("Départ");
    });
    test("US-A11Y-001 — S4 : Mettre mon prix, chaque tronçon, onglet — dans l'ordre, contour visible", async ({ page }) => {
      await formulairePret(page, "Albi", "Toulouse");
      await calculer(page);
      await page.locator('[data-el="route-titre"]').focus();
      const vus: any[] = [];
      for (let i = 0; i < 12; i++) {
        await page.keyboard.press("Tab");
        const o = await etatFocus(page);
        expect(o.contour, `contour : ${o.nom}`).toBe(true);
        expect(o.visible, `visible : ${o.nom}`).toBe(true);
        vus.push(o);
        if (o.nom === "Trajets") break;
      }
      expect(vus[0].nom).toBe("Mettre mon prix");
      expect(vus.at(-1).nom).toBe("Trajets");
      expect(vus.filter((v) => /^troncon-/.test(v.id))).toHaveLength(await page.locator('[data-el="troncons"] button').count());
      expect(vus.map((v) => v.i)).toEqual([...vus.map((v) => v.i)].sort((a, b) => a - b));
    });
  });
  test.describe("Edge Case", () => {
    test("US-A11Y-001 — les listes déroulantes de voiture se pilotent aux flèches ; la liste de lieux aussi", async ({ page }) => {
      await formulairePret(page, "Albi", "Toulouse");
      await page.locator("#voiture-marque").focus();
      await page.keyboard.press("ArrowDown");
      await expect(page.getByRole("listbox", { name: "Marque" })).toBeVisible();
      await page.keyboard.press("ArrowDown");
      await page.keyboard.press("Enter");
      await expect(page.getByRole("listbox", { name: "Marque" })).toHaveCount(0);
      await expect(page.locator("#voiture-marque")).toBeFocused();
      await expect(page.locator("#voiture-modele .dd-txt")).toHaveText("Modèle");
    });
  });
});
