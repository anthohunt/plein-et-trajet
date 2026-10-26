// Tracés dérivés du tracé réel tests/fixtures/gpx/route-a-b.gpx (jalon 5, V-3.E1 et V-3.E2), fabriqués et commités :
//  - route-a-b-immobile-11min.gpx : les 4 premiers km du tracé, puis 11 min (660 points, 1 par seconde) sur place,
//    avec un bruit GPS de ±2 m déterministe (graine fixe) — une voiture garée, trajet oublié.
//  - route-a-b-tunnel-90s.gpx : 2 min avant un passage de 3 km sur l'A68 (choisi assez droit pour que la ligne droite
//    entre ses deux bouts fasse au moins 99 % du chemin), les points de ce passage retirés (aucune position pendant 90 s, comme
//    dans un tunnel), puis 1 min après. Le chemin réel du passage est écrit en commentaire (contrôle « comblé à ± 1 % »).
// Usage : node tests/fixtures/gpx/derive-gpx.mjs
import { readFileSync, writeFileSync } from "node:fs";

const ICI = new URL(".", import.meta.url);
const src = readFileSync(new URL("route-a-b.gpx", ICI), "utf8");
const pts = [...src.matchAll(/<trkpt lat="([\d.-]+)" lon="([\d.-]+)"><time>([^<]+)<\/time>(?:<extensions><speed>([\d.]+)<\/speed><\/extensions>)?<\/trkpt>/g)].map((m) => ({
  lat: +m[1],
  lon: +m[2],
  t: Date.parse(m[3]),
  v: m[4] == null ? null : +m[4],
}));
const R = 6371008.8;
const rad = (x) => (x * Math.PI) / 180;
export function distanceM(a, b) {
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
const iso = (ms) => new Date(ms).toISOString().replace(/\.\d{3}Z$/, "Z");
const gpx = (nom, entete, liste) =>
  `<?xml version="1.0" encoding="UTF-8"?>\n<!--\n${entete}\n-->\n<gpx version="1.1" creator="plein-et-trajet derive-gpx.mjs" xmlns="http://www.topografix.com/GPX/1/1">\n<trk><name>${nom}</name><trkseg>\n` +
  liste.map((p) => `<trkpt lat="${p.lat.toFixed(6)}" lon="${p.lon.toFixed(6)}"><time>${iso(p.t)}</time><extensions><speed>${(p.v ?? 0).toFixed(2)}</speed></extensions></trkpt>`).join("\n") +
  `\n</trkseg></trk>\n</gpx>\n`;

// ---------------------------------------------------------------- immobile 11 min
let cumul = 0;
let k = 0;
for (; k < pts.length - 1 && cumul < 4000; k++) cumul += distanceM(pts[k], pts[k + 1]);
const avant = pts.slice(0, k + 1);
const ici = pts[k];
let graine = 42;
const alea = () => ((graine = (graine * 1103515245 + 12345) % 2 ** 31) / 2 ** 31) * 2 - 1; // LCG déterministe, [-1, 1)
const mLat = 1 / 111_320;
const mLon = 1 / (111_320 * Math.cos(rad(ici.lat)));
const immobiles = Array.from({ length: 660 }, (_, i) => ({ lat: ici.lat + alea() * 2 * mLat, lon: ici.lon + alea() * 2 * mLon, t: ici.t + (i + 1) * 1000, v: 0 }));
writeFileSync(
  new URL("route-a-b-immobile-11min.gpx", ICI),
  gpx(
    "la ville de départ → Toulouse, garé 11 min (dérivé)",
    `  Dérivé de route-a-b.gpx par tests/fixtures/gpx/derive-gpx.mjs : ${avant.length} premiers points (${(cumul / 1000).toFixed(2)} km, ${Math.round((ici.t - pts[0].t) / 1000)} s),\n  puis 660 points (11 min, 1 par seconde) sur place à ±2 m. Début de l'immobilité attendu : ${iso(ici.t)} (point ${k}).`,
    [...avant, ...immobiles],
  ),
);
console.log(`immobile : ${avant.length} points roulés (${(cumul / 1000).toFixed(2)} km) + 660 immobiles ; immobilité depuis ${iso(ici.t)}`);

// ---------------------------------------------------------------- tunnel 90 s / ≈ 3 km
// Le tracé roule à 101 km/h au plus sur l'A68 : 3 km y prennent environ 107 s. Pour un trou de 90 s sur 3 km, les points
// d'après le tunnel sont avancés d'autant (vitesse moyenne du passage 120 km/h) ; leur espacement reste d'une seconde.
let meilleur = null;
for (let i = 600; i < pts.length - 200; i++) {
  let chemin = 0;
  let j = i;
  while (j < pts.length - 1 && chemin < 3000) chemin += distanceM(pts[j], pts[++j]);
  if (chemin < 3000 || chemin > 3060) continue;
  const corde = distanceM(pts[i], pts[j]);
  if (corde / chemin >= 0.99 && (!meilleur || corde / chemin > meilleur.ratio)) meilleur = { i, j, chemin, corde, ratio: corde / chemin };
}
if (!meilleur) throw new Error("aucun passage de 3 km assez droit");
const { i: a, j: b, chemin, corde } = meilleur;
const avance = pts[b].t - pts[a].t - 90_000;
const tunnel = [...pts.slice(a - 120, a + 1), ...pts.slice(b, b + 61).map((p) => ({ ...p, t: p.t - avance }))];
writeFileSync(
  new URL("route-a-b-tunnel-90s.gpx", ICI),
  gpx(
    "la ville de départ → Toulouse, tunnel de 90 s (dérivé)",
    `  Dérivé de route-a-b.gpx par tests/fixtures/gpx/derive-gpx.mjs : points ${a - 120} à ${b + 60}, les ${b - a - 1} points ${a + 1} à ${b - 1} retirés\n  (aucune position pendant 90 s : de ${iso(pts[a].t)} à ${iso(pts[b].t - avance)}) ; points d'après avancés de ${avance / 1000} s (le tracé d'origine\n  met ${(pts[b].t - pts[a].t) / 1000} s pour ces 3 km ; ici le passage se fait à ${((chemin / 90) * 3.6).toFixed(0)} km/h de moyenne).\n  Chemin réel du passage : ${chemin.toFixed(1)} m ; ligne droite entre ses deux bouts : ${corde.toFixed(1)} m (${((corde / chemin) * 100).toFixed(2)} %).\n  CHEMIN_PASSAGE_M=${chemin.toFixed(1)} CORDE_M=${corde.toFixed(1)}`,
    tunnel,
  ),
);
console.log(`tunnel : points ${a}→${b}, chemin ${chemin.toFixed(1)} m, corde ${corde.toFixed(1)} m (${((corde / chemin) * 100).toFixed(2)} %), avance ${avance / 1000} s, ${tunnel.length} points`);
