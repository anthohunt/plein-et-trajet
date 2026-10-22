# Jalon 5 — V1 recentrée : plan de cas d'usage

**Démonstration** : Sur l'appli web déployée : j'enregistre ma Clio par son code D.2 « 5RBU0C » (base EEA), je touche Démarrer, je roule (vrai tracé GPS Albi → Toulouse rejoué), je passe dans Stations, je déplace la carte vers Montauban et je touche « Rechercher dans cette zone », je prends le prix d'une station, je reviens au trajet, je mets en pause puis reprends, j'arrête : la fin de trajet montre le prix, le coût, la part à 3 personnes, les courbes de vitesse et de consommation ; j'enregistre et je retrouve le trajet dans l'Historique avec ses totaux. Aucun péage nulle part, aucun appel PTV.

**Écrans possédés** : T1 Trajet, T2 Ma voiture, T3 En route, T4 Fin de trajet, T5 Stations, T6 Historique · traversés : aucun

Référence visuelle : `docs/pipeline/design/mockup.html` (maquette V1 validée le 2026-10-21). Exécuté sur l'appli DÉPLOYÉE (https://plein-et-trajet.vercel.app), téléphone émulé par Playwright (viewport 390×844, `hasTouch`). Captures dans `tests/e2e/screenshots/m5/`.

**Ce qui est réel, ce qui est rejoué** :
- Base véhicules : vraie base EEA CO2 cars (Discodata), interrogée par l'Edge Function `voiture-eea` ; la Clio de référence est `R 5RBU 5RBU0C` (2017, 87 kW, 1 197 cm³, 1 165 kg, 118 g/km NEDC), vérifiée à la main le 2026-10-21. Une version déjà en cache (`versions_eea`) et une version jamais demandée sont toutes deux testées.
- Prix : vraies moyennes du jour (`moyennes_nationales`, pays FR) et vraies stations (`stations`/`prix`) ; la station de « Utiliser ce prix » est la première de la liste triée « Moins cher » à Montauban, son prix est lu à l'écran puis comparé au coût.
- Trajet roulé : le tracé GPS réel `tests/e2e/fixtures/albi-toulouse.gpx` (1 point/s) rejoué par `context.setGeolocation` à chaque seconde, accéléré ×20 par l'horloge simulée de Playwright (`page.clock`) — c'est la seule simulation. Les cas « immobile 10 min » et « tunnel » utilisent deux tracés dérivés du même fichier, fabriqués par `tests/e2e/fixtures/derive-gpx.mjs` (arrêt de 11 min sur place ; trou de 90 s sur 3 km) et commités.
- Péages : contrôle négatif. Pendant tout le parcours, Playwright journalise les requêtes réseau : aucune vers `api.myptv.com` ni vers la fonction de péages ; aucun texte « péage » à l'écran.

**Contrôles chiffrés (Vitest, `tests/unit/m5-*.test.ts`)** : coût = litres × prix au centime ; part = coût ÷ personnes au centime ; moyenne de la courbe de conso = litres ÷ km × 100 à 0,1 près ; pause : 0 m et 0 L comptés ; arrêt automatique à 10 min d'immobilité exactement, arrivée datée du début de l'immobilité ; trou GPS de 3 km comblé à ± 1 % ; agrégation EEA (mode pondéré par les immatriculations) sur 3 codes D.2 réels ; phases de conso dérivées de Enedc/Ewltp/Fc : moyenne combinée retrouvée à ± 0,1 L/100 km.

## V-1.1 — Ouvrir l'appli

En tant que conducteur, j'ouvre l'appli et je tombe sur l'onglet Trajet : ma voiture et le bouton Démarrer. (élément `onglet-trajet`)

