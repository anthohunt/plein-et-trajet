# Tâches — Plein & Trajet

Règle : toute tâche d'intégration nomme la vraie source et gère ses erreurs (réseau, 429, réponse vide, réponse mal formée). Aucun service simulé, aucune donnée en dur à la place d'une source.

## Phase 0 — Mise en place (fusionnée dans le jalon 1)
- **T0.1** Initialiser React + Vite TS, `tokens.css` depuis `design/tokens.json`, polices. Fichiers : `src/`, `index.html`. Fait quand : `npm run build` passe et la page affiche la barre d'onglets.
- **T0.2** Créer le projet Supabase dédié (jeton partagé), activer `postgis`, `pg_cron`, Auth anonyme ; écrire `.env.local`. Fait quand : `supabase status` répond et le front se connecte en anonyme.
- **T0.3** Lier le dépôt à Vercel, variables d'environnement, déploiement au push. Fait quand : une URL de production répond 200.

## Jalon 1 — Les prix autour de moi (S1, S2)
- **T1.1** (US-1.3, US-1.E1) Migration `stations`, `prix`, `moyennes_nationales` + RLS lecture publique. Dépend : T0.2.
- **T1.2** (US-1.2, US-1.E4) Fonction `sync-prix` : source réelle `data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/prix-des-carburants-en-france-flux-instantane-v2/records`, pagination, upsert, ruptures, moyennes par agrégat ; reprise sur 429/5xx avec attente ; journal d'erreur. pg_cron 10 min. Fait quand : > 9 000 stations en base et `moyennes_nationales` du jour remplie.
- **T1.3** (US-1.3, US-1.5) Fonction SQL `stations_autour` (PostGIS, rayon, carburant, tri prix/distance). Tests SQL.
- **T1.4** (US-1.1, US-1.3, US-1.4, US-1.P1) `CarteStations` MapLibre sur fond Plan IGN, pastilles vert/orange par médiane, recentrage, géolocalisation avec repli sur Albi ou la dernière ville.
- **T1.5** (US-1.2, US-1.E2) `SelecteurCarburant` + préférence carburant.
- **T1.6** (US-1.5, US-1.6, US-1.E3) `ListeStations` / `LigneStation` / `TotemPrix` : écart à la moyenne, prix ancien > 48 h atténué, tri.
- **T1.7** (US-1.E1) `EtatErreur` avec Réessayer quand la lecture des prix échoue.
- **T1.8** (US-2.1, US-2.2, US-2.E1, US-A11Y-002, US-A11Y-003) `FicheStation` : tous carburants ou « non vendu », focus, Échap, bouton trajet → S3 arrivée pré-remplie.
- **T1.9** (US-A11Y-001, US-A11Y-004, US-PERF-001) Ordre de focus, libellés ARIA des pastilles, budget 2,5 s en 4G.
- **T1.10** Tests Vitest (format prix, tri) + Playwright `m1-use-case.md`.

## Jalon 2 — Le coût d'un trajet (S3, S4)
- **T2.1** (US-3.4, US-3.E4, US-3.P2) Migration `vehicules`, `preferences` + RLS ; fonction `import-vehicules` depuis la source réelle `data.ademe.fr/data-fair/api/v1/datasets/ademe-car-labelling/lines` (pagination, normalisation énergie → carburant, électriques exclus) ; `ChoixVoiture` chaîné, mémorisation.
- **T2.2** (US-3.2, US-3.3, US-3.P1, US-3.E1) `ChampLieu` : complétion réelle `data.geopf.fr/geocodage/completion`, debounce, « Lieu introuvable », inversion départ/arrivée.
- **T2.3** (US-4.1) `shared/conso.ts` : phases WLTP, arrêts ½·m·v², dénivelé m·g·Δh, conversion énergie → litres ; tests Vitest sur cas chiffrés (plat 130 km/h, ville 20 arrêts, montée 500 m).
- **T2.4** (US-3.5, US-4.1, US-4.E1, US-4.E3) Fonction `estimer-trajet` : itinéraire réel `data.geopf.fr/navigation/itineraire` (bdtopo-osrm), altimétrie réelle `data.geopf.fr/altimetrie/1.0/calcul/alti/rest/elevation.json`, tronçons, erreurs 404/422/502, délai max 15 s ; enregistre `trajets`.
- **T2.5** (US-3.5, US-3.E2, US-4.E3) Bouton Calculer : validation, état « Calcul de l'itinéraire… » + Annuler.
- **T2.6** (US-4.1, US-4.2, US-4.E2, US-4.3) `ResultatTrajet`, `Troncon` dépliable, `PrixPerso` (0,50–4,00 €/L), moyenne nationale du jour, retour.
- **T2.7** (US-3.1, US-3.6, US-3.7, US-3.E3) `Historique` : liste, recalcul au prix du jour, suppression, état vide.
- **T2.8** Tests Vitest + Playwright `m2-use-case.md`.

