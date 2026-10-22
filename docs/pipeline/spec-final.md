# Spec finale — ce que fait Plein & Trajet (V1, livrée le 2026-10-22)

Vérité de terrain de l'appli livrée (HEAD `116357c`, https://plein-et-trajet.vercel.app ; APK Android du run 39710484157). `spec.md` reste le plan historique. Classes : [UNCHANGED] livrée comme prévu, [MODIFIED] livrée autrement (critères réécrits ci-dessous), [NEW] livrée sans histoire prévue, [REMOVED] non livrée.

## Ce que fait l'appli

Le coût exact de l'essence d'un trajet réellement roulé, partagé entre les passagers. Trois onglets : **Trajet** (T1 accueil, T2 Ma voiture par le code D.2 de la carte grise, T3 En route, T4 Fin de trajet), **Stations** (T5, carte des prix Europe et Royaume-Uni), **Historique** (T6). Pas de compte : voiture et trajets restent sur le téléphone. Appli web + APK Android signé (enregistrement écran éteint, notification permanente).

## Histoires V1 (jalons 5 et 6)

### V-1.1 — Ouvrir l'appli [UNCHANGED]

En tant que conducteur, j'ouvre l'appli et je tombe sur l'onglet Trajet : ma voiture et le bouton Démarrer.
- ÉTANT DONNÉ une voiture déjà enregistrée sur ce téléphone, QUAND j'ouvre l'appli, ALORS l'onglet Trajet est sélectionné et montre au centre ma voiture (marque, modèle, version, année, carburant) et le bouton rond « Démarrer », sans prix ni nombre de personnes
- ÉTANT DONNÉ aucune voiture enregistrée (premier lancement), QUAND j'ouvre l'appli, ALORS l'onglet Trajet invite à enregistrer ma voiture et « Démarrer » ouvre Ma voiture au lieu de lancer un trajet
- ÉTANT DONNÉ un trajet en cours d'enregistrement, QUAND je touche l'onglet Trajet, ALORS l'écran En route s'affiche, pas l'accueil

### V-1.2 — Voir ma voiture [MODIFIED]

En tant que conducteur, je vois la voiture que j'ai enregistrée une fois pour toutes, et je peux la changer.
- ÉTANT DONNÉ la Renault Clio IV 1.2 TCe 120 de 2017 enregistrée, QUAND l'accueil s'affiche, ALORS je lis « Renault Clio IV » et « 1.2 TCe 120 · 2017 · SP95-E10 »
- ÉTANT DONNÉ l'accueil, QUAND je touche « Changer » (changer-voiture), ALORS l'écran Ma voiture s'ouvre avec ses champs vides
- ÉTANT DONNÉ l'appli fermée puis rouverte, QUAND l'accueil s'affiche, ALORS la même voiture est rappelée sans rien ressaisir (gardée sur le téléphone, sans compte)
- Comportement livré : L'accueil affiche « Renault Clio » et « 1.2 · 118 ch · 2017 · SP95-E10 », pas « Renault Clio IV » ni « 1.2 TCe 120 » : la base EEA ne porte pas les noms commerciaux. Les deux autres critères sont tenus.

### V-1.3 — Démarrer [UNCHANGED]

En tant que conducteur, je touche Démarrer en partant pour que tout le trajet soit mesuré.
- ÉTANT DONNÉ une voiture enregistrée et la localisation autorisée, QUAND je touche « Démarrer », ALORS l'écran En route s'ouvre, l'indicateur « Enregistrement » clignote et la première position GPS est enregistrée en moins de 10 s
- ÉTANT DONNÉ la localisation refusée, QUAND je touche « Démarrer », ALORS un message dit que l'enregistrement a besoin de la localisation et comment l'autoriser, et aucun trajet n'est créé

### V-2.1 — Saisir le code D.2 [MODIFIED]

