// trajet-roule — coût d'un trajet ENREGISTRÉ EN ROULANT (jalon 4, US-6.5 / 6.6) : calcul sur la vitesse réelle, seconde par seconde.
// Entrée  : POST { points: [[t_ms, lat, lon, segment], …], vehicule_id }   (JWT Supabase exigé : session anonyme)
// Sortie  : 200 { km, duree_min, litres, l100, vehicule, troncons, pays, itineraire:{fournisseur, recalage:true}, peages, traversee_manche,
//                 avertissements, enregistre:{ depart:{lat,lon,label}, arrivee:{…}, vitesses, vitesse_moy, accelerations, arrets, duree_s,
//                 points, points_envoyes, points_recales } }
//           400 requete_invalide · 404 vehicule_inconnu · 422 trop_court | pas_itineraire · 502 recalage_indisponible
// Chaîne : 1) pas et vitesses mesurées (roule.ts) ; 2) recalage du tracé sur la carte — Valhalla /trace_attributes en map_snap, moteur
// « itineraire » (Stadia puis secours) ; 3) chaque seconde rattachée à sa route : pays, Autoroute / Route / Ville, pente ; litres sur la
// vitesse réelle avec la courbe WLTP de la voiture ; 4) départ et arrivée par géocodage inverse (IGN en France, Photon ailleurs) ;
// 5) péages réellement franchis : tarifés sur le tracé recalé (PTV, cache 7 j) ; Royaume-Uni : Manche retirée, Dartford ajouté.
import { createClient } from "jsr:@supabase/supabase-js@2";
import { CORS, fetchTimeout, json } from "../_shared/http.ts";
import { resumeParPays, type Carburant } from "../_shared/modele.ts";
import { vignettesTraversees } from "../_shared/europe.ts";
import { executerChaine, lireCle, lireMoteur, noterIncident, noterIssue, type Essai } from "../_shared/moteurs.ts";
import { ErreurItineraire, connexionDepuisFournisseur, recalerTrace, type Recalage } from "../_shared/itineraire-europe.ts";
import { ajusterPeagesRoyaumeUni, calculerPeages, identiteDuJeton, type ResPeages } from "../_shared/calcul-peages.ts";
import { SEUIL_KM, attribuerPas, calculRoule, pasDe, pointsPourRecalage, reduireSerie, type PointRoule } from "../_shared/roule.ts";

const MAX_POINTS = 43_200; // 12 h à un point par seconde

const libelleVehicule = (marque: string, modele: string, motorisation: string) =>
  motorisation.toLowerCase().includes(modele.toLowerCase()) ? `${marque} ${motorisation}` : `${marque} ${modele} ${motorisation}`;

function pointsValides(x: unknown): x is PointRoule[] {
  if (!Array.isArray(x) || x.length < 2 || x.length > MAX_POINTS) return false;
  let prec = -Infinity;
  for (const p of x) {
    if (!Array.isArray(p) || p.length !== 4 || !p.every((v) => typeof v === "number" && Number.isFinite(v))) return false;
    if (Math.abs(p[1]) > 90 || Math.abs(p[2]) > 180 || p[0] < prec) return false;
    prec = p[0];
  }
  return true;
}

/** Nom de commune d'une position : IGN (France, Géoplateforme, géocodage inverse) puis Photon (Europe) ; null si aucun. */
async function nomDuLieu(lat: number, lon: number): Promise<string | null> {
  try {
    const r = await fetchTimeout(`https://data.geopf.fr/geocodage/reverse?lon=${lon}&lat=${lat}&index=address&limit=1`, {}, 10000);
    if (r.ok) {
      const j = await r.json();
      const p = j?.features?.[0]?.properties;
      if (p?.city && (p.distance == null || p.distance < 2000)) return p.city as string;
    }
  } catch {
    /* IGN injoignable : Photon */
  }
  try {
    const r = await fetchTimeout(`https://photon.komoot.io/reverse?lat=${lat}&lon=${lon}&lang=fr&limit=1`, {}, 10000);
    if (!r.ok) return null;
    const p = (await r.json())?.features?.[0]?.properties;
    if (!p) return null;
    if (p.osm_key === "place" && ["city", "town", "village"].includes(p.osm_value)) return p.name ?? null;
    return p.city ?? p.name ?? null;
  } catch {
    return null;
  }
}

