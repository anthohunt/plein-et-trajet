// Jalon 4 — calcul sur la vitesse réelle, distance GPS, pause, seuil de 1 km, accélérations, GPS perdu, Royaume-Uni (pence → €, Manche, Dartford).
import { describe, expect, it } from "vitest";
import GPX_ROUTE_A_B from "../fixtures/gpx/route-a-b.gpx?raw"; // import brut de Vite : pas de dépendance aux types de Node
import {
  ARRET_KMH,
  GPS_PERDU_MS,
  SEUIL_KM,
  ajouterPosition,
  attribuerPas,
  basculerPause,
  calculRoule,
  codePaysAdmin,
  compterAccelerations,
  compterArrets,
  dureeEnregistree,
  echantillonsDesPas,
  monteesParPas,
  enDirect,
  estTraverseeManche,
  appliquerPeagesRoyaumeUni,
  genreArete,
  litresPas,
  pasDe,
  pointsPourRecalage,
  reduireSerie,
  type EtatPoints,
  type PointRoule,
  type VehiculeRoule,
} from "../../supabase/functions/_shared/roule";
import { consoTroncon, distanceM, kwhEnLitres, masseTotaleKg } from "../../supabase/functions/_shared/modele";
import { dateRoyaumeUni, fusionnerRoyaumeUni, normaliserRoyaumeUni } from "../../supabase/functions/_shared/stations-pays";
import { morceauxRecalage } from "../../supabase/functions/_shared/itineraire-europe";

const P208: VehiculeRoule = { masse_kg: 1090, carburant: "SP95-E10", conso: { basse: 7.0, moyenne: 5.2, haute: 4.6, tres_haute: 6.0 } };
const T0 = Date.parse("2026-10-21T07:00:00Z");
/** Ligne droite vers le nord à vitesse constante : un point par seconde. */
function ligne(n: number, kmh: number, depart = { lat: 43.9, lon: 2.1 }, t0 = T0, seg = 0): PointRoule[] {
  const dLat = (kmh / 3.6 / 111_195) * 1; // degrés par seconde (1° de latitude ≈ 111,195 km)
  return Array.from({ length: n }, (_, i) => [t0 + i * 1000, depart.lat + dLat * i, depart.lon, seg] as PointRoule);
}

describe("distance GPS et vitesse mesurée", () => {
  it("100 s à 72 km/h en ligne droite : 2,0 km, vitesse 72 km/h", () => {
    const pas = pasDe(ligne(101, 72));
    expect(pas).toHaveLength(100);
    expect(pas.reduce((s, p) => s + p.d, 0) / 1000).toBeCloseTo(2.0, 2);
    expect(pas[50].v).toBeCloseTo(72, 0);
  });
  it("la distance est celle de la formule de haversine entre les points", () => {
    const pts = ligne(2, 90);
    expect(pasDe(pts)[0].d).toBeCloseTo(distanceM({ lat: pts[0][1], lon: pts[0][2] }, { lat: pts[1][1], lon: pts[1][2] }), 6);
  });
  it("un changement de segment (reprise après pause) ne compte aucune distance entre les deux positions", () => {
    const a = ligne(11, 50);
    const b = ligne(11, 50, { lat: 44.0, lon: 2.1 }, T0 + 60_000, 1); // 11 km plus loin, segment suivant
    const km = pasDe([...a, ...b]).reduce((s, p) => s + p.d, 0) / 1000;
    expect(km).toBeCloseTo((10 * 50) / 3600 * 2, 3); // 2 × 10 s à 50 km/h, sans le saut de 11 km
  });
});

