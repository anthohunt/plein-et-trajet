// Noms des lieux d'un trajet (jalon 5, T5.5) : géocodage inverse par la fonction lieux (action « nommer » : IGN en France,
// Photon ailleurs), demandé à l'arrêt, puis réessayé au retour du réseau tant qu'un nom manque.
import { supabase } from "./supabase";
import type { LieuTrajet, TrajetV1 } from "./historique";

export async function nommerLieu(lat: number, lon: number): Promise<string | null> {
  const { data, error } = await supabase.functions.invoke("lieux", { body: { action: "nommer", lat, lon } });
  if (error) throw new Error("lieux indisponible");
  const nom = (data as { nom?: string | null } | null)?.nom;
  return typeof nom === "string" && nom ? nom : null;
}

/** Complète les noms manquants ; renvoie le trajet mis à jour, ou null si rien n'a changé (réseau absent, aucun nom). */
export async function completerNoms(t: TrajetV1): Promise<TrajetV1 | null> {
  if (t.depart.nom && t.arrivee.nom) return null;
  const un = async (l: LieuTrajet): Promise<LieuTrajet> => (l.nom ? l : { ...l, nom: await nommerLieu(l.lat, l.lon).catch(() => null) });
  const [depart, arrivee] = await Promise.all([un(t.depart), un(t.arrivee)]);
  if (depart.nom === t.depart.nom && arrivee.nom === t.arrivee.nom) return null;
  return { ...t, depart, arrivee };
}
