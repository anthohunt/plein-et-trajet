// Jalon 6 — Appli Android : spec consolidée de la partie WEB du jalon, jouée contre l'appli déployée et la base réelle.
// La partie Android (APK, service natif, notification, écran éteint, Waze/Maps, processus tué, horloges décalées) ne se joue pas
// ici : le VPS n'a ni Java ni SDK. Elle est couverte par le workflow GitHub Actions `android` (.github/workflows/android.yml) qui
// joue tests/android/m6-emulateur.mjs sur un émulateur Android 14 ; run de référence 39710484157 (commit 71f19b3, APK de release
// publié, sha256 95f2e58a…acf8) : apk + JUnit, principal, immobile, fini, horloge verts, 52 constats OK / 0 KO.
// Ici : V-3.2 pas 5-6 (la version web garde l'écran allumé par le verrou d'écran : sentinelle `wakeLock` tenue,
// `data-verrou="actif"`), extrait tests/e2e/exploration/m6-test-snippets/v32-web-verrou.mjs, et un rejeu web des histoires que
// l'Android reprend (V-1.3, V-3.1, V-5.1, V-3.4, V-3.5, V-4.7, réouverture pendant un trajet), même code que l'APK.
// Simulations déclarées : géolocalisation rejouée (GPX), horloge accélérée (page.clock). Aucune interception réseau.
import { existsSync, readdirSync } from "node:fs";
import os from "node:os";
import { test, expect, D, PTS, avecVoiture, demarrer, arreter, direct, rejouer, lireIdb, lignes, nb } from "./exploration/m5-test-snippets/_aides";
import type { BrowserContext, Page } from "@playwright/test";

test.use({ hasTouch: true, geolocation: { latitude: 43.92833, longitude: 2.145916 }, permissions: ["geolocation"] });
test.describe.configure({ timeout: 240_000 });

// le verrou d'écran exige le Chromium complet (nouveau mode headless) : la coquille headless le refuse toujours
// (NotAllowedError, constaté le 21/10 sur chromium_headless_shell)
const cache = `${os.homedir()}/.cache/ms-playwright`;
const chromiumComplet =
  process.env.CHROME ??
  (existsSync(cache) ? readdirSync(cache).filter((d) => /^chromium-\d+$/.test(d)).sort().reverse().map((d) => `${cache}/${d}/chrome-linux64/chrome`).find(existsSync) : undefined);

/** Garde chaque sentinelle rendue par navigator.wakeLock.request, pour lire son état (`released`). */
async function suivreVerrous(context: BrowserContext) {
  await context.addInitScript(() => {
    if (!("wakeLock" in navigator)) return;
    const demander = navigator.wakeLock.request.bind(navigator.wakeLock);
    (window as any).__verrous = [];
    navigator.wakeLock.request = async (type?: "screen") => {
      const s = await demander(type);
      (window as any).__verrous.push(s);
      return s;
    };
  });
}
/** Le verrou d'écran est une permission du navigateur, accordée comme un utilisateur la laisse par défaut (grantPermissions de
 *  Playwright ne connaît pas « screen-wake-lock » : réglage par CDP, dans CE contexte). */
async function accorderVerrou(context: BrowserContext, page: Page, baseURL: string) {
  const cdp = await context.newCDPSession(page);
  const { targetInfo } = await cdp.send("Target.getTargetInfo");
  await cdp.send("Browser.setPermission", { permission: { name: "screen-wake-lock" }, setting: "granted", origin: new URL(baseURL).origin, browserContextId: (targetInfo as any).browserContextId });
}
/** Contexte du Chromium complet, mêmes réglages que la config et la spec (téléphone tactile 390 × 844, Albi, fr-FR) : le
 *  navigateur par défaut de Playwright (coquille headless) ne peut pas tenir le verrou, et launchOptions ne se règle pas par groupe. */
const testVerrou = test.extend<{ ctxComplet: BrowserContext }>({
  ctxComplet: async ({ playwright, baseURL, viewport, locale, timezoneId, geolocation, permissions, hasTouch }, use) => {
    test.skip(!chromiumComplet, "Chromium complet absent du cache Playwright : le verrou d'écran ne peut pas être accordé");
    const nav = await playwright.chromium.launch({ executablePath: chromiumComplet });
    const ctx = await nav.newContext({ baseURL, viewport, locale, timezoneId, geolocation, permissions, hasTouch });
    await use(ctx);
    await nav.close(); // contexte jetable : l'IndexedDB du trajet de test disparaît avec lui
  },
});
const verrous = (page: Page) => page.evaluate(() => ((window as any).__verrous ?? []).map((s: WakeLockSentinel) => ({ type: s.type, released: s.released })));

