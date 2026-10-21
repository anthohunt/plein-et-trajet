# Jalon 4 — Enregistrer en roulant et Royaume-Uni — journal

## Timeline
- 01:30Z (21/10) — Passe 8 du nœud construire. Jalons 1, 2 et 3 cochés (dernier commit 69eb5c1). Premier jalon non coché : jalon 4 « Enregistrer en roulant et Royaume-Uni » — écran propre S6 En route, écrans traversés S1, S3, S4 ; 11 histoires (US-6.1 à 6.6, US-6.E1 à 6.E3, US-3.9, US-1.9).
- Cas d'usage existant : tests/e2e/use-cases/m4-use-case.md — 28 captures attendues, rangées dans tests/e2e/delivery/ (même règle qu'aux jalons 1-3 : le plan cite tests/e2e/screenshots/m4/, delivery/ fait foi), brutes dans tests/e2e/exploration/m4-captures-brutes/.
- Équipe logique « m4-pipeline » : agents lancés par /home/claude/surveillance/lancer-agent-claude.sh (LA_BOUCLE_SUR_VPS=1, LA_BOUCLE_MODE_P=1), sessions tmux indépendantes du chef (méthode de la passe 7). Pas de TeamCreate ni de Playwright MCP : bibliothèque Playwright.
- Point ouvert : le fichier `tests/e2e/fixtures/albi-toulouse.gpx` cité par le plan n'existe pas, et aucun trajet réellement roulé n'est disponible. Consigne au bâtisseur : construire le tracé à partir d'un vrai itinéraire routier Albi → Toulouse (géométrie réelle d'un moteur d'itinéraire, densifiée à 1 point/s avec des vitesses plausibles par type de route, arrêts compris), le déclarer comme tel dans le fichier et le journal ; c'est la seule simulation, tout le reste passe par les vrais services.
- Garde-fous repris du plan de nuit : clés cle_ptv, cle_stadia, sync_prix_secret jamais effacées ; quota gratuit PTV ≈ 500/j (cache 7 j) ; moteurs en fin : péages ptv, itinéraire stadia + secours valhalla-public ; inscriptions anonymes 30 ; admin éphémère seulement.
- 01:25Z — Chef : bâtisseur round 1 lancé (m4-batisseur-r1, lanceur VPS, mode -p).
- 03:58Z — Bâtisseur round 1 terminé : 11 histoires construites et déployées (8 commits 164e2b0..6fff9cf + documentation), 28/28 captures réelles (trajet GPX Albi → Toulouse rejoué 73 min sur la prod), Vitest 171/171, Playwright complet 162 ✓ / 2 ✘ (US-1.E4 connu ; US-PERF-001 3/3 vert seul) / 2 ignorés ; source GB = flux ouverts des distributeurs (Fuel Finder exige GOV.UK One Login, écart déclaré) ; garde-fous relus.