describe("litres sur la vitesse réelle (courbe WLTP de la voiture + énergie des accélérations)", () => {
  it("à vitesse constante, un pas consomme la base WLTP de la phase de cette vitesse", () => {
    const l = litresPas({ d: 25, v: 90, vPrec: 90 }, P208);
    expect(l).toBeCloseTo((4.6 * 0.025) / 100, 9); // 90 km/h → phase haute
  });
  it("à 1 km de route à 50 km/h, le total égale le modèle des jalons 2-3 sans arrêt ni dénivelé", () => {
    const pas = pasDe(ligne(73, 50));
    expect(pas[0].vPrec).toBe(pas[0].v); // départ lancé : aucune accélération supposée au premier pas
    const l = pas.reduce((s, p) => s + litresPas(p, P208), 0);
    const km = pas.reduce((s, p) => s + p.d, 0) / 1000;
    expect(l).toBeCloseTo(consoTroncon({ km, vitesse_kmh: 50, arrets: 0, denivele_m: 0 }, P208).litres, 5); // écart < 1e-5 L : vitesse lissée à ±0,01 km/h
  });
  it("une accélération de 0 à 100 km/h ajoute ½·m·v² converti en litres", () => {
    const sans = litresPas({ d: 10, v: 100, vPrec: 100 }, P208);
    const avec = litresPas({ d: 10, v: 100, vPrec: 0 }, P208);
    const attendu = kwhEnLitres((0.5 * masseTotaleKg(1090) * (100 / 3.6) ** 2) / 3.6e6, "SP95-E10");
    expect(avec - sans).toBeCloseTo(attendu, 9);
    expect(attendu).toBeGreaterThan(0.05);
    expect(attendu).toBeLessThan(0.07);
  });
  it("une montée de 10 m ajoute m·g·Δh ; un freinage n'ajoute rien", () => {
    const plat = litresPas({ d: 100, v: 80, vPrec: 80 }, P208);
    expect(litresPas({ d: 100, v: 80, vPrec: 80 }, P208, 10) - plat).toBeCloseTo(kwhEnLitres((masseTotaleKg(1090) * 9.81 * 10) / 3.6e6, "SP95-E10"), 9);
    expect(litresPas({ d: 100, v: 60, vPrec: 80 }, P208)).toBeCloseTo((5.2 * 0.1) / 100, 9);
  });
});

describe("arrêts et accélérations", () => {
  it("compte un arrêt à chaque passage sous 3 km/h après avoir roulé", () => {
    expect(compterArrets([0, 20, 40, 2, 0, 0, 30, 50, 1, 0])).toBe(2);
    expect(compterArrets([0, 0, 2, 1, 0])).toBe(0); // jamais roulé
    expect(ARRET_KMH).toBe(3);
  });
  it("une accélération = une montée d'au moins 15 km/h ; une retombée de moins de 3 km/h ne la coupe pas", () => {
    expect(compterAccelerations([0, 10, 20, 30, 50, 50, 50])).toBe(1);
    expect(compterAccelerations([0, 10, 8.5, 20, 30])).toBe(1); // retombée de 1,5 km/h : même montée
    expect(compterAccelerations([0, 20, 10, 30, 0, 40])).toBe(3);
    expect(compterAccelerations([50, 55, 60, 52, 58])).toBe(0); // gains de 10 et 6 km/h : sous le seuil
    expect(compterAccelerations([])).toBe(0);
  });
});

describe("pause, durée, GPS perdu, seuil de 1 km", () => {
  const vide: EtatPoints = { points: [], pauses: [], enPause: false, segment: 0 };
  it("en pause, les positions sont ignorées ; la reprise ouvre un nouveau segment ; la durée exclut la pause", () => {
    let e = ajouterPosition(vide, T0, 43.9, 2.1);
    e = ajouterPosition(e, T0 + 1000, 43.9001, 2.1);
    e = basculerPause(e, T0 + 2000);
    expect(e.enPause).toBe(true);
    const enPause = ajouterPosition(e, T0 + 3000, 43.95, 2.1);
    expect(enPause.points).toHaveLength(2);
    e = basculerPause(enPause, T0 + 62_000);
    expect(e.enPause).toBe(false);
    expect(e.segment).toBe(1);
    e = ajouterPosition(e, T0 + 63_000, 43.95, 2.1);
    expect(e.points[2][3]).toBe(1);
    expect(dureeEnregistree(T0, e.pauses, T0 + 63_000)).toBeCloseTo(3, 6); // 63 s − 60 s de pause
    const d = enDirect(e.points, e.pauses, T0, T0 + 63_000, P208, false);
    expect(d.km).toBeCloseTo(0.0111, 3); // le saut de 5,5 km pendant la pause n'est pas compté
  });
  it("une position dont l'instant n'avance pas est ignorée", () => {
    const e = ajouterPosition(ajouterPosition(vide, T0, 43.9, 2.1), T0, 43.91, 2.1);
    expect(e.points).toHaveLength(1);
  });
  it("plus de 15 s sans position : « GPS perdu », vitesse 0, distance figée", () => {
    const pts = ligne(30, 90);
    const dernier = pts[pts.length - 1][0];
    const avant = enDirect(pts, [], T0, dernier + 10_000, P208, false);
    const apres = enDirect(pts, [], T0, dernier + GPS_PERDU_MS + 1000, P208, false);
    expect(avant.gpsPerdu).toBe(false);
    expect(apres.gpsPerdu).toBe(true);
    expect(apres.vitesse).toBe(0);
    expect(apres.km).toBe(avant.km);
  });
  it("en pause, pas de « GPS perdu » (aucune position n'est attendue)", () => {
    const pts = ligne(5, 30);
    expect(enDirect(pts, [[pts[4][0], null]], T0, pts[4][0] + 60_000, P208, true).gpsPerdu).toBe(false);
  });
  it("seuil de 1 km : 40 s à 72 km/h (0,8 km) est sous le seuil, 60 s (1,2 km) au-dessus", () => {
    expect(enDirect(ligne(41, 72), [], T0, T0 + 40_000, P208, false).km).toBeLessThan(SEUIL_KM);
    expect(enDirect(ligne(61, 72), [], T0, T0 + 60_000, P208, false).km).toBeGreaterThan(SEUIL_KM);
  });
  it("L/100 km affiché à partir de 0,5 km ; courbe limitée aux 3 dernières minutes", () => {
    const d = enDirect(ligne(400, 60), [], T0, T0 + 399_000, P208, false);
    expect(d.l100).not.toBeNull();
    expect(d.courbe.length).toBeLessThanOrEqual(181);
    expect(enDirect(ligne(10, 60), [], T0, T0 + 9000, P208, false).l100).toBeNull();
  });
  it("la série de tout le trajet est réduite à 600 valeurs au plus", () => {
    expect(reduireSerie(Array.from({ length: 4350 }, (_, i) => i % 100))).toHaveLength(600);
    expect(reduireSerie([1.4, 2.6])).toEqual([1, 3]);
  });
});

