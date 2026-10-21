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

---

# Passage r1b voiture — début 2026-10-21T10:41:20.805Z

Appli déployée https://plein-et-trajet.vercel.app, base Supabase réelle, Playwright (bibliothèque), Chromium headless 390 × 844, toucher, fr-FR, Europe/Paris.
Réel : base EEA (fonction voiture-eea), moyennes du jour (FR SP95-E10 2,156 €/L, Gazole 2,368 €/L), stations et prix du jour, géocodage inverse (fonction lieux), refus de localisation (contexte sans permission), coupure réseau (context.setOffline).
Rejoué : géolocalisation par context.setGeolocation depuis tests/e2e/fixtures/albi-toulouse.gpx (et ses dérivés immobile / tunnel, et barcelone.gpx : vrai itinéraire Valhalla fabriqué par creer-gpx.mjs barcelone), horloge de la page accélérée par page.clock (méthode r1a : avancer l'horloge, poser la position, attendre que T3 l'ait comptée), au rythme réel (1 point/s) pendant les passages par Stations.

## V-2.E1 — Code inconnu

### Happy Path
- Step 1: champ D.2, je commence « ZZ999 » → champ « ZZ999 » ; aucune fiche → capture `V-2.E1-01-avant.png` ✓ (10:41:34Z, md5 f8b54811)
- Step 2: je tape « ZZ9999 » (absent de la base EEA) → « Code introuvable. Vérifie la case D.2, ou cherche par nom ci-dessous. » (data-code code_inconnu) ; « Enregistrer ma voiture » désactivé → capture `V-2.E1-02-apres.png` ✓ (10:41:37Z, md5 e30ab651)
- Step 3: MOCKED (page.route : la base européenne ne tombe pas sur commande) — base injoignable, je commence « 5RBF0 » → champ « 5RBF0 » ; réponse de voiture-eea remplacée par un 502 base_injoignable côté navigateur → capture `V-2.E1-03-avant.png` ✓ (10:41:37Z, md5 d46b5b75)
- Step 4: MOCKED — je tape « 5RBF0A » → « La base européenne des voitures ne répond pas. Réessayer » ; champ toujours « 5RBF0A » ; « Enregistrer ma voiture » désactivé : true → capture `V-2.E1-04-apres.png` ✓ (10:41:39Z, md5 ca070417)

### Edge Case / constats
- Step 4 — route retirée puis « Réessayer » touché : la vraie base répond, fiche « RENAULT CLIO 1.5 · 75 CH · Gazole » (après la capture).

### Issues Found
- aucune sur la version déployée à cette passe.

## V-2.3 — Chercher sans la carte grise

### Happy Path
- Step 1: je touche le champ « Nom, année, puissance » → champ recherche vide et sélectionné (focus #q) → capture `V-2.3-01-avant.png` ✓ (10:41:44Z, md5 d2f35003)
- Step 2: je tape « clio 2017 120 » → suggestion hors Clio 2017 : Renault Clio 1.2 · 118 ch 2017 · 87 kW · 1 165 kg · SP95-E10 · D.2 5RBU0C → capture `V-2.3-02-apres.png` ✗ (10:41:48Z, md5 9bc5666c)
- Step 3: la première suggestion (sélectionnée au clavier) → « Renault Clio 1.2 · 118 ch 2017 · 87 kW · 1 165 kg · SP95-E10 · D.2 5RBU0C » → capture `V-2.3-03-avant.png` ✓ (10:41:48Z, md5 b78c73bc)
- Step 4: je la touche → fiche « RENAULT CLIO 1.2 · 118 CH » 2017 · 87 kW · 118 ch · 1 165 kg · SP95-E10 (data-cle RENAULT·R·5RBU·5RBU0C·2017) ; « Enregistrer ma voiture » actif → capture `V-2.3-04-apres.png` ✓ (10:41:49Z, md5 fbf817c9)

### Issues Found
- Step 2 (V-2.3-02-apres.png) : suggestion hors Clio 2017 : Renault Clio 1.2 · 118 ch 2017 · 87 kW · 1 165 kg · SP95-E10 · D.2 5RBU0C

## V-2.1 — Saisir le code D.2

### Happy Path
- Step 1: écran Ma voiture, je touche le champ D.2 → champ D.2 vide et sélectionné (focus d2) ; « Enregistrer ma voiture » désactivé → capture `V-2.1-01-avant.png` ✓ (10:41:23Z, md5 c45e4a62)
- Step 2: je tape « 5RBU0C » (code déjà en cache versions_eea) → fiche « RENAULT CLIO 1.2 · 118 CH » : année 2017 · 87 kW · 118 ch · 1 197 cm³ · 1 165 kg · SP95-E10 · 118 g/km (NEDC) · « Base européenne EEA » ; liste : Renault Clio 1.2 · 118 ch 2017 · 87 kW · 1 165 kg · SP95-E10 · 13 864 immatriculées Renault Clio 1.2 · 118 ch 2018 · 87 kW · 1 165 kg · SP95-E10 · 11 043 immatriculées → capture `V-2.1-02-apres.png` ✓ (10:41:25Z, md5 2e1012d9)
- Step 3: code partagé par plusieurs versions, jamais demandé à l'appli : je commence à taper « M611Z1 » (5 caractères) → champ « M611Z » ; M611Z1 absent de versions_eea (0 ligne, lu par l'API) ; aucune recherche avant 6 caractères → capture `V-2.1-03-avant.png` ✓ (10:41:26Z, md5 33ff2443)
- Step 4: je tape le dernier caractère (« M611Z1 ») puis je choisis la 2e version → 10 versions, la plus immatriculée en tête (94483 ≥ 68445 ≥ 43198 ≥ 34885…) ; marques Hyundai, Kia ; années  ; masses 1 489, 1 490, 1 559 kg ; 1re : « Hyundai Tucson Se Nav Gdi 2wd 1.6 · 132 ch 2019 · 97 kW · 1 489 kg · SP95-E10 · 94 483 immatriculées » ; 2e touchée → fiche « KIA SPORTAGE 1.6 · 132 CH » → capture `V-2.1-04-apres.png` ✓ (10:41:31Z, md5 5e9b0387)
- Step 5: je commence à taper en minuscules avec espaces : « r 5rbu » → champ « R 5RBU » (saisie en minuscules mise en majuscules à la frappe) ; pas de recherche (5 caractères sans espaces) → capture `V-2.1-05-avant.png` ✓ (10:41:31Z, md5 5776799f)
- Step 6: je finis « r 5rbu 5rbu0c » → champ « R 5RBU 5RBU0C » ; requête envoyée « d2=R 5RBU 5RBU0C » ; fiche « RENAULT CLIO 1.2 · 118 CH · 2017 » (data-cle RENAULT·R·5RBU·5RBU0C·2017) : reconnu comme 5RBU0C → capture `V-2.1-06-apres.png` ✓ (10:41:33Z, md5 abdd8900)

### Edge Case / constats
- Step 2 — écart de libellé face au plan : l'écran nomme « RENAULT CLIO 1.2 · 118 CH » ; le plan dit « Renault Clio 1.2 TCe 120 ». La base EEA ne porte ni « TCe » ni « 120 » (Cn = CLIO) ; les chiffres sont ceux du plan.
- Step 2 — cache : 5RBU0C présent dans versions_eea AVANT la saisie (2 lignes, années 2017/2018) : c'est le chemin « version déjà en cache ».
- Step 4 — chemin « jamais demandée » : M611Z1 absent du cache avant, 10 ligne(s) dans versions_eea après (écrites par la fonction).

### Issues Found
- aucune sur la version déployée à cette passe.

## V-1.2 — Voir ma voiture

### Happy Path
- Step 1: la Clio enregistrée ; je suis sur l'onglet Historique → onglet onglet-historique ; voiture gardée 5RBU0C → capture `V-1.2-01-avant.png` ✓ (10:41:51Z, md5 991f8a77)
- Step 2: je touche l'onglet Trajet : l'accueil s'affiche → écran « RENAULT CLIO » « 1.2 · 118 ch · 2017 · SP95-E10 » → capture `V-1.2-02-apres.png` ✗ (10:41:52Z, md5 25c9bd31)
- Step 3: l'accueil, « Changer » sélectionné au clavier → focus sur « Changer » → capture `V-1.2-03-avant.png` ✓ (10:41:52Z, md5 25c9bd31)
- Step 4: je touche « Changer » → écran Ma voiture, D.2 « » et recherche « » vides ; aucune fiche (0) → capture `V-1.2-04-apres.png` ✓ (10:41:52Z, md5 0af42123)
- Step 5: l'appli fermée (navigateur fermé puis relancé sur le même profil ; onglet vide about:blank) → URL about:blank → capture `V-1.2-05-avant.png` ✓ (10:41:58Z, md5 f95c356b)
- Step 6: je rouvre l'appli → accueil : « RENAULT CLIO » « 1.2 · 118 ch · 2017 · SP95-E10 », rien ressaisi → capture `V-1.2-06-apres.png` ✓ (10:42:00Z, md5 25c9bd31)

### Issues Found
- Step 2 (V-1.2-02-apres.png) : écran « RENAULT CLIO » « 1.2 · 118 ch · 2017 · SP95-E10 »

## V-2.2 — Vérifier et enregistrer

### Happy Path
- Step 1: la fiche de ma version (5RBU0C, 2017) affichée → fiche « RENAULT CLIO 1.2 · 118 CH · 2017 » ; bouton « Enregistrer ma voiture » actif → capture `V-2.2-01-avant.png` ✓ (10:41:50Z, md5 c150a3a4)
- Step 2: je touche « Enregistrer ma voiture » → accueil : « RENAULT CLIO » « 1.2 · 118 ch · 2017 · SP95-E10 » ; localStorage pt-voiture-v1 = Renault Clio 5RBU0C 2017 → capture `V-2.2-02-apres.png` ✓ (10:41:51Z, md5 25c9bd31)
- Step 3: aucune version identifiée : D.2 vide, « zz » dans la recherche par nom → D.2 «  », recherche « zz » (moins de 3 caractères : pas de recherche) ; aucune fiche (0) → capture `V-2.2-03-avant.png` ✓ (10:41:43Z, md5 7c9b9ad5)
- Step 4: je regarde « Enregistrer ma voiture » (D.2 incomplet « 5RB ») → aucune fiche ; « Enregistrer ma voiture » désactivé (disabled) → capture `V-2.2-04-apres.png` ✓ (10:41:44Z, md5 ecc668f8)

### Edge Case / constats
- Step 2 — après fermeture du navigateur et relance sur le même profil, l'accueil rappelle la même voiture (V-1.2-06).

### Issues Found
- aucune sur la version déployée à cette passe.

## V-1.1 — Ouvrir l'appli

### Happy Path
- Step 1: une voiture enregistrée ; l'appli était restée sur l'onglet Stations → onglet onglet-stations ; voiture 5RBU0C → capture `V-1.1-01-avant.png` ✓ (10:41:55Z, md5 0fabfa07)
- Step 2: j'ouvre l'appli (nouvel onglet sur l'adresse de l'appli) → pas de bouton Démarrer → capture `V-1.1-02-apres.png` ✗ (10:41:57Z, md5 25c9bd31)
- Step 3: premier lancement (profil neuf, aucune voiture), j'ouvre l'appli → texte T1 : ENREGISTRE D'ABORD TA VOITURE Le code D.2 de ta carte grise, une seule fois. DÉMARRER → capture `V-1.1-03-avant.png` ✗ (10:41:22Z, md5 c213538e)
- Step 4: je touche « Démarrer » sans voiture → URL /voiture, écran Ma voiture (« MA VOITURE ») ; aucun enregistrement en IndexedDB → capture `V-1.1-04-apres.png` ✓ (10:41:23Z, md5 c427090c)

### Issues Found
- Step 3 (V-1.1-03-avant.png) : texte T1 : ENREGISTRE D'ABORD TA VOITURE Le code D.2 de ta carte grise, une seule fois. DÉMARRER
- Step 2 (V-1.1-02-apres.png) : pas de bouton Démarrer

## Régression (passage voiture)
- (rejouée par la spec m5-regression)

## Erreurs de page relevées
- aucune

---

# Passage r1b trajet — début 2026-10-21T10:42:34.039Z

Appli déployée https://plein-et-trajet.vercel.app, base Supabase réelle, Playwright (bibliothèque), Chromium headless 390 × 844, toucher, fr-FR, Europe/Paris.
Réel : base EEA (fonction voiture-eea), moyennes du jour (FR SP95-E10 2,156 €/L, Gazole 2,368 €/L), stations et prix du jour, géocodage inverse (fonction lieux), refus de localisation (contexte sans permission), coupure réseau (context.setOffline).
Rejoué : géolocalisation par context.setGeolocation depuis tests/e2e/fixtures/albi-toulouse.gpx (et ses dérivés immobile / tunnel, et barcelone.gpx : vrai itinéraire Valhalla fabriqué par creer-gpx.mjs barcelone), horloge de la page accélérée par page.clock (méthode r1a : avancer l'horloge, poser la position, attendre que T3 l'ait comptée), au rythme réel (1 point/s) pendant les passages par Stations.

## V-5.3 — Rechercher dans cette zone

### Happy Path
- Step 1: la carte des stations (trajet en cours) → en-tête « Autour de moi » ; 8 stations ; centre 43.928, 2.146 zoom 10.3 → capture `V-5.3-01-avant.png` ✓ (10:43:05Z, md5 475f8d18)
- Step 2: je fais glisser la carte vers Montauban (5 glissements au doigt-souris) → bouton « Rechercher dans cette zone » affiché ; liste inchangée (8 stations, mêmes id) ; en-tête « Autour de moi » ; centre 44.018, 1.415 → capture `V-5.3-02-apres.png` ✓ (10:43:14Z, md5 3a4458fd)
- Step 3: le bouton « Rechercher dans cette zone » (carte recentrée sur Montauban d'un dernier glissement) → centre 44.018, 1.355 ; liste toujours celle d'avant (8 stations) → capture `V-5.3-03-avant.png` ✓ (10:43:17Z, md5 d2062446)
- Step 4: je touche « Rechercher dans cette zone » → bouton disparu ; en-tête « Autour de Montauban » ; 10 stations, toutes à moins de 9.6 km du centre affiché (44.018, 1.355), 10 pastilles ; 1re (Moins cher) « TotalEnergies Access Montauban · Relais Tescou 65,0 km · il y a 2 h · −16,6 c vs France 1,990 €/L » → capture `V-5.3-04-apres.png` ✓ (10:43:18Z, md5 f776238e)

### Issues Found
- aucune sur la version déployée à cette passe.

## V-3.1 — Suivre en direct

### Happy Path
- Step 1: enregistrement en cours, 200 positions rejouées → 19 km/h · 0,8 km · 0,06 L · 0,14 € · 0:03 · 14 km/h moy. · 8,2 L/100 · 200 points → capture `V-3.1-01-avant.png` ✓ (10:42:41Z, md5 20de77f8)
- Step 2: je roule : 200 positions de plus (1 par seconde d'horloge) → vitesse lue après chaque position : 52 changements sur 200 s (la vitesse est redessinée à chaque position, soit chaque seconde ; plus longue valeur identique : 57 s, arrêts du GPX compris) ; courbe « Vitesse des 3 dernières minutes » ; 19 km/h · 0,8 km · 0,06 L · 0,14 € · 0:03 · 14 km/h moy. · 8,2 L/100 · 200 points → 29 km/h · 1,8 km · 0,16 L · 0,33 € · 0:06 · 17 km/h moy. · 8,4 L/100 · 400 points → capture `V-3.1-02-apres.png` ✓ (10:42:45Z, md5 061d5f77)
- Step 3: aucun prix choisi (aucune station touchée) → « Prix : moyenne France du jour · 2,156 €/L » → capture `V-3.1-03-avant.png` ✓ (10:42:46Z, md5 5b505aa7)
- Step 4: le coût en direct s'affiche → 0,20 L × 2,156 €/L (moyenne France du jour SP95-E10 lue par l'API : 2,156) = 0,431 → affiché 0,43 € ; « Prix : moyenne France du jour · 2,156 €/L » → capture `V-3.1-04-apres.png` ✓ (10:42:47Z, md5 4e481429)
- Step 5: un prix pris sur une station (« Utiliser ce prix ») → « Prix : mon prix · 1,990 €/L » ; 0 km/h · 2,5 km · 0,21 L · 0,41 € · 0:08 · 17 km/h moy. · 8,3 L/100 · 517 points → capture `V-3.1-05-avant.png` ✓ (10:43:20Z, md5 fab9d965)
- Step 6: le coût en direct s'affiche (60 positions plus loin) → 0,21 L × 1,990 = 0,418 → affiché 0,41 € ; « Prix : mon prix · 1,990 €/L » → capture `V-3.1-06-apres.png` ✓ (10:43:21Z, md5 eff19eaf)

### Issues Found
- aucune sur la version déployée à cette passe.

## V-3.4 — Mettre en pause

### Happy Path
- Step 1: un enregistrement en cours (A68) → 105 km/h · 30,3 km · 2,09 L · 4,16 € · 0:29 · 62 km/h moy. · 6,9 L/100 · 1748 points → capture `V-3.4-01-avant.png` ✓ (10:43:56Z, md5 29dfd46b)
- Step 2: je touche « Pause » puis 20 positions arrivent → « En pause », bouton « Reprendre » ; km 30,3 et litres 2,09 inchangés malgré 0,58 km parcourus sur le GPX → capture `V-3.4-02-apres.png` ✓ (10:43:57Z, md5 35a8bedd)
- Step 3: une pause pendant laquelle la voiture s'est déplacée → déplacement pendant la pause : 2,07 km (GPX, points 1750 → 1821) ; affiché toujours 30,3 km, 2,09 L → capture `V-3.4-03-avant.png` ✓ (10:43:59Z, md5 0b65a890)
- Step 4: je touche « Reprendre » puis 60 positions → « Enregistrement » ; km 30,3 → 32,1 (+1,8) = distance roulée depuis la reprise (1,72 km) ; les 2,07 km de la pause ne sont ni comptés ni chiffrés → capture `V-3.4-04-apres.png` ✓ (10:44:02Z, md5 1123074f)

### Issues Found
- aucune sur la version déployée à cette passe.

## V-4.5 — Courbe de vitesse

### Happy Path
- Step 1: un trajet enregistré (sa ligne sélectionnée dans l'Historique) → « Albi → Toulouse 21 oct. · 74,9 km · 3,39 € chacun 10,16 € » → capture `V-4.5-01-avant.png` ✓ (10:44:57Z, md5 31c8e608)
- Step 2: la fin de trajet s'affiche (rouverte) — courbe de vitesse → « 63 km/h moy. · 4 accélérations » ; 600 points de courbe (≤ 600) pour 4348 s de trajet ; vitesse moyenne affichée 63 km/h ; km ÷ durée roulée (4276 s, pause exclue) = 63.0 km/h ; km ÷ durée totale = 62.0 km/h ; 4 accélérations → capture `V-4.5-02-apres.png` ✓ (10:44:58Z, md5 448892bb)

### Issues Found
- aucune sur la version déployée à cette passe.

## V-4.6 — Courbe de consommation

### Happy Path
- Step 1: un trajet enregistré (fin rouverte, haut de l'écran) → onglet onglet-historique ; « ← Historique » ; « Albi → Toulouse » → capture `V-4.6-01-avant.png` ✓ (10:44:58Z, md5 d5fbf685)
- Step 2: la courbe de consommation → « moy. 6,8 · pointe 41,2 L/100 » ; litres ÷ km × 100 = 5.108 ÷ 74.88 × 100 = 6.82 ; 600 points (moyenne simple des points de la courbe : 6.82, non pondérée par la distance) → capture `V-4.6-02-apres.png` ✓ (10:44:58Z, md5 63acd0f9)

### Issues Found
- aucune sur la version déployée à cette passe.

## V-1.3 — Démarrer

### Happy Path
- Step 1: la Clio enregistrée, localisation autorisée, position = 1er point du GPX (Albi, place du Vigan) → accueil « Renault Clio » ; permission géolocalisation accordée au contexte → capture `V-1.3-01-avant.png` ✓ (10:42:37Z, md5 25c9bd31)
- Step 2: je touche « Démarrer » → écran En route, « Enregistrement » (pastille animée : clignote infinite) ; 1re position enregistrée en 75 ms (data-points 1) ; IndexedDB enregistrement : présent → capture `V-1.3-02-apres.png` ✓ (10:42:38Z, md5 4b079d85)

### Issues Found
- aucune sur la version déployée à cette passe.

## V-5.6 — Trajet en cours

### Happy Path
- Step 1: un trajet en cours ; je touche l'onglet Stations (positions envoyées au rythme réel, 1 par seconde) → écran Stations ouvert ; bandeau « ● Trajet en cours · 0,45 € » → capture `V-5.6-01-avant.png` ✓ (10:42:50Z, md5 2ad8c181)
- Step 2: l'onglet Stations est ouvert → bandeau en haut « ● Trajet en cours · 0,45 € » (coût en direct ; 0,45 € sur En route juste avant) ; 8 stations listées → capture `V-5.6-02-apres.png` ✓ (10:42:54Z, md5 55271341)
- Step 3: ce bandeau, 6 s plus tard → « ● Trajet en cours · 0,45 € » ; positions rejouées : 495 → capture `V-5.6-03-avant.png` ✓ (10:43:00Z, md5 55271341)
- Step 4: je touche l'onglet Trajet → écran En route revenu ; 495 points (494 au moment du toucher) ; 0 km/h · 2,5 km · 0,21 L · 0,45 € · 0:08 · 18 km/h moy. · 8,3 L/100 · 495 points → capture `V-5.6-04-apres.png` ✓ (10:43:01Z, md5 e3e4fbec)

### Edge Case / constats
- Step 2 — sans trajet en cours (même téléphone, avant Démarrer) : bandeau « retour-trajet » présent 0 fois (attendu 0).

### Issues Found
- aucune sur la version déployée à cette passe.

## V-5.5 — Utiliser ce prix

### Happy Path
- Step 1: trajet en cours ; la fiche de la 1re station « Moins cher » de Montauban → fiche « TotalEnergies Access Montauban · Relais Tescou » ; bouton « Utiliser 1,990 €/L pour mon trajet » ; prix SP95-E10 en base pour 82000015 : 1,990 €/L. (Le plan cite 2,103 €/L à titre d'exemple : le prix réel du jour est celui lu ici.) → capture `V-5.5-01-avant.png` ✓ (10:43:18Z, md5 c391ad2c)
- Step 2: je touche « Utiliser 1,990 €/L pour mon trajet » → fiche fermée, écran En route ; « Prix : mon prix · 1,990 €/L » ; 0,21 L × 1,990 = 0,418 → 0,41 € (la fin de trajet est relue plus bas) → capture `V-5.5-02-apres.png` ✓ (10:43:19Z, md5 b8a2781f)

### Edge Case / constats
- Step 2 — fin de trajet : libellé « Mon prix », prix data-prix 1.99 (station : 1,990), coût 10,16 € essence.

### Issues Found
- aucune sur la version déployée à cette passe.

## V-5.1 — Stations autour de moi

### Happy Path
- Step 3: un trajet en cours (A68, 1 450 positions) ; j'ouvre l'onglet Stations → écran Stations, bandeau « ● Trajet en cours · 2,89 € » ; sur En route juste avant : 105 km/h · 21,6 km · 1,45 L · 2,89 € · 0:24 · 54 km/h moy. · 6,7 L/100 · 1449 points → capture `V-5.1-03-avant.png` ✓ (10:43:38Z, md5 bd14d91b)
- Step 4: je reviens au trajet (onglet Trajet) après 12 s dans Stations → distance 21,6 → 22,0 km, points 1449 → 1462 : l'enregistrement a continué pendant Stations → capture `V-5.1-04-apres.png` ✓ (10:43:51Z, md5 0f92ae0c)

### Issues Found
- aucune sur la version déployée à cette passe.

## V-3.5 — Arrêter

### Happy Path
- Step 1: un enregistrement de plus de 1 km (arrivée au Capitole, Toulouse) → 10 km/h · 74,9 km · 5,11 L · 10,16 € · 1:11 · 63 km/h moy. · 6,8 L/100 · 4276 points → capture `V-3.5-01-avant.png` ✓ (10:44:54Z, md5 d98c1c28)
- Step 2: je touche « Arrêter » → « Albi → Toulouse » ; « 21 oct. 2026 · 1 h 11 · Renault Clio » ; 5,1 L (5.108), 74,9 km (74.88), 6,8 L/100 km moy. → capture `V-3.5-02-apres.png` ✓ (10:44:56Z, md5 d7390b1f)

### Issues Found
- aucune sur la version déployée à cette passe.

## V-4.7 — Enregistrer ou supprimer

### Happy Path
- Step 1: un trajet qui vient d'être arrêté (3 personnes choisies) → prix « Mon prix » 1,990 €/L ; coût 10,16 € ; « 3,39 € chacun » ; boutons « Supprimer Enregistrer » → capture `V-4.7-01-avant.png` ✓ (10:44:56Z, md5 5fa21f2c)
- Step 2: je touche « Enregistrer » → onglet Historique, en tête : « Albi → Toulouse 21 oct. · 74,9 km · 3,39 € chacun 10,16 € » ; IndexedDB : prix 1.99 (station), carburant SP95-E10, 3 personnes, enregistré ; totaux « 1 trajets 75 km 10,16 € essence » → capture `V-4.7-02-apres.png` ✓ (10:44:57Z, md5 31c8e608)

### Edge Case / constats
- Démonstration : coût 10,16 € au prix de la station 1,990 €/L, partagé à 3.

### Issues Found
- aucune sur la version déployée à cette passe.

## V-1.1 — Ouvrir l'appli

### Happy Path
- Step 5: un trajet en cours d'enregistrement ; je suis sur l'onglet Historique → onglet onglet-historique ; IndexedDB enregistrement : 483 points → capture `V-1.1-05-avant.png` ✓ (10:42:48Z, md5 593ca088)
- Step 6: je touche l'onglet Trajet → URL /en-route, écran En route « Enregistrement » (pas l'accueil) → capture `V-1.1-06-apres.png` ✓ (10:42:48Z, md5 a3e693b8)

### Issues Found
- aucune sur la version déployée à cette passe.

## Régression (passage trajet)
- (rejouée par la spec m5-regression)

## Erreurs de page relevées
- aucune

---

# Passage r1b cas — début 2026-10-21T10:46:47.214Z

Appli déployée https://plein-et-trajet.vercel.app, base Supabase réelle, Playwright (bibliothèque), Chromium headless 390 × 844, toucher, fr-FR, Europe/Paris.
Réel : base EEA (fonction voiture-eea), moyennes du jour (FR SP95-E10 2,156 €/L, Gazole 2,368 €/L), stations et prix du jour, géocodage inverse (fonction lieux), refus de localisation (contexte sans permission), coupure réseau (context.setOffline).
Rejoué : géolocalisation par context.setGeolocation depuis tests/e2e/fixtures/albi-toulouse.gpx (et ses dérivés immobile / tunnel, et barcelone.gpx : vrai itinéraire Valhalla fabriqué par creer-gpx.mjs barcelone), horloge de la page accélérée par page.clock (méthode r1a : avancer l'horloge, poser la position, attendre que T3 l'ait comptée), au rythme réel (1 point/s) pendant les passages par Stations.

## V-1.3 — Démarrer (localisation refusée)

### Happy Path
- Step 3: la localisation refusée (contexte sans permission geolocation) → accueil « Renault Clio » ; permission géolocalisation : denied → capture `V-1.3-03-avant.png` ✓ (10:46:48Z, md5 1f66d5d0)
- Step 4: je touche « Démarrer » → « L'enregistrement a besoin de ta localisation Cadenas de la barre d'adresse → Position → Autoriser » ; URL / ; IndexedDB : enregistrement absent, 0 trajet → capture `V-1.3-04-apres.png` ✓ (10:46:48Z, md5 4cfb9d3a)

### Issues Found
- aucune sur la version déployée à cette passe.

## V-3.5 — Arrêter (cas limites)

### Happy Path
- Step 3: un enregistrement de moins de 1 km (150 positions) → 19 km/h · 0,5 km · 0,04 L · 0,09 € · 0:02 · 12 km/h moy. · 8,4 L/100 · 150 points → capture `V-3.5-03-avant.png` ✓ (10:46:53Z, md5 5ed5c927)
- Step 4: je touche « Arrêter » → « Trajet trop court : 0,5 km sur 1 minimum. Rien n'est ajouté à l'historique. Retour à l'accueil » ; IndexedDB : 0 trajet, pas de trajet arrêté, pas d'enregistrement → capture `V-3.5-04-apres.png` ✓ (10:46:53Z, md5 b9ab7181)
- Step 5: aucun réseau (context.setOffline(true)) juste avant l'arrêt — 420 positions → navigator.onLine = false ; 28 km/h · 2,0 km · 0,17 L · 0,36 € · 0:06 · 17 km/h moy. · 8,4 L/100 · 420 points ; « Prix : moyenne France du jour · 2,156 €/L » → capture `V-3.5-05-avant.png` ✓ (10:47:03Z, md5 c2cbe533)
- Step 6: la fin de trajet s'ouvre sans réseau → hors ligne : « 43,928 · 2,146 → 43,917 · 2,144 » (coordonnées, noms pas encore connus) ; 0,168 L × 2,156 €/L (moyenne gardée au départ) = 0,36 € calculés sur le téléphone → capture `V-3.5-06-apres.png` ✓ (10:47:04Z, md5 eb84daab)

### Edge Case / constats
- Step 6 — au retour du réseau (setOffline(false) → événement online), le titre passe de « 43,928 · 2,146 → 43,917 · 2,144 » à « Albi → Albi » sans rien toucher ; requêtes tentées pendant la coupure : 4 (refusées par le navigateur hors ligne).

### Issues Found
- aucune sur la version déployée à cette passe.

> Flux « cas » interrompu à 10:48:04Z : locator.tap: Timeout 30000ms exceeded.

## V-4.7 — Enregistrer ou supprimer (supprimer, appli fermée)

### Happy Path
- Step 3: un trajet qui vient d'être arrêté (celui de la coupure réseau, noms complétés) → « Albi → Albi » ; boutons « Supprimer Enregistrer » → capture `V-4.7-03-avant.png` ✓ (10:47:04Z, md5 2f9cd5d4)
- Step 4: je touche « Supprimer » →  → capture `V-4.7-04-apres.png` ✗ (10:47:05Z, md5 25c9bd31)

### Issues Found
- Step 4 (V-4.7-04-apres.png) : 

## V-3.E1 — Oubli d'arrêter

### Happy Path
- Step 1: un enregistrement en cours (700 positions, 4 km dans Albi) → 30 km/h · 2,8 km · 0,24 L · 0,51 € · 0:11 · 14 km/h moy. · 8,5 L/100 · 700 points → capture `V-3.E1-01-avant.png` ✓ (10:47:18Z, md5 052b37c1)
- Step 2: vitesse < 3 km/h et position dans 50 m pendant 10 min (points 774 → 1375 du tracé dérivé) → « Trajet arrêté : immobile depuis 10 min. Reprendre C'est fini » au point 1375 (601 s après le début de l'immobilité) ; début daté 10:59:59 (point 774 reçu à 10:59:58, écart 1 s) ; 5 positions de plus : km 4,0 et litres 0,33 figés ; état « Immobile depuis 10 min » → capture `V-3.E1-02-apres.png` ✓ (10:47:30Z, md5 c2d7a3e6)
- Step 3: cette alerte (« C'est fini » sélectionné) → focus « C'est fini » → capture `V-3.E1-03-avant.png` ✓ (10:47:31Z, md5 c2d7a3e6)
- Step 4: je touche « C'est fini » → « Albi → Le Sequestre » « 21 oct. 2026 · 12 min · Renault Clio » ; arrivée datée 10:59:59 = début de l'immobilité (point 774, écart 1.0 s) ; durée 774 s : les 10 min d'arrêt ne comptent pas ; 4,02 km → capture `V-3.E1-04-apres.png` ✓ (10:47:32Z, md5 fe181b99)

### Issues Found
- aucune sur la version déployée à cette passe.

## V-3.E2 — GPS perdu

### Happy Path


### Issues Found
- aucune sur la version déployée à cette passe.

## V-4.1 — Prix de l'essence

### Happy Path


### Issues Found
- aucune sur la version déployée à cette passe.

## V-4.2 — Mettre mon prix

### Happy Path


### Issues Found
- aucune sur la version déployée à cette passe.

## Régression (passage cas)
- (rejouée par la spec m5-regression)

## Erreurs de page relevées
- aucune

---

# Passage r1b cas — début 2026-10-21T10:48:19.537Z

Appli déployée https://plein-et-trajet.vercel.app, base Supabase réelle, Playwright (bibliothèque), Chromium headless 390 × 844, toucher, fr-FR, Europe/Paris.
Réel : base EEA (fonction voiture-eea), moyennes du jour (FR SP95-E10 2,156 €/L, Gazole 2,368 €/L), stations et prix du jour, géocodage inverse (fonction lieux), refus de localisation (contexte sans permission), coupure réseau (context.setOffline).
Rejoué : géolocalisation par context.setGeolocation depuis tests/e2e/fixtures/albi-toulouse.gpx (et ses dérivés immobile / tunnel, et barcelone.gpx : vrai itinéraire Valhalla fabriqué par creer-gpx.mjs barcelone), horloge de la page accélérée par page.clock (méthode r1a : avancer l'horloge, poser la position, attendre que T3 l'ait comptée), au rythme réel (1 point/s) pendant les passages par Stations.

## V-1.3 — Démarrer (localisation refusée)

### Happy Path
- Step 3: la localisation refusée (contexte sans permission geolocation) → accueil « Renault Clio » ; permission géolocalisation : denied → capture `V-1.3-03-avant.png` ✓ (10:48:20Z, md5 1f66d5d0)
- Step 4: je touche « Démarrer » → « L'enregistrement a besoin de ta localisation Cadenas de la barre d'adresse → Position → Autoriser » ; URL / ; IndexedDB : enregistrement absent, 0 trajet → capture `V-1.3-04-apres.png` ✓ (10:48:21Z, md5 4cfb9d3a)

### Issues Found
- aucune sur la version déployée à cette passe.

## V-3.5 — Arrêter (cas limites)

### Happy Path
- Step 3: un enregistrement de moins de 1 km (150 positions) → 19 km/h · 0,5 km · 0,04 L · 0,09 € · 0:02 · 12 km/h moy. · 8,4 L/100 · 150 points → capture `V-3.5-03-avant.png` ✓ (10:48:25Z, md5 09e1c431)
- Step 4: je touche « Arrêter » → « Trajet trop court : 0,5 km sur 1 minimum. Rien n'est ajouté à l'historique. Retour à l'accueil » ; IndexedDB : 0 trajet, pas de trajet arrêté, pas d'enregistrement → capture `V-3.5-04-apres.png` ✓ (10:48:25Z, md5 b9ab7181)
- Step 5: aucun réseau (context.setOffline(true)) juste avant l'arrêt — 420 positions → navigator.onLine = false ; 28 km/h · 2,0 km · 0,17 L · 0,36 € · 0:06 · 17 km/h moy. · 8,4 L/100 · 420 points ; « Prix : moyenne France du jour · 2,156 €/L » → capture `V-3.5-05-avant.png` ✓ (10:48:34Z, md5 93047e33)
- Step 6: la fin de trajet s'ouvre sans réseau → hors ligne : « 43,928 · 2,146 → 43,917 · 2,144 » (coordonnées, noms pas encore connus) ; 0,168 L × 2,156 €/L (moyenne gardée au départ) = 0,36 € calculés sur le téléphone → capture `V-3.5-06-apres.png` ✓ (10:48:36Z, md5 eb84daab)

### Edge Case / constats
- Step 6 — au retour du réseau (setOffline(false) → événement online), le titre passe de « 43,928 · 2,146 → 43,917 · 2,144 » à « Albi → Albi » sans rien toucher ; requêtes tentées pendant la coupure : 4 (refusées par le navigateur hors ligne).

### Issues Found
- aucune sur la version déployée à cette passe.

## V-3.E1 — Oubli d'arrêter

### Happy Path
- Step 1: un enregistrement en cours (700 positions, 4 km dans Albi) → 30 km/h · 2,8 km · 0,24 L · 0,51 € · 0:11 · 14 km/h moy. · 8,5 L/100 · 700 points → capture `V-3.E1-01-avant.png` ✓ (10:48:49Z, md5 6a933648)
- Step 2: vitesse < 3 km/h et position dans 50 m pendant 10 min (points 774 → 1375 du tracé dérivé) → « Trajet arrêté : immobile depuis 10 min. Reprendre C'est fini » au point 1375 (601 s après le début de l'immobilité) ; début daté 11:01:31 (point 774 reçu à 11:01:30, écart 1 s) ; 5 positions de plus : km 4,0 et litres 0,33 figés ; état « Immobile depuis 10 min » → capture `V-3.E1-02-apres.png` ✓ (10:49:04Z, md5 c2d7a3e6)
- Step 3: cette alerte (« C'est fini » sélectionné) → focus « C'est fini » → capture `V-3.E1-03-avant.png` ✓ (10:49:04Z, md5 c2d7a3e6)
- Step 4: je touche « C'est fini » → « Albi → Le Sequestre » « 21 oct. 2026 · 12 min · Renault Clio » ; arrivée datée 11:01:31 = début de l'immobilité (point 774, écart 1.0 s) ; durée 774 s : les 10 min d'arrêt ne comptent pas ; 4,02 km → capture `V-3.E1-04-apres.png` ✓ (10:49:05Z, md5 fe181b99)
- Step 5: cette alerte (2e trajet rejoué ; « Reprendre » sélectionné) → « Trajet arrêté : immobile depuis 10 min. Reprendre C'est fini » ; 775 points gardés → capture `V-3.E1-05-avant.png` ✓ (10:49:31Z, md5 c2d7a3e6)
- Step 6: je touche « Reprendre » → page.waitForFunction: Timeout 5000ms exceeded. → capture `V-3.E1-06-apres.png` ✗ (10:49:36Z, md5 27d0316e)

### Issues Found
- Step 6 (V-3.E1-06-apres.png) : page.waitForFunction: Timeout 5000ms exceeded.

## V-3.E2 — GPS perdu

### Happy Path
- Step 1: un enregistrement en cours (A68, 121 positions, dernière avant le tunnel) → 105 km/h · 3,5 km · 0,23 L · 0,50 € · 0:02 · 105 km/h moy. · 6,7 L/100 · 121 points → capture `V-3.E2-01-avant.png` ✓ (10:49:42Z, md5 5d2ad664)
- Step 2: aucune position pendant 16 s → « GPS perdu (tunnel) · la distance est complétée à la sortie. » ; data-etat gps-perdu ; vitesse 0 km/h → capture `V-3.E2-02-apres.png` ✓ (10:49:42Z, md5 872702f5)
- Step 3: le signal revient après 90 s sans position (tunnel de 3,00 km) → toujours « GPS perdu (tunnel) · la distance est complétée à la sortie. » ; 3,5 km figés → capture `V-3.E2-03-avant.png` ✓ (10:49:43Z, md5 fec286af)
- Step 4: la position suivante arrive → km 3,5 → 6,5 (+3,0 km ; ligne droite entre les 2 positions 3.001 km, chemin réel 3,0007 km, à 120 km/h de moyenne) ; message disparu → capture `V-3.E2-04-apres.png` ✓ (10:49:43Z, md5 a0c20a07)

### Issues Found
- aucune sur la version déployée à cette passe.

## V-4.2 — Mettre mon prix

### Happy Path
- Step 1: la fin de trajet (SP95-E10, moyenne du jour) → « Moyenne France du jour » 2.156 €/L ; coût 1,18 € → capture `V-4.2-01-avant.png` ✓ (10:49:47Z, md5 9d796ce2)
- Step 2: je touche le compteur, tape 1,989 et valide (Entrée) → « Mon prix » 1,989 €/L ; coût 0,546 × 1,989 = 1,09 € ; « Revenir à la moyenne » affiché → capture `V-4.2-02-apres.png` ✓ (10:49:48Z, md5 8e93a557)
- Step 3: mon prix saisi (« Revenir à la moyenne » sélectionné) → focus « Revenir à la moyenne » → capture `V-4.2-03-avant.png` ✓ (10:49:48Z, md5 36bcdda3)
- Step 4: je touche « Revenir à la moyenne » → « Moyenne France du jour » 2,156 €/L ; coût 1,18 € (comme avant la saisie) → capture `V-4.2-04-apres.png` ✓ (10:49:49Z, md5 38cd912a)
- Step 5: le champ du prix ouvert (« 1,5 » tapé, pas validé) → champ « 1,5 » ouvert → capture `V-4.2-05-avant.png` ✓ (10:49:49Z, md5 1e92ecb3)
- Step 6: j'appuie sur Échap → champ fermé ; prix toujours 2,156 €/L « Moyenne France du jour » ; focus revenu sur « null » → capture `V-4.2-06-apres.png` ✓ (10:49:50Z, md5 9f3d46f2)

### Issues Found
- aucune sur la version déployée à cette passe.

## V-4.1 — Prix de l'essence

### Happy Path
- Step 1: la fin d'un trajet en Clio SP95-E10 parti de France (juste avant « Arrêter ») → « Prix : moyenne France du jour · 2,156 €/L » ; 105 km/h · 8,2 km · 0,55 L · 1,18 € · 0:04 · 110 km/h moy. · 6,6 L/100 · 182 points → capture `V-4.1-01-avant.png` ✓ (10:49:45Z, md5 f214ae18)
- Step 2: l'écran Fin de trajet s'ouvre → sélecteur Gazole · SP95-E10 · SP95 · SP98 · E85 · GPLc, SP95-E10 choisi ; « Moyenne France du jour » ; compteur « Modifier le prix, 2,156 euros par litre » (3 décimales) = moyenne France SP95-E10 lue par l'API 2,156 ; coût 1,18 € essence → capture `V-4.1-02-apres.png` ✓ (10:49:46Z, md5 03d74456)
- Step 3: ce sélecteur (Gazole sélectionné au clavier) → focus « Gazole » → capture `V-4.1-03-avant.png` ✓ (10:49:46Z, md5 03d74456)
- Step 4: je touche Gazole → « Moyenne France du jour » 2,368 €/L (moyenne France Gazole de l'API 2,368) ; coût 0,546 × 2,368 = 1,29 € → capture `V-4.1-04-apres.png` ✓ (10:49:47Z, md5 9b2dd3a7)
- Step 5: un départ hors de France : vrai itinéraire dans Barcelone (plaça de Catalunya → Sagrada Família, 3,2 km rejoués) → « Prix : moyenne Espagne du jour · 1,790 €/L » ; 18 km/h · 3,2 km · 0,26 L · 0,46 € · 0:11 · 17 km/h moy. · 8,0 L/100 · 674 points → capture `V-4.1-05-avant.png` ✓ (10:50:08Z, md5 79cfcfc3)
- Step 6: l'écran Fin de trajet s'ouvre → « Barcelone → Barcelone » ; « Moyenne Espagne du jour » 1,790 €/L (moyenne Espagne SP95-E10 de l'API : 1,790) ; pays de départ enregistré ES → capture `V-4.1-06-apres.png` ✓ (10:50:09Z, md5 90b6fc03)

### Issues Found
- aucune sur la version déployée à cette passe.

## V-4.7 — Enregistrer ou supprimer (supprimer, appli fermée)

### Happy Path
- Step 3: un trajet qui vient d'être arrêté (celui de la coupure réseau, noms complétés) → « Albi → Albi » ; boutons « Supprimer Enregistrer » → capture `V-4.7-03-avant.png` ✓ (10:48:36Z, md5 2f9cd5d4)
- Step 4: je touche « Supprimer » → accueil (URL /) ; IndexedDB : 0 trajet, aucun trajet arrêté ni point gardé ; Historique : « Aucun trajet enregistré. » → capture `V-4.7-04-apres.png` ✓ (10:48:37Z, md5 25c9bd31)
- Step 5: un trajet arrêté (Barcelone), pas encore tranché ; je ferme l'appli → trajet d6d7afef-3899-47d2-93c1-ff43fd1c74d5 ; boutons « Supprimer Enregistrer » → capture `V-4.7-05-avant.png` ✓ (10:50:09Z, md5 17f45138)
- Step 6: je rouvre l'appli (navigateur relancé, même profil) → URL /fin ; même trajet d6d7afef-3899-47d2-93c1-ff43fd1c74d5 « Barcelone → Barcelone » ; « Supprimer Enregistrer » → capture `V-4.7-06-apres.png` ✓ (10:50:11Z, md5 c6407877)

### Issues Found
- aucune sur la version déployée à cette passe.

## Régression (passage cas)
- US-4.E2 (T4) : « 7 » validé → « Entre un prix entre 0,50 et 4,00 €/L », prix gardé 2.156 ✓

## Erreurs de page relevées
- aucune

---

# Passage r1b stations,historique — début 2026-10-21T10:51:21.931Z

Appli déployée https://plein-et-trajet.vercel.app, base Supabase réelle, Playwright (bibliothèque), Chromium headless 390 × 844, toucher, fr-FR, Europe/Paris.
Réel : base EEA (fonction voiture-eea), moyennes du jour (FR SP95-E10 2,156 €/L, Gazole 2,368 €/L), stations et prix du jour, géocodage inverse (fonction lieux), refus de localisation (contexte sans permission), coupure réseau (context.setOffline).
Rejoué : géolocalisation par context.setGeolocation depuis tests/e2e/fixtures/albi-toulouse.gpx (et ses dérivés immobile / tunnel, et barcelone.gpx : vrai itinéraire Valhalla fabriqué par creer-gpx.mjs barcelone), horloge de la page accélérée par page.clock (méthode r1a : avancer l'horloge, poser la position, attendre que T3 l'ait comptée), au rythme réel (1 point/s) pendant les passages par Stations.

## V-5.1 — Stations autour de moi

### Happy Path
- Step 1: la position autorisée (Albi), accueil → position du contexte 43.92833, 2.145916 ; permission granted → capture `V-5.1-01-avant.png` ✓ (10:51:22Z, md5 25c9bd31)
- Step 2: je touche l'onglet Stations → en-tête « Autour de moi » ; ma position dans le cadre de la carte ; 8 stations à moins de 10 km, 8 pastilles ; 8 prix SP95-E10 identiques à la base (table prix) ; 1re « TotalEnergies Albi · Relais des Fontanelles 2,2 km · hier · −16,6 c vs France 1,990 €/L » → capture `V-5.1-02-apres.png` ✓ (10:51:26Z, md5 245af61a)

### Issues Found
- aucune sur la version déployée à cette passe.

## V-5.2 — Choisir le carburant

### Happy Path
- Step 1: une Clio SP95-E10 enregistrée ; dernier carburant regardé dans Stations : Gazole ; je suis sur Historique → localStorage pt-carburant = « Gazole » ; voiture SP95-E10 → capture `V-5.2-01-avant.png` ✓ (10:51:27Z, md5 991f8a77)
- Step 2: j'ouvre l'onglet Stations → SP95-E10 choisi d'office (aria-pressed) ; titre « Stations · SP95-E10 » → capture `V-5.2-02-apres.png` ✓ (10:51:29Z, md5 233af02e)
- Step 3: la liste en SP95-E10 (faite défiler) → 8 stations SP95-E10 → capture `V-5.2-03-avant.png` ✓ (10:51:30Z, md5 3e4c61af)
- Step 4: je touche Gazole → titre « Stations · Gazole » ; 13 lignes et 13 pastilles au prix gazole de la base ; stations de la liste SP95-E10 sans gazole en base : 0 (aucune) → absentes ; 1re « TotalEnergies Albi · Relais des Fontanelles 2,2 km · hier · −11,8 c vs France 2,250 €/L » → capture `V-5.2-04-apres.png` ✓ (10:51:32Z, md5 7c247194)

### Issues Found
- aucune sur la version déployée à cette passe.

## V-5.4 — Trier

### Happy Path
- Step 1: la liste des stations (SP95-E10, tri « Moins cher ») → tri prix ; 8 stations → capture `V-5.4-01-avant.png` ✓ (10:51:34Z, md5 693c934a)
- Step 2: je touche « Plus proche » → « Plus proche » : distances croissantes 1,8 ≤ 1,9 ≤ 2,2 ≤ 2,3 ≤ 3,1 ≤ 3,3 ≤ 6,8 ≤ 9,4… (8) ; « Moins cher » : prix croissants 1,990 ≤ 1,990 ≤ 2,149 ≤ 2,178 ≤ 2,178 ≤ 2,178… ; capture sur « Plus proche » → capture `V-5.4-02-apres.png` ✓ (10:51:36Z, md5 f4f3c9f3)

### Issues Found
- aucune sur la version déployée à cette passe.

## V-5.5 — Utiliser ce prix

### Happy Path
- Step 3: aucun trajet en cours ; fiche de la station la moins chère → fiche « TotalEnergies Albi · Relais des Fontanelles » ; bouton « Utiliser 1,990 €/L pour mon trajet » ; pas de bandeau (0) → capture `V-5.5-03-avant.png` ✓ (10:51:37Z, md5 957bd608)
- Step 4: je touche ce bouton → accueil ouvert (URL /) ; prix gardé : pt-prix-choisi = {"prix":1.99,"carburant":"SP95-E10","station":"TotalEnergies Albi · Relais des Fontanelles"} (la capture montre l'accueil après l'essai de démarrage, revenu par « trop court ») → capture `V-5.5-04-apres.png` ✓ (10:51:38Z, md5 25c9bd31)
- Step 5: une station qui ne vend pas le SP95-E10 de ma voiture (liste Gazole) → « Carrefour Market Puygouzon 4,3 km · il y a 51 min · −1,3 c vs France 2,355 €/L » (81990003) : aucun prix SP95-E10 vendu en base (absent ou rupture) → capture `V-5.5-05-avant.png` ✓ (10:51:42Z, md5 a487f93e)
- Step 6: sa fiche s'ouvre → fiche « Carrefour Market Puygouzon » ; SP95-E10 « SP95-E10 non vendu » ; pas de bouton « Utiliser … pour mon trajet » → capture `V-5.5-06-apres.png` ✓ (10:51:42Z, md5 4a5bf933)

### Edge Case / constats
- Step 4 — trajet démarré ensuite : « Prix : mon prix · 1,990 €/L » ; pt-prix-choisi vidé au départ (null).

### Issues Found
- aucune sur la version déployée à cette passe.

## V-5.7 — Europe et Royaume-Uni

### Happy Path
- Step 1: une position à Barcelone (41,3874, 2,1686), accueil → en-tête « Autour de moi » → capture `V-5.7-01-avant.png` ✓ (10:51:44Z, md5 25c9bd31)
- Step 2: l'onglet Stations s'ouvre → 153 stations espagnoles (pays ES en base), 153 pastilles, prix SP95-E10 = base ; 1re « Plenergy Hospitalet de llobregat (l') · Plenergy 5,7 km · il y a 14 min · −28,1 c vs Espagne 1,509 €/L » → capture `V-5.7-02-apres.png` ✓ (10:51:49Z, md5 023444de)
- Step 3: une position à Dartford (Royaume-Uni) → 18 stations, pays GB ; 1re « Morrisons · MFG Morrisons Grays, London Road, GRAYS 7,9 km · il y a 11 h · −4,9 c vs Royaume-Uni 2,022 €/L » → capture `V-5.7-03-avant.png` ✓ (10:51:53Z, md5 419c54ca)
- Step 4: je lis une station (fiche) → fiche « Morrisons · MFG Morrisons Grays, London Road, GRAYS » ; Gazole 2,343 €/L ← 196,9 p/L ; SP95 2,022 €/L ← 169,9 p/L ; SP95-E10 2,022 €/L ← 169,9 p/L ; SP98 2,260 €/L ← 189,9 p/L ; « 1 € = 0,8403 £ · BCE 20/10 » (taux BCE en base 0.84028) → capture `V-5.7-04-apres.png` ✓ (10:51:53Z, md5 ad77b647)
- Step 5: un pays qui ne publie pas ses prix station par station : Belgique (position Bruxelles), carte glissée → statut du pays en base : « aucun » ; bouton « Rechercher dans cette zone » → capture `V-5.7-05-avant.png` ✓ (10:52:01Z, md5 47e613ec)
- Step 6: j'y cherche dans cette zone → « Ce pays ne publie pas les prix station par station Moyenne nationale · Belgique · SP95-E10 : 1,977 €/L » ; en-tête « Autour de Schaerbeek » ; 0 ligne, pastilles 0 → capture `V-5.7-06-apres.png` ✓ (10:52:03Z, md5 7b599c71)

### Issues Found
- aucune sur la version déployée à cette passe.

## V-6.1 — Ouvrir l'historique

### Happy Path
- Step 1: des trajets enregistrés en septembre et en octobre 2026 (deux trajets réellement rejoués, horloge de la page posée au 14/09 08:00 et au 05/10 17:30) → IndexedDB : 2026-09-14 2.5 km ; 2026-10-05 6.6 km → capture `V-6.1-01-avant.png` ✓ (10:52:44Z, md5 25c9bd31)
- Step 2: je touche l'onglet Historique → groupes Octobre 2026 puis Septembre 2026 ; lignes : Albi → Albi 5 oct. · 6,6 km 1,01 € | Albi → Albi 14 sept. · 2,5 km 0,45 € → capture `V-6.1-02-apres.png` ✓ (10:52:45Z, md5 df87aff2)
- Step 3: aucun trajet enregistré (téléphone neuf, voiture enregistrée) → IndexedDB : 0 trajet → capture `V-6.1-03-avant.png` ✓ (10:52:45Z, md5 25c9bd31)
- Step 4: j'ouvre l'onglet Historique → « Aucun trajet enregistré. » ; totaux « 0 trajets 0 km 0,00 € essence » → capture `V-6.1-04-apres.png` ✓ (10:52:46Z, md5 483b43ee)

### Issues Found
- aucune sur la version déployée à cette passe.

## V-6.2 — Totaux

### Happy Path
- Step 1: ÉTAT PRÉPARÉ : 4 trajets de 77, 152, 245 et 243 km écrits en IndexedDB (format TrajetV1 de l'appli) → trajets 77 km 4,93 L, 152 km 10,03 L, 245 km 16,91 L, 243 km 16,28 L au prix moyen France SP95-E10 du jour 2,156 → coûts 10,63 + 21,62 + 36,46 + 35,10 → capture `V-6.2-01-avant.png` ✓ (10:52:47Z, md5 25c9bd31)
- Step 2: l'historique s'affiche → totaux « 4 trajets 717 km 103,81 € essence » = 4 trajets, 717 km, 103,81 € (somme des coûts des lignes 35,10 + 36,46 + 21,62 + 10,63) → capture `V-6.2-02-apres.png` ✓ (10:52:47Z, md5 68948051)
- Step 3: un trajet corrigé : celui de 152 km rouvert, prix passé à 1,899 €/L → « Mon prix » ; coût 19,05 € essence → capture `V-6.2-03-avant.png` ✓ (10:52:48Z, md5 2008eebb)
- Step 4: je reviens à l'historique → totaux recalculés « 4 trajets 717 km 101,24 € essence » (= 101,24 €) ; ligne 152 km : Albi → Cahors 8 oct. · 152 km 19,05 € → capture `V-6.2-04-apres.png` ✓ (10:52:48Z, md5 772ac121)

### Issues Found
- aucune sur la version déployée à cette passe.

## V-6.3 — Lire un trajet

### Happy Path
- Step 1: ÉTAT PRÉPARÉ : un trajet enregistré à 3 personnes (Albi → Rodez) et un trajet seul, écrits en IndexedDB → prep-3p 92.4 km 3 pers. ; prep-seul 76.8 km 1 pers. → capture `V-6.3-01-avant.png` ✓ (10:52:49Z, md5 29877573)
- Step 2: je lis sa ligne (sélectionnée au clavier) → ligne « Albi → Rodez 18 oct. · 92,4 km · 4,32 € chacun 12,96 € » (date, départ → arrivée, km, coût, 4,32 € chacun) ; trajet seul : « Toulouse → Albi 19 oct. · 76,8 km 10,44 € » sans part → capture `V-6.3-02-apres.png` ✓ (10:52:49Z, md5 29877573)
- Step 3: une ligne (le trajet seul, sélectionné au clavier) → « Toulouse → Albi 19 oct. · 76,8 km 10,44 € » → capture `V-6.3-03-avant.png` ✓ (10:52:50Z, md5 29877573)
- Step 4: je la touche → fin de ce trajet « Toulouse → Albi » ; onglet Historique sélectionné ; « ← Historique » ; bouton « Supprimer ce trajet » → capture `V-6.3-04-apres.png` ✓ (10:52:50Z, md5 5ff0cf79)

### Issues Found
- aucune sur la version déployée à cette passe.

## V-6.4 — Revoir, corriger, supprimer

### Happy Path
- Step 1: un trajet rouvert depuis l'historique (le trajet seul), réglages de prix et de personnes → prix « Moyenne France du jour » 2.156 ; 1 personne → capture `V-6.4-01-avant.png` ✓ (10:52:51Z, md5 b65f8701)
- Step 2: je change son carburant (Gazole) et son nombre de personnes (2), puis je reviens à l'historique → IndexedDB : Gazole, 2 personnes, 2.368 €/L ; ligne « Toulouse → Albi 19 oct. · 76,8 km · 5,73 € chacun 11,46 € » → capture `V-6.4-02-apres.png` ✓ (10:52:51Z, md5 2ce6a1c7)
- Step 3: un trajet rouvert (Albi → Rodez, 3 personnes) → bouton « Supprimer ce trajet » → capture `V-6.4-03-avant.png` ✓ (10:52:52Z, md5 e70dc479)
- Step 4: je touche « Supprimer ce trajet » → disparu de la liste ; totaux « 1 trajet 77 km 11,46 € essence » (1 trajet, 77 km = 76,8 arrondi) ; IndexedDB 1 trajet → capture `V-6.4-04-apres.png` ✓ (10:52:52Z, md5 c9ea1257)

### Issues Found
- aucune sur la version déployée à cette passe.

## V-4.3 — Coût de l'essence

### Happy Path
- Step 1: ÉTAT PRÉPARÉ : un trajet arrêté de 41,2 L, prix 2,161 €/L (« Mon prix »), écrit en IndexedDB (en_cours/arrete) → trajet arrêté en attente : 588 km, 41.2 L, prix_perso 2.161 ; écran Historique (vide : le trajet n'est pas encore tranché) → capture `V-4.3-01-avant.png` ✓ (10:52:53Z, md5 16956a37)
- Step 2: la fin de trajet s'affiche (appli ouverte : le trajet arrêté revient) → « 89,03 € essence » (41,2 × 2,161 = 89.0332 → 89,03) ; libellé « Mon prix » → capture `V-4.3-02-apres.png` ✓ (10:52:54Z, md5 202ed28e)
- Step 3: le prix changé (réseau coupé : context.setOffline(true)) — « 2,050 » tapé → navigator.onLine = false ; champ « 2,050 » → capture `V-4.3-03-avant.png` ✓ (10:52:54Z, md5 1555a05d)
- Step 4: je valide (Entrée), toujours sans réseau → « 84,46 € essence » = 41,2 × 2,050 recalculé aussitôt, hors ligne (navigator.onLine false) → capture `V-4.3-04-apres.png` ✓ (10:52:55Z, md5 c6507a44)

### Edge Case / constats
- Step 4 — toujours hors ligne : « Revenir à la moyenne » → 88,83 € (41,2 × 2,156), puis Gazole → 97,56 € (41,2 × 2,368) ✓, sur les moyennes gardées dans le trajet ; requêtes émises pendant ces changements : 0 (aucune).

### Issues Found
- aucune sur la version déployée à cette passe.

## V-4.4 — Partager

### Happy Path
- Step 1: un coût de 89,03 € (SP95-E10, mon prix 2,161 €/L), 1 personne → « 89,03 € essence » ; « Seul : tout pour toi. » → capture `V-4.4-01-avant.png` ✓ (10:52:56Z, md5 6434a7a1)
- Step 2: je passe le nombre de personnes à 3 avec « + » → 3 personnes → « 29,68 € chacun » (89,03 ÷ 3 = 29,677) → capture `V-4.4-02-apres.png` ✓ (10:52:56Z, md5 a906fed8)
- Step 3: 1 personne → 1 personne ; « Seul : tout pour toi. » → capture `V-4.4-03-avant.png` ✓ (10:52:56Z, md5 6464daf1)
- Step 4: l'écran s'affiche ; j'essaie de descendre sous 1 et de monter au-delà de 9 → « Seul : tout pour toi. » ; « − » désactivé à 1 (toucher : reste 1) ; 10 touchers sur « + » → 9, « + » désactivé ; revenu à 1 : « Seul : tout pour toi. » → capture `V-4.4-04-apres.png` ✓ (10:52:58Z, md5 81d77fda)

### Issues Found
- aucune sur la version déployée à cette passe.

## Régression (passage stations,historique)
- US-3.E3 (T6) : historique vide → « Aucun trajet enregistré. », totaux 0 trajets 0 km 0,00 € essence ✓

## Erreurs de page relevées
- aucune

---

# Passage r1b voiture,trajet,cas — début 2026-10-21T10:54:26.181Z

Appli déployée https://plein-et-trajet.vercel.app, base Supabase réelle, Playwright (bibliothèque), Chromium headless 390 × 844, toucher, fr-FR, Europe/Paris.
Réel : base EEA (fonction voiture-eea), moyennes du jour (FR SP95-E10 2,156 €/L, Gazole 2,368 €/L), stations et prix du jour, géocodage inverse (fonction lieux), refus de localisation (contexte sans permission), coupure réseau (context.setOffline).
Rejoué : géolocalisation par context.setGeolocation depuis tests/e2e/fixtures/albi-toulouse.gpx (et ses dérivés immobile / tunnel, et barcelone.gpx : vrai itinéraire Valhalla fabriqué par creer-gpx.mjs barcelone), horloge de la page accélérée par page.clock (méthode r1a : avancer l'horloge, poser la position, attendre que T3 l'ait comptée), au rythme réel (1 point/s) pendant les passages par Stations.

## V-2.E1 — Code inconnu

### Happy Path
- Step 1: champ D.2, je commence « ZZ999 » → champ « ZZ999 » ; aucune fiche → capture `V-2.E1-01-avant.png` ✓ (10:54:36Z, md5 f8b54811)
- Step 2: je tape « ZZ9999 » (absent de la base EEA) → « Code introuvable. Vérifie la case D.2, ou cherche par nom ci-dessous. » (data-code code_inconnu) ; « Enregistrer ma voiture » désactivé → capture `V-2.E1-02-apres.png` ✓ (10:54:40Z, md5 e30ab651)
- Step 3: MOCKED (page.route : la base européenne ne tombe pas sur commande) — base injoignable, je commence « 5RBF0 » → champ « 5RBF0 » ; réponse de voiture-eea remplacée par un 502 base_injoignable côté navigateur → capture `V-2.E1-03-avant.png` ✓ (10:54:40Z, md5 d46b5b75)
- Step 4: MOCKED — je tape « 5RBF0A » → « La base européenne des voitures ne répond pas. Réessayer » ; champ toujours « 5RBF0A » ; « Enregistrer ma voiture » désactivé : true → capture `V-2.E1-04-apres.png` ✓ (10:54:42Z, md5 ca070417)

### Edge Case / constats
- Step 4 — route retirée puis « Réessayer » touché : la vraie base répond, fiche « Renault Clio 1.5 · 75 ch · Gazole » (après la capture).

### Issues Found
- aucune sur la version déployée à cette passe.

## V-2.3 — Chercher sans la carte grise

### Happy Path
- Step 1: je touche le champ « Nom, année, puissance » → champ recherche vide et sélectionné (focus #q) → capture `V-2.3-01-avant.png` ✓ (10:54:45Z, md5 d2f35003)
- Step 2: je tape « clio 2017 120 » → 6 suggestions, toutes Clio 2017 entre 115 et 125 ch, avec année, kW et carburant : Renault Clio 1.2 · 118 ch 2017 · 87 kW · 1 165 kg · SP95-E10 · D.2 5RBU0C | Renault Clio 1.2 · 118 ch 2017 · 87 kW · 1 165 kg · SP95-E10 · D.2 5RBU0D | Renault Clio 1.2 · 118 ch 2017 · 87 kW · 1 243 kg · SP95-E10 · D.2 7RBU0C | Renault Clio 1.2 · 118 ch 2017 · 87 kW · 1 270 kg · SP95-E10 · D.2 7RBU0D | Renault Clio 1.2 · 120 ch 2017 · 88 kW · 1 255 kg · SP95-E10 · D.2 2R401E | Renault Clio 1.2 · 120 ch 2017 · 88 kW · 1 165 kg · SP95-E10 · D.2 5R400E → capture `V-2.3-02-apres.png` ✓ (10:54:48Z, md5 9bc5666c)
- Step 3: la première suggestion (sélectionnée au clavier) → « Renault Clio 1.2 · 118 ch 2017 · 87 kW · 1 165 kg · SP95-E10 · D.2 5RBU0C » → capture `V-2.3-03-avant.png` ✓ (10:54:49Z, md5 b78c73bc)
- Step 4: je la touche → fiche « Renault Clio 1.2 · 118 ch » 2017 · 87 kW · 118 ch · 1 165 kg · SP95-E10 (data-cle RENAULT·R·5RBU·5RBU0C·2017) ; « Enregistrer ma voiture » actif → capture `V-2.3-04-apres.png` ✓ (10:54:49Z, md5 fbf817c9)

### Issues Found
- aucune sur la version déployée à cette passe.

## V-2.1 — Saisir le code D.2

### Happy Path
- Step 1: écran Ma voiture, je touche le champ D.2 → champ D.2 vide et sélectionné (focus d2) ; « Enregistrer ma voiture » désactivé → capture `V-2.1-01-avant.png` ✓ (10:54:28Z, md5 c45e4a62)
- Step 2: je tape « 5RBU0C » (code déjà en cache versions_eea) → fiche « Renault Clio 1.2 · 118 ch » : année 2017 · 87 kW · 118 ch · 1 197 cm³ · 1 165 kg · SP95-E10 · 118 g/km (NEDC) · « Base européenne EEA » ; liste : Renault Clio 1.2 · 118 ch 2017 · 87 kW · 1 165 kg · SP95-E10 · 13 864 immatriculées Renault Clio 1.2 · 118 ch 2018 · 87 kW · 1 165 kg · SP95-E10 · 11 043 immatriculées → capture `V-2.1-02-apres.png` ✓ (10:54:30Z, md5 2e1012d9)
- Step 3: code partagé par plusieurs versions, jamais demandé à l'appli : je commence à taper « M611Z1 » (5 caractères) → M611Z1 déjà en cache (10) → capture `V-2.1-03-avant.png` ✗ (10:54:31Z, md5 33ff2443)
- Step 4: je tape le dernier caractère (« M611Z1 ») puis je choisis la 2e version → 10 versions, la plus immatriculée en tête (94483 ≥ 68445 ≥ 43198 ≥ 34885…) ; marques Hyundai, Kia ; années 2019, 2020, 2018, 2021 ; masses 1 489, 1 490, 1 559 kg ; 1re : « Hyundai Tucson Se Nav Gdi 2wd 1.6 · 132 ch 2019 · 97 kW · 1 489 kg · SP95-E10 · 94 483 immatriculées » ; 2e touchée → fiche « Kia Sportage 1.6 · 132 ch » → capture `V-2.1-04-apres.png` ✓ (10:54:33Z, md5 5e9b0387)
- Step 5: je commence à taper en minuscules avec espaces : « r 5rbu » → champ « R 5RBU » (saisie en minuscules mise en majuscules à la frappe) ; pas de recherche (5 caractères sans espaces) → capture `V-2.1-05-avant.png` ✓ (10:54:34Z, md5 5776799f)
- Step 6: je finis « r 5rbu 5rbu0c » → champ « R 5RBU 5RBU0C » ; requête envoyée « d2=R 5RBU 5RBU0C » ; fiche « Renault Clio 1.2 · 118 ch · 2017 » (data-cle RENAULT·R·5RBU·5RBU0C·2017) : reconnu comme 5RBU0C → capture `V-2.1-06-apres.png` ✓ (10:54:35Z, md5 abdd8900)

### Edge Case / constats
- Step 2 — écart de libellé face au plan : l'écran nomme « Renault Clio 1.2 · 118 ch » ; le plan dit « Renault Clio 1.2 TCe 120 ». La base EEA ne porte ni « TCe » ni « 120 » (Cn = CLIO) ; les chiffres sont ceux du plan.
- Step 2 — cache : 5RBU0C présent dans versions_eea AVANT la saisie (2 lignes, années 2017/2018) : c'est le chemin « version déjà en cache ».
- Step 4 — chemin « jamais demandée » : M611Z1 absent du cache avant, 10 ligne(s) dans versions_eea après (écrites par la fonction).

### Issues Found
- Step 3 (V-2.1-03-avant.png) : M611Z1 déjà en cache (10)

## V-1.2 — Voir ma voiture

### Happy Path
- Step 1: la Clio enregistrée ; je suis sur l'onglet Historique → onglet onglet-historique ; voiture gardée 5RBU0C → capture `V-1.2-01-avant.png` ✓ (10:54:52Z, md5 991f8a77)
- Step 2: je touche l'onglet Trajet : l'accueil s'affiche → ÉCART DE LIBELLÉ : l'écran montre « Renault Clio » et « 1.2 · 118 ch · 2017 · SP95-E10 », le plan attend « Renault Clio IV » et « 1.2 TCe 120 · 2017 · SP95-E10 » ; la base EEA (Cn = CLIO) ne porte ni « IV » ni « TCe 120 » → capture `V-1.2-02-apres.png` ✗ (10:54:53Z, md5 25c9bd31)
- Step 3: l'accueil, « Changer » sélectionné au clavier → focus sur « Changer » → capture `V-1.2-03-avant.png` ✓ (10:54:53Z, md5 25c9bd31)
- Step 4: je touche « Changer » → écran Ma voiture, D.2 « » et recherche « » vides ; aucune fiche (0) → capture `V-1.2-04-apres.png` ✓ (10:54:54Z, md5 0af42123)
- Step 5: l'appli fermée (navigateur fermé puis relancé sur le même profil ; onglet vide about:blank) → URL about:blank → capture `V-1.2-05-avant.png` ✓ (10:54:58Z, md5 f95c356b)
- Step 6: je rouvre l'appli → accueil : « Renault Clio » « 1.2 · 118 ch · 2017 · SP95-E10 », rien ressaisi → capture `V-1.2-06-apres.png` ✓ (10:54:59Z, md5 25c9bd31)

### Issues Found
- Step 2 (V-1.2-02-apres.png) : ÉCART DE LIBELLÉ : l'écran montre « Renault Clio » et « 1.2 · 118 ch · 2017 · SP95-E10 », le plan attend « Renault Clio IV » et « 1.2 TCe 120 · 2017 · SP95-E10 » ; la base EEA (Cn = CLIO) ne porte ni « IV » ni « TCe 120 »

## V-2.2 — Vérifier et enregistrer

### Happy Path
- Step 1: la fiche de ma version (5RBU0C, 2017) affichée → fiche « Renault Clio 1.2 · 118 ch · 2017 » ; bouton « Enregistrer ma voiture » actif → capture `V-2.2-01-avant.png` ✓ (10:54:51Z, md5 c150a3a4)
- Step 2: je touche « Enregistrer ma voiture » → accueil : « Renault Clio » « 1.2 · 118 ch · 2017 · SP95-E10 » ; localStorage pt-voiture-v1 = Renault Clio 5RBU0C 2017 → capture `V-2.2-02-apres.png` ✓ (10:54:52Z, md5 25c9bd31)
- Step 3: aucune version identifiée : D.2 vide, « zz » dans la recherche par nom → D.2 «  », recherche « zz » (moins de 3 caractères : pas de recherche) ; aucune fiche (0) → capture `V-2.2-03-avant.png` ✓ (10:54:44Z, md5 7c9b9ad5)
- Step 4: je regarde « Enregistrer ma voiture » (D.2 incomplet « 5RB ») → aucune fiche ; « Enregistrer ma voiture » désactivé (disabled) → capture `V-2.2-04-apres.png` ✓ (10:54:44Z, md5 ecc668f8)

### Edge Case / constats
- Step 2 — après fermeture du navigateur et relance sur le même profil, l'accueil rappelle la même voiture (V-1.2-06).

### Issues Found
- aucune sur la version déployée à cette passe.

## V-5.3 — Rechercher dans cette zone

### Happy Path
- Step 1: la carte des stations (trajet en cours) → en-tête « Autour de moi » ; 8 stations ; centre 43.913, 2.142 zoom 10.0 → capture `V-5.3-01-avant.png` ✓ (10:55:38Z, md5 530f02d7)
- Step 2: je fais glisser la carte vers Montauban (4 glissements au doigt-souris) → bouton « Rechercher dans cette zone » affiché ; liste inchangée (8 stations, mêmes id) ; en-tête « Autour de moi » ; centre 44.018, 1.415 → capture `V-5.3-02-apres.png` ✓ (10:55:48Z, md5 bf4d4e87)
- Step 3: le bouton « Rechercher dans cette zone » (carte recentrée sur Montauban d'un dernier glissement) → centre 44.017, 1.355 ; liste toujours celle d'avant (8 stations) → capture `V-5.3-03-avant.png` ✓ (10:55:52Z, md5 bd620b6a)
- Step 4: je touche « Rechercher dans cette zone » → bouton disparu ; en-tête « Autour de Montauban » ; 14 stations, toutes à moins de 11.6 km du centre affiché (44.017, 1.355), 14 pastilles ; 1re (Moins cher) « TotalEnergies Access Montauban · Relais Tescou 64,9 km · il y a 2 h · −16,6 c vs France 1,990 €/L » → capture `V-5.3-04-apres.png` ✓ (10:55:53Z, md5 165952d6)

### Issues Found
- aucune sur la version déployée à cette passe.

## V-3.1 — Suivre en direct

### Happy Path
- Step 1: enregistrement en cours, 200 positions rejouées → 19 km/h · 0,8 km · 0,06 L · 0,14 € · 0:03 · 14 km/h moy. · 8,2 L/100 · 200 points → capture `V-3.1-01-avant.png` ✓ (10:55:11Z, md5 5b5a72bf)
- Step 2: je roule : 200 positions de plus (1 par seconde d'horloge) → vitesse lue après chaque position : 52 changements sur 200 s (la vitesse est redessinée à chaque position, soit chaque seconde ; plus longue valeur identique : 57 s, arrêts du GPX compris) ; courbe « Vitesse des 3 dernières minutes » ; 19 km/h · 0,8 km · 0,06 L · 0,14 € · 0:03 · 14 km/h moy. · 8,2 L/100 · 200 points → 29 km/h · 1,8 km · 0,16 L · 0,33 € · 0:06 · 17 km/h moy. · 8,4 L/100 · 400 points → capture `V-3.1-02-apres.png` ✓ (10:55:16Z, md5 061d5f77)
- Step 3: aucun prix choisi (aucune station touchée) → « Prix : moyenne France du jour · 2,156 €/L » → capture `V-3.1-03-avant.png` ✓ (10:55:17Z, md5 a1225df3)
- Step 4: le coût en direct s'affiche → 0,20 L × 2,156 €/L (moyenne France du jour SP95-E10 lue par l'API : 2,156) = 0,431 → affiché 0,43 € ; « Prix : moyenne France du jour · 2,156 €/L » → capture `V-3.1-04-apres.png` ✓ (10:55:18Z, md5 4e481429)
- Step 5: un prix pris sur une station (« Utiliser ce prix ») → « Prix : mon prix · 1,990 €/L » ; 0 km/h · 2,5 km · 0,21 L · 0,41 € · 0:08 · 17 km/h moy. · 8,3 L/100 · 521 points → capture `V-3.1-05-avant.png` ✓ (10:55:55Z, md5 ed1e346e)
- Step 6: le coût en direct s'affiche (60 positions plus loin) → 0,21 L × 1,990 = 0,418 → affiché 0,41 € ; « Prix : mon prix · 1,990 €/L » → capture `V-3.1-06-apres.png` ✓ (10:55:56Z, md5 51f53769)

### Issues Found
- aucune sur la version déployée à cette passe.

## V-3.4 — Mettre en pause

### Happy Path
- Step 1: un enregistrement en cours (A68) → 105 km/h · 30,3 km · 2,10 L · 4,17 € · 0:29 · 63 km/h moy. · 6,9 L/100 · 1748 points → capture `V-3.4-01-avant.png` ✓ (10:56:35Z, md5 c1687cbd)
- Step 2: je touche « Pause » puis 20 positions arrivent → « En pause », bouton « Reprendre » ; km 30,3 et litres 2,10 inchangés malgré 0,58 km parcourus sur le GPX → capture `V-3.4-02-apres.png` ✓ (10:56:36Z, md5 05edf3b7)
- Step 3: une pause pendant laquelle la voiture s'est déplacée → déplacement pendant la pause : 2,07 km (GPX, points 1750 → 1821) ; affiché toujours 30,3 km, 2,10 L → capture `V-3.4-03-avant.png` ✓ (10:56:38Z, md5 08acda82)
- Step 4: je touche « Reprendre » puis 60 positions → « Enregistrement » ; km 30,3 → 32,1 (+1,8) = distance roulée depuis la reprise (1,72 km) ; les 2,07 km de la pause ne sont ni comptés ni chiffrés → capture `V-3.4-04-apres.png` ✓ (10:56:40Z, md5 59050840)

### Issues Found
- aucune sur la version déployée à cette passe.

## V-4.5 — Courbe de vitesse

### Happy Path
- Step 1: un trajet enregistré (sa ligne sélectionnée dans l'Historique) → « Albi → Toulouse 21 oct. · 74,9 km · 3,39 € chacun 10,18 € » → capture `V-4.5-01-avant.png` ✓ (10:57:35Z, md5 23c30677)
- Step 2: la fin de trajet s'affiche (rouverte) — courbe de vitesse → « 63 km/h moy. · 4 accélérations » ; 600 points de courbe (≤ 600) pour 4348 s de trajet ; vitesse moyenne affichée 63 km/h ; km ÷ durée roulée (4276 s, pause exclue) = 63.0 km/h ; km ÷ durée totale = 62.0 km/h ; 4 accélérations → capture `V-4.5-02-apres.png` ✓ (10:57:35Z, md5 0af71ff0)

### Issues Found
- aucune sur la version déployée à cette passe.

## V-4.6 — Courbe de consommation

### Happy Path
- Step 1: un trajet enregistré (fin rouverte, haut de l'écran) → onglet onglet-historique ; « ← Historique » ; « Albi → Toulouse » → capture `V-4.6-01-avant.png` ✓ (10:57:36Z, md5 cf450741)
- Step 2: la courbe de consommation → « moy. 6,8 · pointe 46,1 L/100 » ; litres ÷ km × 100 = 5.114 ÷ 74.88 × 100 = 6.83 ; 600 points (moyenne simple des points de la courbe : 6.83, non pondérée par la distance) → capture `V-4.6-02-apres.png` ✓ (10:57:36Z, md5 8212fcff)

### Issues Found
- aucune sur la version déployée à cette passe.

## V-1.3 — Démarrer

### Happy Path
- Step 1: la Clio enregistrée, localisation autorisée, position = 1er point du GPX (Albi, place du Vigan) → accueil « Renault Clio » ; permission géolocalisation accordée au contexte → capture `V-1.3-01-avant.png` ✓ (10:55:07Z, md5 25c9bd31)
- Step 2: je touche « Démarrer » → écran En route, « Enregistrement » (pastille animée : clignote infinite) ; 1re position enregistrée en 229 ms (data-points 1) ; IndexedDB enregistrement : présent → capture `V-1.3-02-apres.png` ✓ (10:55:08Z, md5 827bc8db)
- Step 3: la localisation refusée (contexte sans permission geolocation) → accueil « Renault Clio » ; permission géolocalisation : denied → capture `V-1.3-03-avant.png` ✓ (10:57:37Z, md5 1f66d5d0)
- Step 4: je touche « Démarrer » → « L'enregistrement a besoin de ta localisation Cadenas de la barre d'adresse → Position → Autoriser » ; URL / ; IndexedDB : enregistrement absent, 0 trajet → capture `V-1.3-04-apres.png` ✓ (10:57:37Z, md5 4cfb9d3a)

### Issues Found
- aucune sur la version déployée à cette passe.

## V-3.5 — Arrêter

### Happy Path
- Step 1: un enregistrement de plus de 1 km (arrivée au Capitole, Toulouse) → 10 km/h · 74,9 km · 5,11 L · 10,18 € · 1:11 · 63 km/h moy. · 6,8 L/100 · 4276 points → capture `V-3.5-01-avant.png` ✓ (10:57:31Z, md5 86af3e27)
- Step 2: je touche « Arrêter » → « Albi → Toulouse » ; « 21 oct. 2026 · 1 h 11 · Renault Clio » ; 5,1 L (5.114), 74,9 km (74.88), 6,8 L/100 km moy. → capture `V-3.5-02-apres.png` ✓ (10:57:33Z, md5 1764c853)
- Step 3: un enregistrement de moins de 1 km (150 positions) → 19 km/h · 0,5 km · 0,04 L · 0,09 € · 0:02 · 12 km/h moy. · 8,4 L/100 · 150 points → capture `V-3.5-03-avant.png` ✓ (10:57:41Z, md5 ae5f265a)
- Step 4: je touche « Arrêter » → « Trajet trop court : 0,5 km sur 1 minimum. Rien n'est ajouté à l'historique. Retour à l'accueil » ; IndexedDB : 0 trajet, pas de trajet arrêté, pas d'enregistrement → capture `V-3.5-04-apres.png` ✓ (10:57:41Z, md5 b9ab7181)
- Step 5: aucun réseau (context.setOffline(true)) juste avant l'arrêt — 420 positions → navigator.onLine = false ; 28 km/h · 2,0 km · 0,17 L · 0,36 € · 0:06 · 17 km/h moy. · 8,4 L/100 · 420 points ; « Prix : moyenne France du jour · 2,156 €/L » → capture `V-3.5-05-avant.png` ✓ (10:57:49Z, md5 c2cbe533)
- Step 6: la fin de trajet s'ouvre sans réseau → hors ligne : « 43,928 · 2,146 → 43,917 · 2,144 » (coordonnées, noms pas encore connus) ; 0,168 L × 2,156 €/L (moyenne gardée au départ) = 0,36 € calculés sur le téléphone → capture `V-3.5-06-apres.png` ✓ (10:57:50Z, md5 eb84daab)

### Edge Case / constats
- Step 6 — au retour du réseau (setOffline(false) → événement online), le titre passe de « 43,928 · 2,146 → 43,917 · 2,144 » à « Albi → Albi » sans rien toucher ; requêtes tentées pendant la coupure : 4 (refusées par le navigateur hors ligne).

### Issues Found
- aucune sur la version déployée à cette passe.

## V-3.E1 — Oubli d'arrêter

### Happy Path
- Step 1: un enregistrement en cours (700 positions, 4 km dans Albi) → 30 km/h · 2,8 km · 0,24 L · 0,51 € · 0:11 · 14 km/h moy. · 8,5 L/100 · 700 points → capture `V-3.E1-01-avant.png` ✓ (10:58:04Z, md5 052b37c1)
- Step 2: vitesse < 3 km/h et position dans 50 m pendant 10 min (points 774 → 1375 du tracé dérivé) → « Trajet arrêté : immobile depuis 10 min. Reprendre C'est fini » au point 1375 (601 s après le début de l'immobilité) ; début daté 11:10:45 (point 774 reçu à 11:10:44, écart 1 s) ; 5 positions de plus : km 4,0 et litres 0,33 figés ; état « Immobile depuis 10 min » → capture `V-3.E1-02-apres.png` ✓ (10:58:17Z, md5 c2d7a3e6)
- Step 3: cette alerte (« C'est fini » sélectionné) → focus « C'est fini » → capture `V-3.E1-03-avant.png` ✓ (10:58:17Z, md5 c2d7a3e6)
- Step 4: je touche « C'est fini » → « Albi → Le Sequestre » « 21 oct. 2026 · 12 min · Renault Clio » ; arrivée datée 11:10:45 = début de l'immobilité (point 774, écart 1.0 s) ; durée 774 s : les 10 min d'arrêt ne comptent pas ; 4,02 km → capture `V-3.E1-04-apres.png` ✓ (10:58:19Z, md5 746a3411)
- Step 5: cette alerte (2e trajet rejoué ; « Reprendre » sélectionné) → « Trajet arrêté : immobile depuis 10 min. Reprendre C'est fini » ; 775 points gardés → capture `V-3.E1-05-avant.png` ✓ (10:58:47Z, md5 c2d7a3e6)
- Step 6: je touche « Reprendre » → « Enregistrement » ; 775 points gardés (autant qu'à l'alerte), 4,0 km conservés → capture `V-3.E1-06-apres.png` ✓ (10:58:48Z, md5 d6eb71b4)

### Edge Case / constats
- Step 6 — après « Reprendre », 10 positions de plus : 775 → 785 points (l'enregistrement repart).

### Issues Found
- aucune sur la version déployée à cette passe.

## V-3.E2 — GPS perdu

### Happy Path
- Step 1: un enregistrement en cours (A68, 121 positions, dernière avant le tunnel) → 105 km/h · 3,5 km · 0,23 L · 0,50 € · 0:02 · 105 km/h moy. · 6,7 L/100 · 121 points → capture `V-3.E2-01-avant.png` ✓ (10:58:52Z, md5 53277e2d)
- Step 2: aucune position pendant 16 s → « GPS perdu (tunnel) · la distance est complétée à la sortie. » ; data-etat gps-perdu ; vitesse 0 km/h → capture `V-3.E2-02-apres.png` ✓ (10:58:53Z, md5 6ea99714)
- Step 3: le signal revient après 90 s sans position (tunnel de 3,00 km) → toujours « GPS perdu (tunnel) · la distance est complétée à la sortie. » ; 3,5 km figés → capture `V-3.E2-03-avant.png` ✓ (10:58:53Z, md5 a4a5631e)
- Step 4: la position suivante arrive → km 3,5 → 6,5 (+3,0 km ; ligne droite entre les 2 positions 3.001 km, chemin réel 3,0007 km, à 120 km/h de moyenne) ; message disparu → capture `V-3.E2-04-apres.png` ✓ (10:58:54Z, md5 a0c20a07)

### Issues Found
- aucune sur la version déployée à cette passe.

## V-4.2 — Mettre mon prix

### Happy Path
- Step 1: la fin de trajet (SP95-E10, moyenne du jour) → « Moyenne France du jour » 2.156 €/L ; coût 1,18 € → capture `V-4.2-01-avant.png` ✓ (10:58:58Z, md5 9d796ce2)
- Step 2: je touche le compteur, tape 1,989 et valide (Entrée) → « Mon prix » 1,989 €/L ; coût 0,546 × 1,989 = 1,09 € ; « Revenir à la moyenne » affiché → capture `V-4.2-02-apres.png` ✓ (10:58:58Z, md5 4d4cd90e)
- Step 3: mon prix saisi (« Revenir à la moyenne » sélectionné) → focus « Revenir à la moyenne » → capture `V-4.2-03-avant.png` ✓ (10:58:59Z, md5 542d135c)
- Step 4: je touche « Revenir à la moyenne » → « Moyenne France du jour » 2,156 €/L ; coût 1,18 € (comme avant la saisie) → capture `V-4.2-04-apres.png` ✓ (10:58:59Z, md5 b297bfd2)
- Step 5: le champ du prix ouvert (« 1,5 » tapé, pas validé) → champ « 1,5 » ouvert → capture `V-4.2-05-avant.png` ✓ (10:59:00Z, md5 e63fd0cf)
- Step 6: j'appuie sur Échap → champ fermé ; prix toujours 2,156 €/L « Moyenne France du jour » ; focus revenu sur « Modifier le prix, 2,156 euros par litre » → capture `V-4.2-06-apres.png` ✓ (10:59:00Z, md5 43c72398)

### Issues Found
- aucune sur la version déployée à cette passe.

## V-4.1 — Prix de l'essence

### Happy Path
- Step 1: la fin d'un trajet en Clio SP95-E10 parti de France (juste avant « Arrêter ») → « Prix : moyenne France du jour · 2,156 €/L » ; 105 km/h · 8,2 km · 0,55 L · 1,18 € · 0:04 · 110 km/h moy. · 6,6 L/100 · 182 points → capture `V-4.1-01-avant.png` ✓ (10:58:55Z, md5 30356580)
- Step 2: l'écran Fin de trajet s'ouvre → sélecteur Gazole · SP95-E10 · SP95 · SP98 · E85 · GPLc, SP95-E10 choisi ; « Moyenne France du jour » ; compteur « Modifier le prix, 2,156 euros par litre » (3 décimales) = moyenne France SP95-E10 lue par l'API 2,156 ; coût 1,18 € essence → capture `V-4.1-02-apres.png` ✓ (10:58:57Z, md5 03d74456)
- Step 3: ce sélecteur (Gazole sélectionné au clavier) → focus « Gazole » → capture `V-4.1-03-avant.png` ✓ (10:58:57Z, md5 03d74456)
- Step 4: je touche Gazole → « Moyenne France du jour » 2,368 €/L (moyenne France Gazole de l'API 2,368) ; coût 0,546 × 2,368 = 1,29 € → capture `V-4.1-04-apres.png` ✓ (10:58:57Z, md5 5f7b9128)
- Step 5: un départ hors de France : vrai itinéraire dans Barcelone (plaça de Catalunya → Sagrada Família, 3,2 km rejoués) → « Prix : moyenne Espagne du jour · 1,790 €/L » ; 18 km/h · 3,2 km · 0,26 L · 0,46 € · 0:11 · 17 km/h moy. · 8,0 L/100 · 674 points → capture `V-4.1-05-avant.png` ✓ (10:59:56Z, md5 bb1e1893)
- Step 6: l'écran Fin de trajet s'ouvre → « Barcelone → Barcelone » ; « Moyenne Espagne du jour » 1,790 €/L (moyenne Espagne SP95-E10 de l'API : 1,790) ; pays de départ enregistré ES → capture `V-4.1-06-apres.png` ✓ (10:59:58Z, md5 90b6fc03)

### Issues Found
- aucune sur la version déployée à cette passe.

## V-1.1 — Ouvrir l'appli

### Happy Path
- Step 1: une voiture enregistrée ; l'appli était restée sur l'onglet Stations → onglet onglet-stations ; voiture 5RBU0C → capture `V-1.1-01-avant.png` ✓ (10:54:56Z, md5 d4f28c45)
- Step 2: j'ouvre l'appli (nouvel onglet sur l'adresse de l'appli) → onglet Trajet sélectionné ; T1 « Renault Clio 1.2 · 118 ch · 2017 · SP95-E10 Changer Démarrer » ; ni prix ni nombre de personnes → capture `V-1.1-02-apres.png` ✓ (10:54:57Z, md5 25c9bd31)
- Step 3: premier lancement (profil neuf, aucune voiture), j'ouvre l'appli → T1 « Enregistre d'abord ta voiture Le code D.2 de ta carte grise, une seule fois. Démarrer » ; onglet sélectionné : Trajet ; localStorage pt-voiture-v1 absent → capture `V-1.1-03-avant.png` ✓ (10:54:27Z, md5 c213538e)
- Step 4: je touche « Démarrer » sans voiture → URL /voiture, écran Ma voiture (« Ma voiture ») ; aucun enregistrement en IndexedDB → capture `V-1.1-04-apres.png` ✓ (10:54:28Z, md5 c427090c)
- Step 5: un trajet en cours d'enregistrement ; je suis sur l'onglet Historique → onglet onglet-historique ; IndexedDB enregistrement : 483 points → capture `V-1.1-05-avant.png` ✓ (10:55:19Z, md5 593ca088)
- Step 6: je touche l'onglet Trajet → URL /en-route, écran En route « Enregistrement » (pas l'accueil) → capture `V-1.1-06-apres.png` ✓ (10:55:19Z, md5 a3e693b8)

### Issues Found
- aucune sur la version déployée à cette passe.

## V-5.6 — Trajet en cours

### Happy Path
- Step 1: un trajet en cours ; je touche l'onglet Stations (positions envoyées au rythme réel, 1 par seconde) → écran Stations ouvert ; bandeau « ● Trajet en cours · 0,45 € » → capture `V-5.6-01-avant.png` ✓ (10:55:21Z, md5 530f02d7)
- Step 2: l'onglet Stations est ouvert → bandeau en haut « ● Trajet en cours · 0,45 € » (coût en direct ; 0,45 € sur En route juste avant) ; 8 stations listées → capture `V-5.6-02-apres.png` ✓ (10:55:26Z, md5 530f02d7)
- Step 3: ce bandeau, 6 s plus tard → « ● Trajet en cours · 0,45 € » ; positions rejouées : 496 → capture `V-5.6-03-avant.png` ✓ (10:55:33Z, md5 530f02d7)
- Step 4: je touche l'onglet Trajet → écran En route revenu ; 496 points (496 au moment du toucher) ; 0 km/h · 2,5 km · 0,21 L · 0,45 € · 0:08 · 18 km/h moy. · 8,3 L/100 · 496 points → capture `V-5.6-04-apres.png` ✓ (10:55:34Z, md5 8ab7f8df)

### Edge Case / constats
- Step 2 — sans trajet en cours (même téléphone, avant Démarrer) : bandeau « retour-trajet » présent 0 fois (attendu 0).

### Issues Found
- aucune sur la version déployée à cette passe.

## V-5.5 — Utiliser ce prix

### Happy Path
- Step 1: trajet en cours ; la fiche de la 1re station « Moins cher » de Montauban → fiche « TotalEnergies Access Montauban · Relais Tescou » ; bouton « Utiliser 1,990 €/L pour mon trajet » ; prix SP95-E10 en base pour 82000015 : 1,990 €/L. (Le plan cite 2,103 €/L à titre d'exemple : le prix réel du jour est celui lu ici.) → capture `V-5.5-01-avant.png` ✓ (10:55:53Z, md5 34c09466)
- Step 2: je touche « Utiliser 1,990 €/L pour mon trajet » → fiche fermée, écran En route ; « Prix : mon prix · 1,990 €/L » ; 0,21 L × 1,990 = 0,418 → 0,41 € (la fin de trajet est relue plus bas) → capture `V-5.5-02-apres.png` ✓ (10:55:54Z, md5 e510fd76)

### Edge Case / constats
- Step 2 — fin de trajet : libellé « Mon prix », prix data-prix 1.99 (station : 1,990), coût 10,18 € essence.

### Issues Found
- aucune sur la version déployée à cette passe.

## V-5.1 — Stations autour de moi

### Happy Path
- Step 3: un trajet en cours (A68, 1 450 positions) ; j'ouvre l'onglet Stations → écran Stations autour de la voiture (43.8843, 1.9259, 21,6 km après Albi) : 5 stations toutes à moins de 10 km d'elle ; 1re « TotalEnergies Marssac-sur-Tarn 9,1 km · il y a 16 min · −16,6 c vs France 1,990 €/L » ; bandeau « ● Trajet en cours · 3,00 € » ; sur En route juste avant : 105 km/h · 21,6 km · 1,45 L · 2,89 € · 0:24 · 54 km/h moy. · 6,7 L/100 · 1449 points → capture `V-5.1-03-avant.png` ✓ (10:56:17Z, md5 fdd86711)
- Step 4: je reviens au trajet (onglet Trajet) après 12 s dans Stations → distance 21,6 → 22,0 km, points 1449 → 1462 : l'enregistrement a continué pendant Stations → capture `V-5.1-04-apres.png` ✓ (10:56:29Z, md5 bc939da6)

### Issues Found
- aucune sur la version déployée à cette passe.

## V-4.7 — Enregistrer ou supprimer

### Happy Path
- Step 1: un trajet qui vient d'être arrêté (3 personnes choisies) → prix « Mon prix » 1,990 €/L ; coût 10,18 € ; « 3,39 € chacun » ; boutons « Supprimer Enregistrer » → capture `V-4.7-01-avant.png` ✓ (10:57:33Z, md5 19d293fb)
- Step 2: je touche « Enregistrer » → onglet Historique, en tête : « Albi → Toulouse 21 oct. · 74,9 km · 3,39 € chacun 10,18 € » ; IndexedDB : prix 1.99 (station), carburant SP95-E10, 3 personnes, enregistré ; totaux « 1 trajet 75 km 10,18 € essence » → capture `V-4.7-02-apres.png` ✓ (10:57:34Z, md5 23c30677)
- Step 3: un trajet qui vient d'être arrêté (celui de la coupure réseau, noms complétés) → « Albi → Albi » ; boutons « Supprimer Enregistrer » → capture `V-4.7-03-avant.png` ✓ (10:57:50Z, md5 2f9cd5d4)
- Step 4: je touche « Supprimer » → accueil (URL /) ; IndexedDB : 0 trajet, aucun trajet arrêté ni point gardé ; Historique : « Aucun trajet enregistré. » → capture `V-4.7-04-apres.png` ✓ (10:57:51Z, md5 25c9bd31)
- Step 5: un trajet arrêté (Barcelone), pas encore tranché ; je ferme l'appli → trajet 9187c49f-c699-4117-be7e-abf708923a4d ; boutons « Supprimer Enregistrer » → capture `V-4.7-05-avant.png` ✓ (10:59:58Z, md5 17f45138)
- Step 6: je rouvre l'appli (navigateur relancé, même profil) → URL /fin ; même trajet 9187c49f-c699-4117-be7e-abf708923a4d « Barcelone → Barcelone » ; « Supprimer Enregistrer » → capture `V-4.7-06-apres.png` ✓ (10:59:59Z, md5 ffc0b413)

### Edge Case / constats
- Démonstration : coût 10,18 € au prix de la station 1,990 €/L, partagé à 3.

### Issues Found
- aucune sur la version déployée à cette passe.

## Régression (passage voiture,trajet,cas)
- US-4.E2 (T4) : « 7 » validé → « Entre un prix entre 0,50 et 4,00 €/L », prix gardé 2.156 ✓

## Erreurs de page relevées
- aucune

---

# Passage r1b voiture — début 2026-10-21T11:00:34.408Z

Appli déployée https://plein-et-trajet.vercel.app, base Supabase réelle, Playwright (bibliothèque), Chromium headless 390 × 844, toucher, fr-FR, Europe/Paris.
Réel : base EEA (fonction voiture-eea), moyennes du jour (FR SP95-E10 2,156 €/L, Gazole 2,368 €/L), stations et prix du jour, géocodage inverse (fonction lieux), refus de localisation (contexte sans permission), coupure réseau (context.setOffline).
Rejoué : géolocalisation par context.setGeolocation depuis tests/e2e/fixtures/albi-toulouse.gpx (et ses dérivés immobile / tunnel, et barcelone.gpx : vrai itinéraire Valhalla fabriqué par creer-gpx.mjs barcelone), horloge de la page accélérée par page.clock (méthode r1a : avancer l'horloge, poser la position, attendre que T3 l'ait comptée), au rythme réel (1 point/s) pendant les passages par Stations.

## V-2.E1 — Code inconnu

### Happy Path
- Step 1: champ D.2, je commence « ZZ999 » → champ « ZZ999 » ; aucune fiche → capture `V-2.E1-01-avant.png` ✓ (11:00:49Z, md5 f8b54811)
- Step 2: je tape « ZZ9999 » (absent de la base EEA) → « Code introuvable. Vérifie la case D.2, ou cherche par nom ci-dessous. » (data-code code_inconnu) ; « Enregistrer ma voiture » désactivé → capture `V-2.E1-02-apres.png` ✓ (11:00:52Z, md5 e30ab651)
- Step 3: MOCKED (page.route : la base européenne ne tombe pas sur commande) — base injoignable, je commence « 5RBF0 » → champ « 5RBF0 » ; réponse de voiture-eea remplacée par un 502 base_injoignable côté navigateur → capture `V-2.E1-03-avant.png` ✓ (11:00:53Z, md5 d46b5b75)
- Step 4: MOCKED — je tape « 5RBF0A » → « La base européenne des voitures ne répond pas. Réessayer » ; champ toujours « 5RBF0A » ; « Enregistrer ma voiture » désactivé : true → capture `V-2.E1-04-apres.png` ✓ (11:00:54Z, md5 ca070417)

### Edge Case / constats
- Step 4 — route retirée puis « Réessayer » touché : la vraie base répond, fiche « Renault Clio 1.5 · 75 ch · Gazole » (après la capture).

### Issues Found
- aucune sur la version déployée à cette passe.

## V-2.3 — Chercher sans la carte grise

### Happy Path
- Step 1: je touche le champ « Nom, année, puissance » → champ recherche vide et sélectionné (focus #q) → capture `V-2.3-01-avant.png` ✓ (11:00:57Z, md5 d2f35003)
- Step 2: je tape « clio 2017 120 » → 6 suggestions, toutes Clio 2017 entre 115 et 125 ch, avec année, kW et carburant : Renault Clio 1.2 · 118 ch 2017 · 87 kW · 1 165 kg · SP95-E10 · D.2 5RBU0C | Renault Clio 1.2 · 118 ch 2017 · 87 kW · 1 165 kg · SP95-E10 · D.2 5RBU0D | Renault Clio 1.2 · 118 ch 2017 · 87 kW · 1 243 kg · SP95-E10 · D.2 7RBU0C | Renault Clio 1.2 · 118 ch 2017 · 87 kW · 1 270 kg · SP95-E10 · D.2 7RBU0D | Renault Clio 1.2 · 120 ch 2017 · 88 kW · 1 255 kg · SP95-E10 · D.2 2R401E | Renault Clio 1.2 · 120 ch 2017 · 88 kW · 1 165 kg · SP95-E10 · D.2 5R400E → capture `V-2.3-02-apres.png` ✓ (11:01:00Z, md5 9bc5666c)
- Step 3: la première suggestion (sélectionnée au clavier) → « Renault Clio 1.2 · 118 ch 2017 · 87 kW · 1 165 kg · SP95-E10 · D.2 5RBU0C » → capture `V-2.3-03-avant.png` ✓ (11:01:01Z, md5 b78c73bc)
- Step 4: je la touche → fiche « Renault Clio 1.2 · 118 ch » 2017 · 87 kW · 118 ch · 1 165 kg · SP95-E10 (data-cle RENAULT·R·5RBU·5RBU0C·2017) ; « Enregistrer ma voiture » actif → capture `V-2.3-04-apres.png` ✓ (11:01:02Z, md5 fbf817c9)

### Issues Found
- aucune sur la version déployée à cette passe.

## V-2.1 — Saisir le code D.2

### Happy Path
- Step 1: écran Ma voiture, je touche le champ D.2 → champ D.2 vide et sélectionné (focus d2) ; « Enregistrer ma voiture » désactivé → capture `V-2.1-01-avant.png` ✓ (11:00:38Z, md5 c45e4a62)
- Step 2: je tape « 5RBU0C » (code déjà en cache versions_eea) → fiche « Renault Clio 1.2 · 118 ch » : année 2017 · 87 kW · 118 ch · 1 197 cm³ · 1 165 kg · SP95-E10 · 118 g/km (NEDC) · « Base européenne EEA » ; liste : Renault Clio 1.2 · 118 ch 2017 · 87 kW · 1 165 kg · SP95-E10 · 13 864 immatriculées Renault Clio 1.2 · 118 ch 2018 · 87 kW · 1 165 kg · SP95-E10 · 11 043 immatriculées → capture `V-2.1-02-apres.png` ✓ (11:00:40Z, md5 2e1012d9)
- Step 3: code partagé par plusieurs versions, jamais demandé à l'appli : je tape « BA1SACEH225 » sauf le dernier caractère → champ « BA1SACEH22 » ; BA1SACEH225 absent de versions_eea (0 ligne, lu par l'API avant la saisie) → capture `V-2.1-03-avant.png` ✓ (11:00:41Z, md5 77fa912d)
- Step 4: je tape le dernier caractère (« BA1SACEH225 ») puis je choisis la 2e version → 9 versions, la plus immatriculée en tête (35438 ≥ 23205 ≥ 19603 ≥ 12228…) ; marques Opel, Vauxhall ; années 2019, 2018 ; masses 1 163, 1 141 kg ; 1re : « Opel Corsa-E 1.4 · 90 ch 2019 · 66 kW · 1 163 kg · SP95-E10 · 35 438 immatriculées » ; 2e touchée → fiche « Opel Corsa-E 1.4 · 90 ch » → capture `V-2.1-04-apres.png` ✓ (11:00:45Z, md5 292f79e0)
- Step 5: je commence à taper en minuscules avec espaces : « r 5rbu » → champ « R 5RBU » (saisie en minuscules mise en majuscules à la frappe) ; pas de recherche (5 caractères sans espaces) → capture `V-2.1-05-avant.png` ✓ (11:00:46Z, md5 5776799f)
- Step 6: je finis « r 5rbu 5rbu0c » → champ « R 5RBU 5RBU0C » ; requête envoyée « d2=R 5RBU 5RBU0C » ; fiche « Renault Clio 1.2 · 118 ch · 2017 » (data-cle RENAULT·R·5RBU·5RBU0C·2017) : reconnu comme 5RBU0C → capture `V-2.1-06-apres.png` ✓ (11:00:48Z, md5 abdd8900)

### Edge Case / constats
- Step 2 — écart de libellé face au plan : l'écran nomme « Renault Clio 1.2 · 118 ch » ; le plan dit « Renault Clio 1.2 TCe 120 ». La base EEA ne porte ni « TCe » ni « 120 » (Cn = CLIO) ; les chiffres sont ceux du plan.
- Step 2 — cache : 5RBU0C présent dans versions_eea AVANT la saisie (2 lignes, années 2017/2018) : c'est le chemin « version déjà en cache ».
- Step 4 — chemin « jamais demandée » : BA1SACEH225 absent du cache avant, 9 ligne(s) dans versions_eea après (écrites par la fonction).

### Issues Found
- aucune sur la version déployée à cette passe.

## V-1.2 — Voir ma voiture

### Happy Path
- Step 1: la Clio enregistrée ; je suis sur l'onglet Historique → onglet onglet-historique ; voiture gardée 5RBU0C → capture `V-1.2-01-avant.png` ✓ (11:01:06Z, md5 991f8a77)
- Step 2: je touche l'onglet Trajet : l'accueil s'affiche → ÉCART DE LIBELLÉ : l'écran montre « Renault Clio » et « 1.2 · 118 ch · 2017 · SP95-E10 », le plan attend « Renault Clio IV » et « 1.2 TCe 120 · 2017 · SP95-E10 » ; la base EEA (Cn = CLIO) ne porte ni « IV » ni « TCe 120 » → capture `V-1.2-02-apres.png` ✗ (11:01:06Z, md5 25c9bd31)
- Step 3: l'accueil, « Changer » sélectionné au clavier → focus sur « Changer » → capture `V-1.2-03-avant.png` ✓ (11:01:07Z, md5 25c9bd31)
- Step 4: je touche « Changer » → écran Ma voiture, D.2 « » et recherche « » vides ; aucune fiche (0) → capture `V-1.2-04-apres.png` ✓ (11:01:07Z, md5 0af42123)
- Step 5: l'appli fermée (navigateur fermé puis relancé sur le même profil ; onglet vide about:blank) → URL about:blank → capture `V-1.2-05-avant.png` ✓ (11:01:12Z, md5 f95c356b)
- Step 6: je rouvre l'appli → accueil : « Renault Clio » « 1.2 · 118 ch · 2017 · SP95-E10 », rien ressaisi → capture `V-1.2-06-apres.png` ✓ (11:01:13Z, md5 25c9bd31)

### Issues Found
- Step 2 (V-1.2-02-apres.png) : ÉCART DE LIBELLÉ : l'écran montre « Renault Clio » et « 1.2 · 118 ch · 2017 · SP95-E10 », le plan attend « Renault Clio IV » et « 1.2 TCe 120 · 2017 · SP95-E10 » ; la base EEA (Cn = CLIO) ne porte ni « IV » ni « TCe 120 »

## V-2.2 — Vérifier et enregistrer

### Happy Path
- Step 1: la fiche de ma version (5RBU0C, 2017) affichée → fiche « Renault Clio 1.2 · 118 ch · 2017 » ; bouton « Enregistrer ma voiture » actif → capture `V-2.2-01-avant.png` ✓ (11:01:04Z, md5 c150a3a4)
- Step 2: je touche « Enregistrer ma voiture » → accueil : « Renault Clio » « 1.2 · 118 ch · 2017 · SP95-E10 » ; localStorage pt-voiture-v1 = Renault Clio 5RBU0C 2017 → capture `V-2.2-02-apres.png` ✓ (11:01:05Z, md5 25c9bd31)
- Step 3: aucune version identifiée : D.2 vide, « zz » dans la recherche par nom → D.2 «  », recherche « zz » (moins de 3 caractères : pas de recherche) ; aucune fiche (0) → capture `V-2.2-03-avant.png` ✓ (11:00:56Z, md5 7c9b9ad5)
- Step 4: je regarde « Enregistrer ma voiture » (D.2 incomplet « 5RB ») → aucune fiche ; « Enregistrer ma voiture » désactivé (disabled) → capture `V-2.2-04-apres.png` ✓ (11:00:57Z, md5 ecc668f8)

### Edge Case / constats
- Step 2 — après fermeture du navigateur et relance sur le même profil, l'accueil rappelle la même voiture (V-1.2-06).

### Issues Found
- aucune sur la version déployée à cette passe.

## V-1.1 — Ouvrir l'appli

### Happy Path
- Step 1: une voiture enregistrée ; l'appli était restée sur l'onglet Stations → onglet onglet-stations ; voiture 5RBU0C → capture `V-1.1-01-avant.png` ✓ (11:01:10Z, md5 646f9ad1)
- Step 2: j'ouvre l'appli (nouvel onglet sur l'adresse de l'appli) → onglet Trajet sélectionné ; T1 « Renault Clio 1.2 · 118 ch · 2017 · SP95-E10 Changer Démarrer » ; ni prix ni nombre de personnes → capture `V-1.1-02-apres.png` ✓ (11:01:11Z, md5 25c9bd31)
- Step 3: premier lancement (profil neuf, aucune voiture), j'ouvre l'appli → T1 « Enregistre d'abord ta voiture Le code D.2 de ta carte grise, une seule fois. Démarrer » ; onglet sélectionné : Trajet ; localStorage pt-voiture-v1 absent → capture `V-1.1-03-avant.png` ✓ (11:00:37Z, md5 c213538e)
- Step 4: je touche « Démarrer » sans voiture → URL /voiture, écran Ma voiture (« Ma voiture ») ; aucun enregistrement en IndexedDB → capture `V-1.1-04-apres.png` ✓ (11:00:37Z, md5 c427090c)

### Issues Found
- aucune sur la version déployée à cette passe.

## Régression (passage voiture)
- (rejouée par la spec m5-regression)

## Erreurs de page relevées
- aucune

---

# Passage r1b stations,historique,retraits — début 2026-10-21T11:01:20.345Z

Appli déployée https://plein-et-trajet.vercel.app, base Supabase réelle, Playwright (bibliothèque), Chromium headless 390 × 844, toucher, fr-FR, Europe/Paris.
Réel : base EEA (fonction voiture-eea), moyennes du jour (FR SP95-E10 2,156 €/L, Gazole 2,368 €/L), stations et prix du jour, géocodage inverse (fonction lieux), refus de localisation (contexte sans permission), coupure réseau (context.setOffline).
Rejoué : géolocalisation par context.setGeolocation depuis tests/e2e/fixtures/albi-toulouse.gpx (et ses dérivés immobile / tunnel, et barcelone.gpx : vrai itinéraire Valhalla fabriqué par creer-gpx.mjs barcelone), horloge de la page accélérée par page.clock (méthode r1a : avancer l'horloge, poser la position, attendre que T3 l'ait comptée), au rythme réel (1 point/s) pendant les passages par Stations.

## V-5.1 — Stations autour de moi

### Happy Path
- Step 1: la position autorisée (Albi), accueil → position du contexte 43.92833, 2.145916 ; permission granted → capture `V-5.1-01-avant.png` ✓ (11:01:21Z, md5 25c9bd31)
- Step 2: je touche l'onglet Stations → en-tête « Autour de moi » ; ma position dans le cadre de la carte ; 8 stations à moins de 10 km, 8 pastilles ; 8 prix SP95-E10 identiques à la base (table prix) ; 1re « TotalEnergies Albi · Relais des Fontanelles 2,2 km · hier · −16,6 c vs France 1,990 €/L » → capture `V-5.1-02-apres.png` ✓ (11:01:25Z, md5 8352dfda)

### Issues Found
- aucune sur la version déployée à cette passe.

## V-5.2 — Choisir le carburant

### Happy Path
- Step 1: une Clio SP95-E10 enregistrée ; dernier carburant regardé dans Stations : Gazole ; je suis sur Historique → localStorage pt-carburant = « Gazole » ; voiture SP95-E10 → capture `V-5.2-01-avant.png` ✓ (11:01:26Z, md5 991f8a77)
- Step 2: j'ouvre l'onglet Stations → SP95-E10 choisi d'office (aria-pressed) ; titre « Stations · SP95-E10 » → capture `V-5.2-02-apres.png` ✓ (11:01:30Z, md5 94661666)
- Step 3: la liste en SP95-E10 (faite défiler) → 8 stations SP95-E10 → capture `V-5.2-03-avant.png` ✓ (11:01:31Z, md5 d3104eb9)
- Step 4: je touche Gazole → titre « Stations · Gazole » ; 13 lignes et 13 pastilles au prix gazole de la base (contre 8 en SP95-E10) ; stations de la liste SP95-E10 sans gazole en base : 0 (aucune) → absentes ; 5 stations apparues en Gazole, aucune ne vend de SP95-E10 en base ; 1re « TotalEnergies Albi · Relais des Fontanelles 2,2 km · hier · −11,8 c vs France 2,250 €/L » → capture `V-5.2-04-apres.png` ✓ (11:01:34Z, md5 c443620a)

### Edge Case / constats
- Step 4 — « les stations sans gazole disparaissent » : aucune station de la zone ne vend du SP95-E10 sans gazole (relevé r1b sur la base : 0 dans 25 km d'Albi, Toulouse, Castres, Montauban et Rodez), le cas n'a pas pu être montré sur données réelles. Le filtre est montré dans l'autre sens : les stations ajoutées en Gazole n'ont pas de SP95-E10 en base, et V-5.5-05 montre Carrefour Market Puygouzon (sans SP95-E10) absente de la liste SP95-E10.

### Issues Found
- aucune sur la version déployée à cette passe.

## V-5.4 — Trier

### Happy Path
- Step 1: la liste des stations (SP95-E10, tri « Moins cher ») → tri prix ; 8 stations → capture `V-5.4-01-avant.png` ✓ (11:01:36Z, md5 51099ab5)
- Step 2: je touche « Plus proche » → « Plus proche » : distances croissantes 1,8 ≤ 1,9 ≤ 2,2 ≤ 2,3 ≤ 3,1 ≤ 3,3 ≤ 6,8 ≤ 9,4… (8) ; « Moins cher » : prix croissants 1,990 ≤ 1,990 ≤ 2,149 ≤ 2,178 ≤ 2,178 ≤ 2,178… ; capture sur « Plus proche » → capture `V-5.4-02-apres.png` ✓ (11:01:37Z, md5 3422a44e)

### Issues Found
- aucune sur la version déployée à cette passe.

## V-5.5 — Utiliser ce prix

### Happy Path
- Step 3: aucun trajet en cours ; fiche de la station la moins chère → fiche « TotalEnergies Albi · Relais des Fontanelles » ; bouton « Utiliser 1,990 €/L pour mon trajet » ; pas de bandeau (0) → capture `V-5.5-03-avant.png` ✓ (11:01:37Z, md5 9fb97654)
- Step 4: je touche ce bouton → accueil ouvert (URL /) ; prix gardé : pt-prix-choisi = {"prix":1.99,"carburant":"SP95-E10","station":"TotalEnergies Albi · Relais des Fontanelles"} (la capture montre l'accueil après l'essai de démarrage, revenu par « trop court ») → capture `V-5.5-04-apres.png` ✓ (11:01:38Z, md5 25c9bd31)
- Step 5: une station qui ne vend pas le SP95-E10 de ma voiture (liste Gazole) → « Carrefour Market Puygouzon 4,3 km · il y a 1 h · −1,3 c vs France 2,355 €/L » (81990003) : aucun prix SP95-E10 vendu en base (absent ou rupture) → capture `V-5.5-05-avant.png` ✓ (11:01:41Z, md5 a809233f)
- Step 6: sa fiche s'ouvre → fiche « Carrefour Market Puygouzon » ; SP95-E10 « SP95-E10 non vendu » ; pas de bouton « Utiliser … pour mon trajet » → capture `V-5.5-06-apres.png` ✓ (11:01:42Z, md5 0eb34731)

### Edge Case / constats
- Step 4 — trajet démarré ensuite : « Prix : mon prix · 1,990 €/L » ; pt-prix-choisi vidé au départ (null).

### Issues Found
- aucune sur la version déployée à cette passe.

## V-5.7 — Europe et Royaume-Uni

### Happy Path
- Step 1: une position à Barcelone (41,3874, 2,1686), accueil → en-tête « Autour de moi » → capture `V-5.7-01-avant.png` ✓ (11:01:43Z, md5 25c9bd31)
- Step 2: l'onglet Stations s'ouvre → 153 stations espagnoles (pays ES en base), 153 pastilles, prix SP95-E10 = base ; 1re « Plenergy Hospitalet de llobregat (l') · Plenergy 5,7 km · il y a 24 min · −28,1 c vs Espagne 1,509 €/L » → capture `V-5.7-02-apres.png` ✓ (11:01:49Z, md5 fdfa596d)
- Step 3: une position à Dartford (Royaume-Uni) → 18 stations, pays GB ; 1re « Morrisons · MFG Morrisons Grays, London Road, GRAYS 7,9 km · il y a 12 h · −4,9 c vs Royaume-Uni 2,022 €/L » → capture `V-5.7-03-avant.png` ✓ (11:01:53Z, md5 1b3936f3)
- Step 4: je lis une station (fiche) → fiche « Morrisons · MFG Morrisons Grays, London Road, GRAYS » ; Gazole 2,343 €/L ← 196,9 p/L ; SP95 2,022 €/L ← 169,9 p/L ; SP95-E10 2,022 €/L ← 169,9 p/L ; SP98 2,260 €/L ← 189,9 p/L ; « 1 € = 0,8403 £ · BCE 20/10 » (taux BCE en base 0.84028) → capture `V-5.7-04-apres.png` ✓ (11:01:54Z, md5 badccd97)
- Step 5: un pays qui ne publie pas ses prix station par station : Belgique (position Bruxelles), carte glissée → statut du pays en base : « aucun » ; bouton « Rechercher dans cette zone » → capture `V-5.7-05-avant.png` ✓ (11:02:08Z, md5 5f6cd310)
- Step 6: j'y cherche dans cette zone → « Ce pays ne publie pas les prix station par station Moyenne nationale · Belgique · SP95-E10 : 1,977 €/L » ; en-tête « Autour de Schaerbeek » ; 0 ligne, pastilles 0 → capture `V-5.7-06-apres.png` ✓ (11:02:09Z, md5 7b599c71)

### Issues Found
- aucune sur la version déployée à cette passe.

## V-6.1 — Ouvrir l'historique

### Happy Path
- Step 1: des trajets enregistrés en septembre et en octobre 2026 (deux trajets réellement rejoués, horloge de la page posée au 14/09 08:00 et au 05/10 17:30) → IndexedDB : 2026-10-05 6.6 km ; 2026-09-14 2.5 km → capture `V-6.1-01-avant.png` ✓ (11:03:06Z, md5 25c9bd31)
- Step 2: je touche l'onglet Historique → groupes Octobre 2026 puis Septembre 2026 ; lignes : Albi → Albi 5 oct. · 6,6 km 1,01 € | Albi → Albi 14 sept. · 2,5 km 0,45 € → capture `V-6.1-02-apres.png` ✓ (11:03:07Z, md5 df87aff2)
- Step 3: aucun trajet enregistré (téléphone neuf, voiture enregistrée) → IndexedDB : 0 trajet → capture `V-6.1-03-avant.png` ✓ (11:03:08Z, md5 25c9bd31)
- Step 4: j'ouvre l'onglet Historique → « Aucun trajet enregistré. » ; totaux « 0 trajets 0 km 0,00 € essence » → capture `V-6.1-04-apres.png` ✓ (11:03:08Z, md5 483b43ee)

### Issues Found
- aucune sur la version déployée à cette passe.

## V-6.2 — Totaux

### Happy Path
- Step 1: ÉTAT PRÉPARÉ : 4 trajets de 77, 152, 245 et 243 km écrits en IndexedDB (format TrajetV1 de l'appli) → trajets 77 km 4,93 L, 152 km 10,03 L, 245 km 16,91 L, 243 km 16,28 L au prix moyen France SP95-E10 du jour 2,156 → coûts 10,63 + 21,62 + 36,46 + 35,10 → capture `V-6.2-01-avant.png` ✓ (11:03:09Z, md5 25c9bd31)
- Step 2: l'historique s'affiche → totaux « 4 trajets 717 km 103,81 € essence » = 4 trajets, 717 km, 103,81 € (somme des coûts des lignes 35,10 + 36,46 + 21,62 + 10,63) → capture `V-6.2-02-apres.png` ✓ (11:03:10Z, md5 68948051)
- Step 3: un trajet corrigé : celui de 152 km rouvert, prix passé à 1,899 €/L → « Mon prix » ; coût 19,05 € essence → capture `V-6.2-03-avant.png` ✓ (11:03:10Z, md5 765fa038)
- Step 4: je reviens à l'historique → totaux recalculés « 4 trajets 717 km 101,24 € essence » (= 101,24 €) ; ligne 152 km : Albi → Cahors 8 oct. · 152 km 19,05 € → capture `V-6.2-04-apres.png` ✓ (11:03:11Z, md5 772ac121)

### Issues Found
- aucune sur la version déployée à cette passe.

## V-6.3 — Lire un trajet

### Happy Path
- Step 1: ÉTAT PRÉPARÉ : un trajet enregistré à 3 personnes (Albi → Rodez) et un trajet seul, écrits en IndexedDB → prep-3p 92.4 km 3 pers. ; prep-seul 76.8 km 1 pers. → capture `V-6.3-01-avant.png` ✓ (11:03:12Z, md5 29877573)
- Step 2: je lis sa ligne (sélectionnée au clavier) → ligne « Albi → Rodez 18 oct. · 92,4 km · 4,32 € chacun 12,96 € » (date, départ → arrivée, km, coût, 4,32 € chacun) ; trajet seul : « Toulouse → Albi 19 oct. · 76,8 km 10,44 € » sans part → capture `V-6.3-02-apres.png` ✓ (11:03:13Z, md5 29877573)
- Step 3: une ligne (le trajet seul, sélectionné au clavier) → « Toulouse → Albi 19 oct. · 76,8 km 10,44 € » → capture `V-6.3-03-avant.png` ✓ (11:03:13Z, md5 29877573)
- Step 4: je la touche → fin de ce trajet « Toulouse → Albi » ; onglet Historique sélectionné ; « ← Historique » ; bouton « Supprimer ce trajet » → capture `V-6.3-04-apres.png` ✓ (11:03:15Z, md5 b65f8701)

### Issues Found
- aucune sur la version déployée à cette passe.

## V-6.4 — Revoir, corriger, supprimer

### Happy Path
- Step 1: un trajet rouvert depuis l'historique (le trajet seul), réglages de prix et de personnes → prix « Moyenne France du jour » 2.156 ; 1 personne → capture `V-6.4-01-avant.png` ✓ (11:03:16Z, md5 b65f8701)
- Step 2: je change son carburant (Gazole) et son nombre de personnes (2), puis je reviens à l'historique → IndexedDB : Gazole, 2 personnes, 2.368 €/L ; ligne « Toulouse → Albi 19 oct. · 76,8 km · 5,73 € chacun 11,46 € » → capture `V-6.4-02-apres.png` ✓ (11:03:17Z, md5 2ce6a1c7)
- Step 3: un trajet rouvert (Albi → Rodez, 3 personnes) → bouton « Supprimer ce trajet » → capture `V-6.4-03-avant.png` ✓ (11:03:18Z, md5 e70dc479)
- Step 4: je touche « Supprimer ce trajet » → disparu de la liste ; totaux « 1 trajet 77 km 11,46 € essence » (1 trajet, 77 km = 76,8 arrondi) ; IndexedDB 1 trajet → capture `V-6.4-04-apres.png` ✓ (11:03:20Z, md5 3d89e959)

### Issues Found
- aucune sur la version déployée à cette passe.

## V-4.3 — Coût de l'essence

### Happy Path
- Step 1: ÉTAT PRÉPARÉ : un trajet arrêté de 41,2 L, prix 2,161 €/L (« Mon prix »), écrit en IndexedDB (en_cours/arrete) → trajet arrêté en attente : 588 km, 41.2 L, prix_perso 2.161 ; écran Historique (vide : le trajet n'est pas encore tranché) → capture `V-4.3-01-avant.png` ✓ (11:03:22Z, md5 16956a37)
- Step 2: la fin de trajet s'affiche (appli ouverte : le trajet arrêté revient) → « 89,03 € essence » (41,2 × 2,161 = 89.0332 → 89,03) ; libellé « Mon prix » → capture `V-4.3-02-apres.png` ✓ (11:03:26Z, md5 f13f642c)
- Step 3: le prix changé (réseau coupé : context.setOffline(true)) — « 2,050 » tapé → navigator.onLine = false ; champ « 2,050 » → capture `V-4.3-03-avant.png` ✓ (11:03:27Z, md5 b01263d7)
- Step 4: je valide (Entrée), toujours sans réseau → « 84,46 € essence » = 41,2 × 2,050 recalculé aussitôt, hors ligne (navigator.onLine false) → capture `V-4.3-04-apres.png` ✓ (11:03:28Z, md5 3aaa84cc)

### Edge Case / constats
- Step 4 — toujours hors ligne : « Revenir à la moyenne » → 88,83 € (41,2 × 2,156), puis Gazole → 97,56 € (41,2 × 2,368) ✓, sur les moyennes gardées dans le trajet ; requêtes émises pendant ces changements : 0 (aucune).

### Issues Found
- aucune sur la version déployée à cette passe.

## V-4.4 — Partager

### Happy Path
- Step 1: un coût de 89,03 € (SP95-E10, mon prix 2,161 €/L), 1 personne → « 89,03 € essence » ; « Seul : tout pour toi. » → capture `V-4.4-01-avant.png` ✓ (11:03:29Z, md5 3a8a2a0b)
- Step 2: je passe le nombre de personnes à 3 avec « + » → 3 personnes → « 29,68 € chacun » (89,03 ÷ 3 = 29,677) → capture `V-4.4-02-apres.png` ✓ (11:03:30Z, md5 67764135)
- Step 3: 1 personne → 1 personne ; « Seul : tout pour toi. » → capture `V-4.4-03-avant.png` ✓ (11:03:30Z, md5 1442d92d)
- Step 4: l'écran s'affiche ; j'essaie de descendre sous 1 et de monter au-delà de 9 → « Seul : tout pour toi. » ; « − » désactivé à 1 (toucher : reste 1) ; 10 touchers sur « + » → 9, « + » désactivé ; revenu à 1 : « Seul : tout pour toi. » → capture `V-4.4-04-apres.png` ✓ (11:03:32Z, md5 9d0148ce)

### Issues Found
- aucune sur la version déployée à cette passe.

## V1-retraits — Contrôle négatif : ce qui sort de la V1

### Happy Path
- Step 1: l'appli déployée, journal réseau Playwright ouvert sur TOUS les contextes du passage (écoute context.on('request')) → 251 requêtes déjà journalisées par les flux précédents de ce passage → capture `V1-retraits-01-avant.png` ✓ (11:03:32Z, md5 25c9bd31)
- Step 2: parcours T1 → T6 (+ tous les flux du passage, dont 5 trajets complets rejoués) → TRAJET,STATIONS,HISTORIQUE → capture `V1-retraits-02-apres.png` ✗ (11:03:49Z, md5 16956a37)
- Step 3: la table public.moteurs lue par l'API Supabase (rôle service), rendue en page texte → prix:true, moyennes:true, itineraire:true, peages:false, voitures:true, lieux:true, vehicules:true → capture `V1-retraits-03-avant.png` ✓ (11:03:51Z, md5 9af87b75)
- Step 4: je lis la ligne du service péages, et le nombre de lignes des clés → peages : en_service = false (fournisseur ptv gardé) ; cles_fournisseurs 2 lignes (2 avant) ; Vault 3 secrets (cle_ptv, cle_stadia, sync_prix_secret ; 3 avant) ; limite d'inscriptions anonymes 30 → capture `V1-retraits-04-apres.png` ✓ (11:03:51Z, md5 fdf7154c)

### Issues Found
- Step 2 (V1-retraits-02-apres.png) : TRAJET,STATIONS,HISTORIQUE

## Régression (passage stations,historique,retraits)
- US-3.E3 (T6) : historique vide → « Aucun trajet enregistré. », totaux 0 trajets 0 km 0,00 € essence ✓

## Erreurs de page relevées
- aucune

---

# Passage r1b retraits — début 2026-10-21T11:04:28.289Z

Appli déployée https://plein-et-trajet.vercel.app, base Supabase réelle, Playwright (bibliothèque), Chromium headless 390 × 844, toucher, fr-FR, Europe/Paris.
Réel : base EEA (fonction voiture-eea), moyennes du jour (FR SP95-E10 2,156 €/L, Gazole 2,368 €/L), stations et prix du jour, géocodage inverse (fonction lieux), refus de localisation (contexte sans permission), coupure réseau (context.setOffline).
Rejoué : géolocalisation par context.setGeolocation depuis tests/e2e/fixtures/albi-toulouse.gpx (et ses dérivés immobile / tunnel, et barcelone.gpx : vrai itinéraire Valhalla fabriqué par creer-gpx.mjs barcelone), horloge de la page accélérée par page.clock (méthode r1a : avancer l'horloge, poser la position, attendre que T3 l'ait comptée), au rythme réel (1 point/s) pendant les passages par Stations.

## V1-retraits — Contrôle négatif : ce qui sort de la V1

### Happy Path
- Step 1: l'appli déployée, journal réseau Playwright ouvert sur TOUS les contextes du passage (écoute context.on('request'), y compris les processus précédents du même passage, relus dans exploration/m5-resultats-<passage>-*.json) → 7 requêtes de ce processus → capture `V1-retraits-01-avant.png` ✓ (11:04:29Z, md5 25c9bd31)
- Step 2: parcours T1 → T6 (+ tous les flux du passage, dont 5 trajets complets rejoués) → 729 requêtes journalisées sur 15 contextes : 0 vers api.myptv.com, 0 vers estimer-trajet / trajet-roule / péages ; fonctions appelées {"lieux":32,"voiture-eea":18} ; hôtes {"plein-et-trajet.vercel.app":147,"fonts.googleapis.com":43,"fonts.gstatic.com":191,"rglrwtkqwihdztgqlbsy.supabase.co":197,"":9,"data.geopf.fr":141,"photon.komoot.io":1} ; 169 captures (contextes stations, barcelone-stations, dartford, bruxelles, historique-reel, historique-vide, historique-prepare, historique-prepare-2, cout-prepare, retraits, voiture, trajet, cas-refus, cas, barcelone) + 6 routes passées au crible : aucun « péage » ni « itinéraire » ; aucun champ départ / arrivée ; aucun lien Moteurs ; onglets Trajet · Stations · Historique → capture `V1-retraits-02-apres.png` ✓ (11:04:50Z, md5 16956a37)
- Step 3: la table public.moteurs lue par l'API Supabase (rôle service), rendue en page texte → prix:true, moyennes:true, itineraire:true, peages:false, voitures:true, lieux:true, vehicules:true → capture `V1-retraits-03-avant.png` ✓ (11:04:54Z, md5 5e8cb91b)
- Step 4: je lis la ligne du service péages, et le nombre de lignes des clés → peages : en_service = false (fournisseur ptv gardé) ; cles_fournisseurs 2 lignes (2 avant) ; Vault 3 secrets (cle_ptv, cle_stadia, sync_prix_secret ; 3 avant) ; limite d'inscriptions anonymes 30 → capture `V1-retraits-04-apres.png` ✓ (11:04:54Z, md5 e3540acf)

### Issues Found
- aucune sur la version déployée à cette passe.

## Régression (passage retraits)
- (rejouée par la spec m5-regression)

## Erreurs de page relevées
- aucune

---

# Passage r1b voiture,trajet,cas — début 2026-10-21T11:06:19.496Z

Appli déployée https://plein-et-trajet.vercel.app, base Supabase réelle, Playwright (bibliothèque), Chromium headless 390 × 844, toucher, fr-FR, Europe/Paris.
Réel : base EEA (fonction voiture-eea), moyennes du jour (FR SP95-E10 2,156 €/L, Gazole 2,368 €/L), stations et prix du jour, géocodage inverse (fonction lieux), refus de localisation (contexte sans permission), coupure réseau (context.setOffline).
Rejoué : géolocalisation par context.setGeolocation depuis tests/e2e/fixtures/albi-toulouse.gpx (et ses dérivés immobile / tunnel, et barcelone.gpx : vrai itinéraire Valhalla fabriqué par creer-gpx.mjs barcelone), horloge de la page accélérée par page.clock (méthode r1a : avancer l'horloge, poser la position, attendre que T3 l'ait comptée), au rythme réel (1 point/s) pendant les passages par Stations.

## V-2.E1 — Code inconnu

### Happy Path
- Step 1: champ D.2, je commence « ZZ999 » → champ « ZZ999 » ; aucune fiche → capture `V-2.E1-01-avant.png` ✓ (11:06:38Z, md5 f8b54811)
- Step 2: je tape « ZZ9999 » (absent de la base EEA) → « Code introuvable. Vérifie la case D.2, ou cherche par nom ci-dessous. » (data-code code_inconnu) ; « Enregistrer ma voiture » désactivé → capture `V-2.E1-02-apres.png` ✓ (11:06:42Z, md5 e30ab651)
- Step 3: MOCKED (page.route : la base européenne ne tombe pas sur commande) — base injoignable, je commence « 5RBF0 » → champ « 5RBF0 » ; réponse de voiture-eea remplacée par un 502 base_injoignable côté navigateur → capture `V-2.E1-03-avant.png` ✓ (11:06:43Z, md5 d46b5b75)
- Step 4: MOCKED — je tape « 5RBF0A » → « La base européenne des voitures ne répond pas. Réessayer » ; champ toujours « 5RBF0A » ; « Enregistrer ma voiture » désactivé : true → capture `V-2.E1-04-apres.png` ✓ (11:06:44Z, md5 ca070417)

### Edge Case / constats
- Step 4 — route retirée puis « Réessayer » touché : la vraie base répond, fiche « Renault Clio 1.5 · 75 ch · Gazole » (après la capture).

### Issues Found
- aucune sur la version déployée à cette passe.

## V-2.3 — Chercher sans la carte grise

### Happy Path
- Step 1: je touche le champ « Nom, année, puissance » → champ recherche vide et sélectionné (focus #q) → capture `V-2.3-01-avant.png` ✓ (11:06:47Z, md5 d2f35003)
- Step 2: je tape « clio 2017 120 » → 6 suggestions, toutes Clio 2017 entre 115 et 125 ch, avec année, kW et carburant : Renault Clio 1.2 · 118 ch 2017 · 87 kW · 1 165 kg · SP95-E10 · D.2 5RBU0C | Renault Clio 1.2 · 118 ch 2017 · 87 kW · 1 165 kg · SP95-E10 · D.2 5RBU0D | Renault Clio 1.2 · 118 ch 2017 · 87 kW · 1 243 kg · SP95-E10 · D.2 7RBU0C | Renault Clio 1.2 · 118 ch 2017 · 87 kW · 1 270 kg · SP95-E10 · D.2 7RBU0D | Renault Clio 1.2 · 120 ch 2017 · 88 kW · 1 255 kg · SP95-E10 · D.2 2R401E | Renault Clio 1.2 · 120 ch 2017 · 88 kW · 1 165 kg · SP95-E10 · D.2 5R400E → capture `V-2.3-02-apres.png` ✓ (11:06:51Z, md5 9bc5666c)
- Step 3: la première suggestion (sélectionnée au clavier) → « Renault Clio 1.2 · 118 ch 2017 · 87 kW · 1 165 kg · SP95-E10 · D.2 5RBU0C » → capture `V-2.3-03-avant.png` ✓ (11:06:52Z, md5 b78c73bc)
- Step 4: je la touche → fiche « Renault Clio 1.2 · 118 ch » 2017 · 87 kW · 118 ch · 1 165 kg · SP95-E10 (data-cle RENAULT·R·5RBU·5RBU0C·2017) ; « Enregistrer ma voiture » actif → capture `V-2.3-04-apres.png` ✓ (11:06:52Z, md5 fbf817c9)

### Issues Found
- aucune sur la version déployée à cette passe.

## V-2.1 — Saisir le code D.2

### Happy Path
- Step 1: écran Ma voiture, je touche le champ D.2 → champ D.2 vide et sélectionné (focus d2) ; « Enregistrer ma voiture » désactivé → capture `V-2.1-01-avant.png` ✓ (11:06:22Z, md5 c45e4a62)
- Step 2: je tape « 5RBU0C » (code déjà en cache versions_eea) → fiche « Renault Clio 1.2 · 118 ch » : année 2017 · 87 kW · 118 ch · 1 197 cm³ · 1 165 kg · SP95-E10 · 118 g/km (NEDC) · « Base européenne EEA » ; liste : Renault Clio 1.2 · 118 ch 2017 · 87 kW · 1 165 kg · SP95-E10 · 13 864 immatriculées Renault Clio 1.2 · 118 ch 2018 · 87 kW · 1 165 kg · SP95-E10 · 11 043 immatriculées → capture `V-2.1-02-apres.png` ✓ (11:06:24Z, md5 2e1012d9)
- Step 3: code partagé par plusieurs versions, jamais demandé à l'appli : je tape « DAW400L0 » sauf le dernier caractère → champ « DAW400L » ; DAW400L0 absent de versions_eea (0 ligne, lu par l'API avant la saisie) → capture `V-2.1-03-avant.png` ✓ (11:06:25Z, md5 8a87e25f)
- Step 4: je tape le dernier caractère (« DAW400L0 ») puis je choisis la 2e version → 60 versions, la plus immatriculée en tête (12081 ≥ 10793 ≥ 6994 ≥ 6871…) ; marques Mini, Bmw ; années 2019, 2020, 2018, 2021 ; masses 1 235, 1 230, 1 340, 1 295, 1 390, 1 385, 1 245, 1 330, 1 615, 1 435, 1 595, 1 565, 1 440, 1 660, 1 480, 1 760, 1 790, 1 515, 1 650, 1 710, 1 570, 1 675, 1 505 kg ; 1re : « Mini Cooper 1.5 · 136 ch 2019 · 100 kW · 1 235 kg · SP95-E10 · 12 081 immatriculées » ; 2e touchée → fiche « Mini Cooper 1.5 · 136 ch » → capture `V-2.1-04-apres.png` ✓ (11:06:34Z, md5 8093a948)
- Step 5: je commence à taper en minuscules avec espaces : « r 5rbu » → champ « R 5RBU » (saisie en minuscules mise en majuscules à la frappe) ; pas de recherche (5 caractères sans espaces) → capture `V-2.1-05-avant.png` ✓ (11:06:35Z, md5 5776799f)
- Step 6: je finis « r 5rbu 5rbu0c » → champ « R 5RBU 5RBU0C » ; requête envoyée « d2=R 5RBU 5RBU0C » ; fiche « Renault Clio 1.2 · 118 ch · 2017 » (data-cle RENAULT·R·5RBU·5RBU0C·2017) : reconnu comme 5RBU0C → capture `V-2.1-06-apres.png` ✓ (11:06:37Z, md5 abdd8900)

### Edge Case / constats
- Step 2 — écart de libellé face au plan : l'écran nomme « Renault Clio 1.2 · 118 ch » ; le plan dit « Renault Clio 1.2 TCe 120 ». La base EEA ne porte ni « TCe » ni « 120 » (Cn = CLIO) ; les chiffres sont ceux du plan.
- Step 2 — cache : 5RBU0C présent dans versions_eea AVANT la saisie (2 lignes, années 2017/2018) : c'est le chemin « version déjà en cache ».
- Step 4 — chemin « jamais demandée » : DAW400L0 absent du cache avant, 60 ligne(s) dans versions_eea après (écrites par la fonction).

### Issues Found
- aucune sur la version déployée à cette passe.

## V-1.2 — Voir ma voiture

### Happy Path
- Step 1: la Clio enregistrée ; je suis sur l'onglet Historique → onglet onglet-historique ; voiture gardée 5RBU0C → capture `V-1.2-01-avant.png` ✓ (11:06:55Z, md5 991f8a77)
- Step 2: je touche l'onglet Trajet : l'accueil s'affiche → ÉCART DE LIBELLÉ : l'écran montre « Renault Clio » et « 1.2 · 118 ch · 2017 · SP95-E10 », le plan attend « Renault Clio IV » et « 1.2 TCe 120 · 2017 · SP95-E10 » ; la base EEA (Cn = CLIO) ne porte ni « IV » ni « TCe 120 » → capture `V-1.2-02-apres.png` ✗ (11:06:55Z, md5 25c9bd31)
- Step 3: l'accueil, « Changer » sélectionné au clavier → focus sur « Changer » → capture `V-1.2-03-avant.png` ✓ (11:06:56Z, md5 7ff02c6d)
- Step 4: je touche « Changer » → écran Ma voiture, D.2 « » et recherche « » vides ; aucune fiche (0) → capture `V-1.2-04-apres.png` ✓ (11:06:56Z, md5 26d92281)
- Step 5: l'appli fermée (navigateur fermé puis relancé sur le même profil ; onglet vide about:blank) → URL about:blank → capture `V-1.2-05-avant.png` ✓ (11:07:04Z, md5 f95c356b)
- Step 6: je rouvre l'appli → accueil : « Renault Clio » « 1.2 · 118 ch · 2017 · SP95-E10 », rien ressaisi → capture `V-1.2-06-apres.png` ✓ (11:07:04Z, md5 25c9bd31)

### Issues Found
- Step 2 (V-1.2-02-apres.png) : ÉCART DE LIBELLÉ : l'écran montre « Renault Clio » et « 1.2 · 118 ch · 2017 · SP95-E10 », le plan attend « Renault Clio IV » et « 1.2 TCe 120 · 2017 · SP95-E10 » ; la base EEA (Cn = CLIO) ne porte ni « IV » ni « TCe 120 »

## V-2.2 — Vérifier et enregistrer

### Happy Path
- Step 1: la fiche de ma version (5RBU0C, 2017) affichée → fiche « Renault Clio 1.2 · 118 ch · 2017 » ; bouton « Enregistrer ma voiture » actif → capture `V-2.2-01-avant.png` ✓ (11:06:54Z, md5 c150a3a4)
- Step 2: je touche « Enregistrer ma voiture » → accueil : « Renault Clio » « 1.2 · 118 ch · 2017 · SP95-E10 » ; localStorage pt-voiture-v1 = Renault Clio 5RBU0C 2017 → capture `V-2.2-02-apres.png` ✓ (11:06:55Z, md5 25c9bd31)
- Step 3: aucune version identifiée : D.2 vide, « zz » dans la recherche par nom → D.2 «  », recherche « zz » (moins de 3 caractères : pas de recherche) ; aucune fiche (0) → capture `V-2.2-03-avant.png` ✓ (11:06:45Z, md5 7c9b9ad5)
- Step 4: je regarde « Enregistrer ma voiture » (D.2 incomplet « 5RB ») → aucune fiche ; « Enregistrer ma voiture » désactivé (disabled) → capture `V-2.2-04-apres.png` ✓ (11:06:46Z, md5 ecc668f8)

### Edge Case / constats
- Step 2 — après fermeture du navigateur et relance sur le même profil, l'accueil rappelle la même voiture (V-1.2-06).

### Issues Found
- aucune sur la version déployée à cette passe.

## V-5.3 — Rechercher dans cette zone

### Happy Path
- Step 1: la carte des stations (trajet en cours) → en-tête « Autour de moi » ; 8 stations ; centre 43.913, 2.142 zoom 10.0 → capture `V-5.3-01-avant.png` ✓ (11:07:35Z, md5 64522924)
- Step 2: je fais glisser la carte vers Montauban (4 glissements au doigt-souris) → bouton « Rechercher dans cette zone » affiché ; liste inchangée (8 stations, mêmes id) ; en-tête « Autour de moi » ; centre 44.018, 1.415 → capture `V-5.3-02-apres.png` ✓ (11:07:47Z, md5 ebf289b0)
- Step 3: le bouton « Rechercher dans cette zone » (carte recentrée sur Montauban d'un dernier glissement) → centre 44.017, 1.355 ; liste toujours celle d'avant (8 stations) → capture `V-5.3-03-avant.png` ✓ (11:07:51Z, md5 4c9ff5c9)
- Step 4: je touche « Rechercher dans cette zone » → bouton disparu ; en-tête « Autour de Montauban » ; 14 stations, toutes à moins de 11.6 km du centre affiché (44.017, 1.355), 14 pastilles ; 1re (Moins cher) « TotalEnergies Access Montauban · Relais Tescou 64,9 km · il y a 2 h · −16,6 c vs France 1,990 €/L » → capture `V-5.3-04-apres.png` ✓ (11:07:52Z, md5 165952d6)

### Issues Found
- aucune sur la version déployée à cette passe.

## V-3.1 — Suivre en direct

### Happy Path
- Step 1: enregistrement en cours, 200 positions rejouées → 19 km/h · 0,8 km · 0,06 L · 0,14 € · 0:03 · 14 km/h moy. · 8,2 L/100 · 200 points → capture `V-3.1-01-avant.png` ✓ (11:07:19Z, md5 4acd4d5c)
- Step 2: je roule : 200 positions de plus (1 par seconde d'horloge) → vitesse lue après chaque position : 52 changements sur 200 s (la vitesse est redessinée à chaque position, soit chaque seconde ; plus longue valeur identique : 57 s, arrêts du GPX compris) ; courbe « Vitesse des 3 dernières minutes » ; 19 km/h · 0,8 km · 0,06 L · 0,14 € · 0:03 · 14 km/h moy. · 8,2 L/100 · 200 points → 29 km/h · 1,8 km · 0,16 L · 0,33 € · 0:06 · 17 km/h moy. · 8,4 L/100 · 400 points → capture `V-3.1-02-apres.png` ✓ (11:07:28Z, md5 061d5f77)
- Step 3: aucun prix choisi (aucune station touchée) → « Prix : moyenne France du jour · 2,156 €/L » → capture `V-3.1-03-avant.png` ✓ (11:07:29Z, md5 5b505aa7)
- Step 4: le coût en direct s'affiche → 0,20 L × 2,156 €/L (moyenne France du jour SP95-E10 lue par l'API : 2,156) = 0,431 → affiché 0,43 € ; « Prix : moyenne France du jour · 2,156 €/L » → capture `V-3.1-04-apres.png` ✓ (11:07:31Z, md5 4e481429)
- Step 5: un prix pris sur une station (« Utiliser ce prix ») → « Prix : mon prix · 1,990 €/L » ; 0 km/h · 2,5 km · 0,21 L · 0,41 € · 0:08 · 18 km/h moy. · 8,3 L/100 · 508 points → capture `V-3.1-05-avant.png` ✓ (11:07:54Z, md5 e8085490)
- Step 6: le coût en direct s'affiche (60 positions plus loin) → 0,21 L × 1,990 = 0,418 → affiché 0,41 € ; « Prix : mon prix · 1,990 €/L » → capture `V-3.1-06-apres.png` ✓ (11:07:56Z, md5 ce6d5d9b)

### Issues Found
- aucune sur la version déployée à cette passe.

## V-3.4 — Mettre en pause

### Happy Path
- Step 1: un enregistrement en cours (A68) → 105 km/h · 30,3 km · 2,29 L · 4,56 € · 0:29 · 63 km/h moy. · 7,6 L/100 · 1745 points → capture `V-3.4-01-avant.png` ✓ (11:09:17Z, md5 82e28ddb)
- Step 2: je touche « Pause » puis 20 positions arrivent → « En pause », bouton « Reprendre » ; km 30,3 et litres 2,29 inchangés malgré 0,58 km parcourus sur le GPX → capture `V-3.4-02-apres.png` ✓ (11:09:18Z, md5 5d4b68a8)
- Step 3: une pause pendant laquelle la voiture s'est déplacée → déplacement pendant la pause : 2,07 km (GPX, points 1750 → 1821) ; affiché toujours 30,3 km, 2,29 L → capture `V-3.4-03-avant.png` ✓ (11:09:21Z, md5 03222350)
- Step 4: je touche « Reprendre » puis 60 positions → « Enregistrement » ; km 30,3 → 32,1 (+1,8) = distance roulée depuis la reprise (1,72 km) ; les 2,07 km de la pause ne sont ni comptés ni chiffrés → capture `V-3.4-04-apres.png` ✓ (11:09:23Z, md5 c85523bf)

### Issues Found
- aucune sur la version déployée à cette passe.

## V-4.5 — Courbe de vitesse

### Happy Path
- Step 1: un trajet enregistré (sa ligne sélectionnée dans l'Historique) → « Albi → Toulouse 21 oct. · 74,9 km · 3,52 € chacun 10,57 € » → capture `V-4.5-01-avant.png` ✓ (11:11:02Z, md5 d80dafb8)
- Step 2: la fin de trajet s'affiche (rouverte) — courbe de vitesse → « 63 km/h moy. · 7 accélérations » ; 600 points de courbe (≤ 600) pour 4348 s de trajet ; vitesse moyenne affichée 63 km/h ; km ÷ durée roulée (4276 s, pause exclue) = 63.0 km/h ; km ÷ durée totale = 62.0 km/h ; 7 accélérations → capture `V-4.5-02-apres.png` ✓ (11:11:03Z, md5 e9ca0733)

### Issues Found
- aucune sur la version déployée à cette passe.

## V-4.6 — Courbe de consommation

### Happy Path
- Step 1: un trajet enregistré (fin rouverte, haut de l'écran) → onglet onglet-historique ; « ← Historique » ; « Albi → Toulouse » → capture `V-4.6-01-avant.png` ✓ (11:11:03Z, md5 e9ca0733)
- Step 2: la courbe de consommation → « moy. 7,1 · pointe 100,2 L/100 » ; litres ÷ km × 100 = 5.310 ÷ 74.88 × 100 = 7.09 ; 600 points (moyenne simple des points de la courbe : 7.09, non pondérée par la distance) → capture `V-4.6-02-apres.png` ✓ (11:11:04Z, md5 7f9a9030)

### Issues Found
- aucune sur la version déployée à cette passe.

## V-1.3 — Démarrer

### Happy Path
- Step 1: la Clio enregistrée, localisation autorisée, position = 1er point du GPX (Albi, place du Vigan) → accueil « Renault Clio » ; permission géolocalisation accordée au contexte → capture `V-1.3-01-avant.png` ✓ (11:07:10Z, md5 25c9bd31)
- Step 2: je touche « Démarrer » → écran En route, « Enregistrement » (pastille animée : clignote infinite) ; 1re position enregistrée en 257 ms (data-points 1) ; IndexedDB enregistrement : présent → capture `V-1.3-02-apres.png` ✓ (11:07:11Z, md5 827bc8db)
- Step 3: la localisation refusée (contexte sans permission geolocation) → accueil « Renault Clio » ; permission géolocalisation : denied → capture `V-1.3-03-avant.png` ✓ (11:11:05Z, md5 1f66d5d0)
- Step 4: je touche « Démarrer » → « L'enregistrement a besoin de ta localisation Cadenas de la barre d'adresse → Position → Autoriser » ; URL / ; IndexedDB : enregistrement absent, 0 trajet → capture `V-1.3-04-apres.png` ✓ (11:11:05Z, md5 4cfb9d3a)

### Issues Found
- aucune sur la version déployée à cette passe.

## V-3.5 — Arrêter

### Happy Path
- Step 1: un enregistrement de plus de 1 km (arrivée au Capitole, Toulouse) → 10 km/h · 74,9 km · 5,31 L · 10,57 € · 1:11 · 63 km/h moy. · 7,1 L/100 · 4273 points → capture `V-3.5-01-avant.png` ✓ (11:10:58Z, md5 6d67d1c3)
- Step 2: je touche « Arrêter » → « Albi → Toulouse » ; « 21 oct. 2026 · 1 h 11 · Renault Clio » ; 5,3 L (5.310), 74,9 km (74.88), 7,1 L/100 km moy. → capture `V-3.5-02-apres.png` ✓ (11:11:00Z, md5 4d4b00ff)
- Step 3: un enregistrement de moins de 1 km (150 positions) → 19 km/h · 0,5 km · 0,04 L · 0,09 € · 0:02 · 12 km/h moy. · 8,4 L/100 · 150 points → capture `V-3.5-03-avant.png` ✓ (11:11:12Z, md5 56e6458e)
- Step 4: je touche « Arrêter » → « Trajet trop court : 0,5 km sur 1 minimum. Rien n'est ajouté à l'historique. Retour à l'accueil » ; IndexedDB : 0 trajet, pas de trajet arrêté, pas d'enregistrement → capture `V-3.5-04-apres.png` ✓ (11:11:12Z, md5 b9ab7181)
- Step 5: aucun réseau (context.setOffline(true)) juste avant l'arrêt — 420 positions → navigator.onLine = false ; 28 km/h · 2,0 km · 0,17 L · 0,36 € · 0:06 · 17 km/h moy. · 8,4 L/100 · 420 points ; « Prix : moyenne France du jour · 2,156 €/L » → capture `V-3.5-05-avant.png` ✓ (11:11:22Z, md5 876d7f76)
- Step 6: la fin de trajet s'ouvre sans réseau → hors ligne : « 43,928 · 2,146 → 43,917 · 2,144 » (coordonnées, noms pas encore connus) ; 0,168 L × 2,156 €/L (moyenne gardée au départ) = 0,36 € calculés sur le téléphone → capture `V-3.5-06-apres.png` ✓ (11:11:23Z, md5 fea007d0)

### Edge Case / constats
- Step 6 — au retour du réseau (setOffline(false) → événement online), le titre passe de « 43,928 · 2,146 → 43,917 · 2,144 » à « Albi → Albi » sans rien toucher ; requêtes tentées pendant la coupure : 4 (refusées par le navigateur hors ligne).

### Issues Found
- aucune sur la version déployée à cette passe.

## V-3.E1 — Oubli d'arrêter

### Happy Path
- Step 1: un enregistrement en cours (700 positions, 4 km dans Albi) → 30 km/h · 2,8 km · 0,24 L · 0,51 € · 0:11 · 14 km/h moy. · 8,5 L/100 · 700 points → capture `V-3.E1-01-avant.png` ✓ (11:11:42Z, md5 052b37c1)
- Step 2: vitesse < 3 km/h et position dans 50 m pendant 10 min (points 774 → 1375 du tracé dérivé) → « Trajet arrêté : immobile depuis 10 min. Reprendre C'est fini » au point 1375 (601 s après le début de l'immobilité) ; début daté 11:24:18 (point 774 reçu à 11:24:17, écart 1 s) ; 5 positions de plus : km 4,0 et litres 0,33 figés ; état « Immobile depuis 10 min » → capture `V-3.E1-02-apres.png` ✓ (11:11:55Z, md5 c2d7a3e6)
- Step 3: cette alerte (« C'est fini » sélectionné) → focus « C'est fini » → capture `V-3.E1-03-avant.png` ✓ (11:11:55Z, md5 46009f51)
- Step 4: je touche « C'est fini » → « Albi → Le Sequestre » « 21 oct. 2026 · 12 min · Renault Clio » ; arrivée datée 11:24:18 = début de l'immobilité (point 774, écart 1.0 s) ; durée 774 s : les 10 min d'arrêt ne comptent pas ; 4,02 km → capture `V-3.E1-04-apres.png` ✓ (11:11:57Z, md5 c2efd918)
- Step 5: cette alerte (2e trajet rejoué ; « Reprendre » sélectionné) → « Trajet arrêté : immobile depuis 10 min. Reprendre C'est fini » ; 775 points gardés → capture `V-3.E1-05-avant.png` ✓ (11:12:26Z, md5 258468ae)
- Step 6: je touche « Reprendre » → « Enregistrement » ; 775 points gardés (autant qu'à l'alerte), 4,0 km conservés → capture `V-3.E1-06-apres.png` ✓ (11:12:27Z, md5 3d4ef2ff)

### Edge Case / constats
- Step 6 — après « Reprendre », 10 positions de plus : 775 → 785 points (l'enregistrement repart).

### Issues Found
- aucune sur la version déployée à cette passe.

## V-3.E2 — GPS perdu

### Happy Path
- Step 1: un enregistrement en cours (A68, 121 positions, dernière avant le tunnel) → 105 km/h · 3,5 km · 0,23 L · 0,50 € · 0:02 · 105 km/h moy. · 6,7 L/100 · 121 points → capture `V-3.E2-01-avant.png` ✓ (11:12:32Z, md5 5d2ad664)
- Step 2: aucune position pendant 16 s → « GPS perdu (tunnel) · la distance est complétée à la sortie. » ; data-etat gps-perdu ; vitesse 0 km/h → capture `V-3.E2-02-apres.png` ✓ (11:12:32Z, md5 872702f5)
- Step 3: le signal revient après 90 s sans position (tunnel de 3,00 km) → toujours « GPS perdu (tunnel) · la distance est complétée à la sortie. » ; 3,5 km figés → capture `V-3.E2-03-avant.png` ✓ (11:12:33Z, md5 5dba9f3b)
- Step 4: la position suivante arrive → km 3,5 → 6,5 (+3,0 km ; ligne droite entre les 2 positions 3.001 km, chemin réel 3,0007 km, à 120 km/h de moyenne) ; message disparu → capture `V-3.E2-04-apres.png` ✓ (11:12:33Z, md5 a0c20a07)

### Issues Found
- aucune sur la version déployée à cette passe.

## V-4.2 — Mettre mon prix

### Happy Path
- Step 1: la fin de trajet (SP95-E10, moyenne du jour) → « Moyenne France du jour » 2.156 €/L ; coût 1,18 € → capture `V-4.2-01-avant.png` ✓ (11:12:37Z, md5 31a7e678)
- Step 2: je touche le compteur, tape 1,989 et valide (Entrée) → « Mon prix » 1,989 €/L ; coût 0,546 × 1,989 = 1,09 € ; « Revenir à la moyenne » affiché → capture `V-4.2-02-apres.png` ✓ (11:12:38Z, md5 8f7eb93e)
- Step 3: mon prix saisi (« Revenir à la moyenne » sélectionné) → focus « Revenir à la moyenne » → capture `V-4.2-03-avant.png` ✓ (11:12:38Z, md5 5e214e94)
- Step 4: je touche « Revenir à la moyenne » → « Moyenne France du jour » 2,156 €/L ; coût 1,18 € (comme avant la saisie) → capture `V-4.2-04-apres.png` ✓ (11:12:38Z, md5 1fa87de4)
- Step 5: le champ du prix ouvert (« 1,5 » tapé, pas validé) → champ « 1,5 » ouvert → capture `V-4.2-05-avant.png` ✓ (11:12:39Z, md5 4fb9a1dc)
- Step 6: j'appuie sur Échap → champ fermé ; prix toujours 2,156 €/L « Moyenne France du jour » ; focus revenu sur « Modifier le prix, 2,156 euros par litre » → capture `V-4.2-06-apres.png` ✓ (11:12:39Z, md5 c0f1d82c)

### Issues Found
- aucune sur la version déployée à cette passe.

## V-4.1 — Prix de l'essence

### Happy Path
- Step 1: la fin d'un trajet en Clio SP95-E10 parti de France (juste avant « Arrêter ») → « Prix : moyenne France du jour · 2,156 €/L » ; 105 km/h · 8,2 km · 0,55 L · 1,18 € · 0:04 · 110 km/h moy. · 6,6 L/100 · 182 points → capture `V-4.1-01-avant.png` ✓ (11:12:35Z, md5 b6e4421b)
- Step 2: l'écran Fin de trajet s'ouvre → sélecteur Gazole · SP95-E10 · SP95 · SP98 · E85 · GPLc, SP95-E10 choisi ; « Moyenne France du jour » ; compteur « Modifier le prix, 2,156 euros par litre » (3 décimales) = moyenne France SP95-E10 lue par l'API 2,156 ; coût 1,18 € essence → capture `V-4.1-02-apres.png` ✓ (11:12:36Z, md5 48086e4b)
- Step 3: ce sélecteur (Gazole sélectionné au clavier) → focus « Gazole » → capture `V-4.1-03-avant.png` ✓ (11:12:36Z, md5 cd1b3db6)
- Step 4: je touche Gazole → « Moyenne France du jour » 2,368 €/L (moyenne France Gazole de l'API 2,368) ; coût 0,546 × 2,368 = 1,29 € → capture `V-4.1-04-apres.png` ✓ (11:12:37Z, md5 25f1bee9)
- Step 5: un départ hors de France : vrai itinéraire dans Barcelone (plaça de Catalunya → Sagrada Família, 3,2 km rejoués) → « Prix : moyenne Espagne du jour · 1,790 €/L » ; 18 km/h · 3,2 km · 0,26 L · 0,46 € · 0:11 · 17 km/h moy. · 8,0 L/100 · 674 points → capture `V-4.1-05-avant.png` ✓ (11:12:55Z, md5 79cfcfc3)
- Step 6: l'écran Fin de trajet s'ouvre → « Barcelone → Barcelone » ; « Moyenne Espagne du jour » 1,790 €/L (moyenne Espagne SP95-E10 de l'API : 1,790) ; pays de départ enregistré ES → capture `V-4.1-06-apres.png` ✓ (11:12:57Z, md5 90b6fc03)

### Issues Found
- aucune sur la version déployée à cette passe.

## V-1.1 — Ouvrir l'appli

### Happy Path
- Step 1: une voiture enregistrée ; l'appli était restée sur l'onglet Stations → onglet onglet-stations ; voiture 5RBU0C → capture `V-1.1-01-avant.png` ✓ (11:07:01Z, md5 eec1001e)
- Step 2: j'ouvre l'appli (nouvel onglet sur l'adresse de l'appli) → onglet Trajet sélectionné ; T1 « Renault Clio 1.2 · 118 ch · 2017 · SP95-E10 Changer Démarrer » ; ni prix ni nombre de personnes → capture `V-1.1-02-apres.png` ✓ (11:07:03Z, md5 25c9bd31)
- Step 3: premier lancement (profil neuf, aucune voiture), j'ouvre l'appli → T1 « Enregistre d'abord ta voiture Le code D.2 de ta carte grise, une seule fois. Démarrer » ; onglet sélectionné : Trajet ; localStorage pt-voiture-v1 absent → capture `V-1.1-03-avant.png` ✓ (11:06:21Z, md5 c213538e)
- Step 4: je touche « Démarrer » sans voiture → URL /voiture, écran Ma voiture (« Ma voiture ») ; aucun enregistrement en IndexedDB → capture `V-1.1-04-apres.png` ✓ (11:06:21Z, md5 c427090c)
- Step 5: un trajet en cours d'enregistrement ; je suis sur l'onglet Historique → onglet onglet-historique ; IndexedDB enregistrement : 483 points → capture `V-1.1-05-avant.png` ✓ (11:07:32Z, md5 593ca088)
- Step 6: je touche l'onglet Trajet → URL /en-route, écran En route « Enregistrement » (pas l'accueil) → capture `V-1.1-06-apres.png` ✓ (11:07:32Z, md5 a3e693b8)

### Issues Found
- aucune sur la version déployée à cette passe.

## V-5.6 — Trajet en cours

### Happy Path
- Step 1: un trajet en cours ; je touche l'onglet Stations (positions envoyées au rythme réel, 1 par seconde) → écran Stations ouvert ; bandeau « ● Trajet en cours · 0,93 € » → capture `V-5.6-01-avant.png` ✓ (11:08:11Z, md5 d2eedbde)
- Step 2: l'onglet Stations est ouvert → bandeau en haut « ● Trajet en cours · 1,00 € » (coût en direct ; 0,93 € sur En route juste avant) ; 8 stations listées → capture `V-5.6-02-apres.png` ✓ (11:08:15Z, md5 884ed01d)
- Step 3: ce bandeau, 6 s plus tard (la voiture roule) → « ● Trajet en cours · 1,03 € » (« ● Trajet en cours · 1,00 € » 6 s plus tôt : le coût du bandeau suit le trajet) ; positions rejouées jusqu'au point 914 → capture `V-5.6-03-avant.png` ✓ (11:08:22Z, md5 38fc764e)
- Step 4: je touche l'onglet Trajet → écran En route revenu ; 912 points (912 au moment du toucher) ; 82 km/h · 6,9 km · 0,52 L · 1,03 € · 0:15 · 27 km/h moy. · 7,5 L/100 · 912 points → capture `V-5.6-04-apres.png` ✓ (11:08:22Z, md5 fd2e2bb3)

### Edge Case / constats
- Step 2 — sans trajet en cours (même téléphone, avant Démarrer) : bandeau « retour-trajet » présent 0 fois (attendu 0).

### Issues Found
- aucune sur la version déployée à cette passe.

## V-5.5 — Utiliser ce prix

### Happy Path
- Step 1: trajet en cours ; la fiche de la 1re station « Moins cher » de Montauban → fiche « TotalEnergies Access Montauban · Relais Tescou » ; bouton « Utiliser 1,990 €/L pour mon trajet » ; prix SP95-E10 en base pour 82000015 : 1,990 €/L. (Le plan cite 2,103 €/L à titre d'exemple : le prix réel du jour est celui lu ici.) → capture `V-5.5-01-avant.png` ✓ (11:07:52Z, md5 34c09466)
- Step 2: je touche « Utiliser 1,990 €/L pour mon trajet » → fiche fermée, écran En route ; « Prix : mon prix · 1,990 €/L » ; 0,21 L × 1,990 = 0,418 → 0,41 € (la fin de trajet est relue plus bas) → capture `V-5.5-02-apres.png` ✓ (11:07:54Z, md5 3e50e670)

### Edge Case / constats
- Step 2 — fin de trajet : libellé « Mon prix », prix data-prix 1.99 (station : 1,990), coût 10,57 € essence.

### Issues Found
- aucune sur la version déployée à cette passe.

## V-5.1 — Stations autour de moi

### Happy Path
- Step 3: un trajet en cours (A68, 1 450 positions) ; j'ouvre l'onglet Stations → écran Stations autour de la voiture (43.8843, 1.9259, 21,6 km après Albi) : 5 stations toutes à moins de 10 km d'elle ; 1re « TotalEnergies Marssac-sur-Tarn 9,2 km · il y a 28 min · −16,6 c vs France 1,990 €/L » ; bandeau « ● Trajet en cours · 3,10 € » ; sur En route juste avant : 105 km/h · 21,6 km · 1,48 L · 2,95 € · 0:24 · 54 km/h moy. · 6,9 L/100 · 1448 points → capture `V-5.1-03-avant.png` ✓ (11:08:50Z, md5 89677362)
- Step 4: je reviens au trajet (onglet Trajet) après 12 s dans Stations → distance 21,6 → 22,1 km, points 1448 → 1463 : l'enregistrement a continué pendant Stations → capture `V-5.1-04-apres.png` ✓ (11:09:06Z, md5 e024ee0a)

### Issues Found
- aucune sur la version déployée à cette passe.

## V-4.7 — Enregistrer ou supprimer

### Happy Path
- Step 1: un trajet qui vient d'être arrêté (3 personnes choisies) → prix « Mon prix » 1,990 €/L ; coût 10,57 € ; « 3,52 € chacun » ; boutons « Supprimer Enregistrer » → capture `V-4.7-01-avant.png` ✓ (11:11:01Z, md5 67431a43)
- Step 2: je touche « Enregistrer » → onglet Historique, en tête : « Albi → Toulouse 21 oct. · 74,9 km · 3,52 € chacun 10,57 € » ; IndexedDB : prix 1.99 (station), carburant SP95-E10, 3 personnes, enregistré ; totaux « 1 trajet 75 km 10,57 € essence » → capture `V-4.7-02-apres.png` ✓ (11:11:01Z, md5 18a29c89)
- Step 3: un trajet qui vient d'être arrêté (celui de la coupure réseau, noms complétés) → « Albi → Albi » ; boutons « Supprimer Enregistrer » → capture `V-4.7-03-avant.png` ✓ (11:11:23Z, md5 2f9cd5d4)
- Step 4: je touche « Supprimer » → accueil (URL /) ; IndexedDB : 0 trajet, aucun trajet arrêté ni point gardé ; Historique : « Aucun trajet enregistré. » → capture `V-4.7-04-apres.png` ✓ (11:11:24Z, md5 25c9bd31)
- Step 5: un trajet arrêté (Barcelone), pas encore tranché ; je ferme l'appli → trajet efc8a8bd-6271-4a80-881a-8387a24906dd ; boutons « Supprimer Enregistrer » → capture `V-4.7-05-avant.png` ✓ (11:12:57Z, md5 17f45138)
- Step 6: je rouvre l'appli (navigateur relancé, même profil) → URL /fin ; même trajet efc8a8bd-6271-4a80-881a-8387a24906dd « Barcelone → Barcelone » ; « Supprimer Enregistrer » → capture `V-4.7-06-apres.png` ✓ (11:12:59Z, md5 35b1d22d)

### Edge Case / constats
- Démonstration : coût 10,57 € au prix de la station 1,990 €/L, partagé à 3.

### Issues Found
- aucune sur la version déployée à cette passe.

## Régression (passage voiture,trajet,cas)
- US-4.E2 (T4) : « 7 » validé → « Entre un prix entre 0,50 et 4,00 €/L », prix gardé 2.156 ✓

## Erreurs de page relevées
- aucune

---

# Passage r1b stations,historique,retraits — début 2026-10-21T11:13:09.768Z

Appli déployée https://plein-et-trajet.vercel.app, base Supabase réelle, Playwright (bibliothèque), Chromium headless 390 × 844, toucher, fr-FR, Europe/Paris.
Réel : base EEA (fonction voiture-eea), moyennes du jour (FR SP95-E10 2,156 €/L, Gazole 2,368 €/L), stations et prix du jour, géocodage inverse (fonction lieux), refus de localisation (contexte sans permission), coupure réseau (context.setOffline).
Rejoué : géolocalisation par context.setGeolocation depuis tests/e2e/fixtures/albi-toulouse.gpx (et ses dérivés immobile / tunnel, et barcelone.gpx : vrai itinéraire Valhalla fabriqué par creer-gpx.mjs barcelone), horloge de la page accélérée par page.clock (méthode r1a : avancer l'horloge, poser la position, attendre que T3 l'ait comptée), au rythme réel (1 point/s) pendant les passages par Stations.

## V-5.1 — Stations autour de moi

### Happy Path
- Step 1: la position autorisée (Albi), accueil → position du contexte 43.92833, 2.145916 ; permission granted → capture `V-5.1-01-avant.png` ✓ (11:13:10Z, md5 25c9bd31)
- Step 2: je touche l'onglet Stations → en-tête « Autour de moi » ; ma position dans le cadre de la carte ; 8 stations à moins de 10 km, 8 pastilles ; 8 prix SP95-E10 identiques à la base (table prix) ; 1re « TotalEnergies Albi · Relais des Fontanelles 2,2 km · hier · −16,6 c vs France 1,990 €/L » → capture `V-5.1-02-apres.png` ✓ (11:13:14Z, md5 22c0d663)

### Issues Found
- aucune sur la version déployée à cette passe.

## V-5.2 — Choisir le carburant

### Happy Path
- Step 1: une Clio SP95-E10 enregistrée ; je regarde les prix du Gazole dans Stations, puis je quitte l'onglet (Historique) → localStorage pt-carburant = « Gazole » ; voiture SP95-E10 → capture `V-5.2-01-avant.png` ✓ (11:13:16Z, md5 06202b79)
- Step 2: j'ouvre l'onglet Stations → SP95-E10 choisi d'office (aria-pressed) ; titre « Stations · SP95-E10 » → capture `V-5.2-02-apres.png` ✓ (11:13:18Z, md5 39c8bff7)
- Step 3: la liste en SP95-E10 (faite défiler) → 8 stations SP95-E10 → capture `V-5.2-03-avant.png` ✓ (11:13:19Z, md5 62d7bdaa)
- Step 4: je touche Gazole → titre « Stations · Gazole » ; 13 lignes et 13 pastilles au prix gazole de la base (contre 8 en SP95-E10) ; stations de la liste SP95-E10 sans gazole en base : 0 (aucune) → absentes ; 5 stations apparues en Gazole, aucune ne vend de SP95-E10 en base ; 1re « TotalEnergies Albi · Relais des Fontanelles 2,2 km · hier · −11,8 c vs France 2,250 €/L » → capture `V-5.2-04-apres.png` ✓ (11:13:22Z, md5 b9e3ce50)

### Edge Case / constats
- Step 4 — « les stations sans gazole disparaissent » : aucune station de la zone ne vend du SP95-E10 sans gazole (relevé r1b sur la base : 0 dans 25 km d'Albi, Toulouse, Castres, Montauban et Rodez), le cas n'a pas pu être montré sur données réelles. Le filtre est montré dans l'autre sens : les stations ajoutées en Gazole n'ont pas de SP95-E10 en base, et V-5.5-05 montre Carrefour Market Puygouzon (sans SP95-E10) absente de la liste SP95-E10.

### Issues Found
- aucune sur la version déployée à cette passe.

## V-5.4 — Trier

### Happy Path
- Step 1: la liste des stations (SP95-E10, tri « Moins cher ») → tri prix ; 8 stations → capture `V-5.4-01-avant.png` ✓ (11:13:24Z, md5 98062121)
- Step 2: je touche « Plus proche » → « Plus proche » : distances croissantes 1,8 ≤ 1,9 ≤ 2,2 ≤ 2,3 ≤ 3,1 ≤ 3,3 ≤ 6,8 ≤ 9,4… (8) ; « Moins cher » : prix croissants 1,990 ≤ 1,990 ≤ 2,149 ≤ 2,178 ≤ 2,178 ≤ 2,178… ; capture sur « Plus proche » → capture `V-5.4-02-apres.png` ✓ (11:13:24Z, md5 7ebd793e)

### Issues Found
- aucune sur la version déployée à cette passe.

## V-5.5 — Utiliser ce prix

### Happy Path
- Step 3: aucun trajet en cours ; fiche de la station la moins chère → fiche « TotalEnergies Albi · Relais des Fontanelles » ; bouton « Utiliser 1,990 €/L pour mon trajet » ; pas de bandeau (0) → capture `V-5.5-03-avant.png` ✓ (11:13:25Z, md5 232a8071)
- Step 4: je touche ce bouton → accueil ouvert (URL /) ; prix gardé : pt-prix-choisi = {"prix":1.99,"carburant":"SP95-E10","station":"TotalEnergies Albi · Relais des Fontanelles"} (la capture montre l'accueil après l'essai de démarrage, revenu par « trop court ») → capture `V-5.5-04-apres.png` ✓ (11:13:26Z, md5 25c9bd31)
- Step 5: une station qui ne vend pas le SP95-E10 de ma voiture (liste Gazole) → « Carrefour Market Puygouzon 4,3 km · il y a 1 h · −1,3 c vs France 2,355 €/L » (81990003) : aucun prix SP95-E10 vendu en base (absent ou rupture) → capture `V-5.5-05-avant.png` ✓ (11:13:30Z, md5 87194d42)
- Step 6: sa fiche s'ouvre → fiche « Carrefour Market Puygouzon » ; SP95-E10 « SP95-E10 non vendu » ; pas de bouton « Utiliser … pour mon trajet » → capture `V-5.5-06-apres.png` ✓ (11:13:30Z, md5 bd13fcbc)

### Edge Case / constats
- Step 4 — trajet démarré ensuite : « Prix : mon prix · 1,990 €/L » ; pt-prix-choisi vidé au départ (null).

### Issues Found
- aucune sur la version déployée à cette passe.

## V-5.7 — Europe et Royaume-Uni

### Happy Path
- Step 1: une position à Barcelone (41,3874, 2,1686), accueil → en-tête « Autour de moi » → capture `V-5.7-01-avant.png` ✓ (11:13:31Z, md5 25c9bd31)
- Step 2: l'onglet Stations s'ouvre → 153 stations espagnoles (pays ES en base), 153 pastilles, prix SP95-E10 = base ; 1re « Galp Sant adria de besos · Galp 6,8 km · il y a 6 min · −27,6 c vs Espagne 1,514 €/L » → capture `V-5.7-02-apres.png` ✓ (11:13:37Z, md5 0370fa25)
- Step 3: une position à Dartford (Royaume-Uni) → 18 stations, pays GB ; 1re « Morrisons · MFG Morrisons Grays, London Road, GRAYS 7,9 km · il y a 12 h · −4,9 c vs Royaume-Uni 2,022 €/L » → capture `V-5.7-03-avant.png` ✓ (11:13:41Z, md5 1b3936f3)
- Step 4: je lis une station (fiche) → fiche « Morrisons · MFG Morrisons Grays, London Road, GRAYS » ; Gazole 2,343 €/L ← 196,9 p/L ; SP95 2,022 €/L ← 169,9 p/L ; SP95-E10 2,022 €/L ← 169,9 p/L ; SP98 2,260 €/L ← 189,9 p/L ; « 1 € = 0,8403 £ · BCE 20/10 » (taux BCE en base 0.84028) → capture `V-5.7-04-apres.png` ✓ (11:13:42Z, md5 badccd97)
- Step 5: un pays qui ne publie pas ses prix station par station : Belgique (position Bruxelles), carte glissée → statut du pays en base : « aucun » ; bouton « Rechercher dans cette zone » → capture `V-5.7-05-avant.png` ✓ (11:13:52Z, md5 47e613ec)
- Step 6: j'y cherche dans cette zone → « Ce pays ne publie pas les prix station par station Moyenne nationale · Belgique · SP95-E10 : 1,977 €/L » ; en-tête « Autour de Schaerbeek » ; 0 ligne, pastilles 0 → capture `V-5.7-06-apres.png` ✓ (11:13:54Z, md5 3f200665)

### Issues Found
- aucune sur la version déployée à cette passe.

## V-6.1 — Ouvrir l'historique

### Happy Path
- Step 1: des trajets enregistrés en septembre et en octobre 2026 (deux trajets réellement rejoués, horloge de la page posée au 14/09 08:00 et au 05/10 17:30) → IndexedDB : 2026-09-14 2.5 km ; 2026-10-05 6.6 km → capture `V-6.1-01-avant.png` ✓ (11:14:35Z, md5 25c9bd31)
- Step 2: je touche l'onglet Historique → groupes Octobre 2026 puis Septembre 2026 ; lignes : Albi → Albi 5 oct. · 6,6 km 1,01 € | Albi → Albi 14 sept. · 2,5 km 0,45 € → capture `V-6.1-02-apres.png` ✓ (11:14:35Z, md5 df87aff2)
- Step 3: aucun trajet enregistré (téléphone neuf, voiture enregistrée) → IndexedDB : 0 trajet → capture `V-6.1-03-avant.png` ✓ (11:14:36Z, md5 25c9bd31)
- Step 4: j'ouvre l'onglet Historique → « Aucun trajet enregistré. » ; totaux « 0 trajets 0 km 0,00 € essence » → capture `V-6.1-04-apres.png` ✓ (11:14:37Z, md5 483b43ee)

### Issues Found
- aucune sur la version déployée à cette passe.

## V-6.2 — Totaux

### Happy Path
- Step 1: ÉTAT PRÉPARÉ : 4 trajets de 77, 152, 245 et 243 km écrits en IndexedDB (format TrajetV1 de l'appli) → trajets 77 km 4,93 L, 152 km 10,03 L, 245 km 16,91 L, 243 km 16,28 L au prix moyen France SP95-E10 du jour 2,156 → coûts 10,63 + 21,62 + 36,46 + 35,10 → capture `V-6.2-01-avant.png` ✓ (11:14:37Z, md5 25c9bd31)
- Step 2: l'historique s'affiche → totaux « 4 trajets 717 km 103,81 € essence » = 4 trajets, 717 km, 103,81 € (somme des coûts des lignes 35,10 + 36,46 + 21,62 + 10,63) → capture `V-6.2-02-apres.png` ✓ (11:14:38Z, md5 68948051)
- Step 3: un trajet corrigé : celui de 152 km rouvert, prix passé à 1,899 €/L → « Mon prix » ; coût 19,05 € essence → capture `V-6.2-03-avant.png` ✓ (11:14:39Z, md5 dd20c3d7)
- Step 4: je reviens à l'historique → totaux recalculés « 4 trajets 717 km 101,24 € essence » (= 101,24 €) ; ligne 152 km : Albi → Cahors 8 oct. · 152 km 19,05 € → capture `V-6.2-04-apres.png` ✓ (11:14:39Z, md5 772ac121)

### Issues Found
- aucune sur la version déployée à cette passe.

## V-6.3 — Lire un trajet

### Happy Path
- Step 1: ÉTAT PRÉPARÉ : un trajet enregistré à 3 personnes (Albi → Rodez) et un trajet seul, écrits en IndexedDB → prep-3p 92.4 km 3 pers. ; prep-seul 76.8 km 1 pers. → capture `V-6.3-01-avant.png` ✓ (11:14:40Z, md5 29877573)
- Step 2: je lis sa ligne (sélectionnée au clavier) → ligne « Albi → Rodez 18 oct. · 92,4 km · 4,32 € chacun 12,96 € » (date, départ → arrivée, km, coût, 4,32 € chacun) ; trajet seul : « Toulouse → Albi 19 oct. · 76,8 km 10,44 € » sans part → capture `V-6.3-02-apres.png` ✓ (11:14:41Z, md5 99969107)
- Step 3: une ligne (le trajet seul, sélectionné au clavier) → « Toulouse → Albi 19 oct. · 76,8 km 10,44 € » → capture `V-6.3-03-avant.png` ✓ (11:14:41Z, md5 4d878b50)
- Step 4: je la touche → fin de ce trajet « Toulouse → Albi » ; onglet Historique sélectionné ; « ← Historique » ; bouton « Supprimer ce trajet » → capture `V-6.3-04-apres.png` ✓ (11:14:42Z, md5 b0216a36)

### Issues Found
- aucune sur la version déployée à cette passe.

## V-6.4 — Revoir, corriger, supprimer

### Happy Path
- Step 1: un trajet rouvert depuis l'historique (le trajet seul), réglages de prix et de personnes → prix « Moyenne France du jour » 2.156 ; 1 personne → capture `V-6.4-01-avant.png` ✓ (11:14:42Z, md5 fefefa35)
- Step 2: je change son carburant (Gazole) et son nombre de personnes (2), puis je reviens à l'historique → IndexedDB : Gazole, 2 personnes, 2.368 €/L ; ligne « Toulouse → Albi 19 oct. · 76,8 km · 5,73 € chacun 11,46 € » → capture `V-6.4-02-apres.png` ✓ (11:14:43Z, md5 2ce6a1c7)
- Step 3: un trajet rouvert (Albi → Rodez, 3 personnes) → bouton « Supprimer ce trajet » → capture `V-6.4-03-avant.png` ✓ (11:14:43Z, md5 5a0fc8f3)
- Step 4: je touche « Supprimer ce trajet » → disparu de la liste ; totaux « 1 trajet 77 km 11,46 € essence » (1 trajet, 77 km = 76,8 arrondi) ; IndexedDB 1 trajet → capture `V-6.4-04-apres.png` ✓ (11:14:44Z, md5 c9ea1257)

### Issues Found
- aucune sur la version déployée à cette passe.

## V-4.3 — Coût de l'essence

### Happy Path
- Step 1: ÉTAT PRÉPARÉ : un trajet arrêté de 41,2 L, prix 2,161 €/L (« Mon prix »), écrit en IndexedDB (en_cours/arrete) → trajet arrêté en attente : 588 km, 41.2 L, prix_perso 2.161 ; écran Historique (vide : le trajet n'est pas encore tranché) → capture `V-4.3-01-avant.png` ✓ (11:14:45Z, md5 16956a37)
- Step 2: la fin de trajet s'affiche (appli ouverte : le trajet arrêté revient) → « 89,03 € essence » (41,2 × 2,161 = 89.0332 → 89,03) ; libellé « Mon prix » → capture `V-4.3-02-apres.png` ✓ (11:14:46Z, md5 f13f642c)
- Step 3: le prix changé (réseau coupé : context.setOffline(true)) — « 2,050 » tapé → navigator.onLine = false ; champ « 2,050 » → capture `V-4.3-03-avant.png` ✓ (11:14:47Z, md5 1555a05d)
- Step 4: je valide (Entrée), toujours sans réseau → « 84,46 € essence » = 41,2 × 2,050 recalculé aussitôt, hors ligne (navigator.onLine false) → capture `V-4.3-04-apres.png` ✓ (11:14:47Z, md5 443dd1df)

### Edge Case / constats
- Step 4 — toujours hors ligne : « Revenir à la moyenne » → 88,83 € (41,2 × 2,156), puis Gazole → 97,56 € (41,2 × 2,368) ✓, sur les moyennes gardées dans le trajet ; requêtes émises pendant ces changements : 0 (aucune).

### Issues Found
- aucune sur la version déployée à cette passe.

## V-4.4 — Partager

### Happy Path
- Step 1: un coût de 89,03 € (SP95-E10, mon prix 2,161 €/L), 1 personne → « 89,03 € essence » ; « Seul : tout pour toi. » → capture `V-4.4-01-avant.png` ✓ (11:14:48Z, md5 9714abed)
- Step 2: je passe le nombre de personnes à 3 avec « + » → 3 personnes → « 29,68 € chacun » (89,03 ÷ 3 = 29,677) → capture `V-4.4-02-apres.png` ✓ (11:14:48Z, md5 a906fed8)
- Step 3: 1 personne → 1 personne ; « Seul : tout pour toi. » → capture `V-4.4-03-avant.png` ✓ (11:14:49Z, md5 6464daf1)
- Step 4: l'écran s'affiche ; j'essaie de descendre sous 1 et de monter au-delà de 9 → « Seul : tout pour toi. » ; « − » désactivé à 1 (toucher : reste 1) ; 10 touchers sur « + » → 9, « + » désactivé ; revenu à 1 : « Seul : tout pour toi. » → capture `V-4.4-04-apres.png` ✓ (11:14:50Z, md5 81d77fda)

### Issues Found
- aucune sur la version déployée à cette passe.

## V1-retraits — Contrôle négatif : ce qui sort de la V1

### Happy Path
- Step 1: l'appli déployée, journal réseau Playwright ouvert sur TOUS les contextes du passage (écoute context.on('request'), y compris les processus précédents du même passage, relus dans exploration/m5-resultats-<passage>-*.json) → 259 requêtes de ce processus → capture `V1-retraits-01-avant.png` ✓ (11:14:51Z, md5 25c9bd31)
- Step 2: parcours T1 → T6 (+ tous les flux du passage, dont 5 trajets complets rejoués) → 615 requêtes journalisées sur 15 contextes : 0 vers api.myptv.com, 0 vers estimer-trajet / trajet-roule / péages ; fonctions appelées {"voiture-eea":10,"lieux":32} ; hôtes {"plein-et-trajet.vercel.app":112,"fonts.googleapis.com":32,"fonts.gstatic.com":144,"rglrwtkqwihdztgqlbsy.supabase.co":184,"":8,"data.geopf.fr":134,"photon.komoot.io":1} ; 137 captures (contextes voiture, trajet, cas-refus, cas, barcelone, stations, barcelone-stations, dartford, bruxelles, historique-reel, historique-vide, historique-prepare, historique-prepare-2, cout-prepare, retraits) + 6 routes passées au crible : aucun « péage » ni « itinéraire » ; aucun champ départ / arrivée ; aucun lien Moteurs ; onglets Trajet · Stations · Historique → capture `V1-retraits-02-apres.png` ✓ (11:15:10Z, md5 810da4f0)
- Step 3: la table public.moteurs lue par l'API Supabase (rôle service), rendue en page texte → prix:true, moyennes:true, itineraire:true, peages:false, voitures:true, lieux:true, vehicules:true → capture `V1-retraits-03-avant.png` ✓ (11:15:12Z, md5 64844df7)
- Step 4: je lis la ligne du service péages, et le nombre de lignes des clés → peages : en_service = false (fournisseur ptv gardé) ; cles_fournisseurs 2 lignes (2 avant) ; Vault 3 secrets (cle_ptv, cle_stadia, sync_prix_secret ; 3 avant) ; limite d'inscriptions anonymes 30 → capture `V1-retraits-04-apres.png` ✓ (11:15:12Z, md5 a394722e)

### Issues Found
- aucune sur la version déployée à cette passe.

## Régression (passage stations,historique,retraits)
- US-3.E3 (T6) : historique vide → « Aucun trajet enregistré. », totaux 0 trajets 0 km 0,00 € essence ✓

## Erreurs de page relevées
- aucune

---

# Lecture du journal (bâtisseur r1b)

Le journal est écrit au fil de l'eau, une section par histoire dès qu'elle finit, passage après passage. Les passages d'essai (10:41Z → 11:04Z) ont servi à mettre au point le script et ont révélé trois défauts, corrigés et déployés : (1) V-5.1-03 (passage 10:42Z) — pendant un trajet, Stations montrait encore les stations d'Albi et le point « vous êtes ici » au départ (position lue au lancement seulement) → cad14da ; (2) V-6.x — « 1 trajets » dans les totaux → 56a5618 ; (3) V-3.E1-06 (passage 10:48Z, ✗) — « Reprendre » affichait « GPS perdu (tunnel) » jusqu'à la position suivante → 79c706a. Les autres ✗ des essais sont des fautes du script (texte en capitales lu par innerText, attente manquante avant fermeture d'une page, horloge en pause qui retenait le focus) ; elles sont nommées dans leurs sections.

**Les captures livrées sont celles du passage « final2 »** (11:06Z → 11:15Z, deux processus : voiture,trajet,cas puis stations,historique,retraits, sur la prod 79c706a). État final ci-dessous.


# Captures — état final (140/140 produites, 139 ✓, 1 ✗)

| capture | constat | md5 livrée | md5 brute | prise à |
|---|---|---|---|---|
| `V-1.1-01-avant.png` | ✓ | eec1001e | eec1001e | /stations |
| `V-1.1-02-apres.png` | ✓ | 25c9bd31 | 25c9bd31 | / |
| `V-1.1-03-avant.png` | ✓ | c213538e | c213538e | / |
| `V-1.1-04-apres.png` | ✓ | c427090c | c427090c | /voiture |
| `V-1.1-05-avant.png` | ✓ | 593ca088 | 593ca088 | /historique |
| `V-1.1-06-apres.png` | ✓ | a3e693b8 | a3e693b8 | /en-route |
| `V-1.2-01-avant.png` | ✓ | 991f8a77 | 991f8a77 | /historique |
| `V-1.2-02-apres.png` | ✗ | 25c9bd31 | 25c9bd31 | / |
| `V-1.2-03-avant.png` | ✓ | 7ff02c6d | 7ff02c6d | / |
| `V-1.2-04-apres.png` | ✓ | 26d92281 | 26d92281 | /voiture |
| `V-1.2-05-avant.png` | ✓ | f95c356b | f95c356b | about:blank |
| `V-1.2-06-apres.png` | ✓ | 25c9bd31 | 25c9bd31 | / |
| `V-1.3-01-avant.png` | ✓ | 25c9bd31 | 25c9bd31 | / |
| `V-1.3-02-apres.png` | ✓ | 827bc8db | 827bc8db | /en-route |
| `V-1.3-03-avant.png` | ✓ | 1f66d5d0 | 1f66d5d0 | / |
| `V-1.3-04-apres.png` | ✓ | 4cfb9d3a | 4cfb9d3a | / |
| `V-2.1-01-avant.png` | ✓ | c45e4a62 | c45e4a62 | /voiture |
| `V-2.1-02-apres.png` | ✓ | 2e1012d9 | 2e1012d9 | /voiture |
| `V-2.1-03-avant.png` | ✓ | 8a87e25f | decb0f3f | /voiture |
| `V-2.1-04-apres.png` | ✓ | 8093a948 | 8093a948 | /voiture |
| `V-2.1-05-avant.png` | ✓ | 5776799f | 5776799f | /voiture |
| `V-2.1-06-apres.png` | ✓ | abdd8900 | abdd8900 | /voiture |
| `V-2.2-01-avant.png` | ✓ | c150a3a4 | c150a3a4 | /voiture |
| `V-2.2-02-apres.png` | ✓ | 25c9bd31 | 25c9bd31 | / |
| `V-2.2-03-avant.png` | ✓ | 7c9b9ad5 | 7c9b9ad5 | /voiture |
| `V-2.2-04-apres.png` | ✓ | ecc668f8 | ecc668f8 | /voiture |
| `V-2.3-01-avant.png` | ✓ | d2f35003 | d2f35003 | /voiture |
| `V-2.3-02-apres.png` | ✓ | 9bc5666c | 9bc5666c | /voiture |
| `V-2.3-03-avant.png` | ✓ | b78c73bc | b78c73bc | /voiture |
| `V-2.3-04-apres.png` | ✓ | fbf817c9 | fbf817c9 | /voiture |
| `V-2.E1-01-avant.png` | ✓ | f8b54811 | f8b54811 | /voiture |
| `V-2.E1-02-apres.png` | ✓ | e30ab651 | e30ab651 | /voiture |
| `V-2.E1-03-avant.png` | ✓ | d46b5b75 | d46b5b75 | /voiture |
| `V-2.E1-04-apres.png` | ✓ | ca070417 | ca070417 | /voiture |
| `V-3.1-01-avant.png` | ✓ | 4acd4d5c | 4acd4d5c | /en-route |
| `V-3.1-02-apres.png` | ✓ | 061d5f77 | 061d5f77 | /en-route |
| `V-3.1-03-avant.png` | ✓ | 5b505aa7 | 5b505aa7 | /en-route |
| `V-3.1-04-apres.png` | ✓ | 4e481429 | 4e481429 | /en-route |
| `V-3.1-05-avant.png` | ✓ | e8085490 | e8085490 | /en-route |
| `V-3.1-06-apres.png` | ✓ | ce6d5d9b | 57d23058 | /en-route |
| `V-3.4-01-avant.png` | ✓ | 82e28ddb | 82e28ddb | /en-route |
| `V-3.4-02-apres.png` | ✓ | 5d4b68a8 | 5d4b68a8 | /en-route |
| `V-3.4-03-avant.png` | ✓ | 03222350 | 03222350 | /en-route |
| `V-3.4-04-apres.png` | ✓ | c85523bf | c85523bf | /en-route |
| `V-3.5-01-avant.png` | ✓ | 6d67d1c3 | 6d67d1c3 | /en-route |
| `V-3.5-02-apres.png` | ✓ | 4d4b00ff | 4d4b00ff | /fin |
| `V-3.5-03-avant.png` | ✓ | 56e6458e | 56e6458e | /en-route |
| `V-3.5-04-apres.png` | ✓ | b9ab7181 | b9ab7181 | /en-route |
| `V-3.5-05-avant.png` | ✓ | 876d7f76 | 876d7f76 | /en-route |
| `V-3.5-06-apres.png` | ✓ | fea007d0 | fea007d0 | /fin |
| `V-3.E1-01-avant.png` | ✓ | 052b37c1 | 052b37c1 | /en-route |
| `V-3.E1-02-apres.png` | ✓ | c2d7a3e6 | c2d7a3e6 | /en-route |
| `V-3.E1-03-avant.png` | ✓ | 46009f51 | 46009f51 | /en-route |
| `V-3.E1-04-apres.png` | ✓ | c2efd918 | c2efd918 | /fin |
| `V-3.E1-05-avant.png` | ✓ | 258468ae | 258468ae | /en-route |
| `V-3.E1-06-apres.png` | ✓ | 3d4ef2ff | d6eb71b4 | /en-route |
| `V-3.E2-01-avant.png` | ✓ | 5d2ad664 | 5d2ad664 | /en-route |
| `V-3.E2-02-apres.png` | ✓ | 872702f5 | 872702f5 | /en-route |
| `V-3.E2-03-avant.png` | ✓ | 5dba9f3b | 5dba9f3b | /en-route |
| `V-3.E2-04-apres.png` | ✓ | a0c20a07 | a0c20a07 | /en-route |
| `V-4.1-01-avant.png` | ✓ | b6e4421b | b6e4421b | /en-route |
| `V-4.1-02-apres.png` | ✓ | 48086e4b | 48086e4b | /fin |
| `V-4.1-03-avant.png` | ✓ | cd1b3db6 | cd1b3db6 | /fin |
| `V-4.1-04-apres.png` | ✓ | 25f1bee9 | a99be208 | /fin |
| `V-4.1-05-avant.png` | ✓ | 79cfcfc3 | 79cfcfc3 | /en-route |
| `V-4.1-06-apres.png` | ✓ | 90b6fc03 | 90b6fc03 | /fin |
| `V-4.2-01-avant.png` | ✓ | 31a7e678 | fd2651a4 | /fin |
| `V-4.2-02-apres.png` | ✓ | 8f7eb93e | c11fa5f2 | /fin |
| `V-4.2-03-avant.png` | ✓ | 5e214e94 | 5e214e94 | /fin |
| `V-4.2-04-apres.png` | ✓ | 1fa87de4 | 8a485893 | /fin |
| `V-4.2-05-avant.png` | ✓ | 4fb9a1dc | 4fb9a1dc | /fin |
| `V-4.2-06-apres.png` | ✓ | c0f1d82c | c0f1d82c | /fin |
| `V-4.3-01-avant.png` | ✓ | 16956a37 | 16956a37 | /historique |
| `V-4.3-02-apres.png` | ✓ | f13f642c | f13f642c | /fin |
| `V-4.3-03-avant.png` | ✓ | 1555a05d | 1555a05d | /fin |
| `V-4.3-04-apres.png` | ✓ | 443dd1df | c6640162 | /fin |
| `V-4.4-01-avant.png` | ✓ | 9714abed | 695b4ad1 | /fin |
| `V-4.4-02-apres.png` | ✓ | a906fed8 | a906fed8 | /fin |
| `V-4.4-03-avant.png` | ✓ | 6464daf1 | 6464daf1 | /fin |
| `V-4.4-04-apres.png` | ✓ | 81d77fda | 81d77fda | /fin |
| `V-4.5-01-avant.png` | ✓ | d80dafb8 | d80dafb8 | /historique |
| `V-4.5-02-apres.png` | ✓ | e9ca0733 | e9ca0733 | /fin |
| `V-4.6-01-avant.png` | ✓ | e9ca0733 | e9ca0733 | /fin |
| `V-4.6-02-apres.png` | ✓ | 7f9a9030 | 7f9a9030 | /fin |
| `V-4.7-01-avant.png` | ✓ | 67431a43 | 67431a43 | /fin |
| `V-4.7-02-apres.png` | ✓ | 18a29c89 | 18a29c89 | /historique |
| `V-4.7-03-avant.png` | ✓ | 2f9cd5d4 | 2f9cd5d4 | /fin |
| `V-4.7-04-apres.png` | ✓ | 25c9bd31 | 25c9bd31 | / |
| `V-4.7-05-avant.png` | ✓ | 17f45138 | 17f45138 | /fin |
| `V-4.7-06-apres.png` | ✓ | 35b1d22d | 35b1d22d | /fin |
| `V-6.1-01-avant.png` | ✓ | 25c9bd31 | 25c9bd31 | / |
| `V-6.1-02-apres.png` | ✓ | df87aff2 | df87aff2 | /historique |
| `V-6.1-03-avant.png` | ✓ | 25c9bd31 | 25c9bd31 | / |
| `V-6.1-04-apres.png` | ✓ | 483b43ee | 483b43ee | /historique |
| `V-6.2-01-avant.png` | ✓ | 25c9bd31 | 25c9bd31 | / |
| `V-6.2-02-apres.png` | ✓ | 68948051 | 68948051 | /historique |
| `V-6.2-03-avant.png` | ✓ | dd20c3d7 | 2f5b4ecf | /fin |
| `V-6.2-04-apres.png` | ✓ | 772ac121 | 772ac121 | /historique |
| `V-6.3-01-avant.png` | ✓ | 29877573 | 29877573 | /historique |
| `V-6.3-02-apres.png` | ✓ | 99969107 | 99969107 | /historique |
| `V-6.3-03-avant.png` | ✓ | 4d878b50 | 4d878b50 | /historique |
| `V-6.3-04-apres.png` | ✓ | b0216a36 | 52a6f414 | /fin |
| `V-6.4-01-avant.png` | ✓ | fefefa35 | fefefa35 | /fin |
| `V-6.4-02-apres.png` | ✓ | 2ce6a1c7 | 2ce6a1c7 | /historique |
| `V-6.4-03-avant.png` | ✓ | 5a0fc8f3 | 5a0fc8f3 | /fin |
| `V-6.4-04-apres.png` | ✓ | c9ea1257 | c9ea1257 | /historique |
| `V-5.1-01-avant.png` | ✓ | 25c9bd31 | 25c9bd31 | / |
| `V-5.1-02-apres.png` | ✓ | 22c0d663 | 22c0d663 | /stations |
| `V-5.1-03-avant.png` | ✓ | 89677362 | 89677362 | /stations |
| `V-5.1-04-apres.png` | ✓ | e024ee0a | e813bfad | /en-route |
| `V-5.2-01-avant.png` | ✓ | 06202b79 | 06202b79 | /stations |
| `V-5.2-02-apres.png` | ✓ | 39c8bff7 | 39c8bff7 | /stations |
| `V-5.2-03-avant.png` | ✓ | 62d7bdaa | 62d7bdaa | /stations |
| `V-5.2-04-apres.png` | ✓ | b9e3ce50 | b9e3ce50 | /stations |
| `V-5.3-01-avant.png` | ✓ | 64522924 | 64522924 | /stations |
| `V-5.3-02-apres.png` | ✓ | ebf289b0 | ebf289b0 | /stations |
| `V-5.3-03-avant.png` | ✓ | 4c9ff5c9 | 4c9ff5c9 | /stations |
| `V-5.3-04-apres.png` | ✓ | 165952d6 | 165952d6 | /stations |
| `V-5.4-01-avant.png` | ✓ | 98062121 | 98062121 | /stations |
| `V-5.4-02-apres.png` | ✓ | 7ebd793e | 6e76b7bf | /stations |
| `V-5.5-01-avant.png` | ✓ | 34c09466 | 34c09466 | /stations |
| `V-5.5-02-apres.png` | ✓ | 3e50e670 | 3e50e670 | /en-route |
| `V-5.5-03-avant.png` | ✓ | 232a8071 | 957bd608 | /stations |
| `V-5.5-04-apres.png` | ✓ | 25c9bd31 | 25c9bd31 | / |
| `V-5.5-05-avant.png` | ✓ | 87194d42 | 87194d42 | /stations |
| `V-5.5-06-apres.png` | ✓ | bd13fcbc | a5daf41c | /stations |
| `V-5.6-01-avant.png` | ✓ | d2eedbde | 1a05b479 | /stations |
| `V-5.6-02-apres.png` | ✓ | 884ed01d | 884ed01d | /stations |
| `V-5.6-03-avant.png` | ✓ | 38fc764e | 38fc764e | /stations |
| `V-5.6-04-apres.png` | ✓ | fd2e2bb3 | fd2e2bb3 | /en-route |
| `V-5.7-01-avant.png` | ✓ | 25c9bd31 | 25c9bd31 | / |
| `V-5.7-02-apres.png` | ✓ | 0370fa25 | 0370fa25 | /stations |
| `V-5.7-03-avant.png` | ✓ | 1b3936f3 | 1b3936f3 | /stations |
| `V-5.7-04-apres.png` | ✓ | badccd97 | badccd97 | /stations |
| `V-5.7-05-avant.png` | ✓ | 47e613ec | 47e613ec | /stations |
| `V-5.7-06-apres.png` | ✓ | 3f200665 | 3f200665 | /stations |
| `V1-retraits-01-avant.png` | ✓ | 25c9bd31 | 25c9bd31 | / |
| `V1-retraits-02-apres.png` | ✓ | 810da4f0 | 810da4f0 | /stations |
| `V1-retraits-03-avant.png` | ✓ | 64844df7 | 64844df7 | about:blank |
| `V1-retraits-04-apres.png` | ✓ | a394722e | a394722e | about:blank |

La brute et la livrée sont deux prises de vue successives de la même page (aucune copie). Elles diffèrent d'octets pour 16 captures (animation en cours entre les deux prises), identiques pour les autres.


## Doublons d'octets entre captures livrées (déclarés)

- 13 captures identiques : `V-1.1-02-apres.png`, `V-1.2-02-apres.png`, `V-1.2-06-apres.png`, `V-1.3-01-avant.png`, `V-2.2-02-apres.png`, `V-4.7-04-apres.png`, `V-6.1-01-avant.png`, `V-6.1-03-avant.png`, `V-6.2-01-avant.png`, `V-5.1-01-avant.png`, `V-5.5-04-apres.png`, `V-5.7-01-avant.png`, `V1-retraits-01-avant.png`
- 2 captures identiques : `V-4.5-02-apres.png`, `V-4.6-01-avant.png`

Pourquoi : `V-1.1-02`, `V-1.2-02`, `V-1.2-06`, `V-1.3-01`, `V-2.2-02`, `V-4.7-04`, `V-6.1-01`, `V-6.1-03`, `V-6.2-01`, `V-5.1-01`, `V-5.5-04`, `V-5.7-01`, `V1-retraits-01` montrent toutes l'accueil T1 avec la même Clio enregistrée (l'accueil ne montre ni lieu ni heure : même rendu au pixel, dans des contextes et à des moments différents ; chaque étape a son propre constat dans sa section). `V-4.5-02` et `V-4.6-01` : la même fin de trajet rouverte, la courbe de vitesse étant déjà visible sans défilement.


## Simulations et états préparés (déclarés)

- Géolocalisation rejouée par `context.setGeolocation` : `albi-toulouse.gpx` (vrai itinéraire Valhalla, 4 350 points), ses dérivés `albi-toulouse-immobile-11min.gpx` et `albi-toulouse-tunnel-90s.gpx` (derive-gpx.mjs), et `barcelone.gpx` (vrai itinéraire Valhalla dans Barcelone, fabriqué par `creer-gpx.mjs barcelone`, 3,2 km). Horloge de la page accélérée par `page.clock` (méthode r1a) ; au rythme réel (1 point/s) pendant les passages par Stations.
- Trajets de septembre et d'octobre (V-6.1) : vrais trajets rejoués, horloge de la page posée au 14/09/2026 08:00 et au 05/10/2026 17:30.
- ÉTAT PRÉPARÉ : V-6.2 (4 trajets de 77, 152, 245, 243 km), V-6.3 / V-6.4 (Albi → Rodez à 3 personnes, Toulouse → Albi seul), V-4.3 / V-4.4 (trajet arrêté de 41,2 L à 2,161 €/L, « Mon prix ») : écrits en IndexedDB `plein-et-trajet` au format TrajetV1 de l'appli (prix = moyenne France SP95-E10 du jour lue par l'API ; courbes construites à partir des vitesses du GPX). La régression `m5-regression.spec.ts` (US-4.E2) part du même type d'état.
- MOCKED : V-2.E1-03/04 — `page.route('**/functions/v1/voiture-eea**')` répond 502 `base_injoignable` (la vraie base européenne ne tombe pas sur commande) ; route retirée, « Réessayer » ramène la vraie fiche.
- Réels : refus de localisation (contexte sans permission), coupure réseau (`context.setOffline`), base EEA (codes 5RBU0C en cache ; DAW400L0 jamais demandé avant le passage final2, 0 ligne en cache avant, écrites après), moyennes et stations du jour, géocodage inverse, Barcelone, Dartford, Bruxelles.


## Écart de libellé (non maquillé)
- V-1.2-02 ✗ : l'accueil montre « Renault Clio » et « 1.2 · 118 ch · 2017 · SP95-E10 » ; le plan attend « Renault Clio IV » et « 1.2 TCe 120 · 2017 · SP95-E10 ». La base EEA (champ Cn = CLIO) ne porte ni « IV » ni « TCe 120 ». V-2.1-02 : fiche « Renault Clio 1.2 · 118 ch » au lieu de « Clio 1.2 TCe 120 », chiffres identiques au plan (87 kW, 118 ch, 1 197 cm³, 1 165 kg, SP95-E10, 118 g/km). À trancher hors exploration (texte du plan, ou table de noms commerciaux).


## Régression — histoires maintenue_v1 rejouées sur les écrans V1 (12:00Z, prod 79c706a)
- `tests/e2e/m1-explore.spec.ts` (adapté à T5 `/stations`, version d'origine archivée) : 22/23 ✓ — US-1.4, US-1.6, US-2.1 (bouton et Échap), US-1.E1 (MOCKED, source injoignable → Réessayer), US-1.E2 (MOCKED), US-1.E3, US-2.E1, US-1.P1 (carte glissée → « Rechercher dans cette zone » → recentrer recharge), US-A11Y-001 (Tab jusqu'à l'onglet « Stations », fiche : titre → « Fermer la fiche » → « Utiliser … pour mon trajet »), US-A11Y-002/003/004, US-PERF-001 (liste Stations en 4G simulée < 2,5 s), Streamline P3-P7. ✗ US-1.E4 : « aucune rupture gazole réelle dans le rayon aujourd'hui » — échec connu (pas de rupture réelle).
- `tests/e2e/m5-regression.spec.ts` : 7/7 ✓ (deux fois de suite) — US-6.E1 (refus réel), US-6.E2 (0,5 km : trop court, IndexedDB vide), US-6.E3 (page rechargée à 2 km : /en-route, mêmes points, même distance), US-3.E3 (historique vide, totaux 0), US-4.E2 (« 7 », « 0,3 », « abc » refusés, message, prix et coût gardés), US-A11Y-001/003/004 sur T1, T2, T3, T4, T6 (contour visible à chaque Tab, boutons icônes libellés, Échap ferme le champ prix et rend le focus au compteur), US-PERF-001 (accueil affiché en 563 à 809 ms en 4G simulée).
- `npx playwright test` complet (config du dépôt, `testIgnore` sur archive/) : 29/30 ✓, seul échec US-1.E4 (connu). Les specs archivées (m1 d'origine, m2-m4) ne sont pas jouées.
- Extraits `m5-test-snippets/` rejoués sur la prod par `exploration/m5-snippets.config.ts` : 60/60 ✓ (après correction de 3 assertions des extraits eux-mêmes : « 89,03 € essence » lu sans l'espace du DOM, et un compte de vitesses distinctes remplacé par un compte de changements).

---

# Passage r2 voiture,trajet,cas — début 2026-10-21T13:20:24.504Z

Appli déployée https://plein-et-trajet.vercel.app, base Supabase réelle, Playwright (bibliothèque), Chromium headless 390 × 844, toucher, fr-FR, Europe/Paris.
Réel : base EEA (fonction voiture-eea), moyennes du jour (FR SP95-E10 2,156 €/L, Gazole 2,368 €/L), stations et prix du jour, géocodage inverse (fonction lieux), refus de localisation (contexte sans permission), coupure réseau (context.setOffline).
Rejoué : géolocalisation par context.setGeolocation depuis tests/e2e/fixtures/albi-toulouse.gpx (et ses dérivés immobile / tunnel, et barcelone.gpx : vrai itinéraire Valhalla fabriqué par creer-gpx.mjs barcelone), horloge de la page accélérée par page.clock (méthode r1a : avancer l'horloge, poser la position, attendre que T3 l'ait comptée), au rythme réel (1 point/s) pendant les passages par Stations.

## V-2.E1 — Code inconnu

### Happy Path
- Step 1: champ D.2, je commence « ZZ999 » → champ « ZZ999 » ; aucune fiche → capture `V-2.E1-01-avant.png` ✓ (13:20:41Z, md5 ada454ea)
- Step 2: je tape « ZZ9999 » (absent de la base EEA) → « Code introuvable. Vérifie la case D.2, ou cherche par nom ci-dessous. » (data-code code_inconnu) ; « Enregistrer ma voiture » désactivé → capture `V-2.E1-02-apres.png` ✓ (13:20:45Z, md5 92a032d1)
- Step 3: MOCKED (page.route : la base européenne ne tombe pas sur commande) — base injoignable, je commence « 5RBF0 » → champ « 5RBF0 » ; réponse de voiture-eea remplacée par un 502 base_injoignable côté navigateur → capture `V-2.E1-03-avant.png` ✓ (13:20:46Z, md5 a3564154)
- Step 4: MOCKED — je tape « 5RBF0A » → « La base européenne des voitures ne répond pas. Réessayer » ; champ toujours « 5RBF0A » ; « Enregistrer ma voiture » désactivé : true → capture `V-2.E1-04-apres.png` ✓ (13:20:47Z, md5 7fe600ec)

### Edge Case / constats
- Step 4 — route retirée puis « Réessayer » touché : la vraie base répond, fiche « Renault Clio 1.5 · 75 ch · Gazole » (après la capture).

### Issues Found
- aucune sur la version déployée à cette passe.

## V-2.3 — Chercher sans la carte grise

### Happy Path
- Step 1: je touche le champ « Nom, année, puissance » → champ recherche vide et sélectionné (focus #q) → capture `V-2.3-01-avant.png` ✓ (13:20:50Z, md5 9d82c3e0)
- Step 2: je tape « clio 2017 120 » → 6 suggestions, toutes Clio 2017 entre 115 et 125 ch, avec année, kW et carburant : Renault Clio 1.2 · 118 ch 2017 · 87 kW · 1 165 kg · SP95-E10 · D.2 5RBU0C | Renault Clio 1.2 · 118 ch 2017 · 87 kW · 1 165 kg · SP95-E10 · D.2 5RBU0D | Renault Clio 1.2 · 118 ch 2017 · 87 kW · 1 243 kg · SP95-E10 · D.2 7RBU0C | Renault Clio 1.2 · 118 ch 2017 · 87 kW · 1 270 kg · SP95-E10 · D.2 7RBU0D | Renault Clio 1.2 · 120 ch 2017 · 88 kW · 1 255 kg · SP95-E10 · D.2 2R401E | Renault Clio 1.2 · 120 ch 2017 · 88 kW · 1 165 kg · SP95-E10 · D.2 5R400E → capture `V-2.3-02-apres.png` ✓ (13:20:54Z, md5 9bc5666c)
- Step 3: la première suggestion (sélectionnée au clavier) → « Renault Clio 1.2 · 118 ch 2017 · 87 kW · 1 165 kg · SP95-E10 · D.2 5RBU0C » → capture `V-2.3-03-avant.png` ✓ (13:20:54Z, md5 b78c73bc)
- Step 4: je la touche → fiche « Renault Clio 1.2 · 118 ch » 2017 · 87 kW · 118 ch · 1 165 kg · SP95-E10 (data-cle RENAULT·R·5RBU·5RBU0C·2017) ; « Enregistrer ma voiture » actif → capture `V-2.3-04-apres.png` ✓ (13:20:55Z, md5 c12167ff)

### Issues Found
- aucune sur la version déployée à cette passe.

## V-2.1 — Saisir le code D.2

### Happy Path
- Step 1: écran Ma voiture, je touche le champ D.2 → champ D.2 vide et sélectionné (focus d2) ; « Enregistrer ma voiture » désactivé → capture `V-2.1-01-avant.png` ✓ (13:20:29Z, md5 d246204e)
- Step 2: je tape « 5RBU0C » (code déjà en cache versions_eea) → fiche « Renault Clio 1.2 · 118 ch » : année 2017 · 87 kW · 118 ch · 1 197 cm³ · 1 165 kg · SP95-E10 · 118 g/km (NEDC) · « Base européenne EEA » ; liste : Renault Clio 1.2 · 118 ch 2017 · 87 kW · 1 165 kg · SP95-E10 · 13 864 immatriculées Renault Clio 1.2 · 118 ch 2018 · 87 kW · 1 165 kg · SP95-E10 · 11 043 immatriculées → capture `V-2.1-02-apres.png` ✓ (13:20:32Z, md5 2e1012d9)
- Step 3: code partagé par plusieurs versions, jamais demandé à l'appli : je tape « M51AZ1 » sauf le dernier caractère → champ « M51AZ » ; M51AZ1 absent de versions_eea (0 ligne, lu par l'API avant la saisie) → capture `V-2.1-03-avant.png` ✓ (13:20:33Z, md5 0d1017ca)
- Step 4: je tape le dernier caractère (« M51AZ1 ») puis je choisis la 2e version → 31 versions, la plus immatriculée en tête (57083 ≥ 46719 ≥ 43290 ≥ 42898…) ; marques Hyundai, Kia ; années 2019, 2018, 2020, 2025, 2017, 2024 ; masses 1 055, 935, 1 047, 1 088, 1 008, 1 022, 1 138, 1 105, 1 032, 1 115, 1 125, 1 155 kg ; 1re : « Hyundai I20 I20 Active 1.2 · 84 ch 2019 · 62 kW · 1 055 kg · SP95-E10 · 57 083 immatriculées » ; 2e touchée → fiche « Hyundai I20 1.2 · 84 ch » → capture `V-2.1-04-apres.png` ✓ (13:20:38Z, md5 1febc229)
- Step 5: je commence à taper en minuscules avec espaces : « r 5rbu » → champ « R 5RBU » (saisie en minuscules mise en majuscules à la frappe) ; pas de recherche (5 caractères sans espaces) → capture `V-2.1-05-avant.png` ✓ (13:20:39Z, md5 a47841db)
- Step 6: je finis « r 5rbu 5rbu0c » → champ « R 5RBU 5RBU0C » ; requête envoyée « d2=R 5RBU 5RBU0C » ; fiche « Renault Clio 1.2 · 118 ch · 2017 » (data-cle RENAULT·R·5RBU·5RBU0C·2017) : reconnu comme 5RBU0C → capture `V-2.1-06-apres.png` ✓ (13:20:41Z, md5 abdd8900)

### Edge Case / constats
- Step 2 — écart de libellé face au plan : l'écran nomme « Renault Clio 1.2 · 118 ch » ; le plan dit « Renault Clio 1.2 TCe 120 ». La base EEA ne porte ni « TCe » ni « 120 » (Cn = CLIO) ; les chiffres sont ceux du plan.
- Step 2 — cache : 5RBU0C présent dans versions_eea AVANT la saisie (2 lignes, années 2017/2018) : c'est le chemin « version déjà en cache ».
- Step 4 — chemin « jamais demandée » : M51AZ1 absent du cache avant, 31 ligne(s) dans versions_eea après (écrites par la fonction).

### Issues Found
- aucune sur la version déployée à cette passe.

## V-1.2 — Voir ma voiture

### Happy Path
- Step 1: la Clio enregistrée (accueil, juste après « Enregistrer ma voiture ») → accueil « Renault Clio » « 1.2 · 118 ch · 2017 · SP95-E10 » ; onglet onglet-trajet ; localStorage pt-voiture-v1 = 5RBU0C → capture `V-1.2-01-avant.png` ✓ (13:20:57Z, md5 25c9bd31)
- Step 2: l'accueil s'affiche (page rechargée) → ÉCART DE LIBELLÉ : l'écran montre « Renault Clio » et « 1.2 · 118 ch · 2017 · SP95-E10 », le plan attend « Renault Clio IV » et « 1.2 TCe 120 · 2017 · SP95-E10 » ; la base EEA (Cn = CLIO) ne porte ni « IV » ni « TCe 120 » → capture `V-1.2-02-apres.png` ✗ (13:20:58Z, md5 25c9bd31)
- Step 3: l'accueil, « Changer » sélectionné au clavier → focus sur « Changer » → capture `V-1.2-03-avant.png` ✓ (13:20:58Z, md5 7ff02c6d)
- Step 4: je touche « Changer » → écran Ma voiture, D.2 « » et recherche « » vides ; aucune fiche (0) → capture `V-1.2-04-apres.png` ✓ (13:20:59Z, md5 a8228399)
- Step 5: l'appli telle que je la laisse, juste avant de fermer le navigateur (puis relance sur le même profil) → URL https://plein-et-trajet.vercel.app/ ; accueil « Renault Clio » ; localStorage pt-voiture-v1 = 5RBU0C → capture `V-1.2-05-avant.png` ✓ (13:21:01Z, md5 25c9bd31)
- Step 6: je rouvre l'appli → accueil : « Renault Clio » « 1.2 · 118 ch · 2017 · SP95-E10 », rien ressaisi → capture `V-1.2-06-apres.png` ✓ (13:21:03Z, md5 25c9bd31)

### Edge Case / constats
- Step 5 — navigateur fermé puis relancé sur le même profil : onglet about:blank avant d'ouvrir l'appli.

### Issues Found
- Step 2 (V-1.2-02-apres.png) : ÉCART DE LIBELLÉ : l'écran montre « Renault Clio » et « 1.2 · 118 ch · 2017 · SP95-E10 », le plan attend « Renault Clio IV » et « 1.2 TCe 120 · 2017 · SP95-E10 » ; la base EEA (Cn = CLIO) ne porte ni « IV » ni « TCe 120 »

## V-2.2 — Vérifier et enregistrer

### Happy Path
- Step 1: la fiche de ma version (5RBU0C, 2017) affichée → fiche « Renault Clio 1.2 · 118 ch · 2017 » ; bouton « Enregistrer ma voiture » actif → capture `V-2.2-01-avant.png` ✓ (13:20:56Z, md5 c150a3a4)
- Step 2: je touche « Enregistrer ma voiture » → accueil : « Renault Clio » « 1.2 · 118 ch · 2017 · SP95-E10 » ; localStorage pt-voiture-v1 = Renault Clio 5RBU0C 2017 → capture `V-2.2-02-apres.png` ✓ (13:20:57Z, md5 25c9bd31)
- Step 3: aucune version identifiée : D.2 vide, « zz » dans la recherche par nom → D.2 «  », recherche « zz » (moins de 3 caractères : pas de recherche) ; aucune fiche (0) → capture `V-2.2-03-avant.png` ✓ (13:20:49Z, md5 d9b29b3f)
- Step 4: je regarde « Enregistrer ma voiture » (D.2 incomplet « 5RB ») → aucune fiche ; « Enregistrer ma voiture » désactivé (disabled) → capture `V-2.2-04-apres.png` ✓ (13:20:49Z, md5 e0302c2c)

### Edge Case / constats
- Step 2 — après fermeture du navigateur et relance sur le même profil, l'accueil rappelle la même voiture (V-1.2-06).

### Issues Found
- aucune sur la version déployée à cette passe.

## V-5.3 — Rechercher dans cette zone

### Happy Path
- Step 1: la carte des stations (trajet en cours) → en-tête « Autour de moi » ; 8 stations ; centre 43.913, 2.142 zoom 10.0 → capture `V-5.3-01-avant.png` ✓ (13:21:26Z, md5 b5c0d236)
- Step 2: je fais glisser la carte vers Montauban (4 glissements au doigt-souris) → bouton « Rechercher dans cette zone » affiché ; liste inchangée (8 stations, mêmes id) ; en-tête « Autour de moi » ; centre 44.018, 1.415 → capture `V-5.3-02-apres.png` ✓ (13:21:33Z, md5 e6c6b90f)
- Step 3: le bouton « Rechercher dans cette zone » (carte recentrée sur Montauban d'un dernier glissement) → centre 44.017, 1.355 ; liste toujours celle d'avant (8 stations) → capture `V-5.3-03-avant.png` ✓ (13:21:36Z, md5 d4e30b12)
- Step 4: je touche « Rechercher dans cette zone » → bouton disparu ; en-tête « Autour de Montauban » ; 16 stations, toutes à moins de 11.6 km du centre affiché (44.017, 1.355), 16 pastilles ; 1re (Moins cher) « TotalEnergies Montauban 63,4 km · à l'instant · −16,6 c vs France 1,990 €/L » → capture `V-5.3-04-apres.png` ✓ (13:21:37Z, md5 f0519c05)

### Issues Found
- aucune sur la version déployée à cette passe.

## V-3.1 — Suivre en direct

### Happy Path
- Step 1: enregistrement en cours, 200 positions rejouées → 19 km/h · 0,8 km · 0,06 L · 0,14 € · 0:03 · 14 km/h moy. · 8,2 L/100 · 200 points → capture `V-3.1-01-avant.png` ✓ (13:21:12Z, md5 db993e33)
- Step 2: je roule : 200 positions de plus (1 par seconde d'horloge) → vitesse lue après chaque position : 49 changements sur 200 s (la vitesse est redessinée à chaque position, soit chaque seconde ; plus longue valeur identique : 57 s, arrêts du GPX compris) ; courbe « Vitesse des 3 dernières minutes » ; 19 km/h · 0,8 km · 0,06 L · 0,14 € · 0:03 · 14 km/h moy. · 8,2 L/100 · 200 points → 29 km/h · 1,8 km · 0,16 L · 0,33 € · 0:06 · 17 km/h moy. · 8,4 L/100 · 400 points → capture `V-3.1-02-apres.png` ✓ (13:21:18Z, md5 ef8bbe21)
- Step 3: aucun prix choisi (aucune station touchée) → « Prix : moyenne France du jour · 2,156 €/L » → capture `V-3.1-03-avant.png` ✓ (13:21:18Z, md5 0f2ad880)
- Step 4: le coût en direct s'affiche → 0,20 L × 2,156 €/L (moyenne France du jour SP95-E10 lue par l'API : 2,156) = 0,431 → affiché 0,43 € ; « Prix : moyenne France du jour · 2,156 €/L » → capture `V-3.1-04-apres.png` ✓ (13:21:20Z, md5 6428cf4c)
- Step 5: un prix pris sur une station (« Utiliser ce prix ») → « Prix : mon prix · 1,990 €/L » ; 0 km/h · 2,5 km · 0,21 L · 0,41 € · 0:08 · 18 km/h moy. · 8,3 L/100 · 505 points → capture `V-3.1-05-avant.png` ✓ (13:21:40Z, md5 5da877ad)
- Step 6: le coût en direct s'affiche (60 positions plus loin) → 0,21 L × 1,990 = 0,418 → affiché 0,41 € ; « Prix : mon prix · 1,990 €/L » → capture `V-3.1-06-apres.png` ✓ (13:21:43Z, md5 3be9d418)

### Issues Found
- aucune sur la version déployée à cette passe.

## V-3.4 — Mettre en pause

### Happy Path
- Step 1: un enregistrement en cours (A68) → 105 km/h · 30,3 km · 2,16 L · 4,30 € · 0:29 · 62 km/h moy. · 7,1 L/100 · 1747 points → capture `V-3.4-01-avant.png` ✓ (13:22:43Z, md5 46614fe7)
- Step 2: je touche « Pause » puis 20 positions arrivent → « En pause », bouton « Reprendre » ; km 30,3 et litres 2,16 inchangés malgré 0,58 km parcourus sur le GPX → capture `V-3.4-02-apres.png` ✓ (13:22:44Z, md5 053d0f26)
- Step 3: une pause pendant laquelle la voiture s'est déplacée → déplacement pendant la pause : 2,07 km (GPX, points 1750 → 1821) ; affiché toujours 30,3 km, 2,16 L → capture `V-3.4-03-avant.png` ✓ (13:22:47Z, md5 053d0f26)
- Step 4: je touche « Reprendre » puis 60 positions → « Enregistrement » ; km 30,3 → 32,1 (+1,8) = distance roulée depuis la reprise (1,72 km) ; les 2,07 km de la pause ne sont ni comptés ni chiffrés → capture `V-3.4-04-apres.png` ✓ (13:22:48Z, md5 a36c48d7)

### Issues Found
- aucune sur la version déployée à cette passe.

## V-4.5 — Courbe de vitesse

### Happy Path
- Step 1: un trajet enregistré, rouvert depuis l'historique (écran Fin de trajet, haut) → onglet onglet-historique ; « Albi → Toulouse » ; « 21 oct. 2026 · 1 h 11 · Renault Clio » ; enregistré : true → capture `V-4.5-01-avant.png` ✓ (13:24:12Z, md5 1cea1074)
- Step 2: la fin de trajet s'affiche (rouverte) — courbe de vitesse → « 63 km/h moy. · 7 accélérations » ; 600 points de courbe (≤ 600) pour 4350 s de trajet ; vitesse moyenne affichée 63 km/h ; km ÷ durée roulée (4278 s, pause exclue) = 63.0 km/h ; km ÷ durée totale = 61.9 km/h ; 7 accélérations → capture `V-4.5-02-apres.png` ✓ (13:24:13Z, md5 209e412c)

### Issues Found
- aucune sur la version déployée à cette passe.

## V-4.6 — Courbe de consommation

### Happy Path
- Step 1: un trajet enregistré (fin rouverte, haut de l'écran) → onglet onglet-historique ; « ← Historique » ; « Albi → Toulouse » → capture `V-4.6-01-avant.png` ✓ (13:24:13Z, md5 209e412c)
- Step 2: la courbe de consommation → « moy. 6,9 · pointe 18,5 L/100 » ; litres ÷ km × 100 = 5.176 ÷ 74.85 × 100 = 6.92 ; 600 points (moyenne simple des points de la courbe : 6.92, non pondérée par la distance) → capture `V-4.6-02-apres.png` ✓ (13:24:14Z, md5 b37cd639)

### Issues Found
- aucune sur la version déployée à cette passe.

## V-1.3 — Démarrer

### Happy Path
- Step 1: la Clio enregistrée, localisation autorisée, position = 1er point du GPX (Albi, place du Vigan) → accueil « Renault Clio » ; permission géolocalisation accordée au contexte → capture `V-1.3-01-avant.png` ✓ (13:21:08Z, md5 25c9bd31)
- Step 2: je touche « Démarrer » → écran En route, « Enregistrement » (pastille animée : clignote infinite) ; 1re position enregistrée en 195 ms (data-points 1) ; IndexedDB enregistrement : présent → capture `V-1.3-02-apres.png` ✓ (13:21:08Z, md5 827bc8db)
- Step 3: la localisation refusée (contexte sans permission geolocation) → accueil « Renault Clio » ; permission géolocalisation : denied → capture `V-1.3-03-avant.png` ✓ (13:24:15Z, md5 1f66d5d0)
- Step 4: je touche « Démarrer » → « L'enregistrement a besoin de ta localisation Cadenas de la barre d'adresse → Position → Autoriser » ; URL / ; IndexedDB : enregistrement absent, 0 trajet → capture `V-1.3-04-apres.png` ✓ (13:24:15Z, md5 4cfb9d3a)

### Issues Found
- aucune sur la version déployée à cette passe.

## V-3.5 — Arrêter

### Happy Path
- Step 1: un enregistrement de plus de 1 km (arrivée au Capitole, Toulouse) → 10 km/h · 74,9 km · 5,18 L · 10,30 € · 1:11 · 63 km/h moy. · 6,9 L/100 · 4275 points → capture `V-3.5-01-avant.png` ✓ (13:24:09Z, md5 65cc168e)
- Step 2: je touche « Arrêter » → « Albi → Toulouse » ; « 21 oct. 2026 · 1 h 11 · Renault Clio » ; 5,2 L (5.176), 74,9 km (74.85), 6,9 L/100 km moy. → capture `V-3.5-02-apres.png` ✓ (13:24:11Z, md5 89de553f)
- Step 3: un enregistrement de moins de 1 km (150 positions) → 19 km/h · 0,5 km · 0,04 L · 0,09 € · 0:02 · 12 km/h moy. · 8,4 L/100 · 150 points → capture `V-3.5-03-avant.png` ✓ (13:24:19Z, md5 acc4b8c9)
- Step 4: je touche « Arrêter » → « Trajet trop court : 0,5 km sur 1 minimum. Rien n'est ajouté à l'historique. Retour à l'accueil » ; IndexedDB : 0 trajet, pas de trajet arrêté, pas d'enregistrement → capture `V-3.5-04-apres.png` ✓ (13:24:20Z, md5 b9ab7181)
- Step 5: aucun réseau (context.setOffline(true)) juste avant l'arrêt — 420 positions → navigator.onLine = false ; « Hors ligne : le trajet continue, tout est calculé sur le téléphone. » ; 28 km/h · 2,0 km · 0,17 L · 0,36 € · 0:06 · 17 km/h moy. · 8,4 L/100 · 420 points ; « Prix : moyenne France du jour · 2,156 €/L » → capture `V-3.5-05-avant.png` ✓ (13:24:28Z, md5 427a50d2)
- Step 6: la fin de trajet s'ouvre sans réseau → hors ligne (capture prise pendant la coupure) : titre « 43,928 · 2,146 → 43,917 · 2,144 » (coordonnées, noms pas encore connus) ; « Hors ligne : litres et coût calculés sur le téléphone ; les noms des lieux viendront au retour du réseau. » ; 0,168 L × 2,156 €/L (moyenne gardée au départ) = 0,36 € calculés sur le téléphone → capture `V-3.5-06-apres.png` ✓ (13:24:29Z, md5 39bf149e)

### Edge Case / constats
- Step 6 — après la capture, retour du réseau (setOffline(false) → événement online) : le titre passe de « 43,928 · 2,146 → 43,917 · 2,144 » à « Albi → Albi » sans rien toucher ✓ ; « Hors ligne » affiché : 0 ; requêtes tentées pendant la coupure : 4 (refusées par le navigateur hors ligne).

### Issues Found
- aucune sur la version déployée à cette passe.

## V-3.E1 — Oubli d'arrêter

### Happy Path
- Step 1: un enregistrement en cours (700 positions, 4 km dans Albi) → 30 km/h · 2,8 km · 0,23 L · 0,51 € · 0:11 · 14 km/h moy. · 8,5 L/100 · 700 points → capture `V-3.E1-01-avant.png` ✓ (13:24:44Z, md5 5651af7a)
- Step 2: vitesse < 3 km/h et position dans 50 m pendant 10 min (points 774 → 1375 du tracé dérivé) → « Trajet arrêté : immobile depuis 10 min. Reprendre C'est fini » au point 1375 (601 s après le début de l'immobilité) ; début daté 13:37:26 (point 774 reçu à 13:37:25, écart 1 s) ; 5 positions de plus : km 4,0 et litres 0,33 figés ; état « Immobile depuis 10 min » → capture `V-3.E1-02-apres.png` ✓ (13:24:57Z, md5 c159a359)
- Step 3: cette alerte (« C'est fini » sélectionné) → focus « C'est fini » → capture `V-3.E1-03-avant.png` ✓ (13:24:58Z, md5 46009f51)
- Step 4: je touche « C'est fini » → « Albi → Le Sequestre » « 21 oct. 2026 · 12 min · Renault Clio » ; arrivée datée 13:37:26 = début de l'immobilité (point 774, écart 1.0 s) ; durée 774 s : les 10 min d'arrêt ne comptent pas ; 4,02 km → capture `V-3.E1-04-apres.png` ✓ (13:24:59Z, md5 8fe1f764)
- Step 5: cette alerte (2e trajet rejoué ; « Reprendre » sélectionné) → « Trajet arrêté : immobile depuis 10 min. Reprendre C'est fini » ; 775 points gardés → capture `V-3.E1-05-avant.png` ✓ (13:25:39Z, md5 6bf8ebdb)
- Step 6: je touche « Reprendre » → « Enregistrement » ; 775 points gardés (autant qu'à l'alerte), 4,0 km conservés → capture `V-3.E1-06-apres.png` ✓ (13:25:40Z, md5 b19b43d9)

### Edge Case / constats
- Step 6 — après « Reprendre », 10 positions de plus : 775 → 785 points (l'enregistrement repart).

### Issues Found
- aucune sur la version déployée à cette passe.

## V-3.E2 — GPS perdu

### Happy Path
- Step 1: un enregistrement en cours (A68, 121 positions, dernière avant le tunnel) → 105 km/h · 3,5 km · 0,23 L · 0,50 € · 0:02 · 105 km/h moy. · 6,7 L/100 · 121 points → capture `V-3.E2-01-avant.png` ✓ (13:25:45Z, md5 9f86ab0d)
- Step 2: aucune position pendant 16 s → « GPS perdu (tunnel) · la distance est complétée à la sortie. » ; data-etat gps-perdu ; vitesse 0 km/h → capture `V-3.E2-02-apres.png` ✓ (13:25:46Z, md5 cacdb9a9)
- Step 3: le signal revient après 90 s sans position (tunnel de 3,00 km) → toujours « GPS perdu (tunnel) · la distance est complétée à la sortie. » ; 3,5 km figés → capture `V-3.E2-03-avant.png` ✓ (13:25:47Z, md5 bc4b52d7)
- Step 4: la position suivante arrive → km 3,5 → 6,5 (+3,0 km ; ligne droite entre les 2 positions 3.001 km, chemin réel 3,0007 km, à 120 km/h de moyenne) ; message disparu → capture `V-3.E2-04-apres.png` ✓ (13:25:47Z, md5 1ff05ec9)

### Issues Found
- aucune sur la version déployée à cette passe.

## V-4.2 — Mettre mon prix

### Happy Path
- Step 1: la fin de trajet (SP95-E10, moyenne du jour) → « Moyenne France du jour » 2.156 €/L ; coût 1,18 € → capture `V-4.2-01-avant.png` ✓ (13:25:52Z, md5 85af92d1)
- Step 2: je touche le compteur, tape 1,989 et valide (Entrée) → « Mon prix » 1,989 €/L ; coût 0,546 × 1,989 = 1,09 € ; « Revenir à la moyenne » affiché → capture `V-4.2-02-apres.png` ✓ (13:25:52Z, md5 20ea364e)
- Step 3: mon prix saisi (« Revenir à la moyenne » sélectionné) → focus « Revenir à la moyenne » → capture `V-4.2-03-avant.png` ✓ (13:25:53Z, md5 2cdc99ff)
- Step 4: je touche « Revenir à la moyenne » → « Moyenne France du jour » 2,156 €/L ; coût 1,18 € (comme avant la saisie) → capture `V-4.2-04-apres.png` ✓ (13:25:53Z, md5 a75e67ce)
- Step 5: le champ du prix ouvert (« 1,5 » tapé, pas validé) → champ « 1,5 » ouvert → capture `V-4.2-05-avant.png` ✓ (13:25:54Z, md5 50035245)
- Step 6: j'appuie sur Échap → champ fermé ; prix toujours 2,156 €/L « Moyenne France du jour » ; focus revenu sur « Modifier le prix, 2,156 euros par litre » → capture `V-4.2-06-apres.png` ✓ (13:25:54Z, md5 d2a824ad)

### Issues Found
- aucune sur la version déployée à cette passe.

## V-4.1 — Prix de l'essence

### Happy Path
- Step 1: la fin d'un trajet en Clio SP95-E10 parti de France (juste avant « Arrêter ») → « Prix : moyenne France du jour · 2,156 €/L » ; 105 km/h · 8,2 km · 0,55 L · 1,18 € · 0:04 · 110 km/h moy. · 6,6 L/100 · 182 points → capture `V-4.1-01-avant.png` ✓ (13:25:49Z, md5 e88eea20)
- Step 2: l'écran Fin de trajet s'ouvre → sélecteur Gazole · SP95-E10 · SP95 · SP98 · E85 · GPLc, SP95-E10 choisi ; « Moyenne France du jour » ; compteur « Modifier le prix, 2,156 euros par litre » (3 décimales) = moyenne France SP95-E10 lue par l'API 2,156 ; coût 1,18 € essence → capture `V-4.1-02-apres.png` ✓ (13:25:50Z, md5 d11b92a5)
- Step 3: ce sélecteur (Gazole sélectionné au clavier) → focus « Gazole » → capture `V-4.1-03-avant.png` ✓ (13:25:51Z, md5 b0339c90)
- Step 4: je touche Gazole → « Moyenne France du jour » 2,368 €/L (moyenne France Gazole de l'API 2,368) ; coût 0,546 × 2,368 = 1,29 € → capture `V-4.1-04-apres.png` ✓ (13:25:51Z, md5 42827672)
- Step 5: un départ hors de France : vrai itinéraire dans Barcelone (plaça de Catalunya → Sagrada Família, 3,2 km rejoués) → « Prix : moyenne Espagne du jour · 1,790 €/L » ; 18 km/h · 3,2 km · 0,26 L · 0,46 € · 0:11 · 17 km/h moy. · 8,0 L/100 · 674 points → capture `V-4.1-05-avant.png` ✓ (13:26:19Z, md5 3c1802a8)
- Step 6: l'écran Fin de trajet s'ouvre → « Barcelone → Barcelone » ; « Moyenne Espagne du jour » 1,790 €/L (moyenne Espagne SP95-E10 de l'API : 1,790) ; pays de départ enregistré ES → capture `V-4.1-06-apres.png` ✓ (13:26:27Z, md5 d12f1f14)

### Issues Found
- aucune sur la version déployée à cette passe.

## V-1.1 — Ouvrir l'appli

### Happy Path
- Step 1: une voiture enregistrée sur ce téléphone (écran Trajet) → onglet onglet-trajet ; carte « Renault Clio · 1.2 · 118 ch · 2017 · SP95-E10 » ; voiture 5RBU0C → capture `V-1.1-01-avant.png` ✓ (13:20:59Z, md5 25c9bd31)
- Step 2: j'ouvre l'appli (nouvel onglet sur l'adresse de l'appli) → onglet Trajet sélectionné ; T1 « Renault Clio 1.2 · 118 ch · 2017 · SP95-E10 Changer Démarrer » ; ni prix ni nombre de personnes → capture `V-1.1-02-apres.png` ✓ (13:21:00Z, md5 25c9bd31)
- Step 3: premier lancement (profil neuf, aucune voiture), j'ouvre l'appli → T1 « Enregistre d'abord ta voiture Le code D.2 de ta carte grise, une seule fois. Démarrer » ; onglet sélectionné : Trajet ; localStorage pt-voiture-v1 absent → capture `V-1.1-03-avant.png` ✓ (13:20:27Z, md5 c213538e)
- Step 4: je touche « Démarrer » sans voiture → URL /voiture, écran Ma voiture (« Ma voiture ») ; aucun enregistrement en IndexedDB → capture `V-1.1-04-apres.png` ✓ (13:20:28Z, md5 c56659ae)
- Step 5: un trajet en cours d'enregistrement ; je suis sur l'onglet Stations (bandeau « Trajet en cours ») → onglet onglet-stations ; bandeau « Trajet en cours ● Trajet en cours · 0,45 € » ; IndexedDB enregistrement : 484 points → capture `V-1.1-05-avant.png` ✓ (13:21:23Z, md5 1588b4ba)
- Step 6: je touche l'onglet Trajet → URL /en-route, écran En route « Enregistrement » (pas l'accueil) → capture `V-1.1-06-apres.png` ✓ (13:21:23Z, md5 1ee62078)

### Issues Found
- aucune sur la version déployée à cette passe.

## V-5.6 — Trajet en cours

### Happy Path
- Step 1: un trajet en cours ; je touche l'onglet Stations (positions envoyées au rythme réel, 1 par seconde) → écran Stations ouvert ; bandeau « Trajet en cours ● Trajet en cours · 0,93 € » → capture `V-5.6-01-avant.png` ✓ (13:21:54Z, md5 3099c76f)
- Step 2: l'onglet Stations est ouvert → Trajet en cours ● Trajet en cours · 1,01 € → capture `V-5.6-02-apres.png` ✗ (13:21:59Z, md5 443b9ffa)
- Step 3: ce bandeau, 6 s plus tard (la voiture roule) → « Trajet en cours ● Trajet en cours · 1,05 € » (« Trajet en cours ● Trajet en cours · 1,01 € » 6 s plus tôt : le coût du bandeau suit le trajet) ; positions rejouées jusqu'au point 913 → capture `V-5.6-03-avant.png` ✓ (13:22:05Z, md5 c51fea58)
- Step 4: je touche l'onglet Trajet → écran En route revenu ; 911 points (911 au moment du toucher) ; 82 km/h · 6,8 km · 0,53 L · 1,05 € · 0:15 · 27 km/h moy. · 7,7 L/100 · 911 points → capture `V-5.6-04-apres.png` ✓ (13:22:06Z, md5 f5eaca4c)

### Edge Case / constats
- Step 2 — sans trajet en cours (même téléphone, avant Démarrer) : bandeau « retour-trajet » présent 0 fois (attendu 0).

### Issues Found
- Step 2 (V-5.6-02-apres.png) : Trajet en cours ● Trajet en cours · 1,01 €

## V-5.5 — Utiliser ce prix

### Happy Path
- Step 1: trajet en cours ; la fiche de la 1re station « Moins cher » de Montauban → fiche « TotalEnergies Montauban » ; bouton « Utiliser 1,990 €/L pour mon trajet » ; prix SP95-E10 en base pour 82000018 : 1,990 €/L. (Le plan cite 2,103 €/L à titre d'exemple : le prix réel du jour est celui lu ici.) → capture `V-5.5-01-avant.png` ✓ (13:21:38Z, md5 b3ba5b7f)
- Step 2: je touche « Utiliser 1,990 €/L pour mon trajet » → fiche fermée, écran En route ; « Prix : mon prix · 1,990 €/L » ; 0,21 L × 1,990 = 0,418 → 0,41 € (la fin de trajet est relue plus bas) → capture `V-5.5-02-apres.png` ✓ (13:21:39Z, md5 6b71e297)

### Edge Case / constats
- Step 2 — la fin de ce même trajet, au prix de la station, est la capture V-4.7-01-avant.png (libellé « Mon prix », 3 personnes) ; fin de trajet : libellé « Mon prix », prix data-prix 1.99 (station : 1,990), coût 10,30 € essence.

### Issues Found
- aucune sur la version déployée à cette passe.

## V-5.1 — Stations autour de moi

### Happy Path
- Step 3: un trajet en cours (A68, 1 450 positions) ; j'ouvre l'onglet Stations → écran Stations autour de la voiture (43.8843, 1.9259, 21,6 km après Albi) : 5 stations toutes à moins de 10 km d'elle ; 1re « TotalEnergies Marssac-sur-Tarn 9,1 km · il y a 2 h · −16,6 c vs France 1,990 €/L » ; bandeau « Trajet en cours ● Trajet en cours · 3,10 € » ; sur En route juste avant : 105 km/h · 21,6 km · 1,50 L · 2,99 € · 0:24 · 54 km/h moy. · 7,0 L/100 · 1448 points → capture `V-5.1-03-avant.png` ✓ (13:22:23Z, md5 7d06e3ac)
- Step 4: je reviens au trajet (onglet Trajet) après 12 s dans Stations → distance 21,6 → 22,0 km, points 1448 → 1461 : l'enregistrement a continué pendant Stations → capture `V-5.1-04-apres.png` ✓ (13:22:36Z, md5 d52dc063)

### Issues Found
- aucune sur la version déployée à cette passe.

## V-4.7 — Enregistrer ou supprimer

### Happy Path
- Step 1: un trajet qui vient d'être arrêté (3 personnes choisies) → prix « Mon prix » 1,990 €/L ; coût 10,30 € ; « 3,43 € chacun » ; boutons « Supprimer Enregistrer » → capture `V-4.7-01-avant.png` ✓ (13:24:11Z, md5 ee71d0a9)
- Step 2: je touche « Enregistrer » → onglet Historique, en tête : « Albi → Toulouse 21 oct. · 74,9 km · SP95-E10 à 1,990 €/L · 3,43 € chacun 10,30 € » ; IndexedDB : prix 1.99 (station), carburant SP95-E10, 3 personnes, enregistré ; totaux « 1 trajet 75 km 10,30 € essence » → capture `V-4.7-02-apres.png` ✓ (13:24:12Z, md5 00949bcc)
- Step 3: un trajet qui vient d'être arrêté (celui de la coupure réseau, noms complétés) → « Albi → Albi » ; boutons « Supprimer Enregistrer » → capture `V-4.7-03-avant.png` ✓ (13:24:30Z, md5 06106090)
- Step 4: je touche « Supprimer » → accueil (URL /) ; IndexedDB : 0 trajet, aucun trajet arrêté ni point gardé ; Historique : « Aucun trajet enregistré. » → capture `V-4.7-04-apres.png` ✓ (13:24:31Z, md5 25c9bd31)
- Step 5: un trajet arrêté (Barcelone), pas encore tranché ; je ferme l'appli → trajet 7634a823-97df-408b-b94a-162a2138643c ; boutons « Supprimer Enregistrer » → capture `V-4.7-05-avant.png` ✓ (13:26:27Z, md5 0021b63d)
- Step 6: je rouvre l'appli (navigateur relancé, même profil) → URL /fin ; même trajet 7634a823-97df-408b-b94a-162a2138643c « Barcelone → Barcelone » ; « Supprimer Enregistrer » → capture `V-4.7-06-apres.png` ✓ (13:26:29Z, md5 1c94441f)

### Edge Case / constats
- Démonstration : coût 10,30 € au prix de la station 1,990 €/L, partagé à 3.

### Issues Found
- aucune sur la version déployée à cette passe.

## Régression (passage voiture,trajet,cas)
- US-4.E2 (T4) : « 7 » validé → « Entre un prix entre 0,50 et 4,00 €/L », prix gardé 2.156 ✓

## Erreurs de page relevées
- aucune

---

# Passage r2 trajet,stations — début 2026-10-21T13:28:52.708Z

Appli déployée https://plein-et-trajet.vercel.app, base Supabase réelle, Playwright (bibliothèque), Chromium headless 390 × 844, toucher, fr-FR, Europe/Paris.
Réel : base EEA (fonction voiture-eea), moyennes du jour (FR SP95-E10 2,156 €/L, Gazole 2,368 €/L), stations et prix du jour, géocodage inverse (fonction lieux), refus de localisation (contexte sans permission), coupure réseau (context.setOffline).
Rejoué : géolocalisation par context.setGeolocation depuis tests/e2e/fixtures/albi-toulouse.gpx (et ses dérivés immobile / tunnel, et barcelone.gpx : vrai itinéraire Valhalla fabriqué par creer-gpx.mjs barcelone), horloge de la page accélérée par page.clock (méthode r1a : avancer l'horloge, poser la position, attendre que T3 l'ait comptée), au rythme réel (1 point/s) pendant les passages par Stations.

## V-5.3 — Rechercher dans cette zone

### Happy Path
- Step 1: la carte des stations (trajet en cours) → en-tête « Autour de moi » ; 8 stations ; centre 43.913, 2.142 zoom 10.0 → capture `V-5.3-01-avant.png` ✓ (13:29:44Z, md5 b5c0d236)
- Step 2: je fais glisser la carte vers Montauban (4 glissements au doigt-souris) → bouton « Rechercher dans cette zone » affiché ; liste inchangée (8 stations, mêmes id) ; en-tête « Autour de moi » ; centre 44.018, 1.415 → capture `V-5.3-02-apres.png` ✓ (13:29:55Z, md5 42ef528d)
- Step 3: le bouton « Rechercher dans cette zone » (carte recentrée sur Montauban d'un dernier glissement) → centre 44.017, 1.355 ; liste toujours celle d'avant (8 stations) → capture `V-5.3-03-avant.png` ✓ (13:29:59Z, md5 f5537e45)
- Step 4: je touche « Rechercher dans cette zone » → bouton disparu ; en-tête « Autour de Montauban » ; 16 stations, toutes à moins de 11.6 km du centre affiché (44.017, 1.355), 16 pastilles ; 1re (Moins cher) « TotalEnergies Montauban 63,4 km · à l'instant · −16,6 c vs France 1,990 €/L » → capture `V-5.3-04-apres.png` ✓ (13:30:01Z, md5 f0519c05)

### Issues Found
- aucune sur la version déployée à cette passe.

## V-3.1 — Suivre en direct

### Happy Path
- Step 1: enregistrement en cours, 200 positions rejouées → 19 km/h · 0,8 km · 0,06 L · 0,14 € · 0:03 · 14 km/h moy. · 8,2 L/100 · 200 points → capture `V-3.1-01-avant.png` ✓ (13:29:15Z, md5 9981b4f3)
- Step 2: je roule : 200 positions de plus (1 par seconde d'horloge) → vitesse lue après chaque position : 49 changements sur 200 s (la vitesse est redessinée à chaque position, soit chaque seconde ; plus longue valeur identique : 57 s, arrêts du GPX compris) ; courbe « Vitesse des 3 dernières minutes » ; 19 km/h · 0,8 km · 0,06 L · 0,14 € · 0:03 · 14 km/h moy. · 8,2 L/100 · 200 points → 29 km/h · 1,8 km · 0,16 L · 0,33 € · 0:06 · 17 km/h moy. · 8,4 L/100 · 400 points → capture `V-3.1-02-apres.png` ✓ (13:29:30Z, md5 ef8bbe21)
- Step 3: aucun prix choisi (aucune station touchée) → « Prix : moyenne France du jour · 2,156 €/L » → capture `V-3.1-03-avant.png` ✓ (13:29:31Z, md5 0f2ad880)
- Step 4: le coût en direct s'affiche → 0,20 L × 2,156 €/L (moyenne France du jour SP95-E10 lue par l'API : 2,156) = 0,431 → affiché 0,43 € ; « Prix : moyenne France du jour · 2,156 €/L » → capture `V-3.1-04-apres.png` ✓ (13:29:35Z, md5 6428cf4c)
- Step 5: un prix pris sur une station (« Utiliser ce prix ») → « Prix : mon prix · 1,990 €/L » ; 0 km/h · 2,5 km · 0,21 L · 0,41 € · 0:08 · 17 km/h moy. · 8,3 L/100 · 515 points → capture `V-3.1-05-avant.png` ✓ (13:30:06Z, md5 7cea8c47)
- Step 6: le coût en direct s'affiche (60 positions plus loin) → 0,21 L × 1,990 = 0,418 → affiché 0,41 € ; « Prix : mon prix · 1,990 €/L » → capture `V-3.1-06-apres.png` ✓ (13:30:11Z, md5 9cb33aec)

### Issues Found
- aucune sur la version déployée à cette passe.

## V-3.4 — Mettre en pause

### Happy Path
- Step 1: un enregistrement en cours (A68) → 105 km/h · 30,3 km · 2,18 L · 4,33 € · 0:29 · 62 km/h moy. · 7,2 L/100 · 1747 points → capture `V-3.4-01-avant.png` ✓ (13:32:07Z, md5 8de26cc1)
- Step 2: je touche « Pause » puis 20 positions arrivent → « En pause », bouton « Reprendre » ; km 30,3 et litres 2,18 inchangés malgré 0,58 km parcourus sur le GPX → capture `V-3.4-02-apres.png` ✓ (13:32:11Z, md5 6d51b9c1)
- Step 3: une pause pendant laquelle la voiture s'est déplacée → déplacement pendant la pause : 2,07 km (GPX, points 1750 → 1821) ; affiché toujours 30,3 km, 2,18 L → capture `V-3.4-03-avant.png` ✓ (13:32:18Z, md5 6d51b9c1)
- Step 4: je touche « Reprendre » puis 60 positions → « Enregistrement » ; km 30,3 → 32,1 (+1,8) = distance roulée depuis la reprise (1,72 km) ; les 2,07 km de la pause ne sont ni comptés ni chiffrés → capture `V-3.4-04-apres.png` ✓ (13:32:24Z, md5 d7d6bcb2)

### Issues Found
- aucune sur la version déployée à cette passe.

## V-4.5 — Courbe de vitesse

### Happy Path
- Step 1: un trajet enregistré, rouvert depuis l'historique (écran Fin de trajet, haut) → onglet onglet-historique ; « Albi → Toulouse » ; « 21 oct. 2026 · 1 h 11 · Renault Clio » ; enregistré : true → capture `V-4.5-01-avant.png` ✓ (13:35:26Z, md5 de3a5886)
- Step 2: la fin de trajet s'affiche (rouverte) — courbe de vitesse → « 63 km/h moy. · 7 accélérations » ; 600 points de courbe (≤ 600) pour 4351 s de trajet ; vitesse moyenne affichée 63 km/h ; km ÷ durée roulée (4279 s, pause exclue) = 63.0 km/h ; km ÷ durée totale = 61.9 km/h ; 7 accélérations → capture `V-4.5-02-apres.png` ✓ (13:35:27Z, md5 de3a5886)

### Issues Found
- aucune sur la version déployée à cette passe.

## V-4.6 — Courbe de consommation

### Happy Path
- Step 1: un trajet enregistré (fin rouverte, haut de l'écran) → onglet onglet-historique ; « ← Historique » ; « Albi → Toulouse » → capture `V-4.6-01-avant.png` ✓ (13:35:27Z, md5 de3a5886)
- Step 2: la courbe de consommation → « moy. 6,9 · pointe 21,5 L/100 » ; litres ÷ km × 100 = 5.195 ÷ 74.85 × 100 = 6.94 ; 600 points (moyenne simple des points de la courbe : 6.94, non pondérée par la distance) → capture `V-4.6-02-apres.png` ✓ (13:35:28Z, md5 3ac224aa)

### Issues Found
- aucune sur la version déployée à cette passe.

## V-5.1 — Stations autour de moi

### Happy Path
- Step 1: la position autorisée (Albi) : accueil, en-tête « Autour de moi » → en-tête « Autour de moi » (position GPS reçue) ; position du contexte 43.92833, 2.145916 ; permission granted → capture `V-5.1-01-avant.png` ✓ (13:35:31Z, md5 25c9bd31)
- Step 2: je touche l'onglet Stations → en-tête « Autour de moi » ; ma position dans le cadre de la carte ; 8 stations à moins de 10 km, 8 pastilles ; 8 prix SP95-E10 identiques à la base (table prix) ; 1re « TotalEnergies Albi · Relais des Fontanelles 2,2 km · hier · −16,6 c vs France 1,990 €/L » → capture `V-5.1-02-apres.png` ✓ (13:35:34Z, md5 de70b6bd)
- Step 3: un trajet en cours (A68, 1 450 positions) ; j'ouvre l'onglet Stations → écran Stations autour de la voiture (43.8843, 1.9259, 21,6 km après Albi) : 5 stations toutes à moins de 10 km d'elle ; 1re « TotalEnergies Marssac-sur-Tarn 9,2 km · il y a 4 h · −16,6 c vs France 1,990 €/L » ; bandeau « ● Trajet en cours · 3,14 € » ; sur En route juste avant : 105 km/h · 21,6 km · 1,50 L · 2,99 € · 0:24 · 54 km/h moy. · 7,0 L/100 · 1448 points → capture `V-5.1-03-avant.png` ✓ (13:31:30Z, md5 f3c99450)
- Step 4: je reviens au trajet (onglet Trajet) après 12 s dans Stations → distance 21,6 → 22,0 km, points 1448 → 1462 : l'enregistrement a continué pendant Stations → capture `V-5.1-04-apres.png` ✓ (13:31:43Z, md5 18d37418)

### Issues Found
- aucune sur la version déployée à cette passe.

## V-5.2 — Choisir le carburant

### Happy Path
- Step 1: une Clio SP95-E10 enregistrée (accueil) ; dernier carburant regardé dans Stations : Gazole → accueil « Renault Clio · 1.2 · 118 ch · 2017 · SP95-E10 » ; localStorage pt-carburant = « Gazole » ; position Prayssac 44.5041, 1.1885 → capture `V-5.2-01-avant.png` ✓ (13:35:35Z, md5 25c9bd31)
- Step 2: j'ouvre l'onglet Stations → SP95-E10 choisi d'office (aria-pressed), malgré le dernier choix Gazole ; titre « Stations · SP95-E10 » → capture `V-5.2-02-apres.png` ✓ (13:35:39Z, md5 b137e90c)
- Step 3: la liste en SP95-E10 autour de Prayssac → 5 stations SP95-E10 : 46220005 TotalEnergies Prayssac 510 m | 46700001 Intermarché Puy-l'Évêque 3,6 km | 46220003 Intermarché Prayssac 310 m | 46220002 Carrefour Market Prayssac 1,1 km | 46140003 Système U Parnac 9,7 km ; 46220005 en base : E85 0.934, SP95-E10 1.99 (aucune ligne Gazole) → capture `V-5.2-03-avant.png` ✓ (13:35:39Z, md5 b137e90c)
- Step 4: je touche Gazole → titre « Stations · Gazole » ; 4 lignes et 4 pastilles au prix gazole de la base (contre 5 lignes et 5 pastilles en SP95-E10) ; stations SP95-E10 sans gazole en base : 46220005 → absentes de la liste et de la carte (pastille 46220005 : 0) ; lignes : 46700001 2,347 | 46220003 2,349 | 46220002 2,359 | 46140003 2,369 → capture `V-5.2-04-apres.png` ✓ (13:35:42Z, md5 a22c80e6)

### Issues Found
- aucune sur la version déployée à cette passe.

## V-5.4 — Trier

### Happy Path
- Step 1: la liste des stations (SP95-E10, tri « Moins cher ») → tri prix ; 8 stations → capture `V-5.4-01-avant.png` ✓ (13:35:44Z, md5 de70b6bd)
- Step 2: je touche « Plus proche » → « Plus proche » : distances croissantes 1,8 ≤ 1,9 ≤ 2,2 ≤ 2,3 ≤ 3,1 ≤ 3,3 ≤ 6,8 ≤ 9,4… (8) ; « Moins cher » : prix croissants 1,990 ≤ 1,990 ≤ 2,149 ≤ 2,178 ≤ 2,178 ≤ 2,178… ; capture sur « Plus proche » → capture `V-5.4-02-apres.png` ✓ (13:35:44Z, md5 73965436)

### Issues Found
- aucune sur la version déployée à cette passe.

## V-5.5 — Utiliser ce prix

### Happy Path
- Step 1: trajet en cours ; la fiche de la 1re station « Moins cher » de Montauban → fiche « TotalEnergies Montauban » ; bouton « Utiliser 1,990 €/L pour mon trajet » ; prix SP95-E10 en base pour 82000018 : 1,990 €/L. (Le plan cite 2,103 €/L à titre d'exemple : le prix réel du jour est celui lu ici.) → capture `V-5.5-01-avant.png` ✓ (13:30:04Z, md5 b3ba5b7f)
- Step 2: je touche « Utiliser 1,990 €/L pour mon trajet » → fiche fermée, écran En route ; « Prix : mon prix · 1,990 €/L » ; 0,21 L × 1,990 = 0,418 → 0,41 € (la fin de trajet est relue plus bas) → capture `V-5.5-02-apres.png` ✓ (13:30:05Z, md5 26020bde)
- Step 3: aucun trajet en cours ; fiche de la station la moins chère → fiche « TotalEnergies Albi · Relais des Fontanelles » ; bouton « Utiliser 1,990 €/L pour mon trajet » ; pas de bandeau (0) → capture `V-5.5-03-avant.png` ✓ (13:35:45Z, md5 1dda01ac)
- Step 4: je touche ce bouton → accueil ouvert (URL /) ; prix gardé : pt-prix-choisi = {"prix":1.99,"carburant":"SP95-E10","station":"TotalEnergies Albi · Relais des Fontanelles"} (la capture montre l'accueil après l'essai de démarrage, revenu par « trop court ») → capture `V-5.5-04-apres.png` ✓ (13:35:46Z, md5 25c9bd31)
- Step 5: une station qui ne vend pas le SP95-E10 de ma voiture (liste Gazole) → « Carrefour Market Puygouzon 4,3 km · il y a 5 h · −1,3 c vs France 2,355 €/L » (81990003) : aucun prix SP95-E10 vendu en base (absent ou rupture) → capture `V-5.5-05-avant.png` ✓ (13:35:50Z, md5 f4a1dbeb)
- Step 6: sa fiche s'ouvre → fiche « Carrefour Market Puygouzon » ; SP95-E10 « SP95-E10 non vendu » ; pas de bouton « Utiliser … pour mon trajet » → capture `V-5.5-06-apres.png` ✓ (13:35:51Z, md5 0cbfc9fd)

### Edge Case / constats
- Step 2 — la fin de ce même trajet, au prix de la station, est la capture V-4.7-01-avant.png (libellé « Mon prix », 3 personnes) ; fin de trajet : libellé « Mon prix », prix data-prix 1.99 (station : 1,990), coût 10,34 € essence.
- Step 4 — trajet démarré ensuite : « Prix : mon prix · 1,990 €/L » ; pt-prix-choisi vidé au départ (null).

### Issues Found
- aucune sur la version déployée à cette passe.

## V-5.6 — Trajet en cours

### Happy Path
- Step 1: un trajet en cours ; je touche l'onglet Stations (positions envoyées au rythme réel, 1 par seconde) → écran Stations ouvert ; bandeau « ● Trajet en cours · 0,93 € » → capture `V-5.6-01-avant.png` ✓ (13:30:38Z, md5 ce111e80)
- Step 2: l'onglet Stations est ouvert → bandeau en haut « ● Trajet en cours · 1,02 € » (coût en direct ; 0,93 € sur En route juste avant) ; 8 stations listées → capture `V-5.6-02-apres.png` ✓ (13:30:42Z, md5 e6b22174)
- Step 3: ce bandeau, 6 s plus tard (la voiture roule) → « ● Trajet en cours · 1,05 € » (« ● Trajet en cours · 1,02 € » 6 s plus tôt : le coût du bandeau suit le trajet) ; positions rejouées jusqu'au point 915 → capture `V-5.6-03-avant.png` ✓ (13:30:49Z, md5 466b6a22)
- Step 4: je touche l'onglet Trajet → écran En route revenu ; 913 points (913 au moment du toucher) ; 82 km/h · 6,9 km · 0,53 L · 1,05 € · 0:15 · 27 km/h moy. · 7,7 L/100 · 913 points → capture `V-5.6-04-apres.png` ✓ (13:30:50Z, md5 28200ebc)

### Edge Case / constats
- Step 2 — sans trajet en cours (même téléphone, avant Démarrer) : bandeau « retour-trajet » présent 0 fois (attendu 0).
- Step 2 — contrôle répété sur un téléphone sans trajet (flux Stations) : 0 bandeau.

### Issues Found
- aucune sur la version déployée à cette passe.

## V-5.7 — Europe et Royaume-Uni

### Happy Path
- Step 1: une position à Barcelone (41,3874, 2,1686) : accueil, en-tête « Autour de moi » → en-tête « Autour de moi » ; position du contexte 41.3874, 2.1686 (Barcelone) ; la V1 ne montre la position que dans l'onglet Stations → capture `V-5.7-01-avant.png` ✓ (13:35:52Z, md5 25c9bd31)
- Step 2: l'onglet Stations s'ouvre → 153 stations espagnoles (pays ES en base), 153 pastilles, prix SP95-E10 = base ; 1re « Galp Sant adria de besos · Galp 6,8 km · il y a 28 min · −27,6 c vs Espagne 1,514 €/L » → capture `V-5.7-02-apres.png` ✓ (13:35:59Z, md5 b9519d0a)
- Step 3: une position à Dartford (Royaume-Uni) → 18 stations, pays GB ; 1re « Morrisons · MFG Morrisons Grays, London Road, GRAYS 7,9 km · il y a 14 h · −4,8 c vs Royaume-Uni 2,022 €/L » → capture `V-5.7-03-avant.png` ✓ (13:36:03Z, md5 f41500a5)
- Step 4: je lis une station (fiche) → fiche « Morrisons · MFG Morrisons Grays, London Road, GRAYS » ; Gazole 2,343 €/L ← 196,9 p/L ; SP95 2,022 €/L ← 169,9 p/L ; SP95-E10 2,022 €/L ← 169,9 p/L ; SP98 2,260 €/L ← 189,9 p/L ; « 1 € = 0,8403 £ · BCE 20/10 » (taux BCE en base 0.84028) → capture `V-5.7-04-apres.png` ✓ (13:36:06Z, md5 1f82fe63)
- Step 5: un pays qui ne publie pas ses prix station par station : Belgique (position Bruxelles), carte glissée → statut du pays en base : « aucun » ; bouton « Rechercher dans cette zone » → capture `V-5.7-05-avant.png` ✓ (13:36:22Z, md5 90f49ad5)
- Step 6: j'y cherche dans cette zone → « Ce pays ne publie pas les prix station par station Moyenne nationale · Belgique · SP95-E10 : 1,977 €/L » ; en-tête « Autour de moi » ; 0 ligne, pastilles 0 → capture `V-5.7-06-apres.png` ✓ (13:36:29Z, md5 6856fb8a)

### Issues Found
- aucune sur la version déployée à cette passe.

## V-1.3 — Démarrer

### Happy Path
- Step 1: la Clio enregistrée, localisation autorisée, position = 1er point du GPX (Albi, place du Vigan) → accueil « Renault Clio » ; permission géolocalisation accordée au contexte → capture `V-1.3-01-avant.png` ✓ (13:28:59Z, md5 25c9bd31)
- Step 2: je touche « Démarrer » → écran En route, « Enregistrement » (pastille animée : clignote infinite) ; 1re position enregistrée en 292 ms (data-points 1) ; IndexedDB enregistrement : présent → capture `V-1.3-02-apres.png` ✓ (13:29:00Z, md5 827bc8db)

### Issues Found
- aucune sur la version déployée à cette passe.

## V-3.5 — Arrêter

### Happy Path
- Step 1: un enregistrement de plus de 1 km (arrivée au Capitole, Toulouse) → 10 km/h · 74,9 km · 5,20 L · 10,34 € · 1:11 · 63 km/h moy. · 6,9 L/100 · 4275 points → capture `V-3.5-01-avant.png` ✓ (13:35:21Z, md5 62b5fb78)
- Step 2: je touche « Arrêter » → « Albi → Toulouse » ; « 21 oct. 2026 · 1 h 11 · Renault Clio » ; 5,2 L (5.195), 74,9 km (74.85), 6,9 L/100 km moy. → capture `V-3.5-02-apres.png` ✓ (13:35:23Z, md5 4f10f7a9)

### Issues Found
- aucune sur la version déployée à cette passe.

## V-4.7 — Enregistrer ou supprimer

### Happy Path
- Step 1: un trajet qui vient d'être arrêté (3 personnes choisies) → prix « Mon prix » 1,990 €/L ; coût 10,34 € ; « 3,45 € chacun » ; boutons « Supprimer Enregistrer » → capture `V-4.7-01-avant.png` ✓ (13:35:24Z, md5 06209d71)
- Step 2: je touche « Enregistrer » → onglet Historique, en tête : « Albi → Toulouse 21 oct. · 74,9 km · SP95-E10 à 1,990 €/L · 3,45 € chacun 10,34 € » ; IndexedDB : prix 1.99 (station), carburant SP95-E10, 3 personnes, enregistré ; totaux « 1 trajet 75 km 10,34 € essence » → capture `V-4.7-02-apres.png` ✓ (13:35:25Z, md5 ba0f3001)

### Edge Case / constats
- Démonstration : coût 10,34 € au prix de la station 1,990 €/L, partagé à 3.

### Issues Found
- aucune sur la version déployée à cette passe.

## V-1.1 — Ouvrir l'appli

### Happy Path
- Step 5: un trajet en cours d'enregistrement ; je suis sur l'onglet Stations (bandeau « Trajet en cours ») → onglet onglet-stations ; bandeau « ● Trajet en cours · 0,45 € » ; IndexedDB enregistrement : 486 points → capture `V-1.1-05-avant.png` ✓ (13:29:40Z, md5 1588b4ba)
- Step 6: je touche l'onglet Trajet → URL /en-route, écran En route « Enregistrement » (pas l'accueil) → capture `V-1.1-06-apres.png` ✓ (13:29:41Z, md5 a1b0f411)

### Issues Found
- aucune sur la version déployée à cette passe.

## Régression (passage trajet,stations)
- (rejouée par la spec m5-regression)

## Erreurs de page relevées
- aucune

---

# Passage r2 cas,historique,retraits — début 2026-10-21T13:36:42.547Z

Appli déployée https://plein-et-trajet.vercel.app, base Supabase réelle, Playwright (bibliothèque), Chromium headless 390 × 844, toucher, fr-FR, Europe/Paris.
Réel : base EEA (fonction voiture-eea), moyennes du jour (FR SP95-E10 2,156 €/L, Gazole 2,368 €/L), stations et prix du jour, géocodage inverse (fonction lieux), refus de localisation (contexte sans permission), coupure réseau (context.setOffline).
Rejoué : géolocalisation par context.setGeolocation depuis tests/e2e/fixtures/albi-toulouse.gpx (et ses dérivés immobile / tunnel, et barcelone.gpx : vrai itinéraire Valhalla fabriqué par creer-gpx.mjs barcelone), horloge de la page accélérée par page.clock (méthode r1a : avancer l'horloge, poser la position, attendre que T3 l'ait comptée), au rythme réel (1 point/s) pendant les passages par Stations.

## V-1.3 — Démarrer (localisation refusée)

### Happy Path
- Step 3: la localisation refusée (contexte sans permission geolocation) → accueil « Renault Clio » ; permission géolocalisation : denied → capture `V-1.3-03-avant.png` ✓ (13:36:48Z, md5 1f66d5d0)
- Step 4: je touche « Démarrer » → « L'enregistrement a besoin de ta localisation Cadenas de la barre d'adresse → Position → Autoriser » ; URL / ; IndexedDB : enregistrement absent, 0 trajet → capture `V-1.3-04-apres.png` ✓ (13:36:53Z, md5 4cfb9d3a)

### Issues Found
- aucune sur la version déployée à cette passe.

## V-3.5 — Arrêter (cas limites)

### Happy Path
- Step 3: un enregistrement de moins de 1 km (150 positions) → 19 km/h · 0,5 km · 0,04 L · 0,09 € · 0:02 · 12 km/h moy. · 8,4 L/100 · 150 points → capture `V-3.5-03-avant.png` ✓ (13:37:48Z, md5 6581d7d2)
- Step 4: je touche « Arrêter » → « Trajet trop court : 0,5 km sur 1 minimum. Rien n'est ajouté à l'historique. Retour à l'accueil » ; IndexedDB : 0 trajet, pas de trajet arrêté, pas d'enregistrement → capture `V-3.5-04-apres.png` ✓ (13:37:51Z, md5 b9ab7181)
- Step 5: aucun réseau (context.setOffline(true)) juste avant l'arrêt — 420 positions → navigator.onLine = false ; « Hors ligne : le trajet continue, tout est calculé sur le téléphone. » ; 28 km/h · 2,0 km · 0,17 L · 0,36 € · 0:06 · 17 km/h moy. · 8,4 L/100 · 420 points ; « Prix : moyenne France du jour · 2,156 €/L » → capture `V-3.5-05-avant.png` ✓ (13:39:10Z, md5 34be479a)
- Step 6: la fin de trajet s'ouvre sans réseau → hors ligne (capture prise pendant la coupure) : titre « 43,928 · 2,146 → 43,917 · 2,144 » (coordonnées, noms pas encore connus) ; « Hors ligne : litres et coût calculés sur le téléphone ; les noms des lieux viendront au retour du réseau. » ; 0,168 L × 2,156 €/L (moyenne gardée au départ) = 0,36 € calculés sur le téléphone → capture `V-3.5-06-apres.png` ✓ (13:39:13Z, md5 581176b0)

### Edge Case / constats
- Step 6 — après la capture, retour du réseau (setOffline(false) → événement online) : le titre passe de « 43,928 · 2,146 → 43,917 · 2,144 » à « Albi → Albi » sans rien toucher ✓ ; « Hors ligne » affiché : 0 ; requêtes tentées pendant la coupure : 4 (refusées par le navigateur hors ligne).

### Issues Found
- aucune sur la version déployée à cette passe.

## V-3.E1 — Oubli d'arrêter

### Happy Path
- Step 1: un enregistrement en cours (700 positions, 4 km dans Albi) → 30 km/h · 2,8 km · 0,23 L · 0,51 € · 0:11 · 14 km/h moy. · 8,5 L/100 · 700 points → capture `V-3.E1-01-avant.png` ✓ (13:40:19Z, md5 e0082376)
- Step 2: vitesse < 3 km/h et position dans 50 m pendant 10 min (points 774 → 1375 du tracé dérivé) → « Trajet arrêté : immobile depuis 10 min. Reprendre C'est fini » au point 1375 (601 s après le début de l'immobilité) ; début daté 13:52:13 (point 774 reçu à 13:52:12, écart 1 s) ; 5 positions de plus : km 4,0 et litres 0,33 figés ; état « Immobile depuis 10 min » → capture `V-3.E1-02-apres.png` ✓ (13:40:40Z, md5 c2d7a3e6)
- Step 3: cette alerte (« C'est fini » sélectionné) → focus « C'est fini » → capture `V-3.E1-03-avant.png` ✓ (13:40:41Z, md5 46009f51)
- Step 4: je touche « C'est fini » → « Albi → Le Sequestre » « 21 oct. 2026 · 12 min · Renault Clio » ; arrivée datée 13:52:13 = début de l'immobilité (point 774, écart 1.0 s) ; durée 774 s : les 10 min d'arrêt ne comptent pas ; 4,02 km → capture `V-3.E1-04-apres.png` ✓ (13:40:42Z, md5 c740b44a)
- Step 5: cette alerte (2e trajet rejoué ; « Reprendre » sélectionné) → « Trajet arrêté : immobile depuis 10 min. Reprendre C'est fini » ; 775 points gardés → capture `V-3.E1-05-avant.png` ✓ (13:41:15Z, md5 6bf8ebdb)
- Step 6: je touche « Reprendre » → « Enregistrement » ; 775 points gardés (autant qu'à l'alerte), 4,0 km conservés → capture `V-3.E1-06-apres.png` ✓ (13:41:15Z, md5 61ba40c4)

### Edge Case / constats
- Garé (points 774 → 1365, bruit ±2 m, juste avant l'alerte) : km 4,0 → 4,0, litres 0,33 → 0,33, vitesse affichée relevée tous les 37 points : 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 km/h ✗ (r1 : 4,0 → 5,1 km et 5 à 10 km/h).
- Step 6 — après « Reprendre », 10 positions de plus (toujours garé) : 775 → 785 points (l'enregistrement repart) ; 0 km/h, 4,0 km, 0,33 L (inchangés).

### Issues Found
- bruit du GPS à l'arrêt encore compté

## V-3.E2 — GPS perdu

### Happy Path
- Step 1: un enregistrement en cours (A68, 121 positions, dernière avant le tunnel) → 105 km/h · 3,5 km · 0,23 L · 0,50 € · 0:02 · 105 km/h moy. · 6,7 L/100 · 121 points → capture `V-3.E2-01-avant.png` ✓ (13:41:22Z, md5 9f86ab0d)
- Step 2: aucune position pendant 16 s → « GPS perdu (tunnel) · la distance est complétée à la sortie. » ; data-etat gps-perdu ; vitesse 0 km/h → capture `V-3.E2-02-apres.png` ✓ (13:41:22Z, md5 42a95c14)
- Step 3: le signal revient après 90 s sans position (tunnel de 3,00 km) → toujours « GPS perdu (tunnel) · la distance est complétée à la sortie. » ; 3,5 km figés → capture `V-3.E2-03-avant.png` ✓ (13:41:23Z, md5 222cb4fe)
- Step 4: la position suivante arrive → km 3,5 → 6,5 (+3,0 km ; ligne droite entre les 2 positions 3.001 km, chemin réel 3,0007 km, à 120 km/h de moyenne) ; message disparu → capture `V-3.E2-04-apres.png` ✓ (13:41:23Z, md5 556ad97b)

### Issues Found
- aucune sur la version déployée à cette passe.

## V-4.2 — Mettre mon prix

### Happy Path
- Step 1: la fin de trajet (SP95-E10, moyenne du jour) → « Moyenne France du jour » 2.156 €/L ; coût 1,18 € → capture `V-4.2-01-avant.png` ✓ (13:41:28Z, md5 2b96def0)
- Step 2: je touche le compteur, tape 1,989 et valide (Entrée) → « Mon prix » 1,989 €/L ; coût 0,546 × 1,989 = 1,09 € ; « Revenir à la moyenne » affiché → capture `V-4.2-02-apres.png` ✓ (13:41:28Z, md5 21127f59)
- Step 3: mon prix saisi (« Revenir à la moyenne » sélectionné) → focus « Revenir à la moyenne » → capture `V-4.2-03-avant.png` ✓ (13:41:29Z, md5 d77cd975)
- Step 4: je touche « Revenir à la moyenne » → « Moyenne France du jour » 2,156 €/L ; coût 1,18 € (comme avant la saisie) → capture `V-4.2-04-apres.png` ✓ (13:41:29Z, md5 918f7f55)
- Step 5: le champ du prix ouvert (« 1,5 » tapé, pas validé) → champ « 1,5 » ouvert → capture `V-4.2-05-avant.png` ✓ (13:41:30Z, md5 c36a15a8)
- Step 6: j'appuie sur Échap → champ fermé ; prix toujours 2,156 €/L « Moyenne France du jour » ; focus revenu sur « Modifier le prix, 2,156 euros par litre » → capture `V-4.2-06-apres.png` ✓ (13:41:30Z, md5 5ca3caed)

### Issues Found
- aucune sur la version déployée à cette passe.

## V-4.1 — Prix de l'essence

### Happy Path
- Step 1: la fin d'un trajet en Clio SP95-E10 parti de France (juste avant « Arrêter ») → « Prix : moyenne France du jour · 2,156 €/L » ; 105 km/h · 8,2 km · 0,55 L · 1,18 € · 0:04 · 110 km/h moy. · 6,6 L/100 · 182 points → capture `V-4.1-01-avant.png` ✓ (13:41:25Z, md5 efe8e797)
- Step 2: l'écran Fin de trajet s'ouvre → sélecteur Gazole · SP95-E10 · SP95 · SP98 · E85 · GPLc, SP95-E10 choisi ; « Moyenne France du jour » ; compteur « Modifier le prix, 2,156 euros par litre » (3 décimales) = moyenne France SP95-E10 lue par l'API 2,156 ; coût 1,18 € essence → capture `V-4.1-02-apres.png` ✓ (13:41:27Z, md5 14e22fbb)
- Step 3: ce sélecteur (Gazole sélectionné au clavier) → focus « Gazole » → capture `V-4.1-03-avant.png` ✓ (13:41:27Z, md5 0656d766)
- Step 4: je touche Gazole → « Moyenne France du jour » 2,368 €/L (moyenne France Gazole de l'API 2,368) ; coût 0,546 × 2,368 = 1,29 € → capture `V-4.1-04-apres.png` ✓ (13:41:27Z, md5 06dfddca)
- Step 5: un départ hors de France : vrai itinéraire dans Barcelone (plaça de Catalunya → Sagrada Família, 3,2 km rejoués) → « Prix : moyenne Espagne du jour · 1,790 €/L » ; 18 km/h · 3,2 km · 0,26 L · 0,46 € · 0:11 · 17 km/h moy. · 8,0 L/100 · 674 points → capture `V-4.1-05-avant.png` ✓ (13:41:52Z, md5 2d3458c6)
- Step 6: l'écran Fin de trajet s'ouvre → « Barcelone → Barcelone » ; « Moyenne Espagne du jour » 1,790 €/L (moyenne Espagne SP95-E10 de l'API : 1,790) ; pays de départ enregistré ES → capture `V-4.1-06-apres.png` ✓ (13:41:57Z, md5 c7fe9ac7)

### Issues Found
- aucune sur la version déployée à cette passe.

## V-6.1 — Ouvrir l'historique

### Happy Path
- Step 1: des trajets enregistrés en septembre et en octobre 2026 (deux trajets réellement rejoués, horloge de la page posée au 14/09 08:00 et au 05/10 17:30) : l'historique juste après le second « Enregistrer » → IndexedDB : 2026-09-14 2.5 km ; 2026-10-05 6.6 km ; lignes « Albi → Albi 5 oct. · 6,6 km · SP95-E10 à 2,156 €/L 1,01 € | Albi → Albi 14 sept. · 2,5 km · SP95-E10 à 2,156 €/L 0,45 € » → capture `V-6.1-01-avant.png` ✓ (13:42:41Z, md5 0699c175)
- Step 2: je touche l'onglet Historique → groupes Octobre 2026 puis Septembre 2026 ; lignes : Albi → Albi 5 oct. · 6,6 km · SP95-E10 à 2,156 €/L 1,01 € | Albi → Albi 14 sept. · 2,5 km · SP95-E10 à 2,156 €/L 0,45 € → capture `V-6.1-02-apres.png` ✓ (13:42:42Z, md5 7996d1c1)
- Step 3: aucun trajet enregistré (téléphone neuf, voiture enregistrée) : l'historique ouvert par son adresse → IndexedDB : 0 trajet ; « Aucun trajet enregistré. » → capture `V-6.1-03-avant.png` ✓ (13:42:44Z, md5 fb3d3343)
- Step 4: j'ouvre l'onglet Historique → « Aucun trajet enregistré. » ; totaux « 0 trajets 0,0 km 0,00 € essence » → capture `V-6.1-04-apres.png` ✓ (13:42:44Z, md5 1626ed1f)

### Issues Found
- aucune sur la version déployée à cette passe.

## V-6.2 — Totaux

### Happy Path
- Step 1: ÉTAT PRÉPARÉ : 4 trajets de 77, 152, 245 et 243 km écrits en IndexedDB (format TrajetV1 de l'appli) — leurs lignes dans l'historique → trajets 77 km 4,93 L, 152 km 10,03 L, 245 km 16,91 L, 243 km 16,28 L au prix moyen France SP95-E10 du jour 2,156 → coûts 10,63 + 21,62 + 36,46 + 35,10 ; lignes « Albi → Montpellier 16 oct. · 243 km · SP95-E10 à 2,156 €/L 35,10 € | Toulouse → Bordeaux 12 oct. · 245 km · SP95-E10 à 2,156 €/L 36,46 € | Albi → Cahors 8 oct. · 152 km · SP95-E10 à 2,156 €/L 21,62 € | Albi → Toulouse 3 oct. · 77,0 km · SP95-E10 à 2,156 €/L 10,63 € » → capture `V-6.2-01-avant.png` ✓ (13:42:45Z, md5 83d92835)
- Step 2: l'historique s'affiche → totaux « 4 trajets 717 km 103,81 € essence » = 4 trajets, 717 km, 103,81 € (somme des coûts des lignes 35,10 + 36,46 + 21,62 + 10,63) → capture `V-6.2-02-apres.png` ✓ (13:42:46Z, md5 076cfcd8)
- Step 3: un trajet corrigé : celui de 152 km rouvert, prix passé à 1,899 €/L → « Mon prix » ; coût 19,05 € essence → capture `V-6.2-03-avant.png` ✓ (13:42:47Z, md5 be8d0d9d)
- Step 4: je reviens à l'historique → totaux recalculés « 4 trajets 717 km 101,24 € essence » (= 101,24 €) ; ligne 152 km : Albi → Cahors 8 oct. · 152 km · SP95-E10 à 1,899 €/L 19,05 € → capture `V-6.2-04-apres.png` ✓ (13:42:47Z, md5 fdaa8b42)

### Issues Found
- aucune sur la version déployée à cette passe.

## V-6.3 — Lire un trajet

### Happy Path
- Step 1: ÉTAT PRÉPARÉ : un trajet enregistré à 3 personnes (Albi → Rodez) et un trajet seul, écrits en IndexedDB → prep-3p 92.4 km 3 pers. ; prep-seul 76.8 km 1 pers. → capture `V-6.3-01-avant.png` ✓ (13:42:48Z, md5 591d58cc)
- Step 2: je lis sa ligne (sélectionnée au clavier) → ligne « Albi → Rodez 18 oct. · 92,4 km · SP95-E10 à 2,156 €/L · 4,32 € chacun 12,96 € » (date, départ → arrivée, km, coût, 4,32 € chacun) ; trajet seul : « Toulouse → Albi 19 oct. · 76,8 km · SP95-E10 à 2,156 €/L 10,44 € » sans part → capture `V-6.3-02-apres.png` ✓ (13:42:48Z, md5 5b176cea)
- Step 3: une ligne (le trajet seul, sélectionné au clavier) → « Toulouse → Albi 19 oct. · 76,8 km · SP95-E10 à 2,156 €/L 10,44 € » → capture `V-6.3-03-avant.png` ✓ (13:42:49Z, md5 da46a748)
- Step 4: je la touche → fin de ce trajet « Toulouse → Albi » ; onglet Historique sélectionné ; « ← Historique » ; bouton « Supprimer ce trajet » → capture `V-6.3-04-apres.png` ✓ (13:42:49Z, md5 c5454bad)

### Issues Found
- aucune sur la version déployée à cette passe.

## V-6.4 — Revoir, corriger, supprimer

### Happy Path
- Step 1: un trajet rouvert depuis l'historique (le trajet seul), réglages de prix et de personnes → prix « Moyenne France du jour » 2.156 ; 1 personne → capture `V-6.4-01-avant.png` ✓ (13:42:50Z, md5 620bbdfc)
- Step 2: je change son carburant (Gazole) et son nombre de personnes (2), puis je reviens à l'historique → IndexedDB : Gazole, 2 personnes, 2.368 €/L ; ligne « Toulouse → Albi 19 oct. · 76,8 km · Gazole à 2,368 €/L · 5,73 € chacun 11,46 € » → capture `V-6.4-02-apres.png` ✓ (13:42:50Z, md5 c26d471a)
- Step 3: un trajet rouvert (Albi → Rodez, 3 personnes) → bouton « Supprimer ce trajet » → capture `V-6.4-03-avant.png` ✓ (13:42:51Z, md5 94a8a784)
- Step 4: je touche « Supprimer ce trajet » → 1 76.8 → capture `V-6.4-04-apres.png` ✗ (13:42:51Z, md5 06947c50)

### Issues Found
- Step 4 (V-6.4-04-apres.png) : 1 76.8

## V-4.3 — Coût de l'essence

### Happy Path
- Step 1: ÉTAT PRÉPARÉ : un trajet arrêté de 41,2 L, prix 2,161 €/L (« Mon prix »), écrit en IndexedDB (en_cours/arrete) — sa fin de trajet, haut de l'écran → litres / prix → capture `V-4.3-01-avant.png` ✗ (13:42:53Z, md5 548f495a)
- Step 2: la fin de trajet s'affiche (appli ouverte : le trajet arrêté revient) — le coût → « 89,03 € essence » (41,2 × 2,161 = 89.0332 → 89,03) ; libellé « Mon prix » → capture `V-4.3-02-apres.png` ✓ (13:42:53Z, md5 ef8ee2f9)
- Step 3: le prix changé (réseau coupé : context.setOffline(true)) — « 2,050 » tapé → navigator.onLine = false ; champ « 2,050 » → capture `V-4.3-03-avant.png` ✓ (13:42:54Z, md5 f3c2e75b)
- Step 4: je valide (Entrée), toujours sans réseau → « 84,46 € essence » = 41,2 × 2,050 recalculé aussitôt, hors ligne (navigator.onLine false) → capture `V-4.3-04-apres.png` ✓ (13:42:54Z, md5 cbdac81f)

### Edge Case / constats
- Step 4 — toujours hors ligne : « Revenir à la moyenne » → 88,83 € (41,2 × 2,156), puis Gazole → 97,56 € (41,2 × 2,368) ✓, sur les moyennes gardées dans le trajet ; requêtes émises pendant ces changements : 0 (aucune).

### Issues Found
- Step 1 (V-4.3-01-avant.png) : litres / prix

## V-4.4 — Partager

### Happy Path
- Step 1: un coût de 89,03 € (SP95-E10, mon prix 2,161 €/L), 1 personne → « 89,03 € essence » ; « Seul : tout pour toi. » → capture `V-4.4-01-avant.png` ✓ (13:42:55Z, md5 48eefec4)
- Step 2: je passe le nombre de personnes à 3 avec « + » → 3 personnes → « 29,68 € chacun » (89,03 ÷ 3 = 29,677) → capture `V-4.4-02-apres.png` ✓ (13:42:55Z, md5 bd38827c)
- Step 3: 1 personne → 1 personne ; « Seul : tout pour toi. » → capture `V-4.4-03-avant.png` ✓ (13:42:56Z, md5 3f3b8da5)
- Step 4: l'écran s'affiche ; j'essaie de descendre sous 1 et de monter au-delà de 9 → « Seul : tout pour toi. » ; « − » désactivé à 1 (toucher : reste 1) ; 10 touchers sur « + » → 9, « + » désactivé ; revenu à 1 : « Seul : tout pour toi. » → capture `V-4.4-04-apres.png` ✓ (13:42:57Z, md5 7dbd9292)

### Edge Case / constats
- Step 4 — une seule image ne peut pas montrer les deux bornes : la capture est à 1 personne (« Seul : tout pour toi. », « − » désactivé) ; la borne 9 (« + » désactivé après 10 touchers) est relevée dans le constat de l'étape, puis le compteur est ramené à 1.

### Issues Found
- aucune sur la version déployée à cette passe.

## V1-retraits — Contrôle négatif : ce qui sort de la V1

### Happy Path
- Step 1: l'appli déployée, journal réseau Playwright ouvert sur TOUS les contextes du passage (écoute context.on('request'), y compris les processus précédents du même passage, relus dans exploration/m5-resultats-<passage>-*.json) → 243 requêtes de ce processus → capture `V1-retraits-01-avant.png` ✓ (13:42:57Z, md5 25c9bd31)
- Step 2: parcours T1 → T6 (+ tous les flux du passage, dont 5 trajets complets rejoués) → 853 requêtes journalisées sur 16 contextes : 0 vers api.myptv.com, 0 vers estimer-trajet / trajet-roule / péages ; fonctions appelées {"voiture-eea":10,"lieux":53} ; hôtes {"plein-et-trajet.vercel.app":153,"fonts.googleapis.com":45,"fonts.gstatic.com":203,"rglrwtkqwihdztgqlbsy.supabase.co":266,"":9,"tiles.openfreemap.org":171,"data.geopf.fr":5,"photon.komoot.io":1} ; 203 captures (contextes trajet, stations, stations-prayssac, barcelone-stations, dartford, bruxelles, voiture, cas-refus, cas, barcelone, historique-reel, historique-vide, historique-prepare, historique-prepare-2, cout-prepare, retraits) + 6 routes passées au crible : aucun « péage » ni « itinéraire » ; aucun champ départ / arrivée ; aucun lien Moteurs ; onglets Trajet · Stations · Historique → capture `V1-retraits-02-apres.png` ✓ (13:43:16Z, md5 6142c715)
- Step 3: la table public.moteurs lue par l'API Supabase (rôle service), rendue en page texte → prix:true, moyennes:true, itineraire:true, peages:false, voitures:true, lieux:true, vehicules:true → capture `V1-retraits-03-avant.png` ✓ (13:43:19Z, md5 ae0ac71d)
- Step 4: je lis la ligne du service péages, et le nombre de lignes des clés → peages : en_service = false (fournisseur ptv gardé) ; cles_fournisseurs 2 lignes (2 avant) ; Vault 3 secrets (cle_ptv, cle_stadia, sync_prix_secret ; 3 avant) ; limite d'inscriptions anonymes 30 → capture `V1-retraits-04-apres.png` ✓ (13:43:19Z, md5 48cb2320)

### Issues Found
- aucune sur la version déployée à cette passe.

## V-4.7 — Enregistrer ou supprimer (supprimer, appli fermée)

### Happy Path
- Step 3: un trajet qui vient d'être arrêté (celui de la coupure réseau, noms complétés) → « Albi → Albi » ; boutons « Supprimer Enregistrer » → capture `V-4.7-03-avant.png` ✓ (13:39:15Z, md5 b1db7d42)
- Step 4: je touche « Supprimer » → accueil (URL /) ; IndexedDB : 0 trajet, aucun trajet arrêté ni point gardé ; Historique : « Aucun trajet enregistré. » → capture `V-4.7-04-apres.png` ✓ (13:39:17Z, md5 25c9bd31)
- Step 5: un trajet arrêté (Barcelone), pas encore tranché ; je ferme l'appli → trajet 8ee7f883-5f6a-46d8-afd5-2c3175d56d3f ; boutons « Supprimer Enregistrer » → capture `V-4.7-05-avant.png` ✓ (13:41:57Z, md5 663dd0b1)
- Step 6: je rouvre l'appli (navigateur relancé, même profil) → URL /fin ; même trajet 8ee7f883-5f6a-46d8-afd5-2c3175d56d3f « Barcelone → Barcelone » ; « Supprimer Enregistrer » → capture `V-4.7-06-apres.png` ✓ (13:41:59Z, md5 18e20e8b)

### Issues Found
- aucune sur la version déployée à cette passe.

## Régression (passage cas,historique,retraits)
- US-4.E2 (T4) : « 7 » validé → « Entre un prix entre 0,50 et 4,00 €/L », prix gardé 2.156 ✓
- US-3.E3 (T6) : historique vide → « Aucun trajet enregistré. », totaux 0 trajets 0,0 km 0,00 € essence ✓

## Erreurs de page relevées
- aucune

---

# Passage r2final voiture,trajet — début 2026-10-21T13:47:35.297Z

Appli déployée https://plein-et-trajet.vercel.app, base Supabase réelle, Playwright (bibliothèque), Chromium headless 390 × 844, toucher, fr-FR, Europe/Paris.
Réel : base EEA (fonction voiture-eea), moyennes du jour (FR SP95-E10 2,156 €/L, Gazole 2,368 €/L), stations et prix du jour, géocodage inverse (fonction lieux), refus de localisation (contexte sans permission), coupure réseau (context.setOffline).
Rejoué : géolocalisation par context.setGeolocation depuis tests/e2e/fixtures/albi-toulouse.gpx (et ses dérivés immobile / tunnel, et barcelone.gpx : vrai itinéraire Valhalla fabriqué par creer-gpx.mjs barcelone), horloge de la page accélérée par page.clock (méthode r1a : avancer l'horloge, poser la position, attendre que T3 l'ait comptée), au rythme réel (1 point/s) pendant les passages par Stations.

## V-2.E1 — Code inconnu

### Happy Path
- Step 1: champ D.2, je commence « ZZ999 » → champ « ZZ999 » ; aucune fiche → capture `V-2.E1-01-avant.png` ✓ (13:47:49Z, md5 ada454ea)
- Step 2: je tape « ZZ9999 » (absent de la base EEA) → « Code introuvable. Vérifie la case D.2, ou cherche par nom ci-dessous. » (data-code code_inconnu) ; « Enregistrer ma voiture » désactivé → capture `V-2.E1-02-apres.png` ✓ (13:47:54Z, md5 92a032d1)
- Step 3: MOCKED (page.route : la base européenne ne tombe pas sur commande) — base injoignable, je commence « 5RBF0 » → champ « 5RBF0 » ; réponse de voiture-eea remplacée par un 502 base_injoignable côté navigateur → capture `V-2.E1-03-avant.png` ✓ (13:47:55Z, md5 a3564154)
- Step 4: MOCKED — je tape « 5RBF0A » → « La base européenne des voitures ne répond pas. Réessayer » ; champ toujours « 5RBF0A » ; « Enregistrer ma voiture » désactivé : true → capture `V-2.E1-04-apres.png` ✓ (13:47:56Z, md5 7fe600ec)

### Edge Case / constats
- Step 4 — route retirée puis « Réessayer » touché : la vraie base répond, fiche « Renault Clio 1.5 · 75 ch · Gazole » (après la capture).

### Issues Found
- aucune sur la version déployée à cette passe.

## V-2.3 — Chercher sans la carte grise

### Happy Path
- Step 1: je touche le champ « Nom, année, puissance » → champ recherche vide et sélectionné (focus #q) → capture `V-2.3-01-avant.png` ✓ (13:47:59Z, md5 9d82c3e0)
- Step 2: je tape « clio 2017 120 » → 6 suggestions, toutes Clio 2017 entre 115 et 125 ch, avec année, kW et carburant : Renault Clio 1.2 · 118 ch 2017 · 87 kW · 1 165 kg · SP95-E10 · D.2 5RBU0C | Renault Clio 1.2 · 118 ch 2017 · 87 kW · 1 165 kg · SP95-E10 · D.2 5RBU0D | Renault Clio 1.2 · 118 ch 2017 · 87 kW · 1 243 kg · SP95-E10 · D.2 7RBU0C | Renault Clio 1.2 · 118 ch 2017 · 87 kW · 1 270 kg · SP95-E10 · D.2 7RBU0D | Renault Clio 1.2 · 120 ch 2017 · 88 kW · 1 255 kg · SP95-E10 · D.2 2R401E | Renault Clio 1.2 · 120 ch 2017 · 88 kW · 1 165 kg · SP95-E10 · D.2 5R400E → capture `V-2.3-02-apres.png` ✓ (13:48:03Z, md5 9bc5666c)
- Step 3: la première suggestion (sélectionnée au clavier) → « Renault Clio 1.2 · 118 ch 2017 · 87 kW · 1 165 kg · SP95-E10 · D.2 5RBU0C » → capture `V-2.3-03-avant.png` ✓ (13:48:04Z, md5 b78c73bc)
- Step 4: je la touche → fiche « Renault Clio 1.2 · 118 ch » 2017 · 87 kW · 118 ch · 1 165 kg · SP95-E10 (data-cle RENAULT·R·5RBU·5RBU0C·2017) ; « Enregistrer ma voiture » actif → capture `V-2.3-04-apres.png` ✓ (13:48:04Z, md5 c12167ff)

### Issues Found
- aucune sur la version déployée à cette passe.

## V-2.1 — Saisir le code D.2

### Happy Path
- Step 1: écran Ma voiture, je touche le champ D.2 → champ D.2 vide et sélectionné (focus d2) ; « Enregistrer ma voiture » désactivé → capture `V-2.1-01-avant.png` ✓ (13:47:37Z, md5 d246204e)
- Step 2: je tape « 5RBU0C » (code déjà en cache versions_eea) → fiche « Renault Clio 1.2 · 118 ch » : année 2017 · 87 kW · 118 ch · 1 197 cm³ · 1 165 kg · SP95-E10 · 118 g/km (NEDC) · « Base européenne EEA » ; liste : Renault Clio 1.2 · 118 ch 2017 · 87 kW · 1 165 kg · SP95-E10 · 13 864 immatriculées Renault Clio 1.2 · 118 ch 2018 · 87 kW · 1 165 kg · SP95-E10 · 11 043 immatriculées → capture `V-2.1-02-apres.png` ✓ (13:47:39Z, md5 2e1012d9)
- Step 3: code partagé par plusieurs versions, jamais demandé à l'appli : je tape « HNSJC1B000 » sauf le dernier caractère → champ « HNSJC1B00 » ; HNSJC1B000 absent de versions_eea (0 ligne, lu par l'API avant la saisie) → capture `V-2.1-03-avant.png` ✓ (13:47:41Z, md5 0c8591ee)
- Step 4: je tape le dernier caractère (« HNSJC1B000 ») puis je choisis la 2e version → 4 versions, la plus immatriculée en tête (6221 ≥ 1334 ≥ 773 ≥ 329…) ; marques Vauxhall, Peugeot, Citroen ; années 2019 ; masses 1 370, 1 395, 1 479, 1 278 kg ; 1re : « Vauxhall Grandland X Sport Nav Turbo Ss 1.2 2019 · — kW · 1 370 kg · SP95-E10 · 6 221 immatriculées » ; 2e touchée → fiche « Peugeot 3008 Allure S/S 1.2 » → capture `V-2.1-04-apres.png` ✓ (13:47:46Z, md5 2062bd67)
- Step 5: je commence à taper en minuscules avec espaces : « r 5rbu » → champ « R 5RBU » (saisie en minuscules mise en majuscules à la frappe) ; pas de recherche (5 caractères sans espaces) → capture `V-2.1-05-avant.png` ✓ (13:47:47Z, md5 a47841db)
- Step 6: je finis « r 5rbu 5rbu0c » → champ « R 5RBU 5RBU0C » ; requête envoyée « d2=R 5RBU 5RBU0C » ; fiche « Renault Clio 1.2 · 118 ch · 2017 » (data-cle RENAULT·R·5RBU·5RBU0C·2017) : reconnu comme 5RBU0C → capture `V-2.1-06-apres.png` ✓ (13:47:49Z, md5 abdd8900)

### Edge Case / constats
- Step 2 — écart de libellé face au plan : l'écran nomme « Renault Clio 1.2 · 118 ch » ; le plan dit « Renault Clio 1.2 TCe 120 ». La base EEA ne porte ni « TCe » ni « 120 » (Cn = CLIO) ; les chiffres sont ceux du plan.
- Step 2 — cache : 5RBU0C présent dans versions_eea AVANT la saisie (2 lignes, années 2017/2018) : c'est le chemin « version déjà en cache ».
- Step 4 — chemin « jamais demandée » : HNSJC1B000 absent du cache avant, 4 ligne(s) dans versions_eea après (écrites par la fonction).

### Issues Found
- aucune sur la version déployée à cette passe.

## V-1.2 — Voir ma voiture

### Happy Path
- Step 1: la Clio enregistrée (accueil, juste après « Enregistrer ma voiture ») → accueil « Renault Clio » « 1.2 · 118 ch · 2017 · SP95-E10 » ; onglet onglet-trajet ; localStorage pt-voiture-v1 = 5RBU0C → capture `V-1.2-01-avant.png` ✓ (13:48:07Z, md5 25c9bd31)
- Step 2: l'accueil s'affiche (page rechargée) → ÉCART DE LIBELLÉ : l'écran montre « Renault Clio » et « 1.2 · 118 ch · 2017 · SP95-E10 », le plan attend « Renault Clio IV » et « 1.2 TCe 120 · 2017 · SP95-E10 » ; la base EEA (Cn = CLIO) ne porte ni « IV » ni « TCe 120 » → capture `V-1.2-02-apres.png` ✗ (13:48:08Z, md5 25c9bd31)
- Step 3: l'accueil, « Changer » sélectionné au clavier → focus sur « Changer » → capture `V-1.2-03-avant.png` ✓ (13:48:08Z, md5 7ff02c6d)
- Step 4: je touche « Changer » → écran Ma voiture, D.2 « » et recherche « » vides ; aucune fiche (0) → capture `V-1.2-04-apres.png` ✓ (13:48:09Z, md5 a8228399)
- Step 5: l'appli telle que je la laisse, juste avant de fermer le navigateur (puis relance sur le même profil) → URL https://plein-et-trajet.vercel.app/ ; accueil « Renault Clio » ; localStorage pt-voiture-v1 = 5RBU0C → capture `V-1.2-05-avant.png` ✓ (13:48:10Z, md5 25c9bd31)
- Step 6: je rouvre l'appli → accueil : « Renault Clio » « 1.2 · 118 ch · 2017 · SP95-E10 », rien ressaisi → capture `V-1.2-06-apres.png` ✓ (13:48:12Z, md5 25c9bd31)

### Edge Case / constats
- Step 5 — navigateur fermé puis relancé sur le même profil : onglet about:blank avant d'ouvrir l'appli.

### Issues Found
- Step 2 (V-1.2-02-apres.png) : ÉCART DE LIBELLÉ : l'écran montre « Renault Clio » et « 1.2 · 118 ch · 2017 · SP95-E10 », le plan attend « Renault Clio IV » et « 1.2 TCe 120 · 2017 · SP95-E10 » ; la base EEA (Cn = CLIO) ne porte ni « IV » ni « TCe 120 »

## V-2.2 — Vérifier et enregistrer

### Happy Path
- Step 1: la fiche de ma version (5RBU0C, 2017) affichée → fiche « Renault Clio 1.2 · 118 ch · 2017 » ; bouton « Enregistrer ma voiture » actif → capture `V-2.2-01-avant.png` ✓ (13:48:06Z, md5 c150a3a4)
- Step 2: je touche « Enregistrer ma voiture » → accueil : « Renault Clio » « 1.2 · 118 ch · 2017 · SP95-E10 » ; localStorage pt-voiture-v1 = Renault Clio 5RBU0C 2017 → capture `V-2.2-02-apres.png` ✓ (13:48:07Z, md5 25c9bd31)
- Step 3: aucune version identifiée : D.2 vide, « zz » dans la recherche par nom → D.2 «  », recherche « zz » (moins de 3 caractères : pas de recherche) ; aucune fiche (0) → capture `V-2.2-03-avant.png` ✓ (13:47:58Z, md5 d9b29b3f)
- Step 4: je regarde « Enregistrer ma voiture » (D.2 incomplet « 5RB ») → aucune fiche ; « Enregistrer ma voiture » désactivé (disabled) → capture `V-2.2-04-apres.png` ✓ (13:47:58Z, md5 e0302c2c)

### Edge Case / constats
- Step 2 — après fermeture du navigateur et relance sur le même profil, l'accueil rappelle la même voiture (V-1.2-06).

### Issues Found
- aucune sur la version déployée à cette passe.

## V-5.3 — Rechercher dans cette zone

### Happy Path
- Step 1: la carte des stations (trajet en cours) → en-tête « Autour de moi » ; 8 stations ; centre 43.913, 2.142 zoom 10.0 → capture `V-5.3-01-avant.png` ✓ (13:48:36Z, md5 0829d519)
- Step 2: je fais glisser la carte vers Montauban (4 glissements au doigt-souris) → bouton « Rechercher dans cette zone » affiché ; liste inchangée (8 stations, mêmes id) ; en-tête « Autour de moi » ; centre 44.018, 1.415 → capture `V-5.3-02-apres.png` ✓ (13:48:43Z, md5 276baaf1)
- Step 3: le bouton « Rechercher dans cette zone » (carte recentrée sur Montauban d'un dernier glissement) → centre 44.017, 1.355 ; liste toujours celle d'avant (8 stations) → capture `V-5.3-03-avant.png` ✓ (13:48:45Z, md5 a153c721)
- Step 4: je touche « Rechercher dans cette zone » → bouton disparu ; en-tête « Autour de Montauban » ; 16 stations, toutes à moins de 11.6 km du centre affiché (44.017, 1.355), 16 pastilles ; 1re (Moins cher) « TotalEnergies Montauban 63,4 km · il y a 2 h · −16,6 c vs France 1,990 €/L » → capture `V-5.3-04-apres.png` ✓ (13:48:46Z, md5 eb6254a8)

### Issues Found
- aucune sur la version déployée à cette passe.

## V-3.1 — Suivre en direct

### Happy Path
- Step 1: enregistrement en cours, 200 positions rejouées → 19 km/h · 0,8 km · 0,06 L · 0,14 € · 0:03 · 14 km/h moy. · 8,2 L/100 · 200 points → capture `V-3.1-01-avant.png` ✓ (13:48:22Z, md5 db993e33)
- Step 2: je roule : 200 positions de plus (1 par seconde d'horloge) → vitesse lue après chaque position : 49 changements sur 200 s (la vitesse est redessinée à chaque position, soit chaque seconde ; plus longue valeur identique : 57 s, arrêts du GPX compris) ; courbe « Vitesse des 3 dernières minutes » ; 19 km/h · 0,8 km · 0,06 L · 0,14 € · 0:03 · 14 km/h moy. · 8,2 L/100 · 200 points → 29 km/h · 1,8 km · 0,16 L · 0,33 € · 0:06 · 17 km/h moy. · 8,4 L/100 · 400 points → capture `V-3.1-02-apres.png` ✓ (13:48:27Z, md5 30bdf456)
- Step 3: aucun prix choisi (aucune station touchée) → « Prix : moyenne France du jour · 2,156 €/L » → capture `V-3.1-03-avant.png` ✓ (13:48:28Z, md5 0b618fe8)
- Step 4: le coût en direct s'affiche → 0,20 L × 2,156 €/L (moyenne France du jour SP95-E10 lue par l'API : 2,156) = 0,431 → affiché 0,43 € ; « Prix : moyenne France du jour · 2,156 €/L » → capture `V-3.1-04-apres.png` ✓ (13:48:30Z, md5 6428cf4c)
- Step 5: un prix pris sur une station (« Utiliser ce prix ») → « Prix : mon prix · 1,990 €/L » ; 0 km/h · 2,5 km · 0,21 L · 0,41 € · 0:08 · 18 km/h moy. · 8,3 L/100 · 504 points → capture `V-3.1-05-avant.png` ✓ (13:48:48Z, md5 272f170c)
- Step 6: le coût en direct s'affiche (60 positions plus loin) → 0,21 L × 1,990 = 0,418 → affiché 0,41 € ; « Prix : mon prix · 1,990 €/L » → capture `V-3.1-06-apres.png` ✓ (13:48:50Z, md5 44b76657)

### Issues Found
- aucune sur la version déployée à cette passe.

## V-3.4 — Mettre en pause

### Happy Path
- Step 1: un enregistrement en cours (A68) → 105 km/h · 30,3 km · 2,17 L · 4,32 € · 0:29 · 62 km/h moy. · 7,2 L/100 · 1747 points → capture `V-3.4-01-avant.png` ✓ (13:50:02Z, md5 cfa962a6)
- Step 2: je touche « Pause » puis 20 positions arrivent → « En pause », bouton « Reprendre » ; km 30,3 et litres 2,17 inchangés malgré 0,58 km parcourus sur le GPX → capture `V-3.4-02-apres.png` ✓ (13:50:04Z, md5 7a9f62a0)
- Step 3: une pause pendant laquelle la voiture s'est déplacée → déplacement pendant la pause : 2,07 km (GPX, points 1750 → 1821) ; affiché toujours 30,3 km, 2,17 L → capture `V-3.4-03-avant.png` ✓ (13:50:08Z, md5 7a9f62a0)
- Step 4: je touche « Reprendre » puis 60 positions → « Enregistrement » ; km 30,3 → 32,1 (+1,8) = distance roulée depuis la reprise (1,72 km) ; les 2,07 km de la pause ne sont ni comptés ni chiffrés → capture `V-3.4-04-apres.png` ✓ (13:50:12Z, md5 2ef40dd4)

### Issues Found
- aucune sur la version déployée à cette passe.

## V-4.5 — Courbe de vitesse

### Happy Path
- Step 1: un trajet enregistré, rouvert depuis l'historique (écran Fin de trajet, haut) → onglet onglet-historique ; « Albi → Toulouse » ; « 21 oct. 2026 · 1 h 11 · Renault Clio » ; enregistré : true → capture `V-4.5-01-avant.png` ✓ (13:53:54Z, md5 700668c5)
- Step 2: la fin de trajet s'affiche (rouverte) — courbe de vitesse → « 63 km/h moy. · 7 accélérations » ; 600 points de courbe (≤ 600) pour 4350 s de trajet ; vitesse moyenne affichée 63 km/h ; km ÷ durée roulée (4278 s, pause exclue) = 63.0 km/h ; km ÷ durée totale = 61.9 km/h ; 7 accélérations → capture `V-4.5-02-apres.png` ✓ (13:53:55Z, md5 700668c5)

### Issues Found
- aucune sur la version déployée à cette passe.

## V-4.6 — Courbe de consommation

### Happy Path
- Step 1: un trajet enregistré (fin rouverte, haut de l'écran) → onglet onglet-historique ; « ← Historique » ; « Albi → Toulouse » → capture `V-4.6-01-avant.png` ✓ (13:53:55Z, md5 700668c5)
- Step 2: la courbe de consommation → « moy. 6,9 · pointe 18,5 L/100 » ; litres ÷ km × 100 = 5.191 ÷ 74.85 × 100 = 6.93 ; 600 points (moyenne simple des points de la courbe : 6.94, non pondérée par la distance) → capture `V-4.6-02-apres.png` ✓ (13:53:56Z, md5 2df38054)

### Issues Found
- aucune sur la version déployée à cette passe.

## V-1.1 — Ouvrir l'appli

### Happy Path
- Step 1: une voiture enregistrée sur ce téléphone (écran Trajet) → onglet onglet-trajet ; carte « Renault Clio · 1.2 · 118 ch · 2017 · SP95-E10 » ; voiture 5RBU0C → capture `V-1.1-01-avant.png` ✓ (13:48:09Z, md5 25c9bd31)
- Step 2: j'ouvre l'appli (nouvel onglet sur l'adresse de l'appli) → onglet Trajet sélectionné ; T1 « Renault Clio 1.2 · 118 ch · 2017 · SP95-E10 Changer Démarrer » ; ni prix ni nombre de personnes → capture `V-1.1-02-apres.png` ✓ (13:48:10Z, md5 25c9bd31)
- Step 3: premier lancement (profil neuf, aucune voiture), j'ouvre l'appli → T1 « Enregistre d'abord ta voiture Le code D.2 de ta carte grise, une seule fois. Démarrer » ; onglet sélectionné : Trajet ; localStorage pt-voiture-v1 absent → capture `V-1.1-03-avant.png` ✓ (13:47:36Z, md5 c213538e)
- Step 4: je touche « Démarrer » sans voiture → URL /voiture, écran Ma voiture (« Ma voiture ») ; aucun enregistrement en IndexedDB → capture `V-1.1-04-apres.png` ✓ (13:47:37Z, md5 c56659ae)
- Step 5: un trajet en cours d'enregistrement ; je suis sur l'onglet Stations (bandeau « Trajet en cours ») → onglet onglet-stations ; bandeau « ● Trajet en cours · 0,45 € » ; IndexedDB enregistrement : 485 points → capture `V-1.1-05-avant.png` ✓ (13:48:33Z, md5 9a9ed152)
- Step 6: je touche l'onglet Trajet → URL /en-route, écran En route « Enregistrement » (pas l'accueil) → capture `V-1.1-06-apres.png` ✓ (13:48:34Z, md5 8d38f12b)

### Issues Found
- aucune sur la version déployée à cette passe.

## V-1.3 — Démarrer

### Happy Path
- Step 1: la Clio enregistrée, localisation autorisée, position = 1er point du GPX (Albi, place du Vigan) → accueil « Renault Clio » ; permission géolocalisation accordée au contexte → capture `V-1.3-01-avant.png` ✓ (13:48:17Z, md5 25c9bd31)
- Step 2: je touche « Démarrer » → écran En route, « Enregistrement » (pastille animée : clignote infinite) ; 1re position enregistrée en 293 ms (data-points 1) ; IndexedDB enregistrement : présent → capture `V-1.3-02-apres.png` ✓ (13:48:18Z, md5 827bc8db)

### Issues Found
- aucune sur la version déployée à cette passe.

## V-5.6 — Trajet en cours

### Happy Path
- Step 1: un trajet en cours ; je touche l'onglet Stations (positions envoyées au rythme réel, 1 par seconde) → écran Stations ouvert ; bandeau « ● Trajet en cours · 0,93 € » → capture `V-5.6-01-avant.png` ✓ (13:49:11Z, md5 db5d99d7)
- Step 2: l'onglet Stations est ouvert → bandeau en haut « ● Trajet en cours · 1,04 € » (coût en direct ; 0,93 € sur En route juste avant) ; 8 stations listées → capture `V-5.6-02-apres.png` ✓ (13:49:17Z, md5 f3a187b8)
- Step 3: ce bandeau, 6 s plus tard (la voiture roule) → « ● Trajet en cours · 1,08 € » (« ● Trajet en cours · 1,04 € » 6 s plus tôt : le coût du bandeau suit le trajet) ; positions rejouées jusqu'au point 914 → capture `V-5.6-03-avant.png` ✓ (13:49:23Z, md5 f41c4537)
- Step 4: je touche l'onglet Trajet → écran En route revenu ; 913 points (913 au moment du toucher) ; 83 km/h · 6,9 km · 0,54 L · 1,08 € · 0:15 · 27 km/h moy. · 7,9 L/100 · 913 points → capture `V-5.6-04-apres.png` ✓ (13:49:24Z, md5 be551469)

### Edge Case / constats
- Step 2 — sans trajet en cours (même téléphone, avant Démarrer) : bandeau « retour-trajet » présent 0 fois (attendu 0).

### Issues Found
- aucune sur la version déployée à cette passe.

## V-5.5 — Utiliser ce prix

### Happy Path
- Step 1: trajet en cours ; la fiche de la 1re station « Moins cher » de Montauban → fiche « TotalEnergies Montauban » ; bouton « Utiliser 1,990 €/L pour mon trajet » ; prix SP95-E10 en base pour 82000018 : 1,990 €/L. (Le plan cite 2,103 €/L à titre d'exemple : le prix réel du jour est celui lu ici.) → capture `V-5.5-01-avant.png` ✓ (13:48:47Z, md5 e52466fb)
- Step 2: je touche « Utiliser 1,990 €/L pour mon trajet » → fiche fermée, écran En route ; « Prix : mon prix · 1,990 €/L » ; 0,21 L × 1,990 = 0,418 → 0,41 € (la fin de trajet est relue plus bas) → capture `V-5.5-02-apres.png` ✓ (13:48:48Z, md5 0c3652b0)

### Edge Case / constats
- Step 2 — la fin de ce même trajet, au prix de la station, est la capture V-4.7-01-avant.png (libellé « Mon prix », 3 personnes) ; fin de trajet : libellé « Mon prix », prix data-prix 1.99 (station : 1,990), coût 10,33 € essence.

### Issues Found
- aucune sur la version déployée à cette passe.

## V-5.1 — Stations autour de moi

### Happy Path
- Step 3: un trajet en cours (A68, 1 450 positions) ; j'ouvre l'onglet Stations → écran Stations autour de la voiture (43.8843, 1.9259, 21,6 km après Albi) : 5 stations toutes à moins de 10 km d'elle ; 1re « TotalEnergies Marssac-sur-Tarn 9,1 km · il y a 5 h · −16,6 c vs France 1,990 €/L » ; bandeau « ● Trajet en cours · 3,12 € » ; sur En route juste avant : 105 km/h · 21,6 km · 1,52 L · 3,02 € · 0:24 · 54 km/h moy. · 7,0 L/100 · 1448 points → capture `V-5.1-03-avant.png` ✓ (13:49:39Z, md5 2cbd6370)
- Step 4: je reviens au trajet (onglet Trajet) après 12 s dans Stations → distance 21,6 → 22,0 km, points 1448 → 1462 : l'enregistrement a continué pendant Stations → capture `V-5.1-04-apres.png` ✓ (13:49:52Z, md5 a23bf523)

### Issues Found
- aucune sur la version déployée à cette passe.

## V-3.5 — Arrêter

### Happy Path
- Step 1: un enregistrement de plus de 1 km (arrivée au Capitole, Toulouse) → 10 km/h · 74,9 km · 5,19 L · 10,33 € · 1:11 · 63 km/h moy. · 6,9 L/100 · 4275 points → capture `V-3.5-01-avant.png` ✓ (13:53:49Z, md5 4e6df6a0)
- Step 2: je touche « Arrêter » → « Albi → Toulouse » ; « 21 oct. 2026 · 1 h 11 · Renault Clio » ; 5,19 L (5.191), 74,9 km (74.85), 6,9 L/100 km moy. → capture `V-3.5-02-apres.png` ✓ (13:53:50Z, md5 6e44bcd2)

### Issues Found
- aucune sur la version déployée à cette passe.

## V-4.7 — Enregistrer ou supprimer

### Happy Path
- Step 1: un trajet qui vient d'être arrêté (3 personnes choisies) → prix « Mon prix » 1,990 €/L ; coût 10,33 € ; « 3,44 € chacun » ; boutons « Supprimer Enregistrer » → capture `V-4.7-01-avant.png` ✓ (13:53:52Z, md5 b5c905b1)
- Step 2: je touche « Enregistrer » → onglet Historique, en tête : « Albi → Toulouse 21 oct. · 74,9 km · SP95-E10 à 1,990 €/L · 3,44 € chacun 10,33 € » ; IndexedDB : prix 1.99 (station), carburant SP95-E10, 3 personnes, enregistré ; totaux « 1 trajet 74,9 km 10,33 € essence » → capture `V-4.7-02-apres.png` ✓ (13:53:53Z, md5 52eb674b)

### Edge Case / constats
- Démonstration : coût 10,33 € au prix de la station 1,990 €/L, partagé à 3.

### Issues Found
- aucune sur la version déployée à cette passe.

## Régression (passage voiture,trajet)
- (rejouée par la spec m5-regression)

## Erreurs de page relevées
- aucune

---

# Passage r2final cas,stations,historique,retraits — début 2026-10-21T13:54:05.024Z

Appli déployée https://plein-et-trajet.vercel.app, base Supabase réelle, Playwright (bibliothèque), Chromium headless 390 × 844, toucher, fr-FR, Europe/Paris.
Réel : base EEA (fonction voiture-eea), moyennes du jour (FR SP95-E10 2,156 €/L, Gazole 2,368 €/L), stations et prix du jour, géocodage inverse (fonction lieux), refus de localisation (contexte sans permission), coupure réseau (context.setOffline).
Rejoué : géolocalisation par context.setGeolocation depuis tests/e2e/fixtures/albi-toulouse.gpx (et ses dérivés immobile / tunnel, et barcelone.gpx : vrai itinéraire Valhalla fabriqué par creer-gpx.mjs barcelone), horloge de la page accélérée par page.clock (méthode r1a : avancer l'horloge, poser la position, attendre que T3 l'ait comptée), au rythme réel (1 point/s) pendant les passages par Stations.

## V-1.3 — Démarrer (localisation refusée)

### Happy Path
- Step 3: la localisation refusée (contexte sans permission geolocation) → accueil « Renault Clio » ; permission géolocalisation : denied → capture `V-1.3-03-avant.png` ✓ (13:54:06Z, md5 1f66d5d0)
- Step 4: je touche « Démarrer » → « L'enregistrement a besoin de ta localisation Cadenas de la barre d'adresse → Position → Autoriser » ; URL / ; IndexedDB : enregistrement absent, 0 trajet → capture `V-1.3-04-apres.png` ✓ (13:54:07Z, md5 4cfb9d3a)

### Issues Found
- aucune sur la version déployée à cette passe.

## V-3.5 — Arrêter (cas limites)

### Happy Path
- Step 3: un enregistrement de moins de 1 km (150 positions) → 19 km/h · 0,5 km · 0,04 L · 0,09 € · 0:02 · 12 km/h moy. · 8,4 L/100 · 150 points → capture `V-3.5-03-avant.png` ✓ (13:54:14Z, md5 55a4ece6)
- Step 4: je touche « Arrêter » → « Trajet trop court : 0,5 km sur 1 minimum. Rien n'est ajouté à l'historique. Retour à l'accueil » ; IndexedDB : 0 trajet, pas de trajet arrêté, pas d'enregistrement → capture `V-3.5-04-apres.png` ✓ (13:54:15Z, md5 b9ab7181)
- Step 5: aucun réseau (context.setOffline(true)) juste avant l'arrêt — 420 positions → navigator.onLine = false ; « Hors ligne : le trajet continue, tout est calculé sur le téléphone. » ; 28 km/h · 2,0 km · 0,17 L · 0,36 € · 0:06 · 17 km/h moy. · 8,4 L/100 · 420 points ; « Prix : moyenne France du jour · 2,156 €/L » → capture `V-3.5-05-avant.png` ✓ (13:54:37Z, md5 34be479a)
- Step 6: la fin de trajet s'ouvre sans réseau → hors ligne (capture prise pendant la coupure) : titre « 43,928 · 2,146 → 43,917 · 2,144 » (coordonnées, noms pas encore connus) ; « Hors ligne : litres et coût calculés sur le téléphone ; les noms des lieux viendront au retour du réseau. » ; 0,168 L × 2,156 €/L (moyenne gardée au départ) = 0,36 € calculés sur le téléphone → capture `V-3.5-06-apres.png` ✓ (13:54:38Z, md5 581176b0)

### Edge Case / constats
- Step 6 — après la capture, retour du réseau (setOffline(false) → événement online) : le titre passe de « 43,928 · 2,146 → 43,917 · 2,144 » à « Albi → Albi » sans rien toucher ✓ ; « Hors ligne » affiché : 0 ; requêtes tentées pendant la coupure : 4 (refusées par le navigateur hors ligne).

### Issues Found
- aucune sur la version déployée à cette passe.

## V-3.E1 — Oubli d'arrêter

### Happy Path
- Step 1: un enregistrement en cours (700 positions, 4 km dans Albi) → 30 km/h · 2,8 km · 0,23 L · 0,51 € · 0:11 · 14 km/h moy. · 8,5 L/100 · 700 points → capture `V-3.E1-01-avant.png` ✓ (13:55:47Z, md5 e0082376)
- Step 2: vitesse < 3 km/h et position dans 50 m pendant 10 min (points 774 → 1375 du tracé dérivé) → « Trajet arrêté : immobile depuis 10 min. Reprendre C'est fini » au point 1375 (601 s après le début de l'immobilité) ; début daté 14:07:35 (point 774 reçu à 14:07:34, écart 1 s) ; 5 positions de plus : km 4,0 et litres 0,33 figés ; état « Immobile depuis 10 min » → capture `V-3.E1-02-apres.png` ✓ (13:57:34Z, md5 c2d7a3e6)
- Step 3: cette alerte (« C'est fini » sélectionné) → focus « C'est fini » → capture `V-3.E1-03-avant.png` ✓ (13:57:34Z, md5 46009f51)
- Step 4: je touche « C'est fini » → « Albi → Le Sequestre » « 21 oct. 2026 · 12 min · Renault Clio » ; arrivée datée 14:07:35 = début de l'immobilité (point 774, écart 1.0 s) ; durée 774 s : les 10 min d'arrêt ne comptent pas ; 4,02 km → capture `V-3.E1-04-apres.png` ✓ (13:57:36Z, md5 c740b44a)
- Step 5: cette alerte (2e trajet rejoué ; « Reprendre » sélectionné) → « Trajet arrêté : immobile depuis 10 min. Reprendre C'est fini » ; 775 points gardés → capture `V-3.E1-05-avant.png` ✓ (13:59:32Z, md5 258468ae)
- Step 6: je touche « Reprendre » → « Enregistrement » ; 775 points gardés (autant qu'à l'alerte), 4,0 km conservés → capture `V-3.E1-06-apres.png` ✓ (13:59:34Z, md5 99384b02)

### Edge Case / constats
- Garé (points 774 → 1365, bruit ±2 m, juste avant l'alerte) : km 4,0 → 4,0, litres 0,33 → 0,33, vitesse affichée relevée tous les 37 points : 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 km/h ✗ (r1 : 4,0 → 5,1 km et 5 à 10 km/h).
- Step 6 — après « Reprendre », 10 positions de plus (toujours garé) : 775 → 785 points (l'enregistrement repart) ; 0 km/h, 4,0 km, 0,33 L (inchangés).

### Issues Found
- bruit du GPS à l'arrêt encore compté

## V-3.E2 — GPS perdu

### Happy Path
- Step 1: un enregistrement en cours (A68, 121 positions, dernière avant le tunnel) → 105 km/h · 3,5 km · 0,23 L · 0,50 € · 0:02 · 105 km/h moy. · 6,7 L/100 · 121 points → capture `V-3.E2-01-avant.png` ✓ (13:59:46Z, md5 d000528e)
- Step 2: aucune position pendant 16 s → « GPS perdu (tunnel) · la distance est complétée à la sortie. » ; data-etat gps-perdu ; vitesse 0 km/h → capture `V-3.E2-02-apres.png` ✓ (13:59:47Z, md5 cacdb9a9)
- Step 3: le signal revient après 90 s sans position (tunnel de 3,00 km) → toujours « GPS perdu (tunnel) · la distance est complétée à la sortie. » ; 3,5 km figés → capture `V-3.E2-03-avant.png` ✓ (13:59:47Z, md5 cb23d209)
- Step 4: la position suivante arrive → km 3,5 → 6,5 (+3,0 km ; ligne droite entre les 2 positions 3.001 km, chemin réel 3,0007 km, à 120 km/h de moyenne) ; message disparu → capture `V-3.E2-04-apres.png` ✓ (13:59:48Z, md5 556ad97b)

### Issues Found
- aucune sur la version déployée à cette passe.

## V-4.2 — Mettre mon prix

### Happy Path
- Step 1: la fin de trajet (SP95-E10, moyenne du jour) → « Moyenne France du jour » 2.156 €/L ; coût 1,18 € → capture `V-4.2-01-avant.png` ✓ (13:59:53Z, md5 0442025b)
- Step 2: je touche le compteur, tape 1,989 et valide (Entrée) → « Mon prix » 1,989 €/L ; coût 0,546 × 1,989 = 1,09 € ; « Revenir à la moyenne » affiché → capture `V-4.2-02-apres.png` ✓ (13:59:53Z, md5 68f8e0fd)
- Step 3: mon prix saisi (« Revenir à la moyenne » sélectionné) → focus « Revenir à la moyenne » → capture `V-4.2-03-avant.png` ✓ (13:59:54Z, md5 8190ee9c)
- Step 4: je touche « Revenir à la moyenne » → « Moyenne France du jour » 2,156 €/L ; coût 1,18 € (comme avant la saisie) → capture `V-4.2-04-apres.png` ✓ (13:59:55Z, md5 cf9ca1f7)
- Step 5: le champ du prix ouvert (« 1,5 » tapé, pas validé) → champ « 1,5 » ouvert → capture `V-4.2-05-avant.png` ✓ (13:59:56Z, md5 bb4c9884)
- Step 6: j'appuie sur Échap → champ fermé ; prix toujours 2,156 €/L « Moyenne France du jour » ; focus revenu sur « Modifier le prix, 2,156 euros par litre » → capture `V-4.2-06-apres.png` ✓ (13:59:57Z, md5 5217422b)

### Issues Found
- aucune sur la version déployée à cette passe.

## V-4.1 — Prix de l'essence

### Happy Path
- Step 1: la fin d'un trajet en Clio SP95-E10 parti de France (juste avant « Arrêter ») → « Prix : moyenne France du jour · 2,156 €/L » ; 105 km/h · 8,2 km · 0,55 L · 1,18 € · 0:04 · 110 km/h moy. · 6,6 L/100 · 182 points → capture `V-4.1-01-avant.png` ✓ (13:59:50Z, md5 efe8e797)
- Step 2: l'écran Fin de trajet s'ouvre → sélecteur Gazole · SP95-E10 · SP95 · SP98 · E85 · GPLc, SP95-E10 choisi ; « Moyenne France du jour » ; compteur « Modifier le prix, 2,156 euros par litre » (3 décimales) = moyenne France SP95-E10 lue par l'API 2,156 ; coût 1,18 € essence → capture `V-4.1-02-apres.png` ✓ (13:59:51Z, md5 14e22fbb)
- Step 3: ce sélecteur (Gazole sélectionné au clavier) → focus « Gazole » → capture `V-4.1-03-avant.png` ✓ (13:59:52Z, md5 0656d766)
- Step 4: je touche Gazole → « Moyenne France du jour » 2,368 €/L (moyenne France Gazole de l'API 2,368) ; coût 0,546 × 2,368 = 1,29 € → capture `V-4.1-04-apres.png` ✓ (13:59:52Z, md5 9706ed23)
- Step 5: un départ hors de France : vrai itinéraire dans Barcelone (plaça de Catalunya → Sagrada Família, 3,2 km rejoués) → « Prix : moyenne Espagne du jour · 1,790 €/L » ; 18 km/h · 3,2 km · 0,26 L · 0,46 € · 0:11 · 17 km/h moy. · 8,0 L/100 · 674 points → capture `V-4.1-05-avant.png` ✓ (14:00:45Z, md5 2d3458c6)
- Step 6: l'écran Fin de trajet s'ouvre → « Barcelone → Barcelone » ; « Moyenne Espagne du jour » 1,790 €/L (moyenne Espagne SP95-E10 de l'API : 1,790) ; pays de départ enregistré ES → capture `V-4.1-06-apres.png` ✓ (14:00:54Z, md5 c7fe9ac7)

### Issues Found
- aucune sur la version déployée à cette passe.

## V-5.1 — Stations autour de moi

### Happy Path
- Step 1: la position autorisée (Albi) : accueil, en-tête « Autour de moi » → en-tête « Autour de moi » (position GPS reçue) ; position du contexte 43.92833, 2.145916 ; permission granted → capture `V-5.1-01-avant.png` ✓ (14:00:57Z, md5 25c9bd31)
- Step 2: je touche l'onglet Stations → en-tête « Autour de moi » ; ma position dans le cadre de la carte ; 8 stations à moins de 10 km, 8 pastilles ; 8 prix SP95-E10 identiques à la base (table prix) ; 1re « TotalEnergies Albi · Relais des Fontanelles 2,2 km · hier · −16,6 c vs France 1,990 €/L » → capture `V-5.1-02-apres.png` ✓ (14:01:03Z, md5 df457b0c)

### Issues Found
- aucune sur la version déployée à cette passe.

## V-5.2 — Choisir le carburant

### Happy Path
- Step 1: une Clio SP95-E10 enregistrée (accueil) ; dernier carburant regardé dans Stations : Gazole → accueil « Renault Clio · 1.2 · 118 ch · 2017 · SP95-E10 » ; localStorage pt-carburant = « Gazole » ; position Prayssac 44.5041, 1.1885 → capture `V-5.2-01-avant.png` ✓ (14:01:05Z, md5 25c9bd31)
- Step 2: j'ouvre l'onglet Stations → SP95-E10 choisi d'office (aria-pressed), malgré le dernier choix Gazole ; titre « Stations · SP95-E10 » → capture `V-5.2-02-apres.png` ✓ (14:01:10Z, md5 a03b9211)
- Step 3: la liste en SP95-E10 autour de Prayssac → 5 stations SP95-E10 : 46220005 TotalEnergies Prayssac 510 m | 46700001 Intermarché Puy-l'Évêque 3,6 km | 46220003 Intermarché Prayssac 310 m | 46220002 Carrefour Market Prayssac 1,1 km | 46140003 Système U Parnac 9,7 km ; 46220005 en base : E85 0.934, SP95-E10 1.99 (aucune ligne Gazole) → capture `V-5.2-03-avant.png` ✓ (14:01:10Z, md5 a03b9211)
- Step 4: je touche Gazole → titre « Stations · Gazole » ; 4 lignes et 4 pastilles au prix gazole de la base (contre 5 lignes et 5 pastilles en SP95-E10) ; stations SP95-E10 sans gazole en base : 46220005 → absentes de la liste et de la carte (pastille 46220005 : 0) ; lignes : 46700001 2,347 | 46220003 2,349 | 46220002 2,359 | 46140003 2,369 → capture `V-5.2-04-apres.png` ✓ (14:01:12Z, md5 6c5d9a13)

### Issues Found
- aucune sur la version déployée à cette passe.

## V-5.4 — Trier

### Happy Path
- Step 1: la liste des stations (SP95-E10, tri « Moins cher ») → tri prix ; 8 stations → capture `V-5.4-01-avant.png` ✓ (14:01:15Z, md5 df457b0c)
- Step 2: je touche « Plus proche » → « Plus proche » : distances croissantes 1,8 ≤ 1,9 ≤ 2,2 ≤ 2,3 ≤ 3,1 ≤ 3,3 ≤ 6,8 ≤ 9,4… (8) ; « Moins cher » : prix croissants 1,990 ≤ 1,990 ≤ 2,149 ≤ 2,178 ≤ 2,178 ≤ 2,178… ; capture sur « Plus proche » → capture `V-5.4-02-apres.png` ✓ (14:01:17Z, md5 5394f965)

### Issues Found
- aucune sur la version déployée à cette passe.

## V-5.5 — Utiliser ce prix

### Happy Path
- Step 3: aucun trajet en cours ; fiche de la station la moins chère → fiche « TotalEnergies Albi · Relais des Fontanelles » ; bouton « Utiliser 1,990 €/L pour mon trajet » ; pas de bandeau (0) → capture `V-5.5-03-avant.png` ✓ (14:01:19Z, md5 b87eb70b)
- Step 4: je touche ce bouton → accueil ouvert (URL /) ; prix gardé : pt-prix-choisi = {"prix":1.99,"carburant":"SP95-E10","station":"TotalEnergies Albi · Relais des Fontanelles"} (la capture montre l'accueil après l'essai de démarrage, revenu par « trop court ») → capture `V-5.5-04-apres.png` ✓ (14:01:21Z, md5 25c9bd31)
- Step 5: une station qui ne vend pas le SP95-E10 de ma voiture (liste Gazole) → « Carrefour Market Puygouzon 4,3 km · il y a 6 h · −1,3 c vs France 2,355 €/L » (81990003) : aucun prix SP95-E10 vendu en base (absent ou rupture) → capture `V-5.5-05-avant.png` ✓ (14:01:26Z, md5 adef250f)
- Step 6: sa fiche s'ouvre → fiche « Carrefour Market Puygouzon » ; SP95-E10 « SP95-E10 non vendu » ; pas de bouton « Utiliser … pour mon trajet » → capture `V-5.5-06-apres.png` ✓ (14:01:26Z, md5 5a636c06)

### Edge Case / constats
- Step 4 — trajet démarré ensuite : « Prix : mon prix · 1,990 €/L » ; pt-prix-choisi vidé au départ (null).

### Issues Found
- aucune sur la version déployée à cette passe.

## V-5.7 — Europe et Royaume-Uni

### Happy Path
- Step 1: une position à Barcelone (41,3874, 2,1686) : accueil, en-tête « Autour de moi » → en-tête « Autour de moi » ; position du contexte 41.3874, 2.1686 (Barcelone) ; la V1 ne montre la position que dans l'onglet Stations → capture `V-5.7-01-avant.png` ✓ (14:01:27Z, md5 25c9bd31)
- Step 2: l'onglet Stations s'ouvre → 153 stations espagnoles (pays ES en base), 153 pastilles, prix SP95-E10 = base ; 1re « Galp Sant adria de besos · Galp 6,8 km · il y a 24 min · −27,6 c vs Espagne 1,514 €/L » → capture `V-5.7-02-apres.png` ✓ (14:01:47Z, md5 748d40a2)
- Step 3: une position à Dartford (Royaume-Uni) → 18 stations, pays GB ; 1re « Morrisons · MFG Morrisons Grays, London Road, GRAYS 7,9 km · il y a 15 h · −4,8 c vs Royaume-Uni 2,022 €/L » → capture `V-5.7-03-avant.png` ✓ (14:01:55Z, md5 73a4a1dd)
- Step 4: je lis une station (fiche) → fiche « Morrisons · MFG Morrisons Grays, London Road, GRAYS » ; Gazole 2,343 €/L ← 196,9 p/L ; SP95 2,022 €/L ← 169,9 p/L ; SP95-E10 2,022 €/L ← 169,9 p/L ; SP98 2,260 €/L ← 189,9 p/L ; « 1 € = 0,8403 £ · BCE 20/10 » (taux BCE en base 0.84028) → capture `V-5.7-04-apres.png` ✓ (14:01:57Z, md5 33b5f2a5)
- Step 5: un pays qui ne publie pas ses prix station par station : Belgique (position Bruxelles), carte glissée → statut du pays en base : « aucun » ; bouton « Rechercher dans cette zone » → capture `V-5.7-05-avant.png` ✓ (14:02:39Z, md5 90f49ad5)
- Step 6: j'y cherche dans cette zone → « Ce pays ne publie pas les prix station par station Moyenne nationale · Belgique · SP95-E10 : 1,977 €/L » ; en-tête « Autour de moi » ; 0 ligne, pastilles 0 → capture `V-5.7-06-apres.png` ✓ (14:02:47Z, md5 6856fb8a)

### Issues Found
- aucune sur la version déployée à cette passe.

> Flux « historique » interrompu à 14:03:56Z : clock.runFor: Target page, context or browser has been closed

> Flux « retraits » interrompu à 14:03:57Z : browser.newContext: Target page, context or browser has been closed

## V-4.7 — Enregistrer ou supprimer (supprimer, appli fermée)

### Happy Path
- Step 3: un trajet qui vient d'être arrêté (celui de la coupure réseau, noms complétés) → « Albi → Albi » ; boutons « Supprimer Enregistrer » → capture `V-4.7-03-avant.png` ✓ (13:54:39Z, md5 b1db7d42)
- Step 4: je touche « Supprimer » → accueil (URL /) ; IndexedDB : 0 trajet, aucun trajet arrêté ni point gardé ; Historique : « Aucun trajet enregistré. » → capture `V-4.7-04-apres.png` ✓ (13:54:40Z, md5 25c9bd31)
- Step 5: un trajet arrêté (Barcelone), pas encore tranché ; je ferme l'appli → trajet eb4a6912-8ff0-4e87-957b-ff81534d3c13 ; boutons « Supprimer Enregistrer » → capture `V-4.7-05-avant.png` ✓ (14:00:54Z, md5 663dd0b1)
- Step 6: je rouvre l'appli (navigateur relancé, même profil) → URL /fin ; même trajet eb4a6912-8ff0-4e87-957b-ff81534d3c13 « Barcelone → Barcelone » ; « Supprimer Enregistrer » → capture `V-4.7-06-apres.png` ✓ (14:00:56Z, md5 c6bf6651)

### Issues Found
- aucune sur la version déployée à cette passe.

## V-6.1 — Ouvrir l'historique

### Happy Path


### Issues Found
- aucune sur la version déployée à cette passe.

## V-6.2 — Totaux

### Happy Path


### Issues Found
- aucune sur la version déployée à cette passe.

## V-6.3 — Lire un trajet

### Happy Path


### Issues Found
- aucune sur la version déployée à cette passe.

## V-6.4 — Revoir, corriger, supprimer

### Happy Path


### Issues Found
- aucune sur la version déployée à cette passe.

## V-4.3 — Coût de l'essence

### Happy Path


### Issues Found
- aucune sur la version déployée à cette passe.

## V-4.4 — Partager

### Happy Path


### Issues Found
- aucune sur la version déployée à cette passe.

## V1-retraits — Contrôle négatif : ce qui sort de la V1

### Happy Path


### Issues Found
- aucune sur la version déployée à cette passe.

## Régression (passage cas,stations,historique,retraits)
- US-4.E2 (T4) : « 7 » validé → « Entre un prix entre 0,50 et 4,00 €/L », prix gardé 2.156 ✓

## Erreurs de page relevées
- aucune

---

# Passage r2final historique,retraits — début 2026-10-21T14:04:11.210Z

Appli déployée https://plein-et-trajet.vercel.app, base Supabase réelle, Playwright (bibliothèque), Chromium headless 390 × 844, toucher, fr-FR, Europe/Paris.
Réel : base EEA (fonction voiture-eea), moyennes du jour (FR SP95-E10 2,156 €/L, Gazole 2,368 €/L), stations et prix du jour, géocodage inverse (fonction lieux), refus de localisation (contexte sans permission), coupure réseau (context.setOffline).
Rejoué : géolocalisation par context.setGeolocation depuis tests/e2e/fixtures/albi-toulouse.gpx (et ses dérivés immobile / tunnel, et barcelone.gpx : vrai itinéraire Valhalla fabriqué par creer-gpx.mjs barcelone), horloge de la page accélérée par page.clock (méthode r1a : avancer l'horloge, poser la position, attendre que T3 l'ait comptée), au rythme réel (1 point/s) pendant les passages par Stations.

## V-6.1 — Ouvrir l'historique

### Happy Path
- Step 1: des trajets enregistrés en septembre et en octobre 2026 (deux trajets réellement rejoués, horloge de la page posée au 14/09 08:00 et au 05/10 17:30) : l'historique juste après le second « Enregistrer » → IndexedDB : 2026-09-14 2.5 km ; 2026-10-05 6.6 km ; lignes « Albi → Albi 5 oct. · 6,6 km · SP95-E10 à 2,156 €/L 1,01 € | Albi → Albi 14 sept. · 2,5 km · SP95-E10 à 2,156 €/L 0,45 € » → capture `V-6.1-01-avant.png` ✓ (14:05:23Z, md5 29bde4ad)
- Step 2: je touche l'onglet Historique → groupes Octobre 2026 puis Septembre 2026 ; lignes : Albi → Albi 5 oct. · 6,6 km · SP95-E10 à 2,156 €/L 1,01 € | Albi → Albi 14 sept. · 2,5 km · SP95-E10 à 2,156 €/L 0,45 € → capture `V-6.1-02-apres.png` ✓ (14:05:30Z, md5 7996d1c1)
- Step 3: aucun trajet enregistré (téléphone neuf, voiture enregistrée) : l'historique ouvert par son adresse → IndexedDB : 0 trajet ; « Aucun trajet enregistré. » → capture `V-6.1-03-avant.png` ✓ (14:05:34Z, md5 fb3d3343)
- Step 4: j'ouvre l'onglet Historique → « Aucun trajet enregistré. » ; totaux « 0 trajets 0,0 km 0,00 € essence » → capture `V-6.1-04-apres.png` ✓ (14:05:36Z, md5 1626ed1f)

### Issues Found
- aucune sur la version déployée à cette passe.

## V-6.2 — Totaux

### Happy Path
- Step 1: ÉTAT PRÉPARÉ : 4 trajets de 77, 152, 245 et 243 km écrits en IndexedDB (format TrajetV1 de l'appli) — leurs lignes dans l'historique → trajets 77 km 4,93 L, 152 km 10,03 L, 245 km 16,91 L, 243 km 16,28 L au prix moyen France SP95-E10 du jour 2,156 → coûts 10,63 + 21,62 + 36,46 + 35,10 ; lignes « Albi → Montpellier 16 oct. · 243 km · SP95-E10 à 2,156 €/L 35,10 € | Toulouse → Bordeaux 12 oct. · 245 km · SP95-E10 à 2,156 €/L 36,46 € | Albi → Cahors 8 oct. · 152 km · SP95-E10 à 2,156 €/L 21,62 € | Albi → Toulouse 3 oct. · 77,0 km · SP95-E10 à 2,156 €/L 10,63 € » → capture `V-6.2-01-avant.png` ✓ (14:05:41Z, md5 b4b52cfd)
- Step 2: l'historique s'affiche → totaux « 4 trajets 717 km 103,81 € essence » = 4 trajets, 717 km, 103,81 € (somme des coûts des lignes 35,10 + 36,46 + 21,62 + 10,63) → capture `V-6.2-02-apres.png` ✓ (14:05:44Z, md5 076cfcd8)
- Step 3: un trajet corrigé : celui de 152 km rouvert, prix passé à 1,899 €/L → « Mon prix » ; coût 19,05 € essence → capture `V-6.2-03-avant.png` ✓ (14:05:48Z, md5 67ae4c16)
- Step 4: je reviens à l'historique → totaux recalculés « 4 trajets 717 km 101,24 € essence » (= 101,24 €) ; ligne 152 km : Albi → Cahors 8 oct. · 152 km · SP95-E10 à 1,899 €/L 19,05 € → capture `V-6.2-04-apres.png` ✓ (14:05:50Z, md5 fdaa8b42)

### Issues Found
- aucune sur la version déployée à cette passe.

## V-6.3 — Lire un trajet

### Happy Path
- Step 1: ÉTAT PRÉPARÉ : un trajet enregistré à 3 personnes (Albi → Rodez) et un trajet seul, écrits en IndexedDB → prep-3p 92.4 km 3 pers. ; prep-seul 76.8 km 1 pers. → capture `V-6.3-01-avant.png` ✓ (14:05:55Z, md5 591d58cc)
- Step 2: je lis sa ligne (sélectionnée au clavier) → ligne « Albi → Rodez 18 oct. · 92,4 km · SP95-E10 à 2,156 €/L · 4,32 € chacun 12,96 € » (date, départ → arrivée, km, coût, 4,32 € chacun) ; trajet seul : « Toulouse → Albi 19 oct. · 76,8 km · SP95-E10 à 2,156 €/L 10,44 € » sans part → capture `V-6.3-02-apres.png` ✓ (14:05:56Z, md5 5b176cea)
- Step 3: une ligne (le trajet seul, sélectionné au clavier) → « Toulouse → Albi 19 oct. · 76,8 km · SP95-E10 à 2,156 €/L 10,44 € » → capture `V-6.3-03-avant.png` ✓ (14:05:57Z, md5 da46a748)
- Step 4: je la touche → fin de ce trajet « Toulouse → Albi » ; onglet Historique sélectionné ; « ← Historique » ; bouton « Supprimer ce trajet » → capture `V-6.3-04-apres.png` ✓ (14:06:00Z, md5 af149243)

### Issues Found
- aucune sur la version déployée à cette passe.

## V-6.4 — Revoir, corriger, supprimer

### Happy Path
- Step 1: un trajet rouvert depuis l'historique (le trajet seul), réglages de prix et de personnes → prix « Moyenne France du jour » 2.156 ; 1 personne → capture `V-6.4-01-avant.png` ✓ (14:06:03Z, md5 620bbdfc)
- Step 2: je change son carburant (Gazole) et son nombre de personnes (2), puis je reviens à l'historique → IndexedDB : Gazole, 2 personnes, 2.368 €/L ; ligne « Toulouse → Albi 19 oct. · 76,8 km · Gazole à 2,368 €/L · 5,73 € chacun 11,46 € » → capture `V-6.4-02-apres.png` ✓ (14:06:07Z, md5 c26d471a)
- Step 3: un trajet rouvert (Albi → Rodez, 3 personnes) → bouton « Supprimer ce trajet » → capture `V-6.4-03-avant.png` ✓ (14:06:09Z, md5 d0d25525)
- Step 4: je touche « Supprimer ce trajet » → disparu de la liste ; totaux « 1 trajet 76,8 km 11,46 € essence » (1 trajet, 76,8 km) ; IndexedDB 1 trajet → capture `V-6.4-04-apres.png` ✓ (14:06:12Z, md5 b24360d7)

### Issues Found
- aucune sur la version déployée à cette passe.

## V-4.3 — Coût de l'essence

### Happy Path
- Step 1: ÉTAT PRÉPARÉ : un trajet arrêté de 41,2 L, prix 2,161 €/L (« Mon prix »), écrit en IndexedDB (en_cours/arrete) — sa fin de trajet, haut de l'écran → trajet arrêté en attente : 588 km ; écran « 41,20 litres », prix data-prix 2.161 (« Mon prix ») → capture `V-4.3-01-avant.png` ✓ (14:06:21Z, md5 ef8ee2f9)
- Step 2: la fin de trajet s'affiche (appli ouverte : le trajet arrêté revient) — le coût → « 89,03 € essence » (41,2 × 2,161 = 89.0332 → 89,03) ; libellé « Mon prix » → capture `V-4.3-02-apres.png` ✓ (14:06:22Z, md5 ef8ee2f9)
- Step 3: le prix changé (réseau coupé : context.setOffline(true)) — « 2,050 » tapé → navigator.onLine = false ; champ « 2,050 » → capture `V-4.3-03-avant.png` ✓ (14:06:23Z, md5 f3c2e75b)
- Step 4: je valide (Entrée), toujours sans réseau → « 84,46 € essence » = 41,2 × 2,050 recalculé aussitôt, hors ligne (navigator.onLine false) → capture `V-4.3-04-apres.png` ✓ (14:06:24Z, md5 7c8359a8)

### Edge Case / constats
- Step 4 — toujours hors ligne : « Revenir à la moyenne » → 88,83 € (41,2 × 2,156), puis Gazole → 97,56 € (41,2 × 2,368) ✓, sur les moyennes gardées dans le trajet ; requêtes émises pendant ces changements : 0 (aucune).

### Issues Found
- aucune sur la version déployée à cette passe.

## V-4.4 — Partager

### Happy Path
- Step 1: un coût de 89,03 € (SP95-E10, mon prix 2,161 €/L), 1 personne → « 89,03 € essence » ; « Seul : tout pour toi. » → capture `V-4.4-01-avant.png` ✓ (14:06:26Z, md5 ef3e9ea9)
- Step 2: je passe le nombre de personnes à 3 avec « + » → 3 personnes → « 29,68 € chacun » (89,03 ÷ 3 = 29,677) → capture `V-4.4-02-apres.png` ✓ (14:06:27Z, md5 bd38827c)
- Step 3: 1 personne → 1 personne ; « Seul : tout pour toi. » → capture `V-4.4-03-avant.png` ✓ (14:06:28Z, md5 3f3b8da5)
- Step 4: l'écran s'affiche ; j'essaie de descendre sous 1 et de monter au-delà de 9 → « Seul : tout pour toi. » ; « − » désactivé à 1 (toucher : reste 1) ; 10 touchers sur « + » → 9, « + » désactivé ; revenu à 1 : « Seul : tout pour toi. » → capture `V-4.4-04-apres.png` ✓ (14:06:33Z, md5 7dbd9292)

### Edge Case / constats
- Step 4 — une seule image ne peut pas montrer les deux bornes : la capture est à 1 personne (« Seul : tout pour toi. », « − » désactivé) ; la borne 9 (« + » désactivé après 10 touchers) est relevée dans le constat de l'étape, puis le compteur est ramené à 1.

### Issues Found
- aucune sur la version déployée à cette passe.

## V1-retraits — Contrôle négatif : ce qui sort de la V1

### Happy Path
- Step 1: l'appli déployée, journal réseau Playwright ouvert sur TOUS les contextes du passage (écoute context.on('request'), y compris les processus précédents du même passage, relus dans exploration/m5-resultats-<passage>-*.json) → 112 requêtes de ce processus → capture `V1-retraits-01-avant.png` ✓ (14:06:36Z, md5 25c9bd31)
- Step 2: parcours T1 → T6 (+ tous les flux du passage, dont 5 trajets complets rejoués) → 679 requêtes journalisées sur 16 contextes : 0 vers api.myptv.com, 0 vers estimer-trajet / trajet-roule / péages ; fonctions appelées {"lieux":36,"voiture-eea":10} ; hôtes {"plein-et-trajet.vercel.app":130,"fonts.googleapis.com":38,"fonts.gstatic.com":170,"rglrwtkqwihdztgqlbsy.supabase.co":195,"":8,"tiles.openfreemap.org":134,"data.geopf.fr":3,"photon.komoot.io":1} ; 137 captures (contextes cas-refus, cas, barcelone, stations, stations-prayssac, barcelone-stations, dartford, bruxelles, historique-reel, voiture, trajet, historique-vide, historique-prepare, historique-prepare-2, cout-prepare, retraits) + 6 routes passées au crible : aucun « péage » ni « itinéraire » ; aucun champ départ / arrivée ; aucun lien Moteurs ; onglets Trajet · Stations · Historique → capture `V1-retraits-02-apres.png` ✓ (14:06:56Z, md5 23d11f0e)
- Step 3: la table public.moteurs lue par l'API Supabase (rôle service), rendue en page texte → prix:true, moyennes:true, itineraire:true, peages:false, voitures:true, lieux:true, vehicules:true → capture `V1-retraits-03-avant.png` ✓ (14:06:58Z, md5 749a5f1e)
- Step 4: je lis la ligne du service péages, et le nombre de lignes des clés → peages : en_service = false (fournisseur ptv gardé) ; cles_fournisseurs 2 lignes (2 avant) ; Vault 3 secrets (cle_ptv, cle_stadia, sync_prix_secret ; 3 avant) ; limite d'inscriptions anonymes 30 → capture `V1-retraits-04-apres.png` ✓ (14:06:59Z, md5 83fdaf05)

### Issues Found
- aucune sur la version déployée à cette passe.

## Régression (passage historique,retraits)
- US-3.E3 (T6) : historique vide → « Aucun trajet enregistré. », totaux 0 trajets 0,0 km 0,00 € essence ✓

## Erreurs de page relevées
- aucune

---

## Round 2

Bâtisseur r2 (m5-batisseur-r2), 21/10, 13:00Z → 14:40Z. Mêmes outils qu'en r1b (`run-m5.mjs` + `m5-explore-outils.mjs`, bibliothèque Playwright, Chromium 390 × 844, toucher, fr-FR), sous `lourd`. Passage de référence : **r2final** (blocs « # Passage r2final … » ci-dessus, 13:47Z → 14:07Z), joué sur la prod **1929cce** (fc40451 ensuite : tests Android seulement, aucun fichier de `src/` ni `supabase/` changé). Les passages « r2 » (13:20Z → 13:43Z) sont des essais gardés : ils ont révélé le texte doublé du bandeau (corrigé, 1035787) et deux attentes à adapter à 3a2c194 (voir plus bas). Le passage r2final « cas,stations,historique,retraits » a été coupé par mon délai de 595 s pendant le flux historique (« Flux interrompu ») : historique et retraits ont été rejoués seuls à 14:04Z.

**Résultat r2final : 140/140 captures, 139 ✓, 1 ✗** (V-1.2-02 : écart de nom « Renault Clio » / « 1.2 · 118 ch » contre « Clio IV » / « 1.2 TCe 120 » du plan, décision d'Anthony, inchangé). 0 requête PTV / estimer-trajet / trajet-roule sur 679 requêtes (trois lancements r2final) ; fonctions appelées : voiture-eea et lieux. Textes « péage / itinéraire » : seulement sur V1-retraits-03/04, les pages composées à partir de la table `moteurs` (comme en r1).

**Changement de l'appli fait par une autre session pendant ce round** (commit 3a2c194, 13:32Z, « chasse aux bugs », pas de moi) : litres de la fin de trajet à 2 décimales (« 41,20 »), total km de l'historique à 1 décimale sous 100 km (« 76,8 »), arrêt automatique tolérant ±5 m. Je n'y ai pas touché ; j'ai adapté mes attentes (V-4.3-01, V-6.4-04, extraits V-6.1 / V-6.4).

### V-1.1 — Ouvrir l'appli
- V-1.1-01 : l'état de départ se voit : l'accueil avec la Clio (r1 : onglet Stations).
- V-1.1-05 : le trajet en cours se voit : onglet Stations avec le bandeau « ● Trajet en cours · 0,45 € » (r1 : Historique vide). Horloge réelle à ce moment (positions rejouées au rythme réel en arrière-plan), comme V-5.3.

### V-1.2 — Voir ma voiture
- V-1.2-01 : l'accueil avec la Clio enregistrée (r1 : Historique vide) ; V-1.2-02 après rechargement de la page.
- V-1.2-05 : une appli fermée ne se photographie pas ; la capture est l'appli telle qu'on la laisse, juste avant de fermer le navigateur (r1 : page blanche about:blank) ; V-1.2-06 après relance sur le même profil.
- V-1.2-02 ✗ : écart de nom déclaré (décision d'Anthony).

### V-2.1, V-2.2, V-2.3, V-2.E1 — Ma voiture
- Bouton désactivé visible (fond clair, texte atténué, bord pointillé, `aria-disabled`) : V-2.2-04, V-2.E1-02, V-2.3-04 (actif) reprises.
- V-2.1-05 : la minuscule ne peut pas se voir : le champ met la saisie en majuscules à la frappe (« r 5rbu » s'affiche « R 5RBU ») ; les espaces se voient ; la normalisation est prouvée par la fiche 5RBU0C de V-2.1-06 et la requête envoyée « d2=R 5RBU 5RBU0C » (journal). Code partagé jamais demandé de ce passage : M51AZ1 puis HNSJC1B000 (cache `versions_eea`).
- Placeholders « 5RBU0C » et « clio 2017 120 » : même texte, désormais dans textes.ts.

### V-3.1 — Suivre en direct
- Garé, le bruit ne compte plus (voir V-3.E1). Extrait V-3.1 : cadence vérifiée (écart entre l'horloge de la page et la dernière position affichée ≤ 2 s après chaque position), en plus des « > 20 changements ».

### V-3.5 — Arrêter
- V-3.5-05 : « Hors ligne : le trajet continue, tout est calculé sur le téléphone. » visible (nouvelle indication, textes.ts).
- V-3.5-06 : **capture prise pendant la coupure** : titre « 43,928 · 2,146 → 43,917 · 2,144 » et « Hors ligne : litres et coût calculés sur le téléphone ; les noms des lieux viendront au retour du réseau. » ; 0,168 L × 2,156 = 0,36 €. Le retour du réseau vient APRÈS la capture : « Albi → Albi » sans rien toucher, l'indication disparaît (journal r2final). **Correction du journal r1** : la ligne r1b de V-3.5-06 (« 43,928 · 2,146 → 43,917 · 2,144 », md5 fea007d0) était fausse sur l'image, qui montrait « ALBI → ALBI » : le script r1b rétablissait le réseau dans la vérification, avant la capture.

### V-3.E1 — Oubli d'arrêter
- Garé à ±2 m (points 774 → 1365) : km 4,0 → 4,0, litres 0,33 → 0,33 (r1 : 4,0 → 5,1 km). Vitesse relevée tous les 37 points : 3, puis 0 jusqu'à l'alerte. Le « ✗ » et la ligne « bruit du GPS à l'arrêt encore compté » de ce passage viennent de MON contrôle, trop strict : le 1er relevé (point 777, 3 s après l'arrêt) tombe dans la fenêtre de 10 s qui contient encore le roulage d'avant ; à partir du 2e (point 814), 0 km/h. km et litres n'ont pas bougé. Écrit tel quel, non réécrit.
- V-3.E1-06 : après « Reprendre », toujours garé, 10 positions : 0 km/h, 4,0 km, 0,33 L inchangés (r1 : 10 km/h, +0,1 km).

### V-4.3 / V-4.4 — Coût, partager
- V-4.3-01 : la fin de trajet de 41,2 L à 2,161 €/L, haut de l'écran (r1 : Historique vide) ; même image que V-4.3-02 (le coût tient sur le même écran) — doublon déclaré.
- V-4.4-04 : une image ne peut pas montrer les deux bornes ; capture à 1 personne (« Seul : tout pour toi. », « − » désactivé), borne 9 relevée dans le constat (10 touchers sur « + » → 9, « + » désactivé).

### V-4.5 / V-4.6 — Courbes
- V-4.5-01 : la fin du trajet enregistré, rouverte (r1 : ligne d'historique). V-4.5-01, V-4.5-02 et V-4.6-01 : même image (les deux courbes tiennent à l'écran, rien à faire défiler) — doublon déclaré.
- V-4.6-02 : « moy. 6,9 · pointe 18,5 L/100 » (r1 : pointe 100,2) ; courbe lisible ; moyenne = 5,191 ÷ 74,85 × 100 = 6,93.
- Échelle de vitesse : plancher 50 km/h au lieu de 140 (courbe de ville lisible).

### V-4.7 — Enregistrer ou supprimer
- V-4.7-02 : la ligne montre carburant, prix et part : « 21 oct. · 74,9 km · SP95-E10 à 1,990 €/L · 3,44 € chacun · 10,33 € ».

### V-5.1 / V-5.2 — Stations
- V-5.1-01 : accueil, en-tête « Autour de moi » = position GPS reçue (refusée, il dirait « Albi »).
- V-5.2 rejouée à **Prayssac** (position 44,5041, 1,1885) : TotalEnergies Prayssac (46220005, SP95-E10 1,990 et E85 en base, aucune ligne Gazole) est dans la liste SP95-E10 (5 lignes, 5 pastilles) et disparaît en Gazole (4 lignes, 4 pastilles, pastille 46220005 : 0). V-5.2-01 : la Clio SP95-E10 à l'accueil, dernier carburant regardé = Gazole (pt-carburant posé avant l'ouverture, déclaré) ; V-5.2-02 : SP95-E10 d'office. V-5.2-02 et -03 : même image — doublon déclaré.

### V-5.5 — Utiliser ce prix
- V-5.5-01 : la fiche de la station (TotalEnergies Access Montauban, SP95-E10 1,990 €/L au tableau et sur le bouton, = base). V-5.5-02 : En route « Prix : mon prix · 1,990 €/L ». La fin de ce même trajet à ce prix est V-4.7-01 (« Mon prix 1,990 », 3 personnes) — une capture ne montre qu'un écran.
- V-5.5-04 (accueil) : le prix gardé ne s'affiche pas sur l'accueil ; il est prouvé par `pt-prix-choisi` et le trajet suivant (« mon prix », journal).

### V-5.7 — Europe et Royaume-Uni
- Fond OpenFreeMap « Positron » : Barcelone (153 pastilles) et Dartford ont maintenant rues, noms et côte sous les pastilles (V-5.7-02 à -06 reprises). V-5.7-01 : la V1 ne montre la position que dans l'onglet Stations (l'en-tête dit « Autour de moi ») ; Barcelone est prouvée par la position du contexte et par V-5.7-02.

### V-6.1 / V-6.2 / V-6.4 — Historique
- V-6.1-01 : l'historique juste après le second « Enregistrer » (trajets du 05/10 et du 14/09 visibles) (r1 : accueil).
- V-6.1-03 : l'historique vide, ouvert par son adresse ; V-6.1-04 le rouvre depuis l'accueil.
- V-6.2-01 : les 4 lignes (77, 152, 245, 243 km) dans l'historique (r1 : accueil).
- V-6.4 : le trajet préparé ne garde que la moyenne SP95-E10 ; Gazole → moyenne lue avant le changement : IndexedDB Gazole, 2,368 €/L, ligne « Gazole à 2,368 €/L · 5,73 € chacun · 11,46 € ». Sans réseau : changement refusé, message (extrait).

### Captures — état final (r2final)
140/140 dans `tests/e2e/delivery/` et `m5-captures-brutes/`, deux vraies prises de vue chacune (121 au même octet, 19 différentes), md5 du disque = md5 relevé par le passage pour les 140. Doublons d'octets (même écran, même état) : **25c9bd31 ×14** (accueil T1 avec la Clio : V-1.1-01, V-1.1-02, V-1.2-01, V-1.2-02, V-1.2-05, V-1.2-06, V-1.3-01, V-2.2-02, V-4.7-04, V-5.1-01, V-5.2-01, V-5.5-04, V-5.7-01, V1-retraits-01) ; **700668c5 ×3** (V-4.5-01, V-4.5-02, V-4.6-01) ; **7a9f62a0** (V-3.4-02, V-3.4-03) ; **ef8ee2f9** (V-4.3-01, V-4.3-02) ; **df457b0c** (V-5.1-02, V-5.4-01) ; **a03b9211** (V-5.2-02, V-5.2-03).

---

# Passage r3 voiture,trajet — début 2026-10-21T16:18:29.409Z

Appli déployée https://plein-et-trajet.vercel.app, base Supabase réelle, Playwright (bibliothèque), Chromium headless 390 × 844, toucher, fr-FR, Europe/Paris.
Réel : base EEA (fonction voiture-eea), moyennes du jour (FR SP95-E10 2,156 €/L, Gazole 2,368 €/L), stations et prix du jour, géocodage inverse (fonction lieux), refus de localisation (contexte sans permission), coupure réseau (context.setOffline).
Rejoué : géolocalisation par context.setGeolocation depuis tests/e2e/fixtures/albi-toulouse.gpx (et ses dérivés immobile / tunnel, et barcelone.gpx : vrai itinéraire Valhalla fabriqué par creer-gpx.mjs barcelone), horloge de la page accélérée par page.clock (méthode r1a : avancer l'horloge, poser la position, attendre que T3 l'ait comptée), au rythme réel (1 point/s) pendant les passages par Stations.

## V-2.E1 — Code inconnu

### Happy Path
- Step 1: champ D.2, je commence « ZZ999 » → champ « ZZ999 » ; aucune fiche → capture `V-2.E1-01-avant.png` ✓ (16:18:45Z, md5 805f1f7f)
- Step 2: je tape « ZZ9999 » (absent de la base EEA) → « Code introuvable. Vérifie la case D.2, ou cherche par nom ci-dessous. » (data-code code_inconnu) ; « Enregistrer ma voiture » désactivé → capture `V-2.E1-02-apres.png` ✓ (16:18:48Z, md5 d16d5805)
- Step 3: MOCKED (page.route : la base européenne ne tombe pas sur commande) — base injoignable, je commence « 5RBF0 » → champ « 5RBF0 » ; réponse de voiture-eea remplacée par un 502 base_injoignable côté navigateur → capture `V-2.E1-03-avant.png` ✓ (16:18:49Z, md5 45696a34)
- Step 4: MOCKED — je tape « 5RBF0A » → « La base européenne des voitures ne répond pas. Réessayer » ; champ toujours « 5RBF0A » ; « Enregistrer ma voiture » désactivé : true → capture `V-2.E1-04-apres.png` ✓ (16:18:51Z, md5 7fbaf845)

### Edge Case / constats
- Step 4 — route retirée puis « Réessayer » touché : la vraie base répond, fiche « Renault Clio 1.5 · 75 ch · Gazole » (après la capture).

### Issues Found
- aucune sur la version déployée à cette passe.

## V-2.3 — Chercher sans la carte grise

### Happy Path
- Step 1: je touche le champ « Nom, année, puissance » → champ recherche vide et sélectionné (focus #q) → capture `V-2.3-01-avant.png` ✓ (16:18:53Z, md5 ee74b2c3)
- Step 2: je tape « clio 2017 120 » → 6 suggestions, toutes Clio 2017 entre 115 et 125 ch, avec année, kW et carburant : Renault Clio 1.2 · 118 ch 2017 · 87 kW · 1 165 kg · SP95-E10 · D.2 5RBU0C | Renault Clio 1.2 · 118 ch 2017 · 87 kW · 1 165 kg · SP95-E10 · D.2 5RBU0D | Renault Clio 1.2 · 118 ch 2017 · 87 kW · 1 243 kg · SP95-E10 · D.2 7RBU0C | Renault Clio 1.2 · 118 ch 2017 · 87 kW · 1 270 kg · SP95-E10 · D.2 7RBU0D | Renault Clio 1.2 · 120 ch 2017 · 88 kW · 1 255 kg · SP95-E10 · D.2 2R401E | Renault Clio 1.2 · 120 ch 2017 · 88 kW · 1 165 kg · SP95-E10 · D.2 5R400E → capture `V-2.3-02-apres.png` ✓ (16:18:57Z, md5 6b0adbec)
- Step 3: la première suggestion (sélectionnée au clavier) → « Renault Clio 1.2 · 118 ch 2017 · 87 kW · 1 165 kg · SP95-E10 · D.2 5RBU0C » → capture `V-2.3-03-avant.png` ✓ (16:18:58Z, md5 c6b9ae57)
- Step 4: je la touche → fiche « Renault Clio 1.2 · 118 ch » 2017 · 87 kW · 118 ch · 1 165 kg · SP95-E10 (data-cle RENAULT·R·5RBU·5RBU0C·2017) ; « Enregistrer ma voiture » actif → capture `V-2.3-04-apres.png` ✓ (16:18:59Z, md5 c10af040)

### Issues Found
- aucune sur la version déployée à cette passe.

## V-2.1 — Saisir le code D.2

### Happy Path
- Step 1: écran Ma voiture, je touche le champ D.2 → champ D.2 vide et sélectionné (focus d2) ; « Enregistrer ma voiture » désactivé → capture `V-2.1-01-avant.png` ✓ (16:18:33Z, md5 c5c80c14)
- Step 2: je tape « 5RBU0C » (code déjà en cache versions_eea) → fiche « Renault Clio 1.2 · 118 ch » : année 2017 · 87 kW · 118 ch · 1 197 cm³ · 1 165 kg · SP95-E10 · 118 g/km (NEDC) · « Base européenne EEA » ; liste : Renault Clio 1.2 · 118 ch 2017 · 87 kW · 1 165 kg · SP95-E10 · 13 864 immatriculées Renault Clio 1.2 · 118 ch 2018 · 87 kW · 1 165 kg · SP95-E10 · 11 043 immatriculées → capture `V-2.1-02-apres.png` ✓ (16:18:36Z, md5 585389c2)
- Step 3: code partagé par plusieurs versions, jamais demandé à l'appli : je tape « M61A11 » sauf le dernier caractère → champ « M61A1 » ; M61A11 absent de versions_eea (0 ligne, lu par l'API avant la saisie) → capture `V-2.1-03-avant.png` ✓ (16:18:36Z, md5 8f9b1d1e)
- Step 4: je tape le dernier caractère (« M61A11 ») puis je choisis la 2e version → 33 versions, la plus immatriculée en tête (104437 ≥ 62458 ≥ 58180 ≥ 18042…) ; marques Hyundai, Kia ; années 2019, 2020, 2018, 2021, 2022, 2025, 2024, 2023 ; masses 1 298, 1 308, 1 312, 1 297, 1 526, 1 520, 1 340, 1 334, 1 335, 1 561, 1 321, 1 550, 1 553, 1 265, 1 281, 1 291 kg ; 1re : « Hyundai Kona 1.0 · 120 ch 2019 · 88 kW · 1 298 kg · SP95-E10 · 104 437 immatriculées » ; 2e touchée → fiche « Hyundai Kona 1.0 · 120 ch » → capture `V-2.1-04-apres.png` ✓ (16:18:41Z, md5 7b2e85e5)
- Step 5: je commence à taper en minuscules avec espaces : « r 5rbu » → champ « R 5RBU » (saisie en minuscules mise en majuscules à la frappe) ; pas de recherche (5 caractères sans espaces) → capture `V-2.1-05-avant.png` ✓ (16:18:42Z, md5 154773df)
- Step 6: je finis « r 5rbu 5rbu0c » → champ « R 5RBU 5RBU0C » ; requête envoyée « d2=R 5RBU 5RBU0C » ; fiche « Renault Clio 1.2 · 118 ch · 2017 » (data-cle RENAULT·R·5RBU·5RBU0C·2017) : reconnu comme 5RBU0C → capture `V-2.1-06-apres.png` ✓ (16:18:44Z, md5 c4ca2b26)

### Edge Case / constats
- Step 2 — écart de libellé face au plan : l'écran nomme « Renault Clio 1.2 · 118 ch » ; le plan dit « Renault Clio 1.2 TCe 120 ». La base EEA ne porte ni « TCe » ni « 120 » (Cn = CLIO) ; les chiffres sont ceux du plan.
- Step 2 — cache : 5RBU0C présent dans versions_eea AVANT la saisie (2 lignes, années 2017/2018) : c'est le chemin « version déjà en cache ».
- Step 4 — chemin « jamais demandée » : M61A11 absent du cache avant, 33 ligne(s) dans versions_eea après (écrites par la fonction).

### Issues Found
- aucune sur la version déployée à cette passe.

## V-1.2 — Voir ma voiture

### Happy Path
- Step 1: la Clio enregistrée (accueil, juste après « Enregistrer ma voiture ») → accueil « Renault Clio » « 1.2 · 118 ch · 2017 · SP95-E10 » ; onglet onglet-trajet ; localStorage pt-voiture-v1 = 5RBU0C → capture `V-1.2-01-avant.png` ✓ (16:19:03Z, md5 25c9bd31)
- Step 2: l'accueil s'affiche (page rechargée) → ÉCART DE LIBELLÉ : l'écran montre « Renault Clio » et « 1.2 · 118 ch · 2017 · SP95-E10 », le plan attend « Renault Clio IV » et « 1.2 TCe 120 · 2017 · SP95-E10 » ; la base EEA (Cn = CLIO) ne porte ni « IV » ni « TCe 120 » → capture `V-1.2-02-apres.png` ✗ (16:19:03Z, md5 25c9bd31)
- Step 3: l'accueil, « Changer » sélectionné au clavier → focus sur « Changer » → capture `V-1.2-03-avant.png` ✓ (16:19:04Z, md5 7ff02c6d)
- Step 4: je touche « Changer » → écran Ma voiture, D.2 « » et recherche « » vides ; aucune fiche (0) → capture `V-1.2-04-apres.png` ✓ (16:19:04Z, md5 b708fc84)
- Step 5: l'appli telle que je la laisse, juste avant de fermer le navigateur (puis relance sur le même profil) → URL https://plein-et-trajet.vercel.app/ ; accueil « Renault Clio » ; localStorage pt-voiture-v1 = 5RBU0C → capture `V-1.2-05-avant.png` ✓ (16:19:07Z, md5 25c9bd31)
- Step 6: je rouvre l'appli → accueil : « Renault Clio » « 1.2 · 118 ch · 2017 · SP95-E10 », rien ressaisi → capture `V-1.2-06-apres.png` ✓ (16:19:09Z, md5 25c9bd31)

### Edge Case / constats
- Step 5 — navigateur fermé puis relancé sur le même profil : onglet about:blank avant d'ouvrir l'appli.

### Issues Found
- Step 2 (V-1.2-02-apres.png) : ÉCART DE LIBELLÉ : l'écran montre « Renault Clio » et « 1.2 · 118 ch · 2017 · SP95-E10 », le plan attend « Renault Clio IV » et « 1.2 TCe 120 · 2017 · SP95-E10 » ; la base EEA (Cn = CLIO) ne porte ni « IV » ni « TCe 120 »

## V-2.2 — Vérifier et enregistrer

### Happy Path
- Step 1: la fiche de ma version (5RBU0C, 2017) affichée → fiche « Renault Clio 1.2 · 118 ch · 2017 » ; bouton « Enregistrer ma voiture » actif → capture `V-2.2-01-avant.png` ✓ (16:19:02Z, md5 87af51f7)
- Step 2: je touche « Enregistrer ma voiture » → accueil : « Renault Clio » « 1.2 · 118 ch · 2017 · SP95-E10 » ; localStorage pt-voiture-v1 = Renault Clio 5RBU0C 2017 → capture `V-2.2-02-apres.png` ✓ (16:19:02Z, md5 25c9bd31)
- Step 3: aucune version identifiée : D.2 vide, « zz » dans la recherche par nom → D.2 «  », recherche « zz » (moins de 3 caractères : pas de recherche) ; aucune fiche (0) → capture `V-2.2-03-avant.png` ✓ (16:18:52Z, md5 724e6330)
- Step 4: je regarde « Enregistrer ma voiture » (D.2 incomplet « 5RB ») → aucune fiche ; « Enregistrer ma voiture » désactivé (disabled) → capture `V-2.2-04-apres.png` ✓ (16:18:53Z, md5 d8e8d148)

### Edge Case / constats
- Step 2 — après fermeture du navigateur et relance sur le même profil, l'accueil rappelle la même voiture (V-1.2-06).

### Issues Found
- aucune sur la version déployée à cette passe.

## V-5.3 — Rechercher dans cette zone

### Happy Path
- Step 1: la carte des stations (trajet en cours) → en-tête « Autour de moi » ; 8 stations ; centre 43.913, 2.142 zoom 10.0 → capture `V-5.3-01-avant.png` ✓ (16:19:39Z, md5 7c31d2a9)
- Step 2: je fais glisser la carte vers Montauban (4 glissements au doigt-souris) → bouton « Rechercher dans cette zone » affiché ; liste inchangée (8 stations, mêmes id) ; en-tête « Autour de moi » ; centre 44.018, 1.415 → capture `V-5.3-02-apres.png` ✓ (16:19:45Z, md5 540d8a49)
- Step 3: le bouton « Rechercher dans cette zone » (carte recentrée sur Montauban d'un dernier glissement) → centre 44.017, 1.355 ; liste toujours celle d'avant (8 stations) → capture `V-5.3-03-avant.png` ✓ (16:19:48Z, md5 b62f68dd)
- Step 4: je touche « Rechercher dans cette zone » → bouton disparu ; en-tête « Autour de Montauban » ; 16 stations, toutes à moins de 11.6 km du centre affiché (44.017, 1.355), 16 pastilles ; 1re (Moins cher) « TotalEnergies Montauban 63,4 km · il y a 4 h · −16,6 c vs France 1,990 €/L » → capture `V-5.3-04-apres.png` ✓ (16:19:49Z, md5 e5b8848a)

### Issues Found
- aucune sur la version déployée à cette passe.

## V-3.1 — Suivre en direct

### Happy Path
- Step 1: enregistrement en cours, 200 positions rejouées → 19 km/h · 0,8 km · 0,06 L · 0,13 € · 0:03 · 14 km/h moy. · 8,2 L/100 · 200 points → capture `V-3.1-01-avant.png` ✓ (16:19:21Z, md5 741571d5)
- Step 2: je roule : 200 positions de plus (1 par seconde d'horloge) → vitesse lue après chaque position : 49 changements sur 200 s (la vitesse est redessinée à chaque position, soit chaque seconde ; plus longue valeur identique : 57 s, arrêts du GPX compris) ; courbe « Vitesse des 3 dernières minutes » ; 19 km/h · 0,8 km · 0,06 L · 0,13 € · 0:03 · 14 km/h moy. · 8,2 L/100 · 200 points → 29 km/h · 1,8 km · 0,15 L · 0,33 € · 0:06 · 17 km/h moy. · 8,4 L/100 · 400 points → capture `V-3.1-02-apres.png` ✓ (16:19:29Z, md5 39eed2c7)
- Step 3: aucun prix choisi (aucune station touchée) → « Prix : moyenne France du jour · 2,156 €/L » → capture `V-3.1-03-avant.png` ✓ (16:19:30Z, md5 d9de4385)
- Step 4: le coût en direct s'affiche → 0,20 L × 2,156 €/L (moyenne France du jour SP95-E10 lue par l'API : 2,156) = 0,431 → affiché 0,43 € ; « Prix : moyenne France du jour · 2,156 €/L » → capture `V-3.1-04-apres.png` ✓ (16:19:32Z, md5 6f0396e3)
- Step 5: un prix pris sur une station (« Utiliser ce prix ») → « Prix : mon prix · 1,990 €/L » ; 0 km/h · 2,5 km · 0,21 L · 0,41 € · 0:08 · 18 km/h moy. · 8,3 L/100 · 504 points → capture `V-3.1-05-avant.png` ✓ (16:19:51Z, md5 89c35cea)
- Step 6: le coût en direct s'affiche (60 positions plus loin) → 0,21 L × 1,990 = 0,418 → affiché 0,41 € ; « Prix : mon prix · 1,990 €/L » → capture `V-3.1-06-apres.png` ✓ (16:19:52Z, md5 ea447f32)

### Issues Found
- aucune sur la version déployée à cette passe.

## V-3.4 — Mettre en pause

### Happy Path
- Step 1: un enregistrement en cours (A68) → 105 km/h · 30,3 km · 2,16 L · 4,30 € · 0:29 · 62 km/h moy. · 7,1 L/100 · 1747 points → capture `V-3.4-01-avant.png` ✓ (16:20:46Z, md5 46614fe7)
- Step 2: je touche « Pause » puis 20 positions arrivent → « En pause », bouton « Reprendre » ; km 30,3 et litres 2,16 inchangés malgré 0,58 km parcourus sur le GPX → capture `V-3.4-02-apres.png` ✓ (16:20:47Z, md5 053d0f26)
- Step 3: une pause pendant laquelle la voiture s'est déplacée → déplacement pendant la pause : 2,07 km (GPX, points 1750 → 1821) ; affiché toujours 30,3 km, 2,16 L → capture `V-3.4-03-avant.png` ✓ (16:20:50Z, md5 053d0f26)
- Step 4: je touche « Reprendre » puis 60 positions → « Enregistrement » ; km 30,3 → 32,1 (+1,8) = distance roulée depuis la reprise (1,72 km) ; les 2,07 km de la pause ne sont ni comptés ni chiffrés → capture `V-3.4-04-apres.png` ✓ (16:20:52Z, md5 cff837c2)

### Issues Found
- aucune sur la version déployée à cette passe.

## V-4.5 — Courbe de vitesse

### Happy Path
- Step 1: un trajet enregistré, rouvert depuis l'historique (écran Fin de trajet, haut) → onglet onglet-historique ; « Albi → Toulouse » ; « 21 oct. 2026 · 1 h 11 · Renault Clio » ; enregistré : true → capture `V-4.5-01-avant.png` ✓ (16:22:47Z, md5 cce19049)
- Step 2: la fin de trajet s'affiche (rouverte) — courbe de vitesse → « 63 km/h moy. · 7 accélérations » ; 600 points de courbe (≤ 600) pour 4350 s de trajet ; vitesse moyenne affichée 63 km/h ; km ÷ durée roulée (4278 s, pause exclue) = 63.0 km/h ; km ÷ durée totale = 61.9 km/h ; 7 accélérations → capture `V-4.5-02-apres.png` ✓ (16:22:48Z, md5 5eed462f)

### Issues Found
- aucune sur la version déployée à cette passe.

## V-4.6 — Courbe de consommation

### Happy Path
- Step 1: un trajet enregistré (fin rouverte, haut de l'écran) → onglet onglet-historique ; « ← Historique » ; « Albi → Toulouse » → capture `V-4.6-01-avant.png` ✓ (16:22:48Z, md5 5eed462f)
- Step 2: la courbe de consommation → « moy. 6,9 · pointe 21,1 L/100 » ; litres ÷ km × 100 = 5.178 ÷ 74.82 × 100 = 6.92 ; 600 points (moyenne simple des points de la courbe : 6.92, non pondérée par la distance) → capture `V-4.6-02-apres.png` ✓ (16:22:48Z, md5 cbcf7b37)

### Issues Found
- aucune sur la version déployée à cette passe.

## V-1.1 — Ouvrir l'appli

### Happy Path
- Step 1: une voiture enregistrée sur ce téléphone (écran Trajet) → onglet onglet-trajet ; carte « Renault Clio · 1.2 · 118 ch · 2017 · SP95-E10 » ; voiture 5RBU0C → capture `V-1.1-01-avant.png` ✓ (16:19:05Z, md5 25c9bd31)
- Step 2: j'ouvre l'appli (nouvel onglet sur l'adresse de l'appli) → onglet Trajet sélectionné ; T1 « Renault Clio 1.2 · 118 ch · 2017 · SP95-E10 Changer Démarrer » ; ni prix ni nombre de personnes → capture `V-1.1-02-apres.png` ✓ (16:19:07Z, md5 25c9bd31)
- Step 3: premier lancement (profil neuf, aucune voiture), j'ouvre l'appli → T1 « Enregistre d'abord ta voiture Le code D.2 de ta carte grise, une seule fois. Démarrer » ; onglet sélectionné : Trajet ; localStorage pt-voiture-v1 absent → capture `V-1.1-03-avant.png` ✓ (16:18:32Z, md5 c213538e)
- Step 4: je touche « Démarrer » sans voiture → URL /voiture, écran Ma voiture (« Ma voiture ») ; aucun enregistrement en IndexedDB → capture `V-1.1-04-apres.png` ✓ (16:18:33Z, md5 e23f9358)
- Step 5: un trajet en cours d'enregistrement ; je suis sur l'onglet Stations (bandeau « Trajet en cours ») → onglet onglet-stations ; bandeau « ● Trajet en cours · 0,44 € » ; IndexedDB enregistrement : 485 points → capture `V-1.1-05-avant.png` ✓ (16:19:35Z, md5 7c31d2a9)
- Step 6: je touche l'onglet Trajet → URL /en-route, écran En route « Enregistrement » (pas l'accueil) → capture `V-1.1-06-apres.png` ✓ (16:19:36Z, md5 d781a51a)

### Issues Found
- aucune sur la version déployée à cette passe.

## V-1.3 — Démarrer

### Happy Path
- Step 1: la Clio enregistrée, localisation autorisée, position = 1er point du GPX (Albi, place du Vigan) → accueil « Renault Clio » ; permission géolocalisation accordée au contexte → capture `V-1.3-01-avant.png` ✓ (16:19:16Z, md5 25c9bd31)
- Step 2: je touche « Démarrer » → écran En route, « Enregistrement » (pastille animée : clignote infinite) ; 1re position enregistrée en 198 ms (data-points 1) ; IndexedDB enregistrement : présent → capture `V-1.3-02-apres.png` ✓ (16:19:17Z, md5 4b079d85)

### Issues Found
- aucune sur la version déployée à cette passe.

## V-5.6 — Trajet en cours

### Happy Path
- Step 1: un trajet en cours ; je touche l'onglet Stations (positions envoyées au rythme réel, 1 par seconde) → écran Stations ouvert ; bandeau « ● Trajet en cours · 0,93 € » → capture `V-5.6-01-avant.png` ✓ (16:19:59Z, md5 e5a9efed)
- Step 2: l'onglet Stations est ouvert → bandeau en haut « ● Trajet en cours · 0,99 € » (coût en direct ; 0,93 € sur En route juste avant) ; 8 stations listées → capture `V-5.6-02-apres.png` ✓ (16:20:04Z, md5 b5cd7c1d)
- Step 3: ce bandeau, 6 s plus tard (la voiture roule) → « ● Trajet en cours · 1,02 € » (« ● Trajet en cours · 0,99 € » 6 s plus tôt : le coût du bandeau suit le trajet) ; positions rejouées jusqu'au point 912 → capture `V-5.6-03-avant.png` ✓ (16:20:10Z, md5 406dca20)
- Step 4: je touche l'onglet Trajet → écran En route revenu ; 911 points (911 au moment du toucher) ; 83 km/h · 6,8 km · 0,51 L · 1,02 € · 0:15 · 27 km/h moy. · 7,5 L/100 · 911 points → capture `V-5.6-04-apres.png` ✓ (16:20:11Z, md5 ccc91f44)

### Edge Case / constats
- Step 2 — sans trajet en cours (même téléphone, avant Démarrer) : bandeau « retour-trajet » présent 0 fois (attendu 0).

### Issues Found
- aucune sur la version déployée à cette passe.

## V-5.5 — Utiliser ce prix

### Happy Path
- Step 1: trajet en cours ; la fiche de la 1re station « Moins cher » de Montauban → fiche « TotalEnergies Montauban » ; bouton « Utiliser 1,990 €/L pour mon trajet » ; prix SP95-E10 en base pour 82000018 : 1,990 €/L. (Le plan cite 2,103 €/L à titre d'exemple : le prix réel du jour est celui lu ici.) → capture `V-5.5-01-avant.png` ✓ (16:19:49Z, md5 574395e4)
- Step 2: je touche « Utiliser 1,990 €/L pour mon trajet » → fiche fermée, écran En route ; « Prix : mon prix · 1,990 €/L » ; 0,21 L × 1,990 = 0,418 → 0,41 € (la fin de trajet est relue plus bas) → capture `V-5.5-02-apres.png` ✓ (16:19:50Z, md5 05db9460)

### Edge Case / constats
- Step 2 — la fin de ce même trajet, au prix de la station, est la capture V-4.7-01-avant.png (libellé « Mon prix », 3 personnes) ; fin de trajet : libellé « Mon prix », prix data-prix 1.99 (station : 1,990), coût 10,31 € essence.

### Issues Found
- aucune sur la version déployée à cette passe.

## V-5.1 — Stations autour de moi

### Happy Path
- Step 3: un trajet en cours (A68, 1 450 positions) ; j'ouvre l'onglet Stations → écran Stations autour de la voiture (43.8843, 1.9259, 21,6 km après Albi) : 5 stations toutes à moins de 10 km d'elle ; 1re « TotalEnergies Marssac-sur-Tarn 9,2 km · il y a 7 h · −16,6 c vs France 1,990 €/L » ; bandeau « ● Trajet en cours · 3,11 € » ; sur En route juste avant : 105 km/h · 21,6 km · 1,49 L · 2,96 € · 0:24 · 54 km/h moy. · 6,9 L/100 · 1448 points → capture `V-5.1-03-avant.png` ✓ (16:20:26Z, md5 bb65379b)
- Step 4: je reviens au trajet (onglet Trajet) après 12 s dans Stations → distance 21,6 → 22,0 km, points 1448 → 1462 : l'enregistrement a continué pendant Stations → capture `V-5.1-04-apres.png` ✓ (16:20:39Z, md5 3415a4ee)

### Issues Found
- aucune sur la version déployée à cette passe.

## V-3.5 — Arrêter

### Happy Path
- Step 1: un enregistrement de plus de 1 km (arrivée au Capitole, Toulouse) → 10 km/h · 74,8 km · 5,18 L · 10,31 € · 1:11 · 63 km/h moy. · 6,9 L/100 · 4275 points → capture `V-3.5-01-avant.png` ✓ (16:22:43Z, md5 dfe5b521)
- Step 2: je touche « Arrêter » → « Albi → Toulouse » ; « 21 oct. 2026 · 1 h 11 · Renault Clio » ; 5,18 L (5.178), 74,8 km (74.82), 6,9 L/100 km moy. → capture `V-3.5-02-apres.png` ✓ (16:22:45Z, md5 42b3633e)

### Issues Found
- aucune sur la version déployée à cette passe.

## V-4.7 — Enregistrer ou supprimer

### Happy Path
- Step 1: un trajet qui vient d'être arrêté (3 personnes choisies) → prix « Mon prix » 1,990 €/L ; coût 10,31 € ; « 3,44 € chacun » ; boutons « Supprimer Enregistrer » → capture `V-4.7-01-avant.png` ✓ (16:22:46Z, md5 5e9738ac)
- Step 2: je touche « Enregistrer » → onglet Historique, en tête : « Albi → Toulouse 21 oct. · 74,8 km · SP95-E10 à 1,990 €/L · 3,44 € chacun 10,31 € » ; IndexedDB : prix 1.99 (station), carburant SP95-E10, 3 personnes, enregistré ; totaux « 1 trajet 74,8 km 10,31 € essence » → capture `V-4.7-02-apres.png` ✓ (16:22:47Z, md5 35d7b94c)

### Edge Case / constats
- Démonstration : coût 10,31 € au prix de la station 1,990 €/L, partagé à 3.

### Issues Found
- aucune sur la version déployée à cette passe.

## Régression (passage voiture,trajet)
- (rejouée par la spec m5-regression)

## Erreurs de page relevées
- aucune

---

# Passage r3 cas — début 2026-10-21T16:22:54.535Z

Appli déployée https://plein-et-trajet.vercel.app, base Supabase réelle, Playwright (bibliothèque), Chromium headless 390 × 844, toucher, fr-FR, Europe/Paris.
Réel : base EEA (fonction voiture-eea), moyennes du jour (FR SP95-E10 2,156 €/L, Gazole 2,368 €/L), stations et prix du jour, géocodage inverse (fonction lieux), refus de localisation (contexte sans permission), coupure réseau (context.setOffline).
Rejoué : géolocalisation par context.setGeolocation depuis tests/e2e/fixtures/albi-toulouse.gpx (et ses dérivés immobile / tunnel, et barcelone.gpx : vrai itinéraire Valhalla fabriqué par creer-gpx.mjs barcelone), horloge de la page accélérée par page.clock (méthode r1a : avancer l'horloge, poser la position, attendre que T3 l'ait comptée), au rythme réel (1 point/s) pendant les passages par Stations.

## V-1.3 — Démarrer (localisation refusée)

### Happy Path
- Step 3: la localisation refusée (contexte sans permission geolocation) → accueil « Renault Clio » ; permission géolocalisation : denied → capture `V-1.3-03-avant.png` ✓ (16:22:55Z, md5 1f66d5d0)
- Step 4: je touche « Démarrer » → « L'enregistrement a besoin de ta localisation Cadenas de la barre d'adresse → Position → Autoriser » ; URL / ; IndexedDB : enregistrement absent, 0 trajet → capture `V-1.3-04-apres.png` ✓ (16:22:55Z, md5 4cfb9d3a)

### Issues Found
- aucune sur la version déployée à cette passe.

## V-3.5 — Arrêter (cas limites)

### Happy Path
- Step 3: un enregistrement de moins de 1 km (150 positions) → 19 km/h · 0,5 km · 0,04 L · 0,09 € · 0:02 · 12 km/h moy. · — L/100 · 150 points → capture `V-3.5-03-avant.png` ✓ (16:23:00Z, md5 7b1bfbbb)
- Step 4: je touche « Arrêter » → « Trajet trop court : 0,5 km sur 1 minimum. Rien n'est ajouté à l'historique. Retour à l'accueil » ; IndexedDB : 0 trajet, pas de trajet arrêté, pas d'enregistrement → capture `V-3.5-04-apres.png` ✓ (16:23:00Z, md5 b9ab7181)
- Step 5: aucun réseau (context.setOffline(true)) juste avant l'arrêt — 420 positions → navigator.onLine = false ; « Hors ligne : le trajet continue, tout est calculé sur le téléphone. » ; 28 km/h · 2,0 km · 0,17 L · 0,36 € · 0:06 · 17 km/h moy. · 8,4 L/100 · 420 points ; « Prix : moyenne France du jour · 2,156 €/L » → capture `V-3.5-05-avant.png` ✓ (16:23:11Z, md5 427a50d2)
- Step 6: la fin de trajet s'ouvre sans réseau → hors ligne (capture prise pendant la coupure) : titre « 43,928 · 2,146 → 43,917 · 2,144 » (coordonnées, noms pas encore connus) ; « Hors ligne : litres et coût calculés sur le téléphone ; les noms des lieux viendront au retour du réseau. » ; 0,166 L × 2,156 €/L (moyenne gardée au départ) = 0,36 € calculés sur le téléphone → capture `V-3.5-06-apres.png` ✓ (16:23:11Z, md5 b89b64f4)

### Edge Case / constats
- Step 6 — après la capture, retour du réseau (setOffline(false) → événement online) : le titre passe de « 43,928 · 2,146 → 43,917 · 2,144 » à « Albi → Albi » sans rien toucher ✓ ; « Hors ligne » affiché : 0 ; requêtes tentées pendant la coupure : 4 (refusées par le navigateur hors ligne).

### Issues Found
- aucune sur la version déployée à cette passe.

## V-3.E1 — Oubli d'arrêter

### Happy Path
- Step 1: un enregistrement en cours (700 positions, 4 km dans Albi) → 30 km/h · 2,7 km · 0,23 L · 0,50 € · 0:11 · 14 km/h moy. · 8,5 L/100 · 700 points → capture `V-3.E1-01-avant.png` ✓ (16:23:30Z, md5 54e8d736)
- Step 2: vitesse < 3 km/h et position dans 50 m pendant 10 min (points 774 → 1375 du tracé dérivé) → « Trajet arrêté : immobile depuis 10 min. Reprendre C'est fini » au point 1375 (601 s après le début de l'immobilité) ; début daté 16:36:08 (point 774 reçu à 16:36:07, écart 1 s) ; 5 positions de plus : km 4,0 et litres 0,33 figés ; état « Immobile depuis 10 min » → capture `V-3.E1-02-apres.png` ✓ (16:23:46Z, md5 c2d7a3e6)
- Step 3: cette alerte (« C'est fini » sélectionné) → focus « C'est fini » → capture `V-3.E1-03-avant.png` ✓ (16:23:47Z, md5 7504e258)
- Step 4: je touche « C'est fini » → « Albi → Le Sequestre » « 21 oct. 2026 · 12 min · Renault Clio » ; arrivée datée 16:36:08 = début de l'immobilité (point 774, écart 1.0 s) ; durée 774 s : les 10 min d'arrêt ne comptent pas ; 4,01 km → capture `V-3.E1-04-apres.png` ✓ (16:23:48Z, md5 d1ae71ce)
- Step 5: cette alerte (2e trajet rejoué ; « Reprendre » sélectionné) → « Trajet arrêté : immobile depuis 10 min. Reprendre C'est fini » ; 775 points gardés → capture `V-3.E1-05-avant.png` ✓ (16:24:22Z, md5 6bf8ebdb)
- Step 6: je touche « Reprendre » → « Enregistrement » ; 775 points gardés (autant qu'à l'alerte), 4,0 km conservés → capture `V-3.E1-06-apres.png` ✓ (16:24:23Z, md5 fcb7dca5)

### Edge Case / constats
- Garé (points 774 → 1365, bruit ±2 m, juste avant l'alerte) : km 4,0 → 4,0, litres 0,33 → 0,33, vitesse affichée relevée tous les 37 points : 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 km/h ✗ (r1 : 4,0 → 5,1 km et 5 à 10 km/h).
- Step 6 — après « Reprendre », 10 positions de plus (toujours garé) : 775 → 785 points (l'enregistrement repart) ; 0 km/h, 4,0 km, 0,33 L (inchangés).

### Issues Found
- bruit du GPS à l'arrêt encore compté

## V-3.E2 — GPS perdu

### Happy Path
- Step 1: un enregistrement en cours (A68, 121 positions, dernière avant le tunnel) → 105 km/h · 3,5 km · 0,23 L · 0,50 € · 0:02 · 105 km/h moy. · 6,7 L/100 · 121 points → capture `V-3.E2-01-avant.png` ✓ (16:24:29Z, md5 9f86ab0d)
- Step 2: aucune position pendant 16 s → « GPS perdu (tunnel) · la distance est complétée à la sortie. » ; data-etat gps-perdu ; vitesse 0 km/h → capture `V-3.E2-02-apres.png` ✓ (16:24:30Z, md5 cacdb9a9)
- Step 3: le signal revient après 90 s sans position (tunnel de 3,00 km) → toujours « GPS perdu (tunnel) · la distance est complétée à la sortie. » ; 3,5 km figés → capture `V-3.E2-03-avant.png` ✓ (16:24:30Z, md5 828a12a0)
- Step 4: la position suivante arrive → km 3,5 → 6,5 (+3,0 km ; ligne droite entre les 2 positions 3.001 km, chemin réel 3,0007 km, à 120 km/h de moyenne) ; message disparu → capture `V-3.E2-04-apres.png` ✓ (16:24:31Z, md5 17757a7e)

### Issues Found
- aucune sur la version déployée à cette passe.

## V-4.2 — Mettre mon prix

### Happy Path
- Step 1: la fin de trajet (SP95-E10, moyenne du jour) → « Moyenne France du jour » 2.156 €/L ; coût 1,18 € → capture `V-4.2-01-avant.png` ✓ (16:24:35Z, md5 4b83f647)
- Step 2: je touche le compteur, tape 1,989 et valide (Entrée) → « Mon prix » 1,989 €/L ; coût 0,546 × 1,989 = 1,09 € ; « Revenir à la moyenne » affiché → capture `V-4.2-02-apres.png` ✓ (16:24:35Z, md5 da094e2f)
- Step 3: mon prix saisi (« Revenir à la moyenne » sélectionné) → focus « Revenir à la moyenne » → capture `V-4.2-03-avant.png` ✓ (16:24:36Z, md5 280d449d)
- Step 4: je touche « Revenir à la moyenne » → « Moyenne France du jour » 2,156 €/L ; coût 1,18 € (comme avant la saisie) → capture `V-4.2-04-apres.png` ✓ (16:24:36Z, md5 b6955c56)
- Step 5: le champ du prix ouvert (« 1,5 » tapé, pas validé) → « Brens → Parisot » ; champ « 1,5 » ouvert ; coût 1,18 € (moyenne : 1,18 €) ; titre visible → capture `V-4.2-05-avant.png` ✓ (17:49:43Z, md5 e2806f30, brute 0430c94f) — reprise post-audit (m5-reprises-post-audit.mjs) ; prise r3 remplacée : 51afff5a
- Step 6: j'appuie sur Échap → champ fermé ; prix toujours 2,156 €/L « Moyenne France du jour » ; coût 1,18 € ; focus revenu sur « Modifier le prix, 2,156 euros par litre » ; titre visible → capture `V-4.2-06-apres.png` ✓ (17:49:44Z, md5 4c32e43c, brute 9db4fe2f) — reprise post-audit (m5-reprises-post-audit.mjs) ; prise r3 remplacée : ec23a82d

### Issues Found
- aucune sur la version déployée à cette passe.

## V-4.1 — Prix de l'essence

### Happy Path
- Step 1: la fin d'un trajet en Clio SP95-E10 parti de France (écran Fin de trajet, haut de l'écran) → En route juste avant « Arrêter » : « Prix : moyenne France du jour · 2,156 €/L » ; 105 km/h · 8,2 km · 0,55 L · 1,18 € · 0:04 · 110 km/h moy. · 6,6 L/100 · 182 points ; fin : « Brens → Parisot » · « 21 oct. 2026 · 4 min · Renault Clio » ; 0,55 L → capture `V-4.1-01-avant.png` ✓ (16:24:33Z, md5 14e22fbb)
- Step 2: l'écran Fin de trajet s'ouvre (sélecteur et prix) → sélecteur Gazole · SP95-E10 · SP95 · SP98 · E85 · GPLc, SP95-E10 choisi ; « Moyenne France du jour » ; compteur « Modifier le prix, 2,156 euros par litre » (3 décimales) = moyenne France SP95-E10 lue par l'API 2,156 ; coût 1,18 € essence → capture `V-4.1-02-apres.png` ✓ (16:24:33Z, md5 abe4d049)
- Step 3: ce sélecteur (Gazole sélectionné au clavier) → focus « Gazole » → capture `V-4.1-03-avant.png` ✓ (16:24:34Z, md5 a0673c83)
- Step 4: je touche Gazole → « Moyenne France du jour » 2,368 €/L (moyenne France Gazole de l'API 2,368) ; coût 0,546 × 2,368 = 1,29 € → capture `V-4.1-04-apres.png` ✓ (16:24:34Z, md5 78257af7)
- Step 5: un départ hors de France : vrai itinéraire dans Barcelone (plaça de Catalunya → Sagrada Família, 3,2 km rejoués), arrêté — l'écran Fin de trajet tel qu'il s'ouvre (haut de l'écran) → En route juste avant « Arrêter » : « Prix : moyenne Espagne du jour · 1,790 €/L » ; fin : « Barcelone → Barcelone » · « 21 oct. 2026 · 11 min · Renault Clio » ; 0,26 L, 3,2 km ; pays de départ enregistré ES (IndexedDB) ; titre visible → capture `V-4.1-05-avant.png` ✓ (17:49:36Z, md5 af522cd4, brute af522cd4) — reprise post-audit (m5-reprises-post-audit.mjs) ; prise r3 remplacée : 81b37ae2
- Step 6: l'écran Fin de trajet s'ouvre → « Barcelone → Barcelone » ; « Moyenne Espagne du jour » 1,790 €/L (moyenne Espagne SP95-E10 de l'API : 1,790) ; pays de départ enregistré ES → capture `V-4.1-06-apres.png` ✓ (16:24:59Z, md5 c1d7dfcf)

### Issues Found
- aucune sur la version déployée à cette passe.

## V-4.7 — Enregistrer ou supprimer (supprimer, appli fermée)

### Happy Path
- Step 3: un trajet qui vient d'être arrêté (celui de la coupure réseau, noms complétés) → « Albi → Albi » ; boutons « Supprimer Enregistrer » → capture `V-4.7-03-avant.png` ✓ (16:23:12Z, md5 87cc2689)
- Step 4: je touche « Supprimer » → accueil (URL /) ; IndexedDB : 0 trajet, aucun trajet arrêté ni point gardé ; Historique : « Aucun trajet enregistré. » → capture `V-4.7-04-apres.png` ✓ (16:23:13Z, md5 25c9bd31)
- Step 5: un trajet arrêté (Barcelone), pas encore tranché ; je ferme l'appli → trajet a360ae0f-7158-418d-b050-f6e7276b41fa ; boutons « Supprimer Enregistrer » → capture `V-4.7-05-avant.png` ✓ (16:24:59Z, md5 4b07c885)
- Step 6: je rouvre l'appli (navigateur relancé, même profil) → URL /fin ; même trajet a360ae0f-7158-418d-b050-f6e7276b41fa « Barcelone → Barcelone » ; « Supprimer Enregistrer » → capture `V-4.7-06-apres.png` ✓ (16:25:03Z, md5 45d571b5)

### Issues Found
- aucune sur la version déployée à cette passe.

## Régression (passage cas)
- US-4.E2 (T4) : « 7 » validé → « Entre un prix entre 0,50 et 4,00 €/L », prix gardé 2.156 ✓

## Erreurs de page relevées
- aucune

---

# Passage r3 stations — début 2026-10-21T16:25:15.206Z

Appli déployée https://plein-et-trajet.vercel.app, base Supabase réelle, Playwright (bibliothèque), Chromium headless 390 × 844, toucher, fr-FR, Europe/Paris.
Réel : base EEA (fonction voiture-eea), moyennes du jour (FR SP95-E10 2,156 €/L, Gazole 2,368 €/L), stations et prix du jour, géocodage inverse (fonction lieux), refus de localisation (contexte sans permission), coupure réseau (context.setOffline).
Rejoué : géolocalisation par context.setGeolocation depuis tests/e2e/fixtures/albi-toulouse.gpx (et ses dérivés immobile / tunnel, et barcelone.gpx : vrai itinéraire Valhalla fabriqué par creer-gpx.mjs barcelone), horloge de la page accélérée par page.clock (méthode r1a : avancer l'horloge, poser la position, attendre que T3 l'ait comptée), au rythme réel (1 point/s) pendant les passages par Stations.

## V-5.1 — Stations autour de moi

### Happy Path
- Step 1: la position autorisée (Albi) : accueil, en-tête « Autour de moi » → en-tête « Autour de moi » (position GPS reçue) ; position du contexte 43.92833, 2.145916 ; permission granted → capture `V-5.1-01-avant.png` ✓ (16:25:16Z, md5 25c9bd31)
- Step 2: je touche l'onglet Stations → en-tête « Autour de moi » ; ma position dans le cadre de la carte ; 8 stations à moins de 10 km, 8 pastilles ; 8 prix SP95-E10 identiques à la base (table prix) ; 1re « TotalEnergies Albi · Relais des Fontanelles 2,2 km · hier · −16,6 c vs France 1,990 €/L » → capture `V-5.1-02-apres.png` ✓ (16:25:19Z, md5 d65b0ed3)

### Issues Found
- aucune sur la version déployée à cette passe.

## V-5.2 — Choisir le carburant

### Happy Path
- Step 1: une Clio SP95-E10 enregistrée (accueil) ; dernier carburant regardé dans Stations : Gazole → accueil « Renault Clio · 1.2 · 118 ch · 2017 · SP95-E10 » ; localStorage pt-carburant = « Gazole » ; position Prayssac 44.5041, 1.1885 → capture `V-5.2-01-avant.png` ✓ (16:25:20Z, md5 25c9bd31)
- Step 2: j'ouvre l'onglet Stations → SP95-E10 choisi d'office (aria-pressed), malgré le dernier choix Gazole ; titre « Stations · SP95-E10 » → capture `V-5.2-02-apres.png` ✓ (16:25:24Z, md5 d8926428)
- Step 3: la liste en SP95-E10 autour de Prayssac → 5 stations SP95-E10 : 46220005 TotalEnergies Prayssac 510 m | 46700001 Intermarché Puy-l'Évêque 3,6 km | 46220003 Intermarché Prayssac 310 m | 46220002 Carrefour Market Prayssac 1,1 km | 46140003 Système U Parnac 9,7 km ; 46220005 en base : E85 0.934, SP95-E10 1.99 (aucune ligne Gazole) → capture `V-5.2-03-avant.png` ✓ (16:25:24Z, md5 d8926428)
- Step 4: je touche Gazole → titre « Stations · Gazole » ; 4 lignes et 4 pastilles au prix gazole de la base (contre 5 lignes et 5 pastilles en SP95-E10) ; stations SP95-E10 sans gazole en base : 46220005 → absentes de la liste et de la carte (pastille 46220005 : 0) ; lignes : 46700001 2,347 | 46220003 2,349 | 46220002 2,359 | 46140003 2,369 → capture `V-5.2-04-apres.png` ✓ (16:25:28Z, md5 7965bb04)

### Issues Found
- aucune sur la version déployée à cette passe.

## V-5.4 — Trier

### Happy Path
- Step 1: la liste des stations (SP95-E10, tri « Moins cher ») → tri prix ; 8 stations → capture `V-5.4-01-avant.png` ✓ (16:25:30Z, md5 d65b0ed3)
- Step 2: je touche « Plus proche » → « Plus proche » : distances croissantes 1,8 ≤ 1,9 ≤ 2,2 ≤ 2,3 ≤ 3,1 ≤ 3,3 ≤ 6,8 ≤ 9,4… (8) ; « Moins cher » : prix croissants 1,990 ≤ 1,990 ≤ 2,149 ≤ 2,178 ≤ 2,178 ≤ 2,178… ; capture sur « Plus proche » → capture `V-5.4-02-apres.png` ✓ (16:25:33Z, md5 6e208d04)

### Issues Found
- aucune sur la version déployée à cette passe.

## V-5.5 — Utiliser ce prix

### Happy Path
- Step 3: aucun trajet en cours ; fiche de la station la moins chère → fiche « TotalEnergies Albi · Relais des Fontanelles » ; bouton « Utiliser 1,990 €/L pour mon trajet » ; pas de bandeau (0) → capture `V-5.5-03-avant.png` ✓ (16:25:34Z, md5 74cb548d)
- Step 4: je touche ce bouton → accueil ouvert (URL /) ; prix gardé : pt-prix-choisi = {"prix":1.99,"carburant":"SP95-E10","station":"TotalEnergies Albi · Relais des Fontanelles"} (la capture montre l'accueil après l'essai de démarrage, revenu par « trop court ») → capture `V-5.5-04-apres.png` ✓ (16:25:35Z, md5 25c9bd31)
- Step 5: une station qui ne vend pas le SP95-E10 de ma voiture (liste Gazole) → « Carrefour Market Puygouzon 4,3 km · il y a 8 h · −1,3 c vs France 2,355 €/L » (81990003) : aucun prix SP95-E10 vendu en base (absent ou rupture) → capture `V-5.5-05-avant.png` ✓ (16:25:39Z, md5 e94ad10b)
- Step 6: sa fiche s'ouvre → fiche « Carrefour Market Puygouzon » ; SP95-E10 « SP95-E10 non vendu » ; pas de bouton « Utiliser … pour mon trajet » → capture `V-5.5-06-apres.png` ✓ (16:25:40Z, md5 cdc24f56)

### Edge Case / constats
- Step 4 — trajet démarré ensuite : « Prix : mon prix · 1,990 €/L » ; pt-prix-choisi vidé au départ (null).

### Issues Found
- aucune sur la version déployée à cette passe.

## V-5.7 — Europe et Royaume-Uni

### Happy Path
- Step 1: une position à Barcelone (41,3874, 2,1686) : accueil, en-tête « Autour de moi » → en-tête « Autour de moi » ; position du contexte 41.3874, 2.1686 (Barcelone) ; la V1 ne montre la position que dans l'onglet Stations → capture `V-5.7-01-avant.png` ✓ (16:25:42Z, md5 25c9bd31)
- Step 2: l'onglet Stations s'ouvre → 153 stations espagnoles (pays ES en base), 153 pastilles, prix SP95-E10 = base ; 1re « Tamoil Hospitalet de llobregat (l') · Tamoil 6,0 km · il y a 18 min · −29,1 c vs Espagne 1,499 €/L » → capture `V-5.7-02-apres.png` ✓ (16:25:49Z, md5 17704d99)
- Step 3: une position à Dartford (Royaume-Uni) → 18 stations, pays GB ; 1re « Morrisons · MFG Morrisons Grays, London Road, GRAYS 7,9 km · il y a 17 h · −4,8 c vs Royaume-Uni 2,022 €/L » → capture `V-5.7-03-avant.png` ✓ (16:25:53Z, md5 c647b527)
- Step 4: je lis une station (fiche) → fiche « Morrisons · MFG Morrisons Grays, London Road, GRAYS » ; Gazole 2,343 €/L ← 196,9 p/L ; SP95 2,022 €/L ← 169,9 p/L ; SP95-E10 2,022 €/L ← 169,9 p/L ; SP98 2,260 €/L ← 189,9 p/L ; « 1 € = 0,8403 £ · BCE 20/10 » (taux BCE en base 0.84028) → capture `V-5.7-04-apres.png` ✓ (16:25:54Z, md5 010bf118)
- Step 5: un pays qui ne publie pas ses prix station par station : Belgique (position Bruxelles), carte glissée → statut du pays en base : « aucun » ; bouton « Rechercher dans cette zone » → capture `V-5.7-05-avant.png` ✓ (16:26:06Z, md5 e1ec15d3)
- Step 6: j'y cherche dans cette zone → « Ce pays ne publie pas les prix station par station Moyenne nationale · Belgique · SP95-E10 : 1,977 €/L » (message apparu après le toucher, stable 1,5 s ; suite des états : autre 62 ms → vide 624 ms → pays 2778 ms) ; en-tête « Autour de Schaerbeek » ; 0 ligne → capture `V-5.7-06-apres.png` ✓ (17:50:05Z, md5 f62741bb, brute f62741bb) — reprise post-audit (m5-reprises-post-audit.mjs) ; prise r3 remplacée : d783b715

### Issues Found
- aucune sur la version déployée à cette passe.

## Régression (passage stations)
- (rejouée par la spec m5-regression)

## Erreurs de page relevées
- aucune

---

# Passage r3 historique,retraits — début 2026-10-21T16:26:18.182Z

Appli déployée https://plein-et-trajet.vercel.app, base Supabase réelle, Playwright (bibliothèque), Chromium headless 390 × 844, toucher, fr-FR, Europe/Paris.
Réel : base EEA (fonction voiture-eea), moyennes du jour (FR SP95-E10 2,156 €/L, Gazole 2,368 €/L), stations et prix du jour, géocodage inverse (fonction lieux), refus de localisation (contexte sans permission), coupure réseau (context.setOffline).
Rejoué : géolocalisation par context.setGeolocation depuis tests/e2e/fixtures/albi-toulouse.gpx (et ses dérivés immobile / tunnel, et barcelone.gpx : vrai itinéraire Valhalla fabriqué par creer-gpx.mjs barcelone), horloge de la page accélérée par page.clock (méthode r1a : avancer l'horloge, poser la position, attendre que T3 l'ait comptée), au rythme réel (1 point/s) pendant les passages par Stations.

## V-6.1 — Ouvrir l'historique

### Happy Path
- Step 1: des trajets enregistrés en septembre et en octobre 2026 (deux trajets réellement rejoués, horloge de la page posée au 14/09 08:00 et au 05/10 17:30) : la fin du trajet d'octobre juste avant « Enregistrer » → IndexedDB : 2026-09-14 2.5 km (septembre, enregistré) ; écran : « Albi → Albi » · « 5 oct. 2026 · 14 min · Renault Clio » (octobre, pas encore enregistré) → capture `V-6.1-01-avant.png` ✓ (16:26:51Z, md5 0a53a98f)
- Step 2: je touche l'onglet Historique → groupes Octobre 2026 puis Septembre 2026 ; lignes : Albi → Albi 5 oct. · 6,6 km · SP95-E10 à 2,156 €/L 1,01 € | Albi → Albi 14 sept. · 2,5 km · SP95-E10 à 2,156 €/L 0,44 € → capture `V-6.1-02-apres.png` ✓ (16:26:52Z, md5 6d2d5629)
- Step 3: aucun trajet enregistré (téléphone neuf, voiture enregistrée) : l'accueil, onglet Historique pas encore ouvert → IndexedDB : 0 trajet ; onglet actif « onglet-trajet » → capture `V-6.1-03-avant.png` ✓ (16:26:53Z, md5 25c9bd31)
- Step 4: j'ouvre l'onglet Historique → « Aucun trajet enregistré. » ; totaux « 0 trajets 0,0 km 0,00 € essence » → capture `V-6.1-04-apres.png` ✓ (16:26:53Z, md5 489260c4)

### Issues Found
- aucune sur la version déployée à cette passe.

## V-6.2 — Totaux

### Happy Path
- Step 1: ÉTAT PRÉPARÉ : 4 trajets de 77, 152, 245 et 243 km écrits en IndexedDB (format TrajetV1 de l'appli) — leurs lignes dans l'historique → trajets 77 km 4,93 L, 152 km 10,03 L, 245 km 16,91 L, 243 km 16,28 L au prix moyen France SP95-E10 du jour 2,156 → coûts 10,63 + 21,62 + 36,46 + 35,10 ; lignes « Albi → Montpellier 16 oct. · 243 km · SP95-E10 à 2,156 €/L 35,10 € | Toulouse → Bordeaux 12 oct. · 245 km · SP95-E10 à 2,156 €/L 36,46 € | Albi → Cahors 8 oct. · 152 km · SP95-E10 à 2,156 €/L 21,62 € | Albi → Toulouse 3 oct. · 77,0 km · SP95-E10 à 2,156 €/L 10,63 € » → capture `V-6.2-01-avant.png` ✓ (16:26:54Z, md5 71e1827a)
- Step 2: l'historique s'affiche → totaux « 4 trajets 717 km 103,81 € essence » = 4 trajets, 717 km, 103,81 € (somme des coûts des lignes 35,10 + 36,46 + 21,62 + 10,63) → capture `V-6.2-02-apres.png` ✓ (16:26:55Z, md5 acc52b1b)
- Step 3: un trajet corrigé : celui de 152 km rouvert, prix passé à 1,899 €/L → « Mon prix » ; coût 19,05 € essence → capture `V-6.2-03-avant.png` ✓ (16:26:55Z, md5 dec67d4e)
- Step 4: je reviens à l'historique → totaux recalculés « 4 trajets 717 km 101,24 € essence » (= 101,24 €) ; ligne 152 km : Albi → Cahors 8 oct. · 152 km · SP95-E10 à 1,899 €/L 19,05 € → capture `V-6.2-04-apres.png` ✓ (16:26:56Z, md5 968aa8a5)

### Issues Found
- aucune sur la version déployée à cette passe.

## V-6.3 — Lire un trajet

### Happy Path
- Step 1: ÉTAT PRÉPARÉ : un trajet enregistré à 3 personnes (Albi → Rodez) et un trajet seul, écrits en IndexedDB → prep-3p 92.4 km 3 pers. ; prep-seul 76.8 km 1 pers. → capture `V-6.3-01-avant.png` ✓ (16:26:57Z, md5 591d58cc)
- Step 2: je lis sa ligne (sélectionnée au clavier) → ligne « Albi → Rodez 18 oct. · 92,4 km · SP95-E10 à 2,156 €/L · 4,32 € chacun 12,96 € » (date, départ → arrivée, km, coût, 4,32 € chacun) ; trajet seul : « Toulouse → Albi 19 oct. · 76,8 km · SP95-E10 à 2,156 €/L 10,44 € » sans part → capture `V-6.3-02-apres.png` ✓ (16:26:57Z, md5 5b176cea)
- Step 3: une ligne (le trajet seul, sélectionné au clavier) → « Toulouse → Albi 19 oct. · 76,8 km · SP95-E10 à 2,156 €/L 10,44 € » → capture `V-6.3-03-avant.png` ✓ (16:26:57Z, md5 da46a748)
- Step 4: je la touche → fin de ce trajet « Toulouse → Albi » ; onglet Historique sélectionné ; « ← Historique » ; bouton « Supprimer ce trajet » → capture `V-6.3-04-apres.png` ✓ (16:26:58Z, md5 4be22b18)

### Issues Found
- aucune sur la version déployée à cette passe.

## V-6.4 — Revoir, corriger, supprimer

### Happy Path
- Step 1: un trajet rouvert depuis l'historique (le trajet seul), réglages de prix et de personnes → prix « Moyenne France du jour » 2.156 ; 1 personne → capture `V-6.4-01-avant.png` ✓ (16:26:58Z, md5 620bbdfc)
- Step 2: je change son carburant (Gazole) et son nombre de personnes (2), puis je reviens à l'historique → IndexedDB : Gazole, 2 personnes, 2.368 €/L ; ligne « Toulouse → Albi 19 oct. · 76,8 km · Gazole à 2,368 €/L · 5,73 € chacun 11,46 € » → capture `V-6.4-02-apres.png` ✓ (16:26:59Z, md5 c26d471a)
- Step 3: un trajet rouvert (Albi → Rodez, 3 personnes) → « Albi → Rodez » ; bouton « Supprimer ce trajet » ; titre coupé de 15 px → capture `V-6.4-03-avant.png` ✓ (17:49:45Z, md5 1995676f, brute c9610fb7) — reprise post-audit (m5-reprises-post-audit.mjs) ; prise r3 remplacée : 94a8a784
- Step 4: je touche « Supprimer ce trajet » → disparu de la liste ; totaux « 1 trajet 76,8 km 11,46 € essence » (1 trajet, 76,8 km) ; IndexedDB 1 trajet → capture `V-6.4-04-apres.png` ✓ (16:27:00Z, md5 06947c50)

### Issues Found
- aucune sur la version déployée à cette passe.

## V-4.3 — Coût de l'essence

### Happy Path
- Step 1: ÉTAT PRÉPARÉ : un trajet arrêté de 41,2 L, prix 2,161 €/L (« Mon prix »), écrit en IndexedDB (en_cours/arrete) — sa fin de trajet, haut de l'écran → trajet arrêté en attente : 588 km ; écran « 41,20 litres », prix data-prix 2.161 (« Mon prix ») → capture `V-4.3-01-avant.png` ✓ (16:27:02Z, md5 2a08b036)
- Step 2: la fin de trajet s'affiche (appli ouverte : le trajet arrêté revient) — le coût → « 89,03 € essence » (41,2 × 2,161 = 89.0332 → 89,03) ; libellé « Mon prix » → capture `V-4.3-02-apres.png` ✓ (16:27:03Z, md5 28848602)
- Step 3: le prix changé (réseau coupé : context.setOffline(true)) — « 2,050 » tapé → navigator.onLine = false ; champ « 2,050 » → capture `V-4.3-03-avant.png` ✓ (16:27:03Z, md5 fe3b9b0c)
- Step 4: je valide (Entrée), toujours sans réseau → « 84,46 € essence » = 41,2 × 2,050 recalculé aussitôt, hors ligne (navigator.onLine false) → capture `V-4.3-04-apres.png` ✓ (16:27:04Z, md5 80168f3a)

### Edge Case / constats
- Step 4 — toujours hors ligne : « Revenir à la moyenne » → 88,83 € (41,2 × 2,156), puis Gazole → 97,56 € (41,2 × 2,368) ✓, sur les moyennes gardées dans le trajet ; requêtes émises pendant ces changements : 0 (aucune).

### Issues Found
- aucune sur la version déployée à cette passe.

## V-4.4 — Partager

### Happy Path
- Step 1: un coût de 89,03 € (SP95-E10, mon prix 2,161 €/L), 1 personne → « 89,03 € essence » ; « Seul : tout pour toi. » → capture `V-4.4-01-avant.png` ✓ (16:27:04Z, md5 1a289b29)
- Step 2: je passe le nombre de personnes à 3 avec « + » → 3 personnes → « 29,68 € chacun » (89,03 ÷ 3 = 29,677) → capture `V-4.4-02-apres.png` ✓ (16:27:05Z, md5 4a51319f)
- Step 3: 1 personne → 1 personne ; « Seul : tout pour toi. » → capture `V-4.4-03-avant.png` ✓ (16:27:05Z, md5 edebce3f)
- Step 4: l'écran s'affiche ; j'essaie de descendre sous 1 et de monter au-delà de 9 → « Seul : tout pour toi. » ; « − » désactivé à 1 (toucher : reste 1) ; 10 touchers sur « + » → 9, « + » désactivé ; revenu à 1 : « Seul : tout pour toi. » → capture `V-4.4-04-apres.png` ✓ (16:27:07Z, md5 05ea7711)

### Edge Case / constats
- Step 4 — une seule image ne peut pas montrer les deux bornes : la capture est à 1 personne (« Seul : tout pour toi. », « − » désactivé) ; la borne 9 (« + » désactivé après 10 touchers) est relevée dans le constat de l'étape, puis le compteur est ramené à 1.

### Issues Found
- aucune sur la version déployée à cette passe.

## V1-retraits — Contrôle négatif : ce qui sort de la V1

### Happy Path
- Step 1: l'appli déployée, journal réseau Playwright ouvert sur TOUS les contextes du passage (écoute context.on('request'), y compris les processus précédents du même passage, relus dans exploration/m5-resultats-<passage>-*.json) → 105 requêtes de ce processus → capture `V1-retraits-01-avant.png` ✓ (16:27:07Z, md5 25c9bd31)
- Step 2: parcours T1 → T6 (+ tous les flux du passage, dont 5 trajets complets rejoués) → 634 requêtes journalisées sur 16 contextes : 0 vers api.myptv.com, 0 vers estimer-trajet / trajet-roule / péages ; fonctions appelées {"lieux":31,"voiture-eea":9} ; hôtes {"plein-et-trajet.vercel.app":121,"fonts.googleapis.com":35,"fonts.gstatic.com":166,"rglrwtkqwihdztgqlbsy.supabase.co":174,"":8,"tiles.openfreemap.org":126,"data.geopf.fr":3,"photon.komoot.io":1} ; 137 captures (contextes cas-refus, cas, barcelone, stations, stations-prayssac, barcelone-stations, dartford, bruxelles, voiture, trajet, historique-reel, historique-vide, historique-prepare, historique-prepare-2, cout-prepare, retraits) + 6 routes passées au crible : aucun « péage » ni « itinéraire » ; aucun champ départ / arrivée ; aucun lien Moteurs ; onglets Trajet · Stations · Historique → capture `V1-retraits-02-apres.png` ✓ (16:27:28Z, md5 b365577c)
- Step 3: la table public.moteurs lue par l'API Supabase (rôle service), rendue en page texte → prix:true, moyennes:true, itineraire:true, peages:false, voitures:true, lieux:true, vehicules:true → capture `V1-retraits-03-avant.png` ✓ (16:27:29Z, md5 eff32280)
- Step 4: je lis la ligne du service péages, et le nombre de lignes des clés → peages : en_service = false (fournisseur ptv gardé) ; cles_fournisseurs 2 lignes (2 avant) ; Vault 3 secrets (cle_ptv, cle_stadia, sync_prix_secret ; 3 avant) ; limite d'inscriptions anonymes 30 → capture `V1-retraits-04-apres.png` ✓ (16:27:30Z, md5 20039950)

### Issues Found
- aucune sur la version déployée à cette passe.

## Régression (passage historique,retraits)
- US-3.E3 (T6) : historique vide → « Aucun trajet enregistré. », totaux 0 trajets 0,0 km 0,00 € essence ✓

## Erreurs de page relevées
- aucune

---

# Passage r3 voiture,trajet — début 2026-10-21T16:34:06.610Z

Appli déployée https://plein-et-trajet.vercel.app, base Supabase réelle, Playwright (bibliothèque), Chromium headless 390 × 844, toucher, fr-FR, Europe/Paris.
Réel : base EEA (fonction voiture-eea), moyennes du jour (FR SP95-E10 2,156 €/L, Gazole 2,368 €/L), stations et prix du jour, géocodage inverse (fonction lieux), refus de localisation (contexte sans permission), coupure réseau (context.setOffline).
Rejoué : géolocalisation par context.setGeolocation depuis tests/e2e/fixtures/albi-toulouse.gpx (et ses dérivés immobile / tunnel, et barcelone.gpx : vrai itinéraire Valhalla fabriqué par creer-gpx.mjs barcelone), horloge de la page accélérée par page.clock (méthode r1a : avancer l'horloge, poser la position, attendre que T3 l'ait comptée), au rythme réel (1 point/s) pendant les passages par Stations.

## V-2.E1 — Code inconnu

### Happy Path
- Step 1: champ D.2, je commence « ZZ999 » → champ « ZZ999 » ; aucune fiche → capture `V-2.E1-01-avant.png` ✓ (16:34:29Z, md5 30061b50)
- Step 2: je tape « ZZ9999 » (absent de la base EEA) → « Code introuvable. Vérifie la case D.2, ou cherche par nom ci-dessous. » (data-code code_inconnu) ; « Enregistrer ma voiture » désactivé → capture `V-2.E1-02-apres.png` ✓ (16:34:36Z, md5 97b42982)
- Step 3: MOCKED (page.route : la base européenne ne tombe pas sur commande) — base injoignable, je commence « 5RBF0 » → champ « 5RBF0 » ; réponse de voiture-eea remplacée par un 502 base_injoignable côté navigateur → capture `V-2.E1-03-avant.png` ✓ (16:34:37Z, md5 a61a559c)
- Step 4: MOCKED — je tape « 5RBF0A » → « La base européenne des voitures ne répond pas. Réessayer » ; champ toujours « 5RBF0A » ; « Enregistrer ma voiture » désactivé : true → capture `V-2.E1-04-apres.png` ✓ (16:34:38Z, md5 5c941515)

### Edge Case / constats
- Step 4 — route retirée puis « Réessayer » touché : la vraie base répond, fiche « Renault Clio 1.5 · 75 ch · Gazole » (après la capture).

### Issues Found
- aucune sur la version déployée à cette passe.

## V-2.3 — Chercher sans la carte grise

### Happy Path
- Step 1: je touche le champ « Nom, année, puissance » → champ recherche vide et sélectionné (focus #q) → capture `V-2.3-01-avant.png` ✓ (16:34:41Z, md5 b544eff0)
- Step 2: je tape « clio 2017 120 » → 6 suggestions, toutes Clio 2017 entre 115 et 125 ch, avec année, kW et carburant : Renault Clio 1.2 · 118 ch 2017 · 87 kW · 1 165 kg · SP95-E10 · D.2 5RBU0C | Renault Clio 1.2 · 118 ch 2017 · 87 kW · 1 165 kg · SP95-E10 · D.2 5RBU0D | Renault Clio 1.2 · 118 ch 2017 · 87 kW · 1 243 kg · SP95-E10 · D.2 7RBU0C | Renault Clio 1.2 · 118 ch 2017 · 87 kW · 1 270 kg · SP95-E10 · D.2 7RBU0D | Renault Clio 1.2 · 120 ch 2017 · 88 kW · 1 255 kg · SP95-E10 · D.2 2R401E | Renault Clio 1.2 · 120 ch 2017 · 88 kW · 1 165 kg · SP95-E10 · D.2 5R400E → capture `V-2.3-02-apres.png` ✓ (16:34:44Z, md5 94fc3744)
- Step 3: la première suggestion (sélectionnée au clavier) → « Renault Clio 1.2 · 118 ch 2017 · 87 kW · 1 165 kg · SP95-E10 · D.2 5RBU0C » → capture `V-2.3-03-avant.png` ✓ (16:34:45Z, md5 2a0e53b8)
- Step 4: je la touche → fiche « Renault Clio 1.2 · 118 ch » 2017 · 87 kW · 118 ch · 1 165 kg · SP95-E10 (data-cle RENAULT·R·5RBU·5RBU0C·2017) ; « Enregistrer ma voiture » actif → capture `V-2.3-04-apres.png` ✓ (16:34:45Z, md5 666b2a39)

### Issues Found
- aucune sur la version déployée à cette passe.

## V-2.1 — Saisir le code D.2

### Happy Path
- Step 1: écran Ma voiture, je touche le champ D.2 → champ D.2 vide et sélectionné (focus d2) ; « Enregistrer ma voiture » désactivé → capture `V-2.1-01-avant.png` ✓ (16:34:11Z, md5 7ef84a1a)
- Step 2: je tape « 5RBU0C » (code déjà en cache versions_eea) → fiche « Renault Clio 1.2 · 118 ch » : année 2017 · 87 kW · 118 ch · 1 197 cm³ · 1 165 kg · SP95-E10 · 118 g/km (NEDC) · « Base européenne EEA » ; liste : Renault Clio 1.2 · 118 ch 2017 · 87 kW · 1 165 kg · SP95-E10 · 13 864 immatriculées Renault Clio 1.2 · 118 ch 2018 · 87 kW · 1 165 kg · SP95-E10 · 11 043 immatriculées → capture `V-2.1-02-apres.png` ✓ (16:34:13Z, md5 751a56a9)
- Step 3: code partagé par plusieurs versions, jamais demandé à l'appli : je tape « AD6DB000M000 » sauf le dernier caractère → champ « AD6DB000M00 » ; AD6DB000M000 absent de versions_eea (0 ligne, lu par l'API avant la saisie) → capture `V-2.1-03-avant.png` ✓ (16:34:14Z, md5 df9f2425)
- Step 4: je tape le dernier caractère (« AD6DB000M000 ») puis je choisis la 2e version → 2 versions, la plus immatriculée en tête (41724 ≥ 8559…) ; marques Dacia ; années 2019, 2018 ; masses 1 480 kg ; 1re : « Dacia Duster 1.5 · 116 ch 2019 · 85 kW · 1 480 kg · Gazole · 41 724 immatriculées » ; 2e touchée → fiche « Dacia Duster 1.5 · 116 ch » → capture `V-2.1-04-apres.png` ✓ (16:34:26Z, md5 d127ebe4)
- Step 5: je commence à taper en minuscules avec espaces : « r 5rbu » → champ « R 5RBU » (saisie en minuscules mise en majuscules à la frappe) ; pas de recherche (5 caractères sans espaces) → capture `V-2.1-05-avant.png` ✓ (16:34:27Z, md5 eae4cab5)
- Step 6: je finis « r 5rbu 5rbu0c » → champ « R 5RBU 5RBU0C » ; requête envoyée « d2=R 5RBU 5RBU0C » ; fiche « Renault Clio 1.2 · 118 ch · 2017 » (data-cle RENAULT·R·5RBU·5RBU0C·2017) : reconnu comme 5RBU0C → capture `V-2.1-06-apres.png` ✓ (16:34:28Z, md5 40fcd897)

### Edge Case / constats
- Step 2 — écart de libellé face au plan : l'écran nomme « Renault Clio 1.2 · 118 ch » ; le plan dit « Renault Clio 1.2 TCe 120 ». La base EEA ne porte ni « TCe » ni « 120 » (Cn = CLIO) ; les chiffres sont ceux du plan.
- Step 2 — cache : 5RBU0C présent dans versions_eea AVANT la saisie (2 lignes, années 2017/2018) : c'est le chemin « version déjà en cache ».
- Step 4 — chemin « jamais demandée » : AD6DB000M000 absent du cache avant, 2 ligne(s) dans versions_eea après (écrites par la fonction).

### Issues Found
- aucune sur la version déployée à cette passe.

## V-1.2 — Voir ma voiture

### Happy Path
- Step 1: la Clio enregistrée (accueil, juste après « Enregistrer ma voiture ») → accueil « Renault Clio » « 1.2 · 118 ch · 2017 · SP95-E10 » ; onglet onglet-trajet ; localStorage pt-voiture-v1 = 5RBU0C → capture `V-1.2-01-avant.png` ✓ (16:34:48Z, md5 25c9bd31)
- Step 2: l'accueil s'affiche (page rechargée) → ÉCART DE LIBELLÉ : l'écran montre « Renault Clio » et « 1.2 · 118 ch · 2017 · SP95-E10 », le plan attend « Renault Clio IV » et « 1.2 TCe 120 · 2017 · SP95-E10 » ; la base EEA (Cn = CLIO) ne porte ni « IV » ni « TCe 120 » → capture `V-1.2-02-apres.png` ✗ (16:34:49Z, md5 25c9bd31)
- Step 3: l'accueil, « Changer » sélectionné au clavier → focus sur « Changer » → capture `V-1.2-03-avant.png` ✓ (16:34:49Z, md5 7ff02c6d)
- Step 4: je touche « Changer » → écran Ma voiture, D.2 « » et recherche « » vides ; aucune fiche (0) → capture `V-1.2-04-apres.png` ✓ (16:34:49Z, md5 1ee8c79b)
- Step 5: l'appli telle que je la laisse, juste avant de fermer le navigateur (puis relance sur le même profil) → URL https://plein-et-trajet.vercel.app/ ; accueil « Renault Clio » ; localStorage pt-voiture-v1 = 5RBU0C → capture `V-1.2-05-avant.png` ✓ (16:34:51Z, md5 25c9bd31)
- Step 6: je rouvre l'appli → accueil : « Renault Clio » « 1.2 · 118 ch · 2017 · SP95-E10 », rien ressaisi → capture `V-1.2-06-apres.png` ✓ (16:34:52Z, md5 25c9bd31)

### Edge Case / constats
- Step 5 — navigateur fermé puis relancé sur le même profil : onglet about:blank avant d'ouvrir l'appli.

### Issues Found
- Step 2 (V-1.2-02-apres.png) : ÉCART DE LIBELLÉ : l'écran montre « Renault Clio » et « 1.2 · 118 ch · 2017 · SP95-E10 », le plan attend « Renault Clio IV » et « 1.2 TCe 120 · 2017 · SP95-E10 » ; la base EEA (Cn = CLIO) ne porte ni « IV » ni « TCe 120 »

## V-2.2 — Vérifier et enregistrer

### Happy Path
- Step 1: la fiche de ma version (5RBU0C, 2017) affichée → fiche « Renault Clio 1.2 · 118 ch · 2017 » ; bouton « Enregistrer ma voiture » actif → capture `V-2.2-01-avant.png` ✓ (16:34:47Z, md5 62682fff)
- Step 2: je touche « Enregistrer ma voiture » → accueil : « Renault Clio » « 1.2 · 118 ch · 2017 · SP95-E10 » ; localStorage pt-voiture-v1 = Renault Clio 5RBU0C 2017 → capture `V-2.2-02-apres.png` ✓ (16:34:48Z, md5 25c9bd31)
- Step 3: aucune version identifiée : D.2 vide, « zz » dans la recherche par nom → D.2 «  », recherche « zz » (moins de 3 caractères : pas de recherche) ; aucune fiche (0) → capture `V-2.2-03-avant.png` ✓ (16:34:40Z, md5 1ab1da9e)
- Step 4: je regarde « Enregistrer ma voiture » (D.2 incomplet « 5RB ») → aucune fiche ; « Enregistrer ma voiture » désactivé (disabled) → capture `V-2.2-04-apres.png` ✓ (16:34:41Z, md5 8d8f6635)

### Edge Case / constats
- Step 2 — après fermeture du navigateur et relance sur le même profil, l'accueil rappelle la même voiture (V-1.2-06).

### Issues Found
- aucune sur la version déployée à cette passe.

## V-5.3 — Rechercher dans cette zone

### Happy Path
- Step 1: la carte des stations (trajet en cours) → en-tête « Autour de moi » ; 8 stations ; centre 43.913, 2.142 zoom 10.0 → capture `V-5.3-01-avant.png` ✓ (16:35:15Z, md5 f30b2e19)
- Step 2: je fais glisser la carte vers Montauban (4 glissements au doigt-souris) → bouton « Rechercher dans cette zone » affiché ; liste inchangée (8 stations, mêmes id) ; en-tête « Autour de moi » ; centre 44.018, 1.415 → capture `V-5.3-02-apres.png` ✓ (16:35:23Z, md5 19d43b8f)
- Step 3: le bouton « Rechercher dans cette zone » (carte recentrée sur Montauban d'un dernier glissement) → centre 44.017, 1.355 ; liste toujours celle d'avant (8 stations) → capture `V-5.3-03-avant.png` ✓ (16:35:27Z, md5 4285232c)
- Step 4: je touche « Rechercher dans cette zone » → bouton disparu ; en-tête « Autour de Montauban » ; 16 stations, toutes à moins de 11.6 km du centre affiché (44.017, 1.355), 16 pastilles ; 1re (Moins cher) « TotalEnergies Montauban 63,4 km · il y a 5 h · −16,6 c vs France 1,990 €/L » → capture `V-5.3-04-apres.png` ✓ (16:35:28Z, md5 b4bef9d6)

### Issues Found
- aucune sur la version déployée à cette passe.

## V-3.1 — Suivre en direct

### Happy Path
- Step 1: enregistrement en cours, 200 positions rejouées → 19 km/h · 0,8 km · 0,06 L · 0,13 € · 0:03 · 14 km/h moy. · 8,2 L/100 · 200 points → capture `V-3.1-01-avant.png` ✓ (16:35:01Z, md5 27699522)
- Step 2: je roule : 200 positions de plus (1 par seconde d'horloge) → vitesse lue après chaque position : 49 changements sur 200 s (la vitesse est redessinée à chaque position, soit chaque seconde ; plus longue valeur identique : 57 s, arrêts du GPX compris) ; courbe « Vitesse des 3 dernières minutes » ; 19 km/h · 0,8 km · 0,06 L · 0,13 € · 0:03 · 14 km/h moy. · 8,2 L/100 · 200 points → 29 km/h · 1,8 km · 0,15 L · 0,33 € · 0:06 · 17 km/h moy. · 8,4 L/100 · 400 points → capture `V-3.1-02-apres.png` ✓ (16:35:07Z, md5 39eed2c7)
- Step 3: aucun prix choisi (aucune station touchée) → « Prix : moyenne France du jour · 2,156 €/L » → capture `V-3.1-03-avant.png` ✓ (16:35:08Z, md5 f6a6bbc1)
- Step 4: le coût en direct s'affiche → 0,20 L × 2,156 €/L (moyenne France du jour SP95-E10 lue par l'API : 2,156) = 0,431 → affiché 0,43 € ; « Prix : moyenne France du jour · 2,156 €/L » → capture `V-3.1-04-apres.png` ✓ (16:35:09Z, md5 ef6abb97)
- Step 5: un prix pris sur une station (« Utiliser ce prix ») → « Prix : mon prix · 1,990 €/L » ; 0 km/h · 2,5 km · 0,21 L · 0,41 € · 0:08 · 18 km/h moy. · 8,3 L/100 · 507 points → capture `V-3.1-05-avant.png` ✓ (16:35:31Z, md5 4bb8e694)
- Step 6: le coût en direct s'affiche (60 positions plus loin) → 0,21 L × 1,990 = 0,418 → affiché 0,41 € ; « Prix : mon prix · 1,990 €/L » → capture `V-3.1-06-apres.png` ✓ (16:35:33Z, md5 f66106e5)

### Issues Found
- aucune sur la version déployée à cette passe.

## V-3.4 — Mettre en pause

### Happy Path
- Step 1: un enregistrement en cours (A68) → 105 km/h · 30,3 km · 2,16 L · 4,29 € · 0:29 · 62 km/h moy. · 7,1 L/100 · 1747 points → capture `V-3.4-01-avant.png` ✓ (16:36:31Z, md5 727eb1cf)
- Step 2: je touche « Pause » puis 20 positions arrivent → « En pause », bouton « Reprendre » ; km 30,3 et litres 2,16 inchangés malgré 0,58 km parcourus sur le GPX → capture `V-3.4-02-apres.png` ✓ (16:36:32Z, md5 6e724a7a)
- Step 3: une pause pendant laquelle la voiture s'est déplacée → déplacement pendant la pause : 2,07 km (GPX, points 1750 → 1821) ; affiché toujours 30,3 km, 2,16 L → capture `V-3.4-03-avant.png` ✓ (16:36:35Z, md5 6e724a7a)
- Step 4: je touche « Reprendre » puis 60 positions → « Enregistrement » ; km 30,3 → 32,1 (+1,8) = distance roulée depuis la reprise (1,72 km) ; les 2,07 km de la pause ne sont ni comptés ni chiffrés → capture `V-3.4-04-apres.png` ✓ (16:36:39Z, md5 c5a2e1ed)

### Issues Found
- aucune sur la version déployée à cette passe.

## V-4.5 — Courbe de vitesse

### Happy Path
- Step 1: un trajet enregistré, rouvert depuis l'historique (écran Fin de trajet, haut) → onglet onglet-historique ; « Albi → Toulouse » ; « 21 oct. 2026 · 1 h 11 · Renault Clio » ; enregistré : true → capture `V-4.5-01-avant.png` ✓ (16:38:41Z, md5 ecbdbc91)
- Step 2: la fin de trajet s'affiche (rouverte) — courbe de vitesse → « 63 km/h moy. · 7 accélérations » ; 600 points de courbe (≤ 600) pour 4350 s de trajet ; vitesse moyenne affichée 63 km/h ; km ÷ durée roulée (4278 s, pause exclue) = 63.0 km/h ; km ÷ durée totale = 61.9 km/h ; 7 accélérations → capture `V-4.5-02-apres.png` ✓ (16:38:42Z, md5 ecbdbc91)

### Issues Found
- aucune sur la version déployée à cette passe.

## V-4.6 — Courbe de consommation

### Happy Path
- Step 1: un trajet enregistré (fin rouverte, haut de l'écran) → onglet onglet-historique ; « ← Historique » ; « Albi → Toulouse » → capture `V-4.6-01-avant.png` ✓ (16:38:42Z, md5 ecbdbc91)
- Step 2: la courbe de consommation → « moy. 6,9 · pointe 20,1 L/100 » ; litres ÷ km × 100 = 5.174 ÷ 74.82 × 100 = 6.92 ; 600 points (moyenne simple des points de la courbe : 6.92, non pondérée par la distance) → capture `V-4.6-02-apres.png` ✓ (16:38:42Z, md5 e67da10a)

### Issues Found
- aucune sur la version déployée à cette passe.

## V-1.1 — Ouvrir l'appli

### Happy Path
- Step 1: une voiture enregistrée sur ce téléphone (écran Trajet) → onglet onglet-trajet ; carte « Renault Clio · 1.2 · 118 ch · 2017 · SP95-E10 » ; voiture 5RBU0C → capture `V-1.1-01-avant.png` ✓ (16:34:50Z, md5 25c9bd31)
- Step 2: j'ouvre l'appli (nouvel onglet sur l'adresse de l'appli) → onglet Trajet sélectionné ; T1 « Renault Clio 1.2 · 118 ch · 2017 · SP95-E10 Changer Démarrer » ; ni prix ni nombre de personnes → capture `V-1.1-02-apres.png` ✓ (16:34:51Z, md5 25c9bd31)
- Step 3: premier lancement (profil neuf, aucune voiture), j'ouvre l'appli → T1 « Enregistre d'abord ta voiture Le code D.2 de ta carte grise, une seule fois. Démarrer » ; onglet sélectionné : Trajet ; localStorage pt-voiture-v1 absent → capture `V-1.1-03-avant.png` ✓ (16:34:09Z, md5 c213538e)
- Step 4: je touche « Démarrer » sans voiture → URL /voiture, écran Ma voiture (« Ma voiture ») ; aucun enregistrement en IndexedDB → capture `V-1.1-04-apres.png` ✓ (16:34:10Z, md5 c30f373e)
- Step 5: un trajet en cours d'enregistrement ; je suis sur l'onglet Stations (bandeau « Trajet en cours ») → onglet onglet-stations ; bandeau « ● Trajet en cours · 0,44 € » ; IndexedDB enregistrement : 485 points → capture `V-1.1-05-avant.png` ✓ (16:35:12Z, md5 f30b2e19)
- Step 6: je touche l'onglet Trajet → URL /en-route, écran En route « Enregistrement » (pas l'accueil) → capture `V-1.1-06-apres.png` ✓ (16:35:12Z, md5 e8230957)

### Issues Found
- aucune sur la version déployée à cette passe.

## V-1.3 — Démarrer

### Happy Path
- Step 1: la Clio enregistrée, localisation autorisée, position = 1er point du GPX (Albi, place du Vigan) → accueil « Renault Clio » ; permission géolocalisation accordée au contexte → capture `V-1.3-01-avant.png` ✓ (16:34:56Z, md5 25c9bd31)
- Step 2: je touche « Démarrer » → écran En route, « Enregistrement » (pastille animée : clignote infinite) ; 1re position enregistrée en 77 ms (data-points 1) ; IndexedDB enregistrement : présent → capture `V-1.3-02-apres.png` ✓ (16:34:56Z, md5 4b079d85)

### Issues Found
- aucune sur la version déployée à cette passe.

## V-5.6 — Trajet en cours

### Happy Path
- Step 1: un trajet en cours ; je touche l'onglet Stations (positions envoyées au rythme réel, 1 par seconde) → écran Stations ouvert ; bandeau « ● Trajet en cours · 0,93 € » → capture `V-5.6-01-avant.png` ✓ (16:35:41Z, md5 50f1af88)
- Step 2: l'onglet Stations est ouvert → bandeau en haut « ● Trajet en cours · 0,99 € » (coût en direct ; 0,93 € sur En route juste avant) ; 8 stations listées → capture `V-5.6-02-apres.png` ✓ (16:35:46Z, md5 238ce017)
- Step 3: ce bandeau, 6 s plus tard (la voiture roule) → « ● Trajet en cours · 1,02 € » (« ● Trajet en cours · 0,99 € » 6 s plus tôt : le coût du bandeau suit le trajet) ; positions rejouées jusqu'au point 912 → capture `V-5.6-03-avant.png` ✓ (16:35:52Z, md5 a591c4d0)
- Step 4: je touche l'onglet Trajet → écran En route revenu ; 911 points (911 au moment du toucher) ; 82 km/h · 6,8 km · 0,52 L · 1,03 € · 0:15 · 27 km/h moy. · 7,6 L/100 · 911 points → capture `V-5.6-04-apres.png` ✓ (16:35:53Z, md5 61239b43)

### Edge Case / constats
- Step 2 — sans trajet en cours (même téléphone, avant Démarrer) : bandeau « retour-trajet » présent 0 fois (attendu 0).

### Issues Found
- aucune sur la version déployée à cette passe.

## V-5.5 — Utiliser ce prix

### Happy Path
- Step 1: trajet en cours ; la fiche de la 1re station « Moins cher » de Montauban → fiche « TotalEnergies Montauban » ; bouton « Utiliser 1,990 €/L pour mon trajet » ; prix SP95-E10 en base pour 82000018 : 1,990 €/L. (Le plan cite 2,103 €/L à titre d'exemple : le prix réel du jour est celui lu ici.) → capture `V-5.5-01-avant.png` ✓ (16:35:29Z, md5 680c3d00)
- Step 2: je touche « Utiliser 1,990 €/L pour mon trajet » → fiche fermée, écran En route ; « Prix : mon prix · 1,990 €/L » ; 0,21 L × 1,990 = 0,418 → 0,41 € (la fin de trajet est relue plus bas) → capture `V-5.5-02-apres.png` ✓ (16:35:30Z, md5 a2196c2e)

### Edge Case / constats
- Step 2 — la fin de ce même trajet, au prix de la station, est la capture V-4.7-01-avant.png (libellé « Mon prix », 3 personnes) ; fin de trajet : libellé « Mon prix », prix data-prix 1.99 (station : 1,990), coût 10,30 € essence.

### Issues Found
- aucune sur la version déployée à cette passe.

## V-5.1 — Stations autour de moi

### Happy Path
- Step 3: un trajet en cours (A68, 1 450 positions) ; j'ouvre l'onglet Stations → écran Stations autour de la voiture (43.8843, 1.9259, 21,6 km après Albi) : 5 stations toutes à moins de 10 km d'elle ; 1re « TotalEnergies Marssac-sur-Tarn 9,2 km · il y a 7 h · −16,6 c vs France 1,990 €/L » ; bandeau « ● Trajet en cours · 3,08 € » ; sur En route juste avant : 105 km/h · 21,6 km · 1,49 L · 2,97 € · 0:24 · 54 km/h moy. · 6,9 L/100 · 1448 points → capture `V-5.1-03-avant.png` ✓ (16:36:11Z, md5 005b328f)
- Step 4: je reviens au trajet (onglet Trajet) après 12 s dans Stations → distance 21,6 → 22,1 km, points 1448 → 1463 : l'enregistrement a continué pendant Stations → capture `V-5.1-04-apres.png` ✓ (16:36:25Z, md5 c41e9262)

### Issues Found
- aucune sur la version déployée à cette passe.

## V-3.5 — Arrêter

### Happy Path
- Step 1: un enregistrement de plus de 1 km (arrivée au Capitole, Toulouse) → 10 km/h · 74,8 km · 5,17 L · 10,30 € · 1:11 · 63 km/h moy. · 6,9 L/100 · 4275 points → capture `V-3.5-01-avant.png` ✓ (16:38:36Z, md5 0df2df95)
- Step 2: je touche « Arrêter » → « Albi → Toulouse » ; « 21 oct. 2026 · 1 h 11 · Renault Clio » ; 5,17 L (5.174), 74,8 km (74.82), 6,9 L/100 km moy. → capture `V-3.5-02-apres.png` ✓ (16:38:38Z, md5 bdb448a1)

### Issues Found
- aucune sur la version déployée à cette passe.

## V-4.7 — Enregistrer ou supprimer

### Happy Path
- Step 1: un trajet qui vient d'être arrêté (3 personnes choisies) → prix « Mon prix » 1,990 €/L ; coût 10,30 € ; « 3,43 € chacun » ; boutons « Supprimer Enregistrer » → capture `V-4.7-01-avant.png` ✓ (16:38:39Z, md5 bd7e87b4)
- Step 2: je touche « Enregistrer » → onglet Historique, en tête : « Albi → Toulouse 21 oct. · 74,8 km · SP95-E10 à 1,990 €/L · 3,43 € chacun 10,30 € » ; IndexedDB : prix 1.99 (station), carburant SP95-E10, 3 personnes, enregistré ; totaux « 1 trajet 74,8 km 10,30 € essence » → capture `V-4.7-02-apres.png` ✓ (16:38:40Z, md5 89ed7de2)

### Edge Case / constats
- Démonstration : coût 10,30 € au prix de la station 1,990 €/L, partagé à 3.

### Issues Found
- aucune sur la version déployée à cette passe.

## Régression (passage voiture,trajet)
- (rejouée par la spec m5-regression)

## Erreurs de page relevées
- aucune

---

# Passage r3 retraits — début 2026-10-21T16:38:50.716Z

Appli déployée https://plein-et-trajet.vercel.app, base Supabase réelle, Playwright (bibliothèque), Chromium headless 390 × 844, toucher, fr-FR, Europe/Paris.
Réel : base EEA (fonction voiture-eea), moyennes du jour (FR SP95-E10 2,156 €/L, Gazole 2,368 €/L), stations et prix du jour, géocodage inverse (fonction lieux), refus de localisation (contexte sans permission), coupure réseau (context.setOffline).
Rejoué : géolocalisation par context.setGeolocation depuis tests/e2e/fixtures/albi-toulouse.gpx (et ses dérivés immobile / tunnel, et barcelone.gpx : vrai itinéraire Valhalla fabriqué par creer-gpx.mjs barcelone), horloge de la page accélérée par page.clock (méthode r1a : avancer l'horloge, poser la position, attendre que T3 l'ait comptée), au rythme réel (1 point/s) pendant les passages par Stations.

## V1-retraits — Contrôle négatif : ce qui sort de la V1

### Happy Path
- Step 1: l'appli déployée, journal réseau Playwright ouvert sur TOUS les contextes du passage (écoute context.on('request'), y compris les processus précédents du même passage, relus dans exploration/m5-resultats-<passage>-*.json) → 7 requêtes de ce processus → capture `V1-retraits-01-avant.png` ✓ (16:38:53Z, md5 25c9bd31)
- Step 2: parcours T1 → T6 (+ tous les flux du passage, dont 5 trajets complets rejoués) → 742 requêtes journalisées sur 16 contextes : 0 vers api.myptv.com, 0 vers estimer-trajet / trajet-roule / péages ; fonctions appelées {"lieux":31,"voiture-eea":10} ; hôtes {"plein-et-trajet.vercel.app":149,"fonts.googleapis.com":43,"fonts.gstatic.com":206,"rglrwtkqwihdztgqlbsy.supabase.co":184,"":10,"tiles.openfreemap.org":146,"data.geopf.fr":3,"photon.komoot.io":1} ; 141 captures (contextes cas-refus, cas, barcelone, historique-reel, historique-vide, historique-prepare, historique-prepare-2, cout-prepare, retraits, stations, stations-prayssac, barcelone-stations, dartford, bruxelles, voiture, trajet) + 6 routes passées au crible : aucun « péage » ni « itinéraire » ; aucun champ départ / arrivée ; aucun lien Moteurs ; onglets Trajet · Stations · Historique → capture `V1-retraits-02-apres.png` ✓ (16:39:12Z, md5 c1d4f1b6)
- Step 3: la table public.moteurs lue par l'API Supabase (rôle service), rendue en page texte → prix:true, moyennes:true, itineraire:true, peages:false, voitures:true, lieux:true, vehicules:true → capture `V1-retraits-03-avant.png` ✓ (16:39:15Z, md5 8e3051dc)
- Step 4: je lis la ligne du service péages, et le nombre de lignes des clés → peages : en_service = false (fournisseur ptv gardé) ; cles_fournisseurs 2 lignes (2 avant) ; Vault 3 secrets (cle_ptv, cle_stadia, sync_prix_secret ; 3 avant) ; limite d'inscriptions anonymes 30 → capture `V1-retraits-04-apres.png` ✓ (16:39:15Z, md5 1a773113)

### Issues Found
- aucune sur la version déployée à cette passe.

## Régression (passage retraits)
- (rejouée par la spec m5-regression)

## Erreurs de page relevées
- aucune

## Round 3

Bâtisseur r3 (m5-batisseur-r3), 21/10, 15:58Z → 17:00Z. Mêmes outils (`run-m5.mjs` + `m5-explore-outils.mjs`, bibliothèque Playwright, Chromium 390 × 844, toucher, fr-FR), sous `lourd`. Passage de référence : **r3** (blocs « # Passage r3 … » ci-dessus) : cas, stations et historique,retraits joués sur la prod **3bf6066** (16:22Z → 16:28Z) ; voiture,trajet rejoué à 16:34Z sur la prod **9d303d2** (exemple de carte grise en JetBrains Mono, seul écran touché : Ma voiture), puis retraits seul à 16:38Z pour que le contrôle négatif compte toutes les requêtes du passage. Le premier bloc « voiture,trajet » (16:18Z, prod 3bf6066) est un essai gardé : ses captures ont été remplacées par celles de 16:34Z.

**Résultat r3 : 140/140 captures, 139 ✓, 1 ✗** (V-1.2-02 : « Renault Clio » / « 1.2 · 118 ch » contre « Clio IV » / « 1.2 TCe 120 » du plan, décision d'Anthony, inchangé). Contrôle négatif : 742 requêtes sur 16 contextes, 0 vers api.myptv.com, estimer-trajet, trajet-roule ou péages ; fonctions appelées lieux (31) et voiture-eea (10). md5 : les 140 du disque = ceux relevés par le passage ; livrée = brute pour 120, deux prises différentes pour 20.

### V-1.1, V-2.1, V-2.2, V-2.3, V-2.E1 — Ma voiture (audit r2 lot 1, LOW 5)
- Le champ D.2 et l'exemple de carte grise sont en JetBrains Mono, dont le zéro est pointé : « 5RBU0C » ne se lit plus « 5RBUOC » (V-1.1-04, V-2.1-01 à -06, V-2.2-0x, V-2.3-0x, V-2.E1-0x reprises). Chivo Mono n'a pas de variante « zéro barré » : essai Chromium, rendu identique avec `font-variant-numeric: slashed-zero` et `font-feature-settings: 'zero'`.

### V-2.1 — code partagé (audit r2 lot 1, LOW 6)
- V-2.1-03/04 : **AD6DB000M000** (Dacia Duster 1.5, 2019 et 2018, 85 kW · 116 ch, 1 480 kg, Gazole), absent du cache avant la saisie, 2 versions listées ; l'étape refuse désormais « — kW ». HNSJC1B000 (round 2) n'a aucune puissance dans la base EEA. Le code DAW400L0 proposé par l'audit est déjà en cache depuis le round 1 : il ne prouve plus le chemin « jamais demandé ». M61A11 (Hyundai Kona / Kia Ceed, 88 kW) a été consommé par le bloc d'essai de 16:18Z.

### V-3.E1 — arrêt automatique (audit r2 lot 1, MEDIUM 2)
- Captures inchangées en contenu : le tracé du projet bruite de ±2 m, sans précision rapportée (accuracy 5 de Playwright, seuil de 15 m comme avant). Alerte au point 1375 (601 s), arrivée datée du point 774, 4,0 km et 0,33 L figés. Le cas ±10 m / précision 20 m est couvert par les tests unitaires `tests/unit/m5-round3.test.ts` (5 graines sur 5 ; avant : 0 sur 5).

### V-4.1 — carburant (audit r2 lot 2, LOW 4)
- V-4.1-01 : l'écran Fin de trajet tel qu'il s'ouvre, haut de l'écran (« BRENS → PARISOT », « 21 oct. 2026 · 4 min · Renault Clio », 0,55 L) ; le journal garde la ligne En route juste avant « Arrêter ». V-4.1-02 : sélecteur remonté en haut, SP95-E10 choisi, « Moyenne France du jour » 2,156.

### V-4.3 — hors ligne (audit r2 lot 2, LOW 6)
- V-4.3-03/04 : « Hors ligne : litres et coût calculés sur le téléphone. » — les noms « ALBI → PARIS » sont connus, le message n'en parle plus. V-3.5-06 (noms manquants) garde la phrase complète.

### V-6.1 — historique (audit r2 lot 2, LOW 4)
- V-6.1-01 : la fin du trajet d'octobre juste AVANT « Enregistrer » (« ALBI → ALBI · 5 oct. 2026 · 14 min »), celui de septembre déjà enregistré (IndexedDB : 2026-09-14, 2,5 km) ; l'historique trié n'apparaît qu'en V-6.1-02.
- V-6.1-03 : « aucun trajet » ne s'affiche que dans l'Historique, qui est le résultat de V-6.1-04 ; l'état de départ montré est l'appli neuve, onglet Trajet (IndexedDB lue : 0 trajet). Image identique à l'accueil des autres histoires (md5 25c9bd31), déclarée.

### V-6.4 — supprimer (audit r2 lot 2, MEDIUM 1)
- Captures inchangées en contenu. Nouvel extrait `V-6.4 — noms des lieux arrivés après « Supprimer ce trajet »` : trajet sans noms, géocodage retardé de 3 s (page.route, simulation déclarée), suppression, 7 s d'attente : absent de la liste, de l'IndexedDB et des totaux. Vert sur la prod 3bf6066.

### Captures « avant » laissées telles quelles, et pourquoi
- V-4.4-04 : une image montre un seul compteur ; elle est à 1 personne (« Seul : tout pour toi. », « − » désactivé) ; la borne 9 (« + » désactivé après 10 touchers) est relevée dans le constat de l'étape.
- V-5.5-02 : l'écran qui suit « Utiliser … pour mon trajet » est En route (« Prix : mon prix ») ; la fin de trajet à ce prix est V-4.7-01, une autre étape du plan.

### Doublons à l'octet (même écran, même état)
- 25c9bd31 ×15 (accueil avec la Clio : V-1.1-01/02, V-1.2-01/02/05/06, V-1.3-01, V-2.2-02, V-4.7-04, V-5.1-01, V-5.2-01, V-5.5-04, V-5.7-01, V-6.1-03, V1-retraits-01) ; f30b2e19 (V-1.1-05, V-5.3-01 : Stations avec le bandeau « Trajet en cours ») ; 6e724a7a (V-3.4-02/-03 : km figé en pause) ; ecbdbc91 (V-4.5-01/-02, V-4.6-01) ; d65b0ed3 (V-5.1-02, V-5.4-01) ; d8926428 (V-5.2-02/-03).