/** Recalage par le moteur « itineraire » : actif puis secours (Stadia → instance publique) ; IGN n'a pas de recalage. */
async function recaler(// deno-lint-ignore no-explicit-any
  db: any, pts: { lat: number; lon: number; t: number }[]): Promise<{ r: Recalage; fournisseur: string }> {
  const m = await lireMoteur(db, "itineraire");
  const ids = [m.actif, m.secours].filter((x): x is string => !!x && x !== "itineraire-ign");
  const essais: Essai<Recalage>[] = ids.map((f) => ({
    fournisseur: f,
    appel: async () => {
      const { data: ligne } = await db.from("fournisseurs").select("id,url,chemin_route,chemin_trace,pause_ms,cle_requise").eq("id", f).maybeSingle();
      if (!ligne) throw new ErreurItineraire("indisponible", `fournisseur ${f} inconnu`);
      let cle: string | null = null;
      if (ligne.cle_requise) {
        cle = await lireCle(db, f);
        if (!cle) throw new ErreurItineraire("cle_refusee", "clé manquante");
      }
      const reserver = async (nom: string, pauseMs: number) => Number((await db.rpc("limiteur_reserver", { p_nom: nom, p_intervalle_ms: pauseMs })).data ?? 0);
      return await recalerTrace(connexionDepuisFournisseur(ligne, cle, reserver), pts);
    },
  }));
  const s = await executerChaine(essais);
  if (s.echecs.length > 0) await noterIncident(db, "itineraire", `${s.echecs[0].fournisseur} : ${s.echecs[0].message}`);
  if (!s.resultat) {
    if (s.echecs.some((e) => e.message.startsWith("pas_itineraire"))) throw new ErreurItineraire("pas_itineraire");
    throw new ErreurItineraire("indisponible");
  }
  await noterIssue(db, "itineraire", m, s, true);
  return { r: s.resultat, fournisseur: s.fournisseur! };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json(405, { erreur: "methode_non_autorisee" });
  let corps: { points?: unknown; vehicule_id?: unknown };
  try {
    corps = await req.json();
  } catch {
    return json(400, { erreur: "requete_invalide" });
  }
  const { points, vehicule_id } = corps;
  if (!pointsValides(points) || typeof vehicule_id !== "string" || vehicule_id.length === 0) return json(400, { erreur: "requete_invalide" });

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const { data: veh, error: errVeh } = await db
    .from("vehicules")
    .select("id,marque,modele,motorisation,carburant,masse_kg,conso_basse,conso_moyenne,conso_haute,conso_tres_haute")
    .eq("id", vehicule_id)
    .maybeSingle();
  if (errVeh) return json(500, { erreur: "base_indisponible" });
  if (!veh) return json(404, { erreur: "vehicule_inconnu" });
  const modeleVeh = {
    masse_kg: veh.masse_kg,
    carburant: veh.carburant as Carburant,
    conso: { basse: Number(veh.conso_basse), moyenne: Number(veh.conso_moyenne), haute: Number(veh.conso_haute), tres_haute: Number(veh.conso_tres_haute) },
  };

  // 1) pas mesurés ; moins de 1 km : rien n'est calculé
  const pas = pasDe(points);
  if (pas.reduce((s, p) => s + p.d, 0) / 1000 < SEUIL_KM) return json(422, { erreur: "trop_court" });

  // 2) recalage sur la carte
  const { envoyes, versEnvoye } = pointsPourRecalage(points);
  let rec: { r: Recalage; fournisseur: string };
  try {
    rec = await recaler(db, envoyes.map(([t, lat, lon]) => ({ lat, lon, t })));
  } catch (e) {
    if (e instanceof ErreurItineraire && e.code === "pas_itineraire") return json(422, { erreur: "pas_itineraire" });
    return json(502, { erreur: "recalage_indisponible" });
  }

  // 3) calcul sur la vitesse réelle, par route reconnue
  const attribues = attribuerPas(pas, versEnvoye, rec.r.matched, rec.r.aretes, rec.r.admins);
  const r = calculRoule(attribues, modeleVeh);
  if (r.km < SEUIL_KM || r.troncons.length === 0) return json(422, { erreur: "trop_court" });
  const { data: tablePays } = await db.from("pays").select("code,nom,tva");
  const nomsPays: Record<string, string> = {};
  const tva: Record<string, number> = {};
  for (const p of (tablePays ?? []) as { code: string; nom: string; tva: number }[]) {
    nomsPays[p.code] = p.nom;
    tva[p.code] = Number(p.tva);
  }
  const pays = resumeParPays(r.troncons).map((p) => ({ ...p, nom: nomsPays[p.code] ?? p.code }));
  if (pays.length === 1) pays[0].litres = r.litres;

  // 4) départ et arrivée : géocodage inverse du premier et du dernier point
  const premier = points[0];
  const dernier = points[points.length - 1];
  const depart = { lat: premier[1], lon: premier[2] };
  const arrivee = { lat: dernier[1], lon: dernier[2] };
  const [labelDepart, labelArrivee] = await Promise.all([nomDuLieu(depart.lat, depart.lon), nomDuLieu(arrivee.lat, arrivee.lon)]);

  // 5) péages réellement franchis : routes à péage reconnues → tarifées sur le tracé recalé
  const surRoute = rec.r.aretes.filter((a) => a.use !== "ferry" && a.use !== "rail-ferry");
  const aPeage = surRoute.filter((a) => a.toll).reduce((s, a) => s + (a.length ?? 0), 0) > 0.2;
  let peages: ResPeages;
  if (!aPeage) peages = { etat: "ok", fournisseur: null, lignes: [], total: 0 };
  else {
    try {
      peages = await calculerPeages(db, depart, arrivee, tva, identiteDuJeton(req), rec.r.forme.length > 1 ? rec.r.forme : envoyes.map(([, lat, lon]) => ({ lat, lon })));
    } catch {
      peages = { etat: "indisponible", motif: "indisponible", fournisseur: null, lignes: [], total: 0 };
    }
  }
  if (pays.some((p) => p.code === "GB")) peages = await ajusterPeagesRoyaumeUni(db, peages, surRoute.map((a) => a.names));
  const kmAuto: Record<string, number> = {};
  for (const a of surRoute) if (a.road_class === "motorway") {
    const code = rec.r.admins[a.end_node?.admin_index ?? 0]?.country_code ?? "ZZ";
    kmAuto[code] = (kmAuto[code] ?? 0) + (a.length ?? 0);
  }
  const { data: vig } = await db.from("vignettes").select("pays,libelle");
  const vignettes = vignettesTraversees(kmAuto, (vig ?? []) as { pays: string; libelle: string }[]);

  const recales = rec.r.matched.filter((m) => m?.type === "matched").length;
  return json(200, {
    km: r.km,
    duree_min: r.duree_min,
    litres: r.litres,
    l100: r.l100,
    vehicule: { id: veh.id, libelle: libelleVehicule(veh.marque, veh.modele, veh.motorisation), carburant: veh.carburant, masse_kg: veh.masse_kg },
    troncons: r.troncons,
    pays,
    itineraire: { fournisseur: rec.fournisseur, recalage: true },
    peages: { ...peages, vignettes },
    traversee_manche: r.traversee || (pays.some((p) => p.code === "GB") && pays.some((p) => p.code !== "GB" && p.code !== "IE")),
    avertissements: [],
    enregistre: {
      depart: { ...depart, label: labelDepart },
      arrivee: { ...arrivee, label: labelArrivee },
      vitesses: reduireSerie(attribues.filter((p) => p.genre !== "traversee").map((p) => p.v)),
      vitesse_moy: r.vitesse_moy,
      accelerations: r.accelerations,
      arrets: r.arrets,
      duree_s: Math.round(attribues.reduce((s, p) => s + p.dt, 0)),
      points: points.length,
      points_envoyes: envoyes.length,
      points_recales: recales,
    },
  });
});
