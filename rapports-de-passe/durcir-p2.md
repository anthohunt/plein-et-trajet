---
noeud: durcir
passe: 2
verdict: reussi
duree: ~1 h 15 (06:00Z → 06:30Z pour l'essentiel, agents en parallèle)
sous_agents: 3
---

# Durcissement de la production — passe 2

**Ce que j'ai fait** — Reprise de la passe 1, qui avait audité, évalué et consolidé sans corriger, et sans écrire de rapport de non-régression (contrat C8 rouge). J'ai appliqué la décision du manager (P0 et P1 corrigés, P2 différés, aucune question dans le nœud). J'ai fait établir la base de départ des tests de bout en bout sur la prod inchangée, fait corriger D1 à D11, puis fait déployer et rejouer toute la suite sur la prod.

**Ce que je rends**
- Les livrables de la passe 1, inchangés : `hardening-r1-{perf,stability,a11y,security}-report.md` et leurs `-eval.md` (4 PASS 4/5).
- `hardening-r1-consolidated.md` : complété du résultat de la passe et de la décision A/B/C soumise à Anthony.
- `hardening-r1-fixes.md` : D1 à D11, 13 commits (60be123..2f0d99d), mesures avant/après ; preuves dans `hardening-r1-evidence/fixes/`.
- `hardening-r1-regression.md` : base 103/103, après correctifs 103/103 (un instable rejoué 3/3), Vitest 283/283, 0 violation CSP sur 7 routes.
- `status.md` (étape 5, round 1) et le journal.

**Ce que j'ai trouvé** — **0 CRITICAL / 0 HIGH ouvert.** Les 6 écrans blancs ne se reproduisent plus. Pour maplibre-gl 6.15.0 :
- la fuite est éteinte : nœuds 202 → 202 sur 5 visites, contre 202 → 752 avant ;
- l'avis XSS est refermé ;
- la mise à jour a demandé `setWorkerUrl` et la libération de `window.__carte`.

La recherche de voiture « clio 2017 120 » passe de 18,4 s à 1,8 s, puis ≤ 0,4 s depuis le cache. Plus aucun 502 : la cause était les requêtes `OR` que Discodata sérialise. Les en-têtes de sécurité sont en prod, constaté par curl, et les assets sont en `immutable` (D15 réglé au passage). Validateur `webapp-durcissement` : vert.

**Mes sous-agents**
- regression-tester (base) : 103/103 sur la prod 2d14d34 en 21,2 min. Fiable.
- hardening-builder :
  - D1 à D11 corrigés, avant/après capturés, commits locaux ;
  - il a déployé `voiture-eea` (v3 → v5) et créé la table de cache `recherches_eea` en prod (migration commitée). À savoir.
- regression-tester (après) : il a poussé et vérifié Vercel READY 2f0d99d et que le bundle servi est le même que celui compilé en local. Il a constaté 0 violation CSP, les tuiles visibles et 103/103 après rejeu. Il a poussé 1aa41eb (docs).

**Ce qui coince**
- La carte maplibre 6 exige WebGL2 et n'a été vue que sous Chromium headless : à constater sur le téléphone d'Anthony.
- L'APK n'embarque pas ces correctifs (CI GitHub Actions bloquée par la facturation).
- En route et Fin n'ont été visitées sous CSP que sans trajet en cours ; les trajets réels ne sont couverts que par l'E2E.
- La CSP garde `'unsafe-inline'` pour les styles (attributs `style` de React et MapLibre).

**Pour la suite** — La sortie de boucle n'est pas tranchée. Le choix A (expédier, recommandé), B (passe r2) ou C (corriger les moyens) attend Anthony, en fin du consolidé. Le test V-2.E1 (« ZZ9999 ») a été instable une fois, avec `base_injoignable` : s'il revient, prévoir un essai de plus côté front. Les P2 restants sont D12-D14 et D16-D22.
