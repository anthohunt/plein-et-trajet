// Jalon 5 — « Contrôles chiffrés » de tests/e2e/use-cases/m5-use-case.md : coût, part, courbe de conso, pause, arrêt automatique
// à 10 min, trou GPS comblé, totaux et groupes de l'historique. Tracés : le GPX réel albi-toulouse.gpx et ses deux dérivés
// (tests/e2e/fixtures/derive-gpx.mjs).
import gpxAlbiToulouse from "../e2e/fixtures/albi-toulouse.gpx?raw";
import gpxImmobile from "../e2e/fixtures/albi-toulouse-immobile-11min.gpx?raw";
import gpxTunnel from "../e2e/fixtures/albi-toulouse-tunnel-90s.gpx?raw";
import { describe, expect, it } from "vitest";
import { ajouterPosition, basculerPause, BRUIT_MIN_M, calculLocal, consosParDistance, enDirect, immobileDepuis, IMMOBILE_MS, pasDe, type EtatPoints, type Pause, type PointRoule, type VehiculeRoule } from "../../supabase/functions/_shared/roule.ts";
import { distanceM } from "../../supabase/functions/_shared/modele.ts";
import { consoParPhase } from "../../supabase/functions/_shared/conso-eea.ts";
import { bornerPersonnes, coutTrajet, grouperParMois, partPersonne, totaux, type TrajetV1 } from "../../src/lib/historique";

interface Pt { lat: number; lon: number; t: number }
const SOURCES: Record<string, string> = { "albi-toulouse.gpx": gpxAlbiToulouse, "albi-toulouse-immobile-11min.gpx": gpxImmobile, "albi-toulouse-tunnel-90s.gpx": gpxTunnel };
const gpx = (nom: string): Pt[] =>
  [...SOURCES[nom].matchAll(/<trkpt lat="([\d.-]+)" lon="([\d.-]+)"><time>([^<]+)<\/time>/g)].map((m) => ({ lat: +m[1], lon: +m[2], t: Date.parse(m[3]) }));
const enPoints = (l: Pt[], seg = 0): PointRoule[] => l.map((p) => [p.t, p.lat, p.lon, seg]);
const CLIO: VehiculeRoule = { masse_kg: 1165, carburant: "SP95-E10", conso: consoParPhase(6.128, "SP95-E10", 1165, 87) };
const longueur = (l: Pt[]) => l.slice(1).reduce((s, p, i) => s + distanceM(l[i], p), 0);

describe("coût et partage (V-4.3, V-4.4)", () => {
  it("41,2 L × 2,161 €/L = 89,03 € (au centime)", () => expect(coutTrajet({ litres: 41.2, prix_litre: 2.161, prix_perso: null })).toBe(89.03));
  it("« Mon prix » l'emporte sur la moyenne", () => expect(coutTrajet({ litres: 41.2, prix_litre: 2.161, prix_perso: 1.989 })).toBe(81.95));
  it("sans prix connu : pas de coût", () => expect(coutTrajet({ litres: 41.2, prix_litre: null, prix_perso: null })).toBeNull());
  it("89,03 € à 3 → 29,68 € chacun (au centime)", () => expect(partPersonne(89.03, 3)).toBe(29.68));
  it("personnes bornées de 1 à 9", () => {
    expect(bornerPersonnes(0)).toBe(1);
    expect(bornerPersonnes(10)).toBe(9);
    expect(bornerPersonnes(3)).toBe(3);
  });
});

describe("fin de trajet calculée sur le téléphone (tracé réel Albi → Toulouse)", () => {
  const l = gpx("albi-toulouse.gpx");
  const pts = enPoints(l);
  const r = calculLocal(pts, [], CLIO, l[0].t, l[l.length - 1].t);
  it("km = longueur du tracé ; durée = 72 min 29 s", () => {
    // round 2 : le filtre du bruit à l'arrêt compte les passages lents par cordes d'au moins 10 m (BRUIT_MIN_M) : 23 m de moins
    // que la somme des pas d'une seconde sur 77 km (0,03 %) ; round 3 : cordes vers le centre des relevés lents, 51 m (0,07 %)
    expect(Math.abs(r.km * 1000 - longueur(l))).toBeLessThan(60);
    expect(r.duree_s).toBe(4349);
  });
  it("la moyenne de la courbe de conso = litres ÷ km × 100 (à 0,1 près)", () => {
    const moy = r.consos.reduce((s, x) => s + x, 0) / r.consos.length;
    expect(Math.abs(moy - (r.litres / r.km) * 100)).toBeLessThan(0.1);
    expect(r.consos.length).toBe(600);
    expect(r.conso_max).toBe(Math.max(...r.consos));
  });
  it("courbe de vitesse : tout le trajet en 600 points au plus ; vitesse moyenne sur le temps roulé", () => {
    expect(r.vitesses.length).toBe(600);
    expect(r.vitesse_moy).toBe(Math.round((longueur(l) / ((l[l.length - 1].t - l[0].t) / 1000)) * 3.6));
    expect(r.accelerations).toBeGreaterThan(0);
  });
  it("consos par tranches de distance égales : la somme des litres est conservée", () => {
    const pas = pasDe(pts);
    const lit = pas.map(() => 0.01);
    const c = consosParDistance(pas, lit, 37);
    const km = pas.reduce((s, p) => s + p.d, 0) / 1000;
    expect((c.reduce((s, x) => s + x, 0) / 37) * km / 100).toBeCloseTo(lit.length * 0.01, 9);
  });
  it("le direct (sans montées) et la fin s'accordent sans altitude", () => {
    const d = enDirect(pts, [], l[0].t, l[l.length - 1].t, CLIO, false);
    expect(d.km).toBeCloseTo(r.km, 9);
    expect(d.litres).toBeCloseTo(r.litres, 9);
  });
});

