# Jalon 3 — Péages, Europe et moteurs : plan de cas d'usage

**Démonstration** : Je branche ma clé PTV dans l'écran Moteurs, je calcule Albi → Barcelone puis Albi → Milan : le coût total ajoute les péages réels, chaque pays traversé a son prix moyen du jour, et à Barcelone la carte montre les stations espagnoles.

**Écrans possédés** : S5 Moteurs · traversés : S1 Prix, S3 Trajets, S4 Résultat du trajet

Référence visuelle : `docs/pipeline/design/mockup.html` (écran nommé à chaque étape). Exécuté sur l'appli DÉPLOYÉE, données réelles (prix officiels, IGN, ADEME). Captures dans `tests/e2e/screenshots/m3/`.

> **Livraison (2026-10-22)** : les histoires retirées de la V1 ont été ôtées de ce plan (liste et raisons : `docs/pipeline/reconciliation-report.md` ; plan d'origine dans l'historique git). Les étapes restantes ont été rejouées sur l'appli finale ; captures de livraison dans `tests/e2e/final/`.

## US-5.1 — Ouvrir les moteurs

En tant qu'administrateur, j'ouvre l'écran Moteurs à l'adresse /moteurs (plus de bouton ⚙ dans l'appli en V1).

1. Partir de : je suis connecté comme administrateur (écran Moteurs) — capture `US-5.1-01-ouvrir-les-moteurs-avant.png`
2. Faire : j'ouvre l'adresse /moteurs (aucun bouton dans l'appli en V1) ; constater : l'écran Moteurs liste les 7 services avec leur fournisseur et leur état — capture `US-5.1-02-ouvrir-les-moteurs-apres.png`


## US-5.2 — Choisir le fournisseur

En tant qu'administrateur, je choisis le fournisseur branché pour chaque service.

1. Partir de : l'écran Moteurs (écran Moteurs) — capture `US-5.2-01-choisir-le-fournisseur-avant.png`
2. Faire : je choisis HERE au lieu de PTV pour les péages dans le choix du fournisseur ; constater : l'état passe à « Clé à coller » si HERE demande une clé, sinon « Prêt · sans clé » — capture `US-5.2-02-choisir-le-fournisseur-apres.png`


## US-5.3 — Coller la clé

En tant qu'administrateur, je colle la clé d'API d'un fournisseur ; elle n'est jamais réaffichée.

1. Partir de : le champ clé des péages (écran Moteurs) — capture `US-5.3-01-coller-la-cl-avant.png`
2. Faire : je colle une clé et j'enregistre ; constater : la clé est stockée chiffrée côté serveur et le champ n'affiche plus que ses 4 derniers caractères — capture `US-5.3-02-coller-la-cl-apres.png`
3. Partir de : une clé enregistrée (écran Moteurs) — capture `US-5.3-03-coller-la-cl-avant.png`
4. Faire : je recharge l'écran ; constater : la clé complète n'apparaît nulle part, ni dans la page ni dans les réponses réseau — capture `US-5.3-04-coller-la-cl-apres.png`


## US-5.4 — Tester la connexion

En tant qu'administrateur, je teste la connexion d'un moteur avant de l'enregistrer.

1. Partir de : une clé PTV valide collée (écran Moteurs) — capture `US-5.4-01-tester-la-connexion-avant.png`
2. Faire : je touche Tester la connexion ; constater : un vrai calcul de test est envoyé à PTV et l'état affiche « Connecté » — capture `US-5.4-02-tester-la-connexion-apres.png`


## US-5.E1 — Moteurs invisibles aux visiteurs

En tant que simple utilisateur, je ne vois ni n'atteins l'écran Moteurs.

**Cas limite.** Mise en place : session non administrateur (identifiant anonyme)

1. Mettre en place : un appareil non administrateur (écran Moteurs) — capture `US-5.E1-E1-01-declencheur.png`
2. Action : l'appli s'ouvre — capture `US-5.E1-E1-02-resultat.png`
3. Vérifier : aucun bouton ni lien vers les moteurs n'existe et toute lecture ou écriture de la table des moteurs est refusée par le serveur ; puis rétablir le réseau / les données et vérifier le retour à l'état normal — capture `US-5.E1-E1-03-retour.png`


## US-5.E2 — Clé refusée

En tant qu'administrateur, une clé invalide est signalée et n'est pas enregistrée comme active.

**Cas limite.** Mise en place : clé volontairement invalide collée dans le champ

1. Mettre en place : une clé invalide collée (écran Moteurs) — capture `US-5.E2-E1-01-declencheur.png`
2. Action : je touche Tester la connexion — capture `US-5.E2-E1-02-resultat.png`
3. Vérifier : l'état affiche « Clé refusée par PTV (401) » et Enregistrer garde l'ancien fournisseur actif ; puis rétablir le réseau / les données et vérifier le retour à l'état normal — capture `US-5.E2-E1-03-retour.png`

**Cas limite 2 — quota du jour, la clé n'est pas refusée** (ajout round 5). Mise en place : réelle, quota du jour PTV dépassé.

1. Vérifier : Tester la connexion sur PTV affiche « PTV : quota du jour atteint — péages indisponibles jusqu'à <heure> », jamais « Clé refusée » — capture `US-5.E2-E2-01-quota-ptv.png`


## US-5.6 — Où trouver ma clé (correction d'Anthony, 2026-10-21)

1. Partir de : l'écran Moteurs, connecté administrateur (écran Moteurs) — capture `US-5.6-01-ou-trouver-ma-cle-avant.png`
2. Faire : regarder la fiche Péages (PTV) ; constater : le lien « Où trouver ma clé » sous le champ clé pointe vers https://developer.myptv.com/en avec la consigne « menu API Keys » — capture `US-5.6-02-ou-trouver-ma-cle-apres.png`
3. Faire : basculer la fiche Itinéraire sur Stadia ; constater : le lien pointe vers https://client.stadiamaps.com/dashboard/ — capture `US-5.6-03-lien-stadia.png`
4. Faire : regarder une fiche sans clé (Voitures) ; constater : aucun lien de clé — capture `US-5.6-04-sans-cle.png`
