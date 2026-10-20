// Aides communes de l'exploration du jalon 3 (run-m3.mjs) et des extraits Playwright (m3-test-snippets).
// Appli DÉPLOYÉE, base réelle. Aucune de ces aides ne simule le réseau ni la session.
import { expect } from "@playwright/test";
import crypto from "node:crypto";
import * as base from "./m2-aides.mjs";

export * from "./m2-aides.mjs";
const { env, URL_APP } = base;

export const BARCELONE = { latitude: 41.3874, longitude: 2.1686 };
export const BRUXELLES = { latitude: 50.8503, longitude: 4.3517 };
export const ADMIN_TEST = "m3-admin-test@example.org";

// ---- administrateur : vrai utilisateur Auth, vrai lien magique généré par l'API d'administration (generate_link) ----
export async function lienMagique(email = ADMIN_TEST, redirection = `${URL_APP}/moteurs`) {
  const r = await fetch(`${env.SUPABASE_URL}/auth/v1/admin/generate_link`, {
    method: "POST",
    headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ type: "magiclink", email, redirect_to: redirection }),
  });
  if (!r.ok) throw new Error(`generate_link ${r.status}`);
  return (await r.json()).action_link;
}
/** Ouvre le lien magique dans la page : supabase-js pose la session administrateur, comme pour Anthony. */
export async function connecterAdmin(page, { vers = "moteurs", email = ADMIN_TEST } = {}) {
  await page.goto(await lienMagique(email, `${URL_APP}/${vers === "moteurs" ? "moteurs" : ""}`));
  if (vers === "moteurs") await expect(page.locator('[data-screen="S5"]')).toBeVisible({ timeout: 20000 });
  else await expect(page.locator('[data-el="bouton-moteurs"]')).toBeVisible({ timeout: 20000 });
}
export async function ouvrirMoteurs(page) {
  await page.locator('[data-el="bouton-moteurs"]').click();
  await expect(page.locator('[data-screen="S5"]')).toBeVisible();
  await expect(page.locator('[data-el="moteur"]')).toHaveCount(6, { timeout: 20000 });
}
export const carte = (page, service) => page.locator(`[data-service="${service}"]`);
export const etatCarte = (page, service) => carte(page, service).locator('[data-el="etat-moteur"]');

