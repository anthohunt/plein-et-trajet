// Jalon 5 (T5.1) — base EEA : normalisation du D.2, filtres de la requête SQL, agrégation par mode pondéré sur les VRAIES
// réponses Discodata enregistrées le 2026-10-21 (tests/fixtures/eea-*.json, requête exacte de la fonction voiture-eea).
import { describe, expect, it } from "vitest";
import { agreger, analyserRecherche, carburantDeFt, libelleVersion, normaliserD2, requeteD2, requeteRecherche, tablesPour, type LigneEea } from "../../supabase/functions/_shared/eea.ts";

import f5RBU0C from "../fixtures/eea-5RBU0C.json";
import f5RBF0A from "../fixtures/eea-5RBF0A.json";
import fHNEK from "../fixtures/eea-HNEKJ1B500.json";
const FIXTURES: Record<string, unknown> = { "5RBU0C": f5RBU0C, "5RBF0A": f5RBF0A, HNEKJ1B500: fHNEK };
const fixture = (nom: string) => FIXTURES[nom] as { requete: string; results: LigneEea[] };
const TABLES = ["[CO2Emission].[latest].[co2cars]", "[CO2Emission].[latest].[co2cars_2023Pv27]", "[CO2Emission].[latest].[co2cars_2024Fv30]", "[CO2Emission].[latest].[co2cars_2025Pv31]"];

describe("D.2 : normalisation", () => {
  it("un morceau : majuscules, espaces retirés", () => {
    expect(normaliserD2("5rbu0c")).toEqual({ ve: "5RBU0C" });
    expect(normaliserD2(" 5RBU 0C ")).toEqual({ ve: "5RBU0C" });
  });
  it("trois morceaux : type, variante, version", () => {
    expect(normaliserD2("R 5RBU 5RBU0C")).toEqual({ t: "R", va: "5RBU", ve: "5RBU0C" });
    expect(normaliserD2("r 5rbu 5rbu0c")).toEqual({ t: "R", va: "5RBU", ve: "5RBU0C" });
  });
  it("caractères hors liste refusés : rien n'entre dans le SQL", () => {
    for (const x of ["5RBU0C'", "5RB;U0C", "5RBU0C--'", "' OR 1=1 --", "5RBU%", "[x]", "5RBU_0C", ""]) expect(normaliserD2(x)).toBeNull();
    expect(() => requeteD2(TABLES[0], { ve: "5RBU0C' OR '1'='1" })).toThrow();
    expect(() => requeteD2("[CO2Emission].[latest].[co2cars]; DROP", { ve: "5RBU0C" })).toThrow();
  });
  it("requête du code : Ve, puis T et Va quand ils sont donnés", () => {
    expect(requeteD2(TABLES[0], { ve: "5RBU0C" })).toContain("WHERE Ve='5RBU0C' GROUP BY");
    expect(requeteD2(TABLES[0], { t: "R", va: "5RBU", ve: "5RBU0C" })).toContain("WHERE Ve='5RBU0C' AND T='R' AND Va='5RBU'");
    expect(fixture("5RBU0C").requete).toBe(requeteD2(TABLES[0], { ve: "5RBU0C" }));
  });
});

describe("recherche « clio 2017 120 »", () => {
  it("mots, année, chevaux → kW ± 4", () => {
    expect(analyserRecherche("clio 2017 120")).toEqual({ mots: ["CLIO"], annee: 2017, kwMin: 85, kwMax: 91 });
    expect(analyserRecherche("renault clio")).toEqual({ mots: ["RENAULT", "CLIO"], annee: null, kwMin: null, kwMax: null });
  });
  it("caractères hors liste, plus de 4 mots ou aucun mot : refusé", () => {
    expect(analyserRecherche("clio' 2017")).toBeNull();
    expect(analyserRecherche("clio%")).toBeNull();
    expect(analyserRecherche("a b c d e f")).toBeNull();
    expect(analyserRecherche("2017 120")).toBeNull();
  });
  it("SQL : LIKE sur le nom ou la marque, année et fourchette de puissance en entiers", () => {
    const sql = requeteRecherche(TABLES[0], analyserRecherche("clio 2017 120")!);
    expect(sql).toContain("(Cn LIKE '%CLIO%' OR Mk LIKE '%CLIO%') AND Year=2017 AND [Ep (KW)] BETWEEN 85 AND 91");
  });
  it("tables : l'année choisit la sienne, sinon la table 2010-2022 ; sans année toutes", () => {
    expect(tablesPour(TABLES, 2024)).toEqual([TABLES[2]]);
    expect(tablesPour(TABLES, 2017)).toEqual([TABLES[0]]);
    expect(tablesPour(TABLES, null)).toEqual(TABLES);
    expect(tablesPour([...TABLES, "x; DROP TABLE y"], null)).toEqual(TABLES);
  });
});

