// Lectures Supabase de l'écran Prix et de la fiche station.
import { supabase } from "./supabase";
import type { Carburant } from "./format";

export interface Station {
  id: string;
  nom: string | null;
  enseigne: string | null;
  adresse: string | null;
  cp: string | null;
  ville: string | null;
  lat: number;
  lon: number;
  services: string[];
  automate_24_24: boolean;
  distance_km: number;
}

export interface LignePrix {
  station_id: string;
  carburant: Carburant;
  prix: number | null;
  maj: string | null;
  rupture: boolean;
}

/** rpc/stations_autour : stations dans le rayon, avec distance au point demandé. */
export async function stationsAutour(lat: number, lon: number, rayonM: number): Promise<Station[]> {
  const { data, error } = await supabase.rpc("stations_autour", { lat, lon, rayon_m: Math.round(rayonM) });
  if (error) throw new Error(error.message);
  return (data ?? []) as Station[];
}

/** rest/v1/prix : prix d'un carburant pour une liste de stations, ruptures et prix absents exclus. */
export async function prixCarburant(carburant: Carburant, ids: string[]): Promise<LignePrix[]> {
  if (ids.length === 0) return [];
  const { data, error } = await supabase
    .from("prix")
    .select("station_id,carburant,prix,maj,rupture")
    .eq("carburant", carburant)
    .eq("rupture", false)
    .not("prix", "is", null)
    .in("station_id", ids);
  if (error) throw new Error(error.message || "lecture des prix impossible");
  if (!Array.isArray(data)) throw new Error("réponse mal formée");
  return data.map((l) => ({ ...l, prix: l.prix == null ? null : Number(l.prix) })) as LignePrix[];
}

/** rest/v1/prix : tous les carburants d'une station (fiche). */
export async function prixStation(id: string): Promise<LignePrix[]> {
  const { data, error } = await supabase.from("prix").select("station_id,carburant,prix,maj,rupture").eq("station_id", id);
  if (error) throw new Error(error.message || "lecture des prix impossible");
  return (data ?? []).map((l) => ({ ...l, prix: l.prix == null ? null : Number(l.prix) })) as LignePrix[];
}

/** rest/v1/moyennes_nationales : dernière moyenne nationale connue du carburant. */
export async function moyenneNationale(carburant: Carburant): Promise<number | null> {
  const { data, error } = await supabase
    .from("moyennes_nationales")
    .select("jour,carburant,prix_moyen,nb_stations")
    .eq("carburant", carburant)
    .order("jour", { ascending: false })
    .limit(1);
  if (error || !data || data.length === 0) return null;
  return Number(data[0].prix_moyen);
}
