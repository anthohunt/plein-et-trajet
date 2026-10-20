// Écran Prix : carburant, carte, liste, tri — script Playwright. Sélecteurs à confirmer en explorant l'appli déployée (explore-first).
module.exports = async function(page) {
  const results = [];
  const base = process.env.APP_URL;
  await page.goto(base);
  // US-1.1 AC-1 : ÉTANT DONNÉ l'appli ouverte sur l'onglet Trajets, QUAND je touche l'onglet Prix, ALORS la carte et la liste des stations autour de ma position s'affichent
  results.push({ id: 'US-1.1-AC-1', criterion: "ÉTANT DONNÉ l'appli ouverte sur l'onglet Trajets, QUAND je touche l'onglet Prix, ALORS la carte et la liste des stations autour de ma position s'affichent", status: 'todo', detail: 'à écrire après exploration de l’appli déployée', duration: 0 });
  // US-1.1 AC-2 : ÉTANT DONNÉ la position refusée, QUAND l'onglet Prix s'ouvre, ALORS la carte est centrée sur la dernière ville saisie ou sur Albi par défaut, avec un message pour activer la localisation
  results.push({ id: 'US-1.1-AC-2', criterion: "ÉTANT DONNÉ la position refusée, QUAND l'onglet Prix s'ouvre, ALORS la carte est centrée sur la dernière ville saisie ou sur Albi par défaut, avec un message pour activer la localisation", status: 'todo', detail: 'à écrire après exploration de l’appli déployée', duration: 0 });
  // US-1.2 AC-1 : ÉTANT DONNÉ la liste en SP95-E10, QUAND je touche Gazole dans le sélecteur de carburant, ALORS chaque pastille et chaque ligne affichent le prix gazole et le titre devient « Stations · Gazole »
  results.push({ id: 'US-1.2-AC-1', criterion: "ÉTANT DONNÉ la liste en SP95-E10, QUAND je touche Gazole dans le sélecteur de carburant, ALORS chaque pastille et chaque ligne affichent le prix gazole et le titre devient « Stations · Gazole »", status: 'todo', detail: 'à écrire après exploration de l’appli déployée', duration: 0 });
  // US-1.2 AC-2 : ÉTANT DONNÉ une station qui ne vend pas le carburant choisi, QUAND je change de carburant, ALORS elle disparaît de la carte et de la liste
  results.push({ id: 'US-1.2-AC-2', criterion: "ÉTANT DONNÉ une station qui ne vend pas le carburant choisi, QUAND je change de carburant, ALORS elle disparaît de la carte et de la liste", status: 'todo', detail: 'à écrire après exploration de l’appli déployée', duration: 0 });
  // US-1.3 AC-1 : ÉTANT DONNÉ des stations synchronisées dans un rayon de 10 km, QUAND la carte des stations s'affiche, ALORS chaque station est une pastille à sa position réelle avec son prix
  results.push({ id: 'US-1.3-AC-1', criterion: "ÉTANT DONNÉ des stations synchronisées dans un rayon de 10 km, QUAND la carte des stations s'affiche, ALORS chaque station est une pastille à sa position réelle avec son prix", status: 'todo', detail: 'à écrire après exploration de l’appli déployée', duration: 0 });
  // US-1.3 AC-2 : ÉTANT DONNÉ je déplace la carte, QUAND je relâche, ALORS les stations de la nouvelle zone se chargent
  results.push({ id: 'US-1.3-AC-2', criterion: "ÉTANT DONNÉ je déplace la carte, QUAND je relâche, ALORS les stations de la nouvelle zone se chargent", status: 'todo', detail: 'à écrire après exploration de l’appli déployée', duration: 0 });
  // US-1.4 AC-1 : ÉTANT DONNÉ la carte affichée, QUAND je touche une pastille de station, ALORS la fiche de cette station s'ouvre
  results.push({ id: 'US-1.4-AC-1', criterion: "ÉTANT DONNÉ la carte affichée, QUAND je touche une pastille de station, ALORS la fiche de cette station s'ouvre", status: 'todo', detail: 'à écrire après exploration de l’appli déployée', duration: 0 });
  // US-1.4 AC-2 : ÉTANT DONNÉ des prix différents autour de moi, QUAND la carte s'affiche, ALORS les pastilles de la moitié la moins chère sont marquées vert, les autres orange
  results.push({ id: 'US-1.4-AC-2', criterion: "ÉTANT DONNÉ des prix différents autour de moi, QUAND la carte s'affiche, ALORS les pastilles de la moitié la moins chère sont marquées vert, les autres orange", status: 'todo', detail: 'à écrire après exploration de l’appli déployée', duration: 0 });
  // US-1.5 AC-1 : ÉTANT DONNÉ la liste triée par prix, QUAND je touche « Plus proche » dans le tri de la liste, ALORS la liste se trie par distance croissante
  results.push({ id: 'US-1.5-AC-1', criterion: "ÉTANT DONNÉ la liste triée par prix, QUAND je touche « Plus proche » dans le tri de la liste, ALORS la liste se trie par distance croissante", status: 'todo', detail: 'à écrire après exploration de l’appli déployée', duration: 0 });
  // US-1.5 AC-2 : ÉTANT DONNÉ le tri par distance, QUAND je touche « Moins cher », ALORS la liste se retrie par prix croissant
  results.push({ id: 'US-1.5-AC-2', criterion: "ÉTANT DONNÉ le tri par distance, QUAND je touche « Moins cher », ALORS la liste se retrie par prix croissant", status: 'todo', detail: 'à écrire après exploration de l’appli déployée', duration: 0 });
  // US-1.6 AC-1 : ÉTANT DONNÉ la liste affichée, QUAND je lis une ligne de station, ALORS je vois enseigne, distance, ancienneté du prix, écart à la moyenne France et le prix à trois décimales
  results.push({ id: 'US-1.6-AC-1', criterion: "ÉTANT DONNÉ la liste affichée, QUAND je lis une ligne de station, ALORS je vois enseigne, distance, ancienneté du prix, écart à la moyenne France et le prix à trois décimales", status: 'todo', detail: 'à écrire après exploration de l’appli déployée', duration: 0 });
  // US-1.6 AC-2 : ÉTANT DONNÉ une ligne de station, QUAND je la touche, ALORS sa fiche s'ouvre
  results.push({ id: 'US-1.6-AC-2', criterion: "ÉTANT DONNÉ une ligne de station, QUAND je la touche, ALORS sa fiche s'ouvre", status: 'todo', detail: 'à écrire après exploration de l’appli déployée', duration: 0 });
  // US-1.E1 AC-1 : ÉTANT DONNÉ la lecture des prix en erreur réseau, QUAND l'écran Prix s'ouvre, ALORS un message « Prix indisponibles pour l'instant » et un bouton Réessayer s'affichent à la place de la liste
  results.push({ id: 'US-1.E1-AC-1', criterion: "ÉTANT DONNÉ la lecture des prix en erreur réseau, QUAND l'écran Prix s'ouvre, ALORS un message « Prix indisponibles pour l'instant » et un bouton Réessayer s'affichent à la place de la liste", status: 'todo', detail: 'à écrire après exploration de l’appli déployée', duration: 0 });
  // US-1.E2 AC-1 : ÉTANT DONNÉ aucune station du rayon ne vend E85, QUAND je choisis E85 dans le sélecteur de carburant, ALORS la liste affiche « Aucune station ne vend ce carburant autour de vous » et la carte n'a aucune pastille
  results.push({ id: 'US-1.E2-AC-1', criterion: "ÉTANT DONNÉ aucune station du rayon ne vend E85, QUAND je choisis E85 dans le sélecteur de carburant, ALORS la liste affiche « Aucune station ne vend ce carburant autour de vous » et la carte n'a aucune pastille", status: 'todo', detail: 'à écrire après exploration de l’appli déployée', duration: 0 });
  // US-1.E3 AC-1 : ÉTANT DONNÉ une station dont le prix date de plus de 48 h, QUAND la liste s'affiche, ALORS sa ligne de station porte la mention « prix du JJ/MM » en couleur atténuée
  results.push({ id: 'US-1.E3-AC-1', criterion: "ÉTANT DONNÉ une station dont le prix date de plus de 48 h, QUAND la liste s'affiche, ALORS sa ligne de station porte la mention « prix du JJ/MM » en couleur atténuée", status: 'todo', detail: 'à écrire après exploration de l’appli déployée', duration: 0 });
  // US-1.E4 AC-1 : ÉTANT DONNÉ une station en rupture temporaire de gazole, QUAND je choisis Gazole, ALORS elle n'apparaît pas dans la liste triée par prix
  results.push({ id: 'US-1.E4-AC-1', criterion: "ÉTANT DONNÉ une station en rupture temporaire de gazole, QUAND je choisis Gazole, ALORS elle n'apparaît pas dans la liste triée par prix", status: 'todo', detail: 'à écrire après exploration de l’appli déployée', duration: 0 });
  // US-1.P1 AC-1 : ÉTANT DONNÉ la carte déplacée, QUAND je touche le bouton de recentrage de la carte des stations, ALORS la carte revient sur ma position et la liste se recharge
  results.push({ id: 'US-1.P1-AC-1', criterion: "ÉTANT DONNÉ la carte déplacée, QUAND je touche le bouton de recentrage de la carte des stations, ALORS la carte revient sur ma position et la liste se recharge", status: 'todo', detail: 'à écrire après exploration de l’appli déployée', duration: 0 });
  return results;
};
