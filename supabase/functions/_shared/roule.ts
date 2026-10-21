// Trajet enregistré en roulant (jalon 4) — logique pure, partagée par l'écran En route (calcul en direct), la fonction
// trajet-roule (calcul final sur le tracé recalé sur la carte) et Vitest (tests/unit/m4-roule.test.ts). Aucune dépendance Deno.
//
// Calcul sur la vitesse réelle, seconde par seconde : à chaque pas entre deux positions GPS, la vitesse mesurée choisit la phase
// WLTP de la voiture (même courbe que le calcul d'itinéraire : basse < 40 km/h, moyenne 40-65, haute 65-100, très haute > 100) qui
// donne les litres de base du pas ; chaque gain de vitesse ajoute l'énergie ½·m·(v₂² − v₁²) et, au calcul final, chaque montée
// m·g·Δh (dénivelé positif tiré de l'altitude, échantillons tous les 500 m comme au jalon 2) ; énergies converties en litres comme
// au jalon 2 (pouvoir calorifique, rendement du moteur). Le direct ne connaît pas l'altitude : ses litres sont sans les montées.
import { arrondi, deniveleParEtape, distanceM, echantillonner, kwhEnLitres, masseTotaleKg, phaseDepuisVitesse, type Carburant, type ConsoWltp, type Echantillon, type Troncon } from "./modele.ts";

/**
 * Une position enregistrée : [instant (ms), latitude, longitude, segment, altitude (m)?, vitesse GPS (km/h)?]. Le segment change
 * à chaque reprise après une pause. Les deux derniers champs (jalon 5) sont facultatifs : un point du jalon 4 reste valide.
 */
export type PointRoule = [number, number, number, number, (number | null)?, (number | null)?];
/** Pauses : [début, fin] en ms ; fin null tant que la pause dure. */
export type Pause = [number, number | null];

export const SEUIL_KM = 1; // en dessous : « trop court », rien n'est calculé ni ajouté à l'historique
export const GPS_PERDU_MS = 15_000; // plus de 15 s sans position : « GPS perdu »
export const COURBE_DIRECT_S = 180; // la courbe de l'écran En route montre les 3 dernières minutes
export const ARRET_KMH = 3; // sous 3 km/h après avoir roulé à plus de 10 km/h : un arrêt
export const ROULE_KMH = 10;
export const ACCELERATION_GAIN_KMH = 15; // une accélération = une montée de vitesse d'au moins 15 km/h…
export const ACCELERATION_TOLERANCE_KMH = 3; // … qui ne retombe pas de plus de 3 km/h en route
// Jalon 5 (V-3.E1) : oubli d'arrêter — 10 min sous 3 km/h dans un rayon de 50 m arrêtent le trajet (avec confirmation)
export const IMMOBILE_MS = 600_000;
export const IMMOBILE_RAYON_M = 50;
export const IMMOBILE_KMH = 3;
const IMMOBILE_FENETRE_S = 10; // vitesse jugée sur 10 s glissantes : le bruit d'un GPS à l'arrêt (quelques mètres) n'y suffit pas
const IMMOBILE_PREUVE_MS = 30_000; // il faut au moins 30 s de positions immobiles avant de compter le temps sans position
const G = 9.81;

export interface VehiculeRoule {
  masse_kg: number;
  carburant: Carburant;
  conso: ConsoWltp;
}

/** Un pas entre deux positions consécutives d'un même segment. */
export interface Pas {
  i: number; // index du point d'arrivée du pas
  t: number; // instant du point d'arrivée (ms)
  dt: number; // s
  d: number; // m
  v: number; // km/h, lissée sur 3 pas
  vPrec: number; // km/h, vitesse lissée du pas précédent du segment (la sienne au premier pas d'un segment)
}

