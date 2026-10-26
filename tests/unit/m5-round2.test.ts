// Jalon 5, round 2 — correctifs des audits : changement de carburant sans moyenne (V-6.4), bruit du GPS à l'arrêt (V-3.1,
// V-3.E1), pointe de la courbe de conso (V-4.6), vitesse après « Reprendre » (V-3.4 / V-3.E1). Tracés : le GPX réel
// route-a-b.gpx et son dérivé « immobile 11 min » (bruit de ±2 m, tests/fixtures/gpx/derive-gpx.mjs).
import gpxRouteAB from "../fixtures/gpx/route-a-b.gpx?raw";
import gpxImmobile from "../fixtures/gpx/route-a-b-immobile-11min.gpx?raw";
import { describe, expect, it } from "vitest";
import { ajouterPosition, basculerPause, BRUIT_MIN_M, calculLocal, enDirect, lisserConsos, pasDe, type EtatPoints, type PointRoule, type VehiculeRoule } from "../../supabase/functions/_shared/roule.ts";
import { distanceM } from "../../supabase/functions/_shared/modele.ts";
import { consoParPhase } from "../../supabase/functions/_shared/conso-eea.ts";
import { changerCarburant, coutTrajet, totaux, type TrajetV1 } from "../../src/lib/historique";

interface Pt { lat: number; lon: number; t: number }
const lire = (src: string): Pt[] => [...src.matchAll(/<trkpt lat="([\d.-]+)" lon="([\d.-]+)"><time>([^<]+)<\/time>/g)].map((m) => ({ lat: +m[1], lon: +m[2], t: Date.parse(m[3]) }));
const enPoints = (l: Pt[], seg = 0): PointRoule[] => l.map((p) => [p.t, p.lat, p.lon, seg]);
const CLIO: VehiculeRoule = { masse_kg: 1165, carburant: "SP95-E10", conso: consoParPhase(6.128, "SP95-E10", 1165, 87) };
/** Décale un point de (nord, est) mètres. */
const decaler = (lat: number, lon: number, n: number, e: number) => [lat + n / 111_320, lon + e / (111_320 * Math.cos((lat * Math.PI) / 180))] as const;

describe("V-6.4 : changer de carburant sur un trajet rouvert sans moyenne pour ce carburant", () => {
  // état du signalement de l'audit (lot 2, MEDIUM 3) : trajet rouvert dont seule la moyenne SP95-E10 est gardée
  const t = {
    id: "x", debut: Date.parse("2026-10-05T08:00:00Z"), km: 74.9, litres: 5.31, carburant: "SP95-E10", pays_depart: "FR",
    moyennes: { "SP95-E10": { prix: 2.156, pays: "FR" } }, prix_litre: 2.156, prix_perso: null, personnes: 2, enregistre: true,
  } as unknown as TrajetV1;
  it("avant le correctif : prix_litre null, coût « — », totaux à 0 (le défaut reproduit)", () => {
    const ancien = { ...t, carburant: "Gazole", prix_litre: (t.moyennes as Record<string, { prix: number }>)["Gazole"]?.prix ?? null } as TrajetV1;
    expect(ancien.prix_litre).toBeNull();
    expect(coutTrajet(ancien)).toBeNull();
    expect(totaux([ancien]).euros).toBe(0);
  });
  it("sans moyenne lue (pas de réseau) : changement refusé, le trajet garde son carburant et son prix", () => {
    expect(changerCarburant(t, "Gazole")).toBeNull();
    expect(changerCarburant(t, "Gazole", null)).toBeNull();
    expect(changerCarburant(t, "Gazole", {})).toBeNull();
    expect(coutTrajet(t)).toBe(11.45); // 5,31 × 2,156 = 11,448
  });
  it("moyenne lue au moment du changement : prix défini, coût et totaux justes", () => {
    const n = changerCarburant(t, "Gazole", { Gazole: { prix: 2.368, pays: "FR" }, "SP95-E10": { prix: 1.999, pays: "FR" } })!;
    expect(n.carburant).toBe("Gazole");
    expect(n.prix_litre).toBe(2.368);
    expect(n.moyennes["SP95-E10"]!.prix).toBe(2.156); // la moyenne gardée avec le trajet n'est pas écrasée
    expect(coutTrajet(n)).toBe(12.57); // 5,31 × 2,368 = 12,574
    expect(totaux([n]).euros).toBe(12.57);
    expect(totaux([n]).sansPrix).toBe(0);
  });
  it("moyenne déjà gardée avec le trajet : utilisée sans lecture", () => {
    const n = changerCarburant(changerCarburant(t, "Gazole", { Gazole: { prix: 2.368, pays: "FR" } })!, "SP95-E10")!;
    expect(n.prix_litre).toBe(2.156);
  });
  it("un trajet sans prix est compté à part dans les totaux", () => {
    const sansPrix = { ...t, id: "y", prix_litre: null } as TrajetV1;
    expect(totaux([t, sansPrix])).toEqual({ trajets: 2, km: 149.8, euros: 11.45, sansPrix: 1 });
  });
});

