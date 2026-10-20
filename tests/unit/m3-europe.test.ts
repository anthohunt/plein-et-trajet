import { describe, expect, it } from "vitest";
import { decoderPolyline6, decouperTrace, encoderPolyline6, etapesDepuisAretes, numeroDeVoie, pointEnFrance, vignettesTraversees, type Arete } from "../../supabase/functions/_shared/europe";
import { decouperParPays, resumeParPays, synthese, type VehiculeModele } from "../../supabase/functions/_shared/modele";
import { executerChaine } from "../../supabase/functions/_shared/moteurs";
import { lireBulletin, estimes } from "../../supabase/functions/_shared/bulletin";
import { dateEspagne, nombreEs, normaliserEspagne } from "../../supabase/functions/_shared/stations-es";

const voiture: VehiculeModele = { masse_kg: 1200, carburant: "Gazole", conso: { basse: 5, moyenne: 4.5, haute: 4.8, tres_haute: 6 } };
const aretes = (n: number, pays: number, o: Partial<Arete> = {}): Arete[] =>
  Array.from({ length: n }, () => ({ length: 1, road_class: "motorway", speed: 110, names: ["A 61"], end_node: { admin_index: pays }, ...o }));

describe("itinéraire Europe : arêtes → étapes par pays", () => {
  const admins = [{ country_code: "FR" }, { country_code: "ES" }];
  const r = etapesDepuisAretes([...aretes(300, 0), ...aretes(160, 1, { names: ["AP-7"], toll: true })], admins);
  it("sépare les pays dans l'ordre de traversée et additionne les km", () => {
    expect(r.etapesParPays.map(([p]) => p)).toEqual(["FR", "ES"]);
    expect(r.km).toBe(460);
    expect(r.kmAutorouteParPays.FR).toBe(300);
    expect(r.kmPeageParPays.ES).toBe(160);
  });
  it("la répartition par pays : somme des litres des pays = litres des tronçons", () => {
    const t = decouperParPays(r.etapesParPays, voiture);
    const pays = resumeParPays(t);
    expect(pays.map((p) => p.code)).toEqual(["FR", "ES"]);
    const somme = pays.reduce((s, p) => s + p.litres, 0);
    expect(somme).toBeCloseTo(synthese(t).litres, 1);
    expect(pays[0].km + pays[1].km).toBeCloseTo(460, 0);
    expect(t.every((x) => x.type === "autoroute")).toBe(true);
  });
  it("numéro de voie normalisé", () => {
    expect(numeroDeVoie(["A 61", "E 80"])).toBe("A61");
    expect(numeroDeVoie(["Avenue Gambetta"])).toBe("");
    expect(numeroDeVoie(["AP-7"])).toBe("AP-7");
  });
  it("feux et ronds-points comptent comme arrêts en ville ; pas sur autoroute", () => {
    const ville = etapesDepuisAretes(aretes(10, 0, { road_class: "residential", speed: 30, length: 0.1, traffic_signal: true, names: [] }), admins);
    const t = decouperParPays(ville.etapesParPays, voiture);
    expect(t[0].type).toBe("ville");
    expect(t[0].arrets).toBe(10);
  });
});

describe("vignettes", () => {
  const table = [{ pays: "CH", libelle: "Vignette suisse obligatoire (non comptée)" }, { pays: "AT", libelle: "Vignette autrichienne obligatoire (non comptée)" }];
  it("seulement si l'autoroute du pays est empruntée", () => {
    expect(vignettesTraversees({ FR: 600, CH: 72 }, table).map((v) => v.libelle)).toEqual(["Vignette suisse obligatoire (non comptée)"]);
    expect(vignettesTraversees({ FR: 600, CH: 0.2 }, table)).toEqual([]);
    expect(vignettesTraversees({ FR: 600 }, table)).toEqual([]);
  });
});

describe("France ou Europe (choix IGN / Valhalla)", () => {
  it("villes françaises, Corse et étrangères", () => {
    expect(pointEnFrance(43.9289, 2.1464)).toBe(true); // Albi
    expect(pointEnFrance(44.8378, -0.5792)).toBe(true); // Bordeaux
    expect(pointEnFrance(48.8566, 2.3522)).toBe(true); // Paris
    expect(pointEnFrance(41.9192, 8.7386)).toBe(true); // Ajaccio
    expect(pointEnFrance(41.3874, 2.1686)).toBe(false); // Barcelone
    expect(pointEnFrance(45.4642, 9.19)).toBe(false); // Milan
    expect(pointEnFrance(46.2044, 6.1432)).toBe(false); // Genève
    expect(pointEnFrance(50.85, 4.35)).toBe(false); // Bruxelles
  });
});

describe("polyline Valhalla", () => {
  it("aller-retour et découpage en morceaux jointifs", () => {
    const pts: [number, number][] = Array.from({ length: 50 }, (_, i) => [43.9 + i * 0.001, 2.1 + i * 0.002]);
    const d = decoderPolyline6(encoderPolyline6(pts));
    expect(d.length).toBe(50);
    expect(d[49][0]).toBeCloseTo(43.949, 5);
    const morceaux = decouperTrace(pts, 20);
    expect(morceaux.length).toBe(3);
    expect(morceaux[0][morceaux[0].length - 1]).toEqual(morceaux[1][0]);
    expect(morceaux.reduce((s, m) => s + m.length, 0)).toBe(52);
  });
});

