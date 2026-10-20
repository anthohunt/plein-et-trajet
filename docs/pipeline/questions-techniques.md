# Questions techniques différées (cadrage → spécification)

- Source des prix « live » : flux open data officiel prix-carburants.gouv.fr / data.economie.gouv.fr (fréquence de mise à jour, quota, format) — soulevé par « vue live des prix des stations ».
- Source des consommations par modèle de voiture (base ADEME Car Labelling ? saisie manuelle de secours ?) — soulevé par « ajouter un trajet avec le modèle de sa voiture ».
- Calcul de la distance d'un trajet (API d'itinéraire : OSRM, OpenRouteService, IGN…) — soulevé par « estimer le prix du trajet ».
- Modèle physique de consommation (masse, aérodynamique SCx, résistance au roulement, rendement moteur, profil de vitesse et d'accélérations le long de l'itinéraire, dénivelé) : quelles données véhicule, quel modèle (type VSP / COPERT), d'où vient le profil de vitesse de la route — soulevé par « la consommation se calcule via la vitesse et les accélérations vs le moteur ».
- Base technique des véhicules (marque → modèle → motorisation, avec masse, puissance, couple, SCx, consommation homologuée WLTP) : quelle base en ligne / API (ADEME Car Labelling, EEA CO2 cars, base commerciale…), licence, couverture — soulevé par « on aurait une database en ligne, une API pour récupérer les infos techniques ».
- Mémorisation de la voiture « pour la prochaine fois » : sur l'appareil seul ou rattachée à un compte — soulevé par le choix A sur la voiture.
