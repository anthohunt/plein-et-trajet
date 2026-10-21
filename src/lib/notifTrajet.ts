// Notification du trajet en cours dans l'appli Android (jalon 6) : vitesse, km et coût mis à jour toutes les 2 s, boutons
// Pause / Reprendre et Arrêter (« Reprendre » / « C'est fini » après 10 min immobile). Sans effet dans le navigateur.
import { Capacitor, registerPlugin, type PluginListenerHandle } from "@capacitor/core";
import { enDirect } from "../../supabase/functions/_shared/roule.ts";
import { fmt } from "./calcul";
import { T } from "./textes";
import { enregistreur, type EnCours } from "./plateforme";
import { vehiculeDe } from "./voiture";

interface NotifTrajetPlugin {
  maj(o: ContenuNotification): Promise<void>;
  effacer(): Promise<void>;
  addListener(evt: "action", f: (e: { action: string }) => void): Promise<PluginListenerHandle>;
}
const NotifTrajet = registerPlugin<NotifTrajetPlugin>("NotifTrajet");
const PERIODE_MS = 2000;

/** Ce que montre la notification : tous les textes viennent de textes.ts, libellés des boutons compris (le Java n'a qu'un repli). */
export interface ContenuNotification {
  titre: string;
  texte: string;
  enPause: boolean;
  immobile: boolean;
  reprendre: string;
  cestFini: string;
  pause: string;
  arreter: string;
}

export function contenuNotification(e: EnCours, maintenant: number): ContenuNotification {
  const d = enDirect(e.points, e.pauses, e.debut, maintenant, vehiculeDe(e.voiture), e.enPause);
  const prix = e.prixChoisi ?? e.moyennes[e.voiture.carburant]?.prix ?? null;
  const euros = T.euros(prix == null ? T.vide : fmt(d.litres * prix, 2));
  const immobile = e.immobile != null;
  const titre = immobile ? T.notifImmobile : e.enPause ? T.notifEnPause : d.gpsPerdu ? T.notifGpsPerdu : T.notifEnCours;
  return {
    titre,
    texte: T.notifTexte(d.vitesse, fmt(d.km, 1), euros),
    enPause: e.enPause,
    immobile,
    reprendre: T.reprendre,
    cestFini: T.cestFini,
    pause: T.pause,
    arreter: T.arreterV1,
  };
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
    const c = contenuNotification(etat, maintenant);
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
