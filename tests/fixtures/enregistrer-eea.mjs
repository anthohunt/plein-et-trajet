// Enregistre les VRAIES réponses Discodata (base EEA CO2 cars) des codes D.2 de référence, avec la requête exacte de la
// fonction voiture-eea (requeteD2 de supabase/functions/_shared/eea.ts) sur la table 2010-2022.
// Usage : node tests/fixtures/enregistrer-eea.mjs  → tests/fixtures/eea-<code>.json
import { writeFileSync } from "node:fs";
import { requeteD2, urlDiscodata } from "../../supabase/functions/_shared/eea.ts";

const BASE = "https://discodata.eea.europa.eu/sql";
const TABLE = "[CO2Emission].[latest].[co2cars]";
const CODES = [{ ve: "5RBU0C" }, { ve: "5RBF0A" }, { ve: "HNEK-J1B500" }];
for (const c of CODES) {
  const sql = requeteD2(TABLE, c);
  let debut, r, j;
  for (let essai = 0; essai < 3; essai++) {
    // Discodata répond parfois sans « results » au premier appel (base froide) : on redemande
    debut = Date.now();
    r = await fetch(urlDiscodata(BASE, sql), { headers: { "User-Agent": "plein-et-trajet/1.0 (+https://github.com/anthohunt/plein-et-trajet)" } });
    j = await r.json().catch(() => ({}));
    if (Array.isArray(j.results)) break;
  }
  const nom = c.ve.replace(/[^A-Z0-9]/g, "");
  writeFileSync(new URL(`./eea-${nom}.json`, import.meta.url), JSON.stringify({ enregistre_le: new Date().toISOString(), source: BASE, table: TABLE, requete: sql, statut: r.status, duree_ms: Date.now() - debut, results: j.results }, null, 1));
  console.log(c.ve, r.status, j.results?.length, "lignes", Date.now() - debut, "ms");
}
