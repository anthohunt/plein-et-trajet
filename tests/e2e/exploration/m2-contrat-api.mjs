// Contrôle de contrat du jalon 2 : chaque appel du front est joué pour de vrai contre le backend déployé
// (sessions anonymes réelles), avec les champs exacts utilisés par src/lib. Sortie : une ligne par appel.
import { createClient } from "@supabase/supabase-js";
import { env } from "./m2-aides.mjs";

const neuf = () => createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const ok = (c, msg) => console.log(`${c ? "OK  " : "KO  "} ${msg}`);
const a = neuf();
const b = neuf();
const { data: da, error: ea } = await a.auth.signInAnonymously();
ok(!ea && !!da.user?.id && da.user.is_anonymous, `auth.signInAnonymously → utilisateur anonyme ${da?.user?.id?.slice(0, 8)}… (session.ts)`);
const { data: db } = await b.auth.signInAnonymously();

const m = await a.rpc("vehicules_marques");
ok(!m.error && m.data.length >= 30 && "marque" in m.data[0], `rpc vehicules_marques → ${m.data?.length} lignes {marque} (vehicules.ts marques)`);
const mo = await a.rpc("vehicules_modeles", { p_marque: "Peugeot" });
ok(!mo.error && mo.data.some((x) => x.modele === "208"), `rpc vehicules_modeles(p_marque) → ${mo.data?.length} lignes {modele}, dont 208 (vehicules.ts modeles)`);
const mt = await a.from("vehicules").select("id,marque,modele,motorisation,carburant,masse_kg,puissance_kw").eq("marque", "Peugeot").eq("modele", "208").order("puissance_kw");
const v = mt.data?.find((x) => x.motorisation === "208 (101ch) · mécanique");
ok(!mt.error && !!v && typeof v.masse_kg === "number" && ["SP95-E10", "Gazole"].includes(v.carburant), `select vehicules (colonnes COLONNES) → ${mt.data?.length} motorisations 208, masse_kg numérique, puissance_kw "${v?.puissance_kw}" (Number() appliqué côté front) (vehicules.ts motorisations)`);
const ecriture = await neuf().from("vehicules").insert({ id: "x", marque: "x", modele: "x", motorisation: "x", energie: "x", carburant: "Gazole", masse_kg: 1, puissance_kw: 1, conso_basse: 1, conso_moyenne: 1, conso_haute: 1, conso_tres_haute: 1 });
ok(!!ecriture.error, `insert vehicules avec la clé anonyme → refusé (${ecriture.error?.code ?? "?"}) : écriture réservée au service`);

// preferences
const up = await a.from("preferences").upsert({ user_id: da.user.id, marque: "Peugeot", modele: "208", vehicule_id: v.id, carburant: v.carburant, maj: new Date().toISOString() }, { onConflict: "user_id" });
ok(!up.error, `upsert preferences {user_id, marque, modele, vehicule_id, carburant, maj} on_conflict user_id (vehicules.ts memoriserPreference) ${up.error?.message ?? ""}`);
const lp = await a.from("preferences").select("marque,modele,vehicule_id,carburant").maybeSingle();
ok(!lp.error && lp.data?.vehicule_id === v.id, `select preferences (maybeSingle, sans filtre : RLS = ligne de l'utilisateur) → vehicule_id ${lp.data?.vehicule_id} (lirePreference)`);
const lpb = await b.from("preferences").select("marque").maybeSingle();
ok(!lpb.error && lpb.data === null, `RLS preferences : une autre session anonyme ne voit rien`);
const volp = await b.from("preferences").upsert({ user_id: da.user.id, marque: "Pirate" }, { onConflict: "user_id" });
ok(!!volp.error, `RLS preferences : écrire la ligne d'un autre utilisateur → refusé (${volp.error?.code})`);

// estimer-trajet
const inv = (s, corps) => s.functions.invoke("estimer-trajet", { body: corps });
const albi = { lat: 43.9289, lon: 2.1464 };
const toulouse = { lat: 43.6047, lon: 1.4442 };
const e1 = await inv(a, { depart: albi, arrivee: toulouse, vehicule_id: v.id });
const d1 = e1.data;
ok(!e1.error && d1.km > 60 && d1.litres > 2 && Array.isArray(d1.troncons) && d1.vehicule.id === v.id && ["km", "duree_min", "litres", "l100", "vehicule", "troncons", "avertissements"].every((k) => k in d1),
  `functions.invoke estimer-trajet {depart,arrivee,vehicule_id} → 200 {km ${d1?.km}, litres ${d1?.litres}, l100 ${d1?.l100}, ${d1?.troncons?.length} tronçons, vehicule.carburant ${d1?.vehicule?.carburant}} (trajets.ts estimerTrajet ↔ supabase/functions/estimer-trajet/index.ts)`);
