# Jalon 3 — Péages, Europe et moteurs — journal

## Timeline
- 2026-10-20 — Passe 6 du nœud construire. Jalons 1 et 2 cochés (dernier commit 821c130). Premier jalon non coché : jalon 3 « Péages, Europe et moteurs » — écran propre S5 Moteurs, écrans traversés S1, S3, S4 ; 15 histoires (US-3.8, 4.4, 4.5, 4.E4, 4.E5, 4.E6, 1.8, 5.1–5.5, 5.E1–5.E3) + 5 transverses.
- Cas d'usage existant : tests/e2e/use-cases/m3-use-case.md — 40 captures d'histoires + 10 transverses = 50 captures attendues, rangées dans tests/e2e/delivery/ (même règle qu'aux jalons 1-2 : le plan cite tests/e2e/screenshots/m3/, delivery/ fait foi).
- Infra réutilisée : Supabase rglrwtkqwihdztgqlbsy, Vercel plein-et-trajet (déploiement au push sur main), .env.local.
- Outillage : pas de Playwright MCP ni de TeamCreate dans la session → bibliothèque Playwright + outil Agent (équipe logique « m3-pipeline »), comme aux jalons 1-2.
- **Clés fournisseurs absentes** : aucune clé PTV, HERE ni Stadia n'existe (cherché dans .env.local, /home/claude/flux/secrets, rapports agents-codex api-*, transcripts). Par décision d'Anthony (stack-decisions.md), ces clés sont collées par lui dans l'écran Moteurs, jamais dans le code. Conséquence : tout ce qui ne dépend pas d'une clé est construit et vérifié sur le vrai backend ; les critères qui exigent une vraie réponse PTV/HERE (US-4.4 montants réels, US-5.4 « Connecté », US-5.5 péages HERE, US-5.E3 bascule) sont construits mais classés BLOQUÉ-CLÉ — aucun mock pour simuler un PASS.
- Bâtisseur dispatché (tâche 1).
- 2026-10-20 — Bâtisseur (tâche 1) : construction puis exploration sur la prod. Détail ci-dessous.

## Builder Summary

**Résultat** : jalon 3 construit et déployé ; les 15 histoires et les 5 transverses sont explorées sur la prod, **52/52 captures** produites (le plan en cite 52 : 42 d'histoires + 10 de transverses, pas 50). Les critères qui exigent une vraie réponse PTV, HERE ou Stadia sont **BLOQUÉ-CLÉ** (aucune clé n'existe) : le code est construit, l'état réel est capturé, rien n'est mocké.

**Code déployé** : front Vercel `8ee7728` (READY) ; Edge Functions déployées par l'API de gestion depuis `15cc243` (dernier commit de code) ; migrations `20261021090000_m3_moteurs_europe.sql` et `20261021090100_cron_m3.sql` appliquées par l'API de gestion.

**Ce qui a été construit**
- Registre des moteurs : tables `moteurs` / `fournisseurs` / `cles_fournisseurs`, clés dans **Supabase Vault** (fonctions `moteur_cle*` réservées au rôle service), RLS `est_admin()` (claim `app_metadata.role = "admin"`). Chaque Edge Function lit son fournisseur et sa clé **à chaque appel** ; chaîne actif → secours, incident et bascule horodatés.
- Écran S5 Moteurs (6 services) + bouton ⚙ visible du seul administrateur + connexion par lien magique (`/admin`) ; fonction `moteurs` (lister / tester par un vrai appel / enregistrer ; seules les 4 dernières lettres d'une clé sortent du serveur). Réglages Auth : `site_url` = la prod, liste de redirections ajoutée.
- Administrateurs : `anthony.hunt@yahoo.fr` (Anthony se connecte par `https://plein-et-trajet.vercel.app/admin`, reçoit le lien, ⚙ ouvre S5) et `m3-admin-test@example.org` (tests, lien généré par `generate_link`).
- `estimer-trajet` : IGN pour un trajet 100 % France (polygone France/Corse), **Valhalla** ailleurs (instance publique FOSSGIS sans clé — politique d'usage lue le 20/10 : faible trafic, ≤ 1 requête/s, User-Agent identifiant, attribution OSM ; Stadia Maps disponible en choisissant le fournisseur et en collant une clé) ; tronçons et litres par pays traversé ; péages **PTV** (prix HT + TVA du pays, table `pays`) et **HERE** (TTC, vignettes exclues) ; absence de péage établie sans fournisseur (aucune autoroute numérotée côté IGN, aucune arête à péage côté Valhalla) ; vignettes (table `vignettes`, déclenchées par km d'autoroute du pays) ; échec des péages = coût carburant + « Péages non disponibles pour l'instant ».
- `lieux` (Photon hors de France, pays d'une position) ; `sync-moyennes-ue` (Bulletin pétrolier UE, xlsx, 28 pays + moyenne UE, SP98/E85 estimés d'après le SP95 du pays) ; `sync-stations-pays` (Espagne, MITECO, 11 261 stations) + relais Vercel `api/relais-es` ; planification pg_cron (Espagne 2 fois/h, Bulletin chaque jour).
- Front : résultat avec Péages, Pays traversés (km, litres, prix du jour, coût, repli « prix non publié — moyenne européenne appliquée »), coût total = carburant + péages ; écran Prix hors de France (stations espagnoles, message « Ce pays ne publie pas les prix station par station » + prix moyen national).

**Tests**
- Vitest : **107/107** (80 de M1-M2 + 27 nouveaux : TVA par pays, péages PTV/HERE, répartition par pays, somme des coûts pays = coût carburant, vignettes, bascule, bulletin, flux espagnol, polyline, France/Europe).
- Extraits Playwright M3 (`tests/e2e/exploration/m3-test-snippets/`, 20 fichiers, un par histoire/transverse) : **42 passés, 4 ignorés** (les 4 histoires BLOQUÉ-CLÉ — ils s'exécutent d'eux-mêmes quand une clé valide existe pour US-4.4 ; US-5.4, US-5.5, US-5.E3 sont des `test.skip` explicites tant qu'aucune clé n'existe) sur la prod ; aucun `page.route` dans M3.
- Régression (même passage complet, `npx playwright test`) : **132 tests = 127 passés + 4 ignorés + 1 échec** ; M2 61/61 ; M1 24/25. L'échec est **M1 US-1.E4** : il exige une rupture de gazole réelle dans les 10 km d'Albi (« fixture nécessaire ») ; la base en compte 590 en France mais aucune ce jour près d'Albi — donnée absente, pas une régression du code. Deux vrais écarts de régression trouvés et corrigés dans le code (pas dans les tests) : arrondi des litres d'un trajet à un seul pays (M2 US-4.2 bornes), puis les propositions de lieux.
- `workers: 1` dans `playwright.config.ts` : les histoires qui modifient la table moteurs ne tournent pas en parallèle d'un calcul de trajet.

**Captures** : 52/52 dans `tests/e2e/delivery/` + 52 brutes dans `tests/e2e/exploration/m3-captures-brutes/` (deux prises de vue distinctes, aucun doublon d'octets, vérifié par empreinte). Aucune manquante. Étiquettes jaunes « Annotation de test » (réponses du serveur, ordre de tabulation, mesure 4G) posées puis retirées par le script, comme au jalon 2.

**BLOQUÉ-CLÉ** (aucune clé PTV / HERE / Stadia) :
- US-4.4 (montants TTC par section et total ajouté) : état réel capturé « Péages non disponibles pour l'instant » ; la partie « Aucun péage sur cet itinéraire 0,00 € » est vérifiée pour de vrai.
- US-5.4 (« Connecté » pour PTV) : état réel « Aucune clé : colle-la d'abord » ; le même test réel est vu « Connecté » sur Valhalla (sans clé).
- US-5.5 (péages HERE après enregistrement) : refus réel de HERE sans clé, PTV reste actif.
- US-5.E3 (bascule réussie PTV → HERE avec l'heure) : la chaîne réelle PTV → HERE est parcourue (deux vrais 401) et l'incident est noté avec l'heure ; la note de bascule réussie n'est pas vue.
- Risque non levable sans clé : les requêtes PTV/HERE suivent la documentation officielle (OpenAPI PTV 1.41, pages HERE v8) mais n'ont jamais renvoyé de 200 ; premier essai d'Anthony = première vérification réelle.

**MOCKED** : aucun dans M3 (US-4.E4 est réel : sans clé active les péages sont réellement indisponibles).

**Écarts au plan, à connaître**
- US-4.E5 : le plan dit « Albi → Milan via Genève » ; le moteur n'a pas d'étape intermédiaire et Albi → Milan passe par la côte. Le test est Albi → Lausanne (traverse réellement la Suisse, ligne « Vignette suisse obligatoire (non comptée) »).
- US-4.E6 : Albi → Belgrade (1 960 km) est refusé par le routeur public (erreur 154, limite de distance) et affiché « Trajet trop long pour le moteur d'itinéraire actuel » ; le test d'E6 part de Trieste (IT, SI, HR, RS).
- US-1.8 : seule l'Espagne est branchée (T3.5 liste d'autres pays : IT, PT, SI, HR, AT, DE, DK, RO, UK non faits) ; ces pays affichent donc « Ce pays ne publie pas… » alors que certains publient. Le serveur du ministère espagnol refuse la connexion TLS de Deno (TLS 1.2 + échange RSA statique) : d'où le relais Node `api/relais-es`.
- T3.7 (véhicules EEA, modèle road-load + Willans) : non construit (aucune histoire ne le porte). Le moteur « Voitures » n'a donc que l'ADEME.
- Prix des stations espagnoles : à défaut de 95 E10, le 95 E5 (compatible) est compté pour « SP95-E10 ».
- Moyennes SP98/E85 hors France : estimées d'après le SP95 du pays et l'écart français (marquées « estime »).
- Performance : 1,99 s (Barcelone) et 2,0 s (Albi) en 4G émulée pour la première liste — sous le budget de 2,5 s mais avec peu de marge.

**Nettoyage** : clés factices supprimées de Vault (0 secret), moteur péages remis à PTV sans clé ni secours, limite d'inscriptions anonymes remise à 30 et relue (30). Les rejeux ont créé des identités et trajets en base de prod (non purgés, comme aux jalons précédents).

**Décisions prises sans pouvoir demander** : fournisseur d'itinéraire par défaut = Valhalla public (sans clé) pour que Barcelone/Milan soient réels dès maintenant ; `/admin` non lié dans l'appli pour la connexion d'Anthony ; trajets historiques enregistrent le coût total (carburant + péages établis).
