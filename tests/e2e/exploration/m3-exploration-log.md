# Journal d'exploration — Jalon 3 « Péages, Europe et moteurs »

Exploration de l'appli DÉPLOYÉE (https://plein-et-trajet.vercel.app), base réelle (Supabase rglrwtkqwihdztgqlbsy), bibliothèque Playwright (Chromium, 390×844, fr-FR). Aucune clé fournisseur (PTV, HERE, Stadia) n'existe : tout ce qui n'en dépend pas est vérifié sur le vrai backend ; les critères qui exigent une vraie réponse de ces fournisseurs sont marqués `BLOQUÉ-CLÉ` (aucun mock pour les faire passer).

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

## Vérification finale de l'état des moteurs

- Vérification finale (vrai appel estimer-trajet Albi → Barcelone, sans aucune clé) : {"statut":200,"peages":"ptv","etatPeages":"ok","totalPeages":29,"itineraire":"stadia"}.

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
Aucune capture du dernier passage n'est identique à une autre (le script le signalerait à la ligne de la capture : « même écran que … ») ; une brute et sa livraison coïncident octet pour octet quand aucune étiquette n'est posée (deux prises successives d'une page fixe).

### Limites connues
- Albi → Barcelone : PTV ne renvoie pas de section pour l'AP-7 espagnole dans cette requête ; seuls les péages français (29,00 € TTC) sont comptés — signalé, non inventé.
- Stadia et FOSSGIS ne calculent pas toujours le même itinéraire (Milan 861 km chez Stadia contre 950 chez FOSSGIS) : seuils des tests élargis.

## Round 3

Entrées écrites au fil de l'eau (une par histoire ou correctif), horodatées UTC.

- 20:58Z — Les 6 échecs M2 non expliqués du dernier passage (US-3.P2, US-A11Y-002 ×2, US-A11Y-003 ×2, US-A11Y-004) : rejoués 3 fois chacun (12 tests, `--repeat-each=3`) = 34 verts sur 36 ; les 2 échecs sont les deux derniers tests de la 3e série (US-A11Y-004 S4 et erreurs) : la liste « Marque » ne s'ouvre pas. À ce moment 31 identités anonymes avaient été créées en 10 minutes (relevé SQL : 236 sur l'heure) alors que la limite d'inscriptions anonymes était à 30 par heure et par IP : cet échec reproductible est l'épuisement de la limite, pas un défaut de l'appli. Pour le passage complet précédent (limite alors à 300) la cause n'est pas prouvée ; le passage complet final de ce round se fait limite relevée à 300 (relue) puis remise à 30 (relue).
- 20:58Z — Échec « 0,375 contre < 0,06 » (US-4.2 bornes) : le total affiché inclut les péages réels PTV (1,5 € ÷ 4 €/L = 0,375 L d'écart, exactement) ; US-3.5, US-3.6 et US-4.2 (×2) comparent maintenant le coût CARBURANT (total moins péages), commentaire « US-4.4 : le total inclut les péages depuis le jalon 3 », commit séparé « test(m2) » ; 8 tests verts après modification.
- 21:03Z — RO et UK tentés pour de vrai. Royaume-Uni : `curl https://storelocator.asda.com/fuel_prices_data.json` → 200, 175 590 octets, 790 stations (prix en pence) ; branché (enseigne Asda seule, cours GBP du jour) : `sync-stations-pays?pays=GB` → {ok:true, stations:789} (790 lignes, 1 doublon d'identifiant). Roumanie : `curl https://monitorulpreturilor.info/pmonsvc/Gas/GetGasItemsByLatLon?…` sans -k → code de sortie curl 60 (certificat invalide) ; avec -k → 200, 130 034 octets. Branché par un relais Node (`api/relais-ro.js`, rejectUnauthorized false pour cette seule adresse, comme le relais espagnol) : `sync-stations-pays?pays=RO` → {ok:true, stations:519}. Particularités relevées : le service roumain ne répond que jusqu'à 5 km de rayon (réponse vide de 275 octets à 7 km et plus) et au plus 50 stations par requête, un seul identifiant de produit par requête (11 benzine 95, 12 premium, 21 motorină, 31 GPL) : couverture partielle (50 villes × 4 produits). Cron GB et RO ajoutés ; pays.statut_flux = branche pour GB et RO.
- 21:03Z — LOW 19 traité : table `quota_peages` + fonction `quota_peages_reserver` ; chaque calcul qui exige un appel de péages réserve un créneau par identité anonyme (60/jour) et globalement (1 500/jour) ; au-delà, le calcul continue sans péages (« Péages non disponibles pour l'instant », motif quota_atteint) et aucun appel PTV/HERE ne part. Limites choisies : PTV 100 000/mois, HERE 2 500/mois (≈ 80/jour).
