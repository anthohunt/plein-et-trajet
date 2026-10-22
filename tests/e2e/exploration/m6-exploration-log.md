# Jalon 6 — Appli Android : journal d'exploration (bâtisseur r1)

Écrit au fur et à mesure, une section par histoire. Android = GitHub Actions (anthohunt/plein-et-trajet, workflow `android`,
émulateur API 34 google_apis x86_64) ; web = prod https://plein-et-trajet.vercel.app (Playwright, Chromium complet).

## Choix de l'instrumentation (justification)

Pilotage par un script Node (`tests/android/m6-emulateur.mjs`) plutôt qu'un `androidTest` UiAutomator compilé :
- l'écran de l'appli est une WebView : UiAutomator n'y voit que des nœuds d'accessibilité approximatifs ; Playwright (`_android`,
  CDP) y clique par `data-el` et lit les points là où l'appli les écrit vraiment (IndexedDB `plein-et-trajet`, magasin `en_cours`,
  rempli par l'enregistreur JS à chaque position remise par le service natif du plugin) ;
- l'interface native (dialogues d'autorisation, volet des notifications et ses boutons) est pilotée par `uiautomator dump` +
  `input tap` — le même moteur d'accessibilité qu'UiAutomator, sans module Gradle de test à maintenir ;
- la position est injectée dans la puce GPS simulée (`adb emu geo fix`, vitesse du GPX) : elle traverse le vrai `GPS_PROVIDER`
  comme une vraie puce, sans fournisseur de test (`addTestProvider`) qui exigerait un processus de test dans l'appli.

## V-3.2 — Écran éteint, Waze devant (pas 5-6 : version web, sur la prod)

- 18:37Z — `tests/e2e/exploration/m6-test-snippets/v32-web-verrou.mjs` sur la prod : `V-3.2-05-avant.png` (Trajet, Démarrer),
  `V-3.2-06-apres.png` (En route, « Garde l'écran allumé : un navigateur arrête le GPS écran éteint. »).
- Premier essai KO : la coquille headless de Chromium refuse `navigator.wakeLock.request` (NotAllowedError) ; puis la
  permission accordée par CDP sans `browserContextId` ne s'appliquait pas au contexte (grantPermissions de Playwright refuse
  tout ce qu'il ne liste pas). Corrigé : Chromium complet (nouveau mode headless) + `Browser.setPermission` dans le contexte.
- Constat (sortie) : `OK navigator.wakeLock présent` · `OK sentinelle « screen » tenue (released=false) — [{"type":"screen","released":false}]`
  · `OK écran En route data-verrou=actif, plateforme web — web/actif`.

## Build — contrôles de l'APK (job `apk`)

- Run 39655337001 (commit 9f9a904), job apk 119413970006 : `controle-apk.py` sur `app-release.apk`.
  `OK APK signé (apksigner verify)` · `OK empreinte SHA-256 du certificat = celle du magasin de clés — b3a3b7b2…314c25`
  (calculée au VPS depuis le .p12 par python cryptography : `b3a3b7b2998e2d804a258491f60920417127dc01a32da2f7e2df794909314c25`).
- Manifeste fusionné (aapt2) : `OK FOREGROUND_SERVICE`, `OK FOREGROUND_SERVICE_LOCATION`, `OK ACCESS_FINE_LOCATION`,
  `OK POST_NOTIFICATIONS`, `OK PAS de ACCESS_BACKGROUND_LOCATION` (le plugin ne la déclare pas : aucun `tools:node="remove"` utile),
  `OK service … BackgroundGeolocationService foregroundServiceType=0x00000008` (location).
- ÉCART au plan : pas de `TrajetService` ; le service de premier plan est celui du plugin @capgo/background-geolocation 8.4.14. Pas renommé.
- Piège corrigé (9f59cae) : les rapports posés à la racine du dépôt déplaçaient la racine de l'artefact (release/ devenait
  android/app/build/outputs/apk/release/) ; rangés avec les APK.

## V-1.3 — Démarrer (dialogue d'autorisation natif) — rejoué sur Android

- Run 39655982353, job principal 119418838163 : APK de débogage installé SANS -g.
  `dialogue localisation : « Allow Plein & Trajet to access this device’s location? » → « While using the app »` ;
  `dialogue notifications : « Allow Plein & Trajet to send you notifications? » → « Allow »` ; `OK Démarrer ouvre En route`.
- Constat : la localisation est demandée dès l'OUVERTURE de l'appli (position de « Autour de moi »), pas au Démarrer ; les
  notifications le sont au premier Démarrer. Les captures A02 (nommée « accueil ») et A03 (dialogue) étaient donc le même écran :
  ordre des captures corrigé (14a8863) — A02 = dialogue localisation, A03 = accueil après autorisation, A04 = dialogue notifications.
