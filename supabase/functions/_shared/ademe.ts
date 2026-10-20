// Normalisation des lignes ADEME Car Labelling → table `vehicules` (logique pure, testée par Vitest).
export interface LigneAdeme {
  [cle: string]: unknown;
}
export interface LigneVehicule {
  id: string;
  marque: string;
  modele: string;
  motorisation: string;
  energie: string;
  carburant: string;
  masse_kg: number;
  puissance_kw: number;
  conso_basse: number;
  conso_moyenne: number;
  conso_haute: number;
  conso_tres_haute: number;
}

const CARBURANT_PAR_ENERGIE: Record<string, string> = {
  ESSENCE: "SP95-E10",
  GAZOLE: "Gazole",
  "GAZ+ELEC HNR": "Gazole",
  "ESS+ELEC HNR": "SP95-E10",
  SUPERETHANOL: "E85",
  "ESS+G.P.L.": "GPLc",
};
const MARQUES: Record<string, string> = { "B.M.W.": "BMW", "M.G.": "MG", "LAMBORGHIN": "Lamborghini", "ROLLS ROYC": "Rolls-Royce", DS: "DS", MINI: "Mini", KIA: "Kia", SEAT: "Seat", "ALFA ROMEO": "Alfa Romeo", "LAND ROVER": "Land Rover" };
const BOITES: Record<string, string> = { MECANIQUE: "mécanique", AUTOMATIQUE: "automatique", "VARIATION CONTINUE": "variation continue" };

export function corrigerAccents(s: string): string {
  // texte UTF-8 lu comme du Latin-1 (« CoupÃ© ») : on le décode proprement
  if (!/[ÃÂ]/.test(s)) return s;
  try {
    if ([...s].some((c) => c.charCodeAt(0) > 255)) return s;
    const octets = Uint8Array.from(s, (c) => c.charCodeAt(0));
    return new TextDecoder("utf-8", { fatal: true }).decode(octets);
  } catch {
    return s;
  }
}

export function titreMarque(m: string): string {
  const s = m.trim();
  if (MARQUES[s]) return MARQUES[s];
  return s.toLowerCase().replace(/(^|[\s-])(\p{L})/gu, (_, a, b) => a + b.toUpperCase());
}

const nombre = (x: unknown): number | null => (typeof x === "number" && Number.isFinite(x) ? x : null);
const moyenne = (a: unknown, b: unknown): number | null => {
  const x = nombre(a);
  const y = nombre(b);
  if (x != null && y != null) return (x + y) / 2;
  return x ?? y;
};

async function empreinte(texte: string): Promise<string> {
  const h = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(texte));
  return [...new Uint8Array(h)].slice(0, 8).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Une ligne par version distincte (marque, modèle, motorisation, énergie, boîte, puissance) ; consommations moyennées. */
export async function lignesVehicules(sources: LigneAdeme[]): Promise<LigneVehicule[]> {
  const groupes = new Map<string, { base: Omit<LigneVehicule, "id" | "conso_basse" | "conso_moyenne" | "conso_haute" | "conso_tres_haute">; c: number[][] }>();
  for (const l of sources) {
    const carburant = CARBURANT_PAR_ENERGIE[String(l["Energie"] ?? "")];
    if (!carburant) continue;
    const basse = moyenne(l["Conso_basse_vitesse_Min"], l["Conso_basse_vitesse_Max"]);
    const moy = moyenne(l["Conso_moyenne_vitesse_Min"], l["Conso_moyenne_vitesse_Max"]);
    const haute = moyenne(l["Conso_haute_vitesse_Min"], l["Conso_haute_vitesse_Max"]);
    const th = moyenne(l["Conso_T-haute_vitesse_Min"], l["Conso_T-haute_vitesse_Max"]);
    const kw = nombre(l["Puissance_maximale"]);
    const masse = nombre(l["Poids_à_vide"]) ?? nombre(l["Masse_OM_Min"]);
    const marque = typeof l["Marque"] === "string" ? titreMarque(l["Marque"]) : "";
    const modele = typeof l["Modèle"] === "string" ? corrigerAccents(l["Modèle"]).trim() : "";
    const desc = typeof l["Description_Commerciale"] === "string" ? corrigerAccents(l["Description_Commerciale"]).trim() : "";
    if (basse == null || moy == null || haute == null || th == null || kw == null || masse == null || !marque || !modele || !desc) continue;
    const boite = BOITES[String(l["Type_de_boite"] ?? "")] ?? String(l["Type_de_boite"] ?? "").toLowerCase();
    const motorisation = boite ? `${desc} · ${boite}` : desc;
    const cle = [marque, modele, motorisation, l["Energie"], kw].join("|");
    const g = groupes.get(cle) ?? { base: { marque, modele, motorisation, energie: String(l["Energie"]), carburant, masse_kg: Math.round(masse), puissance_kw: Math.round(kw * 10) / 10 }, c: [] };
    g.c.push([basse, moy, haute, th]);
    groupes.set(cle, g);
  }
  const out: LigneVehicule[] = [];
  for (const [cle, g] of groupes) {
    const m = (i: number) => Math.round((g.c.reduce((s, x) => s + x[i], 0) / g.c.length) * 1000) / 1000;
    out.push({ id: await empreinte(cle), ...g.base, conso_basse: m(0), conso_moyenne: m(1), conso_haute: m(2), conso_tres_haute: m(3) });
  }
  return out;
}
