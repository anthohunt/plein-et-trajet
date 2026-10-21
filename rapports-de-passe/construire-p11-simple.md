**Jalon 5 « V1 recentrée » construit, en ligne et coché. Le jalon 6 (Android) suit.**

- La passe précédente avait été coupée pendant l'audit. Je l'ai reprise : le contrôle était rouge sur **1 défaut grave** (textes de la notification Android écrits en dur, hors du fichier des textes) et **2 défauts moyens**.

- Défauts moyens : l'arrêt automatique ne partait pas quand le GPS tremble de plus de ~8 m ; un trajet supprimé pouvait réapparaître dans l'historique.

- Troisième et dernier tour de correction : **les 3 défauts sont réparés**, prouvés par des tests qui échouaient avant et passent après.

- Contrôle final : **les deux auditeurs au vert**, 0 défaut grave ; la contre-vérification de leur honnêteté passe (**3/5**).

- Tests : **265/265** tests de calcul, **96/96** parcours sur l'appli en ligne ; vérification en production : **18 appels au serveur, tous réussis**, aucun appel au service de péages payant.

- Rapport de livraison : **31 histoires, 140 captures** encadrées de rouge, aucune manquante (docs/delivery/m5-delivery-report.html).

- **À trancher par Anthony** : le nom affiché de la voiture (« Renault Clio » au lieu de « Clio IV / 1.2 TCe 120 », la base européenne ne porte pas ces noms) et le nouveau fond de carte (OpenFreeMap au lieu de l'IGN, pour couvrir l'Europe).

- Pas encore prouvé : les boutons de la notification Android sur un vrai téléphone, et un vrai trajet roulé.

- Clés et données intactes : **3 secrets, 2 clés, 1 057 trajets**, inchangés.

La passe suivante construit le jalon 6 « Appli Android ».
