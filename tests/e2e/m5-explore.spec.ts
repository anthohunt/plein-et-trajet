// Jalon 5 — V1 recentrée : spec consolidée des extraits de l'exploration (tests/e2e/exploration/m5-test-snippets/, un fichier par
// histoire), jouée contre l'appli déployée et la base réelle (Supabase, fonctions voiture-eea et lieux, rpc moyennes_par_pays).
// Simulations déclarées : géolocalisation rejouée (GPX, tests/e2e/fixtures/), horloge accélérée (page.clock), états préparés en
// IndexedDB (format TrajetV1). Deux interceptions seulement, chacune marquée // MOCKED : V-2.E1 (base européenne injoignable) et
// V-6.4 (latence ajoutée à la vraie réponse de lieux) ; chacune de ces histoires a aussi des tests sans interception.
// Les rejeux longs restent courts : le tracé Albi → Toulouse à un relevé toutes les 3 s (PTS3), comme les extraits du round 3.
// Post-audit r3 : contour de focus des listes de T2 (V-2.1, V-2.3) et recherche de zone en Belgique (V-5.7).
// Les extraits restent rejouables seuls : npx playwright test --config tests/e2e/exploration/m5-snippets.config.ts
import { test, expect, D, PTS, PTS3, lireGpx, avecVoiture, demarrer, arreter, direct, rejouer, lireIdb, ecrireIdb, trajetPrepare, moyenne, rest, virgule, nb, euros2, lignes, prixLigne } from "./exploration/m5-test-snippets/_aides";
import type { Page } from "@playwright/test";

// mêmes réglages que m5-snippets.config.ts : téléphone tactile, départ à Albi (place du Vigan), 4 min par test au plus
test.use({ hasTouch: true, geolocation: { latitude: 43.92833, longitude: 2.145916 }, permissions: ["geolocation"] });
test.describe.configure({ timeout: 240_000 });

/** Contour :focus-visible de l'élément actif et sa liste : le contour tient-il dans la liste (qui coupe ce qui dépasse) ? */
async function contourDuFocus(page: Page) {
  return page.evaluate(() => {
    const e = document.activeElement as HTMLElement;
    const s = getComputedStyle(e);
    const r = e.getBoundingClientRect();
    const ul = e.closest("ul")!;
    const u = ul.getBoundingClientRect();
    const bord = parseFloat(getComputedStyle(ul).borderTopWidth);
    const ext = parseFloat(s.outlineOffset) + parseFloat(s.outlineWidth);
    const dansLaListe = r.top - ext >= u.top + bord - 0.5 && r.bottom + ext <= u.bottom - bord + 0.5 && r.left - ext >= u.left + bord - 0.5 && r.right + ext <= u.right - bord + 0.5;
    return { liste: ul.dataset.el, style: s.outlineStyle, largeur: parseFloat(s.outlineWidth), decalage: s.outlineOffset, dansLaListe };
  });
}

// ---- V-1.1 (extrait V-1.1.test.ts)
test.describe("V-1.1 — Ouvrir l'appli", () => {
  test.describe("Happy Path", () => {
    test("V-1.1 — voiture enregistrée : onglet Trajet sélectionné, voiture et « Démarrer », ni prix ni personnes", async ({ page, context }) => {
      await avecVoiture(context);
      await page.goto("/");
      await expect(page.locator('[role="tab"][aria-selected="true"]')).toHaveAttribute("data-el", "onglet-trajet");
      await expect(page.locator(D("nom-voiture"))).toHaveText("Renault Clio");
      await expect(page.locator(D("detail-voiture"))).toHaveText("1.2 · 118 ch · 2017 · SP95-E10");
      await expect(page.locator(D("bouton-demarrer"))).toHaveText("Démarrer");
      await expect(page.locator('[data-screen="T1"]')).not.toContainText(/€|Personnes/);
    });
  });
  test.describe("Edge Case", () => {
    test("V-1.1 — premier lancement : invitation, « Démarrer » ouvre Ma voiture", async ({ page }) => {
      await page.goto("/");
      await expect(page.locator(D("ma-voiture"))).toHaveAttribute("data-vide", "oui");
      await expect(page.locator('[data-screen="T1"]')).toContainText("Enregistre d'abord ta voiture");
      await page.locator(D("bouton-demarrer")).tap();
      await expect(page).toHaveURL(/\/voiture$/);
    });
    test("V-1.1 — trajet en cours : l'onglet Trajet ramène à En route", async ({ page, context }) => {
      await avecVoiture(context);
      await demarrer(page);
      await rejouer(context, page, PTS, 1, 60);
      await page.locator(D("onglet-historique")).tap();
      await page.locator(D("onglet-trajet")).tap();
      await expect(page).toHaveURL(/\/en-route$/);
      await expect(page.locator(D("etat-enregistrement"))).toHaveText("Enregistrement");
    });
  });
});

// ---- V-1.2 (extrait V-1.2.test.ts)
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

// ---- V-1.3 (extrait V-1.3.test.ts)
test.describe("V-1.3 — Démarrer", () => {
  test.describe("Happy Path", () => {
    test("V-1.3 — En route s'ouvre, « Enregistrement » clignote, 1re position en moins de 10 s", async ({ page, context }) => {
      await avecVoiture(context);
      await page.goto("/");
      const t0 = Date.now();
      await page.locator(D("bouton-demarrer")).tap();
      await expect(page).toHaveURL(/\/en-route$/);
      await expect(page.locator('[data-screen="T3"]')).toHaveAttribute("data-points", /^[1-9]/, { timeout: 10_000 });
      expect(Date.now() - t0).toBeLessThan(10_000);
      await expect(page.locator(D("etat-enregistrement"))).toHaveText("Enregistrement");
      expect(await page.locator(`${D("etat-enregistrement")} i`).evaluate((e) => getComputedStyle(e).animationName)).not.toBe("none");
    });
  });
  test.describe("Edge Case", () => {
    test.use({ permissions: [] });
    test("V-1.3 — localisation refusée : message, aucun trajet créé", async ({ page, context }) => {
      await avecVoiture(context);
      await page.goto("/");
      await page.locator(D("bouton-demarrer")).tap();
      await expect(page.locator(D("message-localisation"))).toContainText("L'enregistrement a besoin de ta localisation");
      await expect(page.locator(D("message-localisation"))).toContainText("Autoriser");
      const idb = await lireIdb(page);
      expect([idb.trajets.length, idb.enregistrement]).toEqual([0, null]);
    });
  });
});

// ---- V-2.1 (extrait V-2.1.test.ts)
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
    // post-audit r3 (lot 1, MEDIUM 2, US-A11Y-001) : même contrôle sur la liste des versions d'un code partagé
    test("V-2.1 — au clavier, la version sélectionnée a un contour entier, dans la liste", async ({ page }) => {
      await page.goto("/voiture");
      await page.locator("#d2").pressSequentially("M611Z1");
      await expect(page.locator(`${D("versions-d2")} button`).nth(1)).toBeVisible({ timeout: 60_000 });
      await page.locator("#d2").focus();
      await page.keyboard.press("Tab");
      const c = await contourDuFocus(page);
      expect(c.liste).toBe("versions-d2");
      expect(c.largeur).toBeGreaterThanOrEqual(2);
      expect(c.dansLaListe, `contour coupé par la liste (décalage ${c.decalage})`).toBe(true);
    });
    test("V-2.1 — minuscules et espaces : « r 5rbu 5rbu0c » reconnu", async ({ page }) => {
      await page.goto("/voiture");
      await page.locator("#d2").pressSequentially("r 5rbu 5rbu0c");
      await expect(page.locator("#d2")).toHaveValue("R 5RBU 5RBU0C");
      await expect(page.locator(D("fiche-voiture"))).toHaveAttribute("data-cle", /5RBU0C/, { timeout: 40_000 });
    });
  });
});

