// Lectures Supabase de l'écran Prix et de la fiche station.
import { supabase } from "./supabase";
import type { Carburant } from "./format";
import type { MoyennePays } from "./pays";

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
  pays?: string;
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

/** rpc/moyennes_par_pays : dernière moyenne connue de chaque pays pour un carburant (France = flux du jour, autres = Bulletin pétrolier UE). */
export async function moyennesParPays(carburant: Carburant): Promise<Map<string, MoyennePays>> {
  const { data, error } = await supabase.rpc("moyennes_par_pays", { p_carburant: carburant });
  if (error || !Array.isArray(data)) throw new Error(error?.message ?? "réponse mal formée");
  return new Map((data as MoyennePays[]).map((m) => [m.pays, { ...m, prix_moyen: Number(m.prix_moyen) }]));
}

export interface PaysInfo {
  code: string;
  nom: string;
  flux_stations: boolean;
  statut_flux: "branche" | "non_branche" | "aucun";
}
let cachePays: Promise<Map<string, PaysInfo>> | null = null;
/** rest/v1/pays (lecture publique) : nom et statut du flux station par station de chaque pays, lus une fois. */
export function tousPays(): Promise<Map<string, PaysInfo>> {
  if (!cachePays) {
    cachePays = (async () => {
      const { data, error } = await supabase.from("pays").select("code,nom,flux_stations,statut_flux");
      if (error || !Array.isArray(data)) throw new Error(error?.message ?? "réponse mal formée");
      return new Map((data as PaysInfo[]).map((p) => [p.code, p]));
    })().catch((e) => {
      cachePays = null;
      throw e;
    });
  }
  return cachePays;
}
export async function infoPays(code: string): Promise<PaysInfo | null> {
  return (await tousPays().catch(() => new Map<string, PaysInfo>())).get(code) ?? null;
}

/** functions/v1/lieux {action:"pays"} : pays d'une position (la France est reconnue sans appel réseau externe). */
export async function paysDePosition(lat: number, lon: number): Promise<{ code: string; nom: string } | null> {
  const { data, error } = await supabase.functions.invoke("lieux", { body: { action: "pays", lat, lon } });
  if (error) return null;
  return (data as { pays: { code: string; nom: string } | null } | null)?.pays ?? null;
}
