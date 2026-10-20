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
