// Durcissement r1 : lecture tolérante de l'état local (D1) et requêtes de recherche de voiture sans OR (D8).
import { describe, expect, it } from "vitest";
import { normaliserTrajet } from "../../src/lib/historique";
import { analyserRecherche, requetesRecherche } from "../../supabase/functions/_shared/eea.ts";

const base = {
  id: "t", debut: 1, fin: 2, depart: { lat: 43.9, lon: 2.1, nom: null }, arrivee: { lat: 43.8, lon: 2.2, nom: null },
  km: 4, litres: 0.3, carburant: "SP95-E10", vitesses: [10], consos: [5],
};

describe("D1 normaliserTrajet", () => {
  it("rejette un trajet sans départ, sans coordonnées valides ou sans courbes", () => {
    expect(normaliserTrajet({ id: "t", vitesses: [] })).toBeNull();
    expect(normaliserTrajet({ ...base, depart: undefined })).toBeNull();
    expect(normaliserTrajet({ ...base, arrivee: { lat: NaN, lon: 1, nom: null } })).toBeNull();
    expect(normaliserTrajet({ ...base, vitesses: null })).toBeNull();
    expect(normaliserTrajet(null)).toBeNull();
  });
  it("répare ce qui est réparable (fin, voiture, moyennes, compteurs)", () => {
    const t = normaliserTrajet({ ...base, fin: undefined })!;
    expect(t.fin).toBe(1);
    expect(t.voiture).toEqual({ nom: "", detail: "", carburant: "SP95-E10" });
    expect(t.moyennes).toEqual({});
    expect(t.prix_litre).toBeNull();
    expect(t.personnes).toBe(1);
  });
});

describe("D8 requetesRecherche", () => {
  const T = "[CO2Emission].[latest].[co2cars]";
  it("n'utilise jamais OR : une requête modèle + une requête marque par mot", () => {
    const q = requetesRecherche(T, analyserRecherche("renault clio 2017 120")!);
    expect(q).toHaveLength(3);
    expect(q.every((s) => !/\bOR\b/.test(s))).toBe(true);
    expect(q[0]).toContain("Cn LIKE '%RENAULT%' AND Cn LIKE '%CLIO%'");
    expect(q[1]).toContain("Mk LIKE 'RENAULT%' AND Cn LIKE '%CLIO%'");
    expect(q[2]).toContain("Mk LIKE 'CLIO%' AND Cn LIKE '%RENAULT%'");
    expect(q.every((s) => s.includes("Year=2017") && s.includes("[Ep (KW)] BETWEEN"))).toBe(true);
  });
});
