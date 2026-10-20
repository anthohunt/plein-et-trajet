// moteurs — écran Moteurs (S5), RÉSERVÉ À L'ADMINISTRATEUR (claim app_metadata.role = "admin", vérifié côté serveur).
// Entrée : POST { action:"lister" } | { action:"tester", service, fournisseur, cle? } | { action:"enregistrer", service, fournisseur, secours?, cle?, cle_secours? }
// Les clés sont écrites dans Supabase Vault ; aucune réponse ne contient jamais une clé : seulement ses 4 derniers caractères.
// Sortie : 200 { moteurs:[…] } | { etat:"ok"|"ko"|"wait", message } | { enregistre, etat, message, moteurs }  ·  401/403 { erreur }
import { createClient } from "jsr:@supabase/supabase-js@2";
import { CORS, fetchTimeout, json } from "../_shared/http.ts";
import { lireCle } from "../_shared/moteurs.ts";
import { messageErreurPeages, peagesHere, peagesPtv } from "../_shared/peages.ts";
import { routeValhalla, connexionDepuisFournisseur, ErreurItineraire } from "../_shared/itineraire-europe.ts";

const ALBI = { lat: 43.9289, lon: 2.1464 };
const BARCELONE = { lat: 41.3874, lon: 2.1686 };
const TOULOUSE = { lat: 43.6047, lon: 1.4442 };

type Etat = "ok" | "ko" | "wait";
interface Test {
  etat: Etat;
  message: string;
}
const nombreFr = (n: number) => n.toLocaleString("fr-FR");

// deno-lint-ignore no-explicit-any
type Db = any;

async function tester(db: Db, fournisseur: string, cleSaisie: string | null): Promise<Test> {
  const { data: f } = await db.from("fournisseurs").select("id,nom,cle_requise").eq("id", fournisseur).maybeSingle();
  if (!f) return { etat: "ko", message: "Fournisseur inconnu" };
  const nomCourt = String(f.nom).split(/[ ·]/)[0]; // « PTV Developer » → « PTV »
  let cle: string | null = null;
  if (f.cle_requise) {
    cle = cleSaisie || (await lireCle(db, fournisseur));
    if (!cle) return { etat: "ko", message: "Aucune clé : colle-la d'abord" };
  }
  try {
    switch (fournisseur) {
      case "ptv": {
        const { data: p } = await db.from("pays").select("code,tva");
        const tva = Object.fromEntries((p ?? []).map((x: { code: string; tva: number }) => [x.code, Number(x.tva)]));
        const l = await peagesPtv(cle!, ALBI, BARCELONE, tva);
        return { etat: "ok", message: `Connecté · test Albi → Barcelone OK (${l.length} sections)` };
      }
      case "here": {
        const l = await peagesHere(cle!, ALBI, BARCELONE);
        return { etat: "ok", message: `Connecté · test Albi → Barcelone OK (${l.length} péages)` };
      }
      case "stadia":
      case "valhalla-public": {
        const { data: ligne } = await db.from("fournisseurs").select("id,url,chemin_route,chemin_trace,pause_ms").eq("id", fournisseur).maybeSingle();
        const reserver = async (nom: string, pauseMs: number) => Number((await db.rpc("limiteur_reserver", { p_nom: nom, p_intervalle_ms: pauseMs })).data ?? 0);
        const r = await routeValhalla(connexionDepuisFournisseur(ligne, cle, reserver), ALBI, TOULOUSE);
        return { etat: "ok", message: `Connecté · test Albi → Toulouse OK (${Math.round(r.km)} km)` };
      }
      case "itineraire-ign": {
        const r = await fetchTimeout(`https://data.geopf.fr/navigation/itineraire?resource=bdtopo-osrm&start=${ALBI.lon},${ALBI.lat}&end=1.4442,43.6047&profile=car&optimization=fastest&getSteps=false&crs=EPSG:4326`, {}, 20000);
        if (!r.ok) return { etat: "ko", message: `IGN ne répond pas (${r.status})` };
        return { etat: "ok", message: "Connecté · test Albi → Toulouse OK" };
      }
      case "officiel": {
        const fr = await db.from("stations").select("id", { count: "exact", head: true }).eq("pays", "FR");
        const es = await db.from("stations").select("id", { count: "exact", head: true }).eq("pays", "ES");
        return { etat: "ok", message: `Connecté · ${nombreFr(fr.count ?? 0)} stations en France, ${nombreFr(es.count ?? 0)} en Espagne` };
      }
      case "bulletin-ue": {
        const { data } = await db.from("moyennes_nationales").select("jour").eq("source", "bulletin").order("jour", { ascending: false }).limit(1);
        if (!data?.[0]) return { etat: "ko", message: "Aucune moyenne importée pour l'instant" };
        const [a, m, j] = String(data[0].jour).split("-");
        return { etat: "ok", message: `Connecté · semaine du ${j}/${m}/${a}` };
      }
      case "tankerkoenig": {
        const r = await fetchTimeout(`https://creativecommons.tankerkoenig.de/json/list.php?lat=52.52&lng=13.405&rad=4&sort=dist&type=all&apikey=${encodeURIComponent(cle!)}`, {}, 20000);
        const j = await r.json().catch(() => null);
        if (j?.ok === true) return { etat: "ok", message: `Connecté · test Berlin OK (${(j.stations ?? []).length} stations)` };
        if (j && j.ok === false) return { etat: "ko", message: `Clé refusée par ${nomCourt} (${r.status === 200 ? 401 : r.status})` };
        return { etat: "ko", message: `${nomCourt} ne répond pas (${r.status})` };
      }
      case "ademe": {
        const { count } = await db.from("vehicules").select("id", { count: "exact", head: true });
        return { etat: "ok", message: `Connecté · ${nombreFr(count ?? 0)} versions` };
      }
      case "photon": {
        const r = await fetchTimeout("https://photon.komoot.io/api/?q=Albi&limit=1&lang=fr", {}, 15000);
        return r.ok ? { etat: "ok", message: "Connecté · test « Albi » OK" } : { etat: "ko", message: `Photon ne répond pas (${r.status})` };
      }
      case "lieux-ign": {
        const r = await fetchTimeout("https://data.geopf.fr/geocodage/search?q=Albi&limit=1", {}, 15000);
        return r.ok ? { etat: "ok", message: "Connecté · test « Albi » OK" } : { etat: "ko", message: `IGN ne répond pas (${r.status})` };
      }
    }
  } catch (e) {
    if (e instanceof ErreurItineraire) {
      if (e.code === "cle_refusee") return { etat: "ko", message: `Clé refusée par ${nomCourt} (${e.message.split(" ")[1] ?? 401})` };
      return { etat: "ko", message: `${nomCourt} ne répond pas (${e.message.replace(/^indisponible\s*/, "").slice(0, 60) || "erreur"})` };
    }
    return { etat: "ko", message: messageErreurPeages(nomCourt, e) };
  }
  return { etat: "ko", message: "Test non disponible pour ce fournisseur" };
}