// ---- V-2.2 (extrait V-2.2.test.ts)
test.describe("V-2.2 — Vérifier et enregistrer", () => {
  test.describe("Happy Path", () => {
    test("V-2.2 — « Enregistrer ma voiture » : accueil avec cette voiture, gardée sur le téléphone", async ({ page }) => {
      await page.goto("/voiture");
      await page.locator("#d2").pressSequentially("5RBU0C");
      await page.locator(D("fiche-voiture")).waitFor({ timeout: 40_000 });
      await page.locator(D("enregistrer-voiture")).tap();
      await expect(page.locator(D("nom-voiture"))).toHaveText("Renault Clio");
      expect(JSON.parse((await page.evaluate(() => localStorage.getItem("pt-voiture-v1")))!).ve).toBe("5RBU0C");
      await page.reload();
      await expect(page.locator(D("detail-voiture"))).toHaveText("1.2 · 118 ch · 2017 · SP95-E10");
    });
  });
  test.describe("Edge Case", () => {
    test("V-2.2 — aucune version identifiée : bouton désactivé", async ({ page }) => {
      await page.goto("/voiture");
      await expect(page.locator(D("enregistrer-voiture"))).toBeDisabled();
      await page.locator("#d2").pressSequentially("5RB");
      await expect(page.locator(D("enregistrer-voiture"))).toBeDisabled();
    });
  });
});

// ---- V-2.3 (extrait V-2.3.test.ts)
test.describe("V-2.3 — Chercher sans la carte grise", () => {
  test.describe("Happy Path", () => {
    test("V-2.3 — « clio 2017 120 » : Clio 2017 entre 115 et 125 ch, avec année, kW et carburant ; la toucher affiche la fiche", async ({ page }) => {
      await page.goto("/voiture");
      await page.locator("#q").pressSequentially("clio 2017 120");
      const b = page.locator(`${D("suggestions-voiture")} button`);
      await expect(b.first()).toBeVisible({ timeout: 60_000 });
      for (const t of await b.allInnerTexts()) {
        expect(t).toMatch(/clio/i);
        expect(t).toMatch(/2017 ·/);
        const ch = nb(t.match(/· ([\d,]+) kW/)![1]) / 0.7355;
        expect(ch).toBeGreaterThanOrEqual(115);
        expect(ch).toBeLessThanOrEqual(125.5);
        expect(t).toMatch(/SP95-E10|Gazole|SP98|SP95|E85|GPLc/);
      }
      await b.first().tap();
      await expect(page.locator(D("fiche-voiture"))).toBeVisible();
      await expect(page.locator(D("enregistrer-voiture"))).toBeEnabled();
    });
  });
  test.describe("Edge Case", () => {
    // post-audit r3 (lot 1, MEDIUM 2, US-A11Y-001) : la liste coupe ce qui dépasse (overflow hidden) ; le contour doit y tenir en entier
    test("V-2.3 — au clavier, chaque suggestion sélectionnée a un contour entier, dans la liste", async ({ page }) => {
      await page.goto("/voiture");
      await page.locator("#q").pressSequentially("clio 2017 120");
      await expect(page.locator(`${D("suggestions-voiture")} button`).nth(1)).toBeVisible({ timeout: 60_000 });
      await page.locator("#q").focus();
      for (let k = 0; k < 2; k++) {
        await page.keyboard.press("Tab");
        const c = await contourDuFocus(page);
        expect(c.liste).toBe("suggestions-voiture");
        expect(c.style).toBe("solid");
        expect(c.largeur).toBeGreaterThanOrEqual(2);
        expect(c.dansLaListe, `contour coupé par la liste (décalage ${c.decalage})`).toBe(true);
      }
    });
  });
});

// ---- V-2.E1 (extrait V-2.E1.test.ts)
test.describe("V-2.E1 — Code inconnu", () => {
  test.describe("Edge Case", () => {
    test("V-2.E1 — « ZZ9999 » : code introuvable, bouton désactivé", async ({ page }) => {
      await page.goto("/voiture");
      await page.locator("#d2").pressSequentially("ZZ9999");
      await expect(page.locator(D("erreur-d2"))).toHaveText("Code introuvable. Vérifie la case D.2, ou cherche par nom ci-dessous.", { timeout: 40_000 });
      await expect(page.locator(D("enregistrer-voiture"))).toBeDisabled();
    });
    // MOCKED: la vraie base européenne ne tombe pas sur commande — la réponse de voiture-eea est remplacée par un 502
    test("V-2.E1 — base injoignable : message, « Réessayer », saisie gardée", async ({ page }) => {
      await page.route("**/functions/v1/voiture-eea**", (r) => r.fulfill({ status: 502, contentType: "application/json", body: '{"erreur":"base_injoignable"}' }));
      await page.goto("/voiture");
      await page.locator("#d2").pressSequentially("5RBF0A");
      await expect(page.locator(D("erreur-d2"))).toContainText("La base européenne des voitures ne répond pas.");
      await expect(page.locator(D("reessayer-d2"))).toHaveText("Réessayer");
      await expect(page.locator("#d2")).toHaveValue("5RBF0A");
      await page.unroute("**/functions/v1/voiture-eea**");
      await page.locator(D("reessayer-d2")).tap();
      await expect(page.locator(D("fiche-carburant"))).toHaveText("Gazole", { timeout: 40_000 });
    });
  });
});

// ---- V-3.1 (extrait V-3.1.test.ts)
test.describe("V-3.1 — Suivre en direct", () => {
  test.describe("Happy Path", () => {
    test("V-3.1 — en roulant, vitesse, km, litres, euros, durée augmentent ; coût = litres × moyenne France SP95-E10", async ({ page, context }) => {
      await avecVoiture(context);
      await demarrer(page);
      await rejouer(context, page, PTS, 1, 200);
      const a = await direct(page);
      const vues: number[] = [];
      const retards: number[] = [];
      await rejouer(context, page, PTS, 200, 400, async () => {
        vues.push(Number(await page.locator(D("vitesse")).getAttribute("data-kmh")));
        // cadence : l'écran montre la dernière position reçue ; écart entre l'horloge de la page et l'instant de cette position
        const [dernier, maintenant] = await page.evaluate(() => [Number(document.querySelector('[data-screen="T3"]')?.getAttribute("data-dernier-point")), Date.now()]);
        retards.push(maintenant - dernier);
      });
      const b = await direct(page);
      const changements = vues.filter((v, i) => i > 0 && v !== vues[i - 1]).length;
      expect(changements).toBeGreaterThan(20); // redessinée à chaque position (1 par seconde) : la vitesse change souvent en 200 s
      expect(Math.max(...retards)).toBeLessThanOrEqual(2000); // mise à jour en 2 s au plus après chaque position (critère V-3.1)
      expect(b.km).toBeGreaterThan(a.km);
      expect(b.litres).toBeGreaterThan(a.litres);
      expect(b.euros).toBeGreaterThan(a.euros);
      const fr = await moyenne("SP95-E10");
      await expect(page.locator(D("prix-direct"))).toHaveText(`Prix : moyenne France du jour · ${virgule(fr, 3)} €/L`);
      expect(Math.abs(b.euros - b.litres * fr)).toBeLessThanOrEqual(0.005 * fr + 0.006);
    });
  });
  test.describe("Edge Case", () => {
    test("V-3.1 — prix pris sur une station : le coût en direct l'utilise", async ({ page, context }) => {
      await avecVoiture(context);
      await page.goto("/");
      await page.evaluate(() => localStorage.setItem("pt-prix-choisi", JSON.stringify({ prix: 1.99, carburant: "SP95-E10", station: "essai" })));
      await demarrer(page);
      await rejouer(context, page, PTS, 1, 300);
      await expect(page.locator(D("prix-direct"))).toHaveText("Prix : mon prix · 1,990 €/L");
      const d = await direct(page);
      expect(Math.abs(d.euros - d.litres * 1.99)).toBeLessThanOrEqual(0.016);
    });
  });
});

