import { describe, expect, it } from "vitest";
import { coutTotal, repartirCouts, type MoyennePays, type PaysTraverse } from "../../src/lib/pays";

const m = (pays: string, prix: number, source = "bulletin"): [string, MoyennePays] => [pays, { pays, prix_moyen: prix, source, jour: "2026-10-12" }];
const pays: PaysTraverse[] = [
  { code: "FR", nom: "France", km: 664.3, litres: 36.982 },
  { code: "IT", nom: "Italie", km: 286.1, litres: 15.634 },
];

describe("coût carburant par pays traversé", () => {
  const moy = new Map([m("FR", 2.367, "flux"), m("IT", 2.049)]);
  it("litres × prix moyen du jour du pays ; la somme des coûts pays égale le coût carburant", () => {
    const r = repartirCouts(pays, moy, null);
    expect(r.lignes.map((l) => l.cout)).toEqual([87.54, 32.03]);
    expect(r.carburant).toBe(119.57);
    expect(r.lignes.reduce((s, l) => s + (l.cout as number), 0)).toBeCloseTo(r.carburant as number, 10);
    expect(r.lignes.map((l) => l.source)).toEqual(["flux", "bulletin"]);
  });
  it("pays absent des moyennes (Serbie) : moyenne européenne appliquée et signalée", () => {
    const r = repartirCouts([...pays, { code: "RS", nom: "Serbie", km: 114.6, litres: 4.628 }], new Map([...moy, m("EU", 1.85)]), null);
    const rs = r.lignes[2];
    expect(rs.source).toBe("ue");
    expect(rs.prix).toBe(1.85);
    expect(rs.cout).toBe(8.56);
    expect(r.carburant).toBe(128.13);
  });
  it("prix perso : appliqué à tous les pays", () => {
    const r = repartirCouts(pays, moy, 1.699);
    expect(r.lignes.every((l) => l.prix === 1.699 && l.source === "perso")).toBe(true);
    expect(r.carburant).toBe(Math.round(36.982 * 1.699 * 100) / 100 + Math.round(15.634 * 1.699 * 100) / 100);
  });
  it("aucune moyenne connue : pas de coût (jamais un zéro)", () => {
    const r = repartirCouts(pays, new Map(), null);
    expect(r.carburant).toBeNull();
    expect(r.lignes[0].source).toBe("absent");
  });
  it("trajet 100 % France : même coût qu'avant le jalon 3", () => {
    const r = repartirCouts([{ code: "FR", nom: "France", km: 312, litres: 14.112 }], new Map([m("FR", 2.2, "flux")]), null);
    expect(r.carburant).toBe(Math.round(14.112 * 2.2 * 100) / 100);
  });
});

describe("coût total = carburant + péages", () => {
  it("péages établis : ajoutés ; indisponibles : non ajoutés", () => {
    expect(coutTotal(100, { etat: "ok", total: 20.5 })).toBe(120.5);
    expect(coutTotal(100, { etat: "indisponible", total: 0 })).toBe(100);
    expect(coutTotal(null, { etat: "ok", total: 20 })).toBeNull();
    expect(coutTotal(100, { etat: "ok", total: 0 })).toBe(100);
  });
});
