**Jalon 6 « Appli Android » construit, vérifié et coché : l'étape de construction est terminée.**

- Il a fallu **3 cycles** de correction. Le dernier a corrigé un défaut grave trouvé par la contre-vérification : une Pause touchée dans la notification pouvait être perdue sur un vrai téléphone dont l'horloge retarde de 1 à 2 secondes

- Le défaut est **reproduit sur l'ancien code, puis disparu sur le nouveau** (Pause tenue 27 s à l'émulateur, 52 contrôles sur 52)

- Verdict final : vérificateur **validé, 0 défaut grave**, 8 mineurs notés ; contre-vérification validée à **4/5**

- Tests : **280/280** sur la logique, **102/103** sur le site en ligne (un échec passager, passé 3 fois sur 3 au rejeu)

- En ligne : site mis à jour, appli Android téléchargeable, **identique au code livré**

- Rapport de livraison : **47 captures annotées, aucune manquante**, en attente des commentaires d'Anthony

- **Bloquant hors code : GitHub n'exécute plus aucune construction depuis 02:44 (paiement du compte)**. À régler par Anthony avant toute nouvelle version Android

- À constater sur le vrai téléphone : surcouche OxygenOS, vrai GPS et tunnel, Waze devant pendant 30 min, écart avec le compteur

- Décisions toujours en attente : libellé « Clio IV / TCe 120 », fond de carte OpenFreeMap

Prochaine étape : le durcissement (qualité, sécurité, performance).
