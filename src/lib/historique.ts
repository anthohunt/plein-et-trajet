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
export function totaux(liste: TrajetV1[]): Totaux & { sansPrix: number } {
  return {
    trajets: liste.length,
    sansPrix: liste.filter((t) => coutTrajet(t) == null).length,
    km: Math.round(liste.reduce((s, t) => s + t.km, 0) * 10) / 10, // une décimale : 4,6 km ne s'affiche pas « 5 km »
    euros: Math.round(liste.reduce((s, t) => s + (coutTrajet(t) ?? 0), 0) * 100) / 100,
  };
}

/**
 * Changer le carburant d'une fin de trajet (V-6.4, V-4.1) : le prix suit la moyenne du jour de ce carburant, celle gardée avec le
 * trajet, sinon celle lue maintenant (`lues`). Sans moyenne pour ce carburant, le changement est refusé (null) : le trajet garde
 * son carburant et son prix, il n'est jamais enregistré sans prix.
 */
export function changerCarburant(t: TrajetV1, c: Carburant, lues?: Partial<Record<Carburant, PrixMoyen>> | null): TrajetV1 | null {
  if (c === t.carburant) return t;
  const m = t.moyennes[c] ?? lues?.[c];
  if (!m) return null;
  return { ...t, carburant: c, moyennes: { ...(lues ?? {}), ...t.moyennes }, prix_litre: m.prix };
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
export const coordonnees = (l: LieuTrajet) => T.coordonnees(l.lat.toFixed(3).replace(".", ","), l.lon.toFixed(3).replace(".", ","));
export const nomLieu = (l: LieuTrajet) => l.nom ?? coordonnees(l);

// ---------------------------------------------------------------- IndexedDB
/** Un trajet de l'historique a changé : l'écran Historique ouvert relit sa liste (une correction peut arriver après qu'on a quitté
 *  la fin de trajet, le temps de lire une moyenne du jour). */
export const EVT_TRAJETS = "pt-trajets";
const signaler = () => {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(EVT_TRAJETS));
};
const fini = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n);
const lieuValide = (l: unknown): l is LieuTrajet => {
  const x = l as LieuTrajet | null;
  return !!x && typeof x === "object" && fini(x.lat) && fini(x.lon) && (x.nom == null || typeof x.nom === "string");
};
/**
 * Durcissement r1 (D1) : un trajet lu dans IndexedDB peut être incomplet (écriture interrompue, autre version de l'appli).
 * Rejeté (null) s'il manque ce sans quoi les écrans plantent (id, dates, lieux, distance, litres, carburant, voiture, courbes) ;
 * les champs secondaires manquants sont réparés par une valeur neutre.
 */
