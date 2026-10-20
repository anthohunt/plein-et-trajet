// Modèle de consommation d'un trajet (jalon 2) — logique pure, partagée par la fonction estimer-trajet
// et testée par Vitest (tests/unit/modele.test.ts). Aucune dépendance Deno ici.
//
// Pour chaque tronçon : la vitesse typique choisit la phase WLTP (basse < 40 km/h, moyenne 40-65, haute 65-100,
// très haute > 100) qui donne le L/100 km de base de la voiture ; on ajoute (a) l'énergie des arrêts et
// ré-accélérations ½·m·v² par arrêt, (b) l'énergie du dénivelé positif m·g·Δh, converties en litres
// (pouvoir calorifique, rendement moteur). Masse = masse en ordre de marche + 75 kg.

export type Carburant = "Gazole" | "SP95-E10" | "SP95" | "SP98" | "E85" | "GPLc";
export type Phase = "basse" | "moyenne" | "haute" | "tres_haute";
export type TypeTroncon = "autoroute" | "route" | "ville" | "montee";

export interface ConsoWltp {
  basse: number;
  moyenne: number;
  haute: number;
  tres_haute: number; // L/100 km
}
export interface VehiculeModele {
  masse_kg: number;
  carburant: Carburant;
  conso: ConsoWltp;
}

export const MASSE_CONDUCTEUR_KG = 75;
const G = 9.81;
// kWh par litre / rendement du moteur : 8,9 et 0,25 (essence), 9,9 et 0,30 (gazole) ; E85 et GPLc ajoutés (valeurs usuelles).
const ENERGIE: Record<Carburant, { pci: number; rendement: number }> = {
  Gazole: { pci: 9.9, rendement: 0.3 },
  "SP95-E10": { pci: 8.9, rendement: 0.25 },
  SP95: { pci: 8.9, rendement: 0.25 },
  SP98: { pci: 8.9, rendement: 0.25 },
  E85: { pci: 6.1, rendement: 0.25 },
  GPLc: { pci: 7.1, rendement: 0.25 },
};

export function phaseDepuisVitesse(vitesseKmh: number): Phase {
  if (vitesseKmh < 40) return "basse";
  if (vitesseKmh < 65) return "moyenne";
  if (vitesseKmh <= 100) return "haute";
  return "tres_haute";
}

/** Énergie mécanique (kWh) → litres de carburant. */
export function kwhEnLitres(kwhMecanique: number, carburant: Carburant): number {
  const e = ENERGIE[carburant];
  return kwhMecanique / e.rendement / e.pci;
}

export function masseTotaleKg(masseVide: number): number {
  return masseVide + MASSE_CONDUCTEUR_KG;
}

/** Litres pour `n` arrêts suivis d'une ré-accélération jusqu'à la vitesse typique du tronçon. */
export function litresArrets(masseVide: number, vitesseKmh: number, arrets: number, carburant: Carburant): number {
  if (arrets <= 0 || vitesseKmh <= 0) return 0;
  const v = vitesseKmh / 3.6;
  const joules = 0.5 * masseTotaleKg(masseVide) * v * v * arrets;
  return kwhEnLitres(joules / 3.6e6, carburant);
}

/** Litres pour monter `deniveleM` mètres (dénivelé positif cumulé). */
export function litresDenivele(masseVide: number, deniveleM: number, carburant: Carburant): number {
  if (deniveleM <= 0) return 0;
  const joules = masseTotaleKg(masseVide) * G * deniveleM;
  return kwhEnLitres(joules / 3.6e6, carburant);
}

export interface EntreeTroncon {
  km: number;
  vitesse_kmh: number;
  arrets: number;
  denivele_m: number;
}
export interface ResultatTroncon {
  phase: Phase;
  l100_base: number;
  litres_base: number;
  litres_arrets: number;
  litres_denivele: number;
  litres: number;
  l100: number;
}

export function consoTroncon(t: EntreeTroncon, v: VehiculeModele): ResultatTroncon {
  const phase = phaseDepuisVitesse(t.vitesse_kmh);
  const l100_base = v.conso[phase];
  const litres_base = (l100_base * t.km) / 100;
  const litres_arrets = litresArrets(v.masse_kg, t.vitesse_kmh, t.arrets, v.carburant);
  const litres_denivele = litresDenivele(v.masse_kg, t.denivele_m, v.carburant);
  const litres = litres_base + litres_arrets + litres_denivele;
  return { phase, l100_base, litres_base, litres_arrets, litres_denivele, litres, l100: t.km > 0 ? (litres / t.km) * 100 : 0 };
}

// ------------------------------------------------------------------ découpage de l'itinéraire en tronçons

export interface Etape {
  distance_m: number;
  duree_s: number;
  numero: string; // numéro de voie IGN (A68, N88, D988…), vide si inconnu
  manoeuvre: string; // type de manœuvre IGN (turn, fork, roundabout…)
  denivele_m: number; // dénivelé positif cumulé sur l'étape
}

const MANOEUVRES_ARRET = new Set(["turn", "end of road", "roundabout", "rotary", "roundabout turn", "exit roundabout", "exit rotary", "traffic signals"]);
const MONTEE_M_PAR_KM = 25; // 2,5 % de pente moyenne
const MONTEE_LONGUEUR_MIN_M = 500;

export function vitesseKmh(distanceM: number, dureeS: number): number {
  return dureeS > 0 ? (distanceM / dureeS) * 3.6 : 0;
}