En tant que conducteur, je recopie le code D.2 de ma carte grise pour que l'appli connaisse exactement ma version de moteur.
- ÉTANT DONNÉ l'écran Ma voiture, QUAND je tape « 5RBU0C » ou « R 5RBU 5RBU0C » dans le champ D.2, ALORS la fiche Renault Clio 1.2 TCe 120 s'affiche avec les données de la base européenne EEA : 2017, 87 kW (118 ch), 1 197 cm³, 1 165 kg, SP95-E10, 118 g/km
- ÉTANT DONNÉ un code partagé par plusieurs versions (marques, années ou masses différentes), QUAND je le tape, ALORS l'appli liste les versions correspondantes (marque, modèle, année, puissance, masse), la plus immatriculée en tête, et je choisis la mienne
- ÉTANT DONNÉ un code tapé en minuscules ou avec des espaces, QUAND il est cherché, ALORS il est reconnu comme écrit en majuscules sans espaces
- Comportement livré : La fiche affiche « Renault Clio 1.2 · 118 ch » et non « 1.2 TCe 120 » : la base EEA ne porte pas les noms commerciaux (même écart que V-1.2, relevé par l'audit final). Les données (2017, 87 kW, 1 197 cm³, 1 165 kg, SP95-E10, 118 g/km) et les deux autres critères sont tenus.

### V-2.2 — Vérifier et enregistrer [UNCHANGED]

En tant que conducteur, je vérifie la fiche de ma voiture puis je l'enregistre une fois pour toutes.
- ÉTANT DONNÉ la fiche de ma version affichée, QUAND je touche « Enregistrer ma voiture », ALORS l'accueil s'ouvre avec cette voiture, et elle reste mémorisée sur le téléphone après fermeture de l'appli
- ÉTANT DONNÉ aucune version identifiée, QUAND je regarde « Enregistrer ma voiture », ALORS le bouton est désactivé

### V-2.3 — Chercher sans la carte grise [UNCHANGED]

En tant que conducteur sans ma carte grise sous la main, je cherche ma voiture par son nom, son année et sa puissance.
- ÉTANT DONNÉ le champ « Nom, année, puissance », QUAND je tape « clio 2017 120 », ALORS la liste propose les versions de Clio immatriculées en 2017 autour de 120 ch (± 5 ch), la plus immatriculée en tête, chacune avec année, kW et carburant
- ÉTANT DONNÉ une suggestion, QUAND je la touche, ALORS sa fiche s'affiche comme avec le code D.2 et « Enregistrer ma voiture » s'active

### V-2.E1 — Code inconnu [UNCHANGED]

En tant que conducteur, si mon code D.2 n'est pas reconnu, je sais quoi faire.
- ÉTANT DONNÉ le champ D.2, QUAND je tape un code de 6 caractères ou plus absent de la base EEA (ex. « ZZ9999 »), ALORS « Code introuvable. Vérifie la case D.2, ou cherche par nom ci-dessous. » s'affiche et « Enregistrer ma voiture » reste désactivé
- ÉTANT DONNÉ la base européenne injoignable, QUAND je tape un code, ALORS un message dit que la base ne répond pas, avec « Réessayer », sans effacer ma saisie

### V-3.1 — Suivre en direct [UNCHANGED]

En tant que conducteur, je suis en direct ma vitesse, les km, les litres et les euros d'essence depuis le départ.
- ÉTANT DONNÉ un enregistrement en cours, QUAND je roule, ALORS la vitesse (km/h) et sa courbe des dernières minutes se mettent à jour au moins toutes les 2 s, et km, litres, € essence, durée, km/h moyens et L/100 km augmentent en conséquence
- ÉTANT DONNÉ aucun prix choisi, QUAND le coût en direct s'affiche, ALORS il est calculé au prix moyen du jour du pays de départ pour le carburant de ma voiture
- ÉTANT DONNÉ un prix pris sur une station (« Utiliser ce prix »), QUAND le coût en direct s'affiche, ALORS il utilise ce prix

### V-3.2 — Écran éteint, Waze devant [UNCHANGED]

En tant que conducteur guidé par Waze ou Google Maps, je laisse l'appli enregistrer en arrière-plan, écran éteint.
- ÉTANT DONNÉ l'appli Android avec un trajet démarré, QUAND j'éteins l'écran ou passe sur Waze ou Google Maps pendant 30 min, ALORS en revenant dans l'appli la distance couvre tout ce temps : aucun trou de plus de 15 s dans les points enregistrés hors perte de signal
- ÉTANT DONNÉ l'appli Android tuée par le système pendant un trajet, QUAND je la rouvre, ALORS le trajet en cours reprend avec tous ses points (enregistrés par le service Android, pas par la page)
- ÉTANT DONNÉ la version web dans un navigateur, QUAND un trajet est démarré, ALORS le texte dit que l'écran doit rester allumé et l'écran est gardé allumé par le verrou d'écran

### V-3.3 — Piloter depuis la barre du téléphone [MODIFIED]

En tant que conducteur, je pilote l'enregistrement depuis la barre du téléphone sans ouvrir l'appli.
- ÉTANT DONNÉ un trajet en cours sur Android, QUAND je descends la barre du téléphone, ALORS une notification permanente « Plein & Trajet » montre vitesse, km et € essence, mis à jour au moins toutes les 5 s, avec les boutons « Pause » et « Arrêter »
- ÉTANT DONNÉ cette notification, QUAND je touche « Pause », ALORS l'enregistrement passe en pause sans ouvrir l'appli et le bouton devient « Reprendre » ; « Reprendre » le relance
- ÉTANT DONNÉ cette notification, QUAND je touche « Arrêter », ALORS l'enregistrement s'arrête et l'appli s'ouvre sur la fin de trajet
- Comportement livré : Notification tenue (vitesse, km, €, Pause/Reprendre/Arrêter, constatée sur l'émulateur de la CI). Écart connu non corrigé : si un bouton de la notification est touché juste après une relance du service par le système, avant son premier relevé, la distance de la notification oublie 2 à 3 relevés (l'écran recalcule juste à la réouverture). Vérifiée sur émulateur seulement.

### V-3.4 — Mettre en pause [UNCHANGED]

En tant que conducteur, je mets en pause pendant un arrêt (station, repas) sans compter de distance ni d'essence.
- ÉTANT DONNÉ un enregistrement en cours, QUAND je touche « Pause », ALORS l'indicateur passe à « En pause », la distance et les litres cessent d'augmenter et le bouton devient « Reprendre »
- ÉTANT DONNÉ une pause pendant laquelle la voiture s'est déplacée de 2 km, QUAND je touche « Reprendre », ALORS ces 2 km ne sont ni comptés ni chiffrés

### V-3.5 — Arrêter [UNCHANGED]

En tant que conducteur, j'arrête l'enregistrement à l'arrivée et j'obtiens la fin de trajet.
- ÉTANT DONNÉ un enregistrement de plus de 1 km, QUAND je touche « Arrêter », ALORS la fin de trajet s'ouvre avec « Départ → Arrivée » (lieux retrouvés par géocodage inverse), la date, la durée, les litres, les km et les L/100 km moyens
- ÉTANT DONNÉ un enregistrement de moins de 1 km, QUAND je touche « Arrêter », ALORS un message dit que le trajet est trop court et rien n'est ajouté à l'historique
- ÉTANT DONNÉ aucun réseau à l'arrêt, QUAND la fin de trajet s'ouvre, ALORS litres et coût sont calculés sur le téléphone, et les noms des lieux se complètent au retour du réseau

### V-3.E1 — Oubli d'arrêter [UNCHANGED]

En tant que conducteur qui a oublié d'arrêter, je ne compte pas des heures de stationnement dans mon trajet.
- ÉTANT DONNÉ un enregistrement en cours, QUAND la vitesse reste sous 3 km/h et la position à moins de 50 m pendant 10 min, ALORS le trajet cesse de compter et l'écran affiche « Trajet arrêté : immobile depuis 10 min » avec « Reprendre » et « C'est fini »
- ÉTANT DONNÉ cette alerte, QUAND je touche « C'est fini », ALORS la fin de trajet s'ouvre avec une arrivée datée du début de l'immobilité : les 10 min ne comptent pas dans la durée
- ÉTANT DONNÉ cette alerte, QUAND je touche « Reprendre », ALORS l'enregistrement repart sans perdre les points d'avant

### V-3.E2 — GPS perdu [UNCHANGED]

En tant que conducteur qui passe un tunnel, je ne perds pas les kilomètres sans GPS.
- ÉTANT DONNÉ un enregistrement en cours, QUAND aucune position n'arrive pendant plus de 15 s, ALORS « GPS perdu (tunnel) · la distance est complétée à la sortie » s'affiche
- ÉTANT DONNÉ le signal revenu après un tunnel de 3 km, QUAND la position suivante arrive, ALORS la distance entre la dernière position d'avant et la première d'après est ajoutée, à la vitesse moyenne du passage, et le message disparaît

### V-4.1 — Prix de l'essence [UNCHANGED]

En tant que conducteur à l'arrivée, je vois le prix de l'essence utilisé : la moyenne du jour pour le carburant de ma voiture.
- ÉTANT DONNÉ la fin d'un trajet en Clio (SP95-E10) parti de France, QUAND l'écran s'ouvre, ALORS le sélecteur de carburant (carburant-apres : Gazole, SP95-E10, SP95, SP98, E85, GPLc) a SP95-E10 choisi et le prix affiché est la « Moyenne France du jour » de ce carburant, à 3 décimales
- ÉTANT DONNÉ ce sélecteur, QUAND je touche Gazole, ALORS le prix devient la moyenne du jour du gazole et le coût est recalculé
- ÉTANT DONNÉ un départ hors de France, QUAND l'écran s'ouvre, ALORS le prix est la moyenne du jour du pays de départ et le libellé nomme ce pays

### V-4.2 — Mettre mon prix [UNCHANGED]

En tant que conducteur qui connaît le prix payé, je remplace la moyenne par mon prix en touchant le compteur.
- ÉTANT DONNÉ la fin de trajet, QUAND je touche le compteur du prix, tape 1,989 et valide, ALORS le libellé devient « Mon prix », le coût est recalculé à 1,989 €/L et « Revenir à la moyenne » apparaît
- ÉTANT DONNÉ mon prix saisi, QUAND je touche « Revenir à la moyenne », ALORS la moyenne du jour revient, et le coût avec
- ÉTANT DONNÉ le champ du prix ouvert, QUAND j'appuie sur Échap, ALORS le prix d'avant reste

### V-4.3 — Coût de l'essence [UNCHANGED]

En tant que conducteur, je lis le coût exact de l'essence dépensée sur le trajet.
- ÉTANT DONNÉ 41,2 L consommés et un prix de 2,161 €/L, QUAND la fin de trajet s'affiche, ALORS le coût affiché est « 89,03 € essence » (litres × prix, arrondi au centime)
- ÉTANT DONNÉ le prix ou le carburant changé, QUAND le changement est fait, ALORS le coût est recalculé aussitôt, sans réseau

### V-4.4 — Partager [UNCHANGED]

En tant que conducteur qui partage les frais, j'indique le nombre de personnes et je lis la part de chacun (part-personne).
- ÉTANT DONNÉ un coût de 89,03 €, QUAND je passe le nombre de personnes à 3 avec « + », ALORS la part affichée est « 29,68 € chacun »
- ÉTANT DONNÉ 1 personne, QUAND l'écran s'affiche, ALORS le texte dit « Seul : tout pour toi. », « − » ne descend pas sous 1 et « + » ne dépasse pas 9

### V-4.5 — Courbe de vitesse [UNCHANGED]

En tant que conducteur, je revois ma vitesse au fil du trajet.
- ÉTANT DONNÉ un trajet enregistré, QUAND la fin de trajet s'affiche, ALORS la courbe de vitesse couvre tout le trajet (600 points au plus), avec la vitesse moyenne sur le temps roulé (pauses exclues) et le nombre d'accélérations

### V-4.6 — Courbe de consommation [UNCHANGED]

En tant que conducteur, je vois où j'ai le plus consommé, en litres aux 100 km.
- ÉTANT DONNÉ un trajet enregistré, QUAND la fin de trajet s'affiche, ALORS la courbe de consommation en L/100 km couvre tout le trajet avec sa moyenne et sa pointe, et la moyenne affichée égale litres totaux ÷ km × 100 (à 0,1 près)

### V-4.7 — Enregistrer ou supprimer [UNCHANGED]

En tant que conducteur, je décide de garder ce trajet dans l'historique ou de l'oublier.
- ÉTANT DONNÉ un trajet qui vient d'être arrêté, QUAND je touche « Enregistrer », ALORS l'onglet Historique s'ouvre avec ce trajet en tête, avec le prix, le carburant et le nombre de personnes choisis
- ÉTANT DONNÉ un trajet qui vient d'être arrêté, QUAND je touche « Supprimer », ALORS il est oublié (ses points effacés du téléphone), l'accueil s'ouvre et il n'apparaît pas dans l'historique
- ÉTANT DONNÉ un trajet arrêté puis l'appli fermée avant de choisir, QUAND je la rouvre, ALORS la fin de ce trajet revient avec les deux boutons

### V-6.1 — Ouvrir l'historique [UNCHANGED]

En tant que conducteur, j'ouvre l'historique des trajets que j'ai faits.
- ÉTANT DONNÉ des trajets enregistrés en septembre et en octobre 2026, QUAND je touche l'onglet Historique, ALORS ils sont listés du plus récent au plus ancien, sous « Octobre 2026 » puis « Septembre 2026 »
- ÉTANT DONNÉ aucun trajet enregistré, QUAND j'ouvre l'onglet, ALORS « Aucun trajet enregistré. » s'affiche et les totaux sont à 0

### V-6.2 — Totaux [UNCHANGED]

En tant que conducteur, je vois combien de trajets, de km et d'euros d'essence j'ai cumulés.
- ÉTANT DONNÉ 4 trajets de 77, 152, 245 et 243 km, QUAND l'historique s'affiche, ALORS les totaux montrent 4 trajets, 717 km et la somme de leurs coûts en € essence
- ÉTANT DONNÉ un trajet corrigé ou supprimé, QUAND je reviens à l'historique, ALORS les totaux sont recalculés

### V-6.3 — Lire un trajet [UNCHANGED]

En tant que conducteur, je lis chaque trajet de l'historique en une ligne.
- ÉTANT DONNÉ un trajet enregistré à 3 personnes, QUAND je lis sa ligne, ALORS elle donne la date, « Départ → Arrivée », les km, le coût total et « X € chacun » ; pour un trajet seul, la part n'est pas affichée
- ÉTANT DONNÉ une ligne, QUAND je la touche, ALORS la fin de ce trajet se rouvre, onglet Historique sélectionné, avec « ← Historique »

### V-6.4 — Revoir, corriger, supprimer [UNCHANGED]

En tant que conducteur, je corrige après coup le prix ou le nombre de personnes d'un trajet, ou je le supprime.
- ÉTANT DONNÉ un trajet rouvert depuis l'historique, QUAND je change son prix, son carburant ou son nombre de personnes, ALORS la correction est gardée et l'historique la montre au retour
- ÉTANT DONNÉ un trajet rouvert, QUAND je touche « Supprimer ce trajet », ALORS il disparaît de l'historique et des totaux

### V-5.1 — Stations autour de moi [UNCHANGED]

En tant que conducteur en route, j'ouvre les stations autour de moi pour trouver de l'essence pas trop chère.
- ÉTANT DONNÉ la position autorisée, QUAND je touche l'onglet Stations, ALORS la carte centrée sur ma position et la liste des stations autour s'affichent avec leurs prix officiels du jour
- ÉTANT DONNÉ un trajet en cours, QUAND j'ouvre l'onglet Stations puis reviens au trajet, ALORS l'enregistrement n'a pas été interrompu (la distance a continué de croître)

### V-5.2 — Choisir le carburant [UNCHANGED]

En tant que conducteur, je vois d'office les prix du carburant de ma voiture, et je peux en changer.
- ÉTANT DONNÉ une Clio SP95-E10 enregistrée, QUAND j'ouvre l'onglet Stations, ALORS SP95-E10 est choisi d'office
- ÉTANT DONNÉ la liste en SP95-E10, QUAND je touche Gazole, ALORS pastilles et lignes passent au prix du gazole et les stations sans gazole disparaissent

### V-5.3 — Rechercher dans cette zone [UNCHANGED]

En tant que conducteur, je déplace la carte vers un endroit de mon chemin et je cherche les stations de cette zone, comme sur Google Maps.
- ÉTANT DONNÉ la carte, QUAND je la fais glisser vers une autre zone, ALORS le bouton « Rechercher dans cette zone » apparaît et les stations ne se rechargent pas d'elles-mêmes
- ÉTANT DONNÉ ce bouton, QUAND je le touche, ALORS les stations de la zone affichée se chargent sur la carte et dans la liste, et le bouton disparaît

### V-5.4 — Trier [UNCHANGED]

En tant que conducteur, je trie la liste des stations par prix ou par distance.
- ÉTANT DONNÉ la liste des stations, QUAND je touche « Plus proche », ALORS elle se trie par distance croissante ; « Moins cher » la trie par prix croissant

### V-5.5 — Utiliser ce prix [UNCHANGED]

En tant que conducteur qui fait le plein à une station, je prends son prix pour mon trajet.
- ÉTANT DONNÉ un trajet en cours et la fiche d'une station à 2,103 €/L pour mon carburant, QUAND je touche « Utiliser 2,103 €/L pour mon trajet », ALORS la fiche se ferme, l'écran En route revient, et le coût en direct puis la fin de trajet utilisent 2,103 €/L (« Mon prix »)
- ÉTANT DONNÉ aucun trajet en cours, QUAND je touche ce bouton, ALORS le prix est gardé pour le prochain trajet démarré et l'accueil s'ouvre
- ÉTANT DONNÉ une station qui ne vend pas le carburant de ma voiture, QUAND sa fiche s'ouvre, ALORS le bouton n'apparaît pas

### V-5.6 — Trajet en cours [UNCHANGED]

En tant que conducteur qui regarde les stations en route, je vois que mon trajet continue d'être enregistré.
- ÉTANT DONNÉ un trajet en cours, QUAND l'onglet Stations est ouvert, ALORS un bandeau « ● Trajet en cours · X € » s'affiche en haut avec le coût en direct ; sans trajet en cours, il n'apparaît pas
- ÉTANT DONNÉ ce bandeau, QUAND je touche l'onglet Trajet, ALORS l'écran En route revient

### V-5.7 — Europe et Royaume-Uni [UNCHANGED]

En tant que conducteur à l'étranger, je vois aussi les stations d'Europe et du Royaume-Uni avec leurs prix.
- ÉTANT DONNÉ une position à Barcelone, QUAND l'onglet Stations s'ouvre, ALORS les stations espagnoles s'affichent sur la carte avec leurs prix du jour
- ÉTANT DONNÉ une position à Dartford (Royaume-Uni), QUAND je lis une station, ALORS son prix est en €/L (taux BCE du jour) et son prix d'origine en p/L est affiché
- ÉTANT DONNÉ un pays qui ne publie pas ses prix station par station, QUAND j'y cherche dans cette zone, ALORS un message le dit au lieu d'une carte vide

## Histoires d'avant gardées en V1

### US-1.4 — Toucher une pastille [UNCHANGED]

En tant que conducteur, je touche la pastille d'une station sur la carte pour ouvrir sa fiche.
- ÉTANT DONNÉ la carte affichée, QUAND je touche une pastille de station, ALORS la fiche de cette station s'ouvre
- ÉTANT DONNÉ des prix différents autour de moi, QUAND la carte s'affiche, ALORS les pastilles de la moitié la moins chère sont marquées vert, les autres orange

### US-1.6 — Lire une station dans la liste [UNCHANGED]

En tant que conducteur, je lis la liste des stations triée et touche une ligne de station pour voir sa fiche.
- ÉTANT DONNÉ la liste affichée, QUAND je lis une ligne de station, ALORS je vois enseigne, distance, ancienneté du prix, écart à la moyenne France et le prix à trois décimales
- ÉTANT DONNÉ une ligne de station, QUAND je la touche, ALORS sa fiche s'ouvre

### US-2.1 — Fermer la fiche [UNCHANGED]

En tant que conducteur, je ferme la fiche station pour revenir à la carte.
- ÉTANT DONNÉ une fiche station ouverte, QUAND je touche le bouton fermer la fiche ou la touche Échap, ALORS la fiche se ferme et le carburant choisi n'a pas changé

### US-1.E1 — Source des prix injoignable [MODIFIED]

En tant que conducteur, si les prix ne peuvent pas être chargés, je vois un message clair et un bouton Réessayer.
- ÉTANT DONNÉ la lecture des prix en erreur réseau, QUAND l'écran Prix s'ouvre, ALORS un message « Prix indisponibles pour l'instant » et un bouton Réessayer s'affichent à la place de la liste
- Comportement livré : Même comportement, sur l'onglet Stations (T5) : l'écran Prix n'existe plus.

### US-1.E2 — Aucune station pour ce carburant [UNCHANGED]

En tant que conducteur, si aucune station proche ne vend mon carburant, la liste me le dit.
- ÉTANT DONNÉ aucune station du rayon ne vend E85, QUAND je choisis E85 dans le sélecteur de carburant, ALORS la liste affiche « Aucune station ne vend ce carburant autour de vous » et la carte n'a aucune pastille

### US-1.E3 — Prix ancien signalé [UNCHANGED]

En tant que conducteur, je repère un prix qui n'a pas été mis à jour depuis plus de 48 h.
- ÉTANT DONNÉ une station dont le prix date de plus de 48 h, QUAND la liste s'affiche, ALORS sa ligne de station porte la mention « prix du JJ/MM » en couleur atténuée

### US-1.E4 — Station en rupture [UNCHANGED]

En tant que conducteur, je ne vois pas comme disponible un carburant en rupture.
- ÉTANT DONNÉ une station en rupture temporaire de gazole, QUAND je choisis Gazole, ALORS elle n'apparaît pas dans la liste triée par prix

### US-2.E1 — Carburant non vendu dans la fiche [UNCHANGED]

En tant que conducteur, la fiche me dit quels carburants la station ne vend pas.
- ÉTANT DONNÉ une station sans GPLc, QUAND j'ouvre sa fiche, ALORS la ligne GPLc affiche « non vendu » au lieu d'un prix

### US-3.E3 — Historique vide [MODIFIED]

En tant que nouvel utilisateur, je comprends que l'historique se remplira.
- ÉTANT DONNÉ aucun trajet enregistré, QUAND j'ouvre l'onglet Historique, ALORS il affiche « Aucun trajet enregistré. » (critère aligné sur V-6.1 c2 au jalon 5 ; l'invitation à calculer le premier a disparu avec l'estimation)
- Comportement livré : Critère réaligné au jalon 5 sur V-6.1 : l'onglet Historique affiche « Aucun trajet enregistré. » ; l'invitation à calculer un premier trajet a disparu avec l'estimation.

### US-4.E2 — Prix perso invalide [UNCHANGED]

En tant que conducteur, une saisie de prix aberrante est refusée.
- ÉTANT DONNÉ le champ prix perso ouvert, QUAND je saisis 12 ou une lettre, ALORS le champ est signalé « Entre un prix entre 0,50 et 4,00 €/L » et le coût reste celui d'avant

### US-1.P1 — Recentrer sur ma position [UNCHANGED]

En tant que conducteur qui a déplacé la carte des stations, je reviens à ma position.
- ÉTANT DONNÉ la carte déplacée, QUAND je touche le bouton de recentrage de la carte des stations, ALORS la carte revient sur ma position et la liste se recharge

### US-6.E1 — Localisation refusée [MODIFIED]

En tant que conducteur, si je refuse la localisation, je sais pourquoi rien ne s'enregistre.
- ÉTANT DONNÉ l'écran Trajets, QUAND j'appuie sur « Enregistrer en roulant » et que la localisation est refusée, ALORS un message dit que l'enregistrement a besoin de la localisation et comment l'autoriser, et aucun trajet n'est créé
- Comportement livré : Le refus de localisation se joue au « Démarrer » de l'accueil (T1), plus sur « Enregistrer en roulant » de l'écran Trajets. Joué sur la version web seulement (pas au dialogue natif Android).

### US-6.E2 — Trajet trop court [MODIFIED]

En tant que conducteur, un enregistrement arrêté presque aussitôt ne pollue pas mon historique.
- ÉTANT DONNÉ un enregistrement de moins de 1 km, QUAND j'appuie sur « Arrêter et voir le coût », ALORS un message indique que le trajet est trop court pour être calculé, et rien n'est ajouté à l'historique
- Comportement livré : Le message « trop court » se joue à « Arrêter » de l'écran En route (T3), plus sur « Arrêter et voir le coût ».

### US-6.E3 — Reprendre après fermeture [MODIFIED]

En tant que conducteur, si l'appli se ferme en route, je ne perds pas ce qui a été enregistré.
- ÉTANT DONNÉ un enregistrement en cours, QUAND la page est rechargée ou rouverte, ALORS l'appli propose de reprendre l'enregistrement en cours ou de l'arrêter, avec la distance déjà parcourue conservée (points gardés sur le téléphone)
- Comportement livré : Pas de proposition « reprendre ou arrêter » : l'écran En route rouvre directement le trajet en cours, distance conservée, avec Pause et Arrêter (V-1.1) ; sur Android, par le service natif.

## Écran Moteurs, hors navigation (/admin)

### US-5.1 — Ouvrir les moteurs [MODIFIED]

En tant qu'administrateur, j'ouvre l'écran Moteurs depuis le bouton ⚙.
- ÉTANT DONNÉ je suis connecté comme administrateur, QUAND je touche le bouton moteurs ⚙, ALORS l'écran Moteurs liste les 6 services avec leur fournisseur et leur état
- Comportement livré : Plus de bouton ⚙ : l'écran Moteurs n'a plus aucun lien dans l'appli et liste 7 services (Base véhicules EEA ajoutée) ; il reste joignable aux adresses /admin et /moteurs, réservé à Anthony (clés Fuel Finder et synchros).

### US-5.2 — Choisir le fournisseur [MODIFIED]

En tant qu'administrateur, je choisis le fournisseur branché pour chaque service.
- ÉTANT DONNÉ l'écran Moteurs, QUAND je choisis HERE au lieu de PTV pour les péages dans le choix du fournisseur, ALORS l'état passe à « Clé à coller » si HERE demande une clé, sinon « Prêt · sans clé »
- Comportement livré : Écran hors navigation (/admin). Le moteur péages est hors service en V1.

### US-5.3 — Coller la clé [MODIFIED]

En tant qu'administrateur, je colle la clé d'API d'un fournisseur ; elle n'est jamais réaffichée.
- ÉTANT DONNÉ le champ clé des péages, QUAND je colle une clé et j'enregistre, ALORS la clé est stockée chiffrée côté serveur et le champ n'affiche plus que ses 4 derniers caractères
- ÉTANT DONNÉ une clé enregistrée, QUAND je recharge l'écran, ALORS la clé complète n'apparaît nulle part, ni dans la page ni dans les réponses réseau
- Comportement livré : Écran hors navigation (/admin). Comportement de la clé inchangé.

### US-5.4 — Tester la connexion [MODIFIED]

En tant qu'administrateur, je teste la connexion d'un moteur avant de l'enregistrer.
- ÉTANT DONNÉ une clé PTV valide collée, QUAND je touche Tester la connexion, ALORS un vrai calcul de test est envoyé à PTV et l'état affiche « Connecté »
- Comportement livré : Écran hors navigation (/admin). Le test PTV n'a plus d'usage en V1 (péages hors service).

### US-5.E1 — Moteurs invisibles aux visiteurs [MODIFIED]

En tant que simple utilisateur, je ne vois ni n'atteins l'écran Moteurs.
- ÉTANT DONNÉ un appareil non administrateur, QUAND l'appli s'ouvre, ALORS le bouton moteurs n'est pas affiché et toute lecture ou écriture de la table des moteurs est refusée par le serveur
- Comportement livré : Il n'y a plus de bouton à cacher : la protection repose sur le serveur (lecture et écriture des moteurs refusées hors administrateur).

### US-5.E2 — Clé refusée [MODIFIED]

En tant qu'administrateur, une clé invalide est signalée et n'est pas enregistrée comme active.
- ÉTANT DONNÉ une clé invalide collée, QUAND je touche Tester la connexion, ALORS l'état affiche « Clé refusée par PTV (401) » et Enregistrer garde l'ancien fournisseur actif
- Comportement livré : Écran hors navigation (/admin).

### US-5.6 — Où trouver ma clé [MODIFIED]

En tant qu'administrateur, à côté du champ clé de chaque fournisseur, j'ai le lien vers la page où créer ou retrouver cette clé.
- ÉTANT DONNÉ l'écran Moteurs et un fournisseur qui demande une clé, QUAND je regarde le champ clé, ALORS un lien « Où trouver ma clé » ouvre dans un nouvel onglet la page du fournisseur (PTV : https://developer.myptv.com/en → API Keys ; Stadia : https://client.stadiamaps.com/dashboard/ ; HERE : https://platform.here.com/access/apps ; Tankerkönig : https://creativecommons.tankerkoenig.de/), avec une phrase sur le menu à ouvrir
- ÉTANT DONNÉ un fournisseur sans clé, QUAND je regarde sa fiche, ALORS aucun lien de clé n'est affiché
- Comportement livré : Écran hors navigation (/admin).

## Transverses

### US-A11Y-001 — Navigation au clavier [MODIFIED]

En tant qu'utilisateur au clavier, j'atteins tous les contrôles dans un ordre logique.
- ÉTANT DONNÉ n'importe quel écran, QUAND j'utilise Tab et Maj+Tab, ALORS chaque contrôle reçoit le focus dans l'ordre de lecture avec un contour visible
- Comportement livré : Clavier complet, sans piège, anneau de focus 3 px partout (audit a11y). Écart différé (D22) : après « Enregistrer ma voiture », le focus retombe sur la page au lieu d'un titre.

### US-A11Y-002 — Focus de la fiche [UNCHANGED]

En tant qu'utilisateur au clavier, le focus suit la fiche station.
- ÉTANT DONNÉ une fiche station ouverte au clavier, QUAND elle s'ouvre, ALORS le focus va sur son titre ; à la fermeture il revient sur l'élément qui l'a ouverte

### US-A11Y-003 — Touche Échap [MODIFIED]

En tant qu'utilisateur au clavier, Échap ferme ce qui est ouvert.
- ÉTANT DONNÉ la fiche station ou un tronçon déplié, QUAND j'appuie sur Échap, ALORS la fiche se ferme
- Comportement livré : Échap ferme la fiche station et le champ de prix de la fin de trajet ; les « tronçons dépliés » n'existent plus (estimation retirée).

### US-A11Y-004 — Libellés lisibles [UNCHANGED]

En tant qu'utilisateur de lecteur d'écran, chaque contrôle et chaque prix est annoncé.
- ÉTANT DONNÉ un lecteur d'écran actif, QUAND je parcours les pastilles et les prix, ALORS chaque pastille annonce station et prix en euros, chaque bouton icône a un libellé

### US-PERF-001 — Ouverture rapide [MODIFIED]

En tant que conducteur, l'écran Prix est utilisable vite sur téléphone.
- ÉTANT DONNÉ une connexion 4G, QUAND j'ouvre l'appli, ALORS la liste des stations est affichée en moins de 2,5 s
- Comportement livré : L'appli s'ouvre sur l'accueil Trajet, qui n'a pas de liste de stations : le critère se mesure à l'ouverture de l'onglet Stations. Liste affichée à 1,2 s ; carte prête à 4,1 s en profil mobile à froid (D16, différé).

## Nouvelles histoires

### US-NEW-1 — Écran d'erreur récupérable [NEW]

En tant que conducteur, si un écran plante, je vois un message et deux boutons au lieu d'une page blanche, pour repartir sans réinstaller.
- ÉTANT DONNÉ une exception pendant l'affichage d'un écran, QUAND elle survient, ALORS l'appli affiche « Un problème est survenu — L'écran n'a pas pu s'afficher » avec « Recharger » et « Effacer les données locales de l'appli »
- ÉTANT DONNÉ cet écran d'erreur, QUAND je touche « Effacer les données locales de l'appli », ALORS la voiture et les trajets gardés sur le téléphone sont effacés et l'accueil s'ouvre
- Origine : durcissement D3 (60be123) : toute exception de rendu blanchissait l'appli

### US-NEW-2 — Stations sur un écran bas [NEW]

En tant que conducteur qui tient son téléphone en paysage, je lis encore la liste des stations.
- ÉTANT DONNÉ un écran de moins de 500 px de haut, QUAND j'ouvre Stations, ALORS la page défile, la carte est réduite et la liste des stations reste visible, barre d'onglets en bas
- Origine : durcissement D10 (d67e56f) : la liste tombait à 0 px de haut

### US-NEW-3 — Autorisations Android au premier trajet [NEW]

En tant que conducteur sur Android, l'appli me demande ce dont elle a besoin pour enregistrer écran éteint.
- ÉTANT DONNÉ l'appli Android installée, QUAND je touche « Démarrer » la première fois, ALORS elle demande la localisation, puis les notifications, puis la sortie de l'optimisation de batterie
- Origine : jalon 6 : exigé par le service de premier plan Android ; absent des histoires V-x

### US-NEW-4 — Installer l'appli Android par un lien [NEW]

En tant que conducteur, j'installe l'appli Android depuis un lien, hors Play Store.
- ÉTANT DONNÉ le lien https://projets.ingevision.cloud/plein-et-trajet/plein-et-trajet.apk, QUAND je l'ouvre sur un téléphone Android, ALORS l'APK signé se télécharge et s'installe
- Origine : jalon 6 : distribution hors Play Store (config.json)

## Retirées

| Id | Titre | Raison |
|---|---|---|
| US-1.1 [REMOVED] | Ouvrir les prix | l'onglet Prix devient l'onglet Stations (T5) (remplacée par V-5.1) |
| US-1.2 [REMOVED] | Choisir mon carburant | sélecteur repris sur T5, carburant de la voiture d'office (remplacée par V-5.2) |
| US-1.3 [REMOVED] | Voir les stations sur la carte | la carte ne se recharge plus seule au déplacement : « Rechercher dans cette zone » (décision 3 d'Anthony) (remplacée par V-5.1, V-5.3) |
| US-1.5 [REMOVED] | Trier la liste | tri repris sur T5 (remplacée par V-5.4) |
| US-2.2 [REMOVED] | Calculer un trajet vers la station | l'estimation d'un trajet avant de partir sort de la V1 (décision 2 d'Anthony, 21/10 : « on va rester à ça pour une version 1 ») ; la fiche porte désormais « Utiliser ce prix » (V-5.5) |
| US-3.1 [REMOVED] | Ouvrir les trajets | l'onglet Trajets devient l'accueil Trajet (T1) (remplacée par V-1.1) |
| US-3.2 [REMOVED] | Saisir le départ | l'estimation d'un trajet avant de partir sort de la V1 (décision 2 d'Anthony, 21/10 : « on va rester à ça pour une version 1 ») |
| US-3.3 [REMOVED] | Saisir l'arrivée | l'estimation d'un trajet avant de partir sort de la V1 (décision 2 d'Anthony, 21/10 : « on va rester à ça pour une version 1 ») |
| US-3.4 [REMOVED] | Choisir ma voiture | la voiture se saisit une fois par le code D.2 ou la recherche (décision 6 d'Anthony) (remplacée par V-2.1, V-2.3) |
| US-3.5 [REMOVED] | Calculer le coût | l'estimation d'un trajet avant de partir sort de la V1 (décision 2 d'Anthony, 21/10 : « on va rester à ça pour une version 1 ») |
| US-3.6 [REMOVED] | Rejouer un ancien trajet | l'estimation d'un trajet avant de partir sort de la V1 (décision 2 d'Anthony, 21/10 : « on va rester à ça pour une version 1 ») ; l'historique V1 rouvre un trajet roulé, il ne recalcule pas d'itinéraire |
| US-3.7 [REMOVED] | Supprimer un trajet | suppression reprise sur la fin de trajet rouverte (remplacée par V-6.4) |
| US-4.1 [REMOVED] | Comprendre le calcul | l'estimation d'un trajet avant de partir sort de la V1 (décision 2 d'Anthony, 21/10 : « on va rester à ça pour une version 1 ») (tronçons d'un itinéraire calculé) |
| US-4.2 [REMOVED] | Mettre mon propre prix | prix perso repris sur la fin de trajet, en touchant le compteur (remplacée par V-4.2) |
| US-4.3 [REMOVED] | Revenir aux trajets | l'écran Résultat d'une estimation disparaît ; la fin de trajet revient à l'historique par « ← Historique » (V-6.3) |
| US-3.E1 [REMOVED] | Lieu introuvable | l'estimation d'un trajet avant de partir sort de la V1 (décision 2 d'Anthony, 21/10 : « on va rester à ça pour une version 1 ») |
| US-3.E2 [REMOVED] | Formulaire incomplet | l'estimation d'un trajet avant de partir sort de la V1 (décision 2 d'Anthony, 21/10 : « on va rester à ça pour une version 1 ») |
| US-3.E4 [REMOVED] | Voiture absente de la base | voiture absente → code D.2 inconnu (remplacée par V-2.E1) |
| US-4.E1 [REMOVED] | Itinéraire impossible | l'estimation d'un trajet avant de partir sort de la V1 (décision 2 d'Anthony, 21/10 : « on va rester à ça pour une version 1 ») |
| US-4.E3 [REMOVED] | Calcul trop long | l'estimation d'un trajet avant de partir sort de la V1 (décision 2 d'Anthony, 21/10 : « on va rester à ça pour une version 1 ») |
| US-3.P1 [REMOVED] | Inverser départ et arrivée | l'estimation d'un trajet avant de partir sort de la V1 (décision 2 d'Anthony, 21/10 : « on va rester à ça pour une version 1 ») |
| US-3.P2 [REMOVED] | Changer de voiture | « Changer » sur l'accueil (remplacée par V-1.2) |
| US-3.8 [REMOVED] | Partir à l'étranger | l'estimation d'un trajet avant de partir sort de la V1 (décision 2 d'Anthony, 21/10 : « on va rester à ça pour une version 1 ») (destination à l'étranger) |
| US-4.4 [REMOVED] | Voir les péages | les péages sortent de la V1 (décision 2 d'Anthony, 21/10) : moteur péages désactivé, aucun appel PTV |
| US-4.5 [REMOVED] | Voir les pays traversés | l'estimation d'un trajet avant de partir sort de la V1 (décision 2 d'Anthony, 21/10 : « on va rester à ça pour une version 1 ») (pays traversés d'un itinéraire) |
| US-4.E4 [REMOVED] | Péages indisponibles | les péages sortent de la V1 (décision 2 d'Anthony, 21/10) : moteur péages désactivé, aucun appel PTV |
| US-4.E5 [REMOVED] | Vignette sur le trajet | les péages sortent de la V1 (décision 2 d'Anthony, 21/10) : moteur péages désactivé, aucun appel PTV (vignettes) |
| US-4.E6 [REMOVED] | Pays sans prix moyen | l'estimation d'un trajet avant de partir sort de la V1 (décision 2 d'Anthony, 21/10 : « on va rester à ça pour une version 1 ») (pays traversés d'un itinéraire) |
| US-1.8 [REMOVED] | Stations hors de France | stations hors de France reprises sur T5 (remplacée par V-5.7) |
| US-5.5 [REMOVED] | Enregistrer le moteur | Les péages ne se calculent plus (estimation et péages hors V1) : basculer le fournisseur des péages ne change rien de visible. |
| US-5.E3 [REMOVED] | Bascule de secours | Même raison : aucun calcul de péages en V1, donc aucune bascule de secours à constater. |
| US-6.1 [REMOVED] | Enregistrer en roulant | « Enregistrer en roulant » devient le bouton Démarrer de l'accueil (remplacée par V-1.3) |
| US-6.2 [REMOVED] | Suivre en direct | suivi en direct repris sur T3 (remplacée par V-3.1) |
| US-6.3 [REMOVED] | Garder l'écran allumé | l'appli Android enregistre écran éteint ; la version web garde le verrou d'écran (remplacée par V-3.2) |
| US-6.4 [REMOVED] | Mettre en pause | pause reprise sur T3 et dans la notification (remplacée par V-3.4, V-3.3) |
| US-6.5 [REMOVED] | Arrêter et voir le coût | Arrêter ouvre la fin de trajet T4 (remplacée par V-3.5) |
| US-6.6 [REMOVED] | Voir ma courbe de vitesse | courbe de vitesse reprise sur T4, avec la courbe de consommation (remplacée par V-4.5, V-4.6) |
| US-3.9 [REMOVED] | Aller au Royaume-Uni | l'estimation d'un trajet avant de partir sort de la V1 (décision 2 d'Anthony, 21/10 : « on va rester à ça pour une version 1 ») (destination au Royaume-Uni) |
| US-1.9 [REMOVED] | Stations au Royaume-Uni | stations du Royaume-Uni reprises sur T5 (remplacée par V-5.7) |
