// Jalon 5 — régression des histoires maintenue_v1 sur les écrans V1 (T1-T6), contre l'appli déployée et la base réelle.
// Les histoires de l'écran Stations (US-1.4, 1.6, 2.1, 1.E1-E4, 2.E1, 1.P1, A11Y sur T5) sont rejouées par m1-explore.spec.ts.
// Géolocalisation rejouée (tests/e2e/fixtures/albi-toulouse.gpx), horloge accélérée par page.clock (méthode r1a, m5-aides.mjs).
// US-4.E2 part d'un ÉTAT PRÉPARÉ : un trajet arrêté écrit en IndexedDB au format de l'appli (TrajetV1).
import { test, expect, type Page, type BrowserContext } from "@playwright/test";
import { lireGpx, rejouer, voitureEea } from "./exploration/m5-aides.mjs";

const PTS = lireGpx("albi-toulouse.gpx");
const D = (el: string) => `[data-el="${el}"]`;
let VOITURE: Record<string, unknown>;

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, geolocation: { latitude: PTS[0].lat, longitude: PTS[0].lon }, permissions: ["geolocation"] });
test.beforeAll(async () => {
  VOITURE = await voitureEea("5RBU0C");
});
test.beforeEach(async ({ context }) => {
  await context.addInitScript((v) => { if (!localStorage.getItem("pt-voiture-v1")) localStorage.setItem("pt-voiture-v1", JSON.stringify(v)); }, VOITURE);
});

async function demarrer(page: Page) {
  await page.clock.install();
  await page.goto("/");
  await page.locator(D("bouton-demarrer")).waitFor();
  await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 1000); // marge : la page continue de compter pendant l'aller-retour
  await page.locator(D("bouton-demarrer")).click();
  await expect(page).toHaveURL(/\/en-route$/);
}
const idb = (page: Page) =>
  page.evaluate(
    () =>
      new Promise<{ trajets: number; enCours: number }>((ok) => {
        const q = indexedDB.open("plein-et-trajet");
        q.onsuccess = () => {
          const tx = q.result.transaction(["trajets", "en_cours"]);
          const a = tx.objectStore("trajets").count();
          const b = tx.objectStore("en_cours").count();
          tx.oncomplete = () => ok({ trajets: a.result, enCours: b.result });
        };
      }),
  );
async function finPreparee(page: Page) {
  // ÉTAT PRÉPARÉ : trajet arrêté de 41,2 L (format TrajetV1), moyenne France SP95-E10 du jour lue par l'API
  const r = await fetch(`${process.env.VITE_SUPABASE_URL}/rest/v1/rpc/moyennes_par_pays`, { method: "POST", headers: { apikey: process.env.VITE_SUPABASE_ANON_KEY!, Authorization: `Bearer ${process.env.VITE_SUPABASE_ANON_KEY}`, "Content-Type": "application/json" }, body: JSON.stringify({ p_carburant: "SP95-E10" }) });
  const fr = Number((await r.json()).find((m: { pays: string }) => m.pays === "FR").prix_moyen);
  await page.goto("/historique");
  await page.locator('[data-screen="T6"]').waitFor();
  await page.evaluate(
    (fr) =>
      new Promise((ok) => {
        const q = indexedDB.open("plein-et-trajet");
        q.onsuccess = () => {
          const t0 = Date.parse("2026-10-21T06:30:00+02:00");
          const t = { id: "reg-arrete", debut: t0, fin: t0 + 345 * 60000, depart: { lat: 43.928, lon: 2.146, nom: "Albi" }, arrivee: { lat: 48.857, lon: 2.352, nom: "Paris" }, pays_depart: "FR", km: 588, litres: 41.2, carburant: "SP95-E10", moyennes: { "SP95-E10": { prix: fr, pays: "FR" } }, prix_litre: fr, prix_perso: null, personnes: 1, vitesses: [50, 90, 120, 110, 30], consos: [7, 6.5, 7.2, 7, 6], conso_max: 7.2, vitesse_moy: 102, accelerations: 3, duree_s: 345 * 60, voiture: { nom: "Renault Clio", detail: "1.2 · 118 ch · 2017 · SP95-E10", carburant: "SP95-E10" }, enregistre: false };
          const tx = q.result.transaction("en_cours", "readwrite");
          tx.objectStore("en_cours").put(t, "arrete");
          tx.oncomplete = () => ok(true);
        };
      }),
    fr,
  );
  await page.goto("/");
  await expect(page).toHaveURL(/\/fin$/);
  return fr;
}

