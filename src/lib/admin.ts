// Administrateur (jalon 3) : Supabase Auth par lien magique ; le rôle vient de app_metadata.role (non modifiable par l'utilisateur).
// Les visiteurs restent en connexion anonyme ; seul l'administrateur voit le bouton ⚙ et l'écran Moteurs.
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import { oublierSession } from "./session";

export const estAdmin = (s: Session | null) => s?.user?.app_metadata?.role === "admin";

export function useAdmin(): { pret: boolean; admin: boolean; email: string | null } {
  const [etat, setEtat] = useState<{ pret: boolean; session: Session | null }>({ pret: false, session: null });
  useEffect(() => {
    let actif = true;
    supabase.auth.getSession().then(({ data }) => actif && setEtat({ pret: true, session: data.session }));
    const { data: abo } = supabase.auth.onAuthStateChange((_ev, session) => {
      oublierSession();
      if (actif) setEtat({ pret: true, session });
    });
    return () => {
      actif = false;
      abo.subscription.unsubscribe();
    };
  }, []);
  return { pret: etat.pret, admin: estAdmin(etat.session), email: etat.session?.user?.email ?? null };
}

/** auth/v1/otp : envoie le lien magique à une adresse DÉJÀ enregistrée (aucun compte n'est créé). */
export async function envoyerLien(email: string): Promise<boolean> {
  const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false, emailRedirectTo: `${location.origin}/moteurs` } });
  return !error;
}

export async function deconnecter(): Promise<void> {
  await supabase.auth.signOut();
  oublierSession();
}
