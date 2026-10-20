# Milestone 2 Summary

## Known Limitations
- Base des voitures : 550 versions issues des données ADEME (voitures thermiques et hybrides non rechargeables) ; électriques, hybrides rechargeables et modèles très récents absents.
- Bi-carburation essence/GPL : chaque ligne est chiffrée au carburant de sa consommation. Deux versions publiées avec une seule ligne ADEME (Jogger 110 ch, Kangoo 102 ch) sont comptées à l'essence, par déduction.
- Le prix personnel n'est pas gardé dans l'historique : un trajet rejoué est recalculé au prix moyen du jour, comme le prévoit la spec.
- Le message « Propositions indisponibles » (service de lieux injoignable) est vérifié en direct par l'audit mais n'a ni test automatique ni capture.
- Captures : plusieurs portent des repères orange ajoutés par le test pour la lecture (ordre du focus numéroté, bandeau de mesure) ; sur US-A11Y-001-02 la pastille « 1 » cache la première lettre de « Mettre mon prix », et sur US-A11Y-004-02 le bandeau cache le bas de la note d'estimation. US-3.E3-E1-01/02 et US-3.4-03/04 se ressemblent (seul le focus change) ; la persistance après réouverture est prouvée par les tests.
- Un seul cas simulé : « calcul trop long » (la vraie requête est retardée de 3 s par le test).
- Base de production : les tests rejoués sur la prod y ont laissé des identités anonymes et des trajets de test (environ 344 identités et 164 trajets relevés par l'audit). Non purgés : impossible de les distinguer d'un usage réel.

## What's Next
- Jalon 3 — Péages et Europe : coût des péages sur le trajet, pays traversés, itinéraires hors de France. Il demande une clé PTV Developer (et Stadia Maps pour l'Europe) à créer par Anthony.
