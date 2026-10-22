# Jalon 2 — Le coût d'un trajet : plan de cas d'usage

**Démonstration** : Je choisis ma voiture, je calcule Albi → Bordeaux, je vois le coût, les tronçons et leur consommation, je mets mon prix, je retrouve le trajet dans l'historique.

**Écrans possédés** : S3 Trajets, S4 Résultat du trajet

Référence visuelle : `docs/pipeline/design/mockup.html` (écran nommé à chaque étape). Exécuté sur l'appli DÉPLOYÉE, données réelles (prix officiels, IGN, ADEME). Captures dans `tests/e2e/screenshots/m2/`.

> **Livraison (2026-10-22)** : les histoires retirées de la V1 ont été ôtées de ce plan (liste et raisons : `docs/pipeline/reconciliation-report.md` ; plan d'origine dans l'historique git). Les étapes restantes ont été rejouées sur l'appli finale ; captures de livraison dans `tests/e2e/final/`.

## US-3.E3 — Historique vide

En tant que nouvel utilisateur, je comprends que l'historique se remplira.

**Cas limite.** Mise en place : nouvel identifiant anonyme, aucun trajet

1. Mettre en place : aucun trajet enregistré (écran Historique) — capture `US-3.E3-E1-01-declencheur.png`
2. Action : j'ouvre l'onglet Historique — capture `US-3.E3-E1-02-resultat.png`
3. Vérifier : l'historique affiche « Aucun trajet enregistré. » et des totaux à zéro ; puis retour à l'onglet Trajet — capture `US-3.E3-E1-03-retour.png`


## US-4.E2 — Prix perso invalide

En tant que conducteur, une saisie de prix aberrante est refusée.

**Cas limite.** Mise en place : saisie clavier « 12 » puis « abc »

1. Mettre en place : le champ prix ouvert en touchant le compteur du prix (écran Fin de trajet) — capture `US-4.E2-E1-01-declencheur.png`
2. Action : je saisis 12 ou une lettre — capture `US-4.E2-E1-02-resultat.png`
3. Vérifier : le champ est signalé « Entre un prix entre 0,50 et 4,00 €/L » et le coût reste celui d'avant ; puis le champ est refermé — capture `US-4.E2-E1-03-retour.png`


