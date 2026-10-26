import { describe, expect, it } from "vitest";
import {
  consoTroncon,
  decouperTroncons,
  deniveleParEtape,
  echantillonner,
  kwhEnLitres,
  litresArrets,
  litresDenivele,
  phaseDepuisVitesse,
  synthese,
  typeDeLEtape,
  type Etape,
  type VehiculeModele,
} from "../../supabase/functions/_shared/modele";

const essence: VehiculeModele = { masse_kg: 1090, carburant: "SP95-E10", conso: { basse: 6.5, moyenne: 5.0, haute: 4.6, tres_haute: 5.5 } };
const gazole: VehiculeModele = { masse_kg: 1090, carburant: "Gazole", conso: { basse: 4.7, moyenne: 3.9, haute: 3.6, tres_haute: 4.5 } };

describe("phase WLTP choisie par la vitesse typique", () => {
  it.each([
    [10, "basse"],
    [39.9, "basse"],
    [40, "moyenne"],
    [64.9, "moyenne"],
    [65, "haute"],
    [100, "haute"],
    [100.1, "tres_haute"],
    [130, "tres_haute"],
  ])("%s km/h → %s", (v, phase) => expect(phaseDepuisVitesse(v)).toBe(phase));
});

describe("énergie → litres", () => {
  it("1 kWh mécanique = 1/(0,25×8,9) L en essence, 1/(0,30×9,9) L en gazole", () => {
    expect(kwhEnLitres(1, "SP95-E10")).toBeCloseTo(1 / (0.25 * 8.9), 6);
    expect(kwhEnLitres(1, "Gazole")).toBeCloseTo(1 / (0.3 * 9.9), 6);
  });
  it("un arrêt à 50 km/h pour 1 090 kg + 75 kg de conducteur : ½·m·v²", () => {
    const v = 50 / 3.6;
    const kwh = (0.5 * (1090 + 75) * v * v) / 3.6e6;
    expect(litresArrets(1090, 50, 1, "SP95-E10")).toBeCloseTo(kwh / 0.25 / 8.9, 8);
    expect(litresArrets(1090, 50, 10, "SP95-E10")).toBeCloseTo(10 * litresArrets(1090, 50, 1, "SP95-E10"), 8);
  });
  it("aucun arrêt ou vitesse nulle → 0 L", () => {
    expect(litresArrets(1090, 50, 0, "SP95-E10")).toBe(0);
    expect(litresArrets(1090, 0, 5, "SP95-E10")).toBe(0);
  });
  it("monter 100 m avec 1 090 kg + 75 kg : m·g·Δh", () => {
    const kwh = (1165 * 9.81 * 100) / 3.6e6;
    expect(litresDenivele(1090, 100, "SP95-E10")).toBeCloseTo(kwh / 0.25 / 8.9, 8);
    expect(litresDenivele(1090, 0, "SP95-E10")).toBe(0);
    expect(litresDenivele(1090, -50, "SP95-E10")).toBe(0);
  });
  it("le gazole rend plus que l'essence pour la même énergie", () => {
    expect(litresDenivele(1090, 300, "Gazole")).toBeLessThan(litresDenivele(1090, 300, "SP95-E10"));
  });
});

describe("consommation d'un tronçon", () => {
  it("à 118 km/h : phase très haute, base = L/100 × km / 100", () => {
    const r = consoTroncon({ km: 200, vitesse_kmh: 118, arrets: 0, denivele_m: 0 }, essence);
    expect(r.phase).toBe("tres_haute");
    expect(r.litres_base).toBeCloseTo(11, 6);
    expect(r.litres).toBeCloseTo(11, 6);
    expect(r.l100).toBeCloseTo(5.5, 6);
  });
  it("à 28 km/h avec arrêts et dénivelé : la base basse + arrêts + dénivelé", () => {
    const r = consoTroncon({ km: 10, vitesse_kmh: 28, arrets: 20, denivele_m: 50 }, essence);
    expect(r.phase).toBe("basse");
    expect(r.litres).toBeCloseTo(0.65 + litresArrets(1090, 28, 20, "SP95-E10") + litresDenivele(1090, 50, "SP95-E10"), 8);
    expect(r.l100).toBeCloseTo((r.litres / 10) * 100, 8);
  });
  it("un tronçon de 0 km ne produit pas de NaN", () => {
    expect(consoTroncon({ km: 0, vitesse_kmh: 0, arrets: 0, denivele_m: 0 }, gazole).l100).toBe(0);
  });
});

const etape = (p: Partial<Etape>): Etape => ({ distance_m: 1000, duree_s: 36, numero: "", manoeuvre: "fork", denivele_m: 0, ...p });

