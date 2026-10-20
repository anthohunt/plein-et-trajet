// moteurs — écran Moteurs (S5), RÉSERVÉ À L'ADMINISTRATEUR (claim app_metadata.role = "admin", vérifié côté serveur).
// Entrée : POST { action:"lister" } | { action:"tester", service, fournisseur, cle? } | { action:"enregistrer", service, fournisseur, secours?, cle?, cle_secours? }
// Les clés sont écrites dans Supabase Vault ; aucune réponse ne contient jamais une clé : seulement ses 4 derniers caractères.
// AUCUN TEXTE VISIBLE ICI (audit round 2, HIGH 2) : chaque état est un CODE et ses paramètres ; l'écran compose la phrase (src/lib/textes.ts, T.etatMoteur).
// Sortie : 200 { moteurs:[…] } | { etat:"ok"|"ko"|"wait", code, params } | { enregistre, etat, code, params, notes:[{code, params?}], moteurs }  ·  401/403 { erreur }
import { createClient } from "jsr:@supabase/supabase-js@2";
import { CORS, fetchTimeout, json } from "../_shared/http.ts";
import { lireCle } from "../_shared/moteurs.ts";
import { ErreurPeages, peagesHere, peagesPtv } from "../_shared/peages.ts";
import { routeValhalla, connexionDepuisFournisseur, ErreurItineraire } from "../_shared/itineraire-europe.ts";

const ALBI = { lat: 43.9289, lon: 2.1464 };
const BARCELONE = { lat: 41.3874, lon: 2.1686 };
const TOULOUSE = { lat: 43.6047, lon: 1.4442 };

type Etat = "ok" | "ko" | "wait";
/** Codes d'état (liste close, partagée avec src/lib/moteurs.ts) ; `params` ne porte que des nombres, des dates et des identifiants de fournisseur. */
type Code =
  | "ok_peages" | "ok_itineraire" | "ok_stations" | "ok_moyennes" | "ok_berlin" | "ok_voitures" | "ok_lieux"
  | "aucune_moyenne" | "cle_manquante" | "cle_refusee" | "quota" | "reponse_illisible" | "injoignable" | "test_indisponible" | "fournisseur_inconnu"
  | "enregistre" | "cle_a_coller" | "pret_sans_cle";
type Params = Record<string, string | number>;
interface Test {
  etat: Etat;
  code: Code;
  params: Params;
}
const ok = (code: Code, params: Params = {}): Test => ({ etat: "ok", code, params });
const ko = (code: Code, params: Params = {}): Test => ({ etat: "ko", code, params });
/** Premier code HTTP (3 chiffres) d'un détail d'erreur, sinon rien. */
const httpDe = (detail: string): Params => {
  const m = /\b([1-5]\d\d)\b/.exec(detail);
  return m ? { http: Number(m[1]) } : {};
};

// deno-lint-ignore no-explicit-any
type Db = any;

