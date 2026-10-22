# Regression Test Report — Round 1

## Baseline (avant correctifs, prod 2d14d34)
- E2E : 103/103 (21,2 min)
- Échecs : aucun (V-2.3 « clio 2017 120 », instable à l'étape 4, est passé cette fois)

## Summary
- Unit tests: 283/283
- Build: OK, tsc 0 erreur (chunk principal index-BtagRHsn.js 502,24 kB / 149,8 kB gzip ; CarteStations 1 072,8 kB / 295,5 kB gzip ; worker maplibre 519,3 kB)
- E2E specs: 4/4 fichiers verts après rejeu (103/103 tests ; 102/103 au premier passage, 1 instable vert au rejeu 3/3)
- Regressions found: 0
- Test fixes needed: 0

## Déploiement
- SHA poussé : 2f0d99d (main, 34fe2bf..2f0d99d, 13 commits). Déploiement Vercel `dpl_9fumfFzKEWGgmzqYCGw2G5KP2fae` : READY (production).
- Bundle servi = local : `assets/index-BtagRHsn.js` sur plein-et-trajet.vercel.app et dans dist/.
- En-têtes relevés sur `/` : Content-Security-Policy (default-src 'self' ; script-src 'self' ; connect-src supabase/openfreemap/geopf/photon ; worker-src 'self' blob: ; object-src 'none' ; frame-ancestors 'none'), X-Content-Type-Options: nosniff, Referrer-Policy: strict-origin-when-cross-origin, Permissions-Policy: geolocation=(self), Strict-Transport-Security (Vercel), Cache-Control: max-age=0, must-revalidate. Sur `/assets/index-BtagRHsn.js` : mêmes en-têtes de sécurité + `Cache-Control: public, max-age=31536000, immutable`.
- Violations CSP en prod (Chromium 390×844, géoloc Albi, écoute `securitypolicyviolation` + messages console) : accueil 0, Stations (carte chargée + fiche ouverte) 0, Ma voiture (« clio » + code D.2) 0, En route 0, Fin de trajet 0, Historique 0, Moteurs 0. Total 0, aucune correction de vercel.json nécessaire. Limite : En route / Fin visités sans trajet en cours (écran d'accueil de repli) ; les trajets enregistrés sont couverts par l'E2E (aucun échec CSP observé).
- Contrôle visuel (images lues) : tuiles OpenFreeMap réellement affichées, pastilles de prix, liste lisible ; fiche station ouverte avec la carte visible derrière. Preuves : `hardening-r1-evidence/fixes/prod-stations-carte-liste.png`, `prod-stations-fiche.png`, `prod-voiture-clio.png`. Script de mesure : scratchpad csp.mjs (non commité).

## E2E Test Results
| Spec | Tests | Passed | Failed | Notes |
|------|-------|--------|--------|-------|
| m1-explore.spec.ts | 23 | 23 | 0 | |
| m5-explore.spec.ts | 66 | 66 | 0 | 65 au 1er passage ; V-2.E1 « ZZ9999 » instable, vert 3/3 au rejeu |
| m5-regression.spec.ts | 8 | 8 | 0 | |
| m6-explore.spec.ts | 6 | 6 | 0 | |
Total 103 tests, 17,0 min. Sortie brute : /tmp/claude-1000/e2e-apres.txt.

## Comparaison avec la base de départ
103/103 avant (21,2 min) → 103/103 après (102 au 1er passage + 1 instable rejoué vert ; 17,0 min). Aucun comportement changé qui exige une mise à jour de test : barrière d'erreur, validation IndexedDB, maplibre 6.15.0, CSP, mise en page < 500 px et contraste « Démarrer » n'ont cassé aucune attente. Plus rapide (voiture-eea sans OR, cache durable).

## Failures & Fixes
- V-2.E1 « ZZ9999 : code introuvable, bouton désactivé » (m5-explore.spec.ts:242). Erreur : attendu « Code introuvable… », reçu « La base européenne des voitures ne répond pas » (data-code=base_injoignable) pendant 40 s. Classement : instable, pas une régression. Preuves : appel direct de voiture-eea?d2=ZZ9999 deux fois → 404 `code_inconnu` en 2,5-2,8 s ; rejeu `--repeat-each=3` : 3/3 verts (3,7-4,1 s). Cause probable : un 5xx ponctuel de la base Discodata/fonction au moment du passage (le code inconnu est le cas le plus lent, requête sans cache à 2,5 s, sous le délai de 7 s). Aucun correctif. À surveiller : si l'instabilité revient, le front pourrait réessayer une fois sur base_injoignable (P2).
