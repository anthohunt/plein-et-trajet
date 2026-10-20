// Sécurité pour les extraits Playwright :
//  • les vraies clés (PTV, Stadia) sont lues en mémoire avant les tests et restaurées après (jamais écrites ailleurs, jamais effacées) ;
//  • un administrateur de test ÉPHÉMÈRE est créé (API admin, app_metadata.role = admin) et supprimé à la fin, même si un test échoue.
import { adminsEphemeresRestants, creerAdminEphemere, lireEtatReel, restaurerEtatReel, supprimerAdminsEphemeres, verifierFournisseurs } from "./m3-aides.mjs";

export default async function () {
  const etat = await lireEtatReel();
  const manquantes = ["ptv", "stadia"].filter((f) => !etat.cles[f]);
  if (manquantes.length) console.log(`Clés absentes au départ (non réinventées) : ${manquantes.join(", ")}`);
  await creerAdminEphemere();
  return async () => {
    try {
      await restaurerEtatReel(etat);
      console.log("Vérification finale des moteurs (vrai estimer-trajet Albi → Barcelone) :", JSON.stringify(await verifierFournisseurs()));
    } finally {
      await supprimerAdminsEphemeres();
      console.log(`Administrateurs éphémères restants après suppression (relu) : ${await adminsEphemeresRestants()}`);
    }
  };
}
