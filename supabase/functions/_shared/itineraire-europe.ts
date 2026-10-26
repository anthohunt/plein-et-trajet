// Appels Valhalla (jalon 3) : /route puis /trace_attributes. Adresse, chemins et pause lus dans la table `fournisseurs`
// (FOSSGIS : « les URL ne devraient pas être codées en dur », ≤ 1 requête/s, User-Agent identifiant, faible trafic —
// https://www.fossgis.de/arbeitsgruppen/osm-server/nutzungsbedingungen/). La pause est tenue entre invocations simultanées
// par le limiteur Postgres (`limiteur_reserver`). Cible de production : Stadia Maps (clé collée dans l'écran Moteurs).
import { ATTRIBUTS_TRACE, decoderPolyline6, decouperTrace, distanceKm, encoderPolyline6, type AdminValhalla, type Arete } from "./europe.ts";
import { codePaysAdmin } from "./roule.ts";

export interface ConnexionValhalla {
  base: string; // sans / final
  route: string; // chemins : "/route" ou "/route/v1"
  trace: string;
  entetes: Record<string, string>;
  /** Appelé avant chaque requête : attend le créneau réservé auprès du limiteur partagé (rien si pas de limite). */
  avantRequete: () => Promise<void>;
}

/** Construit la connexion depuis une ligne de la table `fournisseurs` ; `reserver(nom, pause_ms)` = limiteur partagé. */
export function connexionDepuisFournisseur(
  f: { id: string; url: string | null; chemin_route: string | null; chemin_trace: string | null; pause_ms: number | null },
  cle: string | null,
  reserver: (nom: string, pauseMs: number) => Promise<number>,
): ConnexionValhalla {
  if (!f.url || !f.chemin_route || !f.chemin_trace) throw new ErreurItineraire("indisponible", `fournisseur ${f.id} sans adresse`);
  const pause = f.pause_ms ?? 0;
  return {
    base: f.url.replace(/\/$/, ""),
    route: f.chemin_route,
    trace: f.chemin_trace,
    entetes: cle ? { Authorization: `Stadia-Auth ${cle}` } : {},
    avantRequete: async () => {
      if (pause <= 0) return;
      const ms = await reserver(f.id, pause);
      if (ms > 0) await new Promise((r) => setTimeout(r, ms));
    },
  };
}

export class ErreurItineraire extends Error {
  constructor(public code: "pas_itineraire" | "indisponible" | "cle_refusee" | "trop_long", detail = "") {
    super(code + (detail ? ` ${detail}` : ""));
  }
}
const UA = { "User-Agent": "plein-et-trajet/1.0 (+https://github.com/anthohunt/plein-et-trajet)", "Content-Type": "application/json" };

// deno-lint-ignore no-explicit-any
export async function post(c: ConnexionValhalla, chemin: string, corps: unknown, estRoute: boolean, ms = 60000): Promise<any> {
  await c.avantRequete();
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
    // 154 « distance au-delà de la limite » : sur /route c'est le trajet qui est trop long ; sur /trace_attributes c'est un défaut de découpage
    if (j?.error_code === 154 && estRoute) throw new ErreurItineraire("trop_long", String(j?.error_code));
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
  trace: { lat: number; lon: number }[]; // tracé affiché (forme /route décodée) : sert aussi à tarifer les péages
}

export async function routeValhalla(c: ConnexionValhalla, a: { lat: number; lon: number }, b: { lat: number; lon: number }): Promise<RouteValhalla> {
  const j = await post(c, c.route, { locations: [{ lat: a.lat, lon: a.lon }, { lat: b.lat, lon: b.lon }], costing: "auto", directions_options: { units: "kilometers" } }, true);
  const trip = j?.trip;
  const forme = trip?.legs?.[0]?.shape;
  if (!trip || trip.status !== 0 || typeof forme !== "string" || !(trip.summary?.length > 0)) throw new ErreurItineraire("pas_itineraire");
  const pts = decoderPolyline6(forme);
  const morceaux = decouperTrace(pts); // ≤ 14 000 points et ≤ 800 km par morceau
  const aretes: Arete[] = [];
  const admins: AdminValhalla[] = [];
  const index = new Map<string, number>();
  for (const m of morceaux) {
    const t = await post(c, c.trace, {
      encoded_polyline: encoderPolyline6(m),
      costing: "auto",
      shape_match: "edge_walk",
      filters: {
        attributes: ATTRIBUTS_TRACE,
        action: "include",
      },
    }, false);
    if (!Array.isArray(t?.edges) || !Array.isArray(t?.admins)) throw new ErreurItineraire("indisponible", "trace illisible");
    // index d'admin propre à chaque morceau : on le ramène à une liste commune
    const local: number[] = (t.admins as AdminValhalla[]).map((ad) => {
      const code = codePaysAdmin(ad); // Royaume-Uni : admin « England » sans code pays
      if (!index.has(code)) {
        index.set(code, admins.length);
        admins.push({ country_code: code });
      }
      return index.get(code)!;
    });
    for (const e of t.edges as Arete[]) aretes.push({ ...e, end_node: { admin_index: local[e.end_node?.admin_index ?? 0] ?? 0 } });
  }
  return { duree_s: Number(trip.summary.time) || 0, km: Number(trip.summary.length), aretes, admins, trace: pts.map(([lat, lon]) => ({ lat, lon })) };
}

