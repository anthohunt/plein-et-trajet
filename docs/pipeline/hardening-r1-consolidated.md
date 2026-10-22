# Durcissement — passe r1 — rapport consolidé

Cible : https://plein-et-trajet.vercel.app — commit 378aa46 (code 2d14d34). Quatre audits sur la production, chacun relu par un évaluateur d'honnêteté : **4 PASS, 4/5 chacun, aucune fabrication**. Les sévérités ci-dessous intègrent les reclassements des évaluateurs.

| Domaine | Note auditeur | Évaluation | Après reclassement (CRITICAL / HIGH / MEDIUM / LOW) |
|---|---|---|---|
| Performance | B | PASS 4/5 | 0 / 2 / 4 / 3 |
| Stabilité | C | PASS 4/5 | 2 / 4 / 2 / 6 |
| Accessibilité | ~90 % AA | PASS 4/5 | 0 / 2 / 8 / 5 |
| Sécurité | risque MEDIUM | PASS 4/5 | 0 / 2 / 3 / 9 (M4 fusionné dans H2) |

## Priorités

- **P0 (CRITICAL)** : se corrige dans cette passe.
- **P1 (HIGH)** : se corrige dans cette passe.
- **P2 (MEDIUM)** : différé, sauf si Anthony choisit l'option « corriger aussi les moyens ».

**Décision du manager (22/10/2026, ~06:40Z) : P0 et P1 corrigés dans cette passe, P2 différés, P3 acceptés. Aucune question n'est posée à Anthony dans ce nœud (pipeline autonome après le test du mockup) : enchaîner correctifs → régression (`hardening-r1-regression.md`) → déploiement sans attendre de réponse.**
- **P3 (LOW)** : accepté et documenté.

## Tableau unique, dédoublonné

