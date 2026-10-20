// Écran Moteurs : functions/v1/moteurs (administrateur seulement). Aucune clé complète ne transite jamais vers le navigateur.
import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "./supabase";

export type EtatMoteur = "ok" | "ko" | "wait";
export interface FournisseurMoteur {
  id: string;
  nom: string;
  cle_requise: boolean;
  cle_fin: string | null; // 4 derniers caractères de la clé rangée dans Vault
}
export interface Moteur {
  service: string;
  nom: string;
  description: string;
  actif: string;
  secours: string | null;
  etat: EtatMoteur;
  message: string;
  bascule: { le: string; de: string; vers: string } | null;
  incident: { le: string; message: string } | null;
  fournisseurs: FournisseurMoteur[];
}

async function appeler<T>(corps: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("moteurs", { body: corps });
  if (error) {
    if (error instanceof FunctionsHttpError) throw new Error(String((await error.context.json().catch(() => null))?.erreur ?? "erreur"));
    throw new Error("injoignable");
  }
  return data as T;
}

export async function listerMoteurs(): Promise<Moteur[]> {
  const r = await appeler<{ moteurs: Moteur[] }>({ action: "lister" });
  if (!Array.isArray(r.moteurs)) throw new Error("réponse mal formée");
  return r.moteurs;
}
export const testerMoteur = (service: string, fournisseur: string, cle: string) => appeler<{ etat: EtatMoteur; message: string }>({ action: "tester", service, fournisseur, cle: cle || undefined });
export const enregistrerMoteur = (service: string, fournisseur: string, secours: string | null, cle: string, cleSecours: string) =>
  appeler<{ enregistre: boolean; etat: EtatMoteur; message: string; moteurs: Moteur[] }>({ action: "enregistrer", service, fournisseur, secours, cle: cle || undefined, cle_secours: cleSecours || undefined });
