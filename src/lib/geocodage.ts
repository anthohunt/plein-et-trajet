// Géocodage IGN Géoplateforme (sans clé, CORS ouvert) : texte saisi → ville et coordonnées.
import type { Lieu } from "./position";

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
  const r = await fetch(url, { signal });
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

/** Propositions au fil de la frappe : communes d'abord (« Alb » → Albi) ; adresses dès qu'un chiffre est tapé. */
export function suggererLieux(texte: string, signal?: AbortSignal): Promise<Suggestion[]> {
  const q = texte.trim();
  if (q.length < 2) return Promise.resolve([]);
  return chercher(q, 6, !AVEC_CHIFFRE.test(q), signal);
}

/** Lieu correspondant à un texte saisi sans choisir de proposition ; null = introuvable ; lève si le service est injoignable. */
export async function geocoderLieu(texte: string, signal?: AbortSignal): Promise<Lieu | null> {
  const q = texte.trim();
  if (q.length < 2) return null;
  if (!AVEC_CHIFFRE.test(q)) {
    const communes = await chercher(q, 1, true, signal);
    if (communes[0]) return communes[0];
  }
  const tous = await chercher(q, 1, false, signal);
  return tous[0] ?? null;
}
