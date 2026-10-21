// Jalon 4 — « Enregistrer en roulant et Royaume-Uni » : spec unique consolidée depuis exploration/m4-test-snippets/ (extraits conservés).
// Jouée contre l'appli déployée, base réelle (Supabase, trajet-roule, recalage Stadia/Valhalla, altimétrie IGN/Open-Meteo, flux GB).
// Aucune interception réseau (aucun page.route). SEULE simulation : la géolocalisation du navigateur (context.setGeolocation), rejouée
// depuis tests/e2e/fixtures/albi-toulouse.gpx (vrai itinéraire routier densifié à 1 point/s, déclaré dans l'en-tête du fichier) ou
// injectée à des vitesses choisies (US-6.2). Le rejeu COMPLET des 73 min n'est pas rejoué ici : il est prouvé par l'exploration
// (exploration/run-m4.mjs, journal m4-exploration-log.md) ; chaque test ne rejoue qu'un court extrait (≤ 75 s) en temps réel.
// Verrou d'écran : Chromium piloté refuse « screen-wake-lock » ; on l'accorde par CDP comme Chrome mobile le fait pour une page visible.
// Quota PTV : aucun trajet enregistré de cette spec ne franchit de péage (N88 à la sortie d'Albi) ; seul US-3.9 (Albi → Londres)
// peut appeler PTV, servi par le cache des péages (7 j) quand le tracé n'a pas changé. Albi → Castres (US-6.6) ne franchit aucun péage.
// Les trajets créés par un test sont supprimés à la fin de ce test (session anonyme du test, RLS).
import { test, expect, type Page } from "@playwright/test";
import {
  accorderVerrouEcran, arreterEtAttendre, attendreFinRejeu, champ, choisirVoiture, demarrerRejeu, enregistrerDepuis, env, KM5, lancerEnregistrement,
  lireDirect, lireResultat, nombreFr, ouvrirTrajets, position, propositions, PTS, rest, rouler, S6, session, trajetsDeLaPage, URL_APP, virgule,
} from "./exploration/m4-test-snippets/_aides";

/** Supprime les trajets de la session anonyme de la page (ménage du test). */
async function supprimerMesTrajets(page: Page) {
  const s = await session(page);
  if (!s) return;
  const r = await fetch(`${env.VITE_SUPABASE_URL}/rest/v1/trajets?user_id=eq.${s.userId}`, { method: "DELETE", headers: { apikey: env.VITE_SUPABASE_ANON_KEY, Authorization: `Bearer ${s.jeton}` } });
  expect(r.status).toBeLessThan(300);
}

