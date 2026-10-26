// Jalon 6, round 3 (audit r2, problème 1, reclassé HIGH par la contre-évaluation) : deux horloges dans un même curseur.
// Le service natif date un relevé par l'heure du GNSS et, au round 2, un bouton de la notification par l'horloge du téléphone ;
// la page jetait toute ligne datée avant la dernière appliquée. L'heure automatique d'Android ne corrige l'horloge qu'au-delà de
// 2 s d'écart (AOSP config_timeDetectorAutoUpdateDiffMillis = 2000) : un téléphone en retard de 1,5 s perdait chaque Pause de la
// notification, un téléphone en avance perdait les relevés qui suivent un bouton.
// Correction : chaque ligne porte son numéro dans le journal (l'ordre ne dépend plus d'aucune horloge) et le service date un bouton
// sur l'horloge des relevés (JournalTrajet.heureBouton, testé en Java : android/app/src/test/…/JournalTrajetTest.java).
import { describe, expect, it } from "vitest";
import { calculLocal, type VehiculeRoule } from "../../supabase/functions/_shared/roule.ts";
import { consoParPhase } from "../../supabase/functions/_shared/conso-eea.ts";
import { appliquerEntree, lireJournal, type EtatJournal } from "../../src/lib/enregistreur-web";

const CLIO: VehiculeRoule = { masse_kg: 1165, carburant: "SP95-E10", conso: consoParPhase(6.128, "SP95-E10", 1165, 87) };
const T0 = 1_792_600_000_000; // heure GNSS du premier relevé
// une voiture à 108 km/h vers le nord : 30 m par seconde, un relevé par seconde
const P = (k: number, t = T0 + k * 1000) => `P;${t};${(43.9 + k * 0.00027).toFixed(7)};2.1500000;170.0;108.00;5.0`;
const A = (t: number, action: string) => `A;${t};${action}`;
const vide = (): EtatJournal => ({ points: [], pauses: [], enPause: false, segment: 0, immobile: null, ignorerAvant: -Infinity });
const rejouer = (texte: string, e = vide(), premier = 1) => lireJournal(texte, premier).reduce((s, x) => appliquerEntree(s, x), e);
const km = (e: EtatJournal) => calculLocal(e.points, e.pauses.map(([a, b]) => [a, b ?? a] as [number, number]), CLIO, T0, T0 + 3600_000).km;
const lignes = (...l: string[]) => l.join("\n") + "\n";
// datation d'un bouton par le service du round 3 (JournalTrajet.heureBouton) : heure du téléphone + écart GNSS du dernier relevé
const heureBouton = (telephone: number, ecart: number, dernier: number) => Math.max(telephone + ecart, dernier + 1);
const releves = (de: number, a: number, decalage = 0) => Array.from({ length: a - de + 1 }, (_, i) => P(de + i, T0 + (de + i) * 1000 + decalage));

