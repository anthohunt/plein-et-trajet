import { describe, expect, it } from "vitest";
import { noterIssue, type Moteur, type SortieChaine } from "../../supabase/functions/_shared/moteurs";

// base factice : enregistre les écritures sur la table moteurs
function baseFactice() {
  const ecritures: Record<string, unknown>[] = [];
  const db = { from: () => ({ update: (v: Record<string, unknown>) => ({ eq: async () => { ecritures.push(v); return {}; } }) }) };
  return { db, ecritures };
}
const incidentOuvert: Moteur = { service: "peages", actif: "ptv", secours: null, incident_le: "2026-10-21T00:47:22Z", retabli_le: "2026-10-21T00:00:40Z" };
const reussite = (bascule: boolean): SortieChaine<unknown> => ({ resultat: [], fournisseur: bascule ? "here" : "ptv", bascule, echecs: [] });

describe("Issue d'une chaîne de fournisseurs (audit round 4, MEDIUM 1)", () => {
  it("servi par le cache : l'incident ouvert n'est PAS marqué rétabli (aucune réponse du fournisseur)", async () => {
    const { db, ecritures } = baseFactice();
    await noterIssue(db, "peages", incidentOuvert, reussite(false), false);
    expect(ecritures).toEqual([]);
  });
  it("vraie réponse du fournisseur actif : l'incident est marqué rétabli", async () => {
    const { db, ecritures } = baseFactice();
    await noterIssue(db, "peages", incidentOuvert, reussite(false), true);
    expect(ecritures).toHaveLength(1);
    expect(Object.keys(ecritures[0])).toEqual(["retabli_le"]);
  });
  it("le secours a répondu (même par le cache) : la bascule est notée, jamais un rétablissement", async () => {
    for (const reponse of [true, false]) {
      const { db, ecritures } = baseFactice();
      await noterIssue(db, "peages", incidentOuvert, reussite(true), reponse);
      expect(ecritures).toHaveLength(1);
      expect(ecritures[0]).toMatchObject({ bascule_de: "ptv", bascule_vers: "here" });
      expect(ecritures[0]).not.toHaveProperty("retabli_le");
    }
  });
  it("chaîne en échec : aucune écriture", async () => {
    const { db, ecritures } = baseFactice();
    await noterIssue(db, "peages", incidentOuvert, { resultat: null, fournisseur: null, bascule: false, echecs: [{ fournisseur: "ptv", message: "cle_refusee" }] }, true);
    expect(ecritures).toEqual([]);
  });
});
