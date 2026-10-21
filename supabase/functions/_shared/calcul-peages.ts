// Péages d'un tracé (jalons 3-4) : fournisseur actif puis secours, cache par tracé, quotas — partagé par estimer-trajet et trajet-roule.
import type { PointGeo } from "./modele.ts";
import { executerChaine, lireCle, lireMoteur, noterIncident, noterIssue, noterQuotaFournisseur, type Essai } from "./moteurs.ts";
import { ErreurPeages, cleCachePeages, finQuotaJour, peagesHere, peagesPtv, pointsDePassage, totalPeages, type LignePeage } from "./peages.ts";
import { appliquerPeagesRoyaumeUni, type PeageFixe } from "./roule.ts";

/** Péages : fournisseur actif puis secours (table moteurs + Vault) ; l'échec n'empêche jamais le coût carburant.
 *  Tarifés sur LE tracé affiché : points de passage échantillonnés sur ce tracé (pointsDePassage), envoyés à PTV/HERE.
 *  Round 5 (audit round 3, HIGH 1) : réponse mise en cache par tracé (cache_peages, 7 jours) ; un fournisseur dont le quota du jour
 *  est dépassé n'est plus appelé avant sa remise à zéro (fournisseurs.quota_epuise_jusqua) et n'est pas déclaré « clé refusée ». */
