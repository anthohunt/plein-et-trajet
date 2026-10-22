# Jalon 6 — Appli Android : plan de cas d'usage

**Démonstration** : Je télécharge l'APK signé publié par GitHub Actions (release du dépôt anthohunt/plein-et-trajet), je l'installe sur un Android 14 (émulateur au build, téléphone d'Anthony ensuite), j'enregistre ma voiture, je touche Démarrer, j'éteins l'écran et j'ouvre Google Maps : le trajet GPS rejoué continue d'être compté ; la notification permanente montre vitesse, km et € et ses boutons Pause / Reprendre / Arrêter pilotent l'enregistrement sans ouvrir l'appli ; Arrêter ouvre la fin de trajet. La version web reste en ligne, même code.

**Écrans possédés** : aucun (même appli que le jalon 5, emballée) · traversés : T1 Trajet, T3 En route, T4 Fin de trajet

## Comment c'est vérifié sans téléphone

Le VPS n'a ni SDK Android ni la mémoire pour un émulateur : **toute la vérification Android tourne dans GitHub Actions**, sur le dépôt `anthohunt/plein-et-trajet`, et ses preuves reviennent en artefacts que l'agent télécharge (`gh run download`) et regarde.

1. **Build** (`.github/workflows/android.yml`, job `apk`) : `npm ci && npm run build && npx cap sync android`, puis `./gradlew assembleRelease` (JDK 21 Temurin, SDK 36) signé par le keystore décodé depuis le secret `ANDROID_KEYSTORE_B64`. Contrôles : `apksigner verify --print-certs` (empreinte SHA-256 égale à celle notée dans `docs/pipeline/m6-journal.md`) ; `aapt2 dump xmltree … AndroidManifest.xml` contient `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_LOCATION`, `ACCESS_FINE_LOCATION`, `POST_NOTIFICATIONS`, le service `TrajetService` avec `foregroundServiceType="location"`, et **pas** `ACCESS_BACKGROUND_LOCATION`.
2. **Tests d'instrumentation sur émulateur** (job `emulateur`, `reactivecircus/android-emulator-runner`, image `system-images;android-34;google_apis;x86_64`, KVM du runner Linux) :
   - l'APK de release est installé (`adb install`) ; permissions accordées par `adb shell pm grant` (localisation précise, notifications) — le dialogue d'autorisation lui-même est testé une fois par UiAutomator ;
   - le tracé `tests/e2e/fixtures/albi-toulouse.gpx` est rejoué comme position fictive : `adb shell appops set <paquet> android:mock_location allow` + fournisseur de test `LocationManager.addTestProvider(GPS_PROVIDER)` piloté par le test, 1 point/s ;
   - **UiAutomator** (`androidTest/…/TrajetEnFondTest.kt`) : toucher Démarrer, `device.sleep()` (écran éteint) puis `am start` de l'appli Google Maps (ou, si l'image n'a pas Maps, de l'appli Paramètres) pendant 5 min de tracé, `device.wakeUp()` ; lire les points écrits par le service (base SQLite de l'appli via `run-as`) : aucun trou > 15 s ; `device.openNotification()`, trouver « Plein & Trajet », lire vitesse/km/€ deux fois à 10 s d'écart (valeurs qui changent), toucher « Pause » (le texte passe à « En pause », les km ne bougent plus pendant 30 s de tracé), « Reprendre », puis « Arrêter » (l'activité passe au premier plan sur la fin de trajet) ;
   - **arrêt du processus** : `adb shell am kill` de l'activité pendant un trajet, puis réouverture : le trajet en cours est repris avec tous ses points ;
   - captures `adb exec-out screencap -p` à chaque pas, publiées en artefact `captures-m6` et recopiées dans `tests/e2e/screenshots/m6/` ; `adb logcat` complet en artefact.
3. **Écart chiffré natif / web** : sur le même tracé, les km et les litres affichés dans la notification (calcul natif du direct) et ceux de la fin de trajet (module partagé `roule.ts`) diffèrent de moins de 3 % (km) et 5 % (litres).
4. **La version web reste en ligne** : `m5-use-case.md` est rejoué sur https://plein-et-trajet.vercel.app après la livraison du jalon 6 (même code).

## Ce qui restera à constater par Anthony sur son téléphone

L'émulateur ne reproduit ni l'économie de batterie agressive des surcouches (OxygenOS), ni le vrai GPS, ni Waze. À constater par Anthony sur son OnePlus, sur un vrai trajet, avec la liste ci-dessous (reprise dans le rapport de livraison du jalon) :
- l'APK s'installe depuis le lien de la release (autoriser « sources inconnues » une fois) ;
- l'appli demande la localisation et les notifications, puis propose de la sortir de l'optimisation de batterie (écran système) ;
- 30 min ou plus écran éteint avec Waze devant : la distance de fin de trajet correspond au compteur de la voiture (écart attendu < 2 %) ;
- la notification reste en place tout le trajet, ses boutons répondent, elle disparaît à l'arrêt ;
- un tunnel réel : « GPS perdu » puis distance complétée.

## V-3.2 — Écran éteint, Waze devant

En tant que conducteur guidé par Waze ou Google Maps, je laisse l'appli enregistrer en arrière-plan, écran éteint. (élément `ecran-eteint`)

1. Partir de : l'appli Android avec un trajet démarré (écran En route) — capture `V-3.2-01-avant.png`
2. Faire : j'éteins l'écran ou passe sur Waze ou Google Maps pendant 30 min ; constater : en revenant dans l'appli la distance couvre tout ce temps : aucun trou de plus de 15 s dans les points enregistrés hors perte de signal — capture `V-3.2-02-apres.png`
3. Partir de : l'appli Android tuée par le système pendant un trajet (écran En route) — capture `V-3.2-03-avant.png`
4. Faire : je la rouvre ; constater : le trajet en cours reprend avec tous ses points (enregistrés par le service Android, pas par la page) — capture `V-3.2-04-apres.png`
5. Partir de : la version web dans un navigateur (écran En route) — capture `V-3.2-05-avant.png`
6. Faire : un trajet est démarré ; constater : « Garde l'écran allumé : un navigateur arrête le GPS écran éteint. » et l'écran est gardé allumé par le verrou d'écran — capture `V-3.2-06-apres.png`

## V-3.3 — Piloter depuis la barre du téléphone

En tant que conducteur, je pilote l'enregistrement depuis la barre du téléphone sans ouvrir l'appli. (élément `notification`)

1. Partir de : un trajet en cours sur Android (écran En route) — capture `V-3.3-01-avant.png`
2. Faire : je descends la barre du téléphone ; constater : une notification permanente « Plein & Trajet » montre vitesse, km et € essence, mis à jour au moins toutes les 5 s, avec les boutons « Pause » et « Arrêter » — capture `V-3.3-02-apres.png`
3. Partir de : cette notification (écran En route) — capture `V-3.3-03-avant.png`
4. Faire : je touche « Pause » ; constater : l'enregistrement passe en pause sans ouvrir l'appli et le bouton devient « Reprendre » ; « Reprendre » le relance — capture `V-3.3-04-apres.png`
5. Partir de : cette notification (écran En route) — capture `V-3.3-05-avant.png`
6. Faire : je touche « Arrêter » ; constater : l'enregistrement s'arrête et l'appli s'ouvre sur la fin de trajet — capture `V-3.3-06-apres.png`

## Histoires du jalon 5 rejouées sur Android (émulateur)

V-1.3 (Démarrer, dialogue de localisation natif), V-3.1 (direct dans l'appli), V-3.4 (Pause dans l'appli puis dans la notification), V-3.5 (Arrêter), V-3.E1 (immobile 10 min : la notification passe à « Immobile depuis 10 min » avec « C'est fini » / « Reprendre »), V-3.E2 (trou de 90 s du tracé dérivé), V-4.7 (Enregistrer puis rouvrir l'appli : le trajet est dans l'historique), V-5.1 (passer dans Stations pendant l'enregistrement : la distance continue).

## Captures de rejeu

Prises de vue réelles : `adb exec-out screencap -p` dans GitHub Actions, **run 39710484157 (commit 71f19b3, round 3), APK de
RELEASE signé** (sha256 95f2e58a…acf8, celui qui est publié), artefacts `captures-m6-principal`, `captures-m6-immobile`,
`captures-m6-fini` et `captures-m6-horloge` ; sauf `V-1.3-A01` et `V-3.2-A10`, gardées du run 39701223352 (round 2) : au round 3
elles sont masquées par le dialogue « Pixel Launcher isn't responding » de l'émulateur, et leur écran (premier lancement, Google
Maps) ne dépend pas du code changé. V-3.2-05/06 par Playwright sur la prod (round 1, écran web inchangé). Brutes dans `tests/e2e/screenshots/m6/`, livrées dans `tests/e2e/delivery/`.

- `V-1.3-A01-apk-release.png` — APK de RELEASE signé installé et ouvert (écran Trajet, pas encore de voiture)
- `V-1.3-A02-dialogue-localisation.png` — dialogue natif « Allow Plein & Trajet to access this device’s location? » (à l'ouverture de l'appli)
- `V-1.3-A03-accueil.png` — écran Trajet après autorisation, voiture Renault Clio, Démarrer
- `V-1.3-A04-dialogue-notifications.png` — dialogue natif des notifications au premier Démarrer (après la proposition de batterie)
- `V-3.1-A05-direct.png` — En route : vitesse, km, litres, € en direct après 30 s
- `V-3.2-A10-maps-devant.png` — Google Maps au premier plan, carte affichée (écran de connexion passé par « Skip »)
- `V-3.2-A11-ecran-eteint.png` — écran éteint (noir ; mWakefulness=Asleep au journal du job)
- `V-3.2-A12-reveil.png` — écran rallumé après 5 min : Maps toujours devant
- `V-3.2-04-apres.png` — appli rouverte après 74,8 s morte, GPS revenu : 105 km/h, 4,7 km, plus de « GPS perdu » (round 3, prise après le dégel)
- `V-3.2-A17-appli-tuee.png` — processus de l'appli tué (SIGKILL) : Maps devant, l'appli n'est pas rouverte. La mort du processus ne se voit pas à l'écran (relancé par le système en moins de 1,3 s, sans fenêtre) : la preuve est au journal du job (PID avant / après, `Scheduling restart of crashed service`)
- `V-3.2-A31-batterie-appli.png` — premier Démarrer : « Garder le trajet compté écran éteint », explication, Plus tard / Autoriser
- `V-3.2-A32-batterie-systeme.png` — dialogue système « Let app always run in background? » (Deny / Allow)
- `V-3.2-A33-tuee-notif.png` — appli tuée depuis 25 s, jamais rouverte : la notification continue, chiffres calculés par le service seul
- `V-3.3-A14-reprise-notif.png` — volet : après « Reprendre », « Trajet en cours », km repartis
- `V-3.3-A36-pause-horloge-decalee.png` — job « horloge », relevés datés en avance sur l'horloge du téléphone (téléphone en retard) : Pause touchée dans le volet, 15 s plus tard toujours « Trajet en pause », 0,8 km figés, bouton « Reprendre »
- `V-3.3-A37-pause-horloge-avance.png` — job « horloge », relevés datés en retard sur l'horloge du téléphone (téléphone en avance) : « Trajet en pause », 1,1 km figés
- `V-3.4-A06-pause-appli.png` — Pause touchée dans l'appli : « En pause », bouton « Reprendre »
- `V-3.4-A07-reprise-appli.png` — Reprendre dans l'appli : la distance repart
- `V-3.4-A13-pause-30s.png` — volet : 30 s de tracé plus tard, toujours « Trajet en pause », km figés
- `V-3.5-A18-fin-appli.png` — Arrêter dans l'appli : fin du trajet 2 (celui de l'appli tuée), L/100 du même ordre que le trajet 1
- `V-3.E1-A26-en-route.png` — immobile : En route avant l'arrêt
- `V-3.E1-A27-immobile-appli.png` — immobile : « Trajet arrêté : immobile depuis 10 min » avec Reprendre / C'est fini
- `V-3.E1-A28-notif-immobile.png` — immobile : notification « Immobile depuis 10 min : c'est fini ? » avec Reprendre / C'est fini
- `V-3.E1-A29-reprise.png` — immobile : « Reprendre » touché dans la notification → « Trajet en cours »
- `V-3.E1-A30-fin.png` — immobile : fin de trajet après Arrêter
- `V-3.E1-A34-cest-fini-notif.png` — job « fini » : notification « Immobile depuis 10 min : c'est fini ? » avant « C'est fini »
- `V-3.E1-A35-fin-cest-fini.png` — job « fini » : « C'est fini » touché dans la notification → fin de trajet, durée arrêtée au début de l'immobilité
- `V-3.E2-A21-en-route.png` — tunnel : En route avant le trou
- `V-3.E2-A22-gps-perdu.png` — tunnel : « GPS perdu (tunnel) · la distance est complétée à la sortie »
- `V-3.E2-A23-notif-gps-perdu.png` — tunnel : notification « Trajet en cours · GPS perdu »
- `V-3.E2-A24-gps-retrouve.png` — tunnel : signal retrouvé, distance complétée
- `V-3.E2-A25-fin.png` — tunnel : fin de trajet 8,2 km (= tracé rejoué)
- `V-4.7-A15-historique.png` — Enregistrer : le trajet en tête de l'historique
- `V-4.7-A16-historique-rouvert.png` — appli arrêtée puis rouverte : le trajet est toujours dans l'historique
- `V-5.1-A08-stations.png` — Stations pendant l'enregistrement : bandeau « Trajet en cours · … € »
- `V-5.1-A09-retour-en-route.png` — retour sur Trajet : la distance a continué

## US-NEW-3 — Autorisations Android au premier trajet

En tant que conducteur sur Android, l'appli me demande ce dont elle a besoin pour enregistrer écran éteint. (captures de la CI du jalon 6, run 39710484157 ; non refaites : CI bloquée)

1. Faire : je touche « Démarrer » la première fois ; constater : le dialogue de localisation d'Android s'affiche — capture `V-1.3-A02-dialogue-localisation.png`
2. Faire : j'autorise ; constater : le dialogue des notifications s'affiche — capture `V-1.3-A04-dialogue-notifications.png`
3. Faire : j'autorise ; constater : l'appli demande la sortie de l'optimisation de batterie — capture `V-3.2-A31-batterie-appli.png`

## US-NEW-4 — Installer l'appli Android par un lien

En tant que conducteur, j'installe l'appli Android depuis un lien, hors Play Store. (capture de la CI du jalon 6, run 39701223352)

1. Faire : j'installe l'APK de release signé ; constater : l'appli « Plein & Trajet » est installée et s'ouvre — capture `V-1.3-A01-apk-release.png`
