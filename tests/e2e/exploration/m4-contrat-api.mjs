// Vérification du contrat API du jalon 4 : chaque appel front ↔ serveur écrit ou touché, joué pour de vrai contre la prod
// (session anonyme réelle, clé anonyme publique). Imprime une ligne « FE → BE — OK|MISMATCH » par appel.
import { env } from "./m2-aides.mjs";
import { lireGpx, indexAuKm } from "./m4-aides.mjs";

const H = { apikey: env.VITE_SUPABASE_ANON_KEY, "Content-Type": "application/json" };
const s = await (await fetch(`${env.VITE_SUPABASE_URL}/auth/v1/signup`, { method: "POST", headers: H, body: JSON.stringify({}) })).json();
const jeton = s.access_token;
const A = { ...H, Authorization: `Bearer ${jeton}` };
const lignes = [];
const ligne = (fe, be, ok, detail) => lignes.push(`- FE: ${fe} → BE: ${be} — ${ok ? "OK" : "MISMATCH"}${detail ? ` (${detail})` : ""}`);
const a = (o, cles) => cles.filter((k) => !(k in (o ?? {})));

// 1) trajet-roule : extrait de 70 s du GPX à partir du km 5 (≈ 1,3 km), même corps que src/lib/enRoute.ts
const pts = lireGpx();
const i0 = indexAuKm(pts, 5);
const t0 = Date.now();
const points = pts.slice(i0, i0 + 70).map((p, k) => [t0 + k * 1000, p.lat, p.lon, 0]);
let r = await fetch(`${env.VITE_SUPABASE_URL}/functions/v1/trajet-roule`, { method: "POST", headers: A, body: JSON.stringify({ points, vehicule_id: "2ed51bbad5ac66a7" }) });
let j = await r.json();
const manque = [...a(j, ["km", "duree_min", "litres", "l100", "vehicule", "troncons", "pays", "peages", "itineraire", "enregistre", "traversee_manche"]), ...a(j.enregistre, ["depart", "arrivee", "vitesses", "vitesse_moy", "accelerations"]).map((k) => "enregistre." + k), ...a(j.vehicule, ["id", "libelle", "carburant"]).map((k) => "vehicule." + k)];
ligne("src/lib/enRoute.ts:84 calculerTrajetRoule", "supabase/functions/trajet-roule/index.ts:98 {points, vehicule_id} → :184 enregistre", r.status === 200 && manque.length === 0, `HTTP ${r.status}${manque.length ? ", champs absents : " + manque.join(", ") : `, ${j.km} km, ${j.enregistre?.depart?.label} → ${j.enregistre?.arrivee?.label}`}`);
r = await fetch(`${env.VITE_SUPABASE_URL}/functions/v1/trajet-roule`, { method: "POST", headers: A, body: JSON.stringify({ points: points.slice(0, 5), vehicule_id: "2ed51bbad5ac66a7" }) });
j = await r.json();
ligne("src/lib/enRoute.ts:88 ErreurRoule(trop_court)", "supabase/functions/trajet-roule/index.ts 422 {erreur:\"trop_court\"}", r.status === 422 && j.erreur === "trop_court", `HTTP ${r.status} ${JSON.stringify(j)}`);

// 2) insertion du trajet roulé (colonnes du jalon 4) sous RLS, puis relecture et suppression
const uid = JSON.parse(Buffer.from(jeton.split(".")[1], "base64url")).sub;
r = await fetch(`${env.VITE_SUPABASE_URL}/rest/v1/trajets?select=*`, { method: "POST", headers: { ...A, Prefer: "return=representation" }, body: JSON.stringify({ user_id: uid, depart_label: "Contrat", depart_lat: 43.9, depart_lon: 2.1, arrivee_label: "Contrat", arrivee_lat: 43.91, arrivee_lon: 2.1, vehicule_id: "2ed51bbad5ac66a7", km: 1.3, litres: 0.1, troncons: [], enregistre: true, vitesses: [1, 2], vitesse_moy: 70, accelerations: 1, estimation: { km: 1.3 } }) });
j = await r.json();
const id = j?.[0]?.id;
ligne("src/lib/enRoute.ts:123 enregistrerTrajetRoule (insert)", "rest/v1/trajets + migration 20261021180000:4-8 (enregistre, vitesses, vitesse_moy, accelerations, estimation)", r.status === 201 && j[0]?.enregistre === true && Array.isArray(j[0]?.vitesses), `HTTP ${r.status}`);
r = await fetch(`${env.VITE_SUPABASE_URL}/rest/v1/trajets?select=*&order=cree_le.desc&limit=30`, { headers: A });
j = await r.json();
ligne("src/lib/trajets.ts:99 listerTrajets", "rest/v1/trajets select * (RLS user_id)", r.status === 200 && j.some((t) => t.id === id && "estimation" in t), `HTTP ${r.status}, ${j.length} ligne(s)`);
if (id) await fetch(`${env.VITE_SUPABASE_URL}/rest/v1/trajets?id=eq.${id}`, { method: "DELETE", headers: A });

