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