export function typeDeLEtape(e: Etape): TypeTroncon {
  const v = vitesseKmh(e.distance_m, e.duree_s);
  if (e.distance_m >= MONTEE_LONGUEUR_MIN_M && e.denivele_m / (e.distance_m / 1000) >= MONTEE_M_PAR_KM) return "montee";
  if (/^A\d/i.test(e.numero) || (v >= 105 && e.distance_m >= 2000)) return "autoroute";
  if (v < 50) return "ville";
  return "route";
}

export function estUnArret(e: Etape, type: TypeTroncon): boolean {
  return type !== "autoroute" && MANOEUVRES_ARRET.has(e.manoeuvre);
}

export interface Troncon {
  type: TypeTroncon;
  voies: string[]; // numéros de voie principaux (A68, N88…)
  km: number;
  duree_min: number;
  vitesse_kmh: number;
  arrets: number;
  denivele_m: number;
  litres: number;
  l100: number;
}

const ORDRE: TypeTroncon[] = ["autoroute", "route", "ville", "montee"];

/** Regroupe les étapes par type de voie et applique le modèle de consommation à chaque tronçon. */
export function decouperTroncons(etapes: Etape[], v: VehiculeModele): Troncon[] {
  const acc = new Map<TypeTroncon, { m: number; s: number; arrets: number; d: number; voies: Map<string, number> }>();
  for (const e of etapes) {
    const type = typeDeLEtape(e);
    const a = acc.get(type) ?? { m: 0, s: 0, arrets: 0, d: 0, voies: new Map() };
    a.m += e.distance_m;
    a.s += e.duree_s;
    a.d += e.denivele_m;
    if (estUnArret(e, type)) a.arrets += 1;
    if (e.numero) a.voies.set(e.numero, (a.voies.get(e.numero) ?? 0) + e.distance_m);
    acc.set(type, a);
  }
  const out: Troncon[] = [];
  for (const type of ORDRE) {
    const a = acc.get(type);
    if (!a || a.m <= 0) continue;
    const km = a.m / 1000;
    const vit = vitesseKmh(a.m, a.s);
    const c = consoTroncon({ km, vitesse_kmh: vit, arrets: a.arrets, denivele_m: a.d }, v);
    const voies = [...a.voies.entries()].sort((x, y) => y[1] - x[1]).slice(0, 3).map(([n]) => n);
    out.push({
      type,
      voies,
      km: arrondi(km, 1),
      duree_min: Math.round(a.s / 60),
      vitesse_kmh: Math.round(vit),
      arrets: a.arrets,
      denivele_m: Math.round(a.d),
      litres: arrondi(c.litres, 3),
      l100: arrondi(c.l100, 2),
    });
  }
  return out;
}

export function arrondi(x: number, d: number): number {
  const f = 10 ** d;
  return Math.round(x * f) / f;
}

export interface Synthese {
  km: number;
  litres: number;
  l100: number;
  duree_min: number;
}
export function synthese(troncons: Troncon[]): Synthese {
  const km = troncons.reduce((s, t) => s + t.km, 0);
  const litres = troncons.reduce((s, t) => s + t.litres, 0);
  return { km: arrondi(km, 1), litres: arrondi(litres, 2), l100: km > 0 ? arrondi((litres / km) * 100, 1) : 0, duree_min: troncons.reduce((s, t) => s + t.duree_min, 0) };
}

// ------------------------------------------------------------------ altimétrie : échantillonnage et dénivelé par étape

export interface PointGeo {
  lon: number;
  lat: number;
}

export function distanceM(a: PointGeo, b: PointGeo): number {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export interface Echantillon extends PointGeo {
  etape: number; // index de l'étape qui contient le point
}

/** Points tous les `pasM` mètres le long du tracé (concaténation des étapes), plus le point d'arrivée. */
export function echantillonner(etapes: PointGeo[][], pasM = 500): Echantillon[] {
  const pts: Echantillon[] = [];
  etapes.forEach((coords, i) => coords.forEach((c) => pts.push({ lon: c.lon, lat: c.lat, etape: i })));
  if (pts.length === 0) return [];
  const sortie: Echantillon[] = [{ ...pts[0] }];
  let cumul = 0;
  let prochain = pasM;
  for (let i = 1; i < pts.length; i++) {
    const seg = distanceM(pts[i - 1], pts[i]);
    while (seg > 0 && cumul + seg >= prochain) {
      const t = (prochain - cumul) / seg;
      sortie.push({ lon: pts[i - 1].lon + (pts[i].lon - pts[i - 1].lon) * t, lat: pts[i - 1].lat + (pts[i].lat - pts[i - 1].lat) * t, etape: pts[i].etape });
      prochain += pasM;
    }
    cumul += seg;
  }
  const dernier = pts[pts.length - 1];
  const fin = sortie[sortie.length - 1];
  if (fin.lon !== dernier.lon || fin.lat !== dernier.lat) sortie.push({ ...dernier });
  return sortie;
}

/** Dénivelé positif par étape, à partir des altitudes (null = pas de donnée) des échantillons. */
export function deniveleParEtape(echantillons: Echantillon[], altitudes: (number | null)[], nbEtapes: number): number[] {
  const d = new Array<number>(nbEtapes).fill(0);
  let prec: number | null = null;
  for (let i = 0; i < echantillons.length; i++) {
    const z = altitudes[i];
    if (z == null || !Number.isFinite(z)) continue;
    if (prec != null && z > prec) d[echantillons[i].etape] += z - prec;
    prec = z;
  }
  return d;
}
