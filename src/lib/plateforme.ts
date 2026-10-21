// Plateforme d'enregistrement (jalon 5, T5.4) : l'appli web enregistre par les API du navigateur (Geolocation, IndexedDB) ;
// l'appli Android (jalon 6) garde le même enregistreur, dont le GPS passe alors par un service natif de premier plan.
import type { Pause, PointRoule } from "../../supabase/functions/_shared/roule.ts";
import type { Carburant } from "./format";
import type { PrixMoyen, TrajetV1 } from "./historique";
import type { VoitureV1 } from "./voiture";
import { enregistreurWeb } from "./enregistreur-web";

export interface EnCours {
  version: 2;
  id: string;
  debut: number; // ms
  points: PointRoule[];
  pauses: Pause[];
  enPause: boolean;
  segment: number;
  voiture: VoitureV1;
  pays: string; // pays du départ
  moyennes: Partial<Record<Carburant, PrixMoyen>>; // moyennes du jour du pays de départ
  prixChoisi: number | null; // « Utiliser ce prix »
  immobile: number | null; // début de l'immobilité constatée : alerte « Reprendre / C'est fini »
  ignorerAvant: number; // reprise après une alerte d'immobilité : on ne rejuge que les points suivants
  lu?: number; // appli Android : instant de la dernière ligne du journal du service appliquée (chaque ligne ne compte qu'une fois)
}

export type IssueArret = { trajet: TrajetV1 } | { tropCourt: number };
export type ErreurDemarrage = "refusee" | "indisponible";

export interface Enregistreur {
  plateforme: "web" | "android";
  demarrer(voiture: VoitureV1): Promise<{ ok: true } | { ok: false; erreur: ErreurDemarrage }>;
  pause(): void;
  reprendre(): void;
  /** Reprendre après l'alerte d'immobilité : les points d'avant sont gardés. */
  reprendreApresImmobile(): void;
  /** Arrêter : à l'instant, ou au début de l'immobilité si l'alerte est affichée (« C'est fini »). */
  arreter(): Promise<IssueArret>;
  etat(): EnCours | null;
  points(): PointRoule[];
  effacer(): Promise<void>;
  changerPrix(prix: number | null): void;
  /** Rouvre un enregistrement gardé (rechargement de la page) et reprend l'écoute du GPS. */
  restaurer(): Promise<EnCours | null>;
  abonner(f: () => void): () => void;
  instantane(): { etat: EnCours | null; maintenant: number };
}

export function enregistreur(): Enregistreur {
  return enregistreurWeb;
}
