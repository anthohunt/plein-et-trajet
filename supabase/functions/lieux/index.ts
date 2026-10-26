// lieux — propositions de lieux et pays d'une position, hors de France (moteur « lieux » : Photon ou IGN, lu à chaque appel).
// Entrée : POST { action:"suggerer"|"geocoder", q } | { action:"pays"|"nommer", lat, lon }
// Sortie : 200 { propositions:[{label,lat,lon,contexte,pays}] } | { lieu:{…}|null } | { pays:{code,nom}|null } | { nom:string|null, pays:string|null }
// « nommer » (jalon 5, fin de trajet) : géocodage inverse — IGN (Géoplateforme, index address) en France, Photon /reverse ailleurs.
// Source Photon (komoot) : https://photon.komoot.io — autocomplétion permise, User-Agent identifiant, usage raisonnable.
import { createClient } from "jsr:@supabase/supabase-js@2";
import { CORS, fetchTimeout, json } from "../_shared/http.ts";
import { lireMoteur } from "../_shared/moteurs.ts";
import { pointEnFrance } from "../_shared/europe.ts";

const PHOTON = "https://photon.komoot.io";
const IGN_INVERSE = "https://data.geopf.fr/geocodage/reverse";
const EUROPE = "-25,34,45,72"; // lon min, lat min, lon max, lat max
const norm = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();

interface Feature {
  geometry?: { coordinates?: number[] };
  properties?: { name?: string; countrycode?: string; country?: string; state?: string; type?: string; osm_key?: string; osm_value?: string };
}
interface Prop {
  label: string;
  lat: number;
  lon: number;
  contexte: string;
  pays: string;
}

async function photon(chemin: string): Promise<Feature[]> {
  let r = await fetchTimeout(PHOTON + chemin).catch(() => null);
  if (!r || r.status === 429 || r.status >= 500) {
    await new Promise((x) => setTimeout(x, 500));
    r = await fetchTimeout(PHOTON + chemin);
  }
  if (!r.ok) throw new Error(`photon ${r.status}`);
  const j = await r.json();
  if (!Array.isArray(j?.features)) throw new Error("photon: réponse mal formée");
  return j.features as Feature[];
}

function versProposition(f: Feature): Prop | null {
  const c = f.geometry?.coordinates;
  const p = f.properties;
  if (!c || c.length < 2 || !p?.name || !p.countrycode) return null;
  // jalon 4 (US-3.9) : Photon range Londres (place=city) dans la couche « district » ; on n'en garde que les villes
  if (p.type === "district" && !(p.osm_key === "place" && (p.osm_value === "city" || p.osm_value === "town"))) return null;
  return { label: p.name, lat: c[1], lon: c[0], contexte: [p.state, p.country].filter(Boolean).join(", "), pays: p.countrycode.toUpperCase() };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json(405, { erreur: "methode_non_autorisee" });
  let c: { action?: string; q?: string; lat?: number; lon?: number };
  try {
    c = await req.json();
  } catch {
    return json(400, { erreur: "requete_invalide" });
  }
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  let actif = "photon";
  try {
    actif = (await lireMoteur(db, "lieux")).actif;
  } catch {
    /* registre illisible : Photon par défaut */
  }

  try {
    if (c.action === "pays") {
      if (typeof c.lat !== "number" || typeof c.lon !== "number") return json(400, { erreur: "requete_invalide" });
      let code: string | null = null;
      if (pointEnFrance(c.lat, c.lon)) code = "FR";
      else if (actif === "photon") {
        const f = await photon(`/reverse?lat=${c.lat}&lon=${c.lon}&lang=fr&limit=1`);
        code = f[0]?.properties?.countrycode?.toUpperCase() ?? null;
      }
      if (!code) return json(200, { pays: null });
      const { data } = await db.from("pays").select("code,nom").eq("code", code).maybeSingle();
      return json(200, { pays: data ?? { code, nom: code } });
    }
    if (c.action === "nommer") {
      if (typeof c.lat !== "number" || typeof c.lon !== "number" || Math.abs(c.lat) > 90 || Math.abs(c.lon) > 180) return json(400, { erreur: "requete_invalide" });
      if (pointEnFrance(c.lat, c.lon)) {
        const r = await fetchTimeout(`${IGN_INVERSE}?index=address&lon=${c.lon}&lat=${c.lat}&limit=1`, {}, 8000);
        if (!r.ok) throw new Error(`ign ${r.status}`);
        const j = await r.json();
        const p = j?.features?.[0]?.properties;
        if (p?.city) return json(200, { nom: String(p.city), pays: "FR" });
        // hors de toute adresse (campagne, mer) : Photon prend le relais
      }
      const f = await photon(`/reverse?lat=${c.lat}&lon=${c.lon}&lang=fr&limit=1`);
      const p = f[0]?.properties as (Feature["properties"] & { city?: string; town?: string; village?: string; locality?: string; county?: string }) | undefined;
      const nom = p?.city ?? p?.town ?? p?.village ?? p?.locality ?? p?.name ?? p?.county ?? null;
      return json(200, { nom, pays: p?.countrycode?.toUpperCase() ?? null });
    }
    if (c.action === "suggerer" || c.action === "geocoder") {
      const q = (c.q ?? "").trim();
      if (q.length < 2 || actif !== "photon") return json(200, c.action === "suggerer" ? { propositions: [] } : { lieu: null });
      const f = await photon(`/api/?q=${encodeURIComponent(q)}&lang=fr&limit=10&bbox=${EUROPE}&layer=city&layer=locality&layer=district`);
      // Photon est tolérant (« zzzz » → « zzzzz ») : on ne garde que les noms qui commencent par la saisie, hors France (l'IGN couvre la France)
      const nq = norm(q);
      const props = f.map(versProposition).filter((p): p is Prop => !!p && p.pays !== "FR" && norm(p.label).startsWith(nq));
      if (c.action === "suggerer") return json(200, { propositions: props.slice(0, 4) });
      const exact = props.find((p) => norm(p.label) === nq);
      return json(200, { lieu: exact ?? null });
    }
    return json(400, { erreur: "requete_invalide" });
  } catch (e) {
    return json(502, { erreur: "lieux_indisponible", detail: e instanceof Error ? e.message : String(e) });
  }
});