1. Partir de : une voiture déjà enregistrée sur ce téléphone (écran Trajet) — capture `V-1.1-01-avant.png`
2. Faire : j'ouvre l'appli ; constater : l'onglet Trajet est sélectionné et montre au centre ma voiture (marque, modèle, version, année, carburant) et le bouton rond « Démarrer », sans prix ni nombre de personnes — capture `V-1.1-02-apres.png`
3. Partir de : aucune voiture enregistrée (premier lancement) (écran Trajet) — capture `V-1.1-03-avant.png`
4. Faire : j'ouvre l'appli ; constater : l'onglet Trajet invite à enregistrer ma voiture et « Démarrer » ouvre Ma voiture au lieu de lancer un trajet — capture `V-1.1-04-apres.png`
5. Partir de : un trajet en cours d'enregistrement (écran Trajet) — capture `V-1.1-05-avant.png`
6. Faire : je touche l'onglet Trajet ; constater : l'écran En route s'affiche, pas l'accueil — capture `V-1.1-06-apres.png`

## V-1.2 — Voir ma voiture

En tant que conducteur, je vois la voiture que j'ai enregistrée une fois pour toutes, et je peux la changer. (élément `ma-voiture`)

1. Partir de : la Renault Clio 1.2 (118 ch) de 2017, code 5RBU0C, enregistrée (écran Trajet) — capture `V-1.2-01-avant.png`
2. Faire : l'accueil s'affiche ; constater : je lis « Renault Clio » et « 1.2 · 118 ch · 2017 · SP95-E10 » (noms de la base EEA) — capture `V-1.2-02-apres.png`
3. Partir de : l'accueil (écran Trajet) — capture `V-1.2-03-avant.png`
4. Faire : je touche « Changer » (changer-voiture) ; constater : l'écran Ma voiture s'ouvre avec ses champs vides — capture `V-1.2-04-apres.png`
5. Partir de : l'appli fermée puis rouverte (écran Trajet) — capture `V-1.2-05-avant.png`
6. Faire : l'accueil s'affiche ; constater : la même voiture est rappelée sans rien ressaisir (gardée sur le téléphone, sans compte) — capture `V-1.2-06-apres.png`

## V-1.3 — Démarrer

En tant que conducteur, je touche Démarrer en partant pour que tout le trajet soit mesuré. (élément `bouton-demarrer`)

1. Partir de : une voiture enregistrée et la localisation autorisée (écran Trajet) — capture `V-1.3-01-avant.png`
2. Faire : je touche « Démarrer » ; constater : l'écran En route s'ouvre, l'indicateur « Enregistrement » clignote et la première position GPS est enregistrée en moins de 10 s — capture `V-1.3-02-apres.png`
3. Partir de : la localisation refusée (écran Trajet) — capture `V-1.3-03-avant.png`
4. Faire : je touche « Démarrer » ; constater : un message dit que l'enregistrement a besoin de la localisation et comment l'autoriser, et aucun trajet n'est créé — capture `V-1.3-04-apres.png`

## V-2.1 — Saisir le code D.2

En tant que conducteur, je recopie le code D.2 de ma carte grise pour que l'appli connaisse exactement ma version de moteur. (élément `champ-d2`)

1. Partir de : l'écran Ma voiture (écran Ma voiture) — capture `V-2.1-01-avant.png`
2. Faire : je tape « 5RBU0C » ou « R 5RBU 5RBU0C » dans le champ D.2 ; constater : la fiche Renault Clio 1.2 · 118 ch s'affiche avec les données de la base européenne EEA : 2017, 87 kW (118 ch), 1 197 cm³, 1 165 kg, SP95-E10, 118 g/km — capture `V-2.1-02-apres.png`
3. Partir de : un code partagé par plusieurs versions (marques, années ou masses différentes) (écran Ma voiture) — capture `V-2.1-03-avant.png`
4. Faire : je le tape ; constater : l'appli liste les versions correspondantes (marque, modèle, année, puissance, masse), la plus immatriculée en tête, et je choisis la mienne — capture `V-2.1-04-apres.png`
5. Partir de : un code tapé en minuscules ou avec des espaces (écran Ma voiture) — capture `V-2.1-05-avant.png`
6. Faire : il est cherché ; constater : il est reconnu comme écrit en majuscules sans espaces — capture `V-2.1-06-apres.png`

## V-2.2 — Vérifier et enregistrer

En tant que conducteur, je vérifie la fiche de ma voiture puis je l'enregistre une fois pour toutes. (élément `enregistrer-voiture`)

