// Fiche station — script Playwright. Sélecteurs à confirmer en explorant l'appli déployée (explore-first).
module.exports = async function(page) {
  const results = [];
  const base = process.env.APP_URL;
  await page.goto(base);
  // US-2.1 AC-1 : ÉTANT DONNÉ une fiche station ouverte, QUAND je touche le bouton fermer la fiche ou la touche Échap, ALORS la fiche se ferme et le carburant choisi n'a pas changé
  results.push({ id: 'US-2.1-AC-1', criterion: "ÉTANT DONNÉ une fiche station ouverte, QUAND je touche le bouton fermer la fiche ou la touche Échap, ALORS la fiche se ferme et le carburant choisi n'a pas changé", status: 'todo', detail: 'à écrire après exploration de l’appli déployée', duration: 0 });
  // US-2.2 AC-1 : ÉTANT DONNÉ la fiche d'une station, QUAND je touche « Coût d'un trajet jusqu'ici » (bouton trajet station), ALORS l'onglet Trajets s'ouvre avec l'arrivée pré-remplie à l'adresse de la station
  results.push({ id: 'US-2.2-AC-1', criterion: "ÉTANT DONNÉ la fiche d'une station, QUAND je touche « Coût d'un trajet jusqu'ici » (bouton trajet station), ALORS l'onglet Trajets s'ouvre avec l'arrivée pré-remplie à l'adresse de la station", status: 'todo', detail: 'à écrire après exploration de l’appli déployée', duration: 0 });
  // US-2.E1 AC-1 : ÉTANT DONNÉ une station sans GPLc, QUAND j'ouvre sa fiche, ALORS la ligne GPLc affiche « non vendu » au lieu d'un prix
  results.push({ id: 'US-2.E1-AC-1', criterion: "ÉTANT DONNÉ une station sans GPLc, QUAND j'ouvre sa fiche, ALORS la ligne GPLc affiche « non vendu » au lieu d'un prix", status: 'todo', detail: 'à écrire après exploration de l’appli déployée', duration: 0 });
  return results;
};
