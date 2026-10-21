# Concept — Prix carburant & coût de trajet

## Le problème
Les prix à la pompe varient fortement d'une station à l'autre et d'un jour à l'autre, et personne ne sait vraiment combien coûte un trajet en voiture. Les calculateurs existants appliquent une consommation moyenne fixe (« 6 L/100 ») qui ignore la vraie route : un trajet sur autoroute à 130 km/h, une traversée de ville avec ses arrêts ou une montée ne consomment pas la même chose. Résultat : on se trompe sur le coût d'un déplacement, d'un covoiturage, d'un week-end.

## L'utilisateur
Un conducteur particulier en France (public visé : grand public, premier utilisateur Anthony), sur téléphone ou ordinateur, qui veut (1) savoir où faire le plein moins cher autour de lui et (2) savoir combien va lui coûter un trajet précis avec SA voiture.

## La boucle cœur
1. **Prix** — j'ouvre l'appli, je vois la carte des stations autour de moi avec, en dessous, la liste triée par prix pour le carburant choisi ; je touche une station pour voir tous ses prix et l'heure de mise à jour.
2. **Trajet** — je saisis un départ, une arrivée, et ma voiture (marque → modèle → motorisation, mémorisée pour la fois suivante). L'appli calcule l'itinéraire réel, le découpe en tronçons (autoroute, route, ville, montées) avec leur vitesse et leurs arrêts typiques, et applique un modèle physique de la voiture (vitesse, accélérations, moteur) pour estimer les litres consommés.
3. Le coût = litres × prix moyen national du jour du carburant de la voiture ; je peux remplacer ce prix par le mien.
4. Le trajet rejoint l'historique ; un clic sur un ancien trajet le recalcule au prix du jour.

## Décisions de cadrage (arbitrées avec Anthony le 2026-10-20)
- Deux usages : prix live des stations en France · estimation du coût d'un trajet.
- Consommation calculée depuis l'itinéraire réel découpé en tronçons + modèle physique de la voiture ; l'utilisateur ne saisit que départ, arrivée, voiture.
- Écran Prix : carte autour de soi + liste triée par prix dessous.
- Prix au litre du trajet : moyenne nationale du jour, remplaçable par un prix saisi à la main.
- Voiture : marque → modèle → motorisation, infos techniques tirées d'une base en ligne, mémorisée pour la fois suivante.
- Historique des derniers trajets, recalcul au prix du jour au clic.
- Tranché par l'agent (Anthony a demandé d'arrêter les questions) : deux onglets en bas (Prix · Trajets, l'historique sous le formulaire) ; appli en français ; sélecteur de carburant sur l'écran Prix (Gazole, SP95-E10, SP95, SP98, E85, GPLc).

## Évolution du 2026-10-20 (après validation)
Anthony ajoute : **les péages** dans le coût du trajet, et **toute l'Europe** (pas seulement la France) — décision A : jalon 3, après le coût de trajet en France. Le coût d'un trajet = carburant (prix moyen du jour de chaque pays traversé) + péages voiture TTC. Les stations affichées s'étendent aux pays qui publient leurs prix.

## Hors-périmètre
- Pas de navigation GPS guidée : l'itinéraire sert au calcul, l'appli ne guide pas.
- Pas de comptes ni de partage social : pas de profil public, pas de commentaires sur les stations.
- Pas de saisie de prix par les utilisateurs : les prix viennent uniquement de la source officielle.
- Pas de voitures électriques ni de coût de recharge dans cette version.
- Pas d'aller-retour automatique (option C écartée). Le partage du coût entre passagers, écarté au cadrage, est entré dans la V1 du 2026-10-21 (nombre de personnes et part de chacun, essence seule : décision 1 de `v1-recentrage.md`).
- V1 (2026-10-21) : plus d'estimation d'un trajet avant de partir, plus de péages ; le coût est celui d'un trajet réellement roulé.
- Pas de garage multi-voitures : une voiture mémorisée (option B écartée).
- Pas de calcul de l'usure du véhicule ni de l'achat des vignettes (signalées, non chiffrées).