// ---- V-3.4 (extrait V-3.4.test.ts)
test.describe("V-3.4 — Mettre en pause", () => {
  test.describe("Happy Path", () => {
    test("V-3.4 — Pause : « En pause », km et litres figés, « Reprendre »", async ({ page, context }) => {
      await avecVoiture(context);
      await demarrer(page);
      await rejouer(context, page, PTS, 1, 1000);
      await page.locator(D("bouton-pause")).tap();
      const a = await direct(page);
      for (let i = 1000; i < 1020; i++) {
        await page.clock.runFor(1000);
        await context.setGeolocation({ latitude: PTS[i].lat, longitude: PTS[i].lon });
      }
      const b = await direct(page);
      await expect(page.locator(D("etat-enregistrement"))).toHaveText("En pause");
      await expect(page.locator(D("bouton-pause"))).toHaveText("Reprendre");
      expect([b.km, b.litres]).toEqual([a.km, a.litres]);
    });
  });
  test.describe("Edge Case", () => {
    test("V-3.4 — 2 km parcourus pendant la pause ne sont ni comptés ni chiffrés", async ({ page, context }) => {
      await avecVoiture(context);
      await demarrer(page);
      await rejouer(context, page, PTS, 1, 1750);
      await page.locator(D("bouton-pause")).tap();
      const a = await direct(page);
      for (let i = 1750; i <= 1821; i++) { await page.clock.runFor(1000); await context.setGeolocation({ latitude: PTS[i].lat, longitude: PTS[i].lon }); }
      await page.locator(D("bouton-pause")).tap();
      await rejouer(context, page, PTS, 1822, 1882);
      const b = await direct(page);
      expect(b.km - a.km).toBeGreaterThan(1.5); // ≈ 1,7 km roulés depuis la reprise (GPX)
      expect(b.km - a.km).toBeLessThan(1.9); // et pas les 2,07 km de la pause en plus
    });
  });
});

// ---- V-3.5 (extrait V-3.5.test.ts)
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

// ---- V-3.E1 (extrait V-3.E1.test.ts)
const IMM = lireGpx("albi-toulouse-immobile-11min.gpx"); // tracé dérivé : 775 points roulés puis 11 min sur place (±2 m)

async function jusquaAlerte(page: any, context: any) {
  await avecVoiture(context);
  await context.setGeolocation({ latitude: IMM[0].lat, longitude: IMM[0].lon });
  await demarrer(page);
  let tImm = 0;
  await rejouer(context, page, IMM, 1, 774, async (k: number) => { if (k === 773) tImm = await page.evaluate(() => Date.now()); });
  const a = await direct(page);
  const vitesses: number[] = [];
  await rejouer(context, page, IMM, 774, 1365, async (k: number) => { if (k % 50 === 0) vitesses.push(Number(await page.locator(D("vitesse")).getAttribute("data-kmh"))); });
  const b = await direct(page);
  // round 2 (audit lot 1, MEDIUM 3) : garé à ±2 m pendant 10 min, ni km ni litres de plus, 0 km/h
  expect([b.km, b.litres]).toEqual([a.km, a.litres]);
  expect(vitesses.every((v) => v === 0)).toBe(true);
  for (let k = 1365; k < IMM.length && (await page.locator('[data-screen="T3"]').getAttribute("data-etat")) !== "immobile"; k++) {
    await page.clock.runFor(1000);
    await context.setGeolocation({ latitude: IMM[k].lat, longitude: IMM[k].lon });
    await page.clock.runFor(10);
  }
  return tImm;
}
test.describe("V-3.E1 — Oubli d'arrêter", () => {
  test.describe("Edge Case", () => {
    test("V-3.E1 — 10 min sous 3 km/h dans 50 m : alerte, puis « C'est fini » date l'arrivée du début de l'immobilité", async ({ page, context }) => {
      test.setTimeout(300_000); // 1 400 positions rejouées (LOW 13 lot 1)
      const tImm = await jusquaAlerte(page, context);
      await expect(page.locator(D("alerte-immobile"))).toContainText("Trajet arrêté : immobile depuis 10 min.");
      await expect(page.locator(D("immobile-reprendre"))).toHaveText("Reprendre");
      await expect(page.locator(D("immobile-fini"))).toHaveText("C'est fini");
      await page.locator(D("immobile-fini")).tap();
      await expect(page).toHaveURL(/\/fin$/);
      const a = (await lireIdb(page)).arrete;
      expect(Math.abs(a.fin - tImm)).toBeLessThanOrEqual(2000);
      await expect(page.locator(D("sous-titre-trajet"))).toContainText("· 12 min ·");
    });
    test("V-3.E1 — « Reprendre » : l'enregistrement repart sans perdre les points d'avant", async ({ page, context }) => {
      test.setTimeout(300_000); // 1 400 positions rejouées (LOW 13 lot 1)
      await jusquaAlerte(page, context);
      const n = (await direct(page)).points;
      await page.locator(D("immobile-reprendre")).tap();
      await expect(page.locator('[data-screen="T3"]')).toHaveAttribute("data-etat", "enregistrement");
      expect((await direct(page)).points).toBe(n);
      const avant = await direct(page);
      await rejouer(context, page, IMM, IMM.length - 10, IMM.length);
      const apres = await direct(page);
      expect(apres.points).toBeGreaterThan(n);
      // toujours garé : 0 km/h, ni km ni litres de plus (r1 : 10 km/h, +0,1 km)
      await expect(page.locator(D("vitesse"))).toHaveAttribute("data-kmh", "0");
      expect([apres.km, apres.litres]).toEqual([avant.km, avant.litres]);
    });
  });
});

// ---- V-3.E2 (extrait V-3.E2.test.ts)
const TUN = lireGpx("albi-toulouse-tunnel-90s.gpx"); // tracé dérivé : 90 s sans position sur 3 km (A68)

test.describe("V-3.E2 — GPS perdu", () => {
  test.describe("Edge Case", () => {
    test("V-3.E2 — 15 s sans position : « GPS perdu » ; au retour, les 3 km sont ajoutés et le message disparaît", async ({ page, context }) => {
      await avecVoiture(context);
      await context.setGeolocation({ latitude: TUN[0].lat, longitude: TUN[0].lon });
      await demarrer(page);
      const g = TUN.findIndex((x: any, k: number) => k > 0 && x.t - TUN[k - 1].t > 15_000);
      await rejouer(context, page, TUN, 1, g);
      await page.clock.runFor(16_000);
      await expect(page.locator(D("gps-perdu"))).toHaveText("GPS perdu (tunnel) · la distance est complétée à la sortie.");
      await page.clock.runFor(TUN[g].t - TUN[g - 1].t - 17_000);
      const avant = (await direct(page)).km;
      await rejouer(context, page, TUN, g, g + 1);
      const ajout = (await direct(page)).km - avant;
      expect(ajout).toBeGreaterThanOrEqual(2.9);
      expect(ajout).toBeLessThanOrEqual(3.1);
      await expect(page.locator(D("gps-perdu"))).toHaveCount(0);
    });
  });
});

// ---- V-4.1 (extrait V-4.1.test.ts)
test.describe("V-4.1 — Prix de l'essence", () => {
  test.describe("Happy Path", () => {
    test("V-4.1 — fin d'un trajet parti de France : SP95-E10 choisi, « Moyenne France du jour » à 3 décimales ; Gazole recalcule", async ({ page, context }) => {
      await avecVoiture(context);
      await demarrer(page);
      await rejouer(context, page, PTS, 1, 900);
      await arreter(page);
      const e10 = await moyenne("SP95-E10"), gaz = await moyenne("Gazole");
      await expect(page.locator(`${D("carburant-apres")} button`)).toHaveText(["Gazole", "SP95-E10", "SP95", "SP98", "E85", "GPLc"]);
      await expect(page.locator(`${D("carburant-apres")} [aria-pressed="true"]`)).toHaveText("SP95-E10");
      await expect(page.locator(D("libelle-prix"))).toHaveText("Moyenne France du jour");
      await expect(page.locator(D("compteur-prix"))).toHaveAttribute("aria-label", new RegExp(virgule(e10, 3)));
      const litres = Number(await page.locator(D("fin-litres")).getAttribute("data-litres"));
      await page.locator(`${D("carburant-apres")} [data-carburant="Gazole"]`).tap();
      await expect(page.locator(D("prix-apres"))).toHaveAttribute("data-prix", String(gaz));
      await expect(page.locator(D("cout-trajet"))).toHaveAttribute("data-cout", String(euros2(litres * gaz)));
    });
  });
  test.describe("Edge Case", () => {
    test.use({ geolocation: { latitude: 41.38706, longitude: 2.17008 } });
    test("V-4.1 — départ de Barcelone : moyenne Espagne du jour, pays nommé", async ({ page, context }) => {
      const BCN = lireGpx("barcelone.gpx"); // vrai itinéraire routier (Valhalla), plaça de Catalunya → Sagrada Família
      await avecVoiture(context);
      await demarrer(page);
      await rejouer(context, page, BCN, 1, BCN.length);
      await arreter(page);
      const es = await moyenne("SP95-E10", "ES");
      await expect(page.locator(D("libelle-prix"))).toHaveText("Moyenne Espagne du jour");
      await expect(page.locator(D("prix-apres"))).toHaveAttribute("data-prix", String(es));
      expect((await lireIdb(page)).arrete.pays_depart).toBe("ES");
    });
  });
});

