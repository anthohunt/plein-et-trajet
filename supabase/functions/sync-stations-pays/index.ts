// sync-stations-pays — prix station par station hors de France, depuis les flux officiels sans clé.
// ?pays=ES|IT|PT|SI|HR|AT|DK|IS (défaut ES). Planifiée par pg_cron ; protégée par l'en-tête x-sync-secret.
// Espagne : le serveur du ministère n'accepte que TLS 1.2 à échange RSA statique (refusé par Deno) → lu via le relais Node de l'appli.
import { createClient } from "jsr:@supabase/supabase-js@2";
import { fetchTimeout, json } from "../_shared/http.ts";
import { dateEspagne, normaliserEspagne } from "../_shared/stations-es.ts";
import {
  AT_CARBURANTS, AT_POINTS, IT_POINTS, PT_CARBURANTS, normaliserAutriche, normaliserCroatie, normaliserDanemark, normaliserIslande, normaliserItalie, normaliserPortugal,
  normaliserSlovenie, type Station,
} from "../_shared/stations-pays.ts";

const RELAIS_ES = "https://plein-et-trajet.vercel.app/api/relais-es"; // relaie https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/
const LOT = 1000;
const NAVIGATEUR = { "User-Agent": "Mozilla/5.0 (compatible; plein-et-trajet/1.0; +https://plein-et-trajet.vercel.app)", Accept: "application/json" };

async function lire(url: string, init: RequestInit = {}, ms = 60000, essais = 3): Promise<unknown> {
  let cause = "";
  for (let i = 1; i <= essais; i++) {
    try {
      const r = await fetchTimeout(url, { ...init, headers: { ...NAVIGATEUR, ...(init.headers ?? {}) } }, ms);
      if (r.ok) return JSON.parse((await r.text()).replace(/^﻿/, ""));
      cause = `HTTP ${r.status}`;
      if (r.status !== 429 && r.status < 500) break;
    } catch (e) {
      cause = String(e).slice(0, 160);
    }
    await new Promise((x) => setTimeout(x, 1500 * i));
  }
  throw new Error(`${url.split("?")[0]} : ${cause}`);
}
async function parLots<T, R>(items: T[], n: number, f: (x: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let k = 0;
  await Promise.all(Array.from({ length: n }, async () => {
    while (k < items.length) {
      const i = k++;
      out[i] = await f(items[i]);
    }
  }));
  return out;
}
/** Cours du jour (BCE via Frankfurter) pour les monnaies non euro. */
async function cours(monnaie: "DKK" | "ISK"): Promise<number> {
  const j = (await lire(`https://api.frankfurter.dev/v1/latest?base=EUR&symbols=${monnaie}`, {}, 15000)) as { rates?: Record<string, number> };
  const c = j.rates?.[monnaie];
  if (!c || !(c > 1)) throw new Error(`cours ${monnaie} indisponible`);
  return c;
}

// deno-lint-ignore no-explicit-any
type Source = () => Promise<Station[]>;
const SOURCES: Record<string, Source> = {
  ES: async () => {
    // deno-lint-ignore no-explicit-any
    const j = (await lire(RELAIS_ES, {}, 70000)) as any;
    if (j?.ResultadoConsulta !== "OK" || !Array.isArray(j?.ListaEESSPrecio) || j.ListaEESSPrecio.length === 0) throw new Error("réponse vide du flux officiel : base laissée telle quelle");
    return normaliserEspagne(j.ListaEESSPrecio, dateEspagne(j.Fecha));
  },
  IT: async () => {
    const reps = await parLots(IT_POINTS, 4, async (p) => {
      // deno-lint-ignore no-explicit-any
      const j = (await lire("https://carburanti.mise.gov.it/ospzApi/search/zone", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ points: [{ lat: p.lat, lng: p.lon }], fuelType: "1-x", priceOrder: "asc", radius: 30 }) }, 40000)) as any;
      return Array.isArray(j?.results) ? j.results : [];
    });
    return normaliserItalie(reps);
  },
  PT: async () => {
    const parCarburant = await parLots(PT_CARBURANTS, 2, async ([id, carburant]) => {
      // deno-lint-ignore no-explicit-any
      const j = (await lire(`https://precoscombustiveis.dgeg.gov.pt/api/PrecoComb/PesquisarPostos?idsTiposComb=${id}&idMarca=&idTipoPosto=&idDistrito=&idsMunicipios=&qtdPorPagina=5000&pagina=1`, {}, 60000)) as any;
      return { carburant, lignes: Array.isArray(j?.resultado) ? j.resultado : [] };
    });
    return normaliserPortugal(parCarburant);
  },
  SI: async () => {
    // deno-lint-ignore no-explicit-any
    const tout: any[] = [];
    let url: string | null = "https://goriva.si/api/v1/search/?position=46.15,14.99&radius=200000";
    for (let page = 0; url && page < 60; page++) {
      // deno-lint-ignore no-explicit-any
      const j = (await lire(url, {}, 30000)) as any;
      tout.push(...(j.results ?? []));
      url = j.next ?? null;
    }
    return normaliserSlovenie(tout);
  },
  HR: async () => normaliserCroatie(await lire("https://mzoe-gor.hr/data.json", {}, 60000)),
  AT: async () => {
    const taches = AT_POINTS.flatMap((p) => AT_CARBURANTS.map(([type, carburant]) => ({ p, type, carburant })));
    const reps = await parLots(taches, 4, async ({ p, type, carburant }) => ({
      carburant,
      stations: (await lire(`https://api.e-control.at/sprit/1.0/search/gas-stations/by-address?latitude=${p.lat}&longitude=${p.lon}&fuelType=${type}&includeClosed=false`, {}, 30000).catch(() => [])) as unknown[],
    }));
    return normaliserAutriche(reps);
  },
  DK: async () => normaliserDanemark(await lire("https://mobility-prices.ok.dk/api/v1/fuel-prices", {}, 60000), await cours("DKK")),
  IS: async () => normaliserIslande(await lire("https://raw.githubusercontent.com/gasvaktin/gasvaktin/master/vaktin/gas.min.json", {}, 30000), await cours("ISK")),
};

