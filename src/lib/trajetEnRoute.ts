// Pont vers le service natif du trajet (jalon 6, round 2 : android/…/TrajetEnRoute.java et TrajetService.java). Le service lit
// le GPS, écrit chaque relevé dans un journal (daté par l'heure du relevé) et tient la notification ; la page lit ce journal à sa
// réouverture et reçoit chaque nouvelle ligne en direct (« releve »). Sans effet dans le navigateur.
import { registerPlugin, type PluginListenerHandle } from "@capacitor/core";

/** Ce que montre la notification : tous les textes viennent de textes.ts ; `gabarit` et les nombres servent au direct natif. */
export interface ContenuNotification {
  titre: string;
  texte: string;
  enPause: boolean;
  immobile: boolean;
  reprendre: string;
  cestFini: string;
  pause: string;
  arreter: string;
  // direct natif, quand la page n'est plus là : km et € de la page à cet instant, puis le service ajoute la distance des relevés
  titreEnCours: string;
  titrePause: string;
  gabarit: string; // ligne de chiffres avec {v}, {km}, {eur}
  km: number;
  euros: number | null;
  prix: number | null;
  l100ParVitesse: number[]; // consommation de la voiture (L/100 km) à 0, 1, 2… 200 km/h, pour les pas comptés par le service
  tPoint: number | null; // instant du dernier relevé compté par la page
}

export interface TrajetEnRoutePlugin {
  demanderPermissions(): Promise<{ localisation?: boolean }>;
  demarrer(o: { id: string; contenu: ContenuNotification }): Promise<void>;
  arreter(): Promise<void>;
  lire(): Promise<{ texte: string; id: string | null; actif: boolean; contenu: string }>;
  maj(o: ContenuNotification): Promise<void>;
  batterie(): Promise<{ horsOptimisation: boolean }>;
  proposerBatterie(): Promise<{ horsOptimisation: boolean }>;
  addListener(evt: "releve", f: (e: { ligne: string }) => void): Promise<PluginListenerHandle>;
  addListener(evt: "action", f: (e: { action: string }) => void): Promise<PluginListenerHandle>;
}

export const TrajetEnRoute = registerPlugin<TrajetEnRoutePlugin>("TrajetEnRoute");
