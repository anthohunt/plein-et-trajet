// P8 (streamline R2) : la carte d'un moteur montre le plus récent du dernier test et du dernier incident.
import { describe, expect, it } from "vitest";
import { etatAffiche } from "../../supabase/functions/_shared/moteurs";

const connecte = { etat: "ok", code: "ok_peages", params: {} };
describe("état affiché d'un moteur", () => {
  it("incident PTV 401 postérieur au dernier test réussi : clé refusée, pas « Connecté »", () => {
    const m = { actif: "ptv", dernier_test: "2026-10-20T19:42:30Z", incident_le: "2026-10-21T06:37:51Z", incident_message: "ptv : cle_refusee (401)", retabli_le: "2026-10-21T00:00:40Z" };
    expect(etatAffiche(m, connecte)).toEqual({ etat: "ko", code: "cle_refusee", params: { fournisseur: "ptv", http: 401 } });
  });
  it("test réussi après l'incident : l'état du test fait foi", () => {
    const m = { actif: "ptv", dernier_test: "2026-10-21T07:00:00Z", incident_le: "2026-10-21T06:37:51Z", incident_message: "ptv : cle_refusee (401)" };
    expect(etatAffiche(m, connecte)).toBe(connecte);
  });
  it("incident résolu depuis (le fournisseur a répondu) : inchangé", () => {
    const m = { actif: "stadia", dernier_test: "2026-10-20T19:42:30Z", incident_le: "2026-10-20T19:42:35Z", incident_message: "stadia : indisponible 400 ", retabli_le: "2026-10-21T01:15:24Z" };
    expect(etatAffiche(m, { etat: "ok", code: "ok_itineraire", params: {} }).etat).toBe("ok");
  });
  it("service injoignable non résolu : « ne répond pas (400) »", () => {
    const m = { actif: "stadia", dernier_test: null, incident_le: "2026-10-20T19:42:35Z", incident_message: "stadia : indisponible 400 " };
    expect(etatAffiche(m, connecte)).toEqual({ etat: "ko", code: "injoignable", params: { fournisseur: "stadia", http: 400 } });
  });
  it("incident d'un autre fournisseur, ou sans rapport avec le fournisseur (aucun itinéraire) : inchangé", () => {
    expect(etatAffiche({ actif: "ptv", incident_le: "2026-10-21T06:00:00Z", incident_message: "here : cle_refusee (401)" }, connecte)).toBe(connecte);
    expect(etatAffiche({ actif: "stadia", incident_le: "2026-10-21T06:00:00Z", incident_message: "stadia : pas_itineraire" }, connecte)).toBe(connecte);
  });
});