/** Pas d'un enregistrement : distance et vitesse entre positions consécutives, segment par segment (une pause coupe le segment). */
export function pasDe(points: PointRoule[]): Pas[] {
  const out: Pas[] = [];
  const brutes: number[] = [];
  for (let i = 1; i < points.length; i++) {
    const [t0, la0, lo0, s0] = points[i - 1];
    const [t1, la1, lo1, s1] = points[i];
    if (s1 !== s0) {
      brutes.length = 0;
      continue;
    }
    const dt = (t1 - t0) / 1000;
    if (!(dt > 0)) continue;
    const d = distanceM({ lat: la0, lon: lo0 }, { lat: la1, lon: lo1 });
    // trou GPS (tunnel) : le pas est la ligne droite entre la dernière position d'avant et la première d'après, à la vitesse
    // moyenne du passage — pas lissée avec ses voisines
    const trou = dt * 1000 > GPS_PERDU_MS;
    if (trou) brutes.length = 0;
    brutes.push((d / dt) * 3.6);
    const fen = brutes.slice(-3);
    const v = trou ? (d / dt) * 3.6 : fen.reduce((s, x) => s + x, 0) / fen.length;
    if (trou) brutes.length = 0;
    // premier pas d'un segment (départ, reprise après pause) : vitesse d'avant inconnue → aucune accélération supposée
    const prec = out.length > 0 && out[out.length - 1].i === i - 1 && brutes.length > 1 ? out[out.length - 1].v : v;
    out.push({ i, t: t1, dt, d, v, vPrec: prec });
  }
  return out;
}

/** Litres d'un pas : base WLTP à la vitesse mesurée + énergie du gain de vitesse (+ montée, si connue). */
export function litresPas(p: { d: number; v: number; vPrec: number }, veh: VehiculeRoule, monteeM = 0): number {
  if (p.d <= 0 && p.v <= p.vPrec) return 0;
  const base = (veh.conso[phaseDepuisVitesse(p.v)] * (p.d / 1000)) / 100;
  const v1 = p.vPrec / 3.6;
  const v2 = p.v / 3.6;
  const masse = masseTotaleKg(veh.masse_kg);
  const joules = (v2 > v1 ? 0.5 * masse * (v2 * v2 - v1 * v1) : 0) + (monteeM > 0 ? masse * G * monteeM : 0);
  return base + kwhEnLitres(joules / 3.6e6, veh.carburant);
}

/** Nombre d'arrêts : passages sous 3 km/h après avoir roulé à plus de 10 km/h. */
export function compterArrets(vitesses: number[]): number {
  let n = 0;
  let roule = false;
  for (const v of vitesses) {
    if (v > ROULE_KMH) roule = true;
    else if (v < ARRET_KMH && roule) {
      n++;
      roule = false;
    }
  }
  return n;
}

/** Nombre d'accélérations : montées de vitesse d'au moins 15 km/h, une petite retombée (< 3 km/h) ne coupant pas la montée. */
export function compterAccelerations(vitesses: number[], gain = ACCELERATION_GAIN_KMH, tolerance = ACCELERATION_TOLERANCE_KMH): number {
  if (vitesses.length === 0) return 0;
  let bas = vitesses[0];
  let haut = vitesses[0];
  let n = 0;
  for (const v of vitesses) {
    if (v > haut) haut = v;
    else if (v < haut - tolerance) {
      if (haut - bas >= gain) n++;
      bas = v;
      haut = v;
    }
    if (v < bas) {
      bas = v;
      haut = v;
    }
  }
  if (haut - bas >= gain) n++;
  return n;
}

/** Durée enregistrée (s) : du premier instant à `maintenant`, pauses retirées. */
export function dureeEnregistree(debut: number, pauses: Pause[], maintenant: number): number {
  const enPause = pauses.reduce((s, [a, b]) => s + Math.max(0, Math.min(b ?? maintenant, maintenant) - a), 0);
  return Math.max(0, (maintenant - debut - enPause) / 1000);
}

export interface Direct {
  km: number;
  litres: number;
  l100: number | null; // affiché à partir de 0,5 km
  dureeS: number;
  arrets: number;
  vitesse: number; // km/h, dernière vitesse mesurée
  courbe: number[]; // vitesses des 3 dernières minutes (une par pas)
  gpsPerdu: boolean;
  dernierPointMs: number | null;
}

