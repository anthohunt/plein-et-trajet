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

## US-3.8 — Partir à l'étranger

### Happy Path
- ✓ `US-3.8-01-partir-l-tranger-avant.png` — champ arrivée : « Barce » propose Barcelone, Espagne — Photon propose « Barcelone — Catalogne, Espagne » à la suite des communes françaises (IGN)

### Edge Case
- (rien à signaler)

### Issues Found
- ✗ l'histoire s'est arrêtée : locator.click: Timeout 30000ms exceeded. Call log: [2m  - waiting for locator('#voiture-marque')[22m [2m    - locator resolved to <button type="button" data-valeur="" role="combobox" id="voiture-marque" class="dd-btn vide" aria-label="Marque" aria-controls=":r2:" aria-expanded="false" aria-haspopup="listbox">…</button>[22m

## US-4.4 — Voir les péages

### Happy Path
- ✗ `US-4.4-01-voir-les-pages-avant.png` — trajet Albi → Barcelone calculé (écran Résultat) — expect(locator).toHaveCount(expected) failed  Locator:  locator('[data-el="detail-peages"]') Expected: 1

### Edge Case
- (rien à signaler)

### Issues Found
- ✗ l'histoire s'est arrêtée : locator.scrollIntoViewIfNeeded: Timeout 30000ms exceeded. Call log: [2m  - waiting for locator('[data-el="detail-peages"]')[22m

## US-4.5 — Voir les pays traversés

### Happy Path
- (rien à signaler)

### Edge Case
- (rien à signaler)

### Issues Found
- ✗ l'histoire s'est arrêtée : locator.click: Timeout 30000ms exceeded. Call log: [2m  - waiting for locator('[data-el="retour-trajets"]')[22m

## US-4.E4 — Péages indisponibles

### Happy Path
- (rien à signaler)

### Edge Case
- ✓ `US-4.E4-E1-01-declencheur.png` — le service de péages est réellement en erreur (aucune clé active) — écran Moteurs : péages = PTV Developer, état « Clé à coller » (le service de péages est réellement hors service faute de clé) — pas de mock
- ✓ `US-4.E4-E1-02-resultat.png` — le coût carburant s'affiche, « Péages non disponibles pour l'instant », rien ajouté au total — Albi → Bordeaux (autoroute A62 : péage à établir) : coût carburant 40,77 € affiché, « Péages non disponibles pour l'instant », aucun péage ajouté au total
- ✓ `US-4.E4-E1-03-retour.png` — retour à l'état normal — retour à l'état normal : un trajet sans autoroute payante affiche à nouveau « Aucun péage sur cet itinéraire » (le calcul des péages d'un trajet à autoroute reste, lui, indisponible sans clé)

### Issues Found
- aucune sur la version déployée à cette passe.

## US-4.E5 — Vignette sur le trajet

### Happy Path
- (rien à signaler)

### Edge Case
- (rien à signaler)

### Issues Found
- ✗ l'histoire s'est arrêtée : locator.click: Timeout 30000ms exceeded. Call log: [2m  - waiting for locator('#voiture-marque')[22m [2m    - locator resolved to <button type="button" class="dd-btn" role="combobox" title="Peugeot" id="voiture-marque" aria-label="Marque" aria-controls=":r2:" aria-expanded="false" data-valeur="Peugeot" aria-haspopup="listbox">…</button>[22m

## US-4.E6 — Pays sans prix moyen

### Happy Path
- (rien à signaler)

### Edge Case
- ✓ `US-4.E6-E1-01-declencheur.png` — un pays traversé absent des moyennes (Serbie) — arrivée Belgrade (Serbie, absente du Bulletin pétrolier UE) ; départ Trieste : le routeur public refuse Albi → Belgrade (1 960 km, erreur 154 « distance au-delà de la limite »), affichée « Trajet trop long »
- ✓ `US-4.E6-E1-02-resultat.png` — la ligne Serbie porte « prix non publié — moyenne européenne appliquée » et le prix utilisé — RS : « prix non publié — moyenne européenne appliquée » à 2,010 €/L (moyenne UE du bulletin) ; pays traversés IT, SI, HR, RS ; Σ coûts = coût
- ✓ `US-4.E6-E1-03-retour.png` — retour à l'état normal — retour au formulaire ; le trajet Trieste → Belgrade est en tête de l'historique
- ✓ Albi → Belgrade (1 960 km) : « Trajet trop long pour le moteur d'itinéraire actuel » (erreur réelle 154 de Valhalla, pas d'invention) — pas de capture au plan.

### Issues Found
- aucune sur la version déployée à cette passe.

## US-1.8 — Stations hors de France

### Happy Path
- ✓ `US-1.8-01-stations-hors-de-france-avant.png` — ma position à Barcelone (avant d'ouvrir Prix) — visiteur géolocalisé à Barcelone (41,387 N ; 2,169 E), onglet Trajets ouvert
- ✓ `US-1.8-02-stations-hors-de-france-apres.png` — la carte et la liste affichent les stations espagnoles avec leurs prix officiels — 153 stations espagnoles (liste et 153 pastilles) ; ES-16152 « Plenergy Hospitalet de llobregat (l') · Plenergy » 1,67 € = prix officiel MITECO 1,669 € ; écart affiché « −22,0 c vs Espagne »
- ✓ `US-1.8-03-stations-hors-de-france-avant.png` — ma position dans un pays qui ne publie pas ses prix (Belgique) — visiteur géolocalisé à Bruxelles (50,850 N ; 4,352 E) — la Belgique ne publie pas de flux station par station
- ✓ `US-1.8-04-stations-hors-de-france-apres.png` — message « Ce pays ne publie pas les prix station par station » et prix moyen national — message + « Prix moyen national · Belgique · SP95-E10 : 1,977 €/L » (Bulletin pétrolier UE : BE 1,977 €/L)

### Edge Case
- (rien à signaler)

### Issues Found
- Dépendance : seule l'Espagne est synchronisée (flux MITECO via le relais Vercel `api/relais-es` : le serveur du ministère n'accepte que TLS 1.2 à échange RSA statique, refusé par Deno/rustls — « Connection reset by peer »). IT, PT, SI, HR, AT, DE, DK, RO, UK : non branchés à cette passe (T3.5) ; ces pays affichent donc le message « Ce pays ne publie pas… » alors que certains publient — écart signalé.

## US-5.1 — Ouvrir les moteurs

### Happy Path
- ✓ `US-5.1-01-ouvrir-les-moteurs-avant.png` — connecté comme administrateur : le bouton ⚙ est affiché — connecté par lien magique (m3-admin-test@example.org, app_metadata.role = admin) ; bouton ⚙ visible dans l'en-tête
- ✓ `US-5.1-02-ouvrir-les-moteurs-apres.png` — l'écran Moteurs liste les 6 services avec leur fournisseur et leur état — 6 services : PRIX DES STATIONS (PRÊT · SANS CLÉ) ; PRIX MOYENS PAR PAYS (PRÊT · SANS CLÉ) ; ITINÉRAIRE (PRÊT · SANS CLÉ) ; PÉAGES (CLÉ À COLLER) ; VOITURES (PRÊT · SANS CLÉ) ; RECHERCHE DE LIEUX (PRÊT · SANS CLÉ)

### Edge Case
- (rien à signaler)

### Issues Found
- aucune sur la version déployée à cette passe.

## US-5.2 — Choisir le fournisseur

### Happy Path
- ✓ `US-5.2-01-choisir-le-fournisseur-avant.png` — l'écran Moteurs, carte Péages — péages : fournisseur PTV Developer (état « Clé à coller »)
- ✓ `US-5.2-02-choisir-le-fournisseur-apres.png` — HERE choisi pour les péages : l'état passe à « Clé à coller » — HERE demande une clé → « Clé à coller » ; IGN (sans clé) pour l'itinéraire → « Prêt · sans clé » (vérifié aussi)

### Edge Case
- (rien à signaler)

### Issues Found
- aucune sur la version déployée à cette passe.

## US-5.3 — Coller la clé

### Happy Path
- ✓ `US-5.3-01-coller-la-cl-avant.png` — le champ clé des péages — champ clé des péages vide (type password) : « Coller la clé d'API »
- ✓ `US-5.3-02-coller-la-cl-apres.png` — la clé est stockée chiffrée côté serveur ; le champ n'affiche plus que ses 4 derniers caractères — clé rangée dans Supabase Vault (secret chiffré en base ≠ clé en clair, 72 car.), fin enregistrée « 7d3f » ; champ : « Clé enregistrée ••••7d3f — coller pour remplacer » ; état : « CLÉ REFUSÉE PAR PTV (401) · CLÉ RANGÉE, FOURNISSEUR ACTIF INCHANGÉ » (la clé factice est refusée par le vrai PTV : le fournisseur actif ne change pas)
- ✓ `US-5.3-03-coller-la-cl-avant.png` — une clé enregistrée — clé enregistrée (rechargement de l'écran)
- ✓ `US-5.3-04-coller-la-cl-apres.png` — après rechargement, la clé complète n'apparaît nulle part (page, réseau) — 2 réponses réseau (dont 2 de la fonction moteurs) lues : la clé complète n'y figure pas, seule la fin « 7d3f » ; page, champs et stockage du navigateur : absente

### Edge Case
- (rien à signaler)

### Issues Found
- aucune sur la version déployée à cette passe.

## US-5.4 — Tester la connexion

### Happy Path
- ✓ `US-5.4-01-tester-la-connexion-avant.png` — péages : aucune clé valide (état réel) — état réel : aucune clé PTV valide (le plan suppose « une clé PTV valide collée »)
- ✓ `US-5.4-02-tester-la-connexion-apres.png` — Tester la connexion (état réel faute de clé : « Aucune clé : colle-la d'abord ») — BLOQUÉ-CLÉ : sans clé PTV valide, « Connecté » est impossible à obtenir ; état réel capturé : « Aucune clé : colle-la d'abord » (aucun appel PTV n'est fait sans clé)
- ✓ (hors plan) « CONNECTÉ · TEST ALBI → TOULOUSE OK (76 KM) » : un vrai calcul de test part vers Valhalla et l'état affiche « Connecté » sur un moteur sans clé.

### Edge Case
- (rien à signaler)

### Issues Found
- BLOQUÉ-CLÉ : US-5.4 « Connecté » pour PTV : il manque une clé PTV Developer valide.

## US-5.5 — Enregistrer le moteur

### Happy Path
- ✓ `US-5.5-01-enregistrer-le-moteur-avant.png` — le moteur péages basculé sur HERE (non enregistrable sans clé) — péages basculé sur HERE dans l'écran (aucune clé HERE n'existe : enregistrement impossible)

### Edge Case
- (rien à signaler)

### Issues Found
- ✗ l'histoire s'est arrêtée : locator.click: Timeout 30000ms exceeded. Call log: [2m  - waiting for locator('#voiture-marque')[22m [2m    - locator resolved to <button type="button" class="dd-btn" role="combobox" title="Peugeot" id="voiture-marque" aria-label="Marque" aria-controls=":r2:" aria-expanded="false" data-valeur="Peugeot" aria-haspopup="listbox">…</button>[22m

## US-5.E1 — Moteurs invisibles aux visiteurs

### Happy Path
- (rien à signaler)

### Edge Case
- ✗ `US-5.E1-E1-01-declencheur.png` — un appareil non administrateur — expect(received).toMatch(expected)  Matcher error: received value must be a string 
- ✓ `US-5.E1-E1-02-resultat.png` — l'appli s'ouvre : pas de bouton ⚙, /moteurs redirige — le bouton ⚙ n'est pas affiché ; l'adresse /moteurs renvoie à l'écran Prix (S5 absent)

### Issues Found
- ✗ l'histoire s'est arrêtée : Cannot read properties of null (reading 'jeton')

## US-5.E2 — Clé refusée

### Happy Path
- (rien à signaler)

### Edge Case
- ✓ `US-5.E2-E1-01-declencheur.png` — une clé invalide collée — clé volontairement invalide collée dans le champ des péages (PTV, masquée)
- ✓ `US-5.E2-E1-02-resultat.png` — Tester la connexion : « Clé refusée par PTV (401) » — vrai appel à api.myptv.com → HTTP 401 → « Clé refusée par PTV (401) » (état ko)
- ✓ `US-5.E2-E1-03-retour.png` — Enregistrer garde l'ancien fournisseur actif (PTV) — HERE + clé invalide + Enregistrer : refusé par le vrai HERE (401), le fournisseur actif reste PTV après rechargement (base : actif = ptv)

### Issues Found
- aucune sur la version déployée à cette passe.

## US-5.E3 — Bascule de secours

### Happy Path
- (rien à signaler)

### Edge Case
- ✗ `US-5.E3-E1-01-declencheur.png` — PTV en panne et HERE enregistré en secours — expect(received).toEqual(expected) // deep equality  - Expected  - 1 + Received  + 1
- ✓ `US-5.E3-E1-02-resultat.png` — je calcule un trajet : la chaîne PTV → HERE est parcourue — calcul réel : la fonction essaie PTV (401) puis HERE (401) ; les deux refusent, « Péages non disponibles pour l'instant », coût carburant conservé
- ✓ `US-5.E3-E1-03-retour.png` — l'écran Moteurs note l'incident (la bascule réussie est bloquée faute de clé HERE) — l'écran Moteurs note l'incident avec l'heure : « Dernier incident · PTV : clé refusée (401) · 20/10 18:32 » ; BLOQUÉ-CLÉ : la bascule réussie vers HERE (« Bascule PTV → HERE le … ») exige une clé HERE valide — bascule_le = null

### Issues Found
- BLOQUÉ-CLÉ : US-5.E3 (péages venant de HERE quand PTV tombe, bascule notée avec l'heure) : il manque une clé HERE valide (et une clé PTV valide pour provoquer une vraie panne côté PTV). La chaîne actif → secours, l'incident horodaté et la note de bascule sont construits et testés unitairement (executerChaine).

## US-A11Y-001 — Navigation au clavier (jalon 3)

### Happy Path
- ✓ `US-A11Y-001-01-m3.png` — écran Moteurs avant Tab — écran Moteurs (S5) avant le parcours au clavier
- ✓ `US-A11Y-001-02-m3.png` — Tab/Maj+Tab : ordre de lecture et contour visible sur l'écran Moteurs — 25 contrôles parcourus : Moteurs (administration) → ← Retour → Fournisseur · Prix des stations → Tester la connexion → Enregistrer → Fournisseur · Prix moyens par pays → Tester la connexion → Enregistrer → Fournisseur · Itinéraire → Secours · Itinéraire → Tester la connexion → Enregistrer → Fournisseur · Péages → Secours · Péages… ; tous avec contour visible, dans l'ordre de lecture

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

## US-A11Y-003 — Touche Échap (jalon 3)

### Happy Path
- ✓ `US-A11Y-003-01-m3.png` — la fiche est ouverte — fiche d'une station espagnole ouverte
- ✓ `US-A11Y-003-02-m3.png` — Échap ferme la fiche — Échap ferme la fiche

### Edge Case
- (rien à signaler)

### Issues Found
- ✗ l'histoire s'est arrêtée : locator.click: Timeout 30000ms exceeded. Call log: [2m  - waiting for locator('#voiture-marque')[22m [2m    - locator resolved to <button type="button" class="dd-btn" role="combobox" title="Peugeot" id="voiture-marque" aria-label="Marque" aria-controls=":r2:" aria-expanded="false" data-valeur="Peugeot" aria-haspopup="listbox">…</button>[22m

## US-A11Y-004 — Libellés lisibles (jalon 3)

### Happy Path
- ✓ `US-A11Y-004-01-m3.png` — stations espagnoles avant la lecture des libellés — stations espagnoles : carte et liste
- ✓ `US-A11Y-004-02-m3.png` — libellés : pastilles, prix et contrôles de l'écran Moteurs — 153 pastilles annoncées (ex. « Gratsa Barcelona · Gratsa, 1,869 euros le litre, plus cher ») ; 153 prix de liste annoncés en euros ; écran Moteurs : 0 contrôle sans nom ; bouton ⚙ nommé « Moteurs (administration) »

### Edge Case
- (rien à signaler)

### Issues Found
- aucune sur la version déployée à cette passe.

## US-PERF-001 — Ouverture rapide (jalon 3)

### Happy Path
- ✓ `US-PERF-001-01-m3.png` — avant l'ouverture (4G émulée) — contexte 4G émulée (latence 150 ms, 1,6 Mbit/s), position Barcelone, avant ouverture
- ✓ `US-PERF-001-02-m3.png` — la liste des stations s'affiche en moins de 2,5 s — liste affichée en 2000 ms (seuil 2 500 ms) à Barcelone avec 4G émulée
- ✓ (comparaison) Albi, même 4G émulée : 2005 ms.

### Edge Case
- (rien à signaler)

### Issues Found
- aucune sur la version déployée à cette passe.
