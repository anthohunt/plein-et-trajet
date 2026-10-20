// Accessibilité et performance — script Playwright. Sélecteurs à confirmer en explorant l'appli déployée (explore-first).
module.exports = async function(page) {
  const results = [];
  const base = process.env.APP_URL;
  await page.goto(base);
  // US-A11Y-001 AC-1 : ÉTANT DONNÉ n'importe quel écran, QUAND j'utilise Tab et Maj+Tab, ALORS chaque contrôle reçoit le focus dans l'ordre de lecture avec un contour visible
  results.push({ id: 'US-A11Y-001-AC-1', criterion: "ÉTANT DONNÉ n'importe quel écran, QUAND j'utilise Tab et Maj+Tab, ALORS chaque contrôle reçoit le focus dans l'ordre de lecture avec un contour visible", status: 'todo', detail: 'à écrire après exploration de l’appli déployée', duration: 0 });
  // US-A11Y-002 AC-1 : ÉTANT DONNÉ une fiche station ouverte au clavier, QUAND elle s'ouvre, ALORS le focus va sur son titre ; à la fermeture il revient sur l'élément qui l'a ouverte
  results.push({ id: 'US-A11Y-002-AC-1', criterion: "ÉTANT DONNÉ une fiche station ouverte au clavier, QUAND elle s'ouvre, ALORS le focus va sur son titre ; à la fermeture il revient sur l'élément qui l'a ouverte", status: 'todo', detail: 'à écrire après exploration de l’appli déployée', duration: 0 });
  // US-A11Y-003 AC-1 : ÉTANT DONNÉ la fiche station ou un tronçon déplié, QUAND j'appuie sur Échap, ALORS la fiche se ferme
  results.push({ id: 'US-A11Y-003-AC-1', criterion: "ÉTANT DONNÉ la fiche station ou un tronçon déplié, QUAND j'appuie sur Échap, ALORS la fiche se ferme", status: 'todo', detail: 'à écrire après exploration de l’appli déployée', duration: 0 });
  // US-A11Y-004 AC-1 : ÉTANT DONNÉ un lecteur d'écran actif, QUAND je parcours les pastilles et les prix, ALORS chaque pastille annonce station et prix en euros, chaque bouton icône a un libellé
  results.push({ id: 'US-A11Y-004-AC-1', criterion: "ÉTANT DONNÉ un lecteur d'écran actif, QUAND je parcours les pastilles et les prix, ALORS chaque pastille annonce station et prix en euros, chaque bouton icône a un libellé", status: 'todo', detail: 'à écrire après exploration de l’appli déployée', duration: 0 });
  // US-PERF-001 AC-1 : ÉTANT DONNÉ une connexion 4G, QUAND j'ouvre l'appli, ALORS la liste des stations est affichée en moins de 2,5 s
  results.push({ id: 'US-PERF-001-AC-1', criterion: "ÉTANT DONNÉ une connexion 4G, QUAND j'ouvre l'appli, ALORS la liste des stations est affichée en moins de 2,5 s", status: 'todo', detail: 'à écrire après exploration de l’appli déployée', duration: 0 });
  return results;
};
