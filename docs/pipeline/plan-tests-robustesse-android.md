# Plan de tests de robustesse — enregistrement en fond (Android)

Rédigé le 24/10/2026, après le constat d'Anthony : « l'appli a arrêté d'enregistrer, en fond, au bout de quelques minutes ».
APK concerné : commit `71f19b3` (service natif `TrajetService`, START_STICKY, demande de sortie de l'optimisation de batterie).

## Ce qu'on vise (critère de succès)

L'enregistrement est robuste quand, sur le téléphone d'Anthony (OnePlus Nord 3, OxygenOS), réglages laissés tels que l'appli les propose :
• **Aucun trou de plus de 5 s** dans les relevés sur 2 h écran éteint, Waze au premier plan (hors perte réelle du GPS, tunnel, signalée comme telle dans le journal).
• **Distance à moins de 2 %** du compteur de la voiture sur un vrai trajet.
• **Jamais d'arrêt silencieux** : si l'enregistrement s'arrête pour une raison qu'on ne peut pas empêcher (permission retirée, redémarrage, mise à jour), l'appli le dit (notification « Enregistrement interrompu ») et le trajet déjà enregistré n'est pas perdu.
• Chaque scénario ci-dessous passe **3 fois de suite**, pas une seule.

## Cause la plus probable (à confirmer au niveau 1)

Quand Android (ou l'économie de batterie d'OxygenOS) tue le processus en route, le système relance le service (START_STICKY,
intention nulle) **alors que l'appli est en arrière-plan**. `TrajetService.onStartCommand` rappelle alors `startForeground(… LOCATION)`.
Depuis Android 14, un service de premier plan de type localisation ne peut pas démarrer depuis l'arrière-plan sans la permission
« Toujours autoriser » (`ACCESS_BACKGROUND_LOCATION`), que l'appli ne demande pas, même si l'appli est sortie de l'optimisation de batterie.
`premierPlan()` échoue, le service fait `stopSelf()` : plus rien ne s'enregistre, sans aucun message.
L'émulateur ne l'a pas vu : la mort y était provoquée 20 s au plus, et la réouverture par la page (premier plan) masquait le chemin de relance.
Réf. : developer.android.com/about/versions/12/foreground-services (restrictions des services « while-in-use »).

## Niveau 0 — Préalables (sans quoi rien ne se prouve)

1. **Construire l'APK sans GitHub** : la CI est bloquée par la facturation. Monter le SDK Android sur le VPS (sous `lourd`) et un script
   `scripts/build-apk.sh` qui produit l'APK signé de release ; garder la CI en double quand la facturation sera réglée.
2. **Observatoire dans l'appli** (instrumentation avant tout correctif) — chaque événement écrit dans un journal technique à part
   (`files/diagnostic.txt`, horodaté) :
   • `onCreate`, `onStartCommand` (action, flags, intention nulle ou non), `startForeground` réussi / refusé avec l'exception exacte,
     `onDestroy`, `onTaskRemoved`, `onTimeout` ;
   • GPS : `onProviderDisabled/Enabled`, premier relevé après relance, intervalle max entre deux relevés ;
   • à chaque ouverture : `ActivityManager.getHistoricalProcessExitReasons()` — la raison exacte de chaque mort du processus
     (mémoire basse, tué par le système, gel, utilisateur, crash, ANR) ;
   • état au démarrage du trajet : optimisation de batterie, permission précise / approximative, « Toujours » ou « Pendant l'utilisation »,
     notifications autorisées, économiseur d'énergie, compartiment de veille (`UsageStatsManager.getAppStandbyBucket`).
   • Bouton caché « Exporter le diagnostic » (partage du fichier), pour récupérer un trajet raté sans câble.
3. **Rapport de robustesse par trajet** : à l'arrêt, l'appli calcule trou max, nombre de relances, morts du processus et leur raison ;
   gardé avec le trajet. Chaque vrai trajet devient un test.

## Niveau 1 — Diagnostic sur le vrai téléphone (données réelles, avant tout correctif)

Accès : SSH Termux + `rish` (uid shell) via Tailscale ; Anthony active « Phone ON ».
1. Relevé de l'état actuel : version Android et OxygenOS, version de l'APK installé, permissions accordées (`dumpsys package`),
   `appops` (RUN_ANY_IN_BACKGROUND, RUN_IN_BACKGROUND), liste blanche Doze (`dumpsys deviceidle whitelist`), compartiment de veille,
   réglage batterie OxygenOS de l'appli (Optimisation intelligente / Sans restriction / Restreint).
2. Reproduction contrôlée : trajet démarré (à pied ou à l'arrêt, GPS réel), écran éteint, Waze devant ; `logcat` capturé en continu
   (`ActivityManager`, `TrajetService`, `ForegroundService`, `LocationManager`, messages OxygenOS de gestion de batterie) pendant 30 min.
3. Après coup : `dumpsys activity exit-info cloud.ingevision.pleinettrajet`, journal du trajet (`trajet-en-cours.txt`), journal de diagnostic.
4. **Sortie attendue** : la cause prouvée par une ligne de log (ex. `ForegroundServiceStartNotAllowedException` à la relance), pas déduite.
   Si la cause n'est pas celle supposée, le plan des correctifs change ; les niveaux 2 à 5 restent valables.

## Niveau 2 — Tests unitaires (à chaque construction)

Java (JUnit, Robolectric pour le service) :
• `JournalTrajet` : lignes P/A/R, numérotation, rattrapage après la dernière ligne appliquée, **dernière ligne tronquée** (écriture coupée
  par la mort du processus), lignes en double, fichier vide, fichier de 20 000 lignes, caractères invalides.
• Datation : saut d'horloge du téléphone (avant / arrière, heure manuelle, fuseau changé), heure GNSS absente, relevés hors d'ordre.
• `onStartCommand` : intention nulle avec trajet actif / sans trajet, `startForeground` qui lève une exception → le service **ne s'arrête
  pas sans prévenir** (notification d'interruption, ligne au journal).
• Direct natif (page absente) : km et € calculés par le service égaux à ceux de `roule.ts` sur le même journal (écart < 0,5 %).
JS (Vitest) : fusion journal natif ↔ état de la page, reprise après N relances, trous complétés et signalés.

## Niveau 3 — Émulateur, scénarios durs (Android 14, 15 et 16 ; chaque scénario 3 fois)

Rejeu d'un vrai parcours à 1 Hz par le fournisseur de test `gps`. Pour chaque scénario on vérifie : trous dans le journal,
service vivant (`dumpsys activity services`), notification présente, raison de mort (`exit-info`), trajet récupérable à la réouverture.

| # | Scénario | Comment | Attendu |
|---|---|---|---|
| S1 | Processus tué, appli en arrière-plan, **non rouverte pendant 30 min** | `kill -9` du processus, écran éteint | service relancé seul, trou < 10 s, aucune réouverture nécessaire |
| S2 | Tué par mémoire basse | `am send-trim-memory … COMPLETE`, applis lourdes lancées | idem S1 |
| S3 | Doze profond 60 min | écran éteint, `dumpsys deviceidle force-idle`, débranché (`dumpsys battery unplug`) | relevés continus à 1 Hz |
| S4 | Compartiment de veille « restricted » | `am set-standby-bucket … restricted` | relevés continus, ou interruption signalée |
| S5 | Batterie « Restreint » | `cmd appops set … RUN_ANY_IN_BACKGROUND ignore` | idem S4 |
| S6 | Économiseur d'énergie actif | `settings put global low_power 1` | relevés continus (fréquence notée) |
| S7 | Balayage depuis les applis récentes | `onTaskRemoved` | service continue |
| S8 | Arrêt forcé (Paramètres > Forcer l'arrêt) | `am force-stop` | arrêt inévitable : trajet gardé, message à la réouverture |
| S9 | Localisation retirée en route / passée en approximative | `pm revoke`, `appops` | trajet gardé, interruption signalée |
| S10 | GPS coupé dans les réglages puis remis | `cmd location set-location-enabled false/true` | « GPS coupé » signalé, reprise seule |
| S11 | Notifications refusées (Android 13+) | `pm revoke POST_NOTIFICATIONS` | enregistrement continue |
| S12 | Redémarrage du téléphone en route | `reboot` | trajet gardé, proposé à la réouverture (reprendre / terminer) |
| S13 | Mise à jour de l'APK en route | `pm install -r` | trajet gardé, reprise ou message |
| S14 | Rendu WebView planté | processus de rendu tué | service continue, page se recharge et relit le journal |
| S15 | Stockage plein | remplissage de `/data` | écriture refusée signalée, pas de crash |
| S16 | Changement d'heure / de fuseau en route | `cmd alarm set-time`, `settings put global auto_time 0` | distance et durée justes |
| S17 | Trajet très long | 4 h rejouées (14 400 relevés) | réouverture < 2 s, mémoire stable, journal complet |
| S18 | Autre appli de navigation qui tient le GPS | appli témoin qui demande la localisation en continu | les deux reçoivent les relevés |
| S19 | Tunnel réel simulé | fournisseur de test qui **cesse** d'émettre 3 min (pas de répétition de la dernière position) | trou signalé « GPS perdu », distance complétée et marquée |

## Niveau 4 — Banc sur le OnePlus (OxygenOS réel, sans conduire)

Piloté à distance (rish / adb sans fil), téléphone posé, l'un après l'autre :
1. **Endurance GPS réel, immobile** : trajet démarré, écran éteint 2 h, Waze devant, téléphone sur batterie. Mesure : trou max,
   relances, `exit-info`. Fait pour chaque réglage batterie OxygenOS : Optimisation intelligente (défaut), Sans restriction, Restreint.
2. **Endurance en mouvement simulé** : même chose avec un vrai parcours rejoué par fournisseur de test (shell : `cmd location providers
   add-test-provider gps`), pour vérifier distance et consommation sur 2 h.
3. **Morts provoquées sur OxygenOS** : S1, S7, S8, S12 rejoués sur le téléphone.
4. **Parcours d'installation de zéro** : désinstallation, installation depuis le lien, premiers écrans de permissions et de batterie
   tels qu'Anthony les verra ; capture de chaque écran. Vérifie que la configuration obtenue est celle qui passe le banc 1.

## Niveau 5 — Vrais trajets (avec Anthony)

5 trajets, chacun avec photo du compteur avant / après, Waze devant, écran éteint :
• ville 15 min ; route 45 min ; autoroute 1 h 30 ou plus ; un trajet avec un tunnel ; un trajet avec arrêt à la station (pause / reprise).
• Une fois téléphone en charge, une fois sur batterie.
Critères : trou max < 5 s (hors tunnel), distance < 2 % du compteur, consommation à ± 15 % de l'ordinateur de bord, rapport de
robustesse du trajet sans mort silencieuse.

## Niveau 6 — Non-régression permanente

• Niveaux 2 et 3 (S1, S3, S7, S12, S19 au minimum) rejoués à chaque modification d'Android, sur le VPS ou la CI.
• Le rapport de robustesse de chaque vrai trajet est gardé ; un trajet avec mort silencieuse ou trou > 30 s = ticket ouvert d'office.

## Ordre et répartition

| Étape | Qui | Dépend de |
|---|---|---|
| Niveau 0 (build VPS, observatoire, rapport par trajet) | Claude, en autonomie | — |
| Niveau 1 (diagnostic réel) | Claude ; Anthony active « Phone ON » et installe l'APK instrumenté | 0 |
| Correctif de la cause prouvée | Claude | 1 |
| Niveaux 2 et 3 | Claude, en autonomie | correctif |
| Niveau 4 | Claude à distance ; téléphone posé et branché au réseau | 2, 3 |
| Niveau 5 | Anthony conduit ; Claude lit les rapports | 4 vert |
