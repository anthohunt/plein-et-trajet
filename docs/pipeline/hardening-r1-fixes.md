# Durcissement r1 — correctifs D1 à D11 (hardening-builder)

Tout est corrigé et vérifié. Commits locaux (pas de push). Rejeu : `hardening-r1-evidence/fixes/rejouer.mjs` (avant = prod 2d14d34, après = build local `vite preview`), résultats `rejeu-avant-prod.json` / `rejeu-apres-local.json`, mesure de fuite `fuite.mjs`.

| ID | Ce qui n'allait pas | Fichiers | Commit | Vérification (avant → après) |
|---|---|---|---|---|
| D3 | aucune barrière d'erreur : toute exception de rendu blanchissait l'appli | `src/main.tsx`, `src/components/BarriereErreur.tsx` (nouveau) | 60be123 | exception de rendu injectée sur /voiture : écran blanc (racine 0 car.) → écran « Un problème est survenu » avec « Recharger » et « Effacer les données locales de l'appli » ; clic sur « Effacer » : localStorage 2 → 0, marqueur IndexedDB présent → absent, retour à `/` (`D3-barriere-erreur*.png`) |
| D1 | trajet arrêté incomplet lu tel quel → blanc permanent sur /fin | `src/lib/historique.ts` (`normaliserTrajet`, `lireArrete`, `listerTrajetsV1`, `lireTrajetV1`) | 9452483, 790efb5 | IDB `en_cours/arrete = {id, vitesses}` : blanc au lancement ET à la relance (2/2) → accueil normal (racine 141 car.), relance idem ; l'entrée inutilisable est supprimée. Sans fin/voiture : réparé, pas rejeté (790efb5) |
| D2 | points GPS null → blanc permanent sur /en-route | `src/lib/enregistreur-web.ts` (`restaurer`) | ee3a8ee | IDB `points:[null,[t,null,null]]` : blanc 2/2 → accueil normal 2/2 ; points invalides filtrés, enregistrement abandonné s'il n'en reste aucun |
| D4 | `n.toLocaleString()` sur null/undefined | `src/routes/MaVoiture.tsx` | adb6c3e | `masse_kg: null` et `immatriculations` absent : blanc → liste affichée (« — kg ») |
| D5 | station lat NaN / 200 → `Invalid LngLat` | `src/lib/donnees.ts` (`stationsAutour`) | caa93c5 | lat `"NaN"` et 200 : blanc → 1 ligne + 1 pastille (la station invalide est écartée) |
| D6 | `station.services.filter` sur undefined | `src/components/FicheStation.tsx` (+ normalisation `services` dans `donnees.ts`) | ff96d0d, caa93c5 | station sans `services` : blanc à l'ouverture de la fiche → fiche ouverte |
| D7 | maplibre-gl 4.7.1 : fuite à chaque visite de Stations, avis XSS | `package.json`, `package-lock.json`, `src/components/CarteStations.tsx` | ec4d216, b723946 | voir ci-dessous |
| D8 | recherche par nom : 18,4 s / 502 après 20,5 s | `supabase/functions/voiture-eea/index.ts`, `_shared/eea.ts` (`requetesRecherche`), migration `20261022120000_durcir_recherches_eea.sql` | 49d7c3a | voir ci-dessous |
| D9 | aucun en-tête de sécurité | `vercel.json` | 8bb5f96 | voir ci-dessous |
| D10 | liste Stations à 0 px sous ~500 px de haut | `src/styles/app.css` | d67e56f | `.scroll` à 195×422 : 0 → 284 px ; à 640×320 : 0 → 220 px ; à 390×844 inchangé (415 px, carte 230 px) ; page défilante, carte 150 px, barre d'onglets collée en bas |
| D11 | « Démarrer » blanc sur #4cc77f en sombre | `src/styles/app.css` | d67e56f | couleur calculée `rgb(255,255,255)` → `rgb(14,17,16)` (#0e1110) ; contraste 2,15:1 → 8,84:1 |

