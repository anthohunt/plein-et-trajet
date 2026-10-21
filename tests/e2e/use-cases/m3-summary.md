# Milestone 3 Summary

## Known Limitations
- Péages HERE jamais vus en réponse réelle : aucune clé HERE n'existe. Le code suit la documentation officielle HERE Routing v8, mais US-5.5 (péages HERE) et US-5.E3 (bascule PTV → HERE) restent bloqués par l'absence de clé ; leurs deux tests sont ignorés avec ce motif. Sur les captures de US-5.E3, la bascule montrée est l'inverse (HERE principal, PTV secours).
- Plan gratuit PTV : selon la FAQ PTV, il est réservé aux tests. Son plafond quotidien (500 transactions selon le guide de migration) a été atteint en prod le 20/10 à 23:14 UTC. L'appli affiche désormais « quota du jour atteint » au lieu de « clé refusée », limite ses appels à 250 par jour (réglable en table) et garde les péages d'un même tracé en cache 7 jours. Passer à un plan payant est une décision qui revient à Anthony.
- Un péage servi par le cache peut différer du tarif du jour pendant 7 jours au plus (Albi → Milan : 79,70 € en cache contre 77,20 € le 21/10).
- Les appels « Tester » et « Enregistrer » de l'écran Moteurs, et les appels directs des tests, ne comptent pas dans le plafond de 250.
- Stations hors de France : Royaume-Uni limité au flux Asda (8 stations à Londres, pas de moyenne nationale « vs ») ; Roumanie limitée au service officiel (rayon de 5 km, 50 stations par requête) ; Allemagne branchée mais jamais synchronisée avec une vraie clé Tankerkönig. Pays sans flux officiel (Belgique…) : la moyenne du pays seulement.
- Véhicules européens (tâche T3.7) non construits : seule la base ADEME est utilisée.
- Captures : plusieurs preuves sont portées par un bandeau de test (US-5.3-04, US-A11Y-004-01) ; US-4.E5 montre Albi → Lausanne au lieu d'Albi → Milan via Genève (pas d'étape intermédiaire dans l'appli) ; US-A11Y-001 montre la navigation au clavier sur Trajets et Moteurs seulement ; le collage de la clé (US-5.3-02) se prouve par le test, pas sur l'image.
- Test M1 US-1.E4 rouge : aucune rupture réelle de gazole dans un rayon de 10 km autour d'Albi (vérifié en base) ; ce n'est pas un défaut de code.
- Le lien de connexion envoyé à l'administrateur par e-mail n'a jamais été reçu pour de vrai (seulement généré). Les comptes administrateur de test ont été créés puis supprimés.

## What's Next
- Jalon 4 — Enregistrer en roulant et Royaume-Uni : écran En route (vitesse, distance, coût en direct, pause, arrêt, résultat calculé sur la vitesse réelle), puis Albi → Londres avec les stations de Londres.
