# Specs archivées (jalon 5, V1 recentrée)

Gardées, plus exécutées (`playwright.config.ts` ne les sélectionne plus) :

- `m2-explore.spec.ts` — écrans S3 Trajets / S4 Résultat (estimation avant départ) : histoires `retiree_v1` ou `remplacee_v1`.
- `m3-explore.spec.ts` — péages, pays traversés, écran Moteurs : `retiree_v1` (péages, estimation) et `conservee_hors_navigation` (US-5.x, `/admin`). Son
  `globalSetup` (`exploration/m3-global.mjs`) lisait et restaurait les clés de Vault : il n'est plus branché, la V1 ne touche pas aux clés.
- `m4-explore.spec.ts` — S6 En route du jalon 4 (calcul final par le serveur, péages) : `remplacee_v1` ; US-6.E1 à E3 (`maintenue_v1`) sont
  rejouées sur T1 / T3 par les specs m5.

Les imports pointent vers `../exploration/` : un fichier se rejoue tel quel avec `npx playwright test tests/e2e/archive/<fichier> --config <config ad hoc>`.
- `m1-explore.spec.ts` (version d'origine, jalon 1) — archivée par le bâtisseur r1b du jalon 5. Ses histoires `remplacee_v1` / `retiree_v1`
  ne sont plus jouées : US-1.1 (→ V-5.1), US-1.2 (→ V-5.2), US-1.3 (→ V-5.1, V-5.3 : la carte glissée ne se recharge plus d'elle-même),
  US-1.5 (→ V-5.4), US-2.2 (retirée : plus d'écran Trajets). Les histoires `maintenue_v1` de ce fichier restent jouées par
  `tests/e2e/m1-explore.spec.ts`, adapté à l'écran T5 Stations (`/stations`) sans retrait d'assertion. `testIgnore` écarte ce dossier.
