// Ajoute une entrée horodatée (UTC) à la section « ## Round N » du journal d'exploration m3, au moment du geste.
// La section vit avant les sections d'histoires (que run-m3.mjs réécrit) : elle n'est jamais effacée par un rejeu.
// usage : node tests/e2e/exploration/journal-round.mjs <N> "<texte>"
import fs from "node:fs";
import path from "node:path";
const JOURNAL = path.join(path.dirname(new URL(import.meta.url).pathname), "m3-exploration-log.md");
const [n, texte] = process.argv.slice(2);
const titre = `## Round ${n}`;
let t = fs.readFileSync(JOURNAL, "utf8");
if (!t.includes(`\n${titre}\n`)) {
  const avant = t.indexOf("\n## US-3.8 ");
  t = t.slice(0, avant) + `\n${titre}\n\nEntrées écrites au fil de l'eau (une par correctif), horodatées UTC.\n` + t.slice(avant);
}
const i = t.indexOf(`\n${titre}\n`);
const j = t.indexOf("\n## ", i + titre.length + 2);
const ligne = `- ${new Date().toISOString().slice(11, 16)}Z — ${texte}\n`;
t = t.slice(0, j).replace(/\s+$/, "\n") + ligne + t.slice(j);
fs.writeFileSync(JOURNAL, t.replace(`${titre}\n\nEntrées écrites au fil de l'eau (une par correctif), horodatées UTC.\n- `, `${titre}\n\nEntrées écrites au fil de l'eau (une par correctif), horodatées UTC.\n\n- `));
console.log(ligne.trim().slice(0, 120));