1. Partir de : la fiche de ma version affichée (écran Ma voiture) — capture `V-2.2-01-avant.png`
2. Faire : je touche « Enregistrer ma voiture » ; constater : l'accueil s'ouvre avec cette voiture, et elle reste mémorisée sur le téléphone après fermeture de l'appli — capture `V-2.2-02-apres.png`
3. Partir de : aucune version identifiée (écran Ma voiture) — capture `V-2.2-03-avant.png`
4. Faire : je regarde « Enregistrer ma voiture » ; constater : le bouton est désactivé — capture `V-2.2-04-apres.png`

## V-2.3 — Chercher sans la carte grise

En tant que conducteur sans ma carte grise sous la main, je cherche ma voiture par son nom, son année et sa puissance. (élément `recherche-voiture`)

1. Partir de : le champ « Nom, année, puissance » (écran Ma voiture) — capture `V-2.3-01-avant.png`
2. Faire : je tape « clio 2017 120 » ; constater : la liste propose les versions de Clio immatriculées en 2017 autour de 120 ch (± 5 ch), la plus immatriculée en tête, chacune avec année, kW et carburant — capture `V-2.3-02-apres.png`
3. Partir de : une suggestion (écran Ma voiture) — capture `V-2.3-03-avant.png`
4. Faire : je la touche ; constater : sa fiche s'affiche comme avec le code D.2 et « Enregistrer ma voiture » s'active — capture `V-2.3-04-apres.png`

## V-2.E1 — Code inconnu

En tant que conducteur, si mon code D.2 n'est pas reconnu, je sais quoi faire. (élément `champ-d2`)

1. Partir de : le champ D.2 (écran Ma voiture) — capture `V-2.E1-01-avant.png`
2. Faire : je tape un code de 6 caractères ou plus absent de la base EEA (ex. « ZZ9999 ») ; constater : « Code introuvable. Vérifie la case D.2, ou cherche par nom ci-dessous. » s'affiche et « Enregistrer ma voiture » reste désactivé — capture `V-2.E1-02-apres.png`
3. Partir de : la base européenne injoignable (écran Ma voiture) — capture `V-2.E1-03-avant.png`
4. Faire : je tape un code ; constater : un message dit que la base ne répond pas, avec « Réessayer », sans effacer ma saisie — capture `V-2.E1-04-apres.png`

## V-3.1 — Suivre en direct

En tant que conducteur, je suis en direct ma vitesse, les km, les litres et les euros d'essence depuis le départ. (élément `vitesse-direct`)

1. Partir de : un enregistrement en cours (écran En route) — capture `V-3.1-01-avant.png`
2. Faire : je roule ; constater : la vitesse (km/h) et sa courbe des dernières minutes se mettent à jour au moins toutes les 2 s, et km, litres, € essence, durée, km/h moyens et L/100 km augmentent en conséquence — capture `V-3.1-02-apres.png`
3. Partir de : aucun prix choisi (écran En route) — capture `V-3.1-03-avant.png`
4. Faire : le coût en direct s'affiche ; constater : il est calculé au prix moyen du jour du pays de départ pour le carburant de ma voiture — capture `V-3.1-04-apres.png`
5. Partir de : un prix pris sur une station (« Utiliser ce prix ») (écran En route) — capture `V-3.1-05-avant.png`
6. Faire : le coût en direct s'affiche ; constater : il utilise ce prix — capture `V-3.1-06-apres.png`

## V-3.4 — Mettre en pause

En tant que conducteur, je mets en pause pendant un arrêt (station, repas) sans compter de distance ni d'essence. (élément `bouton-pause`)

1. Partir de : un enregistrement en cours (écran En route) — capture `V-3.4-01-avant.png`
2. Faire : je touche « Pause » ; constater : l'indicateur passe à « En pause », la distance et les litres cessent d'augmenter et le bouton devient « Reprendre » — capture `V-3.4-02-apres.png`
3. Partir de : une pause pendant laquelle la voiture s'est déplacée de 2 km (écran En route) — capture `V-3.4-03-avant.png`
4. Faire : je touche « Reprendre » ; constater : ces 2 km ne sont ni comptés ni chiffrés — capture `V-3.4-04-apres.png`

## V-3.5 — Arrêter

En tant que conducteur, j'arrête l'enregistrement à l'arrivée et j'obtiens la fin de trajet. (élément `bouton-arreter`)