describe("pause : 0 m et 0 L comptés (V-3.4)", () => {
  it("2 km parcourus pendant la pause ne comptent pas", () => {
    const l = gpx("albi-toulouse.gpx").slice(1000, 1400); // ≈ 10 km d'A68
    let e: EtatPoints = { points: [], pauses: [], enPause: false, segment: 0 };
    const iPause = 100;
    let iReprise = iPause;
    while (distanceM(l[iPause], l[iReprise]) < 2000) iReprise++;
    for (let i = 0; i < l.length; i++) {
      if (i === iPause) e = basculerPause(e, l[i].t);
      if (i === iReprise) e = basculerPause(e, l[i].t);
      e = ajouterPosition(e, l[i].t, l[i].lat, l[i].lon);
    }
    const roule = longueur(l.slice(0, iPause)) + longueur(l.slice(iReprise));
    const r = calculLocal(e.points, e.pauses as Pause[], CLIO, l[0].t, l[l.length - 1].t);
    expect(r.km * 1000).toBeCloseTo(roule, 3);
    // litres : exactement ceux des deux morceaux roulés, calculés séparément
    const a = calculLocal(enPoints(l.slice(0, iPause)), [], CLIO, l[0].t, l[iPause - 1].t);
    const b = calculLocal(enPoints(l.slice(iReprise), 1), [], CLIO, l[iReprise].t, l[l.length - 1].t);
    expect(r.litres).toBeCloseTo(a.litres + b.litres, 9);
    expect(r.duree_s).toBe(Math.round((l[l.length - 1].t - l[0].t - (l[iReprise].t - l[iPause].t)) / 1000));
  });
});

describe("oubli d'arrêter : arrêt automatique à 10 min d'immobilité (V-3.E1)", () => {
  const l = gpx("albi-toulouse-immobile-11min.gpx");
  const pts = enPoints(l);
  const k = 774; // dernier point roulé (derive-gpx : 775 points roulés)
  const debutImmobile = l[k].t;
  it("rien à 9 min 59 s, arrêt à 10 min exactement, daté du début de l'immobilité", () => {
    const jusqua = (ms: number) => pts.filter((p) => p[0] <= ms);
    expect(immobileDepuis(jusqua(debutImmobile + IMMOBILE_MS - 1000), debutImmobile + IMMOBILE_MS - 1000)).toBeNull();
    expect(immobileDepuis(jusqua(debutImmobile + IMMOBILE_MS), debutImmobile + IMMOBILE_MS)).toBe(debutImmobile);
  });
  it("la durée du trajet s'arrête au début de l'immobilité : les 10 min ne comptent pas", () => {
    const fin = immobileDepuis(pts, l[l.length - 1].t)!;
    const r = calculLocal(pts.filter((p) => p[0] <= fin), [[fin, fin]], CLIO, l[0].t, fin);
    expect(r.duree_s).toBe(Math.round((debutImmobile - l[0].t) / 1000));
    // round 2 : les derniers mètres avant l'arrêt (moins que le seuil de bruit de 10 m) ne sont pas comptés ; round 3 : le centre
    // des derniers relevés lents est jugé, pas le dernier relevé — au plus deux seuils (15 m sur ce tracé)
    expect(Math.abs(r.km * 1000 - longueur(l.slice(0, k + 1)))).toBeLessThan(2 * BRUIT_MIN_M);
  });
  it("en roulant (même lentement en bouchon) : jamais immobile", () => {
    const route = enPoints(gpx("albi-toulouse.gpx").slice(0, 1500));
    for (let i = 60; i < route.length; i += 60) expect(immobileDepuis(route.slice(0, i), route[i - 1][0])).toBeNull();
  });
  it("garé, un GPS qui tremble de ±5,5 m sans vitesse arrête quand même le trajet à 10 min (chasse aux bugs du 21/10)", () => {
    const base = pts[k];
    const t0 = base[0];
    const tremble = Array.from({ length: 133 }, (_, i) => {
      const p = [...base] as PointRoule;
      p[0] = t0 + i * 5000;
      p[1] = base[1] + (5.5 * Math.sin(i * 2.1)) / 111320; // ±5,5 m, sans motif régulier
      p[5] = null;
      return p;
    });
    expect(immobileDepuis(tremble, t0 + 11 * 60_000)).toBe(t0);
  });
  it("après « Reprendre », seuls les points suivants sont rejugés", () => {
    const fin = immobileDepuis(pts, l[l.length - 1].t)!;
    expect(immobileDepuis(pts, l[l.length - 1].t, l[l.length - 1].t)).toBeNull();
    expect(fin).toBe(debutImmobile);
  });
});

