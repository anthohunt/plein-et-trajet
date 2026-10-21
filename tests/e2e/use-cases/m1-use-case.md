# Jalon 1 — Les prix autour de moi : plan de cas d'usage

**Démonstration** : J'ouvre l'appli à Albi, je vois les vraies stations sur la carte et dans la liste avec leurs prix officiels du jour, je change de carburant, je trie, j'ouvre une fiche.

**Écrans possédés** : S1 Prix, S2 Fiche station · traversés : S3 Trajets

Référence visuelle : `docs/pipeline/design/mockup.html` (écran nommé à chaque étape). Exécuté sur l'appli DÉPLOYÉE, données réelles (prix officiels, IGN, ADEME). Captures dans `tests/e2e/screenshots/m1/`.


## US-1.1 — Ouvrir les prix

En tant que conducteur, je touche l'onglet Prix pour voir les stations autour de moi.

1. Partir de : l'appli ouverte sur l'onglet Trajets (écran Prix) — capture `US-1.1-01-ouvrir-les-prix-avant.png`
2. Faire : je touche l'onglet Prix ; constater : la carte et la liste des stations autour de ma position s'affichent — capture `US-1.1-02-ouvrir-les-prix-apres.png`
3. Partir de : la position refusée (écran Prix) — capture `US-1.1-03-ouvrir-les-prix-avant.png`
4. Faire : l'onglet Prix s'ouvre ; constater : la carte est centrée sur la dernière ville saisie ou sur Albi par défaut, avec un message pour activer la localisation — capture `US-1.1-04-ouvrir-les-prix-apres.png`


## US-1.2 — Choisir mon carburant

En tant que conducteur, je choisis mon carburant dans le sélecteur pour ne voir que les prix qui me concernent.

1. Partir de : la liste en SP95-E10 (écran Prix) — capture `US-1.2-01-choisir-mon-carburant-avant.png`
2. Faire : je touche Gazole dans le sélecteur de carburant ; constater : chaque pastille et chaque ligne affichent le prix gazole et le titre devient « Stations · Gazole » — capture `US-1.2-02-choisir-mon-carburant-apres.png`
3. Partir de : une station qui ne vend pas le carburant choisi (écran Prix) — capture `US-1.2-03-choisir-mon-carburant-avant.png`
4. Faire : je change de carburant ; constater : elle disparaît de la carte et de la liste — capture `US-1.2-04-choisir-mon-carburant-apres.png`


## US-1.3 — Voir les stations sur la carte

En tant que conducteur, je regarde la carte des stations pour repérer où elles sont.

1. Partir de : des stations synchronisées dans un rayon de 10 km (écran Prix) — capture `US-1.3-01-voir-les-stations-sur-la-carte-avant.png`
2. Faire : la carte des stations s'affiche ; constater : chaque station est une pastille à sa position réelle avec son prix — capture `US-1.3-02-voir-les-stations-sur-la-carte-apres.png`
3. Partir de : je déplace la carte (écran Prix) — capture `US-1.3-03-voir-les-stations-sur-la-carte-avant.png`
4. Faire : je relâche ; constater : les stations de la nouvelle zone se chargent — capture `US-1.3-04-voir-les-stations-sur-la-carte-apres.png`


## US-1.4 — Toucher une pastille

En tant que conducteur, je touche la pastille d'une station sur la carte pour ouvrir sa fiche.

1. Partir de : la carte affichée (écran Prix) — capture `US-1.4-01-toucher-une-pastille-avant.png`
2. Faire : je touche une pastille de station ; constater : la fiche de cette station s'ouvre — capture `US-1.4-02-toucher-une-pastille-apres.png`
3. Partir de : des prix différents autour de moi (écran Prix) — capture `US-1.4-03-toucher-une-pastille-avant.png`
4. Faire : la carte s'affiche ; constater : les pastilles de la moitié la moins chère sont marquées vert, les autres orange — capture `US-1.4-04-toucher-une-pastille-apres.png`


## US-1.5 — Trier la liste

En tant que conducteur, je trie la liste par prix ou par distance.

