// Déploie une Edge Function par l'API de gestion Supabase (équivalent de `supabase functions deploy --use-api`).
// usage : node scripts/deploy-fn.mjs <slug> [--no-verify-jwt]   (lit .env.local ; ne l'affiche jamais)
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname, relative } from "node:path";

const env = Object.fromEntries(readFileSync(".env.local", "utf8").split("\n").filter((l) => l.includes("=") && !l.startsWith("#")).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).replace(/^"|"$/g, "")]));
const slug = process.argv[2];
const verify = !process.argv.includes("--no-verify-jwt");
const base = resolve("supabase/functions");
const entree = resolve(base, slug, "index.ts");
const vus = new Map();
function suivre(f) {
  if (vus.has(f)) return;
  const src = readFileSync(f, "utf8");
  vus.set(f, src);
  for (const m of src.matchAll(/from\s+"(\.{1,2}\/[^"]+)"/g)) {
    const cible = resolve(dirname(f), m[1]);
    if (existsSync(cible)) suivre(cible);
  }
}
suivre(entree);
const form = new FormData();
const racine = resolve(base, slug);
for (const [f, src] of vus) {
  // chemins relatifs à la fonction : « index.ts », « ../_shared/x.ts » (comme la CLI)
  form.append("file", new Blob([src], { type: "application/typescript" }), relative(racine, f));
}
form.append("metadata", JSON.stringify({ entrypoint_path: "index.ts", name: slug, verify_jwt: verify }));
const r = await fetch(`https://api.supabase.com/v1/projects/${env.SUPABASE_PROJECT_REF}/functions/deploy?slug=${slug}`, { method: "POST", headers: { Authorization: `Bearer ${env.SUPABASE_ACCESS_TOKEN}` }, body: form });
const t = await r.text();
console.log(slug, r.status, t.slice(0, 300));
process.exit(r.ok ? 0 : 1);
