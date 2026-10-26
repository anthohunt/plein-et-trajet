// « Utiliser ce prix » (jalon 5, T5.7) : le prix d'une station devient celui du trajet en cours, sinon du prochain trajet démarré.
import type { Carburant } from "./format";

const CLE = "pt-prix-choisi";
export interface PrixChoisi {
  prix: number;
  carburant: Carburant;
  station: string;
}
export function lirePrixChoisi(): PrixChoisi | null {
  try {
    const p = JSON.parse(localStorage.getItem(CLE) || "null") as PrixChoisi | null;
    return p && p.prix > 0 ? p : null;
  } catch {
    return null;
  }
}
export function garderPrixChoisi(p: PrixChoisi | null): void {
  try {
    if (p) localStorage.setItem(CLE, JSON.stringify(p));
    else localStorage.removeItem(CLE);
  } catch {
    /* stockage indisponible */
  }
}
