# Jalon 3 — décisions de report

## T3.7 — Véhicules Europe (EEA CO2 cars + modèle road-load / Willans) : REPORTÉ (2026-10-20, bâtisseur round 2)

**Décision** : non construit au jalon 3. Aucune des 15 histoires du jalon ni des 5 transverses ne le porte : le calcul d'un trajet Europe utilise la voiture choisie dans la base ADEME (550 versions), déjà suffisante pour Albi → Barcelone, Milan, Rome, Lisbonne, Belgrade. Le moteur « Voitures » de l'écran Moteurs n'offre donc qu'un fournisseur : ADEME Car Labelling (sans clé).

**Motif** : le gain est de couverture (versions européennes absentes d'ADEME : marques et modèles non vendus en France), pas d'une histoire du jalon ; le construire sans histoire ni critère d'acceptation reviendrait à ajouter du périmètre non validé par Anthony (règle « Demander d'abord : tout ajout au périmètre »).

**Ce qui manque pour le faire**
- une histoire utilisateur (ex. « je choisis une voiture qui n'existe pas en France ») avec son critère d'acceptation ;
- l'import EEA CO2 cars (Discodata SQL, agrégé par version, CC BY 4.0) dans la table `vehicules` + colonne `source` ;
- le modèle road-load + Willans calé sur le WLTP (`supabase/functions/_shared/modele.ts` / `conso.ts`), avec jeu de tests chiffrés (erreur ≤ 0,2 L/100 km annoncée par la recherche sur 12 versions) ;
- un second fournisseur dans la table `fournisseurs` (service `voitures`) pour que l'écran Moteurs puisse le choisir.

**À reprendre** : au durcissement (étape 5) si Anthony veut des voitures hors France, sinon au prochain jalon qui touche aux voitures. `spec.md` n'est pas modifié ; `tasks.md` garde T3.7 comme tâche ouverte.

## Valhalla : instance publique par défaut, Stadia cible
Décision (bâtisseur) : fournisseur d'itinéraire par défaut = instance publique FOSSGIS (sans clé) pour que les trajets Europe soient réels sans clé. Règles respectées : adresse et pause lues dans la table `fournisseurs` (plus de constante dans le code), limiteur Postgres partagé entre invocations (`limiteur_reserver`, ≤ 1 requête/s), User-Agent identifiant, faible trafic. **La cible de production est Stadia Maps** (clé d'Anthony collée dans l'écran Moteurs) : choisir « Stadia Maps » dans Itinéraire, coller la clé, Enregistrer — aucun redéploiement.

## Flux de stations hors de France (T3.5) — état au round 2
Branchés (sans clé, synchronisés par pg_cron) : ES, IT, PT, SI, HR, AT, DK, IS. Couvertures partielles assumées : AT (E-Control ne publie que les 10 stations les moins chères par requête : 20 points × 2 carburants), IT (zone par zone autour de ~50 villes), DK (une seule enseigne, OK), IS (collecte communautaire gasvaktin). Non branchés : DE (clé gratuite Tankerkönig à créer), RO (certificat TLS invalide du site officiel), GB (CSV Fuel Finder à URL signée) — ces pays affichent « Prix station par station pas encore disponibles pour ce pays ». Les pays qui ne publient pas (BE, CH, NL…) gardent la phrase de la spec.
