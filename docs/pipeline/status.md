# Pipeline Status

- **Current step:** 4
- **Sub-step:** jalons 1 à 6 construits ; étape 4 terminée (jalon 6 « Appli Android » coché le 2026-10-22 après 3 cycles) ; suite : étape 5 (durcissement)
- **Last updated:** 2026-10-22T03:54:39+00:00
- **Summary:** Jalons 1 à 6 construits et déployés. Web : https://plein-et-trajet.vercel.app (commit 2d14d34, Vercel READY). Android : APK de release signé https://projets.ingevision.cloud/plein-et-trajet/plein-et-trajet.apk (sha256 95f2e58a…acf8, run CI 39710484157). Jalon 6 = service natif TrajetService (relevés gardés côté natif, relancé par le système), notification Pause/Reprendre/Arrêter, optimisation de batterie, verrou d'écran web : 3 cycles bâtisseur → évaluateur → descripteur → auditeur → contre-évaluation, double PASS au cycle 3 (0 HIGH ; le HIGH « deux horloges » reclassé au cycle 2 est corrigé) ; Vitest 280/280, Playwright 102/103 (1 instable rejoué 3/3) ; rapport docs/delivery/m6-delivery-report.html (47 captures annotées). **Bloquant hors code : GitHub Actions ne démarre plus de job depuis le 22/10 02:44Z (facturation du compte anthohunt) — action d'Anthony requise pour reconstruire l'APK.** Restent à constater au téléphone d'Anthony : OxygenOS, vrai GPS/tunnel, Waze 30 min, écart au compteur. Décisions en attente : libellé Clio IV / 1.2 TCe 120 ; fond OpenFreeMap ; commentaires sur les rapports m2 à m6.

## Milestones
- [x] Milestone 1 — Les prix autour de moi (journal : docs/pipeline/m1-journal.md)
- [x] Milestone 2 — Le coût d'un trajet (journal : docs/pipeline/m2-journal.md)
- [x] Milestone 3 — Péages et Europe (journal : docs/pipeline/m3-journal.md)
- [x] Milestone 4 — Enregistrer en roulant et Royaume-Uni (ajouté le 2026-10-20 après validation de la maquette v4 ; journal : docs/pipeline/m4-journal.md)
- [x] Milestone 5 — V1 recentrée (ajouté le 2026-10-21 après validation de la maquette V1 ; journal : docs/pipeline/m5-journal.md ; rapport : docs/delivery/m5-delivery-report.html)
- [x] Milestone 6 — Appli Android (ajouté le 2026-10-21 après validation de la maquette V1 ; journal : docs/pipeline/m6-journal.md ; rapport : docs/delivery/m6-delivery-report.html)
