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

## US-3.8 — Partir à l'étranger

### Happy Path
- ✓ `US-3.8-01-partir-l-tranger-avant.png` — champ arrivée : « Barce » propose Barcelone, Espagne — Photon propose « Barcelone — Catalogne, Espagne » à la suite des communes françaises (IGN)
- ✓ `US-3.8-02-partir-l-tranger-apres.png` — le calcul aboutit : itinéraire France puis Espagne — itinéraire 470 km traversant FR puis ES (Valhalla, instance publique) ; coût 62,57 €

### Edge Case
- (rien à signaler)

### Issues Found
- Dépendance : propositions étrangères = Photon (komoot) via la fonction `lieux` ; itinéraire = Valhalla FOSSGIS (instance publique, sans clé, ≤ 1 requête/s — politique d'usage lue le 20/10 : faible trafic, User-Agent identifiant, attribution OSM).

## US-4.4 — Voir les péages

### Happy Path
- ✓ `US-4.4-01-voir-les-pages-avant.png` — trajet Albi → Barcelone calculé (écran Résultat) — résultat Albi → Barcelone 62,57 € — même écran que US-3.8-02-partir-l-tranger-apres.png : deux étapes du plan montrent légitimement le même état, aucune différence fabriquée
- ✓ `US-4.4-02-voir-les-pages-apres.png` — lecture du détail des péages (état réel : « Péages non disponibles pour l'instant ») — BLOQUÉ-CLÉ : aucune clé PTV/HERE → impossible de lire les montants TTC par section ; état réel capturé : « Péages non disponibles pour l'instant — » (aucun montant inventé)
- ✓ `US-4.4-03-voir-les-pages-avant.png` — trajet sans autoroute payante (écran Résultat) — résultat Albi → Castres 48 km, 6,83 €
- ✓ `US-4.4-04-voir-les-pages-apres.png` — détail des péages : « Aucun péage sur cet itinéraire » et 0,00 € — « Aucun péage sur cet itinéraire » 0,00 € ; Carburant 6,83 € · Péages 0,00 € ; coût total inchangé

### Edge Case
- (rien à signaler)

### Issues Found
- BLOQUÉ-CLÉ : US-4.4 (montants réels par section, total ajouté au coût) : il manque une clé PTV Developer (ou HERE) collée dans l'écran Moteurs. Le code est construit (PTV : prix HT + TVA du pays ; HERE : TTC) et couvert par les tests unitaires sur les formats documentés, mais aucun montant réel n'a pu être vu.

## US-4.5 — Voir les pays traversés

### Happy Path
- ✓ `US-4.5-01-voir-les-pays-traverss-avant.png` — trajet Albi → Milan calculé (écran Résultat) — résultat Albi → Milan 952 km
- ✓ `US-4.5-02-voir-les-pays-traverss-apres.png` — pays traversés : km, litres, prix moyen du jour, coût ; somme = coût carburant — FR 2,161 €/L (flux du jour), IT 2,021 €/L (Bulletin UE) ; Σ coûts pays = 137,24 € = coût carburant affiché 137,24 €

### Edge Case
- (rien à signaler)

### Issues Found
- aucune sur la version déployée à cette passe.

## US-4.E4 — Péages indisponibles

### Happy Path
- (rien à signaler)

### Edge Case
- ✓ (hors capture) écran Moteurs : péages = PTV Developer, état « Clé à coller » : le service de péages est réellement hors service faute de clé — pas de mock.
- ✓ `US-4.E4-E1-01-declencheur.png` — le service de péages est en erreur : écran Résultat, bloc Péages — écran Résultat Albi → Bordeaux (autoroute A62) : le détail des péages dit « Péages non disponibles pour l'instant » (service réellement sans clé) ; aucun total de péages
- ✓ `US-4.E4-E1-02-resultat.png` — le coût carburant s'affiche et rien n'est ajouté au total — coût affiché 40,80 € = carburant seul (18,9 L × 2,161 €/L) ; rien n'est ajouté au total pour les péages
- ✓ `US-4.E4-E1-03-retour.png` — retour à l'état normal (autre trajet, sans autoroute payante) — retour à l'état normal sur UN AUTRE trajet (Albi → Castres) : on ne peut pas rétablir un service dont la clé n'existe pas ; le trajet Albi → Bordeaux, lui, reste « péages non disponibles » tant qu'aucune clé n'est collée — même écran que US-4.4-04-voir-les-pages-apres.png : deux étapes du plan montrent légitimement le même état, aucune différence fabriquée

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
- ✓ `US-4.E6-E1-02-resultat.png` — la ligne Serbie porte « prix non publié — moyenne européenne appliquée » et le prix utilisé — RS : « prix non publié — moyenne européenne appliquée » à 2,010 €/L (moyenne UE du bulletin) ; 1962 km ; pays FR, IT, SI, HR, RS ; Σ coûts = coût
- ✓ `US-4.E6-E1-03-retour.png` — retour à l'état normal — retour au formulaire ; le trajet Albi → Belgrade est en tête de l'historique
- ✓ (hors capture) Albi → Rome : 1343 km, pays FR, IT — avant le correctif, « Trajet trop long » à tort.
- ✓ (hors capture) Albi → Lisbonne : 1347 km, pays FR, ES, PT — avant le correctif, « Trajet trop long » à tort.

### Issues Found
- aucune sur la version déployée à cette passe.

## US-1.8 — Stations hors de France

### Happy Path
- ✓ `US-1.8-01-stations-hors-de-france-avant.png` — ma position à Barcelone (avant d'ouvrir Prix) — visiteur géolocalisé à Barcelone (41,387 N ; 2,169 E), onglet Trajets ouvert
- ✓ `US-1.8-02-stations-hors-de-france-apres.png` — la carte et la liste affichent les stations espagnoles avec leurs prix officiels — 153 stations espagnoles (liste et 153 pastilles) ; ES-16152 « Plenergy Hospitalet de llobregat (l') · Plenergy » 1,67 € = prix officiel MITECO 1,669 € ; écart affiché « −22,0 c vs Espagne »
- ✓ `US-1.8-03-stations-hors-de-france-avant.png` — ma position dans un pays qui ne publie pas ses prix (Belgique) — visiteur géolocalisé à Bruxelles (50,850 N ; 4,352 E) — la Belgique ne publie pas de flux station par station — même écran que US-1.8-01-stations-hors-de-france-avant.png : deux étapes du plan montrent légitimement le même état, aucune différence fabriquée
- ✓ `US-1.8-04-stations-hors-de-france-apres.png` — message « Ce pays ne publie pas les prix station par station » et prix moyen national — message + « Prix moyen national · Belgique · SP95-E10 : 1,977 €/L » (Bulletin pétrolier UE : BE 1,977 €/L)
- ✓ (vue complémentaire m3-captures-pays/US-1.8-rome.png) à Rome : 295 stations « IT-… » en liste (Gazole), premier prix 1,599 euros le litre, aucun message « pays sans flux ».
- ✓ (vue complémentaire m3-captures-pays/US-1.8-lisbonne.png) à Lisbonne : 115 stations « PT-… » en liste (Gazole), premier prix 2,069 euros le litre, aucun message « pays sans flux ».
- ✓ (vue complémentaire m3-captures-pays/US-1.8-vienne.png) à Vienne : 5 stations « AT-… » en liste (Gazole), premier prix 2,107 euros le litre, aucun message « pays sans flux ».
- ✓ (vue complémentaire m3-captures-pays/US-1.8-ljubljana.png) à Ljubljana : 42 stations « SI-… » en liste (Gazole), premier prix 1,903 euros le litre, aucun message « pays sans flux ».
- ✓ (vue complémentaire m3-captures-pays/US-1.8-zagreb.png) à Zagreb : 87 stations « HR-… » en liste (Gazole), premier prix 1,360 euros le litre, aucun message « pays sans flux ».

### Edge Case
- ✓ (vue complémentaire m3-captures-pays/US-1.8-berlin-non-branche.png) Berlin (Allemagne : flux Tankerkönig à clé, pas encore branché) : « Prix station par station pas encore disponibles pour ce pays » + prix moyen national ; la phrase de la spec est réservée aux pays qui ne publient pas (Bruxelles).

### Issues Found
- Dépendance : stations synchronisées par pg_cron — ES (flux MITECO via le relais Vercel `api/relais-es` : TLS 1.2 à échange RSA statique refusé par Deno), IT (Osservaprezzi, ~50 villes × 30 km), PT (DGEG), SI (goriva.si), HR (mzoe-gor.hr, lat/long inversés remis à l'endroit), AT (E-Control : les 10 moins chères par requête, 20 points × 2 carburants), DK (API OK, une seule enseigne), IS (gasvaktin, cours ISK du jour). Non branchés : DE (clé Tankerkönig), RO (certificat TLS invalide), GB (CSV à URL signée).

## US-A11Y-001 — Navigation au clavier (jalon 3 : S1, S3, S4, S5)

### Happy Path
- ✓ `US-A11Y-001-01-m3.png` — Tab : ordre de lecture et contour visible sur S3 Trajets — S3 Trajets : 24 contrôles parcourus (Départ → Inverser les deux lieux → Arrivée → Marque → Modèle → Motorisation → Calculer le coût → Recalculer le trajet Albi → Bordeaux au prix du jour → Supprimer le trajet Albi → Bordeaux → Recalculer le trajet Albi → Barcelone au prix du jour → Supprimer le trajet Albi → Barcelone → Recalculer le trajet Albi → Lisbonne au prix du jour → Supprimer le trajet Albi → Lisbonne → Recalculer le trajet Albi → Rome au prix du jour…), tous avec contour visible, dans l'ordre de lecture (départ, arrivée, voiture, calcul)
- ✓ (hors capture) S4 Résultat : 6 contrôles (Retour aux trajets → Mettre mon prix → Route, 30,0 km, 1,8 litres → Ville, 16,8 km, 1,3 litres → Montée, 0,9 km, 0,1 litres → Trajets…), contour visible partout, tronçons atteints dans l'ordre.
- ✓ (hors capture) S1 Prix : 25 contrôles (Gazole → SP95-E10 → SP95 → SP98 → E85 → GPLc → Carte des stations → Esso Express Albi, 2,191 euros le litre, plus cher → Carrefour Albi, 2,182 euros le litre, plus cher → TotalEnergies Albi · Relais des Fontanelles, 1,990 euros le litre, moins cher → Intermarché Le Sequestre, 2,182 euros le litre, plus cher → Leclerc Lescure-d'Albigeois, 2,182 euros le litre, plus cher → Leclerc Albi, 2,182 euros le litre, plus cher → Afficher ou masquer les crédits…), contour visible partout.
- ✓ `US-A11Y-001-02-m3.png` — Tab : ordre de lecture et contour visible sur S5 Moteurs — S5 Moteurs : 25 contrôles (Moteurs (administration) → ← Retour → Fournisseur · Prix des stations → Tester la connexion → Enregistrer → Fournisseur · Prix moyens par pays → Tester la connexion → Enregistrer → Fournisseur · Itinéraire → Secours · Itinéraire → Tester la connexion → Enregistrer…), tous avec contour visible, dans l'ordre de lecture

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
- ✓ `US-A11Y-003-01-m3.png` — un tronçon déplié sur S4 — S4 Résultat Albi → Barcelone : tronçon espagnol déplié (« 101 km/h en moyenne · 0 arrêt · +954 m de dénivelé · 6,4 L/100 km sur ce tronçon »)
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
- ✓ `US-A11Y-004-01-m3.png` — libellés sur S4 Résultat : tronçons, plaques de prix, retour — S4 : 8 tronçons annoncés « nom, km, litres » ; plaques : Coût estimé 62,57 euros ; 2,161 euros le litre ; bouton « Retour aux trajets »
- ✓ `US-A11Y-004-02-m3.png` — libellés sur S5 Moteurs — S5 Moteurs : 26 contrôles, 0 sans nom ; bouton ⚙ nommé « Moteurs (administration) »

### Edge Case
- (rien à signaler)

### Issues Found
- aucune sur la version déployée à cette passe.

## US-PERF-001 — Ouverture rapide (jalon 3)

### Happy Path
- ✓ `US-PERF-001-01-m3.png` — avant l'ouverture (4G émulée) — contexte 4G émulée (latence 150 ms, 1,6 Mbit/s), position Barcelone, avant ouverture
- ✓ `US-PERF-001-02-m3.png` — la liste des stations s'affiche en moins de 2,5 s — liste affichée en 2003 ms (seuil 2 500 ms) à Barcelone avec 4G émulée
- ✓ (comparaison) Albi, même 4G émulée : 2040 ms.

### Edge Case
- (rien à signaler)

### Issues Found
- aucune sur la version déployée à cette passe.

## US-5.1 — Ouvrir les moteurs

### Happy Path
- ✓ `US-5.1-01-ouvrir-les-moteurs-avant.png` — connecté comme administrateur : le bouton ⚙ est affiché — connecté par lien magique (m3-admin-test@example.org, app_metadata.role = admin) ; bouton ⚙ visible dans l'en-tête
- ✓ `US-5.1-02-ouvrir-les-moteurs-apres.png` — l'écran Moteurs liste les 6 services avec leur fournisseur et leur état (fenêtre haute 390×2300) — 6 services : PRIX DES STATIONS (PRÊT · SANS CLÉ) ; PRIX MOYENS PAR PAYS (PRÊT · SANS CLÉ) ; ITINÉRAIRE (ENREGISTRÉ · UTILISÉ DÈS LE PROCHAIN CALCUL) ; PÉAGES (CLÉ À COLLER) ; VOITURES (PRÊT · SANS CLÉ) ; RECHERCHE DE LIEUX (PRÊT · SANS CLÉ)

### Edge Case
- (rien à signaler)

### Issues Found
- aucune sur la version déployée à cette passe.

## US-5.2 — Choisir le fournisseur

### Happy Path
- ✓ `US-5.2-01-choisir-le-fournisseur-avant.png` — l'écran Moteurs, carte Péages — péages : fournisseur PTV Developer (état « Clé à coller ») — même écran que US-5.3-01-coller-la-cl-avant.png : deux étapes du plan montrent légitimement le même état, aucune différence fabriquée
- ✓ `US-5.2-02-choisir-le-fournisseur-apres.png` — HERE choisi pour les péages : l'état passe à « Clé à coller » — HERE demande une clé → « Clé à coller » ; IGN (sans clé) pour l'itinéraire → « Prêt · sans clé » (vérifié aussi)

### Edge Case
- (rien à signaler)

### Issues Found
- aucune sur la version déployée à cette passe.

## US-5.3 — Coller la clé

### Happy Path
- ✓ `US-5.3-01-coller-la-cl-avant.png` — le champ clé des péages — champ clé des péages vide (type password) : « Coller la clé d'API » — même écran que US-5.2-01-choisir-le-fournisseur-avant.png : deux étapes du plan montrent légitimement le même état, aucune différence fabriquée
- ✓ `US-5.3-02-coller-la-cl-apres.png` — une clé collée est testée avant d'être écrite (clé factice refusée, rien n'est rangé) — BLOQUÉ-CLÉ (partie « rangée chiffrée après enregistrement ») : sans clé PTV valide, aucune clé collée ne peut être acceptée ; état réel : « CLÉ REFUSÉE PAR PTV (401) · CLÉ NON ENREGISTRÉE, ANCIENNE CLÉ CONSERVÉE · CLÉ REFUSÉE PAR PTV (401) · FOURNISSEUR ACTIF INCHANGÉ », Vault : 0 secret ; le stockage chiffré et le masquage sont prouvés ci-dessous sur une clé amorcée côté serveur
- ✓ `US-5.3-03-coller-la-cl-avant.png` — une clé enregistrée : le champ n'affiche que ses 4 derniers caractères — clé rangée dans Supabase Vault (secret chiffré en base ≠ clé en clair, 72 car.), fin « 7d3f » ; amorcée côté serveur (SEED : une clé collée à l'écran est maintenant testée avant d'être écrite) ; champ : « Clé enregistrée ••••7d3f — coller pour remplacer »
- ✓ `US-5.3-04-coller-la-cl-apres.png` — après rechargement, la clé complète n'apparaît nulle part (page, réseau) — 1 réponses réseau (dont 1 de la fonction moteurs) lues : la clé complète n'y figure pas, seule la fin « 7d3f » ; page, champs et stockage du navigateur : absente — même écran que US-5.3-03-coller-la-cl-avant.png : deux étapes du plan montrent légitimement le même état, aucune différence fabriquée

### Edge Case
- (rien à signaler)

### Issues Found
- BLOQUÉ-CLÉ : US-5.3 (étape 2 : « je colle une clé et j'enregistre → rangée chiffrée ») : il manque une clé PTV valide ; une clé non validée n'est volontairement plus écrite dans Vault. Le stockage chiffré, la fin de 4 caractères et l'absence de la clé dans la page et le réseau sont prouvés sur une clé amorcée côté serveur.

## US-5.4 — Tester la connexion

### Happy Path
- ✓ `US-5.4-01-tester-la-connexion-avant.png` — péages : aucune clé valide (état réel) — état réel : aucune clé PTV valide (le plan suppose « une clé PTV valide collée ») — même écran que US-5.3-01-coller-la-cl-avant.png : deux étapes du plan montrent légitimement le même état, aucune différence fabriquée
- ✓ `US-5.4-02-tester-la-connexion-apres.png` — Tester la connexion (état réel faute de clé : « Aucune clé : colle-la d'abord ») — BLOQUÉ-CLÉ : sans clé PTV valide, « Connecté » est impossible à obtenir ; état réel capturé : « Aucune clé : colle-la d'abord » (aucun appel PTV n'est fait sans clé)
- ✓ (hors plan) « CONNECTÉ · TEST ALBI → TOULOUSE OK (76 KM) » : un vrai calcul de test part vers Valhalla et l'état affiche « Connecté » sur un moteur sans clé.

### Edge Case
- (rien à signaler)

### Issues Found
- BLOQUÉ-CLÉ : US-5.4 « Connecté » pour PTV : il manque une clé PTV Developer valide.

## US-5.5 — Enregistrer le moteur

### Happy Path
- ✓ `US-5.5-01-enregistrer-le-moteur-avant.png` — le moteur péages basculé sur HERE (non enregistrable sans clé) — péages basculé sur HERE dans l'écran (aucune clé HERE n'existe : enregistrement impossible)
- ✓ `US-5.5-02-enregistrer-le-moteur-apres.png` — Albi → Barcelone après la tentative (état réel : péages indisponibles) — BLOQUÉ-CLÉ : aucune clé HERE → impossible d'enregistrer HERE puis de voir des péages HERE ; état réel : le moteur actif reste PTV (sans clé), « Péages non disponibles pour l'instant »

### Edge Case
- (rien à signaler)

### Issues Found
- BLOQUÉ-CLÉ : US-5.5 (péages venant de HERE sans redéploiement) : il manque une clé HERE (plan Base, carte bancaire) collée dans l'écran Moteurs. La lecture du moteur actif à chaque appel est en place (table moteurs + Vault) ; la bascule vers HERE n'a pas pu être vue avec de vrais montants.

## US-5.E1 — Moteurs invisibles aux visiteurs

### Happy Path
- (rien à signaler)

### Edge Case
- ✓ `US-5.E1-E1-01-declencheur.png` — un appareil non administrateur — appareil non administrateur : session anonyme fd8046d3…, aucun claim admin
- ✓ `US-5.E1-E1-02-resultat.png` — l'appli s'ouvre : pas de bouton ⚙, /moteurs redirige — le bouton ⚙ n'est pas affiché ; l'adresse /moteurs renvoie à l'écran Prix (S5 absent)
- ✓ `US-5.E1-E1-03-retour.png` — lecture et écriture de la table moteurs refusées par le serveur ; l'appli reste normale — refus par le serveur (pas seulement le bouton caché) : lecture_moteurs 0 ligne(s) visible(s) / 6 en base ; insertion 403 ; modification 200 (0 ligne modifiée) ; suppression 200 (0 ligne supprimée) ; cles_fournisseurs 403 ; rpc_moteur_cle 403 ; fonction_moteurs 403 ; fonction_sans_session 401 ; la ligne péages est intacte (actif = ptv)

### Issues Found
- aucune sur la version déployée à cette passe.

## US-5.E2 — Clé refusée

### Happy Path
- (rien à signaler)

### Edge Case
- ✓ `US-5.E2-E1-01-declencheur.png` — une clé invalide collée — clé volontairement invalide collée dans le champ des péages (PTV, masquée)
- ✓ `US-5.E2-E1-02-resultat.png` — Tester la connexion : « Clé refusée par PTV (401) » — vrai appel à api.myptv.com → HTTP 401 → « Clé refusée par PTV (401) » (état ko)
- ✓ `US-5.E2-E1-03-retour.png` — Enregistrer garde l'ancien fournisseur actif (PTV) — HERE + clé invalide + Enregistrer : refusé par le vrai HERE (401), « clé non enregistrée », le fournisseur actif reste PTV après rechargement (base : actif = ptv ; Vault : 0 secret) — même écran que US-5.4-01-tester-la-connexion-avant.png : deux étapes du plan montrent légitimement le même état, aucune différence fabriquée

### Issues Found
- aucune sur la version déployée à cette passe.

## US-5.E3 — Bascule de secours

### Happy Path
- (rien à signaler)

### Edge Case
- ✓ `US-5.E3-E1-01-declencheur.png` — PTV en panne et HERE enregistré en secours — péages : PTV actif (clé amorcée refusée par le vrai PTV = fournisseur principal hors service), HERE enregistré en secours (clé amorcée). Le plan suppose une panne PTV simulée côté fonction (page.route impossible côté serveur) ; ici les deux fournisseurs sont réellement injoignables faute de clé valide
- ✓ `US-5.E3-E1-02-resultat.png` — je calcule un trajet : la chaîne PTV → HERE est parcourue — calcul réel : la fonction essaie PTV (401) puis HERE (401) ; les deux refusent, « Péages non disponibles pour l'instant », coût carburant conservé
- ✓ `US-5.E3-E1-03-retour.png` — l'écran Moteurs note l'incident (la bascule réussie est bloquée faute de clé HERE) — l'écran Moteurs note l'incident avec l'heure : « Dernier incident · PTV : clé refusée (401) · 20/10 20:14 » ; BLOQUÉ-CLÉ : la bascule réussie vers HERE (« Bascule PTV → HERE le … ») exige une clé HERE valide — bascule_le = null

### Issues Found
- BLOQUÉ-CLÉ : US-5.E3 (péages venant de HERE quand PTV tombe, bascule notée avec l'heure) : il manque une clé HERE valide (et une clé PTV valide pour provoquer une vraie panne côté PTV). La chaîne actif → secours, l'incident horodaté et la note de bascule sont construits et testés unitairement (executerChaine).
