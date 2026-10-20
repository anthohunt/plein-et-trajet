# Jalon 2 — Le coût d'un trajet — journal d'exploration

Appli explorée : **https://plein-et-trajet.vercel.app** (déploiement de production, base Supabase réelle `rglrwtkqwihdztgqlbsy` : prix officiels, véhicules ADEME, itinéraire et altimétrie IGN).
Outil : **bibliothèque Playwright** (Chromium headless), script `tests/e2e/exploration/run-m2.mjs` — il n'y a **pas de serveur Playwright MCP** dans cet environnement ; la bibliothèque est le substitut accepté, comme au jalon 1. Viewport 390×844, locale fr-FR, fuseau Europe/Paris, géolocalisation accordée à Albi sauf mention. Chaque capture est prise par `page.screenshot` APRÈS les assertions DOM de l'étape (✓ = assertions passées, ✗ = échec, détail donné). Captures : `tests/e2e/delivery/` (le plan cite `tests/e2e/screenshots/m2/`, dossier ignoré par git : `delivery/` fait foi, comme au jalon 1).
Identités : chaque contexte de navigateur crée sa propre session anonyme Supabase (aucun compte). L'historique et la voiture de l'exploration sont créés par le parcours de l'appli lui-même : **aucune donnée semée**.

**Mocks** : un seul, **MOCKED: US-4.E3 — délai de 3 s ajouté à la VRAIE requête `estimer-trajet` (`route.continue()` après attente)** ; un calcul réel dure 1 à 6 s selon la distance, ce qui ne garantit pas « plus d'une seconde » à la demande. Tout le reste est réel : « zzzz » par le vrai géocodeur IGN (réponse `features: []`), Corse par le vrai routeur IGN (`No path found` → 422 `pas_itineraire`), historique vide par une identité anonyme neuve, formulaire incomplet pour de vrai. Le plan proposait des mocks (`page.route` sur le géocodage, sur `estimer-trajet` en 422) : **non utilisés**, le vrai backend produit ces conditions.

## API Contract Check

