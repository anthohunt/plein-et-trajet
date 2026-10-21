// Fabrique tests/e2e/fixtures/albi-toulouse.gpx à partir d'un VRAI itinéraire routier Albi → Toulouse (Valhalla, instance publique
// FOSSGIS valhalla1.openstreetmap.de : /route puis /trace_attributes en edge_walk pour la classe de voie et la vitesse de chaque arête),
// densifié à 1 point par seconde. Les vitesses suivent la vitesse estimée de chaque arête (OSM / Valhalla), avec accélérations et
// freinages bornés, un arrêt de 40 s à un feu dans Albi et un arrêt de 120 s (pause carburant) sur la route.
// Ce n'est PAS un trajet roulé : c'est la seule simulation du jalon 4 (géolocalisation rejouée dans le navigateur), déclarée comme telle.
// usage : node tests/e2e/fixtures/creer-gpx.mjs
import { writeFileSync } from "node:fs";

const BASE = "https://valhalla1.openstreetmap.de";
const UA = { "User-Agent": "plein-et-trajet/1.0 (+https://plein-et-trajet.vercel.app)", "Content-Type": "application/json" };
const DEPART = { lat: 43.92836, lon: 2.14587 }; // Albi, place du Vigan
const ARRIVEE = { lat: 43.60445, lon: 1.44406 }; // Toulouse, Capitole
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

function decoder6(s) {
  const pts = [];
  let i = 0, lat = 0, lon = 0;
  const lire = () => { let r = 0, sh = 0, b; do { b = s.charCodeAt(i++) - 63; r |= (b & 0x1f) << sh; sh += 5; } while (b >= 0x20); return r & 1 ? ~(r >> 1) : r >> 1; };
  while (i < s.length) { lat += lire(); lon += lire(); pts.push([lat / 1e6, lon / 1e6]); }
  return pts;
}
const dist = (a, b) => { const R = 6371000, dLa = ((b[0] - a[0]) * Math.PI) / 180, dLo = ((b[1] - a[1]) * Math.PI) / 180; const s = Math.sin(dLa / 2) ** 2 + Math.cos((a[0] * Math.PI) / 180) * Math.cos((b[0] * Math.PI) / 180) * Math.sin(dLo / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(s)); };

const route = await (await fetch(`${BASE}/route`, { method: "POST", headers: UA, body: JSON.stringify({ locations: [DEPART, ARRIVEE], costing: "auto", directions_options: { units: "kilometers" } }) })).json();
if (route?.trip?.status !== 0) throw new Error("route : " + JSON.stringify(route).slice(0, 300));
const forme = route.trip.legs[0].shape;
const pts = decoder6(forme);
await pause(1200);
const ta = await (await fetch(`${BASE}/trace_attributes`, { method: "POST", headers: UA, body: JSON.stringify({ encoded_polyline: forme, costing: "auto", shape_match: "edge_walk", filters: { attributes: ["edge.length", "edge.speed", "edge.road_class", "edge.begin_shape_index", "edge.end_shape_index", "edge.names"], action: "include" } }) })).json();
if (!Array.isArray(ta?.edges)) throw new Error("trace_attributes : " + JSON.stringify(ta).slice(0, 300));

// vitesse cible (m/s) à chaque point du tracé : celle de l'arête qui le contient, moins 8 % (conduite réelle sous la vitesse estimée)
const cible = new Array(pts.length).fill(13.9);
const classe = new Array(pts.length).fill("");
for (const e of ta.edges) for (let k = e.begin_shape_index; k <= e.end_shape_index && k < pts.length; k++) { cible[k] = ((e.speed ?? 50) / 3.6) * 0.92; classe[k] = e.road_class ?? ""; }
// abscisse curviligne
const s = [0];
for (let k = 1; k < pts.length; k++) s.push(s[k - 1] + dist(pts[k - 1], pts[k]));
const total = s[s.length - 1];
const cibleA = (x) => { let k = 0; while (k < s.length - 2 && s[k + 1] < x) k++; return cible[k]; };
const position = (x) => { let k = 0; while (k < s.length - 2 && s[k + 1] < x) k++; const seg = s[k + 1] - s[k] || 1; const t = Math.min(1, Math.max(0, (x - s[k]) / seg)); return [pts[k][0] + (pts[k + 1][0] - pts[k][0]) * t, pts[k][1] + (pts[k + 1][1] - pts[k][1]) * t]; };