describe("découpage en tronçons", () => {
  it("classe les étapes : autoroute (numéro A…), route, ville (< 50 km/h), montée (pente ≥ 2,5 %)", () => {
    expect(typeDeLEtape(etape({ numero: "A68", distance_m: 5000, duree_s: 160 }))).toBe("autoroute");
    expect(typeDeLEtape(etape({ numero: "N88", distance_m: 5000, duree_s: 225 }))).toBe("route");
    expect(typeDeLEtape(etape({ numero: "", distance_m: 400, duree_s: 90 }))).toBe("ville");
    expect(typeDeLEtape(etape({ numero: "D988", distance_m: 2000, duree_s: 100, denivele_m: 80 }))).toBe("montee");
    expect(typeDeLEtape(etape({ numero: "D988", distance_m: 2000, duree_s: 100, denivele_m: 20 }))).toBe("route");
  });
  it("une voie rapide sans numéro A, ≥ 105 km/h sur ≥ 2 km, est une autoroute", () => {
    expect(typeDeLEtape(etape({ numero: "N88", distance_m: 6000, duree_s: 190 }))).toBe("autoroute");
  });
  it("regroupe par type, compte les arrêts hors autoroute, additionne le dénivelé", () => {
    const etapes: Etape[] = [
      etape({ numero: "A68", distance_m: 100_000, duree_s: 3200, manoeuvre: "turn" }), // aucun arrêt sur autoroute
      etape({ numero: "A68", distance_m: 100_000, duree_s: 3200, denivele_m: 300 }),
      etape({ numero: "", distance_m: 300, duree_s: 60, manoeuvre: "turn" }),
      etape({ numero: "", distance_m: 300, duree_s: 60, manoeuvre: "end of road" }),
      etape({ numero: "", distance_m: 300, duree_s: 60, manoeuvre: "fork" }),
    ];
    const t = decouperTroncons(etapes, essence);
    expect(t.map((x) => x.type)).toEqual(["autoroute", "ville"]);
    expect(t[0].km).toBe(200);
    expect(t[0].arrets).toBe(0);
    expect(t[0].denivele_m).toBe(300);
    expect(t[0].vitesse_kmh).toBe(113); // 200 km en 6 400 s = 112,5 km/h
    expect(t[0].voies).toEqual(["A68"]);
    expect(t[1].arrets).toBe(2);
    expect(t[1].vitesse_kmh).toBe(18);
  });
  it("la somme des litres des tronçons = litres de la synthèse ; L/100 = litres / km", () => {
    const etapes: Etape[] = [
      etape({ numero: "A62", distance_m: 250_000, duree_s: 7800 }),
      etape({ numero: "N88", distance_m: 30_000, duree_s: 1350, manoeuvre: "roundabout" }),
      etape({ numero: "", distance_m: 8_000, duree_s: 1000, manoeuvre: "turn" }),
    ];
    const t = decouperTroncons(etapes, gazole);
    const s = synthese(t);
    expect(s.litres).toBeCloseTo(t.reduce((a, x) => a + x.litres, 0), 1);
    expect(s.km).toBeCloseTo(288, 1);
    expect(s.l100).toBeCloseTo((s.litres / s.km) * 100, 1);
    expect(s.l100).toBeGreaterThan(3.5);
    expect(s.l100).toBeLessThan(5.5);
  });
  it("aucune étape → aucun tronçon", () => {
    expect(decouperTroncons([], essence)).toEqual([]);
    expect(synthese([])).toEqual({ km: 0, litres: 0, l100: 0, duree_min: 0 });
  });
});

describe("altimétrie : échantillons et dénivelé par étape", () => {
  const ligne = (lon0: number, lon1: number) => [
    { lon: lon0, lat: 44 },
    { lon: lon1, lat: 44 },
  ];
  it("un point tous les 500 m le long du tracé, plus l'arrivée", () => {
    // 0,02° de longitude à 44° ≈ 1 600 m
    const e = echantillonner([ligne(2, 2.02)], 500);
    expect(e.length).toBe(5); // 0, 500, 1000, 1500 + arrivée
    expect(e[0].lon).toBe(2);
    expect(e[e.length - 1].lon).toBe(2.02);
  });
  it("le dénivelé ne compte que les montées, rattachées à l'étape du point", () => {
    const e = [
      { lon: 0, lat: 0, etape: 0 },
      { lon: 0, lat: 0, etape: 0 },
      { lon: 0, lat: 0, etape: 1 },
      { lon: 0, lat: 0, etape: 1 },
      { lon: 0, lat: 0, etape: 1 },
    ];
    const d = deniveleParEtape(e, [100, 130, 120, 150, null], 2);
    expect(d[0]).toBe(30); // 100 → 130
    expect(d[1]).toBe(30); // 120 → 150 ; la descente 130 → 120 ne compte pas ; null ignoré
  });
  it("sans altitude, dénivelé nul", () => {
    expect(deniveleParEtape([{ lon: 0, lat: 0, etape: 0 }], [null], 1)).toEqual([0]);
  });
});
