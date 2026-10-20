// Flux officiels de prix par station hors de France (jalon 3, T3.5) → stations normalisées. Logique pure, testée par Vitest.
// Sources (toutes sans clé) : voir docs/pipeline/m3-journal.md et le rapport api-carburants.rendu.md.
//  IT Osservaprezzi carburanti (MIMIT) · PT DGEG · SI goriva.si (ministère de l'Économie) · HR mzoe-gor.hr (ministère de l'Économie)
//  AT E-Control Spritpreisrechner (10 moins chères par requête) · DK API OK (loi BEK 1351/2025) · IS gasvaktin (collecte des sites d'enseignes)
import type { Station } from "./stations-es.ts";
export type { Station };

const arrondi3 = (x: number) => Math.round(x * 1000) / 1000;
const ok = (p: unknown): p is number => typeof p === "number" && Number.isFinite(p) && p > 0.3 && p < 5;
const casse = (t: string | null | undefined) => (t ? t.charAt(0).toUpperCase() + t.slice(1).toLowerCase() : null);

// ------------------------------------------------------------------ Italie
export interface PointSondage {
  lat: number;
  lon: number;
}
/** Villes servant de points de sondage (le service ne renvoie qu'une zone à la fois, ~600 stations max). */
export const IT_POINTS: PointSondage[] = [
  [45.4642, 9.19], [45.0703, 7.6869], [44.4056, 8.9463], [45.4408, 12.3155], [45.6495, 13.7768], [44.4949, 11.3426], [43.7696, 11.2558],
  [43.6158, 13.5189], [43.1107, 12.3908], [41.9028, 12.4964], [42.3498, 13.3995], [41.1171, 16.8719], [40.8518, 14.2681], [38.1157, 13.3615],
  [37.5079, 15.083], [39.2238, 9.1217], [45.5416, 10.2118], [45.4064, 11.8768], [44.8015, 10.3279], [43.8429, 10.5027], [45.6983, 9.6773],
  [46.0748, 11.1217], [46.4983, 11.3548], [45.5845, 8.9189], [44.1391, 12.2464], [43.9, 12.9], [42.4618, 14.2161], [41.5603, 14.6684],
  [40.6824, 14.7681], [39.3, 16.25], [38.9098, 16.5877], [40.4668, 17.2406], [40.3515, 18.1718], [41.4622, 15.5446], [39.9, 9.0],
  [40.9, 9.5], [37.0755, 15.2866], [37.3, 13.6], [38.0, 12.5], [43.3188, 11.3308], [42.7, 11.0], [42.0, 12.0], [45.9, 12.2], [46.0, 13.2],
  [44.7, 8.0], [45.3, 8.4], [44.9, 9.8], [45.15, 10.8], [44.65, 10.9], [44.2, 8.3],
].map(([lat, lon]) => ({ lat, lon }));

// deno-lint-ignore no-explicit-any
export function normaliserItalie(reponses: any[][]): Station[] {
  const m = new Map<string, Station>();
  for (const liste of reponses) {
    for (const r of liste) {
      const lat = r?.location?.lat;
      const lon = r?.location?.lng;
      if (r?.id == null || !Number.isFinite(lat) || !Number.isFinite(lon)) continue;
      const prix: Record<string, number> = {};
      // « Benzina » = 95 (E5/E10, compatible E10), « Gasolio », « GPL » ; le prix self (le moins cher) l'emporte sur le servi
      for (const f of r.fuels ?? []) {
        const cle = f.name === "Benzina" ? ["SP95-E10", "SP95"] : f.name === "Gasolio" ? ["Gazole"] : f.name === "GPL" ? ["GPLc"] : [];
        if (!ok(f.price)) continue;
        for (const c of cle) prix[c] = prix[c] == null ? f.price : Math.min(prix[c], f.price);
      }
      if (Object.keys(prix).length === 0) continue;
      m.set(`IT-${r.id}`, { id: `IT-${r.id}`, nom: r.name ?? null, enseigne: r.brand ?? null, adresse: r.address ?? null, cp: null, ville: null, lat, lon, maj: r.insertDate ?? null, prix });
    }
  }
  return [...m.values()];
}

// ------------------------------------------------------------------ Portugal : une requête par carburant (identifiants DGEG)
export const PT_CARBURANTS: [string, string][] = [["2101", "Gazole"], ["3201", "SP95-E10"], ["3400", "SP98"], ["1120", "GPLc"]];
// deno-lint-ignore no-explicit-any
export function normaliserPortugal(parCarburant: { carburant: string; lignes: any[] }[]): Station[] {
  const m = new Map<string, Station>();
  for (const { carburant, lignes } of parCarburant) {
    for (const r of lignes) {
      const prix = Number(String(r.Preco ?? "").replace(/[^\d,]/g, "").replace(",", "."));
      if (r.Id == null || !Number.isFinite(r.Latitude) || !Number.isFinite(r.Longitude) || !ok(prix)) continue;
      const id = `PT-${r.Id}`;
      const s: Station = m.get(id) ?? { id, nom: r.Nome ?? null, enseigne: casse(String(r.Marca ?? "").trim()) || null, adresse: r.Morada ?? null, cp: r.CodPostal ?? null, ville: r.Localidade ?? null, lat: r.Latitude, lon: r.Longitude, maj: r.DataAtualizacao ? `${String(r.DataAtualizacao).replace(" ", "T")}:00Z` : null, prix: {} };
      s.prix[carburant] = prix;
      if (carburant === "SP95-E10") s.prix.SP95 = prix;
      m.set(id, s);
    }
  }
  return [...m.values()];
}

