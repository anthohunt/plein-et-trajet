// Relais du site officiel roumain des prix (Monitorul Prețurilor, Consiliul Concurenței) — données ouvertes, aucune clé, aucun secret.
// Pourquoi : le certificat TLS du site est invalide ; les Edge Functions (Deno) refusent la connexion, Node permet de la tolérer pour
// CETTE seule adresse. Le service ne répond que jusqu'à 5 km de rayon (au-delà : réponse vide) et au plus 50 stations par requête. Le relais ne transmet que lat, lon, buffer (m) et l'identifiant de produit, et renvoie le XML tel quel.
import https from "node:https";

export const config = { maxDuration: 30 };

export default function handler(req, res) {
  const { lat, lon, buffer, id } = req.query ?? {};
  const nombre = (x) => Number.isFinite(Number(x));
  if (req.method !== "GET" || !nombre(lat) || !nombre(lon) || !nombre(buffer) || !/^\d{2}$/.test(String(id))) {
    res.status(400).json({ erreur: "requete_invalide" });
    return;
  }
  const chemin = `/pmonsvc/Gas/GetGasItemsByLatLon?lon=${Number(lon)}&lat=${Number(lat)}&buffer=${Math.min(Number(buffer), 5000)}&CSVGasCatalogProductIds=${id}`;
  const r = https.request({ host: "monitorulpreturilor.info", path: chemin, method: "GET", rejectUnauthorized: false, timeout: 25000, headers: { "User-Agent": "plein-et-trajet/1.0 (+https://plein-et-trajet.vercel.app)" } }, (rep) => {
    const morceaux = [];
    rep.on("data", (c) => morceaux.push(c));
    rep.on("end", () => {
      res.setHeader("Content-Type", "application/xml; charset=utf-8");
      res.setHeader("Cache-Control", "public, s-maxage=300");
      res.status(rep.statusCode === 200 ? 200 : 502).send(Buffer.concat(morceaux));
    });
  });
  r.on("timeout", () => r.destroy(new Error("délai dépassé")));
  r.on("error", (e) => res.status(502).json({ erreur: "source_indisponible", detail: String(e.message) }));
  r.end();
}