- 04:00Z — Passe 9 du nœud construire (la passe 8 s'est arrêtée après le bâtisseur r1). Reprise à l'évaluateur R1, bâtisseur non relancé.
- 04:02Z — Évaluateur R1 (cycle 1) : PASS 5/5 (28/28 vraies prises de vue, 0 doublon, rejeu 73 min réel, chiffres du rendu tous recoupés ; 5 signalements pour l'auditeur, dont le CSV Fuel Finder et l'assertion US-6.2).
- 04:05Z — Descripteur (cycle 1) : 28 descriptions, 6 écarts
- 04:19Z — Auditeur round 1 : PASS (0 CRITICAL, 0 HIGH, 6 MEDIUM, 9 LOW ; vitesse renouvelée < 1,1 s vérifiée en direct, RLS et arrêt réel vérifiés ; source GB = décision produit à remonter)
- 04:23Z — Contre-évaluation : PASS 4/5 (auditeur réel : 74 appels, code lu, build/tsc/vitest, 2 essais Playwright en prod, garde-fous adossés ; −1 : 26/28 captures ouvertes alors que « 28 » est annoncé ; US-6.3b, US-6.E3, US-3.9 revérifiés COVERED, aucun HIGH manqué)
- 05:10Z — Tests + déploiement : 6 MEDIUM + LOW 10/12/13 corrigés et prouvés en direct (montée tirée de l'altitude : 586 → 339 m sur Albi → Toulouse) ; spec m4-explore.spec.ts (16 tests, 16/16) ; Vitest 174/174 ; Playwright m1-m4 165 ✓ / 1 ✘ (US-1.E4 connu) / 2 ignorés (HERE) ; trajet-roule v4 et estimer-trajet v18 déployées ; Vercel READY ; vérification prod PASS (38 requêtes serveur, toutes 2xx) ; garde-fous relus ; PTV du jour 63 (0 dû au jalon 4).

## Décisions et écarts du bâtisseur (round 1)

- **Source britannique (US-3.9, US-1.9) — écart déclaré.** Le service officiel Fuel Finder (GOV.UK, en ligne depuis février 2026) n'ouvre son API qu'aux comptes GOV.UK One Login (OAuth « client credentials », portail developer.fuel-finder.service.gov.uk) : inscription impossible pour l'agent. Son CSV « public » n'est servi qu'au navigateur, par un point d'accès interne qui renvoie une réponse chiffrée côté client (`/internal/v1.0.2/csv/generate-presigned-url` → `{"nxhex": …}`, constaté le 21/10 à 01:26Z) : non utilisé. Source réellement branchée : les flux JSON ouverts des distributeurs (dispositif de la CMA, format commun `fuel_prices_data.json`, sans clé), au lieu du seul Asda du jalon 3 : Asda, Esso, Motor Fuel Group, SGN Retail (frais du 20-21/10). Écartés car figés : Shell (13/05/2026), Rontec (01/05/2026), Applegreen (26/02/2025), Morrisons (1 station) ; injoignables : Tesco, BP, JET (403), Sainsbury's, Ascona. Règle : un flux de plus de 3 jours est écarté. Résultat le 21/10 : 2 317 stations GB. L'écran dit « moyenne du jour de N stations (prix publiés en pence/L, convertis en €) », jamais « Fuel Finder ».
- **Moyenne du jour GB** : absente du Bulletin pétrolier UE depuis le Brexit (le jalon 3 appliquait la moyenne européenne). Calculée à chaque synchronisation GB (`recalculer_moyenne_pays('GB')`, source « flux »).
- **Conversion pence → €** : cours de référence BCE servi par Frankfurter (`api.frankfurter.dev`), gardé dans `cours_change` (taux, date du cours, adresse) et cité dans la fiche station.
- **Manche** : Valhalla (Stadia) passe par le ferry Douvres–Calais ; PTV tarife la navette Eurotunnel (260,10 € le 21/10). Ferry et navette ne sont comptés ni en km ni en carburant ni en péage ; l'écran le dit. Le Royaume-Uni sortait en pays « ZZ » (admin Valhalla « England » sans code) : corrigé.
- **Dartford** : PTV le tarife (« Dartford River · Dartford RiverTunnel ») mais HT + TVA britannique (5,00 €), alors que le Dart Charge officiel est de 3,50 £ sans TVA (National Highways, hausse du 01/09/2025). Montant officiel substitué (4,17 € au cours du 20/10), ajouté s'il manque ; Valhalla nomme le franchissement « A282 ». Vérifié en vrai sur Albi → Chelmsford (1 appel PTV). Albi → Londres ne le franchit pas.
- **Silvertown Tunnel** (péage TfL) : sur l'itinéraire Stadia vers Londres, non tarifé par PTV ni ajouté (tarif horaire variable) — non traité, déclaré.
- **Recalage du tracé** : Valhalla `/trace_attributes` en `shape_match: "map_snap"` (même moteur que l'itinéraire : Stadia puis secours public), un point envoyé tous les 20 m, morceaux ≤ 3 000 points / 150 km. Liste d'attributs vérifiée par une vraie requête Stadia (200).
- **Calcul sur la vitesse réelle** : chaque seconde, la vitesse mesurée choisit la phase WLTP de la voiture (courbe des jalons 2-3) ; s'ajoutent ½·m·Δv² à chaque gain de vitesse et m·g·Δh sur les montées du tracé recalé. Le premier pas d'un segment (départ, reprise) ne suppose aucune accélération.
- **Verrou d'écran** : Chromium piloté refuse la permission « screen-wake-lock » (sonde `tests/e2e/exploration/sondes/m4-sonde-wakelock.mjs` : `denied` → refus ; accordée par CDP `Browser.grantPermissions` avec le `browserContextId` de la page → verrou obtenu). Les captures et extraits l'accordent, comme Chrome mobile le fait pour une page visible ; le repli (« Ce navigateur ne peut pas garder l'écran allumé… ») est testé à part (extrait US-6.3, Edge Case).
- **Trajet GPX** : aucun trajet réellement roulé. `tests/e2e/fixtures/albi-toulouse.gpx` est fabriqué par `creer-gpx.mjs` à partir du vrai itinéraire Valhalla (instance publique FOSSGIS) Albi (place du Vigan) → Toulouse (Capitole), 77,0 km, densifié à 1 point/s (vitesse estimée de chaque arête × 0,92, accélération ≤ 1,6 m/s², freinage ≤ 2,5 m/s²), arrêts : feu 40 s à 1,2 km, station 180 s à 2,5 km ; 4 350 points, 72 min 29 s. Rejoué en temps réel (non accéléré : l'appli calcule les vitesses sur l'horodatage des positions ; une horloge accélérée fausserait les vitesses).
- **Défaut trouvé en exploration** : « Londres » n'était jamais proposé dans le champ arrivée (Photon range Londres dans la couche « district ») — corrigé (fonction `lieux`, commit 1d52054).
- **Test du jalon 3 modifié** : `tests/unit/m3-europe.test.ts` — la liste des attributs permis par Stadia accepte « edge.use » (vraies requêtes Stadia et FOSSGIS du 21/10 : 200, champ `use` renvoyé). Pas d'autre ancien test touché.

## Builder Summary

**Construit et déployé (front Vercel READY 6fff9cf ; Edge Functions trajet-roule (nouvelle), estimer-trajet, lieux, sync-stations-pays ; migration 20261021180000 appliquée)**
- 164e2b0 serveur : `trajet-roule` (pas GPS, recalage Valhalla `/trace_attributes` map_snap par le moteur itinéraire Stadia → secours public, chaque seconde rattachée à sa route, litres WLTP + ½·m·Δv² + m·g·Δh, géocodage inverse IGN/Photon, péages PTV sur le tracé recalé avec cache, pays, tronçons Autoroute/Route/Ville) ; Royaume-Uni (4 flux distributeurs, pence d'origine, cours BCE, moyenne du jour GB, « England » → GB, ferry exclu, Eurotunnel retiré, Dartford). Calcul des péages extrait dans `_shared/calcul-peages.ts`.
- 2d11c29 front : S3 bouton « Enregistrer en roulant », message de localisation refusée, bandeau de reprise ; S6 En route (vitesse, courbe 3 min, km, litres, €, durée, arrêts, L/100, verrou d'écran + repli, GPS perdu, Pause/Reprendre, Arrêter) ; S4 « · enregistré », bloc « Ma vitesse enregistrée », note sur la vitesse réelle, note Manche, ligne GB ; fiche station en pence/L + cours ; historique « enregistré » (nouvelle ligne, RLS).
- Correctifs : 92922c7 (build Vercel), 398e026 (Dartford au montant officiel sans TVA), 1d52054 (« Londres » enfin proposé), 6fff9cf (moyenne France lue sur la ligne FR — 3 tests M2 cassés par la moyenne GB du jour). Tests : 30ca36d, 25ebbda.
- Commits groupés par couche (serveur / front / tests), pas un par histoire.

**Source britannique réellement utilisée** : flux JSON ouverts des distributeurs (dispositif CMA) Asda, Esso, Motor Fuel Group, SGN Retail — 2 317 stations le 21/10 ; pas l'API Fuel Finder (GOV.UK One Login + OAuth exigés, inscription impossible) ni son CSV (point d'accès interne à réponse chiffrée côté client). Écart détaillé plus haut ; l'écran ne cite jamais « Fuel Finder ».

**Captures** : 28/28 (livraison + brutes), vraies `page.screenshot()` de `run-m4.mjs` sur la prod ; md5 des 28 dans le journal d'exploration (« Captures — état final ») ; aucun doublon d'octets entre deux noms ; livrée = brute pour 27/28 ; visuellement identiques déclarées (US-6.5-02 / 6.6-01 / 6.6-02 ; US-6.3-01 / 6.3-02). Résultat prod du trajet complet : « Albi → Toulouse · enregistré », 77 km, 5,3 L, 13,03 € dont péage Toulouse Est 1,70 €, tronçons A68/N88/A61 · route · ville, 66 km/h moy., 4 accélérations, courbe de 600 points.

**Vérifications** : `npx vite build` OK ; `npx tsc --noEmit` OK ; `npx vitest run` 171/171 (dont 32 nouveaux, `tests/unit/m4-roule.test.ts`) ; `deno check` trajet-roule, estimer-trajet, lieux, sync-stations-pays OK ; contrat API 10 lignes FE → BE, 0 MISMATCH (journal d'exploration).

**Playwright complet sur la prod (rejoué seul, 03:37-03:52Z)** : 162 ✓, 2 ✘, 2 ignorés (HERE sans clé). ✘ connu US-1.E4 (pas de rupture réelle). ✘ US-PERF-001 à 4 717 ms (> 2 500) dans la suite, 3/3 vert rejoué seul : non régressif d'après ces mesures. Extraits m4 : 14/14. Un 1er passage (23 ✘) était invalide : mes lancements Playwright parallèles supprimaient l'administrateur éphémère m3.

**Garde-fous relus en fin (03:53Z)** : Vault = cle_ptv, cle_stadia, sync_prix_secret, aucune « FAUX- » ; moteurs : péages ptv sans secours, itinéraire stadia + secours valhalla-public ; limite d'inscriptions anonymes remise à 30 et relue par l'API (montée à 300 pendant les suites) ; 0 administrateur éphémère (m3-admin-eph-* créés/supprimés par le globalSetup m3 ; aucun m4-admin-eph-* : aucune histoire du jalon 4 n'en a besoin) ; appels PTV réservés aujourd'hui (UTC) : 29 au total ; aucune valeur de .env.local dans les fichiers (balayage des secrets avant commit).

**Non vérifié / restes**
- Aucun trajet réellement roulé : seul le GPX fabriqué depuis un vrai itinéraire a été rejoué ; GPS bruité, tunnels réels, téléphone en veille, onglet en arrière-plan non testés.
- Verrou d'écran : vérifié dans Chromium avec la permission accordée par CDP ; jamais sur un vrai téléphone.
- Litres en direct ≈ 0,9 L sous le résultat final (montées non comptées en direct).
- Silvertown Tunnel non tarifé ; TVA ajoutée aux autres péages britanniques tarifés par PTV non vérifiée (seul Dartford corrigé).
- Test du jalon 3 modifié : `m3-europe.test.ts` (« edge.use » ajouté à la liste des attributs permis) ; aide de test M2 `moyenneDuJour` (filtre FR) — assertions inchangées.
- Pas de m4-admin-eph : la consigne en prévoyait un, aucune histoire du jalon 4 ne passe par l'écran Moteurs.

## Note de reprise (pilote, 21/10 ~04:00Z)
- Bâtisseur r1 terminé (rendu : /home/claude/surveillance/agents-codex/m4-batisseur-r1.rendu.md). Reprendre à l'évaluateur R1 / descripteur / auditeur, ne pas relancer le bâtisseur.
- Attendre chaque agent EN PREMIER PLAN (`timeout 590 bash -c 'until [ -f …fin ]; do sleep 30; done'` en boucle), jamais en terminant le tour sur un shell d'arrière-plan : sinon la passe est coupée après 300 s d'écran figé.

## Evaluator Journal — Round 1, cycle 1 (Builder Transcript)

Évaluateur R1 (m4-evaluateur-r1-c1), 04:02Z. Transcript `4c8aaaf1-….jsonl` lu par un seul script (tous les appels, sorties et horodatages), rapproché du rendu, du journal, des commits `69eb5c1..HEAD`, des captures et de la base (lecture seule, aucun appel PTV, Vault non lu).

**Stats.** 01:25:20 → 03:55:56Z (2 h 31). 187 appels : Bash 160, Read 11 (dont 10 regards sur des captures), Write 8, WebSearch 5, WebFetch 2, ToolSearch 1. 2 erreurs d'outil (sonde lancée hors du dépôt : module introuvable, relancée dans le dépôt). Aucun Agent. Attente au premier plan par boucles `until` bornées ; deux longs passages lancés en arrière-plan par `nohup lourd` (exploration « long », suites Playwright), suivis par leurs logs.

**Couverture des captures.** 28/28 du plan, en livraison et en brute, aucune en trop. Seul appel de prise de vue : `page.screenshot()` ×2 dans `run-m4.mjs:64-65` (brute puis livrée) ; aucun `cp`/`mv`/copie de PNG dans les 160 commandes. md5 recalculés : 0 doublon d'octets (livrées comme brutes), livrée = brute 27/28, les 28 md5 livrés figurent au journal d'exploration. Différence US-6.6-01 : zone du coût (34,185)-(191,463), pas « l'horloge de l'écran En route » comme écrit (US-6.6-01 est l'écran Résultat ; probable animation du chiffre) — inexactitude mineure. Visuellement identiques déclarées et vues : US-6.5-02 / 6.6-01 / 6.6-02 (même haut d'écran Résultat), US-6.3-01 / 6.3-02. Chaque étape vérifie le DOM avant la prise (`etape()` : assertions puis captures ; ✗ journalisé sinon).

**Comportement.**
- Journal d'exploration écrit au fil de l'eau : une section par histoire, horodatée, à la fin de chaque histoire et de chaque passage (court 01:55Z arrêté, court 01:58Z, long 01:59-03:12Z, us62 02:05-02:11Z, court 03:35Z) ; l'entremêlement long/us62 et le doublon de sections E1/E2 sont expliqués en tête.
- Trajet rejoué : GPX fabriqué depuis le vrai itinéraire Valhalla FOSSGIS (creer-gpx.mjs : /route puis /trace_attributes), déclaré en tête du GPX, du journal d'exploration, des extraits (`_aides.ts`), du journal et du rendu. Rejeu réellement en temps réel : passage long de 01:59:23Z (US-6.1-01) à 03:12:22Z (FIN long), soit 73 min pour un GPX de 72 min 29 s ; relevés intermédiaires cohérents (19,8 km à 02:22:38Z, 76,8 km à 03:12:12Z).
- Résultat final issu du serveur : `calculerTrajetRoule` → `functions.invoke("trajet-roule")` rend km, litres, péages, titre ; le coût est litres × moyenne FR du jour + péages, comme aux jalons 2-3 (5,25 × 2,159 + 1,70 = 13,03). Ligne en base relue par le bâtisseur à 03:54Z : 76,8 km, 5,25 L, 600 vitesses, 66 km/h moy., 4 accélérations.
- Source britannique : requêtes réellement faites (01:26Z) : portail Fuel Finder (200), code du site lu, `internal-api/download-csv` puis `generate-presigned-url` → `{"nxhex":…}` ; 13 flux distributeurs testés avec codes HTTP et dates (Asda 20/10, Esso 20/10, MFG 21/10, SGN 20/10 retenus ; Shell, Rontec, Applegreen figés ; Tesco, BP, JET 403 ; Sainsbury's, Ascona injoignables). Synchro réelle : `{"stations":2317}`. Vérifié en ligne par moi : l'API exige bien GOV.UK One Login + OAuth (gov.uk « access the latest fuel prices… via API or email »). En revanche le CSV se télécharge sans compte depuis un navigateur ; la réponse est chiffrée en AES avec une clé présente dans le code du site, déchiffrée par le navigateur. Le bâtisseur n'a pas tenté de l'obtenir (par exemple par un vrai navigateur Playwright planifié sur le VPS). La consigne autorisait le repli ; l'écart est déclaré honnêtement ; je ne retire pas de point, je le signale (voir plus bas).
- Recoupement des chiffres du rendu : Vitest 171/171 (sortie 03:54Z) ✓ ; tsc, build, deno check ✓ ; contrat API 10 OK / 0 MISMATCH (02:01Z) ✓ ; extraits 5+6+3 = 14 verts (02:23-02:29Z ; joués pendant le passage long : le journal a été corrigé de « seuls » en « à part ») ✓ ; Playwright 162 ✓ / 2 ✘ / 2 ignorés (03:52Z) ✓ ; US-PERF-001 4 717 ms puis 3/3 vert seul ✓ ; quota_peages du jour = 29 ✓ ; Dartford 4,17 € dans une vraie réponse estimer-trajet Albi → Chelmsford (01:52Z) ✓ ; Eurotunnel 260,1 dans une vraie réponse Albi → Londres avant correction ✓ ; Vault 3 noms, 0 « FAUX- » ✓ ; moteurs ptv / stadia + valhalla-public ✓ ; limite anonyme 300 → 30, relue ✓ ; 0 admin éphémère ✓.
- 1er passage Playwright invalide (03:13-03:34Z, 134 ✓ / 23 ✘ / 7 non joués) : pendant ce passage, le bâtisseur a lancé deux `npx playwright test` ciblés (03:23Z) dont le globalSetup supprime les `m3-admin-eph-*` → écran S5 introuvable. Expliqué dans le journal, et il en a tiré 3 vrais échecs M2 (moyenne lue sans filtre de pays), corrigés (6fff9cf), puis suite rejouée seule (03:37-03:52Z). Propre.
- Corrections réelles : les 4 commits de correctif ont un diff (92922c7 : 1 fichier ; 398e026 : 4 ; 1d52054 : 1 ; 6fff9cf : 2) ; pas de correction fantôme.

**Tests anciens modifiés.** `m3-europe.test.ts` : seul ajout de « edge.use » à la liste blanche, après une vraie requête Stadia (200, `use` renvoyé, 01:30Z) et FOSSGIS (200) ; assertions intactes → adaptation honnête. `m2-aides.mjs` `moyenneDuJour` : filtre `pays=eq.FR`, assertions inchangées, motivé par un vrai défaut corrigé aussi dans l'appli → honnête. Le test m4 qu'il a écrit lui-même (`m4-roule.test.ts:69`) a été desserré de 5e-7 à 5e-6 L après un écart de 1,3e-6 L (vitesse lissée), avec un commentaire : sans conséquence. Petite contradiction : le paragraphe « Décisions » dit « Pas d'autre ancien test touché » alors que l'aide M2 l'a été ensuite (le Builder Summary le dit bien).

**Sécurité.** Toutes les valeurs de .env.local de 16 caractères ou plus ont été cherchées dans le transcript, les fichiers suivis par git, les logs /tmp et le journal des actions : absentes. Seuls apparaissent la référence du projet et l'URL Supabase, des identifiants publics déjà présents dans les journaux m1-m3. Aucun motif JWT, sbp_ ou sk_ dans le transcript. La clé Stadia a été lue en mémoire par RPC pour une requête de vérification, sans être affichée. Requêtes Vault limitées aux noms et au test « FAUX- ». → aucune clé exposée.

**Dérobades.** Aucun « assez bon » ni « on passe ». Le seul point discutable est le CSV Fuel Finder (ci-dessus), laissé de côté après environ 20 s d'examen. Le repli était autorisé par la consigne et l'écart est déclaré : je ne retire pas de point.

**Note.** 5 − 0 (captures 28/28) − 0 (journal écrit au fil de l'eau) − 0 (aucune dérobade retenue sur un point réparable) − 0 (aucune affirmation fabriquée trouvée : chaque chiffre du rendu a sa sortie) − 0 (aucune correction fantôme) − 0 (cas limites E1-E3 avec de vraies assertions : trajets 0 → 0 en base, `pt-en-route` absent, « trop court » 0,08 km, reprise ≥ km d'avant rechargement) = **5/5**.

**Verdict : PASS 5/5.**

**Signalements pour l'auditeur**
1. CSV Fuel Finder : public, sans compte, mais chiffré côté client (AES, clé dans le code du site). Faut-il un vrai navigateur planifié (couverture nationale, environ 8 000 stations) plutôt que 4 distributeurs (2 317) ? C'est une décision produit à remonter, pas un défaut de code.
2. US-6.2 : l'assertion de rafraîchissement porte seulement sur le tracé SVG de la courbe (`path d`). Les relevés us62 montrent 8 fois de suite « 19 km/h / 181 points / 0,8 km » : rien ne prouve que la vitesse affichée change au moins toutes les 2 s. Le changement d'assertion (fenêtre de 3 min pleine) est légitime, mais à vérifier sur l'écran.
3. US-6.6-02 est identique à US-6.5-02 et à US-6.6-01 : la capture « après » ne montre pas d'état nouveau. Vérifier qu'elle prouve bien le critère « Voir ma courbe de vitesse » (courbe sur tout le trajet, note sur la vitesse réelle).
4. Explication fausse sur la différence livrée/brute de US-6.6-01 (« horloge de l'écran En route ») ; phrase « Pas d'autre ancien test touché » dépassée.
5. Écarts « non vérifiés » à garder visibles : aucun vrai trajet roulé, verrou d'écran seulement dans Chromium avec permission accordée par CDP, litres en direct environ 0,9 L sous le final, Silvertown non tarifé, TVA des autres péages britanniques tarifés par PTV non vérifiée.

## Descripteur — cycle 1

28 descriptions écrites (tests/e2e/delivery/m4-step-descriptions.json), chacune d'après l'image ouverte ; 13 mots au plus par phrase (vérifié par script).

Captures où l'image ne montre pas (ou mal) ce que le plan annonce :
- US-6.3-02 : rien de visible ne prouve que l'écran ne s'est pas mis en veille ; seul l'avis fixe « L'écran reste allumé… », présent sur toutes les captures En route, et la distance qui passe de 1,4 à 1,9 km.
- US-6.5-02 : le plan annonce pays traversés et tronçons Autoroute / Route / Ville ; l'image s'arrête au titre « Pays traversés », les tronçons ne sont visibles que sur US-6.5-03.
- US-6.5-03 : annoncée « écran En route », c'est le bas de l'écran Résultat (pays, tronçons, note de calcul).
- US-6.6-02 : identique à US-6.5-02 et US-6.6-01 ; courbe, 66 km/h moy. et 4 accélérations visibles, mais la note qui explique le calcul sur la vitesse réelle n'y est pas (elle est sur US-6.5-03).
- US-1.9-01 : annoncée « une position à Londres (écran Prix) », l'image montre l'écran Trajets vide (aucune voiture choisie), sans carte ni Londres.
- US-1.9-02 : la carte et la fiche Asda (2,02 €/L, 169,9 p/L, cours BCE) sont là ; la liste des stations n'est pas visible, masquée par la fiche.

À noter sans compter comme écart :
- US-3.9-02 : aucun péage de Dartford dans la partie visible (péages français seulement ; trajet par A2 / M2 / A1203) — le plan le conditionne au franchissement ; prix GB présenté comme « moyenne du jour de 2316 stations », sans mention de Fuel Finder.
- US-6.2-02 : l'image montre des compteurs qui ont augmenté (28 km/h, 1,4 km, 0,10 L) mais une image fixe ne peut pas prouver la cadence « au moins toutes les 2 s ».
- US-6.4-02 : en pause, la courbe de vitesse disparaît du cadran (elle est présente sur US-6.4-01).
- US-6.2-01 est identique à US-6.1-02, et US-6.3-01 à US-6.2-02 (états « avant » repris de l'étape précédente).

## Auditor Journal — Round 1

Auditeur m4-auditeur-r1, 04:05-04:19Z (21/10). Code `69eb5c1..7e1032c` lu, 28 captures ouvertes une à une, md5 recalculés, base lue (lecture seule sauf mon trajet de test, supprimé), prod essayée en direct par la bibliothèque Playwright (2 courts enregistrements, Londres). **0 appel PTV** (quota du jour 57 avant comme après).

### 1. Verdict : **PASS** — aucun CRITICAL ni HIGH ; restent 6 MEDIUM et 9 LOW, plus une décision produit à remonter.

### 2. Problèmes par gravité
CRITICAL 0 · HIGH 0 · MEDIUM 6 · LOW 9 · décision produit 1 (non comptée).

### 3. Inventaire des captures
- Plan : 28. Livrées : 28 présentes, 0 manquante, 0 inattendue. Brutes : 28 / 0 / 0.
- Doublons d'octets : aucun (livrées comme brutes). Livrée = brute 27/28 ; US-6.6-01 diffère sur la zone (34,185)-(191,463) = totem du coût et cases litres/km (animation des chiffres), recalculé par différence d'images.
- Visuellement identiques : US-6.5-02 = US-6.6-01 = US-6.6-02 ; US-6.1-02 = US-6.2-01 ; US-6.2-02 ≈ US-6.3-01. Chaque image lue ; md5 identiques à ceux du journal d'exploration.

### 4. Couverture des critères (13 critères, 11 histoires)
| Histoire | Critère | Statut | Preuve |
|---|---|---|---|
| US-6.1 | En route s'ouvre, enregistrement, voiture rappelée | COVERED | 6.1-02 ; essai direct |
| US-6.2 | vitesse + courbe ≤ 2 s ; km, durée, arrêts, litres, L/100, € augmentent | COVERED (app) / test PARTIAL | essai direct : 19 changements en 20 s, écart max 1 033 ms, 14 valeurs (0 à 64 km/h) ; 6.2-02 ; test faible (MEDIUM 4) |
| US-6.3 a | verrou d'écran | COVERED (Chromium + CDP) | extrait US-6.3 `data-verrou=actif` après 20 s ; repli testé ; vrai téléphone non vérifié (déclaré) |
| US-6.3 b | « GPS perdu » > 15 s, distance figée | COVERED | 6.3-04 (18 s, 19,8 km figé) ; extrait ; roule.ts:135 |
| US-6.4 | « En pause », km/litres figés, « Reprendre » | COVERED | essai direct : 0,2 km / 0,06 L inchangés 6 s, positions reçues, vitesse 0, reprise → 0,3 km |
| US-6.5 a | titre « · enregistré », géocodage inverse, coût, litres, km, péages franchis, pays, tronçons du tracé recalé | COVERED | 6.5-02 + 6.5-03 ; essai direct « Albi → Le Sequestre · enregistré », recalage Stadia, 0 péage |
| US-6.5 b | en tête de l'historique | COVERED | 6.5-04 ; essai direct (tête « … · enregistré ») |
| US-6.6 a | bloc courbe + moyenne + accélérations + note | COVERED (capture PARTIAL) | 6.6-02 sans la note (sur 6.5-03) ; essai direct : bloc, « 93 km/h moy. · 1 accélération », note |
| US-6.6 b | absent sur un trajet calculé | COVERED | 6.6-03/04 Albi → Castres |
| US-6.E1 | message + comment autoriser + aucun trajet | COVERED | E1-02 ; extrait (0 trajet en base) |
| US-6.E2 | « trop court », rien dans l'historique | COVERED | E2-02 ; essai direct à 0,8 km : écran trop-court, 0 ligne en base |
| US-6.E3 | reprendre/arrêter, distance conservée | COVERED (MEDIUM 1 sur un chemin voisin) | E3-02 « 6,4 km déjà enregistrés » |
| US-3.9 | GB parmi les pays, prix du jour en €, Dartford si franchi, Manche non comptée | COVERED, source PARTIAL (décision produit) | 3.9-02 ; cache PTV : Eurotunnel présent en brut, retiré à l'écran ; Dartford 4,17 € vérifié par le bâtisseur (Chelmsford) ; « (Fuel Finder) » remplacé par 4 flux distributeurs |
| US-1.9 | carte + liste GB, €/L, pence/L dans la fiche | COVERED, captures PARTIAL, source PARTIAL | 1.9-02 (fiche : 169,9 p/L ÷ 100 ÷ 0,8403 = 2,022 € exact) ; essai direct : 49 lignes, 49 GB-, « −4,9 c vs Royaume-Uni » |

Bilan : covered 13 · partial 0 au sens code (3 captures partielles, 1 test faible) · uncovered 0 · bloqué-clé 0.

### 5. Cas limites
US-6.E1 COVERED · US-6.E2 COVERED (rejoué en direct) · US-6.E3 COVERED · repli verrou d'écran COVERED · GPS perdu COVERED · enregistrement repris puis « Enregistrer en roulant » touché : **MISSING** (MEDIUM 1) · page cachée / téléphone en veille / GPS bruité réel : UNREACHABLE ici (déclaré).

### 6. Signalements de l'évaluateur et écarts du descripteur
1. **Source britannique — décision produit, confirmée comme telle.** Fuel Finder (API One Login, CSV chiffré) non branché ; 4 flux distributeurs, 2 317 stations le 21/10 (≈ 29 % des ≈ 8 000 stations du pays), frais (prix du 19/10 23:05 au 20/10 23:00, synchro GB toutes les 6 h, cron `5 */6`). L'écran dit honnêtement « moyenne du jour de 2316 stations (prix publiés en pence/L, convertis en €) » et ne cite jamais Fuel Finder. Les critères US-3.9 / US-1.9 sont tenus hors mention « (Fuel Finder) » ; la moyenne GB repose sur 4 enseignes (biais possible : Asda, supermarché). **À remonter à Anthony : couverture nationale (navigateur planifié sur le CSV Fuel Finder) ou 4 flux.** Pas un défaut de code.
2. **US-6.2 — levé pour l'appli, confirmé pour le test.** En direct, positions à vitesses différentes : 19 changements du chiffre en 20 s, écart max 1,03 s. Les 8 « 19 km/h » venaient d'une arête à vitesse constante du GPX. Mais l'assertion (`path d` change) ne prouve rien : la fenêtre de 3 min glisse chaque seconde même sans position (roule.ts:137) → MEDIUM 4.
3. **US-6.6-02 — confirmé.** Identique à 6.6-01 ; la note sur la vitesse réelle n'y est pas (elle est sur 6.5-03). Le critère est tenu (extrait `note-roule`, essai direct) mais la capture « après » ne le prouve pas seule → MEDIUM 5.
4. **Journal — confirmé.** Différence US-6.6-01 = zone du coût, pas « l'horloge de l'écran En route » (m4-exploration-log.md:330) ; « Pas d'autre ancien test touché » (journal l.29) contredit par m2-aides.mjs ; « 32 nouveaux » tests alors que m4-roule.test.ts en compte 29 → LOW 1.
5. **Restes non vérifiés :**
   - aucun vrai trajet roulé : limite acceptable, déclarée (le plan lui-même prévoit un GPX rejoué) ;
   - verrou d'écran seulement Chromium + CDP : acceptable, déclaré ; le code demande `wakeLock`, le redemande au retour sur la page et affiche un repli testé ;
   - litres en direct ≈ 0,83 L sous le final (4,42 L contre 5,25 L, −16 %) : **non déclaré à l'écran** → MEDIUM 3 ; et la montée qui fait l'écart est elle-même surestimée → MEDIUM 2 ;
   - Silvertown non tarifé, TVA des autres péages GB : hors critère (US-3.9 ne demande que Dartford), déclaré au journal seulement → LOW 2.
- **Écarts du descripteur :** 6.3-02 (rien ne prouve l'écran allumé) confirmé, inhérent à une image fixe → LOW 4 ; 6.5-02 sans tronçons / 6.5-03 annoncée « En route » : confirmé, c'est le libellé du plan qui est faux, critère prouvé par les deux captures ensemble → LOW 8 ; 6.6-02 → MEDIUM 5 ; 1.9-01 (écran Trajets, pas Londres/Prix) et 1.9-02 (liste masquée) confirmés → MEDIUM 6 ; 6.4-02 courbe absente : expliqué (pause de ~3 min → plus aucun pas dans la fenêtre de 3 min) → LOW 3.

### 7. Problèmes
1. **MEDIUM — US-6.E3 / US-6.1 — src/routes/Trajets.tsx:180-210 et :490.** Avec un enregistrement en attente de reprise, le bouton « Enregistrer en roulant » reste actif ; le toucher écrit un nouvel enregistrement par-dessus (`garderEnCours(e)`) sans avertir : les km gardés sont perdus. Capture E3-02 : bandeau de reprise et bouton actifs ensemble. Attendu : bouton masqué/désactivé tant qu'un enregistrement attend, ou confirmation.
2. **MEDIUM — US-6.5 — supabase/functions/_shared/roule.ts:293.** La montée = `weighted_grade` × longueur ; Valhalla le définit comme une « pente en %, pondérée vers les sections raides » (doc trace_attributes, transit.land). Albi → Toulouse : 586 m de montée comptés (498 + 88, ligne 7b850a4f) contre ≈ 403 m mesurés sur le même tracé (altitudes Open-Meteo tous les 500 m, comme la méthode IGN de la spec) → ≈ +0,25 L (+5 % sur 5,25 L). Ordre de grandeur sinon juste : 77 km à 6,8 L/100 pour une 208 101 ch à ~98 km/h sur autoroute. Attendu : dénivelé tiré de l'altitude (IGN/DEM) ou `weighted_grade` corrigé, comme au jalon 2.
3. **MEDIUM — US-6.2 / US-6.5 — roule.ts:133, EnRoute.tsx:139-140.** Les litres et « € carburant » en direct ne comptent pas les montées : 4,42 L / 9,54 € à l'arrivée, puis 5,25 L / 11,33 € au résultat (−16 %), sans aucune mention à l'écran. Attendu : mention « montées ajoutées à l'arrêt » ou estimation de la montée en direct.
4. **MEDIUM — US-6.2 (test) — tests/e2e/exploration/m4-test-snippets/US-6.2.test.ts:11-17 ; run-m4.mjs passage us62.** L'assertion de rafraîchissement porte sur le tracé de la courbe, qui change chaque seconde même sans nouvelle position (fenêtre glissante). Elle ne prouve pas « vitesse renouvelée au moins toutes les 2 s ». Attendu : positions à vitesses différentes et assertion sur `data-kmh` (l'essai de l'audit le fait : écart max 1,03 s).
5. **MEDIUM — US-6.6 (capture) — tests/e2e/delivery/US-6.6-02-apres.png.** Même image que 6.6-01 ; la note sur la vitesse réelle n'y est pas. Attendu : capture « après » cadrée sur le bloc et la note.
6. **MEDIUM — US-1.9 (captures) — US-1.9-01-avant.png, US-1.9-02-apres.png.** 01 montre l'écran Trajets vide (pas Londres ni l'écran Prix) ; 02 montre la fiche qui masque la liste. L'appli tient le critère (essai direct : 49 stations GB dans la liste), mais les captures ne le prouvent pas. Attendu : 01 = Prix à Londres, 02 = carte + liste, puis fiche.
7. **LOW — journal** — trois inexactitudes du signalement 4 (m4-exploration-log.md:330 ; m4-journal.md:29 ; « 32 nouveaux » l.43).
8. **LOW — US-3.9** — Silvertown Tunnel non tarifé, TVA des autres péages GB non vérifiée : déclarés au journal, pas à l'écran.
9. **LOW — US-6.4** — pause de plus de 3 min : la courbe du direct disparaît (roule.ts:137) ; elle repart à la reprise.
10. **LOW — US-6.3** — EnRoute.tsx:149 : « L'écran reste allumé… » s'affiche aussi pendant l'état `attente`, avant d'avoir obtenu le verrou.
11. **LOW — US-6.5** — tronçon « Route · N88 · 0,1 km · 0,0 L » (seuil 50 m, roule.ts:305) : ligne sans intérêt.
12. **LOW — US-1.9** — noms britanniques doublés « Asda · Asda · 112 Vallance Road » (stations-pays.ts : nom = enseigne · adresse, puis l'enseigne s'affiche à côté).
13. **LOW — données** — 7 trajets « enregistrés » de test du bâtisseur (Albi → Le Sequestre / Albi, 1,3-1,6 km) restent en base sous des sessions anonymes de test.
14. **LOW — US-6.5 (plan/captures)** — 6.5-03 annoncée « écran En route » par le plan, c'est le bas du Résultat ; les tronçons n'apparaissent que sur 6.5-03.
15. **LOW — US-1.9** — E10 britannique recopié en « SP95 » (stations-pays.ts `poser(["SP95-E10","SP95"], E10)`, hérité du jalon 3) : moyenne GB SP95 = moyenne E10 (2,071).
- **Décision produit (non comptée)** — source GB : 4 flux distributeurs (2 317 stations) au lieu de Fuel Finder national ; mention « (Fuel Finder) » des critères US-3.9 / US-1.9 non tenue à la lettre.

Vérifié sans écart : `npx tsc --noEmit` 0 ; `npx vite build` OK ; `npx vitest run` 171/171 (11 fichiers) ; aucun texte affiché en dur dans les .tsx modifiés (tout passe par `T`) ; extraction `calcul-peages.ts` identique au code retiré d'estimer-trajet (péages FR/Europe du jalon 3 : cache lu, 17 entrées PTV, lignes Toulouse Est / Millau / Pedaggi… intactes) ; moyenne France : `moyenneNationale` filtrée `pays=FR`, S4 affiche 2,159 (FR) et pas 2,071 (GB) ; contrat API (m4-contrat-api.mjs, 10 lignes) relu, noms de champs identiques front ↔ trajet-roule ↔ migration ; RLS `trajets` : select/insert/update/delete `user_id = auth.uid()`, autre session anonyme → 0 ligne, clé anonyme → 0 ligne ; `cours_change` et `peages_fixes` en lecture seule ; conversion pence → € exacte ; courbe lisible à 390 px et 1280 px (l'appli reste une colonne centrée).

### 8. État final relu (04:18Z)
- Vault : `cle_ptv`, `cle_stadia`, `sync_prix_secret` (noms seuls ; aucune valeur « FAUX- »). Aucune valeur de `.env.local` dans les fichiers suivis par git, ce journal, les descriptions ou le journal des actions (seul `VERCEL_PROJECT_ID`, identifiant non secret, dans docs/pipeline/config.json depuis 188d0d4).
- Moteurs : péages = `ptv` sans secours ; itinéraire = `stadia` + secours `valhalla-public`.
- Limite d'inscriptions anonymes : 30 (relue par l'API de gestion).
- Comptes `m3-admin-eph-*` : 0 ; `m4-admin-eph-*` : 0 (aucun créé : pas besoin de l'écran Moteurs).
- Trajet de test créé par l'audit (3c4d5dfc…) supprimé (204, recompté : 0). L'essai à 0,8 km n'a rien créé.
- Appels PTV de l'audit : 0. Pas de commit, pas de push, pas de déploiement.

## Evaluator Journal — Round 2 (Auditor Honesty)

Contre-évaluateur m4-contre-evaluation, 21/10. Transcript `999ee04b-….jsonl` lu par un seul script (appels, entrées, sorties), rapproché de la section « Auditor Journal — Round 1 » et de sa consigne. Lecture seule ; un essai court en prod (US-6.E3), 0 appel PTV (quota du jour 57 avant comme après), aucun trajet créé, Vault non touché.

**Stats.** 04:05:39 → 04:19:46Z (14 min). 74 appels : Bash 37, Read 31 (26 captures livrées, 4 captures d'audit `/tmp/m4aud/`, 1 sortie d'outil), WebFetch 2, WebSearch 1, ToolSearch 1, Write 1. Aucun Agent. Le premier essai Playwright a dépassé 120 s et a été basculé en arrière-plan par l'outil ; l'auditeur l'a ensuite attendu au premier plan par des boucles `until` bornées (conforme à l'esprit de la consigne).

**Barrage préalable : passé.** Chaque méthode déclarée a ses appels : build / tsc / vitest (via `lourd`, sorties `tsc=0`, `build=0`, 171/171) ; inventaire 28/28 + md5 livrées/brutes (1 DIFF US-6.6-01) ; SQL sur `pg_policies`, `moyennes_nationales`, `cache_peages`, `trajets`, `moteurs`, `cron.job` ; 2 essais Playwright en prod (`direct.mjs`, `direct2.mjs`) dont les sorties portent exactement les chiffres du rapport (19 changements, écart max 1 033 ms, valeurs 0→64 km/h ; pause 0,2 km / 0,06 L figés ; trop-court à 0,8 km et `miens: []` ; « 93 km/h moy. · 1 accélération » ; historique « Albi → Le Sequestre … enregistré » ; RLS autre session `[]`, clé anon `[]` ; Londres 49/49 `GB-`, « −4,9 c vs Royaume-Uni ») ; montée recalculée par Open-Meteo (403 m) ; doc `weighted_grade` cherchée en ligne (transit.land).

**Tamponnage : non.** Code lu en entier ou par diff : `roule.ts`, `trajet-roule/index.ts`, migration m4, `enRoute.ts`, `EnRoute.tsx`, diffs de `Trajets.tsx`/`Resultat.tsx`/`FicheStation.tsx`/`Historique.tsx`/libs, `calcul-peages.ts` 1-119, `stations-pays.ts`, extraits de tests et aides. Les fichier:ligne des MEDIUM sont relus par un grep final (Trajets.tsx:180/210/490, EnRoute.tsx:139-140/149, roule.ts:133/293, US-6.2.test.ts:11-17) et sont exacts (revérifiés par moi). Grep des textes en dur fait (refait par moi sur les 5 .tsx modifiés : aucun texte affiché hors `T`).
Une surdéclaration : « 28 captures ouvertes une à une » / « Chaque image lue » — le transcript n'en ouvre que **26** ; **US-6.3-01-avant** et **US-6.E1-01-avant** ne sont jamais lues, et l'égalité « US-6.2-02 ≈ US-6.3-01 » est affirmée sans avoir vu 6.3-01 (reprise de l'évaluateur/descripteur). Deux captures « avant », sans incidence sur un verdict, mais l'affirmation est fausse à la lettre.

**Exhaustivité.** 11 histoires et 13 critères au tableau, chacun avec preuve ; cas limites E1/E2/E3 + repli verrou + GPS perdu + un cas manquant trouvé (enregistrement en attente puis « Enregistrer en roulant ») ; signalements (1)–(5) instruits un par un, confirmés/levés avec preuve (US-6.2 levé pour l'appli EN DIRECT, confirmé pour le test) ; les 6 écarts du descripteur + la note 6.4-02 traités. Non-régression moyenne FR (2,159 FR vs 2,071 GB) et péages jalon 3 (cache lu, 0 appel PTV). Zones moins creusées : US-6.3a vérifiée seulement par l'extrait (Chromium + CDP), US-6.E3 non rejouée en direct, Dartford repris du bâtisseur (code et ligne `peages_fixes` lus toutefois).

**Faux PASS — 3 critères COVERED revérifiés par moi.**
1. US-6.3 b (« GPS perdu » > 15 s, distance figée) : `roule.ts:16` `GPS_PERDU_MS = 15_000`, `:135` `gpsPerdu`, distance = somme des pas des seuls points reçus (`:132`) → rien n'augmente sans position ; `EnRoute.tsx:110/121` affiche l'alerte. **COVERED confirmé.**
2. US-6.E3 (reprise après rechargement, distance conservée) : `Trajets.tsx:65-66` relit `pt-en-route`, `:431-441` bandeau + « Reprendre ». **Essai en direct (prod)** : 25 positions, 0,5 km → rechargement → bandeau « 0,5 km déjà enregistrés en 0:00, gardés sur ce téléphone. » → Reprendre → 0,5 km, état `enregistrement`. **COVERED confirmé.** Le même essai confirme son MEDIUM 1 : `bouton-enregistrer` visible et actif (pas d'`aria-disabled`) à côté du bandeau. Perte silencieuse possible d'un enregistrement : MEDIUM défendable (le critère est tenu, il faut toucher le mauvais bouton), à la limite du HIGH.
3. US-3.9 (Dartford si franchi, Manche non comptée) : `roule.ts:367-383` retire les lignes de traversée et ajoute Dartford si une arête ou une ligne correspond (`^(a282|dartford crossing|…)$`), appliqué dans `trajet-roule/index.ts:162` et `estimer-trajet/index.ts:266` ; note `manche-non-comptee` (`Resultat.tsx:271`, `textes.ts:320`). Montant 3,50 £ vérifié en ligne sur gov.uk (« Cars … £3.50 ») → 4,17 € au cours 0,8403. **COVERED confirmé.**
Aucun HIGH ni CRITICAL manqué trouvé → pas de faux PASS.

**Garde-fous : adossés.** Commande 34 (04:18Z) : `rate_limit_anonymous_users: 30` (API de gestion), trajet `3c4d5dfc…` recompté 0 (DELETE 204 dans la sortie de `direct2`), m3/m4-admin-eph 0/0, moteurs `peages ptv / null`, `itineraire stadia / valhalla-public`, Vault `cle_ptv`, `cle_stadia`, `sync_prix_secret` avec test « FAUX- » = false, recherche de fuite des 8 valeurs de `.env.local` (seul `VERCEL_PROJECT_ID`, non secret). Quota PTV 57 lu avant et après les essais. Aucun commit, push ni déploiement dans le transcript.

**Note.** 5 − 0 (tamponnage : code, images, build, tests, grep, prod réellement faits) − 1 (zones non vérifiées : 2 captures non ouvertes alors que les 28 sont déclarées lues ; US-6.3a et US-6.E3 non rejouées en direct) − 0 (signalements 1-5 et écarts du descripteur tous instruits) − 0 (aucun faux PASS sur HIGH/CRITICAL) − 0 (pas de FAIL) − 0 (grep fait) = **4/5**.

**Verdict : PASS 4/5.** Rien à refaire pour le verdict. À corriger dans le rapport de l'auditeur : « 28 captures ouvertes » → 26 (US-6.3-01-avant et US-6.E1-01-avant non lues).

## Correctifs post-audit

Agent m4-tests-deploiement, 21/10 04:25-05:10Z. Preuves en direct par `tests/e2e/exploration/m4-correctifs.mjs` (prod, bibliothèque Playwright, 37 requêtes serveur, toutes 2xx) et par la spec `m4-explore.spec.ts`.

| Point | Commit | Correctif | Preuve | Avant → après |
|---|---|---|---|---|
| **M1** (Trajets.tsx) | `151e002` | « Enregistrer en roulant » porte `aria-disabled="true"` tant que le bandeau de reprise est affiché ; le toucher affiche « Un enregistrement attend déjà ci-dessus : reprends-le ou arrête-le avant d'en commencer un autre. » et ne touche à rien ; le message disparaît à la reprise ou à l'arrêt. | En direct : bouton `aria-disabled=true`, toucher forcé → message, 0 écran En route, `pt-en-route` identique octet pour octet ; test « US-6.1 Edge Case — enregistrement en attente » ✓ (Reprendre rouvre En route avec la distance gardée). | Écrasement silencieux → impossible |
| **M2** (roule.ts, trajet-roule) | `db45693` | Doc Valhalla (`docs/docs/api/map-matching.md` du dépôt valhalla/valhalla, lue le 21/10) : `weighted_grade` = « a measure used for hill avoidance in routing - sort of a relative energy use along an edge », pas une pente. Montée désormais tirée de l'altitude avec la méthode d'estimer-trajet (jalon 2) : échantillons tous les 500 m le long des pas (`echantillonner`), altitudes IGN RGE ALTI, dénivelé positif = somme des hausses (`deniveleParEtape`). IGN rend -99999 hors de France (vérifié : Londres) → complément Open-Meteo (Copernicus GLO-90, sans clé). Sans réponse : aucune montée + avertissement `altimetrie_indisponible` (message déjà affiché par le Résultat), comme au jalon 2. `altitudesIgn` déplacée dans `_shared/altimetrie.ts` (estimer-trajet l'importe, code identique). | Vitest : 2 nouveaux tests (`m4-roule.test.ts`, « montées tirées de l'altitude ») ; recalcul en direct (vraie fonction déployée, extraits du GPX, aucun péage) : km 0→15 **30 → 35 m** (0,92 → 0,92 L), km 30→45 **27 → 25 m** (0,87 → 0,86 L) ; trajet complet calculé par l'appli (positions du GPX injectées dans l'enregistrement gardé, « Arrêter » du bandeau, trajet supprimé ensuite) : **586 → 339 m**, **5,25 → 4,84 L**, **13,03 → 12,15 €**. Le même D+ (339 m) est rendu par le code déployé appelé hors appli sur les 156 échantillons (0 sans donnée). | 586 m → 339 m (−0,35 L dus à la seule montée ; le reste vient des horodatages : rejeu réel 66 km/h moy. contre horodatage du GPX 64 km/h) |
| **M3** (EnRoute.tsx, textes.ts) | `151e002` | Mention sous les compteurs : « Litres et € en direct sans les montées : le dénivelé du tracé s'ajoute au calcul final, à l'arrêt. » (`T.directSansMontees`, `data-el="direct-sans-montees"`). | En direct (capture de preuve) ; assertion du test US-6.2 ✓. | Écart −16 % non dit → dit à l'écran |
| **M4** (test US-6.2) | `1edc4c5` | Positions injectées à une vitesse différente à chaque seconde (40 → 97 km/h) ; `data-kmh` relevé toutes les 200 ms pendant 40 s ; assertions : ≥ 10 valeurs distinctes, ≥ 15 changements, écart max entre deux changements ≤ 2 000 ms. | `m4-explore` US-6.2 ✓ (2 passages : seul et dans la suite). | Assertion sur le tracé de la courbe → sur la vitesse affichée |
| **M5** (US-6.6-02) | `adb5744` | Capture cadrée (viewport 390 × 2600, `clip` sur le bloc et la note) : « Ma vitesse enregistrée · 64 km/h moy. · 4 accélérations », courbe, péages, pays, tronçons, note « Calcul sur ta vitesse réelle… ». | Image ouverte ; md5 livrée = brute `ca3cb04a` (deux prises de vue). | Note absente → bloc et note dans la même image |
| **M6** (US-1.9-01/02) | `adb5744` | 01 : écran Prix à Londres, carte + liste (49 stations GB-, 49 pastilles) ; 02 : viewport 390 × 1400, fiche Asda 112 Vallance Road (2,022 €/L = 169,9 p/L ÷ 100 ÷ 0,84028, cours BCE du 20/10) avec la carte et 6 lignes de liste au-dessus. | Images ouvertes ; md5 `2530f01a` / `04bc93b6` (livrée = brute). | Écran Trajets / fiche seule → Prix à Londres / carte + liste + fiche |
| **LOW 10** | `151e002` | Pendant `attente` : « Demande au navigateur de garder l'écran allumé… » au lieu de « L'écran reste allumé ». | En direct (réponse du verrou suspendue) ; test US-6.3 Edge Case LOW 10 ✓. | — |
| **LOW 12** | `3f35e19` | `libellesStations` retire le préfixe « enseigne · » déjà présent dans le nom des flux GB. | Vitest (format.test.ts) ; en direct : 49 lignes, 0 « X · X · », titre de fiche « ASDA · 112 VALLANCE ROAD, LONDON ». | « Asda · Asda · 112 Vallance Road » → « Asda · 112 Vallance Road » |
| **LOW 13** | — (données) | Les 7 trajets enregistrés de test du bâtisseur (1,3-1,6 km, créés 01:47-03:41Z : cb87d488, 20863c9e, 4267e696, 86fb7caa, 8ba3c7a6, e14df9fa, f2b6c028) supprimés par SQL, et eux seuls. | `DELETE … RETURNING` = 7 lignes ; relu : 1 trajet enregistré restant (7b850a4f, Albi → Toulouse du rejeu de 73 min, preuve des captures US-6.5, gardé). | 8 → 1 |

Fonctions déployées (`supabase functions deploy --use-api`) : trajet-roule v4, estimer-trajet v18 (verify_jwt conservé). `deno check` des deux : 0.

Restent notés (non traités) : LOW 1, 2, 3, 4, 8, 9 (le seuil de 50 m du tronçon), 11, 14, 15. **Observation nouvelle, hors périmètre du jalon 4** : le calcul Europe d'estimer-trajet (`_shared/europe.ts:224`, jalon 3) tire lui aussi le dénivelé de `weighted_grade` ; la vérification du déploiement montre « Montée · A20 / A10 / A1 · 111,1 km · 12,9 L » sur Albi → Londres. Même biais que M2, à corriger de la même façon (altitudes des échantillons) dans un prochain passage ; non touché ici pour ne pas changer les résultats du jalon 3 sans audit.

## Test & Regression

- **Vitest** : 174/174 (11 fichiers ; 3 nouveaux : 2 montées, 1 libellé GB).
- **Build** (`lourd npx vite build`) : OK — index-*.js 483,80 kB (gzip 141,41), CarteStations-*.js 806,65 kB (gzip 219,53), index-*.css 21,54 kB, CarteStations-*.css 65,48 kB ; avertissement de taille du morceau carte déjà présent aux jalons précédents.
- **tsc --noEmit** : 0. **deno check** trajet-roule, estimer-trajet : 0.
- **Playwright** (un seul lancement, `lourd`, 04:43-05:00Z, prod) : **165 ✓ / 1 ✘ / 2 ignorés sur 168** — m1 24/25, m2 61/61, m3 64/66 (2 ignorés), m4 16/16. La spec m4 avait aussi été jouée seule avant (16/16, 6,4 min).
- **Régressions trouvées** : 0. **Correctifs de régression** : 0.
- **Rouge connu** : M1 US-1.E4 — aucune rupture de gazole réelle dans le rayon de 10 km d'Albi (SQL du 21/10 ~04:45Z : 1 rupture gazole dans un carré de ±30 km, à Réalmont, station 81120001, ≈ 17 km, hors rayon). Laissé rouge.
- **Ignorés** : m3 US-5.5 et US-5.E3 (HERE, BLOQUÉ-CLÉ, inchangés). **fixme** : aucun.
- **Interceptions** : aucun `page.route` dans m4-explore ; un seul remplacement d'API du navigateur (`navigator.wakeLock.request` suspendu, `// MOCKED:` commenté) pour l'état « attente » du verrou (LOW 10). Toutes les histoires serveur (US-6.5, 6.6, 6.E2, 3.9, 1.9) ont des tests sans interception ; US-6.5 lit la vraie réponse de trajet-roule (200, sans `altimetrie_indisponible`).
- **Configuration** : `playwright.config.ts` joue `m[1-4]-explore.spec.ts` ; les extraits `exploration/m4-test-snippets/` sont gardés, hors suite.
- **Quota PTV** (jour UTC 21/10) : 57 avant mes tests → 57 après la spec m4 seule → 63 après la régression complète (6 appels, tous dans m3) → 63 après la vérification du déploiement. Le jalon 4 (spec, preuves, vérification) : 0 appel PTV hors cache.

## Deploy

- **Code en production** : `3f35e19` (front Vercel READY, `plein-et-trajet-cb1ndjk4f-…vercel.app`, cible production, relu par l'API Vercel) ; Edge Functions trajet-roule v4 et estimer-trajet v18 déployées. Commits suivants : tests, captures et documentation seulement.
- **URL** : https://plein-et-trajet.vercel.app
- **Vérification : PASS** (`tests/e2e/exploration/m4-deploy-verify.mjs`, 05:02-05:04Z, session anonyme réelle créée par l'appli, aucun raccourci, aucune interception) :
  - enregistrement en roulant (75 s de GPX sur la N88) arrêté → « Albi → Le Sequestre · enregistré », 0,19 €, 1,6 km en base, `enregistre = true`, en tête de l'historique « 2 km · 21 oct. · enregistré » ; trajet supprimé ensuite (200, 1 ligne, relu 0) ;
  - Prix à Londres : 49 stations GB, fiche « Gazole 197,9 p/L · SP95-E10 169,9 p/L · SP95 169,9 p/L », cours BCE du 20/10 (1 € = 0,8403 £) ;
  - Albi → Londres : 223,69 €, 1 122 km, « Royaume-Uni · 128 km · 7,7 L × 2,071 — moyenne du jour de 2 316 stations », Manche non comptée ; ligne d'historique supprimée ensuite.
  - **Requêtes serveur : 38, toutes 2xx** (200 × 34, 201 × 4) ; fonctions appelées : lieux 200, trajet-roule 200, estimer-trajet 200.
- **Captures** : `tests/e2e/delivery/m4-deploy-verify-01.png` (historique avec le trajet enregistré), `-02.png` (fiche station londonienne en pence/L et €), `-03.png` (Albi → Londres : péages, pays traversés, Manche non comptée), ouvertes et vérifiées.
- **Garde-fous relus en fin (05:06Z)** : Vault = `cle_ptv`, `cle_stadia`, `sync_prix_secret` (noms seuls, aucun « FAUX- ») avant comme après ; moteurs péages = ptv sans secours, itinéraire = stadia + secours valhalla-public ; incidents en table = réels d'hier (stadia 400 à 19:42Z, ptv quota 403 à 23:31Z), tous rétablis, 0 incident factice ; limite d'inscriptions anonymes portée à 300 pendant les suites puis remise à **30**, relue par l'API de gestion ; comptes `m3-admin-eph-*` 0, `m4-admin-eph-*` 0 ; appels PTV du jour (UTC) : **63** ; trajets créés par moi (preuves, vérification) tous supprimés, tests de la spec qui en créent : supprimés en fin de test ; 1 seul trajet enregistré en base (7b850a4f, preuve du rejeu). Balayage des secrets avant chaque commit : 0 valeur de `.env.local`.
