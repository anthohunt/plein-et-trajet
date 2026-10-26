// Enregistrement en roulant (jalon 4, S6) : points gardés sur le téléphone (localStorage), calcul final (fonction trajet-roule),
// ligne d'historique (table `trajets`, RLS par user_id). Le calcul en direct est celui de supabase/functions/_shared/roule.ts.
import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import { sessionAnonyme } from "./session";
import type { Carburant } from "./format";
import type { Estimation, TrajetEnregistre } from "./trajets";
import type { Pause, PointRoule, VehiculeRoule } from "../../supabase/functions/_shared/roule.ts";
export { ajouterPosition, basculerPause } from "../../supabase/functions/_shared/roule.ts";
import type { Vehicule } from "./vehicules";

export type { Pause, PointRoule, VehiculeRoule };
export const CLE_EN_ROUTE = "pt-en-route";

export interface EnregistrementEnCours {
  version: 1;
  vehiculeId: string;
  vehiculeLibelle: string;
  veh: VehiculeRoule;
  debut: number; // ms
  points: PointRoule[];
  pauses: Pause[];
  enPause: boolean;
  segment: number;
  pays: string | null; // pays du départ (prix moyen du jour du coût en direct)
}

export function vehiculeRoule(v: Vehicule): VehiculeRoule | null {
  if (v.conso_basse == null || v.conso_moyenne == null || v.conso_haute == null || v.conso_tres_haute == null) return null;
  return { masse_kg: v.masse_kg, carburant: v.carburant, conso: { basse: v.conso_basse, moyenne: v.conso_moyenne, haute: v.conso_haute, tres_haute: v.conso_tres_haute } };
}

/** Enregistrement gardé sur le téléphone (null s'il n'y en a pas, ou s'il est illisible). */
export function lireEnCours(): EnregistrementEnCours | null {
  try {
    const brut = localStorage.getItem(CLE_EN_ROUTE);
    if (!brut) return null;
    const e = JSON.parse(brut) as EnregistrementEnCours;
    if (e?.version !== 1 || !Array.isArray(e.points) || !e.vehiculeId || !e.veh) return null;
    return e;
  } catch {
    return null;
  }
}
export function garderEnCours(e: EnregistrementEnCours): void {
  try {
    localStorage.setItem(CLE_EN_ROUTE, JSON.stringify(e));
  } catch {
    /* stockage plein ou indisponible : l'enregistrement continue en mémoire */
  }
}
export function oublierEnCours(): void {
  try {
    localStorage.removeItem(CLE_EN_ROUTE);
  } catch {
    /* rien */
  }
}

export interface EstimationRoulee extends Estimation {
  enregistre: {
    depart: { lat: number; lon: number; label: string | null };
    arrivee: { lat: number; lon: number; label: string | null };
    vitesses: number[];
    vitesse_moy: number;
    accelerations: number;
    arrets: number;
    duree_s: number;
    points: number;
    points_envoyes: number;
    points_recales: number;
  };
}

export class ErreurRoule extends Error {
  constructor(public code: "trop_court" | "indisponible") {
    super(code);
  }
}

/** functions/v1/trajet-roule — corps {points:[[t,lat,lon,segment]…], vehicule_id} ; 422 {erreur:"trop_court"|"pas_itineraire"}. */
export async function calculerTrajetRoule(points: PointRoule[], vehiculeId: string): Promise<EstimationRoulee> {
  await sessionAnonyme();
  const { data, error } = await supabase.functions.invoke("trajet-roule", { body: { points, vehicule_id: vehiculeId } });
  if (error) {
    if (error instanceof FunctionsHttpError) {
      const corps = await error.context.json().catch(() => null);
      if (corps?.erreur === "trop_court") throw new ErreurRoule("trop_court");
    }
    throw new ErreurRoule("indisponible");
  }
  const e = data as EstimationRoulee | null;
  if (!e || !Number.isFinite(e.km) || !Array.isArray(e.troncons) || !e.enregistre || !Array.isArray(e.enregistre.vitesses)) throw new ErreurRoule("indisponible");
  return e;
}

/** Ajoute le trajet roulé EN TÊTE de l'historique (toujours une nouvelle ligne : deux trajets roulés ne se confondent pas). */
export async function enregistrerTrajetRoule(e: EstimationRoulee, depart: string, arrivee: string, prixLitre: number | null, cout: number | null): Promise<TrajetEnregistre> {
  const userId = await sessionAnonyme();
  const ligne = {
    user_id: userId,
    depart_label: depart,
    depart_lat: e.enregistre.depart.lat,
    depart_lon: e.enregistre.depart.lon,
    arrivee_label: arrivee,
    arrivee_lat: e.enregistre.arrivee.lat,
    arrivee_lon: e.enregistre.arrivee.lon,
    vehicule_id: e.vehicule.id,
    vehicule_label: e.vehicule.libelle,
    carburant: e.vehicule.carburant as Carburant,
    km: e.km,
    litres: e.litres,
    prix_litre: prixLitre,
    cout,
    troncons: e.troncons,
    cree_le: new Date().toISOString(),
    enregistre: true,
    vitesses: e.enregistre.vitesses,
    vitesse_moy: e.enregistre.vitesse_moy,
    accelerations: e.enregistre.accelerations,
    estimation: e,
  };
  const { data, error } = await supabase.from("trajets").insert(ligne).select("*").single();
  if (error || !data) throw new Error(error?.message ?? "enregistrement impossible");
  return data as TrajetEnregistre;
}

/** Pays d'une position (fonction lieux, action « pays ») : sert au prix moyen du jour du coût en direct. */
export async function paysDePosition(lat: number, lon: number): Promise<string | null> {
  const { data, error } = await supabase.functions.invoke("lieux", { body: { action: "pays", lat, lon } });
  if (error) return null;
  return (data as { pays?: { code?: string } | null })?.pays?.code ?? null;
}
