// estimer-trajet — itinéraire IGN, altimétrie IGN, modèle de consommation par tronçon.
// Entrée  : POST { depart:{lat,lon}, arrivee:{lat,lon}, vehicule_id }   (JWT Supabase exigé : clé anon ou session anonyme)
// Sortie  : 200 { km, duree_min, litres, l100, vehicule:{id,libelle,carburant,masse_kg}, troncons:[…], avertissements:[…] }
//           400 { erreur:"requete_invalide" } · 404 { erreur:"vehicule_inconnu" }
//           422 { erreur:"pas_itineraire" } · 502 { erreur:"itineraire_indisponible" }
// Sources : data.geopf.fr/navigation/itineraire (bdtopo-osrm) et data.geopf.fr/altimetrie (RGE ALTI), sans clé.
import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  decouperTroncons,
  deniveleParEtape,
  echantillonner,
  synthese,
  type Carburant,
  type Etape,
  type PointGeo,
} from "../_shared/modele.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const URL_ITINERAIRE = "https://data.geopf.fr/navigation/itineraire";
const URL_ALTI = "https://data.geopf.fr/altimetrie/1.0/calcul/alti/rest/elevation.json";
const UA = { "User-Agent": "plein-et-trajet/1.0 (+https://plein-et-trajet.vercel.app)" };

function reponse(statut: number, corps: unknown): Response {
  return new Response(JSON.stringify(corps), { status: statut, headers: { ...CORS, "Content-Type": "application/json" } });
}

async function fetchTimeout(url: string, ms: number): Promise<Response> {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), ms);
  try {
    return await fetch(url, { headers: UA, signal: c.signal });
  } finally {
    clearTimeout(t);
  }
}