/** Tableau de bord de l'écran En route, recalculé depuis tous les points gardés (un rechargement de la page redonne les mêmes chiffres). */
export function enDirect(points: PointRoule[], pauses: Pause[], debut: number, maintenant: number, veh: VehiculeRoule, enPause: boolean): Direct {
  const pas = pasDe(points);
  const km = pas.reduce((s, p) => s + p.d, 0) / 1000;
  const litres = pas.reduce((s, p) => s + litresPas(p, veh), 0);
  const dernier = points.length > 0 ? points[points.length - 1][0] : null;
  // « GPS perdu » se compte depuis la dernière position ou la dernière reprise : les positions reçues pendant une pause (ou une
  // alerte d'immobilité) ne sont pas gardées, la reprise ne doit donc pas afficher « GPS perdu » avant la position suivante
  const finPause = pauses.reduce((m, [, b]) => (b != null && b > m ? b : m), -Infinity);
  const reference = dernier == null ? null : Math.max(dernier, finPause);
  const gpsPerdu = !enPause && reference != null && maintenant - reference > GPS_PERDU_MS;
  const vitesses = pas.map((p) => p.v);
  const derniers = pas.filter((p) => p.t >= maintenant - COURBE_DIRECT_S * 1000).map((p) => p.v);
  return {
    km,
    litres,
    l100: km >= 0.5 ? (litres / km) * 100 : null,
    dureeS: dureeEnregistree(debut, pauses, maintenant),
    arrets: compterArrets(vitesses),
    vitesse: enPause || gpsPerdu ? 0 : Math.round(vitesses[vitesses.length - 1] ?? 0),
    courbe: derniers,
    gpsPerdu,
    dernierPointMs: dernier,
  };
}

/** État minimal d'un enregistrement : points, pauses, pause en cours, segment courant. */
export interface EtatPoints {
  points: PointRoule[];
  pauses: Pause[];
  enPause: boolean;
  segment: number;
}

/** Ajoute une position : ignorée en pause ; un instant non croissant (doublon du navigateur) est ignoré. */
export function ajouterPosition<E extends EtatPoints>(e: E, t: number, lat: number, lon: number, altitude?: number | null, vitesseGps?: number | null): E {
  if (e.enPause) return e;
  const dernier = e.points[e.points.length - 1];
  if (dernier && t <= dernier[0]) return e;
  const p: PointRoule = altitude == null && vitesseGps == null ? [t, lat, lon, e.segment] : [t, lat, lon, e.segment, altitude ?? null, vitesseGps ?? null];
  return { ...e, points: [...e.points, p] };
}

/** Pause / reprise : la reprise ouvre un nouveau segment (rien n'est compté entre la position de pause et celle de reprise). */
export function basculerPause<E extends EtatPoints>(e: E, maintenant: number): E {
  if (e.enPause) {
    const pauses = e.pauses.map((p, i) => (i === e.pauses.length - 1 && p[1] == null ? ([p[0], maintenant] as Pause) : p));
    return { ...e, enPause: false, pauses, segment: e.segment + 1 };
  }
  return { ...e, enPause: true, pauses: [...e.pauses, [maintenant, null] as Pause] };
}

/**
 * Début de l'immobilité en cours (ms), ou null : depuis le point j, toutes les positions tiennent dans 50 m, la vitesse reste
 * sous 3 km/h (vitesse GPS si elle est donnée, sinon sur 10 s glissantes), et cela dure depuis 10 min — jugé sur les positions
 * (dernier instant reçu), ou sur `maintenant` quand les positions se sont tues après au moins 30 s d'immobilité constatée.
 * `depuis` : on ignore les points antérieurs (reprise après une alerte d'immobilité).
 */
export function immobileDepuis(points: PointRoule[], maintenant: number, depuis = -Infinity): number | null {
  const n = points.length;
  if (n === 0) return null;
  const last = points[n - 1];
  let j = n - 1;
  let laMin = last[1], laMax = last[1], loMin = last[2], loMax = last[2];
  for (let k = n - 2; k >= 0; k--) {
    const p = points[k];
    if (p[0] < depuis || p[3] !== last[3]) break;
    const la0 = Math.min(laMin, p[1]), la1 = Math.max(laMax, p[1]), lo0 = Math.min(loMin, p[2]), lo1 = Math.max(loMax, p[2]);
    if (distanceM({ lat: la0, lon: lo0 }, { lat: la1, lon: lo1 }) > IMMOBILE_RAYON_M) break;
    const vGps = p[5];
    if (vGps != null && vGps >= IMMOBILE_KMH) break;
    // vitesse sur la fenêtre glissante qui finit au point k + fenêtre
    let fin = -1;
    for (let i = k + 1; i < n; i++) if (points[i][0] - p[0] >= IMMOBILE_FENETRE_S * 1000) { fin = i; break; }
    if (fin > 0) {
      const q = points[fin];
      const v = (distanceM({ lat: p[1], lon: p[2] }, { lat: q[1], lon: q[2] }) / ((q[0] - p[0]) / 1000)) * 3.6;
      if (v >= IMMOBILE_KMH) break;
    }
    laMin = la0; laMax = la1; loMin = lo0; loMax = lo1;
    j = k;
  }
  const debut = points[j][0];
  const duree = last[0] - debut >= IMMOBILE_PREUVE_MS ? Math.max(last[0], maintenant) - debut : last[0] - debut;
  return duree >= IMMOBILE_MS ? debut : null;
}

