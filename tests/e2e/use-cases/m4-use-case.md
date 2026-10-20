# Jalon 4 — Enregistrer en roulant et Royaume-Uni : plan de cas d'usage

**Démonstration** : Je lance l'enregistrement, je roule (trajet GPS rejoué sur l'appli déployée), je suis ma vitesse et mon coût en direct, je fais une pause, j'arrête : le résultat est calculé sur ma vitesse réelle avec ma courbe ; puis je calcule Albi → Londres et je vois les stations de Londres.

**Écrans possédés** : S6 En route · traversés : S1 Prix, S3 Trajets, S4 Résultat du trajet

Référence visuelle : `docs/pipeline/design/mockup.html` (version 4). Exécuté sur l'appli DÉPLOYÉE. Le trajet roulé est un vrai tracé GPS enregistré (Albi → Toulouse, 1 point par seconde, fichier `tests/e2e/fixtures/albi-toulouse.gpx`) rejoué dans Playwright par la géolocalisation simulée du navigateur (`context.setGeolocation` à chaque seconde) — c'est la seule simulation, tout le calcul passe par les vrais services. Captures dans `tests/e2e/screenshots/m4/`.


## US-6.1 — Enregistrer en roulant

En tant que conducteur, avec la voiture choisie, je lance l'enregistrement de ma vitesse pendant que je roule.

1. Partir de : l'écran Trajets avec une voiture choisie (écran Trajets) — capture `US-6.1-01-avant.png`
2. Faire : j'appuie sur « Enregistrer en roulant » et que j'autorise la localisation ; constater : l'écran En route s'ouvre, l'enregistrement démarre et la voiture choisie est rappelée en haut — capture `US-6.1-02-apres.png`

## US-6.2 — Suivre en direct

En tant que conducteur, je vois en direct ma vitesse, la distance, la durée, les arrêts, les litres et le coût depuis le départ.

1. Partir de : un enregistrement en cours (écran En route) — capture `US-6.2-01-avant.png`
2. Faire : je roule ; constater : la vitesse (km/h) et sa courbe des dernières minutes se mettent à jour au moins toutes les 2 secondes, et la distance, la durée, les arrêts, les litres, les L/100 km et le coût carburant (prix moyen du jour du pays) augmentent en conséquence — capture `US-6.2-02-apres.png`

## US-6.3 — Garder l'écran allumé

En tant que conducteur, l'écran ne se met pas en veille pendant l'enregistrement et je vois si le GPS se perd.

