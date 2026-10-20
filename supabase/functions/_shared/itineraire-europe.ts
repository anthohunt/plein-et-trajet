// Appels Valhalla (jalon 3) : /route puis /trace_attributes. Instance publique FOSSGIS (sans clé, ≤ 1 requête/s,
// User-Agent identifiant, faible trafic — https://www.fossgis.de/arbeitsgruppen/osm-server/nutzungsbedingungen/)
// ou Stadia Maps (clé, en-tête Authorization: Stadia-Auth).
import { decoderPolyline6, decouperTrace, encoderPolyline6, type AdminValhalla, type Arete } from "./europe.ts";

export interface ConnexionValhalla {
  base: string; // sans / final
  route: string; // chemins : "/route" ou "/route/v1"
  trace: string;
  entetes: Record<string, string>;
  pauseMs: number; // pause entre deux appels (1 req/s sur l'instance publique)
}
export const FOSSGIS: ConnexionValhalla = { base: "https://valhalla1.openstreetmap.de", route: "/route", trace: "/trace_attributes", entetes: {}, pauseMs: 1100 };
export const stadia = (cle: string): ConnexionValhalla => ({ base: "https://api.stadiamaps.com", route: "/route/v1", trace: "/trace_attributes/v1", entetes: { Authorization: `Stadia-Auth ${cle}` }, pauseMs: 0 });

export class ErreurItineraire extends Error {
  constructor(public code: "pas_itineraire" | "indisponible" | "cle_refusee" | "trop_long", detail = "") {
    super(code + (detail ? ` ${detail}` : ""));
  }
}
const UA = { "User-Agent": "plein-et-trajet/1.0 (+https://plein-et-trajet.vercel.app)", "Content-Type": "application/json" };
const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function post(c: ConnexionValhalla, chemin: string, corps: unknown, ms = 60000): Promise<any> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  let r: Response;
  try {
    r = await fetch(c.base + chemin, { method: "POST", headers: { ...UA, ...c.entetes }, body: JSON.stringify(corps), signal: ctl.signal });
  } catch {
    throw new ErreurItineraire("indisponible", "réseau");
  } finally {
    clearTimeout(t);
  }
  if (r.status === 401 || r.status === 403) throw new ErreurItineraire("cle_refusee", String(r.status));
  if (r.status === 400) {
    const j = await r.json().catch(() => ({}));
    // 442 « no path » / 171 « no suitable edges » : aucun itinéraire routier
    if ([442, 443, 171, 170].includes(j?.error_code)) throw new ErreurItineraire("pas_itineraire", String(j?.error_code));
    if (j?.error_code === 154) throw new ErreurItineraire("trop_long", String(j?.error_code)); // distance au-delà de la limite du service
    throw new ErreurItineraire("indisponible", `400 ${j?.error_code ?? ""}`);
  }
  if (!r.ok) throw new ErreurItineraire("indisponible", String(r.status));
  try {
    return await r.json();
  } catch {
    throw new ErreurItineraire("indisponible", "réponse mal formée");
  }
}

export interface RouteValhalla {
  duree_s: number;
  km: number;
  aretes: Arete[];
  admins: AdminValhalla[];
}

export async function routeValhalla(c: ConnexionValhalla, a: { lat: number; lon: number }, b: { lat: number; lon: number }): Promise<RouteValhalla> {
  const j = await post(c, c.route, { locations: [{ lat: a.lat, lon: a.lon }, { lat: b.lat, lon: b.lon }], costing: "auto", directions_options: { units: "kilometers" } });
  const trip = j?.trip;
  const forme = trip?.legs?.[0]?.shape;
  if (!trip || trip.status !== 0 || typeof forme !== "string" || !(trip.summary?.length > 0)) throw new ErreurItineraire("pas_itineraire");
  const morceaux = decouperTrace(decoderPolyline6(forme));
  const aretes: Arete[] = [];
  const admins: AdminValhalla[] = [];
  const index = new Map<string, number>();
  for (const m of morceaux) {
    if (c.pauseMs) await pause(c.pauseMs);
    const t = await post(c, c.trace, {
      encoded_polyline: encoderPolyline6(m),
      costing: "auto",
      shape_match: "edge_walk",
      filters: {
        attributes: ["edge.length", "edge.road_class", "edge.speed", "edge.speed_limit", "edge.weighted_grade", "edge.toll", "edge.traffic_signal", "edge.roundabout", "edge.names", "edge.end_node.admin_index", "node.admin_index", "admin.country_code", "admin.country_text"],
        action: "include",
      },
    });
    if (!Array.isArray(t?.edges) || !Array.isArray(t?.admins)) throw new ErreurItineraire("indisponible", "trace illisible");
    // index d'admin propre à chaque morceau : on le ramène à une liste commune
    const local: number[] = (t.admins as AdminValhalla[]).map((ad) => {
      const code = ad.country_code ?? "ZZ";
      if (!index.has(code)) {
        index.set(code, admins.length);
        admins.push({ country_code: code });
      }
      return index.get(code)!;
    });
    for (const e of t.edges as Arete[]) aretes.push({ ...e, end_node: { admin_index: local[e.end_node?.admin_index ?? 0] ?? 0 } });
  }
  return { duree_s: Number(trip.summary.time) || 0, km: Number(trip.summary.length), aretes, admins };
}