test.describe("Régression V1 — histoires maintenue_v1 (T1, T3, T4, T6)", () => {
  test.describe("US-6.E1 — Localisation refusée", () => {
    test.use({ permissions: [] });
    test("US-6.E1 — Démarrer sans localisation : message, aucun trajet créé", async ({ page }) => {
      await page.goto("/");
      await page.locator(D("bouton-demarrer")).click();
      await expect(page.locator(D("message-localisation"))).toHaveAttribute("data-erreur", "refusee");
      await expect(page.locator(D("message-localisation"))).toContainText("L'enregistrement a besoin de ta localisation");
      await expect(page).toHaveURL(/\/$/);
      expect(await idb(page)).toEqual({ trajets: 0, enCours: 0 });
    });
  });

  test("US-6.E2 — trajet de moins de 1 km : trop court, rien dans l'historique", async ({ page, context }) => {
    await demarrer(page);
    await rejouer(context, page, PTS, 1, 150);
    await page.locator(D("bouton-arreter")).click();
    await expect(page.locator(D("trop-court"))).toContainText(/Trajet trop court : 0,\d km sur 1 minimum\./);
    await expect(page.locator(D("trop-court"))).toContainText("Rien n'est ajouté à l'historique.");
    expect(await idb(page)).toEqual({ trajets: 0, enCours: 0 });
  });

  test("US-6.E3 — page rechargée pendant un trajet : l'enregistrement reprend, distance conservée", async ({ page, context }) => {
    test.setTimeout(90_000);
    await demarrer(page);
    await rejouer(context, page, PTS, 1, 420);
    const km = await page.locator(D("direct-km")).textContent();
    const points = await page.locator('[data-screen="T3"]').getAttribute("data-points");
    expect(Number(km!.replace(",", "."))).toBeGreaterThan(1.5);
    await page.reload();
    await expect(page).toHaveURL(/\/en-route$/);
    await expect(page.locator('[data-screen="T3"]')).toHaveAttribute("data-points", points!);
    await expect(page.locator(D("direct-km"))).toHaveText(km!);
    await expect(page.locator(D("bouton-arreter"))).toBeVisible();
  });

  test("US-3.E3 — historique vide : message et totaux à 0", async ({ page }) => {
    await page.goto("/historique");
    await expect(page.locator(D("historique-vide"))).toHaveText("Aucun trajet enregistré.");
    await expect(page.locator(D("totaux-historique"))).toHaveAttribute("data-trajets", "0");
    await expect(page.locator(D("totaux-historique"))).toHaveAttribute("data-km", "0");
    await expect(page.locator(D("total-euros"))).toHaveText("0,00");
  });

  test("US-4.E2 — prix hors 0,50-4,00 €/L refusé, message, ancien prix gardé", async ({ page }) => {
    const fr = await finPreparee(page);
    for (const faux of ["7", "0,3", "abc"]) {
      await page.locator(D("compteur-prix")).click();
      await page.locator(D("champ-prix")).fill(faux);
      await page.locator(D("champ-prix")).press("Enter");
      await expect(page.locator(D("erreur-prix"))).toHaveText("Entre un prix entre 0,50 et 4,00 €/L");
      await page.locator(D("champ-prix")).press("Escape");
      await expect(page.locator(D("prix-apres"))).toHaveAttribute("data-prix", String(fr));
      await expect(page.locator(D("cout-trajet"))).toHaveAttribute("data-cout", String(Math.round(41.2 * fr * 100) / 100));
    }
  });

  test("US-A11Y-001 / 003 / 004 — T1, T2, T3, T4, T6 : Tab donne un contour visible à chaque contrôle, boutons icônes libellés, Échap ferme le champ prix", async ({ page }) => {
    test.setTimeout(90_000);
    const parcourir = async (route: string | null, min = 2) => {
      if (route) await page.goto(route);
      await page.waitForTimeout(800);
      await page.locator("body").click({ position: { x: 5, y: 5 } });
      const vus: string[] = [];
      for (let i = 0; i < 25; i++) {
        await page.keyboard.press("Tab");
        const o = await page.evaluate(() => {
          const e = document.activeElement as HTMLElement;
          const s = getComputedStyle(e);
          return { txt: (e.getAttribute("aria-label") || e.textContent || e.id || e.tagName).trim().slice(0, 40), contour: (s.outlineStyle !== "none" && parseFloat(s.outlineWidth) >= 2) || s.textDecorationLine.includes("underline"), body: e === document.body };
        });
        if (o.body) break;
        expect(o.contour, `${route ?? "fin"} : contour de « ${o.txt} »`).toBe(true);
        if (vus.includes(o.txt) && o.txt === vus[0]) break;
        vus.push(o.txt);
      }
      expect(vus.length, `${route} : contrôles atteints au clavier`).toBeGreaterThanOrEqual(min);
      const sansNom = await page.evaluate(() => [...document.querySelectorAll("button")].filter((b) => !b.textContent!.replace(/[✕✎\s←−+]/g, "").length && !b.getAttribute("aria-label")).length);
      expect(sansNom, `${route} : boutons icônes sans libellé`).toBe(0);
      return vus;
    };
    expect(await parcourir("/")).toEqual(expect.arrayContaining(["Changer de voiture", "Démarrer", "Trajet"])); // round 2 : « Changer » porte « Changer de voiture » (LOW 10 lot 1)
    await parcourir("/voiture");
    expect(await parcourir("/historique", 1)).toEqual(["Historique"]); // historique vide : seul l'onglet sélectionné reçoit le focus
    await finPreparee(page);
    await parcourir(null);
    await page.locator(D("compteur-prix")).click();
    await expect(page.locator(D("champ-prix"))).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(page.locator(D("champ-prix"))).toHaveCount(0);
    await expect(page.locator(D("compteur-prix"))).toBeFocused();
    // T3 En route : un trajet tranché d'abord (le trajet préparé est supprimé), puis un enregistrement démarré
    await page.locator(D("supprimer-neuf")).click();
    await demarrer(page);
    expect(await parcourir(null)).toEqual(expect.arrayContaining(["Pause", "Arrêter"]));
  });

  test("US-PERF-001 — accueil affiché en moins de 2,5 s en 4G simulée", async ({ page, context }: { page: Page; context: BrowserContext }) => {
    const cdp = await context.newCDPSession(page);
    await cdp.send("Network.enable");
    await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
    await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 85, downloadThroughput: (9 * 1024 * 1024) / 8, uploadThroughput: (1.5 * 1024 * 1024) / 8 });
    const t0 = Date.now();
    await page.goto("/", { waitUntil: "commit" });
    await page.locator(D("bouton-demarrer")).waitFor();
    await expect(page.locator(D("nom-voiture"))).toHaveText("Renault Clio");
    const ms = Date.now() - t0;
    console.log(`US-PERF-001 : accueil affiché en ${ms} ms (4G simulée : 85 ms, 9 Mbit/s)`);
    expect(ms).toBeLessThan(2500);
  });
  // round 2 (audit lot 1, LOW 16) : l'objet du critère d'origine, la liste des stations
  test("US-PERF-001 — liste des stations affichée en moins de 2,5 s en 4G simulée", async ({ page, context }: { page: Page; context: BrowserContext }) => {
    const cdp = await context.newCDPSession(page);
    await cdp.send("Network.enable");
    await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
    await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 85, downloadThroughput: (9 * 1024 * 1024) / 8, uploadThroughput: (1.5 * 1024 * 1024) / 8 });
    const t0 = Date.now();
    await page.goto("/stations", { waitUntil: "commit" });
    await page.locator('[data-el="ligne-station"]').first().waitFor();
    const ms = Date.now() - t0;
    console.log(`US-PERF-001 : liste des stations affichée en ${ms} ms (4G simulée : 85 ms, 9 Mbit/s)`);
    expect(ms).toBeLessThan(2500);
  });
});