export interface ResPeages {
  etat: "ok" | "indisponible";
  motif?: string;
  fournisseur: string | null;
  jusqua?: string; // motif quota_fournisseur : remise à zéro attendue (ISO)
  cache?: boolean; // réponse reprise du cache (aucun appel au fournisseur)
  lignes: LignePeage[];
  total: number;
}
// Limite d'appels de péages : par identité anonyme et globale, par jour UTC (table quota_peages). Au-delà, le calcul continue sans péages.
// Le plafond global est celui du fournisseur actif, en table (fournisseurs.plafond_jour), SOUS son quota réel ; un appel servi par le cache ne compte pas.
const QUOTA_IDENTITE = 60;
const PLAFOND_PAR_DEFAUT = 250;
const CACHE_JOURS = 7;
export function identiteDuJeton(req: Request): string {
  try {
    const jeton = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
    const charge = JSON.parse(atob(jeton.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return typeof charge.sub === "string" && charge.sub ? charge.sub : "sans-session";
  } catch {
    return "sans-session";
  }
}
export async function calculerPeages(// deno-lint-ignore no-explicit-any
  db: any, depart: PointGeo, arrivee: PointGeo, tva: Record<string, number>, identite: string, trace: PointGeo[]): Promise<ResPeages> {
  // V1 (jalon 5, T5.9) : service des péages mis hors service dans le registre → aucun appel au fournisseur (PTV), aucun quota consommé
  const { data: service } = await db.from("moteurs").select("en_service").eq("service", "peages").maybeSingle();
  if (service?.en_service === false) return { etat: "indisponible", motif: "hors_service", fournisseur: null, lignes: [], total: 0 };
  const m = await lireMoteur(db, "peages");
  const passages = pointsDePassage(trace);
  const chaine = [m.actif, m.secours].filter((x): x is string => !!x);
  const { data: infos } = await db.from("fournisseurs").select("id,plafond_jour,quota_epuise_jusqua").in("id", chaine);
  const info = (id: string) => ((infos ?? []) as { id: string; plafond_jour: number | null; quota_epuise_jusqua: string | null }[]).find((x) => x.id === id);

  // 1) quota du fournisseur en cours, cache (même fournisseur, départ, arrivée et tracé, 7 jours)
  const maintenant = new Date();
  const enCours = (f: string) => { const j = info(f)?.quota_epuise_jusqua; return j && new Date(j) > maintenant ? j : null; };
  const depuis = new Date(Date.now() - CACHE_JOURS * 86400e3).toISOString();
  const enCache = async (f: string): Promise<LignePeage[] | null> => {
    const { data: c } = await db.from("cache_peages").select("lignes").eq("cle", cleCachePeages(f, depart, arrivee, passages)).gte("cree_le", depuis).maybeSingle();
    return (c?.lignes as LignePeage[] | undefined) ?? null;
  };

  // 2) fournisseurs : actif puis secours, chacun d'abord par le cache (même fournisseur, départ, arrivée et tracé → réponse réutilisée,
  //    aucun appel ni créneau de quota) ; un quota fournisseur en cours ne déclenche aucun appel ; le plafond du jour de l'appli
  //    (sous le quota du fournisseur actif, en table) n'est réservé qu'au moment d'un vrai appel
  let servi: "cache" | "appel" | null = null;
  let plafondAtteint = false;
  let reserve = false;
  const essais: Essai<LignePeage[]>[] = chaine.map((f) => ({
    fournisseur: f,
    appel: async () => {
      const c = await enCache(f);
      if (c) {
        servi = "cache";
        return c;
      }
      const jusqua = enCours(f);
      if (jusqua) throw new ErreurPeages("quota_fournisseur");
      const cle = await lireCle(db, f);
      if (!cle) throw new ErreurPeages("cle_manquante");
      if (!reserve) {
        const { data: autorise } = await db.rpc("quota_peages_reserver", { p_identite: identite, p_max_identite: QUOTA_IDENTITE, p_max_global: info(m.actif)?.plafond_jour ?? PLAFOND_PAR_DEFAUT });
        if (autorise === false) {
          plafondAtteint = true;
          throw new ErreurPeages("quota");
        }
        reserve = true;
      }
      try {
        servi = "appel";
        if (f === "ptv") return await peagesPtv(cle, depart, arrivee, tva, passages);
        if (f === "here") return await peagesHere(cle, depart, arrivee, passages);
      } catch (e) {
        if (e instanceof ErreurPeages && e.motif === "quota_fournisseur") await noterQuotaFournisseur(db, f, info(f)?.quota_epuise_jusqua ?? null);
        throw e;
      }
      throw new ErreurPeages("aucun_fournisseur");
    },
  }));
  const s = await executerChaine(essais);
  if (plafondAtteint && !s.resultat) return { etat: "indisponible", motif: "quota_atteint", fournisseur: null, lignes: [], total: 0 };
  // un incident déjà noté n'est pas réécrit à chaque calcul tant que le quota du fournisseur actif court
  if (s.echecs.length > 0 && !(s.echecs[0].message.startsWith("quota_fournisseur") && enCours(s.echecs[0].fournisseur))) await noterIncident(db, "peages", `${s.echecs[0].fournisseur} : ${s.echecs[0].message}`);
  if (s.resultat) {
    await noterIssue(db, "peages", m, s, servi === "appel"); // servi par le cache : aucune réponse du fournisseur, l'incident reste ouvert
    if (servi === "cache") return { etat: "ok", fournisseur: s.fournisseur, cache: true, lignes: s.resultat, total: totalPeages(s.resultat) };
    if (info(s.fournisseur!)?.quota_epuise_jusqua) await db.from("fournisseurs").update({ quota_epuise_jusqua: null }).eq("id", s.fournisseur);
    await db.from("cache_peages").upsert({ cle: cleCachePeages(s.fournisseur!, depart, arrivee, passages), fournisseur: s.fournisseur, lignes: s.resultat, cree_le: new Date().toISOString() });
    return { etat: "ok", fournisseur: s.fournisseur, lignes: s.resultat, total: totalPeages(s.resultat) };
  }
  const motif = (s.echecs[0] && /^(cle_manquante|cle_refusee|quota_fournisseur|quota|reponse_invalide|aucun_fournisseur)/.exec(s.echecs[0].message)?.[1]) || "indisponible";
  if (motif === "quota_fournisseur") {
    const { data: f } = await db.from("fournisseurs").select("quota_epuise_jusqua").eq("id", s.echecs[0].fournisseur).maybeSingle();
    return { etat: "indisponible", motif, fournisseur: s.echecs[0].fournisseur, jusqua: f?.quota_epuise_jusqua ? new Date(f.quota_epuise_jusqua).toISOString() : finQuotaJour().toISOString(), lignes: [], total: 0 };
  }
  return { etat: "indisponible", motif, fournisseur: m.actif, lignes: [], total: 0 };
}


/** Royaume-Uni (US-3.9) : traversée de la Manche retirée et signalée ; Dartford Crossing au montant officiel (table peages_fixes),
 *  ajouté s'il est franchi et que le fournisseur l'a omis — règle pure : appliquerPeagesRoyaumeUni (roule.ts, testée par Vitest). */
export async function ajusterPeagesRoyaumeUni(// deno-lint-ignore no-explicit-any
  db: any, p: ResPeages, nomsRoutes: (string[] | undefined)[]): Promise<ResPeages & { manche_retiree?: boolean }> {
  if (p.etat !== "ok") return p;
  const { data: fixes } = await db.from("peages_fixes").select("id,pays,libelle,montant,monnaie,noms");
  const { data: cours } = await db.from("cours_change").select("monnaie,taux");
  const taux: Record<string, number> = {};
  for (const c of (cours ?? []) as { monnaie: string; taux: number }[]) taux[c.monnaie] = Number(c.taux);
  const r = appliquerPeagesRoyaumeUni(p.lignes, (fixes ?? []) as PeageFixe[], nomsRoutes, taux);
  return { ...p, lignes: r.lignes, total: totalPeages(r.lignes), ...(r.mancheRetiree ? { manche_retiree: true } : {}) };
}