/** Requêtes vers le serveur (fonctions, base) : code de chaque réponse ; la V1 n'appelle ni PTV, ni estimer-trajet, ni trajet-roule. */
function releverRequetes(context: BrowserContext) {
  const vues: { url: string; code: number }[] = [];
  const interdites: string[] = [];
  context.on("request", (r) => { if (/myptv|estimer-trajet|trajet-roule/.test(r.url())) interdites.push(r.url()); });
  context.on("response", (r) => { if (/\/(functions|rest)\/v1\//.test(r.url())) vues.push({ url: r.url().split("?")[0], code: r.status() }); });
  return { vues, interdites };
}

// ---- V-3.2 pas 5-6 (extrait v32-web-verrou.mjs)
test.describe("V-3.2 — Écran éteint : la version web garde l'écran allumé", () => {
  test.describe("Happy Path", () => {
    testVerrou("V-3.2 pas 5 — version web : écran Trajet avec la voiture et « Démarrer »", async ({ ctxComplet: context }) => {
      const page = await context.newPage();
      await avecVoiture(context);
      await page.goto("/");
      await expect(page.locator('[data-screen="T1"]')).toBeVisible();
      await expect(page.locator(D("nom-voiture"))).toHaveText("Renault Clio");
      await expect(page.locator(D("bouton-demarrer"))).toHaveText("Démarrer");
    });
    testVerrou("V-3.2 pas 6 — trajet démarré : « Garde l'écran allumé », sentinelle « screen » tenue, data-verrou=actif", async ({ ctxComplet: context, baseURL }) => {
      const page = await context.newPage();
      await avecVoiture(context);
      await suivreVerrous(context);
      await accorderVerrou(context, page, baseURL!);
      await page.goto("/");
      await page.locator(D("bouton-demarrer")).tap();
      await expect(page).toHaveURL(/\/en-route$/);
      const note = page.locator(D("ecran-eteint"));
      await expect(note).toHaveText("Garde l'écran allumé : un navigateur arrête le GPS écran éteint.");
      await expect(note).toHaveAttribute("data-plateforme", "web");
      await expect(note).toHaveAttribute("data-verrou", "actif");
      expect(await page.evaluate(() => "wakeLock" in navigator)).toBe(true);
      expect(await verrous(page)).toContainEqual({ type: "screen", released: false });
    });
  });
  test.describe("Edge Case", () => {
    testVerrou("V-3.2 — « Arrêter » : la fin de trajet s'ouvre et le verrou d'écran est relâché", async ({ ctxComplet: context, baseURL }) => {
      const page = await context.newPage();
      await avecVoiture(context);
      await suivreVerrous(context);
      await accorderVerrou(context, page, baseURL!);
      await demarrer(page);
      await expect(page.locator(D("ecran-eteint"))).toHaveAttribute("data-verrou", "actif");
      await rejouer(context, page, PTS, 1, 600);
      await arreter(page);
      const v = await verrous(page);
      expect(v.length).toBeGreaterThan(0);
      expect(v.every((s: { released: boolean }) => s.released)).toBe(true);
    });
    // coquille headless (navigateur par défaut de Playwright) : elle refuse le verrou d'écran — un vrai refus, pas une simulation
    test("V-3.2 — verrou refusé par le navigateur : data-verrou=indisponible, le texte reste, l'enregistrement continue", async ({ page, context }) => {
      await avecVoiture(context);
      await demarrer(page);
      const note = page.locator(D("ecran-eteint"));
      await expect(note).toHaveAttribute("data-verrou", "indisponible");
      await expect(note).toHaveText("Garde l'écran allumé : un navigateur arrête le GPS écran éteint.");
      await rejouer(context, page, PTS, 1, 300);
      expect((await direct(page)).km).toBeGreaterThan(0);
      await expect(page.locator(D("etat-enregistrement"))).toHaveText("Enregistrement");
    });
  });
});

// ---- Rejeu web des histoires que l'Android reprend (m6-use-case.md, « Histoires du jalon 5 rejouées sur Android »)
test.describe("Rejeu web des histoires reprises par l'Android", () => {
  test.describe("Happy Path", () => {
    test("V-1.3 → V-3.1 → V-5.1 → V-3.4 : démarrer, direct qui avance, Stations pendant le trajet, pause puis reprise", async ({ page, context }) => {
      const req = releverRequetes(context);
      await avecVoiture(context);
      await demarrer(page);
      await expect(page.locator(D("etat-enregistrement"))).toHaveText("Enregistrement");
      await rejouer(context, page, PTS, 1, 300);
      const a = await direct(page);
      // relevés 500-650 : la voiture est arrêtée (feu) ; Stations et pause se jouent après, en roulant (≈ 0,25 km par 12 relevés)
      await rejouer(context, page, PTS, 300, 800);
      const b = await direct(page);
      expect(b.km).toBeGreaterThan(a.km);
      expect(b.litres).toBeGreaterThan(a.litres);
      expect(b.euros).toBeGreaterThan(a.euros);
      // V-5.1 : Stations pendant l'enregistrement, la distance continue
      await page.clock.resume();
      await page.locator(D("onglet-stations")).tap();
      await expect(lignes(page).first()).toBeVisible({ timeout: 30_000 });
      for (let i = 800; i < 812; i++) { await context.setGeolocation({ latitude: PTS[i].lat, longitude: PTS[i].lon }); await page.waitForTimeout(1000); }
      await page.locator(D("onglet-trajet")).tap();
      await expect(page).toHaveURL(/\/en-route$/);
      await expect.poll(async () => nb(await page.locator(D("direct-km")).textContent())).toBeGreaterThan(b.km);
      // V-3.4 : Pause fige km et litres, Reprendre relance
      await page.locator(D("bouton-pause")).tap();
      await expect(page.locator(D("etat-enregistrement"))).toHaveText("En pause");
      await expect(page.locator(D("bouton-pause"))).toHaveText("Reprendre");
      const c = await direct(page);
      for (let i = 812; i < 830; i++) { await context.setGeolocation({ latitude: PTS[i].lat, longitude: PTS[i].lon }); await page.waitForTimeout(1000); }
      const d = await direct(page);
      expect([d.km, d.litres]).toEqual([c.km, c.litres]);
      await page.locator(D("bouton-pause")).tap();
      await expect(page.locator(D("etat-enregistrement"))).toHaveText("Enregistrement");
      for (let i = 830; i < 850; i++) { await context.setGeolocation({ latitude: PTS[i].lat, longitude: PTS[i].lon }); await page.waitForTimeout(1000); }
      await expect.poll(async () => (await direct(page)).km).toBeGreaterThan(d.km);
      expect(req.interdites).toEqual([]);
      expect(req.vues.filter((r) => r.code < 200 || r.code > 299)).toEqual([]);
    });
    test("V-3.5 → V-4.7 : Arrêter ouvre la fin de trajet, Enregistrer le met en tête de l'Historique", async ({ page, context }) => {
      const req = releverRequetes(context);
      await avecVoiture(context);
      await demarrer(page);
      await rejouer(context, page, PTS, 1, 600);
      await arreter(page);
      await expect(page.locator('[data-screen="T4"]')).toBeVisible();
      const id = await page.locator('[data-screen="T4"]').getAttribute("data-trajet");
      const km = Number(await page.locator(D("fin-km")).getAttribute("data-km"));
      expect(km).toBeGreaterThan(1);
      await page.locator(D("enregistrer-trajet")).tap();
      await expect(page).toHaveURL(/\/historique$/);
      await expect(page.locator("li.hrow").first()).toHaveAttribute("data-trajet", id!);
      const t = (await lireIdb(page)).trajets.find((x: any) => x.id === id);
      expect(t.enregistre).toBe(true);
      expect(req.interdites).toEqual([]);
      expect(req.vues.filter((r) => r.code < 200 || r.code > 299)).toEqual([]);
    });
  });
  test.describe("Edge Case", () => {
    test("V-3.2 (web) — page rouverte pendant un trajet : le trajet reprend avec tous ses points", async ({ page, context }) => {
      await avecVoiture(context);
      await demarrer(page);
      await rejouer(context, page, PTS, 1, 300);
      const avant = await direct(page);
      expect(avant.points).toBeGreaterThan(0);
      const p2 = await context.newPage();
      await page.close();
      await p2.goto("/");
      await expect(p2).toHaveURL(/\/en-route$/);
      await expect(p2.locator(D("etat-enregistrement"))).toHaveText("Enregistrement");
      await expect.poll(async () => Number(await p2.locator('[data-screen="T3"]').getAttribute("data-points"))).toBeGreaterThanOrEqual(avant.points);
      expect(nb(await p2.locator(D("direct-km")).textContent())).toBeGreaterThanOrEqual(avant.km);
    });
  });
});
