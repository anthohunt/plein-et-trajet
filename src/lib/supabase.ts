import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string;
const cle = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

// La session anonyme (historique, voiture mémorisée) est conservée dans le navigateur : sans elle, chaque
// rechargement créerait un nouvel identifiant et l'historique ne « survivrait » pas au rechargement.
export const supabase = createClient(url, cle, { auth: { persistSession: true, autoRefreshToken: true, storageKey: "pt-auth" } });
