# Specs archivées (jalon 5, V1 recentrée)

Gardées, plus exécutées (`playwright.config.ts` ne les sélectionne plus) :

- `m2-explore.spec.ts` — écrans S3 Trajets / S4 Résultat (estimation avant départ) : histoires `retiree_v1` ou `remplacee_v1`.
- `m3-explore.spec.ts` — péages, pays traversés, écran Moteurs : `retiree_v1` (péages, estimation) et `conservee_hors_navigation` (US-5.x, `/admin`). Son
  `globalSetup` (`exploration/m3-global.mjs`) lisait et restaurait les clés de Vault : il n'est plus branché, la V1 ne touche pas aux clés.
- `m4-explore.spec.ts` — S6 En route du jalon 4 (calcul final par le serveur, péages) : `remplacee_v1` ; US-6.E1 à E3 (`maintenue_v1`) sont
  rejouées sur T1 / T3 par les specs m5.

Les imports pointent vers `../exploration/` : un fichier se rejoue tel quel avec `npx playwright test tests/e2e/archive/<fichier> --config <config ad hoc>`.