- FE: src/lib/session.ts:12 `auth.signInAnonymously()` → BE: Supabase Auth (anonymous sign-ins activés, limite portée à 300/h pour l'exploration ; `rate_limit_anonymous_users`) — OK : utilisateur `is_anonymous`, rôle `authenticated`.
- FE: src/lib/vehicules.ts:19 `rpc("vehicules_marques")` → BE: supabase/migrations/20261020140000_trajets_vehicules.sql:24 `vehicules_marques() returns table(marque text)`, `grant execute … to anon, authenticated` (l.32) — OK (35 marques).
- FE: src/lib/vehicules.ts:26 `rpc("vehicules_modeles", {p_marque})` → BE: …sql:28 `vehicules_modeles(p_marque text) returns table(modele text)` (l.33) — OK.
- FE: src/lib/vehicules.ts:33 et :39 `from("vehicules").select("id,marque,modele,motorisation,carburant,masse_kg,puissance_kw")` → BE: …sql:4-22 table `vehicules` (mêmes colonnes), RLS `select to anon, authenticated using (true)` (l.21) — OK ; écriture avec la clé anonyme refusée (42501).
- FE: src/lib/vehicules.ts:58 `from("preferences").select("marque,modele,vehicule_id,carburant").maybeSingle()` → BE: …sql:36-51 table `preferences`, policy `select … using (user_id = auth.uid())` (l.48) — OK : sans filtre, la RLS ne laisse que la ligne de l'utilisateur ; une 2e session anonyme ne voit rien.
- FE: src/lib/vehicules.ts:66 `from("preferences").upsert({user_id, marque, modele, vehicule_id, carburant, maj}, {onConflict:"user_id"})` → BE: …sql:49-50 policies insert/update `with check (user_id = auth.uid())`, `grant select, insert, update` (l.51), clé primaire `user_id` — OK ; écrire la ligne d'un autre utilisateur → 42501.
- FE: src/lib/trajets.ts:39 `functions.invoke("estimer-trajet", {body:{depart:{lat,lon}, arrivee:{lat,lon}, vehicule_id}, signal})` → BE: supabase/functions/estimer-trajet/index.ts:96-118 (corps lu, `pointValide`, `vehicule_id` string non vide ; véhicule lu par `.eq("id", vehicule_id)` l.113) — OK ; JWT exigé (appel sans JWT → 401), `functions.invoke` envoie la session ou la clé anon.
- FE: src/lib/trajets.ts:41-61 lecture de la réponse `{km, duree_min, litres, l100, vehicule:{id,libelle,carburant,masse_kg}, troncons:[{type,voies,km,duree_min,vitesse_kmh,arrets,denivele_m,litres,l100}], avertissements}` → BE: index.ts:162-172 (mêmes champs et types ; tronçon = `Troncon` de supabase/functions/_shared/modele.ts) — OK.
- FE: src/lib/trajets.ts:46-49 statut 422 `{erreur:"pas_itineraire"}` lu par `error.context.json()` → BE: index.ts:127 et :134 (IGN 404 « No path found » → 422) — OK : Albi → Bastia donne bien HTTP 422 `{"erreur":"pas_itineraire"}` en réel. 404 `vehicule_inconnu` (index.ts:118), 400 `requete_invalide` (:104/:108) et 502 `itineraire_indisponible` sont traités côté front comme « indisponible » (message + Réessayer).
- FE: src/lib/trajets.ts:83 `from("trajets").select("*").order("cree_le",{ascending:false}).limit(30)` → BE: …sql:54-83 table `trajets`, policy lecture `user_id = auth.uid()` (l.79) — OK ; `km`, `litres`, `cout`, `prix_litre` (numeric) convertis par `Number()`, `troncons` jsonb = tableau.
- FE: src/lib/trajets.ts:117-127 `select("id")` filtré puis `update(ligne)` ou `insert({user_id, …ligne})` + `select("*").single()` → BE: …sql:80-81 policies insert/update `with check (user_id = auth.uid())`, `grant select, insert, update, delete` (l.83) ; colonnes de `ligne` = colonnes de la table (depart_label, depart_lat, depart_lon, arrivee_*, vehicule_id, vehicule_label, carburant, km, litres, prix_litre, cout, troncons, cree_le) — OK ; insertion sans session refusée (42501).
- FE: src/lib/trajets.ts:135 `from("trajets").delete({count:"exact"}).eq("id", id)` → BE: …sql:82 policy suppression `user_id = auth.uid()` — OK : count 1 sur sa ligne, count 0 sur celle d'un autre (le front lève alors « trajet introuvable » au lieu d'un faux succès).
- FE: src/lib/donnees.ts:59 `moyennes_nationales` (jalon 1) lue avec la session anonyme → BE: migration du jalon 1 `to anon, authenticated` — OK (la session persistante ne casse pas la lecture) ; `rpc stations_autour` idem.
- FE: src/lib/geocodage.ts `data.geopf.fr/geocodage/search?q=…&limit=…&index=address[&type=municipality]` (service IGN, sans clé) → réponse `features[].geometry.coordinates` [lon, lat] et `properties.{city,name,label,type,context}` — OK : « Alb » → Albi (commune) en tête, « zzzz » → `features: []`.
- Rejeu complet de ces appels, un par un, par `tests/e2e/exploration/m2-contrat-api.mjs` (2 sessions anonymes réelles, 25 contrôles, tous OK).

## US-3.1 — Ouvrir les trajets

### Happy Path
- ✓ `US-3.1-01-ouvrir-les-trajets-avant.png` — l'appli est sur l'onglet Prix — onglet Prix actif (liste des stations visible), écran Trajets absent
- ✓ `US-3.1-02-ouvrir-les-trajets-apres.png` — je touche l'onglet Trajets : formulaire et historique — formulaire (départ, arrivée, voiture, Calculer le coût) et section « Derniers trajets » affichés

### Edge Case
- (rien à signaler)

### Issues Found
- aucune sur la version déployée à cette passe.

## US-3.2 — Saisir le départ

### Happy Path
- ✓ `US-3.2-01-saisir-le-dpart-avant.png` — le champ départ est vide — champ départ vide, aucune proposition
- ✓ `US-3.2-02-saisir-le-dpart-apres.png` — je tape « Alb » : des propositions de lieux apparaissent — « Alb » → 6 propositions réelles du géocodeur IGN : Albi, Albertville, Albert, Albias, Albigny-sur-Saône, Alby-sur-Chéran
- ✓ je choisis « Albi » : le champ prend la valeur « Albi », la liste se ferme

### Edge Case
- ✓ saisie libre sans choisir : le lieu est résolu par le géocodeur au moment de Calculer (voir US-3.E1 pour le cas sans résultat)

