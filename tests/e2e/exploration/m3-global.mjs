// Sécurité des vraies clés pour les extraits Playwright : lues en mémoire avant les tests, restaurées après (jamais écrites ailleurs).
import { lireEtatReel, restaurerEtatReel, verifierFournisseurs } from "./m3-aides.mjs";

export default async function () {
  const etat = await lireEtatReel();
  const manquantes = ["ptv", "stadia"].filter((f) => !etat.cles[f]);
  if (manquantes.length) console.log(`Clés absentes au départ (non réinventées) : ${manquantes.join(", ")}`);
  return async () => {
    await restaurerEtatReel(etat);
    console.log("Vérification finale des moteurs (vrai estimer-trajet Albi → Barcelone) :", JSON.stringify(await verifierFournisseurs()));
  };
}
