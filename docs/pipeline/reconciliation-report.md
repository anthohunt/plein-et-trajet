# Réconciliation — prévu contre livré

Date : 2026-10-22. Code de référence : HEAD `116357c` (prod https://plein-et-trajet.vercel.app, HTTP 200 relu à la réconciliation). Plan de référence : `docs/pipeline/spec.md` (jalons 1-6) et `docs/pipeline/stories.json` (97 histoires, statut V1 de chacune).

## Bilan

| Classe | Nombre |
|---|---|
| Inchangées [UNCHANGED] | 40 |
| Modifiées [MODIFIED] | 18 |
| Nouvelles [NEW] | 4 |
| Retirées [REMOVED] | 39 |

Lecture : le projet a changé de cap le 21/10 (recentrage V1, `v1-recentrage.md`). L'estimation d'un trajet avant de partir et les péages sont sortis ; l'enregistrement d'un trajet réellement roulé, le partage des frais, la carte des stations (Europe et Royaume-Uni) et l'appli Android sont la V1. Les 37 histoires des jalons 1 à 4 remplacées ou retirées ne sont donc pas des oublis : ce sont des décisions d'Anthony.

## Méthode

• Statut V1 de chaque histoire lu dans `stories.json` (posé au jalon 5 depuis les décisions d'Anthony).
• Écarts tirés des limites connues des jalons 5 et 6 (`m5-summary.md`, `m6-summary.md`) et du durcissement r1.
• Chaque correctif du durcissement cité ici relu dans le code à HEAD, pas dans le rapport d'audit : D3 `src/components/BarriereErreur.tsx` (boutons Recharger / Effacer présents) ; D6 `FicheStation.tsx:64` (`services ?? []`) ; D7 `CarteStations.tsx:16` (`setWorkerUrl`) et `package.json` maplibre-gl 6.15.0 ; D9/D15 `vercel.json` (CSP, `immutable`) ; D10 `app.css:353` (`@media (max-height: 500px)`). Routes à HEAD (`src/App.tsx:107-115`) : `/`, `/voiture`, `/en-route`, `/fin`, `/historique`, `/stations`, `/moteurs`, `/admin`.
• CI Android relue par l'API GitHub le 22/10 : les 4 derniers runs (jusqu'à 116357c) échouent sans aucune étape exécutée (facturation). L'APK publié reste celui du run 39710484157 (71f19b3) ; il n'embarque pas les correctifs du durcissement.

## Histoires, une par une

| Id | Titre | Classe | Ce qui a changé, et pourquoi | Test E2E |
|---|---|---|---|---|
| US-1.1 | Ouvrir les prix | [REMOVED] | l'onglet Prix devient l'onglet Stations (T5) (remplacée par V-5.1) | — |
| US-1.2 | Choisir mon carburant | [REMOVED] | sélecteur repris sur T5, carburant de la voiture d'office (remplacée par V-5.2) | — |
| US-1.3 | Voir les stations sur la carte | [REMOVED] | la carte ne se recharge plus seule au déplacement : « Rechercher dans cette zone » (décision 3 d'Anthony) (remplacée par V-5.1, V-5.3) | — |
| US-1.4 | Toucher une pastille | [UNCHANGED] | — | m1-explore.spec.ts |
| US-1.5 | Trier la liste | [REMOVED] | tri repris sur T5 (remplacée par V-5.4) | — |
| US-1.6 | Lire une station dans la liste | [UNCHANGED] | — | m1-explore.spec.ts |
| US-2.1 | Fermer la fiche | [UNCHANGED] | — | m1-explore.spec.ts |
| US-2.2 | Calculer un trajet vers la station | [REMOVED] | l'estimation d'un trajet avant de partir sort de la V1 (décision 2 d'Anthony, 21/10 : « on va rester à ça pour une version 1 ») ; la fiche porte désormais « Utiliser ce prix » (V-5.5) | — |
| US-3.1 | Ouvrir les trajets | [REMOVED] | l'onglet Trajets devient l'accueil Trajet (T1) (remplacée par V-1.1) | — |
| US-3.2 | Saisir le départ | [REMOVED] | l'estimation d'un trajet avant de partir sort de la V1 (décision 2 d'Anthony, 21/10 : « on va rester à ça pour une version 1 ») | — |
| US-3.3 | Saisir l'arrivée | [REMOVED] | l'estimation d'un trajet avant de partir sort de la V1 (décision 2 d'Anthony, 21/10 : « on va rester à ça pour une version 1 ») | — |
| US-3.4 | Choisir ma voiture | [REMOVED] | la voiture se saisit une fois par le code D.2 ou la recherche (décision 6 d'Anthony) (remplacée par V-2.1, V-2.3) | — |
| US-3.5 | Calculer le coût | [REMOVED] | l'estimation d'un trajet avant de partir sort de la V1 (décision 2 d'Anthony, 21/10 : « on va rester à ça pour une version 1 ») | — |
| US-3.6 | Rejouer un ancien trajet | [REMOVED] | l'estimation d'un trajet avant de partir sort de la V1 (décision 2 d'Anthony, 21/10 : « on va rester à ça pour une version 1 ») ; l'historique V1 rouvre un trajet roulé, il ne recalcule pas d'itinéraire | — |
| US-3.7 | Supprimer un trajet | [REMOVED] | suppression reprise sur la fin de trajet rouverte (remplacée par V-6.4) | — |
| US-4.1 | Comprendre le calcul | [REMOVED] | l'estimation d'un trajet avant de partir sort de la V1 (décision 2 d'Anthony, 21/10 : « on va rester à ça pour une version 1 ») (tronçons d'un itinéraire calculé) | — |
| US-4.2 | Mettre mon propre prix | [REMOVED] | prix perso repris sur la fin de trajet, en touchant le compteur (remplacée par V-4.2) | — |
| US-4.3 | Revenir aux trajets | [REMOVED] | l'écran Résultat d'une estimation disparaît ; la fin de trajet revient à l'historique par « ← Historique » (V-6.3) | — |
| US-1.E1 | Source des prix injoignable | [MODIFIED] | Même comportement, sur l'onglet Stations (T5) : l'écran Prix n'existe plus. | m1-explore.spec.ts |
| US-1.E2 | Aucune station pour ce carburant | [UNCHANGED] | — | m1-explore.spec.ts |
| US-1.E3 | Prix ancien signalé | [UNCHANGED] | — | m1-explore.spec.ts |
| US-1.E4 | Station en rupture | [UNCHANGED] | — | m1-explore.spec.ts |
| US-2.E1 | Carburant non vendu dans la fiche | [UNCHANGED] | — | m1-explore.spec.ts |
| US-3.E1 | Lieu introuvable | [REMOVED] | l'estimation d'un trajet avant de partir sort de la V1 (décision 2 d'Anthony, 21/10 : « on va rester à ça pour une version 1 ») | — |
| US-3.E2 | Formulaire incomplet | [REMOVED] | l'estimation d'un trajet avant de partir sort de la V1 (décision 2 d'Anthony, 21/10 : « on va rester à ça pour une version 1 ») | — |
| US-3.E3 | Historique vide | [MODIFIED] | Critère réaligné au jalon 5 sur V-6.1 : l'onglet Historique affiche « Aucun trajet enregistré. » ; l'invitation à calculer un premier trajet a disparu avec l'estimation. | m5-regression.spec.ts |
| US-3.E4 | Voiture absente de la base | [REMOVED] | voiture absente → code D.2 inconnu (remplacée par V-2.E1) | — |
| US-4.E1 | Itinéraire impossible | [REMOVED] | l'estimation d'un trajet avant de partir sort de la V1 (décision 2 d'Anthony, 21/10 : « on va rester à ça pour une version 1 ») | — |
| US-4.E2 | Prix perso invalide | [UNCHANGED] | — | m5-regression.spec.ts |
| US-4.E3 | Calcul trop long | [REMOVED] | l'estimation d'un trajet avant de partir sort de la V1 (décision 2 d'Anthony, 21/10 : « on va rester à ça pour une version 1 ») | — |
| US-1.P1 | Recentrer sur ma position | [UNCHANGED] | — | m1-explore.spec.ts |
| US-3.P1 | Inverser départ et arrivée | [REMOVED] | l'estimation d'un trajet avant de partir sort de la V1 (décision 2 d'Anthony, 21/10 : « on va rester à ça pour une version 1 ») | — |
| US-3.P2 | Changer de voiture | [REMOVED] | « Changer » sur l'accueil (remplacée par V-1.2) | — |
| US-A11Y-001 | Navigation au clavier | [MODIFIED] | Clavier complet, sans piège, anneau de focus 3 px partout (audit a11y). Écart différé (D22) : après « Enregistrer ma voiture », le focus retombe sur la page au lieu d'un titre. | m1-explore.spec.ts |
| US-A11Y-002 | Focus de la fiche | [UNCHANGED] | — | m1-explore.spec.ts |
| US-A11Y-003 | Touche Échap | [MODIFIED] | Échap ferme la fiche station et le champ de prix de la fin de trajet ; les « tronçons dépliés » n'existent plus (estimation retirée). | m1-explore.spec.ts |
| US-A11Y-004 | Libellés lisibles | [UNCHANGED] | — | m1-explore.spec.ts |
| US-PERF-001 | Ouverture rapide | [MODIFIED] | L'appli s'ouvre sur l'accueil Trajet, qui n'a pas de liste de stations : le critère se mesure à l'ouverture de l'onglet Stations. Liste affichée à 1,2 s ; carte prête à 4,1 s en profil mobile à froid (D16, différé). | m1-explore.spec.ts |
| US-3.8 | Partir à l'étranger | [REMOVED] | l'estimation d'un trajet avant de partir sort de la V1 (décision 2 d'Anthony, 21/10 : « on va rester à ça pour une version 1 ») (destination à l'étranger) | — |
| US-4.4 | Voir les péages | [REMOVED] | les péages sortent de la V1 (décision 2 d'Anthony, 21/10) : moteur péages désactivé, aucun appel PTV | — |
| US-4.5 | Voir les pays traversés | [REMOVED] | l'estimation d'un trajet avant de partir sort de la V1 (décision 2 d'Anthony, 21/10 : « on va rester à ça pour une version 1 ») (pays traversés d'un itinéraire) | — |
| US-4.E4 | Péages indisponibles | [REMOVED] | les péages sortent de la V1 (décision 2 d'Anthony, 21/10) : moteur péages désactivé, aucun appel PTV | — |
| US-4.E5 | Vignette sur le trajet | [REMOVED] | les péages sortent de la V1 (décision 2 d'Anthony, 21/10) : moteur péages désactivé, aucun appel PTV (vignettes) | — |
| US-4.E6 | Pays sans prix moyen | [REMOVED] | l'estimation d'un trajet avant de partir sort de la V1 (décision 2 d'Anthony, 21/10 : « on va rester à ça pour une version 1 ») (pays traversés d'un itinéraire) | — |
| US-1.8 | Stations hors de France | [REMOVED] | stations hors de France reprises sur T5 (remplacée par V-5.7) | — |
| US-5.1 | Ouvrir les moteurs | [MODIFIED] | Plus de bouton ⚙ : l'écran Moteurs n'a plus aucun lien dans l'appli et liste 7 services (Base véhicules EEA ajoutée) ; il reste joignable aux adresses /admin et /moteurs, réservé à Anthony (clés Fuel Finder et synchros). | archivé (tests/e2e/archive, non joué) |
| US-5.2 | Choisir le fournisseur | [MODIFIED] | Écran hors navigation (/admin). Le moteur péages est hors service en V1. | archivé (tests/e2e/archive, non joué) |
| US-5.3 | Coller la clé | [MODIFIED] | Écran hors navigation (/admin). Comportement de la clé inchangé. | archivé (tests/e2e/archive, non joué) |
| US-5.4 | Tester la connexion | [MODIFIED] | Écran hors navigation (/admin). Le test PTV n'a plus d'usage en V1 (péages hors service). | archivé (tests/e2e/archive, non joué) |
| US-5.5 | Enregistrer le moteur | [REMOVED] | Les péages ne se calculent plus (estimation et péages hors V1) : basculer le fournisseur des péages ne change rien de visible. | — |
| US-5.E1 | Moteurs invisibles aux visiteurs | [MODIFIED] | Il n'y a plus de bouton à cacher : la protection repose sur le serveur (lecture et écriture des moteurs refusées hors administrateur). | archivé (tests/e2e/archive, non joué) |
| US-5.E2 | Clé refusée | [MODIFIED] | Écran hors navigation (/admin). | archivé (tests/e2e/archive, non joué) |
| US-5.E3 | Bascule de secours | [REMOVED] | Même raison : aucun calcul de péages en V1, donc aucune bascule de secours à constater. | — |
| US-5.6 | Où trouver ma clé | [MODIFIED] | Écran hors navigation (/admin). | archivé (tests/e2e/archive, non joué) |
| US-6.1 | Enregistrer en roulant | [REMOVED] | « Enregistrer en roulant » devient le bouton Démarrer de l'accueil (remplacée par V-1.3) | — |
| US-6.2 | Suivre en direct | [REMOVED] | suivi en direct repris sur T3 (remplacée par V-3.1) | — |
| US-6.3 | Garder l'écran allumé | [REMOVED] | l'appli Android enregistre écran éteint ; la version web garde le verrou d'écran (remplacée par V-3.2) | — |
| US-6.4 | Mettre en pause | [REMOVED] | pause reprise sur T3 et dans la notification (remplacée par V-3.4, V-3.3) | — |
| US-6.5 | Arrêter et voir le coût | [REMOVED] | Arrêter ouvre la fin de trajet T4 (remplacée par V-3.5) | — |
| US-6.6 | Voir ma courbe de vitesse | [REMOVED] | courbe de vitesse reprise sur T4, avec la courbe de consommation (remplacée par V-4.5, V-4.6) | — |
| US-6.E1 | Localisation refusée | [MODIFIED] | Le refus de localisation se joue au « Démarrer » de l'accueil (T1), plus sur « Enregistrer en roulant » de l'écran Trajets. Joué sur la version web seulement (pas au dialogue natif Android). | m5-regression.spec.ts |
| US-6.E2 | Trajet trop court | [MODIFIED] | Le message « trop court » se joue à « Arrêter » de l'écran En route (T3), plus sur « Arrêter et voir le coût ». | m5-regression.spec.ts |
| US-6.E3 | Reprendre après fermeture | [MODIFIED] | Pas de proposition « reprendre ou arrêter » : l'écran En route rouvre directement le trajet en cours, distance conservée, avec Pause et Arrêter (V-1.1) ; sur Android, par le service natif. | m5-regression.spec.ts |
| US-3.9 | Aller au Royaume-Uni | [REMOVED] | l'estimation d'un trajet avant de partir sort de la V1 (décision 2 d'Anthony, 21/10 : « on va rester à ça pour une version 1 ») (destination au Royaume-Uni) | — |
| US-1.9 | Stations au Royaume-Uni | [REMOVED] | stations du Royaume-Uni reprises sur T5 (remplacée par V-5.7) | — |
| V-1.1 | Ouvrir l'appli | [UNCHANGED] | — | m5-explore.spec.ts |
| V-1.2 | Voir ma voiture | [MODIFIED] | L'accueil affiche « Renault Clio » et « 1.2 · 118 ch · 2017 · SP95-E10 », pas « Renault Clio IV » ni « 1.2 TCe 120 » : la base EEA ne porte pas les noms commerciaux. Les deux autres critères sont tenus. | m5-explore.spec.ts |
| V-1.3 | Démarrer | [UNCHANGED] | — | m5-explore.spec.ts |
| V-2.1 | Saisir le code D.2 | [MODIFIED] | La fiche affiche « Renault Clio 1.2 · 118 ch » et non « 1.2 TCe 120 » : la base EEA ne porte pas les noms commerciaux (même écart que V-1.2, relevé par l'audit final). Les données (2017, 87 kW, 1 197 cm³, 1 165 kg, SP95-E10, 118 g/km) et les deux autres critères sont tenus. | m5-explore.spec.ts |
| V-2.2 | Vérifier et enregistrer | [UNCHANGED] | — | m5-explore.spec.ts |
| V-2.3 | Chercher sans la carte grise | [UNCHANGED] | — | m5-explore.spec.ts |
| V-2.E1 | Code inconnu | [UNCHANGED] | — | m5-explore.spec.ts |
| V-3.1 | Suivre en direct | [UNCHANGED] | — | m5-explore.spec.ts |
| V-3.2 | Écran éteint, Waze devant | [UNCHANGED] | — | émulateur CI (tests/android/m6-emulateur.mjs) + m6-explore (partie web) |
| V-3.3 | Piloter depuis la barre du téléphone | [MODIFIED] | Notification tenue (vitesse, km, €, Pause/Reprendre/Arrêter, constatée sur l'émulateur de la CI). Écart connu non corrigé : si un bouton de la notification est touché juste après une relance du service par le système, avant son premier relevé, la distance de la notification oublie 2 à 3 relevés (l'écran recalcule juste à la réouverture). Vérifiée sur émulateur seulement. | émulateur CI (tests/android/m6-emulateur.mjs) + m6-explore (partie web) |
| V-3.4 | Mettre en pause | [UNCHANGED] | — | m5-explore.spec.ts |
| V-3.5 | Arrêter | [UNCHANGED] | — | m5-explore.spec.ts |
| V-3.E1 | Oubli d'arrêter | [UNCHANGED] | — | m5-explore.spec.ts |
| V-3.E2 | GPS perdu | [UNCHANGED] | — | m5-explore.spec.ts |
| V-4.1 | Prix de l'essence | [UNCHANGED] | — | m5-explore.spec.ts |
| V-4.2 | Mettre mon prix | [UNCHANGED] | — | m5-explore.spec.ts |
| V-4.3 | Coût de l'essence | [UNCHANGED] | — | m5-explore.spec.ts |
| V-4.4 | Partager | [UNCHANGED] | — | m5-explore.spec.ts |
| V-4.5 | Courbe de vitesse | [UNCHANGED] | — | m5-explore.spec.ts |
| V-4.6 | Courbe de consommation | [UNCHANGED] | — | m5-explore.spec.ts |
| V-4.7 | Enregistrer ou supprimer | [UNCHANGED] | — | m5-explore.spec.ts |
| V-6.1 | Ouvrir l'historique | [UNCHANGED] | — | m5-explore.spec.ts |
| V-6.2 | Totaux | [UNCHANGED] | — | m5-explore.spec.ts |
| V-6.3 | Lire un trajet | [UNCHANGED] | — | m5-explore.spec.ts |
| V-6.4 | Revoir, corriger, supprimer | [UNCHANGED] | — | m5-explore.spec.ts |
| V-5.1 | Stations autour de moi | [UNCHANGED] | — | m5-explore.spec.ts |
| V-5.2 | Choisir le carburant | [UNCHANGED] | — | m5-explore.spec.ts |
| V-5.3 | Rechercher dans cette zone | [UNCHANGED] | — | m5-explore.spec.ts |
| V-5.4 | Trier | [UNCHANGED] | — | m5-explore.spec.ts |
| V-5.5 | Utiliser ce prix | [UNCHANGED] | — | m5-explore.spec.ts |
| V-5.6 | Trajet en cours | [UNCHANGED] | — | m5-explore.spec.ts |
| V-5.7 | Europe et Royaume-Uni | [UNCHANGED] | — | m5-explore.spec.ts |
| US-NEW-1 | Écran d'erreur récupérable | [NEW] | durcissement D3 (60be123) : toute exception de rendu blanchissait l'appli | à couvrir par la passe finale |
| US-NEW-2 | Stations sur un écran bas | [NEW] | durcissement D10 (d67e56f) : la liste tombait à 0 px de haut | à couvrir par la passe finale |
| US-NEW-3 | Autorisations Android au premier trajet | [NEW] | jalon 6 : exigé par le service de premier plan Android ; absent des histoires V-x | à couvrir par la passe finale |
| US-NEW-4 | Installer l'appli Android par un lien | [NEW] | jalon 6 : distribution hors Play Store (config.json) | à couvrir par la passe finale |

## Ce qui a été écarté (rappel)

• Estimation d'un trajet avant de partir (jalons 2-4 : saisie départ / arrivée, calcul, tronçons, pays traversés, Royaume-Uni) — décision 2 d'Anthony, 21/10.
• Péages et vignettes (jalon 3) — même décision ; moteur péages hors service, aucun appel PTV, clés et Vault intacts.
• Écran Moteurs dans la navigation — absent de la maquette V1 ; gardé à /admin pour Anthony.
• Durcissement : P2 différés D12-D14, D16-D22 ; 23 P3 acceptés (`hardening-r1-consolidated.md`).

## Limites qui pèsent sur la vérification finale

• **Android** : aucune capture Android ne peut être refaite (CI bloquée, ni Java ni SDK sur le VPS). Les étapes Android (V-3.2 pas 1-4, V-3.3, US-NEW-3, US-NEW-4) gardent les captures de la CI du jalon 6, signalées comme telles.
• **Écran Moteurs** : la passe finale ne colle ni ne teste de clé de production (Vault et `cles_fournisseurs` ne sont pas touchés).

## Après la passe finale (22/10)

• Écarts de texte constatés par la vérification finale (`final-verification.md`) reportés dans les plans de cas d'usage et, pour US-5.1, US-6.E3 et US-NEW-1, dans ce rapport et `spec-final.md`. Aucun ne change de classe. Aucun défaut de l'appli constaté.
