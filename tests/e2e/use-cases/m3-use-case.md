# Jalon 3 — Péages et Europe : plan de cas d'usage

**Démonstration** : Je calcule Albi → Barcelone puis Albi → Milan : le coût total ajoute les péages réels, chaque pays traversé a son prix moyen du jour, et à Barcelone la carte montre les stations espagnoles.

**Écrans possédés** :  · traversés : S1 Prix, S3 Trajets, S4 Résultat du trajet

Référence visuelle : `docs/pipeline/design/mockup.html` (écran nommé à chaque étape). Exécuté sur l'appli DÉPLOYÉE, données réelles (prix officiels, IGN, ADEME). Captures dans `tests/e2e/screenshots/m3/`.


## US-3.8 — Partir à l'étranger

En tant que conducteur, je saisis une arrivée à l'étranger et l'appli calcule le trajet à travers l'Europe.

1. Partir de : le champ arrivée (écran Trajets) — capture `US-3.8-01-partir-l-tranger-avant.png`
2. Faire : je tape « Barce » et choisis Barcelone, Espagne ; constater : le calcul aboutit avec un itinéraire qui traverse la France puis l'Espagne — capture `US-3.8-02-partir-l-tranger-apres.png`


## US-4.4 — Voir les péages

En tant que conducteur, je vois le détail des péages du trajet et leur total, inclus dans le coût.

1. Partir de : un trajet Albi → Barcelone calculé (écran Résultat du trajet) — capture `US-4.4-01-voir-les-pages-avant.png`
2. Faire : je lis le détail des péages ; constater : chaque section payante affiche son montant TTC en euros (« gratuit » si 0), le total des péages est affiché et ajouté au coût total — capture `US-4.4-02-voir-les-pages-apres.png`
3. Partir de : un trajet sans autoroute payante (écran Résultat du trajet) — capture `US-4.4-03-voir-les-pages-avant.png`
4. Faire : le résultat s'affiche ; constater : le détail des péages indique « Aucun péage sur cet itinéraire » et 0,00 € — capture `US-4.4-04-voir-les-pages-apres.png`


## US-4.5 — Voir les pays traversés

En tant que conducteur, je vois pour chaque pays traversé les km, les litres et le prix moyen du jour appliqué.

1. Partir de : un trajet Albi → Milan calculé (écran Résultat du trajet) — capture `US-4.5-01-voir-les-pays-traverss-avant.png`
2. Faire : je lis les pays traversés ; constater : chaque pays affiche km, litres, prix moyen du jour de son carburant et coût, et la somme des coûts pays égale le coût carburant — capture `US-4.5-02-voir-les-pays-traverss-apres.png`


## US-4.E4 — Péages indisponibles

En tant que conducteur, si le calcul des péages échoue, j'obtiens quand même le coût carburant.

**Cas limite.** Mise en place : page.route('**/functions/v1/estimer-trajet', r => r.fulfill({status:200, body: corps_sans_peages_avec_erreur_peages}))

1. Mettre en place : le service de péages en erreur (écran Résultat du trajet) — capture `US-4.E4-E1-01-declencheur.png`
2. Action : je lance un calcul — capture `US-4.E4-E1-02-resultat.png`
3. Vérifier : le coût carburant s'affiche et le détail des péages indique « Péages non disponibles pour l'instant » sans les ajouter au total ; puis rétablir le réseau / les données et vérifier le retour à l'état normal — capture `US-4.E4-E1-03-retour.png`


## US-4.E5 — Vignette sur le trajet

En tant que conducteur traversant la Suisse ou l'Autriche, je suis prévenu qu'une vignette est exigée.

**Cas limite.** Mise en place : trajet réel Albi → Milan via Genève (traverse la Suisse)

1. Mettre en place : un trajet qui traverse la Suisse (écran Résultat du trajet) — capture `US-4.E5-E1-01-declencheur.png`
2. Action : le résultat s'affiche — capture `US-4.E5-E1-02-resultat.png`
3. Vérifier : le détail des péages porte la ligne « Vignette suisse obligatoire (non comptée) » ; puis rétablir le réseau / les données et vérifier le retour à l'état normal — capture `US-4.E5-E1-03-retour.png`


## US-4.E6 — Pays sans prix moyen

En tant que conducteur, si un pays traversé n'a pas de prix moyen connu, je le sais.

**Cas limite.** Mise en place : trajet réel vers Belgrade (Serbie, hors Bulletin pétrolier UE)

1. Mettre en place : un pays traversé absent des moyennes (ex. Serbie) (écran Résultat du trajet) — capture `US-4.E6-E1-01-declencheur.png`
2. Action : le résultat s'affiche — capture `US-4.E6-E1-02-resultat.png`
3. Vérifier : sa ligne dans les pays traversés porte « prix non publié — moyenne européenne appliquée » et le prix utilisé ; puis rétablir le réseau / les données et vérifier le retour à l'état normal — capture `US-4.E6-E1-03-retour.png`


## US-1.8 — Stations hors de France

En tant que conducteur à l'étranger, je vois les stations du pays où je suis s'il publie ses prix.

1. Partir de : ma position à Barcelone (écran Prix) — capture `US-1.8-01-stations-hors-de-france-avant.png`
2. Faire : j'ouvre l'onglet Prix ; constater : la carte des stations et la liste affichent les stations espagnoles avec leurs prix officiels — capture `US-1.8-02-stations-hors-de-france-apres.png`
3. Partir de : ma position dans un pays qui ne publie pas ses prix (écran Prix) — capture `US-1.8-03-stations-hors-de-france-avant.png`
4. Faire : j'ouvre l'onglet Prix ; constater : un message indique « Ce pays ne publie pas les prix station par station » et affiche le prix moyen national — capture `US-1.8-04-stations-hors-de-france-apres.png`


## Histoires transverses vérifiées sur ce jalon

- **US-A11Y-001 — Navigation au clavier** : 1. sur chaque écran du jalon, j'utilise Tab et Maj+Tab — capture `US-A11Y-001-01-m3.png` ; 2. constater : chaque contrôle reçoit le focus dans l'ordre de lecture avec un contour visible — capture `US-A11Y-001-02-m3.png`
- **US-A11Y-002 — Focus de la fiche** : 1. sur chaque écran du jalon, elle s'ouvre — capture `US-A11Y-002-01-m3.png` ; 2. constater : le focus va sur son titre ; à la fermeture il revient sur l'élément qui l'a ouverte — capture `US-A11Y-002-02-m3.png`
- **US-A11Y-003 — Touche Échap** : 1. sur chaque écran du jalon, j'appuie sur Échap — capture `US-A11Y-003-01-m3.png` ; 2. constater : la fiche se ferme — capture `US-A11Y-003-02-m3.png`
- **US-A11Y-004 — Libellés lisibles** : 1. sur chaque écran du jalon, je parcours les pastilles et les prix — capture `US-A11Y-004-01-m3.png` ; 2. constater : chaque pastille annonce station et prix en euros, chaque bouton icône a un libellé — capture `US-A11Y-004-02-m3.png`
- **US-PERF-001 — Ouverture rapide** : 1. sur chaque écran du jalon, j'ouvre l'appli — capture `US-PERF-001-01-m3.png` ; 2. constater : la liste des stations est affichée en moins de 2,5 s — capture `US-PERF-001-02-m3.png`
