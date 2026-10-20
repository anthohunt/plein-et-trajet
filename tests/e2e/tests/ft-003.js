// Trajets : lieux, voiture, calcul, historique — script Playwright. Sélecteurs à confirmer en explorant l'appli déployée (explore-first).
module.exports = async function(page) {
  const results = [];
  const base = process.env.APP_URL;
  await page.goto(base);
  // US-3.1 AC-1 : ÉTANT DONNÉ l'onglet Prix, QUAND je touche l'onglet Trajets, ALORS le formulaire et l'historique s'affichent
  results.push({ id: 'US-3.1-AC-1', criterion: "ÉTANT DONNÉ l'onglet Prix, QUAND je touche l'onglet Trajets, ALORS le formulaire et l'historique s'affichent", status: 'todo', detail: 'à écrire après exploration de l’appli déployée', duration: 0 });
  // US-3.2 AC-1 : ÉTANT DONNÉ le champ départ vide, QUAND je tape « Alb », ALORS des propositions de lieux apparaissent et je peux en choisir une
  results.push({ id: 'US-3.2-AC-1', criterion: "ÉTANT DONNÉ le champ départ vide, QUAND je tape « Alb », ALORS des propositions de lieux apparaissent et je peux en choisir une", status: 'todo', detail: 'à écrire après exploration de l’appli déployée', duration: 0 });
  // US-3.3 AC-1 : ÉTANT DONNÉ le champ arrivée vide, QUAND je tape « Bord », ALORS des propositions de lieux apparaissent et je peux en choisir une
  results.push({ id: 'US-3.3-AC-1', criterion: "ÉTANT DONNÉ le champ arrivée vide, QUAND je tape « Bord », ALORS des propositions de lieux apparaissent et je peux en choisir une", status: 'todo', detail: 'à écrire après exploration de l’appli déployée', duration: 0 });
  // US-3.4 AC-1 : ÉTANT DONNÉ aucune voiture mémorisée, QUAND je choisis Peugeot, puis 208, puis une motorisation, ALORS la voiture est enregistrée et son carburant est affiché
  results.push({ id: 'US-3.4-AC-1', criterion: "ÉTANT DONNÉ aucune voiture mémorisée, QUAND je choisis Peugeot, puis 208, puis une motorisation, ALORS la voiture est enregistrée et son carburant est affiché", status: 'todo', detail: 'à écrire après exploration de l’appli déployée', duration: 0 });
  // US-3.4 AC-2 : ÉTANT DONNÉ une voiture mémorisée, QUAND je rouvre l'appli, ALORS le choix de voiture est pré-rempli
  results.push({ id: 'US-3.4-AC-2', criterion: "ÉTANT DONNÉ une voiture mémorisée, QUAND je rouvre l'appli, ALORS le choix de voiture est pré-rempli", status: 'todo', detail: 'à écrire après exploration de l’appli déployée', duration: 0 });
  // US-3.5 AC-1 : ÉTANT DONNÉ départ, arrivée et voiture renseignés, QUAND je touche le bouton calculer, ALORS le résultat s'affiche avec coût, litres, km et L/100 km
  results.push({ id: 'US-3.5-AC-1', criterion: "ÉTANT DONNÉ départ, arrivée et voiture renseignés, QUAND je touche le bouton calculer, ALORS le résultat s'affiche avec coût, litres, km et L/100 km", status: 'todo', detail: 'à écrire après exploration de l’appli déployée', duration: 0 });
  // US-3.6 AC-1 : ÉTANT DONNÉ un trajet dans l'historique, QUAND je touche sa ligne historique, ALORS le trajet est recalculé au prix moyen du jour et le résultat s'affiche
  results.push({ id: 'US-3.6-AC-1', criterion: "ÉTANT DONNÉ un trajet dans l'historique, QUAND je touche sa ligne historique, ALORS le trajet est recalculé au prix moyen du jour et le résultat s'affiche", status: 'todo', detail: 'à écrire après exploration de l’appli déployée', duration: 0 });
  // US-3.7 AC-1 : ÉTANT DONNÉ un trajet dans l'historique, QUAND je touche sa croix supprimer trajet, ALORS la ligne disparaît et ne revient pas au rechargement
  results.push({ id: 'US-3.7-AC-1', criterion: "ÉTANT DONNÉ un trajet dans l'historique, QUAND je touche sa croix supprimer trajet, ALORS la ligne disparaît et ne revient pas au rechargement", status: 'todo', detail: 'à écrire après exploration de l’appli déployée', duration: 0 });
  // US-3.E1 AC-1 : ÉTANT DONNÉ une arrivée « zzzz » sans résultat, QUAND je touche le bouton calculer, ALORS le champ arrivée est signalé « Lieu introuvable » et aucun calcul n'est lancé
  results.push({ id: 'US-3.E1-AC-1', criterion: "ÉTANT DONNÉ une arrivée « zzzz » sans résultat, QUAND je touche le bouton calculer, ALORS le champ arrivée est signalé « Lieu introuvable » et aucun calcul n'est lancé", status: 'todo', detail: 'à écrire après exploration de l’appli déployée', duration: 0 });
  // US-3.E2 AC-1 : ÉTANT DONNÉ aucune voiture choisie, QUAND je touche le bouton calculer, ALORS le choix de voiture est signalé « Choisis ta voiture » et aucun calcul n'est lancé
  results.push({ id: 'US-3.E2-AC-1', criterion: "ÉTANT DONNÉ aucune voiture choisie, QUAND je touche le bouton calculer, ALORS le choix de voiture est signalé « Choisis ta voiture » et aucun calcul n'est lancé", status: 'todo', detail: 'à écrire après exploration de l’appli déployée', duration: 0 });
  // US-3.E3 AC-1 : ÉTANT DONNÉ aucun trajet calculé, QUAND j'ouvre l'onglet Trajets, ALORS l'historique affiche « Aucun trajet pour l'instant » avec une invitation à calculer le premier
  results.push({ id: 'US-3.E3-AC-1', criterion: "ÉTANT DONNÉ aucun trajet calculé, QUAND j'ouvre l'onglet Trajets, ALORS l'historique affiche « Aucun trajet pour l'instant » avec une invitation à calculer le premier", status: 'todo', detail: 'à écrire après exploration de l’appli déployée', duration: 0 });
  // US-3.E4 AC-1 : ÉTANT DONNÉ un modèle choisi, QUAND j'ouvre la liste des motorisations, ALORS elles sont classées par puissance avec leur carburant, et la plus proche de la puissance moyenne est proposée en premier
  results.push({ id: 'US-3.E4-AC-1', criterion: "ÉTANT DONNÉ un modèle choisi, QUAND j'ouvre la liste des motorisations, ALORS elles sont classées par puissance avec leur carburant, et la plus proche de la puissance moyenne est proposée en premier", status: 'todo', detail: 'à écrire après exploration de l’appli déployée', duration: 0 });
  // US-3.P1 AC-1 : ÉTANT DONNÉ départ Albi et arrivée Bordeaux, QUAND je touche le bouton d'inversion entre champ départ et champ arrivée, ALORS le départ devient Bordeaux et l'arrivée Albi
  results.push({ id: 'US-3.P1-AC-1', criterion: "ÉTANT DONNÉ départ Albi et arrivée Bordeaux, QUAND je touche le bouton d'inversion entre champ départ et champ arrivée, ALORS le départ devient Bordeaux et l'arrivée Albi", status: 'todo', detail: 'à écrire après exploration de l’appli déployée', duration: 0 });
  // US-3.P2 AC-1 : ÉTANT DONNÉ une voiture mémorisée, QUAND je choisis une autre marque dans le choix de voiture, ALORS modèle et motorisation se réinitialisent et la nouvelle voiture est mémorisée
  results.push({ id: 'US-3.P2-AC-1', criterion: "ÉTANT DONNÉ une voiture mémorisée, QUAND je choisis une autre marque dans le choix de voiture, ALORS modèle et motorisation se réinitialisent et la nouvelle voiture est mémorisée", status: 'todo', detail: 'à écrire après exploration de l’appli déployée', duration: 0 });
  // US-3.8 AC-1 : ÉTANT DONNÉ le champ arrivée, QUAND je tape « Barce » et choisis Barcelone, Espagne, ALORS le calcul aboutit avec un itinéraire qui traverse la France puis l'Espagne
  results.push({ id: 'US-3.8-AC-1', criterion: "ÉTANT DONNÉ le champ arrivée, QUAND je tape « Barce » et choisis Barcelone, Espagne, ALORS le calcul aboutit avec un itinéraire qui traverse la France puis l'Espagne", status: 'todo', detail: 'à écrire après exploration de l’appli déployée', duration: 0 });
  return results;
};
