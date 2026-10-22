# Journal des décisions — Plein & Trajet

Ce qui a changé, pourquoi, ce qui a été essayé, ce qui a tenu. Compilé le 2026-10-22 depuis `v1-recentrage.md`, `stack-decisions.md`, `m3-decisions.md`, les journaux de jalons, `hardening-r1-*` (consolidé, correctifs, régression) et `git log`. Pour chaque point : la décision, le fait qui la commande, et où en lire le détail.

## 1. Produit

| # | Décision | Pourquoi | Source |
|---|---|---|---|
| P1 | **Recentrage V1 (21/10)** : la V1 donne le coût exact de l'essence d'un trajet réellement roulé, partagé entre passagers, plus la carte des prix des stations. L'estimation d'un trajet avant de partir (jalons 2-4) et les péages (jalon 3) sortent. | Trajet de référence d'Anthony (Toulouse → Paris à plusieurs) : « les péages se lisent sur la facture ; l'essence, non ». « On va rester à ça pour une version 1. » | `v1-recentrage.md` décisions 1-2 |
| P2 | Retirer **sans rien effacer** : péages mis hors service par migration, `estimer-trajet` déployée mais plus appelée, fichiers de péages gardés, Vault et `cles_fournisseurs` jamais touchés, table `trajets` ni vidée ni supprimée. | Retour possible plus tard ; les clés ont été collées par Anthony. | `stack-decisions.md` § V1.4 |
| P3 | Écran Moteurs **hors navigation** mais gardé à `/admin`. | Absent de la maquette V1 ; les synchros de stations hors France (Fuel Finder au Royaume-Uni…) lisent fournisseur et clé dans ce registre. | `stack-decisions.md` § V1.4 |
| P4 | Moteurs **branchables** (table `moteurs` + Supabase Vault, écran admin) au lieu de clés dans le code. | Anthony, 20/10 : « je veux pas que ce soit hardcodé ». | `stack-decisions.md` § Jalon 3 |
| P5 | **Pas de compte** : voiture et historique sur le téléphone (IndexedDB / localStorage). | Décision 10 ; perdus si on change de téléphone, accepté. | `v1-recentrage.md` |
| P6 | Accueil allégé : voiture centrée, gros bouton rond Démarrer ; prix et personnes saisis **à la fin** du trajet ; boutons en double retirés (« Stations autour de moi » sur En route, « Retour » du bandeau). | Retours d'Anthony sur la maquette V1 : « il ne faut pas répéter des boutons qui ne servent à rien ». | `v1-recentrage.md` § Retours |
| P7 | Démarrer / Arrêter **à la main**, arrêt seul après 10 min immobile avec confirmation. | Décision 9. | `v1-recentrage.md` |
| P8 | Carte des stations : déplacement libre et bouton « Rechercher dans cette zone » (plus de rechargement automatique au déplacement). | Décision 3 : « comme sur Maps ». | `v1-recentrage.md` |

## 2. Voiture et consommation

| # | Décision | Ce qui a été essayé / pourquoi | Source |
|---|---|---|---|
| V1 | **Base EEA « CO2 cars »** (Discodata, sans clé) au lieu d'ADEME Car Labelling. | ADEME ne contient que le catalogue neuf actuel (550 lignes) : la Clio IV 2017 d'Anthony n'y est pas. EEA couvre toutes les immatriculations UE depuis 2010, avec les codes de la carte grise. Recherche de plaque écartée : aucune API gratuite sans carte (api-plaque, RegCheck payants ; ANTS réservée aux collectivités). | `v1-recentrage.md` § 6 |
| V2 | Saisie par le **code D.2** (type-variante-version), secours par recherche « clio 2017 120 ». Interrogation **à la demande** puis cache `versions_eea`, pas d'import en masse. | ~850 000 versions agrégées inutiles pour un seul conducteur ; la recherche répond en 0,3-1,5 s. | `stack-decisions.md` § V1.1 |
| V3 | Agrégation par **mode pondéré** (combinaison la plus immatriculée), pas par moyenne. | Bruit mesuré : pour 5RBU0C 2017, 12 605 lignes à 87 kW mais 367 à 131 kW. | `stack-decisions.md` § V1.1 |
| V4 | Consommation par phase **dérivée** de la valeur combinée (Fc, sinon Ewltp/23,3 ou /26,4, sinon Enedc × 1,21), répartie par un modèle road-load + Willans. Le modèle physique des jalons 2-4 (`roule.ts`) est réutilisé tel quel. | EEA ne donne qu'une consommation combinée ; aucune nouvelle physique. Contrôle Vitest : écart ≤ 0,5 L/100 km par phase sur les versions communes ADEME/EEA. | `stack-decisions.md` § V1.1 |
| V5 | Libellé de la voiture = ce que porte EEA (« Renault Clio », « 1.2 · 118 ch · 2017 »), pas le nom commercial (« Clio IV », « TCe 120 »). | EEA n'a pas les noms commerciaux. **Non tranché par Anthony** : changer le texte du plan, ou ajouter une table de noms. | `m5-summary.md` |
| V6 | Recherche EEA (D8, durcissement) : requêtes **sans `OR`**, cache `recherches_eea` 24 h, délai 7 s / budget 11 s, **503 clair** au lieu de 502. | Mesuré : Discodata sérialise les requêtes et un `OR` coûte 3-5 s par table (« clio » ≈ 27-30 s, 502). Après : « clio 2017 120 » 18,4 s → 1,8 s, puis ≤ 0,4 s. | `hardening-r1-fixes.md` D8 |

