// Aides des extraits Playwright du jalon 2 (appli déployée, base réelle). Réexporte les aides communes de m2-aides.mjs.
import { expect, type Page } from "@playwright/test";
// @ts-ignore — module JS sans types
import * as a from "../m2-aides.mjs";

export const {
  URL_APP, rest, session, moyenneDuJour, virgule, nombreFr, ouvrirTrajets, attendreFormulaire, champ, propositions, saisirLieu,
  choisirDansListe, choisirVoiture, calculer, lireResultat, lignesHistorique, etatFocus,
} = a as any;

export const S4 = (p: Page, etat: string) => p.locator(`[data-screen="S4"][data-etat="${etat}"]`);
export const dbTrajets = async (p: Page) => rest("trajets?select=id,depart_label,arrivee_label,km,litres,cout,cree_le&order=cree_le.desc", (await session(p)).jeton);
export const dbPreference = async (p: Page) => (await rest("preferences?select=marque,modele,vehicule_id,carburant", (await session(p)).jeton))[0] ?? null;

/** Compte les appels réels à l'edge function (POST). */
export function compterCalculs(p: Page) {
  const c = { n: 0, statuts: [] as number[] };
  p.on("request", (r) => { if (r.method() === "POST" && r.url().includes("/functions/v1/estimer-trajet")) c.n++; });
  p.on("response", (r) => { if (r.request().method() === "POST" && r.url().includes("/functions/v1/estimer-trajet")) c.statuts.push(r.status()); });
  return c;
}

/** Formulaire prêt : départ, arrivée, voiture (Peugeot 208 101ch mécanique, essence). */
export async function formulairePret(p: Page, depart = "Albi", arrivee = "Toulouse") {
  await ouvrirTrajets(p);
  await saisirLieu(p, "depart", depart.slice(0, 4), depart);
  await saisirLieu(p, "arrivee", arrivee.slice(0, 4), arrivee);
  await choisirVoiture(p);
}
/** Parcours complet jusqu'au résultat (vrai calcul IGN + altimétrie). */
export async function trajetCalcule(p: Page, depart = "Albi", arrivee = "Toulouse") {
  await formulairePret(p, depart, arrivee);
  await calculer(p);
  return lireResultat(p);
}
export { expect };
