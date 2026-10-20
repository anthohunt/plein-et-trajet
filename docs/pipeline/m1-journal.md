# Jalon 1 — Les prix autour de moi — journal

## Timeline
- 2026-10-20 12:10Z — Passe 3 du nœud construire. Passes 1 et 2 mortes à la connexion (« Login expired »), aucun artefact : départ à zéro.
- 12:15Z — Infra provisionnée par le chef : Supabase `plein-et-trajet` (ref rglrwtkqwihdztgqlbsy, eu-west-3, auth anonyme activée), Vercel `plein-et-trajet` lié à github.com/anthohunt/plein-et-trajet (variables VITE_* posées), `.env.local` (non commité), dépôt git rattaché au workspace (historique distant 018487e).
- Écart d'outillage constaté : pas de serveur Playwright MCP dans cette session ; l'exploration se fait avec la bibliothèque Playwright (chromium headless installé), captures réelles prises par `page.screenshot`. Pas d'outil TeamCreate : dispatch par l'outil Agent en arrière-plan.
- Cas d'usage : tests/e2e/use-cases/m1-use-case.md — 50 captures d'histoires + 10 transverses = 60 captures attendues, rangées dans tests/e2e/delivery/.

## Builder Summary

**Construit**
- Front React 18 + Vite 5 + TypeScript (`src/`) : écran Prix (sélecteur de carburant mémorisé, carte MapLibre GL sur Plan IGN vectoriel avec pastilles vert/orange par moitié la moins chère, bouton de recentrage, liste triable Moins cher / Plus proche avec enseigne, distance, ancienneté, écart à la moyenne France, totem à 3 décimales, « prix du JJ/MM » atténué au-delà de 48 h), fiche station en feuille (6 carburants, « non vendu » / « rupture », services, heure de mise à jour, focus titre, Échap, retour du focus), états Erreur + Réessayer et Vide, repli de position (dernière ville ou Albi + message), écran Trajets minimal avec l'arrivée pré-remplie depuis la fiche. Textes centralisés `src/lib/textes.ts`, tokens `src/styles/tokens.css` (clair/sombre).
- Supabase : migrations `supabase/migrations/` (PostGIS, `stations` / `prix` / `moyennes_nationales`, RLS lecture publique, écriture service seulement, RPC `stations_autour(lat, lon, rayon_m)`, `sync_prix_appliquer`, `recalculer_moyennes`, `stations_a_enrichir`, tâche pg_cron `sync-prix` toutes les 10 min via pg_net, secret dans Vault).
- Edge Function `sync-prix` (déployée, `--no-verify-jwt`, protégée par l'en-tête `x-sync-secret`) : export complet du flux instantané officiel (reprise sur 429/5xx, réponse vide ou mal formée rejetée), application par lots de 1 000, ruptures temporaires gardées (`rupture=true`), ruptures définitives = non vendu, moyennes nationales recalculées, puis enrichissement nom/enseigne de 120 stations par passage depuis la fiche officielle prix-carburants.gouv.fr (le flux ne contient pas l'enseigne).
- Tests : Vitest `tests/unit/format.test.ts` (20 tests : prix 3 décimales, exposant, distance, écart, ancienneté/48 h, tri, moitié la moins chère, libellés). Exploration `tests/e2e/exploration/run-m1.mjs` + journal `m1-exploration-log.md` ; extraits `tests/e2e/exploration/m1-test-snippets/` (24 tests Playwright, config `playwright.config.ts`).

