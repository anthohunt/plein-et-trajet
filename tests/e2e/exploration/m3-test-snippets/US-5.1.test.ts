import { test, expect, connecterAdmin, ouvrirMoteurs, session, env } from "./_aides";

test.describe("US-5.1 — Ouvrir les moteurs", () => {
  test.describe("Happy Path", () => {
    test("US-5.1 — connecté par lien magique : ⚙ visible ; il ouvre l'écran Moteurs et ses 6 services", async ({ page }) => {
      await connecterAdmin(page, { vers: "accueil" });
      const s = await session(page);
      const u = await (await fetch(`${env.SUPABASE_URL}/auth/v1/user`, { headers: { apikey: env.VITE_SUPABASE_ANON_KEY, Authorization: `Bearer ${s.jeton}` } })).json();
      expect(u.app_metadata.role).toBe("admin");
      await ouvrirMoteurs(page);
      expect((await page.locator('[data-el="moteur"] h3').allInnerTexts()).map((t) => t.split("\n")[0].trim())).toEqual(["PRIX DES STATIONS", "PRIX MOYENS PAR PAYS", "ITINÉRAIRE", "PÉAGES", "VOITURES", "RECHERCHE DE LIEUX"]);
      await expect(page.locator('[data-el="etat-moteur"]')).toHaveCount(6);
      await expect(page.locator('[data-el="bouton-moteurs"]')).toHaveAttribute("aria-pressed", "true");
    });
  });
  test.describe("Edge Case", () => {
    test("US-5.1 — l'adresse /moteurs ouverte par le lien magique affiche directement S5 ; « ← Retour » revient aux prix", async ({ page }) => {
      await connecterAdmin(page);
      await expect(page.locator('[data-el="moteur"]')).toHaveCount(6, { timeout: 20000 });
      await page.locator('[data-el="retour-moteurs"]').click();
      await expect(page.locator('[data-screen="S1"]')).toBeVisible();
    });
    // Round 5 (audit round 3, LOW 5) : tenue de S5 à 390 et 360 px, versionnée (mesurée à la main aux rounds 3 et 4).
    for (const largeur of [390, 360]) {
      test(`US-5.1 — à ${largeur} px : rien ne dépasse de l'écran Moteurs, pastilles entières, texte d'aide du champ clé entier`, async ({ page }) => {
        await page.setViewportSize({ width: largeur, height: 844 });
        await connecterAdmin(page);
        await expect(page.locator('[data-el="moteur"]')).toHaveCount(6, { timeout: 20000 });
        await expect(page.locator('[data-el="etat-moteur"]').first()).not.toHaveText("Test en cours…");
        const m = await page.evaluate(() => {
          const ecran = document.querySelector('[data-screen="S5"]') as HTMLElement;
          const hors = [...ecran.querySelectorAll("*")].filter((e) => {
            const r = e.getBoundingClientRect();
            return r.width > 0 && !e.closest(".sr-only") && (r.left < -0.5 || r.right > window.innerWidth + 0.5);
          }).map((e) => (e as HTMLElement).dataset.el ?? e.tagName);
          const pastillesCoupees = [...document.querySelectorAll('[data-el="etat-moteur"]')].filter((e) => (e as HTMLElement).scrollWidth > (e as HTMLElement).clientWidth + 1).length;
          // largeur du texte d'aide (placeholder) mesurée dans la police du champ, comparée à la place disponible
          const ctx = document.createElement("canvas").getContext("2d")!;
          const aides = [...document.querySelectorAll('input[type="password"]')].map((i) => {
            const s = getComputedStyle(i);
            ctx.font = `${s.fontStyle} ${s.fontWeight} ${s.fontSize} ${s.fontFamily}`;
            const place = (i as HTMLElement).clientWidth - parseFloat(s.paddingLeft) - parseFloat(s.paddingRight);
            return { aide: (i as HTMLInputElement).placeholder, deborde: ctx.measureText((i as HTMLInputElement).placeholder).width > place };
          });
          return { scroll: document.documentElement.scrollWidth, hors, pastillesCoupees, aides };
        });
        expect(m.scroll).toBeLessThanOrEqual(largeur);
        expect(m.hors).toEqual([]);
        expect(m.pastillesCoupees).toBe(0);
        expect(m.aides.length).toBeGreaterThan(0);
        expect(m.aides.filter((x) => x.deborde).map((x) => x.aide)).toEqual([]);
      });
    }
  });
});
