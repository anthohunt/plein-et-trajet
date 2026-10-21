// Aides des extraits Playwright du jalon 5 (V1, appli déployée, base réelle). Réexporte les aides de m5-aides.mjs.
// Simulations déclarées : géolocalisation rejouée (GPX), horloge accélérée (page.clock), états préparés en IndexedDB (format TrajetV1),
// « base européenne injoignable » (page.route, MOCKED). Tout le reste passe par les vrais services.
import { expect, test, type BrowserContext, type Page } from "@playwright/test";
// @ts-ignore — module JS sans types
import * as a from "../m5-aides.mjs";

export const { URL_APP, lireGpx, rejouer, voitureEea, compterIndexedDb } = a as any;
export { expect, test };
export const PTS = lireGpx("albi-toulouse.gpx");
export const D = (el: string) => `[data-el="${el}"]`;
const env = process.env;
const anon = { apikey: env.VITE_SUPABASE_ANON_KEY!, Authorization: `Bearer ${env.VITE_SUPABASE_ANON_KEY}` };
export const virgule = (n: number, d: number) => n.toFixed(d).replace(".", ",");
export const nb = (s: string | null) => Number(String(s).replace(/[\s  ]/g, "").replace(",", ".").replace(/[^\d.-]/g, ""));
export const euros2 = (x: number) => Math.round(x * 100) / 100;

export async function rest(chemin: string) {
  const r = await fetch(`${env.VITE_SUPABASE_URL}/rest/v1/${chemin}`, { headers: anon });
  expect(r.ok, chemin).toBe(true);
  return r.json();
}
/** Moyenne du jour d'un carburant dans un pays (rpc moyennes_par_pays, comme l'appli). */
export async function moyenne(carburant: string, pays = "FR"): Promise<number> {
  const r = await fetch(`${env.VITE_SUPABASE_URL}/rest/v1/rpc/moyennes_par_pays`, { method: "POST", headers: { ...anon, "Content-Type": "application/json" }, body: JSON.stringify({ p_carburant: carburant }) });
  return Number((await r.json()).find((m: { pays: string }) => m.pays === pays)?.prix_moyen);
}
/** Voiture enregistrée sur le téléphone : vraie ligne EEA de la fonction voiture-eea. */
export async function avecVoiture(context: BrowserContext, d2 = "5RBU0C") {
  const v = await voitureEea(d2);
  await context.addInitScript((x) => { if (!localStorage.getItem("pt-voiture-v1")) localStorage.setItem("pt-voiture-v1", JSON.stringify(x)); }, v);
  return v;
}
/** Accueil puis « Démarrer », horloge de la page installée puis mise en pause (rejeu accéléré). */
export async function demarrer(page: Page) {
  await page.clock.install();
  await page.goto("/");
  await page.locator(D("bouton-demarrer")).waitFor();
  await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 1000);
  await page.locator(D("bouton-demarrer")).tap();
  await expect(page).toHaveURL(/\/en-route$/);
  await expect(page.locator(D("prix-direct"))).toHaveAttribute("data-prix", /\d/);
}
export async function arreter(page: Page) {
  await page.locator(D("bouton-arreter")).tap();
  await expect(page).toHaveURL(/\/fin$/);
  await page.clock.runFor(500);
}
export const direct = async (page: Page) => ({
  km: nb(await page.locator(D("direct-km")).textContent()),
  litres: nb(await page.locator(D("direct-litres")).textContent()),
  euros: nb(await page.locator(D("direct-euros")).textContent()),
  points: Number(await page.locator('[data-screen="T3"]').getAttribute("data-points")),
});
export function lireIdb(page: Page): Promise<{ trajets: any[]; enregistrement: any; arrete: any }> {
  return page.evaluate(
    () =>
      new Promise((ok) => {
        const q = indexedDB.open("plein-et-trajet");
        q.onsuccess = () => {
          const tx = q.result.transaction(["trajets", "en_cours"]);
          const a = tx.objectStore("trajets").getAll();
          const b = tx.objectStore("en_cours").get("enregistrement");
          const c = tx.objectStore("en_cours").get("arrete");
          tx.oncomplete = () => ok({ trajets: a.result, enregistrement: b.result ?? null, arrete: c.result ?? null });
        };
      }),
  );
}
/** ÉTAT PRÉPARÉ : trajets écrits en IndexedDB au format de l'appli (TrajetV1), la page ayant déjà ouvert sa base. */
export function ecrireIdb(page: Page, trajets: any[], arrete: any = null) {
  return page.evaluate(
    ({ trajets, arrete }) =>
      new Promise((ok) => {
        const q = indexedDB.open("plein-et-trajet");
        q.onsuccess = () => {
          const tx = q.result.transaction(["trajets", "en_cours"], "readwrite");
          for (const t of trajets) tx.objectStore("trajets").put(t);
          if (arrete) tx.objectStore("en_cours").put(arrete, "arrete");
          tx.oncomplete = () => ok(true);
        };
      }),
    { trajets, arrete },
  );
}
export function trajetPrepare(o: { id: string; debut: string; minutes: number; km: number; litres: number; prix: number; depart: string; arrivee: string; personnes?: number; prixPerso?: number | null; enregistre?: boolean }) {
  const t0 = Date.parse(o.debut);
  return {
    id: o.id, debut: t0, fin: t0 + o.minutes * 60000, depart: { lat: 43.93, lon: 2.15, nom: o.depart }, arrivee: { lat: 43.6, lon: 1.44, nom: o.arrivee }, pays_depart: "FR",
    km: o.km, litres: o.litres, carburant: "SP95-E10", moyennes: { "SP95-E10": { prix: o.prix, pays: "FR" } }, prix_litre: o.prix, prix_perso: o.prixPerso ?? null,
    personnes: o.personnes ?? 1, vitesses: [30, 70, 110, 120, 60], consos: [8, 6.4, 6.9, 7.2, 6], conso_max: 8, vitesse_moy: Math.round(o.km / (o.minutes / 60)), accelerations: 5,
    duree_s: o.minutes * 60, voiture: { nom: "Renault Clio", detail: "1.2 · 118 ch · 2017 · SP95-E10", carburant: "SP95-E10" }, enregistre: o.enregistre ?? true,
  };
}
export const lignes = (p: Page) => p.locator(`${D("liste-stations")} ${D("ligne-station")}`);
export const prixLigne = async (l: ReturnType<Page["locator"]>) => nb(await l.locator(".totem").first().getAttribute("aria-label"));
