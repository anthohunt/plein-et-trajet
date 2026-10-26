// sync-moyennes-ue — prix moyens TTC par pays, depuis le Bulletin pétrolier hebdomadaire de la Commission européenne
// (xlsx, CC BY 4.0, https://energy.ec.europa.eu/data-and-analysis/weekly-oil-bulletin_en). Planifiée chaque jour (idempotent) ;
// protégée par x-sync-secret. Écrit moyennes_nationales (source « bulletin », ou « estime » pour SP98/E85) ; « EU » = moyenne UE.
import { createClient } from "jsr:@supabase/supabase-js@2";
import { unzipSync, strFromU8 } from "npm:fflate@0.8.2";
import { fetchTimeout, json } from "../_shared/http.ts";
import { estimes, lireBulletin } from "../_shared/bulletin.ts";

const URL_XLSX = "https://energy.ec.europa.eu/document/download/906e60ca-8b6a-44e7-8589-652854d2fd3f_en?filename=Weekly_Oil_Bulletin_Prices_History_maticni_4web.xlsx";

Deno.serve(async (req) => {
  const secret = Deno.env.get("SYNC_SECRET");
  if (!secret || req.headers.get("x-sync-secret") !== secret) return json(401, { erreur: "non autorisé" });
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  try {
    let r: Response | null = null;
    for (let i = 1; i <= 3 && !r?.ok; i++) {
      r = await fetchTimeout(URL_XLSX, {}, 60000).catch(() => null);
      if (!r?.ok && i < 3) await new Promise((x) => setTimeout(x, 2000 * i));
    }
    if (!r?.ok) throw new Error(`Bulletin HTTP ${r?.status ?? "réseau"}`);
    const zip = new Uint8Array(await r.arrayBuffer());
    // premier onglet = « Prices with taxes » (vérifié via workbook.xml)
    const brut = unzipSync(zip, { filter: (f) => ["xl/workbook.xml", "xl/_rels/workbook.xml.rels", "xl/sharedStrings.xml", "xl/worksheets/sheet1.xml"].includes(f.name) });
    const classeur = strFromU8(brut["xl/workbook.xml"]);
    const rels = strFromU8(brut["xl/_rels/workbook.xml.rels"]);
    const rid = /<sheet name="Prices with taxes"[^>]*r:id="([^"]+)"/.exec(classeur)?.[1];
    const cible = rid && new RegExp(`<Relationship[^>]*Id="${rid}"[^>]*Target="([^"]+)"|<Relationship[^>]*Target="([^"]+)"[^>]*Id="${rid}"`).exec(rels);
    const chemin = cible ? "xl/" + (cible[1] ?? cible[2]).replace(/^\/?(xl\/)?/, "") : "";
    if (chemin !== "xl/worksheets/sheet1.xml") throw new Error(`onglet « Prices with taxes » inattendu (${chemin || "introuvable"})`);
    const partage = [...strFromU8(brut["xl/sharedStrings.xml"]).matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => m[1].replace(/<[^>]+>/g, "").replace(/&gt;/g, ">").replace(/&lt;/g, "<").replace(/&amp;/g, "&"));
    const feuille = strFromU8(brut["xl/worksheets/sheet1.xml"]);
    const bulletin = lireBulletin(feuille.slice(0, 600_000), partage);

    // écart France (flux du jour) pour estimer SP98 et E85 à l'étranger
    const { data: fr } = await db.rpc("moyennes_par_pays", { p_carburant: "SP95" });
    const { data: fr98 } = await db.rpc("moyennes_par_pays", { p_carburant: "SP98" });
    const { data: fr85 } = await db.rpc("moyennes_par_pays", { p_carburant: "E85" });
    // deno-lint-ignore no-explicit-any
    const prixFr = (d: any) => Number((d ?? []).find((x: any) => x.pays === "FR")?.prix_moyen);
    const rapport98 = prixFr(fr98) / prixFr(fr);
    const rapport85 = prixFr(fr85) / prixFr(fr);
    const lignes = [
      ...bulletin.prix.map((p) => ({ ...p, source: "bulletin" })),
      ...(Number.isFinite(rapport98) && Number.isFinite(rapport85) ? estimes(bulletin, { SP98: rapport98, E85: rapport85 }).map((p) => ({ ...p, source: "estime" })) : []),
    ].map((p) => ({ jour: bulletin.semaine, carburant: p.carburant, pays: p.pays, source: p.source, prix_moyen: p.prix, nb_stations: 0 }));
    const { error } = await db.from("moyennes_nationales").upsert(lignes, { onConflict: "jour,carburant,pays" });
    if (error) throw new Error(`écriture: ${error.message}`);
    const rapport = { ok: true, semaine: bulletin.semaine, lignes: lignes.length, pays: new Set(lignes.map((l) => l.pays)).size };
    console.log(JSON.stringify({ sync_ue: "ok", ...rapport }));
    return json(200, rapport);
  } catch (e) {
    console.error(JSON.stringify({ sync_ue: "erreur", message: String(e) }));
    return json(502, { ok: false, erreur: String(e) });
  }
});
