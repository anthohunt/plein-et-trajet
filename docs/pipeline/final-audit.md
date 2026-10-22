# Audit de livraison — étape 6 « Livrer » (Plein & Trajet)

**Score : 4/5 — PASS**

Auditeur indépendant, 22/10/2026. Jugé sur pièces : `final-verification.md`, `screenshot-manifest.md`, plans `m1..m6-use-case.md`, `spec-final.md`, `reconciliation-report.md`, scripts lancés, PNG de `tests/e2e/final/` (md5, horodatages), journal et résultats bruts du passage (`<scratchpad>/aux/journal.md`, `m5-resultats-final*.json`, `complement-resultats-*.json`).

**En bref** : le transcript est honnête et adossé à des traces. Les 207 captures sont fraîches : les 140 de run-m5 ont un md5 identique à celui que le journal du 22/10 a noté au moment de la prise. La complétude est de 207 sur 231, et les 24 absences sont celles acceptées d'avance. Toutes les fonctions à bascule montrent une vraie différence avant / après. Pas de 5 pour trois raisons : une borne déclarée PASS ne se voit pas (V-4.4-04, « + » plafonné à 9), plusieurs entrées du manifeste sont fausses (corrigées en ouvrant 6 PNG), et la réconciliation reste incohérente sur V-2.1. Je n'ai trouvé aucune fabrication.

## 1. Honnêteté du transcript

| Point vérifié | Constat | Preuve |
|---|---|---|
| Nombre de captures | 207 PNG, conforme à l'annonce | `ls tests/e2e/final/*.png \| wc -l` → 207 |
| Horodatages | Tous du 2026-10-22, 06:36 → 06:54Z (PNG). Ensuite le manifeste à 07:16-07:20, les plans réécrits à 07:10 et `test-results/.last-run.json` à 07:08 (`status: passed`). C'est cohérent avec « 06:36Z → 07:12Z ». | `ls -l --time-style=full-iso` |
| Captures relancées | US-1.E1 à 06:50, US-5.1/5.6 à 06:51, US-5.2 et 5.E1 à 06:54, US-NEW-1/2 à 06:52-06:53 : postérieures aux échecs du 1er passage (`complement-resultats-m1-m2-m3.json` : US-1.E1, 5.1, 5.2, 5.6 `ok:false`), puis `ok:true` dans `complement-resultats-m1-m3.json` et `-m3.json` | fichiers JSON du dossier aux |
| md5 du journal = md5 des fichiers | 140 / 140 captures run-m5 : le md5 `liv` noté au moment de la prise est égal au md5 du fichier dans `tests/e2e/final/` | script de contrôle sur `m5-resultats-final-*.json` + `m5-resultats-final2-cas.json` |
| Scripts cités | Ils existent et écrivent sous les noms annoncés : `m5-explore-outils.mjs:10-12` (SHOTS_DIR / SHOTS_AUX_DIR, modifié à 06:36:18) et `:212-215` (`page.screenshot()` → `writeFileSync`, aucune copie de fichier) ; `final-complement.mjs:14,41` ; `v32-web-verrou.mjs:44,63` | lecture du code |
| ✗ du 1er passage | V-1.2-02 (écart de libellé EEA) et V-4.1-02, V-4.2-04, V-4.2-06 (moyenne 2,154 → 2,153 pendant le run) apparaissent bien au journal ; le rejeu `final2-cas` sort 32/32 ✓ | `grep ✗ journal.md` |

**Identité md5 avec des captures plus anciennes (signalée, puis jugée NON fautive)** : 22 empreintes de `final/` existent aussi dans des dossiers du 21/10. 21 sont dans `exploration/m5-captures-brutes/` et 1 dans `screenshots/m6/V-3.2-05-avant.png`. Elles couvrent 37 fichiers de `final/`, par exemple V-1.1-01, V-2.E1-01..04, V-2.3-01/02, V-6.1-04, V-6.4-04 et V-3.2-05. Trois indices montrent que ces fichiers ont été rendus le 22/10, pas copiés :
• le journal du 22/10 date chaque prise et note son md5 (ex. `V-1.2-02-apres.png ✗ (06:37:00Z, md5 25c9bd31)`) ;
• le code écrit le tampon de `page.screenshot()` ;
• toutes les captures identiques montrent des écrans **déterministes**, sans prix du jour ni horloge : accueil Clio, formulaire Ma voiture, historique vide ou préparé en IndexedDB, « Trajet trop court ».

