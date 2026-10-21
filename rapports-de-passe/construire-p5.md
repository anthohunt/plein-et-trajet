---
noeud: construire
passe: 5
verdict: reussi
duree: ~35 min (15:12–15:47 UTC)
sous_agents: 6
---

# Construire le jalon 2 « Le coût d'un trajet » — passe 5

**Ce que j'ai fait** — Repris le jalon 2 là où la passe 4 s'était arrêtée sans DONE : le bâtisseur round 2 avait fini (commit a6126b7), le reste du cycle n'était pas fait. J'ai enchaîné l'évaluateur, le descripteur, l'auditeur round 2 et la contre-évaluation, puis les tests, le déploiement, l'annotation et le rapport. Le jalon 2 est coché.

**Ce que je rends**
- `docs/pipeline/status.md` : jalon 2 coché, résumé à jour ; jalon 3 reste à faire.
- `docs/pipeline/project-memory.md` : réécrit (≈1 900 car.), jalon 2 et nouvelle définition du jalon 3.
- `docs/pipeline/m2-journal.md` : chronologie de la passe, sections évaluateur cycle 2, descripteur cycle 2, auditeur round 2, contre-évaluation, Test & Regression, Deploy, Annotation, Clôture.
- `docs/delivery/m2-delivery-report.html` : 24 histoires, 61 étapes, 61 captures annotées intégrées, 0 manquante.
- `tests/e2e/m2-explore.spec.ts` (61 tests), `tests/e2e/delivery/m2-annotations.json`, captures brutes dans `tests/e2e/exploration/m2-captures-brutes/`, `tests/e2e/use-cases/m2-summary.md`.
- Commits poussés : c0cfb78 (tests, déployé READY), 1ee3b26 (journal + 3 captures de déploiement), 821c130 (rapport, état).

**Ce que j'ai trouvé**
- Le bâtisseur round 2 avait écrit « limite d'inscriptions anonymes remise à 30/h, vérifiée » : c'était faux, l'appel avait échoué (544) et la valeur était restée à 300. L'évaluateur l'a repéré (score 3/5, PASS de justesse). J'ai rectifié les deux journaux, gardé 300 le temps des tests sur la prod, puis remis la valeur à 30 et l'ai relue par l'API (30).
- Auditeur round 2 : PASS, 0 CRITICAL/HIGH/MEDIUM, 11 LOW ; le HIGH et les 5 MEDIUM du round 1 sont corrigés. Contre-évaluation 5/5, aucun faux passage sur les 3 critères re-vérifiés.
- Régression : Vitest 80/80, Playwright 86/86 sur la prod (m1 25, m2 61), build et typage OK, smoke prod : 36 requêtes toutes 2xx.

**Mes sous-agents**
- Évaluateur R1 cycle 2 : PASS 3/5, a trouvé l'affirmation fausse sur la limite — utile.
- Descripteur cycle 2 : 17 descriptions réécrites, 7 écarts signalés — tous instruits par l'auditeur.
- Auditeur round 2 : PASS, tests en direct sur la prod (bi-carburation, Albi → Albi, prix perso, clavier, géocodeur en panne).
- Contre-évaluation : PASS 5/5, méthode de l'auditeur confirmée appel par appel.
- Tests + déploiement : consolidation, 86/86, Vercel READY, smoke PASS.
- Annotateur : 61/61 cadres ; 3 discutables (A11Y-001-01/02, 3.7-01), 2 contrôlés par moi justes (4.E2-E1-02, 4.1-02).

**Ce qui coince**
- Identités anonymes et trajets de test en base de prod (≈344 et 164 avant les derniers rejeux) : non purgés, car on ne peut pas les distinguer d'un usage réel et la suppression est irréversible. La décision revient à Anthony.
- Pas de Playwright MCP ni d'outil d'équipe dans cette session : bibliothèque Playwright + outil Agent, comme aux passes précédentes.
- Les horodatages de chronologie écrits au début étaient estimés ; je les ai corrigés sur les heures réelles des dispatchs et des commits.

**Pour la suite**
- Passe 6 = jalon 3 « Péages et Europe ». Anthony l'a redéfini pendant cette passe (commit 188d0d4 : écran Moteurs S5 réservé à l'admin, fournisseurs et clés en table + Supabase Vault, rien en dur, 15 histoires ; config.json modifié). Relire mockup, roadmap et config avant de dispatcher.
- Le générateur de rapport doit tourner en `.cjs` (package.json en module) sur une copie de travail du cas d'usage convertie par `docs/delivery/outils/convertir-cas-usage.py`.
- Le rapport du jalon 2 attend les commentaires d'Anthony.
