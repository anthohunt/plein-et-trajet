# Jalon 1 — Les prix autour de moi — journal d'exploration

Appli explorée : **https://plein-et-trajet.vercel.app** (déploiement de production, base Supabase réelle `rglrwtkqwihdztgqlbsy`, prix officiels synchronisés).
Outil : bibliothèque Playwright (Chromium headless), viewport 390×844, locale fr-FR, fuseau Europe/Paris, géolocalisation accordée à Albi (43.9289, 2.1464) sauf mention. Script : `tests/e2e/exploration/run-m1.mjs`. Chaque capture est prise par `page.screenshot` APRÈS les assertions DOM de l'étape ; ✓ = assertions passées, ✗ = échec (détail donné).
Captures : `tests/e2e/delivery/`.

Données de cas limites : **aucune fixture**. US-1.E3 (prix > 48 h), US-1.E4 (rupture temporaire de gazole) et US-2.E1 (station sans GPLc) utilisent de vraies stations du rayon de 10 km, choisies au moment du test par requête en base. US-1.E1 et US-1.E2 sont **MOCKED** par `page.route` comme le prévoit le cas d'usage.

## API Contract Check

- `POST rest/v1/rpc/stations_autour {lat, lon, rayon_m}` (src/lib/donnees.ts `stationsAutour`) → fonction `public.stations_autour(lat double precision, lon double precision, rayon_m integer default 10000)` renvoie `TABLE(id text, nom text, enseigne text, adresse text, cp text, ville text, lat double precision, lon double precision, services text[], automate_24_24 boolean, distance_km double precision)` ; interface `Station` du front : mêmes 11 champs, mêmes types (string / number / string[] / boolean) ✓. Écart au plan : le carburant n'est pas un paramètre de la RPC — les prix sont lus par l'appel suivant (une seule lecture de prix partagée par carte et liste ; c'est aussi l'URL que les cas US-1.E1/E2 interceptent).
- `GET rest/v1/prix?select=station_id,carburant,prix,maj,rupture&carburant=eq.X&rupture=eq.false&prix=not.is.null&station_id=in.(…)` (`prixCarburant`) → table `prix(station_id text, carburant text, prix numeric(5,3), maj timestamptz, rupture boolean)` ✓ ; `prix` numeric arrive en nombre JSON, converti par `Number()` ; valeurs de `carburant` = contrainte CHECK (`Gazole`,`SP95-E10`,`SP95`,`SP98`,`E85`,`GPLc`) = type `Carburant` du front ✓.
- `GET rest/v1/prix?select=station_id,carburant,prix,maj,rupture&station_id=eq.X` (`prixStation`, fiche S2) → mêmes colonnes ✓.
- `GET rest/v1/moyennes_nationales?select=jour,carburant,prix_moyen,nb_stations&carburant=eq.X&order=jour.desc&limit=1` (`moyenneNationale`) → table `moyennes_nationales(jour date, carburant text, prix_moyen numeric(5,3), nb_stations integer)` ✓ ; réponse réelle vérifiée : `{"jour":"2026-10-20","carburant":"Gazole","prix_moyen":2.367,"nb_stations":9052}`.
- Écritures interdites au front (RLS) vérifiées avec la clé anonyme : `POST rest/v1/prix` → 401, `POST rest/v1/rpc/sync_prix_appliquer` → 401, `POST functions/v1/sync-prix` sans secret → 401.

## US-1.1 — Ouvrir les prix

### Happy path
- ✓ `US-1.1-01-ouvrir-les-prix-avant.png` — appli ouverte sur l'onglet Trajets — onglet Trajets actif, écran Prix absent
- ✓ `US-1.1-02-ouvrir-les-prix-apres.png` — onglet Prix : carte + liste des stations autour de la position GPS (Albi) — 7 lignes, 7 pastilles, carte centrée sur la position (43.9289, 2.1464)

### Edge case — position refusée (refus réel : contexte sans permission de géolocalisation)
- ✓ `US-1.1-03-ouvrir-les-prix-avant.png` — position refusée, appli sur Trajets — permission géolocalisation = denied
- ✓ `US-1.1-04-ouvrir-les-prix-apres.png` — carte centrée sur Albi par défaut + message pour activer la localisation — message « Localisation désactivée : carte centrée sur Albi. Activez la localisation pour voir les stations autour de vous. », centre 43.9289, 2.1464 (Albi)

## US-1.2 — Choisir mon carburant

### Happy path
- ✓ `US-1.2-01-choisir-mon-carburant-avant.png` — liste en SP95-E10 — 7 stations en SP95-E10
- ✓ `US-1.2-02-choisir-mon-carburant-apres.png` — toutes les pastilles et lignes au prix gazole, titre « Stations · Gazole » — titre « Stations · Gazole » ; 12 lignes et 12 pastilles = prix gazole de la base (ex. TotalEnergies Albi 2.250)

### Edge case — station qui ne vend pas le carburant choisi (données réelles)
- ✓ `US-1.2-03-choisir-mon-carburant-avant.png` — station présente en SP95-E10, ne vend pas d'E85 — Carrefour Albi (81000001) affichée en SP95-E10 ; aucune ligne E85 en base pour elle
- ✓ `US-1.2-04-choisir-mon-carburant-apres.png` — elle disparaît de la carte et de la liste — Carrefour Albi absente de la liste et de la carte en E85 (5 stations E85 restantes)

