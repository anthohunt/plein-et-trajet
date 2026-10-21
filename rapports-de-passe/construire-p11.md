---
noeud: construire
passe: 11
verdict: reussi
duree: ~2 h 50 (15:43 → 18:33 UTC le 21/10)
sous_agents: 11 lancés (+ 2 auditeurs round 2 lancés par la passe 10, attendus et lus)
---

# Construire le jalon 5 « V1 recentrée » — passe 11

**Ce que j'ai fait** — Repris le jalon 5 là où la passe 10 avait été coupée par le runtime (au bout de 6 h, pendant l'attente des auditeurs round 2, encore vivants). L'audit round 2 était rouge sur le lot 1. J'ai donc mené le cycle 3 (dernier autorisé) : bâtisseur, évaluateur, descripteurs, auditeurs, contre-évaluation, puis tests, commit, déploiement, annotation et rapport. J'ai ensuite coché le jalon. Tous les agents sont passés par le lanceur du VPS (compte agents, mode -p) et ont été attendus au premier plan. Je n'ai écrit aucun code.

**Ce que je rends**
- `docs/pipeline/status.md` : jalon 5 coché, sous-étape → jalon 6, résumé et décisions en attente.
- `docs/pipeline/project-memory.md` : réécrit (1 654 car.).
- `docs/pipeline/m5-journal.md` : chronologie de la passe, plus les sections ajoutées par les agents (Builder Summary round 3, évaluateur cycle 3, descripteurs cycle 3, Auditor Journal round 3 lots 1-2, contre-évaluation, correctifs post-audit, Test & Regression, Deploy).
- `docs/delivery/m5-delivery-report.html` : 31 histoires, 140 étapes, 140 captures annotées intégrées, 0 manquante (10 Mo).
- `tests/e2e/use-cases/m5-summary.md` (limites connues), `tests/e2e/delivery/m5-annotations-lot1/2.json`, `m5-step-descriptions.json` (140), `tests/e2e/m5-explore.spec.ts` (65 tests).
- Outils de rapport adaptés au format V-x.y : `docs/delivery/outils/preparer-rapport-m5.py` (cas d'usage converti, critères tirés de stories.json) et `generate-milestone-report-patche-v.cjs`.
- Code en prod : 78d827f, Vercel READY. Dernier commit poussé : ec0a29b.

**Ce que j'ai trouvé**
- Audit round 2 (passe 10) :
  - lot 1 FAIL : 1 HIGH, les textes de la notification Android étaient écrits en dur (code poussé par l'autre session) ; 1 MEDIUM, l'arrêt auto ne se déclenchait pas au-delà de ~8 m de bruit GPS ;
  - lot 2 PASS, avec 1 MEDIUM : un trajet supprimé revenait dans l'historique.
- Bâtisseur round 3 : les trois défauts sont corrigés, avec des tests rouges sur l'ancien code puis verts. Sur ±10 m de bruit avec une précision de 20 m, l'alerte part 5 fois sur 5 (avant : 0 sur 5). 140 captures reprises sur la prod : 139 conformes, 1 écart (Clio IV).
- Évaluateur R1 cycle 3 : PASS 5/5. Auditeurs round 3 : PASS et PASS, 0 HIGH. Contre-évaluation : PASS 3/5 (lot 1 5/5, lot 2 3/5 : une référence de code recopiée fausse, un écart de capture non instruit). Aucun faux PASS.
- Tests + déploiement :
  - correctifs : le contour de focus coupé en T2 (MEDIUM), et 5 captures refaites (dont V-5.7-06, prise sur un état transitoire) ;
  - tests : Vitest 265/265 ; Playwright 96/96 en une passe (m1 23, m5-explore 65, m5-regression 8) ;
  - vérification de la prod : 18 requêtes serveur, toutes en 200, et 0 appel à PTV, estimer-trajet ou trajet-roule.
- Garde-fous relus à 18:19Z : Vault 3 noms, cles_fournisseurs 2, trajets 1 057, 0 admin éphémère, péages hors service.
- J'ai contrôlé moi-même 3 captures annotées : cadres justes, calculs justes (41,20 L × 2,161 = 89,03 € ; ÷ 3 = 29,68 €). Une description était fausse (V-5.6-03, 1,02 € au lieu de 1,03 €) : je l'ai corrigée d'après l'image.

**Mes sous-agents**
- m5-batisseur-r3 : correctifs et 140 captures. Fiable.
- m5-evaluateur-r1-c3 : PASS 5/5, 7 signalements.
- m5-descripteur-c3-lot1 / lot2 : 70 + 70 descriptions. Ils ont repéré V-5.7-06 et des titres coupés.
- m5-auditeur-r3-lot1 / lot2 : PASS / PASS.
- m5-contre-evaluation : PASS 3/5.
- m5-tests-deploiement : 78d827f, déploiement PASS.
- m5-annotateur-lot1 / lot2 : 64 + 76 cadres.
- Aucun agent mort.

**Ce qui coince**
- Deux décisions reviennent à Anthony :
  - le libellé « Clio IV / 1.2 TCe 120 », absent de la base EEA (capture V-1.2-02 laissée en écart) ;
  - le fond de carte OpenFreeMap, qui remplace Plan IGN.
- Non prouvé : les boutons de la notification Android n'ont été vus sur aucun appareil ; aucun trajet n'a été roulé avec un vrai téléphone.
- Captures : V-4.7-01 (titre hors cadre) n'a pas été reprise ; le titre de V-6.4-03 est coupé de 15 px.
- Le rapport n'a pas été ouvert devant Anthony : la pipeline tourne sans lui. Il attend ses commentaires, comme m2 à m4.

**Pour la suite**
- Le validateur reste rouge sur un seul contrat (C2 : m6 non construit). C'est attendu : le nœud se relance pour le jalon 6 « Appli Android ».
- Une autre session (trailer Claude-Session session_016XJ…) a déjà poussé beaucoup de code Android sur main : le bâtisseur m6 doit partir de l'existant.
- Les specs Playwright m2-m4 visent l'estimation retirée de la V1 et ne tournent plus.