### Issues Found
- aucune sur la version déployée à cette passe.

## US-3.3 — Saisir l'arrivée

### Happy Path
- ✓ `US-3.3-01-saisir-l-arrive-avant.png` — le champ arrivée est vide — champ arrivée vide, départ = Albi
- ✓ `US-3.3-02-saisir-l-arrive-apres.png` — je tape « Bord » : des propositions de lieux apparaissent — « Bord » → 6 propositions : Bordeaux, Bordères-sur-l'Échez, Bordes, Bords, Bordes, Bordères
- ✓ je choisis « Bordeaux » : champ rempli, liste fermée

### Edge Case
- (rien à signaler)

### Issues Found
- aucune sur la version déployée à cette passe.

## US-3.E4 — Voiture absente de la base

### Happy Path
- (rien à signaler)

### Edge Case
- ✓ `US-3.E4-E1-01-declencheur.png` — un modèle est choisi — Peugeot 208 choisie (modèle réel de la base ADEME), motorisation non choisie
- ✓ `US-3.E4-E1-02-resultat.png` — j'ouvre la liste des motorisations : classées par puissance avec leur carburant, la plus proche de la moyenne en premier — 5 motorisations de la base ADEME ; puissance moyenne 74.8 kW → proposée en premier : « 208 (102ch) · mécaniquePROPOSÉE 75 kW · Gazole » ; les autres par puissance croissante ; chaque ligne donne kW et carburant
- ✓ `US-3.E4-E1-03-retour.png` — retour à l'état normal : liste fermée — Échap referme la liste sans rien choisir : modèle 208 conservé, motorisation toujours vide, rien de mémorisé en trop

### Issues Found
- aucune sur la version déployée à cette passe.

## US-3.4 — Choisir ma voiture

### Happy Path
- ✓ `US-3.4-01-choisir-ma-voiture-avant.png` — aucune voiture mémorisée — aucune voiture : Marque / Modèle / Motorisation vides, aucune ligne dans `preferences` (RLS : celle de cette session)
- ✓ `US-3.4-02-choisir-ma-voiture-apres.png` — Peugeot → 208 → 208 (101ch) mécanique : voiture enregistrée, carburant affiché — voiture enregistrée dans `preferences` (vehicule_id 2ed51bbad5ac66a7, carburant SP95-E10) ; carburant affiché : « SP95-E10 · 1090 kg » ; mention « Voiture mémorisée »
- ✓ `US-3.4-03-choisir-ma-voiture-avant.png` — une voiture est mémorisée (écran Trajets rouvert) — après un aller-retour Prix → Trajets (écran recréé, départ et arrivée vides) : la voiture revient depuis `preferences`, libellé complet « 208 (101ch) · mécanique » sous les sélecteurs, mention « Voiture mémorisée »
- ✓ `US-3.4-04-choisir-ma-voiture-apres.png` — je rouvre l'appli : le choix de voiture est pré-rempli — après rechargement complet de la page (même session anonyme conservée) : Peugeot / 208 / 208 (101ch) mécanique pré-remplis depuis `preferences`, carburant affiché ; départ et arrivée vides (rechargés à neuf)
- ℹ conception : le client Supabase conserve la session anonyme dans le navigateur (`persistSession`, clé `pt-auth`) ; sans cela chaque rechargement créerait un nouvel identifiant et la voiture ne serait jamais retrouvée.

### Edge Case
- (rien à signaler)

### Issues Found
- aucune sur la version déployée à cette passe.

## US-3.5 — Calculer le coût

### Happy Path
- ✓ `US-3.5-01-calculer-le-cot-avant.png` — départ, arrivée et voiture renseignés — départ Albi, arrivée Bordeaux, voiture Peugeot 208 (101ch) renseignés
- ✓ `US-3.5-02-calculer-le-cot-apres.png` — je touche Calculer : coût, litres, km et L/100 km — Albi → Bordeaux : 317 km, 18.9 L, 6 L/100 km, coût 40,78 € à la moyenne nationale du jour 2,160 €/L (base) ; 1 appel à estimer-trajet
- ✓ historique enregistré en base : 1 trajet (Albi → Bordeaux, 316.7 km, coût 40.78 €, prix 2.16)

### Edge Case
- (rien à signaler)

### Issues Found
- aucune sur la version déployée à cette passe.

## US-4.1 — Comprendre le calcul