/** Appel direct de la fonction moteurs avec le jeton de la page (même chemin réseau que l'appli). */
export async function appelerMoteurs(jeton, corps) {
  const r = await fetch(`${env.SUPABASE_URL}/functions/v1/moteurs`, { method: "POST", headers: { apikey: env.VITE_SUPABASE_ANON_KEY, Authorization: `Bearer ${jeton}`, "Content-Type": "application/json" }, body: JSON.stringify(corps) });
  return { statut: r.status, corps: await r.json().catch(() => null) };
}
/** Requête REST avec le rôle service (vérité de la base, pour comparer à ce que voit un visiteur). */
export async function restService(chemin, init = {}) {
  const r = await fetch(`${env.SUPABASE_URL}/rest/v1/${chemin}`, { ...init, headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, "Content-Type": "application/json", ...(init.headers ?? {}) } });
  return { statut: r.status, corps: await r.json().catch(() => null) };
}
/** SQL par l'API de gestion (nettoyage des clés factices et de l'état des moteurs). */
export async function sqlGestion(requete) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${env.SUPABASE_PROJECT_REF}/database/query`, { method: "POST", headers: { Authorization: `Bearer ${env.SUPABASE_ACCESS_TOKEN}`, "Content-Type": "application/json" }, body: JSON.stringify({ query: requete }) });
  return r.json();
}
// ---- état réel des moteurs : les VRAIES clés (PTV, Stadia) sont dans Vault ; elles ne sont jamais effacées, jamais écrites ----
const REEL = { peages: { actif: "ptv", secours: null }, itineraire: { actif: "stadia", secours: "valhalla-public" } };
const rpcService = (nom, corps) => fetch(`${env.SUPABASE_URL}/rest/v1/rpc/${nom}`, { method: "POST", headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, "Content-Type": "application/json" }, body: JSON.stringify(corps) });
/** Lit les clés réelles (moteur_cle) et les lignes de la table moteurs ; EN MÉMOIRE seulement (jamais fichier, log, capture ni commit). */
export async function lireEtatReel() {
  const rangees = await restService("cles_fournisseurs?select=fournisseur");
  const cles = {};
  for (const { fournisseur } of rangees.corps ?? []) {
    const r = await rpcService("moteur_cle", { p_fournisseur: fournisseur });
    const cle = await r.json();
    if (typeof cle === "string" && !cle.startsWith("FAUX-")) cles[fournisseur] = cle;
  }
  const moteurs = (await restService("moteurs?select=*")).corps ?? [];
  return { cles, moteurs };
}
/** Restaure les clés lues (moteur_cle_enregistrer) et les lignes de moteurs, comme avant le run. */
export async function restaurerEtatReel(etat) {
  for (const [fournisseur, cle] of Object.entries(etat.cles)) await rpcService("moteur_cle_enregistrer", { p_fournisseur: fournisseur, p_cle: cle });
  for (const m of etat.moteurs) {
    const { service, ...reste } = m;
    await restService(`moteurs?service=eq.${service}`, { method: "PATCH", body: JSON.stringify(reste) });
  }
  await supprimerClesFausses();
}
/** Supprime SEULEMENT les clés factices (valeur commençant par « FAUX- ») ; une vraie clé n'est jamais touchée. */
export async function supprimerClesFausses() {
  await sqlGestion(`
    with f as (select c.fournisseur from public.cles_fournisseurs c join vault.decrypted_secrets s on s.id = c.secret_id where s.decrypted_secret like 'FAUX-%'),
    d as (delete from public.cles_fournisseurs where fournisseur in (select fournisseur from f) returning secret_id)
    delete from vault.secrets where id in (select secret_id from d);`);
}
/** État de départ des tests : moteurs sur PTV (péages) et Stadia + secours Valhalla (itinéraire), clés factices retirées, vraies clés intactes. */
export async function reinitialiserMoteurs() {
  await supprimerClesFausses();
  for (const [service, v] of Object.entries(REEL)) await restService(`moteurs?service=eq.${service}`, { method: "PATCH", body: JSON.stringify({ ...v, etat: "ok", message: "Enregistré · utilisé dès le prochain calcul", bascule_le: null, bascule_de: null, bascule_vers: null }) });
  await sqlGestion("update public.moteurs set secours = null where service not in ('peages','itineraire')");
}
/** Noms et fins (4 derniers caractères) des clés rangées : preuve que les vraies clés n'ont pas bougé. */
export async function empreinteCles() {
  return JSON.stringify((await restService("cles_fournisseurs?select=fournisseur,fin&order=fournisseur")).corps);
}
/** Vrai appel estimer-trajet Albi → Barcelone : fournisseurs réellement utilisés (sans aucune clé). */
export async function verifierFournisseurs() {
  const v = (await rest("vehicules?select=id&marque=eq.Peugeot&modele=eq.208&limit=1"))[0].id;
  const r = await fetch(`${env.SUPABASE_URL}/functions/v1/estimer-trajet`, { method: "POST", headers: { apikey: env.VITE_SUPABASE_ANON_KEY, Authorization: `Bearer ${env.VITE_SUPABASE_ANON_KEY}`, "Content-Type": "application/json" }, body: JSON.stringify({ depart: { lat: 43.9289, lon: 2.1464 }, arrivee: { lat: 41.3874, lon: 2.1686 }, vehicule_id: v }) });
  const j = await r.json();
  return { statut: r.status, peages: j.peages?.fournisseur, etatPeages: j.peages?.etat, totalPeages: j.peages?.total, itineraire: j.itineraire?.fournisseur };
}
/** Carburant seul d'un résultat affiché : coût total moins les péages établis. */
export async function carburantAffiche(page) {
  const cout = Number(await page.locator('[data-el="cout"] [data-cout]').getAttribute("data-cout"));
  const split = await page.locator('[data-el="repartition-cout"]').innerText().catch(() => "");
  const p = split.match(/Péages ([\d,]+) €/);
  return Math.round((cout - (p ? nombre(p[1]) : 0)) * 100) / 100;
}

export const sha = (buf) => crypto.createHash("sha256").update(buf).digest("hex");
export const nombre = (t) => Number(String(t).replace(/\s| /g, "").replace(",", ".").replace(/[^\d.\-]/g, ""));
export const S4 = (p, etat) => p.locator(`[data-screen="S4"][data-etat="${etat}"]`);

/** Trajet jusqu'au résultat : lieux choisis dans les propositions (IGN ou Photon), voiture Peugeot 208. */
export async function trajetEurope(page, depart, arrivee, { departChoix = depart, arriveeChoix = arrivee } = {}) {
  await base.ouvrirTrajets(page);
  await base.saisirLieu(page, "depart", departChoix.slice(0, 5), departChoix);
  await base.saisirLieu(page, "arrivee", arriveeChoix.slice(0, 5), arriveeChoix);
  await base.choisirVoiture(page);
  await base.calculer(page);
}
/** Lit les lignes d'une liste `plist` : [{pays, texte, montant}] */
export async function lignesListe(page, dataEl) {
  return page.locator(`[data-el="${dataEl}"] li`).evaluateAll((els) => els.map((e) => ({ pays: e.dataset.pays ?? null, source: e.dataset.source ?? null, texte: e.innerText.replace(/\s+/g, " ").trim(), montant: (e.querySelector(".lit")?.textContent ?? "").trim() })));
}

/** Range une clé dans Vault par la fonction serveur (rôle service) : amorce d'un état « clé enregistrée » sans passer par le test d'un fournisseur. */
export async function injecterCle(fournisseur, cle) {
  const r = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/moteur_cle_enregistrer`, { method: "POST", headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, "Content-Type": "application/json" }, body: JSON.stringify({ p_fournisseur: fournisseur, p_cle: cle }) });
  if (!r.ok) throw new Error(`moteur_cle_enregistrer ${r.status}`);
  return r.json();
}

