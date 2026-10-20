# Milestone 1 Summary

## Known Limitations
- Accessibilité au clavier, intermittent : après un glisser de carte en Gazole sur mobile, deux pastilles hors du cadre peuvent rester atteignables au clavier pendant quelques secondes (1 essai sur 4, rentré dans l'ordre à 8 s). Relevé par l'auditeur, à corriger au jalon suivant.
- L'enseigne des stations vient de la fiche officielle de chaque station, récupérée 120 par synchronisation : tant que la reprise n'est pas finie (~14 h après la mise en ligne), certaines stations loin d'Albi s'affichent « Station <ville> ».
- Le carburant choisi est mémorisé dans le navigateur ; la mémorisation côté serveur (préférences) arrive avec la voiture au jalon 2.
- L'écran Trajets ne contient que départ et arrivée (pré-remplissage depuis une fiche) ; le calcul arrive au jalon 2.
- Captures : « Source des prix injoignable » et « Aucune station E85 » sont simulées (coupure réseau provoquée par le test) ; la capture de la liste Gazole complète est prise sur une fenêtre mobile agrandie à 1 376 px de haut pour montrer les 12 lignes.
- Les cas « prix ancien » et « rupture » s'appuient sur de vraies stations du jour autour d'Albi ; si le cas disparaît des données réelles, le test échoue au lieu de passer.

## What's Next
- Jalon 2 — Le coût d'un trajet : choix de la voiture (base ADEME), calcul Albi → Bordeaux en tronçons avec consommation par tronçon, prix personnel, historique des trajets.
