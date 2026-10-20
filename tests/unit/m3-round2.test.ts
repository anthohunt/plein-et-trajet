import { describe, expect, it } from "vitest";
import { decouperTrace, encoderPolyline6, decoderPolyline6, longueurKm, type Pt } from "../../supabase/functions/_shared/europe";
import { lignesDepuisHere } from "../../supabase/functions/_shared/peages";
import { connexionDepuisFournisseur } from "../../supabase/functions/_shared/itineraire-europe";
import { normaliserAllemagne, normaliserRoumanie, normaliserRoyaumeUni, normaliserAutriche, normaliserCroatie, normaliserDanemark, normaliserIslande, normaliserItalie, normaliserPortugal, normaliserSlovenie } from "../../supabase/functions/_shared/stations-pays";

// ~1 340 km vers le sud-est à 0,001° de pas : 14 000 points ne suffisent pas à dépasser la limite de distance, la distance si
const trace = (n: number, pasLat: number): Pt[] => Array.from({ length: n }, (_, i) => [43.9 + i * pasLat, 2.1 + i * pasLat * 0.8]);
const km = longueurKm;

describe("découpage du tracé Valhalla (limite de 16 000 points ET de 1 000 km)", () => {
  it("un tracé de 1 340 km tient en 2 morceaux de ≤ 800 km, jointifs", () => {
    const pts = trace(1400, 0.0105);
    expect(km(pts)).toBeGreaterThan(1000); // au-delà de la limite de /trace_attributes
    const m = decouperTrace(pts);
    expect(m.length).toBe(Math.ceil(km(pts) / 800));
    for (const x of m) expect(km(x)).toBeLessThanOrEqual(800);
    expect(m[0][m[0].length - 1]).toEqual(m[1][0]); // point de jonction répété
    expect(m.reduce((s, x) => s + x.length, 0)).toBe(pts.length + m.length - 1);
  });
  it("un tracé de 1 960 km (Albi → Belgrade) : 3 morceaux, aucun au-delà de 800 km", () => {
    const pts = trace(2000, 0.0105 * 1.4);
    expect(km(pts)).toBeGreaterThan(1900);
    const m = decouperTrace(pts);
    expect(m.length).toBeGreaterThanOrEqual(3);
    for (const x of m) expect(km(x)).toBeLessThanOrEqual(800);
  });
  it("le découpage par points reste actif (≤ 14 000 points) et un court trajet n'est pas découpé", () => {
    expect(decouperTrace(trace(30000, 0.00002)).every((x) => x.length <= 14000)).toBe(true);
    expect(decouperTrace(trace(100, 0.001)).length).toBe(1);
  });
  it("la polyline survit à l'aller-retour", () => {
    const p = trace(10, 0.01);
    expect(decoderPolyline6(encoderPolyline6(p))[9][0]).toBeCloseTo(p[9][0], 5);
  });
});

describe("HERE : prix « fourchette » (RangePrice)", () => {
  it("retient le maximum de la fourchette et le signale, sans rejeter l'itinéraire", () => {
    const l = lignesDepuisHere({ routes: [{ sections: [{ tolls: [
      { countryCode: "FRA", tollSystem: "ASF", fares: [{ name: "A61", price: { type: "range", currency: "EUR", minimum: 10, maximum: 13.4 }, paymentMethods: ["bankCard"] }] },
      { countryCode: "ESP", tollSystem: "AP-7", fares: [{ name: "AP-7", price: { type: "value", currency: "EUR", value: 4.2 }, paymentMethods: ["cash"] }] },
    ] }] }] });
    expect(l[0].montant).toBe(13.4);
    expect(l[0].fourchette).toBe(true); // round 5 : drapeau, la phrase est composée par textes.ts (T.peageFourchette)
    expect(l[1].montant).toBe(4.2);
    expect(l[1].fourchette).toBeUndefined();
  });
});

