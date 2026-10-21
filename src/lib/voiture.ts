// Voiture V1 (jalon 5, T5.2) : une version de la base EEA, enregistrée une fois sur le téléphone (pas de compte).
// Copie complète de la ligne `versions_eea` : l'appli marche sans réseau une fois la voiture enregistrée.
import type { VersionEea } from "../../supabase/functions/_shared/eea.ts";
import { libelleVersion } from "../../supabase/functions/_shared/eea.ts";
import type { VehiculeRoule } from "../../supabase/functions/_shared/roule.ts";

export type VoitureV1 = VersionEea;
export const CLE_VOITURE = "pt-voiture-v1";

export function lireVoiture(): VoitureV1 | null {
  try {
    const v = JSON.parse(localStorage.getItem(CLE_VOITURE) || "null") as VoitureV1 | null;
    if (!v || typeof v.cle !== "string" || !v.conso_phases || !(v.masse_kg > 0) || !v.carburant) return null;
    return v;
  } catch {
    return null;
  }
}

export function enregistrerVoiture(v: VoitureV1): void {
  try {
    localStorage.setItem(CLE_VOITURE, JSON.stringify(v));
  } catch {
    /* stockage indisponible : la voiture reste choisie pour cette session */
  }
  window.dispatchEvent(new Event("pt-voiture"));
}

/** « Renault Clio » */
export const nomVoiture = (v: Pick<VoitureV1, "marque" | "modele">) => `${v.marque} ${v.modele}`.trim();
/** « 1.2 · 118 ch · 2017 · SP95-E10 » */
export const detailVoiture = (v: VoitureV1) => [libelleVersion(v), String(v.annee), v.carburant].filter(Boolean).join(" · ");
export const chevaux = (kw: number) => Math.round(kw / 0.7355);

export function vehiculeDe(v: VoitureV1): VehiculeRoule {
  return { masse_kg: v.masse_kg, carburant: v.carburant, conso: v.conso_phases };
}
