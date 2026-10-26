// Relais du flux officiel espagnol des prix (MITECO) — données ouvertes, aucune clé, aucun secret.
// Pourquoi : le serveur du ministère n'accepte que TLS 1.2 avec échange de clé RSA statique, que les Edge Functions
// Supabase (Deno/rustls) ne savent pas négocier (« Connection reset by peer »). Node (OpenSSL) le sait : ce relais
// renvoie le JSON tel quel à la fonction sync-stations-pays, qui le normalise et l'enregistre.
const SOURCE = "https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/";

export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ erreur: "methode_non_autorisee" });
    return;
  }
  try {
    const r = await fetch(SOURCE, { headers: { "User-Agent": "plein-et-trajet/1.0 (+https://github.com/anthohunt/plein-et-trajet)", Accept: "application/json" }, signal: AbortSignal.timeout(50000) });
    if (!r.ok) {
      res.status(502).json({ erreur: "source_indisponible", http: r.status });
      return;
    }
    const corps = Buffer.from(await r.arrayBuffer());
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "public, s-maxage=300");
    res.status(200).send(corps);
  } catch (e) {
    res.status(502).json({ erreur: "source_indisponible", detail: String(e?.cause?.code || e?.message || e) });
  }
}
