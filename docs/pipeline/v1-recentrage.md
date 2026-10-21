# Recentrage V1 — décisions d'Anthony (21/10/2026)

## Parcours de référence (mots d'Anthony, résumés)
Trajet Toulouse → Paris à plusieurs, frais partagés. Les péages se lisent sur la facture ; l'essence, non. La V1 doit donner le coût exact de l'essence dépensée :
1. Voiture : marque → modèle → motorisation (consommation de référence).
2. Prix de l'essence : moyenne France du jour pour le carburant de la voiture par défaut, ou prix saisi à la main ; modifiable avant ou à la fin.
3. Démarrer : mesure de tout le trajet (vitesse, accélérations, ralentissements).
4. Arrêter : consommation réelle → litres → euros.
« C'est vraiment ça, c'est la version 1 de l'application que je veux. Simple et efficace. »

## Décisions, une par une
1. Partage des frais : **A** — on indique le nombre de personnes, l'appli affiche le total et la part par personne (essence seule).
2. Périmètre V1 : trajet roulé + partage des frais + **carte des prix des stations** (gardée : « lorsque je suis en route, si je veux chercher des stations d'essence sur mon chemin qui sont pas trop chères »), sur toute l'Europe et le Royaume-Uni. Le reste (estimation d'un trajet avant de partir, péages) sort de la V1 : « on va rester à ça pour une version 1, pour commencer ».
3. Carte pendant le trajet : **A** — bouton « Stations » sur l'écran En route, carte centrée sur la position, enregistrement en fond, retour au trajet. Navigation libre comme Google Maps : on déplace la carte vers une autre zone et un bouton « Rechercher dans cette zone » recharge les stations (« comme sur maps […] ça me met rechercher dans cette zone, ben, je peux faire la même chose »).
4. Écran d'accueil : **A** — onglet « Trajet » : voiture mémorisée, prix de l'essence (moyenne du jour ou le sien), nombre de personnes, gros bouton Démarrer ; la carte des stations dans un second onglet.
5. Après « Arrêter » : **A** — historique des trajets (date, départ → arrivée, km, litres, coût, part par personne, courbe de vitesse) ; prix et nombre de personnes corrigeables après coup ; suppression possible.
6. Voiture : la vraie voiture, saisie **à l'avance** par l'utilisateur, le plus simplement possible ; idéal évoqué : la plaque d'immatriculation, avec les références du modèle prises en ligne (« Renault Clio 4 2017, 120 chevaux »). Recherche des API plaque en cours (21/10) : voir la question suivante.
   - Vérifié le 21/10 : aucune API de plaque gratuite et sans carte (api-plaque.com 10/mois via RapidAPI avec carte ; RegCheck 10 gratuites puis ~0,15 £ ; API ANTS « Extrait d'immatriculation » réservée aux collectivités pour le stationnement résidentiel).
   - CORRECTION : la base ADEME Car Labelling ne contient que le catalogue neuf actuel (550 lignes dans l'appli) ; la Clio IV 2017 n'y est pas.
   - Base qui couvre la vraie voiture : EEA « CO2 cars » (Discodata, sans clé), toutes les voitures immatriculées en UE depuis 2010, avec les codes de la carte grise : D.2 type-variante-version (ex. Clio IV TCe 120 2017 : R / 5RBU / 5RBU0C), K réception CE (e2*2001/116*0327*79), P.2 kW (87), P.1 cm³ (1197), G.1 masse (1165 kg), V.7 CO2 (118 g/km NEDC).
   - Décision : **A** — saisie par le code D.2 de la carte grise (type-variante-version), identification exacte dans la base EEA ; secours : recherche « clio 2017 120 » (nom + année + puissance). Une seule fois, mémorisée.