### Happy Path
- ✓ `US-4.1-01-comprendre-le-calcul-avant.png` — un résultat est affiché : tronçons repliés — 3 tronçons, tous repliés
- ✓ `US-4.1-02-comprendre-le-calcul-apres.png` — je touche un tronçon : vitesse typique, arrêts, dénivelé et L/100 km — tronçon déplié : « 105 km/h en moyenne · 0 arrêt · +1020 m de dénivelé · 5,9 L/100 km sur ce tronçon »
- ✓ `US-4.1-03-comprendre-le-calcul-avant.png` — un tronçon est déplié — tronçon toujours déplié, focus clavier sur son bouton
- ✓ `US-4.1-04-comprendre-le-calcul-apres.png` — je le touche à nouveau : il se replie — tronçon replié (activé de nouveau au clavier : Entrée)

### Edge Case
- ✓ 3 tronçons (autoroute, route, ville) : chacun se déplie séparément, l'ouverture d'un tronçon replie le précédent

### Issues Found
- aucune sur la version déployée à cette passe.

## US-4.2 — Mettre mon propre prix

### Happy Path
- ✓ `US-4.2-01-mettre-mon-propre-prix-avant.png` — résultat au prix moyen France — libellé « Moyenne France du jour · SP95-E10 », coût 40,78 €
- ✓ `US-4.2-02-mettre-mon-propre-prix-apres.png` — je saisis 1,699 : coût recalculé, libellé « Mon prix » — libellé « Mon prix », coût 32,08 € = 18.9 L × 1,699 €/L (avant : 40,78 €)
- ✓ `US-4.2-03-mettre-mon-propre-prix-avant.png` — un prix perso est saisi — prix perso 1,699 appliqué ; focus clavier sur « Revenir à la moyenne »
- ✓ `US-4.2-04-mettre-mon-propre-prix-apres.png` — « Revenir à la moyenne » : le coût revient à la moyenne nationale — coût revenu à 40,78 € (= avant) à la moyenne nationale 2,160 €/L

### Edge Case
- (rien à signaler)

### Issues Found
- aucune sur la version déployée à cette passe.

## US-4.E2 — Prix perso invalide

### Happy Path
- (rien à signaler)

### Edge Case
- ✓ `US-4.E2-E1-01-declencheur.png` — le champ prix perso est ouvert — champ prix perso ouvert (vide), coût 40,78 €
- ✓ `US-4.E2-E1-02-resultat.png` — je saisis 12 — « 12 » refusé : message « Entre un prix entre 0,50 et 4,00 €/L », champ marqué invalide (aria-invalid), coût inchangé 40,78 €
- ✓ « abc » : même message, coût inchangé ; « 0,49 » et « 4,01 » refusés, « 0,50 » et « 4,00 » acceptés (tests Vitest `validerPrix`)
- ✓ `US-4.E2-E1-03-retour.png` — retour à une saisie valide : état normal — message disparu, coût revenu à la valeur d'origine 40,78 € (prix moyen 2,160 €/L)

### Issues Found
- Trouvé dans la 1re passe sur la prod : le prix était appliqué à chaque touche, donc taper « 12 » passait par « 1 » (1,00 €/L) et le coût affiché devenait celui de 1,00 €/L (18,88 € au lieu de 40,78 €) au lieu de rester « celui d'avant ». Corrigé : le prix n'est appliqué qu'une fois la frappe posée (Entrée, sortie du champ, ou 0,45 s sans touche) ; une saisie invalide annule l'application en attente. Captures reprises.

## US-4.3 — Revenir aux trajets

### Happy Path
- ✓ `US-4.3-01-revenir-aux-trajets-avant.png` — un résultat est affiché — résultat Albi → Bordeaux affiché au prix moyen
- ✓ `US-4.3-02-revenir-aux-trajets-apres.png` — je touche le bouton retour : formulaire et trajet en tête de l'historique — formulaire affiché ; ligne de tête de l'historique : « Albi → Bordeaux 317 km · 20 oct. 40,78 € ✕ » (en base : 1 trajet) ; focus revenu sur le bouton Calculer qui avait ouvert le résultat

### Edge Case
- (rien à signaler)

### Issues Found
- aucune sur la version déployée à cette passe.

## US-3.6 — Rejouer un ancien trajet

