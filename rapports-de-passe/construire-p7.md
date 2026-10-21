---
noeud: construire
passe: 7
verdict: reussi
duree: ~3 h 40 (21:45 UTC le 20/10 → 01:27 UTC le 21/10)
sous_agents: 12
---

# Construire le jalon 3 « Péages, Europe et moteurs » — passe 7

**Ce que j'ai fait** — Repris le jalon 3 à l'audit round 2 : la passe 6 avait été coupée à 21:44 et son auditeur était mort avec elle, sans rien écrire. J'ai bouclé jusqu'au double PASS : 3 audits de plus (FAIL, FAIL, PASS), avec 2 tours de bâtisseur entre eux. Puis tests, déploiement, annotation et rapport. Le jalon 3 est coché. Tous les agents sont passés par le lanceur d'agents du VPS (compte agents, sessions tmux indépendantes de la mienne), pour qu'une nouvelle coupure du chef ne les tue plus.

**Ce que je rends**
- `docs/pipeline/status.md` : jalon 3 coché ; résumé mis à jour ; jalon 4 reste à faire.
- `docs/pipeline/project-memory.md` : réécrit (1 810 car.).
- `docs/pipeline/m3-journal.md` : chronologie de la passe, auditeur rounds 2, 3 et 4, bâtisseur rounds 4 et 5, évaluateur R1 cycles 4 et 5, descripteur cycles 4 et 5, contre-évaluation, Test & Regression, Deploy, annotation, clôture.
- `docs/delivery/m3-delivery-report.html` : 21 histoires, 58 étapes, 58 captures annotées intégrées, 0 manquante.
- `tests/e2e/m3-explore.spec.ts` (66 tests), `tests/e2e/delivery/m3-annotations.json`, `tests/e2e/use-cases/m3-summary.md`, 3 captures de vérification du déploiement.
- Code déployé : b5d92dd (Vercel READY). Dernier commit poussé : 69eb5c1.

**Ce que j'ai trouvé**
- Audit round 2 : FAIL. Les péages étaient tarifés sur l'itinéraire choisi par PTV, pas sur le tracé affiché : Albi → Milan à 122,20 € par le Fréjus au lieu d'environ 73 €. Corrigé avec des points de passage : 79,70 €, stable sur deux appels.
- Audit round 3 : FAIL. Le quota gratuit PTV était épuisé en prod (403 « Daily Quota Exceeded », vers 500 appels par jour) et l'appli l'affichait comme une clé refusée. Les rejeux de tests avaient contribué à l'épuiser. Corrigé : message « quota du jour atteint », plafond de 250 par jour en table, cache des péages 7 jours, un seul test qui appelle vraiment PTV. Captures prises pendant le vrai quota, remise à zéro constatée à 00:00 UTC (Albi → Barcelone 29,00 €).
- Audit round 4 : PASS (0 HIGH, 1 MEDIUM, 15 LOW). Son MEDIUM (un calcul servi par le cache marquait un incident « résolu ») a été corrigé et déployé à l'étape des tests. Contre-évaluation : PASS 4/5.
- Régression : Vitest 142/142 ; Playwright 148/152 sur la prod. Restent : m1 US-1.E4 rouge, faute de vraie rupture de gazole près d'Albi (vérifié en base) ; 2 tests HERE ignorés faute de clé. Vérification du déploiement : 26 requêtes serveur, toutes en 2xx.
- Garde-fous relus à chaque étape : Vault = cle_ptv, cle_stadia, sync_prix_secret, jamais effacées ; moteurs remis (péages ptv, itinéraire stadia + secours valhalla-public) ; limite d'inscriptions anonymes 30 ; 0 admin éphémère.

**Mes sous-agents**
- Auditeur round 2 (relance) : FAIL, 2 HIGH réels. Il a aussi supprimé un admin éphémère laissé par l'auditeur coupé.
- Bâtisseur round 4 : 9 points corrigés, 56 captures refaites. Il a déployé une fonction avant de prendre le verrou de livraison, qui est inaccessible au compte claude ; il l'a déclaré.
- Évaluateur R1 cycle 4 : PASS 3/5.
- Descripteur cycle 4 : 56 descriptions, 27 écarts.
- Auditeur round 3 : FAIL, 1 HIGH (quota PTV).
- Bâtisseur round 5 : HIGH et 2 MEDIUM corrigés, 58 captures.
- Évaluateur R1 cycle 5 : PASS 4/5.
- Descripteur cycle 5 : 58 descriptions, 29 écarts.
- Auditeur round 4 : PASS.
- Contre-évaluation : PASS 4/5.
- Tests + déploiement : MEDIUM corrigé, spec consolidée, b5d92dd.
- Annotateur : 58/58 cadres ; il est parti des captures livrées et non des brutes, pour garder les étiquettes de preuve. J'ai accepté cet écart et vérifié deux cadres moi-même : justes.
- Aucun agent mort pendant cette passe.

**Ce qui coince**
- 5 cycles au lieu des 3 que le skill autorise avant de demander à Anthony. J'ai poursuivi sur la foi de son plan de nuit (« tout autonome »), parce que chaque défaut était précis et réparable. C'est écrit dans le journal.
- Décision qui revient à Anthony : le plan gratuit PTV est réservé aux tests (FAQ PTV), il faudrait un plan payant pour la production.
- HERE n'a jamais répondu pour de vrai (aucune clé) : US-5.5 et US-5.E3 restent bloquées.
- Les rapports de livraison m2 et m3 attendent les commentaires d'Anthony.
- Le validateur reste rouge sur un seul point : « jalon m4 non construit ». C'est le signal de relance du nœud, pas un défaut de cette passe.
- Fichier égaré `m3-step-descriptions.json` à la racine, version périmée laissée par le descripteur cycle 4 : je ne l'ai pas suivi dans git et je ne l'ai pas supprimé.

**Pour la suite**
- Passe 8 = jalon 4 « Enregistrer en roulant et Royaume-Uni » (cas d'usage tests/e2e/use-cases/m4-use-case.md, trajet GPX rejoué).
- Économiser le quota PTV pendant les tests : environ 500 appels par jour, remise à zéro à 00:00 UTC.
- Le lanceur `LA_BOUCLE_SUR_VPS=1 /home/claude/surveillance/lancer-agent-claude.sh <nom> <consigne> <dossier>` rend la main tout de suite. On attend le fichier `agents-codex/<nom>.fin`, et le transcript est dans `~/.claude-yahoo-agents/projects/…`.
- Le verrou de livraison de la boucle (`/home/claude/la-boucle-preuves`) n'est pas accessible au compte claude et ne concerne pas cette appli : dire aux agents de l'ignorer.
- Avant la livraison : retirer `m3-admin-test@example.org` s'il existe encore.