// ---- V-4.2 (extrait V-4.2.test.ts)
test.describe("V-4.2 — Mettre mon prix", () => {
  test.describe("Happy Path", () => {
    test("V-4.2 — 1,989 : « Mon prix », coût recalculé, « Revenir à la moyenne » rend la moyenne", async ({ page, context }) => {
      await avecVoiture(context);
      await demarrer(page);
      await rejouer(context, page, PTS, 1, 600);
      await arreter(page);
      const litres = Number(await page.locator(D("fin-litres")).getAttribute("data-litres"));
      const e10 = await moyenne("SP95-E10");
      await page.locator(D("compteur-prix")).tap();
      await page.locator(D("champ-prix")).fill("1,989");
      await page.locator(D("champ-prix")).press("Enter");
      await expect(page.locator(D("libelle-prix"))).toHaveText("Mon prix");
      await expect(page.locator(D("cout-trajet"))).toHaveAttribute("data-cout", String(euros2(litres * 1.989)));
      await page.locator(D("revenir-moyenne")).tap();
      await expect(page.locator(D("libelle-prix"))).toHaveText("Moyenne France du jour");
      await expect(page.locator(D("cout-trajet"))).toHaveAttribute("data-cout", String(euros2(litres * e10)));
    });
  });
  test.describe("Edge Case", () => {
    test("V-4.2 — Échap : le prix d'avant reste", async ({ page, context }) => {
      await avecVoiture(context);
      await demarrer(page);
      await rejouer(context, page, PTS, 1, 600);
      await arreter(page);
      const avant = await page.locator(D("prix-apres")).getAttribute("data-prix");
      await page.locator(D("compteur-prix")).tap();
      await page.locator(D("champ-prix")).fill("1,5");
      await page.locator(D("champ-prix")).press("Escape");
      await expect(page.locator(D("champ-prix"))).toHaveCount(0);
      await expect(page.locator(D("prix-apres"))).toHaveAttribute("data-prix", avant!);
    });
  });
});

// ---- V-4.3 (extrait V-4.3.test.ts)
// ÉTAT PRÉPARÉ : 41,2 L à 2,161 €/L ne se roulent pas en un essai ; le trajet arrêté est écrit en IndexedDB au format de l'appli.
test.describe("V-4.3 — Coût de l'essence", () => {
  test.describe("Happy Path", () => {
    test("V-4.3 — 41,2 L × 2,161 €/L = 89,03 € essence ; recalculé hors ligne au changement de prix", async ({ page, context }) => {
      await avecVoiture(context);
      await page.goto("/historique");
      await page.locator('[data-screen="T6"]').waitFor();
      await ecrireIdb(page, [], trajetPrepare({ id: "s-412", debut: "2026-10-21T06:30:00+02:00", minutes: 345, km: 588, litres: 41.2, prix: await moyenne("SP95-E10"), prixPerso: 2.161, depart: "Albi", arrivee: "Paris", enregistre: false }));
      await page.goto("/");
      await expect(page).toHaveURL(/\/fin$/);
      await expect(page.locator(D("cout-trajet"))).toHaveText(/^89,03\s*€ essence$/);
      await context.setOffline(true);
      await page.locator(D("compteur-prix")).tap();
      await page.locator(D("champ-prix")).fill("2,050");
      await page.locator(D("champ-prix")).press("Enter");
      await expect(page.locator(D("cout-trajet"))).toHaveText(/^84,46\s*€ essence$/);
    });
  });
});

// ---- V-4.4 (extrait V-4.4.test.ts)
// ÉTAT PRÉPARÉ : le trajet arrêté de 89,03 € (41,2 L à 2,161 €/L) écrit en IndexedDB au format de l'appli.
test.describe("V-4.4 — Partager", () => {
  test.beforeEach(async ({ page, context }) => {
    await avecVoiture(context);
    await page.goto("/historique");
    await page.locator('[data-screen="T6"]').waitFor();
    await ecrireIdb(page, [], trajetPrepare({ id: "s-412", debut: "2026-10-21T06:30:00+02:00", minutes: 345, km: 588, litres: 41.2, prix: 2.156, prixPerso: 2.161, depart: "Albi", arrivee: "Paris", enregistre: false }));
    await page.goto("/");
    await expect(page.locator(D("cout-trajet"))).toHaveText(/^89,03\s*€ essence$/);
  });
  test.describe("Happy Path", () => {
    test("V-4.4 — 3 personnes : 29,68 € chacun", async ({ page }) => {
      await page.locator(D("personnes-plus")).tap();
      await page.locator(D("personnes-plus")).tap();
      await expect(page.locator(D("part-personne"))).toHaveText("29,68 € chacun");
    });
  });
  test.describe("Edge Case", () => {
    test("V-4.4 — seul : « Seul : tout pour toi. », bornes 1 et 9", async ({ page }) => {
      await expect(page.locator(D("part-personne"))).toHaveText("Seul : tout pour toi.");
      await expect(page.locator(D("personnes-moins"))).toBeDisabled();
      for (let k = 0; k < 8; k++) await page.locator(D("personnes-plus")).tap();
      await expect(page.locator(D("personnes-apres"))).toHaveAttribute("data-personnes", "9");
      await expect(page.locator(D("personnes-plus"))).toBeDisabled();
    });
  });
});

// ---- V-4.5 (extrait V-4.5.test.ts)
test.describe("V-4.5 — Courbe de vitesse", () => {
  test.describe("Happy Path", () => {
    test("V-4.5 — courbe sur tout le trajet (≤ 600 points), moyenne sur le temps roulé, accélérations", async ({ page, context }) => {
      test.setTimeout(300_000); // tracé complet à un relevé toutes les 3 s (PTS3) : rejeu ~3 fois plus court qu'à 1 s (audit r2 LOW 2 / LOW 7)
      await avecVoiture(context);
      await demarrer(page);
      await rejouer(context, page, PTS3, 1, PTS3.length);
      await arreter(page);
      const c = page.locator(D("courbe-vitesse"));
      const n = Number(await c.getAttribute("data-points"));
      expect(n).toBeGreaterThan(50);
      expect(n).toBeLessThanOrEqual(600);
      const a = (await lireIdb(page)).arrete;
      expect(Math.abs(a.vitesse_moy - (a.km / a.duree_s) * 3600)).toBeLessThan(1);
      await expect(page.locator(D("info-vitesse"))).toHaveText(new RegExp(`^${a.vitesse_moy} km/h moy\\. · ${a.accelerations} accélérations?$`));
    });
  });
});

// ---- V-4.6 (extrait V-4.6.test.ts)
test.describe("V-4.6 — Courbe de consommation", () => {
  test.describe("Happy Path", () => {
    test("V-4.6 — moyenne affichée = litres ÷ km × 100 (à 0,1 près), pointe = maximum de la courbe", async ({ page, context }) => {
      await avecVoiture(context);
      await demarrer(page);
      await rejouer(context, page, PTS, 1, 1500);
      await arreter(page);
      const a = (await lireIdb(page)).arrete;
      const pointe = Math.max(a.conso_max, ...a.consos);
      await expect(page.locator(D("info-conso"))).toHaveText(`moy. ${virgule((a.litres / a.km) * 100, 1)} · pointe ${virgule(pointe, 1)} L/100`);
      expect(Number(await page.locator(D("courbe-conso")).getAttribute("data-points"))).toBeLessThanOrEqual(600);
      // round 2 (audit lot 2, MEDIUM 4) : courbe lissée sur 500 m, pointe plausible ; moyenne des tranches = litres ÷ km × 100
      expect(pointe).toBeLessThan(30);
      expect(Math.abs(a.consos.reduce((s: number, x: number) => s + x, 0) / a.consos.length - (a.litres / a.km) * 100)).toBeLessThan(0.1);
    });
  });
});

