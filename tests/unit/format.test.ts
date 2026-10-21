import { describe, expect, it } from "vitest";
import { anciennete, casseTitre, distance, ecart, libellesStations, moitie, nomStation, partiesPrix, prix3, seuilMoitie, trier } from "../../src/lib/format";

describe("prix à trois décimales", () => {
  it("formate avec virgule et trois décimales", () => {
    expect(prix3(2.191)).toBe("2,191");
    expect(prix3(1.9)).toBe("1,900");
    expect(prix3(0.879)).toBe("0,879");
  });
  it("sépare la troisième décimale pour l'exposant du totem", () => {
    expect(partiesPrix(2.191)).toEqual({ base: "2,19", fin: "1" });
    expect(partiesPrix(1.99)).toEqual({ base: "1,99", fin: "0" });
  });
});

describe("distance", () => {
  it("km avec une décimale, mètres sous 1 km", () => {
    expect(distance(1.734)).toBe("1,7 km");
    expect(distance(0.42)).toBe("420 m");
  });
});

describe("écart à la moyenne France", () => {
  it("négatif = moins cher (vert)", () => {
    expect(ecart(2.109, 2.161)).toEqual({ texte: "−5,2 c vs France", sens: "lo" });
  });
  it("positif = plus cher (orange)", () => {
    expect(ecart(2.202, 2.161)).toEqual({ texte: "+4,1 c vs France", sens: "hi" });
  });
  it("égal et moyenne absente", () => {
    expect(ecart(2.161, 2.161)?.sens).toBe("egal");
    expect(ecart(2.161, null)).toBeNull();
  });
});

describe("ancienneté du prix", () => {
  const now = new Date("2026-10-20T12:00:00Z");
  it("minutes, heures, hier", () => {
    expect(anciennete("2026-10-20T11:35:00Z", now)).toEqual({ texte: "il y a 25 min", ancien: false });
    expect(anciennete("2026-10-20T09:00:00Z", now)).toEqual({ texte: "il y a 3 h", ancien: false });
    expect(anciennete("2026-10-19T08:00:00Z", now)).toEqual({ texte: "hier", ancien: false });
  });
  it("au-delà de 48 h : « prix du JJ/MM » signalé ancien", () => {
    const r = anciennete("2026-10-17T12:00:00Z", now);
    expect(r.ancien).toBe(true);
    expect(r.texte).toMatch(/^prix du 17\/10$/);
  });
  it("exactement 48 h est ancien, 47 h ne l'est pas", () => {
    expect(anciennete("2026-10-18T12:00:00Z", now).ancien).toBe(true);
    expect(anciennete("2026-10-18T13:00:00Z", now).ancien).toBe(false);
  });
});

describe("tri", () => {
  const l = [
    { id: "a", prix: 2.2, distanceKm: 1 },
    { id: "b", prix: 2.1, distanceKm: 3 },
    { id: "c", prix: 2.1, distanceKm: 2 },
  ];
  it("moins cher, à prix égal le plus proche d'abord", () => {
    expect(trier(l, "prix").map((x) => x.id)).toEqual(["c", "b", "a"]);
  });
  it("plus proche", () => {
    expect(trier(l, "distance").map((x) => x.id)).toEqual(["a", "c", "b"]);
  });
  it("ne modifie pas la liste d'origine", () => {
    trier(l, "prix");
    expect(l[0].id).toBe("a");
  });
});

describe("moitié la moins chère", () => {
  const couleurs = (p: number[]) => { const s = seuilMoitie(p); return p.map((x) => moitie(x, s)); };
  it("n pair : la moitié basse est verte", () => {
    expect(couleurs([2.3, 2.1, 2.2, 2.4])).toEqual(["hi", "lo", "lo", "hi"]);
  });
  it("n impair : coupure au plus près de la moitié", () => {
    expect(couleurs([2.1, 2.2, 2.3]).filter((c) => c === "lo")).toHaveLength(1);
  });
  it("prix égaux : même couleur", () => {
    const c = couleurs([2.1, 2.2, 2.2, 2.3]);
    expect(c[1]).toBe(c[2]);
  });
  it("médiane partagée par les plus chers : au moins une orange (cas Gaillac 2,169 / 2,185 / 2,185)", () => {
    expect(couleurs([2.169, 2.185, 2.185])).toEqual(["lo", "hi", "hi"]);
  });
  it("médiane partagée au milieu (cas Albi SP95-E10) : jamais 6 vertes sur 7", () => {
    const c = couleurs([1.99, 2.182, 2.182, 2.182, 2.182, 2.182, 2.191]);
    expect(c.filter((x) => x === "lo").length).toBeLessThanOrEqual(4);
    expect(c.filter((x) => x === "hi").length).toBeGreaterThan(0);
  });
  it("au moins une verte et une orange dès deux prix distincts", () => {
    for (const p of [[1, 2], [1, 1, 1, 2], [1, 2, 2, 2], [1, 1, 2, 2, 2, 3]]) {
      const c = couleurs(p);
      expect(c).toContain("lo");
      expect(c).toContain("hi");
    }
  });
  it("un seul prix : tout vert ; liste vide", () => {
    expect(couleurs([2.1, 2.1])).toEqual(["lo", "lo"]);
    expect(seuilMoitie([])).toBeNull();
  });
});

