// estimer-trajet — itinéraire (IGN pour un trajet 100 % France, Valhalla ailleurs), modèle de consommation par tronçon et par pays, péages.
// Entrée  : POST { depart:{lat,lon}, arrivee:{lat,lon}, vehicule_id }   (JWT Supabase exigé : clé anon ou session anonyme)
// Sortie  : 200 { km, duree_min, litres, l100, vehicule, troncons:[{pays,…}], pays:[{code,nom,km,litres}], itineraire:{fournisseur},
//                 peages:{ etat:"ok"|"indisponible", motif?, fournisseur?, jusqua?, cache?, lignes:[{pays,libelle,montant,fourchette?}], total, vignettes:[{pays,libelle}] }, avertissements }
//           400 requete_invalide · 404 vehicule_inconnu · 422 pas_itineraire | hors_couverture | trop_long · 502 itineraire_indisponible
// Sources : IGN (bdtopo-osrm, RGE ALTI), Valhalla (moteur « itineraire »), PTV / HERE (moteur « peages ») ; fournisseurs et clés lus dans la table moteurs + Vault à chaque appel.
import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  decouperParPays,
  deniveleParEtape,
  echantillonner,
  resumeParPays,
  synthese,
  type Carburant,
  type Etape,
  type PointGeo,
} from "../_shared/modele.ts";
import { etapesDepuisAretes, pointEnFrance, vignettesTraversees } from "../_shared/europe.ts";
import { executerChaine, lireCle, lireMoteur, noterIncident, noterIssue, type Essai } from "../_shared/moteurs.ts";
import { ErreurItineraire, connexionDepuisFournisseur, routeValhalla, type RouteValhalla } from "../_shared/itineraire-europe.ts";
import { ajusterPeagesRoyaumeUni, calculerPeages, identiteDuJeton, type ResPeages } from "../_shared/calcul-peages.ts";
import { altitudesIgn } from "../_shared/altimetrie.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const URL_ITINERAIRE = "https://data.geopf.fr/navigation/itineraire";
const UA = { "User-Agent": "plein-et-trajet/1.0 (+https://plein-et-trajet.vercel.app)" };

function reponse(statut: number, corps: unknown): Response {
  return new Response(JSON.stringify(corps), { status: statut, headers: { ...CORS, "Content-Type": "application/json" } });
}

async function fetchTimeout(url: string, ms: number): Promise<Response> {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), ms);
  try {
    return await fetch(url, { headers: UA, signal: c.signal });
  } finally {
    clearTimeout(t);
  }
}

async function avecReprises(url: string, ms: number, essais = 3): Promise<Response> {
  let derniere: Response | null = null;
  for (let i = 1; i <= essais; i++) {
    try {
      const r = await fetchTimeout(url, ms);
      if (r.ok || (r.status !== 429 && r.status < 500)) return r;
      derniere = r;
    } catch (e) {
      if (i === essais) throw e;
    }
    await new Promise((res) => setTimeout(res, 600 * i));
  }
  return derniere!;
}

const libelleVehicule = (marque: string, modele: string, motorisation: string) =>
  motorisation.toLowerCase().includes(modele.toLowerCase()) ? `${marque} ${motorisation}` : `${marque} ${modele} ${motorisation}`;

const nombre = (x: unknown) => typeof x === "number" && Number.isFinite(x);
const pointValide = (p: unknown): p is { lat: number; lon: number } =>
  !!p && nombre((p as PointGeo).lat) && nombre((p as PointGeo).lon) && Math.abs((p as PointGeo).lat) <= 90 && Math.abs((p as PointGeo).lon) <= 180;

interface EtapeIgn {
  geometry?: { coordinates?: number[][] };
  attributes?: { name?: { cpx_numero?: string } };
  distance?: number;
  duration?: number;
  instruction?: { type?: string };
}