// ---- V-4.7 (extrait V-4.7.test.ts)
test.describe("V-4.7 — Enregistrer ou supprimer", () => {
  test.describe("Happy Path", () => {
    test("V-4.7 — « Enregistrer » : Historique avec ce trajet en tête, prix, carburant et personnes gardés", async ({ page, context }) => {
      await avecVoiture(context);
      await demarrer(page);
      await rejouer(context, page, PTS, 1, 600);
      await arreter(page);
      const id = await page.locator('[data-screen="T4"]').getAttribute("data-trajet");
      await page.locator(`${D("carburant-apres")} [data-carburant="Gazole"]`).tap();
      await page.locator(D("personnes-plus")).tap();
      await page.locator(D("enregistrer-trajet")).tap();
      await expect(page).toHaveURL(/\/historique$/);
      await expect(page.locator("li.hrow").first()).toHaveAttribute("data-trajet", id!);
      const t = (await lireIdb(page)).trajets.find((x: any) => x.id === id);
      expect([t.carburant, t.personnes, t.enregistre]).toEqual(["Gazole", 2, true]);
      // round 2 : la ligne montre le carburant et le prix choisis, et la part de chacun
      await expect(page.locator(`li.hrow[data-trajet="${id}"] [data-el="carburant-ligne"]`)).toHaveText(`Gazole à ${virgule(t.prix_perso ?? t.prix_litre, 3)} €/L`);
      await expect(page.locator(`li.hrow[data-trajet="${id}"] [data-el="part-ligne"]`)).toContainText("€ chacun");
    });
  });
  test.describe("Edge Case", () => {
    test("V-4.7 — « Supprimer » : accueil, rien dans l'historique ni sur le téléphone", async ({ page, context }) => {
      await avecVoiture(context);
      await demarrer(page);
      await rejouer(context, page, PTS, 1, 600);
      await arreter(page);
      await page.locator(D("supprimer-neuf")).tap();
      await expect(page.locator('[data-screen="T1"]')).toBeVisible();
      const idb = await lireIdb(page);
      expect([idb.trajets.length, idb.arrete, idb.enregistrement]).toEqual([0, null, null]);
    });
    test("V-4.7 — appli fermée avant de choisir : la fin revient avec les deux boutons", async ({ page, context }) => {
      await avecVoiture(context);
      await demarrer(page);
      await rejouer(context, page, PTS, 1, 600);
      await arreter(page);
      const id = await page.locator('[data-screen="T4"]').getAttribute("data-trajet");
      const p2 = await context.newPage();
      await page.close();
      await p2.goto("/");
      await expect(p2).toHaveURL(/\/fin$/);
      await expect(p2.locator('[data-screen="T4"]')).toHaveAttribute("data-trajet", id!);
      await expect(p2.locator(D("enregistrer-ou-supprimer"))).toContainText("Supprimer");
      await expect(p2.locator(D("enregistrer-ou-supprimer"))).toContainText("Enregistrer");
    });
  });
});

// ---- V-5.1 (extrait V-5.1.test.ts)
test.describe("V-5.1 — Stations autour de moi", () => {
  test.describe("Happy Path", () => {
    test("V-5.1 — carte centrée sur ma position, stations à moins de 10 km au prix officiel du jour", async ({ page, context }) => {
      await avecVoiture(context);
      await page.goto("/");
      await page.locator(D("onglet-stations")).tap();
      await expect(lignes(page).first()).toBeVisible({ timeout: 30_000 });
      const n = await lignes(page).count();
      await expect(page.locator(D("carte-stations"))).toHaveAttribute("data-pastilles", String(n));
      for (let i = 0; i < n; i++) {
        const l = lignes(page).nth(i);
        const [base] = await rest(`prix?select=prix&carburant=eq.SP95-E10&station_id=eq.${await l.getAttribute("data-station")}`);
        expect(await prixLigne(l)).toBeCloseTo(Number(base.prix), 3);
      }
      await expect(page.locator(D("lieu"))).toHaveText("Autour de moi");
    });
  });
  test.describe("Edge Case", () => {
    test("V-5.1 — pendant un trajet : stations autour de la voiture, l'enregistrement continue", async ({ page, context }) => {
      await avecVoiture(context);
      await demarrer(page);
      await rejouer(context, page, PTS, 1, 1450);
      const km = Number((await page.locator(D("direct-km")).textContent())!.replace(",", "."));
      await page.clock.resume();
      await page.locator(D("onglet-stations")).tap();
      await expect(lignes(page).first()).toBeVisible({ timeout: 30_000 });
      for (let i = 1450; i < 1462; i++) { await context.setGeolocation({ latitude: PTS[i].lat, longitude: PTS[i].lon }); await page.waitForTimeout(1000); }
      await page.locator(D("onglet-trajet")).tap();
      await expect.poll(async () => Number((await page.locator(D("direct-km")).textContent())!.replace(",", "."))).toBeGreaterThan(km);
    });
  });
});

// ---- V-5.2 (extrait V-5.2.test.ts)
test.describe("V-5.2 — Choisir le carburant", () => {
  test.describe("Happy Path", () => {
    test("V-5.2 — Clio SP95-E10 : SP95-E10 choisi d'office, même si Gazole était le dernier carburant regardé", async ({ page, context }) => {
      await avecVoiture(context);
      await page.goto("/");
      await page.evaluate(() => localStorage.setItem("pt-carburant", "Gazole"));
      await page.locator(D("onglet-stations")).tap();
      await expect(page.locator(`${D("selecteur-carburant")} [aria-pressed="true"]`)).toHaveText("SP95-E10");
      await expect(page.locator(D("titre-liste"))).toHaveText("Stations · SP95-E10");
    });
  });
  test.describe("Edge Case", () => {
    test("V-5.2 — Gazole : lignes et pastilles au prix du gazole, sans les stations qui n'en vendent pas", async ({ page, context }) => {
      await avecVoiture(context);
      await page.goto("/stations");
      await expect(lignes(page).first()).toBeVisible({ timeout: 30_000 });
      await page.locator(`${D("selecteur-carburant")} button`, { hasText: /^Gazole$/ }).tap();
      await expect(page.locator(D("liste-stations"))).toHaveAttribute("data-carburant", "Gazole");
      const n = await lignes(page).count();
      await expect(page.locator(D("carte-stations"))).toHaveAttribute("data-pastilles", String(n));
      for (let i = 0; i < n; i++) {
        const l = lignes(page).nth(i);
        const base = await rest(`prix?select=prix,rupture&carburant=eq.Gazole&station_id=eq.${await l.getAttribute("data-station")}`);
        expect(base.length && !base[0].rupture).toBeTruthy();
        expect(await prixLigne(l)).toBeCloseTo(Number(base[0].prix), 3);
      }
    });
    test.describe("Prayssac", () => {
      test.use({ geolocation: { latitude: 44.5041, longitude: 1.1885 } });
      test("V-5.2 — une vraie station sans gazole (TotalEnergies Prayssac, 46220005) disparaît de la liste et de la carte en Gazole", async ({ page, context }) => {
        const base = await rest("prix?select=carburant&station_id=eq.46220005");
        expect(base.map((x: any) => x.carburant)).toContain("SP95-E10");
        expect(base.map((x: any) => x.carburant)).not.toContain("Gazole");
        await avecVoiture(context);
        await page.goto("/stations");
        await expect(page.locator(`${D("ligne-station")}[data-station="46220005"]`)).toBeVisible({ timeout: 30_000 });
        await expect(page.locator(`${D("pastille-station")}[data-station="46220005"]`)).toHaveCount(1);
        await page.locator(`${D("selecteur-carburant")} button`, { hasText: /^Gazole$/ }).tap();
        await expect(page.locator(D("liste-stations"))).toHaveAttribute("data-carburant", "Gazole");
        await expect(page.locator(`${D("ligne-station")}[data-station="46220005"]`)).toHaveCount(0);
        await expect(page.locator(`${D("pastille-station")}[data-station="46220005"]`)).toHaveCount(0);
      });
    });
  });
});

