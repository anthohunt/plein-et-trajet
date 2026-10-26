// Le départ pré-rempli par le GPS prend le CENTRE de la commune (vrai géocodeur IGN, sans bouchon),
// la même position que « Montpellier » choisi dans les propositions : le cache des péages est partagé.
import { describe, expect, it } from "vitest";
import { communeDuLieu, suggererLieux } from "../../src/lib/geocodage";

describe("commune d'une position GPS", () => {
  it("un point en périphérie de Montpellier → Montpellier, au centre de la commune (pas les coordonnées exactes)", async () => {
    const l = await communeDuLieu(43.6045, 3.9193);
    expect(l?.label).toBe("Montpellier");
    const ville = (await suggererLieux("Montpellier")).find((s) => s.label === "Montpellier" && s.contexte.startsWith("34"));
    expect(ville).toBeTruthy();
    expect(l?.lat).toBeCloseTo(ville!.lat, 5);
    expect(l?.lon).toBeCloseTo(ville!.lon, 5);
    expect(Math.abs((l?.lon ?? 0) - 3.9193)).toBeGreaterThan(0.005); // ce ne sont pas les coordonnées du GPS
  }, 20_000);
  it("deux positions différentes dans Montpellier → la même clé de cache (arrondi au millième)", async () => {
    const a = await communeDuLieu(43.6045, 3.9193);
    const b = await communeDuLieu(43.619, 3.853);
    expect(`${a?.lat.toFixed(3)},${a?.lon.toFixed(3)}`).toBe(`${b?.lat.toFixed(3)},${b?.lon.toFixed(3)}`);
  }, 20_000);
});