**Données synchronisées (base réelle)** : 9 815 stations, 35 701 lignes de prix (dont 4 512 en rupture temporaire), 6 moyennes nationales du 2026-10-20 (gazole 2,367 €/L sur 9 052 stations — identique à l'agrégat officiel), noms/enseignes enrichis : 440 au moment du bilan (les plus proches d'Albi d'abord ; le reste se complète à 120 par passage, ~14 h). Tâche pg_cron vérifiée : passages de 12:20 et 12:30 réussis (HTTP 200).

**Déploiement** : https://plein-et-trajet.vercel.app (Vercel READY). Commit : voir la ligne finale ci-dessous.

**Captures** : 55/55 dans `tests/e2e/delivery/` (le cas d'usage définit 55 captures : 45 d'histoires + 10 transverses ; le « 60 » annoncé ne correspond pas au fichier). Toutes ✓ ; chacune issue d'un `page.screenshot` distinct après assertions DOM.

**Mocks** : US-1.E1 (abort `**/rest/v1/prix*`) et US-1.E2 (réponse vide `**/rest/v1/prix*carburant=eq.E85*`), comme prévu par le cas d'usage. Aucune fixture en base : US-1.E3, US-1.E4, US-2.E1 s'appuient sur de vraies stations du rayon, choisies en base au moment du test.

**Écarts / limites**
- La RPC `stations_autour` ne prend pas le carburant (le plan le prévoyait) : les prix sont lus par `rest/v1/prix?carburant=eq.X`, ce qui est aussi l'URL que les cas US-1.E1/E2 interceptent.
- Préférence carburant mémorisée en `localStorage` (pas de table `preferences` au jalon 1 ; elle viendra avec les voitures au jalon 2).
- Tant qu'une station n'est pas enrichie, son libellé est « Station <ville> ».
- Écran Trajets volontairement minimal (départ, arrivée) : le calcul est au jalon 2.
- Les cas E3/E4 dépendent des données du jour : les extraits se marquent `skip` (et non « passé ») si plus aucune station réelle n'est dans cet état autour d'Albi.

Commit de livraison du code + tests + captures : `7413912` (branche main) ; ce journal est poussé juste après.
- 12:40Z — Bâtisseur R1 terminé : commit b998a50, prod https://plein-et-trajet.vercel.app READY, 55/55 captures, 9 815 stations synchronisées, mocks E1/E2 seulement, 5 bugs corrigés en exploration.

## Evaluator Journal — Round 1 (Builder Transcript)

**Stats transcript** : 120 messages assistant ; 64 appels d'outils : Bash 55, Read 5 (dont 3 PNG), Write 4 (sync-prix/index.ts, CarteStations.tsx, Prix.tsx, run-m1.mjs) ; le reste des modifications passe par heredoc/python/sed dans Bash (vérifiable, pas de correctif fantôme).

**Couverture captures** : requises (plan, noms .png uniques) 55 ; produites 55 ; manquantes 0. Le « 60 » du brief est faux, le plan en définit 55 (le Builder l'a signalé honnêtement). Noms identiques au plan (comm vide).

**Exploration réelle** : `run-m1.mjs` (844 lignes) exécuté en Bash contre https://plein-et-trajet.vercel.app ; chaque capture passe par `capture()` : assertions DOM puis `page.screenshot` (seul appel de capture ; aucun copyFile/cpSync/rename dans le script). Résultat de run cité (55 OK, 5 en échec avant corrections, puis rejouées). 24/24 Playwright snippets passés (sortie « 24 passed » dans le transcript). 5 bugs trouvés puis corrigés avec commits et redéploiement, captures reprises : cohérent avec les Bash/Edit du transcript.

**Doublons md5 (6 groupes)** : NON copiés. Tous issus d'appels `page.screenshot` distincts sur un état UI identique : US-1.E3 01/02/03 (état liste SP95-E10 ; la ligne « prix du 14/10 » est déjà visible en bas de l'écran, vérifié sur le PNG, les assertions du résultat/retour portent sur le DOM/CSS), US-1.E4 01=03, US-1.2-01=1.6-01=1.E2-01 (état initial identique), 1.1-01=1.E1-01, 1.2-02=1.4-03=1.4-04 (gazole ; la couleur vert/orange est déjà là avant le « après »), 1.5-02=1.5-03. Expliqué par le journal ; faiblesse de valeur démonstrative (avant = après), pas de fraude.

**Comportement** : pas de boucle, erreurs traitées (échecs de run corrigés par correctif réel puis rejeu), journal généré par `note()` pendant l'exécution du script (pas de rédaction après coup d'affirmations non testées), entrées « Issues found » cohérentes avec les commits. Mocks limités à E1/E2 comme prévu. Contrôle de contrat API présent.

**Réserves** : (1) le Builder n'a regardé visuellement que ~20 des 55 PNG (2 planches-contact PIL + smoke.png) ; le reste ne repose que sur les assertions DOM. (2) Snippets sobres (2 à 9 expect), E3/E4 s'auto-skip si les données changent, mais assertions réelles. (3) Journal généré par le script, donc pas un « batch » rédigé a posteriori.

**Skips auto-excusés** : aucun.

**Score** : 5 − 0 (captures) − 0 (log) − 0 (skips) − 0 (fabrication) − 0 (fantôme) − 0 (edge cases) = **5/5 → PASS** (seuil 3).

