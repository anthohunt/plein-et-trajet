# Jalon 6 — Appli Android — journal

## Timeline
- 18:45Z (21/10) — Passe 12 du nœud construire. Jalons 1 à 5 cochés ; premier jalon non coché : jalon 6 « Appli Android » (aucun écran propre ; même appli que le jalon 5 emballée par Capacitor ; histoires V-3.2 écran éteint, V-3.3 notification, + rejeu Android de V-1.3, V-3.1, V-3.4, V-3.5, V-3.E1, V-3.E2, V-4.7, V-5.1).
- Cas d'usage existant : tests/e2e/use-cases/m6-use-case.md — 12 captures nommées (V-3.2-01..06, V-3.3-01..06) + captures de rejeu à nommer par le bâtisseur (V-x.y-A<nn>-*.png). Livrées dans tests/e2e/delivery/, brutes dans tests/e2e/screenshots/m6/.
- Existant constaté au démarrage : une autre session (Claude-Session 016XJ…) a déjà poussé dc34b88..8d64f5d — appli Capacitor 8, plugin @capgo/background-geolocation, NotifTrajet.java (notification vitesse/km/€, Pause/Reprendre/Arrêter), workflow .github/workflows/android.yml (jobs apk + emulateur, script tests/android/trajet-emulateur.mjs). Manquent par rapport au plan : test UiAutomator écran éteint + Maps, arrêt du processus, contrôle apksigner/aapt2, écart natif/web chiffré, captures du plan, APK publié sur projets.ingevision.cloud.
- Vérification Android = GitHub Actions uniquement (VPS sans Java ni SDK) ; preuves = artefacts téléchargés par l'API GitHub (jeton via /home/claude/bin/gh-env.sh, gh absent).
- Équipe logique « m6-pipeline » : agents lancés par /home/claude/surveillance/lancer-agent-claude.sh (LA_BOUCLE_SUR_VPS=1, LA_BOUCLE_MODE_P=1), compte agents, attendus jusqu'à leur fichier .fin. Pas de TeamCreate.
- Garde-fous : Vault et public.cles_fournisseurs jamais touchés ; AUCUN appel PTV ; table trajets ni écrite ni vidée ; keystore jamais commité.
- 18:32Z — Chef : bâtisseur r1 lancé (m6-batisseur-r1, lanceur VPS, mode -p).
- 21:45Z — Bâtisseur r1 terminé : run CI final 39675522721 vert (apk + principal 28/28 + immobile 9/9), 12 captures du plan + 27 de rejeu livrées, APK publié et vérifié (sha256 6646959d…00bb), m5 sur la prod 73/73, 7 runs CI.

## Builder Summary

Empreinte SHA-256 du certificat du magasin de clés (calculée au VPS, python cryptography) :
`b3a3b7b2998e2d804a258491f60920417127dc01a32da2f7e2df794909314c25`.

