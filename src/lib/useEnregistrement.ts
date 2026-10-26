// Abonnement des écrans à l'enregistrement en cours (jalon 5) : un seul enregistreur pour toute l'appli, qui continue
// pendant qu'on regarde les stations ou l'historique.
import { useEffect, useState, useSyncExternalStore } from "react";
import { enregistreur } from "./plateforme";
import { lireVoiture, type VoitureV1 } from "./voiture";

export function useEnregistrement() {
  const e = enregistreur();
  return useSyncExternalStore(e.abonner, e.instantane);
}

export function useVoitureV1(): VoitureV1 | null {
  const [v, setV] = useState<VoitureV1 | null>(() => lireVoiture());
  useEffect(() => {
    const maj = () => setV(lireVoiture());
    window.addEventListener("pt-voiture", maj);
    window.addEventListener("storage", maj);
    return () => {
      window.removeEventListener("pt-voiture", maj);
      window.removeEventListener("storage", maj);
    };
  }, []);
  return v;
}
