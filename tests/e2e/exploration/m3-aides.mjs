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
/** Remet les moteurs dans l'état de départ (PTV actif sans clé, aucun secours) et supprime les clés factices de Vault. */
export async function reinitialiserMoteurs() {
  await sqlGestion(`
    delete from vault.secrets where id in (select secret_id from public.cles_fournisseurs);
    delete from public.cles_fournisseurs;
    update public.moteurs set actif = 'ptv', secours = null, etat = 'wait', message = 'Clé à coller', dernier_test = null, bascule_le = null, bascule_de = null, bascule_vers = null, incident_le = null, incident_message = null where service = 'peages';
    update public.moteurs set secours = null where service <> 'peages';`);
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
