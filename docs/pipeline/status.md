# Pipeline Status

- **Current step:** 4
- **Sub-step:** jalon 6 « Appli Android » à construire (jalon 5 « V1 recentrée » coché le 2026-10-21 après 3 cycles) ; le durcissement (étape 5) vient après le jalon 6
- **Last updated:** 2026-10-21T18:28:30+00:00
- **Summary:** Jalons 1 à 5 construits et déployés sur https://plein-et-trajet.vercel.app (dernier commit 78d827f, Vercel READY). Jalon 5 = V1 recentrée (T1 Trajet, T2 Ma voiture, T3 En route, T4 Fin de trajet, T5 Stations, T6 Historique) : 3 cycles bâtisseur → évaluateur → descripteur → auditeur, double PASS au cycle 3 (auditeurs 0 HIGH, contre-évaluation 3/5) ; Vitest 265/265, Playwright 96/96 ; rapport docs/delivery/m5-delivery-report.html (140 captures annotées). Décisions en attente d'Anthony : libellé « Clio IV / 1.2 TCe 120 » absent de la base EEA ; fond de carte OpenFreeMap à la place de Plan IGN ; commentaires sur les rapports m2 à m5. `run-node.py webapp construire` reprend au jalon 6.

## Milestones
- [x] Milestone 1 — Les prix autour de moi (journal : docs/pipeline/m1-journal.md)
- [x] Milestone 2 — Le coût d'un trajet (journal : docs/pipeline/m2-journal.md)
- [x] Milestone 3 — Péages et Europe (journal : docs/pipeline/m3-journal.md)
- [x] Milestone 4 — Enregistrer en roulant et Royaume-Uni (ajouté le 2026-10-20 après validation de la maquette v4 ; journal : docs/pipeline/m4-journal.md)
- [x] Milestone 5 — V1 recentrée (ajouté le 2026-10-21 après validation de la maquette V1 ; journal : docs/pipeline/m5-journal.md ; rapport : docs/delivery/m5-delivery-report.html)
- [ ] Milestone 6 — Appli Android (ajouté le 2026-10-21 après validation de la maquette V1 ; plan : tests/e2e/use-cases/m6-use-case.md)