/** Positions le long du GPX à partir de l'index `i`, une par seconde, chacune à la vitesse demandée (km/h). */
function positionsAVitesses(i: number, vitesses: number[]) {
  const pts = PTS.slice(i);
  const d = (a: { lat: number; lon: number }, b: { lat: number; lon: number }) => {
    const R = 6371000, x = ((b.lat - a.lat) * Math.PI) / 180, y = ((b.lon - a.lon) * Math.PI) / 180;
    const s = Math.sin(x / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(y / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(s));
  };
  const cumul = [0];
  for (let k = 1; k < pts.length; k++) cumul.push(cumul[k - 1] + d(pts[k - 1], pts[k]));
  const out: { latitude: number; longitude: number }[] = [];
  let s = 0;
  for (const v of vitesses) {
    s += v / 3.6;
    const k = cumul.findIndex((c) => c >= s);
    const a = pts[k - 1], b = pts[k], t = (s - cumul[k - 1]) / (cumul[k] - cumul[k - 1] || 1);
    out.push({ latitude: a.lat + (b.lat - a.lat) * t, longitude: a.lon + (b.lon - a.lon) * t });
  }
  return out;
}

test.describe("M4 — Enregistrer en roulant et Royaume-Uni", () => {
  test.describe("US-6.1 — Enregistrer en roulant", () => {
    test.describe("Happy Path", () => {
      test("US-6.1 — « Enregistrer en roulant » avec la localisation autorisée ouvre l'écran En route, voiture rappelée en haut", async ({ page, context }) => {
        test.setTimeout(120_000);
        await enregistrerDepuis(page, context, KM5);
        await expect(S6(page)).toHaveAttribute("data-etat", "enregistrement");
        const d = await lireDirect(page);
        expect(d.indicateur).toBe("Enregistrement");
        expect(d.voiture).toBe("Peugeot 208 (101ch) · mécanique · SP95-E10");
        const stock = await page.evaluate(() => JSON.parse(localStorage.getItem("pt-en-route") || "null"));
        expect(stock.vehiculeId).toBe("2ed51bbad5ac66a7");
        expect(stock.points.length).toBeGreaterThanOrEqual(1);
      });
    });
    test.describe("Edge Case — enregistrement en attente de reprise (audit M1)", () => {
      test("US-6.1 — un enregistrement attend sa reprise : « Enregistrer en roulant » est désactivé et le toucher n'écrase rien", async ({ page, context }) => {
        test.setTimeout(120_000);
        await enregistrerDepuis(page, context, KM5);
        await rouler(context, KM5 + 1, 10);
        await page.goto(`${URL_APP}/trajets`);
        await expect(page.locator('[data-el="reprise-enregistrement"]')).toBeVisible({ timeout: 20_000 });
        const avant = await page.evaluate(() => localStorage.getItem("pt-en-route"));
        const bouton = page.locator('[data-el="bouton-enregistrer"]');
        await expect(bouton).toHaveAttribute("aria-disabled", "true");
        await bouton.click({ force: true }); // un doigt peut toucher un bouton aria-disabled : rien ne doit être écrasé
        await expect(page.locator('[data-el="message-enregistrer"]')).toContainText("Reprends ou arrête l'enregistrement en cours");
        await page.waitForTimeout(2000);
        await expect(S6(page)).toHaveCount(0);
        expect(await page.evaluate(() => localStorage.getItem("pt-en-route"))).toBe(avant);
        // reprendre lève le message et rouvre l'écran En route avec la distance gardée
        await accorderVerrouEcran(context, page);
        await page.locator('[data-el="reprendre-enregistrement"]').click();
        await expect(S6(page)).toBeVisible();
        expect((await lireDirect(page)).km).toBeGreaterThan(0.1);
      });
    });
  });

  test.describe("US-6.2 — Suivre en direct", () => {
    test.describe("Happy Path", () => {
      test("US-6.2 — vitesse affichée renouvelée au moins toutes les 2 s (positions à vitesses différentes) ; km, litres, €, L/100 augmentent", async ({ page, context }) => {
        test.setTimeout(150_000);
        await enregistrerDepuis(page, context, KM5);
        const d0 = await lireDirect(page);
        // une position par seconde, vitesse différente à chaque seconde (40 → 100 km/h puis retour) : la vitesse mesurée change à chaque position
        const vitesses = Array.from({ length: 40 }, (_, k) => 40 + 6 * (k % 10) + (k % 20 >= 10 ? 0 : 3));
        const positions = positionsAVitesses(KM5 + 1, vitesses);
        const releves: { t: number; kmh: number }[] = [];
        let fini = false;
        const lecture = (async () => {
          while (!fini) {
            const v = await page.locator('[data-el="vitesse"]').getAttribute("data-kmh");
            releves.push({ t: Date.now(), kmh: Number(v) });
            await page.waitForTimeout(200);
          }
        })();
        for (const p of positions) {
          await context.setGeolocation({ ...p, accuracy: 5 });
          await page.waitForTimeout(1000);
        }
        fini = true;
        await lecture;
        // fenêtre utile : après les 5 premières secondes (lissage sur 3 pas), jusqu'à la dernière position
        const t0 = releves[0].t + 5000;
        const utiles = releves.filter((r) => r.t >= t0);
        const changements = utiles.filter((r, k) => k > 0 && r.kmh !== utiles[k - 1].kmh).map((r) => r.t);
        const ecarts = changements.slice(1).map((t, k) => t - changements[k]);
        expect(new Set(utiles.map((r) => r.kmh)).size).toBeGreaterThanOrEqual(10);
        expect(changements.length).toBeGreaterThanOrEqual(15);
        expect(Math.max(...ecarts)).toBeLessThanOrEqual(2000);
        const d = await lireDirect(page);
        expect(d.courbe).toBeGreaterThan(30);
        expect(d.km).toBeGreaterThan(d0.km + 0.5);
        expect(d.litres).toBeGreaterThan(d0.litres);
        expect(d.l100).not.toBeNull();
        const fr = Number((await rest("moyennes_nationales?select=prix_moyen&pays=eq.FR&carburant=eq.SP95-E10&order=jour.desc&limit=1"))[0].prix_moyen);
        await expect(page.locator('[data-el="prix-direct"]')).toContainText(virgule(fr, 3));
        expect(d.euros).toBeCloseTo(d.litres * fr, 1);
      });
    });
  });

  test.describe("US-6.3 — Garder l'écran allumé", () => {
    test.describe("Happy Path", () => {
      test("US-6.3 — le verrou d'écran du navigateur est pris et reste actif sans toucher l'écran", async ({ page, context }) => {
        test.setTimeout(120_000);
        await enregistrerDepuis(page, context, KM5);
        await page.waitForTimeout(20_000);
        expect((await lireDirect(page)).verrou).toBe("actif");
        await expect(page.locator('[data-el="ecran-allume"]')).toHaveText("Écran allumé");
        // streamline R2 (R2, R7) : l'écart direct / résultat final et la garde des points restent dits, en une ligne chacun
        await expect(page.locator('[data-el="direct-sans-montees"]')).toHaveText("Litres et € sans les montées, ajoutées à l'arrêt");
        await expect(page.locator('[data-el="points-gardes"]')).toHaveText("Points GPS gardés sur le téléphone jusqu'à l'arrêt");
        for (const el of ["direct-sans-montees", "points-gardes"]) {
          const h = await page.locator(`[data-el="${el}"]`).evaluate((x) => {
            const s = getComputedStyle(x);
            const lh = parseFloat(s.lineHeight) || parseFloat(s.fontSize) * 1.3; // « normal » : environ 1,2 à 1,3 fois la taille
            return x.getBoundingClientRect().height / lh;
          });
          expect(h).toBeLessThan(1.6); // une seule ligne à 390 px
        }
      });
      test("US-6.3 — plus de 15 s sans position : « GPS perdu », distance figée ; le retour du signal relance la distance", async ({ page, context }) => {
        test.setTimeout(150_000);
        await enregistrerDepuis(page, context, KM5);
        const r = demarrerRejeu(context, PTS, { debut: KM5 + 1, fin: KM5 + 60 });
        await page.waitForTimeout(10_000);
        r.couper();
        await page.waitForTimeout(1500);
        const coupe = await lireDirect(page);
        await expect(page.locator('[data-el="gps-perdu"]')).toBeVisible({ timeout: 20_000 });
        await expect(page.locator('[data-el="gps-perdu"]')).toContainText("GPS perdu");
        expect((await lireDirect(page)).km).toBe(coupe.km);
        await expect(S6(page)).toHaveAttribute("data-etat", "gps-perdu");
        r.retablir();
        await expect(page.locator('[data-el="gps-perdu"]')).toHaveCount(0, { timeout: 10_000 });
        await page.waitForTimeout(4000);
        expect((await lireDirect(page)).km).toBeGreaterThan(coupe.km);
        r.arreter();
      });
    });
    test.describe("Edge Case", () => {
      test("US-6.3 — sans permission de verrou d'écran, le repli est dit à l'écran", async ({ page, context }) => {
        test.setTimeout(90_000);
        // pas d'accorderVerrouEcran : Chromium piloté refuse la permission « screen-wake-lock »
        await context.setGeolocation(position(KM5));
        await ouvrirTrajets(page);
        await choisirVoiture(page);
        await lancerEnregistrement(page);
        await expect(page.locator('[data-el="ecran-allume"]')).toHaveAttribute("data-verrou", "indisponible", { timeout: 10_000 });
        // streamline R2 (R7) : la cause en quelques mots, puis le geste à faire
        await expect(page.locator('[data-el="ecran-allume"]')).toHaveText("Ce navigateur ne garde pas l'écran allumé : désactive la veille");
        await expect(page.locator('[data-el="ecran-allume"]')).toBeVisible();
      });
      test("US-6.3 — tant que le navigateur n'a pas répondu, l'écran ne prétend pas qu'il reste allumé (audit LOW 10)", async ({ page, context }) => {
        test.setTimeout(90_000);
        // MOCKED: aucun navigateur réel ne laisse suspendre sur commande la réponse à navigator.wakeLock.request ; seule l'API du navigateur
        // est remplacée (aucune requête réseau interceptée)
        await page.addInitScript(() => {
          if (navigator.wakeLock) navigator.wakeLock.request = () => new Promise<WakeLockSentinel>(() => {});
        });
        await context.setGeolocation(position(KM5));
        await ouvrirTrajets(page);
        await choisirVoiture(page);
        await lancerEnregistrement(page);
        await page.waitForTimeout(3000);
        const allume = page.locator('[data-el="ecran-allume"]');
        await expect(allume).toHaveAttribute("data-verrou", "attente");
        await expect(allume).toHaveText(""); // passe streamline : rien n'est affirmé tant que le navigateur n'a pas répondu
      });
    });
  });

  test.describe("US-6.4 — Mettre en pause", () => {
    test.describe("Happy Path", () => {
      test("US-6.4 — « Pause » : « En pause », distance et litres figés même si la voiture avance ; « Reprendre » relance", async ({ page, context }) => {
        test.setTimeout(150_000);
        await enregistrerDepuis(page, context, KM5);
        const r = demarrerRejeu(context, PTS, { debut: KM5 + 1, fin: KM5 + 60 });
        await page.waitForTimeout(10_000);
        await page.locator('[data-el="bouton-pause"]').click();
        const p0 = await lireDirect(page);
        expect(p0.indicateur).toBe("En pause");
        await expect(page.locator('[data-el="bouton-pause"]')).toHaveText("Reprendre");
        await page.waitForTimeout(10_000); // ≈ 200 m de route pendant la pause
        const p1 = await lireDirect(page);
        expect(p1.km).toBe(p0.km);
        expect(p1.litres).toBe(p0.litres);
        await expect(S6(page)).toHaveAttribute("data-etat", "pause");
        await page.locator('[data-el="bouton-pause"]').click();
        await expect(page.locator('[data-el="bouton-pause"]')).toHaveText("Pause");
        await page.waitForTimeout(8000);
        const p2 = await lireDirect(page);
        expect(p2.indicateur).toBe("Enregistrement");
        expect(p2.km).toBeGreaterThan(p0.km);
        r.arreter();
      });
    });
  });

  test.describe("US-6.5 — Arrêter et voir le coût", () => {
    test.describe("Happy Path", () => {
      test("US-6.5 — plus de 1 km : « Départ → Arrivée · enregistré », coût, litres, km, pays, tronçons, montées de l'altitude ; en tête de l'historique", async ({ page, context }) => {
        test.setTimeout(240_000);
        try {
          await enregistrerDepuis(page, context, KM5);
          const avant = (await trajetsDeLaPage(page)).length;
          await rouler(context, KM5 + 1, 75);
          // vraie réponse de trajet-roule (lue, pas interceptée)
          const reponse = page.waitForResponse((r) => r.url().includes("/functions/v1/trajet-roule"), { timeout: 120_000 });
          await arreterEtAttendre(page);
          const rr = await reponse;
          expect(rr.status()).toBe(200);
          const corps = await rr.json();
          expect(corps.avertissements).not.toContain("altimetrie_indisponible"); // montées tirées de l'altitude (audit M2)
          expect(corps.itineraire.recalage).toBe(true);
          await expect(page.locator('[data-screen="S4"][data-etat="ok"]')).toBeVisible();
          const r = await lireResultat(page);
          expect(r.route).toMatch(/^.+ → .+ · ENREGISTRÉ$/i);
          expect(r.km).toBeGreaterThanOrEqual(1);
          expect(r.litres).toBeGreaterThan(0);
          expect(r.cout).toBeGreaterThan(0);
          expect(await page.locator('[data-el="pays-traverses"] [data-pays]').evaluateAll((l) => l.map((x) => x.getAttribute("data-pays")))).toEqual(["FR"]);
          const types = await page.locator('[data-el="troncons"] [data-troncon]').evaluateAll((l) => l.map((x) => x.getAttribute("data-troncon")));
          expect(types.length).toBeGreaterThan(0);
          for (const t of types) expect(["autoroute", "route", "ville"]).toContain(t);
          await expect(page.locator('[data-el="detail-peages"]')).toHaveAttribute("data-etat", "ok");
          await page.locator('[data-el="retour-trajets"]').click();
          const l = page.locator('[data-el="ligne-historique"]');
          await expect(l.first()).toContainText("enregistré");
          const base = await trajetsDeLaPage(page);
          expect(base.length).toBe(avant + 1);
          expect(base[0].enregistre).toBe(true);
          expect(r.route.toUpperCase()).toContain(`${base[0].depart_label} → ${base[0].arrivee_label}`.toUpperCase());
        } finally {
          await supprimerMesTrajets(page);
        }
      });
    });
  });

  test.describe("US-6.6 — Voir ma courbe de vitesse", () => {
    test.describe("Happy Path", () => {
      test("US-6.6 — trajet enregistré : courbe de tout le trajet, vitesse moyenne, accélérations, note sur la vitesse réelle", async ({ page, context }) => {
        test.setTimeout(240_000);
        try {
          await enregistrerDepuis(page, context, KM5);
          await rouler(context, KM5 + 1, 75);
          await arreterEtAttendre(page);
          const b = page.locator('[data-el="courbe-vitesse"]');
          await expect(b).toContainText("Ma vitesse enregistrée");
          const info = page.locator('[data-el="vitesse-info"]');
          expect(Number(await info.getAttribute("data-moy"))).toBeGreaterThan(40);
          await expect(info).toHaveText(/^\d+ km\/h moy\. · \d+ accélérations?$/);
          expect(Number(await b.locator("svg").getAttribute("data-points"))).toBeGreaterThan(50);
          await expect(page.locator('[data-el="note-roule"]')).toContainText("Calcul sur ta vitesse réelle, seconde par seconde");
        } finally {
          await supprimerMesTrajets(page);
        }
      });
    });
    test.describe("Edge Case", () => {
      test("US-6.6 — trajet calculé (Albi → Castres) : pas de bloc « Ma vitesse enregistrée »", async ({ page }) => {
        test.setTimeout(120_000);
        await ouvrirTrajets(page);
        for (const [nom, texte] of [["depart", "Albi"], ["arrivee", "Castres"]]) {
          await champ(page, nom).fill(""); // passe streamline : départ pré-rempli par la commune GPS
          await champ(page, nom).pressSequentially(texte, { delay: 40 });
          const o = propositions(page, nom).filter({ hasText: texte }).first();
          await expect(o).toBeVisible({ timeout: 20_000 });
          await o.click();
        }
        await choisirVoiture(page);
        await page.locator("#bouton-calculer").click();
        await expect(page.locator('[data-screen="S4"][data-etat="ok"]')).toBeVisible({ timeout: 60_000 });
        await expect(page.locator('[data-el="courbe-vitesse"]')).toHaveCount(0);
        await expect(page.locator('[data-el="note-roule"]')).toHaveCount(0);
      });
    });
  });

  test.describe("US-6.E1 — Localisation refusée", () => {
    test.use({ permissions: [] }); // vrai refus du navigateur : aucune permission de géolocalisation
    test.describe("Edge Case", () => {
      test("US-6.E1 — refus : message avec la façon d'autoriser, aucun écran En route, aucun trajet créé", async ({ page }) => {
        test.setTimeout(90_000);
        await ouvrirTrajets(page);
        await choisirVoiture(page);
        const avant = (await trajetsDeLaPage(page)).length;
        await page.locator('[data-el="bouton-enregistrer"]').click();
        const m = page.locator('[data-el="localisation-refusee"]');
        await expect(m).toBeVisible({ timeout: 15_000 });
        await expect(m).toContainText("L'enregistrement a besoin de ta localisation");
        await expect(m).toContainText("Position → Autoriser");
        await expect(S6(page)).toHaveCount(0);
        expect(await page.evaluate(() => localStorage.getItem("pt-en-route"))).toBeNull();
        expect((await trajetsDeLaPage(page)).length).toBe(avant);
      });
    });
  });

  test.describe("US-6.E2 — Trajet trop court", () => {
    test.describe("Edge Case", () => {
      test("US-6.E2 — moins de 1 km : « trop court pour être calculé », rien dans l'historique ni sur le téléphone", async ({ page, context }) => {
        test.setTimeout(120_000);
        await enregistrerDepuis(page, context, 0);
        const avant = (await trajetsDeLaPage(page)).length;
        await rouler(context, 1, 20);
        await arreterEtAttendre(page);
        const m = page.locator('[data-el="trajet-trop-court"]');
        await expect(m).toContainText("Trajet trop court pour être calculé");
        await expect(m).toContainText("sur 1 minimum");
        expect((await trajetsDeLaPage(page)).length).toBe(avant);
        expect(await page.evaluate(() => localStorage.getItem("pt-en-route"))).toBeNull();
      });
    });
  });

  test.describe("US-6.E3 — Reprendre après fermeture", () => {
    test.describe("Edge Case", () => {
      test("US-6.E3 — rechargement : reprise proposée avec la distance conservée ; « Reprendre » rouvre l'écran En route", async ({ page, context }) => {
        test.setTimeout(150_000);
        await enregistrerDepuis(page, context, KM5);
        await rouler(context, KM5 + 1, 25);
        const avant = await lireDirect(page);
        expect(avant.km).toBeGreaterThan(0.3);
        await page.reload();
        const b = page.locator('[data-el="reprise-enregistrement"]');
        await expect(b).toBeVisible({ timeout: 20_000 });
        await expect(b).toContainText("Enregistrement en cours");
        const km = nombreFr(/([\d,]+) km ·/.exec(await b.innerText())![1]);
        expect(Math.abs(km - avant.km)).toBeLessThanOrEqual(0.1);
        await expect(page.locator('[data-el="arreter-enregistrement"]')).toBeVisible();
        await accorderVerrouEcran(context, page);
        await page.locator('[data-el="reprendre-enregistrement"]').click();
        await expect(S6(page)).toBeVisible();
        expect((await lireDirect(page)).km).toBeGreaterThanOrEqual(avant.km);
      });
    });
  });

  test.describe("US-3.9 — Aller au Royaume-Uni", () => {
    test.describe("Happy Path", () => {
      test("US-3.9 — Albi → Londres : Royaume-Uni au prix moyen du jour (€), Manche non comptée, pas d'Eurotunnel dans les péages", async ({ page }) => {
        test.setTimeout(150_000);
        await ouvrirTrajets(page);
        await champ(page, "depart").fill(""); // passe streamline : départ pré-rempli par la commune GPS
        await champ(page, "depart").pressSequentially("Albi", { delay: 40 });
        await propositions(page, "depart").filter({ hasText: "Albi" }).first().click();
        await champ(page, "arrivee").pressSequentially("Londres", { delay: 40 });
        const o = propositions(page, "arrivee").filter({ hasText: "Royaume-Uni" }).first();
        await expect(o).toContainText("Londres");
        await o.click();
        await choisirVoiture(page);
        await page.locator("#bouton-calculer").click();
        await expect(page.locator('[data-screen="S4"][data-etat="ok"]')).toBeVisible({ timeout: 90_000 });
        const r = await lireResultat(page);
        expect(r.route).toMatch(/ALBI → LONDRES/i);
        const moy = await fetch(`${env.VITE_SUPABASE_URL}/rest/v1/rpc/moyennes_par_pays`, { method: "POST", headers: { apikey: env.VITE_SUPABASE_ANON_KEY, "Content-Type": "application/json" }, body: JSON.stringify({ p_carburant: "SP95-E10" }) }).then((x) => x.json());
        const gb = moy.find((x: { pays: string }) => x.pays === "GB");
        const ligne = page.locator('[data-el="pays-traverses"] [data-pays="GB"]');
        await expect(ligne).toHaveAttribute("data-source", "flux");
        await expect(ligne).toContainText("Royaume-Uni");
        await expect(ligne).toContainText(virgule(Number(gb.prix_moyen), 3));
        await expect(ligne).toContainText("stations");
        await expect(page.locator('[data-el="manche-non-comptee"]')).toHaveText("Traversée de la Manche (tunnel ou ferry) non comptée");
        await expect(page.locator('[data-el="detail-peages"]')).not.toContainText("Eurotunnel");
      });
    });
  });

  test.describe("US-1.9 — Stations au Royaume-Uni", () => {
    test.use({ geolocation: { latitude: 51.5074, longitude: -0.1278 } });
    test.describe("Happy Path", () => {
      test("US-1.9 — à Londres : stations britanniques (carte et liste) en €/L, fiche avec le prix d'origine en pence/L et le cours cité", async ({ page }) => {
        test.setTimeout(90_000);
        await page.goto(URL_APP + "/");
        const lignes = page.locator('[data-el="ligne-station"]');
        await expect(lignes.first()).toBeVisible({ timeout: 30_000 });
        const n = await lignes.count();
        expect(n).toBeGreaterThan(5);
        expect(Number(await page.locator('[data-el="carte-stations"]').getAttribute("data-pastilles"))).toBe(n);
        const ids = await lignes.evaluateAll((l) => l.map((x) => x.getAttribute("data-station")!));
        expect(ids.every((i) => i.startsWith("GB-"))).toBe(true);
        // audit LOW 12 : l'enseigne n'est plus redoublée (« Asda · Asda · … »)
        const textes = await lignes.evaluateAll((l) => l.map((x) => (x as HTMLElement).innerText.replace(/\s+/g, " ")));
        expect(textes.filter((x) => /^(\S+) · \1 ·/i.test(x))).toEqual([]);
        await lignes.first().click();
        const fiche = page.locator('[data-el="fiche-station"]');
        const base = await rest(`prix?select=carburant,prix,prix_origine,unite_origine&station_id=eq.${ids[0]}`);
        const cours = await rest("cours_change?select=taux,jour&monnaie=eq.GBP");
        for (const l of base) {
          await expect(fiche.locator(`[data-el="prix-origine"] [data-carburant="${l.carburant}"]`)).toContainText(`${virgule(Number(l.prix_origine), 1)} p/L`);
          expect(Number(l.prix)).toBeCloseTo(Number(l.prix_origine) / 100 / Number(cours[0].taux), 3);
        }
        await expect(fiche.locator('[data-el="cours-du-jour"]')).toContainText(`1 € = ${virgule(Number(cours[0].taux), 4)} £`);
        await expect(fiche.locator("#sh-name")).not.toHaveText(/^(\S+) · \1 ·/i);
      });
    });
  });
});