async function avecReprises(url: string, ms: number, essais = 3): Promise<Response> {
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

const libelleVehicule = (marque: string, modele: string, motorisation: string) =>
  motorisation.toLowerCase().includes(modele.toLowerCase()) ? `${marque} ${motorisation}` : `${marque} ${modele} ${motorisation}`;

const nombre = (x: unknown) => typeof x === "number" && Number.isFinite(x);
const pointValide = (p: unknown): p is { lat: number; lon: number } =>
  !!p && nombre((p as PointGeo).lat) && nombre((p as PointGeo).lon) && Math.abs((p as PointGeo).lat) <= 90 && Math.abs((p as PointGeo).lon) <= 180;

interface EtapeIgn {
  geometry?: { coordinates?: number[][] };
  attributes?: { name?: { cpx_numero?: string } };
  distance?: number;
  duration?: number;
  instruction?: { type?: string };
}

/** Altitudes IGN (RGE ALTI) des échantillons, par lots ; null quand la donnée manque. */
async function altitudes(pts: PointGeo[]): Promise<(number | null)[]> {
  const LOT = 100;
  const out: (number | null)[] = new Array(pts.length).fill(null);
  const lots: number[] = [];
  for (let i = 0; i < pts.length; i += LOT) lots.push(i);
  let suivant = 0;
  const worker = async () => {
    while (suivant < lots.length) {
      const debut = lots[suivant++];
      const part = pts.slice(debut, debut + LOT);
      const url = `${URL_ALTI}?lon=${part.map((p) => p.lon.toFixed(6)).join("|")}&lat=${part.map((p) => p.lat.toFixed(6)).join("|")}&resource=ign_rge_alti_wld&zonly=true`;
      const r = await avecReprises(url, 20000);
      if (!r.ok) throw new Error(`altimetrie HTTP ${r.status}`);
      const d = (await r.json()) as { elevations?: number[] };
      if (!Array.isArray(d.elevations) || d.elevations.length !== part.length) throw new Error("altimetrie: réponse mal formée");
      d.elevations.forEach((z, k) => {
        out[debut + k] = nombre(z) && z > -1000 ? z : null; // -99999 = pas de donnée
      });
    }
  };
  await Promise.all([worker(), worker(), worker()]);
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return reponse(405, { erreur: "methode_non_autorisee" });

  let corps: { depart?: unknown; arrivee?: unknown; vehicule_id?: unknown };
  try {
    corps = await req.json();
  } catch {
    return reponse(400, { erreur: "requete_invalide" });
  }
  const { depart, arrivee, vehicule_id } = corps;
  if (!pointValide(depart) || !pointValide(arrivee) || typeof vehicule_id !== "string" || vehicule_id.length === 0) {
    return reponse(400, { erreur: "requete_invalide" });
  }

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const { data: veh, error: errVeh } = await db
    .from("vehicules")
    .select("id,marque,modele,motorisation,carburant,masse_kg,conso_basse,conso_moyenne,conso_haute,conso_tres_haute")
    .eq("id", vehicule_id)
    .maybeSingle();
  if (errVeh) return reponse(500, { erreur: "base_indisponible" });
  if (!veh) return reponse(404, { erreur: "vehicule_inconnu" });

  // 1) itinéraire
  const urlIt =
    `${URL_ITINERAIRE}?resource=bdtopo-osrm&start=${depart.lon},${depart.lat}&end=${arrivee.lon},${arrivee.lat}` +
    `&profile=car&optimization=fastest&getSteps=true&geometryFormat=geojson&crs=EPSG:4326`;
  let ign: { distance?: number; duration?: number; portions?: { steps?: EtapeIgn[] }[] };
  try {
    const r = await avecReprises(urlIt, 30000);
    if (r.status === 404 || r.status === 400) return reponse(422, { erreur: "pas_itineraire" });
    if (!r.ok) return reponse(502, { erreur: "itineraire_indisponible" });
    ign = await r.json();
  } catch {
    return reponse(502, { erreur: "itineraire_indisponible" });
  }
  const steps = (ign.portions ?? []).flatMap((p) => p.steps ?? []).filter((s) => nombre(s.distance) && (s.geometry?.coordinates?.length ?? 0) >= 1);
  if (steps.length === 0 || !nombre(ign.distance) || ign.distance <= 0) return reponse(422, { erreur: "pas_itineraire" });

  // 2) altimétrie tous les 500 m (si elle échoue : trajet calculé sans dénivelé, signalé)
  const avertissements: string[] = [];
  const geom = steps.map((s) => (s.geometry!.coordinates as number[][]).map(([lon, lat]) => ({ lon, lat })));
  const ech = echantillonner(geom, 500);
  let denivs = new Array<number>(steps.length).fill(0);
  try {
    const alt = await altitudes(ech);
    denivs = deniveleParEtape(ech, alt, steps.length);
  } catch {
    avertissements.push("altimetrie_indisponible");
  }

  // 3) tronçons et consommation
  const etapes: Etape[] = steps.map((s, i) => ({
    distance_m: s.distance as number,
    duree_s: nombre(s.duration) ? (s.duration as number) : 0,
    numero: s.attributes?.name?.cpx_numero ?? "",
    manoeuvre: s.instruction?.type ?? "",
    denivele_m: denivs[i] ?? 0,
  }));
  const troncons = decouperTroncons(etapes, {
    masse_kg: veh.masse_kg,
    carburant: veh.carburant as Carburant,
    conso: { basse: Number(veh.conso_basse), moyenne: Number(veh.conso_moyenne), haute: Number(veh.conso_haute), tres_haute: Number(veh.conso_tres_haute) },
  });
  const s = synthese(troncons);
  return reponse(200, {
    km: s.km,
    duree_min: s.duree_min,
    litres: s.litres,
    l100: s.l100,
    vehicule: { id: veh.id, libelle: libelleVehicule(veh.marque, veh.modele, veh.motorisation), carburant: veh.carburant, masse_kg: veh.masse_kg },
    troncons,
    avertissements,
  });
});