### Happy Path
- ✓ `US-3.6-01-rejouer-un-ancien-trajet-avant.png` — un trajet est dans l'historique — ligne d'historique « Albi → Bordeaux 317 km · 20 oct. » (enregistrée le 2026-10-20T15:05:17.586+00:00)
- ✓ `US-3.6-02-rejouer-un-ancien-trajet-apres.png` — je touche la ligne : recalcul au prix moyen du jour, résultat affiché — recalcul réel (nouvel appel estimer-trajet) : 317 km, 18.9 L, coût 40,78 € au prix moyen du jour 2,160 €/L ; la ligne d'historique est mise à jour (pas de doublon), horodatage avancé

### Edge Case
- ✓ après retour, le focus revient sur la ligne d'historique qui avait ouvert le résultat

### Issues Found
- aucune sur la version déployée à cette passe.

## US-3.P1 — Inverser départ et arrivée

### Happy Path
- ✓ `US-3.P1-01-inverser-dpart-et-arrive-avant.png` — départ Albi et arrivée Bordeaux — départ Albi, arrivée Bordeaux ; pointeur sur le bouton d'inversion « Inverser les deux lieux »
- ✓ `US-3.P1-02-inverser-dpart-et-arrive-apres.png` — je touche le bouton d'inversion : départ Bordeaux, arrivée Albi — départ = Bordeaux, arrivée = Albi (coordonnées échangées aussi : le calcul suivant part bien de Bordeaux)

### Edge Case
- (rien à signaler)

### Issues Found
- aucune sur la version déployée à cette passe.

## US-3.7 — Supprimer un trajet

### Happy Path
- ✓ `US-3.7-01-supprimer-un-trajet-avant.png` — deux trajets dans l'historique — historique : Bordeaux → Albi 316 km · 20 oct. 40,95 € ✕ | Albi → Bordeaux 317 km · 20 oct. 40,78 € ✕ ; pointeur sur la croix de « Bordeaux → Albi » (aria-label « Supprimer le trajet Bordeaux → Albi »)
- ✓ `US-3.7-02-supprimer-un-trajet-apres.png` — je touche la croix : la ligne disparaît, et ne revient pas au rechargement — la ligne a disparu et ne revient pas après rechargement complet de la page : 1 ligne (« Albi → Bordeaux 317 km · 20 oct. 40,78 € ✕ »), base : 1 trajet, la ligne supprimée n'existe plus

### Edge Case
- (rien à signaler)

### Issues Found
- aucune sur la version déployée à cette passe.

## US-3.P2 — Changer de voiture

### Happy Path
- ✓ `US-3.P2-01-changer-de-voiture-avant.png` — une voiture est mémorisée — voiture mémorisée Peugeot 208 (101ch) mécanique, pointeur sur la marque
- ✓ `US-3.P2-02-changer-de-voiture-apres.png` — je choisis Renault : modèle et motorisation se réinitialisent, la nouvelle voiture est mémorisée — marque Renault ; modèle et motorisation réinitialisés (« Modèle », « Motorisation »), mention visible « Marque mémorisée » ; `preferences` : marque=Renault, modèle et vehicule_id vidés (l'ancienne voiture n'est plus mémorisée)
- ✓ nouvelle voiture complétée (Renault Clio « CLIO (101ch) · mécanique · essence ») puis rechargement : la nouvelle voiture est pré-remplie, l'ancienne a disparu

### Edge Case
- (rien à signaler)

### Issues Found
- aucune sur la version déployée à cette passe.

## US-3.E1 — Lieu introuvable

### Happy Path
- (rien à signaler)

### Edge Case
- ✓ `US-3.E1-E1-01-declencheur.png` — une arrivée « zzzz » sans résultat — arrivée « zzzz » : le géocodeur IGN réel ne propose rien (features: [])
- ✓ `US-3.E1-E1-02-resultat.png` — je touche Calculer — champ arrivée signalé « Lieu introuvable » (role=alert, aria-invalid) ; aucun appel à estimer-trajet n'est parti ; on reste sur le formulaire
- ✓ `US-3.E1-E1-03-retour.png` — retour à l'état normal : lieu valide — arrivée corrigée en Toulouse : le message disparaît dès la nouvelle saisie ; historique inchangé, toujours aucun calcul lancé

### Issues Found
- aucune sur la version déployée à cette passe.

## US-4.E1 — Itinéraire impossible

### Happy Path
- (rien à signaler)

