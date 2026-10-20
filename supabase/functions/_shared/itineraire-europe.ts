// Appels Valhalla (jalon 3) : /route puis /trace_attributes. Adresse, chemins et pause lus dans la table `fournisseurs`
// (FOSSGIS : « les URL ne devraient pas être codées en dur », ≤ 1 requête/s, User-Agent identifiant, faible trafic —
// https://www.fossgis.de/arbeitsgruppen/osm-server/nutzungsbedingungen/). La pause est tenue entre invocations simultanées
// par le limiteur Postgres (`limiteur_reserver`). Cible de production : Stadia Maps (clé collée dans l'écran Moteurs).
import { ATTRIBUTS_TRACE, decoderPolyline6, decouperTrace, encoderPolyline6, type AdminValhalla, type Arete } from "./europe.ts";

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
const UA = { "User-Agent": "plein-et-trajet/1.0 (+https://plein-et-trajet.vercel.app)", "Content-Type": "application/json" };

// deno-lint-ignore no-explicit-any
async function post(c: ConnexionValhalla, chemin: string, corps: unknown, estRoute: boolean, ms = 60000): Promise<any> {
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
      const code = ad.country_code ?? "ZZ";
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
