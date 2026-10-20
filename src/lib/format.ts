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
  if (km < 1) return `${Math.round(km * 100) * 10} m`;
  return `${km.toFixed(1).replace(".", ",")} km`;
}

/** Écart au prix moyen national, en centimes : "−5,2 c vs France". */
export function ecart(p: number, moyenne: number | null | undefined): { texte: string; sens: "lo" | "hi" | "egal" } | null {
  if (moyenne == null || !Number.isFinite(moyenne)) return null;
  const c = Math.round((p - moyenne) * 1000) / 10; // centimes, 1 décimale
  if (c === 0) return { texte: "= France", sens: "egal" };
  const v = Math.abs(c).toFixed(1).replace(".", ",");
  return c < 0 ? { texte: `−${v} c vs France`, sens: "lo" } : { texte: `+${v} c vs France`, sens: "hi" };
}

const H = 3600_000;

/** Ancienneté d'un prix. Au-delà de 48 h : « prix du JJ/MM », signalé comme ancien. */
export function anciennete(maj: string | null | undefined, maintenant: Date = new Date()): { texte: string; ancien: boolean } {
  if (!maj) return { texte: "date inconnue", ancien: true };
  const d = new Date(maj);
  const ms = maintenant.getTime() - d.getTime();
  if (ms >= 48 * H) {
    const jj = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    return { texte: `prix du ${jj}/${mm}`, ancien: true };
  }
  if (ms < 60_000) return { texte: "à l'instant", ancien: false };
  if (ms < H) return { texte: `il y a ${Math.floor(ms / 60_000)} min`, ancien: false };
  if (ms < 24 * H) return { texte: `il y a ${Math.floor(ms / H)} h`, ancien: false };
  return { texte: "hier", ancien: false };
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
 * Moitié la moins chère : les ⌈n/2⌉ prix les plus bas sont « lo » (vert), les autres « hi » (orange).
 * Deux stations au même prix ont toujours la même couleur.
 */
export function seuilMoitie(prix: number[]): number | null {
  if (prix.length === 0) return null;
  const tries = prix.slice().sort((a, b) => a - b);
  return tries[Math.ceil(tries.length / 2) - 1];
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

/** Nom affiché d'une station : enseigne + ville, sinon nom officiel, sinon « Station » + ville. */
export function nomStation(s: { enseigne?: string | null; nom?: string | null; ville?: string | null }): string {
  const ville = (s.ville ?? "").trim();
  if (s.enseigne) return ville && !s.enseigne.toLowerCase().includes(ville.toLowerCase()) ? `${s.enseigne} ${ville}` : s.enseigne;
  if (s.nom) return s.nom;
  return ville ? `Station ${ville}` : "Station";
}