1. Partir de : un enregistrement de plus de 1 km (écran En route) — capture `V-3.5-01-avant.png`
2. Faire : je touche « Arrêter » ; constater : la fin de trajet s'ouvre avec « Départ → Arrivée » (lieux retrouvés par géocodage inverse), la date, la durée, les litres, les km et les L/100 km moyens — capture `V-3.5-02-apres.png`
3. Partir de : un enregistrement de moins de 1 km (écran En route) — capture `V-3.5-03-avant.png`
4. Faire : je touche « Arrêter » ; constater : un message dit que le trajet est trop court et rien n'est ajouté à l'historique — capture `V-3.5-04-apres.png`
5. Partir de : aucun réseau à l'arrêt (écran En route) — capture `V-3.5-05-avant.png`
6. Faire : la fin de trajet s'ouvre ; constater : litres et coût sont calculés sur le téléphone, et les noms des lieux se complètent au retour du réseau — capture `V-3.5-06-apres.png`

## V-3.E1 — Oubli d'arrêter

En tant que conducteur qui a oublié d'arrêter, je ne compte pas des heures de stationnement dans mon trajet. (élément `bouton-arreter`)

1. Partir de : un enregistrement en cours (écran En route) — capture `V-3.E1-01-avant.png`
2. Faire : la vitesse reste sous 3 km/h et la position à moins de 50 m pendant 10 min ; constater : le trajet cesse de compter et l'écran affiche « Trajet arrêté : immobile depuis 10 min » avec « Reprendre » et « C'est fini » — capture `V-3.E1-02-apres.png`
3. Partir de : cette alerte (écran En route) — capture `V-3.E1-03-avant.png`
4. Faire : je touche « C'est fini » ; constater : la fin de trajet s'ouvre avec une arrivée datée du début de l'immobilité : les 10 min ne comptent pas dans la durée — capture `V-3.E1-04-apres.png`
5. Partir de : cette alerte (écran En route) — capture `V-3.E1-05-avant.png`
6. Faire : je touche « Reprendre » ; constater : l'enregistrement repart sans perdre les points d'avant — capture `V-3.E1-06-apres.png`

## V-3.E2 — GPS perdu

En tant que conducteur qui passe un tunnel, je ne perds pas les kilomètres sans GPS. (élément `gps-perdu`)

1. Partir de : un enregistrement en cours (écran En route) — capture `V-3.E2-01-avant.png`
2. Faire : aucune position n'arrive pendant plus de 15 s ; constater : « GPS perdu (tunnel) · la distance est complétée à la sortie » s'affiche — capture `V-3.E2-02-apres.png`
3. Partir de : le signal revenu après un tunnel de 3 km (écran En route) — capture `V-3.E2-03-avant.png`
4. Faire : la position suivante arrive ; constater : la distance entre la dernière position d'avant et la première d'après est ajoutée, à la vitesse moyenne du passage, et le message disparaît — capture `V-3.E2-04-apres.png`

## V-4.1 — Prix de l'essence

En tant que conducteur à l'arrivée, je vois le prix de l'essence utilisé : la moyenne du jour pour le carburant de ma voiture. (élément `prix-apres`)

1. Partir de : la fin d'un trajet en Clio (SP95-E10) parti de France (écran Fin de trajet) — capture `V-4.1-01-avant.png`
2. Faire : l'écran s'ouvre ; constater : le sélecteur de carburant (carburant-apres : Gazole, SP95-E10, SP95, SP98, E85, GPLc) a SP95-E10 choisi et le prix affiché est la « Moyenne France du jour » de ce carburant, à 3 décimales — capture `V-4.1-02-apres.png`
3. Partir de : ce sélecteur (écran Fin de trajet) — capture `V-4.1-03-avant.png`
4. Faire : je touche Gazole ; constater : le prix devient la moyenne du jour du gazole et le coût est recalculé — capture `V-4.1-04-apres.png`
5. Partir de : un départ hors de France (écran Fin de trajet) — capture `V-4.1-05-avant.png`
6. Faire : l'écran s'ouvre ; constater : le prix est la moyenne du jour du pays de départ et le libellé nomme ce pays — capture `V-4.1-06-apres.png`