describe("bruit du GPS à l'arrêt : ni km, ni litres, ni vitesse (audit lot 1, MEDIUM 3)", () => {
  const l = lire(gpxImmobile);
  const k = 774; // dernier point roulé ; ensuite 660 points garés à ±2 m
  const pts = enPoints(l);
  it("tracé réel puis 10 min garé à ±2 m : les km et les litres ne bougent plus", () => {
    const roule = enDirect(pts.slice(0, k + 1), [], l[0].t, l[k].t, CLIO, false);
    const gare = enDirect(pts.slice(0, 1300), [], l[0].t, l[1299].t, CLIO, false);
    expect(gare.km - roule.km).toBeLessThan(0.001); // avant : +1,1 km (4,0 → 5,1)
    expect(gare.litres - roule.litres).toBeLessThan(0.0005);
  });
  it("garé : 0 km/h affiché à chaque position (avant : 5 à 10 km/h)", () => {
    for (let i = k + 15; i < 1300; i += 7) expect(enDirect(pts.slice(0, i + 1), [], l[0].t, l[i].t, CLIO, false).vitesse).toBe(0);
  });
  it("tremblement de ±2 m pendant 9 min sur place, sans rien avant : 0 km, 0 L", () => {
    const [la, lo] = [43.9289, 2.1464];
    const bruit: PointRoule[] = [];
    for (let i = 0; i < 540; i++) {
      const [a, b] = decaler(la, lo, 2 * Math.sin(i * 1.7), 2 * Math.cos(i * 2.3));
      bruit.push([i * 1000, a, b, 0]);
    }
    const r = calculLocal(bruit, [], CLIO, 0, 539_000);
    expect(r.km).toBe(0);
    expect(r.litres).toBe(0);
    expect(r.accelerations).toBe(0);
  });
  it("précision rapportée de 20 m : des sauts de 15 m ne comptent pas", () => {
    const [la, lo] = [43.9289, 2.1464];
    const pts2: PointRoule[] = [];
    for (let i = 0; i < 120; i++) {
      const [a, b] = decaler(la, lo, i % 2 ? 15 : 0, 0);
      pts2.push([i * 1000, a, b, 0, null, null, 20]);
    }
    expect(calculLocal(pts2, [], CLIO, 0, 119_000).km).toBe(0);
  });
  it("vitesse GPS (Doppler) sous 3 km/h : un saut de 40 m n'est pas compté", () => {
    const [la, lo] = [43.9289, 2.1464];
    const [a, b] = decaler(la, lo, 40, 0);
    const pts3: PointRoule[] = [[0, la, lo, 0, null, 0], [1000, la, lo, 0, null, 0], [2000, a, b, 0, null, 0.4], [3000, la, lo, 0, null, 0]];
    expect(calculLocal(pts3, [], CLIO, 0, 3000).km).toBe(0);
  });
  it("en bouchon, à 5 km/h : la distance réelle est comptée (à moins du seuil près)", () => {
    const [la, lo] = [43.9289, 2.1464];
    const lent: PointRoule[] = [];
    for (let i = 0; i <= 120; i++) {
      const [a, b] = decaler(la, lo, (5 / 3.6) * i, 0);
      lent.push([i * 1000, a, b, 0]);
    }
    const r = calculLocal(lent, [], CLIO, 0, 120_000);
    expect(Math.abs(r.km * 1000 - (5 / 3.6) * 120)).toBeLessThan(BRUIT_MIN_M);
    expect(enDirect(lent, [], 0, 120_000, CLIO, false).vitesse).toBe(5);
  });
  it("sur route, chaque pas compte comme avant : 77 km du départ à l’arrivée à 60 m près (round 3 : 51 m, 0,07 %)", () => {
    const a = lire(gpxRouteAB);
    const long = a.slice(1).reduce((s, p, i) => s + distanceM(a[i], p), 0);
    expect(Math.abs(calculLocal(enPoints(a), [], CLIO, a[0].t, a[a.length - 1].t).km * 1000 - long)).toBeLessThan(60);
    // au-dessus de 40 km/h, un relevé d'une seconde dépasse 10 m : le pas est compté comme avant le filtre (2 exceptions sur
    // ~2 500 : vitesse lissée sur 3 pas encore au-dessus de 40 km/h en plein freinage)
    const vite = pasDe(enPoints(a)).filter((p) => p.v > 40 && p.dt <= 1.5);
    expect(vite.length).toBeGreaterThan(2000);
    expect(vite.filter((p) => p.d === 0).length).toBeLessThanOrEqual(2);
  });
});