// arrêts : un feu à 1,2 km du départ (40 s), un arrêt de 180 s (station-service) au premier point hors voie rapide après 2,5 km
const kStation = s.findIndex((x, k) => x > 2500 && classe[k] !== "motorway" && classe[k] !== "trunk");
const ARRETS = [{ x: 1200, s: 40, nom: "feu rouge, Albi" }, { x: Math.round(s[kStation]), s: 180, nom: `station-service, route ${classe[kStation]}` }];
const ACC = 1.6, FREIN = 2.5; // m/s²
const sortie = [];
let x = 0, v = 0, t = 0;
const t0 = Date.parse("2026-10-21T07:00:00Z");
const arretsFaits = new Set();
while (x < total - 1) {
  const p = position(x);
  sortie.push({ t, lat: p[0], lon: p[1], v });
  // prochain arrêt ou fin : freiner à temps
  const prochain = ARRETS.find((a, i) => !arretsFaits.has(i) && a.x > x);
  const iProchain = ARRETS.indexOf(prochain);
  const reste = Math.min(prochain ? prochain.x - x : Infinity, total - x);
  let vc = cibleA(x + 30); // anticipe le changement de vitesse 30 m plus loin
  const vFreinage = Math.sqrt(2 * FREIN * Math.max(0, reste - 2));
  vc = Math.min(vc, vFreinage);
  if (v < vc) v = Math.min(vc, v + ACC); else v = Math.max(vc, v - FREIN);
  if (prochain && x + v >= prochain.x - 3) {
    // l'arrêt est atteint pendant ce pas : la voiture s'arrête exactement au point d'arrêt (aucun arrêt sauté)
    x = prochain.x;
    t++;
    const q = position(x);
    sortie.push({ t, lat: q[0], lon: q[1], v: 0 });
    arretsFaits.add(iProchain);
    for (let k = 0; k < prochain.s; k++) { t++; sortie.push({ t, lat: q[0], lon: q[1], v: 0 }); }
    v = 0;
    t++;
    continue;
  }
  if (!prochain && x + v >= total - 3) break; // arrivée : le dernier point (vitesse nulle) est ajouté après la boucle
  x += Math.max(v, 0.3); // au pas, la voiture avance toujours (pas de blocage à l'approche d'un point)
  t++;
  if (t > 4 * 3600) throw new Error("boucle");
}
const fin = pts[pts.length - 1];
t++;
sortie.push({ t, lat: fin[0], lon: fin[1], v: 0 });

const iso = (t) => new Date(t0 + t * 1000).toISOString().replace(".000", "");
const entete = `<!--
  Trajet REJOUÉ (pas roulé) — fabriqué le ${new Date().toISOString()} par tests/e2e/fixtures/creer-gpx.mjs.
  Géométrie : vrai itinéraire routier Albi (place du Vigan) → Toulouse (Capitole), moteur Valhalla, instance publique FOSSGIS
  (${BASE}/route, ${route.trip.summary.length.toFixed(1)} km, ${Math.round(route.trip.summary.time / 60)} min estimées), vitesse et classe de chaque arête
  par /trace_attributes (edge_walk). Densifié à 1 point par seconde ; vitesse = vitesse estimée de l'arête × 0,92, accélération ≤ ${ACC} m/s²,
  freinage ≤ ${FREIN} m/s² ; arrêts : ${ARRETS.map((a) => `${a.s} s à ${(a.x / 1000).toFixed(1)} km (${a.nom})`).join(" ; ")}.
  ${sortie.length} points, durée ${Math.floor(t / 60)} min ${t % 60} s, longueur ${(total / 1000).toFixed(1)} km. Seule simulation du jalon 4 :
  la géolocalisation du navigateur est rejouée point par point (context.setGeolocation, 1 par seconde) ; tout le reste passe par les vrais services.
-->`;
const gpx = `<?xml version="1.0" encoding="UTF-8"?>\n${entete}\n<gpx version="1.1" creator="plein-et-trajet creer-gpx.mjs" xmlns="http://www.topografix.com/GPX/1/1">\n<trk><name>Albi → Toulouse (rejoué)</name><trkseg>\n` +
  sortie.map((p) => `<trkpt lat="${p.lat.toFixed(6)}" lon="${p.lon.toFixed(6)}"><time>${iso(p.t)}</time><extensions><speed>${p.v.toFixed(2)}</speed></extensions></trkpt>`).join("\n") +
  `\n</trkseg></trk>\n</gpx>\n`;
writeFileSync(new URL("./albi-toulouse.gpx", import.meta.url), gpx);
const classes = {};
ta.edges.forEach((e) => (classes[e.road_class] = (classes[e.road_class] ?? 0) + e.length));
console.log(JSON.stringify({ km: +(total / 1000).toFixed(1), points: sortie.length, duree_min: +(t / 60).toFixed(1), classes_km: Object.fromEntries(Object.entries(classes).map(([k, v]) => [k, +v.toFixed(1)])), vmax_kmh: Math.round(Math.max(...sortie.map((p) => p.v)) * 3.6) }));
