// Péages voiture (jalon 3) — adaptateurs PTV Developer (prix HT, TVA du pays ajoutée) et HERE v8 (prix TTC).
// Formats vérifiés dans la documentation officielle (2026-10-20) :
//  • PTV  GET https://api.myptv.com/routing/v1/routes?waypoints=lat,lon&waypoints=…&profile=EUR_CAR&results=TOLL_COSTS,TOLL_SECTIONS,TOLL_SYSTEMS&options[currency]=EUR
//         en-tête `apiKey` ; réponse { toll: { costs, sections:[{costs:[{price,currency,paymentMethods,convertedPrice}],countryCode,displayName,tollSystemIndex}], systems:[{name,operatorName}] } } — « Toll prices do not include VAT ».
//  • HERE GET https://router.hereapi.com/v8/routes?transportMode=car&origin=lat,lon&destination=lat,lon&return=tolls&currency=EUR&tolls[vignettes]=all&apiKey=…
// Le péage est tarifé sur LE tracé affiché (celui du carburant) : des points de passage pris sur ce tracé sont envoyés au fournisseur.
//  • PTV  : waypoint intermédiaire `lat,lon;radius=<m>` = « route-manipulation waypoint » (OpenAPI routing v1, paramètre `waypoints` :
//           « influences the route path, so that the route passes an area defined by the given radius ») ; au plus 25 waypoints par requête
//           (base de connaissances PTV, KA-05503 ; erreur ROUTING_TOO_MANY_WAYPOINTS au-delà) → départ + arrivée + 23 passages.
//  • HERE : `via=lat,lon!passThrough=true` (Routing v8, « passthrough waypoint : changes the shape of the route only »).
//         réponse { routes:[{ sections:[{ tolls:[{countryCode(alpha-3), tollSystem, fares:[{name, price:{currency,value}, convertedPrice, paymentMethods}]}] }] }] }
export interface LignePeage {
  pays: string; // ISO alpha-2
  libelle: string;
  montant: number; // € TTC
}
export type MotifPeages = "cle_manquante" | "cle_refusee" | "quota" | "indisponible" | "reponse_invalide" | "aucun_fournisseur";
export class ErreurPeages extends Error {
  constructor(public motif: MotifPeages, public http?: number) {
    super(motif + (http ? ` (${http})` : ""));
  }
}

export const arrondi2 = (x: number) => Math.round(x * 100) / 100;

/** Prix HT → TTC avec la TVA du pays (taux en %), arrondi au centime. */
export function ajouterTva(ht: number, tvaPct: number): number {
  return arrondi2(ht * (1 + tvaPct / 100));
}

const ALPHA3: Record<string, string> = {
  FRA: "FR", ESP: "ES", ITA: "IT", PRT: "PT", DEU: "DE", BEL: "BE", LUX: "LU", NLD: "NL", CHE: "CH", AUT: "AT", SVN: "SI", HRV: "HR", HUN: "HU",
  SVK: "SK", CZE: "CZ", POL: "PL", DNK: "DK", SWE: "SE", FIN: "FI", NOR: "NO", IRL: "IE", GBR: "GB", ROU: "RO", BGR: "BG", GRC: "GR", SRB: "RS",
  BIH: "BA", MNE: "ME", MKD: "MK", ALB: "AL", MLT: "MT", CYP: "CY", EST: "EE", LVA: "LV", LTU: "LT", AND: "AD", MCO: "MC", LIE: "LI",
};
export const alpha2 = (code: string | undefined): string => {
  const c = (code ?? "").toUpperCase();
  return c.length === 3 ? (ALPHA3[c] ?? c.slice(0, 2)) : c.slice(0, 2);
};

// ------------------------------------------------------------------ PTV
interface CoutPtv {
  price?: number;
  currency?: string;
  paymentMethods?: string[];
  convertedPrice?: { price?: number; currency?: string };
}
export interface ReponsePtv {
  toll?: {
    sections?: { costs?: CoutPtv[]; countryCode?: string; displayName?: string; tollSystemIndex?: number }[];
    systems?: { name?: string; operatorName?: string }[];
  };
}

/** Prix HT en euros d'une section : le moins cher des paiements sans abonnement ; null si non convertible en euros. */
export function prixHtEuros(couts: CoutPtv[] | undefined): number | null {
  const liste = (couts ?? []).filter((c) => typeof c.price === "number");
  if (liste.length === 0) return 0;
  const sansAbonnement = liste.filter((c) => !(c.paymentMethods ?? []).includes("ELECTRONIC_TOLL_COLLECTION_SUBSCRIPTION"));
  const candidats = sansAbonnement.length > 0 ? sansAbonnement : liste;
  const euros = candidats
    .map((c) => (c.currency === "EUR" ? (c.price as number) : typeof c.convertedPrice?.price === "number" && c.convertedPrice.currency === "EUR" ? c.convertedPrice.price : null))
    .filter((x): x is number => x != null);
  return euros.length > 0 ? Math.min(...euros) : null;
}