/** Itinéraire IGN (trajet 100 % France) : étapes avec dénivelé de l'altimétrie IGN. */
async function itineraireIgn(depart: PointGeo, arrivee: PointGeo, avertissements: string[]): Promise<{ etapes: Etape[]; duree_s: number; trace: PointGeo[] }> {
  const urlIt =
    `${URL_ITINERAIRE}?resource=bdtopo-osrm&start=${depart.lon},${depart.lat}&end=${arrivee.lon},${arrivee.lat}` +
    `&profile=car&optimization=fastest&getSteps=true&geometryFormat=geojson&crs=EPSG:4326`;
  let ign: { distance?: number; duration?: number; portions?: { steps?: EtapeIgn[] }[] };
  try {
    const r = await avecReprises(urlIt, 30000);
    if (r.status === 404 || r.status === 400) throw new ErreurItineraire("pas_itineraire");
    if (!r.ok) throw new ErreurItineraire("indisponible");
    ign = await r.json();
  } catch (e) {
    throw e instanceof ErreurItineraire ? e : new ErreurItineraire("indisponible");
  }
  const steps = (ign.portions ?? []).flatMap((p) => p.steps ?? []).filter((s) => nombre(s.distance) && (s.geometry?.coordinates?.length ?? 0) >= 1);
  if (steps.length === 0 || !ign.distance || !nombre(ign.distance) || ign.distance <= 0) throw new ErreurItineraire("pas_itineraire");

  // altimétrie tous les 500 m (si elle échoue : trajet calculé sans dénivelé, signalé)
  const geom = steps.map((s) => (s.geometry!.coordinates as number[][]).map(([lon, lat]) => ({ lon, lat })));
  const ech = echantillonner(geom, 500);
  let denivs = new Array<number>(steps.length).fill(0);
  try {
    const alt = await altitudesIgn(ech);
    denivs = deniveleParEtape(ech, alt, steps.length);
  } catch {
    avertissements.push("altimetrie_indisponible");
  }
  const etapes: Etape[] = steps.map((s, i) => ({
    distance_m: s.distance as number,
    duree_s: nombre(s.duration) ? (s.duration as number) : 0,
    numero: s.attributes?.name?.cpx_numero ?? "",
    manoeuvre: s.instruction?.type ?? "",
    denivele_m: denivs[i] ?? 0,
  }));
  return { etapes, duree_s: nombre(ign.duration) ? (ign.duration as number) : 0, trace: geom.flat() };
}