export interface ResultatLocal {
  km: number;
  litres: number;
  l100: number;
  duree_s: number; // pauses retirées
  vitesse_moy: number; // km/h sur le temps roulé
  accelerations: number;
  arrets: number;
  montee_m: number;
  vitesses: number[]; // ≤ 600 valeurs, au fil du temps
  consos: number[]; // ≤ 600 valeurs, L/100 km par tranches de distance égales (leur moyenne = litres ÷ km × 100)
  conso_max: number;
}

/** Dénivelé positif de chaque pas, tiré de l'altitude GPS lissée sur 500 m (moyenne des altitudes de chaque tranche). */
export function monteesGps(points: PointRoule[], pas: Pas[], trancheM = 500): number[] {
  const out = pas.map(() => 0);
  let cumul = 0;
  const tranches: { somme: number; n: number; pas: number[]; m: number }[] = [];
  for (let k = 0; k < pas.length; k++) {
    cumul += pas[k].d;
    const w = Math.floor(cumul / trancheM);
    while (tranches.length <= w) tranches.push({ somme: 0, n: 0, pas: [], m: 0 });
    const alt = points[pas[k].i][4];
    if (alt != null && Number.isFinite(alt)) {
      tranches[w].somme += alt;
      tranches[w].n++;
    }
    tranches[w].pas.push(k);
    tranches[w].m += pas[k].d;
  }
  let prec: number | null = null;
  for (const t of tranches) {
    if (t.n === 0) continue;
    const moy = t.somme / t.n;
    if (prec != null && moy > prec && t.m > 0) for (const k of t.pas) out[k] = ((moy - prec) * pas[k].d) / t.m;
    prec = moy;
  }
  return out;
}

/** Courbe de conso : `n` tranches de distance égales, litres de chaque pas répartis au prorata de sa distance. */
export function consosParDistance(pas: Pas[], litres: number[], n: number): number[] {
  const total = pas.reduce((s, p) => s + p.d, 0);
  if (total <= 0 || n <= 0) return [];
  const pasM = total / n;
  const l = new Array<number>(n).fill(0);
  let x = 0;
  for (let k = 0; k < pas.length; k++) {
    let reste = pas[k].d;
    const parM = pas[k].d > 0 ? litres[k] / pas[k].d : 0;
    if (pas[k].d <= 0) {
      l[Math.min(n - 1, Math.floor(x / pasM))] += litres[k];
      continue;
    }
    while (reste > 1e-9) {
      const b = Math.min(n - 1, Math.floor(x / pasM + 1e-9));
      const finTranche = (b + 1) * pasM;
      const morceau = b === n - 1 ? reste : Math.min(reste, finTranche - x);
      l[b] += morceau * parM;
      x += morceau;
      reste -= morceau;
    }
  }
  return l.map((li) => (li / (pasM / 1000)) * 100);
}