describe("recalage et tronçons Autoroute / Route / Ville", () => {
  it("genre de route : autoroute, voie rapide ≥ 100 km/h, ville (densité ou ≤ 50 km/h), route, traversée (ferry)", () => {
    expect(genreArete({ road_class: "motorway" })).toBe("autoroute");
    expect(genreArete({ road_class: "trunk", speed_limit: 110 })).toBe("autoroute");
    expect(genreArete({ road_class: "primary", density: 9 })).toBe("ville");
    expect(genreArete({ road_class: "secondary", speed_limit: 50 })).toBe("ville");
    expect(genreArete({ road_class: "residential" })).toBe("ville");
    expect(genreArete({ road_class: "primary", density: 2, speed_limit: 80 })).toBe("route");
    expect(genreArete({ road_class: "service_other", use: "ferry" })).toBe("traversee");
  });
  it("pays : code Valhalla, sinon nom britannique (« England » sans code) → GB", () => {
    expect(codePaysAdmin({ country_code: "FR", country_text: "France" })).toBe("FR");
    expect(codePaysAdmin({ country_text: "England" })).toBe("GB");
    expect(codePaysAdmin({ country_text: "Scotland" })).toBe("GB");
    expect(codePaysAdmin({})).toBe("ZZ");
  });
  it("points envoyés au recalage : un tous les 20 m et à chaque segment ; chaque point garde son représentant", () => {
    const pts = [...ligne(20, 36), ...ligne(3, 36, { lat: 44, lon: 2 }, T0 + 30_000, 1)];
    const r = pointsPourRecalage(pts);
    expect(r.envoyes.length).toBeLessThan(pts.length);
    expect(r.versEnvoye).toHaveLength(pts.length);
    expect(r.envoyes.some((p) => p[3] === 1)).toBe(true);
    expect(r.envoyes[r.envoyes.length - 1]).toEqual(pts[pts.length - 1]);
  });
  it("morceaux de recalage : ≤ 3 000 points et ≤ 150 km, point de jonction répété", () => {
    const pts = Array.from({ length: 7000 }, (_, i) => ({ lat: 43 + i * 0.0001, lon: 2, t: i * 1000 }));
    const m = morceauxRecalage(pts);
    expect(m.length).toBe(3);
    expect(m[1].debut).toBe(m[0].fin);
    expect(m.every((x) => x.fin - x.debut + 1 <= 3000)).toBe(true);
  });
  it("le trajet GPX A → B, rattaché à ses routes, donne des tronçons cohérents et le pays traversé", () => {
    const g = GPX_ROUTE_A_B;
    const pts = [...g.matchAll(/lat="([\d.-]+)" lon="([\d.-]+)"><time>([^<]+)</g)].map((m) => [Date.parse(m[3]), +m[1], +m[2], 0] as PointRoule);
    const pas = pasDe(pts);
    expect(pas.reduce((s, p) => s + p.d, 0) / 1000).toBeGreaterThan(75);
    expect(compterArrets(pas.map((p) => p.v))).toBe(2); // feu (40 s) et station (180 s) du fichier
    // arêtes synthétiques : ville au début, autoroute ensuite
    const aretes = [{ road_class: "residential", end_node: { admin_index: 0 } }, { road_class: "motorway", names: ["A68"], end_node: { admin_index: 0 } }];
    const { versEnvoye } = pointsPourRecalage(pts);
    const matched = versEnvoye.map((k) => ({ edge_index: k < 100 ? 0 : 1, type: "matched" }));
    const r = calculRoule(attribuerPas(pas, versEnvoye, matched, aretes, [{ country_code: "FR" }]), P208);
    expect(r.troncons.map((t) => t.type)).toEqual(["autoroute", "ville"]);
    expect(r.troncons[0].voies).toEqual(["A68"]);
    expect(r.km).toBeCloseTo(77, 0);
    expect(r.l100).toBeGreaterThan(4);
    expect(r.l100).toBeLessThan(9);
    expect(r.accelerations).toBeGreaterThan(0);
    expect(r.traversee).toBe(false);
  });
  it("un ferry n'est compté ni en km ni en litres, et le signale", () => {
    const pas = pasDe(ligne(61, 72));
    const att = pas.map((p, i) => ({ ...p, pays: i < 30 ? "FR" : "GB", genre: (i < 30 ? "route" : "traversee") as "route" | "traversee", pente: 0, voie: "" }));
    const r = calculRoule(att, P208);
    expect(r.traversee).toBe(true);
    expect(r.km).toBeCloseTo(0.6, 1);
    expect(r.troncons.every((t) => t.pays === "FR")).toBe(true);
  });
});