describe("vitesse après « Reprendre » (audit lot 1, LOW 7)", () => {
  it("0 km/h tant que le nouveau segment n'a pas son premier pas, pas la vitesse d'avant la pause", () => {
    const l = lire(gpxRouteAB).slice(1000, 1100); // A68, ~100 km/h
    let e: EtatPoints = { points: [], pauses: [], enPause: false, segment: 0 };
    for (let i = 0; i < 50; i++) e = ajouterPosition(e, l[i].t, l[i].lat, l[i].lon);
    expect(enDirect(e.points, e.pauses, l[0].t, l[49].t, CLIO, false).vitesse).toBeGreaterThan(60);
    e = basculerPause(e, l[49].t + 1000);
    e = basculerPause(e, l[49].t + 60_000);
    e = ajouterPosition(e, l[49].t + 61_000, l[49].lat, l[49].lon);
    expect(enDirect(e.points, e.pauses, l[0].t, l[49].t + 61_500, CLIO, false).vitesse).toBe(0);
  });
});

describe("courbe de conso lissée sur 500 m : pointe bornée, moyenne = litres ÷ km × 100 (audit lot 2, MEDIUM 4)", () => {
  it("le lissage ne fait que déplacer les litres : somme conservée", () => {
    const c = [6, 6, 6, 100.2, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6];
    const s = lisserConsos(c, 50);
    expect(s.reduce((x, y) => x + y, 0)).toBeCloseTo(c.reduce((x, y) => x + y, 0), 9);
    expect(Math.max(...s)).toBeLessThan(20); // 100,2 réparti sur les tranches à moins de 250 m
  });
  it("tranches de 250 m ou plus (long trajet) : rien à lisser", () => expect(lisserConsos([1, 50, 1], 300)).toEqual([1, 50, 1]));
  it("démarrage brutal (0 → 70 km/h en une seconde, saut de rejeu) : pointe sous 30 L/100, moyenne exacte à 0,1 près", () => {
    const a = lire(gpxRouteAB).slice(0, 900);
    const pts = enPoints(a);
    // artefact du rejeu signalé (V-4.6-02 à 100,2 L/100) : l'horloge réelle reprend, la position fait un bond de 20 m en 1 s
    const i = 400;
    const [la, lo] = decaler(pts[i][1], pts[i][2], 20, 0);
    pts[i] = [pts[i][0], la, lo, 0];
    const r = calculLocal(pts, [], CLIO, a[0].t, a[a.length - 1].t);
    const moy = r.consos.reduce((s, x) => s + x, 0) / r.consos.length;
    expect(Math.abs(moy - r.l100)).toBeLessThan(0.1);
    expect(r.conso_max).toBeLessThan(30);
    expect(r.conso_max).toBe(Math.max(...r.consos));
  });
  it("trajet de test A → B : moyenne de la courbe = litres ÷ km × 100 à 0,1 près, pointe plausible", () => {
    const a = lire(gpxRouteAB);
    const r = calculLocal(enPoints(a), [], CLIO, a[0].t, a[a.length - 1].t);
    expect(Math.abs(r.consos.reduce((s, x) => s + x, 0) / r.consos.length - (r.litres / r.km) * 100)).toBeLessThan(0.1);
    expect(r.conso_max).toBeLessThan(25);
  });
});
