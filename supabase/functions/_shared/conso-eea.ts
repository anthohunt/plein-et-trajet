// Consommation par phase WLTP d'une version de la base EEA (jalon 5, T5.1) — logique pure, partagée par la fonction voiture-eea
// et Vitest (tests/unit/m5-conso-eea.test.ts). Aucune dépendance Deno.
//
// La base EEA ne donne qu'une valeur combinée ; le modèle de trajet (roule.ts) attend quatre consommations par phase (ConsoWltp).
// 1. Consommation officielle combinée : Fc (L/100 km, années 2021+) ; sinon Ewltp ÷ 23,3 (essence) ou ÷ 26,4 (gazole) ;
//    sinon Enedc × 1,21 puis même conversion (facteurs du règlement (UE) 2020/759 ; WLTP/NEDC ≈ +21 %, JRC/ICCT).
// 2. Forme : road-load (roulement 0,010·m·g, aéro ½·ρ·SCx·v², SCx 0,65 m²) + énergie cinétique par phase + ralenti (Willans,
//    proportionnel à la puissance) aux quatre phases WLTC classe 3b ; un facteur unique ramène la moyenne pondérée par les
//    distances des phases exactement sur la consommation officielle.
// Les constantes de forme (énergie cinétique par kg et par km de chaque phase, ralenti, vitesse efficace) sont AJUSTÉES par
// moindres carrés sur les versions thermiques de la base ADEME Car Labelling (phases mesurées : 259 essence, 98 gazole,
// table `vehicules`, 21/10/2026). Écart obtenu : médiane < 0,2 L/100 km par phase ; la phase basse reste la plus dispersée
// (stop & start, boîte), cf. tests/unit/m5-conso-eea.test.ts.
import type { Carburant, ConsoWltp } from "./modele.ts";

/** Phases WLTC classe 3b : distance (km) et vitesse moyenne (km/h). */
export const PHASES_WLTC = [
  { phase: "basse", km: 3.095, kmh: 18.9 },
  { phase: "moyenne", km: 4.756, kmh: 39.5 },
  { phase: "haute", km: 7.162, kmh: 56.7 },
  { phase: "tres_haute", km: 8.254, kmh: 92.0 },
] as const;
const KM_CYCLE = PHASES_WLTC.reduce((s, p) => s + p.km, 0);

export const G_CO2_PAR_L = { essence: 23.3, gazole: 26.4 } as const; // g CO2/km pour 1 L/100 km : g/km ÷ facteur = L/100 km
export const WLTP_SUR_NEDC = 1.21;

const ROULEMENT = 0.01;
const RHO = 1.2;
const SCX = 0.65;
const G = 9.81;

interface Forme {
  cinetique: [number, number, number, number]; // J par kg et par km, par phase
  ralentiParKw: number; // W par kW de puissance
  ralentiFixe: number; // W
  vitesseEfficace: number; // facteur appliqué à la vitesse moyenne de phase pour l'aéro
}
// Ajustées sur ADEME (voir en-tête). Gazole : l'ajustement annule le terme aéro (forme portée par la cinétique).
const FORMES: Record<"essence" | "gazole", Forme> = {
  essence: { cinetique: [142.64, 77.84, 49.32, 49.85], ralentiParKw: 6.18, ralentiFixe: -212.3, vitesseEfficace: 0.67 },
  gazole: { cinetique: [45.93, 41.32, 34.71, 79.14], ralentiParKw: 9.6, ralentiFixe: -304.54, vitesseEfficace: 0 },
};

export const famille = (c: Carburant): "essence" | "gazole" => (c === "Gazole" ? "gazole" : "essence");

export interface EntreeConso {
  carburant: Carburant;
  fc?: number | null; // L/100 km (WLTP, 2021+)
  ewltp?: number | null; // g/km
  enedc?: number | null; // g/km
}

/** Consommation officielle combinée (L/100 km) et procédure d'où elle vient ; null si la base ne donne rien d'utilisable. */
export function consoOfficielle(e: EntreeConso): { l100: number; procedure: "NEDC" | "WLTP" } | null {
  const facteur = G_CO2_PAR_L[famille(e.carburant)];
  if (e.fc != null && e.fc > 0) return { l100: e.fc, procedure: "WLTP" };
  if (e.ewltp != null && e.ewltp > 0) return { l100: e.ewltp / facteur, procedure: "WLTP" };
  if (e.enedc != null && e.enedc > 0) return { l100: (e.enedc * WLTP_SUR_NEDC) / facteur, procedure: "NEDC" };
  return null;
}

/** Forme brute (J/km, échelle arbitraire) aux quatre phases, pour une masse (kg, conducteur compris) et une puissance (kW). */
export function formePhases(carburant: Carburant, masseKg: number, puissanceKw: number): number[] {
  const f = FORMES[famille(carburant)];
  return PHASES_WLTC.map((p, i) => {
    const v = (p.kmh * f.vitesseEfficace) / 3.6;
    const route = (ROULEMENT * masseKg * G + 0.5 * RHO * SCX * v * v) * 1000;
    const cinetique = f.cinetique[i] * masseKg;
    const ralenti = ((f.ralentiParKw * puissanceKw + f.ralentiFixe) * (p.km / p.kmh) * 3600) / p.km;
    return route + cinetique + ralenti;
  });
}

/** Quatre consommations par phase dont la moyenne pondérée par les distances WLTC égale la consommation officielle. */
export function consoParPhase(officielle: number, carburant: Carburant, masseVideKg: number, puissanceKw: number | null): ConsoWltp {
  const kw = puissanceKw && puissanceKw > 0 ? puissanceKw : 0.07 * masseVideKg; // puissance absente : ordre de grandeur du parc
  const s = formePhases(carburant, masseVideKg + 75, kw).map((x) => Math.max(x, 1));
  const moy = s.reduce((acc, x, i) => acc + (x * PHASES_WLTC[i].km) / KM_CYCLE, 0);
  const k = officielle / moy;
  const r = (x: number) => Math.round(x * k * 1000) / 1000;
  return { basse: r(s[0]), moyenne: r(s[1]), haute: r(s[2]), tres_haute: r(s[3]) };
}

/** Moyenne pondérée par les distances WLTC (contrôle : retombe sur la consommation officielle). */
export function moyennePonderee(c: ConsoWltp): number {
  const v = [c.basse, c.moyenne, c.haute, c.tres_haute];
  return v.reduce((acc, x, i) => acc + (x * PHASES_WLTC[i].km) / KM_CYCLE, 0);
}
