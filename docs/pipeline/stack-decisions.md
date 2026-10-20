# Application de la pile standard — Plein & Trajet

Pile standard appliquée sans écart : **React + Vite (TypeScript)**, **Supabase** (Postgres, Auth, Edge Functions, RLS), **Vercel**, **Vitest + Playwright**. Rien dans l'usage ne rend ce standard impossible : l'appli lit des données publiques, calcule côté serveur et garde un petit historique par appareil.

Sources externes vérifiées le 2026-10-20 par téléchargement direct (réponses lues, pas résumées) :

| Besoin | Source réelle | Constat |
|---|---|---|
| Prix des stations | data.economie.gouv.fr, jeu `prix-des-carburants-en-france-flux-instantane-v2` (API Explore v2.1, licence ouverte) | 9 815 stations ; champs `gazole_prix`, `e10_prix`, `sp95_prix`, `sp98_prix`, `e85_prix`, `gplc_prix` + `_maj`, `geom` lon/lat, adresse, services, ruptures. Mises à jour du jour constatées (Albi, 2026-10-20 11:20). |
| Moyenne nationale du jour | même API, agrégat `select=avg(e10_prix)…` | Une requête renvoie la moyenne sur toutes les stations (ex. E10 2,161 €/L, gazole 2,367 €/L le 2026-10-20). |
| Voitures (marque → modèle → motorisation) | ADEME Car Labelling, data.ademe.fr data-fair `ademe-car-labelling` | 3 604 lignes ; par version : `Marque`, `Modèle`, `Description_Commerciale`, `Energie`, `Poids_à_vide`, `Masse_OM_Min/Max`, `Puissance_maximale` (kW), consommations WLTP par phase `Conso_basse/moyenne/haute/T-haute_vitesse_Min/Max`. |
| Itinéraire | IGN Géoplateforme, `data.geopf.fr/navigation/itineraire` (ressource `bdtopo-osrm`, sans clé) | Albi → Bordeaux : 312 km, 199 min, 81 étapes avec géométrie GeoJSON. |
| Dénivelé | IGN Géoplateforme, `data.geopf.fr/altimetrie/1.0/calcul/alti/rest/elevation.json` | Altitudes renvoyées pour une liste de points (174 m / 469 m sur le test). |
| Géocodage départ / arrivée | IGN Géoplateforme, `data.geopf.fr/geocodage/search` | « Albi » → 43.930, 2.136, code INSEE 81004. |
| Fond de carte | Plan IGN en tuiles vectorielles (Géoplateforme), affiché avec MapLibre GL JS | Bibliothèque front ajoutée, pas un écart de pile. |

## Comment le standard s'applique ici

**Supabase — schéma de données**
- `stations` (id station officiel, nom/enseigne, adresse, cp, ville, lat, lon, services, horaires 24/24) : rafraîchie par la fonction planifiée `sync-prix`. RLS : lecture publique (`select` pour `anon`), écriture réservée au rôle service.
- `prix` (station_id, carburant, prix, maj, rupture) : une ligne par station et par carburant, même rafraîchissement. Index géographique (PostGIS `geography(Point)`) sur `stations` pour la requête « autour de moi ». RLS : lecture publique.
- `moyennes_nationales` (jour, carburant, prix_moyen, nb_stations) : calculée à chaque synchro à partir de l'agrégat officiel. RLS : lecture publique.
- `vehicules` (id, marque, modele, motorisation, energie → carburant, masse_kg, puissance_kw, conso_wltp_basse/moyenne/haute/tres_haute) : importée depuis ADEME Car Labelling par la fonction `import-vehicules` (lancée au déploiement puis chaque mois). RLS : lecture publique.
- `trajets` (id, user_id, depart_label, depart_lat/lon, arrivee_label, arrivee_lat/lon, vehicule_id, km, litres, troncons jsonb, cree_le) : l'historique. RLS : `user_id = auth.uid()` pour select/insert/delete.
- `preferences` (user_id, vehicule_id, carburant) : la voiture et le carburant mémorisés. RLS : `user_id = auth.uid()`.

**Supabase — Auth** : connexion **anonyme** (`signInAnonymously`) au premier lancement. Aucun compte à créer (hors-périmètre : pas de comptes), mais chaque appareil a son identifiant, ce qui suffit à l'historique et à la voiture mémorisée, protégés par RLS.

