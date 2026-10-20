// Registre des moteurs (jalon 3) : chaque Edge Function lit son fournisseur actif et sa clé à CHAQUE appel
// (table `moteurs` + Supabase Vault) — aucun fournisseur ni clé dans le code, bascule sans redéploiement.
// deno-lint-ignore-file no-explicit-any

export interface Moteur {
  service: string;
  actif: string;
  secours: string | null;
  incident_le?: string | null;
  bascule_le?: string | null;
  retabli_le?: string | null;
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
  const { data, error } = await db.from("moteurs").select("service,actif,secours,incident_le,bascule_le,retabli_le").eq("service", service).maybeSingle();
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
/** Le fournisseur actif a répondu : un incident ou une bascule antérieurs sont marqués résolus (une écriture seulement s'il y en a un d'ouvert). */
export async function noterRetabli(db: any, service: string, m: Moteur): Promise<void> {
  const dernier = [m.incident_le, m.bascule_le].filter(Boolean).map((x) => new Date(x as string).getTime());
  if (dernier.length === 0) return;
  if (m.retabli_le && new Date(m.retabli_le).getTime() >= Math.max(...dernier)) return;
  await db.from("moteurs").update({ retabli_le: new Date().toISOString() }).eq("service", service);
}
/** Quota du jour dépassé chez le fournisseur : plus aucun appel avant la remise à zéro attendue (00:00 UTC suivant).
 *  Si le quota est encore dépassé juste après une remise à zéro attendue (`ancien` échu), on réessaie dans 30 min plutôt que demain. */
export async function noterQuotaFournisseur(db: any, fournisseur: string, ancien: string | null): Promise<string> {
  const maintenant = new Date();
  const minuit = new Date(Date.UTC(maintenant.getUTCFullYear(), maintenant.getUTCMonth(), maintenant.getUTCDate() + 1));
  const jusqua = ancien && maintenant.getTime() - new Date(ancien).getTime() < 3600e3 ? new Date(maintenant.getTime() + 30 * 60e3) : minuit;
  await db.from("fournisseurs").update({ quota_epuise_jusqua: jusqua.toISOString() }).eq("id", fournisseur);
  return jusqua.toISOString();
}
