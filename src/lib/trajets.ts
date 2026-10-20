// Calcul d'un trajet (edge function estimer-trajet) et historique (table `trajets`).
import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import { sessionAnonyme } from "./session";
import type { Carburant } from "./format";
import type { Lieu } from "./position";

export type TypeTroncon = "autoroute" | "route" | "ville" | "montee";
export interface Troncon {
  type: TypeTroncon;
  voies: string[];
  km: number;
  duree_min: number;
  vitesse_kmh: number;
  arrets: number;
  denivele_m: number;
  litres: number;
  l100: number;
}
export interface Estimation {
  km: number;
  duree_min: number;
  litres: number;
  l100: number;
  vehicule: { id: string; libelle: string; carburant: Carburant; masse_kg: number };
  troncons: Troncon[];
  avertissements: string[];
}

export type CodeErreur = "pas_itineraire" | "indisponible" | "annule";
export class ErreurCalcul extends Error {
  constructor(public code: CodeErreur) {
    super(code);
  }
}

/** functions/v1/estimer-trajet — corps {depart:{lat,lon}, arrivee:{lat,lon}, vehicule_id} ; 422 {erreur:"pas_itineraire"} si aucune route. */
export async function estimerTrajet(depart: Lieu, arrivee: Lieu, vehiculeId: string, signal?: AbortSignal): Promise<Estimation> {
  const { data, error } = await supabase.functions.invoke("estimer-trajet", {
    body: { depart: { lat: depart.lat, lon: depart.lon }, arrivee: { lat: arrivee.lat, lon: arrivee.lon }, vehicule_id: vehiculeId },
    signal,
  });
  if (signal?.aborted) throw new ErreurCalcul("annule");
  if (error) {
    if (error instanceof FunctionsHttpError) {
      const corps = await error.context.json().catch(() => null);
      if (corps?.erreur === "pas_itineraire") throw new ErreurCalcul("pas_itineraire");
    }
    throw new ErreurCalcul("indisponible");
  }
  const e = data as Estimation | null;
  if (!e || !Number.isFinite(e.km) || !Number.isFinite(e.litres) || !Array.isArray(e.troncons) || !e.vehicule) throw new ErreurCalcul("indisponible");
  return e;
}

export interface TrajetEnregistre {
  id: string;
  depart_label: string;
  depart_lat: number;
  depart_lon: number;
  arrivee_label: string;
  arrivee_lat: number;
  arrivee_lon: number;
  vehicule_id: string | null;
  vehicule_label: string | null;
  carburant: Carburant | null;
  km: number;
  litres: number;
  prix_litre: number | null;
  cout: number | null;
  troncons: Troncon[];
  cree_le: string;
}

function normaliser(t: Record<string, unknown>): TrajetEnregistre {
  const n = (x: unknown) => (x == null ? null : Number(x));
  return { ...(t as unknown as TrajetEnregistre), km: Number(t.km), litres: Number(t.litres), prix_litre: n(t.prix_litre), cout: n(t.cout) };
}

/** rest/v1/trajets : historique de l'utilisateur anonyme (RLS), le plus récent en tête. */
export async function listerTrajets(): Promise<TrajetEnregistre[]> {
  await sessionAnonyme();
  const { data, error } = await supabase.from("trajets").select("*").order("cree_le", { ascending: false }).limit(30);
  if (error) throw new Error(error.message);
  return (data ?? []).map(normaliser);
}

export interface EntreeTrajet {
  depart: Lieu;
  arrivee: Lieu;
  estimation: Estimation;
  prixLitre: number | null;
  cout: number | null;
}

/** Ajoute le trajet en tête de l'historique ; un même trajet (mêmes lieux, même voiture) est remonté, pas dupliqué. */
export async function enregistrerTrajet(e: EntreeTrajet): Promise<TrajetEnregistre> {
  const userId = await sessionAnonyme();
  const ligne = {
    depart_label: e.depart.label,
    depart_lat: e.depart.lat,
    depart_lon: e.depart.lon,
    arrivee_label: e.arrivee.label,
    arrivee_lat: e.arrivee.lat,
    arrivee_lon: e.arrivee.lon,
    vehicule_id: e.estimation.vehicule.id,
    vehicule_label: e.estimation.vehicule.libelle,
    carburant: e.estimation.vehicule.carburant,
    km: e.estimation.km,
    litres: e.estimation.litres,
    prix_litre: e.prixLitre,
    cout: e.cout,
    troncons: e.estimation.troncons,
    cree_le: new Date().toISOString(),
  };
  const { data: existant, error: errLecture } = await supabase
    .from("trajets")
    .select("id")
    .eq("depart_label", ligne.depart_label)
    .eq("arrivee_label", ligne.arrivee_label)
    .eq("vehicule_id", ligne.vehicule_id)
    .limit(1)
    .maybeSingle();
  if (errLecture) throw new Error(errLecture.message);
  const requete = existant
    ? supabase.from("trajets").update(ligne).eq("id", existant.id).select("*").single()
    : supabase.from("trajets").insert({ user_id: userId, ...ligne }).select("*").single();
  const { data, error } = await requete;
  if (error || !data) throw new Error(error?.message ?? "enregistrement impossible");
  return normaliser(data);
}

/** rest/v1/trajets (delete) — la ligne ne revient pas au rechargement. */
export async function supprimerTrajet(id: string): Promise<void> {
  const { error, count } = await supabase.from("trajets").delete({ count: "exact" }).eq("id", id);
  if (error) throw new Error(error.message);
  if (count === 0) throw new Error("trajet introuvable");
}