describe("montées tirées de l'altitude (audit M2 : weighted_grade n'est pas une pente)", () => {
  it("échantillons tous les 500 m le long des pas, dénivelé positif = somme des hausses, comme l'estimation du jalon 2", () => {
    const pts = ligne(181, 72); // 3,6 km en 3 min
    const pas = pasDe(pts);
    const ech = echantillonsDesPas(pts, pas);
    expect(ech.length).toBe(9); // départ, 7 échantillons à 500 m, arrivée
    // profil : 100 → 140 m (montée de 40 m), redescente à 110 m, remontée à 130 m : D+ = 40 + 20 = 60 m
    const alt = [100, 110, 125, 140, 130, 110, null, 120, 130];
    const montees = monteesParPas(ech, alt, pas.length);
    expect(montees.length).toBe(pas.length);
    expect(montees.reduce((s, x) => s + x, 0)).toBeCloseTo(60, 6);
    expect(montees.filter((x) => x > 0).length).toBe(5); // seuls les pas qui portent un échantillon en hausse
  });
  it("la montée mesurée remplace weighted_grade : les litres ajoutés valent m·g·Δh, une pente Valhalla seule n'ajoute plus rien", () => {
    const pas = pasDe(ligne(61, 72));
    const plat = pas.map((p) => ({ ...p, pays: "FR", genre: "route" as const, pente: 8, voie: "", montee: 0 }));
    const montee = plat.map((p, k) => ({ ...p, montee: k === 10 ? 25 : 0 }));
    const r0 = calculRoule(plat, P208);
    const r1 = calculRoule(montee, P208);
    expect(r0.troncons[0].denivele_m).toBe(0); // pente 8 « Valhalla » ignorée dès que la montée mesurée est connue
    expect(r1.troncons[0].denivele_m).toBe(25);
    expect(r1.troncons[0].litres - r0.troncons[0].litres).toBeCloseTo(kwhEnLitres((masseTotaleKg(P208.masse_kg) * 9.81 * 25) / 3.6e6, P208.carburant), 2);
  });
});

