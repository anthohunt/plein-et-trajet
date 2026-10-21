// Base véhicules EEA « CO2 cars » (Discodata) — logique pure (jalon 5, T5.1), partagée par la fonction voiture-eea et Vitest
// (tests/unit/m5-eea.test.ts). Aucune dépendance Deno.
//
// Sécurité : Discodata reçoit une requête SQL dans l'URL. Rien de saisi n'y entre tel quel : chaque valeur passe par un filtre
// qui n'accepte qu'une liste fermée de caractères (code : A-Z 0-9 et « - » ; mots : A-Z 0-9 et « - » ; année et kW : entiers),
// et les noms de tables viennent du registre des moteurs, eux aussi filtrés.
import { consoOfficielle, consoParPhase } from "./conso-eea.ts";
import type { Carburant, ConsoWltp } from "./modele.ts";

export const ANNEE_MIN = 2010;
export const ANNEE_MAX = 2030;
export const KW_PAR_CH = 0.7355;
export const BRUIT_PART_MIN = 0.02; // une version qui pèse moins de 2 % de la plus immatriculée du même code = erreur de saisie
const RE_MORCEAU = /^[A-Z0-9-]{1,25}$/;
const RE_MOT = /^[A-Z0-9-]{2,20}$/;
const RE_TABLE = /^\[CO2Emission\]\.\[latest\]\.\[co2cars[A-Za-z0-9_]*\]$/;

export interface CodeD2 {
  t?: string;
  va?: string;
  ve: string;
}

/** D.2 saisi → morceaux : majuscules ; 3 morceaux (« R 5RBU 5RBU0C ») = type, variante, version ; sinon espaces retirés = version. */
export function normaliserD2(saisie: string): CodeD2 | null {
  const morceaux = saisie.toUpperCase().trim().split(/[\s/]+/).filter(Boolean);
  if (morceaux.length === 0) return null;
  if (morceaux.length === 3 && morceaux.every((m) => RE_MORCEAU.test(m))) return { t: morceaux[0], va: morceaux[1], ve: morceaux[2] };
  const ve = morceaux.join("");
  return RE_MORCEAU.test(ve) ? { ve } : null;
}

export interface Recherche {
  mots: string[];
  annee: number | null;
  kwMin: number | null;
  kwMax: number | null;
}

/** « clio 2017 120 » → mots [CLIO], année 2017, 120 ch ±4 kW. Null si un mot sort de la liste de caractères permise ou s'il n'y a aucun mot. */
export function analyserRecherche(q: string): Recherche | null {
  const brut = q.toUpperCase().trim().split(/\s+/).filter(Boolean);
  if (brut.length === 0) return null;
  const mots: string[] = [];
  let annee: number | null = null;
  let kw: number | null = null;
  for (const m of brut) {
    if (/^\d{4}$/.test(m) && +m >= ANNEE_MIN && +m <= ANNEE_MAX && annee == null) annee = +m;
    else if (/^\d{2,3}$/.test(m) && +m >= 50 && +m <= 400 && kw == null) kw = Math.round(+m * KW_PAR_CH);
    else if (RE_MOT.test(m)) mots.push(m);
    else return null;
  }
  if (mots.length === 0 || mots.length > 4) return null;
  return { mots, annee, kwMin: kw == null ? null : kw - 4, kwMax: kw == null ? null : kw + 4 };
}

/** Année couverte par une table : `co2cars_2024Fv30` → 2024 ; la table sans année (`co2cars`) couvre 2010-2022. */
export function anneeDeTable(table: string): number | null {
  const m = table.match(/co2cars_(\d{4})/);
  return m ? +m[1] : null;
}
export function tableValide(table: string): boolean {
  return RE_TABLE.test(table);
}
/** Tables à interroger pour une année donnée (null = toutes). */
export function tablesPour(tables: string[], annee: number | null): string[] {
  const ok = tables.filter(tableValide);
  if (annee == null) return ok;
  const exacte = ok.filter((t) => anneeDeTable(t) === annee);
  return exacte.length > 0 ? exacte : ok.filter((t) => anneeDeTable(t) == null);
}

const COLONNES = "Year, Mk, Cn, T, Va, Ve, [M (kg)] AS m, [Ep (KW)] AS kw, [Ec (cm3)] AS ec, Ft, [Enedc (g/km)] AS enedc, [Ewltp (g/km)] AS ewltp, Fc, COUNT(*) AS n";
const GROUPE = "Year, Mk, Cn, T, Va, Ve, [M (kg)], [Ep (KW)], [Ec (cm3)], Ft, [Enedc (g/km)], [Ewltp (g/km)], Fc";

