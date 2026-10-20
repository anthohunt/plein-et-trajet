// Registre des moteurs (jalon 3) : chaque Edge Function lit son fournisseur actif et sa clé à CHAQUE appel
// (table `moteurs` + Supabase Vault) — aucun fournisseur ni clé dans le code, bascule sans redéploiement.
// deno-lint-ignore-file no-explicit-any

export interface Moteur {
  service: string;
  actif: string;
  secours: string | null;
}
export interface Essai<T> {
  fournisseur: string;
  appel: () => Promise<T>;
}
export interface Echec {
  fournisseur: string;
  message: string;
}
export interface SortieChaine<T> {
  resultat: T | null;
  fournisseur: string | null; // celui qui a répondu
  bascule: boolean; // le secours a répondu après l'échec de l'actif
  echecs: Echec[];
}

/** Essaie les fournisseurs dans l'ordre (actif puis secours) ; le premier qui répond gagne. Pur : testé sans réseau. */
export async function executerChaine<T>(essais: Essai<T>[]): Promise<SortieChaine<T>> {
  const echecs: Echec[] = [];
  for (let i = 0; i < essais.length; i++) {
    try {
      const resultat = await essais[i].appel();
      return { resultat, fournisseur: essais[i].fournisseur, bascule: i > 0, echecs };
    } catch (e) {
      echecs.push({ fournisseur: essais[i].fournisseur, message: e instanceof Error ? e.message : String(e) });
    }
  }
  return { resultat: null, fournisseur: null, bascule: false, echecs };
}

export async function lireMoteur(db: any, service: string): Promise<Moteur> {
  const { data, error } = await db.from("moteurs").select("service,actif,secours").eq("service", service).maybeSingle();
  if (error || !data) throw new Error(`moteur ${service} illisible`);
  return data as Moteur;
}

/** Clé d'un fournisseur (déchiffrée côté serveur par Vault) ; null si aucune n'est enregistrée. */
export async function lireCle(db: any, fournisseur: string): Promise<string | null> {
  const { data, error } = await db.rpc("moteur_cle", { p_fournisseur: fournisseur });
  if (error) throw new Error(`clé ${fournisseur} illisible`);
  return typeof data === "string" && data.length > 0 ? data : null;
}

export async function noterIncident(db: any, service: string, message: string): Promise<void> {
  await db.from("moteurs").update({ incident_le: new Date().toISOString(), incident_message: message }).eq("service", service);
}
export async function noterBascule(db: any, service: string, de: string, vers: string): Promise<void> {
  await db.from("moteurs").update({ bascule_le: new Date().toISOString(), bascule_de: de, bascule_vers: vers }).eq("service", service);
}