// ------------------------------------------------------------------ Slovénie
// deno-lint-ignore no-explicit-any
export function normaliserSlovenie(resultats: any[]): Station[] {
  const out: Station[] = [];
  const vus = new Set<number>();
  for (const r of resultats) {
    if (r?.pk == null || vus.has(r.pk) || !Number.isFinite(r.lat) || !Number.isFinite(r.lng)) continue;
    vus.add(r.pk);
    const p = r.prices ?? {};
    const prix: Record<string, number> = {};
    if (ok(p["95"])) {
      prix["SP95-E10"] = p["95"];
      prix.SP95 = p["95"];
    }
    if (ok(p["dizel"])) prix.Gazole = p["dizel"];
    if (ok(p["98"])) prix.SP98 = p["98"];
    if (ok(p["avtoplin-lpg"])) prix.GPLc = p["avtoplin-lpg"];
    if (Object.keys(prix).length === 0) continue;
    const [enseigne] = String(r.name ?? "").split(" - ");
    out.push({ id: `SI-${r.pk}`, nom: casse(r.name), enseigne: casse(enseigne), adresse: casse(r.address), cp: r.zip_code ?? null, ville: null, lat: r.lat, lon: r.lng, maj: null, prix });
  }
  return out;
}

// ------------------------------------------------------------------ Croatie : PIÈGE documenté, `lat` et `long` sont inversés dans le JSON
// deno-lint-ignore no-explicit-any
export function normaliserCroatie(d: any): Station[] {
  const typeDe = new Map<number, number>(); // identifiant de carburant → vrsta_goriva_id
  for (const g of d?.gorivos ?? []) typeDe.set(g.id, g.vrsta_goriva_id);
  // 1,2 = Eurosuper 95 ; 5,6 = Eurosuper 100 ; 7,8 = Eurodizel ; 9 = autoplin (GPL)
  const carb = (v: number | undefined): string | null => (v === 1 || v === 2 ? "SP95-E10" : v === 5 || v === 6 ? "SP98" : v === 7 || v === 8 ? "Gazole" : v === 9 ? "GPLc" : null);
  const out: Station[] = [];
  for (const s of d?.postajas ?? []) {
    const lat = Number(s.long); // inversion
    const lon = Number(s.lat);
    if (s.id == null || !Number.isFinite(lat) || !Number.isFinite(lon) || lat < 42 || lat > 47 || lon < 13 || lon > 20) continue;
    const prix: Record<string, number> = {};
    for (const c of s.cjenici ?? []) {
      const k = carb(typeDe.get(c.gorivo_id));
      if (!k || !ok(c.cijena)) continue;
      prix[k] = prix[k] == null ? c.cijena : Math.min(prix[k], c.cijena);
      if (k === "SP95-E10") prix.SP95 = prix[k];
    }
    if (Object.keys(prix).length === 0) continue;
    out.push({ id: `HR-${s.id}`, nom: casse(s.naziv), enseigne: null, adresse: s.adresa ?? null, cp: null, ville: s.mjesto ?? null, lat, lon, maj: null, prix });
  }
  return out;
}

// ------------------------------------------------------------------ Autriche : les 10 stations les moins chères par requête (cadre légal)
export const AT_POINTS: PointSondage[] = [
  [48.2082, 16.3738], [47.0707, 15.4395], [48.3069, 14.2858], [47.8095, 13.055], [47.2692, 11.4041], [46.6247, 14.3055], [47.5031, 9.7471],
  [48.2, 15.63], [47.82, 16.25], [46.84, 14.0], [47.4, 13.3], [48.55, 13.45], [47.0, 12.9], [46.8, 15.9], [48.4, 16.05], [47.2, 10.6],
  [48.0, 14.9], [47.5, 15.3], [48.65, 15.2], [47.7, 12.5],
].map(([lat, lon]) => ({ lat, lon }));
export const AT_CARBURANTS: [string, string][] = [["DIE", "Gazole"], ["SUP", "SP95-E10"]];
// deno-lint-ignore no-explicit-any
export function normaliserAutriche(reponses: { carburant: string; stations: any[] }[]): Station[] {
  const m = new Map<string, Station>();
  for (const { carburant, stations } of reponses) {
    for (const r of stations) {
      const lat = r?.location?.latitude;
      const lon = r?.location?.longitude;
      const p = (r.prices ?? []).find((x: { amount: number }) => ok(x.amount));
      if (r?.id == null || !Number.isFinite(lat) || !Number.isFinite(lon) || !p) continue;
      const id = `AT-${r.id}`;
      const s: Station = m.get(id) ?? { id, nom: r.name ?? null, enseigne: null, adresse: r.location.address ?? null, cp: r.location.postalCode ?? null, ville: r.location.city ?? null, lat, lon, maj: null, prix: {} };
      s.prix[carburant] = p.amount;
      if (carburant === "SP95-E10") s.prix.SP95 = p.amount;
      m.set(id, s);
    }
  }
  return [...m.values()];
}