## V-4.2 — Mettre mon prix

En tant que conducteur qui connaît le prix payé, je remplace la moyenne par mon prix en touchant le compteur. (élément `prix-apres`)

1. Partir de : la fin de trajet (écran Fin de trajet) — capture `V-4.2-01-avant.png`
2. Faire : je touche le compteur du prix, tape 1,989 et valide ; constater : le libellé devient « Mon prix », le coût est recalculé à 1,989 €/L et « Revenir à la moyenne » apparaît — capture `V-4.2-02-apres.png`
3. Partir de : mon prix saisi (écran Fin de trajet) — capture `V-4.2-03-avant.png`
4. Faire : je touche « Revenir à la moyenne » ; constater : la moyenne du jour revient, et le coût avec — capture `V-4.2-04-apres.png`
5. Partir de : le champ du prix ouvert (écran Fin de trajet) — capture `V-4.2-05-avant.png`
6. Faire : j'appuie sur Échap ; constater : le prix d'avant reste — capture `V-4.2-06-apres.png`

## V-4.3 — Coût de l'essence

En tant que conducteur, je lis le coût exact de l'essence dépensée sur le trajet. (élément `cout-trajet`)

1. Partir de : 41,2 L consommés et un prix de 2,161 €/L (écran Fin de trajet) — capture `V-4.3-01-avant.png`
2. Faire : la fin de trajet s'affiche ; constater : le coût affiché est « 89,03 € essence » (litres × prix, arrondi au centime) — capture `V-4.3-02-apres.png`
3. Partir de : le prix ou le carburant changé (écran Fin de trajet) — capture `V-4.3-03-avant.png`
4. Faire : le changement est fait ; constater : le coût est recalculé aussitôt, sans réseau — capture `V-4.3-04-apres.png`

## V-4.4 — Partager

En tant que conducteur qui partage les frais, j'indique le nombre de personnes et je lis la part de chacun (part-personne). (élément `personnes-apres`)

1. Partir de : un coût de 89,03 € (écran Fin de trajet) — capture `V-4.4-01-avant.png`
2. Faire : je passe le nombre de personnes à 3 avec « + » ; constater : la part affichée est « 29,68 € chacun » — capture `V-4.4-02-apres.png`
3. Partir de : 1 personne (écran Fin de trajet) — capture `V-4.4-03-avant.png`
4. Faire : l'écran s'affiche ; constater : le texte dit « Seul : tout pour toi. », « − » ne descend pas sous 1 et « + » ne dépasse pas 9 — capture `V-4.4-04-apres.png`

## V-4.5 — Courbe de vitesse

En tant que conducteur, je revois ma vitesse au fil du trajet. (élément `courbe-vitesse`)

1. Partir de : un trajet enregistré (écran Fin de trajet) — capture `V-4.5-01-avant.png`
2. Faire : la fin de trajet s'affiche ; constater : la courbe de vitesse couvre tout le trajet (600 points au plus), avec la vitesse moyenne sur le temps roulé (pauses exclues) et le nombre d'accélérations — capture `V-4.5-02-apres.png`

## V-4.6 — Courbe de consommation

En tant que conducteur, je vois où j'ai le plus consommé, en litres aux 100 km. (élément `courbe-conso`)

1. Partir de : un trajet enregistré (écran Fin de trajet) — capture `V-4.6-01-avant.png`
2. Faire : la fin de trajet s'affiche ; constater : la courbe de consommation en L/100 km couvre tout le trajet avec sa moyenne et sa pointe, et la moyenne affichée égale litres totaux ÷ km × 100 (à 0,1 près) — capture `V-4.6-02-apres.png`

## V-4.7 — Enregistrer ou supprimer

En tant que conducteur, je décide de garder ce trajet dans l'historique ou de l'oublier. (élément `enregistrer-ou-supprimer`)