/** Réponse PTV → lignes TTC (TVA du pays de chaque section). Lève reponse_invalide si le bloc `toll` manque. */
export function lignesDepuisPtv(r: ReponsePtv, tvaParPays: Record<string, number>): LignePeage[] {
  if (!r || typeof r !== "object" || !r.toll || !Array.isArray(r.toll.sections)) throw new ErreurPeages("reponse_invalide");
  const out: LignePeage[] = [];
  for (const s of r.toll.sections) {
    const ht = prixHtEuros(s.costs);
    if (ht == null) throw new ErreurPeages("reponse_invalide");
    const pays = alpha2(s.countryCode);
    const tva = tvaParPays[pays];
    if (tva == null && ht > 0) throw new ErreurPeages("reponse_invalide"); // pas de TVA connue : on ne devine pas
    const sys = r.toll.systems?.[s.tollSystemIndex ?? -1];
    const nom = sys?.name ?? sys?.operatorName ?? "";
    const libelle = [nom, s.displayName].filter(Boolean).join(" · ") || "Péage";
    out.push({ pays, libelle, montant: ht === 0 ? 0 : ajouterTva(ht, tva) });
  }
  return out;
}

// ------------------------------------------------------------------ HERE
/** HERE : FarePrice = SinglePrice {type:"value", value} | RangePrice {type:"range", minimum, maximum}. */
interface PrixHere {
  type?: string;
  currency?: string;
  value?: number;
  minimum?: number;
  maximum?: number;
}
interface FareHere {
  name?: string;
  price?: PrixHere;
  convertedPrice?: PrixHere;
  paymentMethods?: string[];
}
export interface ReponseHere {
  routes?: { sections?: { tolls?: { countryCode?: string; tollSystem?: string; fares?: FareHere[] }[] }[] }[];
}

/** Montant en euros d'un prix HERE ; pour une fourchette on retient le maximum (prudent) et on le signale. */
function montantHere(p: PrixHere | undefined): { v: number; fourchette: boolean } | null {
  if (!p || p.currency !== "EUR") return null;
  if (typeof p.value === "number") return { v: p.value, fourchette: false };
  if (typeof p.maximum === "number") return { v: p.maximum, fourchette: true };
  if (typeof p.minimum === "number") return { v: p.minimum, fourchette: true };
  return null;
}
function eurosHere(f: FareHere): { v: number; fourchette: boolean } | null {
  return montantHere(f.convertedPrice) ?? montantHere(f.price);
}
/** Réponse HERE → lignes (prix déjà TTC). Paiement le moins cher parmi espèces/carte ; à défaut, parmi tous. */
export function lignesDepuisHere(r: ReponseHere): LignePeage[] {
  const route = r?.routes?.[0];
  if (!route || !Array.isArray(route.sections)) throw new ErreurPeages("reponse_invalide");
  const out: LignePeage[] = [];
  for (const sec of route.sections) {
    for (const t of sec.tolls ?? []) {
      const fares = t.fares ?? [];
      const classiques = fares.filter((f) => (f.paymentMethods ?? []).some((p) => ["cash", "bankCard", "creditCard"].includes(p)));
      const prix = (classiques.length > 0 ? classiques : fares).map(eurosHere).filter((x): x is { v: number; fourchette: boolean } => x != null);
      if (fares.length > 0 && prix.length === 0) throw new ErreurPeages("reponse_invalide");
      const choisi = prix.length > 0 ? prix.reduce((a, b) => (b.v < a.v ? b : a)) : { v: 0, fourchette: false };
      const montant = choisi.v;
      out.push({ pays: alpha2(t.countryCode), libelle: ([t.tollSystem, fares[0]?.name && fares[0].name !== t.tollSystem ? fares[0].name : ""].filter(Boolean).join(" · ") || "Péage") + (choisi.fourchette ? " (estimation : maximum de la fourchette)" : ""), montant: arrondi2(montant) });
    }
  }
  return out;
}

export const totalPeages = (l: LignePeage[]) => arrondi2(l.reduce((s, x) => s + x.montant, 0));

// ------------------------------------------------------------------ appels réseau
export interface Point {
  lat: number;
  lon: number;
}
async function appel(url: string, init: RequestInit, ms = 25000): Promise<Response> {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: c.signal, headers: { "User-Agent": "plein-et-trajet/1.0 (+https://plein-et-trajet.vercel.app)", ...(init.headers ?? {}) } });
  } catch {
    throw new ErreurPeages("indisponible");
  } finally {
    clearTimeout(t);
  }
}
function erreurHttp(status: number): ErreurPeages {
  if (status === 401 || status === 403) return new ErreurPeages("cle_refusee", status);
  if (status === 429) return new ErreurPeages("quota", status);
  return new ErreurPeages("indisponible", status);
}

export const PASSAGES_MAX = 23; // PTV : 25 waypoints au plus, départ et arrivée compris
export const PAS_PASSAGES_KM = 25; // un point de passage tous les 25 km au plus serré (resserré par PASSAGES_MAX sur les longs trajets)
export const RAYON_PASSAGE_M = 500; // le tracé du fournisseur passe à moins de 500 m de chaque point