// ------------------------------------------------------------------ Danemark (API de l'enseigne OK) et Islande : monnaies converties au cours du jour
// deno-lint-ignore no-explicit-any
export function normaliserDanemark(d: any, dkkParEuro: number): Station[] {
  const out: Station[] = [];
  for (const s of d?.items ?? []) {
    const lat = s?.coordinates?.latitude;
    const lon = s?.coordinates?.longitude;
    if (s?.facility_number == null || !Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    const prix: Record<string, number> = {};
    for (const p of s.prices ?? []) {
      const k = p.product_name === "Blyfri 95" ? ["SP95-E10", "SP95"] : p.product_name === "Svovlfri Diesel" ? ["Gazole"] : p.product_name === "Oktan 100" ? ["SP98"] : [];
      const eur = arrondi3(p.price / dkkParEuro);
      if (ok(eur)) for (const c of k) prix[c] = eur;
    }
    if (Object.keys(prix).length === 0) continue;
    out.push({ id: `DK-${s.facility_number}`, nom: `OK ${s.city ?? ""}`.trim(), enseigne: "OK", adresse: [s.street, s.house_number].filter(Boolean).join(" ") || null, cp: s.postal_code != null ? String(s.postal_code) : null, ville: s.city ?? null, lat, lon, maj: s.last_updated_time ?? null, prix });
  }
  return out;
}
// deno-lint-ignore no-explicit-any
export function normaliserIslande(d: any, iskParEuro: number): Station[] {
  const out: Station[] = [];
  for (const s of d?.stations ?? []) {
    const lat = s?.geo?.lat;
    const lon = s?.geo?.lon;
    if (!s?.key || !Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    const prix: Record<string, number> = {};
    const e95 = arrondi3(s.bensin95 / iskParEuro);
    const ed = arrondi3(s.diesel / iskParEuro);
    if (ok(e95)) {
      prix.SP95 = e95;
      prix["SP95-E10"] = e95;
    }
    if (ok(ed)) prix.Gazole = ed;
    if (Object.keys(prix).length === 0) continue;
    out.push({ id: `IS-${s.key}`, nom: s.name ?? null, enseigne: s.company ?? null, adresse: null, cp: null, ville: null, lat, lon, maj: null, prix });
  }
  return out;
}

// ------------------------------------------------------------------ Allemagne (Tankerkönig, MTS-K) : clé gratuite lue dans Vault, rayon ≤ 25 km autour de villes
export const DE_POINTS: PointSondage[] = [
  [52.52, 13.405], [53.5511, 9.9937], [48.1351, 11.582], [50.9375, 6.9603], [50.1109, 8.6821], [48.7758, 9.1829], [51.2277, 6.7735], [51.5136, 7.4653],
  [51.3397, 12.3731], [51.0504, 13.7373], [52.3759, 9.732], [49.4521, 11.0767], [53.0793, 8.8017], [54.3233, 10.1228], [50.0782, 8.2398], [49.4875, 8.466],
  [48.3705, 10.8978], [52.2689, 10.5268], [51.4556, 7.0116], [50.7753, 6.0839], [51.9607, 7.6261], [52.0302, 8.5325], [53.8655, 10.6866], [54.0924, 12.0991],
  [50.8278, 12.9214], [49.0069, 8.4037], [47.9959, 7.8522], [49.7913, 9.9534], [49.2402, 6.9969], [50.3569, 7.5890], [51.3127, 9.4797], [50.9787, 11.0328],
  [52.1205, 11.6276], [53.5511, 13.2], [52.4, 13.0658], [48.4011, 9.9876],
].map(([lat, lon]) => ({ lat, lon }));

// deno-lint-ignore no-explicit-any
export function normaliserAllemagne(reponses: any[][]): Station[] {
  const m = new Map<string, Station>();
  for (const liste of reponses) {
    for (const s of liste) {
      if (!s?.id || !Number.isFinite(s.lat) || !Number.isFinite(s.lng) || s.isOpen === false) continue;
      const prix: Record<string, number> = {};
      if (ok(s.e5)) prix.SP95 = s.e5;
      if (ok(s.e10)) prix["SP95-E10"] = s.e10;
      else if (ok(s.e5)) prix["SP95-E10"] = s.e5; // E5 compatible avec toute voiture E10
      if (ok(s.diesel)) prix.Gazole = s.diesel;
      if (Object.keys(prix).length === 0) continue;
      m.set(`DE-${s.id}`, { id: `DE-${s.id}`, nom: s.name ?? null, enseigne: s.brand ? String(s.brand) : null, adresse: [s.street, s.houseNumber].filter(Boolean).join(" ") || null, cp: s.postCode != null ? String(s.postCode).padStart(5, "0") : null, ville: s.place ?? null, lat: s.lat, lon: s.lng, maj: null, prix });
    }
  }
  return [...m.values()];
}