const t0 = d1.troncons[0];
ok(["type", "voies", "km", "duree_min", "vitesse_kmh", "arrets", "denivele_m", "litres", "l100"].every((k) => k in t0), `tronçon : champs ${Object.keys(t0).join(", ")} = interface Troncon du front`);
const e2 = await a.functions.invoke("estimer-trajet", { body: { depart: albi, arrivee: { lat: 42.6876, lon: 9.4352 }, vehicule_id: v.id } });
const corps422 = await e2.error?.context?.json?.().catch(() => null);
ok(e2.error?.context?.status === 422 && corps422?.erreur === "pas_itineraire", `Albi → Bastia : HTTP ${e2.error?.context?.status} ${JSON.stringify(corps422)} (le front lit error.context.json().erreur)`);
const e3 = await a.functions.invoke("estimer-trajet", { body: { depart: albi, arrivee: toulouse, vehicule_id: "inconnu" } });
ok(e3.error?.context?.status === 404, `véhicule inconnu : HTTP ${e3.error?.context?.status} {"erreur":"vehicule_inconnu"} → le front le traite comme « indisponible »`);
const e4 = await a.functions.invoke("estimer-trajet", { body: { depart: "x" } });
ok(e4.error?.context?.status === 400, `corps invalide : HTTP ${e4.error?.context?.status} {"erreur":"requete_invalide"}`);
const sansJwt = await fetch(`${env.VITE_SUPABASE_URL}/functions/v1/estimer-trajet`, { method: "POST", body: "{}" });
ok(sansJwt.status === 401, `appel sans JWT : HTTP ${sansJwt.status} (verify_jwt actif : clé anon ou session exigée, envoyée par functions.invoke)`);

// trajets
const ligne = {
  depart_label: "Albi", depart_lat: albi.lat, depart_lon: albi.lon, arrivee_label: "Toulouse", arrivee_lat: toulouse.lat, arrivee_lon: toulouse.lon,
  vehicule_id: v.id, vehicule_label: d1.vehicule.libelle, carburant: d1.vehicule.carburant, km: d1.km, litres: d1.litres, prix_litre: 2.161, cout: 8.3, troncons: d1.troncons, cree_le: new Date().toISOString(),
};
const ins = await a.from("trajets").insert({ user_id: da.user.id, ...ligne }).select("*").single();
ok(!ins.error && ins.data.id && Number(ins.data.km) === d1.km, `insert trajets (colonnes de enregistrerTrajet) + select("*") → id ${ins.data?.id?.slice(0, 8)}…, km numeric renvoyé en ${typeof ins.data?.km} (Number() côté front) ${ins.error?.message ?? ""}`);
const sel = await a.from("trajets").select("id").eq("depart_label", "Albi").eq("arrivee_label", "Toulouse").eq("vehicule_id", v.id).limit(1).maybeSingle();
ok(!sel.error && sel.data?.id === ins.data.id, `select trajets filtré (depart_label, arrivee_label, vehicule_id) maybeSingle → même ligne`);
const upd = await a.from("trajets").update({ ...ligne, km: 99.9, cree_le: new Date().toISOString() }).eq("id", ins.data.id).select("*").single();
ok(!upd.error && Number(upd.data.km) === 99.9, `update trajets … eq(id) select single → km ${upd.data?.km}`);
const lst = await a.from("trajets").select("*").order("cree_le", { ascending: false }).limit(30);
ok(!lst.error && lst.data.length === 1 && Array.isArray(lst.data[0].troncons), `select * order cree_le desc limit 30 → ${lst.data?.length} ligne, troncons jsonb tableau (listerTrajets)`);
const lstb = await b.from("trajets").select("*");
ok(!lstb.error && lstb.data.length === 0, `RLS trajets : une autre session anonyme voit ${lstb.data?.length} ligne(s)`);
const delb = await b.from("trajets").delete({ count: "exact" }).eq("id", ins.data.id);
ok(!delb.error && delb.count === 0, `RLS trajets : delete de la ligne d'un autre utilisateur → count ${delb.count} (le front lève « trajet introuvable » si count = 0)`);
const anon = await neuf().from("trajets").insert({ user_id: da.user.id, ...ligne });
ok(!!anon.error, `insert trajets sans session (clé anon seule) → refusé (${anon.error?.code})`);
const del = await a.from("trajets").delete({ count: "exact" }).eq("id", ins.data.id);
ok(!del.error && del.count === 1, `delete trajets eq(id) {count:"exact"} → count ${del.count} (supprimerTrajet)`);
await a.from("preferences").delete().eq("user_id", da.user.id);
const mn = await a.from("moyennes_nationales").select("jour,carburant,prix_moyen,nb_stations").eq("carburant", "SP95-E10").order("jour", { ascending: false }).limit(1);
ok(!mn.error && Number(mn.data[0].prix_moyen) > 1, `select moyennes_nationales avec session anonyme (rôle authenticated) → ${mn.data?.[0]?.prix_moyen} €/L (donnees.ts moyenneNationale : politique « to anon, authenticated »)`);
const st = await a.rpc("stations_autour", { lat: albi.lat, lon: albi.lon, rayon_m: 10000 });
ok(!st.error && st.data.length > 3, `rpc stations_autour avec session anonyme → ${st.data?.length} stations (M1 non cassé par la session persistante)`);
