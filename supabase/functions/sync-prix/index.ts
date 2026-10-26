// sync-prix — synchronise le flux instantané officiel des prix des carburants
// Source : data.economie.gouv.fr, jeu « prix-des-carburants-en-france-flux-instantane-v2 » (licence ouverte).
// Planifiée toutes les 10 min par pg_cron + pg_net. Protégée par l'en-tête x-sync-secret.
// Étapes : 1) téléchargement de l'export complet (reprise sur 429/5xx) ; 2) application par lots
// (upsert stations/prix, suppression des carburants disparus) ; 3) recalcul des moyennes nationales ;
// 4) enrichissement progressif nom/enseigne depuis prix-carburants.gouv.fr (fiche officielle du point de vente).
import { createClient } from "jsr:@supabase/supabase-js@2";

const FLUX =
  "https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/prix-des-carburants-en-france-flux-instantane-v2/exports/json" +
  "?select=id,geom,cp,adresse,ville,services_service,horaires_automate_24_24," +
  "gazole_prix,gazole_maj,sp95_prix,sp95_maj,e10_prix,e10_maj,sp98_prix,sp98_maj,e85_prix,e85_maj,gplc_prix,gplc_maj," +
  "carburants_rupture_temporaire,carburants_rupture_definitive";
const FICHE_PDV = "https://www.prix-carburants.gouv.fr/map/recuperer_infos_pdv/";
const LOT = 1000;

async function telecharger(url: string, essais = 4): Promise<Response> {
  let attente = 2000;
  for (let i = 1; ; i++) {
    let r: Response | null = null;
    try {
      r = await fetch(url, { headers: { "User-Agent": "plein-et-trajet/1.0 (+https://github.com/anthohunt/plein-et-trajet)" } });
    } catch (e) {
      if (i >= essais) throw new Error(`réseau: ${e}`);
    }
    if (r && r.ok) return r;
    if (r && !(r.status === 429 || r.status >= 500)) throw new Error(`HTTP ${r.status} sur ${url}`);
    if (i >= essais) throw new Error(`HTTP ${r?.status ?? "réseau"} après ${essais} essais`);
    const ra = Number(r?.headers.get("retry-after"));
    await new Promise((res) => setTimeout(res, Number.isFinite(ra) && ra > 0 ? ra * 1000 : attente));
    attente *= 2;
  }
}

function decoder(s: string): string {
  return s
    .replace(/&#0*39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
    .replace(/\s+/g, " ")
    .trim();
}

export function lireFichePdv(html: string): { nom: string | null; enseigne: string | null } {
  const h3 = html.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i);
  const strong = html.match(/<strong>([\s\S]*?)<\/strong>/i);
  const nom = h3 ? decoder(h3[1]) : "";
  const enseigne = strong ? decoder(strong[1]) : "";
  return { nom: nom || null, enseigne: enseigne || null };
}

Deno.serve(async (req) => {
  const secret = Deno.env.get("SYNC_SECRET");
  if (!secret || req.headers.get("x-sync-secret") !== secret) {
    return new Response(JSON.stringify({ erreur: "non autorisé" }), { status: 401 });
  }
  const url = new URL(req.url);
  const nbEnseignes = Math.min(Number(url.searchParams.get("enseignes") ?? "120") || 0, 600);
  const lat = Number(url.searchParams.get("lat") ?? "46.6");
  const lon = Number(url.searchParams.get("lon") ?? "2.4");
  const seulementEnseignes = url.searchParams.get("seulement") === "enseignes";

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });
  const t0 = Date.now();
  const rapport: Record<string, unknown> = {};
  try {
    if (!seulementEnseignes) {
      const r = await telecharger(FLUX);
      let enregistrements: unknown;
      try {
        enregistrements = await r.json();
      } catch (e) {
        throw new Error(`réponse mal formée: ${e}`);
      }
      if (!Array.isArray(enregistrements) || enregistrements.length === 0) {
        throw new Error("réponse vide du flux officiel : base laissée telle quelle");
      }
      rapport.enregistrements = enregistrements.length;
      let stations = 0;
      for (let i = 0; i < enregistrements.length; i += LOT) {
        const { data, error } = await db.rpc("sync_prix_appliquer", { p_lot: enregistrements.slice(i, i + LOT) });
        if (error) throw new Error(`lot ${i}: ${error.message}`);
        stations += Number(data ?? 0);
      }
      rapport.stations = stations;
      const { data: nbMoy, error: eMoy } = await db.rpc("recalculer_moyennes");
      if (eMoy) throw new Error(`moyennes: ${eMoy.message}`);
      rapport.moyennes = nbMoy;
    }

    if (nbEnseignes > 0) {
      const { data: aFaire, error } = await db.rpc("stations_a_enrichir", { p_lat: lat, p_lon: lon, p_limite: nbEnseignes });
      if (error) throw new Error(`enseignes: ${error.message}`);
      const ids = (aFaire ?? []).map((x: { id: string }) => x.id);
      let ok = 0;
      const parallele = 4;
      for (let i = 0; i < ids.length; i += parallele) {
        if (Date.now() - t0 > 110_000) break; // reste sous la limite d'exécution
        await Promise.all(
          ids.slice(i, i + parallele).map(async (id: string) => {
            let nom: string | null = null;
            let enseigne: string | null = null;
            try {
              const r = await fetch(FICHE_PDV + encodeURIComponent(id), {
                headers: { "User-Agent": "plein-et-trajet/1.0", "X-Requested-With": "XMLHttpRequest" },
              });
              if (r.ok) ({ nom, enseigne } = lireFichePdv(await r.text()));
            } catch (_) {
              /* fiche injoignable : nouvelle tentative dans 7 jours */
            }
            if (nom || enseigne) ok++;
            await db.from("stations").update({ nom, enseigne, enseigne_maj: new Date().toISOString() }).eq("id", id);
          }),
        );
      }
      rapport.enseignes = { demandees: ids.length, trouvees: ok };
    }
    rapport.duree_ms = Date.now() - t0;
    console.log(JSON.stringify({ sync: "ok", ...rapport }));
    return new Response(JSON.stringify({ ok: true, ...rapport }), { headers: { "Content-Type": "application/json" } });
  } catch (e) {
    console.error(JSON.stringify({ sync: "erreur", message: String(e), ...rapport }));
    return new Response(JSON.stringify({ ok: false, erreur: String(e), ...rapport }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }
});
