---
noeud: construire
passe: 3
verdict: reussi
duree: ~1 h 50 (12:10Z → 13:58Z)
sous_agents: 10
---

# Construire le jalon 1 « Les prix autour de moi » — passe 3

**Ce que j'ai fait** — Les passes 1 et 2 s'étaient arrêtées sur « Login expired » sans rien produire. J'ai donc repris le jalon 1 à zéro. J'ai provisionné le projet Supabase `plein-et-trajet` (eu-west-3, auth anonyme), le projet Vercel lié au dépôt GitHub, et un `.env.local` non commité, puis j'ai rattaché le workspace à l'historique git distant. J'ai ensuite piloté le cycle complet : bâtisseur, évaluateur, descripteur, auditeur et contre-évaluation, sur 3 tours, puis les tests, le déploiement, l'annotation et le rapport.

**Ce que je rends**
- `docs/pipeline/status.md` : le jalon 1 est coché, les jalons 2 et 3 restent ouverts (la feuille de route approuvée en compte 3, pas 2).
- `docs/pipeline/project-memory.md` : réécrit, 1 534 caractères.
- `docs/pipeline/m1-journal.md` : la chronologie, 3 résumés du bâtisseur, 3 évaluations du transcript (5/5 à chaque fois), 3 audits (FAIL, FAIL, PASS), la contre-évaluation (PASS 5/5), les sections Test & Regression et Deploy, l'annotation et le rapport.
- L'app en prod : https://plein-et-trajet.vercel.app, dépôt main à 11e7820.
- 55 captures annotées dans `tests/e2e/delivery/` ; 55 captures brutes dans `tests/e2e/exploration/m1-captures-brutes/`, extraites de 7745b20 avant annotation ; 3 captures de vérification du déploiement.
- `docs/delivery/m1-delivery-report.html` (10 Mo) : 19 histoires, 55 étapes, 55 captures, aucune manquante.

**Ce que j'ai trouvé**
- La synchro réelle tourne toutes les 10 min : 9 815 stations, 35 701 prix, et une moyenne gazole égale à la moyenne officielle (2,367 €/L).
- Tests : Vitest 24/24, Playwright 25/25 sur la prod. Le parcours de vérification du déploiement a fait 7 requêtes Supabase, toutes en 200.
- L'audit a refusé 2 fois avant de passer :
  - round 1 : 4 HIGH (un geste de carte invisible sur sa capture, des libellés en double qui masquaient la station en rupture, des pastilles hors cadre atteignables au clavier, une capture du retour de focus prise trop tard) ;
  - round 2 : 1 HIGH et 2 MEDIUM, tous sur des captures.
- Le cas d'usage définit 55 captures, pas 60 comme je l'avais estimé au départ.

**Mes sous-agents**
- Bâtisseur (relancé 2 fois en gardant son contexte) : il a construit, déployé et exploré, et corrigé 9 bugs trouvés en exploration en plus de la liste de l'audit. Fiable.
- Évaluateurs du transcript ×3 : PASS 5/5 à chaque fois. Ils ont tranché que les bandeaux « Annotation de test » ne fabriquent rien.
- Descripteurs ×2 : 55 descriptions. Ce sont eux qui ont repéré les 13 captures qui ne prouvaient rien. Très utiles.
- Auditeur, 3 rounds en gardant son contexte : FAIL, FAIL, puis PASS, sur la prod en 390 et 1280 px. Rigoureux.
- Contre-évaluation : PASS 5/5, pas de faux PASS.
- Tests et déploiement : spec consolidé `tests/e2e/m1-explore.spec.ts`, prod READY.
- Annotateur : 55 cadres rouges ; j'en ai vérifié 2.
- Aucun sous-agent n'est mort.

**Ce qui coince**
- Pas de serveur Playwright MCP ni d'outil TeamCreate dans cette session. L'exploration s'est faite avec la bibliothèque Playwright, sur la vraie prod, et les dispatches avec l'outil Agent.
- Le générateur de rapport standard ne lit pas le format en liste de ce cas d'usage, ni les identifiants US-1.E1 et US-A11Y-001 (il trouvait 0 étape). J'ai produit le rapport via une conversion et une copie du générateur aux motifs élargis, rangées dans `docs/delivery/outils/`.
- Il reste 1 MEDIUM connu : après un glisser de carte, des pastilles hors cadre restent parfois atteignables au clavier (1 essai sur 4). Il est noté dans `m1-summary.md`.
- Le rapport n'a pas encore été relu par Anthony.
- Le validateur est rouge sur C2 seulement (jalons 2 et 3 non construits), ce qui est attendu pour un nœud qui se relance jalon par jalon.

**Pour la suite** — Le prochain lancement doit faire le jalon 2 « Le coût d'un trajet ». L'infra existe déjà, il ne faut rien recréer : les identifiants sont dans `.env.local` et `docs/pipeline/config.json`. Il faut réutiliser `docs/delivery/outils/` pour le rapport. La table des préférences et la voiture arrivent avec ce jalon ; le carburant est pour l'instant mémorisé dans le navigateur. Les enseignes des stations finissent de se remplir vers 02h Z.
