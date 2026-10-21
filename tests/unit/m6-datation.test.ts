// Jalon 6, round 2 (audit r1, problème 1) : litres gonflés par les positions arrivées en rafale. Au passage en arrière-plan,
// l'appli Android ne recevait rien pendant 10,5 s, puis un relevé en retard et le relevé courant à 1,9 s d'écart : datés à
// leur réception, ils faisaient croire à 167 puis 196 km/h, et ½·m·(v₂² − v₁²) comptait une accélération qui n'a pas eu lieu
// (points-ecran-eteint.json du run 39675522721 : 9,2 L/100 au lieu de 6,0). Deux parades : le point est daté par l'heure du
// relevé (service natif, android/…/TrajetService.java) et un pas ne peut pas gagner plus de vitesse qu'une voiture
// (ACCELERATION_MAX_MS2 de roule.ts).
import gpxAlbiToulouse from "../e2e/fixtures/albi-toulouse.gpx?raw";
import { describe, expect, it } from "vitest";
import { ACCELERATION_MAX_MS2, calculLocal, enDirect, pasDe, type PointRoule, type VehiculeRoule } from "../../supabase/functions/_shared/roule.ts";
import { consoParPhase } from "../../supabase/functions/_shared/conso-eea.ts";
import { entreesEnPoints, lireJournal } from "../../src/lib/enregistreur-web";

const CLIO: VehiculeRoule = { masse_kg: 1165, carburant: "SP95-E10", conso: consoParPhase(6.128, "SP95-E10", 1165, 87) };
const tous = [...gpxAlbiToulouse.matchAll(/<trkpt lat="([\d.-]+)" lon="([\d.-]+)"><time>([^<]+)<\/time>/g)].map((m) => ({ lat: +m[1], lon: +m[2], t: Date.parse(m[3]) }));
// 20 min d'autoroute après l'arrêt à la station (le scénario principal de l'émulateur part du point 700)
const l = tous.slice(700, 1900);
const vrais: PointRoule[] = l.map((p) => [p.t, p.lat, p.lon, 0]);
const litres = (pts: PointRoule[]) => calculLocal(pts, [], CLIO, pts[0][0], pts[pts.length - 1][0]).litres;

/** Les mêmes positions, datées à leur réception par la page : une rafale toutes les `periode` positions (bascule d'appli). */
function dateesALaReception(periode: number): PointRoule[] {
  const out: PointRoule[] = [];
  let decalage = 0;
  for (let i = 0; i < l.length; i++) {
    const k = i % periode;
    if (i >= periode && k === 0) {
      // silence de 10,5 s : le relevé suivant arrive en retard, les 10 d'après sont perdus, le courant arrive 1,9 s plus tard,
      // puis la réception reprend 0,4 s après chaque relevé
      out.push([l[i - 1].t + decalage + 10_500, l[i].lat, l[i].lon, 0]);
      i += 11;
      if (i >= l.length) break;
      decalage = 400;
      out.push([l[i].t + decalage, l[i].lat, l[i].lon, 0]);
      continue;
    }
    out.push([l[i].t + decalage, l[i].lat, l[i].lon, 0]);
  }
  return out;
}

describe("positions arrivées en rafale (audit r1, problème 1)", () => {
  const ref = litres(vrais);
  it("une voiture ne gagne pas plus de 4 m/s² : aucun pas au-delà", () => {
    const pas = pasDe(dateesALaReception(120));
    const pire = Math.max(...pas.map((p) => (p.v - p.vPrec) / 3.6 / p.dt));
    expect(ACCELERATION_MAX_MS2).toBe(4);
    expect(pire).toBeLessThanOrEqual(ACCELERATION_MAX_MS2 + 1e-9);
  });
  it("datées à la réception, 10 rafales en 20 min : litres à ±5 % du tracé (le code du round 1 en comptait +229 %)", () => {
    const r = litres(dateesALaReception(120));
    expect(Math.abs(r - ref) / ref).toBeLessThan(0.05);
  });
  it("le direct de la notification suit (même calcul)", () => {
    const pts = dateesALaReception(120);
    const d = enDirect(pts, [], pts[0][0], pts[pts.length - 1][0], CLIO, false);
    expect(Math.abs(d.litres - ref) / ref).toBeLessThan(0.05);
  });
  it("datées par l'heure du relevé (service natif), mêmes positions perdues : litres à ±2 % du tracé", () => {
    // le relevé en retard garde son heure (i), le courant aussi (i + 11) : le pas de 11 s est une ligne droite à la bonne vitesse
    const pts = vrais.filter((_, i) => i < 120 || i % 120 === 0 || i % 120 >= 12);
    expect(Math.abs(litres(pts) - ref) / ref).toBeLessThan(0.02);
  });
});

describe("journal des relevés écrit par le service natif (TrajetService.java)", () => {
  // une ligne par relevé : P;instant du relevé;lat;lon;altitude;vitesse km/h;précision — une ligne par bouton de la notification :
  // A;instant;action
  const texte = [
    "P;1792617000000;43.9;2.1;170;;5",
    "P;1792617001000;43.9001;2.1;170;54.5;5",
    "A;1792617001500;pause",
    "garbage",
    "P;1792617002000;43.9002;2.1;;;",
    "",
  ].join("\n");
  it("lecture : positions et actions dans l'ordre, lignes illisibles écartées", () => {
    const e = lireJournal(texte);
    expect(e.map((x) => x.type)).toEqual(["P", "P", "A", "P"]);
    expect(e[1]).toMatchObject({ type: "P", t: 1792617001000, lat: 43.9001, lon: 2.1, altitude: 170, kmh: 54.5, precision: 5 });
    expect(e[3]).toMatchObject({ type: "P", altitude: null, kmh: null, precision: null });
    expect(e[2]).toMatchObject({ type: "A", t: 1792617001500, action: "pause" });
  });
  it("les points prennent l'instant du relevé, pas celui de la lecture ; un relevé déjà vu ou plus ancien est ignoré", () => {
    const e = lireJournal(texte).filter((x) => x.type === "P");
    const pts = entreesEnPoints([...e, e[0]]);
    expect(pts.map((p) => p[0])).toEqual([1792617000000, 1792617001000, 1792617002000]);
  });
});