### Issues found
- aucune

## US-1.3 — Voir les stations sur la carte

### Happy path
- ✓ `US-1.3-01-voir-les-stations-sur-la-carte-avant.png` — ouverture de l'écran Prix, stations synchronisées dans un rayon de 10 km — 15 stations synchronisées à moins de 10 km d'Albi en base (rpc stations_autour)
- ✓ `US-1.3-02-voir-les-stations-sur-la-carte-apres.png` — chaque station = une pastille à sa position réelle avec son prix — 7 pastilles, chacune à < 3 px de la position réelle de sa station, prix à 3 décimales
- ✓ `US-1.3-03-voir-les-stations-sur-la-carte-avant.png` — je déplace la carte (glisser à la souris, non relâché) — glisser en cours (bouton souris enfoncé), centre 43.901, 1.896
- ✓ `US-1.3-04-voir-les-stations-sur-la-carte-apres.png` — relâché : les stations de la nouvelle zone se chargent — nouvel appel stations_autour(43.900, 1.887, 5813 m) ; 3 nouvelles stations, ex. Leclerc Brens

### Issues found
- Passe précédente : le glisser « à l'aveugle » de 480 px vers l'ouest tombait sur une zone sans station SP95-E10 (état vide, légitime) et l'assertion « nouvelles stations » échouait ; le geste vise maintenant Gaillac (stations réelles). Rejoué 3 fois de suite : 3/3 ✓.
## US-1.4 — Toucher une pastille

### Happy path
- ✓ `US-1.4-01-toucher-une-pastille-avant.png` — carte affichée — 7 pastilles, aucune fiche ouverte
- ✓ `US-1.4-02-toucher-une-pastille-apres.png` — la fiche de cette station s'ouvre — pastille « Esso Express Albi, 2,191 euros le litre, plus cher » → fiche « Esso Express Albi »

### Edge case — prix différents : moitié verte / moitié orange
- ✓ `US-1.4-03-toucher-une-pastille-avant.png` — des prix différents autour de moi (gazole) — 12 pastilles gazole, 10 prix différents
- ✓ `US-1.4-04-toucher-une-pastille-apres.png` — moitié la moins chère en vert, l'autre en orange — 6 vertes (≤ 2.373) / 6 orange (≥ 2.383) ; ombre verte rgb(31,138,76), orange rgb(194,73,29)

### Issues found
- aucune

## US-1.5 — Trier la liste

### Happy path
- ✓ `US-1.5-01-trier-la-liste-avant.png` — liste triée par prix — tri prix : 1.990 ≤ 2.182 ≤ 2.182 ≤ 2.182 ≤ 2.182 ≤ 2.182 ≤ 2.191
- ✓ `US-1.5-02-trier-la-liste-apres.png` — « Plus proche » : distance croissante — tri distance : 1.7 ≤ 1.9 ≤ 2.1 ≤ 2.4 ≤ 3.0 ≤ 3.3 ≤ 6.7 km

### Edge case — retour au tri par prix
- ✓ `US-1.5-03-trier-la-liste-avant.png` — tri par distance — tri par distance actif
- ✓ `US-1.5-04-trier-la-liste-apres.png` — « Moins cher » : prix croissant — tri prix : 1.990 ≤ 2.182 ≤ 2.182 ≤ 2.182 ≤ 2.182 ≤ 2.182 ≤ 2.191

### Issues found
- aucune

## US-1.6 — Lire une station dans la liste

### Happy path
- ✓ `US-1.6-01-lire-une-station-dans-la-liste-avant.png` — liste affichée — 7 lignes affichées
- ✓ `US-1.6-02-lire-une-station-dans-la-liste-apres.png` — enseigne, distance, ancienneté, écart à la moyenne France, prix à 3 décimales — « TotalEnergies Albi | 2,1 km · il y a 4 h · −17,0 c vs France | 1.990 €/L » (enseigne en base : TotalEnergies)

### Edge case — toucher la ligne
- ✓ `US-1.6-03-lire-une-station-dans-la-liste-avant.png` — une ligne de station — ligne « Carrefour Albi » sous le doigt
- ✓ `US-1.6-04-lire-une-station-dans-la-liste-apres.png` — sa fiche s'ouvre — fiche « Carrefour Albi » ouverte

### Issues found
- aucune

## US-2.1 — Fermer la fiche

### Happy path
- ✓ `US-2.1-01-fermer-la-fiche-avant.png` — fiche station ouverte — fiche « TOTALENERGIES ALBI » ouverte, carburant Gazole
- ✓ `US-2.1-02-fermer-la-fiche-apres.png` — la fiche se ferme, le carburant choisi n'a pas changé — fiche fermée (bouton ✕), carburant toujours Gazole (Échap : voir US-A11Y-003)

### Issues found
- aucune

## US-2.2 — Calculer un trajet vers la station

### Happy path
- ✓ `US-2.2-01-calculer-un-trajet-vers-la-station-avant.png` — fiche d'une station — fiche « TotalEnergies Albi », adresse en base « 40 ROUTE DE CORDES, 81000 Albi »
- ✓ `US-2.2-02-calculer-un-trajet-vers-la-station-apres.png` — onglet Trajets avec l'arrivée pré-remplie à l'adresse de la station — onglet Trajets, champ Arrivée = « 40 ROUTE DE CORDES, 81000 Albi »

