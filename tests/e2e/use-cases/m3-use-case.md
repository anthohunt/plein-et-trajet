# Jalon 3 — Péages, Europe et moteurs : plan de cas d'usage

**Démonstration** : Je branche ma clé PTV dans l'écran Moteurs, je calcule Albi → Barcelone puis Albi → Milan : le coût total ajoute les péages réels, chaque pays traversé a son prix moyen du jour, et à Barcelone la carte montre les stations espagnoles.

**Écrans possédés** : S5 Moteurs · traversés : S1 Prix, S3 Trajets, S4 Résultat du trajet

Référence visuelle : `docs/pipeline/design/mockup.html` (écran nommé à chaque étape). Exécuté sur l'appli DÉPLOYÉE, données réelles (prix officiels, IGN, ADEME). Captures dans `tests/e2e/screenshots/m3/`.


## US-3.8 — Partir à l'étranger

En tant que conducteur, je saisis une arrivée à l'étranger et l'appli calcule le trajet à travers l'Europe.

1. Partir de : le champ arrivée (écran Trajets) — capture `US-3.8-01-partir-l-tranger-avant.png`
2. Faire : je tape « Barce » et choisis Barcelone, Espagne ; constater : le calcul aboutit avec un itinéraire qui traverse la France puis l'Espagne — capture `US-3.8-02-partir-l-tranger-apres.png`


## US-4.4 — Voir les péages

En tant que conducteur, je vois le détail des péages du trajet et leur total, inclus dans le coût.

1. Partir de : un trajet Albi → Barcelone calculé (écran Résultat du trajet) — capture `US-4.4-01-voir-les-pages-avant.png`
2. Faire : je lis le détail des péages ; constater : chaque section payante affiche son montant TTC en euros (« gratuit » si 0), le total des péages est affiché et ajouté au coût total — capture `US-4.4-02-voir-les-pages-apres.png`
3. Partir de : un trajet sans autoroute payante (écran Résultat du trajet) — capture `US-4.4-03-voir-les-pages-avant.png`
4. Faire : le résultat s'affiche ; constater : le détail des péages indique « Aucun péage sur cet itinéraire » et 0,00 € — capture `US-4.4-04-voir-les-pages-apres.png`


## US-4.5 — Voir les pays traversés

En tant que conducteur, je vois pour chaque pays traversé les km, les litres et le prix moyen du jour appliqué.

1. Partir de : un trajet Albi → Milan calculé (écran Résultat du trajet) — capture `US-4.5-01-voir-les-pays-traverss-avant.png`
2. Faire : je lis les pays traversés ; constater : chaque pays affiche km, litres, prix moyen du jour de son carburant et coût, et la somme des coûts pays égale le coût carburant — capture `US-4.5-02-voir-les-pays-traverss-apres.png`


## US-4.E4 — Péages indisponibles

En tant que conducteur, si le calcul des péages échoue, j'obtiens quand même le coût carburant.

**Cas limite.** Mise en place : page.route('**/functions/v1/estimer-trajet', r => r.fulfill({status:200, body: corps_sans_peages_avec_erreur_peages}))

1. Mettre en place : le service de péages en erreur (écran Résultat du trajet) — capture `US-4.E4-E1-01-declencheur.png`
2. Action : je lance un calcul — capture `US-4.E4-E1-02-resultat.png`
3. Vérifier : le coût carburant s'affiche et le détail des péages indique « Péages non disponibles pour l'instant » sans les ajouter au total ; puis rétablir le réseau / les données et vérifier le retour à l'état normal — capture `US-4.E4-E1-03-retour.png`


## US-4.E5 — Vignette sur le trajet

En tant que conducteur traversant la Suisse ou l'Autriche, je suis prévenu qu'une vignette est exigée.

**Cas limite.** Mise en place : trajet réel Albi → Milan via Genève (traverse la Suisse)

1. Mettre en place : un trajet qui traverse la Suisse (écran Résultat du trajet) — capture `US-4.E5-E1-01-declencheur.png`
2. Action : le résultat s'affiche — capture `US-4.E5-E1-02-resultat.png`
3. Vérifier : le détail des péages porte la ligne « Vignette suisse obligatoire (non comptée) » ; puis rétablir le réseau / les données et vérifier le retour à l'état normal — capture `US-4.E5-E1-03-retour.png`


## US-4.E6 — Pays sans prix moyen

En tant que conducteur, si un pays traversé n'a pas de prix moyen connu, je le sais.

**Cas limite.** Mise en place : trajet réel vers Belgrade (Serbie, hors Bulletin pétrolier UE)

1. Mettre en place : un pays traversé absent des moyennes (ex. Serbie) (écran Résultat du trajet) — capture `US-4.E6-E1-01-declencheur.png`
2. Action : le résultat s'affiche — capture `US-4.E6-E1-02-resultat.png`
3. Vérifier : sa ligne dans les pays traversés porte « prix non publié — moyenne européenne appliquée » et le prix utilisé ; puis rétablir le réseau / les données et vérifier le retour à l'état normal — capture `US-4.E6-E1-03-retour.png`


## US-1.8 — Stations hors de France

En tant que conducteur à l'étranger, je vois les stations du pays où je suis s'il publie ses prix.

1. Partir de : ma position à Barcelone (écran Prix) — capture `US-1.8-01-stations-hors-de-france-avant.png`
2. Faire : j'ouvre l'onglet Prix ; constater : la carte des stations et la liste affichent les stations espagnoles avec leurs prix officiels — capture `US-1.8-02-stations-hors-de-france-apres.png`
3. Partir de : ma position dans un pays qui ne publie pas ses prix (écran Prix) — capture `US-1.8-03-stations-hors-de-france-avant.png`
4. Faire : j'ouvre l'onglet Prix ; constater : un message indique « Ce pays ne publie pas les prix station par station » et affiche le prix moyen national — capture `US-1.8-04-stations-hors-de-france-apres.png`


