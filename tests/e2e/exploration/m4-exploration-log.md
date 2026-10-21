# Jalon 4 — Enregistrer en roulant et Royaume-Uni : journal d'exploration

Appli déployée https://plein-et-trajet.vercel.app, Supabase réel, bibliothèque Playwright (Chromium headless 390 × 844, fr-FR, Europe/Paris).
Seule simulation : la géolocalisation du navigateur, rejouée point par point (context.setGeolocation, 1 par seconde d'horloge réelle, rejeu non accéléré : l'appli calcule les vitesses sur l'horodatage des positions) depuis `tests/e2e/fixtures/albi-toulouse.gpx` — vrai itinéraire routier Valhalla Albi → Toulouse densifié à 1 point/s (fabrication en tête du fichier). Calcul, recalage, péages, géocodage, prix : vrais services.
Verrou d'écran : Chromium piloté refuse la permission « screen-wake-lock » par défaut ; elle est accordée au contexte par CDP (Browser.grantPermissions), comme Chrome mobile l'accorde à une page visible (sonde `sondes/m4-sonde-wakelock.mjs`).


**Lecture.** Le journal est écrit au fil de l'eau, une section par histoire dès qu'elle finit, passage après passage :
1. court 01:55Z — arrêté à US-3.9 (« Londres » jamais proposé : défaut de la fonction lieux, corrigé 1d52054) ; ses sections E1/E2 y figurent deux fois (le script réécrivait à l'arrêt les histoires déjà écrites, corrigé) ;
2. court 01:58Z — 8/8 ✓ ;
3. long 01:59-03:12Z (trajet complet) et us62 02:05-02:11Z tournaient en même temps : leurs sections s'entremêlent. Dans « long », US-6.2-02 est ✗ à cause de mon assertion (nombre de points de la courbe, constant une fois la fenêtre de 3 min remplie) ; US-6.2 a été refaite par « us62 » avec une assertion sur le tracé de la courbe : ✓, ce sont ses captures qui sont livrées ;
4. court 03:35Z — 8/8 ✓, refait pour recentrer US-3.9-02 sur la note « Manche ». État final des captures et md5 : section « Captures — état final ».

---

# Passage court — début 2026-10-21T01:55:50.450Z

## US-6.E1 — Localisation refusée

### Happy Path
- Step 1: écran Trajets, voiture Peugeot 208 choisie, contexte sans permission de localisation → bouton « Enregistrer en roulant » visible ; 0 trajet(s) en base pour cette session → capture `US-6.E1-01-avant.png` ✓ (01:55:52Z, md5 livrée 5906f483, brute 5906f483)
- Step 2: « Enregistrer en roulant », le navigateur refuse la localisation (PERMISSION_DENIED réel) → message « L'enregistrement a besoin de ta localisation Aucun trajet n'a été créé. Pour l'autoriser : touche le cadenas à gauche de… » ; aucun écran En route ; rien dans le téléphone (pt-en-route absent) ; trajets en base 0 → 0 → capture `US-6.E1-02-apres.png` ✓ (01:55:53Z, md5 livrée 4e1684e8, brute 4e1684e8)

### Issues Found
- aucune sur la version déployée à cette passe.

## US-6.E2 — Trajet trop court

### Happy Path
- Step 1: enregistrement de 40 positions (40 s du GPX, départ place du Vigan) → En route : 0,1 km, 0,01 L, 0:00, vitesse 7 km/h → capture `US-6.E2-01-avant.png` ✓ (01:56:36Z, md5 livrée 6d7f29ed, brute 6d7f29ed)
- Step 2: « Arrêter et voir le coût » → « Trajet trop court pour être calculé 0,08 km enregistrés : il en faut au moins 1. Rien n'a été ajouté à l'historique. Retour aux trajets » ; trajets en base 0 → 0 ; points effacés du téléphone → capture `US-6.E2-02-apres.png` ✓ (01:56:36Z, md5 livrée eec9eb9f, brute eec9eb9f)

### Issues Found
- aucune sur la version déployée à cette passe.

> Arrêt du passage court à 01:57:29Z : locator.click: Timeout 30000ms exceeded.

## US-6.E1 — Localisation refusée

### Happy Path
- Step 1: écran Trajets, voiture Peugeot 208 choisie, contexte sans permission de localisation → bouton « Enregistrer en roulant » visible ; 0 trajet(s) en base pour cette session → capture `US-6.E1-01-avant.png` ✓ (01:55:52Z, md5 livrée 5906f483, brute 5906f483)
- Step 2: « Enregistrer en roulant », le navigateur refuse la localisation (PERMISSION_DENIED réel) → message « L'enregistrement a besoin de ta localisation Aucun trajet n'a été créé. Pour l'autoriser : touche le cadenas à gauche de… » ; aucun écran En route ; rien dans le téléphone (pt-en-route absent) ; trajets en base 0 → 0 → capture `US-6.E1-02-apres.png` ✓ (01:55:53Z, md5 livrée 4e1684e8, brute 4e1684e8)

### Issues Found
- aucune sur la version déployée à cette passe.

## US-6.E2 — Trajet trop court

### Happy Path
- Step 1: enregistrement de 40 positions (40 s du GPX, départ place du Vigan) → En route : 0,1 km, 0,01 L, 0:00, vitesse 7 km/h → capture `US-6.E2-01-avant.png` ✓ (01:56:36Z, md5 livrée 6d7f29ed, brute 6d7f29ed)
- Step 2: « Arrêter et voir le coût » → « Trajet trop court pour être calculé 0,08 km enregistrés : il en faut au moins 1. Rien n'a été ajouté à l'historique. Retour aux trajets » ; trajets en base 0 → 0 ; points effacés du téléphone → capture `US-6.E2-02-apres.png` ✓ (01:56:36Z, md5 livrée eec9eb9f, brute eec9eb9f)

### Issues Found
- aucune sur la version déployée à cette passe.

## US-3.9 — Aller au Royaume-Uni

### Happy Path
- Step 1: départ Albi, « Londres » tapé dans le champ arrivée → expect(locator).toBeVisible() failed  Locator: locator('[data-el="champ-arrivee-propositions"] [role="option"]').filter({ hasText: 'Royaume-Uni' }).first() → capture `US-3.9-01-avant.png` ✗ (01:56:59Z, md5 livrée 790e1bdb, brute 790e1bdb)

### Issues Found
- Step 1 (US-3.9-01-avant.png) : expect(locator).toBeVisible() failed  Locator: locator('[data-el="champ-arrivee-propositions"] [role="option"]').filter({ hasText: 'Royaume-Uni' }).first()

### Bilan du passage court (01:57:29Z) : 4/5 étapes ✓

| capture | DOM | md5 livrée | md5 brute |
|---|---|---|---|
| `US-6.E1-01-avant.png` | ✓ | 5906f4836dd39f47db3cce61d6d8ee37 | 5906f4836dd39f47db3cce61d6d8ee37 |
| `US-6.E1-02-apres.png` | ✓ | 4e1684e8000c16166e59f0d27e212276 | 4e1684e8000c16166e59f0d27e212276 |
| `US-6.E2-01-avant.png` | ✓ | 6d7f29ed1da947bb85c5d44f566aa339 | 6d7f29ed1da947bb85c5d44f566aa339 |
| `US-6.E2-02-apres.png` | ✓ | eec9eb9f862ecd7d0576a35728852bb3 | eec9eb9f862ecd7d0576a35728852bb3 |
| `US-3.9-01-avant.png` | ✗ | 790e1bdbe0dfd996baa3f0cc16c68239 | 790e1bdbe0dfd996baa3f0cc16c68239 |

Aucune erreur de page ni console.error.

---

# Passage court — début 2026-10-21T01:58:10.828Z

## US-6.E1 — Localisation refusée

### Happy Path
- Step 1: écran Trajets, voiture Peugeot 208 choisie, contexte sans permission de localisation → bouton « Enregistrer en roulant » visible ; 0 trajet(s) en base pour cette session → capture `US-6.E1-01-avant.png` ✓ (01:58:12Z, md5 livrée 5906f483, brute 5906f483)
- Step 2: « Enregistrer en roulant », le navigateur refuse la localisation (PERMISSION_DENIED réel) → message « L'enregistrement a besoin de ta localisation Aucun trajet n'a été créé. Pour l'autoriser : touche le cadenas à gauche de… » ; aucun écran En route ; rien dans le téléphone (pt-en-route absent) ; trajets en base 0 → 0 → capture `US-6.E1-02-apres.png` ✓ (01:58:13Z, md5 livrée 4e1684e8, brute 4e1684e8)

### Issues Found
- aucune sur la version déployée à cette passe.

## US-6.E2 — Trajet trop court

### Happy Path
- Step 1: enregistrement de 40 positions (40 s du GPX, départ place du Vigan) → En route : 0,1 km, 0,01 L, 0:00, vitesse 7 km/h → capture `US-6.E2-01-avant.png` ✓ (01:58:56Z, md5 livrée 6d7f29ed, brute 6d7f29ed)
- Step 2: « Arrêter et voir le coût » → « Trajet trop court pour être calculé 0,08 km enregistrés : il en faut au moins 1. Rien n'a été ajouté à l'historique. Retour aux trajets » ; trajets en base 0 → 0 ; points effacés du téléphone → capture `US-6.E2-02-apres.png` ✓ (01:58:56Z, md5 livrée eec9eb9f, brute eec9eb9f)

### Issues Found
- aucune sur la version déployée à cette passe.

## US-3.9 — Aller au Royaume-Uni

### Happy Path
- Step 1: départ Albi, « Londres » tapé dans le champ arrivée → proposition « Londres Angleterre, Royaume-Uni » → capture `US-3.9-01-avant.png` ✓ (01:59:00Z, md5 livrée 0b0ec262, brute 0b0ec262)
- Step 2: Londres choisi, « Calculer le coût » → Albi → Londres : 1122 km, 223,69 € ; ligne pays « GB Royaume-Uni · 128 km · 7,7 L × 2,071 — moyenne du jour de 2 316 stations (prix publiés en pence/L, convertis en €) 16,05 € » = moyenne du jour GB 2.071 €/L (2316 stations, 2026-10-21) ; note Manche affichée ; péages « FR Autoroutes de France · MONTAUBAN NORD - GIGNAC 15,90 € FR Autoroutes de France · VIERZON-NORD - LA FOLIE-B/PARIS 21,80 € FR Autoroutes de France · ROISSY CDG » ; Eurotunnel absent ; Dartford absent (non franchi par cet itinéraire) → capture `US-3.9-02-apres.png` ✓ (01:59:04Z, md5 livrée 4b949b7d, brute 4b949b7d)

### Issues Found
- aucune sur la version déployée à cette passe.

## US-1.9 — Stations au Royaume-Uni

### Happy Path
- Step 1: navigateur géolocalisé à Londres (51,507 N ; 0,128 O), onglet Trajets ouvert → position émulée : Londres ; onglet Prix pas encore ouvert → capture `US-1.9-01-avant.png` ✓ (01:59:05Z, md5 livrée 51c07505, brute 51c07505)
- Step 2: onglet Prix, puis la première station de la liste (fiche) → 49 stations britanniques dans la liste, 49 pastilles ; GB-gcpvne36gtnz : SP95-E10 2,022 €/L = 169.9 p/L ÷ 100 ÷ 0.84028 ; fiche : « Gazole 197,9 p/L SP95-E10 169,9 p/L SP95 169,9 p/L Prix publiés en pence par litre, convertis au cours BCE du 20/10/2026 : 1 € = 0,8403 £. » → capture `US-1.9-02-apres.png` ✓ (01:59:07Z, md5 livrée 87c84864, brute 87c84864)

### Issues Found
- aucune sur la version déployée à cette passe.

### Bilan du passage court (01:59:07Z) : 8/8 étapes ✓

| capture | DOM | md5 livrée | md5 brute |
|---|---|---|---|
| `US-6.E1-01-avant.png` | ✓ | 5906f4836dd39f47db3cce61d6d8ee37 | 5906f4836dd39f47db3cce61d6d8ee37 |
| `US-6.E1-02-apres.png` | ✓ | 4e1684e8000c16166e59f0d27e212276 | 4e1684e8000c16166e59f0d27e212276 |
| `US-6.E2-01-avant.png` | ✓ | 6d7f29ed1da947bb85c5d44f566aa339 | 6d7f29ed1da947bb85c5d44f566aa339 |
| `US-6.E2-02-apres.png` | ✓ | eec9eb9f862ecd7d0576a35728852bb3 | eec9eb9f862ecd7d0576a35728852bb3 |
| `US-3.9-01-avant.png` | ✓ | 0b0ec262ec32e649076674ba7ba3168d | 0b0ec262ec32e649076674ba7ba3168d |
| `US-3.9-02-apres.png` | ✓ | 4b949b7db4a0430a9b1f4a91a40c364d | 4b949b7db4a0430a9b1f4a91a40c364d |
| `US-1.9-01-avant.png` | ✓ | 51c07505cf687f8091641a624efa2fa3 | 51c07505cf687f8091641a624efa2fa3 |
| `US-1.9-02-apres.png` | ✓ | 87c84864f47411d1141f7f34a00951cb | 87c84864f47411d1141f7f34a00951cb |

Aucune erreur de page ni console.error.

---

# Passage long — début 2026-10-21T01:59:22.310Z

## US-6.1 — Enregistrer en roulant

### Happy Path
- Step 1: écran Trajets, voiture Peugeot 208 (101ch) mécanique choisie, position place du Vigan à Albi → bouton « Enregistrer en roulant » sous « Calculer le coût » → capture `US-6.1-01-avant.png` ✓ (01:59:23Z, md5 livrée 2857dbd7, brute 2857dbd7)
- Step 2: « Enregistrer en roulant », localisation autorisée → écran En route ouvert ; indicateur « Enregistrement » ; voiture « Peugeot 208 (101ch) · mécanique · SP95-E10 » ; 5 positions déjà gardées sur le téléphone → capture `US-6.1-02-apres.png` ✓ (01:59:27Z, md5 livrée 30604294, brute 30604294)

### Issues Found
- aucune sur la version déployée à cette passe.

## API Contract Check

Relevé le 2026-10-21T02:01Z par `node tests/e2e/exploration/m4-contrat-api.mjs` : chaque appel front ↔ serveur écrit ou touché au jalon 4, joué pour de vrai contre la prod (session anonyme réelle). Aucun MISMATCH.

- FE: src/lib/enRoute.ts:84 calculerTrajetRoule → BE: supabase/functions/trajet-roule/index.ts:98 {points, vehicule_id} → :184 enregistre — OK (HTTP 200, 1.5 km, Albi → Albi)
- FE: src/lib/enRoute.ts:88 ErreurRoule(trop_court) → BE: supabase/functions/trajet-roule/index.ts 422 {erreur:"trop_court"} — OK (HTTP 422 {"erreur":"trop_court"})
- FE: src/lib/enRoute.ts:123 enregistrerTrajetRoule (insert) → BE: rest/v1/trajets + migration 20261021180000:4-8 (enregistre, vitesses, vitesse_moy, accelerations, estimation) — OK (HTTP 201)
- FE: src/lib/trajets.ts:99 listerTrajets → BE: rest/v1/trajets select * (RLS user_id) — OK (HTTP 200, 1 ligne(s))
- FE: src/lib/donnees.ts:56 prixStation (prix_origine, unite_origine) → BE: rest/v1/prix + migration :11-12 — OK (HTTP 200 {"station_id":"GB-gcqfn1wd5k4j","carburant":"SP95","prix":2.058,"maj":"2026-10-20T08:51:41+00:00","rupture":false,"prix_origine":172.9,"unite_origine":"p/L"})
- FE: src/lib/donnees.ts:68 coursDuJour → BE: rest/v1/cours_change + migration :14 (lecture publique) — OK (HTTP 200 taux 0.84028 du 2026-10-20)
- FE: src/lib/donnees.ts:87 moyennesParPays (nb_stations) → BE: rpc/moyennes_par_pays + migration :77 — OK (HTTP 200 GB 2.369 €/L, 2317 stations)
- FE: src/lib/vehicules.ts:19 COLONNES (conso WLTP) → BE: rest/v1/vehicules (lecture publique) — OK (HTTP 200)
- FE: src/lib/enRoute.ts:130 paysDePosition → BE: supabase/functions/lieux/index.ts:63 action pays — OK (HTTP 200 {"pays":{"code":"GB","nom":"Royaume-Uni"}})
- FE: src/lib/trajets.ts:45 estimerTrajet (traversee_manche) → BE: supabase/functions/estimer-trajet/index.ts:283 — OK (HTTP 200 43.4 km)

## US-6.2 — Suivre en direct

### Happy Path
- Step 1: enregistrement en cours depuis quelques secondes → départ : 0,0 km, 0,00 L, 0,00 €, durée 0:00, 0 arrêt, L/100 — → capture `US-6.2-01-avant.png` ✓ (01:59:27Z, md5 livrée 56193af4, brute 56193af4)
- Step 2: je roule (1,2 km dans Albi, feu rouge compris) → expect(received).toBeGreaterThanOrEqual(expected)  Expected: >= 3 → capture `US-6.2-02-apres.png` ✗ (02:05:08Z, md5 livrée 8785f6dc, brute 8785f6dc)

### Issues Found
- Step 2 (US-6.2-02-apres.png) : expect(received).toBeGreaterThanOrEqual(expected)  Expected: >= 3

---

# Passage us62 — début 2026-10-21T02:05:51.405Z

## US-6.4 — Mettre en pause

### Happy Path
- Step 1: arrêt à la station-service (2,5 km), enregistrement en cours → 2,50 km, 0,18 L, vitesse 0 km/h → capture `US-6.4-01-avant.png` ✓ (02:07:33Z, md5 livrée f86f515a, brute f86f515a)
- Step 2: « Pause » (la pause dure ~3 min ; la voiture repart avant « Reprendre ») → indicateur « En pause » ; 200 positions reçues pendant la pause dont ~28 s de route : km 2,50 → 2,50, litres 0,18 → 0,18 (inchangés) ; bouton « Reprendre » → capture `US-6.4-02-apres.png` ✓ (02:10:53Z, md5 livrée 81405658, brute 81405658)
- Step 3: « Reprendre » puis 12 s de route → indicateur « Enregistrement », km 2,50 → 2,60 (le trajet fait pendant la pause n'est pas compté) → vérification DOM ✓ (pas de capture prévue au plan)

### Issues Found
- aucune sur la version déployée à cette passe.

## US-6.2 — Suivre en direct

### Happy Path
- Step 1: enregistrement en cours depuis quelques secondes → départ : 0,0 km, 0,00 L, 0,00 €, durée 0:00, 0 arrêt, L/100 — → capture `US-6.2-01-avant.png` ✓ (02:05:57Z, md5 livrée a52d7acc, brute a52d7acc)
- Step 2: je roule (1,2 km dans Albi, feu rouge compris) → relevés 1/s (vitesse km/h / points de courbe / km) : 19/181/0.8 ; 19/181/0.8 ; 19/181/0.8 ; 19/181/0.8 ; 19/181/0.8 ; 19/181/0.8 ; 19/181/0.8 ; 19/181/0.8 → courbe renouvelée 7 fois en 7 s ; maintenant 28 km/h, 1,4 km, 0,10 L, 0,23 €, 0:05, 1 arrêt(s), 7,4 L/100 ; « Coût au prix moyen du jour (FR) : 2,159 €/L » (moyenne FR du jour 2.159) → capture `US-6.2-02-apres.png` ✓ (02:11:39Z, md5 livrée 09edb305, brute 09edb305)

### Issues Found
- aucune sur la version déployée à cette passe.

### Bilan du passage us62 (02:11:39Z) : 2/2 étapes ✓

| capture | DOM | md5 livrée | md5 brute |
|---|---|---|---|
| `US-6.2-01-avant.png` | ✓ | a52d7acc8dfcf0f1ec650c455bfca5a1 | a52d7acc8dfcf0f1ec650c455bfca5a1 |
| `US-6.2-02-apres.png` | ✓ | 09edb305ecde0724019e02b420b8158d | 09edb305ecde0724019e02b420b8158d |

Aucune erreur de page ni console.error.

## US-6.E3 — Reprendre après fermeture

### Happy Path
- Step 1: enregistrement en cours (≈ 6 km) → 6,4 km, 0,39 L, 0:11 → capture `US-6.E3-01-avant.png` ✓ (02:14:23Z, md5 livrée 22c47fd8, brute 22c47fd8)
- Step 2: la page est rechargée (page.reload()) → « Un enregistrement est en cours 6,4 km déjà enregistrés en 0:11, gardés sur ce téléphone. Reprendre l'enregistrement Arrêter et voir le coût » ; km avant rechargement 6,4 ; boutons « Reprendre l'enregistrement » et « Arrêter et voir le coût » → capture `US-6.E3-02-apres.png` ✓ (02:14:24Z, md5 livrée 23975a57, brute 23975a57)
- Step 3: « Reprendre l'enregistrement » → écran En route, 6,5 km (≥ 6,4 avant rechargement), indicateur « Enregistrement » → vérification DOM ✓ (pas de capture prévue au plan)

### Issues Found
- aucune sur la version déployée à cette passe.

## US-6.3 — Garder l'écran allumé

### Happy Path
- Step 1: enregistrement en cours → verrou d'écran : actif ; 1,4 km → capture `US-6.3-01-avant.png` ✓ (02:05:09Z, md5 livrée 9bfd07a1, brute 9bfd07a1)
- Step 2: téléphone posé 60 s sans toucher l'écran → verrou d'écran « actif » (navigator.wakeLock.request("screen") accordé, non relâché après 60 s) ; page « visible » ; texte « L'écran reste allumé pendant l'enregistrement » → capture `US-6.3-02-apres.png` ✓ (02:06:09Z, md5 livrée bcc4f3e8, brute bcc4f3e8)
- Step 3: enregistrement en cours sur l'autoroute (≈ 20 km) → 105 km/h, 19,8 km → capture `US-6.3-03-avant.png` ✓ (02:22:38Z, md5 livrée 4f7a64e8, brute 4f7a64e8)
- Step 4: plus aucune position pendant 18 s (rejeu coupé, la voiture avance toujours) → « GPS PERDU Aucune position depuis 18 s : la distance est figée jusqu'au retour du signal. » ; distance figée 19,8 → 19,8 km → capture `US-6.3-04-apres.png` ✓ (02:22:56Z, md5 livrée c64ca791, brute c64ca791)
- Step 5: retour du signal (rejeu rétabli) → bandeau « GPS perdu » retiré, distance 19,8 → 20,5 km → vérification DOM ✓ (pas de capture prévue au plan)

### Issues Found
- aucune sur la version déployée à cette passe.

## US-6.5 — Arrêter et voir le coût

### Happy Path
- Step 1: arrivée au Capitole de Toulouse (4331 positions envoyées en 73 min) → 76,8 km, 4,42 L, 9,54 €, 1:09, 2 arrêts, 5,8 L/100 → capture `US-6.5-01-avant.png` ✓ (03:12:12Z, md5 livrée 5a03dd95, brute 5a03dd95)
- Step 2: « Arrêter et voir le coût » → titre « Albi → Toulouse · enregistré » (géocodage inverse) ; 13,03 €, 5.3 L, 77 km, 6.8 L/100 ; péages « FR Autoroutes de France · TOULOUSE EST 1,70 € Total péages 1,70 € » ; pays FR ; tronçons autoroute, route, ville → capture `US-6.5-02-apres.png` ✓ (03:12:16Z, md5 livrée ab8c9fd4, brute ab8c9fd4)
- Step 3: ce résultat, descendu jusqu'aux péages et aux tronçons → tronçons « AUTOROUTE A68 / N88 / A61 · 67,0 km 4,5 L ROUTE N88 · 0,1 km 0,0 L VILLE N88 / M112 / D912 · 9,7 km 0,8 L » → capture `US-6.5-03-avant.png` ✓ (03:12:16Z, md5 livrée dec37529, brute dec37529)
- Step 4: ← Trajets → 1re ligne de l'historique « Albi → Toulouse 77 km · 21 oct. · enregistré » ; en base (RLS) : 0 → 1 trajets, le plus récent Albi → Toulouse, enregistre = true, 76.8 km → capture `US-6.5-04-apres.png` ✓ (03:12:16Z, md5 livrée c99840df, brute c99840df)

### Issues Found
- aucune sur la version déployée à cette passe.

## US-6.6 — Voir ma courbe de vitesse

### Happy Path
- Step 1: le trajet enregistré, rouvert depuis l'historique → « Albi → Toulouse · enregistré » 13,03 € → capture `US-6.6-01-avant.png` ✓ (03:12:17Z, md5 livrée 9241c27a, brute 18851acb)
- Step 2: je regarde le bloc « Ma vitesse enregistrée » → « 66 km/h moy. · 4 accélérations » ; courbe de 600 points (tout le trajet) ; note « Calcul sur ta vitesse réelle, seconde par seconde… » → capture `US-6.6-02-apres.png` ✓ (03:12:17Z, md5 livrée a88113da, brute a88113da)
- Step 3: un trajet calculé (non enregistré) : Albi → Castres → « Albi → Castres » 48 km 6,82 € → capture `US-6.6-03-avant.png` ✓ (03:12:22Z, md5 livrée 7f68fb92, brute 7f68fb92)
- Step 4: je le regarde, jusqu'à la note de bas de page → aucun bloc « Ma vitesse enregistrée » ; note d'estimation habituelle → capture `US-6.6-04-apres.png` ✓ (03:12:22Z, md5 livrée b0294036, brute b0294036)

### Issues Found
- aucune sur la version déployée à cette passe.

### Bilan du passage long (03:12:22Z) : 19/20 étapes ✓

| capture | DOM | md5 livrée | md5 brute |
|---|---|---|---|
| `US-6.1-01-avant.png` | ✓ | 2857dbd765f5d914ebfd70a218d69f55 | 2857dbd765f5d914ebfd70a218d69f55 |
| `US-6.1-02-apres.png` | ✓ | 3060429457b2c9531a3dff39104cc965 | 3060429457b2c9531a3dff39104cc965 |
| `US-6.2-01-avant.png` | ✓ | 56193af4e2971b01c35cd7b1b75bdaf6 | 56193af4e2971b01c35cd7b1b75bdaf6 |
| `US-6.2-02-apres.png` | ✗ | 8785f6dc53c2b960955f0f1bfe9d4cc3 | 8785f6dc53c2b960955f0f1bfe9d4cc3 |
| `US-6.3-01-avant.png` | ✓ | 9bfd07a139aca3949b40704849393734 | 9bfd07a139aca3949b40704849393734 |
| `US-6.3-02-apres.png` | ✓ | bcc4f3e86c08b5c51e389ba0812ef58d | bcc4f3e86c08b5c51e389ba0812ef58d |
| `US-6.4-01-avant.png` | ✓ | f86f515afb2f58b431e8fcb0d49842a5 | f86f515afb2f58b431e8fcb0d49842a5 |
| `US-6.4-02-apres.png` | ✓ | 81405658842b6a71c36ae812ea1656cf | 81405658842b6a71c36ae812ea1656cf |
| `US-6.E3-01-avant.png` | ✓ | 22c47fd856d2aefad17cf12d94815a7a | 22c47fd856d2aefad17cf12d94815a7a |
| `US-6.E3-02-apres.png` | ✓ | 23975a57b5bc05d3dbfe70ef3b0c0b52 | 23975a57b5bc05d3dbfe70ef3b0c0b52 |
| `US-6.3-03-avant.png` | ✓ | 4f7a64e87b877aaf03657defdc340036 | 4f7a64e87b877aaf03657defdc340036 |
| `US-6.3-04-apres.png` | ✓ | c64ca791074b0d6ef4afeb2684037c61 | c64ca791074b0d6ef4afeb2684037c61 |
| `US-6.5-01-avant.png` | ✓ | 5a03dd9503a7a508a476853d6b409417 | 5a03dd9503a7a508a476853d6b409417 |
| `US-6.5-02-apres.png` | ✓ | ab8c9fd49feb9a7f3567cb4f18c3b7b1 | ab8c9fd49feb9a7f3567cb4f18c3b7b1 |
| `US-6.5-03-avant.png` | ✓ | dec37529527ae29d6b9436ad90c58c9a | dec37529527ae29d6b9436ad90c58c9a |
| `US-6.5-04-apres.png` | ✓ | c99840df73a33fad9f505d14ca784107 | c99840df73a33fad9f505d14ca784107 |
| `US-6.6-01-avant.png` | ✓ | 9241c27afa18aa67a057de6f2a79b5a1 | 18851acbf1332b3c33a958f74bf5112a |
| `US-6.6-02-apres.png` | ✓ | a88113da0cd37bf1dec83b1c282a9b04 | a88113da0cd37bf1dec83b1c282a9b04 |
| `US-6.6-03-avant.png` | ✓ | 7f68fb92c88f5568eebfc6a63536824a | 7f68fb92c88f5568eebfc6a63536824a |
| `US-6.6-04-apres.png` | ✓ | b029403626cff66c05b9dc62167e5095 | b029403626cff66c05b9dc62167e5095 |

Aucune erreur de page ni console.error.

---

# Passage court — début 2026-10-21T03:35:17.314Z

## US-6.E1 — Localisation refusée

### Happy Path
- Step 1: écran Trajets, voiture Peugeot 208 choisie, contexte sans permission de localisation → bouton « Enregistrer en roulant » visible ; 0 trajet(s) en base pour cette session → capture `US-6.E1-01-avant.png` ✓ (03:35:19Z, md5 livrée 5906f483, brute 5906f483)
- Step 2: « Enregistrer en roulant », le navigateur refuse la localisation (PERMISSION_DENIED réel) → message « L'enregistrement a besoin de ta localisation Aucun trajet n'a été créé. Pour l'autoriser : touche le cadenas à gauche de… » ; aucun écran En route ; rien dans le téléphone (pt-en-route absent) ; trajets en base 0 → 0 → capture `US-6.E1-02-apres.png` ✓ (03:35:20Z, md5 livrée 4e1684e8, brute 4e1684e8)

### Issues Found
- aucune sur la version déployée à cette passe.

## US-6.E2 — Trajet trop court

### Happy Path
- Step 1: enregistrement de 40 positions (40 s du GPX, départ place du Vigan) → En route : 0,1 km, 0,01 L, 0:00, vitesse 7 km/h → capture `US-6.E2-01-avant.png` ✓ (03:36:03Z, md5 livrée 01f6e97a, brute 01f6e97a)
- Step 2: « Arrêter et voir le coût » → « Trajet trop court pour être calculé 0,08 km enregistrés : il en faut au moins 1. Rien n'a été ajouté à l'historique. Retour aux trajets » ; trajets en base 0 → 0 ; points effacés du téléphone → capture `US-6.E2-02-apres.png` ✓ (03:36:04Z, md5 livrée eec9eb9f, brute eec9eb9f)

### Issues Found
- aucune sur la version déployée à cette passe.

## US-3.9 — Aller au Royaume-Uni

### Happy Path
- Step 1: départ Albi, « Londres » tapé dans le champ arrivée → proposition « Londres Angleterre, Royaume-Uni » → capture `US-3.9-01-avant.png` ✓ (03:36:08Z, md5 livrée ae97b32d, brute ae97b32d)
- Step 2: Londres choisi, « Calculer le coût » → Albi → Londres : 1122 km, 223,69 € ; ligne pays « GB Royaume-Uni · 128 km · 7,7 L × 2,071 — moyenne du jour de 2 316 stations (prix publiés en pence/L, convertis en €) 16,05 € » = moyenne du jour GB 2.071 €/L (2316 stations, 2026-10-21) ; note Manche affichée ; péages « FR Autoroutes de France · MONTAUBAN NORD - GIGNAC 15,90 € FR Autoroutes de France · VIERZON-NORD - LA FOLIE-B/PARIS 21,80 € FR Autoroutes de France · ROISSY CDG » ; Eurotunnel absent ; Dartford absent (non franchi par cet itinéraire) → capture `US-3.9-02-apres.png` ✓ (03:36:11Z, md5 livrée 714f5cde, brute 714f5cde)

### Issues Found
- aucune sur la version déployée à cette passe.

## US-1.9 — Stations au Royaume-Uni

### Happy Path
- Step 1: navigateur géolocalisé à Londres (51,507 N ; 0,128 O), onglet Trajets ouvert → position émulée : Londres ; onglet Prix pas encore ouvert → capture `US-1.9-01-avant.png` ✓ (03:36:13Z, md5 livrée 51c07505, brute 51c07505)
- Step 2: onglet Prix, puis la première station de la liste (fiche) → 49 stations britanniques dans la liste, 49 pastilles ; GB-gcpvne36gtnz : SP95-E10 2,022 €/L = 169.9 p/L ÷ 100 ÷ 0.84028 ; fiche : « Gazole 197,9 p/L SP95-E10 169,9 p/L SP95 169,9 p/L Prix publiés en pence par litre, convertis au cours BCE du 20/10/2026 : 1 € = 0,8403 £. » → capture `US-1.9-02-apres.png` ✓ (03:36:15Z, md5 livrée 422dbed4, brute 422dbed4)

### Issues Found
- aucune sur la version déployée à cette passe.

### Bilan du passage court (03:36:15Z) : 8/8 étapes ✓

| capture | DOM | md5 livrée | md5 brute |
|---|---|---|---|
| `US-6.E1-01-avant.png` | ✓ | 5906f4836dd39f47db3cce61d6d8ee37 | 5906f4836dd39f47db3cce61d6d8ee37 |
| `US-6.E1-02-apres.png` | ✓ | 4e1684e8000c16166e59f0d27e212276 | 4e1684e8000c16166e59f0d27e212276 |
| `US-6.E2-01-avant.png` | ✓ | 01f6e97afa37c7a20da22c5902aa30f7 | 01f6e97afa37c7a20da22c5902aa30f7 |
| `US-6.E2-02-apres.png` | ✓ | eec9eb9f862ecd7d0576a35728852bb3 | eec9eb9f862ecd7d0576a35728852bb3 |
| `US-3.9-01-avant.png` | ✓ | ae97b32de23b442074629818bfe6923e | ae97b32de23b442074629818bfe6923e |
| `US-3.9-02-apres.png` | ✓ | 714f5cde52c02f3ba87a282ab095610d | 714f5cde52c02f3ba87a282ab095610d |
| `US-1.9-01-avant.png` | ✓ | 51c07505cf687f8091641a624efa2fa3 | 51c07505cf687f8091641a624efa2fa3 |
| `US-1.9-02-apres.png` | ✓ | 422dbed4d0a756459469fae1fba21c6a | 422dbed4d0a756459469fae1fba21c6a |

Avertissements de page :
- UK : console.error « Failed to load resource: the server responded with a status of 502 () »

## Captures — état final (03:53Z)

28/28 captures du plan présentes, en livraison (`tests/e2e/delivery/`) et en brute (`tests/e2e/exploration/m4-captures-brutes/`), toutes prises par `page.screenshot()` dans `run-m4.mjs` (aucune copie). Passages qui les ont produites : « court » de 03:35Z (US-6.E1, 6.E2, 3.9, 1.9 — refait pour recentrer US-3.9-02 sur la note Manche), « us62 » de 02:05-02:11Z (US-6.2, refait après correction de l'assertion de rafraîchissement), « long » de 01:59-03:12Z (le reste).
Doublons d'octets entre deux noms : livrées aucun ; brutes aucun. Livrée = brute pour 27/28 (aucune étiquette posée : deux prises consécutives du même écran) ; la seule différence : ['US-6.6-01-avant.png'] (horloge de l'écran En route entre les deux prises).
Visuellement identiques mais pas aux octets : US-6.5-02, US-6.6-01 et US-6.6-02 montrent le même haut du résultat « Albi → Toulouse · enregistré » (le bloc « Ma vitesse enregistrée » est déjà dans le cadre) ; US-6.3-01 et US-6.3-02 montrent le même écran En route à 60 s d'écart (c'est l'objet de l'étape : rien ne change, l'écran reste allumé).

| capture | md5 livrée | md5 brute | prise à |
|---|---|---|---|
| `US-1.9-01-avant.png` | 51c07505cf687f8091641a624efa2fa3 | 51c07505cf687f8091641a624efa2fa3 | 03:36:13Z |
| `US-1.9-02-apres.png` | 422dbed4d0a756459469fae1fba21c6a | 422dbed4d0a756459469fae1fba21c6a | 03:36:15Z |
| `US-3.9-01-avant.png` | ae97b32de23b442074629818bfe6923e | ae97b32de23b442074629818bfe6923e | 03:36:08Z |
| `US-3.9-02-apres.png` | 714f5cde52c02f3ba87a282ab095610d | 714f5cde52c02f3ba87a282ab095610d | 03:36:11Z |
| `US-6.1-01-avant.png` | 2857dbd765f5d914ebfd70a218d69f55 | 2857dbd765f5d914ebfd70a218d69f55 | 01:59:23Z |
| `US-6.1-02-apres.png` | 3060429457b2c9531a3dff39104cc965 | 3060429457b2c9531a3dff39104cc965 | 01:59:27Z |
| `US-6.2-01-avant.png` | a52d7acc8dfcf0f1ec650c455bfca5a1 | a52d7acc8dfcf0f1ec650c455bfca5a1 | 02:05:57Z |
| `US-6.2-02-apres.png` | 09edb305ecde0724019e02b420b8158d | 09edb305ecde0724019e02b420b8158d | 02:11:39Z |
| `US-6.3-01-avant.png` | 9bfd07a139aca3949b40704849393734 | 9bfd07a139aca3949b40704849393734 | 02:05:09Z |
| `US-6.3-02-apres.png` | bcc4f3e86c08b5c51e389ba0812ef58d | bcc4f3e86c08b5c51e389ba0812ef58d | 02:06:09Z |
| `US-6.3-03-avant.png` | 4f7a64e87b877aaf03657defdc340036 | 4f7a64e87b877aaf03657defdc340036 | 02:22:38Z |
| `US-6.3-04-apres.png` | c64ca791074b0d6ef4afeb2684037c61 | c64ca791074b0d6ef4afeb2684037c61 | 02:22:56Z |
| `US-6.4-01-avant.png` | f86f515afb2f58b431e8fcb0d49842a5 | f86f515afb2f58b431e8fcb0d49842a5 | 02:07:33Z |
| `US-6.4-02-apres.png` | 81405658842b6a71c36ae812ea1656cf | 81405658842b6a71c36ae812ea1656cf | 02:10:53Z |
| `US-6.5-01-avant.png` | 5a03dd9503a7a508a476853d6b409417 | 5a03dd9503a7a508a476853d6b409417 | 03:12:12Z |
| `US-6.5-02-apres.png` | ab8c9fd49feb9a7f3567cb4f18c3b7b1 | ab8c9fd49feb9a7f3567cb4f18c3b7b1 | 03:12:16Z |
| `US-6.5-03-avant.png` | dec37529527ae29d6b9436ad90c58c9a | dec37529527ae29d6b9436ad90c58c9a | 03:12:16Z |
| `US-6.5-04-apres.png` | c99840df73a33fad9f505d14ca784107 | c99840df73a33fad9f505d14ca784107 | 03:12:16Z |
| `US-6.6-01-avant.png` | 9241c27afa18aa67a057de6f2a79b5a1 | 18851acbf1332b3c33a958f74bf5112a | 03:12:17Z |
| `US-6.6-02-apres.png` | a88113da0cd37bf1dec83b1c282a9b04 | a88113da0cd37bf1dec83b1c282a9b04 | 03:12:17Z |
| `US-6.6-03-avant.png` | 7f68fb92c88f5568eebfc6a63536824a | 7f68fb92c88f5568eebfc6a63536824a | 03:12:22Z |
| `US-6.6-04-apres.png` | b029403626cff66c05b9dc62167e5095 | b029403626cff66c05b9dc62167e5095 | 03:12:22Z |
| `US-6.E1-01-avant.png` | 5906f4836dd39f47db3cce61d6d8ee37 | 5906f4836dd39f47db3cce61d6d8ee37 | 03:35:19Z |
| `US-6.E1-02-apres.png` | 4e1684e8000c16166e59f0d27e212276 | 4e1684e8000c16166e59f0d27e212276 | 03:35:20Z |
| `US-6.E2-01-avant.png` | 01f6e97afa37c7a20da22c5902aa30f7 | 01f6e97afa37c7a20da22c5902aa30f7 | 03:36:03Z |
| `US-6.E2-02-apres.png` | eec9eb9f862ecd7d0576a35728852bb3 | eec9eb9f862ecd7d0576a35728852bb3 | 03:36:04Z |
| `US-6.E3-01-avant.png` | 22c47fd856d2aefad17cf12d94815a7a | 22c47fd856d2aefad17cf12d94815a7a | 02:14:23Z |
| `US-6.E3-02-apres.png` | 23975a57b5bc05d3dbfe70ef3b0c0b52 | 23975a57b5bc05d3dbfe70ef3b0c0b52 | 02:14:24Z |

## Extraits et suite Playwright complète (prod)

- Extraits `m4-test-snippets/` (14 tests, 11 histoires), joués à part entre 02:25 et 02:37Z (pendant le passage long de run-m4, qui n'utilise pas d'administrateur) : 14/14 verts ; rejoués dans la suite complète ci-dessous : 14/14 verts.
- Suite complète `npx playwright test` (m1, m2, m3 + extraits m4), 1re fois 03:13-03:34Z : 134 ✓, 23 ✘, 2 ignorés, 7 non joués — invalide : pendant ce passage j'ai lancé deux autres `npx playwright test` dont le `globalSetup` (m3-global.mjs) supprime tous les administrateurs `m3-admin-eph-*`, y compris celui du passage en cours → écran Moteurs inaccessible (« [data-screen="S5"] not found »). Ce passage a aussi révélé 3 vrais échecs M2 (US-3.5, US-3.6, US-4.2) : la moyenne France lue sans filtre de pays rendait la moyenne GB du jour — corrigé (6fff9cf), les 3 repassent.
- Suite complète rejouée SEULE, 03:37-03:52Z : **162 ✓, 2 ✘, 2 ignorés** (US-5.5 et US-5.E3 : HERE sans clé, connus).
  • ✘ connu : `m1-explore.spec.ts:264` US-1.E4 — aucune rupture de gazole réelle dans le rayon.
  • ✘ `m3-explore.spec.ts:841` US-PERF-001 (4G émulée à Barcelone) : liste affichée en 4 717 ms (> 2 500). Rejoué seul 3 fois : 3/3 verts. Variation de temps de réponse, pas de régression constatée ; le code de l'écran Prix n'a pas changé au jalon 4.

## Points relevés (non bloquants, non corrigés)

- Litres en direct vs litres finaux : à l'arrivée, l'écran En route affichait 4,42 L / 76,8 km ; le résultat calculé 5,3 L / 77 km. L'écart (≈ 0,9 L) correspond à l'énergie des montées du tracé recalé (586 m de dénivelé positif d'après les tronçons), que le direct ne compte pas (pas d'altitude fiable du GPS) : le direct est une estimation basse.
- En pause de plus de 3 minutes, la courbe « des 3 dernières minutes » de l'écran En route se vide (aucune position nouvelle) — visible sur US-6.4-02.
- La durée de l'écran En route est au format h:mm (comme la maquette) : « 0:00 » pendant la première minute.
- Albi → Londres : l'itinéraire Stadia emprunte le Silvertown Tunnel (péage TfL) ; ni PTV ni la table des péages fixes ne le tarifent.
- Au rechargement (US-6.E3-02), le bandeau de reprise apparaît avant la fin du chargement de la voiture et de l'historique (« Chargement… » visibles).
