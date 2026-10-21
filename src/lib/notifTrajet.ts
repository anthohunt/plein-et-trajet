// Notification du trajet en cours dans l'appli Android (jalon 6) : vitesse, km et coût mis à jour toutes les 2 s, boutons
// Pause / Reprendre et Arrêter (« Reprendre » / « C'est fini » après 10 min immobile). Le service natif (TrajetService.java) la
// tient et traite Pause / Reprendre lui-même ; la page lui envoie le contenu. Sans effet dans le navigateur.
import { Capacitor } from "@capacitor/core";
import { enDirect, litresPas, type VehiculeRoule } from "../../supabase/functions/_shared/roule.ts";
import { fmt } from "./calcul";
import { T } from "./textes";
import { enregistreur, type EnCours } from "./plateforme";
import { vehiculeDe } from "./voiture";
import { TrajetEnRoute, type ContenuNotification } from "./trajetEnRoute";

export type { ContenuNotification };
const PERIODE_MS = 2000;

/** L/100 km de la voiture à vitesse stable, de 0 à 200 km/h, km/h par km/h : ce que roule.ts compte pour un pas sans accélération.
 *  Au km/h près : par tranches de 10, 104,9 km/h tombait sur la tranche de 100 et passait la phase WLTP « haute » au lieu de
 *  « très haute » (run 39690690299 : € du direct natif 8 % sous ceux de la page). */
export function tableConso(veh: VehiculeRoule): number[] {
  return Array.from({ length: 201 }, (_, k) => +(litresPas({ d: 1000, v: k, vPrec: k }, veh) * 100).toFixed(3));
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
    titreEnCours: T.notifEnCours,
    titrePause: T.notifEnPause,
    gabarit: T.notifTexte("{v}", "{km}", T.euros(prix == null ? T.vide : "{eur}")),
    km: d.km,
    euros: prix == null ? null : d.litres * prix,
    prix,
    l100ParVitesse: tableConso(vehiculeDe(e.voiture)),
    tPoint: d.dernierPointMs,
  };
}

/** Branche la notification sur l'enregistreur ; `arreter` ouvre la fin de trajet. Renvoie de quoi débrancher. */
export function brancherNotification(arreter: () => void): () => void {
  if (!Capacitor.isNativePlatform()) return () => undefined;
  const rec = enregistreur();
  let dernier = 0;
  let cle = "";
  const maj = () => {
    const { etat, maintenant } = rec.instantane();
    if (!etat) {
      cle = "";
      return;
    }
    const c = contenuNotification(etat, maintenant);
    const nouvelleCle = `${c.enPause}|${c.immobile}`;
    // l'état (pause, immobile) part tout de suite ; les chiffres au plus toutes les 2 s
    if (nouvelleCle === cle && maintenant - dernier < PERIODE_MS) return;
    cle = nouvelleCle;
    dernier = maintenant;
    TrajetEnRoute.maj(c).catch(() => undefined);
  };
  const desabonner = rec.abonner(maj);
  const ecoute = TrajetEnRoute.addListener("action", ({ action }) => {
    if (action === "arreter") arreter();
  });
  return () => {
    desabonner();
    ecoute.then((h) => h.remove()).catch(() => undefined);
  };
}
