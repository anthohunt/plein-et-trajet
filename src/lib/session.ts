// Connexion anonyme Supabase (aucun compte) : un identifiant par appareil, protégé par RLS (user_id = auth.uid()).
import { supabase } from "./supabase";

let enCours: Promise<string> | null = null;

/** Identifiant de l'utilisateur anonyme ; crée la session au premier appel. */
export function sessionAnonyme(): Promise<string> {
  if (!enCours) {
    enCours = (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session?.user) return data.session.user.id;
      const { data: d, error } = await supabase.auth.signInAnonymously();
      if (error || !d.user) throw new Error(error?.message ?? "connexion anonyme impossible");
      return d.user.id;
    })().catch((e) => {
      enCours = null; // permet de réessayer
      throw e;
    });
  }
  return enCours;
}
