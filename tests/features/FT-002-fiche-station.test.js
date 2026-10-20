// Métadonnées de test (documentation, non exécutable)
module.exports = {
 "id": "FT-002",
 "title": "Fiche station",
 "testMode": "browser",
 "screen": "S2",
 "userStories": [
  "US-2.1",
  "US-2.2",
  "US-2.E1"
 ],
 "acceptanceCriteria": {
  "US-2.1": [
   "ÉTANT DONNÉ une fiche station ouverte, QUAND je touche le bouton fermer la fiche ou la touche Échap, ALORS la fiche se ferme et le carburant choisi n'a pas changé"
  ],
  "US-2.2": [
   "ÉTANT DONNÉ la fiche d'une station, QUAND je touche « Coût d'un trajet jusqu'ici » (bouton trajet station), ALORS l'onglet Trajets s'ouvre avec l'arrivée pré-remplie à l'adresse de la station"
  ],
  "US-2.E1": [
   "ÉTANT DONNÉ une station sans GPLc, QUAND j'ouvre sa fiche, ALORS la ligne GPLc affiche « non vendu » au lieu d'un prix"
  ]
 }
};