/** Fin de trajet calculée sur le téléphone (V1) : mêmes pas et même physique que le direct, plus les montées de l'altitude GPS. */
export function calculLocal(points: PointRoule[], pauses: Pause[], veh: VehiculeRoule, debut: number, fin: number): ResultatLocal {
  const pas = pasDe(points);
  const montees = monteesGps(points, pas);
  const litresParPas = pas.map((p, k) => litresPas(p, veh, montees[k]));
  const m = pas.reduce((s, p) => s + p.d, 0);
  const sRoule = pas.reduce((s, p) => s + p.dt, 0);
  const litres = litresParPas.reduce((s, x) => s + x, 0);
  const km = m / 1000;
  const vitesses = pas.map((p) => p.v);
  const tranches = Math.min(600, Math.max(1, Math.ceil(m / 50)));
  const consos = consosParDistance(pas, litresParPas, tranches).map((c) => Math.round(c * 10) / 10);
  return {
    km,
    litres,
    l100: km > 0 ? (litres / km) * 100 : 0,
    duree_s: Math.round(dureeEnregistree(debut, pauses, fin)),
    vitesse_moy: sRoule > 0 ? Math.round((m / sRoule) * 3.6) : 0,
    accelerations: compterAccelerations(vitesses),
    arrets: compterArrets(vitesses),
    montee_m: Math.round(montees.reduce((s, x) => s + x, 0)),
    vitesses: reduireSerie(vitesses),
    consos,
    conso_max: consos.reduce((a, b) => Math.max(a, b), 0),
  };
}

/** Réduit une série à `max` valeurs au plus (moyenne par paquet) : courbe de tout le trajet. */
export function reduireSerie(serie: number[], max = 600): number[] {
  if (serie.length <= max) return serie.map((v) => Math.round(v));
  const out: number[] = [];
  const pasPaquet = serie.length / max;
  for (let k = 0; k < max; k++) {
    const a = Math.floor(k * pasPaquet);
    const b = Math.max(a + 1, Math.floor((k + 1) * pasPaquet));
    const p = serie.slice(a, b);
    out.push(Math.round(p.reduce((s, x) => s + x, 0) / p.length));
  }
  return out;
}

// ------------------------------------------------------------------ recalage sur la carte (Valhalla /trace_attributes, map_snap)

/** Points envoyés au recalage : un point dès 20 m parcourus (et chaque début de segment), plus le dernier ; `versEnvoye[i]` = index envoyé qui représente le point i. */
export function pointsPourRecalage(points: PointRoule[], pasM = 20): { envoyes: PointRoule[]; versEnvoye: number[] } {
  const envoyes: PointRoule[] = [];
  const versEnvoye: number[] = [];
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    const dernier = envoyes[envoyes.length - 1];
    const garder = !dernier || p[3] !== dernier[3] || i === points.length - 1 || distanceM({ lat: dernier[1], lon: dernier[2] }, { lat: p[1], lon: p[2] }) >= pasM;
    if (garder) envoyes.push(p);
    versEnvoye.push(envoyes.length - 1);
  }
  return { envoyes, versEnvoye };
}

export interface AreteRecalee {
  length?: number;
  road_class?: string;
  speed?: number;
  speed_limit?: number;
  weighted_grade?: number;
  toll?: boolean;
  use?: string;
  density?: number;
  names?: string[];
  end_node?: { admin_index?: number };
}
export type GenreRoute = "autoroute" | "route" | "ville" | "traversee";

const CLASSES_VILLE = new Set(["residential", "service_other", "service", "living_street"]);
/** Autoroute / Route / Ville d'après la route reconnue ; « traversee » = ferry ou navette ferroviaire (pas de carburant). */
export function genreArete(a: AreteRecalee | undefined): GenreRoute {
  if (!a) return "route";
  if (a.use === "ferry" || a.use === "rail-ferry" || a.use === "rail_ferry" || a.use === "rail") return "traversee";
  if (a.road_class === "motorway" || (a.road_class === "trunk" && (a.speed_limit ?? a.speed ?? 0) >= 100)) return "autoroute";
  if ((a.density ?? 0) >= 7 || (a.speed_limit != null && a.speed_limit <= 50) || CLASSES_VILLE.has(a.road_class ?? "")) return "ville";
  return "route";
}

/** Valhalla (Stadia comme FOSSGIS) ne donne pas toujours le code pays : au Royaume-Uni l'admin porte seulement « England », « Scotland »… */
const NOMS_PAYS: Record<string, string> = { england: "GB", scotland: "GB", wales: "GB", "northern ireland": "GB", "united kingdom": "GB" };
export function codePaysAdmin(ad: { country_code?: string; country_text?: string } | undefined): string {
  const c = ad?.country_code?.toUpperCase();
  if (c && c.length >= 2) return c.slice(0, 2);
  return NOMS_PAYS[(ad?.country_text ?? "").trim().toLowerCase()] ?? "ZZ";
}

