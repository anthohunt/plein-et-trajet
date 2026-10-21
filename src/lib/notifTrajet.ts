// Notification du trajet en cours dans l'appli Android (jalon 6) : vitesse, km et coût mis à jour toutes les 2 s, boutons
// Pause / Reprendre et Arrêter (« Reprendre » / « C'est fini » après 10 min immobile). Sans effet dans le navigateur.
import { Capacitor, registerPlugin, type PluginListenerHandle } from "@capacitor/core";
import { enDirect } from "../../supabase/functions/_shared/roule.ts";
import { fmt } from "./calcul";
import { enregistreur, type EnCours } from "./plateforme";
import { vehiculeDe } from "./voiture";

interface NotifTrajetPlugin {
  maj(o: { titre: string; texte: string; enPause: boolean; immobile: boolean }): Promise<void>;
  effacer(): Promise<void>;
  addListener(evt: "action", f: (e: { action: string }) => void): Promise<PluginListenerHandle>;
}
const NotifTrajet = registerPlugin<NotifTrajetPlugin>("NotifTrajet");
const PERIODE_MS = 2000;

function contenu(e: EnCours, maintenant: number) {
  const d = enDirect(e.points, e.pauses, e.debut, maintenant, vehiculeDe(e.voiture), e.enPause);
  const prix = e.prixChoisi ?? e.moyennes[e.voiture.carburant]?.prix ?? null;
  const euros = prix == null ? "— €" : `${fmt(d.litres * prix, 2)} €`;
  const immobile = e.immobile != null;
  const titre = immobile ? "Immobile depuis 10 min : c'est fini ?" : e.enPause ? "Trajet en pause" : d.gpsPerdu ? "Trajet en cours · GPS perdu" : "Trajet en cours";
  return { titre, texte: `${d.vitesse} km/h · ${fmt(d.km, 1)} km · ${euros}`, enPause: e.enPause, immobile };
}

/** Branche la notification sur l'enregistreur ; `arreter` ouvre la fin de trajet. Renvoie de quoi débrancher. */
export function brancherNotification(arreter: () => void): () => void {
  if (!Capacitor.isNativePlatform()) return () => undefined;
  const rec = enregistreur();
  let dernier = 0;
  let affichee = false;
  let cle = "";
  const maj = () => {
    const { etat, maintenant } = rec.instantane();
    if (!etat) {
      if (affichee) NotifTrajet.effacer().catch(() => undefined);
      affichee = false;
      return;
    }
    const c = contenu(etat, maintenant);
    const nouvelleCle = `${c.enPause}|${c.immobile}`;
    // l'état (pause, immobile) part tout de suite ; les chiffres au plus toutes les 2 s
    if (nouvelleCle === cle && maintenant - dernier < PERIODE_MS) return;
    cle = nouvelleCle;
    dernier = maintenant;
    affichee = true;
    NotifTrajet.maj(c).catch(() => undefined);
  };
  const desabonner = rec.abonner(maj);
  const ecoute = NotifTrajet.addListener("action", ({ action }) => {
    if (action === "pause") rec.pause();
    else if (action === "reprendre") rec.reprendre();
    else if (action === "reprendre-immobile") rec.reprendreApresImmobile();
    else if (action === "arreter") arreter();
  });
  return () => {
    desabonner();
    ecoute.then((h) => h.remove()).catch(() => undefined);
  };
}
