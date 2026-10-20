// import-vehicules — importe et normalise ADEME Car Labelling dans la table `vehicules`.
// Source : data.ademe.fr, jeu « ademe-car-labelling » (licence ouverte). Protégée par l'en-tête x-sync-secret.
// Énergies retenues : ESSENCE → SP95-E10, GAZOLE → Gazole, hybrides non rechargeables → carburant du moteur thermique,
// SUPERETHANOL → E85, ESS+G.P.L. → GPLc. Exclus : électriques et hybrides rechargeables (pas de consommation WLTP par phase).
import { createClient } from "jsr:@supabase/supabase-js@2";
import { lignesVehicules, type LigneAdeme } from "../_shared/ademe.ts";

const CHAMPS = [
  "Marque", "Modèle", "Description_Commerciale", "Energie", "Poids_à_vide", "Masse_OM_Min", "Puissance_maximale", "Type_de_boite",
  "Conso_basse_vitesse_Min", "Conso_basse_vitesse_Max", "Conso_moyenne_vitesse_Min", "Conso_moyenne_vitesse_Max",
  "Conso_haute_vitesse_Min", "Conso_haute_vitesse_Max", "Conso_T-haute_vitesse_Min", "Conso_T-haute_vitesse_Max",
].join(",");
const URL_ADEME = `https://data.ademe.fr/data-fair/api/v1/datasets/ademe-car-labelling/lines?size=10000&select=${encodeURIComponent(CHAMPS)}`;

Deno.serve(async (req) => {
  const secret = Deno.env.get("SYNC_SECRET");
  if (!secret || req.headers.get("x-sync-secret") !== secret) return new Response("interdit", { status: 403 });

  const r = await fetch(URL_ADEME, { headers: { "User-Agent": "plein-et-trajet/1.0" } });
  if (!r.ok) return Response.json({ erreur: `ADEME HTTP ${r.status}` }, { status: 502 });
  const d = (await r.json()) as { total?: number; results?: LigneAdeme[] };
  if (!Array.isArray(d.results) || d.results.length === 0) return Response.json({ erreur: "réponse ADEME vide ou mal formée" }, { status: 502 });

  const lignes = await lignesVehicules(d.results);
  if (lignes.length < 500) return Response.json({ erreur: `trop peu de véhicules normalisés (${lignes.length})` }, { status: 502 });

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  for (let i = 0; i < lignes.length; i += 500) {
    const { error } = await db.from("vehicules").upsert(lignes.slice(i, i + 500), { onConflict: "id" });
    if (error) return Response.json({ erreur: error.message, lot: i }, { status: 500 });
  }
  // retire les lignes disparues de la source (les trajets/préférences qui y pointaient passent à null)
  const ids = new Set(lignes.map((l) => l.id));
  const { data: existants } = await db.from("vehicules").select("id");
  const obsoletes = (existants ?? []).map((e) => e.id as string).filter((id) => !ids.has(id));
  for (let i = 0; i < obsoletes.length; i += 200) await db.from("vehicules").delete().in("id", obsoletes.slice(i, i + 200));
  return Response.json({ source: d.results.length, importes: lignes.length, supprimes: obsoletes.length });
});
