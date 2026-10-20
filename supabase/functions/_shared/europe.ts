// Itinéraire Europe (jalon 3) — logique pure : France ou pas, polyline Valhalla, arêtes → étapes par pays.
// Source des arêtes : Valhalla /trace_attributes (classe de voie, vitesse, pente, feux, péages, pays).
import type { Etape } from "./modele.ts";

// ------------------------------------------------------------------ « 100 % France » (IGN) ou Europe (Valhalla)
// Contours simplifiés (lon, lat) de la France métropolitaine et de la Corse : servent seulement à choisir le moteur
// d'itinéraire ; l'écart de quelques km à la frontière est sans effet (un départ à la frontière passe par Valhalla).
const FRANCE: [number, number][] = [
  [2.55, 51.09], [3.1, 50.78], [3.6, 50.4], [4.2, 50.25], [4.8, 50.15], [4.85, 49.8], [5.45, 49.5], [5.95, 49.45], [6.4, 49.45],
  [6.7, 49.2], [7.05, 49.1], [8.2, 48.97], [7.8, 48.0], [7.6, 47.6], [7.0, 47.5], [6.9, 47.3], [6.2, 46.4], [6.1, 46.25], [6.8, 46.4],
  [7.05, 45.9], [6.85, 45.65], [7.1, 45.3], [6.7, 44.9], [6.95, 44.2], [7.5, 43.78], [7.3, 43.6], [6.7, 43.1], [5.4, 43.15],
  [4.5, 43.35], [3.2, 43.0], [3.1, 42.45], [2.0, 42.35], [1.5, 42.55], [0.7, 42.75], [0.3, 42.7], [-0.55, 42.8], [-1.3, 43.05],
  [-1.8, 43.4], [-1.5, 44.5], [-1.1, 45.5], [-1.25, 46.15], [-2.2, 47.2], [-4.75, 48.0], [-4.8, 48.5], [-3.2, 48.85], [-1.6, 48.7],
  [-1.6, 49.7], [-0.1, 49.3], [1.2, 49.95], [1.6, 50.9],
];
// canton de Genève : enclave suisse entourée de territoire français
const GENEVE: [number, number][] = [[5.96, 46.25], [6.0, 46.37], [6.25, 46.3], [6.3, 46.13], [6.05, 46.13]];
const CORSE: [number, number][] = [[9.35, 43.0], [9.55, 42.5], [9.55, 41.75], [9.2, 41.35], [8.6, 41.4], [8.55, 42.2], [8.65, 42.65], [9.1, 42.95]];

function dansPolygone(lat: number, lon: number, poly: [number, number][]): boolean {
  let dedans = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) dedans = !dedans;
  }
  return dedans;
}
export function pointEnFrance(lat: number, lon: number): boolean {
  return (dansPolygone(lat, lon, FRANCE) && !dansPolygone(lat, lon, GENEVE)) || dansPolygone(lat, lon, CORSE);
}

// ------------------------------------------------------------------ polyline 1e-6 (Valhalla)
export type Pt = [number, number]; // [lat, lon]

