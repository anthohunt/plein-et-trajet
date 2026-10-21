// Aides de l'exploration du jalon 5 (V1) — écrites par le bâtisseur r1a, éprouvées en local puis sur la prod.
// Rejeu d'un GPX accéléré par l'horloge simulée de Playwright SANS fausser les vitesses : l'appli date chaque position par
// l'horloge de la page (Date.now()) à sa réception ; on avance donc l'horloge d'abord, puis on pose la position, puis on attend
// que l'écran En route l'ait comptée (attribut data-points de [data-screen="T3"]).
import { readFileSync } from "node:fs";
import path from "node:path";

export const RACINE = path.resolve(new URL("../../..", import.meta.url).pathname);
export const URL_APP = process.env.URL_APP ?? "https://plein-et-trajet.vercel.app";
export const FIXTURES = path.join(RACINE, "tests/e2e/fixtures");

/** Points d'un GPX : { lat, lon, t (ms) }. */
export function lireGpx(nom) {
  const src = readFileSync(path.join(FIXTURES, nom), "utf8");
  return [...src.matchAll(/<trkpt lat="([\d.-]+)" lon="([\d.-]+)"><time>([^<]+)<\/time>/g)].map((m) => ({ lat: +m[1], lon: +m[2], t: Date.parse(m[3]) }));
}

/** Ligne `versions_eea` réelle d'un code D.2, par la fonction déployée (à injecter dans localStorage « pt-voiture-v1 »). */
export async function voitureEea(d2 = "5RBU0C", env = process.env) {
  const r = await fetch(`${env.VITE_SUPABASE_URL}/functions/v1/voiture-eea?d2=${encodeURIComponent(d2)}`, { headers: { apikey: env.VITE_SUPABASE_ANON_KEY, Authorization: `Bearer ${env.VITE_SUPABASE_ANON_KEY}` } });
  const j = await r.json();
  if (!Array.isArray(j.versions)) throw new Error(`voiture-eea ${r.status} ${JSON.stringify(j)}`);
  return j.versions[0];
}

/** Contexte téléphone (390×844, toucher) avec la voiture déjà enregistrée (addInitScript, ne réécrit pas une voiture changée). */
export async function contexteAvecVoiture(navigateur, voiture, depart = { latitude: 43.92833, longitude: 2.145916 }, permissions = ["geolocation"]) {
  const ctx = await navigateur.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, permissions, geolocation: { ...depart, accuracy: 5 }, locale: "fr-FR", timezoneId: "Europe/Paris" });
  if (voiture) await ctx.addInitScript((v) => { if (!localStorage.getItem("pt-voiture-v1")) localStorage.setItem("pt-voiture-v1", JSON.stringify(v)); }, voiture);
  return ctx;
}

/**
 * Rejoue pts[debut..fin[ : avance l'horloge de l'écart du GPX (1 s), pose la position, attend qu'elle soit comptée.
 * Avant : `await page.clock.install(); await page.clock.pauseAt(Date.now())` — sinon le temps réel écoulé s'ajoute à l'horloge.
 */
export async function rejouer(ctx, page, pts, debut, fin, chaque) {
  for (let i = debut; i < fin; i++) {
    const avant = Number((await page.locator('[data-screen="T3"]').getAttribute("data-points").catch(() => null)) ?? -1);
    await page.clock.runFor(i > 0 ? pts[i].t - pts[i - 1].t : 1000);
    await ctx.setGeolocation({ latitude: pts[i].lat, longitude: pts[i].lon, accuracy: 5 });
    await page.waitForFunction((n) => Number(document.querySelector('[data-screen="T3"]')?.getAttribute("data-points") ?? -1) !== n, avant, { timeout: 3000 }).catch(() => {});
    if (chaque) await chaque(i);
  }
}

/** Nombre d'entrées des magasins IndexedDB de l'appli (trajets, en_cours). */
export function compterIndexedDb(page) {
  return page.evaluate(
    () =>
      new Promise((ok) => {
        const q = indexedDB.open("plein-et-trajet");
        q.onsuccess = () => {
          const tx = q.result.transaction(["trajets", "en_cours"]);
          const a = tx.objectStore("trajets").count();
          const b = tx.objectStore("en_cours").count();
          tx.oncomplete = () => ok({ trajets: a.result, en_cours: b.result });
        };
      }),
  );
}
