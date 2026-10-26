// Écran Moteurs : functions/v1/moteurs (administrateur seulement). Aucune clé complète ne transite jamais vers le navigateur.
import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "./supabase";

export type EtatMoteur = "ok" | "ko" | "wait";
/** État renvoyé par la fonction `moteurs` : un code et ses paramètres (la phrase est composée par T.etatMoteur, src/lib/textes.ts). */
export type ParamsEtat = Record<string, string | number>;
export interface CodeEtat {
  code: string;
  params?: ParamsEtat;
}
export interface FournisseurMoteur {
  id: string;
  nom: string;
  cle_requise: boolean;
  cle_fin: string | null; // 4 derniers caractères de la clé rangée dans Vault
  url_cle: string | null; // page du fournisseur où trouver sa clé (table fournisseurs) ; absente sans clé
  consigne_cle: string | null; // consigne du menu, lue en table
}
export interface Moteur {
  service: string;
  nom: string;
  description: string;
  actif: string;
  secours: string | null;
  etat: EtatMoteur;
  code: string;
  params: ParamsEtat;
  bascule: { le: string; de: string; vers: string; resolu?: boolean } | null; // resolu : le fournisseur actif a répondu depuis
  incident: { le: string; message: string; resolu?: boolean } | null;
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
export const testerMoteur = (service: string, fournisseur: string, cle: string) => appeler<{ etat: EtatMoteur } & CodeEtat>({ action: "tester", service, fournisseur, cle: cle || undefined });
export const enregistrerMoteur = (service: string, fournisseur: string, secours: string | null, cle: string, cleSecours: string) =>
  appeler<{ enregistre: boolean; etat: EtatMoteur; notes: CodeEtat[]; moteurs: Moteur[] } & CodeEtat>({ action: "enregistrer", service, fournisseur, secours, cle: cle || undefined, cle_secours: cleSecours || undefined });
