# Jalon 2 — Le coût d'un trajet : plan de cas d'usage

**Démonstration** : Je choisis ma voiture, je calcule Albi → Bordeaux, je vois le coût, les tronçons et leur consommation, je mets mon prix, je retrouve le trajet dans l'historique.

**Écrans possédés** : S3 Trajets, S4 Résultat du trajet

Référence visuelle : `docs/pipeline/design/mockup.html` (écran nommé à chaque étape). Exécuté sur l'appli DÉPLOYÉE, données réelles (prix officiels, IGN, ADEME). Captures dans `tests/e2e/screenshots/m2/`.


## US-3.1 — Ouvrir les trajets

En tant que conducteur, je touche l'onglet Trajets pour estimer le coût d'un trajet.

1. Partir de : l'onglet Prix (écran Trajets) — capture `US-3.1-01-ouvrir-les-trajets-avant.png`
2. Faire : je touche l'onglet Trajets ; constater : le formulaire et l'historique s'affichent — capture `US-3.1-02-ouvrir-les-trajets-apres.png`


## US-3.2 — Saisir le départ

En tant que conducteur, je saisis mon lieu de départ.

1. Partir de : le champ départ vide (écran Trajets ; position GPS connue, il est pré-rempli par ma commune : je l'efface, ou je tape par-dessus, le texte étant sélectionné au toucher) — capture `US-3.2-01-saisir-le-dpart-avant.png`
2. Faire : je tape « Alb » ; constater : des propositions de lieux apparaissent et je peux en choisir une — capture `US-3.2-02-saisir-le-dpart-apres.png`


## US-3.3 — Saisir l'arrivée

En tant que conducteur, je saisis mon lieu d'arrivée.

1. Partir de : le champ arrivée vide (écran Trajets) — capture `US-3.3-01-saisir-l-arrive-avant.png`
2. Faire : je tape « Bord » ; constater : des propositions de lieux apparaissent et je peux en choisir une — capture `US-3.3-02-saisir-l-arrive-apres.png`


## US-3.4 — Choisir ma voiture

En tant que conducteur, je choisis ma voiture par marque, modèle et motorisation, et l'appli s'en souvient.

1. Partir de : aucune voiture mémorisée (écran Trajets) — capture `US-3.4-01-choisir-ma-voiture-avant.png`
2. Faire : je choisis Peugeot, puis 208, puis une motorisation ; constater : la voiture est enregistrée et son carburant est affiché — capture `US-3.4-02-choisir-ma-voiture-apres.png`
3. Partir de : une voiture mémorisée (écran Trajets) — capture `US-3.4-03-choisir-ma-voiture-avant.png`
4. Faire : je rouvre l'appli ; constater : le choix de voiture est pré-rempli — capture `US-3.4-04-choisir-ma-voiture-apres.png`


## US-3.5 — Calculer le coût

En tant que conducteur, je touche Calculer pour obtenir le coût estimé du trajet.

1. Partir de : départ, arrivée et voiture renseignés (écran Trajets) — capture `US-3.5-01-calculer-le-cot-avant.png`
2. Faire : je touche le bouton calculer ; constater : le résultat s'affiche avec coût, litres, km et L/100 km — capture `US-3.5-02-calculer-le-cot-apres.png`


## US-3.6 — Rejouer un ancien trajet

En tant que conducteur, je touche un trajet de l'historique pour le recalculer au prix du jour.

1. Partir de : un trajet dans l'historique (écran Trajets) — capture `US-3.6-01-rejouer-un-ancien-trajet-avant.png`
2. Faire : je touche sa ligne historique ; constater : le trajet est recalculé au prix moyen du jour et le résultat s'affiche — capture `US-3.6-02-rejouer-un-ancien-trajet-apres.png`


## US-3.7 — Supprimer un trajet

En tant que conducteur, je supprime un trajet de l'historique.

1. Partir de : un trajet dans l'historique (écran Trajets) — capture `US-3.7-01-supprimer-un-trajet-avant.png`
2. Faire : je touche sa croix supprimer trajet ; constater : la ligne disparaît et ne revient pas au rechargement — capture `US-3.7-02-supprimer-un-trajet-apres.png`


## US-4.1 — Comprendre le calcul

En tant que conducteur, je déplie un tronçon du trajet pour voir d'où vient la consommation.

1. Partir de : un résultat affiché (écran Résultat du trajet) — capture `US-4.1-01-comprendre-le-calcul-avant.png`
2. Faire : je touche un tronçon du trajet ; constater : il se déplie et montre vitesse typique, arrêts ou dénivelé, et L/100 km sur ce tronçon — capture `US-4.1-02-comprendre-le-calcul-apres.png`
3. Partir de : un tronçon déplié (écran Résultat du trajet) — capture `US-4.1-03-comprendre-le-calcul-avant.png`
4. Faire : je le touche à nouveau ; constater : il se replie — capture `US-4.1-04-comprendre-le-calcul-apres.png`


## US-4.2 — Mettre mon propre prix

En tant que conducteur, je saisis mon prix perso au litre pour recalculer le coût.

1. Partir de : un résultat au prix moyen France (écran Résultat du trajet) — capture `US-4.2-01-mettre-mon-propre-prix-avant.png`
2. Faire : je touche « Mettre mon prix » (prix perso : le champ est déjà affiché, le toucher y place le curseur) et je saisis 1,699 ; constater : le coût est recalculé avec 1,699 €/L et le libellé devient « Mon prix » — capture `US-4.2-02-mettre-mon-propre-prix-apres.png`
3. Partir de : un prix perso saisi (écran Résultat du trajet) — capture `US-4.2-03-mettre-mon-propre-prix-avant.png`
4. Faire : je touche « Revenir à la moyenne » ; constater : le coût revient à la moyenne nationale — capture `US-4.2-04-mettre-mon-propre-prix-apres.png`


## US-4.3 — Revenir aux trajets

En tant que conducteur, je reviens aux trajets ; le calcul a rejoint l'historique.

1. Partir de : un résultat affiché (écran Résultat du trajet) — capture `US-4.3-01-revenir-aux-trajets-avant.png`
2. Faire : je touche le bouton retour trajets ; constater : le formulaire s'affiche et ce trajet est en tête de l'historique — capture `US-4.3-02-revenir-aux-trajets-apres.png`


## US-3.E1 — Lieu introuvable

En tant que conducteur, si un lieu n'est pas trouvé, on me le dit avant de calculer.

**Cas limite.** Mise en place : page.route('**/geocodage/**', r => r.fulfill({status:200, body:'{"features":[]}'})) — lieu introuvable

1. Mettre en place : une arrivée « zzzz » sans résultat (écran Trajets) — capture `US-3.E1-E1-01-declencheur.png`
2. Action : je touche le bouton calculer — capture `US-3.E1-E1-02-resultat.png`
3. Vérifier : le champ arrivée est signalé « Lieu introuvable » et aucun calcul n'est lancé ; puis rétablir le réseau / les données et vérifier le retour à l'état normal — capture `US-3.E1-E1-03-retour.png`


## US-3.E2 — Formulaire incomplet

En tant que conducteur, je ne peux pas calculer sans départ, arrivée et voiture.

**Cas limite.** Mise en place : préférences vidées (nouvel identifiant anonyme)

1. Mettre en place : aucune voiture choisie (écran Trajets) — capture `US-3.E2-E1-01-declencheur.png`
2. Action : je touche le bouton calculer — capture `US-3.E2-E1-02-resultat.png`
3. Vérifier : le choix de voiture est signalé « Choisis ta voiture » et aucun calcul n'est lancé ; puis rétablir le réseau / les données et vérifier le retour à l'état normal — capture `US-3.E2-E1-03-retour.png`


## US-3.E3 — Historique vide

En tant que nouvel utilisateur, je comprends que l'historique se remplira.

**Cas limite.** Mise en place : nouvel identifiant anonyme, aucun trajet

1. Mettre en place : aucun trajet calculé (écran Trajets) — capture `US-3.E3-E1-01-declencheur.png`
2. Action : j'ouvre l'onglet Trajets — capture `US-3.E3-E1-02-resultat.png`
3. Vérifier : l'historique affiche « Aucun trajet pour l'instant » avec une invitation à calculer le premier ; puis rétablir le réseau / les données et vérifier le retour à l'état normal — capture `US-3.E3-E1-03-retour.png`


## US-3.E4 — Voiture absente de la base

En tant que conducteur dont la motorisation n'est pas listée, je peux choisir la plus proche.

**Cas limite.** Mise en place : modèle Peugeot 208 réel de la base ADEME

1. Mettre en place : un modèle choisi (écran Trajets) — capture `US-3.E4-E1-01-declencheur.png`
2. Action : j'ouvre la liste des motorisations — capture `US-3.E4-E1-02-resultat.png`
3. Vérifier : elles sont classées par puissance avec leur carburant, et la plus proche de la puissance moyenne est proposée en premier ; puis rétablir le réseau / les données et vérifier le retour à l'état normal — capture `US-3.E4-E1-03-retour.png`


## US-4.E1 — Itinéraire impossible

En tant que conducteur, si aucun itinéraire routier n'existe, je le sais.

**Cas limite.** Mise en place : page.route('**/functions/v1/estimer-trajet', r => r.fulfill({status:422, body:'{"erreur":"pas_itineraire"}'}))

1. Mettre en place : une arrivée en Corse depuis Albi (écran Résultat du trajet) — capture `US-4.E1-E1-01-declencheur.png`
2. Action : je lance le calcul — capture `US-4.E1-E1-02-resultat.png`
3. Vérifier : le résultat affiche « Pas d'itinéraire routier entre ces deux lieux » sans coût ; puis rétablir le réseau / les données et vérifier le retour à l'état normal — capture `US-4.E1-E1-03-retour.png`


## US-4.E2 — Prix perso invalide

En tant que conducteur, une saisie de prix aberrante est refusée.

**Cas limite.** Mise en place : saisie clavier « 12 » puis « abc »

1. Mettre en place : le champ prix perso ouvert (écran Résultat du trajet) — capture `US-4.E2-E1-01-declencheur.png`
2. Action : je saisis 12 ou une lettre — capture `US-4.E2-E1-02-resultat.png`
3. Vérifier : le champ est signalé « Entre un prix entre 0,50 et 4,00 €/L » et le coût reste celui d'avant ; puis rétablir le réseau / les données et vérifier le retour à l'état normal — capture `US-4.E2-E1-03-retour.png`


## US-4.E3 — Calcul trop long

En tant que conducteur, je vois que le calcul est en cours et je peux l'abandonner.

**Cas limite.** Mise en place : page.route('**/functions/v1/estimer-trajet', async r => { await new Promise(x=>setTimeout(x,3000)); r.continue(); }) — calcul lent

1. Mettre en place : un calcul qui dure plus d'une seconde (écran Résultat du trajet) — capture `US-4.E3-E1-01-declencheur.png`
2. Action : j'attends — capture `US-4.E3-E1-02-resultat.png`
3. Vérifier : un état « Calcul de l'itinéraire… » s'affiche avec un bouton Annuler qui ramène au formulaire ; puis rétablir le réseau / les données et vérifier le retour à l'état normal — capture `US-4.E3-E1-03-retour.png`


## US-3.P1 — Inverser départ et arrivée

En tant que conducteur, j'inverse départ et arrivée pour le retour.

1. Partir de : départ Albi et arrivée Bordeaux (écran Trajets) — capture `US-3.P1-01-inverser-dpart-et-arrive-avant.png`
2. Faire : je touche le bouton d'inversion entre champ départ et champ arrivée ; constater : le départ devient Bordeaux et l'arrivée Albi — capture `US-3.P1-02-inverser-dpart-et-arrive-apres.png`


## US-3.P2 — Changer de voiture

En tant que conducteur, je change la voiture mémorisée.

1. Partir de : une voiture mémorisée (écran Trajets) — capture `US-3.P2-01-changer-de-voiture-avant.png`
2. Faire : je choisis une autre marque dans le choix de voiture ; constater : modèle et motorisation se réinitialisent et la nouvelle voiture est mémorisée — capture `US-3.P2-02-changer-de-voiture-apres.png`


## Histoires transverses vérifiées sur ce jalon

- **US-A11Y-001 — Navigation au clavier** : 1. sur chaque écran du jalon, j'utilise Tab et Maj+Tab — capture `US-A11Y-001-01-m2.png` ; 2. constater : chaque contrôle reçoit le focus dans l'ordre de lecture avec un contour visible — capture `US-A11Y-001-02-m2.png`
- **US-A11Y-002 — Focus de la fiche** : 1. sur chaque écran du jalon, elle s'ouvre — capture `US-A11Y-002-01-m2.png` ; 2. constater : le focus va sur son titre ; à la fermeture il revient sur l'élément qui l'a ouverte — capture `US-A11Y-002-02-m2.png`
- **US-A11Y-003 — Touche Échap** : 1. sur chaque écran du jalon, j'appuie sur Échap — capture `US-A11Y-003-01-m2.png` ; 2. constater : la fiche se ferme — capture `US-A11Y-003-02-m2.png`
- **US-A11Y-004 — Libellés lisibles** : 1. sur chaque écran du jalon, je parcours les pastilles et les prix — capture `US-A11Y-004-01-m2.png` ; 2. constater : chaque pastille annonce station et prix en euros, chaque bouton icône a un libellé — capture `US-A11Y-004-02-m2.png`
- **US-PERF-001 — Ouverture rapide** : 1. sur chaque écran du jalon, j'ouvre l'appli — capture `US-PERF-001-01-m2.png` ; 2. constater : la liste des stations est affichée en moins de 2,5 s — capture `US-PERF-001-02-m2.png`
