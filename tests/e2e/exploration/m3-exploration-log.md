# Journal d'exploration — Jalon 3 « Péages, Europe et moteurs »

Exploration de l'appli DÉPLOYÉE (https://plein-et-trajet.vercel.app), base réelle (Supabase rglrwtkqwihdztgqlbsy), bibliothèque Playwright (Chromium, 390×844, fr-FR). Clés fournisseurs : au départ du jalon aucune n'existait ; depuis 19:42Z (2026-10-20) les vraies clés PTV et Stadia d'Anthony sont dans Vault (lues en mémoire par les tests, jamais écrites ailleurs). Aucune clé HERE : les critères qui exigent une vraie réponse HERE restent `BLOQUÉ-CLÉ` (aucun mock pour les faire passer).

Administrateur de test : `m3-admin-test@example.org` (vrai utilisateur Auth, `app_metadata.role = "admin"`, connexion par un vrai lien magique généré par l'API d'administration `generate_link`, sans mot de passe). L'adresse d'Anthony (`anthony.hunt@yahoo.fr`) est aussi administrateur : elle se connecte par `/admin` (lien magique envoyé par e-mail), puis ⚙ ouvre l'écran Moteurs.

Captures : `tests/e2e/delivery/<nom du plan>.png` (+ une seconde prise de vue brute dans `tests/e2e/exploration/m3-captures-brutes/`, voir son LISEZMOI).

## API Contract Check

Pour chaque appel touché (client, fonction, RLS) : relu côté serveur (handler, grants, RLS), une ligne par appel.