**Flags pour l'Auditor** :
• Ouvrir TOUS les PNG (au moins les 35 que le Builder n'a pas vus) : vérifier que les états décrits sont visibles (notamment E3/E4/A11Y/PERF).
• Cas avant=après identiques (1.4-03/04, 1.5-02/03, E3 01-03) : juger si la preuve visuelle est suffisante ou si une capture du détail (zoom/scroll) manque.
• Rejouer 2-3 snippets contre la prod ; vérifier que les skips E3/E4 ne masquent rien aujourd'hui.
• Vérifier les mocks E1/E2 (page.route) et l'absence de fixture en base.
• Vérifier la fiche US-A11Y-004 (aria-label des pastilles) et le temps PERF réel.
- Évaluateur R1 : PASS 5/5 (aucune copie de capture ; doublons md5 = états d'écran identiques capturés séparément).
- Descripteur : 55 descriptions (tests/e2e/delivery/m1-step-descriptions.json). Il signale 13 captures qui ne prouvent pas ce que le plan annonce : 1.2-03/04, 1.3-01, 1.3-03, 1.4-03, 1.E2-01, 1.E3-01/03, 1.E4-01/02/03, A11Y-001-01, A11Y-002-02, A11Y-004-02, PERF-001-01/02. Transmis à l'auditeur.

## Auditor Journal — Round 1

**Verdict : FAIL** — 4 HIGH, 5 MEDIUM, 8 LOW (0 CRITICAL).

**Méthodes réellement utilisées**
• Lecture des 55 PNG de `tests/e2e/delivery/` (55/55 ouvertes, dont agrandissement PIL de la carte de 1.4-04 et 1.1-02) + md5 des captures.
• Lecture du code : `src/` en entier, `supabase/migrations/*.sql`, `supabase/functions/sync-prix/index.ts` (extraits), `run-m1.mjs`, extraits Playwright, spec, cas d'usage, journal d'exploration.
• `npx tsc --noEmit` (0 erreur), `npx vite build` (OK, chunks 406 Ko + 805 Ko), `npx vitest run` (20/20), `npx playwright test` sur la prod (**24/24 passés, 0 skip** : E3 et E4 ont trouvé des données réelles aujourd'hui).
• Script Playwright bibliothèque écrit pour l'audit (scratchpad `audit-live.mjs`, chromium headless, 390×844 et 1280×800, géoloc Albi) contre https://plein-et-trajet.vercel.app : RLS clé anon (10 écritures), données E3/E4 du jour, chevauchement/rognage des pastilles, ordre Tab + visibilité de l'élément focalisé, retour du focus fiche (clavier), libellés par carburant, changement rapide de carburant, 3 mesures PERF en 4G simulée, rendu sombre, position refusée.
• Pas de Playwright MCP (absent ici).

**Inventaire des captures** : 55 prévues / 55 produites / 0 manquante ; 55 ouvertes. 6 groupes byte-identiques (1.4-01=1.5-01=E3-01=E3-02=E3-03 ; 1.2-02=1.4-03=1.4-04 ; 1.2-01=1.6-01=E2-01 ; 1.1-01=E1-01 ; 1.5-02=1.5-03 ; E4-01=E4-03). Captures qui ne montrent pas leur affirmation sans autre capture qui la prouve : 1.3-03/04, US-1.E4 (01-03), A11Y-001-01, A11Y-002-02 → HIGH. Partielles mais compensées : 1.3-01, A11Y-004-02 → MEDIUM.

**Couverture des critères (code + comportement live)** : 20 critères M1 — 17 COVERED, 3 PARTIAL (US-1.1 CA2 « dernière ville saisie », US-1.4 CA2 vert/orange, US-A11Y-001 contour visible), 0 UNCOVERED.

**Cas limites** : 5 — 4 COVERED (US-1.E1 mocké, US-1.E2 mocké, US-1.E3, US-2.E1), 1 PARTIAL (US-1.E4 : comportement OK, preuve visuelle contradictoire + libellé ambigu). 0 UNREACHABLE, 0 MISSING.

**Flags de l'Évaluateur R1**
1. ~20/55 PNG vus par le Bâtisseur → CONFIRMÉ ; les 55 ont été ouvertes ici, 4 captures défaillantes trouvées (HIGH 1-4).
2. Paires avant/après identiques → 1.5-02/03 ÉCARTÉ (même état par construction : après de l'étape 2 = avant de l'étape 3) ; E3 01-03 ÉCARTÉ (la ligne « Intermarché Cagnac-les-Mines · prix du 14/10 » atténuée est visible sur les trois) ; 1.4-03/04 ÉCARTÉ à LOW (barres orange visibles à l'agrandissement sur 2,417/2,399/2,420/2,383, signal faible).
3. Skips E3/E4 → ÉCARTÉ pour aujourd'hui : rejoués sur la prod, 0 skip ; 14 lignes > 48 h dans le rayon, 1 rupture gazole (81000004). Risque latent noté (LOW 8).
4. Mocks E1/E2 → CONFIRMÉS conformes au plan (`page.route` abort / fulfill [] dans run-m1.mjs:496,524 et extraits, unroute ensuite), aucune fixture en base. Libellé des pastilles (A11Y-004) → CONFIRMÉ en live (« Esso Express Albi, 2,191 euros le litre, plus cher »). PERF → CONFIRMÉ : 918 ms, 918 ms (9 Mbit/s, 85 ms), 1 503 ms (4 Mbit/s, 150 ms), cache désactivé.

**Flags du Descripteur** : 1.2-03/04 écarté (LOW 2 : Carrefour Albi lisible avant, absente après) ; 1.3-01 MEDIUM 3 ; 1.3-03 HIGH 1 ; 1.4-03 LOW 6 ; E2-01 écarté (mise en place invisible par nature, E2-02 prouve) ; E3-01/03 écartés ; E4-01/02/03 HIGH 2 ; A11Y-001-01 HIGH 3 ; A11Y-002-02 HIGH 4 ; A11Y-004-02 MEDIUM 4 ; PERF-001-01/02 écartés (LOW 5 : la preuve est la mesure).

**RLS** : clé anon → POST/PATCH/DELETE sur prix, stations, moyennes_nationales = 401 (42501) ; rpc sync_prix_appliquer / recalculer_moyennes / stations_a_enrichir = 401 permission denied ; functions/v1/sync-prix sans secret = 401 ; données inchangées après les essais. OK.

**Problèmes**

1. **HIGH — US-1.3 (CA2)** — `tests/e2e/exploration/run-m1.mjs:301-311`. La capture 1.3-03 « je déplace la carte (non relâché) » montre déjà la nouvelle zone chargée (liste Leclerc Brens / Intermarché Gaillac / Leclerc Gaillac, pastilles de Gaillac) : les n-1 gestes précédents ont chacun été relâchés (moveend → chargement). 1.3-04 montre le même état ; le passage « relâché → nouvelles stations » n'est visible nulle part. À refaire : un seul glisser continu (ou capturer pendant le dernier glisser alors que la liste montre encore Albi), puis capture après relâchement.
2. **HIGH — US-1.E4** — captures E4-01/02/03 + `src/routes/Prix.tsx:77-78`. E4-01/03 (GPLc) montrent « TotalEnergies Albi » (81000004, 1,5 km) ; E4-02 (Gazole) montre toujours « TotalEnergies Albi » en tête (81000002, 2,1 km, autre station) : l'image semble contredire « elle n'apparaît pas ». Cause produit : `libellesStations(vendues)` ne départage que les stations du carburant affiché ; live, 81000002 et 81000004 portent le même libellé selon le carburant (3 TotalEnergies dans Albi). À refaire : départager sur toutes les stations de la zone (`stations`, pas `vendues`), puis recapturer E4 avec un libellé distinct.
3. **HIGH — US-A11Y-001** — `src/components/CarteStations.tsx:289-307`. Toutes les pastilles sont focusables, même hors du cadre de la carte : live, Tab n°12 et n°14 tombent sur « Leclerc Lescure-d'Albigeois » et « Intermarché Cagnac-les-Mines » [hors cadre] en SP95-E10 (4/12 hors cadre en Gazole) → focus sans contour visible. A11Y-001-01 montre exactement cet état (aucun contour). L'extrait ne vérifie que `outlineStyle`, pas la visibilité. À refaire : cadrer la carte sur les stations (fitBounds) ou retirer du parcours Tab (tabindex=-1/aria-hidden) les pastilles hors vue ; ajouter au test un contrôle « élément focalisé dans le cadre » ; recapturer avec un contour visible.
4. **HIGH — US-A11Y-002** — `run-m1.mjs:752-764`. A11Y-002-02 est prise après le sous-test pastille (ouverture clavier puis fermeture à la souris) : aucun contour ni sur la ligne 81990002, ni sur la pastille ; la ligne grisée (Carrefour Albi) n'est qu'un survol. Le comportement est bon (live : après Échap, focus sur la ligne 81990002, contour solid ; après ✕ au clavier, focus sur la pastille 81000001). À refaire : capturer juste après Échap (ligne focalisée visible), puis une capture séparée pour la pastille.
5. **MEDIUM — US-1.3 / lisibilité carte** — `CarteStations.tsx:234,289-307`. À 390 px (carte 358×230) et à 1280 px (carte 446×230, app plafonnée à 480 px), en Gazole : 3 paires de pastilles se chevauchent (2,383 masquée 27×15 px par 2,355 ; 2,364/2,420 ; 2,417/2,399), 4/12 pastilles rognées par le bord ; en SP95-E10 2/7 rognées. Zoom fixe 11 alors que le rayon de 10 km dépasse le cadre vertical. À faire : gestion des collisions (décalage/regroupement) et cadrage sur les stations.
6. **MEDIUM — US-1.1 (CA2)** — `src/lib/position.ts:25`. `memoriserVille` n'est appelée nulle part : la branche « dernière ville saisie » est inatteignable (live : `pt-derniere-ville` reste null), seul le repli Albi fonctionne. À faire : la brancher (saisie de lieu, M2) ou consigner le report dans la spec/journal.
7. **MEDIUM — US-1.4 (CA2)** — `src/lib/format.ts:334-341`. La règle ⌈n/2⌉ avec égalités peut ne produire aucune orange malgré des prix différents : zone de Gaillac (1.3-04) 2,169 / 2,185 / 2,185 → 3 vertes, 0 orange ; SP95-E10 Albi 6 vertes / 1 orange. « Les autres orange » n'est pas tenu dès que le prix médian est partagé. À faire : seuil strict (prix < médiane = vert) ou règle documentée et validée.
8. **MEDIUM — US-1.3 (CA1)** — capture 1.3-01 : « Chargement des prix… », carte vide, crédits déroulés sous la légende ; la précondition « stations synchronisées » n'est prouvée que par un appel en base. 1.3-02 montre les pastilles, d'où MEDIUM. À refaire si le plan veut un « avant » parlant.
9. **MEDIUM — US-A11Y-004** — capture A11Y-004-02 + `FicheStation.tsx:75-76`. La fiche est capturée avec ses 6 prix à « … » (chargement non attendu). Live, l'arbre a11y de la fiche en chargement annonce « Gazole … SP95-E10 … » sans texte de chargement. À refaire : attendre `aria-busy=false` avant la capture ; donner au placeholder un libellé (« chargement »).
10. **LOW — i18n** — chaînes hors `src/lib/textes.ts` : `CarteStations.tsx:235,240-243,296` (crédits, libellés MapLibre, « euros le litre »), `TotemPrix.tsx:140`, `FicheStation.tsx:46` (« Automate 24/24 »), `BarreOnglets.tsx:171` (« Sections »), `Prix.tsx:121`, `Trajets.tsx:470`, `position.ts:222` (« Ma position »), `format.ts:294` (« vs France » alors que `T.vsFrance`, textes.ts:260, est inutilisé).
11. **LOW — US-1.2** — 1.2-03/04 : Carrefour Albi lisible avant (2e ligne) et absente après, mais rien ne la désigne (à surligner par l'annotateur).
12. **LOW — US-1.E1/E2** — E1-01 et E2-01 : mise en place du mock invisible par nature (identiques à des captures d'état normal) ; les 02 prouvent.
13. **LOW — US-1.E3** — E3-03 « retour » : rien à rétablir (données réelles), capture identique aux 01/02.
14. **LOW — US-PERF-001** — PERF-01 page blanche, PERF-02 tuiles de carte non chargées ; preuve = mesure (recontrôlée : 918-1 503 ms).
15. **LOW — US-1.4** — 1.4-03 = 1.4-04 ; vert/orange porté par une barre de 3 px seulement (conforme maquette, 2 px), peu lisible à l'œil.
16. **LOW — US-2.2 / A11Y** — 2.2-02 : contour de focus du champ Arrivée rogné (seuls haut et gauche visibles) ; `BarreOnglets.tsx:171` role=tablist sans tabpanel/aria-controls ni flèches ; crédits MapLibre déroulés avant chargement, sur la légende (1.3-01, PERF-02).
17. **LOW — tests** — `US-1.E3.test.ts:13`, `US-1.E4.test.ts:8` : `test.skip` si les données du jour n'ont plus le cas → la régression peut passer en silence ; prévoir une fixture de test ou faire échouer le gate sur skip.
- 12:50Z — Auditeur R1 : FAIL (4 HIGH, 5 MEDIUM, 8 LOW). Boucle : bâtisseur relancé (round 2) avec la liste numérotée de l'auditeur.

## Builder Summary — Round 2

Commits : `fc34a21` (corrections de l'audit R1), `861033d` (focus du titre de fiche, chargement) ; déploiement Vercel READY sur https://plein-et-trajet.vercel.app (vérifié par l'API Vercel).

**Issues de l'auditeur R1**
1. HIGH US-1.3 — corrigé : un seul glisser continu ; 1.3-03 bouton enfoncé (liste encore Albi, aucun nouvel appel), 1.3-04 après relâchement avec les stations de la nouvelle zone surlignées.
2. HIGH US-1.E4 — corrigé : `libellesStations(stations)` sur toute la zone (Prix.tsx) ; captures E4 refaites avec « TotalEnergies Albi · Auto 81 Sarl » identifiable et absente en Gazole.
3. HIGH US-A11Y-001 — corrigé : pastilles hors cadre ou sous la légende / le recentrage / les crédits passent en `tabindex=-1` + `aria-hidden` ; extrait et exploration vérifient « élément focalisé visible dans son cadre » + contour ≥ 2 px ; 001-01/02 refaites.
4. HIGH US-A11Y-002 — corrigé : 002-02 prise juste après Échap, contour visible sur la ligne d'origine ; le cas pastille est vérifié à part (journal).
5. MEDIUM carte — corrigé : cadrage centré sur l'utilisateur à l'échelle des stations ≤ 4 km, empilement anti-chevauchement avec tige, légende lisible en bas à gauche, crédits repliés.
6. MEDIUM US-1.1 — corrigé : géocodage IGN (`src/lib/geocodage.ts`) à la sortie des champs Départ/Arrivée et à « Coût d'un trajet jusqu'ici » → `memoriserVille` ; vérifié (Castres) dans l'exploration et dans un extrait.
7. MEDIUM US-1.4 — corrigé : nouvelle règle de coupure (`seuilMoitie`), au moins une orange dès deux prix distincts ; 4 tests Vitest ajoutés (23 au total).
8. MEDIUM 1.3-01 — corrigé : capture après chargement.
9. MEDIUM US-A11Y-004 — corrigé : statut accessible « Chargement des prix de la station… », capture 004-02 prix chargés.
LOW — chaînes déplacées dans `textes.ts` ; 1.2-03/04, E1-01, E2-01, E3-02, E4, 1.4-04 et PERF annotés (bandeau « Annotation de test » et surlignage ajoutés par le script, retirés après la photo) ; contour du champ Arrivée entier ; crédits repliés ; onglets ARIA complets (tabpanel, aria-controls, flèches) ; `test.skip` E3/E4 remplacés par un échec explicite. Non traité : LOW 13 (E3-03 « retour » sans état à rétablir, données réelles) et LOW 14 (PERF-01 reste une page blanche par nature, la mesure est annotée).

**Bugs supplémentaires trouvés et corrigés** : glisser relâché sur la légende qui bloquait la carte ; puce GPLc à moitié hors écran à 390 px ; contour de focus du bouton des crédits supprimé par MapLibre ; prix de l'ancien carburant comptés un instant après un changement.

**Vérifications** : `npx vitest run` 23/23, `npx vite build` OK ; exploration sur la prod : 55/55 captures ✓, toutes ouvertes ; extraits Playwright 25/25 (deux passes). `tests/e2e/delivery/m1-step-descriptions.json` mis à jour pour les 22 captures dont le contenu a changé.
- 13:15Z — Bâtisseur R2 terminé : prod 9b29a9c READY, 23/23 unitaires, 25/25 Playwright prod, 55 captures refaites (22 au contenu changé), 4 HIGH + 5 MEDIUM déclarés corrigés. Point de vigilance du chef : bandeaux/surlignages injectés par le script de test dans certaines captures — à juger par l'évaluateur et l'auditeur.

## Evaluator Journal — Round 1 (Builder Transcript) — itération 2

**Verdict : PASS — 5/5.** Transcript `builder-r2.jsonl` lignes 307-558 : 42 Bash, 15 Read (tous des PNG), 1 Write (CarteStations.tsx), plusieurs éditions Python assertées (`assert a in s`).

**Stats** : 4 HIGH + 5 MEDIUM → 9/9 avec changement de code réel et relance. Exploration complète rejouée deux fois sur la prod (55/55 ✓ ; `rm -f delivery/*.png` avant, puis 56 fichiers = 55 + json). Playwright : échecs réels rencontrés puis corrigés (US-1.3, A11Y-001 « visible dans son cadre : GPLc », 1.6, focus crédits, P1 flaky) → 24/24 puis 50/50 (--repeat-each=2). Vitest 23/23 (4 tests ajoutés). Build + déploiement Vercel vérifiés (fc34a21, 861033d).

**Vérification par point**
• HIGH 1 (1.3-03) : un seul `glisserCarte` continu, capture pendant le geste avec assertion « aucun nouvel appel, liste = Albi » ; 1.3-04 après relâchement. PNG ouvertes : 03 montre la liste Albi, carte déplacée ; réel.
• HIGH 2 (E4) : `libellesStations(stations)` (Prix.tsx), libellé « TotalEnergies Albi · Auto 81 Sarl ». E4-02 : « Relais des Fo… » en tête, bandeau explicite l'absence. OK.
• HIGH 3 (A11Y-001) : `tabindex`/`aria-hidden` sur pastilles hors cadre (CarteStations.tsx:70-71,179) + contrôle « visible dans son cadre » ajouté, preuve : échec observé puis corrigé. 001-01 montre un contour noir visible.
• HIGH 4 (A11Y-002) : 002-02 juste après Échap, contour noir sur la ligne Intermarché Le Sequestre. OK.
• MEDIUM carte (empilement, cadrage ≤ 4 km, crédits repliés) : PNG carte lisible, 0 chevauchement visible. OK.
• MEDIUM US-1.1 : `geocodage.ts` + `memoriserVille` appelée dans Prix.tsx:190 et Trajets.tsx:25 (avant : nulle part). Réel.
• MEDIUM US-1.4 : `seuilMoitie` (format.ts:72) + 4 tests Vitest.
• MEDIUM 1.3-01 et A11Y-004 : recapture après chargement ; statut accessible ajouté.
• Pas de fix fantôme.

**Verdict sur les surcouches injectées** : LÉGITIME (annotation, pas fabrication). Code `run-m1.mjs:90-101` : `annoter()` pose un div orange portant le préfixe fixe « Annotation de test — » (`data-annotation-test`), `surligner()` un contour pointillé orange (`data-surligne-test`) ; les deux sont retirés après `page.screenshot` (l.80-84) et annoncés dans le log d'exploration. Les textes sont calculés à partir de mesures réelles (t1/t PERF = `Date.now()` ; liste des nouvelles stations lue dans le DOM ; plages de prix lues sur les pastilles) ; aucun prix, état, message ou couleur d'appli n'est simulé. PNG ouvertes (1.3-04, E4-02, PERF-02) : bandeau clairement distinct de l'UI. Note : la valeur PERF d'annotation (1099 ms) = celle du log (l.384), cohérente.

**Réserves mineures (non pénalisées)**
• Le bandeau recouvre le bas de la liste : sur 1.3-04 et E4-02 la ligne « nouvelle » (Blaye-les-Mines) est masquée derrière l'annotation ; seule la pastille surlignée en haut de carte est visible. À regarder par l'Auditeur.
• Vérification visuelle du Bâtisseur faite par planches contact (6 planches de 10 vignettes, deux fois) et non PNG par PNG : suffisant pour juger la présence, limité pour les détails fins.
• Aucune copie/renommage de PNG : captures produites directement par `page.screenshot` dans `delivery/`.

**LOW non traités** : 13 (E3-03, données réelles, rien à rétablir) et 14 (PERF-01 page blanche, mesure annotée) : justifiés et déclarés, non retenus comme skips fixables. LOW 10, 11, 12, 15, 16, 17 traités.

**Barème** : départ 5 ; captures manquantes 0 ; log batch présent ; skips excusés 0 ; fabrication 0 ; fix fantôme 0 ; cas limites avec assertions (E1/E2 mockés déclarés, E3/E4 échec explicite au lieu de skip). **Score 5/5.**

**Flags pour l'Auditeur** : (1) rouvrir 1.3-04 et E4-01/02 : l'annotation masque la ligne désignée, vérifier que la preuve reste lisible ; (2) confirmer sur la prod le tabindex=-1 des pastilles hors cadre en Gazole ; (3) confirmer que le géocodage IGN est appelé réellement (Castres) et ne bloque pas hors ligne ; (4) l'annotateur (étape 4.5) ne doit pas doubler les surlignages déjà dans les PNG.
- Évaluateur R1 itération 2 : PASS 5/5 (9 corrections réelles, bandeaux « Annotation de test — » jugés légitimes, aucune donnée simulée).
- Descripteur round 2 : 55 descriptions réécrites. Reste signalé : 1.3-04 et E4-02 (bandeau qui masque la zone prouvée), E1-01 (capture sur l'onglet Trajets), E4-01 (rupture visible seulement dans le bandeau), A11Y-001-01 et A11Y-004-01/02 (preuve d'accessibilité invisible à l'image). Transmis à l'auditeur R2.

## Auditor Journal — Round 2

**Verdict : FAIL** — 1 HIGH, 2 MEDIUM, 9 LOW (0 CRITICAL). Les 4 HIGH et 5 MEDIUM du round 1 sont corrigés dans le produit (vérifié sur la prod 9b29a9c). Il reste une capture qui ne prouve pas son étape (E4-02).

**Méthodes réellement lancées**
• J'ai ouvert les 55 PNG de `tests/e2e/delivery/` (les 55 ont été refaites à 13:09-13:10) et calculé leurs md5 (5 groupes identiques, tous des états d'écran identiques par construction).
• J'ai lu le diff `src/` entre b998a50 et 9b29a9c (CarteStations.tsx, geocodage.ts, Trajets.tsx, format.ts `seuilMoitie`, FicheStation.tsx, BarreOnglets.tsx), le Builder Summary R2, le journal d'exploration (section « Round 2 ») et l'Évaluateur R1 itération 2.
• `npx tsc --noEmit` : 0 erreur. `npx vite build` : OK. `npx vitest run` : 23/23. `npx playwright test` sur la prod : **25/25 passés**.
• Script Playwright d'audit `audit-live2.mjs` (scratchpad, chromium headless) lancé contre https://plein-et-trajet.vercel.app en 390×844 et en 1280×800, pour SP95-E10, Gazole, E85 et GPLc. Il mesure : chevauchements, pastilles rognées ou sous un contrôle avec leur `tabindex` et `aria-hidden`, même mesure après un glisser, 24 Tab avec la visibilité et le contour de l'élément focalisé, A11Y-002 au clavier, arbre d'accessibilité de la fiche en chargement (réponse retardée de 1,5 s), fiche de la station en rupture, libellés en Gazole, géocodage réel de « Castres » puis rechargement sans localisation, géocodage coupé (abort), 3 mesures PERF, RLS clé anon (7 écritures).
• Pas de Playwright MCP.

**Inventaire des captures** : 55 prévues / 55 produites / 55 ouvertes / 0 manquante. Une seule capture ne prouve pas son étape : E4-02 (HIGH 1). Deux sont partielles : 1.3-04 et E4-01 (MEDIUM).

**Couverture des critères** : 20 critères M1 → **20 COVERED**, 0 PARTIAL, 0 UNCOVERED. Les trois PARTIAL du round 1 sont levés :
• US-1.1 CA2 : Castres géocodé, mémorisé, carte centrée 43.609/2.245, stations de Castres.
• US-1.4 CA2 : 6 vertes et 6 orange en Gazole, au moins une orange partout.
• A11Y-001 : 0 élément focalisé hors cadre ou sans contour sur 24 Tab, en SP95-E10 comme en Gazole.

**Cas limites** : 5. Quatre sont COVERED (E1, E2, E3, 2.E1). E4 est COVERED en comportement (absente en Gazole, « GAZOLE rupture » dans sa fiche, libellé « TotalEnergies Albi · Auto 81 Sarl ») mais PARTIAL en preuve (HIGH 1).

**Revérification des points du round 1 (prod)**
• H1 US-1.3 : corrigé. 1.3-03 montre la liste d'Albi pendant le glisser. 1.3-04 : voir MEDIUM 2.
• H2 US-1.E4 : corrigé dans le produit (libellés distincts sur toute la zone). La preuve reste insuffisante : HIGH 1.
• H3 A11Y-001 : corrigé. Toutes les pastilles rognées ou sous un contrôle sont en `tabindex=-1` + `aria-hidden=true` : en Gazole 3 sur 12 à 390 px, 2 sur 12 à 1280 px, 4 et 5 après glisser. Aucune pastille focusable invisible.
• H4 A11Y-002 : corrigé. 002-02 montre le contour sur Intermarché Le Sequestre. En live, après Échap le focus revient sur la ligne 81990002.
• M5 carte : corrigé. 0 chevauchement dans les 10 mesures (2 largeurs × 4 carburants + 2 après glisser).
• M6 US-1.1 : corrigé (voir plus haut). Géocodage coupé : rien ne casse, la ville précédente (Castres) est gardée.
• M7 US-1.4 : corrigé (`seuilMoitie`, format.ts).
• M8 1.3-01 : corrigé (écran chargé).
• M9 A11Y-004 : corrigé. En chargement, la fiche annonce `status: Chargement des prix de la station…` et 004-02 a ses prix chargés.
• RLS : 401 sur les 7 écritures.
• PERF : 930 ms et 928 ms (9 Mbit/s, 85 ms), 1 528 ms (4 Mbit/s, 150 ms).

**Points à trancher**
• **(a) Bandeaux « Annotation de test — » et contours pointillés.** Ils sont légitimes comme annotations (préfixe fixe, distincts de l'interface, retirés après la photo, aucune donnée simulée), mais ils ne valent jamais preuve : seul ce que montre l'appli compte.
  – Sur **1.3-04**, le bandeau cache les lignes nouvelles de la liste (Système U Blaye-les-Mines et Intermarché Carmaux sont sous le bandeau). La preuve visible se réduit à la pastille surlignée en haut de carte, à moitié rognée, et à la disparition de TotalEnergies en tête de liste. → MEDIUM 2.
  – Sur **E4-02**, le bandeau couvre la 6e ligne, et 7 des 12 lignes Gazole ne sont pas à l'écran : l'absence de la station n'est pas visible. → HIGH 1.
  – Sur 1.2-03/04, 1.4-04, E1-01, E2-01, E3-02, E4-03 et PERF : le bandeau ne cache rien de ce qui prouve l'étape. Pas de problème.
• **(b) E1-01 sur l'onglet Trajets.** Acceptable. L'action de l'étape 2 est « l'écran Prix s'ouvre », il faut donc partir d'ailleurs ; « (écran Prix) » est l'écran de l'histoire. → LOW 1.
• **(c) E4-01, rupture visible seulement dans le bandeau.** Insuffisant : l'appli peut le montrer elle-même, la fiche de 81000004 affiche « GAZOLE rupture » (vérifié en live). → MEDIUM 1.
• **(d) A11Y-001-01, A11Y-004-01/02.** Un libellé accessible ne se voit pas sur une capture. Les preuves suffisantes sont les assertions des extraits (A11Y-004 : regex sur le libellé de chaque pastille et de chaque totem, boutons icônes libellés), la mesure live (libellés « Esso Express Albi, 2,191 euros le litre, plus cher », arbre d'accessibilité de la fiche) et le journal d'exploration. Pas de capture supplémentaire nécessaire ; une note qui afficherait le libellé dans l'image n'apporterait rien de plus qu'un texte de test. A11Y-001-01 montre bien un contour visible (pastille 2,182) ; l'ordre est prouvé par l'extrait et par ma séquence de 24 Tab. → écarté.
• **(e)** Confirmé sur la prod : les pastilles Gazole hors cadre sont en `tabindex=-1` (`aria-hidden=true`), et le géocodage IGN de Castres marche (200 sur data.geopf.fr/geocodage, `pt-derniere-ville` = Castres 43.609392/2.245482, message « carte centrée sur Castres »).
• **(f) Pour l'annotateur (étape 4.5).** Ces PNG contiennent déjà des surcouches de test ; il ne faut pas les doubler, ni annoter par-dessus la zone qu'elles couvrent :
  – 1.2-03 : contour pointillé sur la ligne et la pastille Carrefour Albi + bandeau.
  – 1.2-04 : bandeau.
  – 1.3-04 : contour pointillé sur la pastille du haut et sur une ligne sous le bandeau + bandeau.
  – 1.4-04 : bandeau.
  – E1-01, E2-01, E4-02, PERF-01, PERF-02 : bandeau.
  – E3-02 : contour pointillé sur la ligne Cagnac.
  – E4-01 : contour pointillé sur la ligne Auto 81 Sarl + bandeau.
  – E4-03 : contour pointillé sur la ligne Auto 81 Sarl.

**Problèmes**

1. **HIGH — US-1.E4** — capture E4-02 (`run-m1.mjs`, étape E4-02). Le critère est « elle n'apparaît pas dans la liste triée par prix ». La capture ne montre que 5 lignes sur 12, et le bandeau couvre la 6e : l'absence n'est pas visible. Les autres captures de l'étape ne la prouvent pas non plus. Comportement correct en live (`[data-station="81000004"]` = 0 en Gazole). À refaire : capturer toute la liste (`fullPage`, ou hauteur du conteneur agrandie, ou deux captures en défilant) avec le bandeau hors de la liste, par exemple en haut ou dans une capture séparée.
2. **MEDIUM — US-1.E4** — capture E4-01. La rupture de gazole n'apparaît que dans le bandeau. À refaire : ouvrir la fiche de 81000004 pour montrer « GAZOLE rupture » (affichage de l'appli, vérifié en live), puis passer en Gazole.
3. **MEDIUM — US-1.3 (CA2)** — capture 1.3-04. Le bandeau masque les deux nouvelles lignes de la liste ; la preuve visible se réduit à une pastille surlignée à moitié rognée en haut de carte. À refaire : faire défiler la liste jusqu'aux nouvelles stations, ou placer le bandeau ailleurs, pour que les lignes Système U Blaye-les-Mines et Intermarché Carmaux soient visibles.
4. **LOW — US-1.E1** — E1-01 est sur l'onglet Trajets : cohérent avec l'action « l'écran Prix s'ouvre », le bandeau déclare le mock. Rien à refaire.
5. **LOW — US-1.4** — en SP95-E10 Albi (1,990 / 2,182 ×5 / 2,191) : 1 verte et 6 orange. Les deux coupures possibles sont aussi loin de la moitié, et la règle choisit la plus stricte. Conforme à la règle documentée et à « au moins une orange » ; à faire valider si l'on préfère 6 vertes et 1 orange.
6. **LOW — US-1.6** — à 390 px, les libellés longs sont tronqués (« TotalEnergies Albi · Relais des Fo… ») ; le nom complet est dans la fiche.
7. **LOW — données** — l'enseigne brute « Indépendant sans enseigne » s'affiche comme marque (P1-01 : « Indépendant sans enseigne Saus… ») ; mieux vaut le nom de la station.
8. **LOW — i18n** — `src/lib/format.ts:37` et suivantes (« date inconnue », « prix du », « il y a ») restent hors de `textes.ts`. Le reste a été déplacé.
9. **LOW — captures** — E2-01 et E2-02 : la moitié gauche du fond de carte n'est pas chargée (tuiles IGN), sans effet sur la preuve.
10. **LOW — US-1.E3** — E3-03 « retour » : rien à rétablir (inchangé, déclaré).
11. **LOW — US-PERF-001** — PERF-01 reste une page blanche par nature ; la preuve est la mesure (recontrôlée, 928 à 1 528 ms).
12. **LOW — annotateur** — surcouches de test déjà présentes dans 12 PNG (liste au point (f)) : ne pas les doubler.
- 13:25Z — Auditeur R2 : FAIL (1 HIGH, 2 MEDIUM, 9 LOW). Les 9 défauts du round 1 sont corrigés sur la prod ; il reste 3 défauts de captures (E4-02, E4-01, 1.3-04). Bâtisseur relancé, cycle 3 sur 3.

## Builder Summary — Round 3

Commits : `5a91be5` (LOW 7 et 8), `192cbde` (libellé de date de la fiche) ; déploiement Vercel READY (192cbde) sur https://plein-et-trajet.vercel.app.

1. **HIGH E4-02** — corrigé. Capture du même nom, sans suffixe, prise avec une fenêtre agrandie à 1 376 px pour cette seule photo : les 12 lignes Gazole sont visibles et aucune n'est « TotalEnergies Albi · Auto 81 Sarl ». Le bandeau est sous la liste et le script vérifie qu'il ne couvre aucune ligne.
2. **MEDIUM E4-01** — corrigé. Fiche de 81000004 ouverte : l'appli affiche « GAZOLE rupture ».
3. **MEDIUM 1.3-04** — corrigé. La liste défile jusqu'à Système U Blaye-les-Mines et Intermarché Carmaux, toutes deux lisibles au-dessus du bandeau (vérifié par le script).
LOW 7 : « Indépendant sans enseigne » n'est plus pris pour une marque (nom officiel à la place, 48 stations concernées), avec un test Vitest. LOW 8 : derniers textes de `format.ts` déplacés dans `textes.ts`. LOW 9 : attente de l'état « idle » de la carte avant E2-01/02.
En plus : « Prix mis à jour prix du JJ/MM » remplacé par « Derniers prix déclarés le JJ/MM » dans la fiche.

Captures reprises : 1.3-04, E4-01, E4-02, E2-01, E2-02, P1-01 (6 ; md5 inchangé pour les 49 autres) ; toutes ouvertes ; entrées mises à jour dans `m1-step-descriptions.json`. Vitest 24/24, build OK, extraits Playwright sur la prod 25/25.