| ID | Priorité | Domaine(s) | Défaut | Preuve | Cause (fichier:ligne) | Correctif retenu |
|---|---|---|---|---|---|---|
| D1 | **P0 CRITICAL** | Stabilité S1 | Un trajet arrêté gardé dans IndexedDB sans départ ou arrivée donne un écran blanc sur `/fin` **à chaque lancement**, et rien dans l'appli ne permet d'en sortir. | `hardening-r1-evidence/stability/D-idb-arrete-sans-depart.png` | `src/lib/historique.ts:140` (validation partielle), `src/App.tsx:60-62`, `FinDeTrajet.tsx:~101,129` | Valider entièrement l'état lu (rejeter ou réparer ce qui est incomplet) + barrière d'erreur racine (D3). |
| D2 | **P0 CRITICAL** | Stabilité S2 | Un enregistrement en cours dont les points GPS sont null donne un écran blanc **permanent** sur `/en-route`. | `…/stability/D-idb-enregistrement-points-null.png` | `src/lib/enregistreur-web.ts:376`, `src/App.tsx:55-57` | Filtrer les points invalides à la lecture + D3. Cause réaliste (selon l'évaluateur) : un changement de format entre deux versions. |
| D3 | **P1 HIGH** (cause commune de D1, D2, D4 à D6) | Stabilité | **Aucune barrière d'erreur React** : n'importe quelle exception de rendu efface toute l'appli. | grep `ErrorBoundary` dans src/ : 0 résultat | `src/main.tsx:8` | Barrière d'erreur racine qui propose « Recharger » et « Effacer les données locales de l'appli ». |
| D4 | **P1 HIGH** | Stabilité S3+S4 | La voiture renvoyée sans `masse_kg` ou sans `immatriculations` donne un écran blanc sur `/voiture`. | `…/stability/D-eea-masse-null.png`, `D-eea-immat-absent.png` | `src/routes/MaVoiture.tsx:10` (`n.toLocaleString()`), appelée l. 27, 165, 201 | Formatage tolérant aux valeurs nulles (« — »). |
| D5 | **P1 HIGH** | Stabilité S5 | Une station de latitude NaN ou 200 donne un écran blanc sur Stations. | `…/stability/D-st-lat-NaN.png`, `D-st-lat-200.png` | `src/components/CarteStations.tsx:212` ; `src/lib/donnees.ts:33` | Écarter les stations aux coordonnées invalides dès la lecture. |
| D6 | **P1 HIGH** | Stabilité S6 | Ouvrir une station sans `services` donne un écran blanc. | `…/stability/D-st-champs-manquants-fiche.png` | `src/components/FicheStation.tsx:64` | `station.services ?? []` + normalisation à la lecture. |
| D7 | **P1 HIGH** | Performance #1 + Sécurité H1 (même dépendance) | `maplibre-gl` 4.7.1 : **fuite de +0,75 Mo / +266 nœuds / +2 canvas à chaque visite de Stations** (1,80 → 10,44 Mo sur 5 visites), cause probable le bug #4811 corrigé en 5.0.0 ; **avis XSS critique** GHSA-jrc7-96c5-q579 (≤ 6.4.0). | `hardening-r1-evidence/perf/fuite.json` ; `npm audit` | `package.json:18`, `CarteStations.tsx:100-157` | Passer à `maplibre-gl` ≥ 6.4.1 (seule version corrigée) ; vérifier l'API ; remesurer la fuite. |
| D8 | **P1 HIGH** | Performance #2 | **Recherche de voiture par nom** : « clio 2017 120 » prend **18,4 s** ; « clio » renvoie **502 après 20,5 s**. | `…/perf/parcours.json` | `supabase/functions/voiture-eea/index.ts:18` (délai 10 s × 2 essais), `:92` (`Promise.all` sur toutes les tables sans année), `:93` (aucun cache) | Mettre en cache les résultats par requête (comme la recherche par code D.2, qui répond en 1,3 s), réduire le délai et les reprises, et renvoyer un message clair plutôt qu'un 502. |
| D9 | **P1 HIGH** (gardé HIGH tant que D7 n'est pas déployé, MEDIUM ensuite) | Sécurité H2 (+M4 fusionné) | **Aucun en-tête de sécurité** : ni CSP, ni frame-ancestors/X-Frame-Options, ni nosniff, ni Referrer-Policy, ni Permissions-Policy. Sans CSP, un script injecté lirait la trace GPS et le jeton de session gardés sur l'appareil. | `curl -sI` (prod) | `vercel.json` (aucun bloc `headers`) | Bloc `headers` dans vercel.json : CSP qui autorise Supabase, OpenFreeMap, Google Fonts et les workers blob de MapLibre, `frame-ancestors 'none'`, nosniff, Referrer-Policy, Permissions-Policy (géolocalisation limitée à self) ; vérifier zéro violation CSP en prod. |
| D10 | **P1 HIGH** | Accessibilité #1 (CRITICAL → HIGH) | **Liste des stations à 0 px de haut** au zoom 200 % (195×422) et en paysage 320 px de haut : aucune station lisible, tri inutilisable. | `hardening-r1-evidence/a11y/z4-stations-zoom200.png` | `src/styles/app.css:9` (100dvh + overflow hidden), `:16`, `:37` (carte de 230 px fixe) | Sous ~500 px de haut, laisser défiler toute la page et réduire la carte. |
| D11 | **P1 HIGH** | Accessibilité #5 | Thème sombre : le bouton « Démarrer » (blanc sur #4cc77f) est à **2,15:1**, sous le seuil de 3:1 du grand texte. | `…/a11y/s-01-accueil-sombre.png` | jeton de couleur du thème sombre dans `src/styles/app.css` | Texte foncé (#0e1110) sur ce vert en thème sombre (≈ 9:1). |
| D12 | P2 MEDIUM | Sécurité M1 | `react-router-dom` 6.28.0 : avis « open redirect ». Le code n'expose pas d'entrée externe ; 6.30.4 ne corrige pas GHSA-wrjc-x8rr-h8h6 (corrigé seulement en 7.18.0). | npm audit | `package.json:21` | Différé. |
| D13 | P2 MEDIUM | Sécurité M2 | Sessions anonymes sans captcha et sans limite par utilisateur sur les fonctions qui consomment des API tierces à clé. | config auth prod | `calcul-peages.ts:25`, `estimer-trajet`, `trajet-roule` | Différé (fonctions non routées en V1 sauf voiture-eea). |
| D14 | P2 MEDIUM | Sécurité M3 | `/api/relais-es` : 12,08 Mo en ≈ 21 s, jamais servi depuis le cache. | curl ×2 | `api/relais-es.js` | Différé. |
| D15 | P2 MEDIUM | Performance #3 | Les fichiers JS/CSS dont le nom porte une empreinte sont servis en `max-age=0`. | curl | `vercel.json` | Différé (règle `immutable`). |
| D16 | P2 MEDIUM | Performance #4 | Stations : 709 à 1 080 ms de fil principal bloqué, carte prête à 4,1 s en profil mobile. | vitals.json | chunk CarteStations | Différé. |
| D17 | P2 MEDIUM | Performance #5 | `moyennes_par_pays` appelé 21 fois sur 3 parcours. | parcours.json | `src/lib/prixDuJour.ts:9`, `donnees.ts:87-91` | Différé. |
| D18 | P2 MEDIUM | Performance #6 | Carte à 10-20 fps en déplacement/zoom (rendu logiciel du VPS : **à mesurer sur un vrai téléphone**). | — | — | À mesurer avant toute action. |
| D19 | P2 MEDIUM | Stabilité S7 | Lectures Supabase sans délai maximal : « Chargement… » pendant 30 s et plus. | 36,3 s mesurées | `donnees.ts:33,42`, `eea.ts:17` | Différé. |
| D20 | P2 MEDIUM | Stabilité S8 | Prix négatifs ou absurdes affichés tels quels ; un prix de 1e-9 est accepté pour un trajet. | `D-prix-negatif.png` | `donnees.ts:50`, `prixChoisi.ts:13` | Différé. |
| D21 | P2 MEDIUM | Accessibilité #2 à #4 (HIGH → MEDIUM) | Contrastes juste sous le seuil : écart « moins cher » à 4,18:1, détails de la version de voiture à 4,25:1, contour des champs à 1,45:1. | captures a11y | `--cheap`, `span.m`, `--line` | Différé. |
| D22 | P2 MEDIUM | Accessibilité #6 à #10 | Libellés rognés au zoom 200 %, carte qui ne distingue les prix que par la couleur, régions live trop bavardes (liste, résultat D.2), focus perdu après « Enregistrer ma voiture ». | captures a11y | voir rapport a11y | Différé. |
| D23 | P3 LOW | tous | 23 LOW : outillage de dev vulnérable, versions non épinglées, comparaison de secret non constante, messages d'erreur internes, TLS non vérifié vers le relais roumain, CORS `*`, config locale divergente, droits par défaut, chunk initial de 499 Ko, 4 polices, gel à 10 000 stations (impossible : la base plafonne à 300), corps vide traité comme « aucune station », fond de carte en erreur sans message, pastilles coupées à 320 px, colonne fixe en grand écran, URL UTF-8 tronquée (Vercel), pas de `main`, cibles tactiles de 22 px, `role=alert` sur un h2, ellipses à 320 px, flèche bas dans les suggestions. | rapports | rapports | Acceptés et documentés. |

## Recoupements entre domaines

- **maplibre-gl 4.7.1** est signalé par la performance (fuite) **et** par la sécurité (XSS) : une seule mise à jour (D7) règle les deux.
- **L'absence de CSP** (sécurité H2 et M4) aggrave le XSS de maplibre et expose les données gardées sur l'appareil : D9.
- **La recherche de voiture** apparaît dans la performance (18 s, 502) et dans la stabilité (30 s sans retour visible) : D8, puis D19.
- **Six écrans blancs, une seule cause** (pas de barrière d'erreur) : D3 couvre D1, D2, D4, D5 et D6, et chaque lecture est en plus validée là où elle plante.

## Point de départ de la non-régression (avant les correctifs)

- Vitest : **280/280** (22 fichiers).
- Playwright contre la prod : la première passe a échoué sur 60 tests faute de variables (`.env.local` non chargé, erreur `Failed to parse URL from undefined/functions/v1/…`) ; relancée avec ces variables, voir `hardening-r1-regression.md`.
- Use-cases : m1 à m6 présents dans `tests/e2e/use-cases/` (aucun jalon sans couverture).

## Hors de portée de cette passe

- La partie Android (APK) : la CI GitHub Actions est bloquée par la facturation. Les correctifs de `src/` n'entreront dans l'APK qu'à la prochaine construction.