// ---- V-5.3 (extrait V-5.3.test.ts)
test.describe("V-5.3 — Rechercher dans cette zone", () => {
  test.describe("Happy Path", () => {
    test("V-5.3 — glisser vers Montauban : bouton, liste inchangée ; le toucher charge la zone et le bouton disparaît", async ({ page, context }) => {
      await avecVoiture(context);
      await page.goto("/stations");
      await expect(lignes(page).first()).toBeVisible({ timeout: 30_000 });
      const avant = await lignes(page).evaluateAll((l) => l.map((x) => x.getAttribute("data-station")).join());
      for (let k = 0; k < 12; k++) {
        const r = await page.evaluate(() => { const m = (window as any).__carte; const q = m.project([1.355, 44.0176]); const c = m.getContainer(); return { dx: c.clientWidth / 2 - q.x, dy: c.clientHeight / 2 - q.y, w: c.clientWidth, h: c.clientHeight }; });
        if (Math.hypot(r.dx, r.dy) < 30) break;
        const f = Math.min(1, (r.w - 60) / Math.abs(r.dx || 1), (r.h - 60) / Math.abs(r.dy || 1));
        const bb = (await page.locator(`${D("carte-stations")} canvas`).boundingBox())!;
        const x0 = bb.x + bb.width / 2 - (r.dx * f) / 2, y0 = bb.y + bb.height / 2 - (r.dy * f) / 2;
        await page.mouse.move(x0, y0);
        await page.mouse.down();
        await page.mouse.move(x0 + r.dx * f, y0 + r.dy * f, { steps: 14 });
        await page.waitForTimeout(180);
        await page.mouse.up();
        await page.waitForTimeout(500);
      }
      await expect(page.locator(D("rechercher-zone"))).toHaveText("Rechercher dans cette zone");
      expect(await lignes(page).evaluateAll((l) => l.map((x) => x.getAttribute("data-station")).join())).toBe(avant);
      await page.locator(D("rechercher-zone")).tap();
      await expect(page.locator(D("rechercher-zone"))).toHaveCount(0);
      await expect(page.locator(D("lieu"))).toHaveText("Autour de Montauban", { timeout: 15_000 });
      await expect.poll(() => lignes(page).evaluateAll((l) => l.map((x) => x.getAttribute("data-station")).join())).not.toBe(avant);
    });
  });
});

// ---- V-5.4 (extrait V-5.4.test.ts)
test.describe("V-5.4 — Trier", () => {
  test.describe("Happy Path", () => {
    test("V-5.4 — « Plus proche » : distances croissantes ; « Moins cher » : prix croissants", async ({ page, context }) => {
      await avecVoiture(context);
      await page.goto("/stations");
      await expect(lignes(page).first()).toBeVisible({ timeout: 30_000 });
      const dist = (t: string) => { const m = t.match(/([\d,]+)\s*(km|m)\b/)!; return m[2] === "km" ? nb(m[1]) : nb(m[1]) / 1000; };
      await page.locator(`${D("tri-liste")} button`, { hasText: "Plus proche" }).tap();
      await expect(page.locator(D("liste-stations"))).toHaveAttribute("data-tri", "distance");
      const d = (await lignes(page).allInnerTexts()).map(dist);
      expect(d).toEqual([...d].sort((a, b) => a - b));
      await page.locator(`${D("tri-liste")} button`, { hasText: "Moins cher" }).tap();
      await expect(page.locator(D("liste-stations"))).toHaveAttribute("data-tri", "prix");
      const p: number[] = [];
      for (let i = 0; i < (await lignes(page).count()); i++) p.push(await prixLigne(lignes(page).nth(i)));
      expect(p).toEqual([...p].sort((a, b) => a - b));
    });
  });
});

// ---- V-5.5 (extrait V-5.5.test.ts)
test.describe("V-5.5 — Utiliser ce prix", () => {
  test.describe("Happy Path", () => {
    test("V-5.5 — pendant un trajet : la fiche se ferme, En route revient, coût en direct et fin au prix de la station", async ({ page, context }) => {
      await avecVoiture(context);
      await demarrer(page);
      await rejouer(context, page, PTS, 1, 500);
      await page.clock.resume();
      await page.locator(D("onglet-stations")).tap();
      await lignes(page).first().tap();
      const b = page.locator(D("utiliser-ce-prix"));
      const prix = Number(await b.getAttribute("data-prix"));
      await expect(b).toHaveText(`Utiliser ${virgule(prix, 3)} €/L pour mon trajet`);
      await b.tap();
      await expect(page).toHaveURL(/\/en-route$/);
      await expect(page.locator(D("fiche-station"))).toHaveCount(0);
      await expect(page.locator(D("prix-direct"))).toHaveText(`Prix : mon prix · ${virgule(prix, 3)} €/L`);
      await page.locator(D("bouton-arreter")).tap();
      await expect(page.locator(D("libelle-prix"))).toHaveText("Mon prix");
      await expect(page.locator(D("prix-apres"))).toHaveAttribute("data-prix", String(prix));
    });
  });
  test.describe("Edge Case", () => {
    test("V-5.5 — sans trajet : prix gardé pour le prochain trajet, l'accueil s'ouvre", async ({ page, context }) => {
      await avecVoiture(context);
      await page.goto("/stations");
      await lignes(page).first().tap();
      const prix = Number(await page.locator(D("utiliser-ce-prix")).getAttribute("data-prix"));
      await page.locator(D("utiliser-ce-prix")).tap();
      await expect(page.locator('[data-screen="T1"]')).toBeVisible();
      expect(JSON.parse((await page.evaluate(() => localStorage.getItem("pt-prix-choisi")))!).prix).toBe(prix);
      await page.locator(D("bouton-demarrer")).tap();
      await expect(page.locator(D("prix-direct"))).toHaveText(`Prix : mon prix · ${virgule(prix, 3)} €/L`);
    });
    test("V-5.5 — station sans SP95-E10 : pas de bouton", async ({ page, context }) => {
      await avecVoiture(context);
      await page.goto("/stations");
      await page.locator(`${D("selecteur-carburant")} button`, { hasText: /^Gazole$/ }).tap();
      await expect(page.locator(D("liste-stations"))).toHaveAttribute("data-carburant", "Gazole");
      const ids = await lignes(page).evaluateAll((l) => l.map((x) => x.getAttribute("data-station")!));
      const e10 = new Set((await rest(`prix?select=station_id&carburant=eq.SP95-E10&rupture=is.false&prix=not.is.null&station_id=in.(${ids.join(",")})`)).map((x: any) => x.station_id));
      const sans = ids.find((i) => !e10.has(i))!;
      expect(sans, "aucune station sans SP95-E10 dans la zone").toBeTruthy();
      await page.locator(`${D("ligne-station")}[data-station="${sans}"]`).tap();
      await expect(page.locator(D("tableau-prix"))).toHaveAttribute("aria-busy", "false");
      await expect(page.locator(D("utiliser-ce-prix"))).toHaveCount(0);
    });
  });
});

// ---- V-5.6 (extrait V-5.6.test.ts)
test.describe("V-5.6 — Trajet en cours", () => {
  test.describe("Happy Path", () => {
    test("V-5.6 — bandeau « ● Trajet en cours · X € » qui suit le coût ; l'onglet Trajet ramène à En route", async ({ page, context }) => {
      await avecVoiture(context);
      await page.goto("/stations");
      await expect(lignes(page).first()).toBeVisible({ timeout: 30_000 });
      await expect(page.locator(D("retour-trajet"))).toHaveCount(0); // sans trajet, pas de bandeau
      await demarrer(page);
      await rejouer(context, page, PTS, 1, 900);
      const euros = nb(await page.locator(D("direct-euros")).textContent());
      await page.clock.resume();
      await page.locator(D("onglet-stations")).tap();
      await expect(page.locator(D("retour-trajet"))).toHaveText(new RegExp(`^● Trajet en cours · ${virgule(euros, 2).replace(",", "\\,")} €$`));
      await page.locator(D("onglet-trajet")).tap();
      await expect(page).toHaveURL(/\/en-route$/);
    });
  });
});

