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
});
