# Milestone 6 Summary — Appli Android

## Known Limitations
- Notification après une relance du service : si un bouton de la notification est touché après que le système a relancé le service, avant son premier relevé, la distance affichée par la notification oublie 2 à 3 relevés. Seule la notification est fausse ; l'écran recalcule juste à la réouverture (audit round 3, LOW 1, code Android non corrigé).
- Refus de la localisation non joué sur Android : « Don't allow » au dialogue natif (V-1.3 critère 2, et V-3.1 c3, V-3.5 c2/c3, V-4.7 c2/c3) n'a été joué que sur la version web (audit round 3, LOW 7).
- CI Android bloquée : depuis le 22/10 à 02:44Z, GitHub refuse de lancer les jobs (facturation du compte). L'APK publié (sha256 95f2e58a…acf8) et les captures viennent du run 39710484157 (commit 71f19b3) ; le code Android n'a pas changé depuis (0 ligne de diff), mais aucun nouveau build ni test émulateur n'est possible tant que la facturation n'est pas réglée.
- Captures V-1.3-A01 et V-3.2-A10 gardées du round 2 (run 39701223352) : au round 3, l'émulateur les masquait par « Pixel Launcher isn't responding ». La mort du processus (V-3.2-A17) ne se voit pas à l'écran : la preuve est au journal du job.
- Horloge du téléphone en avance sur les relevés GPS : joué à l'émulateur seulement entre −0,56 s et +0,5 s ; ce sens n'est prouvé que par les tests unitaires (JUnit, Vitest). Le sens « téléphone en retard » est joué à l'émulateur (≥ +2,4 s).
- À constater par Anthony sur son OnePlus (OxygenOS), sur un vrai trajet : installation depuis le lien de la release ; demandes de localisation, de notifications et de sortie de l'optimisation de batterie ; 30 min ou plus écran éteint avec Waze devant, distance de fin de trajet comparée au compteur de la voiture (écart attendu < 2 %) ; notification présente tout le trajet, boutons qui répondent, disparition à l'arrêt ; un vrai tunnel (« GPS perdu » puis distance complétée). L'émulateur ne reproduit ni l'économie de batterie d'OxygenOS, ni le vrai GPS, ni Waze.

## What's Next
- Étape 5, le durcissement : audits de performance, stabilité, accessibilité et sécurité, corrections, régression.
- Avant ou pendant l'étape 5 : régler la facturation GitHub pour rouvrir la CI Android, puis corriger le LOW 1 (notification après relance).
