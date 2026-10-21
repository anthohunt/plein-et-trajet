// Jalon 6, V-3.2 pas 5-6 — version WEB sur la prod : un trajet démarré dit que l'écran doit rester allumé, et l'écran est gardé
// allumé par le verrou d'écran. Preuve dans le DOM : navigator.wakeLock existe, la sentinelle demandée par la page est tenue
// (released === false) et l'écran En route porte data-verrou="actif".
// Lancer : set -a; . .env.local; set +a; node tests/e2e/exploration/m6-test-snippets/v32-web-verrou.mjs [dossier-captures]
import { existsSync, readdirSync } from "node:fs";
import os from "node:os";
import { chromium } from "@playwright/test";
import { contexteAvecVoiture, URL_APP, voitureEea } from "../m5-aides.mjs";

const SORTIE = process.argv[2] ?? "tests/e2e/screenshots/m6";
const verdicts = [];
const constat = (nom, ok, detail = "") => {
  verdicts.push(`${ok ? "OK " : "KO "} ${nom}${detail ? " — " + detail : ""}`);
  console.log(verdicts.at(-1));
};

// le verrou d'écran exige le Chromium complet (nouveau mode headless) : la coquille headless le refuse toujours
// (NotAllowedError, constaté le 21/10 sur chromium_headless_shell 156)
const cache = `${os.homedir()}/.cache/ms-playwright`;
const complet = existsSync(cache) ? readdirSync(cache).filter((d) => /^chromium-\d+$/.test(d)).map((d) => `${cache}/${d}/chrome-linux64/chrome`).find(existsSync) : undefined;
const navigateur = await chromium.launch(process.env.CHROME || complet ? { executablePath: process.env.CHROME || complet } : { channel: "chromium" });
console.log("navigateur", navigateur.version());
const voiture = await voitureEea("5RBU0C");
const ctx = await contexteAvecVoiture(navigateur, voiture);
// trace de chaque verrou demandé par la page : la sentinelle rendue par le navigateur, gardée pour lire son état
await ctx.addInitScript(() => {
  if (!("wakeLock" in navigator)) return;
  const demander = navigator.wakeLock.request.bind(navigator.wakeLock);
  window.__verrous = [];
  navigator.wakeLock.request = async (type) => {
    const s = await demander(type);
    window.__verrous.push(s);
    return s;
  };
});
const page = await ctx.newPage();
// le verrou d'écran est une permission du navigateur : accordée comme un utilisateur la laisse accordée par défaut
const cdp = await ctx.newCDPSession(page);
// (dans CE contexte : grantPermissions de Playwright refuse toutes les permissions qu'il ne liste pas)
const { targetInfo } = await cdp.send("Target.getTargetInfo");
await cdp.send("Browser.setPermission", { permission: { name: "screen-wake-lock" }, setting: "granted", origin: new URL(URL_APP).origin, browserContextId: targetInfo.browserContextId });
await page.goto(URL_APP);
await page.locator('[data-el="bouton-demarrer"]').waitFor();
await page.screenshot({ path: `${SORTIE}/V-3.2-05-avant.png` });
constat("version web : écran Trajet avec Démarrer", await page.locator('[data-el="bouton-demarrer"]').isVisible());

await page.locator('[data-el="bouton-demarrer"]').click();
await page.waitForURL(/\/en-route$/, { timeout: 30000 });
const note = page.locator('[data-el="ecran-eteint"]');
await page.locator('[data-el="ecran-eteint"][data-verrou="actif"]').waitFor({ timeout: 15000 }).catch(() => undefined);
const preuve = await page.evaluate(() => ({
  api: "wakeLock" in navigator,
  verrous: (window.__verrous ?? []).map((s) => ({ type: s.type, released: s.released })),
  plateforme: document.querySelector('[data-el="ecran-eteint"]')?.getAttribute("data-plateforme"),
  verrou: document.querySelector('[data-el="ecran-eteint"]')?.getAttribute("data-verrou"),
  visible: document.visibilityState,
}));
const texte = (await note.innerText()).trim();
constat("texte : l'écran doit rester allumé", /Garde l'écran allumé/.test(texte), texte);
constat("navigator.wakeLock présent", preuve.api);
constat("sentinelle « screen » tenue (released=false)", preuve.verrous.some((v) => v.type === "screen" && v.released === false), JSON.stringify(preuve.verrous));
constat("écran En route data-verrou=actif, plateforme web", preuve.verrou === "actif" && preuve.plateforme === "web", `${preuve.plateforme}/${preuve.verrou}`);
await page.screenshot({ path: `${SORTIE}/V-3.2-06-apres.png` });
// rien n'est gardé : le trajet de test est effacé du téléphone simulé (IndexedDB de ce contexte jetable)
await navigateur.close();
process.exit(verdicts.some((v) => v.startsWith("KO")) ? 1 : 0);