- APK de release : installé (-g), ouvert, capture `V-1.3-A01-apk-release.png` (« Enregistre d'abord ta voiture », Démarrer).

## V-3.1 — Direct dans l'appli

- Run 39655982353 : `KO V-3.1 direct : km et vitesse comptés — 0.3 km, 74 km/h après 30 s` : seuil de MON test (> 0,3) trop serré
  (rejeu au point 700, ~70 km/h, démarrage compris) ; l'écran montre bien 74 km/h, 0,3 km, 0,06 L, 0,13 € (capture regardée).
  Seuil ramené à ≥ 0,2 km.

## V-3.4 — Pause (appli puis notification)

- Appli : `OK pause dans l'appli : « En pause », km figés 10 s — 0.3 → 0.3 km` ; `OK Reprendre dans l'appli : la distance repart — 0.3 → 0.4 km`.
- Notification, Maps devant : `OK pause depuis la notification : km figés 30 s de tracé — 8.6 → 8.6 km, enPause=true` (le GPS a
  continué d'être rejoué pendant ces 30 s).

## V-5.1 — Stations pendant l'enregistrement

- `OK Stations pendant l'enregistrement : les points continuent — 27 → 43 points en 20 s sur Stations` ; bandeau « Trajet en cours · 0,39 € »
  sur Stations (capture A08) ; retour sur Trajet : 0,9 km (A09).

## V-3.2 — Écran éteint, Maps devant (pas 1-4, Android)

- Image `google_apis` API 34 : Google Maps PRÉSENT (`package:/product/app/Maps/Maps.apk`) ; ouvert devant (écran d'accueil « Make it
  your map », pas de compte), `topResumedActivity=…com.google.android.maps.MapsActivity`.
- Écran éteint (`mWakefulness=Asleep`) 5 min ; notification lue chaque minute : 2,3 → 3,6 → 4,9 → 6,3 → 7,8 km.
- Points lus dans IndexedDB `plein-et-trajet`/`en_cours` (là où l'enregistreur les écrit à chaque position remise par le service) :
  `OK aucun trou > 15 s … — 256 points en 315 s, plus grand trou 1.864 s` ; `OK la distance couvre tout le temps écran éteint — 6.97 km comptés / 6.97 km rejoués`.
- Processus tué : `am kill` SANS effet (processus 11250 → 11250 : un processus avec service de premier plan n'est pas « sûr à tuer ») ;
  tué par SIGKILL (`run-as … kill -9`), comme le tueur mémoire du système → `OK processus de l'appli arrêté` (aucun redémarrage
  du service par le système). Réouverture : `OK le trajet en cours reprend avec tous ses points — 29 points avant → 35 après, même trajet`,
  `OK la notification du trajet revient`. Les ~16 s où le processus était mort ne sont pas enregistrées (rien ne tourne) : écart
  attendu, à dire au téléphone d'Anthony (OxygenOS tue plus souvent).

## V-3.3 — Piloter depuis la barre du téléphone

- Maps devant, volet ouvert : `OK notification « Plein & Trajet » dans le volet` ; `OK … vitesse, km, € + Pause et Arrêter — Trajet en cours | 0 km/h · 8,3 km · 3,11 € | Pause / Arrêter`.
- `OK notification mise à jour (lectures à 10 s d'écart) — 0 km/h · 8,3 km · 3,11 € → 110 km/h · 8,6 km · 3,33 €`.
- Pause touchée dans le volet : `OK … « Trajet en pause », bouton « Reprendre », appli pas ouverte — … devant : …MapsActivity`.
- Reprendre : `OK … « Trajet en cours », km repartent — 8.6 → 8.9 km`.
- Arrêter : `OK … l'appli s'ouvre sur la fin de trajet — https://localhost/fin | topResumedActivity=…pleinettrajet/.MainActivity` ;
  titre « ALBI → FLORENTIN » ; `OK notification effacée après Arrêter`.

## Écart natif / web (notification vs fin de trajet, même tracé, instant figé)

- GPS gelé 4 s, notification lue : `9,1 km · 3,58 €` (prix moyen France du jour 2,156 €/L → 1,660 L) ; fin de trajet (calculLocal de
  roule.ts) : 9,129 km, 1,661 L. **Écart km 0,31 % (< 3 %), écart litres 0,05 % (< 5 %)** ; direct à l'écran 1,66 L (0,08 %).

## V-4.7 — Enregistrer puis rouvrir : trajet dans l'historique

- `OK trajet enregistré présent dans l'historique après réouverture de l'appli — 46f05d97-…` (am force-stop puis relance).
  Historique local (IndexedDB) : aucune ligne Supabase écrite.
- Capture A15 prise trop tôt (le sélecteur `[data-trajet]` trouvait la section de fin de trajet) : sélecteur restreint à la liste (14a8863).

## V-3.5 — Arrêter dans l'appli

- `OK Arrêter dans l'appli ouvre la fin de trajet — FLORENTIN → LAGRAVE`, puis Supprimer (trajet de test non gardé).

## V-3.E1 / V-3.E2 — run 39655982353

- Job immobile 119418838385 : `##[error]Timeout waiting for emulator to boot.` (15 min) — aucun pas joué. Seconde chance ajoutée au
  workflow (14a8863), seulement si le scénario n'a pas commencé.
- Run 39659349314 (14a8863) : les DEUX jobs, deux essais chacun, `FATAL | Not enough space to create userdata partition. Available:
  7138.93 MB at /home/runner/.android/avd/test.avd, need 7372.80 MB.` puis `Timeout waiting for emulator to boot.` — cause du
  « démarrage trop long » vu depuis le début (y compris le job immobile du run précédent) : le disque du runner, pas la lenteur.
  Correctif 5b82b42 : outils inutiles retirés du runner (dotnet, ghc, CodeQL, boost, NDK) + `disk-size: 4096M`.

## Web — la version web reste en ligne

- 19:10Z — `m5-explore.spec.ts` + `m5-regression.spec.ts` sur https://plein-et-trajet.vercel.app, une passe sous `lourd` :
  **73 passed (25.9m)**. Vitest : 20 fichiers, 265 tests passés ; `npx tsc --noEmit` : code 0 ; `npx vite build` : built in 13.86s.

## Runs 39664532821 (5b82b42) et 39667270054 (0127045)

- Place disque : `/dev/root 72G 60G 13G 83%` → `72G 42G 30G 59%` ; l'émulateur démarre.
- Principal : **succès complet deux fois** (job 119448142457 puis 119457681185) — mêmes constats que ci-dessus, chiffres du run
  39664532821 : 253 points en 316 s écran éteint, plus grand trou 1,901 s, 7,00 km comptés / 7,00 km rejoués ; notification
  104 km/h · 8,5 km · 3,57 € → 103 km/h · 8,7 km · 3,69 € à 10 s ; pause 30 s 8,8 → 8,8 km ; écart km 0,44 %, litres 0,04 % ;
  processus tué 31 points → 36 après réouverture, même trajet.
- Immobile, run 39664532821 : appli tuée 40 s après le lancement — logcat `Killing …pleinettrajet (adj 0): depends on provider
  com.google.android.gms/.fonts.provider.FontsProvider in dying proc com.google.android.gms.persistent` (ANR des services Google
  juste après le démarrage). 90 s de calme ajoutées avant le scénario (0127045).
- Immobile, run 39667270054 (job 119457681177) : `OK distance complétée à travers le trou de 90 s — 8.244 km vs 8.244 km` mais
  `KO « GPS perdu »… — false | Trajet en cours` et `KO notification « Immobile depuis 10 min »… seconde 734`. Causes = MON harnais :
  (1) la puce GPS simulée répète la dernière position chaque seconde : se taire ne coupe pas le signal ; (2) la vitesse que
  j'envoyais était déduite du tremblement ±2 m du GPX garé (jusqu'à ~20 km/h), au-dessus du seuil d'immobilité (3 km/h).
  Correctif 34fffb2 : fournisseur de test `gps` (`cmd location providers …`, muet pendant le trou) et vitesse 0 sur place.

## Consommation sur émulateur (constat, pas un défaut de l'appli)

- Les fins de trajet de l'émulateur affichent 18 à 25 L/100 pour la Clio (WLTP 5,2 à 7,7). Recalcul de `calculLocal` (roule.ts) sur
  les 253 points réellement enregistrés écran éteint (points-ecran-eteint.json du run 39664532821) : 13,9 L/100 tels quels,
  **6,1 L/100 avec la vitesse Doppler** des mêmes points. Cause : écarts de réception de 0,47 à 2,07 s pour 1 s de tracé, venus de
  la latence variable d'`adb emu geo fix` (un processus par position) — la vitesse distance ÷ temps oscille et chaque reprise compte.
  Correctif côté harnais (34fffb2) : console de l'émulateur gardée ouverte, cadence calée sur l'horloge.
- À constater sur le téléphone : la consommation d'un vrai trajet (un vrai GPS date ses positions à 1 Hz) ; si elle reste
  gonflée, dater les points par `l.time` du GPS plutôt que par l'heure de réception (enregistreur-web.ts:59).

## Run 39671788190 (34fffb2)

- Immobile (job 119472879844) : **tout vert**. `cmd location help` : `add-test-provider <PROVIDER> [--requiresNetwork] [--requiresSatellite]`,
  `set-test-provider-location <PROVIDER> --location <LATITUDE>,<LONGITUDE>` ; appops mock_location accordé au shell.
  V-3.E2 : `OK « GPS perdu » dans l'appli et la notification pendant le trou — true | Trajet en cours · GPS perdu`,
  `OK signal retrouvé`, `OK distance complétée … — 8.244 km vs 8.244 km rejoués`.
  V-3.E1 (écran éteint, appli derrière l'accueil) : `OK notification « Immobile depuis 10 min » … — Immobile depuis 10 min : c'est fini ? | Reprendre / C'est fini | seconde 683 (immobile depuis la seconde 74)`
  (attendu vers 674 : 9 s de détection), `OK alerte d'immobilité dans l'appli`, `OK « Reprendre » de la notification : l'enregistrement repart`.
- Principal (job 119472879813) : tout vert sauf deux contrôles de MON test — km du direct lus deux fois (0,4 puis 0,5) et un plancher
  de 250 points ; console à cadence fixe ouverte, mais 243 points en 316 s et 31 L/100 : la puce simulée rééchantillonne à sa
  propre seconde. Le fournisseur de test (immobile : 8,9 L/100 sur 1,2 km) est pris pour les deux scénarios (fe0f9e7).

## Run final 39675522721 (fe0f9e7) — tout vert, captures livrées

- Jobs : apk 119484241916 (success), principal 119486392626 (success, 28/28 OK), immobile 119486392616 (success, 9/9 OK).
  Artefacts : `plein-et-trajet-apk` 12382441943, `captures-m6-principal` 12382438659, `captures-m6-immobile` 12382509539 ;
  verdicts, mesures, notifications et journaux recopiés dans `tests/e2e/exploration/m6-preuves-ci/`.
- Chiffres principaux : écran éteint + Maps 318 s, 307 points, plus grand trou 1,917 s, 7,19 km comptés / 7,21 km rejoués ;
  notification 116 km/h · 8,7 km · 2,03 € → 105 km/h · 9,1 km · 2,42 € à 10 s ; pause 30 s : 9,2 → 9,2 km ;
  **écart notification / fin : km 0,03 % (9,7 vs 9,703), litres 0,12 % (1,280 vs 1,278)** ; tué puis rouvert : 41 points → 50, même
  trajet ; fin de trajet 13,2 L/100 (fournisseur de test, positions remises telles quelles).
- Immobile : GPS perdu (appli + notification « Trajet en cours · GPS perdu »), 8,244 km = 8,244 km rejoués à travers le trou ;
  « Immobile depuis 10 min : c'est fini ? » + Reprendre / C'est fini à la seconde 681 (immobile depuis 74), écran éteint.
- Les 39 PNG regardés un par un. `V-3.2-A12-reveil.png` écarté : noir (l'écran n'était pas encore rallumé 2 s après WAKEUP).
  `V-3.2-A11-ecran-eteint.png` est noir à dessein (preuve : `mWakefulness=Asleep` dans le journal du job).
- APK publié : https://projets.ingevision.cloud/plein-et-trajet/plein-et-trajet.apk — `200 4433473 application/octet-stream`,
  sha256 `6646959d16b73b14001506488a1062adc78bac6fd838f412623470da758100bb` = artefact du run 39675522721.

## API Contract Check

| Appel touché (FE) | Côté natif / serveur (BE) | Statut |
|---|---|---|
| src/lib/notifTrajet.ts:69 `NotifTrajet.maj({titre, texte, enPause, immobile, reprendre, cestFini, pause, arreter})` | android/…/NotifTrajet.java:82-96 `maj` lit les mêmes 8 clés | OK (notification lue au run final : titres et libellés conformes) |
| src/lib/notifTrajet.ts:58 `NotifTrajet.effacer()` | NotifTrajet.java:120 `effacer` | OK (`notification effacée après Arrêter`) |
| src/lib/notifTrajet.ts:72 `addListener("action")` attend `pause` / `reprendre` / `reprendre-immobile` / `arreter` | NotifTrajet.java:67 `notifyListeners("action", {action})` ; diffusions 2/4, ouvertures 3/5 | OK (Pause, Reprendre, Reprendre-immobile, Arrêter touchés dans le volet) |
| src/lib/enregistreur-web.ts:77 `requestPermissions({permissions:["location","notification"]})` | @capgo BackgroundGeolocation.java:229 | OK (dialogue notifications natif) |
| src/lib/enregistreur-web.ts:80 `start({backgroundTitle, backgroundMessage, requestPermissions, stale, distanceFilter}, cb)` ; cb lit `latitude, longitude, altitude, speed, accuracy, time` | BackgroundGeolocation.java:85 `start` ; :753-770 `formatLocation` (speed null si absente, time) | OK |
| src/lib/enregistreur-web.ts:109 `BackgroundGeolocation.stop()` | BackgroundGeolocation.java `stop` | OK |
| src/lib/nommer.ts:7 `functions.invoke("lieux", {action:"nommer", lat, lon})` | supabase/functions/lieux/index.ts:79 | OK (titres « ALBI → FLORENTIN », « BRENS → PARISOT ») |
| src/lib/eea.ts:11 `functions/v1/voiture-eea` (voiture du test) | supabase/functions/voiture-eea | OK (Renault Clio 5RBU0C) |

## Round 2 — corrections de l'audit r1 (bâtisseur r2, 21/10)

### 22:25Z — diagnostic et choix
- HIGH 1 (litres gonflés) : reproduit en test unitaire (tests/unit/m6-datation.test.ts) — 1 200 positions d'autoroute du GPX, une rafale toutes les 120 (10,5 s de silence, relevé en retard, courant 1,9 s plus tard), datées à la réception : **+229 % de litres** avec le roule.ts du round 1. Correctifs : (a) l'appli Android date chaque point par l'heure du relevé, écrite par le service natif ; (b) roule.ts retire un relevé mal daté (pas > 250 km/h que son retrait rend possible) et borne l'accélération d'un pas à 4 m/s². Même test : **−0,09 %** ; datées au relevé : ±2 %. Suite complète 271/271.
- HIGH 2 (points écrits par la page) : cherché d'abord si @capgo/background-geolocation sait garder les points : son mode `url` rend START_STICKY mais POSTe chaque relevé vers un serveur, sans rien garder sur le téléphone (BackgroundGeolocationService.java:99-155, LocationStore.java:769) — inutilisable sans réseau. Écrit le service prévu au plan : TrajetService.java (journal texte des relevés, START_STICKY) + plugin TrajetEnRoute.java ; @capgo retiré.
- Risque vérifié avant d'écrire : un service `location` relancé par le système garde-t-il l'accès à la position sans ACCESS_BACKGROUND_LOCATION ? Doc Android (« restrictions-bg-start ») muette sur la relance ; lu dans AOSP android14-release `ActiveServices.java` : `resetFgsRestrictionLocked` n'est appelé qu'aux lignes 2245 (délai de startForeground), 2512 (stopForeground) et 5701 (arrêt du service) — pas dans `killServicesLocked` (mort du processus) ; `setFgsRestrictionLocked` ne retire jamais un droit accordé. À constater à l'émulateur.
- HIGH 3 : proposition de batterie au premier Démarrer (Trajet.tsx, textes.ts), dialogue système direct.
- MEDIUM 4 : scénarios joués sur l'APK de release ; MEDIUM 5 : direct natif réel (service seul) mesuré contre le direct de la page.

### 22:25Z — run 39685929207 (6369587), job apk 119519840357 : vert
- apksigner OK, empreinte b3a3…4c25 = magasin de clés ; aapt2 : REQUEST_IGNORE_BATTERY_OPTIMIZATIONS présente, `cloud.ingevision.pleinettrajet.TrajetService foregroundServiceType=0x00000008` seul service de localisation (le service @capgo a disparu du manifeste fusionné), ACCESS_BACKGROUND_LOCATION absente.

### 22:40Z — run 39685929207 (6369587) : jobs émulateur perdus, cause trouvée
- Job immobile 119520887807 : `adb root` OK (`uid=0(root)`), dialogue de batterie OK (« Let app always run in background? » → Allow, `deviceidle whitelist` contient l'appli) ; mais `cmd location providers add-test-provider gps` échoue en root (uid 0 n'est pas l'appli de position fictive autorisée) : aucune position de test, « GPS perdu » jamais vu. Correctif 31a9fa3 : commandes de position sous `su 2000`. Run annulé (principal sans positions), essai relancé sur une branche (39687638983) pour ne pas bloquer main.

### 22:58Z — run d'essai 39687638983 (31a9fa3, branche r2-essai) : fini et immobile verts, principal 2 KO
- **HIGH 2 constaté** : SIGKILL du processus 13231 (root) → `Scheduling restart of crashed service …TrajetService in 1000ms for start-requested` → processus 14474 relancé **1,029 s** après, `TrajetService: relancé par le système`, `GPS écouté` ; `dumpsys` : `isForeground=true types=00000008 stopIfKilled=false restartCount=1`. Appli laissée morte 74,6 s, Maps devant : **67 relevés écrits par le service**, trou 2,05 s ; à la réouverture, 67 / 67 dans la page, 48 points d'avant intacts. Notification calculée par le service seul : 2,9 km · 0,83 € → 4,2 km · 1,19 €.
- KO 1 : € du direct natif 1,19 contre 1,06 pour la page (+12 %) — l'extrapolation par les litres/km du trajet jusque-là emportait l'accélération du départ.
- KO 2 : trajet 1 8,58 L/100, trajet 2 11,6. Dans le journal : trou de 8,1 s puis pas à 625 km/h au lancement de Maps — l'émulateur retarde puis enchaîne les commandes `set-test-provider-location`, que LocationManager date à leur exécution (`LocationShellCommand.java:320-321`, AOSP android14) et filtre à 1 s.
- Écran éteint : 312 relevés en 324 s, plus grand trou 8,09 s mesuré depuis le dernier point d'avant l'extinction (LOW 6). Maps : bouton « SKIP » touché, la carte s'affiche (LOW 10). « C'est fini » depuis la notification : fin = 1792622765091 = début de l'immobilité, durée 74 s (attendu 73,98 s) (LOW 8).

### 23:25Z — run 39690690299 (3fad9cc) : principal 3 KO, fini vert, immobile perdu à l'ouverture
- Positions de test avec `--time` (cadence fixe 1 s) et service datant par `getTime()` : dans le journal, tous les pas font 1,000 s sauf 9 trous de 2 à 4 s au lancement de Maps (positions filtrées, bien datées).
- **Trajet 1 : 6,40 L/100 contre 6,41 pour roule.ts sur le même tronçon du GPX aux heures du GPX (−0,2 %)** — 13,2 L/100 au round 1.
- Trajet 2 : 8,16 contre 6,65 (+22,7 %) ; roule.ts sur le journal seul redonne 8,16 : l'écart est dans le tracé, pas dans la page — les pas 9 à 13 montent de 28,8 à 100,8 km/h : la voiture tenue sur place pendant l'attente du Démarrer puis lâchée à 105 km/h (artefact du test, 0,063 L = ½·m·v²). Correctif : trajet 2 démarré en roulant.
- € du direct natif 0,68 contre 0,74 (−8 %) : sur la fenêtre appli morte, roule.ts compte 0,1372 L, la table par tranches de 10 km/h 0,1080 — 104,9 km/h tombait dans la case de 100 (phase haute 5,22 L/100 au lieu de très haute 6,57). Correctif : table au km/h.
- Job immobile 119537105303 : appli tuée à l'ouverture par le système (`Killing …pleinettrajet (adj 0): depends on provider …FontsProvider in dying proc com.google.android.gms.persistent`) — reprise ajoutée à l'ouverture (3 essais).

### 23:50Z — run 39693288066 (15784cd) : immobile et fini verts, principal 1 KO
- Direct natif contre direct de la page, GPS figé : **km 4,4 / 4,5 (2,22 %), € 0,68 / 0,69 (1,45 %)** — table au km/h.
- Trajet 1 −0,3 % de roule.ts sur le GPX ; trajet 2 +8,3 %. roule.ts sur le seul journal du service redonne **6,64 L/100 pour 6,65** : l'écart vient du point de départ pris à part par la page (\`getCurrentPosition\` de la WebView, fournisseur « fused », daté à la réception). Correctif 4c5299e : sur Android, tous les points viennent du service.

### 00:16Z — run 39696043200 (46709c1) : 4 jobs verts, 47 constats OK
- Consommation : **trajet 1 6,39 L/100 (roule.ts sur le GPX : 6,41, −0,3 %), trajet 2 6,64 (6,65, −0,2 %) ; trajet 1 / trajet 2 : 3,8 %**.
- Mais 5 captures du job immobile (A21, A22, A24, A25, A26) masquées par « Pixel Launcher isn't responding » (émulateur lent) : regardées une à une, non conformes. Correctif ae5ed58 : le dialogue est fermé (Attendre) avant chaque capture ; run 7 = run final.

## API Contract Check — round 2 (page ↔ service natif)

| Appel touché (FE) | Côté natif (BE) | Statut |
|---|---|---|
| src/lib/enregistreur-web.ts:161 `TrajetEnRoute.demanderPermissions()` | TrajetEnRoute.java:72 alias `localisation` (FINE, COARSE), `notifications` (POST_NOTIFICATIONS) ; rend `{localisation}` (:86) | OK (dialogue notifications natif, run final) |
| src/lib/enregistreur-web.ts:163 `demarrer({id, contenu})` | TrajetEnRoute.java:92 → `startForegroundService` intent DEMARRER, extras `id`, `contenu` (JSON) ; TrajetService.onStartCommand : même id = journal gardé, autre id = journal neuf | OK (logcat : `Background started FGS: Allowed … uidState: TOP`, `GPS écouté`) |
| src/lib/enregistreur-web.ts:167 `lire()` → `{texte, id, actif, contenu}` ; :169 relu seulement si `id` = trajet de la page | TrajetEnRoute.java:114-119 (mêmes 4 clés) ; TrajetService.lire | OK (réouverture : 68 relevés de la fenêtre dans la page / 68 dans le journal) |
| src/lib/enregistreur-web.ts:85 `lireJournal` : `P;t;lat;lon;alt;kmh;précision`, `A;t;action`, `R;…` ignoré | TrajetService.java:215 (P), :241-256 (A), onStartCommand (R) | OK (test unitaire m6-datation + journal lu en CI) |
| src/lib/enregistreur-web.ts:151 `addListener("releve", {ligne})` | TrajetEnRoute.java:37 `notifyListeners("releve", {ligne})`, appelé par TrajetService.java:221 et :256 | OK (direct à 1 Hz, km notification = fin à 0,17 %) |
| src/lib/enregistreur-web.ts:117-119 actions `pause` / `reprendre` / `reprendre-immobile` | TrajetService.java:360 `PendingIntent.getService` BOUTON, actions 2/4 ; `bouton()` écrit `A;…` | OK (Pause, Reprendre, Reprendre immobile touchés dans le volet) |
| src/lib/notifTrajet.ts:66 `maj(ContenuNotification)` : titre, texte, enPause, immobile, 4 libellés, titreEnCours, titrePause, gabarit, km, euros, prix, l100ParVitesse (201), tPoint | TrajetEnRoute.java:125 garde le JSON ; TrajetService.construire (:370) lit titre, texte, enPause, immobile, reprendre, cestFini, pause, arreter ; direct natif lit gabarit, km, euros, prix, l100ParVitesse, tPoint, titreEnCours, titrePause | OK (notification lue : titres et libellés de textes.ts ; direct natif à 2,3 % / 1,6 %) |
| src/lib/notifTrajet.ts:70 `addListener("action")` : `arreter` | TrajetEnRoute.java:68 `notifyListeners("action", …, true)` sur l'intent d'ouverture (Arrêter, C'est fini) | OK (Arrêter et C'est fini depuis la notification → fin de trajet) |
| src/lib/enregistreur-web.ts:190 `arreter()` | TrajetEnRoute.java:107 → TrajetService.arreter : préférences et journal effacés, service arrêté, notification retirée | OK (`notification effacée après Arrêter`) |
| src/routes/Trajet.tsx:20 `batterie()` → `{horsOptimisation}` ; :50 `proposerBatterie()` | TrajetEnRoute.java:138, :145 (ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, repli ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS) | OK (dialogue système, `deviceidle whitelist` contient l'appli) |

### 00:41Z — run 39698800403 (ae5ed58) : 1 KO de mesure, puis 01:08Z — run final 39701223352 (f2cdab1) : 4 jobs verts
- Run 39698800403 (runner saturé : un dialogue « ne répond pas » fermé toutes les ~10 s) : seul KO « distance écran éteint » 7,86 km comptés / 8,19 rejoués — le trou de 14 s du lancement de Maps était à cheval sur l'extinction et sa distance (que l'appli compte) manquait à la mesure ; même règle que LOW 6 appliquée à `kmPoints` (f2cdab1).
- **Run final 39701223352** (apk 119571005243, principal 119572297696, immobile 119572297727, fini 119572297839 ; artefacts `plein-et-trajet-apk` 12393575320, `captures-m6-principal` 12393434741, `captures-m6-immobile` 12393963089, `captures-m6-fini` 12393642970) : **45 constats OK, 0 KO** (37 + 6 + 2), APK de release partout, aucun dialogue « ne répond pas » rencontré.
- Écran éteint + Maps 341 s : 310 relevés écrits par le service, plus grand trou 12 s (depuis le dernier point d'avant), 7,99 km comptés / 8,07 rejoués.
- Appli tuée (SIGKILL, root) et laissée morte 74,6 s, Maps devant : processus relancé par le système en 1,23 s, service en 1,03 s ; **trou 1 s** ; 62 relevés écrits sans la page, 62 relus par la page ; notification calculée par le service : 3,3 km · 0,46 € → 4,5 km · 0,63 €.
- **Direct natif / direct de la page** (GPS figé) : km 4,5 / 4,5 (0 %), € 0,63 / 0,64 (1,56 %). Direct de la page / fin de trajet : km 0,11 %, litres 0,11 %.
- **Consommation : trajet 1 6,43 L/100 (roule.ts sur le GPX : 6,45, −0,3 %), trajet 2 6,62 (6,63, −0,2 %) ; trajet 1 / trajet 2 : 2,9 %** (round 1 : 13,2 contre 7,1).
- « C'est fini » depuis la notification : fin = début de l'immobilité (1792630408624), durée 75 s pour 74,9 attendues.
- 43 captures téléchargées et regardées une à une, md5 tous distincts ; livrées sous leur nom (`V-3.2-A11` noire à dessein ; `V-3.2-04-apres` montre « GPS perdu » parce que le test fige le GPS 17 s pour mesurer le direct natif).
- APK publié : https://projets.ingevision.cloud/plein-et-trajet/plein-et-trajet.apk — `200 3558256 application/octet-stream`, sha256 `868e7404497cb9bb068fefbce5849b8be30bdcb8d18c8d54cb8f9dc77edb400a` = artefact 12393575320 ; version précédente gardée seule (`plein-et-trajet-precedent.apk`, 6646959d…00bb).
- Web : m5-explore + m5-regression sur la prod (bundle index-Dbs85Leg.js = 46709c1, Vercel READY), une passe sous `lourd` : **71 passed, 2 failed** — `voitureEea` de l'aide de test reçoit une page HTML de la fonction `voiture-eea` (V-4.6) et la recherche « clio 2017 120 » dépasse 60 s (V-2.3) ; rejoués seuls : **2 passed**. Première passe (22:36Z, 6369587) : 71 + 2 `voiture-eea 502 base_injoignable`, rejoués : 2 passed. Vitest 272/272 ; `tsc --noEmit` 0 ; `vite build` OK.

## Round 3 — deux horloges (audit r2, problème 1 reclassé HIGH), bâtisseur r3, 22/10

### 01:45Z — diagnostic et choix
- Relu : TrajetService.java r2 :213-214 (relevé `P;t`, t = `getTime()` GNSS), :243 (bouton `A;System.currentTimeMillis()`), :284 (`rattraper` : bouton compté si t > tPoint) ; enregistreur-web.ts r2 :113/:120 (curseur `lu` = heure de la dernière ligne) ; notifTrajet.ts :66 → TrajetEnRoute.maj (écrase `enPause`).
- **Choix : les deux.** (1) L'ORDRE = numéro de la ligne dans le journal (seul ordre qui ne dépend d'aucune horloge ; la page et `rattraper` n'appliquent une ligne qu'une fois, par lui). (2) Le bouton est daté sur l'horloge des relevés (heure du téléphone + écart GNSS du dernier relevé, jamais avant lui), pour que l'heure d'une pause reste comparable à celle des points : un relevé mesuré avant la pause compte même s'il est écrit après le bouton, un relevé de la pause écrit après la reprise ne compte pas.
- `maj` ne peut plus écraser un bouton que la page n'a pas appliqué : la page envoie `ligne` (sa dernière ligne appliquée), le service garde `ligneBouton` ; si `ligne < ligneBouton`, pause / immobile / titre restent ceux du service (TrajetService.fusionnerPage).
- LOW 2 : `pt_inspecter` ne vaut plus que pour le processus, et seulement si `Build.TYPE` n'est pas `user` (téléphone du commerce = `user` ; l'émulateur google_apis de la CI accepte `adb root`, donc système de développement). Le réglage gardé du round 2 est effacé. Recherche faite : la piste « propriété système `debug.*` posée par adb » est écartée — la sepolicy android14 (`private/app.te`) ne donne pas `get_prop(appdomain, debug_prop)`.

### 01:49Z — tests unitaires rouges sur le code du round 2, puis verts
- Vitest `tests/unit/m6-horloges.test.ts` (8 tests) sur la sémantique r2 extraite telle quelle (`appliquerEntree`, curseur `lu`) : **3 rouges** — « Pause datée avant le dernier relevé (téléphone en retard 1,5 s) », « relevé écrit après le bouton », « relecture à la réouverture, téléphone en retard, boutons datés comme au r2 » (sortie : m6-preuves-ci/r3/vitest-horloges-rouge-r2.txt). Après correction : **8/8**. Les tests « téléphone en avance » et « reprise » passaient déjà côté page : ce sens se corrige côté service (datation du bouton).
- JUnit `android/app/src/test/…/JournalTrajetTest.java` (5 tests, JDK 21 portable au VPS, puis job apk `testReleaseUnitTest`) contre un portage fidèle du r2 (bouton = `currentTimeMillis`, `rattraper` r2 :268-294) : **3 rouges** (bouton daté 1 200 ms AVANT le dernier relevé si le téléphone retarde ; 800 ms APRÈS le relevé suivant s'il avance ; `rattraper` : pause ignorée) ; r3 : **5/5** (m6-preuves-ci/r3/junit-journal-*.txt).
- Vitest complet 22 fichiers **280/280** ; `tsc --noEmit` 0 ; `vite build` OK (sous `lourd`).

### Scénario émulateur « horloge » (tests/android/m6-emulateur.mjs)
- Positions du fournisseur de test datées `--time` = horloge de l'émulateur **+1 500 ms** (téléphone 1,5 s en retard sur le GNSS), puis un second trajet à **−1 500 ms** (en avance). Chaque fois : 40 s de route, appli derrière (Accueil), Pause dans le volet, 24 s de pause relue toutes les 4 s (uiautomator : « Trajet en pause » dans le volet ; dumpsys : km), Reprendre, 12 s, puis contrôle « aucun relevé mesuré après la reprise absent de la page, aucun point dans la pause ». Captures `V-3.3-A36-pause-horloge-decalee`, `V-3.3-A37-pause-horloge-avance`.
- Run « rouge » 39707523582 : branche `r3-horloge-rouge` = code du round 2 + ce scénario seul (pour montrer qu'il révèle le défaut).

### 02:05Z → 02:44Z — runs émulateur du scénario « horloge »
- **39707523582** (branche r3-horloge-rouge = code r2 + scénario) : la Pause a TENU — faux négatif du scénario. **39708922771** (même code, journal du service versé aux pièces) : cause trouvée — autour du toucher, les `uiautomator dump` retardent la livraison des positions de test de 3 à 6 s (journal : `P;…942033` puis `A;…945166;pause` puis `P;…943033` puis `P;…949033`) ; le dernier relevé livré avait donc 3 s au moment du toucher, plus que le décalage de 1,5 s, et le bouton (heure du téléphone) passait après lui. Sur un téléphone, un relevé GNSS arrive en moins d'une seconde. Correction du scénario : bouton localisé par un dump, puis touché sans dump dès que le dernier relevé écrit a moins de 1,1 s. Le « 1 relevé absent » de ces runs était une course du test (journal relu après l'état de la page, relevé écrit entre les deux) : journal relu d'abord.
- **39710465105** (code r2, scénario corrigé) : **défaut reproduit**. Téléphone en retard : Pause touchée (dernier relevé âgé de −665 ms à l'horloge des relevés), la notification revient à « Trajet en cours » dès +6 s, km 0,8 → 0,9 → 1,0 → 1,2 pendant la « pause » (page : aucune pause). Téléphone en avance : la Pause tient mais **1 relevé d'après la reprise jeté** par la page.
- **39710484157** (r3, c972c65^^) : **5 jobs verts** — horloge 6/6 : retard → « Trajet en pause » dans le volet à +6, +12, +18, +27 s, km figés 0,8, Reprendre → 1,0 km, 13 relevés après la reprise tous gardés, 0 point dans la pause ; avance → 1,1 km figés jusqu'à +27 s, Reprendre → 1,4 km, 13/13 gardés. Principal, immobile, fini verts (dont le nouveau constat LOW 4 « réouverture, GPS revenu : km qui avancent »). Le décalage réellement joué n'était connu qu'à ~1 s près (un aller-retour adb) : mesure refaite au milieu du plus court de 7 allers-retours, et le service écrit au logcat l'écart GNSS avec lequel il date chaque bouton (run final jamais lancé : voir l'entrée 02:45Z).
- **39708165229** (r3, premier passage) : immobile perdu — « Allow » du dialogue de batterie mangé par un dialogue « ne répond pas » (capture echec-immobile : dialogue resté ouvert) ; le scénario retouche désormais tant que le dialogue est là.

## API Contract Check — round 3 (ce qui change entre la page et le service natif)

| Appel touché (FE) | Côté natif (BE) | Statut |
|---|---|---|
| src/lib/enregistreur-web.ts:187 `addListener("releve", {ligne, n})` ; `lireJournal(ligne, n)` | TrajetEnRoute.java:34-39 `notifyListeners("releve", {ligne, n})` ; `n` = numéro rendu par TrajetService.ecrire (1 = première ligne), compté à la relance par JournalTrajet.rattraper | OK (run final : page `ligne` = dernier numéro du journal) |
| src/lib/enregistreur-web.ts `lireJournal(texte)` (relecture) : lignes non vides numérotées depuis 1 | TrajetService.ecrire : une ligne non vide par `write` ; JournalTrajet.rattraper compte de la même façon | OK (tests m6-horloges + JournalTrajetTest) |
| src/lib/notifTrajet.ts:44 `maj` : champ **`ligne`** (dernière ligne appliquée par la page) remplace **`tPoint`** (retiré) | TrajetEnRoute.maj → TrajetService.fusionnerPage (`ligne` < `ligneBouton` → pause/immobile/titre du service gardés) ; `rattraper` rejoue les lignes > `ligne` | OK (run final, job horloge : titre « Trajet en pause » tenu) |
| Ligne `A;instant;action` : instant = heure du téléphone + écart GNSS du dernier relevé, ≥ dernier relevé + 1 ms | TrajetService.bouton → JournalTrajet.heureBouton ; logcat `bouton … daté … (écart GNSS … ms …)` | OK |
| Format des lignes P / A / R | inchangé | OK |

### 02:45Z — run final impossible : facturation GitHub
- 39713016630 (main, c972c65) et 39713016742 (branche rouge) : jobs `apk` en échec en 2 s, sans étape ; annotation : « The job was not started because recent account payments have failed or your spending limit needs to be increased » (m6-preuves-ci/r3/blocage-facturation-39713016630.txt). Le run de référence reste **39710484157** (71f19b3, 52/52). La ligne de log Java de c972c65 (jamais construite) est retirée : le code de l'appli au HEAD = celui de l'APK publié.
- Décalage réellement joué au run 39710484157, en bornes : au toucher de Pause, dernier relevé daté 915 ms (retard) / 940 ms (avance) au-delà de « heure du téléphone + décalage visé » → effectif ≥ +2,4 s en retard ; en avance, entre −0,56 s et +0,5 s (peut-être aucun : sens prouvé en unitaire seulement, rectifié post-audit r3). Run rouge 39710465105 : 665 / 581 ms → ≥ +2,2 s / ≥ −0,9 s, et le relevé jeté après la reprise prouve un décalage négatif.
- 45 captures du run 39710484157 regardées une à une ; `V-1.3-A01` et `V-3.2-A10` masquées par « Pixel Launcher isn't responding » → versions du round 2 gardées. APK publié : `200 3559936`, sha256 95f2e58a…acf8 = artefact 12397675178, précédente (868e7404…) seule gardée.
