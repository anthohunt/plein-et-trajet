# Plan technique — Plein & Trajet

## Pile (standard, sans écart)
React + Vite (TypeScript) · Supabase (Postgres + PostGIS, Auth anonyme, Edge Functions Deno, pg_cron, RLS) · Vercel · Vitest + Playwright. Bibliothèques front : `@supabase/supabase-js`, `maplibre-gl` (fond Plan IGN vectoriel de la Géoplateforme), `react-router-dom` (deux onglets + résultat). Détail et motifs : `stack-decisions.md`.

## Modèle de données (Postgres)
```
stations(id text pk, nom text, adresse text, cp text, ville text, geom geography(Point,4326), services text[], automate_24_24 bool, maj timestamptz)
prix(station_id text fk, carburant text check in ('Gazole','SP95-E10','SP95','SP98','E85','GPLc'), prix numeric(5,3), maj timestamptz, rupture bool, pk(station_id, carburant))
moyennes_nationales(jour date, carburant text, prix_moyen numeric(5,3), nb_stations int, pk(jour, carburant))
vehicules(id uuid pk, marque text, modele text, motorisation text, carburant text, masse_kg int, puissance_kw int, conso_basse numeric, conso_moyenne numeric, conso_haute numeric, conso_tres_haute numeric, source_id text unique)
trajets(id uuid pk, user_id uuid default auth.uid(), depart jsonb, arrivee jsonb, vehicule_id uuid fk, km numeric, litres numeric, troncons jsonb, cree_le timestamptz default now())
preferences(user_id uuid pk default auth.uid(), vehicule_id uuid fk, carburant text)
```
RLS : `stations`, `prix`, `moyennes_nationales`, `vehicules` en lecture `anon`+`authenticated`, écriture `service_role` ; `trajets`, `preferences` limitées à `user_id = auth.uid()`.
Fonction SQL `stations_autour(lat, lon, rayon_m, carburant)` → stations + prix + distance, triées (utilisée par S1).

## API (contrats)
- `rpc/stations_autour` `{lat, lon, rayon_m=10000, carburant}` → `[{id, nom, adresse, distance_km, prix, maj, rupture}]`
- `GET rest/v1/prix?station_id=eq.X` → tous les carburants d'une station (S2)
- `GET rest/v1/moyennes_nationales?jour=eq.today&carburant=eq.X`
- `GET rest/v1/vehicules?marque=eq.X&select=modele` (listes chaînées marque → modèle → motorisation, triées par puissance)
- `POST functions/v1/estimer-trajet` `{depart:{label,lat,lon}, arrivee:{label,lat,lon}, vehicule_id}` → `{km, minutes, litres, l100, troncons:[{type:'autoroute'|'route'|'ville'|'montee', nom, km, vitesse_kmh, arrets, denivele_m, litres, l100}]}` ; erreurs `422 pas_itineraire`, `404 lieu_introuvable`, `502 source_indisponible`.
- Géocodage côté front : `GET data.geopf.fr/geocodage/completion` (propositions au fil de la frappe, debounce 250 ms).

## Edge Functions
- `sync-prix` (pg_cron toutes les 10 min) : pagine le flux instantané officiel, upsert `stations`/`prix`, recalcule `moyennes_nationales` par agrégat officiel.
- `import-vehicules` (au déploiement + mensuel) : ADEME Car Labelling → `vehicules` (énergie → carburant, électriques exclus, doublons par `source_id`).
- `estimer-trajet` : itinéraire IGN (`bdtopo-osrm`, `getSteps=true`, GeoJSON) → classement des étapes en tronçons (vitesse moyenne de l'étape = distance/durée ; autoroute si type de voie autoroutière ou > 100 km/h ; ville si < 40 km/h) → échantillonnage altimétrie IGN tous les 500 m → modèle de consommation (`shared/conso.ts`, pur, testé Vitest) → réponse ; insère la ligne `trajets` pour l'utilisateur.

## Composants (issus de la maquette)
`BarreOnglets`, `SelecteurCarburant`, `CarteStations` (MapLibre + pastilles HTML), `ListeStations` / `LigneStation`, `TotemPrix` (troisième décimale en exposant, défilement), `FicheStation` (feuille, gestion du focus), `ChampLieu` (complétion IGN), `ChoixVoiture` (3 listes chaînées), `BoutonPrincipal`, `ResultatTrajet`, `Troncon`, `PrixPerso`, `Historique` / `LigneHistorique`, `EtatErreur`, `EtatVide`.

## Arborescence
```
src/ main.tsx · App.tsx · routes/{Prix,Trajets,Resultat}.tsx · components/* · lib/{supabase.ts,geocodage.ts,format.ts} · styles/tokens.css (depuis design/tokens.json)
shared/conso.ts            # modèle de consommation (importé par la fonction et testé)
supabase/migrations/*.sql · supabase/functions/{sync-prix,import-vehicules,estimer-trajet}/index.ts
tests/unit/*.test.ts (Vitest) · tests/e2e/* (Playwright)
```