const reNumero = /^(A|AP|AG|AC|E|N|D|M|S|T|B|SS|SP|RN|RD)\s?-?\s?\d+[A-Za-z]?$/;
function numero(names: string[] | undefined): string {
  for (const n of names ?? []) if (reNumero.test(n.trim())) return n.trim().replace(/\s+/g, "");
  return "";
}

/** Un pas attribué à la route reconnue : pays, genre, pente, numéro de voie. */
export interface PasAttribue extends Pas {
  pays: string;
  genre: GenreRoute;
  pente: number; // Valhalla weighted_grade (facteur d'évitement des côtes, pas une pente) : repli des tests seulement
  voie: string;
  montee?: number; // m, dénivelé positif du pas tiré de l'altitude (monteesParPas) ; 0 si l'altimétrie n'a pas répondu
}

/** Échantillons tous les 500 m le long des pas (même méthode que l'estimation du jalon 2) ; `etape` = index du pas. */
export function echantillonsDesPas(points: PointRoule[], pas: Pas[], pasM = 500): Echantillon[] {
  return echantillonner(pas.map((p) => [points[p.i - 1], points[p.i]].map(([, lat, lon]) => ({ lat, lon }))), pasM);
}

/** Dénivelé positif de chaque pas : hausse d'altitude d'un échantillon au suivant, comptée sur le pas qui porte l'échantillon. */
export function monteesParPas(echantillons: Echantillon[], altitudes: (number | null)[], nbPas: number): number[] {
  return deniveleParEtape(echantillons, altitudes, nbPas);
}

/** Attribue chaque pas à l'arête recalée de son point (matched_points[k].edge_index) ; un point non recalé reprend l'arête précédente. */
export function attribuerPas(pas: Pas[], versEnvoye: number[], matched: ({ edge_index?: number; type?: string } | undefined)[], aretes: AreteRecalee[], admins: { country_code?: string; country_text?: string }[]): PasAttribue[] {
  let derniere: AreteRecalee | undefined;
  const out: PasAttribue[] = [];
  for (const p of pas) {
    const m = matched[versEnvoye[p.i]];
    const e = m && typeof m.edge_index === "number" && m.edge_index >= 0 && m.edge_index < aretes.length ? aretes[m.edge_index] : undefined;
    if (e) derniere = e;
    const a = e ?? derniere;
    out.push({ ...p, pays: codePaysAdmin(admins[a?.end_node?.admin_index ?? 0]), genre: genreArete(a), pente: a?.weighted_grade ?? 0, voie: numero(a?.names) });
  }
  return out;
}

const ORDRE: GenreRoute[] = ["autoroute", "route", "ville"];

export interface ResultatRoule {
  troncons: Troncon[]; // un par pays et par genre, dans l'ordre de traversée des pays
  km: number;
  litres: number;
  l100: number;
  duree_min: number;
  arrets: number;
  accelerations: number;
  vitesse_moy: number; // km/h, sur le temps roulé (pauses exclues)
  traversee: boolean; // ferry ou navette ferroviaire sur le tracé (non comptée)
}

