import { describe, expect, it } from "vitest";
import { ajouterTva, alpha2, lignesDepuisHere, lignesDepuisPtv, messageErreurPeages, prixHtEuros, totalPeages, ErreurPeages } from "../../supabase/functions/_shared/peages";

const TVA = { FR: 20, ES: 21, IT: 22, CH: 8.1 };

describe("TVA des péages (PTV : prix HT)", () => {
  it("ajoute la TVA du pays et arrondit au centime", () => {
    expect(ajouterTva(10, 20)).toBe(12);
    expect(ajouterTva(10, 21)).toBe(12.1);
    expect(ajouterTva(17.83, 20)).toBe(21.4); // 21,396 → 21,40
    expect(ajouterTva(40, 8.1)).toBe(43.24);
    expect(ajouterTva(0, 22)).toBe(0);
  });
  it("PTV : chaque section reçoit la TVA de SON pays", () => {
    const l = lignesDepuisPtv(
      {
        toll: {
          systems: [{ name: "ASF" }, { name: "Autostrade" }],
          sections: [
            { countryCode: "FR", displayName: "A61 Toulouse → Narbonne", tollSystemIndex: 0, costs: [{ price: 11.58, currency: "EUR" }] },
            { countryCode: "IT", displayName: "A10 Savone → Gênes", tollSystemIndex: 1, costs: [{ price: 5, currency: "EUR" }] },
            { countryCode: "ES", displayName: "AP-7", costs: [{ price: 0, currency: "EUR" }] },
          ],
        },
      },
      TVA,
    );
    expect(l.map((x) => x.montant)).toEqual([13.9, 6.1, 0]);
    expect(l[0].libelle).toBe("ASF · A61 Toulouse → Narbonne");
    expect(totalPeages(l)).toBe(20);
  });
  it("PTV : monnaie locale convertie en euros par PTV avant la TVA ; paiement avec abonnement écarté", () => {
    expect(prixHtEuros([{ price: 40, currency: "CHF", convertedPrice: { price: 42.5, currency: "EUR" } }])).toBe(42.5);
    expect(prixHtEuros([{ price: 8, currency: "EUR", paymentMethods: ["ELECTRONIC_TOLL_COLLECTION_SUBSCRIPTION"] }, { price: 10, currency: "EUR", paymentMethods: ["CASH"] }])).toBe(10);
    expect(prixHtEuros([{ price: 40, currency: "CHF" }])).toBeNull();
  });
  it("PTV : pas de bloc toll = réponse invalide ; section sans TVA connue = refus (on ne devine pas)", () => {
    expect(() => lignesDepuisPtv({}, TVA)).toThrow(ErreurPeages);
    expect(() => lignesDepuisPtv({ toll: { sections: [{ countryCode: "XX", costs: [{ price: 3, currency: "EUR" }] }] } }, TVA)).toThrow(ErreurPeages);
    expect(lignesDepuisPtv({ toll: { sections: [] } }, TVA)).toEqual([]); // trajet sans péage
  });
});

describe("HERE v8 (prix TTC)", () => {
  it("prix TTC repris tel quel, paiement espèces/carte préféré, alpha-3 → alpha-2", () => {
    const l = lignesDepuisHere({
      routes: [{ sections: [{ tolls: [
        { countryCode: "FRA", tollSystem: "ASF", fares: [{ name: "A9", price: { currency: "EUR", value: 9.9 }, paymentMethods: ["transponder"] }, { name: "A9", price: { currency: "EUR", value: 10.2 }, paymentMethods: ["bankCard"] }] },
        { countryCode: "ESP", tollSystem: "AP-7", fares: [{ name: "AP-7", price: { currency: "EUR", value: 0 }, paymentMethods: ["cash"] }] },
      ] }] }],
    });
    expect(l.map((x) => [x.pays, x.montant])).toEqual([["FR", 10.2], ["ES", 0]]);
    expect(alpha2("CHE")).toBe("CH");
  });
  it("devise convertie utilisée quand le prix local n'est pas en euros", () => {
    const l = lignesDepuisHere({ routes: [{ sections: [{ tolls: [{ countryCode: "CHE", tollSystem: "X", fares: [{ price: { currency: "CHF", value: 40 }, convertedPrice: { currency: "EUR", value: 41.9 }, paymentMethods: ["cash"] }] }] }] }] });
    expect(l[0].montant).toBe(41.9);
  });
  it("réponse sans route = invalide", () => {
    expect(() => lignesDepuisHere({})).toThrow(ErreurPeages);
  });
});

describe("messages de l'écran Moteurs", () => {
  it("401 → « Clé refusée par PTV (401) »", () => {
    expect(messageErreurPeages("PTV", new ErreurPeages("cle_refusee", 401))).toBe("Clé refusée par PTV (401)");
    expect(messageErreurPeages("HERE", new ErreurPeages("cle_refusee", 403))).toBe("Clé refusée par HERE (403)");
    expect(messageErreurPeages("PTV", new ErreurPeages("quota", 429))).toContain("429");
  });
});
