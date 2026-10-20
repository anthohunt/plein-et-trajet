// sync-stations-pays — prix station par station hors de France, depuis les flux officiels sans clé.
// Espagne : MITECO (ministère de la Transition écologique), REST « EstacionesTerrestres » — réutilisation libre avec citation de la source.
// Planifiée par pg_cron ; protégée par l'en-tête x-sync-secret. Paramètre ?pays=ES (défaut).
import { createClient } from "jsr:@supabase/supabase-js@2";
import { fetchTimeout, json } from "../_shared/http.ts";
import { dateEspagne, normaliserEspagne } from "../_shared/stations-es.ts";

const RELAIS_ES = "https://plein-et-trajet.vercel.app/api/relais-es"; // relaie https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/
const LOT = 1000;

Deno.serve(async (req) => {
  const secret = Deno.env.get("SYNC_SECRET");
  if (!secret || req.headers.get("x-sync-secret") !== secret) return json(401, { erreur: "non autorisé" });
  const pays = new URL(req.url).searchParams.get("pays") ?? "ES";
  if (pays !== "ES") return json(400, { erreur: "pays non géré" });
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const t0 = new Date();
  try {
    // le ministère n'accepte que TLS 1.2 à échange RSA statique (impossible en Deno) : flux lu via le relais Node de l'appli
    let r: Response | null = null;
    let cause = "";
    for (let i = 1; i <= 3 && !r?.ok; i++) {
      r = await fetchTimeout(RELAIS_ES, {}, 70000).catch((e) => {
        cause = String(e);
        return null;
      });
      if (!r?.ok && i < 3) await new Promise((x) => setTimeout(x, 2000 * i));
    }
    if (!r?.ok) throw new Error(`relais MITECO HTTP ${r?.status ?? "réseau"} ${cause}`);
    let j;
    try {
      j = JSON.parse((await r.text()).replace(/^﻿/, ""));
    } catch (e) {
      throw new Error(`réponse mal formée: ${e}`);
    }
    if (j?.ResultadoConsulta !== "OK" || !Array.isArray(j?.ListaEESSPrecio) || j.ListaEESSPrecio.length === 0) throw new Error("réponse vide du flux officiel : base laissée telle quelle");
    const stations = normaliserEspagne(j.ListaEESSPrecio, dateEspagne(j.Fecha));
    if (stations.length < 1000) throw new Error(`flux anormalement court (${stations.length})`);
    let n = 0;
    for (let i = 0; i < stations.length; i += LOT) {
      const { data, error } = await db.rpc("sync_stations_pays", { p_pays: pays, p_lot: stations.slice(i, i + LOT) });
      if (error) throw new Error(`lot ${i}: ${error.message}`);
      n += Number(data ?? 0);
    }
    const { data: supprimees } = await db.rpc("sync_stations_pays_nettoyer", { p_pays: pays, p_avant: t0.toISOString() });
    const rapport = { ok: true, pays, stations: n, supprimees, duree_ms: Date.now() - t0.getTime() };
    console.log(JSON.stringify({ sync_pays: "ok", ...rapport }));
    return json(200, rapport);
  } catch (e) {
    console.error(JSON.stringify({ sync_pays: "erreur", message: String(e) }));
    return json(502, { ok: false, erreur: String(e) });
  }
});