/** Calcul final sur la vitesse réelle : tronçons Autoroute / Route / Ville par pays, litres seconde par seconde, montées du tracé recalé. */
export function calculRoule(pas: PasAttribue[], veh: VehiculeRoule): ResultatRoule {
  const parPays = new Map<string, Map<GenreRoute, { m: number; s: number; l: number; dz: number; vitesses: number[]; voies: Map<string, number> }>>();
  let traversee = false;
  for (const p of pas) {
    if (p.genre === "traversee") {
      traversee = true;
      continue;
    }
    const pays = parPays.get(p.pays) ?? new Map();
    parPays.set(p.pays, pays);
    const a = pays.get(p.genre) ?? { m: 0, s: 0, l: 0, dz: 0, vitesses: [], voies: new Map() };
    pays.set(p.genre, a);
    const montee = p.montee ?? Math.max(0, (p.pente / 100) * p.d);
    a.m += p.d;
    a.s += p.dt;
    a.dz += montee;
    a.l += litresPas(p, veh, montee);
    a.vitesses.push(p.v);
    if (p.voie) a.voies.set(p.voie, (a.voies.get(p.voie) ?? 0) + p.d);
  }
  const troncons: Troncon[] = [];
  for (const [pays, genres] of parPays) {
    for (const g of ORDRE) {
      const a = genres.get(g);
      if (!a || a.m < 50) continue;
      const km = a.m / 1000;
      troncons.push({
        pays,
        type: g as Troncon["type"],
        voies: [...a.voies.entries()].sort((x, y) => y[1] - x[1]).slice(0, 3).map(([n]) => n),
        km: arrondi(km, 1),
        duree_min: Math.round(a.s / 60),
        vitesse_kmh: a.s > 0 ? Math.round((a.m / a.s) * 3.6) : 0,
        arrets: compterArrets(a.vitesses),
        denivele_m: Math.round(a.dz),
        litres: arrondi(a.l, 3),
        l100: arrondi((a.l / km) * 100, 2),
      });
    }
  }
  const vitesses = pas.filter((p) => p.genre !== "traversee").map((p) => p.v);
  const m = pas.filter((p) => p.genre !== "traversee").reduce((s, p) => s + p.d, 0);
  const sRoule = pas.filter((p) => p.genre !== "traversee").reduce((s, p) => s + p.dt, 0);
  const litres = troncons.reduce((s, t) => s + t.litres, 0);
  const km = troncons.reduce((s, t) => s + t.km, 0);
  return {
    troncons,
    km: arrondi(km, 1),
    litres: arrondi(litres, 2),
    l100: km > 0 ? arrondi((litres / km) * 100, 1) : 0,
    duree_min: Math.round(sRoule / 60),
    arrets: compterArrets(vitesses),
    accelerations: compterAccelerations(vitesses),
    vitesse_moy: sRoule > 0 ? Math.round((m / sRoule) * 3.6) : 0,
    traversee,
  };
}

// ------------------------------------------------------------------ Royaume-Uni : Manche et Dartford

/** Lignes de péage qui sont en fait la traversée de la Manche (navette Eurotunnel, ferries) : non comptées. */
export function estTraverseeManche(libelle: string): boolean {
  return /euro ?tunnel|le ?shuttle|channel tunnel|ferr(y|ies)|p ?& ?o|dfds|brittany|irish ferries|stena/i.test(libelle);
}

/** Péage à montant officiel fixe (table `peages_fixes`) : Dartford Crossing. */
export interface PeageFixe {
  id: string; // « dartford » : reconnaît aussi la ligne du fournisseur (« Dartford River · Dartford RiverTunnel » chez PTV)
  pays: string;
  libelle: string;
  montant: number;
  monnaie: string;
  noms: string; // expression régulière sur les noms des routes reconnues (Valhalla nomme le franchissement « A282 »)
}
export interface LignePeageSimple {
  pays: string;
  libelle: string;
  montant: number;
  fourchette?: boolean;
}

/**
 * Royaume-Uni : retire la traversée de la Manche (non comptée) ; un péage fixe franchi (route reconnue OU ligne du fournisseur)
 * prend son montant officiel converti au cours du jour — le Dart Charge n'a pas de TVA, le prix HT + TVA du fournisseur serait faux —
 * et il est ajouté si le fournisseur l'a omis.
 */
export function appliquerPeagesRoyaumeUni(lignes: LignePeageSimple[], fixes: PeageFixe[], nomsRoutes: (string[] | undefined)[], tauxParMonnaie: Record<string, number>): { lignes: LignePeageSimple[]; mancheRetiree: boolean } {
  const out = lignes.filter((l) => !estTraverseeManche(l.libelle));
  const mancheRetiree = out.length !== lignes.length;
  for (const f of fixes) {
    const reRoute = new RegExp(f.noms, "i");
    const reLigne = new RegExp(`${f.id}|${f.noms}`, "i");
    const k = out.findIndex((l) => reLigne.test(l.libelle));
    const franchi = k >= 0 || nomsRoutes.some((n) => (n ?? []).some((x) => reRoute.test(x.trim())));
    if (!franchi) continue;
    const taux = f.monnaie === "EUR" ? 1 : tauxParMonnaie[f.monnaie];
    if (!(taux > 0)) continue;
    const eur = Math.round((Number(f.montant) / taux) * 100) / 100;
    if (k >= 0) out[k] = { ...out[k], montant: eur, fourchette: undefined };
    else out.push({ pays: f.pays, libelle: f.libelle, montant: eur });
  }
  return { lignes: out, mancheRetiree };
}