## D7 — maplibre-gl
• Version retenue : **6.15.0** exacte (dist-tag `latest` npm au 22/10/2026 ; ≥ 6.4.1 corrigé), `npm audit` ne signale plus maplibre.
• API : v6 est ESM seul → `import * as maplibregl` ; **le worker doit être déclaré sous Vite** (`import urlWorker from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url"` + `setWorkerUrl`) sinon « Worker failed to load » et carte vide (constaté, puis corrigé). WebGL2 devient obligatoire (v6).
• Fuite : la mise à jour seule laissait +1 canvas et +109 nœuds par visite ; la cause restante était `window.__carte` (référence globale d'inspection e2e) jamais libérée, corrigée au démontage.
• Mesure (5 visites de Stations, GC forcé, même script avant/après, stations injectées) : **avant (prod 4.7.1)** nœuds 202 → 752, canvas 1 → 6, écouteurs 204 → 329, tas 6,95 → 10,00 Mo ; **après** nœuds 202 → 202, canvas 1 → 1, écouteurs 206 → 206, tas 7,01 → 7,76 Mo (pas de croissance d'objets). Carte rendue (captures `D7-stations-carte-avant-prod.png` / `-apres.png`).
• Note : la carte n'a pu être contrôlée que dans Chromium headless (swiftshader) ; à voir sur un vrai téléphone (WebGL2) à la prochaine construction Android.

## D8 — voiture-eea (déployée)
• Cause trouvée en mesurant Discodata : le `(Cn LIKE … OR Mk LIKE …)` coûte 3 à 5 s par table, et le serveur sérialise les 4 requêtes (≈ 27-30 s pour « clio »). Sans OR, une requête = 0,2 à 0,5 s. La recherche est donc faite en requêtes sans OR (modèle, puis marque par mot), résultats dédoublonnés : même résultat.
• Cache : table `recherches_eea` (créée via l'API de gestion Supabase, migration ajoutée, RLS sans politique = service seulement) + cache mémoire d'instance, 24 h, par requête normalisée (mots triés + année + puissance). Délai Discodata 7 s, budget total 11 s (avant 10 s × 2 par table), une table lente ne bloque plus les autres, échec total = **503** avec message clair (plus de 502).
• Version de la fonction : **3 → 5** (4 = sans table de cache, 5 = finale).
• Mesures par curl sur la prod (clé anon) : « clio » 5,1 s (1er appel), 1,0 s, 0,44 s ; « clio 2017 120 » 1,8 s, 0,35 s, 0,39 s, 0,39 s, 0,30 s ; aucun 502 ni 503 sur 10 appels. Avant : 18,4 s et 502 après 20,5 s.
• Le test unitaire d'origine de `requeteRecherche` est conservé (fonction inchangée, plus utilisée par la fonction) ; ajout de tests pour `requetesRecherche`.

## D9 — en-têtes (vercel.json)
• JSON valide. CSP : `default-src 'self'`; `script-src 'self'` (pas de `unsafe-eval`); `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`; `font-src 'self' https://fonts.gstatic.com`; `img-src 'self' data: blob: https://tiles.openfreemap.org`; `connect-src 'self' https://*.supabase.co wss://*.supabase.co https://tiles.openfreemap.org https://data.geopf.fr https://photon.komoot.io`; `worker-src 'self' blob:` ; `child-src 'self' blob:`; `manifest-src 'self'`; `object-src 'none'`; `base-uri 'self'`; `form-action 'self'`; `frame-ancestors 'none'`. Plus nosniff, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: geolocation=(self)`, et `Cache-Control: public, max-age=31536000, immutable` sur `/assets/(.*)`.
• Origines inventoriées (code, index.html, bundle) : Supabase (`*.supabase.co`, REST/RPC/functions), OpenFreeMap (style, tuiles, sprites, glyphes), Google Fonts (css + gstatic), `data.geopf.fr` (géocodage), `photon.komoot.io` (repli), même origine pour `/api/*`. Le lien Google Maps est un simple lien (non concerné).
• `'unsafe-inline'` n'est gardé que pour les styles (attributs `style` posés par MapLibre/React) ; à resserrer plus tard.
• Vérification locale : build servi avec exactement cet en-tête CSP injecté sur le document, parcours /, /voiture, /historique, /moteurs, /stations (carte + tuiles chargées : 4 réponses openfreemap) : **0 violation** (événements `securitypolicyviolation` et console). Vérification en prod à faire par le chef après déploiement.

## Contrôles finaux
• Vitest : **283/283** (280 d'origine + 3 nouveaux ; aucun test existant modifié).
• Build : `tsc` 0 erreur, `vite build` OK — `index` 502,24 Ko (gzip 149,8), `CarteStations` 1 072,82 Ko (gzip 295,5), worker maplibre 519,28 Ko (nouveau fichier, chargé seulement sur Stations), CSS 27,8 + 71,6 Ko.
• Non touché : `android/`, P2/P3. Fichiers étrangers non ajoutés (state/, f.html, deno.lock, m3-step-descriptions.json, run-report-bundle/).
• Reste à noter : `window.__carte` est désormais supprimé à la sortie de Stations (les tests e2e qui lisent `__carte` pendant que Stations est affichée ne sont pas touchés).
