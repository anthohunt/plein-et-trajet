# Jalon 1 — Les prix autour de moi : plan de cas d'usage

**Démonstration** : J'ouvre l'appli à Albi, je vois les vraies stations sur la carte et dans la liste avec leurs prix officiels du jour, je change de carburant, je trie, j'ouvre une fiche.

**Écrans possédés** : S1 Prix, S2 Fiche station · traversés : S3 Trajets (en V1 : onglet Stations T5 et sa fiche)

Référence visuelle : `docs/pipeline/design/mockup.html` (écran nommé à chaque étape). Exécuté sur l'appli DÉPLOYÉE, données réelles (prix officiels, IGN, ADEME). Captures de livraison dans `tests/e2e/final/` (celles du build : `tests/e2e/screenshots/m1/`).

> **Livraison (2026-10-22)** : les histoires retirées de la V1 ont été ôtées de ce plan (liste et raisons : `docs/pipeline/reconciliation-report.md` ; plan d'origine dans l'historique git). Les étapes restantes ont été rejouées sur l'appli finale ; captures de livraison dans `tests/e2e/final/`.

## US-1.4 — Toucher une pastille

En tant que conducteur, je touche la pastille d'une station sur la carte pour ouvrir sa fiche.

1. Partir de : la carte affichée (écran Stations) — capture `US-1.4-01-toucher-une-pastille-avant.png`
2. Faire : je touche une pastille de station ; constater : la fiche de cette station s'ouvre — capture `US-1.4-02-toucher-une-pastille-apres.png`
3. Partir de : des prix différents autour de moi (écran Stations) — capture `US-1.4-03-toucher-une-pastille-avant.png`
4. Faire : la carte s'affiche ; constater : les pastilles de la moitié la moins chère sont marquées vert, les autres orange — capture `US-1.4-04-toucher-une-pastille-apres.png`


## US-1.6 — Lire une station dans la liste

En tant que conducteur, je lis la liste des stations triée et touche une ligne de station pour voir sa fiche.

1. Partir de : la liste affichée (écran Stations) — capture `US-1.6-01-lire-une-station-dans-la-liste-avant.png`
2. Faire : je lis une ligne de station ; constater : je vois enseigne, distance, ancienneté du prix, écart à la moyenne France et le prix à trois décimales — capture `US-1.6-02-lire-une-station-dans-la-liste-apres.png`
3. Partir de : une ligne de station (écran Stations) — capture `US-1.6-03-lire-une-station-dans-la-liste-avant.png`
4. Faire : je la touche ; constater : sa fiche s'ouvre — capture `US-1.6-04-lire-une-station-dans-la-liste-apres.png`


## US-2.1 — Fermer la fiche

En tant que conducteur, je ferme la fiche station pour revenir à la carte.

1. Partir de : une fiche station ouverte (écran Fiche station) — capture `US-2.1-01-fermer-la-fiche-avant.png`
2. Faire : je touche le bouton fermer la fiche ou la touche Échap ; constater : la fiche se ferme et le carburant choisi n'a pas changé — capture `US-2.1-02-fermer-la-fiche-apres.png`


## US-1.E1 — Source des prix injoignable

En tant que conducteur, si les prix ne peuvent pas être chargés, je vois un message clair et un bouton Réessayer.

**Cas limite.** Mise en place : page.route('**/rest/v1/prix*', r => r.abort()) — erreur réseau sur la lecture des prix

1. Mettre en place : la lecture des prix en erreur réseau (écran Stations) — capture `US-1.E1-E1-01-declencheur.png`
2. Action : l'écran Stations s'ouvre — capture `US-1.E1-E1-02-resultat.png`
3. Vérifier : un message « Prix indisponibles pour l'instant » et un bouton Réessayer s'affichent à la place de la liste ; puis rétablir le réseau / les données et vérifier le retour à l'état normal — capture `US-1.E1-E1-03-retour.png`