const RAYON_TERRE_KM = 6371.0088;
function km(a: Point, b: Point): number {
  const r = Math.PI / 180;
  const dLat = (b.lat - a.lat) * r;
  const dLon = (b.lon - a.lon) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLon / 2) ** 2;
  return 2 * RAYON_TERRE_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}
/** Points de passage régulièrement espacés le long du tracé (départ et arrivée exclus) : n = min(max, ⌊longueur / pas⌋),
 *  le i-ième à i × longueur / (n + 1) du départ, interpolé sur le segment qui le contient. Pur : testé sans réseau. */
export function pointsDePassage(trace: Point[], max = PASSAGES_MAX, pasKm = PAS_PASSAGES_KM): Point[] {
  if (trace.length < 2 || max <= 0) return [];
  const cumul = [0];
  for (let i = 1; i < trace.length; i++) cumul.push(cumul[i - 1] + km(trace[i - 1], trace[i]));
  const total = cumul[cumul.length - 1];
  const n = Math.min(max, Math.floor(total / pasKm));
  const out: Point[] = [];
  let j = 1;
  for (let i = 1; i <= n; i++) {
    const cible = (i * total) / (n + 1);
    while (j < trace.length - 1 && cumul[j] < cible) j++;
    const seg = cumul[j] - cumul[j - 1];
    const t = seg > 0 ? (cible - cumul[j - 1]) / seg : 0;
    const a = trace[j - 1], b = trace[j];
    out.push({ lat: Math.round((a.lat + t * (b.lat - a.lat)) * 1e6) / 1e6, lon: Math.round((a.lon + t * (b.lon - a.lon)) * 1e6) / 1e6 });
  }
  return out;
}

/** Requête PTV : départ, points de passage (route-manipulation, rayon), arrivée. */
export function requetePtv(a: Point, b: Point, passages: Point[] = []): URLSearchParams {
  const q = new URLSearchParams();
  q.append("waypoints", `${a.lat},${a.lon}`);
  for (const p of passages.slice(0, PASSAGES_MAX)) q.append("waypoints", `${p.lat},${p.lon};radius=${RAYON_PASSAGE_M}`);
  q.append("waypoints", `${b.lat},${b.lon}`);
  q.set("profile", "EUR_CAR");
  q.set("results", "TOLL_COSTS,TOLL_SECTIONS,TOLL_SYSTEMS");
  q.set("options[currency]", "EUR");
  return q;
}
/** Requête HERE : départ, points de passage (passThrough : ne coupent pas le trajet), arrivée. */
export function requeteHere(cle: string, a: Point, b: Point, passages: Point[] = []): URLSearchParams {
  const q = new URLSearchParams({ transportMode: "car", origin: `${a.lat},${a.lon}`, destination: `${b.lat},${b.lon}`, return: "tolls", currency: "EUR", "tolls[vignettes]": "all", apiKey: cle });
  for (const p of passages.slice(0, PASSAGES_MAX)) q.append("via", `${p.lat},${p.lon}!passThrough=true`);
  return q;
}

export async function peagesPtv(cle: string, a: Point, b: Point, tvaParPays: Record<string, number>, passages: Point[] = []): Promise<LignePeage[]> {
  const q = requetePtv(a, b, passages);
  const r = await appel(`https://api.myptv.com/routing/v1/routes?${q}`, { headers: { apiKey: cle } });
  if (!r.ok) throw erreurHttp(r.status);
  let j: ReponsePtv;
  try {
    j = await r.json();
  } catch {
    throw new ErreurPeages("reponse_invalide");
  }
  return lignesDepuisPtv(j, tvaParPays);
}

export async function peagesHere(cle: string, a: Point, b: Point, passages: Point[] = []): Promise<LignePeage[]> {
  const q = requeteHere(cle, a, b, passages);
  const r = await appel(`https://router.hereapi.com/v8/routes?${q}`, {});
  if (!r.ok) throw erreurHttp(r.status);
  let j: ReponseHere;
  try {
    j = await r.json();
  } catch {
    throw new ErreurPeages("reponse_invalide");
  }
  return lignesDepuisHere(j);
}

/** Message du test de connexion d'un fournisseur de péages (écran Moteurs). */
export function messageErreurPeages(nom: string, e: unknown): string {
  if (e instanceof ErreurPeages) {
    if (e.motif === "cle_refusee") return `Clé refusée par ${nom} (${e.http ?? 401})`;
    if (e.motif === "quota") return `Quota ${nom} atteint (429)`;
    if (e.motif === "cle_manquante") return "Aucune clé : colle-la d'abord";
    if (e.motif === "reponse_invalide") return `Réponse de ${nom} illisible`;
    return `${nom} ne répond pas${e.http ? ` (${e.http})` : ""}`;
  }
  return `${nom} ne répond pas`;
}
