// Résultat : coût, tronçons, prix perso — script Playwright. Sélecteurs à confirmer en explorant l'appli déployée (explore-first).
module.exports = async function(page) {
  const results = [];
  const base = process.env.APP_URL;
  await page.goto(base);
  // US-4.1 AC-1 : ÉTANT DONNÉ un résultat affiché, QUAND je touche un tronçon du trajet, ALORS il se déplie et montre vitesse typique, arrêts ou dénivelé, et L/100 km sur ce tronçon
  results.push({ id: 'US-4.1-AC-1', criterion: "ÉTANT DONNÉ un résultat affiché, QUAND je touche un tronçon du trajet, ALORS il se déplie et montre vitesse typique, arrêts ou dénivelé, et L/100 km sur ce tronçon", status: 'todo', detail: 'à écrire après exploration de l’appli déployée', duration: 0 });
  // US-4.1 AC-2 : ÉTANT DONNÉ un tronçon déplié, QUAND je le touche à nouveau, ALORS il se replie
  results.push({ id: 'US-4.1-AC-2', criterion: "ÉTANT DONNÉ un tronçon déplié, QUAND je le touche à nouveau, ALORS il se replie", status: 'todo', detail: 'à écrire après exploration de l’appli déployée', duration: 0 });
  // US-4.2 AC-1 : ÉTANT DONNÉ un résultat au prix moyen France, QUAND je touche « Mettre mon prix » (prix perso) et je saisis 1,699, ALORS le coût est recalculé avec 1,699 €/L et le libellé devient « Mon prix »
  results.push({ id: 'US-4.2-AC-1', criterion: "ÉTANT DONNÉ un résultat au prix moyen France, QUAND je touche « Mettre mon prix » (prix perso) et je saisis 1,699, ALORS le coût est recalculé avec 1,699 €/L et le libellé devient « Mon prix »", status: 'todo', detail: 'à écrire après exploration de l’appli déployée', duration: 0 });
  // US-4.2 AC-2 : ÉTANT DONNÉ un prix perso saisi, QUAND je touche « Revenir à la moyenne », ALORS le coût revient à la moyenne nationale
  results.push({ id: 'US-4.2-AC-2', criterion: "ÉTANT DONNÉ un prix perso saisi, QUAND je touche « Revenir à la moyenne », ALORS le coût revient à la moyenne nationale", status: 'todo', detail: 'à écrire après exploration de l’appli déployée', duration: 0 });
  // US-4.3 AC-1 : ÉTANT DONNÉ un résultat affiché, QUAND je touche le bouton retour trajets, ALORS le formulaire s'affiche et ce trajet est en tête de l'historique
  results.push({ id: 'US-4.3-AC-1', criterion: "ÉTANT DONNÉ un résultat affiché, QUAND je touche le bouton retour trajets, ALORS le formulaire s'affiche et ce trajet est en tête de l'historique", status: 'todo', detail: 'à écrire après exploration de l’appli déployée', duration: 0 });
  // US-4.E1 AC-1 : ÉTANT DONNÉ une arrivée en Corse depuis Albi, QUAND je lance le calcul, ALORS le résultat affiche « Pas d'itinéraire routier entre ces deux lieux » sans coût
  results.push({ id: 'US-4.E1-AC-1', criterion: "ÉTANT DONNÉ une arrivée en Corse depuis Albi, QUAND je lance le calcul, ALORS le résultat affiche « Pas d'itinéraire routier entre ces deux lieux » sans coût", status: 'todo', detail: 'à écrire après exploration de l’appli déployée', duration: 0 });
  // US-4.E2 AC-1 : ÉTANT DONNÉ le champ prix perso ouvert, QUAND je saisis 12 ou une lettre, ALORS le champ est signalé « Entre un prix entre 0,50 et 4,00 €/L » et le coût reste celui d'avant
  results.push({ id: 'US-4.E2-AC-1', criterion: "ÉTANT DONNÉ le champ prix perso ouvert, QUAND je saisis 12 ou une lettre, ALORS le champ est signalé « Entre un prix entre 0,50 et 4,00 €/L » et le coût reste celui d'avant", status: 'todo', detail: 'à écrire après exploration de l’appli déployée', duration: 0 });
  // US-4.E3 AC-1 : ÉTANT DONNÉ un calcul qui dure plus d'une seconde, QUAND j'attends, ALORS un état « Calcul de l'itinéraire… » s'affiche avec un bouton Annuler qui ramène au formulaire
  results.push({ id: 'US-4.E3-AC-1', criterion: "ÉTANT DONNÉ un calcul qui dure plus d'une seconde, QUAND j'attends, ALORS un état « Calcul de l'itinéraire… » s'affiche avec un bouton Annuler qui ramène au formulaire", status: 'todo', detail: 'à écrire après exploration de l’appli déployée', duration: 0 });
  return results;
};
