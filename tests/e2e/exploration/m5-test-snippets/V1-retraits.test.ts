import { test, expect, D, PTS, avecVoiture, demarrer, arreter, rejouer, lireIdb, ecrireIdb, trajetPrepare, moyenne, rest, virgule, nb, euros2, lignes, prixLigne } from "./_aides";

test.describe("V1-retraits — Contrôle négatif", () => {
  test("V1-retraits — parcours T1 → T6 : aucune requête PTV ni péages, aucun texte « péage » / « itinéraire », 3 onglets", async ({ page, context }) => {
    await avecVoiture(context);
    const urls: string[] = [];
    context.on("request", (r) => urls.push(r.url()));
    for (const route of ["/", "/voiture", "/stations", "/historique"]) {
      await page.goto(route);
      await page.waitForTimeout(2000);
      await expect(page.locator("body")).not.toContainText(/p[ée]age|itin[ée]raire|Moteurs/i);
    }
    await expect(page.locator('[role="tab"]')).toHaveText(["Trajet", "Stations", "Historique"]);
    expect(urls.filter((u) => /myptv|functions\/v1\/(estimer-trajet|trajet-roule)/.test(u))).toEqual([]);
  });
  test("V1-retraits — service péages hors service, clés intactes (lecture rôle service, aucune valeur)", async () => {
    const h = { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!, Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}` };
    const [peages] = await (await fetch(`${process.env.SUPABASE_URL}/rest/v1/moteurs?select=en_service&service=eq.peages`, { headers: h })).json();
    expect(peages.en_service).toBe(false);
    const r = await fetch(`${process.env.SUPABASE_URL}/rest/v1/cles_fournisseurs?select=fournisseur`, { headers: { ...h, Prefer: "count=exact", Range: "0-0" } });
    expect(r.headers.get("content-range")).toMatch(/\/2$/);
  });
});
