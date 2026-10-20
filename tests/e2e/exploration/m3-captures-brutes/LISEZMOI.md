# Captures brutes du jalon 3

Pour chaque capture du plan (`tests/e2e/use-cases/m3-use-case.md`), `run-m3.mjs` prend DEUX vraies prises de vue successives de la même page déployée, sans retouche : la **brute** (ici : propre, ni étiquette ni décalage) puis la capture de **livraison** (`tests/e2e/delivery/`, nom exact du plan). Seule la livraison peut recevoir une petite étiquette jaune « Annotation de test » posée en haut de l'écran, quand la preuve ne peut pas se voir dans l'interface (réponses réseau, mesure de durée, numéros d'ordre de tabulation) ; elle est posée après la brute et retirée juste après la photo.

Quand aucune étiquette n'est posée, les deux prises de vue d'une même étape peuvent coïncider octet pour octet : c'est normal (même page, même état), rien n'est fabriqué pour les différencier. De même, quand deux étapes du plan montrent légitimement le même écran, le journal d'exploration (`m3-exploration-log.md`) le dit à la ligne de la capture (« même écran que … »).

Vues complémentaires (hors plan, pays branchés au round 2) : `tests/e2e/exploration/m3-captures-pays/`.
