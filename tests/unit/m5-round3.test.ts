// Jalon 5, round 3 — correctifs des audits du round 2 : arrêt automatique avec un GPS qui bruite au-delà de 8 m (lot 1,
// MEDIUM 2), bruit à l'arrêt jugé contre deux fois la précision (lot 1, LOW 4), trajet supprimé qui revenait (lot 2, MEDIUM 1).
import "fake-indexeddb/auto";
import gpxAlbiToulouse from "../e2e/fixtures/albi-toulouse.gpx?raw";
import { describe, expect, it } from "vitest";
import { calculLocal, enDirect, immobileDepuis, type PointRoule, type VehiculeRoule } from "../../supabase/functions/_shared/roule.ts";
import { consoParPhase } from "../../supabase/functions/_shared/conso-eea.ts";
import { garderArrete, garderCorrection, garderTrajetV1, lireArrete, lireTrajetV1, oublierArrete, supprimerTrajetV1, type TrajetV1 } from "../../src/lib/historique";
import { db } from "../../src/lib/stockage";

const CLIO: VehiculeRoule = { masse_kg: 1165, carburant: "SP95-E10", conso: consoParPhase(6.128, "SP95-E10", 1165, 87) };
const decaler = (lat: number, lon: number, n: number, e: number) => [lat + n / 111_320, lon + e / (111_320 * Math.cos((lat * Math.PI) / 180))] as const;
/** Générateur pseudo-aléatoire à graine : bruit indépendant d'un relevé à l'autre, rejouable. */
const hasard = (s: number) => () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648);
const [LA, LO] = [43.9289, 2.1464];
/** 30 s de route à 50 km/h, puis garé `dureeS` secondes : un relevé toutes les `periodeS` s, ±`bruitM` m sur chaque axe. */
function gare(graine: number, bruitM: number, precision: number, periodeS: number, dureeS: number): PointRoule[] {
  const r = hasard(graine);
  const pts: PointRoule[] = [];
  let t = 0;
  for (let i = 0; i < 30; i++, t += 1000) {
    const [a, b] = decaler(LA, LO, -(30 - i) * 13.9, 0);
    pts.push([t, a, b, 0, null, null, precision]);
  }
  for (let s = 0; s <= dureeS; s += periodeS, t += periodeS * 1000) {
    const [a, b] = decaler(LA, LO, (r() * 2 - 1) * bruitM, (r() * 2 - 1) * bruitM);
    pts.push([t, a, b, 0, null, null, precision]);
  }
  return pts;
}
const lire = (src: string) => [...src.matchAll(/<trkpt lat="([\d.-]+)" lon="([\d.-]+)"><time>([^<]+)<\/time>/g)].map((m) => ({ lat: +m[1], lon: +m[2], t: Date.parse(m[3]) }));

describe("V-3.E1 c1 : arrêt automatique avec un GPS qui bruite (audit r2 lot 1, MEDIUM 2)", () => {
  it("garé 11 min, ±10 m toutes les 5 s, précision 20 m, sans vitesse GPS : l'alerte vient (5 graines ; avant : 0 sur 5)", () => {
    for (let g = 1; g <= 5; g++) {
      const p = gare(g, 10, 20, 5, 660);
      expect(immobileDepuis(p, p[p.length - 1][0])).not.toBeNull();
    }
  });
  it("même chose à ±8 m / précision 15 m et à ±15 m / précision 30 m (avant : 0 sur 5)", () => {
    for (const [b, prec] of [[8, 15], [15, 30]])
      for (let g = 1; g <= 5; g++) {
        const p = gare(g, b, prec, 5, 660);
        expect(immobileDepuis(p, p[p.length - 1][0])).not.toBeNull();
      }
  });
  it("garé 9 min dans le même bruit : pas encore d'alerte", () => {
    const p = gare(1, 10, 20, 5, 540);
    expect(immobileDepuis(p, p[p.length - 1][0])).toBeNull();
  });
  it("sur la route Albi → Toulouse avec une précision de 20 m : jamais d'alerte", () => {
    const route = lire(gpxAlbiToulouse).map((q) => [q.t, q.lat, q.lon, 0, null, null, 20] as PointRoule);
    for (let i = 60; i < route.length; i += 30) expect(immobileDepuis(route.slice(0, i), route[i - 1][0])).toBeNull();
  });
});

describe("bruit à l'arrêt jugé sur le centre des relevés (audit r2 lot 1, LOW 4)", () => {
  it("garé 5 min, ±7 m à 1 Hz, précision 10 m : moins de 25 m comptés (avant : +0,8 à 1 km) ; vitesse nulle sur ≥ 98 % des relevés", () => {
    for (let g = 1; g <= 3; g++) {
      const p = gare(g, 7, 10, 1, 300);
      const avant = enDirect(p.slice(0, 31), [], 0, p[30][0], CLIO, false);
      const apres = enDirect(p, [], 0, p[p.length - 1][0], CLIO, false);
      expect((apres.km - avant.km) * 1000).toBeLessThan(25);
      let nonNuls = 0;
      for (let i = 42; i < p.length; i++) if (enDirect(p.slice(0, i + 1), [], 0, p[i][0], CLIO, false).vitesse > 0) nonNuls++;
      expect(nonNuls / (p.length - 42)).toBeLessThan(0.02); // avant : 22 à 28 %
    }
  });
  it("en bouchon à 5 km/h avec ±2 m de bruit : la distance est comptée (à 2 seuils près)", () => {
    const r = hasard(7);
    const lent: PointRoule[] = [];
    for (let i = 0; i <= 120; i++) {
      const [a, b] = decaler(LA, LO, (5 / 3.6) * i + (r() * 2 - 1) * 2, (r() * 2 - 1) * 2);
      lent.push([i * 1000, a, b, 0, null, null, 10]);
    }
    expect(Math.abs(calculLocal(lent, [], CLIO, 0, 120_000).km * 1000 - (5 / 3.6) * 120)).toBeLessThan(20);
  });
});

