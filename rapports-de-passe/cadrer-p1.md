---
noeud: cadrer
passe: 1
verdict: reussi
duree: une session (~1 h 30)
sous_agents: 0
---

# Cadrer, dessiner, spécifier — passe 1

**Ce que j'ai fait** — Cadrage en 6 questions A/B/C/D sur un squelette republié à chaque réponse ; Anthony a demandé d'arrêter les questions, j'ai tranché le reste (deux onglets, français, sélecteur de carburant). Maquette dual-layer construite, publiée en artifact et en HTTP, validée sans correction. Spécification et pré-vol menés seul, sources réelles testées par téléchargement.

**Ce que je rends**
- `concept.md` : problème, utilisateur, boucle cœur, 9 décisions, 7 refus hors-périmètre.
- `questions-techniques.md` : 6 questions différées, toutes répondues dans `stack-decisions.md`.
- Maquette : 4 écrans, 19 éléments interactifs, 18 histoires v1 ; artifact + https://projets.ingevision.cloud/design/prix-carburant-trajets-2026-10-20-114307/mockup.html ; `validation.md` daté.
- `stack-decisions.md` : pile standard sans écart, 6 tables + RLS, 3 Edge Functions, modèle de consommation.
- `stories.json` : 38 histoires (18 v1 + 12 cas limites + 3 paires + 4 accessibilité + 1 performance), toutes en ÉTANT DONNÉ/QUAND/ALORS ; `ui-coverage.json` sans trou.
- `roadmap.json/html` : 2 jalons, 4 écrans placés une fois, 38 histoires placées (32 + 6 transverses).
- Kit : spec, plan, tasks, rules, architecture ; plans m1/m2 ; 5 fichiers de test + registre.
- `roadmap-approved.json` ; dépôt privé github.com/anthohunt/plein-et-trajet (commit `ceea081`).

**Ce que j'ai trouvé** — Les quatre sources nécessaires existent et répondent sans clé : prix officiels (9 815 stations, mise à jour du jour), ADEME Car Labelling (3 604 versions avec consommations WLTP par phase de vitesse et masse), itinéraire IGN (Albi → Bordeaux 312 km, 81 étapes), altimétrie IGN. Le modèle « physique » demandé est donc réalisable sur données réelles.

**Mes sous-agents** — aucun.

**Ce qui coince** — `projets.ingevision.cloud` n'existait plus depuis la migration du VPS (ni DNS ni conteneur) : recréé (conteneur nginx `cours-public` derrière Traefik, enregistrement A `projets` → 187.7.18.214, certificat Let's Encrypt valide). `flux-local` suppose le laptop (`python`, scp vers le VPS) : sur le VPS j'ai rapatrié et généré le brief à la main. Le skill `webapp-start` cite encore l'ancienne IP du VPS.

**Pour la suite** — Prix réels 2026 nettement au-dessus des exemples de la maquette (E10 ~2,16 €/L, gazole ~2,37 €/L) : la maquette n'est qu'une référence visuelle. Seuls 2 jalons : le troisième envisagé (historique + prix perso) n'avait aucun écran propre, fusionné dans le jalon 2. Les appels IGN se font dans `estimer-trajet` côté serveur.