### Edge Case
- ✓ `US-4.E1-E1-01-declencheur.png` — une arrivée en Corse depuis Albi — départ Albi, arrivée Bastia (Corse) — vrai routeur IGN, aucun mock
- ✓ `US-4.E1-E1-02-resultat.png` — je lance le calcul — « Pas d'itinéraire routier entre ces deux lieux », aucun coût affiché ; réponse réelle de l'edge function : HTTP 422 (IGN : « No path found »)
- ✓ `US-4.E1-E1-03-retour.png` — retour à l'état normal : formulaire, historique inchangé — retour au formulaire (champs conservés) ; aucun trajet ajouté à l'historique (1 en base)

### Issues Found
- aucune sur la version déployée à cette passe.

## US-4.E3 — Calcul trop long

### Happy Path
- (rien à signaler)

### Edge Case
- ✓ `US-4.E3-E1-01-declencheur.png` — un calcul qui dure plus d'une seconde — Albi → Toulouse prêt à calculer ; la réponse réelle d'estimer-trajet sera retardée de 3 s (MOCKED: délai ajouté, requête réelle)
- ✓ `US-4.E3-E1-02-resultat.png` — j'attends — après 1371 ms : « Calcul de l'itinéraire… » avec bouton Annuler (focus dessus) ; aucun résultat affiché
- ✓ `US-4.E3-E1-03-retour.png` — Annuler : retour au formulaire — Annuler ramène au formulaire, champs conservés, focus sur Calculer
- ✓ 4,5 s plus tard (réponse réelle arrivée après l'annulation) : toujours le formulaire, historique inchangé (1 trajet en base)

### Issues Found
- aucune sur la version déployée à cette passe.

## US-3.E2 — Formulaire incomplet

### Happy Path
- (rien à signaler)

### Edge Case
- ✓ `US-3.E2-E1-01-declencheur.png` — aucune voiture choisie — départ et arrivée remplis, aucune voiture choisie (préférences vides pour cette identité)
- ✓ `US-3.E2-E1-02-resultat.png` — je touche Calculer — « Choisis ta voiture » (role=alert), sélecteur de marque marqué invalide et focalisé ; aucun appel à estimer-trajet
- ✓ `US-3.E2-E1-03-retour.png` — retour à l'état normal : voiture choisie — voiture choisie (Dacia Sandero) : le formulaire est complet, Calculer devient possible ; toujours aucun calcul lancé
- ✓ départ vide : « Saisis un lieu » sur le champ départ, aucun appel à estimer-trajet

### Issues Found
- aucune sur la version déployée à cette passe.

## US-3.E3 — Historique vide

### Happy Path
- (rien à signaler)

### Edge Case
- ✓ `US-3.E3-E1-01-declencheur.png` — aucun trajet calculé (écran Trajets, nouvelle identité) — nouvel identifiant anonyme, écran Trajets ouvert : formulaire vide et section « Derniers trajets » sans aucun trajet calculé
- ✓ `US-3.E3-E1-02-resultat.png` — j'ouvre l'onglet Trajets — onglet Trajets rouvert depuis Prix : « Aucun trajet pour l'instant » + invitation « Choisis un départ, une arrivée et ta voiture, puis touche « Calculer le coût » : ton premier trajet apparaîtra ici. »
- ✓ `US-3.E3-E1-03-retour.png` — retour à l'état normal : invitation toujours là, prêt à saisir — après un aller-retour Prix → Trajets : même état vide (base : 0 trajet pour cet identifiant) ; curseur dans le champ arrivée, prêt pour le premier trajet

### Issues Found
- (rien à signaler)

## US-A11Y-001 — Navigation au clavier

### Happy Path
- ✓ `US-A11Y-001-01-m2.png` — S3 : Tab fait parcourir les contrôles dans l'ordre de lecture (pastilles d'ordre = annotation de test) — S3 — ordre de tabulation relevé pendant la passe au clavier, pastilles numérotées posées par le test : 1 Départ → 2 Inverser les deux lieux → 3 Arrivée → 4 Marque → 5 Modèle → 6 Motorisation → 7 Calculer le coût → 8 Recalculer le trajet Albi → Bordeaux au prix du jour → 9 Supprimer le trajet Albi → Bordeaux → 10 Trajets (ordre de lecture = ordre du DOM ; contour ≥ 2 px et élément visible vérifiés à chaque Tab ; le focus final est sur l'onglet « Trajets »)
- ✓ Maj+Tab depuis l'onglet « Trajets » ramène exactement sur « Départ » (ordre inverse, 9 pas)
- ✓ `US-A11Y-001-02-m2.png` — S4 : Tab parcourt prix perso, tronçons puis onglet dans l'ordre (pastilles d'ordre = annotation de test) — S4 — depuis le titre, ordre de tabulation relevé (pastilles numérotées posées par le test) : 1 Mettre mon prix → 2 Autoroute, 70,6 km, 4,0 litres → 3 Route, 8,7 km, 0,5 litres → 4 Ville, 7,3 km, 0,6 litres → 5 Trajets ; le bouton « Retour aux trajets » précède le titre (Maj+Tab) ; contour et visibilité vérifiés à chaque pas
- ✓ suite complète de S4 : Mettre mon prix → Autoroute, 70,6 km, 4,0 litres → Route, 8,7 km, 0,5 litres → Ville, 7,3 km, 0,6 litres → Trajets (ordre du DOM)

