// voiture-eea — version de voiture par le code D.2 de la carte grise, ou par nom/année/puissance (jalon 5, T5.1).
// Entrée : GET ?d2=R 5RBU 5RBU0C | GET ?q=clio 2017 120
// Sortie : 200 { versions:[VersionEea…] } (triées par immatriculations, la plus immatriculée en tête)
//          400 requete_invalide · 404 code_inconnu · 422 electrique · 503 base_injoignable
// Source : base EEA « CO2 cars » (Discodata SQL, sans clé, CC BY 4.0) ; tables lues dans le registre des moteurs (service
// « vehicules », params.tables) à chaque appel. Un code D.2 déjà demandé il y a moins de 180 jours est servi par `versions_eea`.
import { createClient } from "jsr:@supabase/supabase-js@2";
import { UA } from "../_shared/http.ts";
import { agreger, analyserRecherche, normaliserD2, requeteD2, requetesRecherche, tablesPour, urlDiscodata, type LigneEea, type VersionEea } from "../_shared/eea.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};
const json = (statut: number, corps: unknown) => new Response(JSON.stringify(corps), { status: statut, headers: { ...CORS, "Content-Type": "application/json" } });
const CACHE_JOURS = 180;
// durcissement r1 (D8) : une requête Discodata a 7 s, une reprise seulement si le budget total de 11 s le permet (avant : 10 s × 2 essais
// par table = 20 s puis un 502)
const DELAI_MS = 7_000;
const BUDGET_MS = 11_000;
// cache des recherches par nom (par requête normalisée, 24 h) : en mémoire de l'instance (200 entrées) ET dans la table recherches_eea
const CACHE_RECHERCHE_MS = 24 * 3600 * 1000;
const CACHE_RECHERCHE_MAX = 200;
const cacheRecherche = new Map<string, { t: number; versions: VersionEea[] }>();
const cleRecherche = (r: { mots: string[]; annee: number | null; kwMin: number | null; kwMax: number | null }) => JSON.stringify([[...r.mots].sort(), r.annee, r.kwMin, r.kwMax]);

class Injoignable extends Error {}