### Issues found
- Écran Trajets volontairement réduit au jalon 1 (départ, arrivée) : calcul au jalon 2.

## US-1.E1 — Source des prix injoignable

### Edge case — MOCKED: page.route('**/rest/v1/prix*', abort) — coupure réseau impossible à provoquer sur la vraie base sans la casser pour tous
- ✓ `US-1.E1-E1-01-declencheur.png` — lecture des prix en erreur réseau (MOCKED) — MOCKED: lecture des prix interceptée et coupée (abort) ; appli sur Trajets
- ✓ `US-1.E1-E1-02-resultat.png` — l'écran Prix s'ouvre en erreur — message « Prix indisponibles pour l'instant » + bouton Réessayer à la place de la liste, 0 pastille
- ✓ `US-1.E1-E1-03-retour.png` — retour à l'état normal après Réessayer — réseau rétabli + Réessayer : 7 stations réelles

### Issues found
- aucune

## US-1.E2 — Aucune station pour ce carburant

### Edge case — MOCKED: page.route('**/rest/v1/prix*carburant=eq.E85*', fulfill []) — il existe de vraies stations E85 autour d'Albi
- ✓ `US-1.E2-E1-01-declencheur.png` — aucune station du rayon ne vend E85 (MOCKED) — MOCKED: réponse vide pour E85 ; liste en SP95-E10
- ✓ `US-1.E2-E1-02-resultat.png` — je choisis E85 : liste vide, carte sans pastille — « Aucune station ne vend ce carburant autour de vous. », 0 pastille
- ✓ `US-1.E2-E1-03-retour.png` — retour à l'état normal (vraies stations E85) — données réelles rétablies : 5 stations E85, 5 pastilles

### Issues found
- aucune

## US-1.E3 — Prix ancien signalé

### Edge case — données réelles (pas de fixture) : station du rayon dont le prix déclaré a plus de 48 h
- ✓ `US-1.E3-E1-01-declencheur.png` — une station dont le prix date de plus de 48 h — station 81130001 : prix SP95-E10 déclaré le 2026-10-14T09:14:33+00:00 (> 48 h, lu en base)
- ✓ `US-1.E3-E1-02-resultat.png` — la liste s'affiche avec la mention « prix du JJ/MM » — ligne « Intermarché Cagnac-les-Mines » : « prix du 14/10 »
- ✓ `US-1.E3-E1-03-retour.png` — mention en couleur atténuée ; les prix récents restent normaux — atténuée : couleur rgb(93, 99, 95) (nom rgb(21, 24, 26)), opacité 0.8, italic, totem atténué ; à côté, ligne récente « TotalEnergies Albi — 2,1 km · il y a 4 h · −17,0 c vs France » normale (données réelles : rien à rétablir)

### Issues found
- aucune

## US-1.E4 — Station en rupture

### Edge case — données réelles (pas de fixture) : rupture temporaire de gazole déclarée dans le flux officiel
- ✓ `US-1.E4-E1-01-declencheur.png` — une station en rupture temporaire de gazole — TotalEnergies Albi (81000004) : ligne Gazole en base rupture=true ; visible en GPLc
- ✓ `US-1.E4-E1-02-resultat.png` — je choisis Gazole : elle n'apparaît pas — en Gazole, liste triée par prix (12 stations) sans TotalEnergies Albi
- ✓ `US-1.E4-E1-03-retour.png` — retour à l'état normal — retour en GPLc : TotalEnergies Albi réapparaît (elle vend toujours ce carburant)

### Issues found
- aucune

## US-2.E1 — Carburant non vendu dans la fiche

### Edge case — données réelles : station du rayon sans aucune ligne GPLc en base
- ✓ `US-2.E1-E1-01-declencheur.png` — une station sans GPLc — TotalEnergies Albi (81000002) : aucune ligne GPLc en base
- ✓ `US-2.E1-E1-02-resultat.png` — j'ouvre sa fiche : la ligne GPLc affiche « non vendu » — fiche « TotalEnergies Albi » : GPLc « non vendu », 3 carburants avec prix
- ✓ `US-2.E1-E1-03-retour.png` — retour à l'état normal — fiche fermée, liste normale (données réelles : rien à rétablir)

### Issues found
- aucune

## US-1.P1 — Recentrer sur ma position

### Happy path
- ✓ `US-1.P1-01-recentrer-sur-ma-position-avant.png` — carte déplacée — carte déplacée à 9.5 km de ma position
- ✓ `US-1.P1-02-recentrer-sur-ma-position-apres.png` — la carte revient sur ma position et la liste se recharge — carte revenue sur ma position ; liste rechargée par stations_autour(43.9289, 2.1464, 10000 m)

### Issues found
- aucune

## US-A11Y-001 — Navigation au clavier