## 3. Enregistrement du trajet et Android

| # | Décision | Ce qui a été essayé / pourquoi | Source |
|---|---|---|---|
| A1 | Jalon 4 : la page web enregistre (`watchPosition` + Wake Lock), écran gardé allumé. | Choix « A » d'Anthony au jalon 4 ; une page perd le GPS écran éteint. | `stack-decisions.md` § Jalon 4 |
| A2 | V1 : **vraie appli Android** (Capacitor 8.5.3), seul écart à la pile standard. | Décision 8 « B » : enregistrer pendant que Waze ou Maps guide, écran éteint. La version web reste (Vercel, même code). | `stack-decisions.md` § V1 |
| A3 | Plugin natif maison (Java) + service de premier plan `location`, **journal texte** des relevés au lieu de SQLite, `START_STICKY`. | Round 1 avec @capgo/background-geolocation : points écrits par la page, service non relancé → processus tué = plus rien d'enregistré (audit r1 HIGH 2). Le journal en ajout de fin de fichier survit à un SIGKILL. | `stack-decisions.md` § V1.2 |
| A4 | Lignes du journal ordonnées par **numéro de ligne**, pas par heure ; instant = heure du relevé GNSS (horloge monotone). | Round 3, « deux horloges » : l'horloge du téléphone peut suivre le GNSS à 2 s près ; une Pause pouvait se perdre. Conso gonflée au round 1 par une mauvaise datation. | `stack-decisions.md` § V1.2, `m6-journal.md` |
| A5 | Notification permanente Pause / Reprendre / Arrêter ; direct calculé par le service à partir de la dernière mise à jour de la page (plus simple que la table de consommation prévue). | Retour d'Anthony sur la maquette ; la page recalcule tout à la réouverture. Écart connu non corrigé : distance de la notification qui oublie 2-3 relevés juste après une relance du service. | `stack-decisions.md`, `m6-summary.md` |
| A6 | Sortie de l'optimisation de batterie demandée au premier Démarrer (dialogue système direct). | Les surcouches (OxygenOS du OnePlus d'Anthony) tuent les services en fond ; hors Play Store, la restriction Google ne s'applique pas. | `stack-decisions.md` § V1.2 |
| A7 | APK construit et testé par **GitHub Actions** (émulateur API 34), signé hors dépôt, publié par lien sur projets.ingevision.cloud. | Le VPS n'a ni Java ni SDK Android. **La CI est bloquée par la facturation depuis le 22/10 02:44Z** : l'APK publié (run 39710484157, 71f19b3) n'embarque pas les correctifs du durcissement. | `stack-decisions.md` § V1.3, `m6-summary.md` |
| A8 | Capteurs : GPS seul ; un tunnel est comblé à la sortie (ligne droite, vitesse moyenne). | L'accéléromètre n'apporterait pas de gain mesurable sur le coût. | `stack-decisions.md` § V1.2 |

## 4. Carte et données

