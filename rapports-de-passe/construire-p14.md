---
noeud: construire
passe: 14
verdict: reussi
duree: ~2 h 50 (01:12 → ~04:00 UTC le 22/10)
sous_agents: 12 lancements (11 agents, dont l'auditeur r3 relancé une fois)
---

# Construire le jalon 6 « Appli Android » — passe 14

**Ce que j'ai fait** — J'ai repris le jalon 6 au cycle 2. La passe 13 avait été coupée parce qu'elle attendait le bâtisseur r2 en arrière-plan ; le bâtisseur avait fini à 01:10Z. J'ai mené la fin du cycle 2, puis le cycle 3, le dernier autorisé : il a été ouvert parce que la contre-évaluation a reclassé un MEDIUM en HIGH. J'ai ensuite enchaîné tests, commit, déploiement, annotation et rapport, et j'ai coché le jalon. Tous les agents sont passés par le lanceur du VPS (compte agents, `claude -p`) et je les ai attendus au premier plan. Je n'ai écrit aucun code.

**Ce que je rends**
- `docs/pipeline/status.md` : jalon 6 coché ; étape 4 terminée ; bloquant facturation GitHub et décisions en attente notés.
- `docs/pipeline/project-memory.md` : réécrit (1 640 car.).
- `docs/pipeline/m6-journal.md` : chronologie de la passe, plus les sections des agents (évaluateur c2/c3, descripteur c2/c3, Auditor Journal r2/r3, contre-évaluations r2/r3, Builder Summary r3, Correctifs post-audit, Test & Regression, Deploy).
- `docs/delivery/m6-delivery-report.html` : 10 histoires, 47 étapes, 47 captures annotées, 0 manquante (2,45 Mo).
- Autres fichiers : `tests/e2e/delivery/m6-annotations.json`, `m6-step-descriptions.json` (47), `tests/e2e/use-cases/m6-summary.md`, `tests/e2e/m6-explore.spec.ts` (7 tests), `docs/delivery/outils/preparer-rapport-m6.py`.
- Code en prod : web 2d14d34 (Vercel READY) ; APK de release sha256 95f2e58a…acf8 (run 39710484157), identique au code de HEAD (diff Android 0).

**Ce que j'ai trouvé**
- Cycle 2 :
  - évaluateur PASS 5/5 ;
  - auditeur r2 PASS (0 HIGH, 1 MEDIUM, 5 LOW) ;
  - contre-évaluation PASS 3/5, mais elle reclasse le MEDIUM « deux horloges » en **HIGH**. L'heure automatique d'Android tolère jusqu'à 2 s d'écart. Les relevés sont datés à l'heure GNSS et les boutons à l'horloge du téléphone : une Pause touchée dans la notification était donc jetée, et le critère V-3.3 c2 n'était pas tenu. Je n'ai pas livré avec un HIGH ouvert.
- Cycle 3 :
  - le bâtisseur r3 ordonne par numéro de ligne et date les boutons sur l'horloge des relevés ;
  - tests : Vitest m6-horloges 3/8 → 8/8 et JUnit 3/5 → 5/5 ;
  - émulateur : défaut reproduit sur le code r2 (run 39710465105), tenu sur le r3 (39710484157, 52/52, Pause tenue 27 s) ;
  - verdicts : évaluateur 5/5, auditeur r3 PASS (0 HIGH, 0 MEDIUM, 8 LOW), contre-évaluation 4/5. Les deux LOW discutés restent LOW.
- Tests et déploiement :
  - Vitest 280/280 ; Playwright 102/103 (V-2.3 instable, 3/3 au rejeu) ;
  - prod : 11 requêtes serveur en 200, 0 PTV ;
  - `trajet-roule` redéployée (v9).
- J'ai contrôlé moi-même 3 captures annotées : cadres justes ; 0,31 L × 2,155 €/L = 0,67 € ; 6,6 L/100 km.

**Mes sous-agents**
- m6-evaluateur-r1-c2 : PASS 5/5, 7 signalements. Il a écrit une heure fausse (01:30Z) dans le journal.
- m6-descripteur-c2 : 45 descriptions, 4 écarts.
- m6-auditeur-r2 : PASS ; son MEDIUM 1 était juste sur le fond, faux sur la gravité.
- m6-contre-evaluation : PASS 3/5. C'est elle qui a trouvé le HIGH.
- m6-batisseur-r3 : HIGH corrigé et prouvé. Il annonçait « dans les deux sens » : faux pour le sens « en avance », rectifié.
- m6-evaluateur-r1-c3 : PASS 5/5. m6-descripteur-c3 : 47 descriptions, 7 écarts.
- m6-auditeur-r3 : 1er lancement arrêté par moi au bout d'une minute (consigne incomplète, faute du chef : signalements non extraits, noms de fonctions perdus), relancé, PASS.
- m6-contre-evaluation-r3 : PASS 4/5.
- m6-tests-deploiement : PASS, 2d14d34.
- m6-annotateur-rapport : 47/47 cadres, rapport à 0 capture manquante.
- Aucun agent mort.

**Ce qui coince**
- **GitHub Actions ne démarre plus aucun job depuis le 22/10 02:44Z** (paiement du compte anthohunt). Tant que ce n'est pas réglé, impossible de reconstruire l'APK ou de rejouer l'émulateur. Le scénario de mesure fine (c972c65) n'a pas tourné.
- Non prouvé à l'émulateur : le sens « téléphone en avance » (unitaire seulement) ; rien n'a été roulé sur un vrai téléphone (OxygenOS, vrai GPS, Waze 30 min).
- Restent 2 LOW de l'audit r3 : le km de la notification est faux pendant 2 s si on touche un bouton juste après une relance du service ; V-1.3 c2 n'est pas joué sur Android.
- Le rapport n'a pas été présenté à Anthony en direct (pipeline sans lui).

**Pour la suite**
- L'étape 4 est terminée : le nœud suivant est le durcissement (étape 5).
- Toute modification sous android/ exige d'abord le rétablissement de la facturation GitHub.
- Leçon pour le chef : attendre les agents au premier plan (boucle bornée de moins de 10 min), jamais en arrière-plan. Les passes 12 et 13 ont été coupées ainsi.
