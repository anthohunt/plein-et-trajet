// Géocodage IGN Géoplateforme (sans clé, CORS ouvert) : texte saisi → ville et coordonnées.
import type { Lieu } from "./position";
import { supabase } from "./supabase";
import { distanceKm } from "./format";

const URL_RECHERCHE = "https://data.geopf.fr/geocodage/search";

export async function geocoderVille(texte: string, signal?: AbortSignal): Promise<Lieu | null> {
  const q = texte.trim();
  if (q.length < 2) return null;
  const r = await fetch(`${URL_RECHERCHE}?q=${encodeURIComponent(q)}&limit=1&index=address`, { signal });
  if (!r.ok) return null;
  let d: unknown;
  try {
    d = await r.json();
  } catch {
    return null; // réponse mal formée
  }
  const f = (d as { features?: { geometry?: { coordinates?: number[] }; properties?: { city?: string; label?: string } }[] }).features?.[0];
  const c = f?.geometry?.coordinates;
  if (!f || !c || c.length < 2 || !Number.isFinite(c[0]) || !Number.isFinite(c[1])) return null;
  return { lat: c[1], lon: c[0], label: f.properties?.city || f.properties?.label || q };
}

export interface Suggestion extends Lieu {
  contexte: string; // « 81, Tarn, Occitanie »
}

interface Feature {
  geometry?: { coordinates?: number[] };
  properties?: { city?: string; label?: string; name?: string; type?: string; context?: string };
}

async function chercher(q: string, limite: number, communesSeulement: boolean, signal?: AbortSignal): Promise<Suggestion[]> {
  const url = `${URL_RECHERCHE}?q=${encodeURIComponent(q)}&limit=${limite}&index=address${communesSeulement ? "&type=municipality" : ""}`;
  let r = await fetch(url, { signal }).catch((e) => {
    if (signal?.aborted) throw e;
    return null;
  });
  if (!r || r.status === 429 || r.status >= 500) {
    // une seule reprise : le service public est parfois lent à répondre
    await new Promise((ok) => setTimeout(ok, 400));
    r = await fetch(url, { signal });
  }
  if (!r.ok) throw new Error(`géocodage HTTP ${r.status}`);
  let d: unknown;
  try {
    d = await r.json();
  } catch {
    throw new Error("géocodage: réponse mal formée");
  }
  const features = (d as { features?: Feature[] }).features;
  if (!Array.isArray(features)) throw new Error("géocodage: réponse mal formée");
  const out: Suggestion[] = [];
  for (const f of features) {
    const c = f.geometry?.coordinates;
    const p = f.properties;
    if (!c || c.length < 2 || !Number.isFinite(c[0]) || !Number.isFinite(c[1]) || !p) continue;
    const label = p.type === "municipality" ? p.city || p.name || p.label : p.label;
    if (!label) continue;
    out.push({ lat: c[1], lon: c[0], label, contexte: p.context ?? "" });
  }
  return out;
}

const AVEC_CHIFFRE = /[\d,]/;

const norm = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();

interface PropositionEtrangere {
  label: string;
  lat: number;
  lon: number;
  contexte: string;
}
/** functions/v1/lieux (moteur « lieux » : Photon en Europe) : propositions hors de France ; vide si le service ne répond pas. */
async function propositionsEtrangeres(q: string, signal?: AbortSignal): Promise<Suggestion[]> {
  const { data, error } = await supabase.functions.invoke("lieux", { body: { action: "suggerer", q }, signal });
  if (error) return [];
  const l = (data as { propositions?: PropositionEtrangere[] } | null)?.propositions;
  return Array.isArray(l) ? l.filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lon) && p.label).map((p) => ({ lat: p.lat, lon: p.lon, label: p.label, contexte: p.contexte })) : [];
}
async function lieuEtranger(q: string, signal?: AbortSignal): Promise<Lieu | null> {
  const { data, error } = await supabase.functions.invoke("lieux", { body: { action: "geocoder", q }, signal });
  if (error) return null;
  const l = (data as { lieu?: PropositionEtrangere | null } | null)?.lieu;
  return l && Number.isFinite(l.lat) && Number.isFinite(l.lon) ? { lat: l.lat, lon: l.lon, label: l.label } : null;
}