Sur 342 comparaisons à nom égal entre `final/` et les dossiers anciens, 309 diffèrent : toutes les captures qui portent des prix du jour ou des compteurs GPS. Conclusion : rendu déterministe de Chromium, pas de recyclage.

## 2. Complétude

231 captures au plan (toutes extraites des `— capture \`X.png\``), 207 présentes, **24 absentes, toutes listées avec raison** dans `final-verification.md`. Aucun fichier en trop, aucune absence non listée.
• 10 Moteurs (US-5.3 ×4, US-5.4 ×2, US-5.E2 ×4) : absences acceptées d'avance (écriture de clés de production).
• 14 Android (V-3.2-01..04, V-3.3-01..06, V-1.3-A01/A02/A04, V-3.2-A31) : raison partiellement vérifiée. `which java adb` ne rend rien et `~/Android` n'existe pas sur le VPS. Le blocage de la CI par la facturation n'a pas pu être vérifié (`gh` absent) ; je le reprends tel que l'affirme `reconciliation-report.md`.

## 3. Exactitude visuelle — tableau des constats

| Gravité | Capture / histoire | Constat | Preuve |
|---|---|---|---|
| MEDIUM | V-4.4-04 (V-4.4, étape 4) | L'étape dit : « − ne descend pas sous 1 et + ne dépasse pas 9 ». La capture est identique à V-4.4-03 (Personnes 1). Le plafond à 9 ne se voit donc pas : il n'est prouvé que par le journal (« 10 touchers sur + → 9, + désactivé ; revenu à 1 »). Le « − » grisé à 1 se voit, lui (constaté sur V-4.2-02). | manifeste l.528 « Rendu identique » ; journal l.358 |
| MEDIUM | Manifeste V-3.4-03 / V-3.4-04 | Le descripteur a inversé les deux descriptions : il décrit V-3.4-03 comme « Enregistrement 32,1 km » alors que ce fichier a le même md5 que V-3.4-02 (4d3b0290, « En pause »). J'ai ouvert les deux PNG. **Les captures sont justes** : 03 = En pause, 30,3 km, Reprendre ; 04 = Enregistrement, 32,1 km, Pause. Pause et reprise sont vérifiées, et les 2 km de la pause ne sont pas comptés. | manifeste l.398-403 ; md5 ; PNG ouverts |
| MEDIUM | V-2.1 (classe [UNCHANGED]) | Le critère de `spec-final.md:35` et le plan `m5-use-case.md:53` disent encore « fiche Renault Clio 1.2 **TCe 120** ». La capture V-2.1-02 montre « RENAULT CLIO 1.2 · 118 CH ». C'est le même écart EEA que V-1.2, qui a été passée en [MODIFIED] : la réconciliation n'est pas cohérente. | manifeste l.300 ; grep `TCe` |
| MEDIUM | 37 fichiers à md5 identique à des captures du 21/10 | Voir §1 : la règle « une seule identité = faute grave » est déclenchée à la lettre. Après examen, ce sont des rendus frais d'écrans déterministes, pas des copies. | `md5sum`, journal, code |
| LOW | US-1.4-04 | Le manifeste dit « aucune fiche ouverte », ce qui suggère un échec. Mais l'étape 4 du plan porte sur le **marquage vert / orange**, pas sur l'ouverture d'une fiche (celle-ci est en 02, où la fiche Esso s'ouvre bien). PNG ouvert : pastilles bordées de vert (≤ 2,364) et d'orange (≥ 2,383), légende « moins cher / plus cher » visible. Conforme. | PNG ouvert ; `complement` : « 6 vertes, 7 orange » |
| LOW | V-4.2-02 | Le manifeste lit « Mon prix 1,98⁰ ». PNG ouvert : **1,98⁹**, coût 1,09 €, « Revenir à la moyenne » présent. Conforme au plan (1,989). | PNG ouvert ; journal l.195 |
| LOW | V-3.2-06 | Le manifeste ne cite pas la phrase attendue. PNG ouvert : « Garde l'écran allumé : un navigateur arrête le GPS écran éteint. » est présente. Le verrou d'écran lui-même ne se voit pas (affirmé par `data-verrou=actif`). | PNG ouvert |
| LOW | US-5.6-02 | Le manifeste ne montre pas la consigne PTV. PNG ouvert : « Où trouver ma clé · Connecte-toi, puis ouvre le menu « API Keys »… » est visible sous Péages. Conforme. L'URL cible ne se voit pas, elle est affirmée par la lecture du DOM. | PNG ouvert |
| LOW | US-6.E3-01/02 | Rendus identiques, octets différents. Attendu : après rechargement, le même état est conservé (2,0 km, Pause / Arrêter). Mais l'image seule ne prouve pas qu'un rechargement a eu lieu ; seul le journal le dit (« 420 points conservés »). | manifeste l.178-179 |
| LOW | US-1.E3-01/02/03 (= V1-retraits-02) | Étape d'observation sur données réelles : l'état de départ EST le résultat (« prix du 20/10 » en italique atténué, visible aussi sur US-1.4-04). L'étape 3 « rétablir et vérifier le retour » est vide de sens, puisque rien n'a été injecté. Acceptable. | md5 identiques ; manifeste l.731 |
| LOW | Paires identiques d'observation | Étapes où « faire » est en réalité « l'écran s'affiche / je lis », donc l'état de départ est le résultat. Toutes acceptables : US-1.6-01/02/03, V-1.1-01/02, V-1.2-01/02, V-1.2-05/06, V-4.1-05/06 (« Moyenne Espagne » déjà visible), V-4.3-01/02 (89,03 €), V-4.5-01/02 et V-4.6-01 (courbes), V-6.2-01/02 (4 trajets, 717 km), US-5.E1-01/02 (pas de lien Moteurs), US-3.E3-01/03 (retour à Trajet demandé), V-5.2-02/03 (fin d'une étape = début de la suivante), US-5.1-02 = US-5.6-01 (point de départ). | manifeste |
| LOW | Fonctions à bascule | Toutes montrent une différence avant / après : pause / reprise (V-3.4), carburant (V-4.1-03/04, V-5.2-03/04, US-1.E4, US-1.E2), tri (V-5.4), « Rechercher dans cette zone » (V-5.3, V-5.7-05/06), prix modifié (V-4.2, V-4.3-03/04, V-6.2-03/04, V-6.4-01/02), personnes 1 → 3 (V-4.4-01/02), fournisseur (US-5.2). | manifeste |
| LOW | US-A11Y-004-02 | La capture montre l'état de chargement « … » obtenu par injection, pas les libellés : ceux-ci ne sont pas visuels et ont été vérifiés dans le DOM (« Recentrer sur ma position / Fermer la fiche »). La preuve visuelle de l'histoire est donc indirecte. | manifeste l.208 ; complement JSON |
| LOW | US-5.E1-03, V1-retraits-03/04 | Pages de relevé rendues par le script (réponses 401, table `moteurs`, comptage Vault). Ce n'est pas l'interface de l'appli, mais la preuve est acceptable pour des refus serveur. | manifeste l.157, 735-738 |
| LOW | V-3.5-06 | La capture est prise pendant la coupure réseau. Le complément des noms au retour du réseau se voit indirectement : V-4.7-03 rouvre le même trajet sous « ALBI → ALBI » (2,0 km, 0,36 €). Le journal l.158 le dit explicitement. | manifeste l.423, 553 |
| LOW | Journal | Des lignes « Garé … km 4,0 → 4,0 … ✗ (r1 : 4,0 → 5,1 km) » (V-3.E1, constats) ne sont pas mentionnées dans `final-verification.md`. Leur contenu décrit le comportement voulu (km figés à l'arrêt) ; le ✗ paraît marquer la comparaison avec r1. Non bloquant, mais non expliqué. | journal l.174, 455 |
| LOW | Plans non entièrement réécrits | m1 : US-1.E3 / E4 / 2.E1 « Mise en place : … fixture Supabase » est conservé alors qu'aucune fixture n'a servi, et l'intro dit encore « captures dans tests/e2e/screenshots/m1/ ». m3 : l'énoncé de US-5.1 dit encore « depuis le bouton ⚙ » et l'étape 3 de US-5.E1 « le bouton moteurs n'est pas affiché ». | plans m1, m3 |
| LOW | US-1.P1 [UNCHANGED] | Le parcours exige désormais « Rechercher dans cette zone » après le glisser (écart noté par le bâtisseur). Le critère (recentrer → retour sur ma position, liste rechargée) tient : US-1.P1-01 → 02, de Bellegarde (1 station) à Albi (6 stations). La classe est défendable. | manifeste l.74-78 |
| LOW | Playwright « 102 passés » | Seule trace : `test-results/.last-run.json` (07:08, `passed`, aucun échec), cohérente avec le dernier rejeu. Le décompte 102 / 1 n'est pas vérifiable sur pièce. | `.last-run.json` |

## 4. Couverture

• 62 histoires non retirées (41 [UNCHANGED] + 17 [MODIFIED] + 4 [NEW]), plus le contrôle négatif V1-retraits.
• **56 couvertes par des captures fraîches** du 22/10.
• **6 non rejouées, avec une raison acceptée d'avance** : US-5.3, US-5.4, US-5.E2 (clés de production), V-3.3, US-NEW-3, US-NEW-4 (Android). V-3.2 est couverte pour sa partie web seulement (étapes 5-6).
• Les 4 [NEW] :
  • US-NEW-1 (erreur récupérable, avec Effacer → accueil sans voiture) et US-NEW-2 (paysage 844 × 390) sont couvertes et conformes ;
  • US-NEW-3 et US-NEW-4 n'ont aucune capture fraîche. Seules existent les captures de la CI du jalon 6, recopiées dans `docs/delivery/screenshots/` et non dans `final/`, et l'APK publié n'embarque pas les correctifs du durcissement (`reconciliation-report.md`).

## 5. Cohérence des classes

• Aucune histoire [UNCHANGED] dont la capture montrerait un autre comportement, sauf **V-2.1**, dont le texte du critère (TCe 120) contredit la capture (voir §3).
• Les 7 services de US-5.1 et l'absence de proposition « reprendre ou arrêter » dans US-6.E3 sont bien reportés en [MODIFIED].

## Captures à refaire

• `V-4.4-04-apres.png` : Personnes à **9** après 10 touchers sur « + », avec le bouton « + » grisé. Une capture complémentaire montrant « − » grisé à 1 avec « Seul : tout pour toi. » peut rester celle d'aujourd'hui.

Entrées du manifeste à corriger (descripteur, pas les captures) : V-3.4-03, V-3.4-04 (descriptions inversées), V-4.2-02 (1,98⁹ et non 1,98⁰), US-1.4-04 (marquage vert / orange présent).

## PNG ouverts (6 sur 10 autorisés)

`V-3.4-03-avant.png`, `V-3.4-04-apres.png`, `US-1.4-04-toucher-une-pastille-apres.png`, `V-3.2-06-apres.png`, `US-5.6-02-ou-trouver-ma-cle-apres.png`, `V-4.2-02-apres.png`.

## Ce que je n'ai pas pu vérifier

• Le blocage de la CI GitHub par la facturation : `gh` est absent du VPS, je reprends l'affirmation de la réconciliation.
• Le décompte Playwright (102 passés, 1 rejoué 5 fois) : seul `.last-run.json` subsiste.
• La suppression effective des administrateurs éphémères et l'absence d'écriture dans Vault / `cles_fournisseurs` / `moteurs` : je ne l'ai pas relue en base ; je me fonde sur V1-retraits-04 (2 lignes, 3 secrets, inchangés) et sur le relevé 401 de US-5.E1-03.
• Les URL cibles des liens « Où trouver ma clé » (non visibles à l'image).
• Le verrou d'écran web (V-3.2-06), affirmé par un attribut du DOM.

Question restée ouverte (personne pour y répondre) : que signifie le ✗ des lignes « Garé … » du journal V-3.E1 ? S'agit-il d'un écart non rapporté ou d'un simple marqueur de comparaison avec r1 ?

## Suite donnée par le livreur (ajout après l'audit, hors note)
• V-2.1 reclassée [MODIFIED] dans `spec-final.md` et `reconciliation-report.md` (40 inchangées, 18 modifiées) ; plan m5 réécrit (« Renault Clio 1.2 · 118 ch »).
• Plans m1 (fixtures, dossier des captures) et m3 (bouton ⚙, US-5.E1 étape 3) réécrits.
• V-4.4-04 (plafond à 9 personnes) **non refaite** : l'audit passe sans elle ; elle reste le seul trou de preuve visuelle, la vérification repose sur le journal du passage (`final-verification.md`).
• Erreurs du manifeste (V-3.4-03/04, V-4.2-02, US-1.4-04) : le manifeste n'est pas réécrit, il garde la trace de ce que le descripteur a vu ; les captures, elles, sont justes.
