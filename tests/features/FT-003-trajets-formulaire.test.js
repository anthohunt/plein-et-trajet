// Métadonnées de test (documentation, non exécutable)
module.exports = {
 "id": "FT-003",
 "title": "Trajets : lieux, voiture, calcul, historique",
 "testMode": "browser",
 "screen": "S3",
 "userStories": [
  "US-3.1",
  "US-3.2",
  "US-3.3",
  "US-3.4",
  "US-3.5",
  "US-3.6",
  "US-3.7",
  "US-3.E1",
  "US-3.E2",
  "US-3.E3",
  "US-3.E4",
  "US-3.P1",
  "US-3.P2",
  "US-3.8"
 ],
 "acceptanceCriteria": {
  "US-3.1": [
   "ÉTANT DONNÉ l'onglet Prix, QUAND je touche l'onglet Trajets, ALORS le formulaire et l'historique s'affichent"
  ],
  "US-3.2": [
   "ÉTANT DONNÉ le champ départ vide, QUAND je tape « Alb », ALORS des propositions de lieux apparaissent et je peux en choisir une"
  ],
  "US-3.3": [
   "ÉTANT DONNÉ le champ arrivée vide, QUAND je tape « Bord », ALORS des propositions de lieux apparaissent et je peux en choisir une"
  ],
  "US-3.4": [
   "ÉTANT DONNÉ aucune voiture mémorisée, QUAND je choisis Peugeot, puis 208, puis une motorisation, ALORS la voiture est enregistrée et son carburant est affiché",
   "ÉTANT DONNÉ une voiture mémorisée, QUAND je rouvre l'appli, ALORS le choix de voiture est pré-rempli"
  ],
  "US-3.5": [
   "ÉTANT DONNÉ départ, arrivée et voiture renseignés, QUAND je touche le bouton calculer, ALORS le résultat s'affiche avec coût, litres, km et L/100 km"
  ],
  "US-3.6": [
   "ÉTANT DONNÉ un trajet dans l'historique, QUAND je touche sa ligne historique, ALORS le trajet est recalculé au prix moyen du jour et le résultat s'affiche"
  ],
  "US-3.7": [
   "ÉTANT DONNÉ un trajet dans l'historique, QUAND je touche sa croix supprimer trajet, ALORS la ligne disparaît et ne revient pas au rechargement"
  ],
  "US-3.E1": [
   "ÉTANT DONNÉ une arrivée « zzzz » sans résultat, QUAND je touche le bouton calculer, ALORS le champ arrivée est signalé « Lieu introuvable » et aucun calcul n'est lancé"
  ],
  "US-3.E2": [
   "ÉTANT DONNÉ aucune voiture choisie, QUAND je touche le bouton calculer, ALORS le choix de voiture est signalé « Choisis ta voiture » et aucun calcul n'est lancé"
  ],
  "US-3.E3": [
   "ÉTANT DONNÉ aucun trajet calculé, QUAND j'ouvre l'onglet Trajets, ALORS l'historique affiche « Aucun trajet pour l'instant » avec une invitation à calculer le premier"
  ],
  "US-3.E4": [
   "ÉTANT DONNÉ un modèle choisi, QUAND j'ouvre la liste des motorisations, ALORS elles sont classées par puissance avec leur carburant, et la plus proche de la puissance moyenne est proposée en premier"
  ],
  "US-3.P1": [
   "ÉTANT DONNÉ départ Albi et arrivée Bordeaux, QUAND je touche le bouton d'inversion entre champ départ et champ arrivée, ALORS le départ devient Bordeaux et l'arrivée Albi"
  ],
  "US-3.P2": [
   "ÉTANT DONNÉ une voiture mémorisée, QUAND je choisis une autre marque dans le choix de voiture, ALORS modèle et motorisation se réinitialisent et la nouvelle voiture est mémorisée"
  ],
  "US-3.8": [
   "ÉTANT DONNÉ le champ arrivée, QUAND je tape « Barce » et choisis Barcelone, Espagne, ALORS le calcul aboutit avec un itinéraire qui traverse la France puis l'Espagne"
  ]
 }
};