describe("Royaume-Uni", () => {
  it("pence/L → €/L au cours du jour ; prix d'origine gardés en pence ; date du flux à l'heure de Londres", () => {
    const s = normaliserRoyaumeUni({ last_updated: "20/10/2026 09:51:41", stations: [{ site_id: "gcq", brand: "Asda", address: "Abbey Park", postcode: "CV3", location: { latitude: 52.39, longitude: -1.48 }, prices: { E10: 172.9, B7: 197.7, E5: 184.9 } }] }, 0.84028);
    expect(s[0].prix["SP95-E10"]).toBe(2.058); // 172,9 p / 100 / 0,84028
    expect(s[0].prix.Gazole).toBe(2.353);
    expect(s[0].origine).toEqual({ "SP95-E10": 172.9, SP95: 172.9, Gazole: 197.7, SP98: 184.9 });
    expect(s[0].unite_origine).toBe("p/L");
    expect(s[0].maj).toBe("2026-10-20T08:51:41.000Z"); // BST = UTC+1
    expect(dateRoyaumeUni("21/12/2026 10:00:00")).toBe("2026-12-21T10:00:00.000Z"); // GMT en hiver
    expect(dateRoyaumeUni("n'importe quoi")).toBeNull();
  });
  it("un prix aberrant (hors 30-500 p) est écarté", () => {
    const s = normaliserRoyaumeUni({ stations: [{ site_id: "a", location: { latitude: 51, longitude: 0 }, prices: { E10: 1.729, B7: 197.7 } }] }, 0.84);
    expect(Object.keys(s[0].prix)).toEqual(["Gazole"]);
  });
  it("fusion des flux : un flux de plus de 3 jours est écarté, un site en double garde le plus récent", () => {
    const st = (id: string, maj: string, p: number) => ({ id, nom: null, enseigne: null, adresse: null, cp: null, ville: null, lat: 51, lon: 0, maj, prix: { Gazole: p } });
    const f = fusionnerRoyaumeUni(
      [
        { nom: "Asda", stations: [st("GB-1", "2026-10-20T08:00:00Z", 2.3)] },
        { nom: "Shell", stations: [st("GB-2", "2026-05-13T00:00:00Z", 2.0)] },
        { nom: "MFG", stations: [st("GB-1", "2026-10-21T00:00:00Z", 2.4)] },
        { nom: "Vide", stations: [] },
      ],
      new Date("2026-10-21T02:00:00Z"),
    );
    expect(f.retenus).toEqual(["Asda", "MFG"]);
    expect(f.ecartes).toEqual(["Shell", "Vide"]);
    expect(f.stations).toHaveLength(1);
    expect(f.stations[0].prix.Gazole).toBe(2.4);
  });
  it("la navette Eurotunnel et les ferries ne sont pas des péages routiers", () => {
    expect(estTraverseeManche("Eurotunnel · Eurotunnel")).toBe(true);
    expect(estTraverseeManche("P&O Ferries")).toBe(true);
    expect(estTraverseeManche("Autoroutes de France · ROISSY CDG (6) - CALAIS")).toBe(false);
  });
  const DARTFORD = { id: "dartford", pays: "GB", libelle: "Dartford Crossing (Dart Charge, voiture, 6 h-22 h)", montant: 3.5, monnaie: "GBP", noms: "^(a282|dartford crossing|queen elizabeth ii bridge|dartford tunnel)$" };
  const FR = { pays: "FR", libelle: "Autoroutes de France · ROISSY CDG (6) - CALAIS", montant: 25.2 };
  it("Dartford tarifé par le fournisseur (HT + TVA) : montant remplacé par le Dart Charge officiel converti, sans doublon ; Eurotunnel retiré", () => {
    const r = appliquerPeagesRoyaumeUni([FR, { pays: "GB", libelle: "Eurotunnel · Eurotunnel", montant: 260.1 }, { pays: "GB", libelle: "Dartford River · Dartford RiverTunnel", montant: 5 }], [DARTFORD], [["A282", "E 15"]], { GBP: 0.84028 });
    expect(r.mancheRetiree).toBe(true);
    expect(r.lignes.map((l) => l.montant)).toEqual([25.2, 4.17]); // 3,50 £ / 0,84028
    expect(r.lignes[1].libelle).toBe("Dartford River · Dartford RiverTunnel");
  });
  it("Dartford franchi (route « A282 ») mais omis par le fournisseur : ajouté ; non franchi (« A2 Dartford Bypass ») : rien", () => {
    expect(appliquerPeagesRoyaumeUni([FR], [DARTFORD], [["A282", "E 15", "Canterbury Way"]], { GBP: 0.84028 }).lignes).toEqual([FR, { pays: "GB", libelle: DARTFORD.libelle, montant: 4.17 }]);
    const sans = appliquerPeagesRoyaumeUni([FR], [DARTFORD], [["A2", "Dartford Bypass"], undefined], { GBP: 0.84028 });
    expect(sans.lignes).toEqual([FR]);
    expect(sans.mancheRetiree).toBe(false);
  });
  it("sans cours du jour, aucun montant inventé", () => {
    expect(appliquerPeagesRoyaumeUni([FR], [DARTFORD], [["A282"]], {}).lignes).toEqual([FR]);
  });
});