1. Partir de : la liste triée par prix (écran Prix) — capture `US-1.5-01-trier-la-liste-avant.png`
2. Faire : je touche « Plus proche » dans le tri de la liste ; constater : la liste se trie par distance croissante — capture `US-1.5-02-trier-la-liste-apres.png`
3. Partir de : le tri par distance (écran Prix) — capture `US-1.5-03-trier-la-liste-avant.png`
4. Faire : je touche « Moins cher » ; constater : la liste se retrie par prix croissant — capture `US-1.5-04-trier-la-liste-apres.png`


## US-1.6 — Lire une station dans la liste

En tant que conducteur, je lis la liste des stations triée et touche une ligne de station pour voir sa fiche.

1. Partir de : la liste affichée (écran Prix) — capture `US-1.6-01-lire-une-station-dans-la-liste-avant.png`
2. Faire : je lis une ligne de station ; constater : je vois enseigne, distance, ancienneté du prix, écart à la moyenne France et le prix à trois décimales — capture `US-1.6-02-lire-une-station-dans-la-liste-apres.png`
3. Partir de : une ligne de station (écran Prix) — capture `US-1.6-03-lire-une-station-dans-la-liste-avant.png`
4. Faire : je la touche ; constater : sa fiche s'ouvre — capture `US-1.6-04-lire-une-station-dans-la-liste-apres.png`


## US-2.1 — Fermer la fiche

En tant que conducteur, je ferme la fiche station pour revenir à la carte.

1. Partir de : une fiche station ouverte (écran Fiche station) — capture `US-2.1-01-fermer-la-fiche-avant.png`
2. Faire : je touche le bouton fermer la fiche ou la touche Échap ; constater : la fiche se ferme et le carburant choisi n'a pas changé — capture `US-2.1-02-fermer-la-fiche-apres.png`


## US-2.2 — Calculer un trajet vers la station

En tant que conducteur, je lance un trajet vers cette station depuis sa fiche.

