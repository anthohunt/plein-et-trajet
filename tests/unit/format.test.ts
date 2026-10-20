import { describe, expect, it } from "vitest";
import { anciennete, distance, ecart, moitie, nomStation, partiesPrix, prix3, seuilMoitie, trier } from "../../src/lib/format";

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
  it("n pair : la moitié basse est verte", () => {
    const p = [2.3, 2.1, 2.2, 2.4];
    const s = seuilMoitie(p);
    expect(p.map((x) => moitie(x, s))).toEqual(["hi", "lo", "lo", "hi"]);
  });
  it("n impair : ⌈n/2⌉ vertes", () => {
    const p = [2.1, 2.2, 2.3];
    const s = seuilMoitie(p);
    expect(p.filter((x) => moitie(x, s) === "lo")).toHaveLength(2);
  });
  it("prix égaux : même couleur", () => {
    const p = [2.1, 2.2, 2.2, 2.3];
    const s = seuilMoitie(p);
    expect(moitie(2.2, s)).toBe("lo");
  });
  it("liste vide", () => {
    expect(seuilMoitie([])).toBeNull();
  });
});

describe("nom de station", () => {
  it("enseigne + ville", () => {
    expect(nomStation({ enseigne: "Leclerc", ville: "Le Sequestre", nom: "LECLERC LE SEQUESTRE" })).toBe("Leclerc Le Sequestre");
  });
  it("repli sur nom puis ville", () => {
    expect(nomStation({ nom: "RELAIS", ville: "Albi" })).toBe("RELAIS");
    expect(nomStation({ ville: "Albi" })).toBe("Station Albi");
  });
});
