# Jalon 2 — Le coût d'un trajet — journal

## Timeline
- 2026-10-20 13:48Z — Passe 4 du nœud construire. Jalon 1 coché (passe 3, commit 7310915). Premier jalon non coché : jalon 2 « Le coût d'un trajet » (écrans S3 Trajets, S4 Résultat), 19 histoires.
- Cas d'usage existant : tests/e2e/use-cases/m2-use-case.md — 51 captures d'histoires + 10 transverses = 61 captures attendues, rangées dans tests/e2e/delivery/ (le plan cite tests/e2e/screenshots/m2/, dossier ignoré par git : même règle qu'au jalon 1, delivery/ fait foi).
- Infra réutilisée sans rien recréer : Supabase `plein-et-trajet` (rglrwtkqwihdztgqlbsy), Vercel `plein-et-trajet` (déploiement au push sur main), `.env.local`.
- Outillage, même constat qu'au jalon 1 : pas de serveur Playwright MCP ni d'outil TeamCreate dans la session. Exploration par la bibliothèque Playwright sur la prod, dispatch par l'outil Agent (équipe logique « m2-pipeline »).
- 13:50Z — Bâtisseur dispatché (tâche 1).

## Builder Summary

**Résultat : jalon 2 construit, déployé, exploré sur la prod. 61/61 captures, 0 échec, 0 doublon d'octets.**

**Construit** (US-3.1…3.7, 4.1…4.3, 3.E1…E4, 4.E1…E3, 3.P1, 3.P2 + transverses A11Y-001…004, PERF-001)
- Front : écran Trajets (départ/arrivée avec propositions IGN au fil de la frappe, bouton d'inversion, voiture marque → modèle → motorisation en listes déroulantes accessibles, Calculer avec validation « Lieu introuvable » / « Choisis ta voiture » sans appel, état « Calcul de l'itinéraire… » + Annuler, historique avec rejeu au prix du jour, suppression, état vide) et écran Résultat (coût en totem, litres, km, L/100 km, prix moyen / « Mettre mon prix » 0,50–4,00, « Revenir à la moyenne », tronçons dépliables avec vitesse, arrêts, dénivelé, L/100 km ; « Pas d'itinéraire routier entre ces deux lieux »). Toutes les chaînes passent par `src/lib/textes.ts`.
- Base (migration `20261020140000_trajets_vehicules.sql`) : `vehicules` (lecture publique), `preferences` et `trajets` (RLS `user_id = auth.uid()`), RPC `vehicules_marques` / `vehicules_modeles`. Session anonyme conservée dans le navigateur (`persistSession`).
- Edge Functions déployées : `import-vehicules` (ADEME Car Labelling, `x-sync-secret`) et `estimer-trajet` (itinéraire IGN bdtopo-osrm, altimétrie IGN tous les 500 m, modèle WLTP par tronçon : phase par vitesse, + ½mv² par arrêt, + mgΔh ; logique pure dans `supabase/functions/_shared/modele.ts`).
- **Véhicules importés : 550 versions** (source ADEME : 3 604 lignes ; 3 295 thermiques ou hybrides non rechargeables retenues, regroupées par version ; électriques, hybrides rechargeables et lignes sans consommation WLTP exclus).

**Déploiement** : code déployé = commit `84ae3b1` (Vercel READY, vérifié par l'API) ; commits suivants = tests, captures et journaux seulement. Migration et fonctions appliquées par l'API de gestion Supabase / `supabase functions deploy --use-api`. Limite d'inscriptions anonymes du projet portée de 30 à 300/h pour l'exploration.

**Tests**
- Vitest : 79/79 (modèle de consommation, découpage en tronçons, échantillonnage et dénivelé, validation du prix perso 0,50–4,00, coût, ordre des motorisations, normalisation ADEME). `npx tsc --noEmit` et `npx vite build` : 0 erreur.
- Extraits Playwright m2 (`tests/e2e/exploration/m2-test-snippets/`, 24 fichiers) sur la prod : **56/56**, dont au moins un test sans `page.route` par histoire touchant le backend.
- Régression jalon 1 (`tests/e2e/m1-explore.spec.ts`) sur la prod : **25/25**.
- Contrôle de contrat API : 25 contrôles réels, tous OK (`m2-contrat-api.mjs`, détail dans le journal d'exploration).

**Captures** : 61/61 dans `tests/e2e/delivery/` (51 d'histoires + 10 transverses), noms exacts du plan, chacune issue de son propre `page.screenshot` après assertions DOM, aucune copie, 0 doublon md5. Outil : bibliothèque Playwright (pas de serveur Playwright MCP dans l'environnement), script `tests/e2e/exploration/run-m2.mjs`, journal `tests/e2e/exploration/m2-exploration-log.md`.

**Mocks** : un seul — **MOCKED: US-4.E3**, délai de 3 s ajouté à la VRAIE requête `estimer-trajet` (`route.continue()` après attente). « zzzz » (géocodeur IGN réel), Corse (routeur IGN réel : HTTP 422), historique vide (identité anonyme neuve), formulaire incomplet : tous réels, sans mock. Rien de semé : l'historique vient du parcours de l'appli.

**Bug trouvé en exploration et corrigé** : US-4.E2 — le prix perso était appliqué à chaque touche, donc « 12 » passait par « 1 » et changeait le coût ; il n'est maintenant appliqué qu'une fois la frappe posée (Entrée, sortie du champ ou 0,45 s sans touche).

**Interprétations** : (1) US-A11Y-002/003 concernent la fiche station ; sur ce jalon elles sont appliquées à S4 (titre focalisé à l'ouverture, focus rendu au bouton Calculer ou à la ligne d'historique, Échap replie le tronçon ouvert et l'éditeur de prix) ; la fiche du jalon 1 reste couverte par le spec M1 (25/25). (2) US-3.E4 : la motorisation la plus proche de la puissance moyenne du modèle est proposée en premier (badge « proposée »), les autres par puissance croissante ; elle n'est pas présélectionnée. (3) US-3.P2 : changer de marque efface modèle et motorisation, la marque est mémorisée tout de suite (colonnes `marque`/`modele` ajoutées à `preferences`), la voiture complète l'est au choix de la motorisation. (4) Rejouer un trajet met à jour sa ligne d'historique (pas de doublon) et la remonte en tête ; un trajet identique (mêmes lieux, même voiture) est remonté plutôt que dupliqué. (5) Le géocodage du départ et de l'arrivée se fait côté navigateur (IGN, CORS ouvert) ; `estimer-trajet` reçoit des coordonnées.

**Écarts et points ouverts**
- Les modèles de bi-carburation (ADEME « ESS+G.P.L. ») sont calculés au prix du GPLc ; si l'ADEME publie leur consommation WLTP en essence, le coût est sous-estimé (non vérifié).
- La base ADEME ne couvre que 550 versions ; les modèles récents peuvent manquer (c'est le cas d'usage de US-3.E4).
- Le prix perso n'est pas enregistré dans l'historique (l'historique garde le coût au prix moyen).
- Péages, pays traversés et Europe (US-3.8, 4.4, 4.5, 4.E4…E6) : jalon 3, non traités.
- Les annotations orange des captures A11Y-004 et PERF-001 sont des surcouches de test, retirées de l'appli et signalées dans le journal ; elles recouvrent le bas de l'écran.
