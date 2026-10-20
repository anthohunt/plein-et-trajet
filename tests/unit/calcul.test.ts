import { describe, expect, it } from "vitest";
import { coutCarburant, dateCourte, euros, libelleType, ordreMotorisations, validerPrix } from "../../src/lib/calcul";
import { lignesVehicules, titreMarque, titreModele, corrigerAccents } from "../../supabase/functions/_shared/ademe";

describe("prix perso (US-4.2, US-4.E2)", () => {
  it.each([
    ["1,699", 1.699],
    ["1.699", 1.699],
    [" 2 ", 2],
    ["0,50", 0.5],
    ["4,00", 4],
    ["4", 4],
    ["1,", 1],
  ])("accepte %s", (saisie, valeur) => expect(validerPrix(saisie)).toEqual({ ok: true, valeur }));
  it.each(["12", "abc", "", "  ", "0,49", "4,01", "0", "-1,5", "1,6999", "1,7€", "1,2,3", "NaN", "Infinity", "1e1"])("refuse %j", (saisie) =>
    expect(validerPrix(saisie)).toEqual({ ok: false }),
  );
});

describe("coût du carburant", () => {
  it("litres × prix, arrondi au centime", () => {
    expect(coutCarburant(18.44, 2.161)).toBe(39.85);
    expect(coutCarburant(18.44, 1.699)).toBe(31.33);
    expect(euros(31.33)).toBe("31,33");
  });
  it("recalcul au prix perso puis retour à la moyenne = valeur d'origine", () => {
    const avant = coutCarburant(16.2, 2.161);
    coutCarburant(16.2, 1.699);
    expect(coutCarburant(16.2, 2.161)).toBe(avant);
  });
});

describe("libellés", () => {
  it("autoroute / voie rapide selon le numéro de voie", () => {
    expect(libelleType("autoroute", ["A68", "A62"])).toBe("Autoroute");
    expect(libelleType("autoroute", ["N88"])).toBe("Voie rapide");
    expect(libelleType("route", [])).toBe("Route");
    expect(libelleType("ville", [])).toBe("Ville");
    expect(libelleType("montee", [])).toBe("Montée");
  });
  it("date courte en français", () => {
    expect(dateCourte("2026-10-12T10:00:00Z")).toMatch(/12 oct/);
  });
});

describe("motorisations classées par puissance (US-3.E4)", () => {
  const m = (id: string, kw: number) => ({ id, puissance_kw: kw, motorisation: id, carburant: "SP95-E10" });
  it("la plus proche de la puissance moyenne est proposée en premier, le reste par puissance croissante", () => {
    const { proposee, ordre } = ordreMotorisations([m("d", 96), m("a", 55), m("c", 75), m("b", 74), m("e", 130)]);
    // moyenne = 86 : la plus proche est 96 (écart 10) contre 75 (écart 11)
    expect(proposee?.id).toBe("d");
    expect(ordre.map((x) => x.id)).toEqual(["d", "a", "b", "c", "e"]);
  });
  it("une seule motorisation, aucune motorisation", () => {
    expect(ordreMotorisations([m("a", 55)]).ordre.map((x) => x.id)).toEqual(["a"]);
    expect(ordreMotorisations([]).proposee).toBeNull();
  });
});

describe("import ADEME → vehicules", () => {
  const base = {
    Marque: "PEUGEOT", "Modèle": "208", Description_Commerciale: "208 (101ch)", Energie: "ESSENCE", "Poids_à_vide": 1090, Puissance_maximale: 74,
    Type_de_boite: "MECANIQUE", Conso_basse_vitesse_Min: 6, Conso_basse_vitesse_Max: 7, Conso_moyenne_vitesse_Min: 5, Conso_moyenne_vitesse_Max: 5,
    Conso_haute_vitesse_Min: 4, Conso_haute_vitesse_Max: 4, "Conso_T-haute_vitesse_Min": 5, "Conso_T-haute_vitesse_Max": 6,
  };
  it("normalise, moyenne Min/Max, regroupe les lignes d'une même version", async () => {
    const l = await lignesVehicules([base, { ...base, Conso_basse_vitesse_Min: 7, Conso_basse_vitesse_Max: 8 }]);
    expect(l).toHaveLength(1);
    expect(l[0]).toMatchObject({ marque: "Peugeot", modele: "208", carburant: "SP95-E10", masse_kg: 1090, puissance_kw: 74, conso_basse: 7, conso_tres_haute: 5.5 });
    expect(l[0].motorisation).toBe("208 (101ch) · mécanique");
    expect(l[0].id).toMatch(/^[0-9a-f]{16}$/);
  });
  it("exclut l'électrique, l'hybride rechargeable et les lignes sans consommation", async () => {
    const l = await lignesVehicules([
      { ...base, Energie: "ELECTRIC" },
      { ...base, Energie: "ELEC+ESSENC HR" },
      { ...base, Conso_basse_vitesse_Min: null, Conso_basse_vitesse_Max: null },
      { ...base, Energie: "GAZOLE", Description_Commerciale: "208 (102ch)" },
      { ...base, Energie: "SUPERETHANOL", Description_Commerciale: "208 flex" },
      { ...base, Energie: "ESS+G.P.L.", Description_Commerciale: "208 GPL" },
    ]);
    expect(l.map((x) => x.carburant).sort()).toEqual(["E85", "GPLc", "Gazole"]);
  });
  it("marques lisibles et accents réparés", () => {
    expect(titreMarque("B.M.W.")).toBe("BMW");
    expect(titreMarque("ALFA ROMEO")).toBe("Alfa Romeo");
    expect(titreMarque("PEUGEOT")).toBe("Peugeot");
    expect(corrigerAccents("220i Gran CoupÃ©")).toBe("220i Gran Coupé");
    expect(corrigerAccents("Coupé")).toBe("Coupé");
  });
  it("modèles en casse lisible, sigles et références conservés", () => {
    expect(titreModele("CLIO")).toBe("Clio");
    expect(titreModele("SANDERO")).toBe("Sandero");
    expect(titreModele("C3 AIRCROSS")).toBe("C3 Aircross");
    expect(titreModele("T-ROC")).toBe("T-ROC"); // mots de 3 lettres ou moins conservés
    expect(titreModele("CR-V")).toBe("CR-V");
    expect(titreModele("GRAND SCENIC")).toBe("Grand Scenic");
    expect(titreModele("208")).toBe("208");
    expect(titreModele("MX-30")).toBe("MX-30");
    expect(titreModele("Série 3")).toBe("Série 3");
    expect(titreModele("ID.BUZZ")).toBe("ID.BUZZ");
  });
});
