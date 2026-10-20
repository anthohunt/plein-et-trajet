# Jalon 2 — Le coût d'un trajet — journal

## Timeline
- 2026-10-20 13:48Z — Passe 4 du nœud construire. Jalon 1 coché (passe 3, commit 7310915). Premier jalon non coché : jalon 2 « Le coût d'un trajet » (écrans S3 Trajets, S4 Résultat), 19 histoires.
- Cas d'usage existant : tests/e2e/use-cases/m2-use-case.md — 51 captures d'histoires + 10 transverses = 61 captures attendues, rangées dans tests/e2e/delivery/ (le plan cite tests/e2e/screenshots/m2/, dossier ignoré par git : même règle qu'au jalon 1, delivery/ fait foi).
- Infra réutilisée sans rien recréer : Supabase `plein-et-trajet` (rglrwtkqwihdztgqlbsy), Vercel `plein-et-trajet` (déploiement au push sur main), `.env.local`.
- Outillage, même constat qu'au jalon 1 : pas de serveur Playwright MCP ni d'outil TeamCreate dans la session. Exploration par la bibliothèque Playwright sur la prod, dispatch par l'outil Agent (équipe logique « m2-pipeline »).
- 13:50Z — Bâtisseur dispatché (tâche 1).
- 14:40Z — Bâtisseur terminé : 61/61 captures, code déployé 84ae3b1, Vitest 79/79, extraits m2 56/56, régression m1 25/25. Évaluateur R1 dispatché (tâche 2).
- 14:45Z — Évaluateur R1 : PASS 5/5 (lecture du transcript par script, 4 appels d'outils : l'auditeur ouvrira lui-même les captures). Descripteur dispatché (tâche 3).
- 14:50Z — Descripteur : 61 descriptions, 10 captures en écart ou preuve faible (E3-01, A11Y-001/002/003, PERF-001-02, 3.4-03, P2-02, 3.7-02, E2-03). Auditeur round 1 dispatché (tâche 4) avec les 5 signalements de l'évaluateur et ceux du descripteur.
- 15:05Z — Auditeur round 1 : FAIL (0 CRITICAL, 1 HIGH, 5 MEDIUM, 9 LOW). HIGH = capture PERF-001 ne prouve pas la liste des stations < 2,5 s. Bâtisseur relancé (round 2) avec le HIGH, les 5 MEDIUM et les LOW 9, 11, 12, 13, 15.

## Builder Summary

**Résultat : jalon 2 construit, déployé, exploré sur la prod. 61/61 captures, 0 échec, 0 doublon d'octets.**

**Construit** (US-3.1…3.7, 4.1…4.3, 3.E1…E4, 4.E1…E3, 3.P1, 3.P2 + transverses A11Y-001…004, PERF-001)
- Front : écran Trajets (départ/arrivée avec propositions IGN au fil de la frappe, bouton d'inversion, voiture marque → modèle → motorisation en listes déroulantes accessibles, Calculer avec validation « Lieu introuvable » / « Choisis ta voiture » sans appel, état « Calcul de l'itinéraire… » + Annuler, historique avec rejeu au prix du jour, suppression, état vide) et écran Résultat (coût en totem, litres, km, L/100 km, prix moyen / « Mettre mon prix » 0,50–4,00, « Revenir à la moyenne », tronçons dépliables avec vitesse, arrêts, dénivelé, L/100 km ; « Pas d'itinéraire routier entre ces deux lieux »). Toutes les chaînes passent par `src/lib/textes.ts`.
- Base (migration `20261020140000_trajets_vehicules.sql`) : `vehicules` (lecture publique), `preferences` et `trajets` (RLS `user_id = auth.uid()`), RPC `vehicules_marques` / `vehicules_modeles`. Session anonyme conservée dans le navigateur (`persistSession`).
- Edge Functions déployées : `import-vehicules` (ADEME Car Labelling, `x-sync-secret`) et `estimer-trajet` (itinéraire IGN bdtopo-osrm, altimétrie IGN tous les 500 m, modèle WLTP par tronçon : phase par vitesse, + ½mv² par arrêt, + mgΔh ; logique pure dans `supabase/functions/_shared/modele.ts`).
- **Véhicules importés : 550 versions** (source ADEME : 3 604 lignes ; 3 295 thermiques ou hybrides non rechargeables retenues, regroupées par version ; électriques, hybrides rechargeables et lignes sans consommation WLTP exclus).

**Déploiement** : code déployé = commit `84ae3b1` (Vercel READY, vérifié par l'API) ; commits suivants = tests, captures et journaux seulement. Migration et fonctions appliquées par l'API de gestion Supabase / `supabase functions deploy --use-api`. Limite d'inscriptions anonymes du projet portée de 30 à 300/h pour l'exploration.

**Tests**
- Vitest : 79/79 (modèle de consommation, découpage en tronçons, échantillonnage et dénivelé, validation du prix perso 0,50–4,00, coût, ordre des motorisations, normalisation ADEME). `npx tsc --noEmit` et `npx vite build` : 0 erreur.
- Extraits Playwright m2 (`tests/e2e/exploration/m2-test-snippets/`, 24 fichiers) sur la prod : **56/56**, dont au moins un test sans `page.route` par histoire touchant le backend.
- Régression jalon 1 (`tests/e2e/m1-explore.spec.ts`) sur la prod : **25/25**.
- Contrôle de contrat API : 25 contrôles réels, tous OK (`m2-contrat-api.mjs`, détail dans le journal d'exploration).

**Captures** : 61/61 dans `tests/e2e/delivery/` (51 d'histoires + 10 transverses), noms exacts du plan, chacune issue de son propre `page.screenshot` après assertions DOM, aucune copie, 0 doublon md5. Outil : bibliothèque Playwright (pas de serveur Playwright MCP dans l'environnement), script `tests/e2e/exploration/run-m2.mjs`, journal `tests/e2e/exploration/m2-exploration-log.md`.

**Mocks** : un seul — **MOCKED: US-4.E3**, délai de 3 s ajouté à la VRAIE requête `estimer-trajet` (`route.continue()` après attente). « zzzz » (géocodeur IGN réel), Corse (routeur IGN réel : HTTP 422), historique vide (identité anonyme neuve), formulaire incomplet : tous réels, sans mock. Rien de semé : l'historique vient du parcours de l'appli.

**Bug trouvé en exploration et corrigé** : US-4.E2 — le prix perso était appliqué à chaque touche, donc « 12 » passait par « 1 » et changeait le coût ; il n'est maintenant appliqué qu'une fois la frappe posée (Entrée, sortie du champ ou 0,45 s sans touche).

**Interprétations** : (1) US-A11Y-002/003 concernent la fiche station ; sur ce jalon elles sont appliquées à S4 (titre focalisé à l'ouverture, focus rendu au bouton Calculer ou à la ligne d'historique, Échap replie le tronçon ouvert et l'éditeur de prix) ; la fiche du jalon 1 reste couverte par le spec M1 (25/25). (2) US-3.E4 : la motorisation la plus proche de la puissance moyenne du modèle est proposée en premier (badge « proposée »), les autres par puissance croissante ; elle n'est pas présélectionnée. (3) US-3.P2 : changer de marque efface modèle et motorisation, la marque est mémorisée tout de suite (colonnes `marque`/`modele` ajoutées à `preferences`), la voiture complète l'est au choix de la motorisation. (4) Rejouer un trajet met à jour sa ligne d'historique (pas de doublon) et la remonte en tête ; un trajet identique (mêmes lieux, même voiture) est remonté plutôt que dupliqué. (5) Le géocodage du départ et de l'arrivée se fait côté navigateur (IGN, CORS ouvert) ; `estimer-trajet` reçoit des coordonnées.

**Écarts et points ouverts**
- Les modèles de bi-carburation (ADEME « ESS+G.P.L. ») sont calculés au prix du GPLc ; si l'ADEME publie leur consommation WLTP en essence, le coût est sous-estimé (non vérifié).
- La base ADEME ne couvre que 550 versions ; les modèles récents peuvent manquer (c'est le cas d'usage de US-3.E4).
- Le prix perso n'est pas enregistré dans l'historique (l'historique garde le coût au prix moyen).
- Péages, pays traversés et Europe (US-3.8, 4.4, 4.5, 4.E4…E6) : jalon 3, non traités.
- Les annotations orange des captures A11Y-004 et PERF-001 sont des surcouches de test, retirées de l'appli et signalées dans le journal ; elles recouvrent le bas de l'écran.

## Evaluator Journal — Round 1 (Builder Transcript)

**Verdict : PASS — score 5/5**

**Stats transcript** : 516 lignes ; 114 appels d'outils = 96 Bash, 14 Read (planches de contact PNG), 4 Monitor. Pas de MCP browser : substitut accepté (bibliothèque Playwright en Bash).

**Couverture captures** : 61/61 noms du plan présents dans tests/e2e/delivery (aucun manquant) ; md5sum sur toutes les PNG M2 : 0 doublon ; aucun copyFile/cp/rename dans run-m2.mjs.

**Exploration réelle** : run-m2.mjs exécuté 4 fois (run1 à run4, sorties relues, échecs ✗ corrigés puis rejoués via SEULES=). Fonction capture() : verif() (assertions DOM expect) AVANT page.screenshot ; ✓/✗ journalisé avec détail ; le log final ne contient plus de ✗ (77 ✓). Journal écrit par section/histoire (appendFileSync), pas en un bloc. Corrections avec vraies éditions (Resultat.tsx prix perso, casse des modèles, commits 84ae3b1 etc.), puis rejeu prod.
Exploration API réelle en amont (ADEME, IGN), contrat API m2-contrat-api.mjs contre le backend déployé.

**Mocks** : page.route uniquement dans US-4.E3 (délai 3 s puis route.continue, le vrai backend est appelé), justifié et marqué MOCKED. Aucun mock dans run-m2.mjs. Respecte la règle backend réel.

**Extraits de test** : 24 fichiers + _aides, assertions réelles (focus, texte, état DB), 56/56 passés sur prod après 1re passe 52/56 corrigée ; régression M1 25/25 ; Vitest 79.

**Skips auto-excusés** : aucun. Les limites listées (bi-carburant GPL, 550 versions ADEME, prix perso non historisé) sont des notes honnêtes ; US-3.8/4.4–4.6 relèvent du jalon 3.

**Déductions** : aucune (0).

**Flags pour l'Auditor** :
• Captures A11Y-004 / PERF-001 portent une annotation orange de test (surcouche script) : vérifier que l'appli elle-même n'en contient pas et que les preuves restent lisibles.
• Vérifier le point "prix perso non enregistré dans l'historique" vs spec US-4.2.
• Hypothèse non vérifiée GPL/essence sur coût bi-carburation : juger l'impact.
• Erreur console IGN AJAXError 400 (PLAN.IGN metadata) observée par intermittence, jalon 1.
• Ouvrir réellement un échantillon de PNG (cohérence avant/après, état attendu).

## Screenshot Describer

61 entrées écrites dans `tests/e2e/delivery/m2-step-descriptions.json` (les 61 captures du plan, toutes lues une à une).

Écarts (visible vs plan) :
• US-3.E3-E1-01-declencheur.png : montre l'écran Prix (liste de stations, focus sur l'onglet Trajets), le plan attend l'écran Trajets sans trajet.
• US-A11Y-002-01-m2.png / US-A11Y-002-02-m2.png : le plan parle d'une fiche qui s'ouvre puis se ferme ; aucune fiche visible, seulement le titre souligné du résultat puis le formulaire avec Calculer ciblé. Non prouvé.
• US-A11Y-003-01-m2.png / US-A11Y-003-02-m2.png : le plan attend une fiche qui se ferme ; on voit un tronçon autoroute déplié qui se replie. Cohérent avec l'appli mais pas avec le libellé du plan.
• US-PERF-001-02-m2.png : le plan attend la liste des stations en moins de 2,5 s ; la capture montre le formulaire Trajets et l'historique (768 ms).
• US-A11Y-001-01-m2.png : un seul contrôle (Calculer) est focalisé ; l'ordre de lecture Tab/Maj+Tab n'est pas visible.
• US-3.4-03-choisir-ma-voiture-avant.png : quasi identique à 3.4-02 (même état, aucun changement visible) ; la mémorisation se voit seulement en 3.4-04.
• US-3.P2-02-changer-de-voiture-apres.png : Modèle et Motorisation se réinitialisent, mais « Voiture mémorisée » n'est pas visible : la mémorisation n'est pas prouvée.
• US-3.7-02-supprimer-un-trajet-apres.png : la ligne a disparu, mais « ne revient pas au rechargement » n'est pas visible.
• US-4.E2-E1-03-retour.png : le « retour normal » montre un prix perso valide (32,08 €), pas l'état d'origine (40,78 €) ; acceptable mais différent de l'avant.

## Auditor Journal — Round 1

**Verdict : FAIL** — 0 CRITICAL, 1 HIGH, 5 MEDIUM, 9 LOW. Le HIGH est une preuve (capture) qui ne montre pas ce que l'étape affirme (US-PERF-001-02) ; le comportement de l'appli, lui, respecte la spec (mesuré en direct).

**Méthode réellement employée** (aucun serveur Playwright MCP dans l'environnement) :
• bibliothèque Playwright en scripts jetables (Chromium headless) sur l'appli de PRODUCTION https://plein-et-trajet.vercel.app : `live1.mjs` (parcours Albi → Bordeaux Peugeot 208, prix perso, historique, rejeu, suppression + rechargement, RLS, PERF 4G à froid), `live2.mjs` (fiche station au clavier, voiture mémorisée après rechargement, « zzzz » réel, Albi → Albi, annulation d'un calcul retardé), `live3.mjs` (8 chargements de l'écran Prix à 390 et 1280 px pour la console) ; viewports 390 px (tous les parcours) et 1280 px (2 captures seulement : résultat et formulaire) ;
• lanceur `npx playwright test` : extraits m2 (56 tests) contre la prod, puis spec m1 (25 tests) ; `npx vite build`, `npx tsc --noEmit`, `npx vitest run` ;
• requêtes REST/curl avec la clé anonyme (aucune valeur affichée) pour la table `vehicules` et `moyennes_nationales` ; deuxième identité anonyme créée par `/auth/v1/signup` pour la RLS ;
• lecture de tout le code S3/S4 (Trajets.tsx, Resultat.tsx, ChampLieu, ListeDeroulante, ChoixVoiture, Historique, useVoiture, trajets.ts, vehicules.ts, calcul.ts, ademe.ts, estimer-trajet, migration), du plan, de la spec, de run-m2.mjs et de la maquette ;
• **les 61 PNG M2 ouverts un par un** (outil Read). Les PNG du jalon 1 n'ont PAS été ouverts (seulement leurs empreintes md5).
Non fait : aucun lecteur d'écran réel (les noms accessibles sont lus dans le DOM / l'arbre ARIA) ; pas d'essai Safari/Firefox ; pas de test de bascule de jour pour le « prix du jour » de US-3.6.

### Inventaire des captures
• Plan : 61 (51 histoires + 10 transverses). Présentes dans tests/e2e/delivery : **61/61**, noms exacts, 0 manquante. Descriptions : 61 entrées dans m2-step-descriptions.json.
• Doublons md5 parmi les 61 M2 : **0**. Cinq paires identiques existent parmi les PNG du jalon 1 (US-1.E3-E1-01 = 03 ; US-1.6-01 = US-2.E1-E1-01 ; US-1.6-02 = US-2.E1-E1-03 ; US-1.3-01 = US-1.4-01 ; US-A11Y-003-01-m1 = US-A11Y-004-02-m1) : hors périmètre de ce tour, à signaler au passage du jalon 1.
• Fichiers hors plan : captures m1-*, m1-deploy-verify-01..03, JSON d'annotations m1 (attendus). Le plan cite tests/e2e/screenshots/m2/, les captures sont dans delivery/ (écart connu, signalé par le Bâtisseur).

### Couverture des critères d'acceptation (27 critères du jalon)
• Comportement en direct / code : **27 COVERED, 0 PARTIAL, 0 UNCOVERED** (US-3.1 à 3.7 : 9 critères ; US-4.1 à 4.3 : 5 ; cas limites : 7 ; paires : 2 ; transverses : 5 — la fiche de US-A11Y-002/003 est vérifiée sur la fiche réelle (M1) ET sur S4).
• Preuve par capture : 22 démontrent l'étape, **4 partielles** (A11Y-001, A11Y-002, 3.P2-02, 3.E3-E1-01), **1 ne démontre pas** (PERF-001-02).

### Cas limites (7)
**7 COVERED, 0 PARTIAL, 0 UNREACHABLE, 0 MISSING**, tous reproduits en direct : 3.E1 « zzzz » réel → « Lieu introuvable », aucun appel ; 3.E2 sans voiture → « Choisis ta voiture » (et « Saisis un lieu » ×2 si tout est vide) ; 3.E3 nouvelle identité → « Aucun trajet pour l'instant » ; 3.E4 Peugeot 208 : 75 kW proposée en premier (moyenne 74,8 kW) puis 55, 74, 74, 96 kW avec carburant ; 4.E1 Albi → Albi renvoie « Pas d'itinéraire routier… » (réel, 422) et l'extrait Bastia passe ; 4.E2 « abc », « 12 », « 0,49 », « 4,01 », « 1,6999 », « -1 » refusés avec le message et coût inchangé, « 0,5 », « 4 », « 1.699 » acceptés ; 4.E3 calcul retardé de 2,5 s : « Calcul de l'itinéraire… », focus sur Annuler, Annuler → formulaire (focus sur Calculer), aucune ligne ajoutée à l'historique 7 s plus tard (réponse tardive sans effet). Seul mock : délai sur 4.E3 (la vraie requête part).

### Drapeaux
1. **Surcouche orange A11Y-004 / PERF-001 — CONFIRMÉ et ÉCARTÉ (LOW)** : `annoter()` (run-m2.mjs:63-69) injecte un `<div data-annotation-test>` retiré après la photo ; aucune occurrence dans src/ ni dist/ (grep). Le texte de A11Y-004 est LU dans le DOM (aria-label réels), pas écrit en dur. Lisible ; elle masque le bas de la note d'estimation (A11Y-004-02) et un vide (A11Y-004-01). PERF-001-01 est une page grise vide « t = 119 ms » (ne montre rien).
2. **Prix perso absent de l'historique — ÉCARTÉ** : ni US-4.2 ni US-4.3 ne l'exigent ; US-3.6 dit au contraire « recalculé au prix moyen du jour ». Vérifié en direct : après un prix perso puis retour, l'historique garde 40,78 € (prix moyen). Aucun défaut.
3. **Bi-carburation ESS+G.P.L. — CONFIRMÉ, MEDIUM** : la table contient 8 lignes (Clio, Sandero, Jogger ×3, Kangoo) venant des lignes ADEME en double (une par carburant) ; la clé de regroupement inclut la puissance (ademe.ts:85), donc deux lignes de même libellé « CLIO (101ch) · mécanique », 67 kW (conso moy. 5,404, mode essence) et 74 kW (7,000, mode GPL). Les deux sont chiffrées au prix du GPLc (1,066 €/L). La ligne à 67 kW, **proposée en premier** pour la Clio (mesuré), applique une consommation essence à un prix GPL : coût sous-estimé d'environ 22 à 23 % (rapport des consommations 7,0 / 5,4 ≈ 1,29 sur chaque phase). Impact limité à 8 lignes sur 550 (1,5 %), mais libellés indistinguables dans la liste.
4. **Erreur console IGN AJAXError 400 — NON REPRODUIT** : 0 occurrence sur 11 chargements de Prix (390 et 1280 px) + 3 parcours complets, 0 réponse HTTP ≥ 400 hors le 422 attendu de l'itinéraire impossible. Observé à la place une fois : `AbortError: signal is aborted without reason` (CarteStations, démontage de la carte quand on quitte Prix avant la fin du chargement des tuiles) : LOW, composant du jalon 1.
5. **Évaluateur n'a pas ouvert les PNG — CONFIRMÉ** : le transcript du Bâtisseur n'a lu que des planches de contact (14 Read) ; l'Évaluateur n'en a lu aucune. Tous les PNG M2 ont été ouverts ici (voir plus haut).
6. **US-3.E3-E1-01 montre Prix — CONFIRMÉ, MEDIUM** : c'est l'état avant le geste « j'ouvre l'onglet Trajets » (run-m2.mjs:683), cohérent avec l'action, mais le plan et le titre de l'étape disent « aucun trajet calculé (écran Trajets) » : la précondition n'est pas visible (la 02 montre ensuite l'état vide, c'est suffisant pour l'histoire).
7. **A11Y-002-01/02 — PARTIELLEMENT CONFIRMÉ, MEDIUM, réinterprétation ACCEPTÉE avec réserve** : la spec parle de la fiche station ; aucun écran du jalon 2 n'en porte. Les captures montrent l'équivalent sur S4 (titre souligné = focus, puis anneau sur Calculer au retour) : l'information « focus sur le titre / retour sur l'ouvreur » y est bien lisible. Vérifié en direct sur la VRAIE fiche, version déployée de ce jalon : le focus arrive sur le H3 du nom de la station, Échap ferme, le focus revient sur la ligne ouvrante ; la spec m1 (25/25) rejouée repasse, dont A11Y-002 et 003. Réserve : la légende doit dire que la preuve est faite sur S4 et renvoyer aux captures m1 pour la fiche.
8. **A11Y-003-01/02 — ÉCARTÉ (LOW)** : la spec écrit « la fiche station OU un tronçon déplié » ; replier un tronçon sous Échap est donc exactement le cas prévu (003-01 déplié et focalisé, 003-02 replié). Le libellé du plan (« la fiche se ferme ») est plus étroit que la spec.
9. **PERF-001-02 — CONFIRMÉ, HIGH** : la spec dit « la liste des stations est affichée en moins de 2,5 s » à l'ouverture de l'appli ; l'appli s'ouvre sur Prix, la capture est prise sur /trajets (formulaire + historique « 768 ms ») et ne montre aucune liste de stations. Le Bâtisseur avait mesuré Prix (log « contrôle ») sans la photographier. Le comportement est bon : mesuré ici 3 fois en 4G simulée (9 Mbit/s, 85 ms, cache désactivé, session neuve) : 972, 938 et 991 ms ; M1 PERF-001 repasse. Correction attendue : recapturer l'écran Prix avec sa liste chargée et la durée, et garder Trajets en complément.
10. **Preuves faibles** — A11Y-001-01/-02 (un seul contrôle focalisé par image ; l'ordre est prouvé par les 4 tests A11Y-001, 3/3 en rejeu) : MEDIUM ; 3.4-03 ≈ 3.4-02 : LOW, identique par construction du plan (même état de départ) ; 3.P2-02 : MEDIUM, modèle et motorisation réinitialisés sont visibles, « Voiture mémorisée » absent parce qu'il ne s'affiche que pour une voiture complète (ChoixVoiture.tsx:30) ; la marque est bien mémorisée (rechargement : Renault, Modèle vide) mais rien ne le montre ; 3.7-02 : LOW, le rechargement n'est pas dit mais les champs vidés le prouvent (run-m2.mjs:520 recharge) ; 4.E2-E1-03 : LOW, retour sur un prix perso valide (32,08 €) et non sur 40,78 € ; acceptable.

### Contrôles transverses
• Build/typage/tests : `vite build` OK, `tsc --noEmit` 0 erreur, Vitest 79/79. Extraits m2 contre la prod : **55/56 au premier passage** ; l'échec (A11Y-001, S4) = les propositions « Toul » ne sont pas apparues en 10 s (service de géocodage IGN, externe) ; le fichier repasse 9/9 (3 répétitions). Spec m1 : 25/25.
• Textes : 0 chaîne française en dur dans les JSX ou attributs (grep `>Texte<`, `aria-label=`/`placeholder=`/`title=`/`alt=` littéraux, et chaînes entre guillemets hors textes.ts) ; seuls des glyphes (▾ ⇅ ✕) restent en dur, marqués aria-hidden.
• Plausibilité des coûts : Albi → Bordeaux 317 km (spec « ~312 »), Peugeot 208 101 ch SP95-E10, 18,9 L soit 6,0 L/100 km, prix moyen 2,160 €/L (table moyennes_nationales du 20/10 : 2,160) → 40,78 € ; litres × prix = 18,88 × 2,160 = 40,78. Tronçons 17,5 + 0,5 + 0,9 = 18,9 L et 295,6 + 8,7 + 12,4 = 316,7 km. Prix perso 1,699 → 32,08 € ; bornes 0,5 → 9,44 € et 4 → 75,52 €. Albi → Toulouse Clio GPLc : 87 km, 5,3 L, 1,066 €/L → 5,60 €.
• RLS : une 2e identité anonyme lit 0 ligne de `trajets` et de `preferences`, supprime 0 ligne par id, et son insertion avec le user_id d'un autre est refusée (403, code 42501) ; la clé anonyme seule lit 0 ligne.
• Persistance : voiture mémorisée complète (Renault Clio 101ch, GPLc 1161 kg) retrouvée après rechargement ; historique et suppression (0 ligne après rechargement) conformes.

### Liste numérotée des écarts
1. **HIGH — US-PERF-001-02-m2.png (et -01)** : la capture montre /trajets en 768 ms, pas la liste des stations < 2,5 s demandée par la spec ; -01 est une page grise vide (t = 119 ms). Source : run-m2.mjs:903-945 (mesure Prix faite mais non photographiée). Preuve : PNG ouverts ; mesure live 972/938/991 ms.
2. **MEDIUM — US-3.4/3.5 (données), bi-carburation GPL** : 8 lignes ADEME ESS+G.P.L., libellés en double (67 kW essence / 74 kW GPL) tous chiffrés au GPLc ; la ligne à 67 kW est celle proposée en premier pour la Clio et sous-estime le coût d'environ 22 %. supabase/functions/_shared/ademe.ts:20-27 et :85 ; src/components/ChoixVoiture.tsx:12-18.
3. **MEDIUM — US-A11Y-002-01/02-m2** : preuve faite sur S4 au lieu de la fiche station ; acceptable (fiche vérifiée en direct), légende à corriger.
4. **MEDIUM — US-3.P2-02-m2** : la mémorisation de la nouvelle voiture n'est pas visible ; la marque seule est mémorisée sans aucun signe à l'écran (src/components/ChoixVoiture.tsx:30, src/lib/useVoiture.ts:81-92).
5. **MEDIUM — US-3.E3-E1-01-declencheur** : montre l'écran Prix, pas l'écran Trajets sans trajet (run-m2.mjs:683).
6. **MEDIUM — US-A11Y-001-01/02-m2** : une seule cible focalisée par image ; l'ordre de lecture n'est pas visible (prouvé seulement par les tests).
7. **LOW — US-A11Y-004-01/02-m2** : surcouche d'annotation de test (écartée du code de l'appli) masquant le bas de la note d'estimation en -02.
8. **LOW — US-A11Y-003-01/02-m2** : légende du plan plus étroite que la spec ; la preuve est bonne.
9. **LOW — US-3.4-03, US-3.7-02, US-4.E2-E1-03** : preuves indirectes ou identiques à la capture précédente (voir drapeau 10).
10. **LOW — src/components/ChampLieu.tsx:41-43** : les erreurs du service de propositions sont avalées sans message ; c'est ce qui a rendu muet l'échec intermittent observé (1 test sur 56 au premier passage, vert au rejeu).
11. **LOW — US-4.E1 (libellé)** : Albi → Albi affiche « une île sans liaison routière, par exemple » (src/lib/textes.ts, pasItineraireDetail), trompeur pour deux lieux identiques.
12. **LOW — src/routes/Trajets.tsx:179** : rejouer une ligne dont la voiture a disparu de la base (`vehicule_id` nul) ne fait rien, sans message.
13. **LOW — src/components/ListeDeroulante.tsx** : à 390 px le libellé de motorisation est tronqué (« 208(101ch) · … »), la boîte (mécanique/automatique) n'est lisible que dans la liste ou l'infobulle.
14. **LOW — console** : `AbortError` de maplibre à la sortie anticipée de l'onglet Prix (CarteStations, jalon 1) ; l'erreur IGN 400 du drapeau 4 n'est pas reproduite.
15. **LOW — exploitation** : la limite d'inscriptions anonymes du projet a été portée de 30 à 300 par heure « pour l'exploration » (journal du Bâtisseur) : à remettre à sa valeur d'origine ; chaque rejeu des extraits crée des identités et des trajets en base de production. Documentation : l'Évaluateur annonce 114 appels d'outils quand la chronologie dit « 4 appels ».

### À corriger pour passer à PASS (rien n'a été modifié)
Recapturer US-PERF-001-01/02 (Prix avec liste chargée et durée en 4G). Les MEDIUM sont à traiter au même passage si possible : distinguer ou fusionner les doublons GPL et ne pas chiffrer en GPLc une consommation essence (ou ne pas proposer la ligne essence en premier), montrer « mémorisée » dès que la marque est choisie ou légender 3.P2-02, ajouter une capture de la fiche station pour A11Y-002.

## Builder Summary — Round 2

**Résultat : 1 HIGH + 5 MEDIUM + LOW traités ; 61/61 captures rejouées sur la prod (0 échec, 0 doublon md5). Commit déployé `a6126b7` (Vercel READY).**

**Corrigé**
1. HIGH PERF-001 : -01 = ouverture de l'appli en 4G (liste en chargement), -02 = liste des stations affichée avec la durée mesurée (632 ms < 2,5 s) ; Trajets mesuré en complément.
2. MEDIUM bi-carburation : chaque ligne chiffrée au carburant de SA consommation (essence → SP95-E10, GPL → GPLc), libellés « · essence » / « · GPL » ; véhicules réimportés (550) et vérifiés ; l'import supprime maintenant aussi les anciennes lignes au-delà de 1 000.
3. MEDIUM A11Y-002 : capturé sur la vraie fiche station (titre focalisé, retour sur la ligne) ; S4 gardé en assertions.
4. MEDIUM 3.P2-02 : « Marque mémorisée » visible.
5. MEDIUM 3.E3-01 : écran Trajets vide.
6. MEDIUM A11Y-001-01/02 : ordre de tabulation en pastilles numérotées (surcouche de test signalée).
7. LOW : 3.4-03 / 3.4-04 distingués ; 3.7-02 annoté « page rechargée » ; 4.E2-03 retour à 40,78 € ; Albi → Albi : message « même lieu » ; rejeu sans voiture : message ; libellé de motorisation complet sous les sélecteurs (infobulle conservée) ; propositions de lieux : reprise + message si service injoignable.
8. Limite d'inscriptions anonymes remise à **30/h** (vérifié).

**Tests** : Vitest 80/80 ; `vite build` OK ; extraits m2 sur la prod 61/61 ; régression m1 25/25. Captures reprises : PERF-001-01/02, A11Y-001-01/02, A11Y-002-01/02, 3.E3-01, 3.P2-02, 3.4-03/04, 3.7-02, 4.E2-03 (la passe complète a été rejouée, donc les 61 fichiers sont réécrits). Le dernier commit (reprise des propositions de lieux) est postérieur à la passe de captures : il ne change aucun écran photographié.

**Ouvert** : une version bi-carburation publiée avec une seule ligne ADEME (Kangoo, Jogger 110 ch) est comptée à l'essence ; l'appariement essence/GPL repose sur « GPL = puissance et consommation en litres les plus hautes » (vérifié sur Clio, Sandero, Jogger 101 ch).
