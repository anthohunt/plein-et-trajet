// Pays traversés (jalon 3) — logique pure, testée par Vitest : coût carburant par pays, prix de repli, somme des coûts.
export interface PaysTraverse {
  code: string;
  nom: string;
  km: number;
  litres: number;
}
export type SourcePrix = "flux" | "bulletin" | "estime" | "ue" | "perso" | "absent";
export interface MoyennePays {
  pays: string;
  prix_moyen: number;
  source: string; // flux | bulletin | estime
  jour: string;
}
export interface LignePays extends PaysTraverse {
  prix: number | null;
  source: SourcePrix;
  cout: number | null;
}

const arrondi2 = (x: number) => Math.round(x * 100) / 100;

/**
 * Coût carburant de chaque pays traversé : litres du pays × prix moyen du jour de ce pays ; un pays absent des moyennes
 * prend la moyenne européenne (« EU ») et le dit ; un prix perso remplace tous les prix. Le coût carburant total est la
 * somme des coûts arrondis des pays : la somme affichée égale toujours le total.
 */
export function repartirCouts(pays: PaysTraverse[], moyennes: Map<string, MoyennePays>, perso: number | null): { lignes: LignePays[]; carburant: number | null } {
  const lignes: LignePays[] = pays.map((p) => {
    let prix: number | null = null;
    let source: SourcePrix = "absent";
    if (perso != null) {
      prix = perso;
      source = "perso";
    } else {
      const m = moyennes.get(p.code);
      const ue = moyennes.get("EU");
      if (m) {
        prix = m.prix_moyen;
        source = m.source === "bulletin" || m.source === "estime" ? m.source : "flux";
      } else if (ue) {
        prix = ue.prix_moyen;
        source = "ue";
      }
    }
    return { ...p, prix, source, cout: prix == null ? null : arrondi2(p.litres * prix) };
  });
  const complet = lignes.every((l) => l.cout != null);
  return { lignes, carburant: complet ? arrondi2(lignes.reduce((s, l) => s + (l.cout as number), 0)) : null };
}

/** Coût total affiché : carburant + péages (les péages indisponibles ne s'ajoutent pas). */
export function coutTotal(carburant: number | null, peages: { etat: string; total: number } | null | undefined): number | null {
  if (carburant == null) return null;
  return arrondi2(carburant + (peages && peages.etat === "ok" ? peages.total : 0));
}

export interface LignePeage {
  pays: string;
  libelle: string; // "" : section sans nom (l'écran affiche T.peageSansNom)
  montant: number;
  fourchette?: boolean; // HERE : montant = maximum de la fourchette (l'écran ajoute T.peageFourchette)
}
export interface Peages {
  etat: "ok" | "indisponible";
  motif?: string;
  fournisseur: string | null;
  jusqua?: string; // motif quota_fournisseur : remise à zéro attendue (ISO)
  cache?: boolean;
  lignes: LignePeage[];
  total: number;
  vignettes: { pays: string; libelle: string }[];
}
