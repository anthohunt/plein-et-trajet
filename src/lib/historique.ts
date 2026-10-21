// Historique V1 (jalon 5, T5.6) : trajets roulés gardés sur le téléphone (IndexedDB), groupés par mois, totaux.
// La table Supabase `trajets` n'est plus écrite (ni vidée) par la V1.
import { euros } from "./calcul";
import { T } from "./textes";
import type { Carburant } from "./format";
import { CLE_ARRETE, db } from "./stockage";

/** Jalons 2-4 (écran d'estimation, hors V1) : coût d'une ligne de l'ancien historique. */
export function coutHistorique(cout: number | null): string {
  return cout == null ? T.coutHistInconnu : T.coutHist(euros(cout));
}

export interface LieuTrajet {
  lat: number;
  lon: number;
  nom: string | null; // null tant que le géocodage inverse n'a pas répondu
}
export interface PrixMoyen {
  prix: number;
  pays: string; // pays de la moyenne (celui du départ, ou FR en repli)
}

export interface TrajetV1 {
  id: string;
  debut: number; // ms
  fin: number; // ms (arrivée ; datée du début de l'immobilité après un arrêt automatique)
  depart: LieuTrajet;
  arrivee: LieuTrajet;
  pays_depart: string; // code ISO du pays de départ
  km: number;
  litres: number;
  carburant: Carburant; // carburant choisi pour le prix
  moyennes: Partial<Record<Carburant, PrixMoyen>>; // moyennes du jour du pays de départ, gardées pour changer de carburant sans réseau
  prix_litre: number | null; // moyenne du jour du carburant choisi
  prix_perso: number | null; // « Mon prix » (ou le prix d'une station, « Utiliser ce prix »)
  personnes: number; // 1 à 9
  vitesses: number[];
  consos: number[];
  conso_max: number;
  vitesse_moy: number;
  accelerations: number;
  duree_s: number;
  voiture: { nom: string; detail: string; carburant: Carburant };
  enregistre: boolean; // false : arrêté, pas encore tranché (Enregistrer / Supprimer)
}

export const PERSONNES_MIN = 1;
export const PERSONNES_MAX = 9;

/** Prix utilisé : le mien s'il est donné, sinon la moyenne du jour. */
export const prixUtilise = (t: Pick<TrajetV1, "prix_perso" | "prix_litre">): number | null => t.prix_perso ?? t.prix_litre;
/** Coût de l'essence : litres × prix, au centime. */
export function coutTrajet(t: Pick<TrajetV1, "litres" | "prix_perso" | "prix_litre">): number | null {
  const p = prixUtilise(t);
  return p == null ? null : Math.round(t.litres * p * 100) / 100;
}
/** Part de chacun : coût ÷ personnes, au centime. */
export function partPersonne(cout: number, personnes: number): number {
  return Math.round((cout / Math.max(1, personnes)) * 100) / 100;
}
export const bornerPersonnes = (n: number) => Math.min(PERSONNES_MAX, Math.max(PERSONNES_MIN, Math.round(n)));

export interface Totaux {
  trajets: number;
  km: number;
  euros: number;
}
export function totaux(liste: TrajetV1[]): Totaux {
  return {
    trajets: liste.length,
    km: Math.round(liste.reduce((s, t) => s + t.km, 0)),
    euros: Math.round(liste.reduce((s, t) => s + (coutTrajet(t) ?? 0), 0) * 100) / 100,
  };
}

const moisFormat = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" });
/** « Octobre 2026 » */
export const libelleMois = (ms: number) => {
  const s = moisFormat.format(new Date(ms));
  return s.charAt(0).toUpperCase() + s.slice(1);
};

/** Trajets du plus récent au plus ancien, groupés par mois. */
export function grouperParMois(liste: TrajetV1[]): { mois: string; trajets: TrajetV1[] }[] {
  const tries = liste.slice().sort((a, b) => b.debut - a.debut);
  const out: { mois: string; trajets: TrajetV1[] }[] = [];
  for (const t of tries) {
    const m = libelleMois(t.debut);
    if (out.length === 0 || out[out.length - 1].mois !== m) out.push({ mois: m, trajets: [] });
    out[out.length - 1].trajets.push(t);
  }
  return out;
}

/** « 43,605 · 1,444 » tant que le nom du lieu n'est pas connu. */
export const coordonnees = (l: LieuTrajet) => `${l.lat.toFixed(3).replace(".", ",")} · ${l.lon.toFixed(3).replace(".", ",")}`;
export const nomLieu = (l: LieuTrajet) => l.nom ?? coordonnees(l);

// ---------------------------------------------------------------- IndexedDB
export async function listerTrajetsV1(): Promise<TrajetV1[]> {
  const d = await db();
  return (await d.getAll("trajets")).sort((a, b) => b.debut - a.debut);
}
export async function lireTrajetV1(id: string): Promise<TrajetV1 | null> {
  return (await (await db()).get("trajets", id)) ?? null;
}
export async function garderTrajetV1(t: TrajetV1): Promise<void> {
  await (await db()).put("trajets", t);
}
export async function supprimerTrajetV1(id: string): Promise<void> {
  await (await db()).delete("trajets", id);
}
/** Trajet arrêté pas encore tranché (rouvert au lancement de l'appli). */
export async function lireArrete(): Promise<TrajetV1 | null> {
  const t = (await (await db()).get("en_cours", CLE_ARRETE)) as TrajetV1 | undefined;
  return t && typeof t.id === "string" && Array.isArray(t.vitesses) ? t : null;
}
export async function garderArrete(t: TrajetV1): Promise<void> {
  await (await db()).put("en_cours", t, CLE_ARRETE);
}
export async function oublierArrete(): Promise<void> {
  await (await db()).delete("en_cours", CLE_ARRETE);
}
/** « Enregistrer » : le trajet arrêté rejoint l'historique. */
export async function enregistrerArrete(t: TrajetV1): Promise<void> {
  const d = await db();
  const tx = d.transaction(["trajets", "en_cours"], "readwrite");
  await tx.objectStore("trajets").put({ ...t, enregistre: true });
  await tx.objectStore("en_cours").delete(CLE_ARRETE);
  await tx.done;
}