/** Total des péages TTC d'un trajet, recalculé à part : appel direct à PTV (clé lue en mémoire) + TVA du pays de chaque section. */
export async function totalPeagesPtvDirect(cle, a, b) {
  const q = new URLSearchParams();
  q.append("waypoints", `${a.lat},${a.lon}`);
  q.append("waypoints", `${b.lat},${b.lon}`);
  q.set("profile", "EUR_CAR");
  q.set("results", "TOLL_COSTS,TOLL_SECTIONS,TOLL_SYSTEMS");
  q.set("options[currency]", "EUR");
  const r = await fetch(`https://api.myptv.com/routing/v1/routes?${q}`, { headers: { apiKey: cle } });
  if (!r.ok) throw new Error(`PTV direct ${r.status}`);
  const j = await r.json();
  const tva = Object.fromEntries((await rest("pays?select=code,tva")).map((x) => [x.code, Number(x.tva)]));
  let total = 0;
  const lignes = [];
  for (const s of j.toll.sections) {
    const couts = (s.costs ?? []).filter((c) => !(c.paymentMethods ?? []).includes("ELECTRONIC_TOLL_COLLECTION_SUBSCRIPTION"));
    const liste = couts.length ? couts : s.costs ?? [];
    const eur = liste.map((c) => (c.currency === "EUR" ? c.price : c.convertedPrice?.price)).filter((x) => typeof x === "number");
    const ht = eur.length ? Math.min(...eur) : 0;
    const ttc = ht === 0 ? 0 : Math.round(ht * (1 + tva[String(s.countryCode).slice(0, 2)] / 100) * 100) / 100;
    lignes.push(ttc);
    total += ttc;
  }
  return { total: Math.round(total * 100) / 100, sections: lignes.length };
}
