import { describe, expect, it } from "vitest";
import { T } from "../../src/lib/textes";
import { cleCachePeages, erreurHttp, finQuotaJour, lignesDepuisPtv } from "../../supabase/functions/_shared/peages";

const nom = (id: string) => ({ ptv: "PTV", here: "HERE" })[id] ?? id;

describe("Quota du jour du fournisseur de péages (audit round 3, HIGH 1)", () => {
  it("403 GENERAL_QUOTA_EXCEEDED = quota du fournisseur, pas une clé refusée", () => {
    const corps = JSON.stringify({ description: "The transaction limit is exceeded.", errorCode: "GENERAL_QUOTA_EXCEEDED", details: { message: "Daily Quota Exceeded" } });
    expect(erreurHttp(403, corps).motif).toBe("quota_fournisseur");
    expect(erreurHttp(403, JSON.stringify({ errorCode: "GENERAL_FORBIDDEN" })).motif).toBe("cle_refusee");
    expect(erreurHttp(401, "").motif).toBe("cle_refusee");
    expect(erreurHttp(429, "").motif).toBe("quota");
    expect(erreurHttp(503, "").motif).toBe("indisponible");
  });
  it("remise à zéro attendue : 00:00 UTC suivant", () => {
    expect(finQuotaJour(new Date("2026-10-20T23:14:26Z")).toISOString()).toBe("2026-10-21T00:00:00.000Z");
    expect(finQuotaJour(new Date("2026-10-21T00:00:00Z")).toISOString()).toBe("2026-10-22T00:00:00.000Z");
  });
  it("phrases : écran Moteurs et écran Résultat, la clé n'est jamais dite refusée", () => {
    const t = T.etatMoteur({ code: "quota_fournisseur", params: { fournisseur: "ptv", jusqua: "2026-10-21T00:00:00.000Z" } }, nom);
    expect(t).toMatch(/^PTV : quota du jour atteint — péages indisponibles jusqu'à \d\d:\d\d$/);
    expect(t).not.toMatch(/refus/i);
    expect(T.incidentCodes.quota_fournisseur).toBe("quota du jour atteint");
  });
});

describe("Cache des péages par tracé", () => {
  const A = { lat: 43.9289, lon: 2.1464 }, B = { lat: 41.3874, lon: 2.1686 };
  it("même fournisseur, départ, arrivée et tracé (à ~100 m près) → même clé ; autre tracé ou autre fournisseur → autre clé", () => {
    const p1 = [{ lat: 43.50012, lon: 1.90004 }], p1bis = [{ lat: 43.50031, lon: 1.90021 }], p2 = [{ lat: 43.6, lon: 1.9 }];
    expect(cleCachePeages("ptv", A, B, p1)).toBe(cleCachePeages("ptv", A, B, p1bis));
    expect(cleCachePeages("ptv", A, B, p1)).not.toBe(cleCachePeages("ptv", A, B, p2));
    expect(cleCachePeages("ptv", A, B, p1)).not.toBe(cleCachePeages("here", A, B, p1));
  });
});

describe("Aucun texte composé par le serveur (audit round 3, MEDIUM 3) ; pluriel (LOW 8) ; champ clé (LOW 4)", () => {
  it("section PTV sans nom : libellé vide (l'écran affiche « Péage »)", () => {
    const l = lignesDepuisPtv({ toll: { sections: [{ costs: [{ price: 10, currency: "EUR" }], countryCode: "FRA" }], systems: [] } }, { FR: 20 });
    expect(l[0].libelle).toBe("");
    expect(T.peageSansNom).toBe("Péage");
    expect(T.peageFourchette).toContain("estimation");
  });
  it("« 1 section », « 2 sections »", () => {
    expect(T.etatMoteur({ code: "ok_peages", params: { sections: 1 } }, nom)).toBe("Connecté · test Montpellier → Barcelone OK (1 section)");
    expect(T.etatMoteur({ code: "ok_peages", params: { sections: 2 } }, nom)).toBe("Connecté · test Montpellier → Barcelone OK (2 sections)");
    expect(T.etatMoteur({ code: "ok_peages", params: { peages: 1 } }, nom)).toBe("Connecté · test Montpellier → Barcelone OK (1 péage)");
  });
  it("texte d'aide du champ clé court (tient à 360 px) ; la pastille n'emprunte jamais la phrase du champ", () => {
    expect(T.cleEnregistree("NDE0")).toBe("Clé ••••NDE0 · coller pour changer");
    expect(T.etatCleRangee).not.toContain("coller");
  });
});
