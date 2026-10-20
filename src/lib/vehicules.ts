// Voitures (table `vehicules`, importée d'ADEME Car Labelling) et préférence mémorisée (table `preferences`).
import { supabase } from "./supabase";
import { sessionAnonyme } from "./session";
import type { Carburant } from "./format";

export interface Vehicule {
  id: string;
  marque: string;
  modele: string;
  motorisation: string;
  carburant: Carburant;
  masse_kg: number;
  puissance_kw: number;
}
const COLONNES = "id,marque,modele,motorisation,carburant,masse_kg,puissance_kw";

/** rpc/vehicules_marques */
export async function marques(): Promise<string[]> {
  const { data, error } = await supabase.rpc("vehicules_marques");
  if (error) throw new Error(error.message);
  return ((data ?? []) as { marque: string }[]).map((r) => r.marque);
}

/** rpc/vehicules_modeles(p_marque) */
export async function modeles(marque: string): Promise<string[]> {
  const { data, error } = await supabase.rpc("vehicules_modeles", { p_marque: marque });
  if (error) throw new Error(error.message);
  return ((data ?? []) as { modele: string }[]).map((r) => r.modele);
}

/** rest/v1/vehicules : toutes les motorisations d'un modèle. */
export async function motorisations(marque: string, modele: string): Promise<Vehicule[]> {
  const { data, error } = await supabase.from("vehicules").select(COLONNES).eq("marque", marque).eq("modele", modele).order("puissance_kw");
  if (error) throw new Error(error.message);
  return (data ?? []).map(normaliser);
}

export async function vehiculeParId(id: string): Promise<Vehicule | null> {
  const { data, error } = await supabase.from("vehicules").select(COLONNES).eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? normaliser(data) : null;
}

function normaliser(v: Record<string, unknown>): Vehicule {
  return { ...(v as unknown as Vehicule), masse_kg: Number(v.masse_kg), puissance_kw: Number(v.puissance_kw) };
}

export interface Preference {
  marque: string | null;
  modele: string | null;
  vehicule_id: string | null;
  carburant: Carburant | null;
}

/** rest/v1/preferences : la ligne de l'utilisateur anonyme (RLS user_id = auth.uid()). */
export async function lirePreference(): Promise<Preference | null> {
  await sessionAnonyme();
  const { data, error } = await supabase.from("preferences").select("marque,modele,vehicule_id,carburant").maybeSingle();
  if (error) throw new Error(error.message);
  return (data as Preference | null) ?? null;
}

/** rest/v1/preferences (upsert sur user_id) : mémorise la voiture, complète ou non. */
export async function memoriserPreference(p: Preference): Promise<void> {
  const userId = await sessionAnonyme();
  const { error } = await supabase.from("preferences").upsert({ user_id: userId, ...p, maj: new Date().toISOString() }, { onConflict: "user_id" });
  if (error) throw new Error(error.message);
}