/** Une requête Discodata : délai 7 s, une reprise sur 5xx ou coupure si le budget de 11 s le permet. */
async function discodata(base: string, sql: string): Promise<LigneEea[]> {
  const debut = Date.now();
  for (let essai = 0; essai < 2; essai++) {
    const reste = BUDGET_MS - (Date.now() - debut);
    if (reste < 2_000) break;
    const c = new AbortController();
    const t = setTimeout(() => c.abort(), Math.min(DELAI_MS, reste));
    try {
      const r = await fetch(urlDiscodata(base, sql), { signal: c.signal, headers: { "User-Agent": UA, Accept: "application/json" } });
      if (r.status >= 500) {
        if (essai === 0) continue;
        throw new Injoignable(`discodata ${r.status}`);
      }
      if (!r.ok) throw new Injoignable(`discodata ${r.status}`);
      const j = await r.json();
      if (!Array.isArray(j?.results)) throw new Injoignable("discodata: réponse mal formée");
      return j.results as LigneEea[];
    } catch (e) {
      if (e instanceof Injoignable) throw e;
      if (essai === 1) throw new Injoignable(e instanceof Error ? e.message : String(e));
    } finally {
      clearTimeout(t);
    }
  }
  throw new Injoignable("discodata");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "GET") return json(405, { erreur: "methode_non_autorisee" });
  const url = new URL(req.url);
  const d2Brut = url.searchParams.get("d2");
  const qBrut = url.searchParams.get("q");
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

  // registre : fournisseur et tables ; un aléa de lecture de la base est réessayé une fois (round 2 : un 502 « registre » isolé
  // devenait « la base européenne ne répond pas »)
  const lireRegistre = async () => {
    const m = await db.from("moteurs").select("actif,params").eq("service", "vehicules").maybeSingle();
    const f = m.data ? await db.from("fournisseurs").select("id,url").eq("id", m.data.actif).maybeSingle() : { data: null, error: null };
    return { moteur: m.data, fournisseur: f.data, erreur: m.error ?? f.error };
  };
  let registre = await lireRegistre();
  if (registre.erreur || !registre.moteur || !registre.fournisseur) registre = await lireRegistre();
  const { moteur, fournisseur } = registre;
  const tables: string[] = Array.isArray(moteur?.params?.tables) ? moteur.params.tables.filter((t: unknown) => typeof t === "string") : [];
  const base = typeof fournisseur?.url === "string" && fournisseur.url.startsWith("https://") ? fournisseur.url : null;
  if (!base || tables.length === 0) return json(503, { erreur: "base_injoignable", detail: "registre" });

  try {
    if (d2Brut != null) {
      const code = normaliserD2(d2Brut);
      if (!code) return json(400, { erreur: "requete_invalide" });
      // cache : versions de ce code demandées il y a moins de 180 jours
      let cache = db.from("versions_eea").select("*").eq("ve", code.ve).gte("maj", new Date(Date.now() - CACHE_JOURS * 864e5).toISOString());
      if (code.t) cache = cache.eq("t", code.t);
      if (code.va) cache = cache.eq("va", code.va);
      const { data: enCache } = await cache;
      if (enCache && enCache.length > 0) {
        const versions = (enCache as VersionEea[]).sort((a, b) => b.immatriculations - a.immatriculations);
        return json(200, { versions, source: "cache" });
      }
      const lignes = (await Promise.all(tablesPour(tables, null).map((t) => discodata(base, requeteD2(t, code))))).flat();
      const { versions, electriques } = agreger(lignes, { bruit: true });
      if (versions.length === 0) return json(electriques > 0 ? 422 : 404, { erreur: electriques > 0 ? "electrique" : "code_inconnu" });
      const maj = new Date().toISOString();
      await db.from("versions_eea").upsert(versions.map((v) => ({ ...v, maj })), { onConflict: "cle" });
      return json(200, { versions, source: "eea" });
    }
    if (qBrut != null) {
      const r = analyserRecherche(qBrut);
      if (!r) return json(400, { erreur: "requete_invalide" });
      const cle = cleRecherche(r);
      const gardee = cacheRecherche.get(cle);
      if (gardee && Date.now() - gardee.t < CACHE_RECHERCHE_MS) return json(200, { versions: gardee.versions, source: "cache" });
      // cache durable (table recherches_eea), partagé entre les instances de la fonction
      const { data: enBase } = await db.from("recherches_eea").select("versions,maj").eq("cle", cle).gte("maj", new Date(Date.now() - CACHE_RECHERCHE_MS).toISOString()).maybeSingle();
      if (enBase && Array.isArray(enBase.versions) && enBase.versions.length > 0) {
        cacheRecherche.set(cle, { t: Date.now(), versions: enBase.versions as VersionEea[] });
        return json(200, { versions: enBase.versions, source: "cache" });
      }
      // pas de cache SQL (table versions_eea) pour la recherche : ses immatriculations ne comptent que les lignes dans la fourchette de
      // puissance, et une version gardée seule ferait croire au cache d'un code D.2 qu'il est complet ; le cache en mémoire garde le résultat tel quel
      const essais = await Promise.allSettled(tablesPour(tables, r.annee).flatMap((t) => requetesRecherche(t, r).map((sql) => discodata(base, sql))));
      // une ligne peut sortir de plusieurs requêtes (modèle et marque) : dédoublonnée avant l'agrégation
      const vues = new Set<string>();
      const lignes = essais.flatMap((x) => (x.status === "fulfilled" ? x.value : [])).filter((l) => {
        const k = JSON.stringify(l);
        return vues.has(k) ? false : (vues.add(k), true);
      });
      const toutes = essais.every((x) => x.status === "fulfilled");
      // une table qui ne répond pas ne bloque plus les autres ; si aucune ne répond : message clair (503), pas de 502
      if (essais.length > 0 && !essais.some((x) => x.status === "fulfilled")) return json(503, { erreur: "base_injoignable", message: "La base européenne des voitures est lente à répondre, réessayez dans un instant." });
      const { versions, electriques } = agreger(lignes, { max: 10 });
      if (versions.length === 0) return toutes ? json(electriques > 0 ? 422 : 404, { erreur: electriques > 0 ? "electrique" : "code_inconnu" }) : json(503, { erreur: "base_injoignable", message: "Réponse incomplète de la base européenne, réessayez dans un instant." });
      if (toutes) {
        if (cacheRecherche.size >= CACHE_RECHERCHE_MAX) cacheRecherche.delete(cacheRecherche.keys().next().value as string);
        cacheRecherche.set(cle, { t: Date.now(), versions });
        await db.from("recherches_eea").upsert({ cle, versions, maj: new Date().toISOString() }, { onConflict: "cle" });
      }
      return json(200, { versions, source: "eea" });
    }
    return json(400, { erreur: "requete_invalide" });
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    return json(503, { erreur: "base_injoignable", message: "La base européenne des voitures ne répond pas, réessayez dans un instant.", detail });
  }
});