### Edge Case
- (rien à signaler)

### Issues Found
- aucune sur la version déployée à cette passe.

## US-A11Y-002 — Focus de la fiche (interprétation : l'écran Résultat S4)

### Happy Path
- ✓ `US-A11Y-002-01-m2.png` — la fiche s'ouvre : le focus va sur son titre — fiche station réelle ouverte au clavier (Entrée sur la ligne) : le focus est sur son titre « TOTALENERGIES ALBI · RELAIS DES FONTANELLES » (souligné) ; même règle vérifiée sur S4
- ✓ `US-A11Y-002-02-m2.png` — à la fermeture, le focus revient sur l'élément qui l'a ouvert — fiche fermée (Échap) : le focus est revenu sur la ligne « TOTALENERGIES ALBI · RELAIS DES FONTANELLES » qui l'avait ouverte, contour visible

### Edge Case
- ✓ même règle sur S4 (preuve en plus de la fiche) : ouvert au clavier (Entrée sur « Calculer le coût »), le focus va sur le titre « ALBI → TOULOUSE » (souligné)
- ✓ même règle sur S4 : Entrée sur « Retour aux trajets » → le focus revient sur « Calculer le coût », l'élément qui avait ouvert le résultat

### Issues Found
- aucune sur la version déployée à cette passe.

## US-A11Y-003 — Touche Échap

### Happy Path
- ✓ `US-A11Y-003-01-m2.png` — un tronçon est déplié — un tronçon est déplié au clavier : « 96 km/h en moyenne · 0 arrêt · +320 m de dénivelé · 5,7 L/100 km sur ce tronçon »
- ✓ `US-A11Y-003-02-m2.png` — Échap ferme le tronçon déplié — Échap : le tronçon se replie, le focus reste sur son bouton

### Edge Case
- ✓ Échap ferme aussi l'éditeur « Mettre mon prix » (focus rendu au bouton) ; sur S3, Échap ferme la liste de propositions de lieux et la liste de motorisations (US-3.E4-03, extrait US-A11Y-003)

### Issues Found
- aucune sur la version déployée à cette passe.

## US-A11Y-004 — Libellés lisibles

### Happy Path
- ✓ `US-A11Y-004-01-m2.png` — S3 : chaque contrôle et chaque bouton icône a un libellé — S3 : 7 contrôles du formulaire nommés (Départ, Arrivée, Inverser les deux lieux, Marque, Modèle, Motorisation, Calculer le coût), 0 bouton ou champ sans nom ; boutons de l'historique : « Recalculer le trajet Albi → Bordeaux au prix du jour » ; « Supprimer le trajet Albi → Bordeaux » ; la croix ✕ et le ⇅ sont masqués aux lecteurs (aria-hidden) au profit de l'aria-label
- ✓ `US-A11Y-004-02-m2.png` — S4 : chaque prix et chaque tronçon est annoncé en entier — S4 : coût annoncé « Coût estimé 10,99 euros », prix « 2,160 euros le litre », bouton retour « Retour aux trajets », tronçons « Autoroute, 70,6 km, 4,0 litres ; Route, 8,7 km, 0,5 litres ; Ville, 7,3 km, 0,6 litres » (type, km et litres, sans doublon de lecture) ; le bandeau orange est une annotation de test

### Edge Case
- (rien à signaler)

### Issues Found
- aucune sur la version déployée à cette passe.

## US-PERF-001 — Ouverture rapide