- FE: src/lib/trajets.ts:41 `supabase.functions.invoke("estimer-trajet", {depart,arrivee,vehicule_id})` → BE: supabase/functions/estimer-trajet/index.ts `Deno.serve` (corps validé par `pointValide`, 400 `requete_invalide`) — OK
- FE: src/lib/trajets.ts (lecture de la réponse : `km, litres, troncons[], vehicule, pays[], peages{etat,motif,fournisseur,lignes[{pays,libelle,montant}],total,vignettes[]}, itineraire, avertissements`) → BE: estimer-trajet/index.ts (objet de la réponse 200, mêmes noms) — OK
- FE: src/lib/trajets.ts (erreurs 422 `pas_itineraire` | `trop_long` | `hors_couverture`, lues dans `error.context.json().erreur`) → BE: estimer-trajet/index.ts (`reponse(422, …)`) — OK (MISMATCH corrigé en cours de route : le code Valhalla 154 « distance au-delà de la limite » était rangé en « pas d'itinéraire » ; il a désormais son propre code `trop_long`)
- FE: src/lib/donnees.ts `moyennesParPays` → `supabase.rpc("moyennes_par_pays", {p_carburant})` → BE: migration 20261021090000 `moyennes_par_pays(text)` (grant anon, authenticated ; colonnes `pays, prix_moyen, source, jour`) — OK (`prix_moyen` revient en chaîne numérique : converti par `Number`)
- FE: src/lib/donnees.ts `infoPays` → `rest/v1/pays?select=code,nom,flux_stations` → BE: table `pays`, RLS « lecture publique pays », grant select anon/authenticated — OK
- FE: src/lib/donnees.ts `paysDePosition` → `functions.invoke("lieux", {action:"pays",lat,lon})` → BE: supabase/functions/lieux/index.ts (`action === "pays"` → `{pays:{code,nom}|null}`) — OK
- FE: src/lib/geocodage.ts `propositionsEtrangeres` / `lieuEtranger` → `functions.invoke("lieux", {action:"suggerer"|"geocoder", q})` → BE: lieux/index.ts (`{propositions:[{label,lat,lon,contexte,pays}]}` / `{lieu:{…}|null}`) — OK
- FE: src/lib/donnees.ts `stationsAutour` → `rpc("stations_autour")` → BE: migration 20261021090000 (fonction recréée, nouvelle colonne `pays`, mêmes paramètres, grant conservé) — OK
- FE: src/lib/donnees.ts `prixCarburant`/`prixStation` → `rest/v1/prix` (stations espagnoles : lignes insérées par `sync_stations_pays`, mêmes colonnes) → BE: table `prix`, RLS lecture publique — OK
- FE: src/lib/moteurs.ts `listerMoteurs` → `functions.invoke("moteurs", {action:"lister"})` → BE: supabase/functions/moteurs/index.ts `lister()` (`{moteurs:[{service,nom,description,actif,secours,etat,message,bascule,incident,fournisseurs[{id,nom,cle_requise,cle_fin}]}]}`) — OK
- FE: src/lib/moteurs.ts `testerMoteur` → `{action:"tester",service,fournisseur,cle?}` → BE: moteurs/index.ts `tester()` (`{etat,message}`) — OK
- FE: src/lib/moteurs.ts `enregistrerMoteur` → `{action:"enregistrer",service,fournisseur,secours,cle?,cle_secours?}` → BE: moteurs/index.ts (`{enregistre,etat,message,moteurs}` ; clés rangées par `moteur_cle_enregistrer` → Vault) — OK (MISMATCH corrigé : le secours n'était enregistré que si l'actif répondait ; il l'est maintenant même quand l'actif est en panne)
- FE: src/lib/admin.ts `envoyerLien` → `supabase.auth.signInWithOtp({email, shouldCreateUser:false, emailRedirectTo})` → BE: Auth (site_url et liste de redirections réglées par l'API de gestion sur https://plein-et-trajet.vercel.app) — OK
- FE: aucun appel direct du front à `moteurs`, `fournisseurs`, `cles_fournisseurs` → RLS : `moteurs` et `fournisseurs` = politique `est_admin()` (app_metadata.role) ; `cles_fournisseurs` : aucun droit pour anon/authenticated ; `moteur_cle*` : service_role seul — OK (vérifié sur le vrai serveur dans US-5.E1)
- BE→externe : estimer-trajet → Valhalla `/route` + `/trace_attributes` (valhalla1.openstreetmap.de ou api.stadiamaps.com), PTV `GET /routing/v1/routes?…results=TOLL_COSTS,TOLL_SECTIONS,TOLL_SYSTEMS&options[currency]=EUR` (en-tête `apiKey`), HERE `GET /v8/routes?…return=tolls&currency=EUR&tolls[vignettes]=all&apiKey=` : champs relus dans les documentations officielles (OpenAPI PTV routing v1.41, pages HERE « Get toll cost information for route ») — OK
- BE→externe : sync-moyennes-ue → xlsx du Bulletin pétrolier (onglet « Prices with taxes », vérifié via workbook.xml) ; sync-stations-pays → relais `/api/relais-es` → MITECO — OK

## US-A11Y-001 — Navigation au clavier (jalon 3)

### Happy Path
- ✓ `US-A11Y-001-01-m3.png` — écran Moteurs avant Tab — écran Moteurs (S5) avant le parcours au clavier
- ✓ `US-A11Y-001-02-m3.png` — Tab/Maj+Tab : ordre de lecture et contour visible sur l'écran Moteurs — 25 contrôles parcourus : Moteurs (administration) → ← Retour → Fournisseur · Prix des stations → Tester la connexion → Enregistrer → Fournisseur · Prix moyens par pays → Tester la connexion → Enregistrer → Fournisseur · Itinéraire → Secours · Itinéraire → Tester la connexion → Enregistrer → Fournisseur · Péages → Secours · Péages… ; tous avec contour visible, dans l'ordre de lecture

### Edge Case
- (rien à signaler)

### Issues Found
- aucune sur la version déployée à cette passe.

## US-A11Y-003 — Touche Échap (jalon 3)

### Happy Path
- ✓ `US-A11Y-003-01-m3.png` — la fiche est ouverte — fiche d'une station espagnole ouverte
- ✓ `US-A11Y-003-02-m3.png` — Échap ferme la fiche — Échap ferme la fiche
- ✓ (hors capture) trajet Albi → Barcelone : tronçon espagnol déplié, Échap le replie et rend le focus au tronçon.

### Edge Case
- (rien à signaler)

### Issues Found
- aucune sur la version déployée à cette passe.

## US-A11Y-004 — Libellés lisibles (jalon 3)

### Happy Path
- ✓ `US-A11Y-004-01-m3.png` — stations espagnoles avant la lecture des libellés — stations espagnoles : carte et liste
- ✓ `US-A11Y-004-02-m3.png` — libellés : pastilles, prix et contrôles de l'écran Moteurs — 153 pastilles annoncées (ex. « Gratsa Barcelona · Gratsa, 1,869 euros le litre, plus cher ») ; 153 prix de liste annoncés en euros ; écran Moteurs : 0 contrôle sans nom ; bouton ⚙ nommé « Moteurs (administration) »

### Edge Case
- (rien à signaler)

### Issues Found
- aucune sur la version déployée à cette passe.

## Round 2

Réponse à l'audit round 1 (3 HIGH, 9 MEDIUM) et aux ajouts d'Anthony (US-5.6, vraies clés, Stadia). Toutes les captures du plan sont refaites sur le code déployé final (56/56 : 52 du plan + 4 de US-5.6), brutes propres (voir `m3-captures-brutes/LISEZMOI.md`), 0 ligne ✗ au dernier passage de `run-m3.mjs`.

- **H1 flux de stations** : IT, PT, SI, HR (lat/long inversés remis à l'endroit), AT, DK, IS branchés (relevés en vrai à Rome, Lisbonne, Vienne, Ljubljana, Zagreb : vues `m3-captures-pays/`), Berlin (DE, non branché) = « Prix station par station pas encore disponibles pour ce pays », Bruxelles = phrase de la spec ; `pays.statut_flux` = branche | non_branche | aucun. RO (certificat TLS invalide) et UK (CSV à URL signée) non branchés ; DE : Tankerkönig branché mais sans clé (voir US-5.6).
- **H2 tracé Valhalla** : découpage par distance (≤ 800 km, point de jonction répété) + par points ; Albi → Rome, Lisbonne, Belgrade fonctionnent ; US-4.E6 refait DEPUIS Albi vers Belgrade (1 870 km chez Stadia).
- **H3 textes** : plus de chaîne visible hors `textes.ts` (grep des fichiers du jalon), noms de pays depuis la table `pays`.
- **M4** clé candidate testée AVANT Vault (US-5.3, US-5.E2) · **M5** limiteur Postgres partagé + URL/pause lues dans `fournisseurs`, Stadia cible · **M6** `docs/pipeline/m3-decisions.md` · **M7-8** brutes propres, étiquettes en haut seulement quand la preuve n'est pas dans l'interface (réponses réseau, mesure 4G, ordre de tabulation) · **M9** A11Y sur S1, S3, S4, S5 · **M10** US-4.E4-01 sur S4 · **M11** pastilles sans place masquées à petite échelle en zone dense · **M12** prix HERE « fourchette » (maximum, signalé).

### Vraies clés et état des moteurs
Les vraies clés PTV et Stadia sont lues EN MÉMOIRE au début de `run-m3.mjs` (et du `globalSetup` des extraits) et restaurées dans un `finally` ; les tests n'écrivent jamais une clé factice sur une vraie clé (clés factices « FAUX- » sur HERE seulement, supprimées par valeur). US-4.4 (montants TTC réels), US-5.4 (« Connecté » PTV) et l'itinéraire Stadia sont donc vus en vrai, plus BLOQUÉ-CLÉ. Encore BLOQUÉ-CLÉ : HERE (US-5.5 et la forme PTV → HERE de US-5.E3 ; la bascule d'un principal en panne vers un secours qui répond est vue en vrai : HERE refusé → PTV, avec la note « Bascule HERE → PTV Developer le … ») et Tankerkönig (synchro allemande jamais exécutée avec une vraie clé).
Vérification finale (vrai appel `estimer-trajet` Albi → Barcelone, sans clé) : `{"statut":200,"peages":"ptv","etatPeages":"ok","totalPeages":29,"itineraire":"stadia"}`.

### Correctif Stadia (trace_attributes)
Stadia valide strictement les attributs (« unknown variant `edge.traffic_signal` », idem `edge.end_node.admin_index`) ; liste exacte relevée dans le message 400 réel de Stadia. Une seule liste `ATTRIBUTS_TRACE` (node.admin_index pour le pays, edge.length/road_class/speed/speed_limit/weighted_grade/toll/roundabout/names/density, node.intersecting_edge.road_class, admin.country_code/text) vérifiée en vrai chez Stadia ET chez FOSSGIS (même forme de réponse). **Feux** : `edge.traffic_signal` n'existe pas chez Stadia → approximation documentée dans `europe.ts` : un carrefour rencontrant une route de classe ≥ tertiaire compte pour 0,45 arrêt (+ 1 par rond-point), reste fractionnaire reporté d'une étape à l'autre ; part mesurée sur FOSSGIS (vrais feux / carrefours prioritaires) : 24/43 Albi→Toulouse, 24/56 Albi→Barcelone, 20/42 Albi→Bordeaux, 14/51 Paris→Lyon (moyenne 82/192 = 0,43). Modèle de consommation et découpage par distance inchangés ; tests unitaires de la liste et de l'approximation. Vérification : `estimer-trajet` Albi → Barcelone renvoie `itineraire.fournisseur = "stadia"` ; `moteurs.incident_message` de l'itinéraire avant et après le déploiement et l'appel : identique (« stadia : indisponible 400 », 2026-10-20 19:42:35 UTC, relevé avant ET après) — pas de nouvel incident.

### Écrans qui montrent légitimement le même état
(Corrigé au round 4 : la phrase « aucune capture du dernier passage n'est identique à une autre » écrite ici au round 2 était fausse — voir « Round 3 » et la section « Captures aux octets identiques », relevée par empreinte.) Une brute et sa livraison coïncident octet pour octet quand aucune étiquette n'est posée (deux prises successives d'une page fixe).

### Limites connues
- Albi → Barcelone : PTV ne renvoie pas de section pour l'AP-7 espagnole dans cette requête ; seuls les péages français (29,00 € TTC) sont comptés — signalé, non inventé.
- Stadia et FOSSGIS ne calculent pas toujours le même itinéraire (Milan 861 km chez Stadia contre 950 chez FOSSGIS) : seuils des tests élargis.

## Round 3

Entrées écrites au fil de l'eau (une par histoire ou correctif), horodatées UTC.

- 20:58Z — Les 6 échecs M2 non expliqués du dernier passage (US-3.P2, US-A11Y-002 ×2, US-A11Y-003 ×2, US-A11Y-004) : rejoués 3 fois chacun (12 tests, `--repeat-each=3`) = 34 verts sur 36 ; les 2 échecs sont les deux derniers tests de la 3e série (US-A11Y-004 S4 et erreurs) : la liste « Marque » ne s'ouvre pas. À ce moment 31 identités anonymes avaient été créées en 10 minutes (relevé SQL : 236 sur l'heure) alors que la limite d'inscriptions anonymes était à 30 par heure et par IP : cet échec reproductible est l'épuisement de la limite, pas un défaut de l'appli. Pour le passage complet précédent (limite alors à 300) la cause n'est pas prouvée ; le passage complet final de ce round se fait limite relevée à 300 (relue) puis remise à 30 (relue).
- 20:58Z — Échec « 0,375 contre < 0,06 » (US-4.2 bornes) : le total affiché inclut les péages réels PTV (1,5 € ÷ 4 €/L = 0,375 L d'écart, exactement) ; US-3.5, US-3.6 et US-4.2 (×2) comparent maintenant le coût CARBURANT (total moins péages), commentaire « US-4.4 : le total inclut les péages depuis le jalon 3 », commit séparé « test(m2) » ; 8 tests verts après modification.
- 21:03Z — RO et UK tentés pour de vrai. Royaume-Uni : `curl https://storelocator.asda.com/fuel_prices_data.json` → 200, 175 590 octets, 790 stations (prix en pence) ; branché (enseigne Asda seule, cours GBP du jour) : `sync-stations-pays?pays=GB` → {ok:true, stations:789} (790 lignes, 1 doublon d'identifiant). Roumanie : `curl https://monitorulpreturilor.info/pmonsvc/Gas/GetGasItemsByLatLon?…` sans -k → code de sortie curl 60 (certificat invalide) ; avec -k → 200, 130 034 octets. Branché par un relais Node (`api/relais-ro.js`, rejectUnauthorized false pour cette seule adresse, comme le relais espagnol) : `sync-stations-pays?pays=RO` → {ok:true, stations:519}. Particularités relevées : le service roumain ne répond que jusqu'à 5 km de rayon (réponse vide de 275 octets à 7 km et plus) et au plus 50 stations par requête, un seul identifiant de produit par requête (11 benzine 95, 12 premium, 21 motorină, 31 GPL) : couverture partielle (50 villes × 4 produits). Cron GB et RO ajoutés ; pays.statut_flux = branche pour GB et RO.
- 21:03Z — LOW 19 traité : table `quota_peages` + fonction `quota_peages_reserver` ; chaque calcul qui exige un appel de péages réserve un créneau par identité anonyme (60/jour) et globalement (1 500/jour) ; au-delà, le calcul continue sans péages (« Péages non disponibles pour l'instant », motif quota_atteint) et aucun appel PTV/HERE ne part. Limites choisies : PTV 100 000/mois, HERE 2 500/mois (≈ 80/jour).
- 21:10Z — Captures : nouveau run complet de run-m3.mjs, 56/56, 0 ligne ✗ ; administrateur éphémère créé au départ et supprimé dans le finally (relu : adminsEphemeresRestants = 0) ; vraies clés lues en mémoire puis restaurées ; vérification finale : péages = ptv (ok), itinéraire = stadia.
- 21:10Z — Groupes d'octets identiques relevés par empreinte (section « Captures aux octets identiques »). RÉSOLUS en refaisant une vraie capture distincte : US-5.3-01 (le champ clé a maintenant le focus), US-5.4-01 (le bouton « Tester la connexion » a le focus : l'étape part de l'état « prêt à tester »), US-5.E2-E1-03 (capturée AVANT rechargement : le message « … fournisseur actif inchangé » est à l'écran ; la vérification du fournisseur actif après rechargement est une ligne hors capture). Ces trois étaient jusqu'ici des copies de l'écran de US-5.2-01 (carte Péages au repos), ce qui n'était pas leur état réel.
- 21:10Z — Groupes qui RESTENT identiques, légitimement (aucune différence fabriquée) : (1) livraison US-3.8-02 = US-4.4-01 : « Albi → Barcelone calculé, écran Résultat » est exactement l'écran d'arrivée de US-3.8 et le point de départ de US-4.4 (même page, même défilement en haut) ; (2) brutes US-3.8-02 = US-4.4-01, pour la même raison ; (3) brutes US-1.8-01 = US-1.8-03 : « onglet Trajets ouvert » à Barcelone puis à Bruxelles montre la même interface (la position est un réglage du navigateur, invisible sans étiquette) ; les livraisons diffèrent par l'étiquette de position ; (4) brutes US-5.3-03 = US-5.3-04 : même écran Moteurs après rechargement, la livraison -04 porte en plus l'étiquette de preuve réseau ; (5) brutes US-5.6-01 = US-A11Y-004-02-m3 : même écran Moteurs en haut de page (administrateur connecté), la livraison A11Y-004-02 porte l'étiquette du relevé d'accessibilité.
- 21:10Z — Brute US-PERF-001-01-m3 « blanche » : voulue. L'étape 1 du plan est l'état AVANT l'ouverture de l'appli (4G émulée, position Barcelone) : le navigateur est sur about:blank, il n'y a rien à montrer ; la livraison porte l'étiquette qui décrit la limitation de débit (latence 150 ms, 1,6 Mbit/s). La preuve du critère est la capture -02 (liste affichée en moins de 2,5 s, durée mesurée dans l'étiquette).
- 21:10Z — Observation PTV : Albi → Barcelone a renvoyé 29,00 € TTC (deux sections, 1,70 + 27,30) en début de round puis 16,70 € TTC (une section « CARCASSONNE-E - LE PERTHUS », 13,92 € HT × 1,20) ; relevé par appel direct à PTV avec la clé en mémoire : 200, une section. PTV choisit son propre itinéraire et peut le changer d'un appel à l'autre ; l'appli affiche ce que PTV renvoie et l'égalité avec l'appel direct est vérifiée à chaque passage (US-4.4-02).

## Round 4

Entrées écrites au fil de l'eau (une par correctif), horodatées UTC.

- 22:10Z — Correctif 1 (HIGH, péages tarifés sur un autre itinéraire) : doc lue — OpenAPI PTV Routing v1 (paramètre `waypoints` : attribut `radius=<m>` = « route-manipulation waypoint », « influences the route path, so that the route passes an area defined by the given radius ») ; limite PTV de 25 waypoints par requête (base de connaissances PTV citée par la recherche ; erreur ROUTING_TOO_MANY_WAYPOINTS) ; HERE Routing v8 `via=lat,lon!passThrough=true`. Méthode : `pointsDePassage` (`_shared/peages.ts`) prend sur LE tracé affiché (forme Stadia/Valhalla décodée, ou géométrie des étapes IGN) min(23, ⌊km/25⌋) points régulièrement espacés, envoyés à PTV (`;radius=500`) et à HERE (`via … passThrough`). Tests unitaires `tests/unit/m3-round4.test.ts` (6). Déployé : estimer-trajet v11.
- 22:10Z — Preuve en direct (vrais appels estimer-trajet, session anonyme, 22:09Z) : Albi → Milan 860 km stadia, péages ptv **79,70 €** ×2 (Viaduc de Millau 11,30, A9/A54/A8 jusqu'à La Turbie, « VENTIMIGLIA - MILANO OVEST » 29,10) — plus de Fréjus ; sans points de passage (même tracé) : 122,20 € avec « Tunnel du Fréjus 55,50 » (défaut reproduit). Voies du tracé affiché : A 75, Viaduc de Millau, A 9, A 54, A 8, A 10, A26/A7. Albi → Barcelone 471 km : **29,00 €** ×2 (« TOULOUSE EST » 1,70 + « TOULOUSE-SUD/EST - LE PERTHUS » 27,30). Albi → Bordeaux (IGN) 24,60 € ; Belgrade 122,29 € (Riviera, Croatie, Serbie) ; Castres 0 €. Écart à l'estimation de l'auditeur (≈ 73 € pour Milan) : le tracé affiché passe par le Viaduc de Millau (11,30 €), que son relevé ne comptait vraisemblablement pas — non prouvé.
- 22:10Z — Correctif 6 (LOW, test US-4.4 « indépendant ») : `totalPeagesPtvDirect` (même requête à 2 points que l'appli) supprimé ; remplacé par `peagesSurTraceDirect` (`m3-aides.mjs`) : tracé redemandé directement à Stadia, polyline décodée et jalonnée par un code écrit à part (approximation équirectangulaire), PTV appelé en direct, TVA du pays ; rend aussi les voies du tracé. Extrait US-4.4 : Barcelone ET Milan, total affiché = recalcul, même nombre de sections, « Fréjus » présent seulement si le tracé passe par l'A43/le tunnel. Sonde hors appli (22:08Z) : Milan 79,70 €, Barcelone 29,00 €, identiques à l'appli.
- 22:15Z — Correctif 2 (HIGH, textes de l'écran Moteurs écrits dans la fonction) : `supabase/functions/moteurs/index.ts` ne contient plus aucune phrase d'état ; `tester` rend { etat, code, params } (liste close : ok_peages, ok_itineraire, ok_stations, ok_moyennes, ok_berlin, ok_voitures, ok_lieux, aucune_moyenne, cle_manquante, cle_refusee, quota, reponse_illisible, injoignable, test_indisponible, fournisseur_inconnu, enregistre, cle_a_coller, pret_sans_cle ; params = nombres, dates, identifiants de fournisseur), `enregistrer` rend { enregistre, etat, code, params, notes:[{code, params}] }. Phrases composées par `T.etatMoteur` et `T.resultatEnregistrement` (`src/lib/textes.ts`), noms courts des fournisseurs pris dans la liste du moteur (`Moteurs.tsx`). Table `moteurs` : colonnes `code` + `params` (migration 20261021150000, appliquée par l'API de gestion), `message` abandonnée. `messageErreurPeages` (texte dans `_shared/peages.ts`) supprimée. Tests unitaires des phrases dans `m3-round4.test.ts`. Déployé : moteurs v8, front 2bfdff7 READY (c804f4c).
- 22:15Z — Correctif 8 (LOW, refus doublé) : le refus d'une clé candidate n'est plus répété ; notes = codes (cle_non_enregistree, actif_inchange, secours_cle_refusee, secours_sans_cle), jamais l'état principal. Phrase attendue : « Clé refusée par PTV (401) · clé non enregistrée, ancienne clé conservée · fournisseur actif inchangé » (test unitaire : « Clé refusée » apparaît une fois).
- 22:15Z — Correctif 7 (LOW, RO et GB) : `docs/pipeline/m3-decisions.md` T3.5 mis à jour (écrit à 22:16Z, juste après cette entrée) ; description du moteur « Prix » et nom du fournisseur « officiel » en base : … Roumanie, Royaume-Uni toutes les 6 h / « FR, ES, IT, PT, SI, HR, AT, DK, IS, RO, GB » (relu par SQL, fréquences relues dans cron.job : RO et GB 59 et 5 */6).
- 22:15Z — Correctif 9 (LOW, quota) : motif `quota_atteint` → « Péages non calculés : limite du jour atteinte » + « Le nombre de calculs de péages est limité chaque jour ; cette limite est atteinte… » (`textes.ts`, `Resultat.tsx:237,243`) ; « Le calcul des péages a échoué » reste pour une vraie panne (2bfdff7).
- 22:15Z — Correctif 3 (MEDIUM, S5 coupé à 390 px) : `.mots` et `.mot` en `grid-template-columns: minmax(0, 1fr)`, `.mot` `min-width: 0`, titre `flex-wrap`, pastille d'état sur plusieurs lignes (rayon 12 px au lieu d'une gélule : écart à la maquette noté en commentaire), `.d` `overflow-wrap: anywhere` (bbf4def). Mesure en direct à venir (entrée suivante).
- 22:16Z — Correctif 5 (LOW, énoncés faux) : ligne 3 (« Aucune clé fournisseur n'existe ») remplacée par l'état réel (vraies clés PTV et Stadia dans Vault depuis 19:42Z, pas de HERE) ; phrase « aucune capture identique » du Round 2 corrigée en place (renvoi vers « Captures aux octets identiques »).
- 22:24Z — Correctif 3, mesure en direct (22:18Z, Chromium sur la prod, administrateur éphémère supprimé en finally, relu 0) : à 390 px scrollWidth 390, 6 cartes de 16 à 374 px, pastilles d'état terminées à 361 px, aucune coupée ; à 360 px scrollWidth 360, cartes 16–344 px, aucun élément de S5 au-delà de la largeur.
- 22:24Z — Correctif 4 (MEDIUM, US-5.3 coller par l'interface) : `run-m3.mjs` et l'extrait `US-5.3.test.ts` lisent la vraie clé PTV en mémoire (moteur_cle), la mettent dans le presse-papiers du navigateur, Ctrl+V dans le champ, Enregistrer. Comparaisons booléennes seulement (valeur collée = clé lue ; Vault relu = même valeur ; `updated_at` postérieur) : la valeur n'est écrite dans aucun fichier, log, capture ni message d'échec ; presse-papiers vidé après le collage. Run 22:21Z : « Enregistré · utilisé dès le prochain calcul », champ vide, « Clé enregistrée ••••NDE0 — coller pour remplacer », `cle_ptv` réécrite à 22:21:09 UTC, chiffrée. La clé factice (hors capture) : « Clé refusée par PTV (401) · clé non enregistrée, ancienne clé conservée · fournisseur actif inchangé », clés rangées inchangées.
- 22:24Z — Captures : run complet `run-m3.mjs` sur la prod (22:16–22:22Z, sous `lourd`), 56/56, 0 ligne ✗, 0 avertissement ; vérification finale : péages ptv ok 29,00 €, itinéraire stadia, 0 administrateur éphémère. Toutes les captures du jalon sont de vrais `screenshot` de ce run (aucun cp/mv), brutes sans étiquette. Par md5 avant/après (livraison) : 47 fichiers changés, 9 captures m3 aux octets identiques à celles du round 3 malgré la nouvelle prise (écran fixe inchangé : US-1.8-01, -03, -04, US-3.8-01, US-4.4-03, -04 (Castres, aucun péage), US-4.E4-E1-01, -02, US-PERF-001-01 (about:blank)). Groupes d'octets identiques à l'intérieur du run : inchangés (section « Captures aux octets identiques ») : livraison US-3.8-02 = US-4.4-01 ; brutes US-1.8-01 = -03, US-3.8-02 = US-4.4-01, US-5.3-03 = -04, US-5.6-01 = US-A11Y-004-02-m3.
- 22:24Z — Contrat API (fonctions modifiées) : FE: src/lib/moteurs.ts:43 `listerMoteurs` (Moteur.code, Moteur.params) → BE: supabase/functions/moteurs/index.ts:118 `lister` (code, params ; « cle_a_coller » si clé requise absente) — OK · FE: src/lib/moteurs.ts:48 `testerMoteur` ({etat} & CodeEtat) → BE: moteurs/index.ts:177 `json(200, t)` ({etat, code, params}) — OK · FE: src/lib/moteurs.ts:49 `enregistrerMoteur` ({enregistre, etat, code, params, notes, moteurs}) → BE: moteurs/index.ts:225, 232 — OK · FE: src/components/Resultat.tsx:237, 243 (`peages.motif === "quota_atteint"`) → BE: supabase/functions/estimer-trajet/index.ts:163 (motif « quota_atteint ») — OK · FE: src/lib/pays.ts:63 `Peages` {etat, motif?, fournisseur, lignes, total, vignettes} → BE: estimer-trajet/index.ts:327 `peages: { ...peages, vignettes }` (forme inchangée ; seul le calcul passe par le tracé) — OK. Vérifié en direct : pages S5 et S4 lues par Chromium sur la prod (captures ci-dessus).
- 22:37Z — Empreintes md5 (8 premiers caractères) des 56 captures du plan après le run de 22:16Z : US-1.8-01-stations-hors-de-france-avant.png liv=f7e5516b brute=c2694680 ; US-1.8-02-stations-hors-de-france-apres.png liv=9bdc9846 brute=9bdc9846 ; US-1.8-03-stations-hors-de-france-avant.png liv=84448c20 brute=c2694680 ; US-1.8-04-stations-hors-de-france-apres.png liv=36cc9b01 brute=36cc9b01 ; US-3.8-01-partir-l-tranger-avant.png liv=1fc73ffd brute=1fc73ffd ; US-3.8-02-partir-l-tranger-apres.png liv=b5edca97 brute=b5edca97 ; US-4.4-01-voir-les-pages-avant.png liv=b5edca97 brute=b5edca97 ; US-4.4-02-voir-les-pages-apres.png liv=717654bc brute=717654bc ; US-4.4-03-voir-les-pages-avant.png liv=a56f54eb brute=a56f54eb ; US-4.4-04-voir-les-pages-apres.png liv=6ed0b12a brute=6ed0b12a ; US-4.5-01-voir-les-pays-traverss-avant.png liv=76b8ff65 brute=76b8ff65 ; US-4.5-02-voir-les-pays-traverss-apres.png liv=e7b958b9 brute=e7b958b9 ; US-4.E4-E1-01-declencheur.png liv=e9fdc1b7 brute=e9fdc1b7 ; US-4.E4-E1-02-resultat.png liv=47ec1223 brute=47ec1223 ; US-4.E4-E1-03-retour.png liv=dcb9771e brute=dcb9771e ; US-4.E5-E1-01-declencheur.png liv=5e5f942b brute=5e5f942b ; US-4.E5-E1-02-resultat.png liv=df25f0d5 brute=df25f0d5 ; US-4.E5-E1-03-retour.png liv=96e4f961 brute=96e4f961 ; US-4.E6-E1-01-declencheur.png liv=56a0946a brute=56a0946a ; US-4.E6-E1-02-resultat.png liv=57d307c2 brute=57d307c2 ; US-4.E6-E1-03-retour.png liv=ff7157d4 brute=ff7157d4 ; US-5.1-01-ouvrir-les-moteurs-avant.png liv=2386096a brute=2386096a ; US-5.1-02-ouvrir-les-moteurs-apres.png liv=0c17ade5 brute=0c17ade5 ; US-5.2-01-choisir-le-fournisseur-avant.png liv=284df519 brute=284df519 ; US-5.2-02-choisir-le-fournisseur-apres.png liv=1531fb21 brute=1531fb21 ; US-5.3-01-coller-la-cl-avant.png liv=7b41dad2 brute=7b41dad2 ; US-5.3-02-coller-la-cl-apres.png liv=a283440e brute=a283440e ; US-5.3-03-coller-la-cl-avant.png liv=d35e706b brute=d35e706b ; US-5.3-04-coller-la-cl-apres.png liv=ef925538 brute=d35e706b ; US-5.4-01-tester-la-connexion-avant.png liv=7248bbe3 brute=7248bbe3 ; US-5.4-02-tester-la-connexion-apres.png liv=9c82947a brute=9c82947a ; US-5.5-01-enregistrer-le-moteur-avant.png liv=1a6913f7 brute=421dd738 ; US-5.5-02-enregistrer-le-moteur-apres.png liv=a745977b brute=a745977b ; US-5.6-01-ou-trouver-ma-cle-avant.png liv=928cfefe brute=928cfefe ; US-5.6-02-ou-trouver-ma-cle-apres.png liv=0c49813e brute=0c49813e ; US-5.6-03-lien-stadia.png liv=70ff73c7 brute=70ff73c7 ; US-5.6-04-sans-cle.png liv=304136fa brute=304136fa ; US-5.E1-E1-01-declencheur.png liv=69196ea2 brute=69196ea2 ; US-5.E1-E1-02-resultat.png liv=97ad40f8 brute=45534d60 ; US-5.E1-E1-03-retour.png liv=8750dc77 brute=257ee3e4 ; US-5.E2-E1-01-declencheur.png liv=c3a080d5 brute=27ab8622 ; US-5.E2-E1-02-resultat.png liv=dfe82953 brute=dfe82953 ; US-5.E2-E1-03-retour.png liv=f65c324b brute=f65c324b ; US-5.E3-E1-01-declencheur.png liv=5f2a54f1 brute=5f2a54f1 ; US-5.E3-E1-02-resultat.png liv=3589c877 brute=3589c877 ; US-5.E3-E1-03-retour.png liv=2c03f00c brute=2c03f00c ; US-A11Y-001-01-m3.png liv=6d08cca0 brute=3a1bbaa7 ; US-A11Y-001-02-m3.png liv=e3e54989 brute=8f525493 ; US-A11Y-002-01-m3.png liv=d6fbe57c brute=d6fbe57c ; US-A11Y-002-02-m3.png liv=53e42806 brute=53e42806 ; US-A11Y-003-01-m3.png liv=89de174f brute=89de174f ; US-A11Y-003-02-m3.png liv=db96c5bc brute=db96c5bc ; US-A11Y-004-01-m3.png liv=92d86ff9 brute=5494468b ; US-A11Y-004-02-m3.png liv=92cc7b02 brute=928cfefe ; US-PERF-001-01-m3.png liv=e6371102 brute=f95c356b ; US-PERF-001-02-m3.png liv=fa23218e brute=c95712ef ;
- 22:37Z — Playwright complet sur la prod (`npx playwright test`, m1 + m2 + extraits m3, sous `lourd`, 22:23–22:35Z, limite d'inscriptions anonymes à 300 pendant le passage) : 146 passés, 2 ignorés (US-5.5 et US-5.E3, BLOQUÉ-CLÉ HERE), 2 échecs : (1) M1 US-1.E4 « aucune rupture gazole réelle dans le rayon aujourd'hui : fixture nécessaire » (inchangé depuis le round 3, hors code) ; (2) M2 US-3.6 « voiture disparue » : l'écran montrait « Calcul impossible pour l'instant » sur Albi → Toulouse (réponse d'erreur d'itinéraire, cause non prouvée : les journaux Supabase n'ont pas pu être interrogés — l'API de journaux a changé de format). Rejoué seul juste après (`-g US-3.6 --repeat-each=2`) : 6/6 verts ; 3 appels directs Albi → Toulouse : 200, IGN, péages ptv 1,70 €. Aucun ancien test modifié ce round (le montant de péages n'est comparé par aucun test m1/m2).
- 22:37Z — État final relu (22:37Z) : limite d'inscriptions anonymes remise à 30 (relue par l'API) ; redirections Auth = la prod seule ; Vault (noms) = cle_ptv, cle_stadia, sync_prix_secret, 0 « FAUX- » ; fins NDE0 / 961b ; moteurs : péages = ptv sans secours (ok_peages), itinéraire = stadia + secours valhalla-public ; vrai estimer-trajet Albi → Barcelone : 200, péages ptv ok 29,00 €, itinéraire stadia ; 0 administrateur éphémère.

## Round 5

Bâtisseur round 5 (audit round 3 : 1 HIGH, 2 MEDIUM, LOW 4, 5, 6, 8, 9, 10). Une entrée par correctif, écrite au moment du correctif.

- 23:27Z — Doc PTV lue (correctif 1) : OpenAPI routing v1 et account v1 (`api.myptv.com/meta/services/{routing,account}/v1/openapi.json`) : 403 porte soit `GENERAL_FORBIDDEN` (droits), soit `GENERAL_QUOTA_EXCEEDED` (« The transaction limit is exceeded ») ; l'API Account (`getUsage`) définit chaque journée d'usage « de 00:00:00+00:00 à 23:59:59+00:00 (UTC) ». Article d'assistance PTV « How to use the Free subscription » (lu par Chromium) : plan gratuit « Transaction volume is capped », chiffre renvoyé vers la FAQ. Chiffres trouvés par la recherche : FAQ PTV « 100,000 transactions per month », guide de migration PTV « five hundred transactions per day » ; la réponse réelle de PTV dit « Daily Quota Exceeded » : il existe donc bien un plafond QUOTIDIEN. Non trouvé : l'heure exacte de remise à zéro (supposée 00:00 UTC, à constater ci-dessous) et le décompte d'une requête à 25 waypoints (`getUsage` aurait donné transactions et requêtes par jour, mais répond 403 `GENERAL_FORBIDDEN` « You do not have permission to access this app » : la clé n'est pas une clé maîtresse).
- 23:31Z — Correctif 1 (HIGH, quota PTV lu comme « clé refusée ») : `peages.ts` lit le corps de l'erreur (`erreurHttp(status, corps)`) : `GENERAL_QUOTA_EXCEEDED` → motif `quota_fournisseur` (la clé n'est pas déclarée refusée) ; 401/403 autres → `cle_refusee` ; 429 → `quota` (débit). `estimer-trajet` : marque le fournisseur (`fournisseurs.quota_epuise_jusqua` = 00:00 UTC suivant) et n'envoie plus aucun appel avant cette heure (si tout le monde est épuisé, ni appel ni créneau de quota consommé) ; secours essayé s'il existe (bascule) ; réponse `peages:{etat:"indisponible", motif:"quota_fournisseur", fournisseur, jusqua}`. Fonction `moteurs` : « Tester » → `{etat:"wait", code:"quota_fournisseur", params:{fournisseur, jusqua}}` ; `lister` rend ce même état tant que le fournisseur actif est marqué ; une clé reconnue malgré le quota est rangée (elle est valide). Textes (`textes.ts`) : « PTV : quota du jour atteint — péages indisponibles jusqu'à <heure> » (S4 et pastille S5), incident « quota du jour atteint ». Plafond global en table (`fournisseurs.plafond_jour` : PTV 250, HERE 80 ; compteur `quota_peages` passé en journée UTC, celle du fournisseur). Cache (`cache_peages`) : clé = fournisseur + départ + arrivée + points de passage arrondis à 1e-3 ; réutilisé 7 jours, sans appel ni créneau. Migration `20261021160000_m3_round5.sql` appliquée (API de gestion, relue : ptv 250, here 80). Déployé : estimer-trajet, moteurs ; front 2e1cd69 READY.
- 23:31Z — Preuve en direct (sonde `m3-sonde-peages.mjs`, session anonyme neuve) : Albi → Barcelone ×2 : 200, itinéraire stadia, `peages = {etat: indisponible, motif: quota_fournisseur, fournisseur: ptv, jusqua: 2026-10-21T00:00:00.000Z}` ; table : `ptv.quota_epuise_jusqua` = 00:00 UTC, incident « ptv : quota_fournisseur (403) » noté UNE fois (23:31:26, le 2e calcul n'a appelé personne), compteur global du jour +1 seulement.
- 23:32Z — Défaut trouvé à la capture et corrigé : « Tester » pendant le quota recalculait l'heure à +30 min (02:02) parce que la marque en cours était prise pour une marque échue ; `noterQuotaFournisseur` ne réessaie à +30 min que si la remise à zéro attendue est PASSÉE de moins d'une heure. Redéployé (estimer-trajet, moteurs).
- 23:33Z — Captures réelles sur la prod, PTV en dépassement de quota (`run-m3-r5-quota.mjs`, vrais `screenshot`, brute et livraison sans étiquette) : `US-4.E4-E2-01-quota-ptv.png` (S4 Albi → Barcelone : « PTV : quota du jour atteint — péages indisponibles jusqu'à 02:00 », coût 62,27 € = carburant seul, aucun total de péages) ; `US-5.E2-E2-01-quota-ptv.png` (S5, administrateur éphémère, « Tester la connexion » sur PTV : réponse `{etat:"wait", code:"quota_fournisseur", params:{fournisseur:"ptv", jusqua:"2026-10-21T00:00:00.000Z"}}`, pastille « PTV : quota du jour atteint — péages indisponibles jusqu'à 02:00 », aucun « refusée », incident « PTV : quota du jour atteint (403) »). Administrateurs éphémères restants : 0. md5 : liv = brute pour chacune (d69c233e…, 509a2c9b…).
- 23:35Z — Correctif 2 (MEDIUM, clé imprimable par un test en échec) : `US-5.3.test.ts` compare par `includes(...)` → booléen, avec un message qui ne nomme que le fournisseur (« clé ptv présente dans la page ») ; plus aucun `not.toContain(cle)`. Recherche du même risque : `grep` des `expect(` portant une clé dans `tests/e2e/m1-explore.spec.ts`, `m2-explore.spec.ts`, `run-m3.mjs`, `m3-aides.mjs`, `m3-global.mjs` et les 21 extraits m3 : `run-m3.mjs:621-632` compare déjà en booléens ; ailleurs seules la fin publique (`slice(-4)`, `endsWith(fin)`) et des égalités booléennes (`=== reel.cles.ptv`) circulent ; les erreurs de `m3-aides.mjs` ne portent que des codes HTTP. Aucun autre cas.
- 23:35Z — Correctif 3 (MEDIUM, libellés composés par le serveur) : `_shared/peages.ts` ne compose plus « Péage » ni « (estimation : maximum de la fourchette) » : une section sans nom rend `libelle: ""`, une fourchette HERE rend `fourchette: true` ; `Resultat.tsx` affiche `T.peageSansNom` / `T.peageFourchette` (`textes.ts`). Le seul texte restant est le nom du réseau et de la section, donnée du fournisseur jointe par « · ». Test unitaire `m3-round5.test.ts` ; `m3-round2.test.ts` (fourchette) vérifie le drapeau au lieu du texte.
- 23:35Z — Correctif 4 (LOW, texte d'aide coupé à 390/360 px) : « Clé ••••NDE0 · coller pour changer » au lieu de « Clé enregistrée ••••NDE0 — coller pour remplacer » ; lisible en entier sur `US-5.E2-E2-01-quota-ptv.png` (390 px). Mesure versionnée à 360 et 390 px : correctif 5.
- 23:35Z — Correctif 5 (LOW, assertions versionnées) : `US-5.1.test.ts` — à 390 et 360 px : `scrollWidth` ≤ largeur, aucun élément de S5 hors écran (hors `sr-only`), aucune pastille coupée, texte d'aide de chaque champ clé mesuré dans sa police (canvas `measureText`) ≤ place disponible. `US-4.4.test.ts` — stabilité ×2 : deux `estimer-trajet` Albi → Barcelone, mêmes lignes et même total, le second `cache: true` (aucun appel PTV). Le recalcul indépendant (appel direct à PTV) est regroupé en UN test (Barcelone + Milan) : c'est le seul test qui appelle PTV en direct.
- 23:35Z — Correctif 6 (LOW, énoncés périmés) : l.129 et l.135 (« Valhalla, instance publique » → Stadia Maps + secours Valhalla public) et la ligne « Vérification finale … sans aucune clé » corrigées ici ET dans `run-m3.mjs` (lignes 218, 220, 1176), qui les écrivait.
- 23:35Z — Correctif 8 (LOW, « 1 sections ») : `T.etatMoteur` accorde « section(s) » et « péage(s) » (test unitaire).
- 23:35Z — Correctif 9 (LOW, incidents périmés sur S5) : colonne `moteurs.retabli_le`, posée quand le fournisseur actif répond de nouveau (calcul sans bascule, « Tester » réussi avec la clé rangée, « Enregistrer » réussi) ; `lister` rend `incident.resolu` / `bascule.resolu` ; S5 affiche « Incident résolu · … » / « Bascule … · <fournisseur> rétabli depuis ». Constaté sur la prod (23:33Z, `US-5.E2-E2-01-quota-ptv.png`) : carte Itinéraire « Incident résolu · Stadia : service injoignable 400 · 20/10 21:42 » ; l'incident PTV du quota, lui, reste « Dernier incident » (pas encore résolu).
- 23:35Z — Correctif 10 (LOW, pastille = phrase du champ) : au choix d'un fournisseur, la pastille montre l'état du moteur si c'est l'actif, « Clé enregistrée · à tester » si sa clé est rangée, « Clé à coller » sinon ; plus jamais le texte d'aide du champ.
- 23:35Z — Contrat API (appels front ↔ fonctions modifiés au round 5) :
  • FE: src/components/Resultat.tsx:237,243 (`peages.motif === "quota_fournisseur"`, `peages.fournisseur`, `peages.jusqua`) → BE: supabase/functions/estimer-trajet/index.ts:183,222 (`{etat:"indisponible", motif:"quota_fournisseur", fournisseur, jusqua}`) — OK (constaté en direct : réponse lue par `run-m3-r5-quota.mjs`, 23:33Z).
  • FE: src/components/Resultat.tsx:229 (`l.libelle || T.peageSansNom`, `l.fourchette`) → BE: supabase/functions/_shared/peages.ts:15-19 (`LignePeage {pays, libelle, montant, fourchette?}`) — OK.
  • FE: src/lib/pays.ts:58-71 (`LignePeage`, `Peages` + `jusqua?`, `cache?`) → BE: estimer-trajet/index.ts:141-149 (`ResPeages`) et :366 (`peages: { ...peages, vignettes }`) — OK.
  • FE: src/lib/moteurs.ts:48 `testerMoteur` + src/lib/textes.ts:231-232 (code `quota_fournisseur`, params `fournisseur`, `jusqua`) → BE: supabase/functions/moteurs/index.ts:115 (`enAttente("quota_fournisseur", {fournisseur, jusqua})`) — OK (réponse en direct 23:33Z : `{"etat":"wait","code":"quota_fournisseur","params":{"fournisseur":"ptv","jusqua":"2026-10-21T00:00:00.000Z"}}`).
  • FE: src/lib/moteurs.ts:43 `listerMoteurs` (Moteur.code/params, `incident.resolu`, `bascule.resolu`) + src/routes/Moteurs.tsx (data-resolu) → BE: moteurs/index.ts:145-150 (état `quota_fournisseur` tant que le fournisseur actif est marqué) et :163-164 (`resolu`) — OK (S5 à l'ouverture, 23:33Z : pastille quota, « Incident résolu · Stadia … »).
  • FE: src/lib/moteurs.ts:49 `enregistrerMoteur` → BE: moteurs/index.ts (forme de réponse inchangée ; une clé reconnue malgré le quota est rangée) — OK.
- 23:56Z — Playwright M1 sur la prod (23:36–23:38Z, limite d'inscriptions anonymes à 300) : 24 passés, 1 échec connu (US-1.E4, « aucune rupture gazole réelle dans le rayon aujourd'hui : fixture nécessaire »). M2 (23:39–23:47Z, PTV en quota) : 57 passés, 4 échecs (US-3.5 Albi → Toulouse, US-3.6 rejouer, US-4.2 ×2), reproduits seuls. Cause instrumentée (`DEBUG=pw:api`) : l'aide `carburantSeul` fait `innerText()` sur `repartition-cout`, bloc absent quand les péages sont indisponibles → attente de 55 s jusqu'au délai du test ; l'écran, lui, était juste (instantané : tronçons et « PTV : quota du jour atteint … » affichés). Ce n'est pas une régression de l'appli : l'état « péages indisponibles » n'avait jamais été traversé par M2. Aide corrigée (`count()` avant lecture), commit séparé `test(m2)` d94c090 ; les 4 rejoués : 4/4 verts.
- 00:01Z — Remise à zéro du quota PTV CONSTATÉE à 00:00 UTC : sonde à 00:00:41Z, Albi → Barcelone 200, stadia, **péages ptv ok 29,00 €, 2 sections** (`quota_epuise_jusqua` remis à null, `moteurs.retabli_le` = 00:00:40Z : l'incident du quota passe « résolu ») ; 2e appel à 00:00:49Z : 29,00 €, 2 sections, `cache: true`, 1,1 s au lieu de 6,0 s (aucun appel PTV). Compteur de l'appli : la ligne du 21/10 avait été remplie en journée de Paris (160 appels comptés entre 22:00Z et 23:59Z le 20/10) ; remise au décompte UTC réel (1 appel global, 0 par identité) par SQL, une fois, au passage à la journée UTC.

## US-3.8 — Partir à l'étranger

### Happy Path
- ✓ `US-3.8-01-partir-l-tranger-avant.png` — champ arrivée : « Barce » propose Barcelone, Espagne — Photon propose « Barcelone — Catalogne, Espagne » à la suite des communes françaises (IGN)
- ✓ `US-3.8-02-partir-l-tranger-apres.png` — le calcul aboutit : itinéraire France puis Espagne — itinéraire 468 km traversant FR puis ES (moteur Itinéraire : Stadia Maps, secours Valhalla public) ; coût 91,27 € — même écran que US-4.4-01-voir-les-pages-avant.png : deux étapes du plan montrent légitimement le même état, aucune différence fabriquée

### Edge Case
- (rien à signaler)

### Issues Found
- Dépendance : propositions étrangères = Photon (komoot) via la fonction `lieux` ; itinéraire = Stadia Maps (Valhalla hébergé, vraie clé dans Vault), secours Valhalla FOSSGIS (instance publique, sans clé, ≤ 1 requête/s — politique d'usage lue le 20/10 : faible trafic, User-Agent identifiant, attribution OSM).

## US-4.4 — Voir les péages

### Happy Path
- ✓ `US-4.4-01-voir-les-pages-avant.png` — trajet Albi → Barcelone calculé (écran Résultat) — résultat Albi → Barcelone 91,27 € — même écran que US-3.8-02-partir-l-tranger-apres.png : deux étapes du plan montrent légitimement le même état, aucune différence fabriquée
- ✓ `US-4.4-02-voir-les-pages-apres.png` — détail des péages : chaque section en euros TTC (« gratuit » si 0), total ajouté au coût — 2 sections : FR 1,70 €, FR 27,30 € ; total 29,00 € ; Carburant 62,27 € · Péages 29,00 € ; recalcul indépendant SUR LE TRACÉ (Stadia direct 471 km, échantillonné à part, puis PTV direct + TVA du pays) : 29,00 € sur 2 sections = total affiché
- ✓ montants réels PTV Developer (clé réelle d'Anthony dans Vault, prix HT + TVA du pays) — US-4.4 n'est plus BLOQUÉ-CLÉ.
- ✓ `US-4.4-03-voir-les-pages-avant.png` — trajet sans autoroute payante (écran Résultat) — résultat Albi → Castres 48 km, 6,82 €
- ✓ `US-4.4-04-voir-les-pages-apres.png` — détail des péages : « Aucun péage sur cet itinéraire » et 0,00 € — « Aucun péage sur cet itinéraire » 0,00 € ; Carburant 6,82 € · Péages 0,00 € ; coût total inchangé

### Edge Case
- (rien à signaler)

### Issues Found
- aucune sur la version déployée à cette passe.

## US-4.5 — Voir les pays traversés

### Happy Path
- ✓ `US-4.5-01-voir-les-pays-traverss-avant.png` — trajet Albi → Milan calculé (écran Résultat) — résultat Albi → Milan 861 km
- ✓ `US-4.5-02-voir-les-pays-traverss-apres.png` — pays traversés : km, litres, prix moyen du jour, coût ; somme = coût carburant — FR 2,159 €/L (flux du jour), IT 2,021 €/L (Bulletin UE) ; Σ coûts pays = 137,16 € = coût carburant affiché 137,16 € (le coût total y ajoute les péages)

### Edge Case
- (rien à signaler)

### Issues Found
- aucune sur la version déployée à cette passe.

## US-4.E4 — Péages indisponibles

### Happy Path
- (rien à signaler)

### Edge Case
- ✓ `US-4.E4-E1-01-declencheur.png` — le service de péages est en erreur : écran Résultat, bloc Péages — écran Résultat Albi → Bordeaux (autoroute A62) : péages confiés à HERE, qui n'a aucune clé = service réellement en erreur ; le détail dit « Péages non disponibles pour l'instant », aucun total de péages (PTV et sa vraie clé ne sont pas touchés)
- ✓ `US-4.E4-E1-02-resultat.png` — le coût carburant s'affiche et rien n'est ajouté au total — coût affiché 40,76 € = carburant seul (18,9 L × 2,159 €/L) ; rien n'est ajouté au total pour les péages
- ✓ `US-4.E4-E1-03-retour.png` — retour à l'état normal : le même trajet rejoué, péages rétablis — retour à l'état normal sur LE MÊME trajet (Albi → Bordeaux rejoué depuis l'historique) : péages PTV à nouveau calculés, total 24,60 €

### Issues Found
- aucune sur la version déployée à cette passe.

## US-4.E5 — Vignette sur le trajet

### Happy Path
- (rien à signaler)

### Edge Case
- ✓ `US-4.E5-E1-01-declencheur.png` — un trajet qui traverse la Suisse — arrivée Lausanne (Suisse) choisie ; plan : Albi → Milan via Genève — le moteur ne prend pas d'étape intermédiaire, la destination est donc fixée en Suisse pour traverser réellement le pays
- ✓ `US-4.E5-E1-02-resultat.png` — le détail des péages porte la ligne « Vignette suisse obligatoire (non comptée) » — ligne « Vignette suisse obligatoire (non comptée) » ; pays traversés FR, CH
- ✓ `US-4.E5-E1-03-retour.png` — retour à l'état normal — retour au formulaire ; le trajet Albi → Lausanne est en tête de l'historique

### Issues Found
- aucune sur la version déployée à cette passe.

## US-4.E6 — Pays sans prix moyen

### Happy Path
- (rien à signaler)

### Edge Case
- ✓ `US-4.E6-E1-01-declencheur.png` — un pays traversé absent des moyennes (Serbie) — Albi → Belgrade (Serbie, absente du Bulletin pétrolier UE) : trajet de 1 960 km, tracé découpé en morceaux de ≤ 800 km pour Valhalla
- ✓ `US-4.E6-E1-02-resultat.png` — la ligne Serbie porte « prix non publié — moyenne européenne appliquée » et le prix utilisé — RS : « prix non publié — moyenne européenne appliquée » à 2,010 €/L (moyenne UE du bulletin) ; 1870 km ; pays FR, IT, SI, HR, RS ; Σ coûts = coût
- ✓ `US-4.E6-E1-03-retour.png` — retour à l'état normal — retour au formulaire ; le trajet Albi → Belgrade est en tête de l'historique
- ✓ (hors capture) Albi → Rome : 1252 km, pays FR, IT — avant le correctif, « Trajet trop long » à tort.
- ✓ (hors capture) Albi → Lisbonne : 1347 km, pays FR, ES, PT — avant le correctif, « Trajet trop long » à tort.

### Issues Found
- aucune sur la version déployée à cette passe.

## US-1.8 — Stations hors de France

### Happy Path
- ✓ `US-1.8-01-stations-hors-de-france-avant.png` — ma position à Barcelone (avant d'ouvrir Prix) — visiteur géolocalisé à Barcelone (41,387 N ; 2,169 E), onglet Trajets ouvert — même écran que US-1.8-03-stations-hors-de-france-avant.png : deux étapes du plan montrent légitimement le même état, aucune différence fabriquée
- ✓ `US-1.8-02-stations-hors-de-france-apres.png` — la carte et la liste affichent les stations espagnoles avec leurs prix officiels — 153 stations espagnoles (liste et 153 pastilles) ; ES-16152 « Plenergy Hospitalet de llobregat (l') · Plenergy » 1,67 € = prix officiel MITECO 1,669 € ; écart affiché « −22,0 c vs Espagne »
- ✓ `US-1.8-03-stations-hors-de-france-avant.png` — ma position dans un pays qui ne publie pas ses prix (Belgique) — visiteur géolocalisé à Bruxelles (50,850 N ; 4,352 E) — la Belgique ne publie pas de flux station par station — même écran que US-1.8-01-stations-hors-de-france-avant.png : deux étapes du plan montrent légitimement le même état, aucune différence fabriquée
- ✓ `US-1.8-04-stations-hors-de-france-apres.png` — message « Ce pays ne publie pas les prix station par station » et prix moyen national — message + « Prix moyen national · Belgique · SP95-E10 : 1,977 €/L » (Bulletin pétrolier UE : BE 1,977 €/L)
- ✓ (vue complémentaire m3-captures-pays/US-1.8-rome.png) à Rome : 295 stations « IT-… » en liste (Gazole), premier prix 1,599 euros le litre, aucun message « pays sans flux ».
- ✓ (vue complémentaire m3-captures-pays/US-1.8-lisbonne.png) à Lisbonne : 115 stations « PT-… » en liste (Gazole), premier prix 2,069 euros le litre, aucun message « pays sans flux ».
- ✓ (vue complémentaire m3-captures-pays/US-1.8-vienne.png) à Vienne : 11 stations « AT-… » en liste (Gazole), premier prix 2,107 euros le litre, aucun message « pays sans flux ».
- ✓ (vue complémentaire m3-captures-pays/US-1.8-ljubljana.png) à Ljubljana : 42 stations « SI-… » en liste (Gazole), premier prix 1,903 euros le litre, aucun message « pays sans flux ».
- ✓ (vue complémentaire m3-captures-pays/US-1.8-zagreb.png) à Zagreb : 87 stations « HR-… » en liste (Gazole), premier prix 1,360 euros le litre, aucun message « pays sans flux ».

### Edge Case
- ✓ (vue complémentaire m3-captures-pays/US-1.8-berlin-non-branche.png) Berlin (Allemagne : flux Tankerkönig à clé, pas encore branché) : « Prix station par station pas encore disponibles pour ce pays » + prix moyen national ; la phrase de la spec est réservée aux pays qui ne publient pas (Bruxelles).

### Issues Found
- Dépendance : stations synchronisées par pg_cron — ES (flux MITECO via le relais Vercel `api/relais-es` : TLS 1.2 à échange RSA statique refusé par Deno), IT (Osservaprezzi, ~50 villes × 30 km), PT (DGEG), SI (goriva.si), HR (mzoe-gor.hr, lat/long inversés remis à l'endroit), AT (E-Control : les 10 moins chères par requête, 20 points × 2 carburants), DK (API OK, une seule enseigne), IS (gasvaktin, cours ISK du jour). Non branchés : DE (clé Tankerkönig), RO (certificat TLS invalide), GB (CSV à URL signée).

## US-5.1 — Ouvrir les moteurs

### Happy Path
- ✓ `US-5.1-01-ouvrir-les-moteurs-avant.png` — connecté comme administrateur : le bouton ⚙ est affiché — connecté par lien magique (m3-admin-eph-1792541317101@example.org, app_metadata.role = admin) ; bouton ⚙ visible dans l'en-tête
- ✓ `US-5.1-02-ouvrir-les-moteurs-apres.png` — l'écran Moteurs liste les 6 services avec leur fournisseur et leur état (fenêtre haute 390×2300) — 6 services : PRIX DES STATIONS (PRÊT · SANS CLÉ) ; PRIX MOYENS PAR PAYS (PRÊT · SANS CLÉ) ; ITINÉRAIRE (ENREGISTRÉ · UTILISÉ DÈS LE PROCHAIN CALCUL) ; PÉAGES (ENREGISTRÉ · UTILISÉ DÈS LE PROCHAIN CALCUL) ; VOITURES (PRÊT · SANS CLÉ) ; RECHERCHE DE LIEUX (PRÊT · SANS CLÉ)

### Edge Case
- (rien à signaler)

### Issues Found
- aucune sur la version déployée à cette passe.

## US-5.2 — Choisir le fournisseur

### Happy Path
- ✓ `US-5.2-01-choisir-le-fournisseur-avant.png` — l'écran Moteurs, carte Péages — péages : fournisseur PTV Developer, clé enregistrée, état « ok »
- ✓ `US-5.2-02-choisir-le-fournisseur-apres.png` — HERE choisi pour les péages : l'état passe à « Clé à coller » — HERE demande une clé → « Clé à coller » ; IGN (sans clé) pour l'itinéraire → « Prêt · sans clé » (vérifié aussi)

### Edge Case
- (rien à signaler)

### Issues Found
- aucune sur la version déployée à cette passe.

## US-5.3 — Coller la clé

### Happy Path
- ✓ `US-5.3-01-coller-la-cl-avant.png` — le champ clé des péages (clé réelle déjà enregistrée) — champ clé des péages (type password) : « Clé ••••NDE0 · coller pour changer » — la vraie clé PTV d'Anthony est déjà rangée, seule sa fin s'affiche
- ✓ `US-5.3-02-coller-la-cl-apres.png` — je colle la clé et j'enregistre : stockée chiffrée, le champ n'affiche plus que ses 4 derniers caractères — vraie clé PTV collée (presse-papiers + Ctrl+V, valeur lue en mémoire depuis Vault) puis Enregistrer : testée par le vrai PTV, rangée chiffrée dans Vault (cle_ptv réécrite à 00:11:06 UTC, même valeur) ; champ vide, « Clé ••••NDE0 · coller pour changer »
- ✓ `US-5.3-03-coller-la-cl-avant.png` — une clé enregistrée : le champ n'affiche que ses 4 derniers caractères — clé PTV rangée dans Supabase Vault (secret chiffré en base, 174 car.), fin « NDE0 » ; champ : « Clé ••••NDE0 · coller pour changer »
- ✓ `US-5.3-04-coller-la-cl-apres.png` — après rechargement, la clé complète n'apparaît nulle part (page, réseau) — 1 réponses réseau (dont 1 de la fonction moteurs) lues : aucune clé complète (réelle ou factice), seule la fin de 4 caractères ; page, champs et stockage du navigateur : absentes — même écran que US-5.3-03-coller-la-cl-avant.png : deux étapes du plan montrent légitimement le même état, aucune différence fabriquée

### Edge Case
- (rien à signaler)

### Issues Found
- aucune sur la version déployée à cette passe.

## US-5.4 — Tester la connexion

### Happy Path
- ✓ `US-5.4-01-tester-la-connexion-avant.png` — une clé PTV valide est enregistrée — clé PTV valide enregistrée (celle d'Anthony), avant le test
- ✓ `US-5.4-02-tester-la-connexion-apres.png` — Tester la connexion : un vrai calcul part vers PTV et l'état affiche « Connecté » — vrai calcul de test Albi → Barcelone envoyé à PTV avec la vraie clé : « CONNECTÉ · TEST ALBI → BARCELONE OK (1 SECTION) »
- ✓ (hors plan) itinéraire : « CONNECTÉ · TEST ALBI → TOULOUSE OK (78 KM) » (Stadia Maps, clé réelle d'Anthony).
- ✓ US-5.4 n'est plus BLOQUÉ-CLÉ : la clé PTV réelle est dans Vault, « Connecté » est obtenu en vrai.

### Edge Case
- (rien à signaler)

### Issues Found
- aucune sur la version déployée à cette passe.

## US-5.5 — Enregistrer le moteur

### Happy Path
- ✓ `US-5.5-01-enregistrer-le-moteur-avant.png` — le moteur péages basculé sur HERE (non enregistrable sans clé) — péages basculé sur HERE dans l'écran (aucune clé HERE n'existe : enregistrement impossible)
- ✓ `US-5.5-02-enregistrer-le-moteur-apres.png` — Albi → Barcelone après la tentative (HERE refusé, PTV reste actif) — BLOQUÉ-CLÉ (HERE) : aucune clé HERE → impossible d'enregistrer HERE puis de voir des péages HERE ; état réel : HERE refusé sans clé, le moteur actif reste PTV et ses péages (clé réelle) s'affichent

### Edge Case
- (rien à signaler)

### Issues Found
- BLOQUÉ-CLÉ : US-5.5 (péages venant de HERE sans redéploiement) : il manque une clé HERE (plan Base, carte bancaire) collée dans l'écran Moteurs. La lecture du moteur actif à chaque appel est démontrée en vrai sur un autre moteur (itinéraire IGN ↔ Valhalla dans les extraits) ; la bascule vers HERE n'a pas pu être vue avec de vrais montants HERE.

## US-5.E1 — Moteurs invisibles aux visiteurs

### Happy Path
- (rien à signaler)

### Edge Case
- ✓ `US-5.E1-E1-01-declencheur.png` — un appareil non administrateur — appareil non administrateur : session anonyme de4b3214…, aucun claim admin
- ✓ `US-5.E1-E1-02-resultat.png` — l'appli s'ouvre : pas de bouton ⚙, /moteurs redirige — le bouton ⚙ n'est pas affiché ; l'adresse /moteurs renvoie à l'écran Prix (S5 absent)
- ✓ `US-5.E1-E1-03-retour.png` — lecture et écriture de la table moteurs refusées par le serveur ; l'appli reste normale — refus par le serveur (pas seulement le bouton caché) : lecture_moteurs 0 ligne(s) visible(s) / 6 en base ; insertion 403 ; modification 200 (0 ligne modifiée) ; suppression 200 (0 ligne supprimée) ; cles_fournisseurs 403 ; rpc_moteur_cle 403 ; fonction_moteurs 403 ; fonction_sans_session 401 ; la ligne péages est intacte (actif = ptv)

### Issues Found
- aucune sur la version déployée à cette passe.

## US-5.E2 — Clé refusée

### Happy Path
- (rien à signaler)

### Edge Case
- ✓ `US-5.E2-E1-01-declencheur.png` — une clé invalide collée — clé volontairement invalide collée dans le champ des péages (PTV, masquée) ; la vraie clé enregistrée n'est pas touchée par un test
- ✓ `US-5.E2-E1-02-resultat.png` — Tester la connexion : « Clé refusée par PTV (401) » — vrai appel à api.myptv.com avec la clé candidate → HTTP 401 → « Clé refusée par PTV (401) » (état ko) ; la clé réelle rangée est intacte
- ✓ `US-5.E2-E1-03-retour.png` — Enregistrer garde l'ancien fournisseur actif (PTV) : message de refus à l'écran — HERE + clé invalide + Enregistrer : refusé par le vrai HERE (401), message affiché « CLÉ REFUSÉE PAR HERE (401) · CLÉ NON ENREGISTRÉE, ANCIENNE CLÉ CONSERVÉE · FOURNISSEUR ACTIF INCHANGÉ », le fournisseur actif reste PTV (base : actif = ptv ; clés rangées inchangées)
- ✓ (hors capture) après rechargement : fournisseur actif des péages = PTV, clés rangées inchangées.

### Issues Found
- aucune sur la version déployée à cette passe.

## US-5.E3 — Bascule de secours

### Happy Path
- (rien à signaler)

### Edge Case
- ✓ `US-5.E3-E1-01-declencheur.png` — le moteur principal est en panne (HERE refuse sa clé) et PTV est enregistré en secours — péages : HERE principal (clé factice : le vrai HERE répond 401 = principal en panne), PTV (clé réelle) en secours — la panne du principal est réelle, pas simulée ; le plan suppose l'inverse (PTV → HERE), impossible sans clé HERE valide
- ✓ `US-5.E3-E1-02-resultat.png` — je calcule un trajet : le principal refuse, le secours fournit les péages — calcul réel : HERE répond 401, la fonction bascule sur PTV : les péages s'affichent (total 24,60 €) sans « Péages non disponibles »
- ✓ `US-5.E3-E1-03-retour.png` — l'écran Moteurs note la bascule avec l'heure — l'écran Moteurs note la bascule avec l'heure : « Bascule HERE → PTV Developer le 21/10 02:11 » et l'incident : « Dernier incident · HERE : clé refusée (401) · 21/10 02:11 »

### Issues Found
- BLOQUÉ-CLÉ : US-5.E3 sous sa forme du plan (péages venant de HERE quand PTV tombe) : il manque une clé HERE valide. La bascule d'un principal en panne vers un secours qui répond est vue en vrai (HERE refusé → PTV), avec la note horodatée.

## US-5.6 — Où trouver ma clé

### Happy Path
- ✓ `US-5.6-01-ou-trouver-ma-cle-avant.png` — l'écran Moteurs avant de regarder la fiche Péages — écran Moteurs, connecté administrateur
- ✓ (hors capture) le lien PTV s'ouvre dans un nouvel onglet : https://developer.myptv.com/en (titre « Location Service APIs to solve vehicle routing problems | PTV Logistics | PTV Logistics »).
- ✓ `US-5.6-02-ou-trouver-ma-cle-apres.png` — le lien « Où trouver ma clé » sous le champ clé de PTV, avec la consigne « API Keys » — fiche Péages (PTV) : « Où trouver ma clé » href=https://developer.myptv.com/en target=_blank rel=noopener noreferrer ; consigne « Connecte-toi, puis ouvre le menu « API Keys » pour créer ou copier ta clé. » (lues en table fournisseurs)
- ✓ `US-5.6-03-lien-stadia.png` — l'itinéraire basculé sur Stadia : le lien pointe vers le tableau de bord Stadia — Itinéraire basculé sur Stadia (non enregistré) : href=https://client.stadiamaps.com/dashboard/ target=_blank rel=noopener noreferrer
- ✓ (hors capture) HERE → https://platform.here.com/access/apps ; Tankerkönig (stations, Allemagne) → https://creativecommons.tankerkoenig.de/.
- ✓ `US-5.6-04-sans-cle.png` — une fiche sans clé : aucun lien — fiche Voitures (ADEME, sans clé) : « Aucune clé nécessaire. », aucun lien de clé (Prix moyens et Recherche de lieux : idem)

### Edge Case
- (rien à signaler)

### Issues Found
- aucune sur la version déployée à cette passe.

## US-A11Y-001 — Navigation au clavier (jalon 3 : S1, S3, S4, S5)

### Happy Path
- ✓ `US-A11Y-001-01-m3.png` — Tab : ordre de lecture et contour visible sur S3 Trajets — S3 Trajets : 24 contrôles parcourus (Départ → Inverser les deux lieux → Arrivée → Marque → Modèle → Motorisation → Calculer le coût → Recalculer le trajet Albi → Bordeaux au prix du jour → Supprimer le trajet Albi → Bordeaux → Recalculer le trajet Albi → Barcelone au prix du jour → Supprimer le trajet Albi → Barcelone → Recalculer le trajet Albi → Lisbonne au prix du jour → Supprimer le trajet Albi → Lisbonne → Recalculer le trajet Albi → Rome au prix du jour…), tous avec contour visible, dans l'ordre de lecture (départ, arrivée, voiture, calcul)
- ✓ (hors capture) S4 Résultat : 6 contrôles (Retour aux trajets → Mettre mon prix → Route, 30,0 km, 1,8 litres → Ville, 16,8 km, 1,3 litres → Montée, 0,9 km, 0,1 litres → Trajets…), contour visible partout, tronçons atteints dans l'ordre.
- ✓ (hors capture) S1 Prix : 25 contrôles (Gazole → SP95-E10 → SP95 → SP98 → E85 → GPLc → Carte des stations → Esso Express Albi, 2,191 euros le litre, plus cher → Carrefour Albi, 2,182 euros le litre, plus cher → TotalEnergies Albi · Relais des Fontanelles, 1,990 euros le litre, moins cher → Intermarché Le Sequestre, 2,182 euros le litre, plus cher → Leclerc Lescure-d'Albigeois, 2,182 euros le litre, plus cher → Leclerc Albi, 2,182 euros le litre, plus cher → Afficher ou masquer les crédits…), contour visible partout.
- ✓ `US-A11Y-001-02-m3.png` — Tab : ordre de lecture et contour visible sur S5 Moteurs — S5 Moteurs : 29 contrôles (Moteurs (administration) → ← Retour → Fournisseur · Prix des stations → Secours · Prix des stations → Tester la connexion → Enregistrer → Fournisseur · Prix moyens par pays → Tester la connexion → Enregistrer → Fournisseur · Itinéraire → Secours · Itinéraire → Clé Stadia Maps · Valhalla hébergé…), tous avec contour visible, dans l'ordre de lecture

### Edge Case
- (rien à signaler)

### Issues Found
- aucune sur la version déployée à cette passe.

## US-A11Y-002 — Focus de la fiche (jalon 3)

### Happy Path
- ✓ `US-A11Y-002-01-m3.png` — la fiche s'ouvre : le focus va sur son titre — fiche d'une station espagnole ouverte au clavier : le focus est sur son titre (H3|Plenergy Hospitalet de llobregat (l') · )
- ✓ `US-A11Y-002-02-m3.png` — fermeture : le focus revient sur l'élément qui l'a ouverte — à la fermeture, le focus revient sur la ligne qui l'avait ouverte (ES-16152)

### Edge Case
- (rien à signaler)

### Issues Found
- aucune sur la version déployée à cette passe.

## US-A11Y-003 — Touche Échap (jalon 3 : S1, S3, S4)

### Happy Path
- ✓ `US-A11Y-003-01-m3.png` — un tronçon déplié sur S4 — S4 Résultat Albi → Barcelone : tronçon espagnol déplié (« 118 km/h en moyenne · 0 arrêt · +955 m de dénivelé · 6,4 L/100 km sur ce tronçon »)
- ✓ `US-A11Y-003-02-m3.png` — Échap replie le tronçon sur S4 — Échap replie le tronçon (aria-expanded=false) et le focus reste sur lui
- ✓ (hors capture) S3 : « Barce » ouvre les propositions (dont Barcelone), Échap les ferme.
- ✓ (hors capture) S1 : fiche d'une station espagnole ouverte au clavier, Échap la ferme.

### Edge Case
- (rien à signaler)

### Issues Found
- aucune sur la version déployée à cette passe.

## US-A11Y-004 — Libellés lisibles (jalon 3 : S1, S3, S4, S5)

### Happy Path
- ✓ (hors capture) S1 Barcelone : 153 pastilles (ex. « Gratsa Barcelona · Gratsa, 1,869 euros le litre, plus cher »), 153 prix de liste annoncés en euros.
- ✓ (hors capture) S3 : 23 contrôles, 0 sans nom ; bouton d'inversion « Inverser les deux lieux ».
- ✓ `US-A11Y-004-01-m3.png` — libellés sur S4 Résultat : tronçons, plaques de prix, retour — S4 : 8 tronçons annoncés « nom, km, litres » ; plaques : Coût estimé 91,27 euros ; 2,159 euros le litre ; bouton « Retour aux trajets »
- ✓ `US-A11Y-004-02-m3.png` — libellés sur S5 Moteurs — S5 Moteurs : 28 contrôles, 0 sans nom ; bouton ⚙ nommé « Moteurs (administration) »

### Edge Case
- (rien à signaler)

### Issues Found
- aucune sur la version déployée à cette passe.

## US-PERF-001 — Ouverture rapide (jalon 3)

### Happy Path
- ✓ `US-PERF-001-01-m3.png` — avant l'ouverture (4G émulée) — contexte 4G émulée (latence 150 ms, 1,6 Mbit/s), position Barcelone, avant ouverture
- ✓ `US-PERF-001-02-m3.png` — la liste des stations s'affiche en moins de 2,5 s — liste affichée en 2009 ms (seuil 2 500 ms) à Barcelone avec 4G émulée
- ✓ (comparaison) Albi, même 4G émulée : 2003 ms.

### Edge Case
- (rien à signaler)

### Issues Found
- aucune sur la version déployée à cette passe.

## Vérification finale de l'état des moteurs

- Vérification finale (vrai appel estimer-trajet Albi → Barcelone, visiteur anonyme : aucune clé côté navigateur, les clés PTV et Stadia restent dans Vault) : {"statut":200,"peages":"ptv","etatPeages":"ok","totalPeages":29,"itineraire":"stadia","adminsEphemeresRestants":0}.

## Captures aux octets identiques

Relevé par empreinte à la fin du dernier run complet ; chaque groupe est expliqué dans « Round 3 ».

- livraison : US-3.8-02-partir-l-tranger-apres.png = US-4.4-01-voir-les-pages-avant.png
- brutes : US-1.8-01-stations-hors-de-france-avant.png = US-1.8-03-stations-hors-de-france-avant.png
- brutes : US-3.8-02-partir-l-tranger-apres.png = US-4.4-01-voir-les-pages-avant.png
- brutes : US-5.3-03-coller-la-cl-avant.png = US-5.3-04-coller-la-cl-apres.png
- 00:12Z — Captures refaites sur la prod après la remise à zéro du quota (`run-m3.mjs` complet, sous `lourd`). 1er passage (00:01–00:06Z) : 3 lignes ✗, toutes expliquées et corrigées : (1) `US-5.E3-E1-03` — aucune bascule notée : le cache servait la réponse PTV (secours) AVANT d'essayer l'actif HERE ; corrigé dans `estimer-trajet` (le cache est consulté fournisseur par fournisseur DANS la chaîne : actif d'abord, une réponse du secours, même en cache, est une bascule notée ; le créneau de quota n'est réservé qu'au moment d'un vrai appel), redéployé à 00:07Z ; (2) `US-5.4-02` — l'attente `(\d+ sections)` ne prévoyait pas le singulier introduit par le correctif 8 (PTV rend aujourd'hui 1 section pour le test à 2 points) → `sections?` ; (3) `US-4.E4-E1-02` — `toBeCloseTo(…, 1)` sur des litres arrondis au dixième (40,76 contre 40,81) → même tolérance que M2 (0,06 L × prix), aussi dans l'extrait `US-4.E4.test.ts`. Un passage filtré (US-4.E4, US-5.4, US-5.E3) s'arrête faute de l'état posé par les histoires précédentes (« moteur » ×6 absent) : non retenu. 2e passage complet (00:07–00:12Z) : **58/58 captures présentes, 56 étapes ✓, 0 ✗, 0 avertissement** ; vérification finale : péages ptv ok 29,00 €, itinéraire stadia, 0 administrateur éphémère. Les 2 captures de quota (`US-4.E4-E2-01`, `US-5.E2-E2-01`, prises à 23:33Z) ne sont pas rejouées par `run-m3.mjs` et n'ont pas été refaites : PTV n'est plus en quota, elles montreraient un autre état.
- 00:12Z — md5 (8 premiers caractères) des 58 captures du plan : US-1.8-01-stations-hors-de-france-avant.png liv=f7e5516b brute=c2694680 ; US-1.8-02-stations-hors-de-france-apres.png liv=9bdc9846 brute=9bdc9846 ; US-1.8-03-stations-hors-de-france-avant.png liv=84448c20 brute=c2694680 ; US-1.8-04-stations-hors-de-france-apres.png liv=36cc9b01 brute=36cc9b01 ; US-3.8-01-partir-l-tranger-avant.png liv=1fc73ffd brute=1fc73ffd ; US-3.8-02-partir-l-tranger-apres.png liv=dca0bb87 brute=dca0bb87 ; US-4.4-01-voir-les-pages-avant.png liv=dca0bb87 brute=dca0bb87 ; US-4.4-02-voir-les-pages-apres.png liv=579b1bc0 brute=579b1bc0 ; US-4.4-03-voir-les-pages-avant.png liv=1877f404 brute=1877f404 ; US-4.4-04-voir-les-pages-apres.png liv=1a22c436 brute=1a22c436 ; US-4.5-01-voir-les-pays-traverss-avant.png liv=bad24ace brute=bad24ace ; US-4.5-02-voir-les-pays-traverss-apres.png liv=381a79c2 brute=381a79c2 ; US-4.E4-E1-01-declencheur.png liv=8ce91fff brute=8ce91fff ; US-4.E4-E1-02-resultat.png liv=0119daeb brute=0119daeb ; US-4.E4-E1-03-retour.png liv=e7c32286 brute=e7c32286 ; US-4.E4-E2-01-quota-ptv.png liv=d69c233e brute=d69c233e ; US-4.E5-E1-01-declencheur.png liv=f22cc5c5 brute=f22cc5c5 ; US-4.E5-E1-02-resultat.png liv=5414dff1 brute=5414dff1 ; US-4.E5-E1-03-retour.png liv=9b1a60b6 brute=5d468c59 ; US-4.E6-E1-01-declencheur.png liv=4a8ade49 brute=4a8ade49 ; US-4.E6-E1-02-resultat.png liv=e22b5539 brute=e22b5539 ; US-4.E6-E1-03-retour.png liv=442a6dd6 brute=442a6dd6 ; US-5.1-01-ouvrir-les-moteurs-avant.png liv=ecfdd45f brute=ecfdd45f ; US-5.1-02-ouvrir-les-moteurs-apres.png liv=52830a55 brute=52830a55 ; US-5.2-01-choisir-le-fournisseur-avant.png liv=759b0432 brute=759b0432 ; US-5.2-02-choisir-le-fournisseur-apres.png liv=dcde68a5 brute=dcde68a5 ; US-5.3-01-coller-la-cl-avant.png liv=aa02c0fe brute=04382fb1 ; US-5.3-02-coller-la-cl-apres.png liv=f4656e30 brute=f4656e30 ; US-5.3-03-coller-la-cl-avant.png liv=c844d6d1 brute=c844d6d1 ; US-5.3-04-coller-la-cl-apres.png liv=38e54e9b brute=c844d6d1 ; US-5.4-01-tester-la-connexion-avant.png liv=5bc65609 brute=9555a2d8 ; US-5.4-02-tester-la-connexion-apres.png liv=10f782be brute=10f782be ; US-5.5-01-enregistrer-le-moteur-avant.png liv=4ffe02b2 brute=4ffe02b2 ; US-5.5-02-enregistrer-le-moteur-apres.png liv=990b6f1c brute=990b6f1c ; US-5.6-01-ou-trouver-ma-cle-avant.png liv=928cfefe brute=928cfefe ; US-5.6-02-ou-trouver-ma-cle-apres.png liv=127446d0 brute=3e57185b ; US-5.6-03-lien-stadia.png liv=701c838d brute=701c838d ; US-5.6-04-sans-cle.png liv=b7083102 brute=b7083102 ; US-5.E1-E1-01-declencheur.png liv=4dd1ff64 brute=4dd1ff64 ; US-5.E1-E1-02-resultat.png liv=f69f861e brute=45534d60 ; US-5.E1-E1-03-retour.png liv=44ac1fe2 brute=9841fd65 ; US-5.E2-E1-01-declencheur.png liv=6b0b401e brute=af956f2f ; US-5.E2-E1-02-resultat.png liv=df047869 brute=df047869 ; US-5.E2-E1-03-retour.png liv=07da05e7 brute=07da05e7 ; US-5.E2-E2-01-quota-ptv.png liv=509a2c9b brute=509a2c9b ; US-5.E3-E1-01-declencheur.png liv=b9ff8833 brute=b9ff8833 ; US-5.E3-E1-02-resultat.png liv=faf8fe3c brute=faf8fe3c ; US-5.E3-E1-03-retour.png liv=b2bfc308 brute=b2bfc308 ; US-A11Y-001-01-m3.png liv=956a43bf brute=2b95764e ; US-A11Y-001-02-m3.png liv=e3e54989 brute=ce772809 ; US-A11Y-002-01-m3.png liv=aa206ac6 brute=aa206ac6 ; US-A11Y-002-02-m3.png liv=c752e107 brute=c752e107 ; US-A11Y-003-01-m3.png liv=27edd399 brute=27edd399 ; US-A11Y-003-02-m3.png liv=c762ba79 brute=c762ba79 ; US-A11Y-004-01-m3.png liv=c68c68cc brute=a0929ee2 ; US-A11Y-004-02-m3.png liv=dca307a2 brute=f6ccd1de ; US-PERF-001-01-m3.png liv=e6371102 brute=f95c356b ; US-PERF-001-02-m3.png liv=500cc149 brute=c95712ef.
- 00:12Z — Octets identiques : livraison US-3.8-02 = US-4.4-01 (même écran d'arrivée, déclaré depuis le round 3) ; brutes US-1.8-01 = -03, US-3.8-02 = US-4.4-01, US-5.3-03 = -04 (déclarés). Le groupe brutes US-5.6-01 = US-A11Y-004-02-m3 a disparu (l'écran A11Y-004-02 a changé). 42 livraisons = leur brute (aucune étiquette). Par rapport au round 4, 10 livraisons ont les mêmes octets (écran inchangé, nouvelle prise) : US-1.8-01, -02, -03, -04, US-3.8-01, US-5.6-01, US-A11Y-001-02-m3, US-PERF-001-01-m3 (about:blank), et les 2 captures de quota (non refaites).
- 00:24Z — Playwright complet sur la prod (`npx playwright test`, m1 + m2 + extraits m3, 00:13–00:22Z, sous `lourd`, limite d'inscriptions anonymes à 300) : **148 passés, 2 ignorés (US-5.5, US-5.E3 : BLOQUÉ-CLÉ HERE), 2 échecs**, aucun lié aux péages : (1) M1 US-1.E4 « aucune rupture gazole réelle dans le rayon aujourd'hui : fixture nécessaire » (inchangé) ; (2) M2 US-3.4 `toMatchObject` : `carburant` null au lieu de « SP95-E10 », rejoué seul ×3 : 3 échecs. Diagnostic : l'appli écrit la préférence en trois `upsert` (marque, modèle, voiture) et le test la lit aussitôt, sans attendre ; les 4 dernières lignes de `preferences` en base (00:22:32–00:22:57Z) portent bien `carburant` = SP95-E10 : c'est la lecture qui arrive avant la dernière écriture. Aucun fichier de ce chemin (`useVoiture.ts`, `vehicules.ts`) n'a changé depuis le jalon 2 ; vert à 23:47Z dans ce même round. Non corrigé (ancien test, aucun changement voulu en cause), déclaré. Vérification finale du globalSetup : estimer-trajet Albi → Barcelone 200, ptv ok 29,00 €, stadia ; administrateurs éphémères restants : 0. Consommation PTV de l'appli pour les deux `run-m3.mjs` complets + ce passage : 14 appels réservés (cache : 11 tracés).
- 00:24Z — Vérifications : `npx vite build` OK ; `npx tsc --noEmit` OK ; `npx vitest run` 138/138 ; `deno check` estimer-trajet et moteurs OK ; Vercel READY sur a7f26e9.
- 00:24Z — État final relu : limite d'inscriptions anonymes remise à 30 (relue par l'API), redirections = la prod seule ; Vault (noms) = cle_ptv, cle_stadia, sync_prix_secret, 0 « FAUX- », fins NDE0 / 961b ; moteurs : péages = ptv sans secours (ok_peages), itinéraire = stadia + secours valhalla-public ; `ptv.quota_epuise_jusqua` = null ; 0 administrateur éphémère ; Albi → Barcelone 00:23:41Z : ptv ok 29,00 €, 2 sections (cache). Vraies clés (en clair, base64, URL) : 0 occurrence dans 643 fichiers (dépôt hors node_modules, sorties de tests, journal des actions) et dans `git log -p --all`.