export function decoderPolyline6(s: string): Pt[] {
  const pts: Pt[] = [];
  let i = 0;
  let lat = 0;
  let lon = 0;
  const lire = (): number => {
    let r = 0;
    let shift = 0;
    let b: number;
    do {
      b = s.charCodeAt(i++) - 63;
      r |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    return r & 1 ? ~(r >> 1) : r >> 1;
  };
  while (i < s.length) {
    lat += lire();
    lon += lire();
    pts.push([lat / 1e6, lon / 1e6]);
  }
  return pts;
}

export function encoderPolyline6(pts: Pt[]): string {
  let out = "";
  let pLat = 0;
  let pLon = 0;
  const ecrire = (v: number) => {
    let n = v < 0 ? ~(v << 1) : v << 1;
    while (n >= 0x20) {
      out += String.fromCharCode((0x20 | (n & 0x1f)) + 63);
      n >>= 5;
    }
    out += String.fromCharCode(n + 63);
  };
  for (const [la, lo] of pts) {
    const a = Math.round(la * 1e6);
    const o = Math.round(lo * 1e6);
    ecrire(a - pLat);
    ecrire(o - pLon);
    pLat = a;
    pLon = o;
  }
  return out;
}

export function distanceKm(a: Pt, b: Pt): number {
  const R = 6371;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLon = ((b[1] - a[1]) * Math.PI) / 180;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos((a[0] * Math.PI) / 180) * Math.cos((b[0] * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export const longueurKm = (pts: Pt[]) => pts.slice(1).reduce((s, p, i) => s + distanceKm(pts[i], p), 0);

/**
 * Découpe un tracé en morceaux d'au plus `maxPoints` points ET d'au plus `maxKm` kilomètres cumulés, en répétant le point de
 * jonction. Valhalla /trace_attributes refuse un tracé de plus de 16 000 points (erreur 153) ou de plus de 1 000 km (erreur 154).
 */
export function decouperTrace(pts: Pt[], maxPoints = 14000, maxKm = 800): Pt[][] {
  if (pts.length < 2) return [pts];
  const out: Pt[][] = [];
  let cur: Pt[] = [pts[0]];
  let km = 0;
  for (let i = 1; i < pts.length; i++) {
    const d = distanceKm(pts[i - 1], pts[i]);
    if (cur.length >= maxPoints || km + d > maxKm) {
      out.push(cur);
      cur = [pts[i - 1]]; // point de jonction répété
      km = 0;
    }
    cur.push(pts[i]);
    km += d;
  }
  out.push(cur);
  return out;
}

// ------------------------------------------------------------------ arêtes Valhalla → étapes par pays
export interface Arete {
  length: number; // km
  road_class?: string;
  speed?: number; // km/h
  speed_limit?: number;
  weighted_grade?: number; // %
  toll?: boolean;
  traffic_signal?: boolean;
  roundabout?: boolean;
  names?: string[];
  end_node?: { admin_index?: number };
}
export interface AdminValhalla {
  country_code?: string;
}

export interface ResultatEurope {
  etapesParPays: [string, Etape[]][];
  km: number;
  kmPeageParPays: Record<string, number>;
  kmAutorouteParPays: Record<string, number>;
}

const PAS_ETAPE_M = 500;
const reNumero = /^(A|AP|AG|AC|E|N|D|M|S|T|B|SS|SP|RN|RD)\s?-?\s?\d+[A-Za-z]?$/;

function estAutoroute(a: Arete): boolean {
  return a.road_class === "motorway" || (a.road_class === "trunk" && (a.speed_limit ?? a.speed ?? 0) >= 100);
}
/** « A 61 » → « A61 » ; premier nom qui ressemble à un numéro de voie, sinon vide. */
export function numeroDeVoie(names: string[] | undefined): string {
  for (const n of names ?? []) if (reNumero.test(n.trim())) return n.trim().replace(/\s+/g, "");
  return "";
}

/**
 * Regroupe les arêtes (30 m en moyenne) en étapes d'au moins 500 m, comme les étapes IGN : même pays, même famille de voie.
 * Dénivelé d'une étape = pente moyenne nette × longueur (les montées et descentes courtes s'y annulent).
 */
export function etapesDepuisAretes(aretes: Arete[], admins: AdminValhalla[]): ResultatEurope {
  const parPays = new Map<string, Etape[]>();
  const kmPeage: Record<string, number> = {};
  const kmAuto: Record<string, number> = {};
  let km = 0;
  let cur: { pays: string; auto: boolean; m: number; s: number; pente: number; arrets: number; noms: Map<string, number> } | null = null;
  const fermer = () => {
    if (!cur) return;
    const liste = parPays.get(cur.pays) ?? [];
    const numero = [...cur.noms.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
    liste.push({
      distance_m: cur.m,
      duree_s: cur.s,
      numero,
      manoeuvre: "",
      denivele_m: Math.max(0, cur.pente) / 100,
      type_force: cur.auto ? "autoroute" : undefined,
      arrets: cur.arrets,
    });
    parPays.set(cur.pays, liste);
    cur = null;
  };
  for (const a of aretes) {
    if (!(a.length > 0)) continue;
    const pays = admins[a.end_node?.admin_index ?? 0]?.country_code?.toUpperCase() ?? "ZZ";
    const auto = estAutoroute(a);
    const m = a.length * 1000;
    km += a.length;
    if (a.toll) kmPeage[pays] = (kmPeage[pays] ?? 0) + a.length;
    if (a.road_class === "motorway") kmAuto[pays] = (kmAuto[pays] ?? 0) + a.length;
    if (cur && (cur.pays !== pays || cur.auto !== auto || cur.m >= PAS_ETAPE_M)) fermer();
    if (!cur) cur = { pays, auto, m: 0, s: 0, pente: 0, arrets: 0, noms: new Map() };
    const v = a.speed && a.speed > 0 ? a.speed : a.speed_limit && a.speed_limit > 0 ? a.speed_limit : 30;
    cur.m += m;
    cur.s += (a.length / v) * 3600;
    cur.pente += (a.weighted_grade ?? 0) * m; // % · m ; /100 donne des mètres
    cur.arrets += (a.traffic_signal ? 1 : 0) + (a.roundabout ? 1 : 0);
    const n = numeroDeVoie(a.names);
    if (n) cur.noms.set(n, (cur.noms.get(n) ?? 0) + m);
  }
  fermer();
  // ordre de traversée : ordre de première apparition (Map conserve l'ordre d'insertion)
  const etapesParPays = [...parPays.entries()].map(([p, e]) => [p, e] as [string, Etape[]]);
  return { etapesParPays, km, kmPeageParPays: kmPeage, kmAutorouteParPays: kmAuto };
}

/** Vignettes exigées : pays dont l'autoroute (classe « motorway ») est empruntée sur plus de 500 m et qui figure dans la table des vignettes. */
export function vignettesTraversees(kmAutorouteParPays: Record<string, number>, table: { pays: string; libelle: string }[]): { pays: string; libelle: string }[] {
  return table.filter((v) => (kmAutorouteParPays[v.pays] ?? 0) > 0.5).map((v) => ({ pays: v.pays, libelle: v.libelle }));
}
