// R6 (streamline R2) : le départ pré-rempli par le GPS prend le CENTRE de la commune (vrai géocodeur IGN, sans bouchon),
// la même position que « Albi » choisi dans les propositions : le cache des péages est partagé.
import { describe, expect, it } from "vitest";
import { communeDuLieu, suggererLieux } from "../../src/lib/geocodage";

describe("commune d'une position GPS", () => {
  it("place Sainte-Claire à Albi → Albi, au centre de la commune (pas les coordonnées exactes)", async () => {
    const l = await communeDuLieu(43.9289, 2.1464);
    expect(l?.label).toBe("Albi");
    const albi = (await suggererLieux("Albi")).find((s) => s.label === "Albi" && s.contexte.startsWith("81"));
    expect(albi).toBeTruthy();
    expect(l?.lat).toBeCloseTo(albi!.lat, 5);
    expect(l?.lon).toBeCloseTo(albi!.lon, 5);
    expect(Math.abs((l?.lon ?? 0) - 2.1464)).toBeGreaterThan(0.005); // ce ne sont pas les coordonnées du GPS
  }, 20_000);
  it("deux positions différentes dans Albi → la même clé de cache (arrondi au millième)", async () => {
    const a = await communeDuLieu(43.9289, 2.1464);
    const b = await communeDuLieu(43.9245, 2.1531);
    expect(`${a?.lat.toFixed(3)},${a?.lon.toFixed(3)}`).toBe(`${b?.lat.toFixed(3)},${b?.lon.toFixed(3)}`);
  }, 20_000);
});