/** Requête Discodata d'un code D.2 (valeurs déjà filtrées par normaliserD2). */
export function requeteD2(table: string, c: CodeD2): string {
  if (!tableValide(table)) throw new Error("table refusée");
  for (const v of [c.ve, c.t, c.va]) if (v != null && !RE_MORCEAU.test(v)) throw new Error("code refusé");
  const ou = [`Ve='${c.ve}'`, ...(c.t ? [`T='${c.t}'`] : []), ...(c.va ? [`Va='${c.va}'`] : [])].join(" AND ");
  return `SELECT TOP 500 ${COLONNES} FROM ${table} WHERE ${ou} GROUP BY ${GROUPE} ORDER BY n DESC`;
}

/** Requête Discodata d'une recherche par nom, année et puissance (valeurs déjà filtrées par analyserRecherche). */
export function requeteRecherche(table: string, r: Recherche): string {
  if (!tableValide(table)) throw new Error("table refusée");
  if (r.mots.length === 0 || r.mots.some((m) => !RE_MOT.test(m))) throw new Error("mot refusé");
  const ou = r.mots.map((m) => `(Cn LIKE '%${m}%' OR Mk LIKE '%${m}%')`);
  if (r.annee != null) {
    if (!Number.isInteger(r.annee)) throw new Error("année refusée");
    ou.push(`Year=${r.annee}`);
  }
  if (r.kwMin != null && r.kwMax != null) {
    if (!Number.isInteger(r.kwMin) || !Number.isInteger(r.kwMax)) throw new Error("puissance refusée");
    ou.push(`[Ep (KW)] BETWEEN ${r.kwMin} AND ${r.kwMax}`);
  }
  return `SELECT TOP 800 ${COLONNES} FROM ${table} WHERE ${ou.join(" AND ")} GROUP BY ${GROUPE} ORDER BY n DESC`;
}

/** URL Discodata d'une requête (page 1). */
export function urlDiscodata(base: string, sql: string, lignes = 800): string {
  return `${base}?query=${encodeURIComponent(sql)}&p=1&nrOfHits=${lignes}`;
}

/** Une ligne de la réponse Discodata (colonnes renommées par la requête). */
export interface LigneEea {
  Year: number;
  Mk: string | null;
  Cn: string | null;
  T: string | null;
  Va: string | null;
  Ve: string | null;
  m: number | null;
  kw: number | null;
  ec: number | null;
  Ft: string | null;
  enedc: number | null;
  ewltp: number | null;
  Fc: number | null;
  n: number;
}

/** `Ft` de la base → carburant de l'appli ; « electrique » pour l'électrique et l'hydrogène (hors périmètre carburant). */
export function carburantDeFt(ft: string | null | undefined): Carburant | "electrique" | null {
  const f = (ft ?? "").trim().toLowerCase();
  if (f === "petrol" || f === "petrol/electric" || f === "petrol-electric") return "SP95-E10";
  if (f === "diesel" || f === "diesel/electric" || f === "diesel-electric") return "Gazole";
  if (f === "lpg") return "GPLc";
  if (f === "e85") return "E85";
  if (f === "electric" || f === "hydrogen") return "electrique";
  return null;
}

/** Une version agrégée : la combinaison la plus immatriculée de (marque, T, Va, Ve, année), avec le total des immatriculations. */
export interface VersionEea {
  cle: string;
  marque: string;
  modele: string;
  t: string;
  va: string;
  ve: string;
  annee: number;
  masse_kg: number;
  puissance_kw: number | null;
  cylindree_cm3: number | null;
  carburant: Carburant;
  co2_nedc: number | null;
  co2_wltp: number | null;
  conso_officielle_l100: number;
  procedure: "NEDC" | "WLTP";
  immatriculations: number;
  conso_phases: ConsoWltp;
}