describe("V-6.4 c2 : une suppression l'emporte sur toute correction en vol (audit r2 lot 2, MEDIUM 1)", () => {
  const trajet = (id: string, enregistre: boolean) =>
    ({
      id, debut: Date.parse("2026-10-21T08:00:00Z"), km: 4.8, litres: 0.33, carburant: "SP95-E10", pays_depart: "FR",
      depart: { lat: 43.9289, lon: 2.1464, nom: null }, arrivee: { lat: 43.93, lon: 2.15, nom: null },
      moyennes: { "SP95-E10": { prix: 2.156, pays: "FR" } }, prix_litre: 2.156, prix_perso: null, personnes: 1, enregistre,
      vitesses: [], consos: [],
    }) as unknown as TrajetV1;
  const nomme = (t: TrajetV1) => ({ ...t, depart: { ...t.depart, nom: "Albi" }, arrivee: { ...t.arrivee, nom: "Albi" } });

  it("trajet rouvert sans noms, supprimé, puis les noms arrivent 3 s après : il ne revient pas", async () => {
    const t = trajet("r3-rouvert", true);
    await garderTrajetV1(t);
    const correction = new Promise<void>((ok) => setTimeout(() => garderCorrection(nomme(t)).then(ok), 3000));
    await supprimerTrajetV1(t.id);
    expect(await lireTrajetV1(t.id)).toBeNull();
    await correction;
    expect(await lireTrajetV1(t.id)).toBeNull();
  }, 10_000);
  it("correction et suppression lancées ensemble : le trajet ne revient pas", async () => {
    const t = trajet("r3-ensemble", true);
    await garderTrajetV1(t);
    await Promise.all([supprimerTrajetV1(t.id), garderCorrection(nomme(t)), garderCorrection({ ...t, carburant: "Gazole" } as TrajetV1)]);
    expect(await lireTrajetV1(t.id)).toBeNull();
  });
  it("trajet supprimé hors de cette session (autre onglet) : la correction ne le recrée pas", async () => {
    const t = trajet("r3-ailleurs", true);
    await garderTrajetV1(t);
    await (await db()).delete("trajets", t.id);
    await garderCorrection(nomme(t));
    expect(await lireTrajetV1(t.id)).toBeNull();
  });
  it("trajet arrêté supprimé (« Supprimer ce trajet » avant « Enregistrer ») : ni en attente, ni dans l'historique", async () => {
    const t = trajet("r3-arrete", false);
    await garderArrete(t);
    await oublierArrete(t.id);
    await garderCorrection(nomme(t));
    expect(await lireArrete()).toBeNull();
    expect(await lireTrajetV1(t.id)).toBeNull();
  });
  it("sans suppression, la correction est toujours gardée (trajet rouvert et trajet arrêté)", async () => {
    const r = trajet("r3-garde", true);
    await garderTrajetV1(r);
    await garderCorrection(nomme(r));
    expect((await lireTrajetV1(r.id))?.depart.nom).toBe("Albi");
    const a = trajet("r3-garde-arrete", false);
    await garderArrete(a);
    await garderCorrection(nomme(a));
    expect((await lireArrete())?.depart.nom).toBe("Albi");
  });
});

describe("notification Android du trajet en cours : tous les textes viennent de textes.ts (audit r2 lot 1, HIGH 1)", async () => {
  const { contenuNotification } = await import("../../src/lib/notifTrajet");
  const { T } = await import("../../src/lib/textes");
  const voiture = { masse_kg: 1165, carburant: "SP95-E10", conso_phases: CLIO.conso } as never;
  const base = {
    version: 2, id: "n", debut: 0, pauses: [], enPause: false, segment: 0, voiture, pays: "FR", moyennes: { "SP95-E10": { prix: 2.156, pays: "FR" } },
    prixChoisi: null, immobile: null, ignorerAvant: 0,
    points: Array.from({ length: 61 }, (_, i) => [i * 1000, ...decaler(LA, LO, i * 25, 0), 0] as PointRoule),
  };
  it("en route : titre, ligne de chiffres et boutons Pause / Arrêter", () => {
    const c = contenuNotification(base as never, 60_000);
    expect(c.titre).toBe(T.notifEnCours);
    expect(c.texte).toMatch(/^\d+ km\/h · 1,5 km · \d+,\d\d €$/);
    expect([c.pause, c.arreter, c.reprendre, c.cestFini]).toEqual([T.pause, T.arreterV1, T.reprendre, T.cestFini]);
  });
  it("sans prix : « — € » ; en pause, GPS perdu, immobile : le titre de textes.ts", () => {
    expect(contenuNotification({ ...base, moyennes: {} } as never, 60_000).texte).toMatch(new RegExp(`${T.euros(T.vide)}$`));
    expect(contenuNotification({ ...base, enPause: true } as never, 60_000).titre).toBe(T.notifEnPause);
    expect(contenuNotification(base as never, 90_000).titre).toBe(T.notifGpsPerdu);
    expect(contenuNotification({ ...base, immobile: 1 } as never, 60_000).titre).toBe(T.notifImmobile);
  });
});