**Supabase — Edge Functions**
- `sync-prix` (planifiée toutes les 10 min via pg_cron) : télécharge le flux instantané par pages, met à jour `stations`/`prix`, recalcule `moyennes_nationales`.
- `import-vehicules` : importe et normalise ADEME Car Labelling (énergie ESSENCE → SP95-E10 par défaut, GAZOLE → Gazole, GPL → GPLc, superéthanol → E85 ; hybrides non rechargeables gardés, électriques exclus).
- `estimer-trajet` : géocode, demande l'itinéraire IGN, découpe en tronçons, interroge l'altimétrie, applique le modèle de consommation, renvoie km, litres, tronçons. Les appels IGN se font côté serveur (pas de CORS à gérer, cache possible).
- Pas de bucket Storage : aucune donnée fichier.

**Vercel** : héberge le front React + Vite (build statique), variables `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. Déploiement au push sur `main`, aperçu par branche.

**Vitest** : modèle de consommation, découpage en tronçons, formatage des prix (troisième décimale), tri. **Playwright** : les parcours des cas d'usage de chaque jalon, sur l'appli déployée.

## Réponses aux questions différées (`questions-techniques.md`)

1. **Source des prix live** → flux instantané officiel ci-dessus, synchronisé toutes les 10 min dans Supabase. L'appli lit Supabase, jamais l'API officielle directement (quota, temps de réponse, requête géographique).
2. **Source des consommations par modèle** → ADEME Car Labelling (WLTP par phase de vitesse + masse + puissance). C'est la base en ligne qu'Anthony demandait.
3. **Distance d'un trajet** → itinéraire IGN Géoplateforme (sans clé, données françaises).
4. **Modèle physique de consommation** → pour chaque tronçon : la vitesse typique choisit la phase WLTP (basse < 40 km/h, moyenne 40-65, haute 65-100, très haute > 100) qui donne la consommation de base de la voiture ; on ajoute (a) le coût des arrêts et ré-accélérations : énergie ½·m·v² par arrêt, convertie en litres (pouvoir calorifique 8,9 kWh/L essence, 9,9 kWh/L gazole ; rendement moteur 0,25 essence / 0,30 gazole) ; (b) le dénivelé positif : m·g·Δh, même conversion. Le nombre d'arrêts vient du nombre de manœuvres (ronds-points, intersections) des étapes IGN, le dénivelé de l'altimétrie IGN échantillonnée tous les 500 m. Masse = masse en ordre de marche ADEME + 75 kg de conducteur.
5. **Mémorisation de la voiture** → table `preferences` liée à l'identifiant anonyme de l'appareil (cohérent avec « pas de comptes »).

## Jalon 3 — Péages et Europe (2026-10-20, après validation de la maquette v2)
Toujours sans écart de pile : ce sont des sources externes appelées par les Edge Functions. Recherche menée par 4 agents (rapports `/home/claude/surveillance/agents-codex/api-{peages,carburants,itineraire,vehicules}.rendu.md`).
- **Péages** → PTV Developer (gratuit 100 000 transactions/mois, sans carte, prix HT : on ajoute la TVA du pays) ; HERE v8 en recours (TTC, 2 500 péages/mois gratuits, carte exigée). Aucune source ouverte ne couvre l'Europe ; APRR (data.gouv.fr) et NVDB (Norvège) servent à vérifier les montants. Vignettes : table maintenue à la main.
- **Itinéraire Europe** → Valhalla (OSM) : classe de voie, densité urbaine, pente, altitude, feux, péages signalés ; hébergé chez Stadia Maps ou auto-hébergé. IGN reste utilisé pour les trajets 100 % France.
- **Géocodage Europe** → Photon (autocomplétion permise) ; Nominatim exclu (autocomplétion interdite).
- **Moyennes par pays** → Bulletin pétrolier UE (xlsx hebdo, CC BY 4.0, UE-27) ; Royaume-Uni = moyenne Fuel Finder ; Norvège = SSB.
- **Stations hors de France** → flux officiels testés dans 10 pays + Royaume-Uni (détail dans tasks.md T3.5).
- **Véhicules** → base EEA CO2 cars (Discodata, CC BY 4.0) en plus d'ADEME ; modèle road-load + Willans calé sur le WLTP (erreur ≤ 0,2 L/100 km sur 12 versions testées).
- Secrets des fournisseurs : dans Supabase Vault via l’écran Moteurs, jamais dans `webapp-stack.env` ni dans le code.
- **Moteurs branchables (décision d'Anthony, 2026-10-20 : « je veux pas que ce soit hardcodé »)** → aucune clé ni aucun fournisseur dans le code ou dans `webapp-stack.env` : table `moteurs` + **Supabase Vault** pour les secrets ; écran S5 réservé à l'administrateur (Supabase Auth, lien magique, claim `admin`). Les clés PTV et Stadia sont collées par Anthony dans cet écran. Le standard Supabase couvre tout (Vault, Auth, RLS, Edge Functions) : pas d'écart.
