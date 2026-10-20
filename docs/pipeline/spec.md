# Spécification — Plein & Trajet

## Vision
Une appli web en français, pensée d'abord pour le téléphone, qui répond à deux questions de conducteur : **où faire le plein moins cher autour de moi, maintenant ?** et **combien va me coûter ce trajet avec ma voiture ?** Les prix sont les prix officiels déclarés par les stations (flux instantané du ministère de l'Économie). Le coût d'un trajet vient de l'itinéraire réel, découpé en tronçons, auquel on applique la consommation de la voiture choisie selon la vitesse, les arrêts et le dénivelé, puis le prix moyen national du jour (remplaçable par le prix de l'utilisateur).

## Sections et écrans (référence : `docs/pipeline/design/mockup.html`, validé le 2026-10-20)

- **Prix** — S1 *Prix* : sélecteur de carburant (Gazole, SP95-E10, SP95, SP98, E85, GPLc), carte des stations autour de soi (pastilles prix, vert = moitié la moins chère, orange = l'autre), liste triable « moins cher / plus proche » avec enseigne, distance, ancienneté du prix, écart à la moyenne France et prix sur plaque de totem. S2 *Fiche station* : feuille montante, tous les carburants (ou « non vendu »), heure de mise à jour, services, bouton « Coût d'un trajet jusqu'ici ».
- **Trajets** — S3 *Trajets* : départ, arrivée (propositions au fil de la frappe), voiture marque → modèle → motorisation mémorisée, bouton Calculer, historique (recalcul au clic, suppression). S4 *Résultat du trajet* : route, voiture, coût (plaque de totem géante), litres, km, L/100 km, prix utilisé + « Mettre mon prix », tronçons dépliables (autoroute, route, ville, montée) avec litres et barre proportionnelle.
- Navigation : deux onglets en bas, Prix et Trajets.

## Hors-périmètre
Pas de guidage GPS, pas de comptes ni de social, pas de saisie de prix par les utilisateurs, pas d'électrique, pas d'aller-retour ni de partage de coût, pas de garage multi-voitures, pas de péages ni d'usure.

## Système de design (résumé de `design/design-system.md`)
Totems de prix : panneau sombre, chiffres verts lumineux (Chivo Mono), troisième décimale plus petite et surélevée. Titres Big Shoulders Display, texte Barlow. Fond béton clair / asphalte en sombre. Un seul accent (vert LED) réservé aux prix ; sémantique vert = bas, orange brûlé = haut. Un seul mouvement : défilement des chiffres au changement de carburant ou au recalcul (coupé si animations réduites). Tokens : `design/tokens.json`.

## Modèle de consommation
Pour chaque tronçon : phase WLTP choisie par la vitesse typique (basse < 40 km/h, moyenne 40-65, haute 65-100, très haute > 100) → L/100 km de base de la voiture (ADEME) ; + arrêts : ½·m·v² par arrêt ; + dénivelé positif : m·g·Δh ; énergies converties en litres (8,9 kWh/L essence, 9,9 kWh/L gazole ; rendement 0,25 / 0,30). Masse = masse en ordre de marche + 75 kg. Arrêts = manœuvres des étapes IGN ; dénivelé = altimétrie IGN tous les 500 m.

## Feuille de route

- **Jalon 1 — Les prix autour de moi** (écrans S1, S2) : J'ouvre l'appli à Albi, je vois les vraies stations sur la carte et dans la liste avec leurs prix officiels du jour, je change de carburant, je trie, j'ouvre une fiche. 14 histoires.
- **Jalon 2 — Le coût d'un trajet** (écrans S3, S4) : Je choisis ma voiture, je calcule Albi → Bordeaux, je vois le coût, les tronçons et leur consommation, je mets mon prix, je retrouve le trajet dans l'historique. 19 histoires.
- Transverses (5) : Accessibilité et performance s'appliquent à tous les écrans : vérifiées à chaque jalon, auditées au durcissement.

## Histoires utilisateur

### Principales (testées sur la maquette)

**US-1.1 — Ouvrir les prix** (S1) — En tant que conducteur, je touche l'onglet Prix pour voir les stations autour de moi.
- ÉTANT DONNÉ l'appli ouverte sur l'onglet Trajets, QUAND je touche l'onglet Prix, ALORS la carte et la liste des stations autour de ma position s'affichent
- ÉTANT DONNÉ la position refusée, QUAND l'onglet Prix s'ouvre, ALORS la carte est centrée sur la dernière ville saisie ou sur Albi par défaut, avec un message pour activer la localisation

**US-1.2 — Choisir mon carburant** (S1) — En tant que conducteur, je choisis mon carburant dans le sélecteur pour ne voir que les prix qui me concernent.
- ÉTANT DONNÉ la liste en SP95-E10, QUAND je touche Gazole dans le sélecteur de carburant, ALORS chaque pastille et chaque ligne affichent le prix gazole et le titre devient « Stations · Gazole »
- ÉTANT DONNÉ une station qui ne vend pas le carburant choisi, QUAND je change de carburant, ALORS elle disparaît de la carte et de la liste

**US-1.3 — Voir les stations sur la carte** (S1) — En tant que conducteur, je regarde la carte des stations pour repérer où elles sont.
- ÉTANT DONNÉ des stations synchronisées dans un rayon de 10 km, QUAND la carte des stations s'affiche, ALORS chaque station est une pastille à sa position réelle avec son prix
- ÉTANT DONNÉ je déplace la carte, QUAND je relâche, ALORS les stations de la nouvelle zone se chargent

**US-1.4 — Toucher une pastille** (S1) — En tant que conducteur, je touche la pastille d'une station sur la carte pour ouvrir sa fiche.
- ÉTANT DONNÉ la carte affichée, QUAND je touche une pastille de station, ALORS la fiche de cette station s'ouvre
- ÉTANT DONNÉ des prix différents autour de moi, QUAND la carte s'affiche, ALORS les pastilles de la moitié la moins chère sont marquées vert, les autres orange

**US-1.5 — Trier la liste** (S1) — En tant que conducteur, je trie la liste par prix ou par distance.
- ÉTANT DONNÉ la liste triée par prix, QUAND je touche « Plus proche » dans le tri de la liste, ALORS la liste se trie par distance croissante
- ÉTANT DONNÉ le tri par distance, QUAND je touche « Moins cher », ALORS la liste se retrie par prix croissant

**US-1.6 — Lire une station dans la liste** (S1) — En tant que conducteur, je lis la liste des stations triée et touche une ligne de station pour voir sa fiche.
- ÉTANT DONNÉ la liste affichée, QUAND je lis une ligne de station, ALORS je vois enseigne, distance, ancienneté du prix, écart à la moyenne France et le prix à trois décimales
- ÉTANT DONNÉ une ligne de station, QUAND je la touche, ALORS sa fiche s'ouvre

**US-2.1 — Fermer la fiche** (S2) — En tant que conducteur, je ferme la fiche station pour revenir à la carte.
- ÉTANT DONNÉ une fiche station ouverte, QUAND je touche le bouton fermer la fiche ou la touche Échap, ALORS la fiche se ferme et le carburant choisi n'a pas changé

**US-2.2 — Calculer un trajet vers la station** (S2) — En tant que conducteur, je lance un trajet vers cette station depuis sa fiche.
- ÉTANT DONNÉ la fiche d'une station, QUAND je touche « Coût d'un trajet jusqu'ici » (bouton trajet station), ALORS l'onglet Trajets s'ouvre avec l'arrivée pré-remplie à l'adresse de la station

**US-3.1 — Ouvrir les trajets** (S3) — En tant que conducteur, je touche l'onglet Trajets pour estimer le coût d'un trajet.
- ÉTANT DONNÉ l'onglet Prix, QUAND je touche l'onglet Trajets, ALORS le formulaire et l'historique s'affichent

**US-3.2 — Saisir le départ** (S3) — En tant que conducteur, je saisis mon lieu de départ.
- ÉTANT DONNÉ le champ départ vide, QUAND je tape « Alb », ALORS des propositions de lieux apparaissent et je peux en choisir une

**US-3.3 — Saisir l'arrivée** (S3) — En tant que conducteur, je saisis mon lieu d'arrivée.
- ÉTANT DONNÉ le champ arrivée vide, QUAND je tape « Bord », ALORS des propositions de lieux apparaissent et je peux en choisir une

**US-3.4 — Choisir ma voiture** (S3) — En tant que conducteur, je choisis ma voiture par marque, modèle et motorisation, et l'appli s'en souvient.
- ÉTANT DONNÉ aucune voiture mémorisée, QUAND je choisis Peugeot, puis 208, puis une motorisation, ALORS la voiture est enregistrée et son carburant est affiché
- ÉTANT DONNÉ une voiture mémorisée, QUAND je rouvre l'appli, ALORS le choix de voiture est pré-rempli

**US-3.5 — Calculer le coût** (S3) — En tant que conducteur, je touche Calculer pour obtenir le coût estimé du trajet.
- ÉTANT DONNÉ départ, arrivée et voiture renseignés, QUAND je touche le bouton calculer, ALORS le résultat s'affiche avec coût, litres, km et L/100 km

**US-3.6 — Rejouer un ancien trajet** (S3) — En tant que conducteur, je touche un trajet de l'historique pour le recalculer au prix du jour.
- ÉTANT DONNÉ un trajet dans l'historique, QUAND je touche sa ligne historique, ALORS le trajet est recalculé au prix moyen du jour et le résultat s'affiche

**US-3.7 — Supprimer un trajet** (S3) — En tant que conducteur, je supprime un trajet de l'historique.
- ÉTANT DONNÉ un trajet dans l'historique, QUAND je touche sa croix supprimer trajet, ALORS la ligne disparaît et ne revient pas au rechargement

**US-4.1 — Comprendre le calcul** (S4) — En tant que conducteur, je déplie un tronçon du trajet pour voir d'où vient la consommation.
- ÉTANT DONNÉ un résultat affiché, QUAND je touche un tronçon du trajet, ALORS il se déplie et montre vitesse typique, arrêts ou dénivelé, et L/100 km sur ce tronçon
- ÉTANT DONNÉ un tronçon déplié, QUAND je le touche à nouveau, ALORS il se replie

**US-4.2 — Mettre mon propre prix** (S4) — En tant que conducteur, je saisis mon prix perso au litre pour recalculer le coût.
- ÉTANT DONNÉ un résultat au prix moyen France, QUAND je touche « Mettre mon prix » (prix perso) et je saisis 1,699, ALORS le coût est recalculé avec 1,699 €/L et le libellé devient « Mon prix »
- ÉTANT DONNÉ un prix perso saisi, QUAND je touche « Revenir à la moyenne », ALORS le coût revient à la moyenne nationale

**US-4.3 — Revenir aux trajets** (S4) — En tant que conducteur, je reviens aux trajets ; le calcul a rejoint l'historique.
- ÉTANT DONNÉ un résultat affiché, QUAND je touche le bouton retour trajets, ALORS le formulaire s'affiche et ce trajet est en tête de l'historique

### Cas limites

**US-1.E1 — Source des prix injoignable** (S1) — En tant que conducteur, si les prix ne peuvent pas être chargés, je vois un message clair et un bouton Réessayer.
- ÉTANT DONNÉ la lecture des prix en erreur réseau, QUAND l'écran Prix s'ouvre, ALORS un message « Prix indisponibles pour l'instant » et un bouton Réessayer s'affichent à la place de la liste

**US-1.E2 — Aucune station pour ce carburant** (S1) — En tant que conducteur, si aucune station proche ne vend mon carburant, la liste me le dit.
- ÉTANT DONNÉ aucune station du rayon ne vend E85, QUAND je choisis E85 dans le sélecteur de carburant, ALORS la liste affiche « Aucune station ne vend ce carburant autour de vous » et la carte n'a aucune pastille

**US-1.E3 — Prix ancien signalé** (S1) — En tant que conducteur, je repère un prix qui n'a pas été mis à jour depuis plus de 48 h.
- ÉTANT DONNÉ une station dont le prix date de plus de 48 h, QUAND la liste s'affiche, ALORS sa ligne de station porte la mention « prix du JJ/MM » en couleur atténuée

**US-1.E4 — Station en rupture** (S1) — En tant que conducteur, je ne vois pas comme disponible un carburant en rupture.
- ÉTANT DONNÉ une station en rupture temporaire de gazole, QUAND je choisis Gazole, ALORS elle n'apparaît pas dans la liste triée par prix

**US-2.E1 — Carburant non vendu dans la fiche** (S2) — En tant que conducteur, la fiche me dit quels carburants la station ne vend pas.
- ÉTANT DONNÉ une station sans GPLc, QUAND j'ouvre sa fiche, ALORS la ligne GPLc affiche « non vendu » au lieu d'un prix

**US-3.E1 — Lieu introuvable** (S3) — En tant que conducteur, si un lieu n'est pas trouvé, on me le dit avant de calculer.
- ÉTANT DONNÉ une arrivée « zzzz » sans résultat, QUAND je touche le bouton calculer, ALORS le champ arrivée est signalé « Lieu introuvable » et aucun calcul n'est lancé

**US-3.E2 — Formulaire incomplet** (S3) — En tant que conducteur, je ne peux pas calculer sans départ, arrivée et voiture.
- ÉTANT DONNÉ aucune voiture choisie, QUAND je touche le bouton calculer, ALORS le choix de voiture est signalé « Choisis ta voiture » et aucun calcul n'est lancé

**US-3.E3 — Historique vide** (S3) — En tant que nouvel utilisateur, je comprends que l'historique se remplira.
- ÉTANT DONNÉ aucun trajet calculé, QUAND j'ouvre l'onglet Trajets, ALORS l'historique affiche « Aucun trajet pour l'instant » avec une invitation à calculer le premier

**US-3.E4 — Voiture absente de la base** (S3) — En tant que conducteur dont la motorisation n'est pas listée, je peux choisir la plus proche.
- ÉTANT DONNÉ un modèle choisi, QUAND j'ouvre la liste des motorisations, ALORS elles sont classées par puissance avec leur carburant, et la plus proche de la puissance moyenne est proposée en premier

**US-4.E1 — Itinéraire impossible** (S4) — En tant que conducteur, si aucun itinéraire routier n'existe, je le sais.
- ÉTANT DONNÉ une arrivée en Corse depuis Albi, QUAND je lance le calcul, ALORS le résultat affiche « Pas d'itinéraire routier entre ces deux lieux » sans coût

**US-4.E2 — Prix perso invalide** (S4) — En tant que conducteur, une saisie de prix aberrante est refusée.
- ÉTANT DONNÉ le champ prix perso ouvert, QUAND je saisis 12 ou une lettre, ALORS le champ est signalé « Entre un prix entre 0,50 et 4,00 €/L » et le coût reste celui d'avant

**US-4.E3 — Calcul trop long** (S4) — En tant que conducteur, je vois que le calcul est en cours et je peux l'abandonner.
- ÉTANT DONNÉ un calcul qui dure plus d'une seconde, QUAND j'attends, ALORS un état « Calcul de l'itinéraire… » s'affiche avec un bouton Annuler qui ramène au formulaire

### Paires

**US-1.P1 — Recentrer sur ma position** (S1) — En tant que conducteur qui a déplacé la carte des stations, je reviens à ma position.
- ÉTANT DONNÉ la carte déplacée, QUAND je touche le bouton de recentrage de la carte des stations, ALORS la carte revient sur ma position et la liste se recharge

**US-3.P1 — Inverser départ et arrivée** (S3) — En tant que conducteur, j'inverse départ et arrivée pour le retour.
- ÉTANT DONNÉ départ Albi et arrivée Bordeaux, QUAND je touche le bouton d'inversion entre champ départ et champ arrivée, ALORS le départ devient Bordeaux et l'arrivée Albi

**US-3.P2 — Changer de voiture** (S3) — En tant que conducteur, je change la voiture mémorisée.
- ÉTANT DONNÉ une voiture mémorisée, QUAND je choisis une autre marque dans le choix de voiture, ALORS modèle et motorisation se réinitialisent et la nouvelle voiture est mémorisée

### Accessibilité

**US-A11Y-001 — Navigation au clavier** (tous écrans) — En tant qu'utilisateur au clavier, j'atteins tous les contrôles dans un ordre logique.
- ÉTANT DONNÉ n'importe quel écran, QUAND j'utilise Tab et Maj+Tab, ALORS chaque contrôle reçoit le focus dans l'ordre de lecture avec un contour visible

**US-A11Y-002 — Focus de la fiche** (tous écrans) — En tant qu'utilisateur au clavier, le focus suit la fiche station.
- ÉTANT DONNÉ une fiche station ouverte au clavier, QUAND elle s'ouvre, ALORS le focus va sur son titre ; à la fermeture il revient sur l'élément qui l'a ouverte

**US-A11Y-003 — Touche Échap** (tous écrans) — En tant qu'utilisateur au clavier, Échap ferme ce qui est ouvert.
- ÉTANT DONNÉ la fiche station ou un tronçon déplié, QUAND j'appuie sur Échap, ALORS la fiche se ferme

**US-A11Y-004 — Libellés lisibles** (tous écrans) — En tant qu'utilisateur de lecteur d'écran, chaque contrôle et chaque prix est annoncé.
- ÉTANT DONNÉ un lecteur d'écran actif, QUAND je parcours les pastilles et les prix, ALORS chaque pastille annonce station et prix en euros, chaque bouton icône a un libellé

### Performance

**US-PERF-001 — Ouverture rapide** (tous écrans) — En tant que conducteur, l'écran Prix est utilisable vite sur téléphone.
- ÉTANT DONNÉ une connexion 4G, QUAND j'ouvre l'appli, ALORS la liste des stations est affichée en moins de 2,5 s

## Pré-requis de pré-vol
- **Déploiement** : Vercel (front), compte partagé, jeton `VERCEL_TOKEN` dans `/home/claude/flux/secrets/webapp-stack.env`.
- **Base** : projet Supabase dédié créé au build avec `SUPABASE_ACCESS_TOKEN` (même fichier) ; extensions `postgis` et `pg_cron` activées ; migrations versionnées dans `supabase/migrations/`.
- **Variables front** : `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (écrites au build dans `.env.local`, jamais commitées).
- **Outils** : Node 20 LTS, npm, Supabase CLI, Vercel CLI, Playwright (Chromium).
- **Services externes sans clé** : data.economie.gouv.fr (prix), data.ademe.fr (véhicules), data.geopf.fr (géocodage, itinéraire, altimétrie, fond Plan IGN).
- Auth anonyme Supabase activée dans le projet.

Référence design : `docs/pipeline/design/`.