describe("limiteur et adresse du fournisseur lus en table", () => {
  const ligne = { id: "valhalla-public", url: "https://exemple.test/", chemin_route: "/route", chemin_trace: "/trace_attributes", pause_ms: 1100 };
  it("adresse, chemins et en-tête (clé) viennent de la ligne ; la pause passe par le limiteur partagé", async () => {
    const appels: [string, number][] = [];
    const c = connexionDepuisFournisseur(ligne, null, async (nom, ms) => (appels.push([nom, ms]), 0));
    expect(c.base).toBe("https://exemple.test");
    expect(c.entetes).toEqual({});
    await c.avantRequete();
    expect(appels).toEqual([["valhalla-public", 1100]]);
    expect(connexionDepuisFournisseur({ ...ligne, id: "stadia", pause_ms: 0 }, "K", async () => 0).entetes).toEqual({ Authorization: "Stadia-Auth K" });
  });
  it("sans pause (Stadia) le limiteur n'est pas appelé ; sans adresse la connexion est refusée", async () => {
    const appels: number[] = [];
    await connexionDepuisFournisseur({ ...ligne, pause_ms: 0 }, null, async () => (appels.push(1), 0)).avantRequete();
    expect(appels).toEqual([]);
    expect(() => connexionDepuisFournisseur({ ...ligne, url: null }, null, async () => 0)).toThrow();
  });
});

