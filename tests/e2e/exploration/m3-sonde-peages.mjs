// Sonde du round 5 : vrais appels estimer-trajet (session anonyme neuve) depuis Albi ; rend l'état des péages de chaque trajet.
// Usage : node tests/e2e/exploration/m3-sonde-peages.mjs Barcelone Milan …   (chaque appel non servi par le cache consomme une transaction PTV)
import { env, rest } from "./m2-aides.mjs";
const VILLES = { Barcelone: { lat: 41.3874, lon: 2.1686 }, Milan: { lat: 45.4642, lon: 9.19 }, Toulouse: { lat: 43.6047, lon: 1.4442 }, Castres: { lat: 43.606, lon: 2.2399 } };
const ALBI = { lat: 43.9289, lon: 2.1464 };
const s = await fetch(`${env.SUPABASE_URL}/auth/v1/signup`, { method: "POST", headers: { apikey: env.VITE_SUPABASE_ANON_KEY, "Content-Type": "application/json" }, body: "{}" });
const jeton = (await s.json()).access_token;
const [veh] = await rest("vehicules?select=id&marque=eq.Peugeot&limit=1", jeton);
for (const v of process.argv.slice(2)) {
  const t0 = Date.now();
  const r = await fetch(`${env.SUPABASE_URL}/functions/v1/estimer-trajet`, { method: "POST", headers: { apikey: env.VITE_SUPABASE_ANON_KEY, Authorization: `Bearer ${jeton}`, "Content-Type": "application/json" }, body: JSON.stringify({ depart: ALBI, arrivee: VILLES[v], vehicule_id: veh.id }) });
  const j = await r.json();
  const p = j.peages ?? {};
  console.log(JSON.stringify({ heure: new Date().toISOString().slice(11, 19), trajet: `Albi → ${v}`, statut: r.status, ms: Date.now() - t0, itineraire: j.itineraire?.fournisseur, peages: { etat: p.etat, motif: p.motif, fournisseur: p.fournisseur, jusqua: p.jusqua, cache: p.cache ?? false, total: p.total, sections: p.lignes?.length } }));
}