1. Partir de : la fiche d'une station (écran Fiche station) — capture `US-2.2-01-calculer-un-trajet-vers-la-station-avant.png`
2. Faire : je touche « Coût d'un trajet jusqu'ici » (bouton trajet station) ; constater : l'onglet Trajets s'ouvre avec l'arrivée pré-remplie à l'adresse de la station (position GPS connue : le départ est aussi pré-rempli par ma commune, il ne reste qu'à toucher « Calculer le coût ») — capture `US-2.2-02-calculer-un-trajet-vers-la-station-apres.png`


## US-1.E1 — Source des prix injoignable

En tant que conducteur, si les prix ne peuvent pas être chargés, je vois un message clair et un bouton Réessayer.

**Cas limite.** Mise en place : page.route('**/rest/v1/prix*', r => r.abort()) — erreur réseau sur la lecture des prix

1. Mettre en place : la lecture des prix en erreur réseau (écran Prix) — capture `US-1.E1-E1-01-declencheur.png`
2. Action : l'écran Prix s'ouvre — capture `US-1.E1-E1-02-resultat.png`
3. Vérifier : un message « Prix indisponibles pour l'instant » et un bouton Réessayer s'affichent à la place de la liste ; puis rétablir le réseau / les données et vérifier le retour à l'état normal — capture `US-1.E1-E1-03-retour.png`


## US-1.E2 — Aucune station pour ce carburant

En tant que conducteur, si aucune station proche ne vend mon carburant, la liste me le dit.

**Cas limite.** Mise en place : page.route('**/rest/v1/prix*carburant=eq.E85*', r => r.fulfill({status:200, body:'[]'})) — zéro station E85

1. Mettre en place : aucune station du rayon ne vend E85 (écran Prix) — capture `US-1.E2-E1-01-declencheur.png`
2. Action : je choisis E85 dans le sélecteur de carburant — capture `US-1.E2-E1-02-resultat.png`
3. Vérifier : la liste affiche « Aucune station ne vend ce carburant autour de vous » et la carte n'a aucune pastille ; puis rétablir le réseau / les données et vérifier le retour à l'état normal — capture `US-1.E2-E1-03-retour.png`


## US-1.E3 — Prix ancien signalé

En tant que conducteur, je repère un prix qui n'a pas été mis à jour depuis plus de 48 h.

**Cas limite.** Mise en place : données de test : une station dont `maj` = maintenant − 72 h (insérée par la fixture Supabase de test)

1. Mettre en place : une station dont le prix date de plus de 48 h (écran Prix) — capture `US-1.E3-E1-01-declencheur.png`
2. Action : la liste s'affiche — capture `US-1.E3-E1-02-resultat.png`
3. Vérifier : sa ligne de station porte la mention « prix du JJ/MM » en couleur atténuée ; puis rétablir le réseau / les données et vérifier le retour à l'état normal — capture `US-1.E3-E1-03-retour.png`


## US-1.E4 — Station en rupture

En tant que conducteur, je ne vois pas comme disponible un carburant en rupture.

**Cas limite.** Mise en place : données de test : une station avec `rupture` gazole active

1. Mettre en place : une station en rupture temporaire de gazole (écran Prix) — capture `US-1.E4-E1-01-declencheur.png`
2. Action : je choisis Gazole — capture `US-1.E4-E1-02-resultat.png`
3. Vérifier : elle n'apparaît pas dans la liste triée par prix ; puis rétablir le réseau / les données et vérifier le retour à l'état normal — capture `US-1.E4-E1-03-retour.png`


## US-2.E1 — Carburant non vendu dans la fiche

En tant que conducteur, la fiche me dit quels carburants la station ne vend pas.

**Cas limite.** Mise en place : données de test : une station sans ligne GPLc

1. Mettre en place : une station sans GPLc (écran Fiche station) — capture `US-2.E1-E1-01-declencheur.png`
2. Action : j'ouvre sa fiche — capture `US-2.E1-E1-02-resultat.png`
3. Vérifier : la ligne GPLc affiche « non vendu » au lieu d'un prix ; puis rétablir le réseau / les données et vérifier le retour à l'état normal — capture `US-2.E1-E1-03-retour.png`


## US-1.P1 — Recentrer sur ma position

En tant que conducteur qui a déplacé la carte des stations, je reviens à ma position.

1. Partir de : la carte déplacée (écran Prix) — capture `US-1.P1-01-recentrer-sur-ma-position-avant.png`
2. Faire : je touche le bouton de recentrage de la carte des stations ; constater : la carte revient sur ma position et la liste se recharge — capture `US-1.P1-02-recentrer-sur-ma-position-apres.png`


## Histoires transverses vérifiées sur ce jalon

- **US-A11Y-001 — Navigation au clavier** : 1. sur chaque écran du jalon, j'utilise Tab et Maj+Tab — capture `US-A11Y-001-01-m1.png` ; 2. constater : chaque contrôle reçoit le focus dans l'ordre de lecture avec un contour visible — capture `US-A11Y-001-02-m1.png`
- **US-A11Y-002 — Focus de la fiche** : 1. sur chaque écran du jalon, elle s'ouvre — capture `US-A11Y-002-01-m1.png` ; 2. constater : le focus va sur son titre ; à la fermeture il revient sur l'élément qui l'a ouverte — capture `US-A11Y-002-02-m1.png`
- **US-A11Y-003 — Touche Échap** : 1. sur chaque écran du jalon, j'appuie sur Échap — capture `US-A11Y-003-01-m1.png` ; 2. constater : la fiche se ferme — capture `US-A11Y-003-02-m1.png`
- **US-A11Y-004 — Libellés lisibles** : 1. sur chaque écran du jalon, je parcours les pastilles et les prix — capture `US-A11Y-004-01-m1.png` ; 2. constater : chaque pastille annonce station et prix en euros, chaque bouton icône a un libellé — capture `US-A11Y-004-02-m1.png`
- **US-PERF-001 — Ouverture rapide** : 1. sur chaque écran du jalon, j'ouvre l'appli — capture `US-PERF-001-01-m1.png` ; 2. constater : la liste des stations est affichée en moins de 2,5 s — capture `US-PERF-001-02-m1.png`