- ✓ `US-A11Y-001-01-m1.png` — S1 : Tab parcourt carburants, carte, pastilles… dans l'ordre de lecture — Tab ×12 (S1) : Gazole → SP95-E10 → SP95 → SP98 → E85 → GPLc → Carte des stations → Esso Express Albi, 2,191 euros → Carrefour Albi, 2,182 euros le → TotalEnergies Albi, 1,990 euro → Intermarché Le Sequestre, 2,18 → Leclerc Lescure-d'Albigeois, 2 ; ordre du document respecté, contour visible (solid 3px)
- ✓ `US-A11Y-001-02-m1.png` — Maj+Tab remonte l'ordre ; dans la fiche, Tab va du titre au bouton fermer puis au bouton trajet, contour visible — Maj+Tab depuis l'onglet Trajets : Prix ← Esso Express Albi1,7 km · il y a 1 h · + ← Intermarché Cagnac-les-Mines6,7 km · pri ; S2 : titre → « Fermer la fiche » → « Coût d'un trajet jusqu'ici » (contour solid)

## US-A11Y-002 — Focus de la fiche

- ✓ `US-A11Y-002-01-m1.png` — la fiche s'ouvre, le focus va sur son titre — ouverte au clavier (Entrée sur la ligne 81990002) : focus sur le titre « INTERMARCHÉ LE SEQUESTRE »
- ✓ `US-A11Y-002-02-m1.png` — à la fermeture le focus revient sur l'élément qui l'a ouverte — fermée : le focus revient sur la ligne 81990002 ; idem depuis la pastille 81000005 (bouton ✕)

## US-A11Y-003 — Touche Échap

- ✓ `US-A11Y-003-01-m1.png` — fiche station ouverte avant Échap — fiche ouverte, j'appuie sur Échap
- ✓ `US-A11Y-003-02-m1.png` — la fiche se ferme — Échap : fiche fermée

## US-A11Y-004 — Libellés lisibles

- ✓ `US-A11Y-004-01-m1.png` — chaque pastille annonce station et prix en euros — 7 pastilles annoncées (ex. « Esso Express Albi, 2,191 euros le litre, plus cher ») ; prix de liste : « 1,990 euros le litre » ; arbre a11y ligne : - button "TotalEnergies Albi 2,1 km · il y a 4 h · −17,0 c vs France 1,990 euros le litre": - text: TotalEnergies Albi 2,1 km · il y a 4 h · −17,0 c vs France - img "1,990 euros le litre"
- ✓ `US-A11Y-004-02-m1.png` — chaque bouton icône a un libellé — boutons icônes : Recentrer sur ma position, Fermer la fiche — tous libellés

## US-PERF-001 — Ouverture rapide

- ✓ `US-PERF-001-01-m1.png` — j'ouvre l'appli (4G simulée) — navigation lancée en 4G simulé (9 Mbit/s, 85 ms), cache désactivé, t=127 ms
- ✓ `US-PERF-001-02-m1.png` — la liste des stations est affichée en moins de 2,5 s — liste affichée en 1071 ms (< 2 500 ms) ; domInteractive 129 ms

## Bilan

- **55 captures** produites, 55 ✓ (le cas d'usage `m1-use-case.md` en définit 55 : 45 d'histoires + 10 transverses ; le chiffre « 60 » du brief ne correspond pas au fichier).
- Extraits Playwright : `tests/e2e/exploration/m1-test-snippets/` (19 fichiers, 24 tests), joués contre la production : **24/24 passés** (`npx playwright test`).
- MOCKED : US-1.E1 (abort de `rest/v1/prix`), US-1.E2 (réponse vide pour E85). Tout le reste sur données réelles.
- Bugs trouvés pendant l'exploration, corrigés, redéployés, captures reprises :
  1. MapLibre remplaçait l'`aria-label` des pastilles par « Map marker » (US-A11Y-004).
  2. Pointe des pastilles décalée de 8 px sous la station (US-1.3).
  3. Au changement de carburant, les prix de l'ancien carburant restaient affichés quelques instants sous le nouveau titre (US-1.2).
  4. Deux stations distinctes affichées « TotalEnergies Albi » : libellés désormais départagés par le nom officiel (US-1.6).
  5. Le focus du titre de la fiche faisait défiler toute l'appli (US-A11Y-002) ; légende et crédits de carte couvraient des pastilles.


# Round 2 — après l'audit R1 (commit 861033d, production)