Deno.serve(async (req) => {
  const secret = Deno.env.get("SYNC_SECRET");
  if (!secret || req.headers.get("x-sync-secret") !== secret) return json(401, { erreur: "non autorisé" });
  const pays = (new URL(req.url).searchParams.get("pays") ?? "ES").toUpperCase();
  const source = SOURCES[pays];
  if (!source) return json(400, { erreur: "pays non géré", gérés: Object.keys(SOURCES) });
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const t0 = new Date();
  try {
    const stations = await source();
    if (stations.length < (pays === "IS" ? 50 : pays === "AT" ? 20 : 150)) throw new Error(`flux anormalement court (${stations.length}) : base laissée telle quelle`);
    let n = 0;
    for (let i = 0; i < stations.length; i += LOT) {
      const { data, error } = await db.rpc("sync_stations_pays", { p_pays: pays, p_lot: stations.slice(i, i + LOT) });
      if (error) throw new Error(`lot ${i}: ${error.message}`);
      n += Number(data ?? 0);
    }
    // un flux partiel (Autriche, Italie par sondage) ne supprime que ce qui n'a pas été revu depuis 3 jours
    const avant = pays === "AT" || pays === "IT" ? new Date(t0.getTime() - 3 * 86400_000) : t0;
    const { data: supprimees } = await db.rpc("sync_stations_pays_nettoyer", { p_pays: pays, p_avant: avant.toISOString() });
    const rapport = { ok: true, pays, stations: n, supprimees, duree_ms: Date.now() - t0.getTime() };
    console.log(JSON.stringify({ sync_pays: "ok", ...rapport }));
    return json(200, rapport);
  } catch (e) {
    console.error(JSON.stringify({ sync_pays: "erreur", pays, message: String(e) }));
    return json(502, { ok: false, pays, erreur: String(e) });
  }
});
