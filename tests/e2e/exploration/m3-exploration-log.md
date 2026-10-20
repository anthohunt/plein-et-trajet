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