### Happy Path
- ✓ `US-PERF-001-01-m2.png` — j'ouvre l'appli (4G simulée) — ouverture de l'appli en 4G simulée, cache désactivé : en-tête « Plein & Trajet » affiché à t=419 ms (liste des stations pas encore chargée : 0 ligne)
- ✓ `US-PERF-001-02-m2.png` — la liste des stations est affichée en moins de 2,5 s — liste des stations (7 lignes avec prix) affichée 632 ms après l'ouverture < 2 500 ms (4G simulée, session neuve, cache vide)

### Edge Case
- ✓ complément : l'écran Trajets (formulaire, liste des marques, historique) est prêt en 767 ms en 4G simulée, identité neuve, cache vide

### Issues Found
- aucune sur la version déployée à cette passe.

## Contrôles de fin de passe

- Captures écrites : 61 ; en échec : 0.
- Fichiers M2 présents dans delivery/ : 61 ; doublons d'octets (md5) : aucun.
- Erreurs console / page observées pendant la passe : aucune.

## Round 2 — corrections de l'audit (commit déployé a6126b7)

Captures reprises (passe complète rejouée sur la prod, 61/61 ✓, 0 doublon md5) :
- **US-PERF-001-01/-02** : désormais l'écran d'ouverture Prix. -01 = appli ouverte en 4G simulée (en-tête affiché, liste « Chargement des prix… ») ; -02 = liste des stations affichée avec la durée mesurée (bandeau « liste des stations affichée en 632 ms (7 stations ; budget 2 500 ms) »). Le temps de Trajets (formulaire + marques + historique) est mesuré à côté et noté en complément (non photographié).
- **US-A11Y-002-01/-02** : preuve sur la VRAIE fiche station (focus sur son titre à l'ouverture au clavier ; retour du focus sur la ligne à la fermeture par Échap). La même règle sur S4 reste vérifiée par assertions (et par l'extrait US-A11Y-002).
- **US-A11Y-001-01/-02** : l'ordre de tabulation est relevé pendant la passe au clavier et affiché en pastilles numérotées (surcouche de test orange, signalée dans la légende et retirée après la photo) : S3 de 1 Départ à 10 onglet Trajets, S4 de 1 Mettre mon prix à 5 onglet Trajets.
- **US-3.E3-E1-01** : écran Trajets avec l'historique vide dès la précondition (plus l'écran Prix).
- **US-3.P2-02** : « Marque mémorisée » visible dès le choix de la marque ; le libellé complet de la motorisation s'affiche aussi sous les sélecteurs (US-3.4-02/03/04, P2-01).
- **US-3.4-03** : prise après un aller-retour Prix → Trajets (écran recréé, voiture restaurée depuis `preferences`) ; **US-3.4-04** : après rechargement, focus clavier sur Départ ; **US-3.7-02** : annotation « page rechargée (F5) … 1 seul trajet revient de la base » ; **US-4.E2-E1-03** : retour au coût d'origine 40,78 € (saisie 12 refusée, 1,699 appliqué, « Revenir à la moyenne »).

Autres corrections (non photographiées) : bi-carburation ESS+G.P.L. chiffrée au carburant de chaque ligne (essence → SP95-E10, GPL → GPLc, libellés « · essence » / « · GPL » ; réimport : 550 véhicules, Clio : 67 kW essence 5,40 L/100 en SP95-E10 et 74 kW GPL 7,00 L/100 en GPLc ; le réimport ne supprimait pas les anciennes lignes au-delà de 1 000 lignes lues, corrigé) ; Albi → Albi : message « Le départ et l'arrivée sont le même lieu… » (extrait US-4.E1) ; rejouer une ligne sans voiture : message (extrait US-3.6, ligne mise à `vehicule_id = null` par REST avec la session de l'identité de test) ; propositions de lieux : une reprise et message « Propositions indisponibles… » si le service IGN est injoignable.

Tests rejoués : Vitest 80/80, `vite build` 0 erreur, extraits m2 sur la prod **61/61** (1re passe de round 2 : 60/61, un échec intermittent du géocodeur IGN sans proposition, corrigé par la reprise ci-dessus), régression m1 **25/25**.
Limite d'inscriptions anonymes du projet Supabase : **rectification (chef, passe 5)** — la remise à 30 par heure a échoué (réponse 544) ; relue à 300 le 20/10 à 15:30Z. Remise à 30 prévue en fin d'étape 4.4, après la régression.