describe("nom de station", () => {
  it("enseigne + ville", () => {
    expect(nomStation({ enseigne: "Leclerc", ville: "Le Sequestre", nom: "LECLERC LE SEQUESTRE" })).toBe("Leclerc Le Sequestre");
  });
  it("« Indépendant sans enseigne » n'est pas une marque", () => {
    expect(nomStation({ enseigne: "Indépendant sans enseigne", nom: "SARL GARAGE DU PONT", ville: "Saussenac" })).toBe("Sarl Garage du Pont");
    expect(nomStation({ enseigne: "Indépendant sans enseigne", ville: "Saussenac" })).toBe("Station Saussenac");
  });
  it("repli sur nom puis ville", () => {
    expect(nomStation({ nom: "RELAIS", ville: "Albi" })).toBe("RELAIS");
    expect(nomStation({ ville: "Albi" })).toBe("Station Albi");
  });
});

describe("libellés sans doublon", () => {
  it("deux stations « TotalEnergies Albi » sont distinguées par leur nom officiel", () => {
    const l = libellesStations([
      { id: "1", enseigne: "TotalEnergies", ville: "Albi", nom: "RELAIS DES FONTANELLES" },
      { id: "2", enseigne: "TotalEnergies", ville: "Albi", nom: "AUTO 81 SARL" },
      { id: "3", enseigne: "Esso Express", ville: "Albi", nom: "ESSO DU STADE ALBI" },
    ]);
    expect(l.get("1")).toBe("TotalEnergies Albi · Relais des Fontanelles");
    expect(l.get("2")).toBe("TotalEnergies Albi · Auto 81 Sarl");
    expect(l.get("3")).toBe("Esso Express Albi");
  });
  it("Royaume-Uni : le nom « Asda · adresse » ne redouble pas l'enseigne (audit LOW 12)", () => {
    const l = libellesStations([
      { id: "GB-1", enseigne: "Asda", nom: "Asda · 112 Vallance Road", adresse: "112 Vallance Road" },
      { id: "GB-2", enseigne: "Asda", nom: "Asda · Old Kent Road", adresse: "Old Kent Road" },
    ]);
    expect(l.get("GB-1")).toBe("Asda · 112 Vallance Road");
    expect(l.get("GB-2")).toBe("Asda · Old Kent Road");
  });
  it("casse de titre seulement pour les majuscules", () => {
    expect(casseTitre("ROUTE DE CORDES")).toBe("Route de Cordes");
    expect(casseTitre("Carrefour Contact")).toBe("Carrefour Contact");
  });
});

describe("moitié la moins chère, prix à égalité et moyenne nationale (streamline R2, P3)", () => {
  const couleurs = (p: number[], moy?: number) => { const s = seuilMoitie(p, moy); return p.map((x) => moitie(x, s)); };
  it("cas E85 Albi (0,858 / 0,879 ×3 / 1,068, moyenne 0,912) : les trois 0,879 sous la moyenne sont vertes, comme leur écart", () => {
    expect(couleurs([0.858, 0.879, 0.879, 0.879, 1.068], 0.912)).toEqual(["lo", "lo", "lo", "lo", "hi"]);
  });
  it("aucune pastille verte au-dessus de la moyenne quand une coupure aussi proche de la moitié l'évite", () => {
    expect(couleurs([1.99, 2.182, 2.182, 2.182, 2.182, 2.182, 2.191], 2.1)).toEqual(["lo", "hi", "hi", "hi", "hi", "hi", "hi"]);
  });
  it("sans égalité de coupures, la moyenne ne change rien", () => {
    expect(couleurs([2.3, 2.1, 2.2, 2.4], 3)).toEqual(["hi", "lo", "lo", "hi"]);
  });
});
