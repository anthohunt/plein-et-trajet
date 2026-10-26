// Altimétrie partagée : altitudes d'échantillons pris tous les 500 m le long d'un tracé, dénivelé positif = somme des hausses
// d'un échantillon au suivant (méthode du jalon 2, `deniveleParEtape` de modele.ts).
// IGN (RGE ALTI, ressource ign_rge_alti_wld) répond en France et rend -99999 ailleurs ; pour le trajet enregistré en roulant, les
// points sans donnée IGN sont complétés par Open-Meteo (modèle numérique Copernicus GLO-90, sans clé, 100 points par requête).
// Valhalla `weighted_grade` n'est pas une pente : « a measure used for hill avoidance in routing - sort of a relative energy use
// along an edge » (docs/docs/api/map-matching.md du dépôt valhalla/valhalla) — il surestimait la montée (586 m au lieu de ≈ 403 m).
import { UA } from "./http.ts";
import type { PointGeo } from "./modele.ts";

const URL_ALTI = "https://data.geopf.fr/altimetrie/1.0/calcul/alti/rest/elevation.json";
const URL_OPEN_METEO = "https://api.open-meteo.com/v1/elevation";
const nombre = (x: unknown): x is number => typeof x === "number" && Number.isFinite(x);

async function fetchTimeout(url: string, ms: number): Promise<Response> {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), ms);
  try {
    return await fetch(url, { headers: { "User-Agent": UA }, signal: c.signal });
  } finally {
    clearTimeout(t);
  }
}

export async function avecReprises(url: string, ms: number, essais = 3): Promise<Response> {
  let derniere: Response | null = null;
  for (let i = 1; i <= essais; i++) {
    try {
      const r = await fetchTimeout(url, ms);
      if (r.ok || (r.status !== 429 && r.status < 500)) return r;
      derniere = r;
    } catch (e) {
      if (i === essais) throw e;
    }
    await new Promise((res) => setTimeout(res, 600 * i));
  }
  return derniere!;
}

/** Remplit `out` par lots de `lot` points (3 requêtes en parallèle) ; `url` construit la requête, `lire` rend les altitudes du lot. */
async function parLots(pts: PointGeo[], indices: number[], lot: number, url: (part: PointGeo[]) => string, lire: (j: unknown) => unknown[] | undefined, out: (number | null)[], nom: string) {
  const lots: number[] = [];
  for (let i = 0; i < indices.length; i += lot) lots.push(i);
  let suivant = 0;
  const worker = async () => {
    while (suivant < lots.length) {
      const debut = lots[suivant++];
      const ids = indices.slice(debut, debut + lot);
      const r = await avecReprises(url(ids.map((k) => pts[k])), 20000);
      if (!r.ok) throw new Error(`${nom} HTTP ${r.status}`);
      const z = lire(await r.json());
      if (!Array.isArray(z) || z.length !== ids.length) throw new Error(`${nom}: réponse mal formée`);
      z.forEach((v, k) => {
        out[ids[k]] = nombre(v) && v > -1000 ? v : null; // -99999 = pas de donnée
      });
    }
  };
  await Promise.all([worker(), worker(), worker()]);
}

/** Altitudes IGN (RGE ALTI) des échantillons, par lots ; null quand la donnée manque (hors de France). */
export async function altitudesIgn(pts: PointGeo[]): Promise<(number | null)[]> {
  const out: (number | null)[] = new Array(pts.length).fill(null);
  await parLots(
    pts,
    pts.map((_, i) => i),
    100,
    (part) => `${URL_ALTI}?lon=${part.map((p) => p.lon.toFixed(6)).join("|")}&lat=${part.map((p) => p.lat.toFixed(6)).join("|")}&resource=ign_rge_alti_wld&zonly=true`,
    (j) => (j as { elevations?: unknown[] }).elevations,
    out,
    "altimetrie",
  );
  return out;
}

/** IGN d'abord ; les points sans donnée IGN (Royaume-Uni, Espagne…) sont complétés par Open-Meteo (Copernicus GLO-90). */
export async function altitudesCompletees(pts: PointGeo[]): Promise<(number | null)[]> {
  let out: (number | null)[];
  try {
    out = await altitudesIgn(pts);
  } catch {
    out = new Array(pts.length).fill(null);
  }
  const manquants = out.map((z, i) => (z == null ? i : -1)).filter((i) => i >= 0);
  if (manquants.length > 0) {
    await parLots(
      pts,
      manquants,
      100,
      (part) => `${URL_OPEN_METEO}?latitude=${part.map((p) => p.lat.toFixed(5)).join(",")}&longitude=${part.map((p) => p.lon.toFixed(5)).join(",")}`,
      (j) => (j as { elevation?: unknown[] }).elevation,
      out,
      "open-meteo",
    );
  }
  return out;
}
