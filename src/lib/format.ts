import { T } from "./textes";
// Formatage et logique pure de l'écran Prix (testés par Vitest).

export const CARBURANTS = ["Gazole", "SP95-E10", "SP95", "SP98", "E85", "GPLc"] as const;
export type Carburant = (typeof CARBURANTS)[number];

/** 2.191 → "2,191" (toujours trois décimales, virgule française). */
export function prix3(p: number): string {
  return p.toFixed(3).replace(".", ",");
}

/** 2.191 → { base: "2,19", fin: "1" } : la troisième décimale s'affiche plus petite et surélevée. */
export function partiesPrix(p: number): { base: string; fin: string } {
  const s = p.toFixed(3);
  return { base: s.slice(0, -1).replace(".", ","), fin: s.slice(-1) };
}

/** 1.734 → "1,7 km" ; 0.42 → "420 m". */
export function distance(km: number): string {
  if (km < 1) return T.metres(Math.round(km * 100) * 10);
  return T.kilometres(km.toFixed(1).replace(".", ","));
}

/** Écart au prix moyen national, en centimes : "−5,2 c vs France". */
export function ecart(p: number, moyenne: number | null | undefined): { texte: string; sens: "lo" | "hi" | "egal" } | null {
  if (moyenne == null || !Number.isFinite(moyenne)) return null;
  const c = Math.round((p - moyenne) * 1000) / 10; // centimes, 1 décimale
  if (c === 0) return { texte: T.egalFrance, sens: "egal" };
  const v = Math.abs(c).toFixed(1).replace(".", ",");
  return c < 0 ? { texte: `−${v} c ${T.vsFrance}`, sens: "lo" } : { texte: `+${v} c ${T.vsFrance}`, sens: "hi" };
}

const H = 3600_000;

/** Ancienneté d'un prix. Au-delà de 48 h : « prix du JJ/MM », signalé comme ancien. */
export function anciennete(maj: string | null | undefined, maintenant: Date = new Date()): { texte: string; ancien: boolean } {
  if (!maj) return { texte: T.dateInconnue, ancien: true };
  const d = new Date(maj);
  const ms = maintenant.getTime() - d.getTime();
  if (ms >= 48 * H) {
    const jj = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    return { texte: T.prixDu(jj, mm), ancien: true };
  }
  if (ms < 60_000) return { texte: T.alInstant, ancien: false };
  if (ms < H) return { texte: T.ilYaMin(Math.floor(ms / 60_000)), ancien: false };
  if (ms < 24 * H) return { texte: T.ilYaH(Math.floor(ms / H)), ancien: false };
  return { texte: T.hier, ancien: false };
}

export type Tri = "prix" | "distance";

export interface StationPrix {
  id: string;
  prix: number;
  distanceKm: number;
}

/** Tri de la liste : prix croissant (puis distance) ou distance croissante (puis prix). */
export function trier<T extends StationPrix>(liste: T[], tri: Tri): T[] {
  return liste.slice().sort((a, b) =>
    tri === "prix" ? a.prix - b.prix || a.distanceKm - b.distanceKm : a.distanceKm - b.distanceKm || a.prix - b.prix,
  );
}

/**
 * Moitié la moins chère : on coupe la liste triée entre deux prix DIFFÉRENTS (deux stations au même prix
 * ont toujours la même couleur), à la coupure la plus proche de la moitié ; à égalité, la plus stricte.
 * Dès qu'il y a au moins deux prix distincts, il y a au moins une verte et une orange.
 * Renvoie le prix le plus haut encore « vert » (lo = prix ≤ seuil).
 */
export function seuilMoitie(prix: number[]): number | null {
  if (prix.length === 0) return null;
  const t = prix.slice().sort((a, b) => a - b);
  const n = t.length;
  let meilleur: number | null = null;
  let ecartMin = Infinity;
  for (let k = 1; k < n; k++) {
    if (t[k] === t[k - 1]) continue; // coupure impossible au milieu d'une égalité
    const e = Math.abs(k - n / 2);
    if (e < ecartMin) {
      ecartMin = e;
      meilleur = t[k - 1];
    }
  }
  return meilleur ?? t[n - 1]; // un seul prix : tout est vert
}
export function moitie(p: number, seuil: number | null): "lo" | "hi" {
  return seuil == null || p <= seuil ? "lo" : "hi";
}

/** Distance à vol d'oiseau en km (haversine). */
export function distanceKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

const SANS_ENSEIGNE = /sans enseigne/i;

/** Nom affiché d'une station : enseigne + ville, sinon nom officiel, sinon « Station » + ville. */
export function nomStation(s: { enseigne?: string | null; nom?: string | null; ville?: string | null }): string {
  const ville = (s.ville ?? "").trim();
  // « Indépendant sans enseigne » (fiche officielle) n'est pas une marque : on garde le nom officiel
  if (s.enseigne && SANS_ENSEIGNE.test(s.enseigne)) {
    if (s.nom) return casseTitre(s.nom);
    return ville ? `${T.marqueurStation} ${ville}` : T.marqueurStation;
  }
  if (s.enseigne) return ville && !s.enseigne.toLowerCase().includes(ville.toLowerCase()) ? `${s.enseigne} ${ville}` : s.enseigne;
  if (s.nom) return s.nom;
  return ville ? `${T.marqueurStation} ${ville}` : T.marqueurStation;
}

const PETITS = new Set(["de", "des", "du", "la", "le", "les", "et", "d", "l", "en", "sur", "a", "au", "aux"]);
/** « RELAIS DES FONTANELLES » → « Relais des Fontanelles » (seulement si le texte est tout en majuscules). */
export function casseTitre(t: string): string {
  if (t !== t.toUpperCase()) return t;
  return t
    .toLowerCase()
    .split(/(\s+|-|')/)
    .map((m, i) => (i > 0 && PETITS.has(m) ? m : m.charAt(0).toUpperCase() + m.slice(1)))
    .join("");
}

/**
 * Libellés affichés, sans doublon : deux stations au même libellé « enseigne + ville »
 * sont distinguées par leur nom officiel (ou, à défaut, leur adresse).
 */
export function libellesStations<S extends { id: string; enseigne?: string | null; nom?: string | null; ville?: string | null; adresse?: string | null }>(
  stations: S[],
): Map<string, string> {
  const base = new Map(stations.map((s) => [s.id, nomStation(s)]));
  const compte = new Map<string, number>();
  for (const v of base.values()) compte.set(v, (compte.get(v) ?? 0) + 1);
  const out = new Map<string, string>();
  for (const s of stations) {
    const b = base.get(s.id)!;
    if ((compte.get(b) ?? 0) < 2) out.set(s.id, b);
    else {
      const precision = s.nom && s.nom !== b ? casseTitre(s.nom) : s.adresse ? casseTitre(s.adresse) : s.id;
      out.set(s.id, `${b} · ${precision}`);
    }
  }
  return out;
}
