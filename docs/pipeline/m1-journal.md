# Jalon 1 — Les prix autour de moi — journal

## Timeline
- 2026-10-20 12:10Z — Passe 3 du nœud construire. Passes 1 et 2 mortes à la connexion (« Login expired »), aucun artefact : départ à zéro.
- 12:15Z — Infra provisionnée par le chef : Supabase `plein-et-trajet` (ref rglrwtkqwihdztgqlbsy, eu-west-3, auth anonyme activée), Vercel `plein-et-trajet` lié à github.com/anthohunt/plein-et-trajet (variables VITE_* posées), `.env.local` (non commité), dépôt git rattaché au workspace (historique distant 018487e).
- Écart d'outillage constaté : pas de serveur Playwright MCP dans cette session ; l'exploration se fait avec la bibliothèque Playwright (chromium headless installé), captures réelles prises par `page.screenshot`. Pas d'outil TeamCreate : dispatch par l'outil Agent en arrière-plan.
- Cas d'usage : tests/e2e/use-cases/m1-use-case.md — 50 captures d'histoires + 10 transverses = 60 captures attendues, rangées dans tests/e2e/delivery/.

## Builder Summary

**Construit**
- Front React 18 + Vite 5 + TypeScript (`src/`) : écran Prix (sélecteur de carburant mémorisé, carte MapLibre GL sur Plan IGN vectoriel avec pastilles vert/orange par moitié la moins chère, bouton de recentrage, liste triable Moins cher / Plus proche avec enseigne, distance, ancienneté, écart à la moyenne France, totem à 3 décimales, « prix du JJ/MM » atténué au-delà de 48 h), fiche station en feuille (6 carburants, « non vendu » / « rupture », services, heure de mise à jour, focus titre, Échap, retour du focus), états Erreur + Réessayer et Vide, repli de position (dernière ville ou Albi + message), écran Trajets minimal avec l'arrivée pré-remplie depuis la fiche. Textes centralisés `src/lib/textes.ts`, tokens `src/styles/tokens.css` (clair/sombre).
- Supabase : migrations `supabase/migrations/` (PostGIS, `stations` / `prix` / `moyennes_nationales`, RLS lecture publique, écriture service seulement, RPC `stations_autour(lat, lon, rayon_m)`, `sync_prix_appliquer`, `recalculer_moyennes`, `stations_a_enrichir`, tâche pg_cron `sync-prix` toutes les 10 min via pg_net, secret dans Vault).
- Edge Function `sync-prix` (déployée, `--no-verify-jwt`, protégée par l'en-tête `x-sync-secret`) : export complet du flux instantané officiel (reprise sur 429/5xx, réponse vide ou mal formée rejetée), application par lots de 1 000, ruptures temporaires gardées (`rupture=true`), ruptures définitives = non vendu, moyennes nationales recalculées, puis enrichissement nom/enseigne de 120 stations par passage depuis la fiche officielle prix-carburants.gouv.fr (le flux ne contient pas l'enseigne).
- Tests : Vitest `tests/unit/format.test.ts` (20 tests : prix 3 décimales, exposant, distance, écart, ancienneté/48 h, tri, moitié la moins chère, libellés). Exploration `tests/e2e/exploration/run-m1.mjs` + journal `m1-exploration-log.md` ; extraits `tests/e2e/exploration/m1-test-snippets/` (24 tests Playwright, config `playwright.config.ts`).

**Données synchronisées (base réelle)** : 9 815 stations, 35 701 lignes de prix (dont 4 512 en rupture temporaire), 6 moyennes nationales du 2026-10-20 (gazole 2,367 €/L sur 9 052 stations — identique à l'agrégat officiel), noms/enseignes enrichis : 440 au moment du bilan (les plus proches d'Albi d'abord ; le reste se complète à 120 par passage, ~14 h). Tâche pg_cron vérifiée : passages de 12:20 et 12:30 réussis (HTTP 200).

**Déploiement** : https://plein-et-trajet.vercel.app (Vercel READY). Commit : voir la ligne finale ci-dessous.

**Captures** : 55/55 dans `tests/e2e/delivery/` (le cas d'usage définit 55 captures : 45 d'histoires + 10 transverses ; le « 60 » annoncé ne correspond pas au fichier). Toutes ✓ ; chacune issue d'un `page.screenshot` distinct après assertions DOM.

**Mocks** : US-1.E1 (abort `**/rest/v1/prix*`) et US-1.E2 (réponse vide `**/rest/v1/prix*carburant=eq.E85*`), comme prévu par le cas d'usage. Aucune fixture en base : US-1.E3, US-1.E4, US-2.E1 s'appuient sur de vraies stations du rayon, choisies en base au moment du test.

**Écarts / limites**
- La RPC `stations_autour` ne prend pas le carburant (le plan le prévoyait) : les prix sont lus par `rest/v1/prix?carburant=eq.X`, ce qui est aussi l'URL que les cas US-1.E1/E2 interceptent.
- Préférence carburant mémorisée en `localStorage` (pas de table `preferences` au jalon 1 ; elle viendra avec les voitures au jalon 2).
- Tant qu'une station n'est pas enrichie, son libellé est « Station <ville> ».
- Écran Trajets volontairement minimal (départ, arrivée) : le calcul est au jalon 2.
- Les cas E3/E4 dépendent des données du jour : les extraits se marquent `skip` (et non « passé ») si plus aucune station réelle n'est dans cet état autour d'Albi.

Commit de livraison du code + tests + captures : `7413912` (branche main) ; ce journal est poussé juste après.