async function tester(db: Db, fournisseur: string, cleSaisie: string | null): Promise<Test> {
  const { data: f } = await db.from("fournisseurs").select("id,nom,cle_requise").eq("id", fournisseur).maybeSingle();
  if (!f) return ko("fournisseur_inconnu");
  const de = { fournisseur };
  let cle: string | null = null;
  if (f.cle_requise) {
    cle = cleSaisie || (await lireCle(db, fournisseur));
    if (!cle) return ko("cle_manquante", de);
  }
  try {
    switch (fournisseur) {
      case "ptv": {
        const { data: p } = await db.from("pays").select("code,tva");
        const tva = Object.fromEntries((p ?? []).map((x: { code: string; tva: number }) => [x.code, Number(x.tva)]));
        const l = await peagesPtv(cle!, ALBI, BARCELONE, tva);
        return ok("ok_peages", { sections: l.length });
      }
      case "here": {
        const l = await peagesHere(cle!, ALBI, BARCELONE);
        return ok("ok_peages", { peages: l.length });
      }
      case "stadia":
      case "valhalla-public": {
        const { data: ligne } = await db.from("fournisseurs").select("id,url,chemin_route,chemin_trace,pause_ms").eq("id", fournisseur).maybeSingle();
        const reserver = async (nom: string, pauseMs: number) => Number((await db.rpc("limiteur_reserver", { p_nom: nom, p_intervalle_ms: pauseMs })).data ?? 0);
        const r = await routeValhalla(connexionDepuisFournisseur(ligne, cle, reserver), ALBI, TOULOUSE);
        return ok("ok_itineraire", { km: Math.round(r.km) });
      }
      case "itineraire-ign": {
        const r = await fetchTimeout(`https://data.geopf.fr/navigation/itineraire?resource=bdtopo-osrm&start=${ALBI.lon},${ALBI.lat}&end=1.4442,43.6047&profile=car&optimization=fastest&getSteps=false&crs=EPSG:4326`, {}, 20000);
        if (!r.ok) return ko("injoignable", { ...de, http: r.status });
        return ok("ok_itineraire");
      }
      case "officiel": {
        const fr = await db.from("stations").select("id", { count: "exact", head: true }).eq("pays", "FR");
        const es = await db.from("stations").select("id", { count: "exact", head: true }).eq("pays", "ES");
        return ok("ok_stations", { fr: fr.count ?? 0, es: es.count ?? 0 });
      }
      case "bulletin-ue": {
        const { data } = await db.from("moyennes_nationales").select("jour").eq("source", "bulletin").order("jour", { ascending: false }).limit(1);
        if (!data?.[0]) return ko("aucune_moyenne");
        return ok("ok_moyennes", { jour: String(data[0].jour) });
      }
      case "tankerkoenig": {
        const r = await fetchTimeout(`https://creativecommons.tankerkoenig.de/json/list.php?lat=52.52&lng=13.405&rad=4&sort=dist&type=all&apikey=${encodeURIComponent(cle!)}`, {}, 20000);
        const j = await r.json().catch(() => null);
        if (j?.ok === true) return ok("ok_berlin", { stations: (j.stations ?? []).length });
        if (j && j.ok === false) return ko("cle_refusee", { ...de, http: r.status === 200 ? 401 : r.status });
        return ko("injoignable", { ...de, http: r.status });
      }
      case "ademe": {
        const { count } = await db.from("vehicules").select("id", { count: "exact", head: true });
        return ok("ok_voitures", { versions: count ?? 0 });
      }
      case "photon":
      case "lieux-ign": {
        const url = fournisseur === "photon" ? "https://photon.komoot.io/api/?q=Albi&limit=1&lang=fr" : "https://data.geopf.fr/geocodage/search?q=Albi&limit=1";
        const r = await fetchTimeout(url, {}, 15000);
        return r.ok ? ok("ok_lieux") : ko("injoignable", { ...de, http: r.status });
      }
    }
  } catch (e) {
    if (e instanceof ErreurItineraire) {
      if (e.code === "cle_refusee") return ko("cle_refusee", { ...de, http: 401, ...httpDe(e.message) });
      return ko("injoignable", { ...de, ...httpDe(e.message) });
    }
    if (e instanceof ErreurPeages) {
      const http: Params = e.http ? { http: e.http } : {};
      if (e.motif === "cle_refusee") return ko("cle_refusee", { ...de, http: e.http ?? 401 });
      if (e.motif === "quota") return ko("quota", { ...de, http: e.http ?? 429 });
      if (e.motif === "cle_manquante") return ko("cle_manquante", de);
      if (e.motif === "reponse_invalide") return ko("reponse_illisible", de);
      return ko("injoignable", { ...de, ...http });
    }
    return ko("injoignable", de);
  }
  return ko("test_indisponible");
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
    let code = (m.code as Code) ?? "pret_sans_cle";
    let params = (m.params as Params) ?? {};
    if (actif?.cle_requise && !fin[actif.id]) {
      etat = "wait";
      code = "cle_a_coller";
      params = {};
    }
    return {
      service: m.service,
      nom: m.nom,
      description: m.description,
      actif: m.actif,
      secours: m.secours,
      etat,
      code,
      params,
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
      const maintenant = new Date().toISOString();
      // notes jointes au résultat (codes) ; le résultat principal n'est jamais répété dans une note (audit round 2, LOW 8)
      const notes: { code: string; params?: Params }[] = [];

      // 1) une clé collée est TESTÉE avant d'être écrite : seule une clé qui répond est rangée dans Vault (chiffrée) ;
      //    sinon l'ancienne clé est conservée (une faute de frappe ne coupe jamais un service qui marchait)
      let candidateRefusee: Test | null = null;
      if (cle) {
        const tc = await tester(db, fournisseur, cle);
        if (tc.etat === "ok") await db.rpc("moteur_cle_enregistrer", { p_fournisseur: fournisseur, p_cle: cle });
        else {
          candidateRefusee = tc;
          notes.push({ code: "cle_non_enregistree" });
        }
      }
      if (cleSecours && secours) {
        const ts = await tester(db, secours, cleSecours);
        if (ts.etat === "ok") await db.rpc("moteur_cle_enregistrer", { p_fournisseur: secours, p_cle: cleSecours });
        else notes.push({ code: "secours_cle_refusee", params: { secours, test: ts.code, ...ts.params } });
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
        else notes.push({ code: "secours_sans_cle", params: { secours: secours! } });
      }
      if (t.etat === "ok") {
        await db.from("moteurs").update({ actif: fournisseur, secours: secoursRetenu, etat: "ok", code: "enregistre", params: {}, dernier_test: maintenant, maj: maintenant }).eq("service", service);
        return json(200, { enregistre: true, etat: "ok", code: "enregistre", params: {}, notes, moteurs: await lister(db) });
      }
      // le fournisseur actif reste celui d'avant (son état reflète ce test s'il est le même) ; le secours est enregistré quand même
      const maj: Record<string, unknown> = { secours: secoursRetenu, dernier_test: maintenant, maj: maintenant };
      if (m.actif === fournisseur) Object.assign(maj, { etat: t.etat, code: t.code, params: t.params });
      await db.from("moteurs").update(maj).eq("service", service);
      notes.push({ code: "actif_inchange" });
      return json(200, { enregistre: false, etat: t.etat, code: t.code, params: t.params, notes, moteurs: await lister(db) });
    }
    return json(400, { erreur: "requete_invalide" });
  } catch (e) {
    console.error(JSON.stringify({ moteurs: "erreur", message: String(e) }));
    return json(500, { erreur: "erreur_serveur" });
  }
});
