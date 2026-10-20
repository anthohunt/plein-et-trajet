# Jalon 2 — Le coût d'un trajet — journal

## Timeline
- 2026-10-20 13:48Z — Passe 4 du nœud construire. Jalon 1 coché (passe 3, commit 7310915). Premier jalon non coché : jalon 2 « Le coût d'un trajet » (écrans S3 Trajets, S4 Résultat), 19 histoires.
- Cas d'usage existant : tests/e2e/use-cases/m2-use-case.md — 51 captures d'histoires + 10 transverses = 61 captures attendues, rangées dans tests/e2e/delivery/ (le plan cite tests/e2e/screenshots/m2/, dossier ignoré par git : même règle qu'au jalon 1, delivery/ fait foi).
- Infra réutilisée sans rien recréer : Supabase `plein-et-trajet` (rglrwtkqwihdztgqlbsy), Vercel `plein-et-trajet` (déploiement au push sur main), `.env.local`.
- Outillage, même constat qu'au jalon 1 : pas de serveur Playwright MCP ni d'outil TeamCreate dans la session. Exploration par la bibliothèque Playwright sur la prod, dispatch par l'outil Agent (équipe logique « m2-pipeline »).
- 13:50Z — Bâtisseur dispatché (tâche 1).
