# Milestone 5 Summary — V1 recentrée

## Known Limitations
- Nom de la voiture : l'écran affiche « Renault Clio » et « 1.2 · 118 ch · 2017 · SP95-E10 », pas « Clio IV » ni « 1.2 TCe 120 » comme le plan. La base EEA ne porte pas ces noms commerciaux. Décision à prendre par Anthony : changer le texte du plan, ou ajouter une table de noms commerciaux (capture V-1.2-02 laissée en écart).
- Fond de carte de Stations : il est passé de Plan IGN à OpenFreeMap Positron (sans clé, attribution affichée), pour couvrir l'Europe et le Royaume-Uni. À valider par Anthony.
- Stations hors de France : « Aucune station ne vend ce carburant autour de vous » s'affiche 1 à 2 s avant le message « Ce pays ne publie pas les prix station par station ».
- Notification Android du trajet en cours : les textes passent par textes.ts et l'APK est construite par la CI. Le titre et la ligne ont été lus sur l'émulateur de la CI, mais les libellés des boutons (Reprendre, C'est fini, Pause, Arrêter) n'ont été vus sur aucun appareil.
- GPS : en bouchon lent avec une mauvaise précision, la vitesse affichée peut rester à 0 km/h (les km restent justes). Dans les ~10 s qui suivent un arrêt, quelques km/h parasites peuvent s'afficher (ni km ni litres comptés). Tout est simulé dans Chromium : aucun trajet n'a été roulé avec un vrai téléphone.
- Captures : V-4.7-01 (titre hors cadre) n'a pas été reprise ; le titre de V-6.4-03 est coupé de 15 px. Certaines captures « avant » ne montrent pas leur état de départ (V-6.1-01, V-6.1-03, V-4.4-04, V-5.5-02) ; la preuve passe par les tests et les vérifications en direct.
- Tests : la suite Playwright du jalon tourne sur m1, m5-explore et m5-regression. Les specs m2 à m4 portaient sur l'estimation de trajet retirée de la V1.

## What's Next
- Jalon 6 « Appli Android » (plan : tests/e2e/use-cases/m6-use-case.md).
- Puis l'étape 5, le durcissement (performance, stabilité, accessibilité, sécurité).
