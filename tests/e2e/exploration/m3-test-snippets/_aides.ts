// Aides des extraits Playwright du jalon 3 (appli déployée, base réelle). Réexporte les aides communes de m3-aides.mjs.
import { expect, test, type Page } from "@playwright/test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
// @ts-ignore — module JS sans types
import * as a from "../m3-aides.mjs";

export const {
  URL_APP, env, rest, session, moyenneDuJour, virgule, nombreFr, nombre, ouvrirTrajets, attendreFormulaire, champ, propositions, saisirLieu,
  choisirDansListe, choisirVoiture, calculer, lireResultat, lignesHistorique, etatFocus, BARCELONE, BRUXELLES, ADMIN_TEST, connecterAdmin, ouvrirMoteurs,
  carte, etatCarte, appelerMoteurs, restService, sqlGestion, reinitialiserMoteurs, injecterCle, trajetEurope, lignesListe,
} = a as any;

export const S4 = (p: Page, etat: string) => p.locator(`[data-screen="S4"][data-etat="${etat}"]`);
export const cout = async (p: Page) => Number(await p.locator('[data-el="cout"] [data-cout]').getAttribute("data-cout"));
export const retourFormulaire = async (p: Page) => {
  await p.locator('[data-el="retour-trajets"]').click();
  await expect(p.locator('[data-screen="S3"]')).toBeVisible();
};
/** Choisit l'option dont le libellé est `label` et le contexte contient `contexte` (propositions IGN ou Photon). */
export async function choisirLieu(p: Page, nom: string, saisie: string, label: string, contexte: string) {
  const c = champ(p, nom);
  await c.click();
  await c.fill("");
  await c.pressSequentially(saisie, { delay: 30 });
  const opt = propositions(p, nom).filter({ hasText: contexte }).filter({ hasText: label }).first();
  await expect(opt).toBeVisible({ timeout: 20000 });
  await opt.click();
  await expect(c).toHaveValue(label);
}
export async function formulaire(p: Page, depart: [string, string, string], arrivee: [string, string, string]) {
  await ouvrirTrajets(p);
  await choisirLieu(p, "depart", ...depart);
  await choisirLieu(p, "arrivee", ...arrivee);
  await choisirVoiture(p);
}
export const ALBI_: [string, string, string] = ["Albi", "Albi", "Tarn"];
export const BORDEAUX: [string, string, string] = ["Bord", "Bordeaux", "Gironde"];
export const CASTRES: [string, string, string] = ["Castr", "Castres", "Tarn"];
export const BARCELONE_: [string, string, string] = ["Barce", "Barcelone", "Espagne"];
export const MILAN: [string, string, string] = ["Milan", "Milan", "Italie"];
export const LAUSANNE: [string, string, string] = ["Lausa", "Lausanne", "Suisse"];
export const TRIESTE: [string, string, string] = ["Tries", "Trieste", "Italie"];
export const BELGRADE: [string, string, string] = ["Belgr", "Belgrade", "Serbie"];

/** Verrou entre fichiers : les histoires qui modifient la table moteurs ne tournent jamais en même temps. */
const VERROU = path.join(os.tmpdir(), "m3-moteurs.lock");
export async function prendreVerrou() {
  for (let i = 0; i < 600; i++) {
    try {
      fs.mkdirSync(VERROU);
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  throw new Error("verrou moteurs indisponible");
}
export const libererVerrou = () => fs.rmSync(VERROU, { recursive: true, force: true });
export function modifieLesMoteurs() {
  test.describe.configure({ mode: "serial" });
  test.beforeAll(async () => {
    await prendreVerrou();
    await reinitialiserMoteurs();
  });
  test.afterAll(async () => {
    await reinitialiserMoteurs();
    libererVerrou();
  });
}
/** Une clé fournisseur valide est-elle enregistrée ? (alors les histoires BLOQUÉ-CLÉ s'exécutent pour de bon) */
export async function cleValideEnregistree(fournisseur: "ptv" | "here") {
  const r = await sqlGestion(`select m.actif from public.moteurs m join public.cles_fournisseurs c on c.fournisseur = m.actif where m.service = 'peages' and m.etat = 'ok' and m.actif = '${fournisseur}'`);
  return Array.isArray(r) && r.length > 0;
}
export { expect, test };
