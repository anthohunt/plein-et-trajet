// Jalon 5 (T5.1) — consommation officielle (Fc → Ewltp → Enedc × 1,21) et répartition par phase WLTC (road-load + Willans).
// Contrôle sur les VRAIES phases mesurées de la base ADEME (tests/fixtures/ademe-phases.json, table `vehicules`, 21/10/2026).
import { describe, expect, it } from "vitest";
import { consoOfficielle, consoParPhase, moyennePonderee } from "../../supabase/functions/_shared/conso-eea.ts";
import type { Carburant } from "../../supabase/functions/_shared/modele.ts";

interface Ademe {
  energie: string;
  carburant: Carburant;
  masse_kg: number;
  puissance_kw: number;
  conso_basse: number;
  conso_moyenne: number;
  conso_haute: number;
  conso_tres_haute: number;
}
import fixtureAdeme from "../fixtures/ademe-phases.json";
const ademe = ((fixtureAdeme as { lignes: Ademe[] }).lignes).filter((r) => r.energie === "ESSENCE" || r.energie === "GAZOLE");

describe("consommation officielle combinée", () => {
  it("Fc d'abord (WLTP 2021+)", () => expect(consoOfficielle({ carburant: "SP95-E10", fc: 5.3, ewltp: 120, enedc: 100 })).toEqual({ l100: 5.3, procedure: "WLTP" }));
  it("puis Ewltp ÷ 23,3 (essence) ou ÷ 26,4 (gazole)", () => {
    expect(consoOfficielle({ carburant: "SP95-E10", ewltp: 116.5 })!.l100).toBeCloseTo(5, 6);
    expect(consoOfficielle({ carburant: "Gazole", ewltp: 132 })!.l100).toBeCloseTo(5, 6);
  });
  it("puis Enedc × 1,21 : Clio 5RBU0C 118 g/km → 6,1 L/100 km", () => {
    const c = consoOfficielle({ carburant: "SP95-E10", enedc: 118 })!;
    expect(c.procedure).toBe("NEDC");
    expect(c.l100).toBeCloseTo(6.128, 3);
  });
  it("rien d'utilisable → null", () => expect(consoOfficielle({ carburant: "SP95-E10" })).toBeNull());
});

describe("répartition par phase", () => {
  it("la moyenne pondérée des phases retombe sur la consommation officielle (à 0,1 L/100 km près — ici à 0,001)", () => {
    for (const [l, c, m, kw] of [[6.128, "SP95-E10", 1165, 87], [3.896, "Gazole", 1165, 55], [5.3, "SP95-E10", 1165, 74], [9.8, "SP95-E10", 2100, 250], [7.1, "Gazole", 2400, 140]] as const) {
      expect(Math.abs(moyennePonderee(consoParPhase(l, c, m, kw)) - l)).toBeLessThan(0.002);
    }
  });
  it("forme : la phase basse consomme le plus, la haute le moins (Clio 2017)", () => {
    const p = consoParPhase(6.128, "SP95-E10", 1165, 87);
    expect(p.basse).toBeGreaterThan(p.tres_haute);
    expect(p.tres_haute).toBeGreaterThan(p.haute);
    expect(p.moyenne).toBeGreaterThan(p.haute);
  });
  it(`phases ADEME mesurées (${ademe.length} versions thermiques) : écart médian ≤ 0,5 L/100 km sur chaque phase`, () => {
    const ecarts: number[][] = [[], [], [], []];
    let toutesSous05 = 0;
    for (const r of ademe) {
      const vraies = [r.conso_basse, r.conso_moyenne, r.conso_haute, r.conso_tres_haute];
      const officielle = moyennePonderee({ basse: vraies[0], moyenne: vraies[1], haute: vraies[2], tres_haute: vraies[3] });
      const p = consoParPhase(officielle, r.carburant, r.masse_kg, r.puissance_kw);
      const e = [p.basse, p.moyenne, p.haute, p.tres_haute].map((x, i) => Math.abs(x - vraies[i]));
      e.forEach((x, i) => ecarts[i].push(x));
      if (e.every((x) => x <= 0.5)) toutesSous05++;
    }
    const mediane = (a: number[]) => a.slice().sort((x, y) => x - y)[Math.floor(a.length / 2)];
    const med = ecarts.map(mediane);
    for (const m of med) expect(m).toBeLessThanOrEqual(0.5);
    // mesuré le 21/10 : médianes ≈ 0,4 / 0,2 / 0,1 / 0,2 ; 62 % des versions ont leurs 4 phases à ≤ 0,5 L/100 km — la phase basse
    // (stop & start, boîte) est la plus dispersée : ce n'est PAS « ≤ 0,5 sur chaque version » (écart déclaré au journal)
    expect(toutesSous05 / ademe.length).toBeGreaterThan(0.55);
    console.log("médianes", med.map((x) => x.toFixed(2)).join(" / "), "· toutes phases ≤ 0,5 :", ((toutesSous05 / ademe.length) * 100).toFixed(1), "%");
  });
});
