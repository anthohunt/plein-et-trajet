// Réseau du téléphone (jalon 5 round 2) : vrai tant que le navigateur se dit en ligne ; suit les événements online / offline.
import { useEffect, useState } from "react";

export function useEnLigne(): boolean {
  const [enLigne, setEnLigne] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine));
  useEffect(() => {
    const maj = () => setEnLigne(navigator.onLine);
    window.addEventListener("online", maj);
    window.addEventListener("offline", maj);
    return () => {
      window.removeEventListener("online", maj);
      window.removeEventListener("offline", maj);
    };
  }, []);
  return enLigne;
}