export function normaliserTrajet(x: unknown): TrajetV1 | null {
  const t = x as Partial<TrajetV1> | null;
  if (!t || typeof t !== "object" || typeof t.id !== "string" || !t.id) return null;
  if (!fini(t.debut) || !fini(t.fin) || !lieuValide(t.depart) || !lieuValide(t.arrivee)) return null;
  if (!fini(t.km) || !fini(t.litres) || typeof t.carburant !== "string" || !t.carburant) return null;
  if (!Array.isArray(t.vitesses) || !Array.isArray(t.consos) || !t.vitesses.every(fini) || !t.consos.every(fini)) return null;
  const v = t.voiture as TrajetV1["voiture"] | undefined;
  if (!v || typeof v !== "object" || typeof v.nom !== "string" || typeof v.carburant !== "string") return null;
  return {
    ...(t as TrajetV1),
    voiture: { ...v, detail: typeof v.detail === "string" ? v.detail : "" },
    pays_depart: typeof t.pays_depart === "string" ? t.pays_depart : "FR",
    moyennes: t.moyennes && typeof t.moyennes === "object" ? t.moyennes : {},
    prix_litre: fini(t.prix_litre) ? t.prix_litre : null,
    prix_perso: fini(t.prix_perso) ? t.prix_perso : null,
    personnes: fini(t.personnes) ? t.personnes : 1,
    conso_max: fini(t.conso_max) ? t.conso_max : 0,
    vitesse_moy: fini(t.vitesse_moy) ? t.vitesse_moy : 0,
    accelerations: fini(t.accelerations) ? t.accelerations : 0,
    duree_s: fini(t.duree_s) ? t.duree_s : 0,
    enregistre: !!t.enregistre,
  };
}
export async function listerTrajetsV1(): Promise<TrajetV1[]> {
  const d = await db();
  return (await d.getAll("trajets")).map(normaliserTrajet).filter((t): t is TrajetV1 => t !== null).sort((a, b) => b.debut - a.debut);
}
export async function lireTrajetV1(id: string): Promise<TrajetV1 | null> {
  return normaliserTrajet(await (await db()).get("trajets", id));
}
export async function garderTrajetV1(t: TrajetV1): Promise<void> {
  await (await db()).put("trajets", t);
  signaler();
}
/** Trajets supprimés pendant cette session : une correction encore en vol (nom des lieux, moyenne du jour) ne les recrée pas. */
const supprimes = new Set<string>();
export async function supprimerTrajetV1(id: string): Promise<void> {
  supprimes.add(id);
  await (await db()).delete("trajets", id);
  signaler();
}
/** Trajet arrêté pas encore tranché (rouvert au lancement de l'appli). */
export async function lireArrete(): Promise<TrajetV1 | null> {
  const d = await db();
  const brut = await d.get("en_cours", CLE_ARRETE);
  if (brut === undefined) return null;
  const t = normaliserTrajet(brut);
  // un trajet arrêté inutilisable est écarté pour de bon : sinon l'appli y reviendrait (et planterait) à chaque lancement
  if (!t) await d.delete("en_cours", CLE_ARRETE).catch(() => undefined);
  return t;
}
export async function garderArrete(t: TrajetV1): Promise<void> {
  await (await db()).put("en_cours", t, CLE_ARRETE);
}
export async function oublierArrete(id?: string): Promise<void> {
  if (id) supprimes.add(id);
  await (await db()).delete("en_cours", CLE_ARRETE);
}
/**
 * Garde une correction de fin de trajet, même si l'écran a été quitté entre-temps : trajet de l'historique, ou trajet arrêté
 * encore en attente ; si « Enregistrer » est passé pendant ce temps, la correction va au trajet de l'historique (le trajet arrêté
 * n'est pas recréé). Une suppression l'emporte toujours (V-6.4, round 3) : un trajet supprimé n'est jamais réécrit — ni s'il a été
 * supprimé pendant cette session, ni s'il n'existe plus. Lecture et écriture dans une seule transaction : une suppression ne peut
 * pas passer entre les deux.
 */
export async function garderCorrection(t: TrajetV1): Promise<void> {
  if (supprimes.has(t.id)) return;
  const tx = (await db()).transaction(["trajets", "en_cours"], "readwrite");
  const trajets = tx.objectStore("trajets");
  const enCours = tx.objectStore("en_cours");
  let ecrit = false;
  const a = t.enregistre ? null : ((await enCours.get(CLE_ARRETE)) as TrajetV1 | undefined);
  if (a?.id === t.id) await enCours.put(t, CLE_ARRETE);
  else if (await trajets.get(t.id)) {
    await trajets.put({ ...t, enregistre: true });
    ecrit = true;
  }
  await tx.done;
  if (ecrit) signaler();
}
/** « Enregistrer » : le trajet arrêté rejoint l'historique. */
export async function enregistrerArrete(t: TrajetV1): Promise<void> {
  const d = await db();
  const tx = d.transaction(["trajets", "en_cours"], "readwrite");
  await tx.objectStore("trajets").put({ ...t, enregistre: true });
  await tx.objectStore("en_cours").delete(CLE_ARRETE);
  await tx.done;
}