async function lister(db: Db) {
  const [{ data: moteurs }, { data: fournisseurs }, { data: cles }] = await Promise.all([
    db.from("moteurs").select("*").order("ordre"),
    db.from("fournisseurs").select("*").order("ordre"),
    db.from("cles_fournisseurs").select("fournisseur,fin,maj"),
  ]);
  const fin: Record<string, string> = Object.fromEntries((cles ?? []).map((c: { fournisseur: string; fin: string }) => [c.fournisseur, c.fin]));
  return (moteurs ?? []).map((m: Record<string, unknown>) => {
    const liste = (fournisseurs ?? []).filter((f: { service: string }) => f.service === m.service);
    const actif = liste.find((f: { id: string }) => f.id === m.actif);
    let etat = m.etat as Etat;
    let message = m.message as string;
    if (actif?.cle_requise && !fin[actif.id]) {
      etat = "wait";
      message = "Clé à coller";
    }
    return {
      service: m.service,
      nom: m.nom,
      description: m.description,
      actif: m.actif,
      secours: m.secours,
      etat,
      message,
      dernier_test: m.dernier_test,
      bascule: m.bascule_le ? { le: m.bascule_le, de: m.bascule_de, vers: m.bascule_vers } : null,
      incident: m.incident_le ? { le: m.incident_le, message: m.incident_message } : null,
      fournisseurs: liste.map((f: { id: string; nom: string; cle_requise: boolean; url_cle: string | null; consigne_cle: string | null }) => ({ id: f.id, nom: f.nom, cle_requise: f.cle_requise, cle_fin: fin[f.id] ?? null, url_cle: f.cle_requise ? f.url_cle : null, consigne_cle: f.cle_requise ? f.consigne_cle : null })),
    };
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json(405, { erreur: "methode_non_autorisee" });

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  // administrateur : le jeton est vérifié auprès d'Auth, le rôle est lu dans app_metadata (que l'utilisateur ne peut pas modifier)
  const jeton = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: u, error: eu } = await db.auth.getUser(jeton);
  if (eu || !u?.user) return json(401, { erreur: "non_connecte" });
  if (u.user.app_metadata?.role !== "admin") return json(403, { erreur: "reserve_a_l_administrateur" });

  let c: { action?: string; service?: string; fournisseur?: string; secours?: string | null; cle?: string; cle_secours?: string };
  try {
    c = await req.json();
  } catch {
    return json(400, { erreur: "requete_invalide" });
  }

  try {
    if (c.action === "lister") return json(200, { moteurs: await lister(db) });

    if (c.action === "tester") {
      if (!c.fournisseur) return json(400, { erreur: "requete_invalide" });
      const t = await tester(db, c.fournisseur, typeof c.cle === "string" && c.cle.trim() ? c.cle.trim() : null);
      return json(200, t);
    }

    if (c.action === "enregistrer") {
      const { service, fournisseur } = c;
      if (!service || !fournisseur) return json(400, { erreur: "requete_invalide" });
      const secours = c.secours ? c.secours : null;
      const { data: m } = await db.from("moteurs").select("*").eq("service", service).maybeSingle();
      const { data: liste } = await db.from("fournisseurs").select("id,nom,cle_requise").eq("service", service);
      const ids = (liste ?? []).map((f: { id: string }) => f.id);
      if (!m || !ids.includes(fournisseur) || (secours && (!ids.includes(secours) || secours === fournisseur))) return json(400, { erreur: "requete_invalide" });

      const cle = typeof c.cle === "string" ? c.cle.trim() : "";
      const cleSecours = typeof c.cle_secours === "string" ? c.cle_secours.trim() : "";
      const nomDe = (id: string) => String((liste ?? []).find((f: { id: string }) => f.id === id)?.nom ?? id).split(/[ ·]/)[0];
      const maintenant = new Date().toISOString();
      const notes: string[] = [];

      // 1) une clé collée est TESTÉE avant d'être écrite : seule une clé qui répond est rangée dans Vault (chiffrée) ;
      //    sinon l'ancienne clé est conservée (une faute de frappe ne coupe jamais un service qui marchait)
      let candidateRefusee: Test | null = null;
      if (cle) {
        const tc = await tester(db, fournisseur, cle);
        if (tc.etat === "ok") await db.rpc("moteur_cle_enregistrer", { p_fournisseur: fournisseur, p_cle: cle });
        else {
          candidateRefusee = tc;
          notes.push(`${tc.message} · clé non enregistrée, ancienne clé conservée`);
        }
      }
      if (cleSecours && secours) {
        const ts = await tester(db, secours, cleSecours);
        if (ts.etat === "ok") await db.rpc("moteur_cle_enregistrer", { p_fournisseur: secours, p_cle: cleSecours });
        else {
          notes.push(`Secours ${nomDe(secours)} : ${ts.message} · clé non enregistrée`);
        }
      }

      // 2) test réel du fournisseur choisi avec sa clé enregistrée : seul un fournisseur qui répond devient actif
      const t = candidateRefusee ? candidateRefusee : await tester(db, fournisseur, null);
      // secours : retenu s'il est différent de l'actif d'après et si sa clé (si elle est requise) est rangée
      const resultatActif = t.etat === "ok" ? fournisseur : m.actif;
      const secoursInfo = secours ? (liste ?? []).find((f: { id: string }) => f.id === secours) : null;
      let secoursRetenu: string | null = null;
      if (secoursInfo && secours !== resultatActif) {
        const { data: cleSec } = await db.from("cles_fournisseurs").select("fin").eq("fournisseur", secours).maybeSingle();
        if (!secoursInfo.cle_requise || cleSec) secoursRetenu = secours;
        else notes.push(`Secours ${nomDe(secours!)} non enregistré : aucune clé valide`);
      }
      if (t.etat === "ok") {
        await db.from("moteurs").update({ actif: fournisseur, secours: secoursRetenu, etat: "ok", message: "Enregistré · utilisé dès le prochain calcul", dernier_test: maintenant, maj: maintenant }).eq("service", service);
        return json(200, { enregistre: true, etat: "ok", message: ["Enregistré · utilisé dès le prochain calcul", ...notes].join(" · "), moteurs: await lister(db) });
      }
      // le fournisseur actif reste celui d'avant (son état reflète ce test s'il est le même) ; le secours est enregistré quand même
      const maj: Record<string, unknown> = { secours: secoursRetenu, dernier_test: maintenant, maj: maintenant };
      if (m.actif === fournisseur) Object.assign(maj, { etat: t.etat, message: t.message });
      await db.from("moteurs").update(maj).eq("service", service);
      const message = [notes.length ? notes.join(" · ") : null, `${t.message} · fournisseur actif inchangé`].filter(Boolean).join(" · ");
      return json(200, { enregistre: false, etat: t.etat, message, moteurs: await lister(db) });
    }
    return json(400, { erreur: "requete_invalide" });
  } catch (e) {
    console.error(JSON.stringify({ moteurs: "erreur", message: String(e) }));
    return json(500, { erreur: "erreur_serveur" });
  }
});
