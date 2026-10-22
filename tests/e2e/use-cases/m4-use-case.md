# Jalon 4 — Enregistrer en roulant et Royaume-Uni : plan de cas d'usage

**Démonstration** : Je lance l'enregistrement, je roule (trajet GPS rejoué sur l'appli déployée), je suis ma vitesse et mon coût en direct, je fais une pause, j'arrête : le résultat est calculé sur ma vitesse réelle avec ma courbe ; puis je calcule Albi → Londres et je vois les stations de Londres.

**Écrans possédés** : S6 En route · traversés : S1 Prix, S3 Trajets, S4 Résultat du trajet

Référence visuelle : `docs/pipeline/design/mockup.html` (version 4). Exécuté sur l'appli DÉPLOYÉE. Le trajet roulé est un vrai tracé GPS enregistré (Albi → Toulouse, 1 point par seconde, fichier `tests/e2e/fixtures/albi-toulouse.gpx`) rejoué dans Playwright par la géolocalisation simulée du navigateur (`context.setGeolocation` à chaque seconde) — c'est la seule simulation, tout le calcul passe par les vrais services. Captures dans `tests/e2e/screenshots/m4/`.

> **Livraison (2026-10-22)** : les histoires retirées de la V1 ont été ôtées de ce plan (liste et raisons : `docs/pipeline/reconciliation-report.md` ; plan d'origine dans l'historique git). Les étapes restantes ont été rejouées sur l'appli finale ; captures de livraison dans `tests/e2e/final/`.

## US-6.E1 — Localisation refusée

En tant que conducteur, si je refuse la localisation, je sais pourquoi rien ne s'enregistre.

1. Partir de : l'accueil (écran Trajet) — capture `US-6.E1-01-avant.png`
2. Faire : je touche « Démarrer » et la localisation est refusée ; constater : un message dit que l'enregistrement a besoin de la localisation et comment l'autoriser, et aucun trajet n'est créé — capture `US-6.E1-02-apres.png`

## US-6.E2 — Trajet trop court

En tant que conducteur, un enregistrement arrêté presque aussitôt ne pollue pas mon historique.

1. Partir de : un enregistrement de moins de 1 km (écran En route) — capture `US-6.E2-01-avant.png`
2. Faire : je touche « Arrêter » ; constater : « Trajet trop court : 0,5 km sur 1 minimum. Rien n'est ajouté à l'historique. » avec « Retour à l'accueil » — capture `US-6.E2-02-apres.png`

## US-6.E3 — Reprendre après fermeture

En tant que conducteur, si l'appli se ferme en route, je ne perds pas ce qui a été enregistré.

1. Partir de : un enregistrement en cours (écran En route) — capture `US-6.E3-01-avant.png`
2. Faire : la page est rechargée ou rouverte ; constater : l'écran En route rouvre directement le trajet en cours, distance déjà parcourue conservée (points gardés sur le téléphone), avec Pause et Arrêter — capture `US-6.E3-02-apres.png`