// ---- V-5.7 (extrait V-5.7.test.ts)
test.describe("V-5.7 — Europe et Royaume-Uni", () => {
  test.describe("Happy Path", () => {
    test.use({ geolocation: { latitude: 41.3874, longitude: 2.1686 } });
    test("V-5.7 — Barcelone : stations espagnoles au prix du jour, sur un fond de carte", async ({ page, context }) => {
      await avecVoiture(context);
      // round 2 (audit lot 2, MEDIUM 5) : le fond couvre l'Europe — des tuiles OpenFreeMap répondent pour Barcelone
      const tuiles: number[] = [];
      page.on("response", (r) => { if (/tiles\.openfreemap\.org\/planet\//.test(r.url())) tuiles.push(r.status()); });
      await page.goto("/stations");
      await expect(lignes(page).first()).toBeVisible({ timeout: 30_000 });
      const ids = await lignes(page).evaluateAll((l) => l.map((x) => x.getAttribute("data-station")!));
      const st = await rest(`stations?select=id,pays&id=in.(${ids.map((i) => `"${i}"`).join(",")})`);
      expect(new Set(st.map((s: any) => s.pays))).toEqual(new Set(["ES"]));
      await expect.poll(() => tuiles.filter((x) => x === 200).length, { timeout: 20_000 }).toBeGreaterThan(0);
    });
  });
  test.describe("Edge Case", () => {
    test.describe("Royaume-Uni", () => {
      test.use({ geolocation: { latitude: 51.4462, longitude: 0.2169 } });
      test("V-5.7 — Dartford : prix en €/L au taux BCE du jour, prix d'origine en p/L", async ({ page, context }) => {
        await avecVoiture(context);
        await page.goto("/stations");
        const l = lignes(page).first();
        await expect(l).toBeVisible({ timeout: 30_000 });
        const id = await l.getAttribute("data-station");
        await l.tap();
        const [cours] = await rest("cours_change?select=taux&monnaie=eq.GBP&order=jour.desc&limit=1");
        await expect(page.locator(D("cours-du-jour"))).toContainText(`1 € = ${virgule(Number(cours.taux), 4)} £`);
        for (const b of (await rest(`prix?select=carburant,prix,prix_origine&station_id=eq.${id}`)).filter((x: any) => x.prix_origine != null)) {
          await expect(page.locator(`${D("prix-origine")} [data-carburant="${b.carburant}"]`)).toContainText(`${virgule(Number(b.prix_origine), 1)} p/L`);
          expect(Number(b.prix)).toBeCloseTo(Number(b.prix_origine) / 100 / Number(cours.taux), 2);
        }
      });
    });
    test.describe("Pays sans flux", () => {
      test.use({ geolocation: { latitude: 50.8467, longitude: 4.3525 } });
      test("V-5.7 — Belgique : un message au lieu d'une carte vide", async ({ page, context }) => {
        await avecVoiture(context);
        await page.goto("/stations");
        await expect(page.locator(D("pays-sans-flux"))).toContainText("Ce pays ne publie pas les prix station par station", { timeout: 30_000 });
        await expect(page.locator(D("prix-moyen-national"))).toContainText("Moyenne nationale · Belgique · SP95-E10");
      });
      // post-audit r3 (lot 2, MEDIUM) : la recherche de zone passe par « Aucune station… » le temps de trouver le pays ;
      // au bout, le message du pays revient (celui d'APRÈS le toucher) et l'état vide a disparu
      test("V-5.7 — Belgique, « Rechercher dans cette zone » : le message du pays au bout, pas « Aucune station… »", async ({ page, context }) => {
        await avecVoiture(context);
        await page.goto("/stations");
        await expect(page.locator(D("pays-sans-flux"))).toBeVisible({ timeout: 30_000 });
        await page.waitForTimeout(1500);
        const bb = (await page.locator(`${D("carte-stations")} canvas`).first().boundingBox())!;
        const [x0, y0] = [bb.x + bb.width / 2 + 45, bb.y + bb.height / 2 - 20];
        await page.mouse.move(x0, y0);
        await page.mouse.down();
        for (let s = 1; s <= 14; s++) await page.mouse.move(x0 - (90 * s) / 14, y0 + (40 * s) / 14);
        await page.mouse.up();
        await expect(page.locator(D("rechercher-zone"))).toBeVisible({ timeout: 5_000 });
        await page.evaluate(() => document.querySelectorAll('[data-el="pays-sans-flux"]').forEach((e) => ((e as HTMLElement).dataset.avant = "1")));
        await page.locator(D("rechercher-zone")).tap();
        await expect(page.locator(D("rechercher-zone"))).toHaveCount(0);
        await expect(page.locator(`${D("pays-sans-flux")}:not([data-avant])`)).toContainText("Ce pays ne publie pas les prix station par station", { timeout: 30_000 });
        await expect(page.locator(D("etat-vide"))).toHaveCount(0);
        await expect(page.locator(D("prix-moyen-national"))).toContainText("Belgique");
      });
    });
  });
});

// ---- V-6.1 (extrait V-6.1.test.ts)
test.describe("V-6.1 — Ouvrir l'historique", () => {
  test.describe("Happy Path", () => {
    test("V-6.1 — trajets de septembre et d'octobre : du plus récent au plus ancien, « Octobre 2026 » puis « Septembre 2026 »", async ({ browser }) => {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, permissions: ["geolocation"], geolocation: { latitude: PTS[0].lat, longitude: PTS[0].lon } });
      await avecVoiture(context);
      for (const date of ["2026-09-14T08:00:00+02:00", "2026-10-05T17:30:00+02:00"]) {
        const page = await context.newPage();
        await page.clock.install({ time: new Date(date) }); // vrai trajet rejoué, horloge de la page posée à cette date
        await page.goto("/");
        await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 1000);
        await page.locator(D("bouton-demarrer")).tap();
        await rejouer(context, page, PTS, 1, 600);
        await arreter(page);
        await page.locator(D("enregistrer-trajet")).tap();
        await expect(page).toHaveURL(/\/historique$/);
        await page.close();
      }
      const page = await context.newPage();
      await page.goto("/historique");
      await expect(page.locator("li.mois")).toHaveCount(2);
      expect(await page.locator("li.mois").evaluateAll((l) => l.map((x) => x.getAttribute("data-mois")))).toEqual(["Octobre 2026", "Septembre 2026"]);
      await expect(page.locator("li.hrow").first()).toContainText("5 oct.");
      await expect(page.locator("li.hrow").last()).toContainText("14 sept.");
      await context.close();
    });
  });
  test.describe("Edge Case", () => {
    test("V-6.1 — aucun trajet : « Aucun trajet enregistré. », totaux à 0", async ({ page }) => {
      await page.goto("/historique");
      await expect(page.locator(D("historique-vide"))).toHaveText("Aucun trajet enregistré.");
      await expect(page.locator(D("totaux-historique"))).toHaveAttribute("data-trajets", "0");
      await expect(page.locator(D("total-km"))).toHaveText("0,0"); // une décimale sous 100 km (3a2c194)
      await expect(page.locator(D("total-euros"))).toHaveText("0,00");
    });
  });
});

// ---- V-6.2 (extrait V-6.2.test.ts)
// ÉTAT PRÉPARÉ : 4 trajets de 77, 152, 245 et 243 km écrits en IndexedDB au format de l'appli (TrajetV1).
test.describe("V-6.2 — Totaux", () => {
  test.describe("Happy Path", () => {
    test("V-6.2 — 4 trajets, 717 km et la somme de leurs coûts ; recalculés après correction", async ({ page }) => {
      const p = await moyenne("SP95-E10");
      const T = [[77, 4.93], [152, 10.03], [245, 16.91], [243, 16.28]].map(([km, l], k) => trajetPrepare({ id: `s-${km}`, debut: `2026-10-${String(3 + k * 4).padStart(2, "0")}T08:00:00+02:00`, minutes: 120, km, litres: l, prix: p, depart: "Albi", arrivee: "Ailleurs" }));
      await page.goto("/historique");
      await page.locator('[data-screen="T6"]').waitFor();
      await ecrireIdb(page, T);
      await page.reload();
      const somme = euros2(T.reduce((s, t) => s + euros2(t.litres * p), 0));
      await expect(page.locator(D("totaux-historique"))).toHaveAttribute("data-trajets", "4");
      await expect(page.locator(D("total-km"))).toHaveText("717");
      await expect(page.locator(D("total-euros"))).toHaveText(virgule(somme, 2));
      await page.locator('li.hrow[data-trajet="s-152"] button').tap();
      await page.locator(D("compteur-prix")).tap();
      await page.locator(D("champ-prix")).fill("1,899");
      await page.locator(D("champ-prix")).press("Enter");
      await page.locator(D("retour-historique")).tap();
      await expect(page.locator(D("total-euros"))).toHaveText(virgule(euros2(somme - euros2(10.03 * p) + euros2(10.03 * 1.899)), 2));
    });
  });
});