| # | Décision | Pourquoi | Source |
|---|---|---|---|
| C1 | Fond de carte **OpenFreeMap Positron** (sans clé) au lieu du Plan IGN. | Couvrir l'Europe et le Royaume-Uni. **À valider par Anthony.** | `m5-summary.md` |
| C2 | Stations hors France : flux officiels sans clé dans 10 pays (ES, IT, PT, SI, HR, AT, DK, IS, RO) + Royaume-Uni (Fuel Finder, clé dans Vault), couvertures partielles assumées (AT, IT, IS) ; prix GB convertis au taux BCE du jour. | Aucune source européenne unique. | `m3-decisions.md`, `stack-decisions.md` |
| C3 | Prix par défaut à la fin du trajet = moyenne du jour du pays de départ pour le carburant de la voiture, remplaçable. | Décision 7. | `v1-recentrage.md` |

## 5. Durcissement (round 1, 22/10)

Décision du manager : P0 et P1 corrigés, P2 différés, P3 acceptés, aucune question à Anthony dans le nœud. Résultat relu à HEAD (`116357c`) :

| # | Correctif | Ce qui a été mesuré | Commit |
|---|---|---|---|
| D1, D2, D4, D5, D6 | Données locales ou serveur invalides **réparées ou écartées à la lecture** (trajet arrêté incomplet, points GPS null, masse null, coordonnées NaN, station sans services). | 6 écrans blancs reproduits → 0. | 9452483, 790efb5, ee3a8ee, adb6c3e, caa93c5, ff96d0d |
| D3 | **Barrière d'erreur racine** (Recharger / Effacer les données locales de l'appli). | Exception injectée : blanc → écran d'erreur ; « Effacer » vide localStorage et IndexedDB. Devenue l'histoire US-NEW-1. | 60be123 |
| D7 | maplibre-gl 4.7.1 → **6.15.0** ; worker déclaré (`setWorkerUrl`), référence `window.__carte` libérée. | Fuite : nœuds 202 → 752 sur 5 visites avant, 202 → 202 après ; avis XSS refermé. WebGL2 désormais obligatoire, vu seulement sous Chromium headless. | ec4d216, b723946 |
| D8 | Recherche EEA (voir V6). | 18,4 s → 1,8 s ; 0 × 502. | 49d7c3a |
| D9, D15 | En-têtes de sécurité (CSP, frame-ancestors, nosniff, Referrer-Policy, Permissions-Policy) ; assets en `immutable`. | 0 violation CSP sur 7 routes en prod. `'unsafe-inline'` gardé pour les styles (attributs posés par React et MapLibre). | 8bb5f96 |
| D10, D11 | Stations lisible sous 500 px de haut (page défilante, carte réduite) ; texte foncé sur le vert de Démarrer en sombre. | Liste 0 → 220-284 px ; contraste 2,15:1 → 8,84:1. D10 est devenu l'histoire US-NEW-2. | d67e56f |

**Différés (P2)** : D12 avis react-router (corrigé seulement en 7.18), D13 sessions anonymes sans captcha, D14 relais ES lourd (12 Mo / 21 s), D16 Stations lente à préparer la carte (4,1 s mobile), D17 appels de moyennes répétés, D19 lectures Supabase sans délai maximal, D20 prix aberrants affichés tels quels, D21 contrastes juste sous le seuil, D22 zoom 200 %, couleur seule, focus perdu après « Enregistrer ma voiture ». **Acceptés (P3)** : 23 points listés dans `hardening-r1-consolidated.md` (D23).

Régression après correctifs : Vitest 283/283, Playwright prod 103/103.

## 6. Méthode (ce qui a servi)

• Les tests de bout en bout tournent contre **la prod réelle** ; deux interceptions seulement, marquées `// MOCKED:` (V-2.E1 base injoignable, V-6.4 latence).
• Le trajet roulé est un **vrai tracé GPS** (Albi → Toulouse, 1 point/s) rejoué par Playwright ; seule l'horloge est accélérée.
• Agents des jalons 5-6 lancés par `lancer-agent-claude.sh` (sur le VPS) ; durcissement et livraison par l'outil Agent de la session, parce que le lanceur envoie maintenant les sessions sur la tour, qui n'a pas ce dossier de travail.
• Travail lourd sous `lourd` (plafond CPU du VPS).

## 7. Ouvert, à trancher par Anthony

• Facturation GitHub (rouvre la CI Android, puis reconstruire l'APK avec les correctifs du durcissement).
• Libellé de la voiture (V5) et fond de carte (C1).
• Essais réels sur son OnePlus : installation par le lien, 30 min écran éteint avec Waze, tunnel, notification.
• Sortie de durcissement : option A (expédier, retenue de fait par le passage en livraison), B (passe r2) ou C (corriger les P2).