/** Propositions au fil de la frappe : communes d'abord (« Alb » → Albi) ; adresses dès qu'un chiffre est tapé ; lieux étrangers à la suite. */
export async function suggererLieux(texte: string, signal?: AbortSignal, partiel?: (s: Suggestion[]) => void): Promise<Suggestion[]> {
  const q = texte.trim();
  if (q.length < 2) return [];
  const avecChiffre = AVEC_CHIFFRE.test(q);
  const fr = chercher(q, 6, !avecChiffre, signal);
  const etr = avecChiffre ? Promise.resolve([] as Suggestion[]) : propositionsEtrangeres(q, signal).catch(() => [] as Suggestion[]);
  // les propositions françaises s'affichent dès qu'elles arrivent ; les étrangères s'y ajoutent ensuite
  const frOk = await fr.then((v) => v, () => null);
  if (signal?.aborted) throw new DOMException("aborted", "AbortError");
  if (frOk && partiel) partiel(frOk);
  const etrangeres = await etr;
  if (signal?.aborted) throw new DOMException("aborted", "AbortError");
  if (frOk == null) {
    if (etrangeres.length > 0) return etrangeres;
    throw new Error("géocodage indisponible");
  }
  return etrangeres.length > 0 ? [...frOk.slice(0, 4), ...etrangeres.slice(0, 3)] : frOk;
}

/** Lieu correspondant à un texte saisi sans choisir de proposition ; null = introuvable ; lève si le service est injoignable. */
export async function geocoderLieu(texte: string, signal?: AbortSignal): Promise<Lieu | null> {
  const q = texte.trim();
  if (q.length < 2) return null;
  if (!AVEC_CHIFFRE.test(q)) {
    const communes = await chercher(q, 1, true, signal);
    // l'IGN est tolérant (« Barcelone » → « Barcelonne ») : un lieu étranger de même nom l'emporte
    if (communes[0] && norm(communes[0].label) === norm(q)) return communes[0];
    const etranger = await lieuEtranger(q, signal).catch(() => null);
    if (etranger) return etranger;
    if (communes[0]) return communes[0];
  }
  const tous = await chercher(q, 1, false, signal);
  return tous[0] ?? null;
}

/** Commune d'une position (pré-remplit le départ), au CENTRE de la commune : la même position que la commune choisie
 *  dans les propositions, donc la même clé du cache des péages (streamline R2, R6). IGN en France (à moins de 2 km),
 *  Photon ailleurs ; si le centre est introuvable, la position elle-même ; null si aucune commune. */
export async function communeDuLieu(lat: number, lon: number, signal?: AbortSignal): Promise<Lieu | null> {
  const ici = (label: string): Lieu => ({ lat, lon, label });
  try {
    const r = await fetch(`https://data.geopf.fr/geocodage/reverse?lon=${lon}&lat=${lat}&index=address&limit=1`, { signal });
    if (r.ok) {
      const p = (await r.json())?.features?.[0]?.properties;
      if (p?.city && (p.distance == null || p.distance < 2000)) {
        const c = await fetch(`${URL_RECHERCHE}?q=${encodeURIComponent(p.city)}&type=municipality&citycode=${encodeURIComponent(p.citycode ?? "")}&index=address&limit=1`, { signal })
          .then((x) => (x.ok ? x.json() : null))
          .catch(() => null);
        const centre = c?.features?.[0]?.geometry?.coordinates;
        return Array.isArray(centre) && Number.isFinite(centre[0]) && Number.isFinite(centre[1]) ? { lat: centre[1], lon: centre[0], label: p.city } : ici(p.city);
      }
    }
  } catch {
    if (signal?.aborted) return null;
  }
  try {
    const r = await fetch(`https://photon.komoot.io/reverse?lat=${lat}&lon=${lon}&lang=fr&limit=1`, { signal });
    if (!r.ok) return null;
    const f = (await r.json())?.features?.[0];
    const p = f?.properties;
    if (!p) return null;
    // la ville elle-même : son point est le centre
    const c = f.geometry?.coordinates;
    if (p.osm_key === "place" && ["city", "town", "village"].includes(p.osm_value) && p.name && Array.isArray(c)) return { lat: c[1], lon: c[0], label: p.name };
    const nom: string | undefined = p.city ?? p.name;
    if (!nom) return null;
    // sinon le centre de la ville géocodée par le moteur « lieux », s'il est bien la même (moins de 25 km)
    const centre = await lieuEtranger(nom, signal).catch(() => null);
    return centre && distanceKm({ lat, lon }, centre) < 25 ? { ...centre, label: nom } : ici(nom);
  } catch {
    return null;
  }
}