1. Partir de : un trajet qui vient d'être arrêté (écran Fin de trajet) — capture `V-4.7-01-avant.png`
2. Faire : je touche « Enregistrer » ; constater : l'onglet Historique s'ouvre avec ce trajet en tête, avec le prix, le carburant et le nombre de personnes choisis — capture `V-4.7-02-apres.png`
3. Partir de : un trajet qui vient d'être arrêté (écran Fin de trajet) — capture `V-4.7-03-avant.png`
4. Faire : je touche « Supprimer » ; constater : il est oublié (ses points effacés du téléphone), l'accueil s'ouvre et il n'apparaît pas dans l'historique — capture `V-4.7-04-apres.png`
5. Partir de : un trajet arrêté puis l'appli fermée avant de choisir (écran Fin de trajet) — capture `V-4.7-05-avant.png`
6. Faire : je la rouvre ; constater : la fin de ce trajet revient avec les deux boutons — capture `V-4.7-06-apres.png`

## V-6.1 — Ouvrir l'historique

En tant que conducteur, j'ouvre l'historique des trajets que j'ai faits. (élément `onglet-historique`)

1. Partir de : des trajets enregistrés en septembre et en octobre 2026 (écran Historique) — capture `V-6.1-01-avant.png`
2. Faire : je touche l'onglet Historique ; constater : ils sont listés du plus récent au plus ancien, sous « Octobre 2026 » puis « Septembre 2026 » — capture `V-6.1-02-apres.png`
3. Partir de : aucun trajet enregistré (écran Historique) — capture `V-6.1-03-avant.png`
4. Faire : j'ouvre l'onglet ; constater : « Aucun trajet enregistré. » s'affiche et les totaux sont à 0 — capture `V-6.1-04-apres.png`

## V-6.2 — Totaux

En tant que conducteur, je vois combien de trajets, de km et d'euros d'essence j'ai cumulés. (élément `totaux-historique`)

1. Partir de : 4 trajets de 77, 152, 245 et 243 km (écran Historique) — capture `V-6.2-01-avant.png`
2. Faire : l'historique s'affiche ; constater : les totaux montrent 4 trajets, 717 km et la somme de leurs coûts en € essence — capture `V-6.2-02-apres.png`
3. Partir de : un trajet corrigé ou supprimé (écran Historique) — capture `V-6.2-03-avant.png`
4. Faire : je reviens à l'historique ; constater : les totaux sont recalculés — capture `V-6.2-04-apres.png`

## V-6.3 — Lire un trajet

En tant que conducteur, je lis chaque trajet de l'historique en une ligne. (élément `historique`)

1. Partir de : un trajet enregistré à 3 personnes (écran Historique) — capture `V-6.3-01-avant.png`
2. Faire : je lis sa ligne ; constater : elle donne la date, « Départ → Arrivée », les km, le coût total et « X € chacun » ; pour un trajet seul, la part n'est pas affichée — capture `V-6.3-02-apres.png`
3. Partir de : une ligne (écran Historique) — capture `V-6.3-03-avant.png`
4. Faire : je la touche ; constater : la fin de ce trajet se rouvre, onglet Historique sélectionné, avec « ← Historique » — capture `V-6.3-04-apres.png`

## V-6.4 — Revoir, corriger, supprimer

En tant que conducteur, je corrige après coup le prix ou le nombre de personnes d'un trajet, ou je le supprime. (élément `supprimer-trajet`)

1. Partir de : un trajet rouvert depuis l'historique (écran Fin de trajet) — capture `V-6.4-01-avant.png`
2. Faire : je change son prix, son carburant ou son nombre de personnes ; constater : la correction est gardée et l'historique la montre au retour — capture `V-6.4-02-apres.png`
3. Partir de : un trajet rouvert (écran Fin de trajet) — capture `V-6.4-03-avant.png`
4. Faire : je touche « Supprimer ce trajet » ; constater : il disparaît de l'historique et des totaux — capture `V-6.4-04-apres.png`

## V-5.1 — Stations autour de moi

En tant que conducteur en route, j'ouvre les stations autour de moi pour trouver de l'essence pas trop chère. (élément `onglet-stations`)

1. Partir de : la position autorisée (écran Stations) — capture `V-5.1-01-avant.png`
2. Faire : je touche l'onglet Stations ; constater : la carte centrée sur ma position et la liste des stations autour s'affichent avec leurs prix officiels du jour — capture `V-5.1-02-apres.png`
3. Partir de : un trajet en cours (écran Stations) — capture `V-5.1-03-avant.png`
4. Faire : j'ouvre l'onglet Stations puis reviens au trajet ; constater : l'enregistrement n'a pas été interrompu (la distance a continué de croître) — capture `V-5.1-04-apres.png`

