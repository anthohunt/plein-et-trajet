# Jalon 5 — V1 recentrée — journal d'exploration

## API Contract Check
Écrit par le bâtisseur r1a (21/10). Chaque appel front ↔ fonction écrit ou touché au jalon 5.

- FE: src/lib/eea.ts:17 (GET voiture-eea?d2=…, en-têtes apikey + Bearer anon) → BE: supabase/functions/voiture-eea/index.ts:51 (`searchParams.get("d2")`) — OK
- FE: src/lib/eea.ts:17 (GET voiture-eea?q=…) → BE: supabase/functions/voiture-eea/index.ts:52 (`searchParams.get("q")`) — OK
- FE: src/lib/eea.ts:23 (lit `versions[]` : cle, marque, modele, t, va, ve, annee, masse_kg, puissance_kw, cylindree_cm3, carburant, co2_nedc, co2_wltp, conso_officielle_l100, procedure, immatriculations, conso_phases) → BE: supabase/functions/voiture-eea/index.ts:73,80,90 (`{ versions }` = VersionEea de supabase/functions/_shared/eea.ts:131 ou ligne `versions_eea` aux mêmes noms de colonnes, migration 20261022090000) — OK
- FE: src/lib/eea.ts:24-26 (codes `code_inconnu`, `electrique`, `requete_invalide`, sinon `base_injoignable`) → BE: supabase/functions/voiture-eea/index.ts:65,77,84,89,94-95 (400 requete_invalide, 404 code_inconnu, 422 electrique, 502 base_injoignable) — OK
- FE: src/lib/nommer.ts:7-9 (POST lieux `{action:"nommer",lat,lon}`, lit `nom`) → BE: supabase/functions/lieux/index.ts:79-92 (`{ nom, pays }`) — OK
- FE: src/lib/donnees.ts:120 (POST lieux `{action:"pays",lat,lon}`, lit `pays.code`, `pays.nom`) appelé par src/lib/enregistreur-web.ts au départ → BE: supabase/functions/lieux/index.ts:67-77 (`{ pays:{code,nom}|null }`) — OK (inchangé)
- FE: src/lib/prixDuJour.ts:9,15 (rpc moyennes_par_pays par carburant, lit `pays`, `prix_moyen`) → BE: supabase/migrations/20261021090000_m3_moteurs_europe.sql:165-170 (`returns table (pays, prix_moyen, source, jour)`) — OK
- FE: src/routes/Stations.tsx:74,76 (rpc stations_autour sur le centre et le rayon de la zone affichée, puis prix du carburant) → BE: rpc stations_autour / table prix (jalons 1-4, inchangés) — OK
- FE: src/components/FicheStation.tsx (prixStation, lit `prix`, `rupture` du carburant de la voiture pour « Utiliser ce prix ») → BE: table prix (inchangée) — OK
- Plus appelés par la V1 (vérifié : 0 requête vers estimer-trajet, trajet-roule, api.myptv.com pendant un parcours T1→T6 en local) : estimer-trajet, trajet-roule ; leur appel aux péages est coupé côté serveur (supabase/functions/_shared/calcul-peages.ts:37-38, `en_service = false`).

Aucun MISMATCH.
