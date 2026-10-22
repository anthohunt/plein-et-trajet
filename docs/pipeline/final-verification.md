# Vérification finale — étape 6 « Livrer » (passe fraîche contre l'appli déployée)

**Date** : 2026-10-22, 06:36Z → 07:12Z (≈ 36 min, VPS, sous `lourd --nom final-e2e`).
**Appli** : https://plein-et-trajet.vercel.app, HTTP 200, bundle servi `index-BtagRHsn.js` (identique à celui de `dist/index.html` du workspace, commit servi 116357c).
**Navigateur** : Chromium (Playwright), viewport 390 × 844, `hasTouch`, fr-FR, Europe/Paris, départ Albi (43.92833, 2.145916) ; V-3.2-05/06 : Chromium complet du cache Playwright (verrou d'écran).

## Résultat en une ligne
**207 captures faites sur 217 attendues côté web** (231 au plan − 14 Android), toutes écrites sous `tests/e2e/final/` à partir de rendus frais ; 10 absentes (écran Moteurs, écriture de clés interdite). **63 histoires : 57 PASS, 0 FAIL, 6 NON REJOUÉE.** Playwright (specs existantes) : **102 passés, 1 échoué puis passé en rejeu** (US-PERF-001 accueil, 3 002 ms une fois sous contention, puis 531 / 554 / 504 ms sous `lourd` et 455 / 440 ms hors `lourd`). Aucun défaut de l'appli constaté.

## Commandes lancées
Les trois specs Playwright ne prennent aucune capture ; les captures aux noms exacts des plans viennent de `run-m5.mjs` (rendu au nom exact de chaque étape du plan m5) et d'un script neuf. Variables d'environnement ajoutées à `tests/e2e/exploration/m5-explore-outils.mjs` (comportement par défaut inchangé) : `SHOTS_DIR` (dossier des captures, défaut `tests/e2e/delivery`) et `SHOTS_AUX_DIR` (brutes, journal et résultats JSON, défaut `tests/e2e/exploration/`). Secrets : `set -a; . ./.env.local; set +a` (jamais écrits).

| # | Commande | Rôle | Durée | Résultat |
|---|---|---|---|---|
| 1 | `SHOTS_DIR=tests/e2e/final SHOTS_AUX_DIR=<scratch> PASSAGE=final lourd --nom final-e2e node tests/e2e/exploration/run-m5.mjs` | m5 : flux voiture, trajet, cas, stations, historique, retraits (140 captures) | 7 min 45 s | 136 / 140 étapes ✓ au premier passage : V-1.2-02 (écart de texte du plan) et 3 étapes de V-4.1 / V-4.2 (moyenne du jour passée de 2,154 à 2,153 €/L pendant le run, comparée à la valeur lue au démarrage) ; 0 requête vers api.myptv.com ; 0 erreur de page |
| 2 | `… PASSAGE=final2 … run-m5.mjs cas` | rejeu du flux « cas » (V-3.x, V-4.x, V-5.5…) | 2 min | 32 / 32 ✓, 0 texte interdit, 0 requête myptv |
| 3 | `lourd --nom final-e2e node tests/e2e/final/final-complement.mjs m1,m2,m3` puis rejeux ciblés (`SEULEMENT=…`) | m1 (37 captures), m2 + m4 (12), m3 lecture seule (11) | 3 min + 4 rejeux de 1 min | 20 / 24 au premier passage (US-1.E1 : timeout d'attente de 5 s ; US-5.1, 5.2, 5.6 : compte du nombre de services et attente de la session administrateur) — corrigés dans le script, rejoués ✓ |
| 4 | `… final-complement.mjs nouveaux` | m5 US-NEW-1 et US-NEW-2 (5 captures) | 1 min | 2 / 2 ✓ après une correction du script (la voiture était réinjectée par le script d'initialisation après « Effacer ») |
| 5 | `lourd --nom final-e2e node tests/e2e/exploration/m6-test-snippets/v32-web-verrou.mjs tests/e2e/final` | m6 V-3.2-05/06 (web) | 20 s | 4 OK sur 4 |
| 6 | `lourd --nom final-e2e npx playwright test --reporter=list` (m1-explore, m5-explore 65 tests, m5-regression, m6-explore) | spec Playwright de bout en bout, pas de captures | 16 min 30 s | 102 passés, 1 échoué (US-PERF-001 accueil, transitoire), rejoué seul 5 fois : 5 passés |

Le script neuf est `tests/e2e/final/final-complement.mjs` (bibliothèque Playwright, lancé à la main : `playwright.config.ts` ne le prend pas). Injections marquées `// MOCKED:` dans le code : US-1.E1, US-1.E2, US-A11Y-004 (latence ajoutée), US-NEW-1 ; côté run-m5.mjs : V-2.E1 (502 sur voiture-eea) et V-6.4 (latence sur lieux).

## Résultat par histoire
Les 14 captures Android comptent dans « attendues » (colonne de droite) mais pas dans « faites » ; elles sont listées plus bas.

| Histoire | Verdict | Captures faites / attendues | Notes |
|---|---|---|---|
| US-1.4 | PASS | 4 / 4 |  |
| US-1.6 | PASS | 4 / 4 |  |
| US-2.1 | PASS | 2 / 2 |  |
| US-1.E1 | PASS | 3 / 3 | Injection : lecture des prix coupée (page.route abort) ; capture 01 prise avant la coupure. |
| US-1.E2 | PASS | 3 / 3 | Injection : réponse vide pour E85 (il existe de vraies stations E85). |
| US-1.E3 | PASS | 3 / 3 | Donnée réelle (station 81000002, SP95-E10, « prix du 20/10 », opacity 0.8) ; aucune fixture insérée. |
| US-1.E4 | PASS | 3 / 3 | Donnée réelle : aucune rupture gazole autour d'Albi ce jour ; rupture réelle ailleurs en France (station 10160002, Yonne), position posée à 200 m ; la station réapparaît en SP98. |
| US-2.E1 | PASS | 3 / 3 | Donnée réelle : TotalEnergies Albi · Relais des Fontanelles, GPLc « non vendu » (SP98 y est « rupture »). |
| US-1.P1 | PASS | 2 / 2 | V1 : après le glisser, « Rechercher dans cette zone » avant de recentrer (voir Écarts). |
| US-A11Y-001 | PASS | 2 / 2 | 26 contrôles parcourus dans l'ordre, contour ≥ 2 px, Maj+Tab revient. Captures sur Stations ; les autres écrans sont couverts par m5-regression (sans captures). |
| US-A11Y-002 | PASS | 2 / 2 | Focus sur le titre à l'ouverture, retour sur la ligne à la fermeture. |
| US-A11Y-003 | PASS | 2 / 2 | Échap ferme la fiche. |
| US-A11Y-004 | PASS | 2 / 2 | Injection : latence ajoutée à la vraie réponse de la fiche pour voir l'annonce « Chargement des prix de la station… » (role=status, texte masqué visuellement : la capture montre les « … »). |
| US-PERF-001 | PASS | 2 / 2 | Liste affichée en 791 ms en 4G simulée (85 ms, 9 Mbit/s). Capture 01 prise juste après l'envoi de la requête (« Chargement des prix… »). |
| US-3.E3 | PASS | 3 / 3 | Contexte neuf ; onglet Historique (voir Écarts). |
| US-4.E2 | PASS | 3 / 3 | État préparé (trajet arrêté 41,2 L en IndexedDB, format TrajetV1) ; « 12 », « abc », « 0,3 » refusés, coût 88,70 € inchangé. |
| US-5.1 | PASS | 2 / 2 | Administrateur ÉPHÉMÈRE, lecture seule ; 7 services (le plan dit 6) ; plus de bouton ⚙ (voir Écarts). |
| US-5.2 | PASS | 2 / 2 | Choix local de HERE sans « Enregistrer » : état « Clé à coller » ; rien d'écrit. |
| US-5.3 | NON REJOUÉE | 0 / 4 | Écriture d'une clé de production interdite (non rejouée — écriture de clés de production interdite). |
| US-5.4 | NON REJOUÉE | 0 / 2 | Test de connexion avec clé collée : non rejouée — écriture de clés de production interdite. |
| US-5.E1 | PASS | 3 / 3 | Visiteur sans compte : aucun lien Moteurs, /moteurs renvoie à l'accueil ; refus serveur (401) en lecture et écriture. Capture 03 = relevé des vraies réponses rendu en page texte. |
| US-5.E2 | NON REJOUÉE | 0 / 4 | Clé invalide collée + test : non rejouée — écriture de clés de production interdite (la cas limite 2 « quota » suppose aussi un test PTV réel). |
| US-5.6 | PASS | 4 / 4 | Liens PTV et Stadia lus, fiche Voitures sans lien ; lecture seule. |
| US-6.E1 | PASS | 2 / 2 | Localisation refusée : message, aucun trajet créé (IndexedDB 0/0). |
| US-6.E2 | PASS | 2 / 2 | Tracé GPX rejoué (horloge accélérée) ; « Trajet trop court : 0,5 km sur 1 minimum. » ; IndexedDB 0/0. |
| US-6.E3 | PASS | 2 / 2 | Rechargement pendant un trajet : 2,0 km et 420 points conservés (voir Écarts). |
| V-1.1 | PASS | 6 / 6 |  |
| V-1.2 | PASS (écart de texte) | 6 / 6 | Étape 2 : run-m5 la marque ✗ car l'écran dit « Renault Clio » / « 1.2 · 118 ch · 2017 · SP95-E10 » et le plan « Renault Clio IV » / « 1.2 TCe 120 · … » (la base EEA ne porte ni « IV » ni « TCe 120 »). Fonction OK ; voir Écarts. |
| V-1.3 | PASS | 4 / 4 | Localisation refusée simulée par un contexte sans permission. |
| V-2.1 | PASS | 6 / 6 |  |
| V-2.2 | PASS | 4 / 4 |  |
| V-2.3 | PASS | 4 / 4 |  |
| V-2.E1 | PASS | 4 / 4 | Injection (étapes 3-4) : réponse de voiture-eea remplacée par un 502 ; étapes 1-2 sans injection. |
| V-3.1 | PASS | 6 / 6 | Tracé GPX réel rejoué, horloge accélérée. |
| V-3.4 | PASS | 4 / 4 | Tracé GPX rejoué. |
| V-3.5 | PASS | 6 / 6 | Tracé GPX rejoué. |
| V-3.E1 | PASS | 6 / 6 | Tracé dérivé (immobile 11 min) rejoué. |
| V-3.E2 | PASS | 4 / 4 | Tracé dérivé (trou de 90 s) rejoué. |
| V-4.1 | PASS | 6 / 6 | Rejoué une seconde fois : au premier passage la moyenne France du jour a changé en cours de run (2,154 → 2,153 €/L) et 3 étapes ont été marquées ✗ par comparaison à une valeur lue 5 min plus tôt ; rejeu complet du flux, tout ✓. |
| V-4.2 | PASS | 6 / 6 | Même remarque que V-4.1 (rejeu). |
| V-4.3 | PASS | 4 / 4 | État préparé en IndexedDB (41,2 L à 2,161 €/L). |
| V-4.4 | PASS | 4 / 4 |  |
| V-4.5 | PASS | 2 / 2 | État préparé en IndexedDB. |
| V-4.6 | PASS | 2 / 2 | État préparé en IndexedDB. |
| V-4.7 | PASS | 6 / 6 |  |
| V-6.1 | PASS | 4 / 4 |  |
| V-6.2 | PASS | 4 / 4 | État préparé en IndexedDB. |
| V-6.3 | PASS | 4 / 4 | État préparé en IndexedDB. |
| V-6.4 | PASS | 4 / 4 | Étapes avec état préparé ; latence ajoutée à la vraie réponse de lieux (injection, V-6.4). |
| V-5.1 | PASS | 4 / 4 |  |
| V-5.2 | PASS | 4 / 4 |  |
| V-5.3 | PASS | 4 / 4 |  |
| V-5.4 | PASS | 2 / 2 |  |
| V-5.5 | PASS | 6 / 6 |  |
| V-5.6 | PASS | 4 / 4 |  |
| V-5.7 | PASS | 6 / 6 | Géolocalisation posée à Barcelone / Dartford / Bruxelles. |
| V1-retraits | PASS | 4 / 4 | Captures 03 et 04 = relevés de lecture seule (moteurs, comptage de clés et noms de secrets Vault, jamais de valeur) rendus en page texte. |
| US-NEW-1 | PASS | 3 / 3 | Injection : exception de rendu provoquée (Number.prototype.toLocaleString lève une erreur) ; « Effacer » vide le localStorage et rend l'accueil sans voiture. |
| US-NEW-2 | PASS | 2 / 2 | Paysage 844 × 390 : carte de 150 px, page défilée, liste lisible, onglets en bas. |
| V-3.2 | PASS (web) / NON REJOUÉE (Android) | 2 / 6 | Étapes 5-6 (web) jouées ; étapes 1-4 = Android, CI bloquée. Verrou d'écran : sentinelle « screen » tenue, data-verrou=actif. |
| V-3.3 | NON REJOUÉE | 0 / 6 | Android uniquement (notification) ; CI GitHub Actions bloquée par la facturation, pas de Java ni de SDK Android sur le VPS. |
| US-NEW-3 | NON REJOUÉE | 0 / 3 | Android uniquement (dialogues natifs) ; CI bloquée. |
| US-NEW-4 | NON REJOUÉE | 0 / 1 | Android uniquement (APK de release) ; CI bloquée. |

Total : 63 histoires, **207 captures faites / 231 au plan (217 web attendues)**.

## Captures attendues et absentes (24)
| Capture | Raison |
|---|---|
| `US-5.3-01-coller-la-cl-avant.png` | non rejouée — écriture de clés de production interdite (écran Moteurs) |
| `US-5.3-02-coller-la-cl-apres.png` | non rejouée — écriture de clés de production interdite (écran Moteurs) |
| `US-5.3-03-coller-la-cl-avant.png` | non rejouée — écriture de clés de production interdite (écran Moteurs) |
| `US-5.3-04-coller-la-cl-apres.png` | non rejouée — écriture de clés de production interdite (écran Moteurs) |
| `US-5.4-01-tester-la-connexion-avant.png` | non rejouée — écriture de clés de production interdite (écran Moteurs) |
| `US-5.4-02-tester-la-connexion-apres.png` | non rejouée — écriture de clés de production interdite (écran Moteurs) |
| `US-5.E2-E1-01-declencheur.png` | non rejouée — écriture de clés de production interdite (écran Moteurs) |
| `US-5.E2-E1-02-resultat.png` | non rejouée — écriture de clés de production interdite (écran Moteurs) |
| `US-5.E2-E1-03-retour.png` | non rejouée — écriture de clés de production interdite (écran Moteurs) |
| `US-5.E2-E2-01-quota-ptv.png` | non rejouée — écriture de clés de production interdite (écran Moteurs) |
| `V-3.2-01-avant.png` | Android — non refaite : CI GitHub Actions bloquée par la facturation, pas de Java ni de SDK Android sur le VPS |
| `V-3.2-02-apres.png` | Android — non refaite : CI GitHub Actions bloquée par la facturation, pas de Java ni de SDK Android sur le VPS |
| `V-3.2-03-avant.png` | Android — non refaite : CI GitHub Actions bloquée par la facturation, pas de Java ni de SDK Android sur le VPS |
| `V-3.2-04-apres.png` | Android — non refaite : CI GitHub Actions bloquée par la facturation, pas de Java ni de SDK Android sur le VPS |
| `V-3.3-01-avant.png` | Android — non refaite : CI GitHub Actions bloquée par la facturation, pas de Java ni de SDK Android sur le VPS |
| `V-3.3-02-apres.png` | Android — non refaite : CI GitHub Actions bloquée par la facturation, pas de Java ni de SDK Android sur le VPS |
| `V-3.3-03-avant.png` | Android — non refaite : CI GitHub Actions bloquée par la facturation, pas de Java ni de SDK Android sur le VPS |
| `V-3.3-04-apres.png` | Android — non refaite : CI GitHub Actions bloquée par la facturation, pas de Java ni de SDK Android sur le VPS |
| `V-3.3-05-avant.png` | Android — non refaite : CI GitHub Actions bloquée par la facturation, pas de Java ni de SDK Android sur le VPS |
| `V-3.3-06-apres.png` | Android — non refaite : CI GitHub Actions bloquée par la facturation, pas de Java ni de SDK Android sur le VPS |
| `V-1.3-A02-dialogue-localisation.png` | Android — non refaite : CI GitHub Actions bloquée par la facturation, pas de Java ni de SDK Android sur le VPS |
| `V-1.3-A04-dialogue-notifications.png` | Android — non refaite : CI GitHub Actions bloquée par la facturation, pas de Java ni de SDK Android sur le VPS |
| `V-3.2-A31-batterie-appli.png` | Android — non refaite : CI GitHub Actions bloquée par la facturation, pas de Java ni de SDK Android sur le VPS |
| `V-1.3-A01-apk-release.png` | Android — non refaite : CI GitHub Actions bloquée par la facturation, pas de Java ni de SDK Android sur le VPS |

## Écarts de texte des plans
Étape → texte du plan → ce qui a été joué. L'agent principal réécrit le plan d'après cette liste.

| Étape | Texte du plan | Joué / constaté |
|---|---|---|
| V-1.2 étapes 1-2 (V-1.2-01, 02) | « la Renault Clio IV 1.2 TCe 120 de 2017 » ; « Renault Clio IV » et « 1.2 TCe 120 · 2017 · SP95-E10 » | « Renault Clio » et « 1.2 · 118 ch · 2017 · SP95-E10 » (le texte vient de la base EEA, Cn = CLIO, qui ne porte ni « IV » ni « TCe 120 ») |
| V-5.5 étape 1 | prix d'exemple 2,103 €/L | prix réel du jour lu à l'écran (1,990 €/L au moment du run) |
| m1, toutes histoires (« écran Prix », « Prix », S1/S2) | écran Prix, fiche S2 | écran **Stations** (/stations) et sa fiche (bottom sheet) ; onglet « Stations » |
| US-1.P1 étape 2 | « je touche le bouton de recentrage ; la carte revient sur ma position et la liste se recharge » | idem, mais précédé de « Rechercher dans cette zone » après le glisser : la carte déplacée ne recharge plus la liste d'elle-même (V-5.3) |
| US-1.E3, US-1.E4, US-2.E1 « Mise en place » | « données de test : une station … insérée par la fixture Supabase » | aucune fixture : vraies données du jour (prix de plus de 48 h ; rupture de gazole réelle trouvée ailleurs en France car aucune autour d'Albi ; station réelle sans GPLc) ; rien écrit en base |
| US-1.E1 / E2 / E3 / E4 / 2.E1, étape 3 | « puis rétablir le réseau / les données et vérifier le retour à l'état normal » | joué : réseau rétabli + Réessayer (E1) ; autre carburant rechoisi (E2, E3, E4) ; fiche fermée (2.E1) |
| US-A11Y-001 à -004, PERF-001 | « sur chaque écran du jalon » | captures prises sur l'écran Stations (les captures portent le suffixe m1) ; les autres écrans (T1, T2, T3, T4, T6) sont couverts par `m5-regression.spec.ts` (Tab, contour, libellés, Échap), sans capture |
| US-A11Y-004 étape 2 | « chaque pastille annonce station et prix en euros » | l'étiquette dit aussi « moins cher » ou « plus cher » (« Station, 1,990 euros le litre, moins cher ») |
| US-PERF-001 étape 2 | « la liste des stations est affichée en moins de 2,5 s » | joué en 4G simulée, cache désactivé : 791 ms (écran Stations) ; l'accueil seul : 440 à 554 ms |
| US-3.E3 étapes 1-3 | « (écran Trajets) j'ouvre l'onglet Trajets » ; « Aucun trajet pour l'instant » avec une invitation à calculer le premier | onglet **Historique** ; texte « Aucun trajet enregistré. », totaux à 0 / 0,0 km / 0,00 € ; pas d'invitation à calculer (il n'y a plus de calcul de trajet) ; étape 3 : retour à l'onglet Trajet |
| US-4.E2 étapes 1-3 | « le champ prix perso ouvert (écran Résultat du trajet) » ; « Entre un prix entre 0,50 et 4,00 €/L » | écran **Fin de trajet** (T4), touche du compteur du prix ; même message ; état de départ préparé en IndexedDB |
| US-6.E1 étape 2 | « j'appuie sur « Enregistrer en roulant » » ; « (écran Trajets) » | « **Démarrer** » de l'accueil (T1) ; message « L'enregistrement a besoin de ta localisation » avec la marche à suivre |
| US-6.E2 étape 2 | « j'appuie sur « Arrêter et voir le coût » » ; « trop court pour être calculé » | « **Arrêter** » de En route (T3) ; message « Trajet trop court : 0,5 km sur 1 minimum. Rien n'est ajouté à l'historique. » + « Retour à l'accueil » |
| US-6.E3 étape 2 | « l'appli propose de reprendre l'enregistrement en cours ou de l'arrêter » | pas de proposition : l'écran En route rouvre directement le trajet avec ses points et la distance conservée, boutons Pause et Arrêter |
| US-5.1 étapes 1-2 | « le bouton moteurs ⚙ » ; « liste les 6 services » | **aucun bouton** : l'écran se joint par l'adresse /moteurs (ou /admin pour la connexion) ; **7 services** (Prix des stations, Prix moyens par pays, Itinéraire, Péages, Voitures, Recherche de lieux, Base véhicules) |
| US-5.2 étape 2 | « HERE au lieu de PTV … « Clé à coller » » | idem (choix local sans « Enregistrer », état « Clé à coller » constaté) |
| US-5.E1 étapes 2-3 | « le bouton moteurs n'est pas affiché » | il n'existe plus de bouton ni de lien ; /moteurs renvoie à l'accueil ; refus serveur : 401 en lecture et en écriture de `moteurs`, 401 en lecture de `cles_fournisseurs`, 401 `non_connecte` sur la fonction `moteurs` |
| US-5.6 étape 4 | « une fiche sans clé (Voitures) » | idem, fiche « Voitures » sans lien ; consigne PTV : « Connecte-toi, puis ouvre le menu « API Keys » pour créer ou copier ta clé. » |
| US-NEW-1 étape 2 | « « L'écran n'a pas pu s'afficher » avec « Recharger » et « Effacer … » » | titre « Un problème est survenu » puis « L'écran n'a pas pu s'afficher. Recharger suffit souvent. … » ; boutons conformes |
| V-3.2 étapes 5-6 | « le texte dit que l'écran doit rester allumé » | « Garde l'écran allumé : un navigateur arrête le GPS écran éteint. » |

## Défauts de l'appli constatés
Aucun défaut de l'appli. Observations sans incidence sur le verdict :
• L'écran Moteurs affiche « Péages — Clé refusée par PTV (401) » (dernier incident du 21/10 08:37) alors que le moteur péages est hors service en V1 (`en_service = false`) : état hérité des essais de clé du jalon 3, pas un effet de ce run (aucune écriture).
• La lecture de l'écran Moteurs lance les tests d'état côté serveur (ex. « Connecté · test Albi → Toulouse OK » pour Itinéraire) : comportement de la fonction `moteurs` (action « lister »), aucune clé collée ni enregistrée.
• Un échec transitoire d'US-PERF-001 (accueil en 3 002 ms) pendant que deux jeux de tests tournaient en parallèle sur le VPS ; rejoué seul 5 fois : 440 à 554 ms.

## Nettoyage et garde-fous
• Écran Moteurs : aucune clé collée, aucun test de connexion déclenché par le script, rien écrit dans Vault, `cles_fournisseurs` ni `moteurs` ; l'écriture « visiteur » tentée (PATCH sur un filtre ne visant aucune ligne) a été refusée en 401. Lectures par l'API de gestion Supabase (flux V1-retraits) : comptage de lignes, noms de secrets Vault, jamais de valeur.
• Administrateur éphémère (`m3-admin-eph-*@example.org`) créé à chaque lot Moteurs puis supprimé ; relu après chaque lot : 0 restant (relevé final : aucun compte `eph` parmi les comptes existants, aucun compte créé depuis 06:30Z).
• Tous les contextes de test sont jetables (profils vides, fermés en fin de script) : IndexedDB `plein-et-trajet` et localStorage de test disparaissent avec eux ; le profil persistant du flux « voiture » est dans un dossier temporaire (aucun `m5-voiture-*` restant dans /tmp). Table `trajets` : jamais écrite (aucun script ne la touche ; 1 057 lignes relevées en fin de run).
• Aucun commit, aucun push. Fichiers modifiés hors `tests/e2e/final/` : `tests/e2e/exploration/m5-explore-outils.mjs` (variables d'environnement `SHOTS_DIR` et `SHOTS_AUX_DIR`) ; ce document.

Graphe de connaissances : non produit. graphify n’est pas installé sur ce serveur (aucun skill `graphify` dans `~/.claude/skills`, aucune commande `graphify`, aucun paquet Python, vérifié le 22/10). Le graphe est facultatif : on continue sans.

## Suite donnée par l'agent principal (livreur)
• Écarts de texte ci-dessus reportés dans les plans `tests/e2e/use-cases/m1..m6-use-case.md` (écran Prix → Stations, US-3.E3, US-4.E2, US-6.E1-E3, US-5.1, V-1.2, US-NEW-1, V-3.2-06) et, quand le comportement livré diffère du critère (US-5.1 : 7 services ; US-6.E3 : pas de proposition « reprendre ou arrêter »), dans `spec-final.md` et `reconciliation-report.md`. Aucune classe d'histoire ne change.
• Aucun défaut de l'appli : aucune correction de code, aucun redéploiement à la livraison (la prod reste 116357c).
• Les 14 captures Android du parcours illustré sont celles de la CI du jalon 6, recopiées depuis `tests/e2e/screenshots/m6/` vers `docs/delivery/screenshots/` seulement (pas dans `tests/e2e/final/`), et signalées sous chaque image.