## V-5.2 — Choisir le carburant

En tant que conducteur, je vois d'office les prix du carburant de ma voiture, et je peux en changer. (élément `selecteur-carburant`)

1. Partir de : une Clio SP95-E10 enregistrée (écran Stations) — capture `V-5.2-01-avant.png`
2. Faire : j'ouvre l'onglet Stations ; constater : SP95-E10 est choisi d'office — capture `V-5.2-02-apres.png`
3. Partir de : la liste en SP95-E10 (écran Stations) — capture `V-5.2-03-avant.png`
4. Faire : je touche Gazole ; constater : pastilles et lignes passent au prix du gazole et les stations sans gazole disparaissent — capture `V-5.2-04-apres.png`

## V-5.3 — Rechercher dans cette zone

En tant que conducteur, je déplace la carte vers un endroit de mon chemin et je cherche les stations de cette zone, comme sur Google Maps. (élément `rechercher-zone`)

1. Partir de : la carte (écran Stations) — capture `V-5.3-01-avant.png`
2. Faire : je la fais glisser vers une autre zone ; constater : le bouton « Rechercher dans cette zone » apparaît et les stations ne se rechargent pas d'elles-mêmes — capture `V-5.3-02-apres.png`
3. Partir de : ce bouton (écran Stations) — capture `V-5.3-03-avant.png`
4. Faire : je le touche ; constater : les stations de la zone affichée se chargent sur la carte et dans la liste, et le bouton disparaît — capture `V-5.3-04-apres.png`

## V-5.4 — Trier

En tant que conducteur, je trie la liste des stations par prix ou par distance. (élément `tri-liste`)

1. Partir de : la liste des stations (écran Stations) — capture `V-5.4-01-avant.png`
2. Faire : je touche « Plus proche » ; constater : elle se trie par distance croissante ; « Moins cher » la trie par prix croissant — capture `V-5.4-02-apres.png`

## V-5.5 — Utiliser ce prix

En tant que conducteur qui fait le plein à une station, je prends son prix pour mon trajet. (élément `utiliser-ce-prix`)

1. Partir de : un trajet en cours et la fiche d'une station à 2,103 €/L pour mon carburant (écran Stations) — capture `V-5.5-01-avant.png`
2. Faire : je touche « Utiliser 2,103 €/L pour mon trajet » ; constater : la fiche se ferme, l'écran En route revient, et le coût en direct puis la fin de trajet utilisent 2,103 €/L (« Mon prix ») — capture `V-5.5-02-apres.png`
3. Partir de : aucun trajet en cours (écran Stations) — capture `V-5.5-03-avant.png`
4. Faire : je touche ce bouton ; constater : le prix est gardé pour le prochain trajet démarré et l'accueil s'ouvre — capture `V-5.5-04-apres.png`
5. Partir de : une station qui ne vend pas le carburant de ma voiture (écran Stations) — capture `V-5.5-05-avant.png`
6. Faire : sa fiche s'ouvre ; constater : le bouton n'apparaît pas — capture `V-5.5-06-apres.png`

## V-5.6 — Trajet en cours

En tant que conducteur qui regarde les stations en route, je vois que mon trajet continue d'être enregistré. (élément `retour-trajet`)

1. Partir de : un trajet en cours (écran Stations) — capture `V-5.6-01-avant.png`
2. Faire : l'onglet Stations est ouvert ; constater : un bandeau « ● Trajet en cours · X € » s'affiche en haut avec le coût en direct ; sans trajet en cours, il n'apparaît pas — capture `V-5.6-02-apres.png`
3. Partir de : ce bandeau (écran Stations) — capture `V-5.6-03-avant.png`
4. Faire : je touche l'onglet Trajet ; constater : l'écran En route revient — capture `V-5.6-04-apres.png`

## V-5.7 — Europe et Royaume-Uni

En tant que conducteur à l'étranger, je vois aussi les stations d'Europe et du Royaume-Uni avec leurs prix. (élément `carte-stations`)

