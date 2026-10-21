// voiture-eea — version de voiture par le code D.2 de la carte grise, ou par nom/année/puissance (jalon 5, T5.1).
// Entrée : GET ?d2=R 5RBU 5RBU0C | GET ?q=clio 2017 120
// Sortie : 200 { versions:[VersionEea…] } (triées par immatriculations, la plus immatriculée en tête)
//          400 requete_invalide · 404 code_inconnu · 422 electrique · 502 base_injoignable
// Source : base EEA « CO2 cars » (Discodata SQL, sans clé, CC BY 4.0) ; tables lues dans le registre des moteurs (service
// « vehicules », params.tables) à chaque appel. Un code D.2 déjà demandé il y a moins de 180 jours est servi par `versions_eea`.
import { createClient } from "jsr:@supabase/supabase-js@2";
import { UA } from "../_shared/http.ts";
import { agreger, analyserRecherche, normaliserD2, requeteD2, requeteRecherche, tablesPour, urlDiscodata, type LigneEea, type VersionEea } from "../_shared/eea.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};
const json = (statut: number, corps: unknown) => new Response(JSON.stringify(corps), { status: statut, headers: { ...CORS, "Content-Type": "application/json" } });
const CACHE_JOURS = 180;
const DELAI_MS = 10_000;

class Injoignable extends Error {}

/** Une requête Discodata : délai 10 s, une reprise sur 5xx ou coupure. */
async function discodata(base: string, sql: string): Promise<LigneEea[]> {
  for (let essai = 0; essai < 2; essai++) {
    const c = new AbortController();
    const t = setTimeout(() => c.abort(), DELAI_MS);
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
  if (!base || tables.length === 0) return json(502, { erreur: "base_injoignable", detail: "registre" });

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
      const lignes = (await Promise.all(tablesPour(tables, r.annee).map((t) => discodata(base, requeteRecherche(t, r))))).flat();
      // pas de cache pour la recherche : ses immatriculations ne comptent que les lignes dans la fourchette de puissance,
      // et une version gardée seule ferait croire au cache d'un code D.2 qu'il est complet
      const { versions, electriques } = agreger(lignes, { max: 10 });
      if (versions.length === 0) return json(electriques > 0 ? 422 : 404, { erreur: electriques > 0 ? "electrique" : "code_inconnu" });
      return json(200, { versions, source: "eea" });
    }
    return json(400, { erreur: "requete_invalide" });
  } catch (e) {
    if (e instanceof Injoignable) return json(502, { erreur: "base_injoignable", detail: e.message });
    return json(502, { erreur: "base_injoignable", detail: e instanceof Error ? e.message : String(e) });
  }
});
