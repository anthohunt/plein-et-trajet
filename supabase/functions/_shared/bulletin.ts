// Bulletin pétrolier hebdomadaire de la Commission européenne (xlsx, CC BY 4.0), onglet « Prices with taxes » :
// ligne 1 = noms de colonnes (« FR_price_with_tax_euro95 »), lignes suivantes = semaines, la plus récente d'abord ; prix TTC en €/1000 L.
export interface PrixPays {
  pays: string; // ISO alpha-2 (UK → GB), « EU » = moyenne UE
  carburant: "SP95-E10" | "SP95" | "Gazole" | "GPLc" | "SP98" | "E85";
  prix: number; // €/L TTC
}
export interface Bulletin {
  semaine: string; // AAAA-MM-JJ
  prix: PrixPays[];
}

const COLONNES = /^([A-Z]{2,3})_price_with_tax_(euro95|diesel|LPG)$/;
const CARBURANTS: Record<string, PrixPays["carburant"][]> = { euro95: ["SP95-E10", "SP95"], diesel: ["Gazole"], LPG: ["GPLc"] };

export function dateExcel(serie: number): string {
  return new Date(Date.UTC(1899, 11, 30) + Math.round(serie) * 86400000).toISOString().slice(0, 10);
}

function cellules(xmlLigne: string, partage: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of xmlLigne.matchAll(/<c r="([A-Z]+)\d+"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
    const [, col, attr, corps] = m;
    if (!corps) continue;
    const v = /<v>([\s\S]*?)<\/v>/.exec(corps)?.[1];
    if (v == null) continue;
    out[col] = /t="s"/.test(attr) ? (partage[Number(v)] ?? "") : v;
  }
  return out;
}

/** `xmlFeuille` peut être tronqué après les premières semaines : seules les lignes complètes sont lues. */
export function lireBulletin(xmlFeuille: string, partage: string[], semainesMax = 8): Bulletin {
  const lignes = [...xmlFeuille.matchAll(/<row r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g)];
  if (lignes.length < 4) throw new Error("bulletin: feuille illisible");
  const entetes = cellules(lignes[0][2], partage);
  const colonnes: { col: string; pays: string; cle: string }[] = [];
  for (const [col, nom] of Object.entries(entetes)) {
    const m = COLONNES.exec(nom);
    if (m) colonnes.push({ col, pays: m[1] === "UK" ? "GB" : m[1], cle: m[2] });
  }
  if (colonnes.length < 30) throw new Error("bulletin: colonnes de prix introuvables");
  const semaines: { date: string; c: Record<string, string> }[] = [];
  for (const l of lignes.slice(1)) {
    const c = cellules(l[2], partage);
    const a = Number(c.A);
    if (c.A && Number.isFinite(a) && a > 40000 && a < 80000 && !/^[A-Za-z]/.test(c.A)) semaines.push({ date: dateExcel(a), c });
    if (semaines.length >= semainesMax) break;
  }
  if (semaines.length === 0) throw new Error("bulletin: aucune semaine");
  const semaine = semaines[0].date;
  const prix: PrixPays[] = [];
  for (const { col, pays, cle } of colonnes) {
    if (pays === "FR") continue; // la France vient du flux instantané
    // dernière valeur connue sur les semaines lues (un pays peut manquer une semaine)
    const s = semaines.find((x) => Number.isFinite(Number(x.c[col])) && Number(x.c[col]) > 0);
    if (!s) continue;
    const eurosLitre = Math.round(Number(s.c[col])) / 1000;
    if (eurosLitre < 0.3 || eurosLitre > 4) continue;
    for (const carburant of CARBURANTS[cle]) prix.push({ pays, carburant, prix: eurosLitre });
  }
  return { semaine, prix };
}

/** SP98 et E85 ne sont pas au bulletin : estimés d'après le SP95 du pays avec l'écart observé en France. */
export function estimes(bulletin: Bulletin, rapportFrance: { SP98: number; E85: number }): PrixPays[] {
  const res: PrixPays[] = [];
  for (const p of bulletin.prix) {
    if (p.carburant !== "SP95") continue;
    res.push({ pays: p.pays, carburant: "SP98", prix: Math.round(p.prix * rapportFrance.SP98 * 1000) / 1000 });
    res.push({ pays: p.pays, carburant: "E85", prix: Math.round(p.prix * rapportFrance.E85 * 1000) / 1000 });
  }
  return res;
}