// 3) lectures publiques : prix d'origine, cours du jour, moyennes avec nb_stations, consommations WLTP
r = await fetch(`${env.VITE_SUPABASE_URL}/rest/v1/prix?select=station_id,carburant,prix,maj,rupture,prix_origine,unite_origine&station_id=like.GB-*&limit=1`, { headers: A });
j = await r.json();
ligne("src/lib/donnees.ts:56 prixStation (prix_origine, unite_origine)", "rest/v1/prix + migration :11-12", r.status === 200 && j[0]?.unite_origine === "p/L" && j[0]?.prix_origine != null, `HTTP ${r.status} ${JSON.stringify(j[0] ?? {})}`);
r = await fetch(`${env.VITE_SUPABASE_URL}/rest/v1/cours_change?select=monnaie,taux,jour,source&monnaie=eq.GBP`, { headers: A });
j = await r.json();
ligne("src/lib/donnees.ts:68 coursDuJour", "rest/v1/cours_change + migration :14 (lecture publique)", r.status === 200 && Number(j[0]?.taux) > 0, `HTTP ${r.status} taux ${j[0]?.taux} du ${j[0]?.jour}`);
r = await fetch(`${env.VITE_SUPABASE_URL}/rest/v1/rpc/moyennes_par_pays`, { method: "POST", headers: A, body: JSON.stringify({ p_carburant: "Gazole" }) });
j = await r.json();
const gb = j.find?.((m) => m.pays === "GB");
ligne("src/lib/donnees.ts:87 moyennesParPays (nb_stations)", "rpc/moyennes_par_pays + migration :77", r.status === 200 && gb?.source === "flux" && gb?.nb_stations > 0, `HTTP ${r.status} GB ${gb?.prix_moyen} €/L, ${gb?.nb_stations} stations`);
r = await fetch(`${env.VITE_SUPABASE_URL}/rest/v1/vehicules?select=id,marque,modele,motorisation,carburant,masse_kg,puissance_kw,conso_basse,conso_moyenne,conso_haute,conso_tres_haute&id=eq.2ed51bbad5ac66a7`, { headers: A });
j = await r.json();
ligne("src/lib/vehicules.ts:19 COLONNES (conso WLTP)", "rest/v1/vehicules (lecture publique)", r.status === 200 && j[0]?.conso_haute != null, `HTTP ${r.status}`);

// 4) lieux « pays » (prix du jour du coût en direct) et estimer-trajet (traversee_manche), sans péages (Albi → Castres)
r = await fetch(`${env.VITE_SUPABASE_URL}/functions/v1/lieux`, { method: "POST", headers: A, body: JSON.stringify({ action: "pays", lat: 51.5074, lon: -0.1278 }) });
j = await r.json();
ligne("src/lib/enRoute.ts:130 paysDePosition", "supabase/functions/lieux/index.ts:63 action pays", r.status === 200 && j?.pays?.code === "GB", `HTTP ${r.status} ${JSON.stringify(j)}`);
r = await fetch(`${env.VITE_SUPABASE_URL}/functions/v1/estimer-trajet`, { method: "POST", headers: A, body: JSON.stringify({ depart: { lat: 43.9289, lon: 2.1464 }, arrivee: { lat: 43.6058, lon: 2.2405 }, vehicule_id: "2ed51bbad5ac66a7" }) });
j = await r.json();
ligne("src/lib/trajets.ts:45 estimerTrajet (traversee_manche)", "supabase/functions/estimer-trajet/index.ts:283", r.status === 200 && j.traversee_manche === false, `HTTP ${r.status} ${j.km} km`);
console.log(lignes.join("\n"));
