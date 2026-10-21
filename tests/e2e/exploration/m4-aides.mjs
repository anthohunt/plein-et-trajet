// Aides communes de l'exploration du jalon 4 (run-m4.mjs) et des extraits Playwright (m4-test-snippets).
// Appli DÉPLOYÉE, base réelle. SEULE simulation : la géolocalisation du navigateur, rejouée point par point depuis
// tests/e2e/fixtures/albi-toulouse.gpx (vrai itinéraire routier Albi → Toulouse densifié à 1 point/s, voir l'en-tête du fichier).
import { expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import * as base from "./m3-aides.mjs";

export * from "./m3-aides.mjs";
const { RACINE } = base;

export const GPX = path.join(RACINE, "tests/e2e/fixtures/albi-toulouse.gpx");
export const LONDRES = { latitude: 51.5074, longitude: -0.1278 };

/** Points du GPX : { s (seconde depuis le départ), lat, lon, v (m/s) }. */
export function lireGpx(fichier = GPX) {
  const g = fs.readFileSync(fichier, "utf8");
  const pts = [...g.matchAll(/<trkpt lat="([\d.-]+)" lon="([\d.-]+)"><time>([^<]+)<\/time><extensions><speed>([\d.]+)<\/speed>/g)].map((m) => ({ t: Date.parse(m[3]), lat: +m[1], lon: +m[2], v: +m[4] }));
  return pts.map((p) => ({ s: (p.t - pts[0].t) / 1000, lat: p.lat, lon: p.lon, v: p.v }));
}
/** Index du premier point du GPX au-delà de `km` kilomètres. */
export function indexAuKm(pts, km) {
  let d = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    const R = 6371000, dLa = ((b.lat - a.lat) * Math.PI) / 180, dLo = ((b.lon - a.lon) * Math.PI) / 180;
    const s = Math.sin(dLa / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLo / 2) ** 2;
    d += 2 * R * Math.asin(Math.sqrt(s));
    if (d >= km * 1000) return i;
  }
  return pts.length - 1;
}

/**
 * Rejoue le GPX dans le navigateur, UN point par seconde d'horloge réelle (context.setGeolocation) — l'appli calcule les vitesses
 * sur l'horodatage de chaque position : accélérer le rejeu fausserait les vitesses, il n'est donc PAS accéléré.
 * `couper()` / `retablir()` : plus aucune position n'est envoyée (GPS perdu), le rejeu continue d'avancer (la voiture roule).
 */
export function demarrerRejeu(ctx, pts, { debut = 0, fin = pts.length } = {}) {
  let i = debut;
  let coupe = false;
  let fini = false;
  const envoyes = [];
  const t0 = Date.now();
  const tic = async () => {
    if (fini) return;
    if (i >= fin) {
      fini = true;
      clearInterval(h);
      return;
    }
    const p = pts[i];
    if (!coupe) {
      await ctx.setGeolocation({ latitude: p.lat, longitude: p.lon, accuracy: 5 }).catch(() => {});
      envoyes.push(i);
    }
    i++;
  };
  const h = setInterval(tic, 1000);
  tic();
  return {
    get index() { return i; },
    get envoyes() { return envoyes.length; },
    get fini() { return fini; },
    dureeS: () => (Date.now() - t0) / 1000,
    couper() { coupe = true; },
    retablir() { coupe = false; },
    arreter() { fini = true; clearInterval(h); },
  };
}
export async function attendreFinRejeu(r, pasMs = 1000) {
  while (!r.fini) await new Promise((x) => setTimeout(x, pasMs));
}

/**
 * Verrou d'écran : Chromium piloté refuse la permission « screen-wake-lock » par défaut (sonde m4-sonde-wakelock.mjs) ;
 * Chrome sur téléphone l'accorde d'office à une page visible. On l'accorde au contexte de la page par CDP (Browser.grantPermissions),
 * comme le ferait le navigateur de l'utilisateur. Sans cet appel, l'appli affiche son repli (texte « ne peut pas garder l'écran allumé »).
 */
export async function accorderVerrouEcran(ctx, page, origine = base.URL_APP) {
  const cdp = await ctx.newCDPSession(page);
  const { targetInfo } = await cdp.send("Target.getTargetInfo");
  await cdp.send("Browser.grantPermissions", { permissions: ["wakeLockScreen", "geolocation"], origin: new URL(origine).origin, browserContextId: targetInfo.browserContextId });
}

export const S6 = (page) => page.locator('[data-screen="S6"]');
export async function lireDirect(page) {
  const t = async (el) => ((await page.locator(`[data-el="${el}"]`).first().innerText()) ?? "").trim();
  return {
    etat: await S6(page).getAttribute("data-etat"),
    vitesse: Number(await page.locator('[data-el="vitesse"]').getAttribute("data-kmh")),
    courbe: Number(await page.locator('[data-el="courbe-direct"]').getAttribute("data-points")),
    km: base.nombreFr(await t("direct-km")),
    litres: base.nombreFr(await t("direct-litres")),
    euros: (await t("direct-euros")) === "—" ? null : base.nombreFr(await t("direct-euros")),
    duree: await t("direct-duree"),
    arrets: Number(await t("direct-arrets")),
    l100: (await t("direct-l100")) === "—" ? null : base.nombreFr(await t("direct-l100")),
    voiture: await t("voiture-en-route"),
    indicateur: await t("etat-enregistrement"),
    verrou: await page.locator('[data-el="ecran-allume"]').getAttribute("data-verrou"),
  };
}
/** Touche « Enregistrer en roulant » (voiture déjà choisie) et attend l'écran En route. */
export async function lancerEnregistrement(page) {
  await page.locator('[data-el="bouton-enregistrer"]').click();
  await expect(S6(page)).toBeVisible({ timeout: 20000 });
}
export async function arreterEtAttendre(page) {
  await page.locator('[data-el="bouton-arreter"]').click();
  await expect(page.locator('[data-screen="S4"][data-etat="ok"], [data-screen="S6"][data-etat="trop-court"], [data-screen="S6"][data-etat="erreur-roule"]')).toBeVisible({ timeout: 90000 });
}
/** Trajets de la session anonyme de la page (vérité de la base, RLS). */
export async function trajetsDeLaPage(page) {
  const s = await base.session(page);
  return base.rest("trajets?select=id,depart_label,arrivee_label,km,enregistre,cree_le&order=cree_le.desc&limit=10", s.jeton);
}
