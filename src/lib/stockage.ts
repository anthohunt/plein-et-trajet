// Stockage sur le téléphone (jalon 5) : IndexedDB par idb 8.0.4 — base « plein-et-trajet », magasins `trajets` (historique)
// et `en_cours` (enregistrement qui tourne, trajet arrêté pas encore tranché). Pas de compte : perdu si on change de téléphone.
import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { TrajetV1 } from "./historique";
import type { EnCours } from "./plateforme";

interface Schema extends DBSchema {
  trajets: { key: string; value: TrajetV1; indexes: { debut: number } };
  en_cours: { key: string; value: EnCours | TrajetV1 };
}

let base: Promise<IDBPDatabase<Schema>> | null = null;
export function db(): Promise<IDBPDatabase<Schema>> {
  if (!base) {
    base = openDB<Schema>("plein-et-trajet", 1, {
      upgrade(d) {
        const t = d.createObjectStore("trajets", { keyPath: "id" });
        t.createIndex("debut", "debut");
        d.createObjectStore("en_cours");
      },
    });
  }
  return base;
}

export const CLE_ENREGISTREMENT = "enregistrement";
export const CLE_ARRETE = "arrete";