describe("deux horloges : boutons de la notification et relevés GNSS (audit r2, problème 1)", () => {
  it("téléphone en retard de 1,5 s : un bouton Pause daté AVANT le dernier relevé prend quand même", () => {
    // comme au round 2 : bouton daté par l'horloge du téléphone, 0,3 s après le relevé 10 → 1,2 s avant lui sur l'horloge GNSS
    const e = rejouer(lignes(...releves(0, 10), A(T0 + 10_000 - 1500 + 300, "pause"), ...releves(11, 30)));
    expect(e.enPause).toBe(true);
    expect(e.points).toHaveLength(11); // relevés 0 à 10 ; les 20 de la pause ne comptent pas
    expect(e.pauses).toHaveLength(1);
    expect(e.pauses[0][0]).toBeGreaterThanOrEqual(e.points[10][0]); // la pause commence après le dernier point compté
    expect(km(e)).toBeCloseTo(0.3, 1);
  });

  it("relevé mesuré avant la Pause mais écrit APRÈS le bouton : il est gardé, ceux d'après ne comptent pas", () => {
    // Pause touchée 0,3 s après la mesure du relevé 11, remis par le GPS après le bouton
    const e = rejouer(lignes(...releves(0, 10), A(T0 + 11_300, "pause"), P(11), ...releves(12, 20)));
    expect(e.enPause).toBe(true);
    expect(e.points.map((p) => p[0])).toContain(T0 + 11_000);
    expect(e.points).toHaveLength(12);
  });

  it("relevé de la pause écrit après Reprendre : ignoré, la reprise ouvre un nouveau segment", () => {
    const e = rejouer(lignes(...releves(0, 10), A(T0 + 10_500, "pause"), ...releves(11, 19), A(T0 + 20_600, "reprendre"), P(20), ...releves(21, 30)));
    expect(e.enPause).toBe(false);
    const pendant = e.points.filter((p) => p[0] > e.pauses[0][0] && p[0] < (e.pauses[0][1] ?? Infinity));
    expect(pendant).toHaveLength(0);
    expect(e.points.filter((p) => p[3] === 1).map((p) => p[0])).toEqual(releves(21, 30).map((l) => Number(l.split(";")[1])));
  });

  it("chaque ligne ne compte qu'une fois : la même ligne reçue en direct puis relue dans le journal", () => {
    const texte = lignes(...releves(0, 10), A(T0 + 10_400, "pause"), ...releves(11, 15), A(T0 + 15_400, "reprendre"), ...releves(16, 20));
    const direct = lireJournal(texte).reduce((s, x) => appliquerEntree(s, x), vide());
    const deuxFois = rejouer(texte, direct);
    expect(deuxFois.pauses).toEqual(direct.pauses);
    expect(deuxFois.points).toEqual(direct.points);
  });
});

describe("relecture du journal à la réouverture de l'appli (page morte pendant la Pause et la reprise)", () => {
  // la page a appliqué les lignes 1 à 11 (relevés 0 à 10) avant d'être tuée ; le service a continué seul
  const avant = (texte: string) => rejouer(lignes(...texte.split("\n").slice(0, 11)));
  it("téléphone en retard de 1,5 s : Pause et Reprendre de la notification (boutons datés par l'horloge du téléphone, round 2)", () => {
    const d = 1500;
    const texte = lignes(...releves(0, 20), A(T0 + 20_300 - d, "pause"), ...releves(21, 40), A(T0 + 40_300 - d, "reprendre"), ...releves(41, 60));
    const e = rejouer(texte, avant(texte));
    expect(e.pauses).toHaveLength(1);
    expect(e.enPause).toBe(false);
    // 20 s roulées avant la pause, 19 après (le premier relevé de la reprise ouvre le segment) : 39 pas de 30 m
    expect(km(e)).toBeCloseTo((39 * 30.02) / 1000, 2);
  });
  for (const [nom, d] of [["en retard", 1500], ["en avance", -1500]] as const) {
    it(`téléphone ${nom} de 1,5 s, boutons datés sur l'horloge des relevés (round 3) : pause tenue, aucun relevé d'après la reprise perdu`, () => {
      // heure du téléphone = heure GNSS − d ; boutons touchés 0,3 s après la mesure des relevés 20 et 40
      const pause = heureBouton(T0 + 20_300 - d, d, T0 + 20_000);
      const reprise = heureBouton(T0 + 40_300 - d, d, T0 + 40_000);
      const texte = lignes(...releves(0, 20), A(pause, "pause"), ...releves(21, 40), A(reprise, "reprendre"), ...releves(41, 60));
      const e = rejouer(texte, avant(texte));
      expect(e.pauses).toEqual([[T0 + 20_300, T0 + 40_300]]);
      expect(e.points.filter((p) => p[0] > T0 + 40_300)).toHaveLength(20);
      expect(km(e)).toBeCloseTo((39 * 30.02) / 1000, 2);
    });
  }
  it("état gardé par une version précédente (curseur par l'heure `lu`) : les lignes déjà appliquées ne repassent pas", () => {
    const texte = lignes(...releves(0, 10), A(T0 + 10_400, "pause"), ...releves(11, 15), A(T0 + 15_400, "reprendre"), ...releves(16, 20));
    const e = rejouer(texte);
    const ancien = { ...e, ligne: undefined, lu: T0 + 20_000 };
    const relu = rejouer(texte, ancien);
    expect(relu.pauses).toEqual(e.pauses);
    expect(relu.points).toEqual(e.points);
  });
});
