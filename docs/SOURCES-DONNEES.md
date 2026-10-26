# Sources des données

L'application n'invente aucune donnée : chaque chiffre vient d'une source ouverte, affichée avec sa provenance.

| Donnée | Source | Licence / conditions |
|---|---|---|
| Prix des carburants en France | data.economie.gouv.fr, « Prix des carburants en France – flux instantané » | Licence Ouverte 2.0 (Etalab) : citer la source |
| Consommation des véhicules (France) | ADEME, Car Labelling | Licence Ouverte |
| Émissions et consommation (Europe) | Agence européenne pour l'environnement (EEA), base « CO2 cars » | Réutilisation libre avec mention |
| Moyennes de prix UE | Bulletin pétrolier hebdomadaire de la Commission européenne | Réutilisation libre avec mention |
| Adresses et communes | Géoplateforme de l'IGN (data.geopf.fr) | Licence Ouverte |
| Itinéraires | Valhalla (instance configurée par vous), Géoplateforme IGN (BD TOPO) ; péages : fournisseurs au choix (clé à fournir) | Selon le fournisseur |
| Stations et prix en Espagne, Roumanie, etc. | Sites officiels de ces pays, par les relais `api/relais-es.js` et `api/relais-ro.js` | Selon chaque pays. **À vérifier avant de les activer** ; `relais-ro.js` désactive la vérification du certificat TLS du site roumain, dont le certificat est invalide : ne l'activez que si vous acceptez ce compromis |
| Autres pays (stations et prix) | Allemagne : Tankerkönig (CC BY 4.0, clé à demander) ; Autriche : E-Control ; Danemark ; Italie : MIMIT ; Portugal : DGEG ; Slovénie ; Croatie ; Royaume-Uni : fichiers publiés par les enseignes (schéma officiel de transparence des prix) | Conditions propres à chaque pays : **à relire dans `supabase/functions/sync-stations-pays` avant d'activer un pays** |
| Altitude, météo, change | Open-Meteo (CC BY 4.0, usage non commercial sur l'offre gratuite) ; Frankfurter (taux de change de la BCE) | Mention de la source |
| Fond de carte | OpenFreeMap (tuiles) ; données OpenStreetMap | ODbL : la mention « © contributeurs OpenStreetMap » reste affichée sur la carte |
| Prix à la station (point d'accès interne) | `prix-carburants.gouv.fr`, si vous l'utilisez | Point d'accès interne du site, conditions non publiées : préférez le flux ouvert ci-dessus |

Les données de test (`tests/fixtures`) sont des extraits de ces jeux ouverts.
