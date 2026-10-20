# Règles de construction — Plein & Trajet

## Toujours
- Écrire et faire passer les tests de chaque histoire (Vitest pour la logique, Playwright pour les parcours de `tests/e2e/use-cases/`) avant de cocher une tâche.
- Messages de commit : `type(portée): résumé` (feat, fix, test, chore, docs), une intention par commit, référence de l'histoire (`US-x.y`) dans le corps.
- Utiliser le système de design de la maquette : `docs/pipeline/design/tokens.json` → `tokens.css`, rôles de couleur seulement, jamais de couleur en dur ; plaque de totem pour tout prix ; accent vert réservé aux prix.
- Vérifier l'accessibilité à chaque écran : focus visible, ordre logique, Échap, libellés ARIA, contraste AA dans les deux thèmes, `prefers-reduced-motion`.
- Brancher les vraies sources (prix officiels, ADEME, IGN) et gérer leurs erreurs : réseau coupé, 429, réponse vide, réponse mal formée.
- Garder les secrets hors du dépôt (`.env.local` ignoré) ; lire les jetons dans `/home/claude/flux/secrets/webapp-stack.env`.
- Comparer chaque écran construit à la maquette validée (`design/mockup.html`) et capturer la preuve.

## Demander d'abord (à Anthony, en une ligne)
- Tout changement d'architecture ou écart à la pile standard.
- Toute nouvelle dépendance au-delà de `@supabase/supabase-js`, `maplibre-gl`, `react-router-dom` et des outils de test.
- Tout ajout au périmètre (péages, électrique, comptes, partage…) ou retrait d'une histoire.
- Toute déviation du système de design.

## Jamais
- Sauter ou désactiver un test, marquer une histoire faite sans sa preuve Playwright.
- Pousser en force, réécrire l'historique de `main`.
- Déployer en production avec des tests rouges.
- Remplacer une source réelle par des données inventées ; les données d'exemple ne servent qu'au repli hors ligne en développement local.
- Réinventer le système de design ou recopier le squelette du cadrage.
- Committer un jeton, une clé ou un `.env`.
