import { describe, expect, it } from "vitest";
import { PASSAGES_MAX, RAYON_PASSAGE_M, pointsDePassage, requeteHere, requetePtv } from "../../supabase/functions/_shared/peages";

// tracé rectiligne nord-sud : 1° de latitude ≈ 111,2 km
const ligne = (degres: number, n = 200) => Array.from({ length: n + 1 }, (_, i) => ({ lat: 43 + (degres * i) / n, lon: 2 }));
const kmLat = (a: { lat: number }, b: { lat: number }) => Math.abs(b.lat - a.lat) * 111.195;

describe("Péages sur le tracé affiché : points de passage échantillonnés (audit round 2, HIGH 1)", () => {
  it("trajet court (< 25 km) : aucun point de passage, la requête reste départ → arrivée", () => {
    expect(pointsDePassage(ligne(0.2))).toEqual([]);
    expect(pointsDePassage([{ lat: 43, lon: 2 }])).toEqual([]);
  });
  it("un point tous les 25 km au plus serré, régulièrement espacés, départ et arrivée exclus", () => {
    const t = ligne(2); // ≈ 222 km → 8 points, espacés de ≈ 24,7 km
    const p = pointsDePassage(t);
    expect(p).toHaveLength(8);
    const pas = 222.39 / 9;
    p.forEach((x, i) => expect(kmLat(t[0], x)).toBeCloseTo(pas * (i + 1), 0));
    expect(p[0].lat).toBeGreaterThan(t[0].lat);
    expect(p.at(-1)!.lat).toBeLessThan(t.at(-1)!.lat);
  });
  it("long trajet : plafonné à 23 points (PTV : 25 waypoints au plus, départ et arrivée compris)", () => {
    const p = pointsDePassage(ligne(16)); // ≈ 1 780 km
    expect(PASSAGES_MAX).toBe(23);
    expect(p).toHaveLength(23);
    for (let i = 1; i < p.length; i++) expect(kmLat(p[i - 1], p[i])).toBeCloseTo(1779.1 / 24, 0);
  });
  it("les points sont SUR le tracé (interpolés sur le segment), même quand le tracé tourne", () => {
    const coude = [...Array.from({ length: 51 }, (_, i) => ({ lat: 43 + i * 0.01, lon: 2 })), ...Array.from({ length: 50 }, (_, i) => ({ lat: 43.5, lon: 2 + (i + 1) * 0.0138 }))];
    for (const x of pointsDePassage(coude, 23, 5)) expect(x.lon === 2 || Math.abs(x.lat - 43.5) < 1e-9).toBe(true);
  });
  it("requête PTV : waypoints départ, passages `lat,lon;radius=500`, arrivée — 25 au plus", () => {
    const q = requetePtv({ lat: 1, lon: 2 }, { lat: 3, lon: 4 }, pointsDePassage(ligne(16)));
    const w = q.getAll("waypoints");
    expect(w).toHaveLength(25);
    expect(w[0]).toBe("1,2");
    expect(w.at(-1)).toBe("3,4");
    expect(w.slice(1, -1).every((x) => x.endsWith(`;radius=${RAYON_PASSAGE_M}`))).toBe(true);
    expect(q.get("results")).toBe("TOLL_COSTS,TOLL_SECTIONS,TOLL_SYSTEMS");
  });
  it("requête HERE : `via=lat,lon!passThrough=true` pour chaque passage, dans l'ordre", () => {
    const p = [{ lat: 43.6, lon: 1.44 }, { lat: 43.2, lon: 2.35 }];
    const q = requeteHere("k", { lat: 43.9, lon: 2.1 }, { lat: 41.4, lon: 2.2 }, p);
    expect(q.getAll("via")).toEqual(["43.6,1.44!passThrough=true", "43.2,2.35!passThrough=true"]);
    expect(q.get("origin")).toBe("43.9,2.1");
  });
});
