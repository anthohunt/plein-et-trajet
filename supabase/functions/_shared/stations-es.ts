// Flux officiel espagnol des prix (MITECO) → stations normalisées. Logique pure, testée par Vitest.
export const nombreEs = (s: unknown): number | null => {
  if (typeof s !== "string" || s.trim() === "") return null;
  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

/** « 20/10/2026 17:53:32 » (heure de Madrid) → ISO UTC. */
export function dateEspagne(f: string): string | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2}):(\d{2})$/.exec(f ?? "");
  if (!m) return null;
  const [, jj, mm, aa, hh, mi, ss] = m.map(Number);
  const dernierDimanche = (annee: number, mois: number) => {
    const d = new Date(Date.UTC(annee, mois + 1, 0));
    d.setUTCDate(d.getUTCDate() - d.getUTCDay());
    return d;
  };
  const debutEte = dernierDimanche(aa, 2).getTime() + 1 * 3600_000; // 01:00 UTC
  const finEte = dernierDimanche(aa, 9).getTime() + 1 * 3600_000;
  const local = Date.UTC(aa, mm - 1, jj, hh, mi, ss);
  const ete = local - 2 * 3600_000 >= debutEte && local - 2 * 3600_000 < finEte;
  return new Date(local - (ete ? 2 : 1) * 3600_000).toISOString();
}

const CARBURANTS_ES: [string, string[]][] = [
  ["Gazole", ["Precio Gasoleo A"]],
  // 95 E5 est compatible avec toute voiture E10 : à défaut de 95 E10, son prix est celui du « SP95-E10 » (l'Espagne vend surtout du 95 E5)
  ["SP95-E10", ["Precio Gasolina 95 E10", "Precio Gasolina 95 E5"]],
  ["SP95", ["Precio Gasolina 95 E5"]],
  ["SP98", ["Precio Gasolina 98 E5", "Precio Gasolina 98 E10"]],
  ["E85", ["Precio Gasolina 95 E85", "Precio Bioetanol"]],
  ["GPLc", ["Precio Gases licuados del petróleo"]],
];

export interface Station {
  id: string;
  nom: string | null;
  enseigne: string | null;
  adresse: string | null;
  cp: string | null;
  ville: string | null;
  lat: number;
  lon: number;
  maj: string | null;
  prix: Record<string, number>;
  origine?: Record<string, number>; // prix publiés dans la monnaie du pays (Royaume-Uni : pence/L), mêmes clés que `prix`
  unite_origine?: string; // « p/L »
}

// deno-lint-ignore no-explicit-any
export function normaliserEspagne(liste: any[], maj: string | null): Station[] {
  const out: Station[] = [];
  for (const s of liste) {
    if (s["Tipo Venta"] !== "P") continue; // vente au public seulement
    const lat = nombreEs(s["Latitud"]);
    const lon = nombreEs(s["Longitud (WGS84)"]);
    if (lat == null || lon == null || !s["IDEESS"]) continue;
    const prix: Record<string, number> = {};
    for (const [carb, cles] of CARBURANTS_ES) {
      for (const k of cles) {
        const p = nombreEs(s[k]);
        if (p != null && p > 0 && p < 10) {
          prix[carb] = p;
          break;
        }
      }
    }
    if (Object.keys(prix).length === 0) continue;
    const rot = typeof s["Rótulo"] === "string" ? s["Rótulo"].trim() : "";
    const enseigne = rot && !/^n[ºo°]/i.test(rot) ? rot.charAt(0) + rot.slice(1).toLowerCase() : null;
    out.push({
      id: `ES-${s["IDEESS"]}`,
      nom: rot || null,
      enseigne,
      adresse: s["Dirección"] ?? null,
      cp: s["C.P."] ?? null,
      ville: s["Localidad"] ? String(s["Localidad"]).charAt(0) + String(s["Localidad"]).slice(1).toLowerCase() : null,
      lat,
      lon,
      maj,
      prix,
    });
  }
  return out;
}