describe("agrégation : mode pondéré par les immatriculations (réponses réelles)", () => {
  it("5RBU0C 2017 : les lignes réelles 12 605 / 367 / 367 / 106 / 81", () => {
    const l2017 = fixture("5RBU0C").results.filter((l) => l.Year === 2017);
    expect(l2017.slice(0, 5).map((l) => l.n)).toEqual([12605, 367, 367, 106, 81]);
  });
  it("5RBU0C → Renault Clio 2017, 87 kW, 1 197 cm³, 1 165 kg, SP95-E10, 118 g/km (NEDC) ; le bruit à 131 kW est écarté", () => {
    const { versions } = agreger(fixture("5RBU0C").results, { bruit: true });
    const v = versions[0];
    expect(v).toMatchObject({ marque: "Renault", modele: "Clio", t: "R", va: "5RBU", ve: "5RBU0C", annee: 2017, puissance_kw: 87, cylindree_cm3: 1197, masse_kg: 1165, carburant: "SP95-E10", co2_nedc: 118, procedure: "NEDC" });
    expect(v.immatriculations).toBe(13864); // toutes les lignes (Mk, T, Va, Ve, 2017), bruit compris
    expect(v.conso_officielle_l100).toBeCloseTo((118 * 1.21) / 23.3, 3); // 6,128 L/100 km
    expect(libelleVersion(v)).toBe("1.2 · 118 ch");
    // les versions qui pèsent moins de 2 % de la plus immatriculée (Va « 5RBU0C », 2016, 2019) sont retirées ; 2018 reste
    expect(versions.map((x) => x.annee)).toEqual([2017, 2018]);
  });
  it("5RBF0A → Clio diesel 2017, Gazole", () => {
    const v = agreger(fixture("5RBF0A").results, { bruit: true }).versions[0];
    expect(v).toMatchObject({ marque: "Renault", ve: "5RBF0A", annee: 2017, carburant: "Gazole", puissance_kw: 55, cylindree_cm3: 1461 });
    expect(v.conso_officielle_l100).toBeCloseTo((85 * 1.21) / 26.4, 3);
  });
  it("HNEK-J1B500 → Peugeot 208 2021, WLTP : consommation officielle = Fc", () => {
    const v = agreger(fixture("HNEKJ1B500").results, { bruit: true }).versions[0];
    expect(v).toMatchObject({ marque: "Peugeot", modele: "208", ve: "HNEK-J1B500", annee: 2021, carburant: "SP95-E10", puissance_kw: 74, procedure: "WLTP" });
    const fc = fixture("HNEKJ1B500").results.filter((l) => l.Year === 2021).sort((a, b) => b.n - a.n)[0].Fc;
    expect(v.conso_officielle_l100).toBeCloseTo(fc as number, 3);
  });
  it("versions triées par immatriculations, la plus immatriculée en tête", () => {
    for (const nom of ["5RBU0C", "5RBF0A", "HNEKJ1B500"]) {
      const n = agreger(fixture(nom).results, { bruit: true }).versions.map((v) => v.immatriculations);
      expect(n).toEqual([...n].sort((a, b) => b - a));
    }
  });
  it("carburant : Ft normalisé ; électrique et hydrogène écartés", () => {
    expect(carburantDeFt("PETROL")).toBe("SP95-E10");
    expect(carburantDeFt("Petrol ")).toBe("SP95-E10");
    expect(carburantDeFt("petrol/electric")).toBe("SP95-E10");
    expect(carburantDeFt("Diesel")).toBe("Gazole");
    expect(carburantDeFt("LPG")).toBe("GPLc");
    expect(carburantDeFt("E85")).toBe("E85");
    expect(carburantDeFt("ELECTRIC")).toBe("electrique");
    expect(carburantDeFt("hydrogen")).toBe("electrique");
    const elec: LigneEea[] = [{ Year: 2021, Mk: "PEUGEOT", Cn: "208", T: "U", Va: "H", Ve: "ZKXZ-J0A000", m: 1455, kw: 100, ec: null, Ft: "ELECTRIC", enedc: null, ewltp: 0, Fc: null, n: 75444 }];
    expect(agreger(elec, { bruit: true })).toEqual({ versions: [], electriques: 75444 });
  });
});