Toutes les captures sont reprises (les 55). Les bandeaux orange « Annotation de test — … » et les surlignages pointillés orange sont ajoutés par le script pour la photo (absents de l'appli) puis retirés. Avant chaque photo, le script attend les tuiles de la carte et la fin des animations.

## US-1.1 — Ouvrir les prix

### Happy path
- ✓ `US-1.1-01-ouvrir-les-prix-avant.png` — appli ouverte sur l'onglet Trajets — onglet Trajets actif, écran Prix absent
- ✓ `US-1.1-02-ouvrir-les-prix-apres.png` — onglet Prix : carte + liste des stations autour de la position GPS (Albi) — 7 lignes, 7 pastilles, carte centrée sur la position (43.9289, 2.1464)

### Edge case — position refusée (refus réel : contexte sans permission de géolocalisation)
- ✓ `US-1.1-03-ouvrir-les-prix-avant.png` — position refusée, appli sur Trajets — permission géolocalisation = denied
- ✓ `US-1.1-04-ouvrir-les-prix-apres.png` — carte centrée sur Albi par défaut + message pour activer la localisation — message « Localisation désactivée : carte centrée sur Albi. Activez la localisation pour voir les stations autour de vous. », centre 43.9289, 2.1464 (Albi)
- ✓ (sans capture) dernière ville saisie : « Castres » tapé dans Départ → mémorisé (géocodage IGN) → au rechargement sans localisation, message « carte centrée sur Castres », centre 43.609, 2.245

## US-1.2 — Choisir mon carburant

### Happy path
- ✓ `US-1.2-01-choisir-mon-carburant-avant.png` — liste en SP95-E10 — 7 stations en SP95-E10
- ✓ `US-1.2-02-choisir-mon-carburant-apres.png` — toutes les pastilles et lignes au prix gazole, titre « Stations · Gazole » — titre « Stations · Gazole » ; 12 lignes et 12 pastilles = prix gazole de la base (ex. TotalEnergies Albi · Relais des Fontanelles 2.250)

### Edge case — station qui ne vend pas le carburant choisi (données réelles)
- ✓ `US-1.2-03-choisir-mon-carburant-avant.png` — station présente en SP95-E10, ne vend pas d'E85 — Carrefour Albi (81000001) affichée en SP95-E10 ; aucune ligne E85 en base pour elle
- ✓ `US-1.2-04-choisir-mon-carburant-apres.png` — elle disparaît de la carte et de la liste — Carrefour Albi absente de la liste et de la carte en E85 (5 stations E85 restantes)

### Issues found
- aucune

## US-1.3 — Voir les stations sur la carte

### Happy path
- ✓ `US-1.3-01-voir-les-stations-sur-la-carte-avant.png` — ouverture de l'écran Prix, stations synchronisées dans un rayon de 10 km — 15 stations synchronisées à moins de 10 km d'Albi en base (rpc stations_autour) ; écran chargé : 7 lignes, 7 pastilles
- ✓ `US-1.3-02-voir-les-stations-sur-la-carte-apres.png` — chaque station = une pastille à sa position réelle avec son prix — 7 pastilles, chacune à < 3 px de la position réelle de sa station, prix à 3 décimales
- ✓ `US-1.3-03-voir-les-stations-sur-la-carte-avant.png` — je déplace la carte (un seul glisser, non relâché) : la liste montre encore Albi — un seul glisser de 158 px, bouton encore enfoncé : carte à 7.1 km au nord d'Albi (43.992, 2.153, vers Carmaux), liste encore celle d'Albi (TotalEnergies Albi · Relais des Fontanelles, Carrefour Albi…), aucun nouvel appel
- ✓ `US-1.3-04-voir-les-stations-sur-la-carte-apres.png` — relâché : les stations de la nouvelle zone se chargent — nouvel appel stations_autour(43.992, 2.153, 9424 m) ; 2 nouvelles stations, ex. Système U Blaye-les-Mines

### Issues found
- aucune

## US-1.4 — Toucher une pastille

### Happy path
- ✓ `US-1.4-01-toucher-une-pastille-avant.png` — carte affichée — 7 pastilles, aucune fiche ouverte
- ✓ `US-1.4-02-toucher-une-pastille-apres.png` — la fiche de cette station s'ouvre — pastille « Esso Express Albi, 2,191 euros le litre, plus cher » → fiche « Esso Express Albi »

### Edge case — prix différents : moitié verte / moitié orange
- ✓ `US-1.4-03-toucher-une-pastille-avant.png` — des prix différents autour de moi (gazole) — 12 pastilles gazole, 10 prix différents
- ✓ `US-1.4-04-toucher-une-pastille-apres.png` — moitié la moins chère en vert, l'autre en orange — 6 vertes (≤ 2.373) / 6 orange (≥ 2.383) ; ombre verte rgb(31,138,76), orange rgb(194,73,29)

### Issues found
- aucune

## US-1.5 — Trier la liste

### Happy path
- ✓ `US-1.5-01-trier-la-liste-avant.png` — liste triée par prix — tri prix : 1.990 ≤ 2.182 ≤ 2.182 ≤ 2.182 ≤ 2.182 ≤ 2.182 ≤ 2.191
- ✓ `US-1.5-02-trier-la-liste-apres.png` — « Plus proche » : distance croissante — tri distance : 1.7 ≤ 1.9 ≤ 2.1 ≤ 2.4 ≤ 3.0 ≤ 3.3 ≤ 6.7 km

### Edge case — retour au tri par prix
- ✓ `US-1.5-03-trier-la-liste-avant.png` — tri par distance — tri par distance actif
- ✓ `US-1.5-04-trier-la-liste-apres.png` — « Moins cher » : prix croissant — tri prix : 1.990 ≤ 2.182 ≤ 2.182 ≤ 2.182 ≤ 2.182 ≤ 2.182 ≤ 2.191

### Issues found
- aucune

## US-1.6 — Lire une station dans la liste

### Happy path
- ✓ `US-1.6-01-lire-une-station-dans-la-liste-avant.png` — liste affichée — 7 lignes affichées
- ✓ `US-1.6-02-lire-une-station-dans-la-liste-apres.png` — enseigne, distance, ancienneté, écart à la moyenne France, prix à 3 décimales — « TotalEnergies Albi · Relais des Fontanelles | 2,1 km · il y a 5 h · −17,0 c vs France | 1.990 €/L » (enseigne en base : TotalEnergies)

### Edge case — toucher la ligne
- ✓ `US-1.6-03-lire-une-station-dans-la-liste-avant.png` — une ligne de station — ligne « Carrefour Albi » sous le doigt
- ✓ `US-1.6-04-lire-une-station-dans-la-liste-apres.png` — sa fiche s'ouvre — fiche « Carrefour Albi » ouverte

### Issues found
- aucune

## US-2.1 — Fermer la fiche

### Happy path
- ✓ `US-2.1-01-fermer-la-fiche-avant.png` — fiche station ouverte — fiche « TOTALENERGIES ALBI · RELAIS DES FONTANELLES » ouverte, carburant Gazole
- ✓ `US-2.1-02-fermer-la-fiche-apres.png` — la fiche se ferme, le carburant choisi n'a pas changé — fiche fermée (bouton ✕), carburant toujours Gazole (Échap : voir US-A11Y-003)

### Issues found
- aucune

## US-2.2 — Calculer un trajet vers la station

### Happy path
- ✓ `US-2.2-01-calculer-un-trajet-vers-la-station-avant.png` — fiche d'une station — fiche « TotalEnergies Albi · Relais des Fontanelles », adresse en base « 40 ROUTE DE CORDES, 81000 Albi »
- ✓ `US-2.2-02-calculer-un-trajet-vers-la-station-apres.png` — onglet Trajets avec l'arrivée pré-remplie à l'adresse de la station — onglet Trajets, champ Arrivée = « 40 ROUTE DE CORDES, 81000 Albi »

### Issues found
- Écran Trajets volontairement réduit au jalon 1 (départ, arrivée) : calcul au jalon 2.

## US-1.E1 — Source des prix injoignable

### Edge case — MOCKED: page.route('**/rest/v1/prix*', abort) — coupure réseau impossible à provoquer sur la vraie base sans la casser pour tous
- ✓ `US-1.E1-E1-01-declencheur.png` — lecture des prix en erreur réseau (MOCKED) — MOCKED: lecture des prix interceptée et coupée (abort) ; appli sur Trajets
- ✓ `US-1.E1-E1-02-resultat.png` — l'écran Prix s'ouvre en erreur — message « Prix indisponibles pour l'instant » + bouton Réessayer à la place de la liste, 0 pastille
- ✓ `US-1.E1-E1-03-retour.png` — retour à l'état normal après Réessayer — réseau rétabli + Réessayer : 7 stations réelles

### Issues found
- aucune

## US-1.E2 — Aucune station pour ce carburant

### Edge case — MOCKED: page.route('**/rest/v1/prix*carburant=eq.E85*', fulfill []) — il existe de vraies stations E85 autour d'Albi
- ✓ `US-1.E2-E1-01-declencheur.png` — aucune station du rayon ne vend E85 (MOCKED) — MOCKED: réponse vide pour E85 ; liste en SP95-E10
- ✓ `US-1.E2-E1-02-resultat.png` — je choisis E85 : liste vide, carte sans pastille — « Aucune station ne vend ce carburant autour de vous. », 0 pastille
- ✓ `US-1.E2-E1-03-retour.png` — retour à l'état normal (vraies stations E85) — données réelles rétablies : 5 stations E85, 5 pastilles

### Issues found
- aucune

## US-1.E3 — Prix ancien signalé

### Edge case — données réelles (pas de fixture) : station du rayon dont le prix déclaré a plus de 48 h
- ✓ `US-1.E3-E1-01-declencheur.png` — une station dont le prix date de plus de 48 h — station 81130001 : prix SP95-E10 déclaré le 2026-10-14T09:14:33+00:00 (> 48 h, lu en base)
- ✓ `US-1.E3-E1-02-resultat.png` — la liste s'affiche avec la mention « prix du JJ/MM » — ligne « Intermarché Cagnac-les-Mines » : « prix du 14/10 »
- ✓ `US-1.E3-E1-03-retour.png` — mention en couleur atténuée ; les prix récents restent normaux — atténuée : couleur rgb(93, 99, 95) (nom rgb(21, 24, 26)), opacité 0.8, italic, totem atténué ; à côté, ligne récente « TotalEnergies Albi · Relais des Fontanelles — 2,1 km · il y a 5 h · −17,0 c vs France » normale (données réelles : rien à rétablir)

### Issues found
- aucune

## US-1.E4 — Station en rupture

### Edge case — données réelles (pas de fixture) : rupture temporaire de gazole déclarée dans le flux officiel
- ✓ `US-1.E4-E1-01-declencheur.png` — une station en rupture temporaire de gazole — TotalEnergies Albi · Auto 81 Sarl (81000004) : ligne Gazole en base rupture=true ; visible en GPLc
- ✓ `US-1.E4-E1-02-resultat.png` — je choisis Gazole : elle n'apparaît pas — en Gazole, liste triée par prix (12 stations) sans TotalEnergies Albi · Auto 81 Sarl
- ✓ `US-1.E4-E1-03-retour.png` — retour à l'état normal — retour en GPLc : TotalEnergies Albi · Auto 81 Sarl réapparaît (elle vend toujours ce carburant)

### Issues found
- aucune

## US-2.E1 — Carburant non vendu dans la fiche

### Edge case — données réelles : station du rayon sans aucune ligne GPLc en base
- ✓ `US-2.E1-E1-01-declencheur.png` — une station sans GPLc — TotalEnergies Albi · Relais des Fontanelles (81000002) : aucune ligne GPLc en base
- ✓ `US-2.E1-E1-02-resultat.png` — j'ouvre sa fiche : la ligne GPLc affiche « non vendu » — fiche « TotalEnergies Albi · Relais des Fontanelles » : GPLc « non vendu », 3 carburants avec prix
- ✓ `US-2.E1-E1-03-retour.png` — retour à l'état normal — fiche fermée, liste normale (données réelles : rien à rétablir)

### Issues found
- aucune

## US-1.P1 — Recentrer sur ma position

### Happy path
- ✓ `US-1.P1-01-recentrer-sur-ma-position-avant.png` — carte déplacée — carte déplacée à 15.6 km de ma position
- ✓ `US-1.P1-02-recentrer-sur-ma-position-apres.png` — la carte revient sur ma position et la liste se recharge — carte revenue sur ma position ; liste rechargée par stations_autour(43.9289, 2.1464, 10000 m)

### Issues found
- aucune

## US-A11Y-001 — Navigation au clavier

- ✓ `US-A11Y-001-01-m1.png` — Tab : carburants, carte puis pastilles visibles, dans l'ordre de lecture, contour visible — Tab ×9 : Gazole → SP95-E10 → SP95 → SP98 → E85 → GPLc → Carte des stations → Esso Express Albi, 2,191 euros le  → Carrefour Albi, 2,182 euros le lit ; ordre du document, chaque élément focalisé visible dans son cadre avec un contour ≥ 2 px ; arrêt sur une pastille
- ✓ `US-A11Y-001-02-m1.png` — Maj+Tab remonte l'ordre, contour visible sur l'élément atteint — suite Tab ×16 jusqu'à l'onglet Prix, tous visibles (1 pastille(s) hors cadre exclue(s) du parcours) ; Maj+Tab ×2 : « Esso Express Albi1,7 km · il y a 1 » ← « Intermarché Cagnac-les-Mines6,7 km » (contour visible)
- (sans capture) S2 : Tab depuis le titre → « Fermer la fiche » → « Coût d'un trajet jusqu'ici », visibles : true, contour : true

## US-A11Y-002 — Focus de la fiche

- ✓ `US-A11Y-002-01-m1.png` — la fiche s'ouvre, le focus va sur son titre — ouverte au clavier (Entrée sur la ligne 81990002) : focus sur le titre « Intermarché Le Sequestre »
- ✓ `US-A11Y-002-02-m1.png` — à la fermeture (Échap) le focus revient sur la ligne qui l'a ouverte, contour visible — juste après Échap : focus revenu sur la ligne 81990002 « Intermarché Le Sequestre2,4 km · i », contour visible
- (sans capture) depuis la pastille 81000005 : Entrée → focus titre ; Tab + Entrée sur ✕ → focus revenu sur la pastille

## US-A11Y-003 — Touche Échap

- ✓ `US-A11Y-003-01-m1.png` — fiche station ouverte avant Échap — fiche ouverte, j'appuie sur Échap
- ✓ `US-A11Y-003-02-m1.png` — la fiche se ferme — Échap : fiche fermée

## US-A11Y-004 — Libellés lisibles

- ✓ `US-A11Y-004-01-m1.png` — chaque pastille annonce station et prix en euros — 7 pastilles annoncées (ex. « Esso Express Albi, 2,191 euros le litre, plus cher ») ; prix de liste : « 1,990 euros le litre » ; arbre a11y ligne : - button "TotalEnergies Albi · Relais des Fontanelles 2,1 km · il y a 5 h · −17,0 c vs France 1,990 euros le litre": - text: TotalEnergies Albi · Relais des Fontanelles 2,1 km · il y a 5 h · −17,0 c vs France - img "1,990 euros le litre"
- ✓ `US-A11Y-004-02-m1.png` — fiche aux prix chargés ; chargement annoncé ; chaque bouton icône a un libellé — fiche chargée (3 prix annoncés, ex. « 2,250 euros le litre ») ; pendant le chargement : - status: Chargement des prix de la station… - text: Gazole SP95-E10 SP95 SP98 E85 GPLc… ; boutons icônes : Recentrer sur ma position, Fermer la fiche

## US-PERF-001 — Ouverture rapide

- ✓ `US-PERF-001-01-m1.png` — j'ouvre l'appli (4G simulée) — navigation lancée en 4G simulée (9 Mbit/s, 85 ms), cache désactivé, t=119 ms
- ✓ `US-PERF-001-02-m1.png` — la liste des stations est affichée en moins de 2,5 s — liste affichée en 1099 ms (< 2 500 ms) ; domInteractive 123 ms

## Bilan Round 2

- **55/55 captures reprises sur la production (commit 861033d), 55 ✓** ; les 55 PNG ont été ouverts (planches contact) après la prise.
- Extraits Playwright (19 fichiers, 25 tests) contre la production : **25/25, deux passes de suite (50/50)**.
- Retours de l'audit R1 traités :
  1. US-1.3 — un seul glisser continu ; 03 pris bouton enfoncé (liste encore Albi, aucun appel), 04 après relâchement (Système U Blaye-les-Mines, Intermarché Carmaux surlignées).
  2. US-1.E4 — libellés départagés sur toutes les stations de la zone : « TotalEnergies Albi · Auto 81 Sarl » est identifiable et absente en Gazole.
  3. US-A11Y-001 — pastilles hors cadre ou sous un contrôle retirées du parcours clavier ; le test vérifie que chaque élément focalisé est visible dans son cadre avec un contour ≥ 2 px.
  4. US-A11Y-002 — 002-02 prise juste après Échap, focus visible sur la ligne d'origine.
  5. Carte — cadrage centré sur l'utilisateur à l'échelle des stations proches, pastilles qui se chevauchent empilées avec une tige, légende en bas à gauche, crédits repliés.
  6. US-1.1 — dernière ville saisie mémorisée (géocodage IGN au départ du champ) : vérifié (Castres).
  7. US-1.4 — moitié la moins chère : coupure entre deux prix distincts ; tests Vitest ajoutés (cas Gaillac, cas Albi).
  8. 1.3-01 montre l'écran chargé.
  9. US-A11Y-004 — chargement de la fiche annoncé par un statut « Chargement des prix de la station… » ; 004-02 prise prix chargés.
- Bugs trouvés en plus pendant ce round : relâcher un glisser au-dessus de la légende laissait la carte « collée » au pointeur (légende sans pointeur désormais) ; puces de carburant qui débordaient à 390 px (GPLc à moitié hors écran) ; contour de focus du bouton de crédits masqué par MapLibre ; course entre changement de carburant et attribut de comptage des pastilles.


# Round 3 — captures reprises après l'audit R2 (commit 5a91be5, production)

Seules les captures listées ci-dessous sont réécrites (variable SEULES du script) ; les autres étapes des mêmes histoires sont rejouées avec leurs assertions mais leurs PNG ne sont pas touchés.

## US-1.3 — Voir les stations sur la carte

### Happy path
- ✓ `US-1.3-04-voir-les-stations-sur-la-carte-apres.png` — relâché : les stations de la nouvelle zone se chargent — nouvel appel stations_autour(43.992, 2.153, 9424 m) ; 2 nouvelles stations, ex. Système U Blaye-les-Mines

### Issues found
- aucune

## US-1.E2 — Aucune station pour ce carburant

### Edge case — MOCKED: page.route('**/rest/v1/prix*carburant=eq.E85*', fulfill []) — il existe de vraies stations E85 autour d'Albi
- ✓ `US-1.E2-E1-01-declencheur.png` — aucune station du rayon ne vend E85 (MOCKED) — MOCKED: réponse vide pour E85 ; liste en SP95-E10
- ✓ `US-1.E2-E1-02-resultat.png` — je choisis E85 : liste vide, carte sans pastille — « Aucune station ne vend ce carburant autour de vous. », 0 pastille

### Issues found
- aucune

## US-1.P1 — Recentrer sur ma position

### Happy path
- ✓ `US-1.P1-01-recentrer-sur-ma-position-avant.png` — carte déplacée — carte déplacée à 15.8 km de ma position

### Issues found
- aucune

## US-1.E4 — Station en rupture

### Edge case — données réelles (pas de fixture) : rupture temporaire de gazole déclarée dans le flux officiel
- ✓ `US-1.E4-E1-01-declencheur.png` — une station en rupture temporaire de gazole : sa fiche affiche « GAZOLE rupture » — fiche « TotalEnergies Albi · Auto 81 Sarl » (81000004) ouverte en GPLc : ligne GAZOLE « rupture » affichée par l'appli (en base : Gazole rupture=true)
- ✓ `US-1.E4-E1-02-resultat.png` — je choisis Gazole : elle n'apparaît pas (liste complète) — en Gazole, les 12 lignes triées par prix sont toutes à l'écran (fenêtre agrandie à 1376 px de haut pour cette seule capture), aucune n'est « TotalEnergies Albi · Auto 81 Sarl », le bandeau ne couvre aucune ligne

### Issues found
- aucune

## Bilan Round 3

- **6 PNG réécrits** (vérifié par md5 : aucun autre n'a changé), tous par `page.screenshot` sur la production, tous ouverts : 1.3-04, E4-01, E4-02, E2-01, E2-02, P1-01.
- E4-02 : nom de fichier du plan conservé, sans suffixe ; la fenêtre est agrandie à 1 376 px de haut pour cette seule capture afin que les 12 lignes Gazole soient à l'écran ; le script vérifie que le bandeau ne couvre aucune ligne.
- E4-01 : la rupture est montrée par l'appli (fiche ouverte, « GAZOLE rupture ») ; plus de bandeau.
- 1.3-04 : la liste défile jusqu'aux deux nouvelles stations, le script vérifie qu'elles sont au-dessus du bandeau.
- E2-01/02 : le script attend l'état « idle » de la carte (tuiles chargées et dessinées) avant la photo.
- P1-01 : reprise parce que le libellé a changé (« Candeo Sarl » au lieu de « Indépendant sans enseigne », LOW 7).
- Vu en reprenant E4-01 et corrigé (commit 192cbde) : la fiche affichait « Prix mis à jour prix du 14/10 » ; elle affiche maintenant « Derniers prix déclarés le 14/10 ».