## Jalon 3 — Péages et Europe (S1, S3, S4 enrichis ; ajouté le 2026-10-20)
- **T3.1** (US-4.4, US-4.E4, US-4.E5) Péages : source réelle PTV Developer Routing API `results=TOLL_COSTS` (profil voiture EUR_CAR), prix HT convertis en TTC avec la TVA du pays de chaque section ; recours HERE Routing v8 `return=tolls` si la clé PTV manque ou en cas d'erreur 5xx ; vignettes (CH, AT, CZ, SK, HU, SI, RO, BG) détectées sur l'itinéraire et signalées depuis une table maintenue à la main (`supabase/seed/vignettes.sql`, sources officielles des opérateurs) ; erreurs : 401/403 clé, 429 quota, réponse sans section. Pré-requis : clé PTV collée par Anthony dans l’écran Moteurs (compte créé le 2026-10-20)
- **T3.2** (US-3.8, US-4.5) Itinéraire Europe : source réelle Valhalla (`/route` + `/trace_attributes` : classe de voie, densité urbaine, pente, feux, péages, pays) — Stadia Maps hébergé (clé collée dans l’écran Moteurs) ou instance auto-hébergée ; IGN reste la source pour un trajet 100 % France ; découpage par pays traversé.
- **T3.3** (US-3.8) Géocodage Europe : source réelle Photon (komoot) pour l'autocomplétion hors de France, IGN en France ; User-Agent identifiant, debounce 300 ms, gestion 429.
- **T3.4** (US-4.5, US-4.E6) Moyennes par pays : source réelle Bulletin pétrolier hebdomadaire de la Commission européenne (xlsx, CC BY 4.0) importé chaque jeudi dans `moyennes_nationales` (colonne `pays`) ; France = flux instantané ; pays absent → moyenne UE signalée.
- **T3.5** (US-1.8) Stations hors de France : synchros réelles par pays (Espagne MITECO REST, Italie MIMIT CSV, Autriche E-Control, Allemagne Tankerkönig, Portugal DGEG, Slovénie goriva.si, Croatie mzoe-gor.hr — attention lat/long inversés, Danemark API d'enseignes, Royaume-Uni Fuel Finder), une fonction par pays avec reprise sur erreur ; pays sans flux → message et moyenne nationale.
- **T3.6** (US-4.4, US-4.5) Écran Résultat : total = carburant + péages, détail des péages, pays traversés, prix perso appliqué à tous les pays.
- **T3.7** Véhicules Europe : import EEA CO2 cars (Discodata SQL, agrégé par version) en complément d'ADEME ; modèle road-load + Willans calé sur le WLTP (`shared/conso.ts`).
- **T3.8** Tests Vitest (TVA, découpage par pays) + Playwright `m3-use-case.md`.
- **T3.0** (US-5.1 à US-5.5, US-5.E1 à E3) **Moteurs branchables, rien en dur** : table `moteurs` (service, fournisseur actif, fournisseur de secours, état, dernier test, bascule), clés dans **Supabase Vault** (jamais renvoyées au navigateur, seuls les 4 derniers caractères sont exposés) ; rôle administrateur par Supabase Auth (lien magique sur l'adresse d'Anthony, claim `admin`), RLS : table et fonctions réservées à l'admin ; Edge Function `moteurs` (lister, tester par un vrai appel, enregistrer) ; chaque Edge Function métier (`estimer-trajet`, `sync-prix`…) lit son fournisseur et sa clé dans `moteurs` à chaque appel, avec bascule sur le secours en cas d'erreur 5xx/timeout. Les services déjà construits aux jalons 1 et 2 (prix France, IGN, ADEME) passent aussi par ce registre. Écran S5 Moteurs.
