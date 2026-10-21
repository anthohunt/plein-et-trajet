import { test, expect, D, PTS, PTS3, avecVoiture, demarrer, arreter, direct, rejouer, lireIdb, moyenne, virgule, nb, euros2 } from "./_aides";

test.describe("V-3.5 — Arrêter", () => {
  test.describe("Happy Path", () => {
    test("V-3.5 — fin de trajet : Albi → Toulouse, date, durée, litres, km, L/100 km", async ({ page, context }) => {
      test.setTimeout(300_000); // tracé complet à un relevé toutes les 3 s (PTS3) : rejeu ~3 fois plus court qu'à 1 s (audit r2 LOW 2 / LOW 7)
      await avecVoiture(context);
      await demarrer(page);
      await rejouer(context, page, PTS3, 1, PTS3.length);
      await arreter(page);
      await expect(page.locator(D("titre-trajet"))).toHaveAttribute("data-noms", "oui", { timeout: 20_000 });
      await expect(page.locator(D("titre-trajet"))).toHaveText("Albi → Toulouse");
      await expect(page.locator(D("sous-titre-trajet"))).toHaveText(/^\d+ \w+\.? 2026 · 1 h \d\d · Renault Clio$/);
      const litres = Number(await page.locator(D("fin-litres")).getAttribute("data-litres"));
      const km = Number(await page.locator(D("fin-km")).getAttribute("data-km"));
      expect(km).toBeGreaterThan(76);
      await expect(page.locator(D("fin-l100"))).toHaveText(virgule((litres / km) * 100, 1));
    });
  });
  test.describe("Edge Case", () => {
    test("V-3.5 — moins de 1 km : trop court, rien dans l'historique", async ({ page, context }) => {
      await avecVoiture(context);
      await demarrer(page);
      await rejouer(context, page, PTS, 1, 150);
      await page.locator(D("bouton-arreter")).tap();
      await expect(page.locator(D("trop-court"))).toContainText(/Trajet trop court : 0,\d km sur 1 minimum\./);
      expect((await lireIdb(page)).trajets).toHaveLength(0);
    });
    test("V-3.5 — sans réseau à l'arrêt : litres et coût sur le téléphone, noms au retour du réseau", async ({ page, context }) => {
      await avecVoiture(context);
      await demarrer(page);
      await rejouer(context, page, PTS, 1, 420);
      await context.setOffline(true);
      await arreter(page);
      await expect(page.locator(D("titre-trajet"))).toHaveAttribute("data-noms", "non");
      await expect(page.locator(D("titre-trajet"))).toHaveText(/^\d+,\d{3} · \d+,\d{3} → \d+,\d{3} · \d+,\d{3}$/); // coordonnées, hors ligne
      await expect(page.locator(D("hors-ligne"))).toBeVisible();
      const litres = Number(await page.locator(D("fin-litres")).getAttribute("data-litres"));
      const prix = Number(await page.locator(D("prix-apres")).getAttribute("data-prix"));
      await expect(page.locator(D("cout-trajet"))).toHaveAttribute("data-cout", String(euros2(litres * prix)));
      await context.setOffline(false);
      await expect(page.locator(D("titre-trajet"))).toHaveAttribute("data-noms", "oui", { timeout: 30_000 });
      await expect(page.locator(D("hors-ligne"))).toHaveCount(0);
    });
  });
});