// ---- V-6.3 (extrait V-6.3.test.ts)
// ÉTAT PRÉPARÉ : un trajet à 3 personnes et un trajet seul, écrits en IndexedDB au format de l'appli.
test.describe("V-6.3 — Lire un trajet", () => {
  test.describe("Happy Path", () => {
    test("V-6.3 — ligne : date, départ → arrivée, km, coût, « X € chacun » (pas de part pour un trajet seul) ; la toucher rouvre la fin", async ({ page }) => {
      await page.goto("/historique");
      await page.locator('[data-screen="T6"]').waitFor();
      await ecrireIdb(page, [
        trajetPrepare({ id: "s-3p", debut: "2026-10-18T10:00:00+02:00", minutes: 75, km: 92.4, litres: 6.01, prix: 2.156, depart: "Albi", arrivee: "Rodez", personnes: 3 }),
        trajetPrepare({ id: "s-seul", debut: "2026-10-19T18:00:00+02:00", minutes: 70, km: 76.8, litres: 4.84, prix: 2.156, depart: "Toulouse", arrivee: "Albi" }),
      ]);
      await page.reload();
      const cout = euros2(6.01 * 2.156);
      await expect(page.locator('li.hrow[data-trajet="s-3p"]')).toContainText("Albi → Rodez");
      await expect(page.locator('li.hrow[data-trajet="s-3p"]')).toContainText("18 oct. · 92,4 km");
      await expect(page.locator('li.hrow[data-trajet="s-3p"] [data-el="cout-ligne"]')).toHaveText(`${virgule(cout, 2)} €`);
      await expect(page.locator('li.hrow[data-trajet="s-3p"] [data-el="part-ligne"]')).toHaveText(` · ${virgule(euros2(cout / 3), 2)} € chacun`);
      await expect(page.locator('li.hrow[data-trajet="s-seul"] [data-el="part-ligne"]')).toHaveCount(0);
      await page.locator('li.hrow[data-trajet="s-seul"] button').tap();
      await expect(page.locator('[role="tab"][aria-selected="true"]')).toHaveAttribute("data-el", "onglet-historique");
      await expect(page.locator(D("retour-historique"))).toHaveText("← Historique");
    });
  });
});

// ---- V-6.4 (extrait V-6.4.test.ts)
// ÉTAT PRÉPARÉ : deux trajets écrits en IndexedDB au format de l'appli.
test.describe("V-6.4 — Revoir, corriger, supprimer", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/historique");
    await page.locator('[data-screen="T6"]').waitFor();
    await ecrireIdb(page, [
      trajetPrepare({ id: "s-a", debut: "2026-10-18T10:00:00+02:00", minutes: 75, km: 92.4, litres: 6.01, prix: await moyenne("SP95-E10"), depart: "Albi", arrivee: "Rodez", personnes: 3 }),
      trajetPrepare({ id: "s-b", debut: "2026-10-19T18:00:00+02:00", minutes: 70, km: 76.8, litres: 4.84, prix: await moyenne("SP95-E10"), depart: "Toulouse", arrivee: "Albi" }),
    ]);
    await page.reload();
  });
  test.describe("Happy Path", () => {
    test("V-6.4 — carburant et personnes corrigés : gardés et montrés au retour", async ({ page }) => {
      const gaz = await moyenne("Gazole");
      await page.locator('li.hrow[data-trajet="s-b"] button').tap();
      await page.locator(`${D("carburant-apres")} [data-carburant="Gazole"]`).tap();
      await page.locator(D("personnes-plus")).tap();
      await page.locator(D("retour-historique")).tap();
      await expect(page.locator('li.hrow[data-trajet="s-b"] [data-el="cout-ligne"]')).toHaveText(`${virgule(euros2(4.84 * gaz), 2)} €`);
      await expect(page.locator('li.hrow[data-trajet="s-b"] [data-el="part-ligne"]')).toHaveText(` · ${virgule(euros2(euros2(4.84 * gaz) / 2), 2)} € chacun`);
      // round 2 (audit lot 2, MEDIUM 3) : le trajet préparé ne garde que la moyenne SP95-E10 ; la correction n'est jamais enregistrée sans prix
      const t = (await lireIdb(page)).trajets.find((x: any) => x.id === "s-b");
      expect([t.carburant, t.prix_litre, t.personnes]).toEqual(["Gazole", gaz, 2]);
      await expect(page.locator(D("totaux-historique"))).toHaveAttribute("data-euros", String(euros2(euros2(6.01 * (await moyenne("SP95-E10"))) + euros2(4.84 * gaz))));
    });
    test("V-6.4 — sans réseau et sans moyenne gardée pour ce carburant : le carburant ne change pas, le prix reste", async ({ page, context }) => {
      await page.locator('li.hrow[data-trajet="s-b"] button').tap();
      await expect(page.locator(D("prix-apres"))).toHaveAttribute("data-prix", /\d/);
      const avant = await page.locator(D("cout-trajet")).getAttribute("data-cout");
      await context.setOffline(true);
      await page.locator(`${D("carburant-apres")} [data-carburant="Gazole"]`).tap();
      await expect(page.locator(D("carburant-attente"))).toHaveAttribute("data-etat", "absente");
      await expect(page.locator(D("carburant-attente"))).toHaveText("Pas de moyenne Gazole du jour sans réseau : carburant inchangé. Reviens en ligne ou mets ton prix.");
      await expect(page.locator(`${D("carburant-apres")} [aria-pressed="true"]`)).toHaveText("SP95-E10");
      await expect(page.locator(D("cout-trajet"))).toHaveAttribute("data-cout", avant!);
      await context.setOffline(false);
    });
  });
  test.describe("Edge Case", () => {
    test("V-6.4 — « Supprimer ce trajet » : il disparaît de la liste et des totaux", async ({ page }) => {
      await page.locator('li.hrow[data-trajet="s-a"] button').tap();
      await page.locator(D("supprimer-trajet")).tap();
      await expect(page).toHaveURL(/\/historique$/);
      await expect(page.locator('li.hrow[data-trajet="s-a"]')).toHaveCount(0);
      await expect(page.locator(D("total-trajets"))).toHaveText("1");
      await expect(page.locator(D("total-km"))).toHaveText("76,8"); // une décimale sous 100 km (3a2c194)
    });
    // round 3 (audit r2 lot 2, MEDIUM 1) : trajet sans noms de lieux ; leur géocodage (lancé à l'ouverture) répond 3 s plus tard
    // (latence ajoutée par page.route, déclarée) — APRÈS « Supprimer ce trajet ». Le trajet ne doit pas revenir.
    test("V-6.4 — noms des lieux arrivés après « Supprimer ce trajet » : le trajet ne revient pas", async ({ page }) => {
      const sansNoms = trajetPrepare({ id: "s-c", debut: "2026-10-20T08:00:00+02:00", minutes: 20, km: 14.2, litres: 1.02, prix: await moyenne("SP95-E10"), depart: "x", arrivee: "y" });
      const t = { ...sansNoms, depart: { ...sansNoms.depart, nom: null }, arrivee: { ...sansNoms.arrivee, nom: null } };
      const lus = (await lireIdb(page)).trajets;
      await ecrireIdb(page, [...lus, t]);
      let nommages = 0;
      // MOCKED: latence de 3 s ajoutée à la VRAIE réponse de lieux (r.continue) — « noms arrivés après la suppression » ne se provoque pas sur commande
      await page.route("**/functions/v1/lieux**", async (r) => {
        nommages++;
        await new Promise((ok) => setTimeout(ok, 3000));
        await r.continue().catch(() => undefined);
      });
      await page.reload();
      await page.locator('li.hrow[data-trajet="s-c"] button').tap();
      await expect(page.locator(D("titre-trajet"))).toHaveAttribute("data-noms", "non");
      await page.locator(D("supprimer-trajet")).tap();
      await expect(page).toHaveURL(/\/historique$/);
      await page.waitForTimeout(3000 + 4000); // la réponse du géocodage (3 s) est arrivée, et 4 s de plus
      expect(nommages).toBeGreaterThan(0);
      await expect(page.locator('li.hrow[data-trajet="s-c"]')).toHaveCount(0);
      expect((await lireIdb(page)).trajets.map((x: any) => x.id).sort()).toEqual(["s-a", "s-b"]);
      await expect(page.locator(D("total-trajets"))).toHaveText("2");
    });
  });
});

// ---- V1-retraits (extrait V1-retraits.test.ts)
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
