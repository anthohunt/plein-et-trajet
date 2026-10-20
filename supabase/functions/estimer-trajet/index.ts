// estimer-trajet — itinéraire (IGN pour un trajet 100 % France, Valhalla ailleurs), modèle de consommation par tronçon et par pays, péages.
// Entrée  : POST { depart:{lat,lon}, arrivee:{lat,lon}, vehicule_id }   (JWT Supabase exigé : clé anon ou session anonyme)
// Sortie  : 200 { km, duree_min, litres, l100, vehicule, troncons:[{pays,…}], pays:[{code,nom,km,litres}], itineraire:{fournisseur},
//                 peages:{ etat:"ok"|"indisponible", motif?, fournisseur?, lignes:[{pays,libelle,montant}], total, vignettes:[{pays,libelle}] }, avertissements }
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
import { executerChaine, lireCle, lireMoteur, noterBascule, noterIncident, type Essai } from "../_shared/moteurs.ts";
import { ErreurItineraire, connexionDepuisFournisseur, routeValhalla, type RouteValhalla } from "../_shared/itineraire-europe.ts";
import { ErreurPeages, peagesHere, peagesPtv, totalPeages, type LignePeage } from "../_shared/peages.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const URL_ITINERAIRE = "https://data.geopf.fr/navigation/itineraire";
const URL_ALTI = "https://data.geopf.fr/altimetrie/1.0/calcul/alti/rest/elevation.json";
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

/** Altitudes IGN (RGE ALTI) des échantillons, par lots ; null quand la donnée manque. */
async function altitudes(pts: PointGeo[]): Promise<(number | null)[]> {
  const LOT = 100;
  const out: (number | null)[] = new Array(pts.length).fill(null);
  const lots: number[] = [];
  for (let i = 0; i < pts.length; i += LOT) lots.push(i);
  let suivant = 0;
  const worker = async () => {
    while (suivant < lots.length) {
      const debut = lots[suivant++];
      const part = pts.slice(debut, debut + LOT);
      const url = `${URL_ALTI}?lon=${part.map((p) => p.lon.toFixed(6)).join("|")}&lat=${part.map((p) => p.lat.toFixed(6)).join("|")}&resource=ign_rge_alti_wld&zonly=true`;
      const r = await avecReprises(url, 20000);
      if (!r.ok) throw new Error(`altimetrie HTTP ${r.status}`);
      const d = (await r.json()) as { elevations?: number[] };
      if (!Array.isArray(d.elevations) || d.elevations.length !== part.length) throw new Error("altimetrie: réponse mal formée");
      d.elevations.forEach((z, k) => {
        out[debut + k] = nombre(z) && z > -1000 ? z : null; // -99999 = pas de donnée
      });
    }
  };
  await Promise.all([worker(), worker(), worker()]);
  return out;
}

/** Itinéraire IGN (trajet 100 % France) : étapes avec dénivelé de l'altimétrie IGN. */
async function itineraireIgn(depart: PointGeo, arrivee: PointGeo, avertissements: string[]): Promise<{ etapes: Etape[]; duree_s: number }> {
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
    const alt = await altitudes(ech);
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
  return { etapes, duree_s: nombre(ign.duration) ? (ign.duration as number) : 0 };
}

/** Péages : fournisseur actif puis secours (table moteurs + Vault) ; l'échec n'empêche jamais le coût carburant. */
interface ResPeages {
  etat: "ok" | "indisponible";
  motif?: string;
  fournisseur: string | null;
  lignes: LignePeage[];
  total: number;
}
// Limite d'appels de péages (LOW 19) : par identité anonyme et globale, par jour (table quota_peages). Au-delà, le calcul continue sans péages.
// PTV offre 100 000 transactions/mois, HERE 2 500/mois (≈ 80/jour) : 60 par identité et 1 500 au total par jour bornent un abus isolé (un visiteur seul ne peut pas vider les quotas) tout en laissant passer l'usage normal et les campagnes de test.
const QUOTA_IDENTITE = 60;
const QUOTA_GLOBAL = 1500;
function identiteDuJeton(req: Request): string {
  try {
    const jeton = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
    const charge = JSON.parse(atob(jeton.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return typeof charge.sub === "string" && charge.sub ? charge.sub : "sans-session";
  } catch {
    return "sans-session";
  }
}
async function calculerPeages(// deno-lint-ignore no-explicit-any
  db: any, depart: PointGeo, arrivee: PointGeo, tva: Record<string, number>, identite: string): Promise<ResPeages> {
  const { data: autorise } = await db.rpc("quota_peages_reserver", { p_identite: identite, p_max_identite: QUOTA_IDENTITE, p_max_global: QUOTA_GLOBAL });
  if (autorise === false) return { etat: "indisponible", motif: "quota_atteint", fournisseur: null, lignes: [], total: 0 };
  const m = await lireMoteur(db, "peages");
  const essais: Essai<LignePeage[]>[] = [];
  for (const f of [m.actif, m.secours].filter((x): x is string => !!x)) {
    essais.push({
      fournisseur: f,
      appel: async () => {
        const cle = await lireCle(db, f);
        if (!cle) throw new ErreurPeages("cle_manquante");
        if (f === "ptv") return await peagesPtv(cle, depart, arrivee, tva);
        if (f === "here") return await peagesHere(cle, depart, arrivee);
        throw new ErreurPeages("aucun_fournisseur");
      },
    });
  }
  const s = await executerChaine(essais);
  if (s.echecs.length > 0) await noterIncident(db, "peages", `${s.echecs[0].fournisseur} : ${s.echecs[0].message}`);
  if (s.resultat) {
    if (s.bascule) await noterBascule(db, "peages", m.actif, s.fournisseur!);
    return { etat: "ok", fournisseur: s.fournisseur, lignes: s.resultat, total: totalPeages(s.resultat) };
  }
  const motif = (s.echecs[0] && /^(cle_manquante|cle_refusee|quota|reponse_invalide|aucun_fournisseur)/.exec(s.echecs[0].message)?.[1]) || "indisponible";
  return { etat: "indisponible", motif, fournisseur: m.actif, lignes: [], total: 0 };
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
  if (s.bascule) await noterBascule(db, "itineraire", m.actif, s.fournisseur!);
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
  const france = pointEnFrance(depart.lat, depart.lon) && pointEnFrance(arrivee.lat, arrivee.lon);
  try {
    if (france) {
      const r = await itineraireIgn(depart, arrivee, avertissements);
      etapesParPays = [["FR", r.etapes]];
      aPeage = r.etapes.some((e) => /^A\d/i.test(e.numero)); // aucune autoroute numérotée : aucun péage
      fournisseurItineraire = "itineraire-ign";
      kmAutoroute = { FR: r.etapes.filter((e) => /^A\d/i.test(e.numero)).reduce((s, e) => s + e.distance_m / 1000, 0) };
    } else {
      const { route, fournisseur } = await itineraireEurope(db, depart, arrivee);
      const e = etapesDepuisAretes(route.aretes, route.admins);
      if (e.etapesParPays.length === 0) throw new ErreurItineraire("pas_itineraire");
      etapesParPays = e.etapesParPays;
      aPeage = Object.values(e.kmPeageParPays).reduce((s, x) => s + x, 0) > 0.2;
      fournisseurItineraire = fournisseur;
      kmAutoroute = e.kmAutorouteParPays;
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
      peages = await calculerPeages(db, depart, arrivee, tva, identiteDuJeton(req));
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
    avertissements,
  });
});