1. Partir de : un enregistrement en cours (écran En route) — capture `US-6.3-01-avant.png`
2. Faire : le téléphone reste posé sans toucher l'écran ; constater : l'écran ne se met pas en veille (verrou d'écran du navigateur) — capture `US-6.3-02-apres.png`
3. Partir de : un enregistrement en cours (écran En route) — capture `US-6.3-03-avant.png`
4. Faire : le GPS ne donne plus de position pendant plus de 15 s ; constater : un message « GPS perdu » s'affiche et la distance n'augmente pas jusqu'au retour du signal — capture `US-6.3-04-apres.png`

## US-6.4 — Mettre en pause

En tant que conducteur, je mets l'enregistrement en pause pendant un arrêt (station, repas) sans compter de distance ni de consommation.

1. Partir de : un enregistrement en cours (écran En route) — capture `US-6.4-01-avant.png`
2. Faire : j'appuie sur « Pause » ; constater : l'indicateur passe à « En pause », la distance et les litres cessent d'augmenter, et « Reprendre » relance l'enregistrement — capture `US-6.4-02-apres.png`

## US-6.5 — Arrêter et voir le coût

En tant que conducteur, j'arrête l'enregistrement et j'obtiens le coût calculé sur ma vitesse réelle.

1. Partir de : un enregistrement de plus de 1 km (écran En route) — capture `US-6.5-01-avant.png`
2. Faire : j'appuie sur « Arrêter et voir le coût » ; constater : l'écran Résultat s'ouvre avec le titre « Départ → Arrivée · enregistré » (lieux retrouvés par géocodage inverse), le coût, les litres, les km, les péages réellement franchis, les pays traversés et les tronçons Autoroute / Route / Ville issus du tracé recalé sur la carte — capture `US-6.5-02-apres.png`
3. Partir de : ce résultat (écran En route) — capture `US-6.5-03-avant.png`
4. Faire : je reviens aux Trajets ; constater : le trajet enregistré est en tête de l'historique — capture `US-6.5-04-apres.png`

## US-6.6 — Voir ma courbe de vitesse

En tant que conducteur, sur un trajet enregistré, je vois ma courbe de vitesse, ma vitesse moyenne et le nombre d'accélérations.

1. Partir de : le résultat d'un trajet enregistré (écran Résultat du trajet) — capture `US-6.6-01-avant.png`
2. Faire : je le regarde ; constater : le bloc « Ma vitesse enregistrée » montre la courbe de tout le trajet, la vitesse moyenne et le nombre d'accélérations, et la note explique le calcul sur la vitesse réelle — capture `US-6.6-02-apres.png`
3. Partir de : le résultat d'un trajet calculé (non enregistré) (écran Résultat du trajet) — capture `US-6.6-03-avant.png`
4. Faire : je le regarde ; constater : ce bloc n'apparaît pas — capture `US-6.6-04-apres.png`

## US-6.E1 — Localisation refusée

En tant que conducteur, si je refuse la localisation, je sais pourquoi rien ne s'enregistre.

1. Partir de : l'écran Trajets (écran Trajets) — capture `US-6.E1-01-avant.png`
2. Faire : j'appuie sur « Enregistrer en roulant » et que la localisation est refusée ; constater : un message dit que l'enregistrement a besoin de la localisation et comment l'autoriser, et aucun trajet n'est créé — capture `US-6.E1-02-apres.png`

## US-6.E2 — Trajet trop court

En tant que conducteur, un enregistrement arrêté presque aussitôt ne pollue pas mon historique.

1. Partir de : un enregistrement de moins de 1 km (écran En route) — capture `US-6.E2-01-avant.png`
2. Faire : j'appuie sur « Arrêter et voir le coût » ; constater : un message indique que le trajet est trop court pour être calculé, et rien n'est ajouté à l'historique — capture `US-6.E2-02-apres.png`

## US-6.E3 — Reprendre après fermeture

En tant que conducteur, si l'appli se ferme en route, je ne perds pas ce qui a été enregistré.

1. Partir de : un enregistrement en cours (écran En route) — capture `US-6.E3-01-avant.png`
2. Faire : la page est rechargée ou rouverte ; constater : l'appli propose de reprendre l'enregistrement en cours ou de l'arrêter, avec la distance déjà parcourue conservée (points gardés sur le téléphone) — capture `US-6.E3-02-apres.png`

## US-3.9 — Aller au Royaume-Uni

En tant que conducteur, je calcule un trajet jusqu'au Royaume-Uni.

1. Partir de : le champ arrivée (écran Trajets) — capture `US-3.9-01-avant.png`
2. Faire : je choisis Londres, Royaume-Uni et calcule ; constater : le résultat liste le Royaume-Uni parmi les pays traversés avec son prix moyen du jour (Fuel Finder) en euros, ajoute le péage du pont de Dartford s'il est franchi, et indique que la traversée de la Manche (tunnel ou ferry) n'est pas comptée — capture `US-3.9-02-apres.png`

## US-1.9 — Stations au Royaume-Uni

En tant que conducteur au Royaume-Uni, je vois les stations autour de moi avec leurs prix.

1. Partir de : une position à Londres (écran Prix) — capture `US-1.9-01-avant.png`
2. Faire : j'ouvre l'onglet Prix ; constater : la carte et la liste montrent les stations britanniques autour (Fuel Finder) avec leur prix converti en €/L et le prix d'origine en pence/L dans la fiche — capture `US-1.9-02-apres.png`