/** Itinéraire Europe : Valhalla (moteur « itineraire » : actif puis secours). */
async function itineraireEurope(// deno-lint-ignore no-explicit-any
  db: any, depart: PointGeo, arrivee: PointGeo): Promise<{ route: RouteValhalla; fournisseur: string }> {
  const m = await lireMoteur(db, "itineraire");
  const ids = [m.actif, m.secours].filter((x): x is string => !!x);
  if (ids.length === 0 || ids.every((i) => i === "itineraire-ign")) throw new ErreurItineraire("pas_itineraire", "hors_couverture");
  const essais: Essai<RouteValhalla>[] = ids
    .filter((f) => f !== "itineraire-ign")
    .map((f) => ({
      fournisseur: f,
      appel: async () => {
        // adresse, chemins et pause du fournisseur : table `fournisseurs` ; clé (Stadia) : Vault ; pause tenue par le limiteur partagé
        const { data: ligne } = await db.from("fournisseurs").select("id,url,chemin_route,chemin_trace,pause_ms,cle_requise").eq("id", f).maybeSingle();
        if (!ligne) throw new ErreurItineraire("indisponible", `fournisseur ${f} inconnu`);
        let cle: string | null = null;
        if (ligne.cle_requise) {
          cle = await lireCle(db, f);
          if (!cle) throw new ErreurItineraire("cle_refusee", "clé manquante");
        }
        const reserver = async (nom: string, pauseMs: number) => {
          const { data } = await db.rpc("limiteur_reserver", { p_nom: nom, p_intervalle_ms: pauseMs });
          return Number(data ?? 0);
        };
        return await routeValhalla(connexionDepuisFournisseur(ligne, cle, reserver), depart, arrivee);
      },
    }));
  const s = await executerChaine(essais);
  if (s.echecs.length > 0) await noterIncident(db, "itineraire", `${s.echecs[0].fournisseur} : ${s.echecs[0].message}`);
  if (!s.resultat) {
    if (s.echecs.some((e) => e.message.startsWith("pas_itineraire"))) throw new ErreurItineraire("pas_itineraire");
    if (s.echecs.some((e) => e.message.startsWith("trop_long"))) throw new ErreurItineraire("trop_long");
    throw new ErreurItineraire("indisponible");
  }
  await noterIssue(db, "itineraire", m, s, true); // l'itinéraire n'a pas de cache : le fournisseur a répondu
  return { route: s.resultat, fournisseur: s.fournisseur! };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return reponse(405, { erreur: "methode_non_autorisee" });

  let corps: { depart?: unknown; arrivee?: unknown; vehicule_id?: unknown };
  try {
    corps = await req.json();
  } catch {
    return reponse(400, { erreur: "requete_invalide" });
  }
  const { depart, arrivee, vehicule_id } = corps;
  if (!pointValide(depart) || !pointValide(arrivee) || typeof vehicule_id !== "string" || vehicule_id.length === 0) {
    return reponse(400, { erreur: "requete_invalide" });
  }

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const { data: veh, error: errVeh } = await db
    .from("vehicules")
    .select("id,marque,modele,motorisation,carburant,masse_kg,conso_basse,conso_moyenne,conso_haute,conso_tres_haute")
    .eq("id", vehicule_id)
    .maybeSingle();
  if (errVeh) return reponse(500, { erreur: "base_indisponible" });
  if (!veh) return reponse(404, { erreur: "vehicule_inconnu" });
  const { data: tablePays } = await db.from("pays").select("code,nom,tva");
  const nomsPays: Record<string, string> = {};
  const tva: Record<string, number> = {};
  for (const p of (tablePays ?? []) as { code: string; nom: string; tva: number }[]) {
    nomsPays[p.code] = p.nom;
    tva[p.code] = Number(p.tva);
  }

  const avertissements: string[] = [];
  const modeleVeh = {
    masse_kg: veh.masse_kg,
    carburant: veh.carburant as Carburant,
    conso: { basse: Number(veh.conso_basse), moyenne: Number(veh.conso_moyenne), haute: Number(veh.conso_haute), tres_haute: Number(veh.conso_tres_haute) },
  };

  // 1) itinéraire : IGN pour un trajet 100 % France, Valhalla dès qu'un bout est à l'étranger
  let etapesParPays: [string, Etape[]][];
  let aPeage: boolean;
  let fournisseurItineraire: string;
  let kmAutoroute: Record<string, number> = {};
  let trace: PointGeo[] = [];
  let nomsRoutes: (string[] | undefined)[] = [];
  let traverseeMer = false;
  const france = pointEnFrance(depart.lat, depart.lon) && pointEnFrance(arrivee.lat, arrivee.lon);
  try {
    if (france) {
      const r = await itineraireIgn(depart, arrivee, avertissements);
      etapesParPays = [["FR", r.etapes]];
      aPeage = r.etapes.some((e) => /^A\d/i.test(e.numero)); // aucune autoroute numérotée : aucun péage
      fournisseurItineraire = "itineraire-ign";
      trace = r.trace;
      kmAutoroute = { FR: r.etapes.filter((e) => /^A\d/i.test(e.numero)).reduce((s, e) => s + e.distance_m / 1000, 0) };
    } else {
      const { route, fournisseur } = await itineraireEurope(db, depart, arrivee);
      const e = etapesDepuisAretes(route.aretes, route.admins);
      if (e.etapesParPays.length === 0) throw new ErreurItineraire("pas_itineraire");
      etapesParPays = e.etapesParPays;
      aPeage = Object.values(e.kmPeageParPays).reduce((s, x) => s + x, 0) > 0.2;
      fournisseurItineraire = fournisseur;
      trace = route.trace;
      kmAutoroute = e.kmAutorouteParPays;
      nomsRoutes = route.aretes.map((a) => a.names);
      traverseeMer = e.traversee;
    }
  } catch (e) {
    if (e instanceof ErreurItineraire) {
      if (e.code === "trop_long") return reponse(422, { erreur: "trop_long" });
      if (e.code === "pas_itineraire") return reponse(422, { erreur: e.message.includes("hors_couverture") ? "hors_couverture" : "pas_itineraire" });
      return reponse(502, { erreur: "itineraire_indisponible" });
    }
    return reponse(502, { erreur: "itineraire_indisponible" });
  }

  // 2) tronçons et consommation, par pays traversé
  const troncons = decouperParPays(etapesParPays, modeleVeh);
  if (troncons.length === 0) return reponse(422, { erreur: "pas_itineraire" });
  const s = synthese(troncons);
  const pays = resumeParPays(troncons).map((p) => ({ ...p, nom: nomsPays[p.code] ?? p.code }));
  if (pays.length === 1) pays[0].litres = s.litres; // un seul pays : mêmes litres que le total (coût identique à celui d'avant le jalon 3)

  // 3) péages (jamais bloquants) et vignettes des pays dont l'autoroute est empruntée
  const { data: vig } = await db.from("vignettes").select("pays,libelle");
  const vignettes = vignettesTraversees(kmAutoroute, (vig ?? []) as { pays: string; libelle: string }[]);
  let peages: ResPeages;
  if (!aPeage) peages = { etat: "ok", fournisseur: null, lignes: [], total: 0 };
  else {
    try {
      peages = await calculerPeages(db, depart, arrivee, tva, identiteDuJeton(req), trace);
      if (pays.some((p) => p.code === "GB")) peages = await ajusterPeagesRoyaumeUni(db, peages, nomsRoutes);
    } catch {
      peages = { etat: "indisponible", motif: "indisponible", fournisseur: null, lignes: [], total: 0 };
    }
  }

  return reponse(200, {
    km: s.km,
    duree_min: s.duree_min,
    litres: s.litres,
    l100: s.l100,
    vehicule: { id: veh.id, libelle: libelleVehicule(veh.marque, veh.modele, veh.motorisation), carburant: veh.carburant, masse_kg: veh.masse_kg },
    troncons,
    pays,
    itineraire: { fournisseur: fournisseurItineraire },
    peages: { ...peages, vignettes },
    // US-3.9 : Royaume-Uni rejoint depuis le continent → la traversée de la Manche (tunnel ou ferry) n'est pas comptée
    traversee_manche: traverseeMer || (pays.some((p) => p.code === "GB") && pays.some((p) => p.code !== "GB" && p.code !== "IE")),
    avertissements,
  });
});