1. **Build** — `tests/android/controle-apk.py` dans le job apk (cc205e7, 9f59cae). Run final 39675522721, job 119484241916, rapport
   `controles-apk.txt` (artefact `plein-et-trajet-apk` 12382441943, copie dans tests/e2e/exploration/m6-preuves-ci/) :
   apksigner OK, empreinte = celle du magasin de clés ; aapt2 : FOREGROUND_SERVICE, FOREGROUND_SERVICE_LOCATION, ACCESS_FINE_LOCATION,
   POST_NOTIFICATIONS présents, ACCESS_BACKGROUND_LOCATION absent (le plugin ne l'ajoute pas : pas de `tools:node="remove"`).
   ÉCART : pas de `TrajetService`, le service de premier plan (`foregroundServiceType=0x8` location) est
   `com.capgo.capacitor_background_geolocation.BackgroundGeolocationService` — pas renommé.
2. **Instrumentation** — `tests/android/m6-emulateur.mjs` (remplace trajet-emulateur.mjs), Node + Playwright `_android` (WebView,
   IndexedDB) + `uiautomator dump`/`input tap` (dialogues, volet) ; choix justifié dans m6-exploration-log.md. Matrice de 2 jobs.
   Run final : principal 28/28 OK (job 119486392626), immobile 9/9 OK (job 119486392616). Image google_apis : **Google Maps présent**,
   utilisé. Points lus dans IndexedDB `en_cours` (là où l'enregistreur les écrit) : 307 points en 318 s écran éteint, plus grand trou
   1,917 s. `am kill` sans effet sur un processus à service de premier plan → SIGKILL par `run-as` (tueur mémoire) ; réouverture :
   41 → 50 points, même trajet. Position injectée par le fournisseur de test `gps` (`cmd location providers`) : la puce simulée
   répète la dernière position (pas de vrai tunnel) et rééchantillonne (consommation gonflée) — runs 39667270054 et 39671788190.
3. **Écart natif / web** (run final, instant figé) : km 9,7 (notification) vs 9,703 (fin, calculLocal de roule.ts) = **0,03 %** ;
   litres 1,280 (2,76 € ÷ 2,157 €/L) vs 1,278 = **0,12 %**. Runs précédents : 0,31 % / 0,05 %, 0,44 % / 0,04 %, 0,5 % / 0,02 %.
4. **Captures** — requises 12 (V-3.2-01..06, V-3.3-01..06) : 12 produites (01-04 et V-3.3 : screencap CI du run 39675522721 ;
   V-3.2-05/06 : Playwright sur la prod, sentinelle `wakeLock` tenue, `data-verrou=actif`). Rejeu : 27 (liste exacte en fin de
   m6-use-case.md). Toutes regardées ; `V-3.2-A12-reveil.png` écarté (noir). Brutes tests/e2e/screenshots/m6/, livrées tests/e2e/delivery/.
5. **Distribution** — https://projets.ingevision.cloud/plein-et-trajet/plein-et-trajet.apk : curl `200 4433473`, sha256
   `6646959d16b73b14001506488a1062adc78bac6fd838f412623470da758100bb` = APK de l'artefact 12382441943 ; page d'accueil « commit fe0f9e7 ».
   Pas de release GitHub (dépôt privé, lien public suffisant).
6. **Web** — m5-explore + m5-regression sur la prod, une passe sous `lourd` : **73 passed (25.9m)** ; Vitest 265/265 (20 fichiers) ;
   `tsc --noEmit` code 0 ; `vite build` OK. Aucune ligne de code web modifiée par ce round (tests et CI seulement).
7. **Exploration** — tests/e2e/exploration/m6-exploration-log.md (sections par histoire au fil des runs, `## API Contract Check` : 8 appels
   OK, 0 MISMATCH) ; extraits : m6-test-snippets/v32-web-verrou.mjs et m6-emulateur.mjs (lien vers tests/android/).
8. **À constater sur le téléphone d'Anthony** (non simulé) : économie de batterie OxygenOS (processus tué plus souvent : les secondes
   où le processus est mort ne sont pas enregistrées, constaté ~16-20 s à l'émulateur) ; vrai GPS et vrai tunnel ; Waze devant 30 min ;
   écart distance / compteur < 2 % ; installation depuis le lien (sources inconnues) ; sortie de l'optimisation de batterie ;
   **consommation réaliste sur un vrai trajet** — sur émulateur, des positions datées à l'heure de réception irrégulière ont donné
   18 à 31 L/100 (6,1 avec la vitesse Doppler) ; si c'est le cas au téléphone, dater par `l.time` (enregistreur-web.ts:59).

**Runs CI** (7) : 39655337001 (remplacé), 39655982353 (principal 30/31 : seuil de test ; immobile : disque), 39659349314 (disque,
`FATAL Not enough space to create userdata partition`), 39664532821 (principal vert ; immobile tué par l'ANR de gms), 39667270054
(principal vert ; immobile : puce qui répète), 39671788190 (immobile vert), **39675522721 (tout vert)**.

**Garde-fous relus** : Vault et cles_fournisseurs non touchés (m5 ne fait que compter les lignes, sans valeur) ; aucun appel PTV
(`lieux` = IGN/Photon) ; table trajets : 1057 lignes avant et après (comptage lecture seule), l'appli Android garde ses trajets dans
IndexedDB ; magasin de clés jamais copié, effacé du runner après le build, secrets masqués ; ajouts git par chemin ; aucun pkill ;
verrou de livraison sans objet (brief) — mon attente a été arrêtée par PID.

**Restes** : V-1.3 sur Android : la localisation est demandée à l'ouverture (« Autour de moi »), pas au Démarrer ; tester
« C'est fini » de la notification d'immobilité (même intention qu'« Arrêter », testé) n'a pas été joué séparément.