1. Partir de : une position à Barcelone (écran Stations) — capture `V-5.7-01-avant.png`
2. Faire : l'onglet Stations s'ouvre ; constater : les stations espagnoles s'affichent sur la carte avec leurs prix du jour — capture `V-5.7-02-apres.png`
3. Partir de : une position à Dartford (Royaume-Uni) (écran Stations) — capture `V-5.7-03-avant.png`
4. Faire : je lis une station ; constater : son prix est en €/L (taux BCE du jour) et son prix d'origine en p/L est affiché — capture `V-5.7-04-apres.png`
5. Partir de : un pays qui ne publie pas ses prix station par station (écran Stations) — capture `V-5.7-05-avant.png`
6. Faire : j'y cherche dans cette zone ; constater : un message le dit au lieu d'une carte vide — capture `V-5.7-06-apres.png`

## Régression — histoires des jalons 1 à 4 gardées dans la V1

Rejouées sur les écrans V1 (statut `maintenue_v1` dans `stories.json`), avec leurs critères d'origine :
- T5 Stations : US-1.4 (pastilles vert/orange, fiche), US-1.6 (ligne de station), US-2.1 (fermer la fiche), US-1.E1 (source injoignable → Réessayer), US-1.E2 (aucune station pour ce carburant), US-1.E3 (prix ancien), US-1.E4 (rupture), US-2.E1 (carburant non vendu), US-1.P1 (recentrer).
- T4 Fin de trajet : US-4.E2 (prix perso hors 0,50-4,00 €/L refusé, message, ancien prix gardé).
- T6 Historique : US-3.E3 (historique vide).
- T1 / T3 : US-6.E1 (localisation refusée), US-6.E2 (trajet < 1 km), US-6.E3 (reprise après rechargement de la page, distance conservée).
- Transverses : US-A11Y-001 à 004 (clavier, focus de la fiche, Échap, libellés) sur T1-T6 ; US-PERF-001 (accueil affiché en moins de 2,5 s en 4G simulée).

## Contrôle négatif — ce qui sort de la V1

1. Partir de : l'appli déployée, journal réseau Playwright ouvert (écran Trajet) — capture `V1-retraits-01-avant.png`
2. Faire : parcourir T1 → T6 et un trajet complet ; constater : aucune requête vers PTV ni vers une fonction de péages, aucun écran ni texte « péage », « itinéraire », « départ / arrivée » à saisir, aucun lien vers l'écran Moteurs ; l'onglet bar ne porte que Trajet, Stations, Historique — capture `V1-retraits-02-apres.png`
3. Partir de : la table `public.moteurs` lue par l'API Supabase (rôle service) (écran Trajet) — capture `V1-retraits-03-avant.png`
4. Faire : lire la ligne du service péages ; constater : `actif = false` (ou équivalent), et `public.cles_fournisseurs` comme Vault ont le même nombre de lignes qu'avant le jalon (aucune clé effacée) — capture `V1-retraits-04-apres.png`

## US-NEW-1 — Écran d'erreur récupérable

En tant que conducteur, si un écran plante, je vois un message et deux boutons au lieu d'une page blanche. (durcissement D3)

1. Partir de : une exception de rendu provoquée sur l'écran Ma voiture (injection, marquée MOCKED) (écran Ma voiture) — capture `US-NEW-1-01-avant.png`
2. Faire : l'écran s'affiche ; constater : « Un problème est survenu — L'écran n'a pas pu s'afficher » avec « Recharger » et « Effacer les données locales de l'appli », pas de page blanche — capture `US-NEW-1-02-apres.png`
3. Faire : je touche « Effacer les données locales de l'appli » ; constater : l'accueil s'ouvre sans voiture enregistrée — capture `US-NEW-1-03-apres.png`

## US-NEW-2 — Stations sur un écran bas

En tant que conducteur qui tient son téléphone en paysage, je lis encore la liste des stations. (durcissement D10)

1. Partir de : un écran de 844 × 390 (paysage) (écran Stations) — capture `US-NEW-2-01-avant.png`
2. Faire : j'ouvre Stations ; constater : la page défile, la carte est réduite et la liste des stations reste visible, barre d'onglets en bas — capture `US-NEW-2-02-apres.png`
