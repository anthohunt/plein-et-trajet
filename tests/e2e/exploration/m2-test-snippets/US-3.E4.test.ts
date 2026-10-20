import { test, expect, ouvrirTrajets, choisirDansListe, rest } from "./_aides";

test.describe("US-3.E4 — Voiture absente de la base", () => {
  test.describe("Edge Case", () => {
    test("US-3.E4 — Peugeot 208 réelle : motorisations avec kW et carburant, la plus proche de la puissance moyenne en premier, les autres par puissance croissante", async ({ page }) => {
      await ouvrirTrajets(page);
      await choisirDansListe(page, "voiture-marque", "Marque", "Peugeot");
      await choisirDansListe(page, "voiture-modele", "Modèle", "208");
      await page.waitForFunction(() => { const e = document.getElementById("voiture-moteur") as HTMLButtonElement; return e && !e.disabled && !/Chargement/.test(e.textContent ?? ""); });
      await page.locator("#voiture-moteur").click();
      const opts = await page.getByRole("listbox", { name: "Motorisation" }).getByRole("option").evaluateAll((els) => els.map((e) => ({ id: (e as HTMLElement).dataset.valeur, txt: (e as HTMLElement).innerText.replace(/\s+/g, " ") })));
      const base = await rest("vehicules?select=id,puissance_kw&marque=eq.Peugeot&modele=eq.208&order=puissance_kw");
      expect(opts).toHaveLength(base.length);
      const moy = base.reduce((s: number, x: any) => s + Number(x.puissance_kw), 0) / base.length;
      const proche = [...base].sort((a: any, b: any) => Math.abs(a.puissance_kw - moy) - Math.abs(b.puissance_kw - moy) || a.puissance_kw - b.puissance_kw)[0];
      expect(opts[0].id).toBe(proche.id);
      expect(opts[0].txt).toMatch(/proposée/i);
      const reste = opts.slice(1).map((o) => Number(o.txt.match(/(\d+(?:,\d)?) kW/)![1].replace(",", ".")));
      expect(reste).toEqual([...reste].sort((a, b) => a - b));
      for (const o of opts) expect(o.txt).toMatch(/kW · (Gazole|SP95-E10|SP95|SP98|E85|GPLc)/);
      await page.keyboard.press("Escape");
      await expect(page.getByRole("listbox", { name: "Motorisation" })).toHaveCount(0);
      await expect(page.locator("#voiture-moteur .dd-txt")).toHaveText("Motorisation");
    });
  });
  test.describe("Bi-carburation", () => {
    test("US-3.E4 — Renault Clio : la ligne essence est chiffrée en SP95-E10, la ligne GPL en GPLc, libellés distincts", async ({ page }) => {
      const lignes = await rest("vehicules?select=motorisation,carburant,conso_moyenne&marque=eq.Renault&modele=eq.Clio&energie=eq.ESS%2BG.P.L.&order=puissance_kw");
      expect(lignes.map((l: any) => l.carburant)).toEqual(["SP95-E10", "GPLc"]);
      expect(lignes[0].motorisation).toMatch(/essence$/);
      expect(lignes[1].motorisation).toMatch(/GPL$/);
      expect(lignes[0].conso_moyenne).toBeLessThan(lignes[1].conso_moyenne);
      await ouvrirTrajets(page);
      await choisirDansListe(page, "voiture-marque", "Marque", "Renault");
      await choisirDansListe(page, "voiture-modele", "Modèle", "Clio");
      await page.waitForFunction(() => { const e = document.getElementById("voiture-moteur") as HTMLButtonElement; return e && !e.disabled && !/Chargement/.test(e.textContent ?? ""); });
      await page.locator("#voiture-moteur").click();
      const txt = await page.getByRole("listbox", { name: "Motorisation" }).getByRole("option").allInnerTexts();
      expect(txt.some((t) => /essence/.test(t) && /SP95-E10/.test(t))).toBe(true);
      expect(txt.some((t) => /GPL/.test(t) && /GPLc/.test(t))).toBe(true);
    });
  });
});
