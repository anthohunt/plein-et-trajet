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
6. Faire : un trajet est démarré ; constater : le texte dit que l'écran doit rester allumé et l'écran est gardé allumé par le verrou d'écran — capture `V-3.2-06-apres.png`

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
