// Exécute une requête SQL par l'API de gestion Supabase (lit .env.local, n'affiche jamais de secret).
// usage : node scripts/sql.mjs "select 1"   ou   node scripts/sql.mjs -f fichier.sql
import { readFileSync } from "node:fs";
const env = Object.fromEntries(readFileSync(".env.local", "utf8").split("\n").filter((l) => l.includes("=") && !l.startsWith("#")).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).replace(/^"|"$/g, "")]));
const q = process.argv[2] === "-f" ? readFileSync(process.argv[3], "utf8") : process.argv[2];
const r = await fetch(`https://api.supabase.com/v1/projects/${env.SUPABASE_PROJECT_REF}/database/query`, { method: "POST", headers: { Authorization: `Bearer ${env.SUPABASE_ACCESS_TOKEN}`, "Content-Type": "application/json" }, body: JSON.stringify({ query: q }) });
const t = await r.text();
console.log(r.status, t.length > 6000 ? t.slice(0, 6000) + "…" : t);
process.exit(r.ok ? 0 : 1);
