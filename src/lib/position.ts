import { T } from "./textes";

// Position de l'utilisateur, avec repli sur la dernière ville saisie ou Albi.
export interface Lieu {
  lat: number;
  lon: number;
  label: string;
}
export interface Position extends Lieu {
  source: "gps" | "ville" | "defaut";
  motif?: "refusee" | "indisponible";
}

export const ALBI: Lieu = { lat: 43.9289, lon: 2.1464, label: "Albi" };
const CLE_VILLE = "pt-derniere-ville";

export function derniereVille(): Lieu | null {
  try {
    const v = JSON.parse(localStorage.getItem(CLE_VILLE) || "null");
    if (v && Number.isFinite(v.lat) && Number.isFinite(v.lon) && typeof v.label === "string") return v;
  } catch {
    /* stockage indisponible */
  }
  return null;
}

export function memoriserVille(l: Lieu) {
  try {
    localStorage.setItem(CLE_VILLE, JSON.stringify(l));
  } catch {
    /* stockage indisponible */
  }
}

export function repli(motif: "refusee" | "indisponible"): Position {
  const v = derniereVille();
  return v ? { ...v, source: "ville", motif } : { ...ALBI, source: "defaut", motif };
}

export function localiser(timeoutMs = 8000): Promise<Position> {
  return new Promise((resolve) => {
    if (!("geolocation" in navigator)) return resolve(repli("indisponible"));
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lon: p.coords.longitude, label: T.maPosition, source: "gps" }),
      (e) => resolve(repli(e.code === e.PERMISSION_DENIED ? "refusee" : "indisponible")),
      { enableHighAccuracy: false, timeout: timeoutMs, maximumAge: 120_000 },
    );
  });
}

/**
 * Position pour l'onglet Stations (jalon 5) : pendant un enregistrement, la dernière position reçue du GPS (la voiture a
 * roulé depuis l'ouverture de l'appli) ; sinon celle lue au lancement.
 */
export function positionCourante(points: readonly (readonly (number | null | undefined)[])[] | undefined, lancement: Position | null): Position | null {
  const dernier = points && points.length > 0 ? points[points.length - 1] : null;
  if (!dernier) return lancement;
  if (dernier[1] == null || dernier[2] == null) return lancement;
  return { lat: dernier[1], lon: dernier[2], label: T.maPosition, source: "gps" };
}