// ------------------------------------------------------------------ jalon 4 : recalage d'un tracé GPS sur la carte (map matching)
// Valhalla /trace_attributes avec shape_match « map_snap » (algorithme de recalage Meili : les points GPS ne suivent pas exactement
// les arêtes) — documentation Valhalla « Map Matching » et Stadia Maps « Trace Attributes » (POST /trace_attributes/v1, mêmes options).
// Liste d'attributs acceptée par Stadia (vérifié le 21/10/2026 par une vraie requête : 200, 330 arêtes, 1 044 points recalés).
export const ATTRIBUTS_RECALAGE = [
  "edge.length", "edge.road_class", "edge.speed", "edge.speed_limit", "edge.weighted_grade", "edge.toll", "edge.names", "edge.density", "edge.use",
  "node.admin_index", "admin.country_code", "admin.country_text", "matched.point", "matched.type", "matched.edge_index", "shape",
];
export interface PointHorodate {
  lat: number;
  lon: number;
  t: number; // ms
}
export interface Recalage {
  aretes: (Arete & { use?: string; density?: number })[];
  admins: AdminValhalla[];
  matched: ({ edge_index?: number; type?: string } | undefined)[]; // un par point envoyé, dans l'ordre
  forme: { lat: number; lon: number }[]; // tracé recalé (sert à tarifer les péages réellement franchis)
}

/** Morceaux d'au plus `maxPoints` points et `maxKm` km (Valhalla : 200 km par défaut pour map_snap), le point de jonction répété. */
export function morceauxRecalage(pts: PointHorodate[], maxPoints = 3000, maxKm = 150): { debut: number; fin: number }[] {
  const out: { debut: number; fin: number }[] = [];
  let debut = 0;
  let km = 0;
  for (let i = 1; i < pts.length; i++) {
    const d = distanceKm([pts[i - 1].lat, pts[i - 1].lon], [pts[i].lat, pts[i].lon]);
    if (i - debut + 1 > maxPoints || km + d > maxKm) {
      out.push({ debut, fin: i - 1 });
      debut = i - 1;
      km = 0;
    }
    km += d;
  }
  out.push({ debut, fin: pts.length - 1 });
  return out;
}

export async function recalerTrace(c: ConnexionValhalla, pts: PointHorodate[]): Promise<Recalage> {
  const aretes: Recalage["aretes"] = [];
  const admins: AdminValhalla[] = [];
  const index = new Map<string, number>();
  const matched: Recalage["matched"] = new Array(pts.length).fill(undefined);
  const forme: { lat: number; lon: number }[] = [];
  for (const m of morceauxRecalage(pts)) {
    const part = pts.slice(m.debut, m.fin + 1);
    const t = await post(c, c.trace, {
      shape: part.map((p) => ({ lat: p.lat, lon: p.lon, time: Math.round(p.t / 1000) })),
      costing: "auto",
      shape_match: "map_snap",
      use_timestamps: true,
      trace_options: { search_radius: 50, gps_accuracy: 15 },
      filters: { attributes: ATTRIBUTS_RECALAGE, action: "include" },
    }, false);
    if (!Array.isArray(t?.edges) || !Array.isArray(t?.admins) || !Array.isArray(t?.matched_points)) throw new ErreurItineraire("indisponible", "recalage illisible");
    const local: number[] = (t.admins as AdminValhalla[]).map((ad) => {
      const code = codePaysAdmin(ad);
      if (!index.has(code)) {
        index.set(code, admins.length);
        admins.push({ country_code: code });
      }
      return index.get(code)!;
    });
    const decalage = aretes.length;
    for (const e of t.edges as Recalage["aretes"]) aretes.push({ ...e, end_node: { admin_index: local[e.end_node?.admin_index ?? 0] ?? 0 } });
    (t.matched_points as { edge_index?: number; type?: string }[]).forEach((mp, k) => {
      const i = m.debut + k;
      if (k === 0 && m.debut > 0 && matched[i]) return; // point de jonction : déjà recalé par le morceau précédent
      const valide = typeof mp.edge_index === "number" && mp.edge_index >= 0 && mp.edge_index < (t.edges as unknown[]).length;
      matched[i] = { type: mp.type, edge_index: valide ? (mp.edge_index as number) + decalage : undefined };
    });
    if (typeof t.shape === "string") for (const [lat, lon] of decoderPolyline6(t.shape)) forme.push({ lat, lon });
  }
  if (aretes.length === 0) throw new ErreurItineraire("pas_itineraire", "aucune route reconnue");
  return { aretes, admins, matched, forme };
}
