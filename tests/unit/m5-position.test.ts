// Jalon 5 (correctif r1b) : pendant un trajet, l'onglet Stations part de la dernière position enregistrée.
import { describe, expect, it } from "vitest";
import { positionCourante, type Position } from "../../src/lib/position";

const lancement: Position = { lat: 43.9283, lon: 2.1459, label: "Ma position", source: "gps" };

describe("positionCourante", () => {
  it("sans trajet : la position lue au lancement", () => {
    expect(positionCourante(undefined, lancement)).toBe(lancement);
    expect(positionCourante([], lancement)).toBe(lancement);
    expect(positionCourante(undefined, null)).toBeNull();
  });
  it("pendant un trajet : le dernier point enregistré (A68, 21 km après le départ)", () => {
    const points = [
      [1_000, 43.9283, 2.1459, 0],
      [2_000, 43.7801, 1.9532, 0],
    ];
    expect(positionCourante(points, lancement)).toEqual({ lat: 43.7801, lon: 1.9532, label: "Ma position", source: "gps" });
  });
  it("pendant un trajet sans position de lancement (localisation lente) : le dernier point quand même", () => {
    expect(positionCourante([[1_000, 44.0176, 1.355, 0]], null)).toMatchObject({ lat: 44.0176, lon: 1.355, source: "gps" });
  });
});
