// Observatoire de l'enregistrement en fond (plan de tests de robustesse, niveau 0). Sur l'appli Android, le service écrit un
// journal technique (Diagnostic.java : vie du service, refus du premier plan, trous, morts du processus) ; on l'envoie à la table
// `diagnostics` à chaque ouverture de l'appli et à chaque fin de trajet, puis on l'acquitte. Rien n'est montré à l'écran.
import { Capacitor } from "@capacitor/core";
import { supabase } from "./supabase";
import { sessionAnonyme } from "./session";
import { TrajetEnRoute } from "./trajetEnRoute";

let enCours: Promise<void> | null = null;

export function envoyerDiagnostic(occasion: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) return Promise.resolve();
  if (!enCours) {
    enCours = (async () => {
      const d = await TrajetEnRoute.diagnostic({ occasion });
      if (!d.texte) return;
      await sessionAnonyme();
      const { error } = await supabase.from("diagnostics").insert({ occasion, version: d.version, etat: d.etat, texte: d.texte });
      if (error) throw new Error(error.message);
      await TrajetEnRoute.acquitterDiagnostic({ fin: d.fin });
    })()
      .catch(() => undefined) // gardé sur le téléphone, renvoyé à la prochaine occasion
      .finally(() => {
        enCours = null;
      });
  }
  return enCours;
}