describe("bascule de secours (moteurs)", () => {
  it("l'actif répond : pas de bascule", async () => {
    const s = await executerChaine([{ fournisseur: "ptv", appel: async () => 1 }, { fournisseur: "here", appel: async () => 2 }]);
    expect([s.resultat, s.fournisseur, s.bascule]).toEqual([1, "ptv", false]);
  });
  it("l'actif tombe : le secours répond et la bascule est signalée", async () => {
    const s = await executerChaine([{ fournisseur: "ptv", appel: async () => { throw new Error("HTTP 503"); } }, { fournisseur: "here", appel: async () => 2 }]);
    expect([s.resultat, s.fournisseur, s.bascule]).toEqual([2, "here", true]);
    expect(s.echecs).toEqual([{ fournisseur: "ptv", message: "HTTP 503" }]);
  });
  it("tous échouent : aucun résultat, tous les échecs listés", async () => {
    const s = await executerChaine([{ fournisseur: "ptv", appel: async () => { throw new Error("a"); } }, { fournisseur: "here", appel: async () => { throw new Error("b"); } }]);
    expect(s.resultat).toBeNull();
    expect(s.echecs.length).toBe(2);
  });
});

describe("Bulletin pétrolier UE", () => {
  const pays = ["AT", "BE", "BG", "CY", "CZ", "DE", "DK", "EE", "ES", "FI", "FR", "GR", "HR", "HU", "IE", "IT", "LT", "LU", "LV", "MT", "NL", "PL", "PT", "RO", "SE", "SI", "SK", "UK", "EU"];
  const lettres = (i: number) => (i < 26 ? String.fromCharCode(65 + i) : String.fromCharCode(65 + Math.floor(i / 26) - 1) + String.fromCharCode(65 + (i % 26)));
  const cols: { c: string; nom: string; v: number }[] = [];
  let k = 1;
  for (const p of pays) for (const [cle, v] of [["euro95", 1700], ["diesel", 1800], ["LPG", 900]] as const) cols.push({ c: lettres(k++), nom: `${p}_price_with_tax_${cle}`, v: v + (p === "ES" ? -100 : 0) });
  const partage = ["Date", ...cols.map((x) => x.nom)];
  const cell = (c: string, r: number, v: string | number, s = false) => `<c r="${c}${r}"${s ? ' t="s"' : ""}><v>${v}</v></c>`;
  const ligne = (r: number, cs: string) => `<row r="${r}">${cs}</row>`;
  const xml =
    ligne(1, cols.map((x, i) => cell(x.c, 1, i + 1, true)).join("")) + ligne(2, "") + ligne(3, cell("A", 3, 0, true)) +
    ligne(4, cell("A", 4, 46307) + cols.map((x) => cell(x.c, 4, x.v)).join("")) +
    ligne(5, cell("A", 5, 46300) + cols.map((x) => cell(x.c, 5, x.v - 50)).join(""));
  const b = lireBulletin(xml, partage);
  it("semaine la plus récente, €/1000 L → €/L, UK → GB, France exclue (flux officiel)", () => {
    expect(b.semaine).toBe("2026-10-12");
    expect(b.prix.find((p) => p.pays === "ES" && p.carburant === "Gazole")?.prix).toBe(1.7);
    expect(b.prix.find((p) => p.pays === "GB" && p.carburant === "SP95")?.prix).toBe(1.7);
    expect(b.prix.some((p) => p.pays === "FR")).toBe(false);
    expect(b.prix.some((p) => p.pays === "EU" && p.carburant === "GPLc")).toBe(true);
  });
  it("SP98 et E85 estimés d'après le SP95 du pays et l'écart français", () => {
    const e = estimes(b, { SP98: 1.05, E85: 0.5 });
    expect(e.find((p) => p.pays === "ES" && p.carburant === "SP98")?.prix).toBe(1.68);
    expect(e.find((p) => p.pays === "ES" && p.carburant === "E85")?.prix).toBe(0.8);
  });
});

describe("stations espagnoles (MITECO)", () => {
  it("décimales à virgule, date de Madrid, vente au public, carburants du catalogue", () => {
    expect(nombreEs("1,799")).toBe(1.799);
    expect(nombreEs("")).toBeNull();
    expect(dateEspagne("20/10/2026 17:53:32")).toBe("2026-10-20T15:53:32.000Z"); // CEST = UTC+2
    expect(dateEspagne("26/10/2026 10:00:00")).toBe("2026-10-26T09:00:00.000Z"); // CET = UTC+1
    const s = normaliserEspagne(
      [
        { "Tipo Venta": "P", Latitud: "41,38", "Longitud (WGS84)": "2,17", IDEESS: "1", "Rótulo": "REPSOL", "Dirección": "C/ X", Localidad: "BARCELONA", "C.P.": "08001", "Precio Gasoleo A": "1,699", "Precio Gasolina 95 E5": "1,599", "Precio Gasolina 98 E5": "" },
        { "Tipo Venta": "R", Latitud: "41,38", "Longitud (WGS84)": "2,17", IDEESS: "2", "Precio Gasoleo A": "1,5" },
        { "Tipo Venta": "P", Latitud: "x", "Longitud (WGS84)": "2,17", IDEESS: "3", "Precio Gasoleo A": "1,5" },
      ],
      "2026-10-20T15:53:32.000Z",
    );
    expect(s.length).toBe(1);
    expect(s[0]).toMatchObject({ id: "ES-1", enseigne: "Repsol", ville: "Barcelona", prix: { Gazole: 1.699, SP95: 1.599, "SP95-E10": 1.599 } });
    expect(s[0].prix.SP98).toBeUndefined();
  });
});