describe("GPS perdu : trou de 90 s / 3 km comblé à la sortie (V-3.E2)", () => {
  const l = gpx("albi-toulouse-tunnel-90s.gpx");
  const entete = gpxTunnel;
  const chemin = Number(entete.match(/CHEMIN_PASSAGE_M=([\d.]+)/)![1]);
  const pts = enPoints(l);
  it("la distance du tunnel est ajoutée à ± 1 %, à la vitesse moyenne du passage", () => {
    const i = pts.findIndex((p, j) => j > 0 && p[0] - pts[j - 1][0] > 15_000);
    expect(i).toBeGreaterThan(0);
    const pas = pasDe(pts).find((p) => p.i === i)!;
    expect(Math.abs(pas.d - chemin) / chemin).toBeLessThan(0.01);
    expect(pas.v).toBeCloseTo((pas.d / pas.dt) * 3.6, 9); // vitesse du passage, non lissée
    const r = calculLocal(pts, [], CLIO, l[0].t, l[l.length - 1].t);
    const sansTrou = longueur(l.slice(0, i)) + chemin + longueur(l.slice(i));
    expect(Math.abs(r.km * 1000 - sansTrou) / sansTrou).toBeLessThan(0.01);
  });
  it("« GPS perdu » après 15 s sans position, pas avant", () => {
    const i = pts.findIndex((p, j) => j > 0 && p[0] - pts[j - 1][0] > 15_000);
    const avant = pts.slice(0, i);
    const t = avant[avant.length - 1][0];
    expect(enDirect(avant, [], pts[0][0], t + 15_000, CLIO, false).gpsPerdu).toBe(false);
    expect(enDirect(avant, [], pts[0][0], t + 16_000, CLIO, false).gpsPerdu).toBe(true);
    expect(enDirect(pts.slice(0, i + 1), [], pts[0][0], pts[i][0] + 1000, CLIO, false).gpsPerdu).toBe(false);
  });
});

describe("historique : totaux et mois (V-6.1, V-6.2)", () => {
  const t = (id: string, iso: string, km: number, litres: number): TrajetV1 =>
    ({ id, debut: Date.parse(iso), km, litres, prix_litre: 2.161, prix_perso: null, personnes: 1 }) as TrajetV1;
  const liste = [t("a", "2026-10-12T08:00:00Z", 77, 4.6), t("b", "2026-10-03T08:00:00Z", 152, 8.4), t("c", "2026-09-14T08:00:00Z", 245, 14.1), t("d", "2026-09-02T08:00:00Z", 243, 13.6)];
  it("4 trajets de 77, 152, 245 et 243 km → 717 km et la somme des coûts", () => {
    const s = totaux(liste);
    expect(s.trajets).toBe(4);
    expect(s.km).toBe(717);
    expect(s.euros).toBeCloseTo(liste.reduce((x, y) => x + coutTrajet(y)!, 0), 9);
  });
  it("du plus récent au plus ancien, sous « Octobre 2026 » puis « Septembre 2026 »", () => {
    const g = grouperParMois([liste[2], liste[0], liste[3], liste[1]]);
    expect(g.map((x) => x.mois)).toEqual(["Octobre 2026", "Septembre 2026"]);
    expect(g[0].trajets.map((x) => x.id)).toEqual(["a", "b"]);
    expect(g[1].trajets.map((x) => x.id)).toEqual(["c", "d"]);
  });
  it("aucun trajet : totaux à 0", () => expect(totaux([])).toEqual({ trajets: 0, km: 0, euros: 0, sansPrix: 0 }));
});

describe("code D.2 : lettre O lue pour un zéro (21/10)", () => {
  it("5RBUOC est essayé d'abord en 5RBU0C, la lettre seule reste telle quelle", async () => {
    const { variantesD2 } = await import("../../src/lib/eea");
    expect(variantesD2("5RBUOC")).toEqual(["5RBU0C", "5RBUOC"]);
    expect(variantesD2("R 5RBU 5RBUOC")).toEqual(["R 5RBU 5RBU0C", "R 5RBU 5RBUOC"]);
    expect(variantesD2("5RBU0C")).toEqual(["5RBU0C"]);
    expect(variantesD2("BO 5RBU 5RBU0C")).toEqual(["BO 5RBU 5RBU0C"]);
  });
});