## US-1.E2 — Aucune station pour ce carburant

En tant que conducteur, si aucune station proche ne vend mon carburant, la liste me le dit.

**Cas limite.** Mise en place : page.route('**/rest/v1/prix*carburant=eq.E85*', r => r.fulfill({status:200, body:'[]'})) — zéro station E85

1. Mettre en place : aucune station du rayon ne vend E85 (écran Stations) — capture `US-1.E2-E1-01-declencheur.png`
2. Action : je choisis E85 dans le sélecteur de carburant — capture `US-1.E2-E1-02-resultat.png`
3. Vérifier : la liste affiche « Aucune station ne vend ce carburant autour de vous » et la carte n'a aucune pastille ; puis rétablir le réseau / les données et vérifier le retour à l'état normal — capture `US-1.E2-E1-03-retour.png`


## US-1.E3 — Prix ancien signalé

En tant que conducteur, je repère un prix qui n'a pas été mis à jour depuis plus de 48 h.

**Cas limite.** Mise en place : données de test : une station dont `maj` = maintenant − 72 h (vraie station du jour, rien n'est écrit en base à la livraison)

1. Mettre en place : une station dont le prix date de plus de 48 h (écran Stations) — capture `US-1.E3-E1-01-declencheur.png`
2. Action : la liste s'affiche — capture `US-1.E3-E1-02-resultat.png`
3. Vérifier : sa ligne de station porte la mention « prix du JJ/MM » en couleur atténuée ; puis rétablir le réseau / les données et vérifier le retour à l'état normal — capture `US-1.E3-E1-03-retour.png`


## US-1.E4 — Station en rupture

En tant que conducteur, je ne vois pas comme disponible un carburant en rupture.

**Cas limite.** Mise en place : données de test : une station avec `rupture` gazole active

1. Mettre en place : une station en rupture temporaire de gazole (écran Stations) — capture `US-1.E4-E1-01-declencheur.png`
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

1. Partir de : la carte déplacée (écran Stations) — capture `US-1.P1-01-recentrer-sur-ma-position-avant.png`
2. Faire : je touche le bouton de recentrage de la carte des stations ; constater : la carte revient sur ma position et la liste se recharge — capture `US-1.P1-02-recentrer-sur-ma-position-apres.png`


## Histoires transverses vérifiées sur ce jalon

- **US-A11Y-001 — Navigation au clavier** : 1. sur chaque écran du jalon, j'utilise Tab et Maj+Tab — capture `US-A11Y-001-01-m1.png` ; 2. constater : chaque contrôle reçoit le focus dans l'ordre de lecture avec un contour visible — capture `US-A11Y-001-02-m1.png`
- **US-A11Y-002 — Focus de la fiche** : 1. sur chaque écran du jalon, elle s'ouvre — capture `US-A11Y-002-01-m1.png` ; 2. constater : le focus va sur son titre ; à la fermeture il revient sur l'élément qui l'a ouverte — capture `US-A11Y-002-02-m1.png`
- **US-A11Y-003 — Touche Échap** : 1. sur chaque écran du jalon, j'appuie sur Échap — capture `US-A11Y-003-01-m1.png` ; 2. constater : la fiche se ferme — capture `US-A11Y-003-02-m1.png`
- **US-A11Y-004 — Libellés lisibles** : 1. sur chaque écran du jalon, je parcours les pastilles et les prix — capture `US-A11Y-004-01-m1.png` ; 2. constater : chaque pastille annonce station et prix en euros, chaque bouton icône a un libellé — capture `US-A11Y-004-02-m1.png`
- **US-PERF-001 — Ouverture rapide** : 1. sur chaque écran du jalon, j'ouvre l'appli — capture `US-PERF-001-01-m1.png` ; 2. constater : la liste des stations est affichée en moins de 2,5 s — capture `US-PERF-001-02-m1.png`
