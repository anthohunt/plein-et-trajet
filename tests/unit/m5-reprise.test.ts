// Jalon 5 (correctif r1b, vu en exploration V-3.E1-06) : après une pause ou une alerte d'immobilité, « Reprendre » n'affiche
// pas « GPS perdu » en attendant la position suivante — les positions reçues pendant la pause ne sont pas gardées.
import { describe, expect, it } from "vitest";
import { basculerPause, enDirect, type EtatPoints, type VehiculeRoule } from "../../supabase/functions/_shared/roule.ts";
import { consoParPhase } from "../../supabase/functions/_shared/conso-eea.ts";

const CLIO: VehiculeRoule = { masse_kg: 1165, carburant: "SP95-E10", conso: consoParPhase(6.128, "SP95-E10", 1165, 87) };
const T0 = 1_000_000;
const etat: EtatPoints = {
  points: [
    [T0, 43.9283, 2.1459, 0],
    [T0 + 1000, 43.9284, 2.146, 0],
  ],
  pauses: [],
  enPause: false,
  segment: 0,
};

describe("GPS perdu après une reprise", () => {
  it("pause de 20 min puis Reprendre : pas de « GPS perdu » pendant 15 s", () => {
    const pause = basculerPause(etat, T0 + 2000);
    const repris = basculerPause(pause, T0 + 2000 + 20 * 60_000);
    const t = T0 + 2000 + 20 * 60_000;
    expect(enDirect(repris.points, repris.pauses, T0, t + 1000, CLIO, false).gpsPerdu).toBe(false);
    expect(enDirect(repris.points, repris.pauses, T0, t + 15_000, CLIO, false).gpsPerdu).toBe(false);
    // toujours aucune position 16 s après la reprise : là, le GPS est vraiment perdu
    expect(enDirect(repris.points, repris.pauses, T0, t + 16_000, CLIO, false).gpsPerdu).toBe(true);
  });
  it("sans pause, la règle reste celle de la dernière position (15 s)", () => {
    expect(enDirect(etat.points, [], T0, T0 + 1000 + 15_000, CLIO, false).gpsPerdu).toBe(false);
    expect(enDirect(etat.points, [], T0, T0 + 1000 + 16_000, CLIO, false).gpsPerdu).toBe(true);
  });
  it("en pause, jamais « GPS perdu »", () => {
    const pause = basculerPause(etat, T0 + 2000);
    expect(enDirect(pause.points, pause.pauses, T0, T0 + 60 * 60_000, CLIO, true).gpsPerdu).toBe(false);
  });
});