describe("flux de stations hors de France", () => {
  it("Croatie : latitude et longitude inversées dans le JSON officiel, remises à l'endroit", () => {
    const s = normaliserCroatie({ gorivos: [{ id: 829, vrsta_goriva_id: 1 }, { id: 830, vrsta_goriva_id: 8 }, { id: 832, vrsta_goriva_id: 9 }], postajas: [{ id: 1425, naziv: "SLANO", adresa: "Banići 40", mjesto: "Banići", long: "42.798694", lat: "17.850944", cjenici: [{ gorivo_id: 829, cijena: 1.64 }, { gorivo_id: 830, cijena: 1.72 }, { gorivo_id: 832, cijena: 0.86 }] }] });
    expect(s).toHaveLength(1);
    expect(s[0]).toMatchObject({ id: "HR-1425", lat: 42.798694, lon: 17.850944 });
    expect(s[0].prix).toEqual({ "SP95-E10": 1.64, SP95: 1.64, Gazole: 1.72, GPLc: 0.86 });
  });
  it("Italie : Benzina → 95, Gasolio → gazole, le prix self l'emporte ; doublons de zones fusionnés", () => {
    const r = { id: 54868, name: "STAR OIL", brand: "PompeBianche", location: { lat: 41.89, lng: 12.51 }, insertDate: "2026-10-16T11:37:49+02:00", fuels: [{ name: "Benzina", price: 1.669, isSelf: false }, { name: "Benzina", price: 1.609, isSelf: true }, { name: "Gasolio", price: 1.599 }, { name: "HVO", price: 1.9 }] };
    const s = normaliserItalie([[r], [r]]);
    expect(s).toHaveLength(1);
    expect(s[0].prix).toEqual({ "SP95-E10": 1.609, SP95: 1.609, Gazole: 1.599 });
  });
  it("Portugal : une réponse par carburant, prix « 1,949 € », coordonnées natives", () => {
    const l = (p: string) => ({ Id: 1, Nome: "X", Marca: "REPSOL", Preco: p, Latitude: 38.7, Longitude: -9.1, Localidade: "Lisboa", DataAtualizacao: "2026-10-20 08:55" });
    const s = normaliserPortugal([{ carburant: "Gazole", lignes: [l("1,949 €")] }, { carburant: "SP95-E10", lignes: [l("1,799 €")] }]);
    expect(s[0].prix).toEqual({ Gazole: 1.949, "SP95-E10": 1.799, SP95: 1.799 });
    expect(s[0].enseigne).toBe("Repsol");
  });
  it("Slovénie, Autriche (10 moins chères), Danemark et Islande (monnaies converties)", () => {
    expect(normaliserSlovenie([{ pk: 1, name: "PETROL LJUBLJANA - TIVOLSKA", address: "TIVOLSKA CESTA 43", lat: 46.05, lng: 14.5, prices: { "95": 1.702, dizel: 1.923, "98": null, "avtoplin-lpg": 1.016 } }])[0].prix).toEqual({ "SP95-E10": 1.702, SP95: 1.702, Gazole: 1.923, GPLc: 1.016 });
    const at = normaliserAutriche([{ carburant: "Gazole", stations: [{ id: 6441, name: "T", location: { latitude: 48.2, longitude: 16.3 }, prices: [{ fuelType: "DIE", amount: 2.107 }] }] }, { carburant: "SP95-E10", stations: [{ id: 6441, name: "T", location: { latitude: 48.2, longitude: 16.3 }, prices: [{ fuelType: "SUP", amount: 2.0 }] }] }]);
    expect(at).toHaveLength(1);
    expect(at[0].prix).toEqual({ Gazole: 2.107, "SP95-E10": 2.0, SP95: 2.0 });
    expect(normaliserDanemark({ items: [{ facility_number: 1, city: "Haderslev", coordinates: { latitude: 55.3, longitude: 9.4 }, prices: [{ product_name: "Blyfri 95", price: 17.39 }, { product_name: "Svovlfri Diesel", price: 19.09 }] }] }, 7.4746)[0].prix).toMatchObject({ "SP95-E10": 2.327, Gazole: 2.554 });
    expect(normaliserIslande({ stations: [{ key: "ao_000", name: "A", company: "Atlantsolía", geo: { lat: 65.7, lon: -18.1 }, bensin95: 255.3, diesel: 308.2 }] }, 136.2)[0].prix).toMatchObject({ SP95: 1.874, Gazole: 2.263 });
  });
  it("Allemagne (Tankerkönig) : E5 → SP95, E10 → SP95-E10 (à défaut E5), diesel ; stations fermées ignorées ; zones fusionnées", () => {
    const a = { id: "uuid-1", name: "Aral", brand: "ARAL", street: "Hauptstr.", houseNumber: "1", postCode: 10115, place: "Berlin", lat: 52.5, lng: 13.4, isOpen: true, e5: 1.899, e10: 1.839, diesel: 1.799 };
    const b = { id: "uuid-2", name: "Shell", lat: 52.6, lng: 13.5, isOpen: true, e5: 1.929, e10: null, diesel: null };
    const c = { id: "uuid-3", lat: 52.7, lng: 13.6, isOpen: false, e5: 1.9 };
    const s = normaliserAllemagne([[a, b], [a, c]]);
    expect(s.map((x) => x.id)).toEqual(["DE-uuid-1", "DE-uuid-2"]);
    expect(s[0].prix).toEqual({ SP95: 1.899, "SP95-E10": 1.839, Gazole: 1.799 });
    expect(s[0].cp).toBe("10115");
    expect(s[1].prix).toEqual({ SP95: 1.929, "SP95-E10": 1.929 });
  });
  it("Royaume-Uni (Asda) : pence/L → euros au cours du jour ; E10 → 95, B7 → gazole, E5 → super", () => {
    const s = normaliserRoyaumeUni({ stations: [{ site_id: "gcq", brand: "Asda", address: "Abbey Park, Coventry", postcode: "CV3 4AR", location: { latitude: 52.39, longitude: -1.48 }, prices: { E10: 172.9, B7: 197.7, E5: 184.9 } }, { site_id: "x", location: {}, prices: {} }, { site_id: "gcq", brand: "Asda", address: "Abbey Park, Coventry", postcode: "CV3 4AR", location: { latitude: 52.39, longitude: -1.48 }, prices: { E10: 172.9, B7: 197.7, E5: 184.9 } }] }, 0.84028);
    expect(s).toHaveLength(1);
    expect(s[0].prix).toEqual({ "SP95-E10": 2.058, SP95: 2.058, Gazole: 2.353, SP98: 2.2 });
    expect(s[0].id).toBe("GB-gcq");
  });
  it("Roumanie (XML Monitorul Prețurilor) : stations, produits par catégorie, RON → euros, le moins cher par station", () => {
    const xml = (cat: string, prix: string[]) =>
      `<GasItems><Products>${prix.map((p) => `<GasProduct><Catprod><Id>${cat}</Id></Catprod><Price>${p}</Price><Stationid>R1009</Stationid></GasProduct>`).join("")}</Products>` +
      `<Stations><GasStation><Addr><Addrstring>Sos. Mihai Bravu 396</Addrstring><Location><Lat>44.42</Lat><Lon>26.13</Lon></Location></Addr><Id>R1009</Id><Name>Petrom Bravu</Name><Network><Id>PETROM</Id><Name>PETROM</Name></Network></GasStation></Stations></GasItems>`;
    const s = normaliserRoumanie([{ id: "11", xml: xml("11", ["10.06", "10.5"]) }, { id: "21", xml: xml("21", ["10.66"]) }], 5.3308);
    expect(s).toHaveLength(1);
    expect(s[0]).toMatchObject({ id: "RO-R1009", enseigne: "PETROM", lat: 44.42, lon: 26.13 });
    expect(s[0].prix).toEqual({ "SP95-E10": 1.887, SP95: 1.887, Gazole: 2 });
  });
});