## US-5.1 — Ouvrir les moteurs

En tant qu'administrateur, j'ouvre l'écran Moteurs depuis le bouton ⚙.

1. Partir de : je suis connecté comme administrateur (écran Moteurs) — capture `US-5.1-01-ouvrir-les-moteurs-avant.png`
2. Faire : je touche le bouton moteurs ⚙ ; constater : l'écran Moteurs liste les 6 services avec leur fournisseur et leur état — capture `US-5.1-02-ouvrir-les-moteurs-apres.png`


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


## US-5.5 — Enregistrer le moteur

En tant qu'administrateur, j'enregistre un moteur et l'appli l'utilise aussitôt.

1. Partir de : le moteur péages basculé sur HERE et enregistré (écran Moteurs) — capture `US-5.5-01-enregistrer-le-moteur-avant.png`
2. Faire : je calcule Albi → Barcelone ; constater : les péages viennent de HERE sans redéploiement de l'appli — capture `US-5.5-02-enregistrer-le-moteur-apres.png`


## US-5.E1 — Moteurs invisibles aux visiteurs

En tant que simple utilisateur, je ne vois ni n'atteins l'écran Moteurs.

**Cas limite.** Mise en place : session non administrateur (identifiant anonyme)

1. Mettre en place : un appareil non administrateur (écran Moteurs) — capture `US-5.E1-E1-01-declencheur.png`
2. Action : l'appli s'ouvre — capture `US-5.E1-E1-02-resultat.png`
3. Vérifier : le bouton moteurs n'est pas affiché et toute lecture ou écriture de la table des moteurs est refusée par le serveur ; puis rétablir le réseau / les données et vérifier le retour à l'état normal — capture `US-5.E1-E1-03-retour.png`


## US-5.E2 — Clé refusée

En tant qu'administrateur, une clé invalide est signalée et n'est pas enregistrée comme active.

**Cas limite.** Mise en place : clé volontairement invalide collée dans le champ

1. Mettre en place : une clé invalide collée (écran Moteurs) — capture `US-5.E2-E1-01-declencheur.png`
2. Action : je touche Tester la connexion — capture `US-5.E2-E1-02-resultat.png`
3. Vérifier : l'état affiche « Clé refusée par PTV (401) » et Enregistrer garde l'ancien fournisseur actif ; puis rétablir le réseau / les données et vérifier le retour à l'état normal — capture `US-5.E2-E1-03-retour.png`


## US-5.E3 — Bascule de secours

En tant que conducteur, si le moteur principal tombe, le calcul passe par le moteur de secours.

**Cas limite.** Mise en place : page.route('**/ptv**', r => r.fulfill({status:503})) côté fonction : fournisseur principal coupé

1. Mettre en place : PTV en panne et HERE enregistré en secours (écran Moteurs) — capture `US-5.E3-E1-01-declencheur.png`
2. Action : je calcule un trajet — capture `US-5.E3-E1-02-resultat.png`
3. Vérifier : les péages viennent de HERE et l'écran Moteurs note la bascule avec l'heure ; puis rétablir le réseau / les données et vérifier le retour à l'état normal — capture `US-5.E3-E1-03-retour.png`


## Histoires transverses vérifiées sur ce jalon

- **US-A11Y-001 — Navigation au clavier** : 1. sur chaque écran du jalon, j'utilise Tab et Maj+Tab — capture `US-A11Y-001-01-m3.png` ; 2. constater : chaque contrôle reçoit le focus dans l'ordre de lecture avec un contour visible — capture `US-A11Y-001-02-m3.png`
- **US-A11Y-002 — Focus de la fiche** : 1. sur chaque écran du jalon, elle s'ouvre — capture `US-A11Y-002-01-m3.png` ; 2. constater : le focus va sur son titre ; à la fermeture il revient sur l'élément qui l'a ouverte — capture `US-A11Y-002-02-m3.png`
- **US-A11Y-003 — Touche Échap** : 1. sur chaque écran du jalon, j'appuie sur Échap — capture `US-A11Y-003-01-m3.png` ; 2. constater : la fiche se ferme — capture `US-A11Y-003-02-m3.png`
- **US-A11Y-004 — Libellés lisibles** : 1. sur chaque écran du jalon, je parcours les pastilles et les prix — capture `US-A11Y-004-01-m3.png` ; 2. constater : chaque pastille annonce station et prix en euros, chaque bouton icône a un libellé — capture `US-A11Y-004-02-m3.png`
- **US-PERF-001 — Ouverture rapide** : 1. sur chaque écran du jalon, j'ouvre l'appli — capture `US-PERF-001-01-m3.png` ; 2. constater : la liste des stations est affichée en moins de 2,5 s — capture `US-PERF-001-02-m3.png`

## US-5.6 — Où trouver ma clé (correction d'Anthony, 2026-10-21)

1. Partir de : l'écran Moteurs, connecté administrateur (écran Moteurs) — capture `US-5.6-01-ou-trouver-ma-cle-avant.png`
2. Faire : regarder la fiche Péages (PTV) ; constater : le lien « Où trouver ma clé » sous le champ clé pointe vers https://developer.myptv.com/en avec la consigne « menu API Keys » — capture `US-5.6-02-ou-trouver-ma-cle-apres.png`
3. Faire : basculer la fiche Itinéraire sur Stadia ; constater : le lien pointe vers https://client.stadiamaps.com/dashboard/ — capture `US-5.6-03-lien-stadia.png`
4. Faire : regarder une fiche sans clé (Voitures) ; constater : aucun lien de clé — capture `US-5.6-04-sans-cle.png`