const casse = (s: string) => s.toLowerCase().replace(/(^|[\s\-/(])(\p{L})/gu, (_, a: string, b: string) => a + b.toUpperCase());
const propre = (s: string | null | undefined) => (s ?? "").trim().replace(/\s+/g, " ");

/** Mode pondéré par les immatriculations d'une valeur (valeurs nulles ignorées). */
function mode<T>(lignes: LigneEea[], f: (l: LigneEea) => T | null | undefined): T | null {
  const poids = new Map<string, { v: T; n: number }>();
  for (const l of lignes) {
    const v = f(l);
    if (v == null || (typeof v === "string" && v === "")) continue;
    const k = String(v);
    const p = poids.get(k) ?? { v, n: 0 };
    p.n += l.n;
    poids.set(k, p);
  }
  let best: { v: T; n: number } | null = null;
  for (const p of poids.values()) if (!best || p.n > best.n) best = p;
  return best?.v ?? null;
}

export interface Agregat {
  versions: VersionEea[];
  electriques: number; // immatriculations des versions électriques écartées
}

/**
 * Agrège les lignes Discodata par (marque, T, Va, Ve, année) : la combinaison de caractéristiques la plus immatriculée gagne
 * (mode pondéré : le bruit de la base — 367 lignes à 131 kW pour 12 605 à 87 kW — est écarté), le total des immatriculations
 * est gardé. `bruit` : les groupes qui pèsent moins de 2 % du plus gros sont retirés (codes D.2).
 */
export function agreger(lignes: LigneEea[], opts: { bruit?: boolean; max?: number } = {}): Agregat {
  const groupes = new Map<string, LigneEea[]>();
  for (const l of lignes) {
    if (!l.Ve || !l.Mk || !Number.isFinite(l.Year) || !(l.n > 0)) continue;
    const cle = [propre(l.Mk).toUpperCase(), propre(l.T).toUpperCase(), propre(l.Va).toUpperCase(), propre(l.Ve).toUpperCase(), l.Year].join("·");
    const g = groupes.get(cle) ?? [];
    g.push(l);
    groupes.set(cle, g);
  }
  let liste = [...groupes.entries()].map(([cle, g]) => ({ cle, g, n: g.reduce((s, l) => s + l.n, 0) }));
  liste.sort((a, b) => b.n - a.n);
  if (opts.bruit && liste.length > 0) {
    const max = liste[0].n;
    liste = liste.filter((x) => x.n >= max * BRUIT_PART_MIN);
  }
  const versions: VersionEea[] = [];
  let electriques = 0;
  for (const { cle, g, n } of liste) {
    // combinaison la plus immatriculée parmi les lignes complètes (masse et CO2 ou conso renseignés)
    const completes = g.filter((l) => l.m != null && (l.Fc != null || l.ewltp != null || l.enedc != null) && carburantDeFt(l.Ft) != null);
    const combos = new Map<string, { l: LigneEea; n: number }>();
    for (const l of completes) {
      const k = [l.m, l.kw, l.ec, (l.Ft ?? "").trim().toLowerCase(), l.enedc, l.ewltp, l.Fc].join("|");
      const c = combos.get(k) ?? { l, n: 0 };
      c.n += l.n;
      combos.set(k, c);
    }
    const top = [...combos.values()].sort((a, b) => b.n - a.n)[0]?.l;
    const carb = carburantDeFt(top?.Ft ?? mode(g, (l) => (l.Ft ?? "").trim().toLowerCase()));
    if (carb === "electrique") {
      electriques += n;
      continue;
    }
    if (!top || !carb) continue;
    const kw = top.kw ?? mode(g, (l) => l.kw);
    const ec = top.ec ?? mode(g, (l) => l.ec);
    const off = consoOfficielle({ carburant: carb, fc: top.Fc, ewltp: top.ewltp, enedc: top.enedc });
    if (!off || top.m == null) continue;
    const [mk, t, va, ve] = cle.split("·");
    versions.push({
      cle,
      marque: casse(mk),
      modele: casse(propre(mode(g, (l) => propre(l.Cn).toUpperCase().split(" / ")[0]) ?? "")),
      t,
      va,
      ve,
      annee: Number(cle.split("·")[4]),
      masse_kg: Math.round(top.m),
      puissance_kw: kw == null ? null : Number(kw),
      cylindree_cm3: ec == null ? null : Math.round(Number(ec)),
      carburant: carb,
      co2_nedc: top.enedc ?? null,
      co2_wltp: top.ewltp ?? null,
      conso_officielle_l100: Math.round(off.l100 * 1000) / 1000,
      procedure: off.procedure,
      immatriculations: n,
      conso_phases: consoParPhase(off.l100, carb, top.m, kw == null ? null : Number(kw)),
    });
    if (opts.max && versions.length >= opts.max) break;
  }
  return { versions, electriques };
}

/** Libellé court d'une version : « 1.2 · 118 ch » (la base EEA ne porte pas le nom commercial de la finition). */
export function libelleVersion(v: { cylindree_cm3: number | null; puissance_kw: number | null }): string {
  const l = v.cylindree_cm3 ? (Math.round(v.cylindree_cm3 / 100) / 10).toFixed(1) : null;
  const ch = v.puissance_kw ? `${Math.round(v.puissance_kw / KW_PAR_CH)} ch` : null;
  return [l, ch].filter(Boolean).join(" · ");
}
