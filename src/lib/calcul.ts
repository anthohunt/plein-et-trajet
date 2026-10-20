// Logique pure du jalon 2 (testée par Vitest) : prix perso, coût, libellés, ordre des motorisations.
import { T } from "./textes";

export const PRIX_MIN = 0.5;
export const PRIX_MAX = 4;

export type ValidationPrix = { ok: true; valeur: number } | { ok: false };

/** « 1,699 » ou « 1.699 » → 1.699 ; refuse les lettres, le vide et tout ce qui sort de 0,50–4,00 €/L. */
export function validerPrix(saisie: string): ValidationPrix {
  const s = saisie.trim().replace(/\s/g, "").replace(",", ".");
  if (!/^\d+(\.\d{1,3})?$/.test(s) && !/^\d+\.$/.test(s)) return { ok: false };
  const n = Number(s);
  if (!Number.isFinite(n) || n < PRIX_MIN || n > PRIX_MAX) return { ok: false };
  return { ok: true, valeur: n };
}

/** Coût du carburant en euros, arrondi au centime. */
export function coutCarburant(litres: number, prixLitre: number): number {
  return Math.round(litres * prixLitre * 100) / 100;
}

export const fmt = (n: number, d: number) => n.toFixed(d).replace(".", ",");
export const euros = (n: number) => fmt(n, 2);

export function libelleType(type: string, voies: string[]): string {
  if (type === "autoroute") return voies.some((v) => /^A\d/i.test(v)) || voies.length === 0 ? T.typeAutoroute : T.typeVoieRapide;
  if (type === "route") return T.typeRoute;
  if (type === "ville") return T.typeVille;
  return T.typeMontee;
}

export function dateCourte(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

export interface Motorisation {
  id: string;
  puissance_kw: number;
  motorisation: string;
  carburant: string;
}

/**
 * Ordre d'affichage des motorisations (US-3.E4) : celle dont la puissance est la plus proche de la puissance
 * moyenne du modèle est proposée en premier, les autres suivent classées par puissance croissante.
 */
export function ordreMotorisations<M extends Motorisation>(liste: M[]): { proposee: M | null; ordre: M[] } {
  if (liste.length === 0) return { proposee: null, ordre: [] };
  const triees = liste.slice().sort((a, b) => a.puissance_kw - b.puissance_kw || a.motorisation.localeCompare(b.motorisation, "fr"));
  const moyenne = triees.reduce((s, m) => s + m.puissance_kw, 0) / triees.length;
  let proposee = triees[0];
  for (const m of triees) if (Math.abs(m.puissance_kw - moyenne) < Math.abs(proposee.puissance_kw - moyenne)) proposee = m;
  return { proposee, ordre: [proposee, ...triees.filter((m) => m !== proposee)] };
}
