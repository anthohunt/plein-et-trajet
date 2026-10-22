# Manifeste des captures finales — tests/e2e/final/ (descripteur, 2 lots, 22/10/2026)

## US-1.4-01-toucher-une-pastille-avant.png
Écran "PLEIN & TRAJET", onglet STATIONS, filtre SP95-E10 actif. Carte avec pastilles de prix (1,990 à 2,182) autour d'Albi, aucune fiche ouverte. Liste "Moins cher" : TotalEnergies Albi · Relais des Fo... 1,99 €/L (2,2 km), TotalEnergies Marssac-sur-Tarn 1,99 (9,4 km), Intermarché Cagnac-les-Mines 2,14 (6,8 km), Intermarché Le Sequestre 2,17 (2,3 km), Leclerc Albi 2,17 (3,3 km), Carrefour Albi 2,18 (1,9 km).

## US-1.4-02-toucher-une-pastille-apres.png
Même écran SP95-E10 avec une fiche "ESSO EXPRESS ALBI" ouverte en bas (246 Avenue Colonel Teyssier, 1,8 km). Prix affichés : Gazole 2,36 €/L, SP95-E10 2,18 €/L, SP95 non vendu, SP98 2,26 €/L, E85 1,06 €/L, GPLc non vendu. Mention "Mis à jour il y a 17 h · ESSO DU STADE ALBI". La liste derrière est partiellement visible, la carte n'a pas de pastille mise en évidence.

## US-1.4-03-toucher-une-pastille-avant.png
Écran STATIONS avec filtre GAZOLE actif (bouton Gazole en surbrillance). Carte avec pastilles Gazole (2,250 à 2,420) et liste "STATIONS · GAZOLE" : TotalEnergies Albi 2,25 (2,2 km), TotalEnergies Marssac-sur-Tarn 2,25 (9,4 km), Intermarché Le Sequestre 2,35, Leclerc Albi 2,35, Intermarché Cagnac-les-Mines 2,35, Esso Express Albi 2,36 (1,8 km). Aucune fiche ouverte.

## US-1.4-04-toucher-une-pastille-apres.png
Écran STATIONS filtre GAZOLE, même liste que la capture précédente (TotalEnergies Albi 2,25, Marssac 2,25, Le Sequestre 2,35, Leclerc 2,35, Cagnac 2,35, Esso Express 2,36). Aucune fiche ouverte ni pastille mise en évidence visible. Les prix de la première ligne sont légèrement estompés, ce qui peut être un état de transition de l'image.
Différence avec la capture d'avant : le filtre est passé de GAZOLE (capture 03) à GAZOLE identique ici ; on ne voit pas de fiche ouverte. Les deux images sont très proches, seule la netteté des chiffres diffère.

## US-1.6-01-lire-une-station-dans-la-liste-avant.png
Écran STATIONS, filtre SP95-E10 actif, aucune fiche ouverte. Carte avec pastilles (1,990 à 2,182), la pastille 1,990 au nord-ouest n'est pas mise en évidence. Liste : TotalEnergies Albi · Relais des Fo... 1,99 (2,2 km, prix du 20/10, -16,3 c vs France), TotalEnergies Marssac-sur-Tarn 1,99 (9,4 km), Intermarché Cagnac-les-Mines 2,14 (6,8 km), Intermarché Le Sequestre 2,17, Leclerc Albi 2,17, Carrefour Albi 2,18.

## US-1.6-02-lire-une-station-dans-la-liste-apres.png
Identique à US-1.6-01 : écran STATIONS SP95-E10, liste "Moins cher" avec TotalEnergies Albi 1,99 en tête, sans fiche ouverte.
Différence avec la capture d'avant : aucune différence visible.

## US-1.6-03-lire-une-station-dans-la-liste-avant.png
Identique à US-1.6-01 : écran STATIONS SP95-E10, liste "Moins cher" (TotalEnergies Albi 1,99, TotalEnergies Marssac 1,99, Cagnac 2,14, Le Sequestre 2,17, Leclerc 2,17, Carrefour 2,18), aucune fiche ouverte.

## US-1.6-04-lire-une-station-dans-la-liste-apres.png
Écran STATIONS SP95-E10 avec une fiche "TOTALENERGIES ALBI · RELAIS DES FONTANELLES" ouverte en bas, adresse 40 Route de Cordes, 81000 Albi, à 2,2 km. Prix : Gazole 2,25 €/L, SP95-E10 1,99 €/L, SP95 non vendu, SP98 rupture, E85 non vendu, GPLc non vendu. Mention "Prix du 20/10", "Automate 24/24 · Toilettes publiques · Boutique alimentaire". La pastille 1,990 de la carte est mise en évidence. Un bouton de fermeture (X) est présent.
Différence avec la capture d'avant : apparition de la fiche TotalEnergies Albi · Relais des Fontanelles, pastille 1,990 en surbrillance, liste derrière la fiche.

## US-1.E1-E1-01-declencheur.png
Écran STATIONS, filtre SP95-E10, liste "Moins cher" normale : TotalEnergies Albi 1,99 (2,2 km), TotalEnergies Marssac-sur-Tarn 1,99, Intermarché Cagnac-les-Mines 2,14, Intermarché Le Sequestre 2,17, Leclerc Albi 2,17, Carrefour Albi 2,18. Carte avec pastilles de prix. Aucune erreur.

## US-1.E1-E1-02-resultat.png
Écran STATIONS, filtre SP95-E10 actif. La carte est affichée sans aucune pastille de prix, zoomée sur Albi (libellés N 88, Le Sequestre, Mézard, Le Roc). Sous les boutons, le message "Prix indisponibles pour l'instant" et un bouton "Réessayer". La zone de liste est vide.

## US-1.E1-E1-03-retour.png
Écran STATIONS, filtre SP95-E10, liste "Moins cher" de nouveau remplie (TotalEnergies Albi 1,99, TotalEnergies Marssac-sur-Tarn 1,99, Cagnac 2,14, Le Sequestre 2,17, Leclerc Albi 2,17, Carrefour Albi 2,18), carte avec pastilles. La ligne TotalEnergies Marssac-sur-Tarn est en fond gris (survol ou sélection).
Différence avec la capture d'avant : l'état "Prix indisponibles" et le bouton Réessayer ont disparu, la liste et les pastilles de la carte sont revenues, et la ligne Marssac est en fond gris.

## US-1.E2-E1-01-declencheur.png
Écran STATIONS, filtre SP95-E10, liste "Moins cher" remplie avec pastilles (TotalEnergies Albi 1,99, Marssac 1,99, Cagnac 2,14, Le Sequestre 2,17, Leclerc Albi 2,17, Carrefour Albi 2,18). Aucune erreur ni fiche.

## US-1.E2-E1-02-resultat.png
Filtre E85 actif (bouton E85 en surbrillance). Carte sans pastille de prix, centrée sur Albi. Sous l'onglet "STATIONS · E85", le texte "Aucune station ne vend ce carburant autour de vous." Aucune liste.
Différence avec la capture d'avant : le filtre est passé de SP95-E10 à E85, la liste disparaît et le message "Aucune station ne vend ce carburant autour de vous." apparaît.

## US-1.E2-E1-03-retour.png
Filtre E85 actif, liste "STATIONS · E85" remplie : Leclerc Lescure-d'Albigeois 0,858 €/L (3,1 km), Intermarché Le Sequestre 0,879 (2,3 km), Leclerc Albi 0,879 (3,3 km), Carrefour Market Puygouzon 0,879 (4,3 km), Esso Express Albi 1,068 (1,8 km, +15,6 c vs France). Carte avec pastilles E85 (0,858 à 1,068), dont une pastille rouge 1,068 sur Albi.
Différence avec la capture d'avant : le message "Aucune station" est remplacé par la liste de 5 stations E85 et les pastilles de la carte.

## US-1.E3-E1-01-declencheur.png
Écran STATIONS, filtre SP95-E10, liste "Moins cher" avec pastilles (1,99 à 2,18). Aucune erreur ni fiche ouverte.

## US-1.E3-E1-02-resultat.png
Écran STATIONS, filtre SP95-E10, liste "Moins cher" et carte avec pastilles (TotalEnergies Albi 1,99, Marssac 1,99, Cagnac 2,14, Le Sequestre 2,17, Leclerc Albi 2,17, Carrefour Albi 2,18), identique à la capture du déclencheur. Aucune fiche, aucun message d'erreur.
Différence avec la capture d'avant : aucune différence visible.

## US-1.E3-E1-03-retour.png
Écran STATIONS, filtre SP95-E10, liste "Moins cher" : TotalEnergies Albi · Relais des Fo... 1,99, TotalEnergies Marssac-sur-Tarn 1,99, Intermarché Cagnac-les-Mines 2,14, Intermarché Le Sequestre 2,17, Leclerc Albi 2,17, Carrefour Albi 2,18. Carte avec pastilles de prix, aucune fiche ni message.
Différence avec la capture d'avant : aucune différence visible.

## US-1.E4-E1-01-declencheur.png
Écran STATIONS, filtre SP95-E10. Carte recentrée sur Villeneuve-l'Archevêque / Vulaines (Flacy, Rigny-le-Ferron, Vaujurrenes), pastilles 2,330 et une pastille 2,13x coupée à droite. Liste "Moins cher" : Intermarché Aix-Villemaur-Pâlis 2,139 €/L (8,8 km, hier), Shell Villeneuve-l'Archevêque · S... 2,330 (5,4 km, +17,7 c vs France), même Shell en double ligne à 2,330. Aucune fiche.

## US-1.E4-E1-02-resultat.png
Écran STATIONS, filtre GAZOLE actif. Carte avec pastilles 2,425, 2,425 et 2,419 autour de Villeneuve-l'Archevêque. Liste "STATIONS · GAZOLE" : Intermarché Aix-Villemaur-Pâlis 2,359 (8,8 km), Carrefour Contact Villeneuve-l'Ar... 2,419 (5,5 km, prix du 13/10), Shell Villeneuve-l'Archevêque · S... 2,425 (5,4 km), même Shell à 2,425. Aucune fiche.
Différence avec la capture d'avant : le filtre passe de SP95-E10 à GAZOLE, la liste est remplacée par 4 stations Gazole, Carrefour Contact apparaît.

## US-1.E4-E1-03-retour.png
Écran STATIONS, filtre SP98 actif (bouton surligné). Carte avec pastilles 2,414, 2,414, 2,349 et une pastille verte 1,990 près de Vulaines. Liste "STATIONS · SP98" : TotalEnergies Vulaines 1,99 (200 m, hier, -27,6 c), Intermarché Aix-Villemaur-Pâlis 2,259 (8,8 km), Carrefour Contact Villeneuve-l'Ar... 2,349 (5,5 km, prix du 13/10), Shell Villeneuve-l'Archevêque 2,414 (5,4 km), même Shell à 2,414. Aucune fiche.
Différence avec la capture d'avant : le filtre passe à SP98, la liste passe à 5 stations SP98 avec TotalEnergies Vulaines en tête, la carte montre la pastille verte 1,990.

## US-1.P1-01-recentrer-sur-ma-position-avant.png
Écran STATIONS, filtre SP95-E10, titre de zone "Autour de Bellegarde-Marsal" (et non "Autour de moi"). Carte sans pastilles de prix visibles (Saint-Grégoire, Marsal, Bellegarde, Villefranche-d'Albigeois, Cunac, Ambialet). Liste : une seule station, Candeo Sarl 2,229 €/L (12,6 km, prix du 02/10, +7,6 c vs France). Aucune fiche.

## US-1.P1-02-recentrer-sur-ma-position-apres.png
Écran STATIONS, filtre SP95-E10, titre "Autour de moi". Carte centrée sur Albi avec pastilles (1,990 vert en surbrillance, 2,182, 2,187, 2,178), bouton de localisation en haut à droite. Liste "Moins cher" à 6 stations : TotalEnergies Albi 1,99, TotalEnergies Marssac-sur-Tarn 1,99, Cagnac 2,14, Le Sequestre 2,17, Leclerc Albi 2,17, Carrefour Albi 2,18.
Différence avec la capture d'avant : le titre passe de "Autour de Bellegarde-Marsal" à "Autour de moi", la carte passe de Bellegarde (sans pastille) à Albi (avec pastilles), la liste passe de 1 station (Candeo Sarl) à 6 stations d'Albi.

## US-2.1-01-fermer-la-fiche-avant.png
Écran STATIONS, filtre GAZOLE, fiche "TOTALENERGIES ALBI · RELAIS DES FONTANELLES" ouverte en bas (40 Route de Cordes, 81000 Albi, 2,2 km). Prix : Gazole 2,25 €/L, SP95-E10 1,99, SP95 non vendu, SP98 rupture, E85 non vendu, GPLc non vendu. Bouton X en haut à droite de la fiche. Liste partiellement visible derrière.

## US-2.1-02-fermer-la-fiche-apres.png
Écran STATIONS, filtre GAZOLE, aucune fiche ouverte. Liste "STATIONS · GAZOLE" : TotalEnergies Albi · Relais des Fo... 2,25 (2,2 km), TotalEnergies Marssac-sur-Tarn 2,25 (9,4 km, fond gris), Intermarché Le Sequestre 2,35, Leclerc Albi 2,35, Intermarché Cagnac-les-Mines 2,35, Esso Express Albi 2,36. Carte avec pastilles Gazole.
Différence avec la capture d'avant : la fiche TotalEnergies Albi · Relais des Fontanelles est fermée, la liste Gazole est seule à l'écran.

## US-2.E1-E1-01-declencheur.png
Écran STATIONS, filtre SP95-E10, liste "Moins cher" (TotalEnergies Albi · Relais des Fo... 1,99, TotalEnergies Marssac-sur-Tarn 1,99, Cagnac 2,14, Le Sequestre 2,17, Leclerc Albi 2,17, Carrefour Albi 2,18), carte avec pastilles. Aucune fiche ni erreur.

## US-2.E1-E1-02-resultat.png
Écran STATIONS, filtre SP95-E10, liste "Moins cher" en arrière-plan, avec la fiche "TOTALENERGIES ALBI · RELAIS DES FONTANELLES" ouverte en bas (40 Route de Cordes, 81000 Albi, 2,2 km). Gazole 2,25 €/L, SP95-E10 1,99 €/L, SP95 non vendu, SP98 rupture, E85 non vendu, GPLc non vendu. La pastille 1,990 de la carte est mise en évidence.
Différence avec la capture d'avant : apparition de la fiche TotalEnergies Albi · Relais des Fontanelles et mise en évidence de la pastille 1,990.

## US-2.E1-E1-03-retour.png
Écran STATIONS, filtre SP95-E10, aucune fiche ouverte, liste "Moins cher" : TotalEnergies Albi 1,99, TotalEnergies Marssac-sur-Tarn 1,99 (ligne en fond gris), Cagnac 2,14, Le Sequestre 2,17, Leclerc Albi 2,17, Carrefour Albi 2,18.
Différence avec la capture d'avant : la fiche TotalEnergies Albi a disparu, la liste est seule à l'écran, la ligne Marssac est en fond gris.

## US-3.E3-E1-01-declencheur.png
Écran TRAJET, vue vide de trajet : "RENAULT CLIO" avec "1.2 · 118 ch · 2017 · SP95-E10", bouton "Changer", grand bouton vert circulaire "DÉMARRER" au centre. Barre d'onglets en bas (TRAJET actif). En haut "Autour de moi". Aucun message d'erreur.

## US-3.E3-E1-02-resultat.png
Écran HISTORIQUE (onglet actif en bas). Trois cartes de totaux à 0 : "0 trajets", "0,0 km", "0,00 € essence". Texte "Aucun trajet enregistré." Aucune liste.
Différence avec la capture d'avant : on passe de l'écran TRAJET (Renault Clio, bouton DÉMARRER) à l'écran HISTORIQUE vide.

## US-3.E3-E1-03-retour.png
Écran TRAJET, identique à la capture du déclencheur : "RENAULT CLIO 1.2 · 118 ch · 2017 · SP95-E10", bouton "Changer", bouton vert "DÉMARRER". Onglet TRAJET actif.
Différence avec la capture d'avant : retour de l'écran HISTORIQUE vers TRAJET ; le contenu est identique à la capture 01.

## US-4.E2-E1-01-declencheur.png
Écran de trajet "ALBI → PARIS", 21 oct. 2026 · 5 h 45 · Renault Clio. Trois totaux : 41,20 litres, 588 km, 7,0 L/100 km moy. Puces carburant (Gazole, SP95-E10 sélectionnée, SP95, SP98, E85, GPL coupé). Champ "Moyenne France du jour" à 2,153, texte sélectionné (fond bleu). Gros chiffre 88,70 € essence. Compteur Personnes à 1. Graphiques "Vitesse" (102 km/h moy., 3 accélérations) et "Consommation" (moy. 7,0, pointe 7,2 L/100). Boutons "Supprimer" et "Enregistrer" en bas, partiellement masqués par la barre d'onglets.

## US-4.E2-E1-02-resultat.png
Même écran "ALBI → PARIS" que le déclencheur. Le champ "Moyenne France du jour" contient maintenant "12" (bordure rouge), avec le message en rouge "Entre un prix entre 0,50 et 4,00 €/L". Le gros chiffre reste 88,70 € essence. Les graphiques sont remontés, les boutons du bas sont masqués par la barre d'onglets.
Différence avec la capture d'avant : la valeur passe de 2,153 (sélectionnée) à 12, le message d'erreur rouge apparaît sous le champ, le champ n'est plus surligné.

## US-4.E2-E1-03-retour.png
Écran de trajet "ALBI → PARIS" (Renault Clio, 21 oct. 2026). Champ "Moyenne France du jour" affiché 2,15³ €/L dans un encadré noir avec icône crayon à droite, champ non sélectionné. Gros chiffre 88,70 € essence, Personnes 1, graphiques Vitesse et Consommation. Boutons Supprimer et Enregistrer partiellement masqués par la barre d'onglets.
Différence avec la capture d'avant : le champ n'est plus en saisie (ni surligné, ni bordure rouge), il reprend la valeur 2,15³ avec une icône crayon, et le message d'erreur a disparu.

## US-5.1-01-ouvrir-les-moteurs-avant.png
Écran TRAJET, vue vide : "RENAULT CLIO" (1.2 · 118 ch · 2017 · SP95-E10), bouton "Changer", grand bouton vert "DÉMARRER". En haut à droite "Autour de moi". Onglet TRAJET actif.

## US-5.1-02-ouvrir-les-moteurs-apres.png
Écran "MOTEURS" : bouton "← Retour" et titre MOTEURS. Trois cartes : PRIX DES STATIONS (badge "PRÊT · SANS CLÉ", fournisseur "Flux officiels par pays · FR, ES, IT, PT, SI, HR, AT…", secours "Aucun secours", boutons "Tester la connexion" et "Enregistrer"), PRIX MOYENS PAR PAYS (badge "PRÊT · SANS CLÉ", "Bulletin pétrolier UE (sans clé)", bouton "Tester la connexion"), ITINÉRAIRE (badge vert "CONNECTÉ · TEST ALBI → TOULOUSE OK", fournisseur "Stadia Maps · Valhalla hébergé", secours "Secours · Valhalla · instance publique FOSSGIS", champ clé masqué "Clé ••••961b", lien "Où trouver ma clé", note "Bascule Stadia Maps … Incident résolu").
Différence avec la capture d'avant : on passe de l'écran TRAJET à l'écran MOTEURS (réglages des moteurs de données).

## US-5.2-01-choisir-le-fournisseur-avant.png
Écran MOTEURS défilé vers le bas. Carte PÉAGES avec badge rouge "CLÉ REFUSÉE PAR PTV (401)", fournisseur "PTV Developer", secours "Aucun secours", champ "Clé ••••NDEO", lien "Où trouver ma clé", note "Dernier incident · PTV : clé refusée (401) · 21/10 08:37". Au-dessus, fin de la carte ITINÉRAIRE (Stadia). En dessous, cartes VOITURES (ADEME Car Labelling, "PRÊT · SANS CLÉ") et RECHERCHE DE LIEUX (Photon · Europe, sans clé).

## US-5.2-02-choisir-le-fournisseur-apres.png
Écran MOTEURS défilé, même structure. Carte PÉAGES avec badge gris "CLÉ À COLLER", fournisseur "HERE", secours "Aucun secours", champ vide "Coller la clé d'API", lien "Où trouver ma clé" (Access Manager, rubrique « Apps »), note "Dernier incident · PTV : clé refusée (401) · 21/10 08:37". Cartes VOITURES et RECHERCHE DE LIEUX en dessous.
Différence avec la capture d'avant : fournisseur PÉAGES passe de "PTV Developer" à "HERE" ; badge passe de rouge "CLÉ REFUSÉE PAR PTV (401)" à gris "CLÉ À COLLER" ; le champ affiche "Coller la clé d'API" (vide) au lieu de "Clé ••••NDEO" ; le texte d'aide change.

## US-5.6-01-ou-trouver-ma-cle-avant.png
Image identique octet pour octet à US-5.1-02 : écran MOTEURS en haut de page, carte ITINÉRAIRE "CONNECTÉ · TEST ALBI → TOULOUSE OK" (Stadia Maps · Valhalla hébergé, clé ••••961b), lien "Où trouver ma clé" visible, cartes PRIX DES STATIONS et PRIX MOYENS PAR PAYS au-dessus.

## US-5.6-02-ou-trouver-ma-cle-apres.png
Écran MOTEURS défilé à la carte ITINÉRAIRE : bas de carte ("Où trouver ma clé", "Bascule Stadia Maps … Valhalla hébergé rétabli depuis", "Incident résolu · Stadia : service injoignable 400"), puis carte PÉAGES "CLÉ REFUSÉE PAR PTV (401)" (PTV Developer, clé ••••NDEO, "Dernier incident · PTV : clé refusée (401) · 21/10 08:37"), puis VOITURES et RECHERCHE DE LIEUX.
Différence avec la capture d'avant : défilement vers le bas ; la carte ITINÉRAIRE n'est plus en entier, le lien "Où trouver ma clé" de PÉAGES est visible.

## US-5.6-03-lien-stadia.png
Écran MOTEURS, haut de la carte ITINÉRAIRE "CONNECTÉ · TEST ALBI → TOULOUSE OK" : Stadia Maps · Valhalla hébergé, secours FOSSGIS, champ "Clé ••••961b · coller pour changer", lien "Où trouver ma clé" (« Tableau de bord Stadia Maps : crée une propriété, puis copie sa clé d'API »), boutons Tester la connexion / Enregistrer. Puis carte PÉAGES "CLÉ REFUSÉE PAR PTV (401)" en dessous, avec "PTV Developer".
Différence avec la capture d'avant : le défilement remonte à la carte ITINÉRAIRE ; le lien Stadia "Où trouver ma clé" est visible en haut.

## US-5.6-04-sans-cle.png
Écran MOTEURS défilé : fin de la carte ITINÉRAIRE (Stadia Maps, "Incident résolu · Stadia : service injoignable 400"), carte PÉAGES "CLÉ REFUSÉE PAR PTV (401)" (PTV Developer, clé ••••NDEO, "Dernier incident · PTV : clé refusée (401) · 21/10 08:37"), carte VOITURES (ADEME Car Labelling, sans clé) et début de RECHERCHE DE LIEUX (Photon · Europe).
Différence avec la capture d'avant : aucune différence notable avec la capture 5.6-02 hors défilement ; le titre et la barre supérieure sont identiques.

## US-5.E1-E1-01-declencheur.png
Écran TRAJET, vue vide : "RENAULT CLIO" (1.2 · 118 ch · 2017 · SP95-E10), bouton "Changer", grand bouton vert "DÉMARRER". En haut à droite "Autour de moi". Aucun bandeau, aucun message d'erreur.

## US-5.E1-E1-02-resultat.png
Image identique octet pour octet à US-5.E1-E1-01 : écran TRAJET avec "RENAULT CLIO", "Changer", bouton vert "DÉMARRER", "Autour de moi" en haut à droite.
Différence avec la capture d'avant : aucune différence visible.

## US-5.E1-E1-03-retour.png
Page de relevé sans barre de navigation, titre "Visiteur (clé publique) face aux moteurs". Tableau à 3 colonnes (requête, statut, réponse), toutes les lignes en statut 401 : GET /rest/v1/moteurs (réponse "GRANT SELECT ON public.moteurs TO anon ... mes → -1 ligne(s) visible(s)"), PATCH /rest/v1/moteurs (filtre sans ligne, "GRANT SELECT, UPDATE ON public.moteurs TO anon"), GET /rest/v1/cles_fournisseurs ("GRANT SELECT ON public.cles_fournisseurs TO anon, -1 ligne(s)"), POST /functions/v1/moteurs {action: list} ("{"erreur":"non_connecte"}"). Note en gris : "Relevé du 2026-10-22T06:54:06.222Z ; aucune valeur de clé lue ; l'écriture visait un filtre qui ne touche aucune ligne."
Différence avec la capture d'avant : on ne voit plus l'écran TRAJET ; la page est un tableau de relevé de requêtes et de réponses 401.

## US-6.E1-01-avant.png
Écran TRAJET, vue vide : "RENAULT CLIO" (1.2 · 118 ch · 2017 · SP95-E10), bouton "Changer", bouton vert "DÉMARRER". En haut à droite le libellé "Albi" (et non "Autour de moi"). Aucun bandeau.

## US-6.E1-02-apres.png
Écran TRAJET identique à l'avant (titre "Albi" en haut à droite, RENAULT CLIO, "Changer", DÉMARRER), avec en plus un encadré à bordure rouge-orangé sous le bouton : "L'enregistrement a besoin de ta localisation" / "Cadenas de la barre d'adresse → Position → Autoriser". Le bloc du titre et le bouton DÉMARRER sont décalés vers le bas.
Différence avec la capture d'avant : apparition de l'encadré de demande de localisation ; le bloc RENAULT CLIO et le bouton DÉMARRER descendent d'environ 40 px.

## US-6.E2-01-avant.png
Écran d'enregistrement en cours : point orange "Enregistrement" + "Renault Clio" ; gros chiffre 19 km/h avec courbe ; quatre compteurs 0,5 km, 0,04 litres, 0,09 € essence, 0:02 durée, 12 km/h moy., "—" L/100 km. Mention "Garde l'écran allumé : un navigateur arrête le GPS écran éteint." et "Prix : moyenne France du jour · 2,153 €/L". Boutons "Pause" et "Arrêter". En haut à droite "Autour de moi".

## US-6.E2-02-apres.png
Écran "Trajet trop court : 0,5 km sur 1 minimum." avec "Rien n'est ajouté à l'historique." et un bouton noir "Retour à l'accueil". Onglet TRAJET actif, "Autour de moi" en haut à droite. Plus aucun compteur ni bouton Pause/Arrêter.
Différence avec la capture d'avant : l'écran d'enregistrement (19 km/h, Pause/Arrêter) est remplacé par le message "Trajet trop court" et le bouton "Retour à l'accueil".

## US-6.E3-01-avant.png
Écran d'enregistrement en cours : "Enregistrement Renault Clio" ; gros chiffre 28 km/h avec courbe en palier puis remontée ; compteurs 2,0 km, 0,17 litres, 0,36 € essence, 0:06 durée, 17 km/h moy., 8,4 L/100 km. Mention "Garde l'écran allumé…" et "Prix : moyenne France du jour · 2,153 €/L". Boutons "Pause" et "Arrêter". "Autour de moi" en haut à droite.

## US-6.E3-02-apres.png
Écran d'enregistrement visuellement identique à la capture d'avant : 28 km/h, 2,0 km, 0,17 litres, 0,36 €, 0:06, 17 km/h moy., 8,4 L/100 km, "Prix : moyenne France du jour · 2,153 €/L", boutons Pause et Arrêter.
Différence avec la capture d'avant : aucune différence visible (les deux fichiers ont des octets différents mais le rendu est le même).

## US-A11Y-001-01-m1.png
Écran STATIONS, filtre SP95-E10 actif, carte avec pastilles, liste "Moins cher" (TotalEnergies Albi 1,99, Marssac 1,99, Cagnac 2,14, Le Sequestre 2,17, Leclerc Albi 2,17, Carrefour Albi 2,18). Le bouton "Gazole" porte un contour de focus noir (non sélectionné). Aucune fiche ouverte.

## US-A11Y-001-02-m1.png
Écran STATIONS, filtre SP95-E10, liste "Moins cher" défilée vers le bas : Intermarché Cagnac-les-Mines 2,149, Intermarché Le Sequestre 2,178, Leclerc Albi 2,178, Carrefour Albi 2,182, Leclerc Lescure-d'Albigeois 2,182, Esso Express Albi 2,187. Un contour de focus noir entoure l'onglet STATIONS de la barre du bas. Aucune fiche.
Différence avec la capture d'avant : la liste est défilée (TotalEnergies Albi et Marssac sortent du haut de l'écran) et le focus passe du bouton Gazole à l'onglet STATIONS.

## US-A11Y-002-01-m1.png
Écran STATIONS, filtre SP95-E10, fiche "TOTALENERGIES MARSSAC-SUR-TARN" ouverte en bas (23 avenue de Toulouse, 81150 Marssac-sur-Tarn, 9,4 km). Gazole 2,25 €/L, SP95-E10 1,99 €/L, SP95 non vendu, SP98 1,99 €/L, E85 non vendu, GPLc non vendu. "Mis à jour il y a 21 h", "Toilettes publiques · Boutique alimentaire · Boutique non alimentaire", mention "STATION TOTAL". Liste "Moins cher" visible derrière. Pas de paire avant/après dans cette série.

## US-A11Y-002-02-m1.png
Écran STATIONS, filtre SP95-E10, aucune fiche ouverte : la ligne TotalEnergies Marssac-sur-Tarn (1,99, 9,4 km) est entourée d'un cadre noir épais (focus), les autres lignes sont inchangées.
Différence avec la capture d'avant : la fiche Marssac a disparu et la ligne Marssac porte le cadre de focus.

## US-A11Y-003-01-m1.png
Écran STATIONS, filtre SP95-E10, fiche "TOTALENERGIES ALBI · RELAIS DES FONTANELLES" ouverte en bas (40 Route de Cordes, 81000 Albi, 2,2 km). Gazole 2,25 €/L, SP95-E10 1,99 €/L, SP95 non vendu, SP98 rupture, E85 non vendu, GPLc non vendu. "Prix du 20/10". Pastille 1,990 en surbrillance sur la carte.
Différence avec la capture d'avant : sans objet (première capture de cette série).

## US-A11Y-003-02-m1.png
Écran STATIONS, filtre SP95-E10, liste "Moins cher" sans fiche : la ligne TotalEnergies Albi · Relais des Fo... (1,99) est entourée d'un cadre noir épais (focus).
Différence avec la capture d'avant : la fiche TotalEnergies Albi a été fermée, la ligne TotalEnergies Albi porte un cadre de focus.

## US-A11Y-004-01-m1.png
Écran STATIONS, filtre SP95-E10, liste "Moins cher" sans fiche ni cadre : TotalEnergies Albi 1,99, TotalEnergies Marssac-sur-Tarn 1,99, Cagnac 2,14, Le Sequestre 2,17, Leclerc Albi 2,17, Carrefour Albi 2,18. Image identique à US-1.4-01.
Différence avec la capture d'avant : aucune différence visible (cadre de focus retiré).

## US-A11Y-004-02-m1.png
Écran STATIONS, filtre SP95-E10, fiche "TOTALENERGIES ALBI · RELAIS DES FONTANELLES" ouverte en bas, sans prix chiffrés : les lignes Gazole, SP95-E10, SP95, SP98, E85, GPLc affichent "…" à la place des valeurs (état de chargement). Adresse 40 Route de Cordes, 2,2 km ; "Prix du 20/10", "Automate 24/24 · Toilettes publiques · Boutique alimentaire". La ligne Marssac est à peine visible derrière la fiche.
Différence avec la capture d'avant : les prix de la fiche sont remplacés par des "…" (valeurs non affichées).

## US-NEW-1-01-avant.png
Écran "MA VOITURE" (titre souligné), bouton "← Trajet" en haut à gauche. Champ "CODE D.2 DE LA CARTE GRISE" rempli avec "5RBU0C" (saisi partiellement) ; en dessous, un encadré de lecture de carte grise D.1 RENAULT, D.2 "R 5RBU 5RBU0C" (surligné en vert), D.3 CLIO. Texte "Pas la carte grise sous la main ?", champ "NOM, ANNÉE, PUISSANCE" contenant "clio 2017 120", et bouton en pointillés "Enregistrer ma voiture". Barre d'onglets en bas (TRAJET actif).

## US-NEW-1-02-apres.png
Écran d'erreur plein écran sur fond gris clair, sans barre d'onglets : titre "Un problème est survenu", texte "L'écran n'a pas pu s'afficher. Recharger suffit souvent. Si le problème revient à chaque lancement, effacez les données locales de l'appli (trajets gardés sur ce téléphone, voiture enregistrée).", deux boutons encadrés : "Recharger" et "Effacer les données locales de l'appli". Le reste de l'écran est vide.
Différence avec la capture d'avant : on passe de l'écran "MA VOITURE" à un écran d'erreur sans en-tête ni barre d'onglets.

## US-NEW-1-03-apres.png
Écran TRAJET : en-tête "PLEIN & TRAJET" et "Autour de moi" ; titre "ENREGISTRE D'ABORD TA VOITURE", sous-titre "Le code D.2 de ta carte grise, une seule fois.", grand bouton vert "DÉMARRER" au centre. Barre d'onglets en bas (TRAJET actif). Aucun nom de voiture affiché.
Différence avec la capture d'avant : on passe de l'écran d'erreur à l'écran TRAJET avec le message "ENREGISTRE D'ABORD TA VOITURE" et le bouton DÉMARRER.

## US-NEW-2-01-avant.png
Capture recadrée et cadrée dans un encadré de largeur ~844 px (fond gris autour, en-tête "PLEIN & TRAJET", "Autour de moi"). Écran TRAJET : "ENREGISTRE D'ABORD TA VOITURE", "Le code D.2 de ta carte grise, une seule fois.", bouton vert "DÉMARRER" partiellement coupé en bas par la barre d'onglets (TRAJET, STATIONS, HISTORIQUE).
Différence avec la capture d'avant : sans objet (première capture de cette paire).

## US-NEW-2-02-apres.png
Capture recadrée dans un encadré d'environ 844 px (fond gris autour). Écran STATIONS, filtre SP95-E10 : bout de carte avec pastilles 1,990, 2,178, 2,182 ; liste "STATIONS · SP95-E10" : TotalEnergies Albi · Relais des Fontanelles 1,99 (2,2 km, prix du 20/10), TotalEnergies Marssac-sur-Tarn 1,99 (9,4 km, fond gris), Intermarché Cagnac-les-Mines 2,14 (coupé). Onglet STATIONS actif.
Différence avec la capture d'avant : on passe de l'écran TRAJET "ENREGISTRE D'ABORD TA VOITURE" à l'écran STATIONS SP95-E10 avec la liste des stations.

## US-PERF-001-01-m1.png
Écran STATIONS, filtre SP95-E10 actif, titre "Autour de moi". Zone carte vide avec le texte "Chargement des prix…" ; sous "STATIONS · SP95-E10", le texte "Chargement des prix…" remplace la liste. Onglet STATIONS actif.

## US-PERF-001-02-m1.png
Écran STATIONS, filtre SP95-E10 chargé : carte avec pastilles (1,990, 2,182, 2,182, 2,187, 2,178, 2,178) et liste "Moins cher" de 6 stations : TotalEnergies Albi · Relais des Fo... 1,99 (2,2 km), TotalEnergies Marssac-sur-Tarn 1,99, Intermarché Cagnac-les-Mines 2,14, Intermarché Le Sequestre 2,17, Leclerc Albi 2,17, Carrefour Albi 2,18.
Différence avec la capture d'avant : le texte "Chargement des prix…" disparaît, la carte affiche les pastilles et la liste des 6 stations apparaît.

## V-1.1-01-avant.png
Écran TRAJET, vue vide : "RENAULT CLIO" (1.2 · 118 ch · 2017 · SP95-E10), bouton "Changer", bouton vert "DÉMARRER". "Autour de moi" en haut à droite.

## V-1.1-02-apres.png
Écran TRAJET identique à la capture d'avant : RENAULT CLIO, "Changer", DÉMARRER, "Autour de moi".
Différence avec la capture d'avant : aucune différence visible.

## V-1.1-03-avant.png
Écran TRAJET : titre "ENREGISTRE D'ABORD TA VOITURE", sous-titre "Le code D.2 de ta carte grise, une seule fois.", bouton vert "DÉMARRER". Barre d'onglets en bas (TRAJET actif).

## V-1.1-04-apres.png
Écran "MA VOITURE" : bouton "← Trajet", champ "CODE D.2 DE LA CARTE GRISE" avec "5RBU0C" (saisie partielle), encadré de lecture D.1 RENAULT / D.2 "R 5RBU 5RBU0C" (surligné) / D.3 CLIO, champ "NOM, ANNÉE, PUISSANCE" = "clio 2017 120", bouton en pointillés "Enregistrer ma voiture". Barre d'onglets en bas.
Différence avec la capture d'avant : on passe de l'écran TRAJET "ENREGISTRE D'ABORD TA VOITURE" au formulaire "MA VOITURE".

## V-1.1-05-avant.png
Écran STATIONS, avec un bandeau noir en haut "● Trajet en cours · 0,44 €" sous l'en-tête. Filtre SP95-E10 actif, carte avec pastilles, liste "STATIONS · SP95-E10" (Moins cher) : TotalEnergies Albi · Relais des Fo... 1,99 (3,7 km), TotalEnergies Marssac-sur-Tarn 1,99 (9,1 km), Intermarché Cagnac-les-Mines 2,14 (8,4 km), Intermarché Le Sequestre 2,17 (1,1 km), Leclerc Albi 2,17 (2,9 km), Carrefour Albi 2,18 (coupé).

## V-1.1-06-apres.png
Écran d'enregistrement en cours (onglet TRAJET) : point orange "Enregistrement Renault Clio" ; gros chiffre 11 km/h avec courbe ; compteurs 2,5 km, 0,21 litres, 0,44 € essence, 0:08 durée, 18 km/h moy., 8,3 L/100 km. Mention "Garde l'écran allumé…", "Prix : moyenne France du jour · 2,154 €/L", boutons Pause et Arrêter. "Autour de moi" en haut à droite.
Différence avec la capture d'avant : on passe de l'écran STATIONS (bandeau "Trajet en cours · 0,44 €") à l'écran d'enregistrement TRAJET (11 km/h, Pause/Arrêter).

## V-1.2-01-avant.png
Écran TRAJET, vue vide : "RENAULT CLIO" (1.2 · 118 ch · 2017 · SP95-E10), bouton "Changer", bouton vert "DÉMARRER". "Autour de moi" en haut à droite.

## V-1.2-02-apres.png
Écran TRAJET identique à la capture d'avant : RENAULT CLIO, "Changer", DÉMARRER.
Différence avec la capture d'avant : aucune différence visible.

## V-1.2-03-avant.png
Écran TRAJET identique à l'écran vide précédent, avec le bouton "Changer" entouré d'un cadre noir épais (focus).
Différence avec la capture d'avant : le cadre de focus apparaît autour de "Changer".

## V-1.2-04-apres.png
Écran "MA VOITURE" : bouton "← Trajet", champ "CODE D.2 DE LA CARTE GRISE" avec "5RBU0C", encadré D.1 RENAULT / D.2 "R 5RBU 5RBU0C" (surligné) / D.3 CLIO, "NOM, ANNÉE, PUISSANCE" = "clio 2017 120", bouton en pointillés "Enregistrer ma voiture". Image identique à US-NEW-1-01.
Différence avec la capture d'avant : on passe de l'écran TRAJET (vide, DÉMARRER) au formulaire "MA VOITURE" ; le focus sur "Changer" a disparu.

## V-1.2-05-avant.png
Écran TRAJET identique aux captures précédentes : RENAULT CLIO, "Changer", DÉMARRER, "Autour de moi". Aucun cadre de focus visible.
Différence avec la capture d'avant : on revient de l'écran "MA VOITURE" à l'écran TRAJET vide.

## V-1.2-06-apres.png
Écran TRAJET identique à la capture d'avant : RENAULT CLIO, "Changer", DÉMARRER, "Autour de moi".
Différence avec la capture d'avant : aucune différence visible.

## V-1.3-01-avant.png
Écran TRAJET, vue vide : "RENAULT CLIO" (1.2 · 118 ch · 2017 · SP95-E10), bouton "Changer", bouton vert "DÉMARRER". "Autour de moi" en haut à droite.

## V-1.3-02-apres.png
Écran d'enregistrement en cours (onglet TRAJET) : point orange "Enregistrement Renault Clio" ; gros chiffre 0 km/h, sans courbe ; compteurs 0,0 km, 0,00 litre, "–" € essence, 0:00 durée, "–" km/h moy. et L/100 km. Mention "Garde l'écran allumé…", "Prix : moyenne du jour en cours de lecture", boutons Pause et Arrêter. "Autour de moi" en haut à droite.
Différence avec la capture d'avant : on passe de l'écran TRAJET "DÉMARRER" (titre "Albi") à l'écran d'enregistrement démarré à 0 km/h, sans prix encore affiché (« en cours de lecture »).

## V-1.3-03-avant.png
Écran TRAJET, vue vide : RENAULT CLIO (1.2 · 118 ch · 2017 · SP95-E10), bouton "Changer", bouton vert "DÉMARRER". En haut à droite le libellé "Albi". Aucun bandeau.

## V-1.3-04-apres.png
Écran TRAJET identique à la capture d'avant (libellé "Albi", RENAULT CLIO, "Changer", DÉMARRER), avec l'encadré à bordure rouge-orangé sous le bouton : "L'enregistrement a besoin de ta localisation" / "Cadenas de la barre d'adresse → Position → Autoriser". Le bloc décalé vers le bas.
Différence avec la capture d'avant : apparition de l'encadré de demande de localisation et décalage du bloc vers le bas.

## V-2.1-01-avant.png
Écran "MA VOITURE" : bouton "← Trajet", champ "CODE D.2 DE LA CARTE GRISE" contenant "5RBU0C" en gris (sans fiche véhicule), avec un contour noir de focus. En dessous, l'encadré D.1 RENAULT / D.2 "R 5RBU 5RBU0C" (surligné) / D.3 CLIO, "Pas la carte grise sous la main ?", champ "NOM, ANNÉE, PUISSANCE" = "clio 2017 120", bouton "Enregistrer ma voiture".
Différence avec la capture d'avant : sans objet (première capture de la paire V-2.1).

## V-2.1-02-apres.png
Écran "MA VOITURE" : champ code D.2 = "5RBU0C" (focus noir). Sous l'encadré D.1/D.2/D.3, le texte "2 versions pour ce code : choisis la tienne" et deux cartes : "Renault Clio 1,2 · 118 ch" 2017 · 87 kW · 1165 kg · SP95-E10 · 13864 immatriculées (sélectionnée, fond vert clair), et "Renault Clio 1,2 · 118 ch" 2018 · 87 kW · 1165 kg · SP95-E10 · 11043 immatriculées. Fiche détaillée "RENAULT CLIO 1.2 · 118 CH" : Année 2017, Puissance 87 kW · 118 ch, Cylindrée 1 197 cm³, Masse 1 165 kg, Carburant SP95-E10, CO2 118 g/km (NEDC) ; "Base européenne EEA · CO2 cars". Puis "Pas la carte grise sous la main ?" et le champ "clio 2017 120" en bas, coupé.
Différence avec la capture d'avant : apparition de la liste "2 versions pour ce code" et de la fiche véhicule Renault Clio 1.2 · 118 ch 2017 ; le champ code garde 5RBU0C mais a maintenant un contour de focus épais.

## V-2.1-03-avant.png
Écran "MA VOITURE" : champ code D.2 = "M15DZ000M00" (focus noir), encadré D.1 RENAULT / D.2 "R 5RBU 5RBU0C" (surligné) / D.3 CLIO, champ "clio 2017 120", bouton "Enregistrer ma voiture".
Différence avec la capture d'avant : le code passe de 5RBU0C (avec fiche Renault) à "M15DZ000M00" et la fiche véhicule n'est plus affichée.

## V-2.1-04-apres.png
Écran "MA VOITURE" : champ code D.2 = "M15DZ000M000". Encadré D.1 RENAULT / D.2 "R 5RBU 5RBU0C" / D.3 CLIO inchangé. Texte "2 versions pour ce code : choisis la tienne", deux cartes "Dacia Duster 1,6 · 114 ch" : 2019 · 84 kW · 1315 kg · GPLc · 52652 immatriculées, et 2018 · 84 kW · 1315 kg · GPLc · 25181 immatriculées (sélectionnée, fond vert clair). Fiche "DACIA DUSTER 1.6 · 114 CH" : Année 2018, Puissance 84 kW · 114 ch, Cylindrée 1 598 cm³, Masse 1 315 kg, Carburant GPLc, CO2 163 g/km (WLTP). Champ "clio 2017 120" en bas, coupé.
Différence avec la capture d'avant : la fiche passe de Renault Clio 1.2 2017 (SP95-E10) à Dacia Duster 1.6 2018 (GPLc), et les versions proposées changent.

## V-2.1-05-avant.png
Écran "MA VOITURE" : champ code D.2 = "R 5RBU" en cours de saisie (focus noir), encadré D.1 RENAULT / D.2 "R 5RBU 5RBU0C" (surligné) / D.3 CLIO, champ "clio 2017 120", bouton "Enregistrer ma voiture". Aucune fiche véhicule affichée.
Différence avec la capture d'avant : le code passe de "M15DZ000M00" à "R 5RBU" (saisie partielle) et la fiche Dacia n'apparaît plus.

## V-2.1-06-apres.png
Écran "MA VOITURE" : champ code D.2 = "R 5RBU 5RBU0C" (focus noir), encadré D.1 RENAULT / D.2 "R 5RBU 5RBU0C" (surligné) / D.3 CLIO. Texte "2 versions pour ce code : choisis la tienne", carte "Renault Clio 1,2 · 118 ch" 2017 · 87 kW · 1165 kg · SP95-E10 · 13864 immatriculées (sélectionnée, fond vert clair) et 2018 · 11043 immatriculées. Fiche "RENAULT CLIO 1.2 · 118 CH" : Année 2017, Puissance 87 kW · 118 ch, Cylindrée 1 197 cm³, Masse 1 165 kg, Carburant SP95-E10, CO2 118 g/km (NEDC). Champ "clio 2017 120" coupé en bas.
Différence avec la capture d'avant : le code passe de "R 5RBU" (saisie partielle, sans fiche) à "R 5RBU 5RBU0C" complet, et la fiche Renault Clio 1.2 · 118 ch 2017 avec ses deux versions réapparaît.

Total : 87/87 décrites.

## V-2.2-01-avant.png
Écran « Ma voiture » de l'app Plein & Trajet (mobile, 390 px). Le champ « Code D.2 de la carte grise » contient 5RBU0C ; sous le champ, les lignes D.1 RENAULT, D.2 R 5RBU 5RBU0C (surligné) et D.3 CLIO. Deux versions sont proposées, « Renault Clio 1,2 · 118 ch » 2017 (13864 immatriculées, sélectionnée en vert) et 2018 (11043 immatriculées), avec une fiche détaillée (2017, 87 kW, 1 197 cm³, 1 165 kg, SP95-E10, CO2 118 g/km NEDC). Le champ « Nom, année, puissance » vaut « clio 2017 120 » et le bouton noir « Enregistrer ma voiture » est actif.

## V-2.2-02-apres.png
Écran d'accueil Trajet : titre « RENAULT CLIO », sous-titre « 1.2 · 118 ch · 2017 · SP95-E10 », bouton « Changer », grand bouton vert rond « DÉMARRER » au centre. Barre d'onglets en bas (Trajet actif, Stations, Historique) et lien « Autour de moi » en haut à droite.
Différence avec la capture d'avant : l'écran n'est plus le formulaire « Ma voiture » mais l'accueil Trajet avec la voiture enregistrée et le bouton Démarrer ; la fiche détaillée et les champs ont disparu.

## V-2.2-03-avant.png
Écran « Ma voiture » avec le bouton « ← Trajet ». Le code D.2 est affiché en gris (5RBU0C), la liste D.1/D.2/D.3 est visible, et le champ « Nom, année, puissance » est actif (focus, bordure noire) avec le texte « zz ». Le bouton « Enregistrer ma voiture » est en pointillés, grisé (inactif). Aucune liste de suggestions ni message d'erreur.

## V-2.2-04-apres.png
Écran « Ma voiture » : le champ « Code D.2 de la carte grise » est actif (bordure noire) et contient « 5RB ». La liste D.1/D.2/D.3 est toujours là, le champ nom affiche « clio 2017 120 » en gris et le bouton « Enregistrer ma voiture » reste en pointillés, inactif. Aucune suggestion ni erreur visible.
Différence avec la capture d'avant : le focus passe du champ nom au champ code, qui contient maintenant « 5RB » ; le champ nom passe de « zz » à « clio 2017 120 ».

## V-2.3-01-avant.png
Écran « Ma voiture » : code D.2 en gris (5RBU0C), liste D.1/D.2/D.3 affichée. Le champ « Nom, année, puissance » est actif avec « clio 2017 120 » en gris, sans liste de suggestions. Le bouton « Enregistrer ma voiture » est en pointillés, inactif.

## V-2.3-02-apres.png
Écran « Ma voiture » avec une liste de suggestions ouverte sous le champ nom (« clio 2017 120 », texte sombre, focus). Six lignes « Renault Clio 1,2 » : 118 ch (2017, 87 kW, 1165 kg, D.2 5RBU0C), 118 ch (1165 kg, D.2 5RBU0D), 118 ch (1243 kg, D.2 7RBU0C), 118 ch (1270 kg, D.2 7RBU0D), 120 ch (88 kW, 1255 kg, D.2 2R401E), puis une 6e ligne « 120 ch » coupée en bas de l'écran.
Différence avec la capture d'avant : la liste de six suggestions apparaît sous le champ nom, le texte du champ passe du gris au noir, et le bouton « Enregistrer » est masqué par la liste.

## V-2.3-03-avant.png
Même liste de suggestions que la capture précédente, avec la première ligne « Renault Clio 1,2 · 118 ch » (2017 · 87 kW · 1165 kg · D.2 5RBU0C) entourée d'un cadre noir (ligne mise en évidence). Les lignes suivantes sont identiques (D.2 5RBU0D, 7RBU0C, 7RBU0D, 2R401E, puis un « 120 ch » coupé). Le champ nom contient « clio 2017 120 ».

## V-2.3-04-apres.png
Écran « Ma voiture » sans liste de suggestions. Une fiche verte « RENAULT CLIO 1.2 · 118 CH » s'affiche : année 2017, puissance 87 kW · 118 ch, cylindrée 1 197 cm³, masse 1 165 kg, carburant SP95-E10, CO2 118 g/km (NEDC), « Base européenne EEA · CO2 cars ». Le champ nom contient « clio 2017 120 » et le bouton « Enregistrer ma voiture » est plein et noir (actif).
Différence avec la capture d'avant : la liste de suggestions disparaît, la fiche Renault Clio 1.2 · 118 ch apparaît au-dessus du champ carte grise / nom, et le bouton passe de pointillés grisés à noir plein.

## V-2.E1-01-avant.png
Écran « Ma voiture » : le champ « Code D.2 de la carte grise » est actif et contient « ZZ999 » (bordure noire). La liste D.1/D.2/D.3 est affichée (R 5RBU 5RBU0C surligné), le champ nom contient « clio 2017 120 » en gris et le bouton « Enregistrer ma voiture » est en pointillés. Aucun message d'erreur.

## V-2.E1-02-apres.png
Même écran « Ma voiture » : le champ code contient « ZZ9999 » avec une bordure rouge, et un message rouge s'affiche sous la liste : « Code introuvable. Vérifie la case D.2, ou cherche par nom ci-dessous. ». Le champ nom contient « clio 2017 120 », le bouton « Enregistrer ma voiture » reste en pointillés, inactif.
Différence avec la capture d'avant : le code passe de « ZZ999 » à « ZZ9999 », le champ prend une bordure rouge et le message d'erreur « Code introuvable » apparaît.

## V-2.E1-03-avant.png
Écran « Ma voiture » : le champ code est actif et contient « 5RBF0 » (bordure noire), sans message d'erreur. La liste D.1/D.2/D.3 est affichée, le champ nom contient « clio 2017 120 » et le bouton « Enregistrer ma voiture » est en pointillés, inactif.

## V-2.E1-04-apres.png
Écran « Ma voiture » : le champ code contient « 5RBF0A » (focus, bordure noire). Sous la liste D.1/D.2/D.3, un encadré rouge affiche « La base européenne des voitures ne répond pas. » avec un bouton « Réessayer ». Le champ nom contient « clio 2017 120 » et le bouton « Enregistrer ma voiture » est en pointillés, inactif.
Différence avec la capture d'avant : le code passe de « 5RBF0 » à « 5RBF0A », et un encadré d'erreur rouge « La base européenne des voitures ne répond pas » avec le bouton « Réessayer » apparaît.

## V-3.1-01-avant.png
Écran d'enregistrement d'un trajet : pastille rouge « Enregistrement » et « Renault Clio ». Grand compteur vitesse à 19 km/h, courbe verte presque plate. Stats : 0,8 km, 0,06 litres, 0,13 € essence, durée 0:03, 14 km/h moyenne, 8,2 L/100 km. Message « Garde l'écran allumé… », « Prix : moyenne France du jour · 2,154 €/L », boutons « Pause » et « Arrêter ».

## V-3.1-02-apres.png
Même écran d'enregistrement : vitesse à 29 km/h, courbe avec un creux. Stats : 1,8 km, 0,15 litres, 0,33 € essence, durée 0:06, 17 km/h moyenne, 8,4 L/100 km. Prix moyen France 2,154 €/L, boutons Pause et Arrêter.
Différence avec la capture d'avant : vitesse 19 → 29 km/h ; distance 0,8 → 1,8 km ; litres 0,06 → 0,15 ; € essence 0,13 → 0,33 ; durée 0:03 → 0:06 ; moyenne 14 → 17 km/h ; L/100 km 8,2 → 8,4.

## V-3.1-03-avant.png
Écran d'enregistrement (pastille « Enregistrement », « Renault Clio ») : vitesse 29 km/h, courbe avec un creux puis un palier haut. Stats : 1,9 km, 0,16 litres, 0,34 € essence, durée 0:06, 17 km/h moyenne, 8,4 L/100 km. Prix moyen France 2,154 €/L, boutons Pause et Arrêter.

## V-3.1-04-apres.png
Écran d'enregistrement : vitesse 28 km/h, courbe qui monte puis reste en palier. Stats : 2,4 km, 0,20 litres, 0,43 € essence, durée 0:07, 18 km/h moyenne, 8,3 L/100 km. Prix moyen France 2,154 €/L, boutons Pause et Arrêter.
Différence avec la capture d'avant : vitesse 29 → 28 km/h ; distance 1,9 → 2,4 km ; litres 0,16 → 0,20 ; € essence 0,34 → 0,43 ; durée 0:06 → 0:07 ; moyenne 17 → 18 km/h ; L/100 km 8,4 → 8,3.

## V-3.1-05-avant.png
Écran d'enregistrement : pastille « Enregistrement », « Renault Clio ». Vitesse à 0 km/h, la courbe est plate puis descend à droite. Stats : 2,5 km, 0,21 litres, 0,41 € essence, durée 0:08, 17 km/h moyenne, 8,3 L/100 km. Le texte de prix indique « Prix : mon prix · 1,990 €/L ». Boutons Pause et Arrêter.

## V-3.1-06-apres.png
Même écran d'enregistrement, toujours à 0 km/h. Stats : 2,5 km, 0,21 litres, 0,41 € essence, durée 0:09, 16 km/h moyenne, 8,3 L/100 km. Prix « mon prix · 1,990 €/L ». Boutons Pause et Arrêter.
Différence avec la capture d'avant : durée 0:08 → 0:09 ; moyenne 17 → 16 km/h. Distance, litres, € essence et L/100 km inchangés.

## V-3.2-05-avant.png
Écran d'accueil Trajet : « RENAULT CLIO », « 1.2 · 118 ch · 2017 · SP95-E10 », bouton « Changer » et grand bouton vert « DÉMARRER ». Barre d'onglets en bas, Trajet actif. Aucune donnée de trajet affichée.

## V-3.2-06-apres.png
Écran d'enregistrement qui vient de démarrer : pastille « Enregistrement », « Renault Clio ». Compteur à 0 km/h, stats à 0,0 km, 0,00 litres, « — » pour € essence, durée 0:00, « — » pour la moyenne et L/100 km. Le texte indique « Prix : moyenne du jour en cours de lecture ». Boutons Pause et Arrêter.
Différence avec la capture d'avant : l'accueil Trajet (Démarrer) laisse place à l'écran d'enregistrement en cours, à zéro.

## V-3.4-01-avant.png
Écran d'enregistrement : pastille « Enregistrement », « Renault Clio ». Vitesse à 105 km/h, courbe verte en palier. Stats : 30,3 km, 2,13 litres, 4,24 € essence, durée 0:29, 62 km/h moyenne, 7,0 L/100 km. « Prix : mon prix · 1,990 €/L ». Boutons Pause et Arrêter.

## V-3.4-02-apres.png
Écran de trajet en pause : libellé « En pause » (à la place de « Enregistrement ») et « Renault Clio ». Vitesse à 0 km/h, stats inchangées : 30,3 km, 2,13 litres, 4,24 € essence, durée 0:29, 62 km/h moyenne, 7,0 L/100 km. Le bouton « Pause » est remplacé par « Reprendre », « Arrêter » reste à droite.
Différence avec la capture d'avant : le statut passe de « Enregistrement » à « En pause », la vitesse de 105 à 0 km/h, le bouton Pause devient « Reprendre », les chiffres restent identiques.

## V-3.4-03-avant.png
Écran d'enregistrement : pastille « Enregistrement », « Renault Clio ». Vitesse 105 km/h. Stats : 32,1 km, 2,25 litres, 4,47 € essence, durée 0:30, 64 km/h moyenne, 7,0 L/100 km. « Prix : mon prix · 1,990 €/L ». Boutons Pause et Arrêter.

## V-3.4-04-apres.png
Écran de trajet en pause : « En pause » et « Renault Clio ». Vitesse 0 km/h, courbe plate. Stats : 30,3 km, 2,13 litres, 4,24 € essence, durée 0:29, 62 km/h moyenne, 7,0 L/100 km. Boutons « Reprendre » et « Arrêter ».
Différence avec la capture d'avant : statut « En pause » au lieu de « Enregistrement », vitesse 105 → 0 km/h, et les chiffres reviennent à 30,3 km, 2,13 litres, 4,24 €, 0:29, 62 km/h (au lieu de 32,1 km, 2,25 litres, 4,47 €, 0:30, 64 km/h) ; le bouton Pause devient Reprendre.

## V-3.5-01-avant.png
Écran d'enregistrement : pastille « Enregistrement », « Renault Clio ». Vitesse 10 km/h, courbe quasi plate. Stats : 74,8 km, 5,15 litres, 10,25 € essence, durée 1:11, 63 km/h moyenne, 6,9 L/100 km. « Prix : mon prix · 1,990 €/L », boutons Pause et Arrêter.

## V-3.5-02-apres.png
Écran de résumé de trajet : titre « ALBI → TOULOUSE », « 22 oct. 2026 · 1 h 11 · Renault Clio ». Trois tuiles : 5,15 litres, 74,8 km, 6,9 L/100 km moy. Sélecteur de carburant avec SP95-E10 sélectionné, « Mon prix 1,99⁰ €/L » et le lien « Revenir à la moyenne ». Gros affichage « 10,25 € essence », compteur « Personnes » à 1, texte « Seul : tout pour toi. ». Deux graphiques : Vitesse (63 km/h moy. · 7 accélérations) et Consommation (moy. 6,9 · pointe 16,3 L/100). Les boutons du bas sont coupés par la barre d'onglets.
Différence avec la capture d'avant : l'écran d'enregistrement en cours est remplacé par le résumé ALBI → TOULOUSE, avec les chiffres finaux, le sélecteur de carburant, le compteur de personnes et les deux graphiques.

## V-3.5-03-avant.png
Écran d'enregistrement : pastille « Enregistrement », « Renault Clio ». Vitesse 19 km/h, courbe qui monte légèrement. Stats : 0,5 km, 0,04 litres, 0,09 € essence, durée 0:02, 12 km/h moyenne, « — » pour L/100 km. « Prix : moyenne France du jour · 2,153 €/L », boutons Pause et Arrêter.

## V-3.5-04-apres.png
Écran de fin de trajet refusé : titre « Trajet trop court : 0,5 km sur 1 minimum. », ligne « Rien n'est ajouté à l'historique. », bouton noir plein « Retour à l'accueil ». Barre d'onglets en bas, aucune donnée de trajet.
Différence avec la capture d'avant : l'écran d'enregistrement disparaît au profit du message « Trajet trop court : 0,5 km sur 1 minimum », qui indique que rien n'est ajouté à l'historique.

## V-3.5-05-avant.png
Écran d'enregistrement : pastille « Enregistrement », « Renault Clio ». Vitesse 28 km/h, courbe avec un creux puis un palier haut. Stats : 2,0 km, 0,17 litres, 0,36 € essence, durée 0:06, 17 km/h moyenne, 8,4 L/100 km. Deux lignes d'information : « Hors ligne : le trajet continue, tout est calculé sur le téléphone. » et « Prix : moyenne France du jour · 2,153 €/L ». Boutons Pause et Arrêter.

## V-3.5-06-apres.png
Écran de résumé de trajet : titre « 43,928 · 2,146 → 43,917 · 2,144 », « 22 oct. 2026 · 6 min · Renault Clio ». Note : « Hors ligne : litres et coût calculés sur le téléphone ; les noms des lieux viendront au retour du réseau. » Tuiles : 0,17 litres, 2,0 km, 8,4 L/100 km moy. Sélecteur SP95-E10, « Moyenne France du jour 2,15³ €/L », « 0,36 € essence », compteur Personnes à 1. Graphiques Vitesse (17 km/h moy. · 2 accélérations) et Consommation (moy. 8,4 · pointe 10,0 L/100).
Différence avec la capture d'avant : le trajet en cours devient un résumé avec titre en coordonnées et la note « Hors ligne », les tuiles et le montant reprennent les mêmes valeurs (2,0 km, 0,17 litres, 0,36 €, 8,4 L/100 km), et les graphiques apparaissent.

## V-3.E1-01-avant.png
Écran d'enregistrement : pastille « Enregistrement », « Renault Clio ». Vitesse 30 km/h, courbe plate puis montée à droite. Stats : 2,7 km, 0,23 litres, 0,50 € essence, durée 0:11, 14 km/h moyenne, 8,5 L/100 km. « Prix : moyenne France du jour · 2,153 €/L », boutons Pause et Arrêter.

## V-3.E1-02-apres.png
Même trajet, statut « Immobile depuis 10 min » en rouge, « Renault Clio ». Vitesse 0 km/h. Stats : 4,0 km, 0,33 litres, 0,72 € essence, durée 0:12, 19 km/h moyenne, 8,3 L/100 km. Un encadré rouge apparaît : « Trajet arrêté : immobile depuis 10 min. », avec « Reprendre » (contour) et « C'est fini » (plein noir). Les boutons Pause et Arrêter disparaissent.
Différence avec la capture d'avant : le statut passe de « Enregistrement » à « Immobile depuis 10 min » ; vitesse 30 → 0 km/h ; distance 2,7 → 4,0 km ; litres 0,23 → 0,33 ; € essence 0,50 → 0,72 ; durée 0:11 → 0:12 ; moyenne 14 → 19 km/h ; L/100 km 8,5 → 8,3 ; l'encadré « Trajet arrêté » avec Reprendre / C'est fini remplace Pause / Arrêter.

## V-3.E1-03-avant.png
Écran « Immobile depuis 10 min » en rouge, « Renault Clio ». Vitesse 0 km/h. Stats : 4,0 km, 0,33 litres, 0,72 € essence, durée 0:12, 19 km/h moyenne, 8,3 L/100 km. Encadré « Trajet arrêté : immobile depuis 10 min. » avec « Reprendre » et « C'est fini » ; « C'est fini » est entouré d'un cadre noir (focus).

## V-3.E1-04-apres.png
Écran de résumé « ALBI → LE SEQUESTRE » (titre souligné), « 22 oct. 2026 · 12 min · Renault Clio ». Tuiles : 0,33 litres, 4,0 km, 8,3 L/100 km moy. Sélecteur de carburant (SP95-E10 en foncé), « Moyenne France du jour » 2,15³ €/L, « 0,72 € essence », compteur Personnes à 1, « Seul : tout pour toi. ». Graphiques Vitesse (19 km/h moy. · 4 accélérations) et Consommation (moy. 8,3 · pointe 12,6 L/100). En bas, les boutons « Supprimer » et « Enregistrer » sont coupés par la barre d'onglets.
Différence avec la capture d'avant : l'encadré « Trajet arrêté » et ses boutons disparaissent, remplacés par le résumé ALBI → LE SEQUESTRE avec les graphiques et les boutons Supprimer / Enregistrer.

## V-3.E1-05-avant.png
Écran « Immobile depuis 10 min » en rouge, « Renault Clio ». Vitesse 0 km/h. Stats : 4,0 km, 0,33 litres, 0,72 € essence, durée 0:12, 19 km/h moyenne, 8,3 L/100 km. Encadré « Trajet arrêté » : « Reprendre » entouré d'un cadre noir (focus), « C'est fini » plein noir.

## V-3.E1-06-apres.png
Écran d'enregistrement, « Renault Clio ». Vitesse 0 km/h, courbe plate. Stats : 4,0 km, 0,33 litres, 0,72 € essence, durée 0:13, 18 km/h moyenne, 8,3 L/100 km. « Prix : moyenne France du jour · 2,153 €/L ». L'encadré « Trajet arrêté » a disparu, Pause et Arrêter sont de nouveau affichés.
Différence avec la capture d'avant : le statut repasse de « Immobile depuis 10 min » à « Enregistrement » ; l'encadré « Trajet arrêté » disparaît ; les boutons redeviennent Pause / Arrêter ; la durée passe de 0:12 à 0:13 et la moyenne de 19 à 18 km/h.

## V-3.E2-01-avant.png
Écran d'enregistrement : pastille « Enregistrement », « Renault Clio ». Vitesse 105 km/h, courbe plate verte. Stats : 3,5 km, 0,23 litres, 0,50 € essence, durée 0:02, 105 km/h moyenne, 6,7 L/100 km. Aucun message GPS. « Prix : moyenne France du jour · 2,153 €/L », boutons Pause et Arrêter.

## V-3.E2-02-apres.png
Écran d'enregistrement : vitesse 0 km/h, courbe plate. Stats : 3,5 km, 0,23 litres, 0,50 € essence, durée 0:02, 93 km/h moyenne, 6,7 L/100 km. Une ligne rouge apparaît sous « Garde l'écran allumé » : « GPS perdu (tunnel) · la distance est complétée à la sortie. » Prix moyen France 2,153 €/L, boutons Pause et Arrêter.
Différence avec la capture d'avant : vitesse 105 → 0 km/h ; moyenne 105 → 93 km/h ; apparition de la ligne rouge « GPS perdu (tunnel) · la distance est complétée à la sortie » ; distance, litres, € essence, durée et L/100 km inchangés.

## V-3.E2-03-avant.png
Écran d'enregistrement : vitesse 0 km/h. Stats : 3,5 km, 0,23 litres, 0,50 € essence, durée 0:03, 60 km/h moyenne, 6,7 L/100 km. La ligne rouge « GPS perdu (tunnel) · la distance est complétée à la sortie » est présente. Prix moyen France 2,153 €/L, boutons Pause et Arrêter.

## V-3.E2-04-apres.png
Écran d'enregistrement : pastille « Enregistrement », « Renault Clio ». Vitesse 120 km/h, courbe plate. Stats : 6,5 km, 0,43 litres, 0,93 € essence, durée 0:03, 111 km/h moyenne, 6,6 L/100 km. La ligne rouge du tunnel a disparu. Prix moyen France 2,153 €/L, boutons Pause et Arrêter.
Différence avec la capture d'avant : vitesse 0 → 120 km/h ; distance 3,5 → 6,5 km ; litres 0,23 → 0,43 ; € essence 0,50 → 0,93 ; moyenne 60 → 111 km/h ; L/100 km 6,7 → 6,6 ; la ligne « GPS perdu (tunnel) » disparaît ; durée inchangée (0:03).

## V-4.1-01-avant.png
Écran de résumé de trajet : titre « BRENS → PARISOT », « 22 oct. 2026 · 4 min · Renault Clio ». Tuiles : 0,55 litres, 8,2 km, 6,6 L/100 km moy. Sélecteur de carburant avec SP95-E10 sélectionné, « Moyenne France du jour » 2,15³ €/L. Gros affichage « 1,18 € essence », compteur Personnes à 1, « Seul : tout pour toi. ». Graphiques Vitesse (110 km/h moy. · 1 accélération) et Consommation (moy. 6,6 · pointe 8,0 L/100). Les boutons « Supprimer » et « Enregistrer » sont coupés par la barre d'onglets.

## V-4.1-02-apres.png
Même résumé BRENS → PARISOT, page défilée vers le haut : le titre est en partie masqué sous l'en-tête. Les boutons « Supprimer » et « Enregistrer » sont entièrement visibles. Valeurs identiques (0,55 l, 8,2 km, 1,18 €, 110 km/h moy., 6,6 L/100 km).
Différence avec la capture d'avant : défilement vers le bas de la page, les boutons du bas ne sont plus coupés ; aucune valeur modifiée.

## V-4.1-03-avant.png
Même résumé BRENS → PARISOT, page défilée. Le bouton « Gazole » a le focus (contour noir) ; SP95-E10 reste sélectionné. Moyenne France du jour 2,15³ €/L, 1,18 € essence, Personnes 1, graphiques inchangés.

## V-4.1-04-apres.png
Même résumé BRENS → PARISOT, page défilée. « Gazole » est maintenant sélectionné (fond noir) et SP95-E10 ne l'est plus. Moyenne France du jour 2,36⁸ €/L, gros affichage « 1,29 € essence ». Tuiles et graphiques inchangés.
Différence avec la capture d'avant : carburant sélectionné passe de SP95-E10 à Gazole ; le prix moyen passe de 2,15³ à 2,36⁸ €/L ; le montant passe de 1,18 à 1,29 € essence.

## V-4.1-05-avant.png
Résumé de trajet « BARCELONE → BARCELONE », « 22 oct. 2026 · 11 min · Renault Clio ». Tuiles : 0,26 litres, 3,2 km, 8,0 L/100 km moy. SP95-E10 sélectionné, « Moyenne Espagne du jour » 1,78⁰ €/L, gros affichage « 0,46 € essence ». Personnes à 1, « Seul : tout pour toi. ». Graphiques Vitesse (17 km/h moy. · 2 accélérations, courbe avec une chute) et Consommation (moy. 8,0 · pointe 10,1 L/100). Boutons du bas coupés.

## V-4.1-06-apres.png
Résumé BARCELONE → BARCELONE, rendu identique à la capture précédente : 0,26 l, 3,2 km, 8,0 L/100 km, 1,78⁰ €/L (Espagne), 0,46 € essence, Personnes 1, graphiques Vitesse et Consommation identiques.
Différence avec la capture d'avant : aucune différence visible.

## V-4.2-01-avant.png
Résumé BRENS → PARISOT, page défilée (titre en partie masqué). Tuiles 0,55 l, 8,2 km, 6,6 L/100 km moy. SP95-E10 sélectionné, « Moyenne France du jour » 2,15³ €/L, 1,18 € essence, Personnes 1, Vitesse 110 km/h moy. · 1 accélération, Consommation moy. 6,6 · pointe 8,0. Boutons Supprimer et Enregistrer visibles.

## V-4.2-02-apres.png
Résumé BRENS → PARISOT, page défilée. Le libellé du prix devient « Mon prix » avec la pastille 1,98⁰ €/L (et l'icône crayon), et le lien « Revenir à la moyenne » apparaît sous la pastille. Gros affichage « 1,09 € essence ». Tuiles et graphiques inchangés.
Différence avec la capture d'avant : « Moyenne France du jour 2,15³ €/L » devient « Mon prix 1,98⁰ €/L » avec le lien « Revenir à la moyenne » ; le montant passe de 1,18 à 1,09 € essence.

## V-4.2-03-avant.png
Résumé BRENS → PARISOT, page défilée. « Mon prix 1,98⁰ €/L » ; le lien « Revenir à la moyenne » est entouré d'un cadre noir (focus). Gros affichage « 1,09 € essence ». Personnes 1, graphiques inchangés.

## V-4.2-04-apres.png
Résumé BRENS → PARISOT, page défilée. Le libellé est revenu à « Moyenne France du jour » avec la pastille 2,15³ €/L ; le lien « Revenir à la moyenne » a disparu. Gros affichage « 1,18 € essence ».
Différence avec la capture d'avant : « Mon prix 1,98⁰ €/L » redevient « Moyenne France du jour 2,15³ €/L », le lien « Revenir à la moyenne » disparaît, le montant repasse de 1,09 à 1,18 € essence.

## V-4.2-05-avant.png
Résumé BRENS → PARISOT, page non défilée. Sous « Moyenne France du jour », un champ de saisie du prix contient « 1,5 » (encadré noir, focus) à la place de la pastille de prix. Gros affichage « 1,18 € essence ». Tuiles et graphiques inchangés.

## V-4.2-06-apres.png
Résumé BRENS → PARISOT, page non défilée. Le champ de saisie « 1,5 » a disparu ; la pastille « 2,15³ €/L » reprend sa place avec un cadre noir (focus). Gros affichage « 1,18 € essence », inchangé.
Différence avec la capture d'avant : le champ de saisie « 1,5 » est remplacé par la pastille 2,15³ €/L (focus sur la pastille) ; le montant ne change pas (1,18 € essence).

## V-4.3-01-avant.png
Résumé de trajet « ALBI → PARIS », « 21 oct. 2026 · 5 h 45 · Renault Clio ». Tuiles : 41,20 litres, 588 km, 7,0 L/100 km moy. SP95-E10 sélectionné, « Mon prix 2,16¹ €/L » et le lien « Revenir à la moyenne ». Gros affichage « 89,03 € essence ». Personnes à 1, « Seul : tout pour toi. ». Graphiques Vitesse (102 km/h moy. · 9 accélérations) et Consommation (moy. 7,0 · pointe 8,4 L/100). Boutons du bas coupés.

## V-4.3-02-apres.png
Même résumé ALBI → PARIS, rendu identique : 41,20 l, 588 km, 7,0 L/100 km, Mon prix 2,16¹ €/L, 89,03 € essence, Personnes 1.
Différence avec la capture d'avant : aucune différence visible.

## V-4.3-03-avant.png
Résumé ALBI → PARIS, avec la ligne « Hors ligne : litres et coût calculés sur le téléphone. » sous la date. Tuiles 41,20 l, 588 km, 7,0 L/100 km. SP95-E10 sélectionné. « Mon prix » est suivi d'un champ de saisie contenant « 2,050 » (encadré noir, focus) ; le lien « Revenir à la moyenne » n'est pas affiché. Gros affichage « 89,03 € essence ». Personnes 1, graphiques inchangés.

## V-4.3-04-apres.png
Résumé ALBI → PARIS, ligne « Hors ligne » toujours présente. Le champ « 2,050 » est remplacé par la pastille « 2,05⁰ €/L » (focus, cadre noir) ; le lien « Revenir à la moyenne » apparaît. Gros affichage « 84,46 € essence ».
Différence avec la capture d'avant : le champ « 2,050 » devient la pastille 2,05⁰ €/L avec le lien « Revenir à la moyenne » ; le montant passe de 89,03 à 84,46 € essence.

## V-4.4-01-avant.png
Résumé ALBI → PARIS, non défilé. La pastille « Mon prix 2,16¹ €/L » a le focus (cadre noir) ; lien « Revenir à la moyenne » présent. Gros affichage « 89,03 € essence ». Personnes à 1, pas de montant par personne.

## V-4.4-02-apres.png
Résumé ALBI → PARIS. Le compteur Personnes passe à 3 (boutons − et + actifs). Apparition sous le bloc Personnes de « 29,68 € chacun ». Pastille prix « 2,16¹ €/L » sans cadre de focus. Gros affichage « 89,03 € essence » inchangé.
Différence avec la capture d'avant : Personnes 1 → 3 ; apparition de « 29,68 € chacun » ; le focus quitte la pastille de prix.

## V-4.4-03-avant.png
Résumé ALBI → PARIS, non défilé. « Mon prix 2,16¹ €/L » avec le lien « Revenir à la moyenne », sans focus. Gros affichage « 89,03 € essence ». Personnes à 1, pas de montant par personne.

## V-4.4-04-apres.png
Rendu identique à la capture précédente : ALBI → PARIS, Mon prix 2,16¹ €/L, 89,03 € essence, Personnes 1.
Différence avec la capture d'avant : aucune différence visible.

## V-4.5-01-avant.png
Écran de résumé avec le bouton « ← Historique » en haut, « ALBI → TOULOUSE », « 22 oct. 2026 · 1 h 11 · Renault Clio ». Tuiles : 5,15 litres, 74,8 km, 6,9 L/100 km moy. SP95-E10 sélectionné, « Mon prix 1,99⁰ €/L » avec le lien « Revenir à la moyenne ». Gros affichage « 10,25 € essence ». Personnes à 3 (boutons − et + actifs), « 3,42 € chacun ». Graphiques Vitesse (63 km/h moy. · 7 accélérations) et Consommation (moy. 6,9 · pointe 16,3 L/100). Onglet « Historique » actif dans la barre du bas.

## V-4.5-02-apres.png
Rendu identique à la capture précédente : ← Historique, ALBI → TOULOUSE, 5,15 l, 74,8 km, 6,9 L/100 km, Mon prix 1,99⁰ €/L, 10,25 € essence, Personnes 3, 3,42 € chacun, onglet Historique actif.
Différence avec la capture d'avant : aucune différence visible.

## V-4.6-01-avant.png
Même résumé ALBI → TOULOUSE, non défilé : bouton « ← Historique », tuiles 5,15 l, 74,8 km, 6,9 L/100 km, Mon prix 1,99⁰ €/L, 10,25 € essence, Personnes 3, 3,42 € chacun, graphiques Vitesse et Consommation. Onglet Historique actif.

## V-4.6-02-apres.png
Même résumé ALBI → TOULOUSE, page défilée vers le haut : le bouton « ← Historique » est masqué sous l'en-tête. Valeurs identiques (10,25 € essence, 3,42 € chacun, Mon prix 1,99⁰ €/L).
Différence avec la capture d'avant : défilement vers le haut de quelques dizaines de pixels ; aucune valeur modifiée.

## V-4.7-01-avant.png
Écran Trajet, résumé de trajet sans titre de trajet (la ligne de date « 22 oct. 2026 · 1 h 11 · Renault Clio » est directement sous l'en-tête). Tuiles : 5,15 litres, 74,8 km, 6,9 L/100 km moy. SP95-E10 sélectionné, « Mon prix 1,99⁰ €/L » avec le lien « Revenir à la moyenne ». Gros affichage « 10,25 € essence », Personnes à 3, « 3,42 € chacun ». Graphiques Vitesse (63 km/h moy. · 7 accélérations) et Consommation (moy. 6,9 · pointe 16,3 L/100). Boutons « Supprimer » et « Enregistrer » visibles, onglet Trajet actif.

## V-4.7-02-apres.png
Écran Historique : titre « HISTORIQUE », trois tuiles (1 trajet, 74,8 km, 10,25 € essence), section « OCTOBRE 2026 ». Une seule ligne : « Albi → Toulouse », « 22 oct. · 74,8 km · SP95-E10 à 1,990 €/L · 3,42 € chacun », montant « 10,25 € » à droite. Onglet Historique actif.
Différence avec la capture d'avant : on passe du résumé Trajet à la liste Historique avec une seule entrée « Albi → Toulouse » (10,25 €) ; l'onglet actif passe de Trajet à Historique.

## V-4.7-03-avant.png
Résumé de trajet « ALBI → ALBI », « 22 oct. 2026 · 6 min · Renault Clio ». Tuiles : 0,17 litres, 2,0 km, 8,4 L/100 km moy. SP95-E10 sélectionné, « Moyenne France du jour » 2,15³ €/L. Gros affichage « 0,36 € essence », Personnes à 1, « Seul : tout pour toi. ». Graphiques Vitesse (17 km/h moy. · 2 accélérations) et Consommation (moy. 8,4 · pointe 10,0 L/100). Boutons Supprimer et Enregistrer visibles.

## V-4.7-04-apres.png
Accueil Trajet : « RENAULT CLIO », « 1.2 · 118 ch · 2017 · SP95-E10 », bouton « Changer » et grand bouton vert « DÉMARRER ». Onglet Trajet actif. Aucune donnée de trajet.
Différence avec la capture d'avant : le résumé « ALBI → ALBI » disparaît, remplacé par l'accueil Trajet avec le bouton Démarrer.

## V-4.7-05-avant.png
Résumé de trajet « BARCELONE → BARCELONE » (titre non souligné), « 22 oct. 2026 · 11 min · Renault Clio ». Tuiles : 0,26 litres, 3,2 km, 8,0 L/100 km moy. SP95-E10 sélectionné, « Moyenne Espagne du jour » 1,78⁰ €/L. Gros affichage « 0,46 € essence », Personnes à 1. Graphiques Vitesse (17 km/h moy. · 2 accélérations) et Consommation (moy. 8,0 · pointe 10,1 L/100). Boutons Supprimer et Enregistrer visibles.

## V-4.7-06-apres.png
Même résumé BARCELONE → BARCELONE, avec le titre souligné. Valeurs identiques (0,26 l, 3,2 km, 8,0 L/100 km, 1,78⁰ €/L, 0,46 € essence, Personnes 1).
Différence avec la capture d'avant : le titre « BARCELONE → BARCELONE » est souligné ; aucune autre différence visible.

## V-5.1-01-avant.png
Accueil Trajet : « RENAULT CLIO », « 1.2 · 118 ch · 2017 · SP95-E10 », bouton « Changer », grand bouton vert « DÉMARRER ». Onglet Trajet actif.

## V-5.1-02-apres.png
Écran Stations : chips de carburant (SP95-E10 sélectionné), carte centrée sur Albi avec des pastilles de prix (1,990 ; 2,178 ; 2,182 ; 2,187 ; 2,178 ; 2,182) et la légende « moins cher / plus cher ». Liste « STATIONS · SP95-E10 », mode « Moins cher » actif : TotalEnergies Albi · Relais des Fo… (2,2 km, prix du 20/10, −16,3 c, 1,99⁰), TotalEnergies Marssac-sur-Tarn (9,4 km, 1,99⁰), Intermarché Cagnac-les-Mines (6,8 km, 2,14⁹), Intermarché Le Sequestre (2,3 km, 2,17⁸), Leclerc Albi (3,3 km, 2,17⁸), Carrefour Albi (1,9 km, 2,18²). Onglet Stations actif.
Différence avec la capture d'avant : on passe de l'accueil Trajet à l'écran Stations, avec la carte, les chips de carburant et la liste de stations.

## V-5.1-03-avant.png
Écran Stations avec un bandeau noir « ● Trajet en cours · 3,05 € » en haut. Chips : SP95-E10 sélectionné. Carte centrée sur Brens / Lisle-sur-Tarn avec les pastilles 2,179, 2,179, 2,169 et une pastille « 2,168 » coupée à gauche. Liste en mode « Moins cher » : TotalEnergies Marssac-sur-Tarn (9,2 km, 1,99⁰), Intermarché Lisle-sur-Tarn (8,9 km, prix du 14/10, 2,16⁸), Leclerc Brens (1,5 km, 2,16⁹), Leclerc Gaillac (3,6 km, 2,17⁹), Intermarché Gaillac (3,7 km, 2,17⁹).

## V-5.1-04-apres.png
Écran d'enregistrement : pastille « Enregistrement », « Renault Clio ». Vitesse 104 km/h, courbe en palier avec un pic à droite. Stats : 22,0 km, 1,56 litres, 3,10 € essence, durée 0:24, 54 km/h moyenne, 7,1 L/100 km. « Prix : mon prix · 1,990 €/L », boutons Pause et Arrêter.
Différence avec la capture d'avant : on passe de l'écran Stations (avec le bandeau « Trajet en cours · 3,05 € ») à l'écran d'enregistrement en cours à 104 km/h (22,0 km, 3,10 €).

## V-5.2-01-avant.png
Accueil Trajet : « RENAULT CLIO », « 1.2 · 118 ch · 2017 · SP95-E10 », bouton « Changer », bouton vert « DÉMARRER ». Onglet Trajet actif.

## V-5.2-02-apres.png
Écran Stations, pas de bandeau. Chips : SP95-E10 sélectionné. Carte centrée sur Prayssac (pastilles 2,189, 2,179, 1,990, 2,177). Liste « STATIONS · SP95-E10 », mode « Moins cher » : TotalEnergies Prayssac (510 m, prix du 16/10, 1,99⁰), Intermarché Puy-l'Évêque (3,6 km, 2,17⁷), Intermarché Prayssac (310 m, 2,17⁹), Carrefour Market Prayssac (1,1 km, 2,18⁹), Système U Parnac (9,7 km, prix du 13/10, 2,22⁹). Onglet Stations actif.
Différence avec la capture d'avant : on passe de l'accueil Trajet à l'écran Stations centré sur Prayssac, avec la liste de cinq stations.

## V-5.2-03-avant.png
Écran Stations identique à la capture précédente : SP95-E10 sélectionné, carte centrée sur Prayssac, mode « Moins cher », mêmes cinq stations (1,99⁰ ; 2,17⁷ ; 2,17⁹ ; 2,18⁹ ; 2,22⁹ €/L).

## V-5.2-04-apres.png
Écran Stations, chip « Gazole » sélectionné (au lieu de SP95-E10). Titre de liste « STATIONS · GAZOLE ». Carte avec pastilles 2,359, 2,349, 2,347. Liste « Moins cher » de quatre stations : Intermarché Puy-l'Évêque (3,6 km, 2,34⁷), Intermarché Prayssac (310 m, 2,34⁹), Carrefour Market Prayssac (1,1 km, 2,35⁹), Système U Parnac (9,7 km, 2,36⁹).
Différence avec la capture d'avant : le carburant passe de SP95-E10 à Gazole ; la liste passe de cinq stations en SP95-E10 (dont TotalEnergies Prayssac à 1,99⁰) à quatre stations en Gazole (2,34⁷ à 2,36⁹ €/L) ; la carte affiche de nouvelles pastilles de prix.

## V-5.3-01-avant.png
Écran Stations avec bandeau « ● Trajet en cours · 0,44 € ». Chips : SP95-E10 sélectionné. Carte centrée sur Albi avec les pastilles 1,990, 2,178, 2,177, 2,182, 2,178, 2,182. Liste « Moins cher » : TotalEnergies Albi · Relais des Fo… (3,7 km, 1,99⁰), TotalEnergies Marssac-sur-Tarn (9,1 km, 1,99⁰), Intermarché Cagnac-les-Mines (8,4 km, 2,14⁹), Intermarché Le Sequestre (1,1 km, +2,4 c, 2,17⁸), Leclerc Albi (2,9 km, 2,17⁸), Carrefour Albi (coupé, 2,18²).

## V-5.3-02-apres.png
Même écran Stations avec le bandeau « Trajet en cours · 0,44 € ». La carte a été déplacée vers Montauban, Saint-Nauphary et Léojac, sans pastille visible ; un bouton blanc « Rechercher dans cette zone » apparaît en haut de la carte. La liste reste celle d'Albi (TotalEnergies Albi 3,7 km, Marssac 9,1 km, Cagnac 8,4 km, Le Sequestre 1,1 km, Leclerc Albi 2,9 km).
Différence avec la capture d'avant : la carte est déplacée vers Montauban, les pastilles de prix d'Albi disparaissent de la carte et le bouton « Rechercher dans cette zone » apparaît ; la liste ne change pas.

## V-5.3-03-avant.png
Écran Stations avec bandeau « Trajet en cours · 0,44 € », SP95-E10 sélectionné. Carte centrée sur Montauban, sans pastille, avec le bouton « Rechercher dans cette zone ». La liste affichée reste celle d'Albi (TotalEnergies Albi · Relais des Fo… 1,99⁰, Marssac 1,99⁰, Cagnac 2,14⁹, Le Sequestre 2,17⁸, Leclerc Albi 2,17⁸, Carrefour Albi coupé).

## V-5.3-04-apres.png
Écran Stations, en-tête « Autour de Montauban », bandeau « Trajet en cours · 0,44 € ». La carte est centrée sur Montauban avec des pastilles de prix (2,149 ; 1,990 ; 2,230 ; 2,335…) et le bouton « Rechercher dans cette zone » a disparu. La liste est celle de Montauban : TotalEnergies Montauban (63,4 km, 1,99⁰), TotalEnergies Access Montauban (64,9 km, 1,99⁰), Carrefour Contact Saint-Étienne (56,4 km, 2,13⁹), Leclerc Montauban · 002 (62,8 km, 2,14⁹), Auchan Montauban (63,1 km, 2,14⁹), Leclerc Montauban · 015 (coupé, 2,14⁹).
Différence avec la capture d'avant : l'en-tête passe à « Autour de Montauban » ; la liste passe des stations d'Albi aux stations de Montauban (56 à 64 km) ; le bouton « Rechercher dans cette zone » disparaît ; les pastilles de prix apparaissent sur la carte.

## V-5.4-01-avant.png
Écran Stations sans bandeau, SP95-E10 sélectionné, carte centrée sur Albi (pastilles 1,990 ; 2,178 ; 2,182 ; 2,187 ; 2,178 ; 2,182). Mode « Moins cher » actif : TotalEnergies Albi · Relais des Fo… (2,2 km, 1,99⁰), TotalEnergies Marssac-sur-Tarn (9,4 km, 1,99⁰), Intermarché Cagnac-les-Mines (6,8 km, 2,14⁹), Intermarché Le Sequestre (2,3 km, 2,17⁸), Leclerc Albi (3,3 km, 2,17⁸), Carrefour Albi (1,9 km, 2,18²).

## V-5.4-02-apres.png
Même écran Stations, SP95-E10, carte d'Albi inchangée. Le mode « Plus proche » est maintenant actif (au lieu de « Moins cher »). La liste est triée par distance : Esso Express Albi (1,8 km, +3,4 c, 2,18⁷), Carrefour Albi (1,9 km, 2,18²), TotalEnergies Albi · Relais des Fo… (2,2 km, 1,99⁰), Intermarché Le Sequestre (2,3 km, 2,17⁸), Leclerc Lescure-d'Albigeois (3,1 km, 2,18²), Leclerc Albi (3,3 km, 2,17⁸).
Différence avec la capture d'avant : le mode passe de « Moins cher » à « Plus proche » ; Esso Express Albi (1,8 km) apparaît en tête de liste et TotalEnergies Marssac-sur-Tarn disparaît ; la carte ne change pas.

## V-5.5-01-avant.png
Écran Stations, en-tête « Autour de Montauban », bandeau « Trajet en cours · 0,44 € ». La carte est centrée sur Montauban. Une fiche « TOTALENERGIES MONTAUBAN » est ouverte en bas (284 Avenue Jean Moulin, 82000 Montauban, 63,4 km) : Gazole 2,25⁰ €/L, SP95-E10 1,99⁰ €/L, SP95 non vendu, SP98 1,99⁰ €/L, E85 non vendu, GPLc non vendu, « Mis à jour il y a 19 h », services (boutique alimentaire, vente de fioul domestique). Bouton noir « Utiliser 1,990 €/L pour mon trajet ».

## V-5.5-02-apres.png
Écran d'enregistrement : pastille « Enregistrement », « Renault Clio ». Vitesse 0 km/h, courbe plate avec une descente à droite. Stats : 2,5 km, 0,21 litres, 0,41 € essence, durée 0:08, 18 km/h moyenne, 8,3 L/100 km. « Prix : mon prix · 1,990 €/L », boutons Pause et Arrêter.
Différence avec la capture d'avant : la fiche station Montauban et la carte disparaissent ; on passe à l'écran d'enregistrement (0 km/h, 2,5 km, 0,41 €, durée 0:08).

## V-5.5-03-avant.png
Écran Stations centré sur Albi, mode « Moins cher », SP95-E10 sélectionné. Une fiche « TOTALENERGIES ALBI · RELAIS DES FONTANELLES » (40 route de Cordes, 81000 Albi, 2,2 km) est ouverte en bas : Gazole 2,25⁰ €/L, SP95-E10 1,99⁰ €/L, SP95 non vendu, SP98 rupture, E85 non vendu, GPLc non vendu, « Prix du 20/10 », services (automate 24/24, toilettes publiques, boutique alimentaire). Bouton noir « Utiliser 1,990 €/L pour mon trajet ».

## V-5.5-04-apres.png
Accueil Trajet : « RENAULT CLIO », « 1.2 · 118 ch · 2017 · SP95-E10 », bouton « Changer », bouton vert « DÉMARRER ». Onglet Trajet actif. La fiche station a disparu.
Différence avec la capture d'avant : la carte Stations et la fiche « TOTALENERGIES ALBI · RELAIS DES FONTANELLES » disparaissent ; on revient à l'accueil Trajet.

## V-5.5-05-avant.png
Écran Stations, en-tête « Autour de moi », chip Gazole sélectionné (SP95-E10 non sélectionné). Carte centrée sur Albi avec de nombreuses pastilles de prix (2,250 ; 2,355 ; 2,364 ; 2,383 ; 2,390 ; 2,398 ; 2,399 ; 2,417 ; 2,420…). Liste « STATIONS · GAZOLE », mode « Moins cher » : TotalEnergies Marssac-sur-Tarn (9,4 km, 2,25⁰), Intermarché Le Sequestre (2,3 km, 2,35⁵), Leclerc Albi (3,3 km, 2,35⁵), Intermarché Cagnac-les-Mines (6,8 km, 2,35⁵), Esso Express Albi (1,8 km, 2,36⁴), Leclerc Le Sequestre (2,8 km, prix du 07/10, 2,38³). La ligne « Leclerc Le Sequestre » est entourée d'un cadre noir (focus).

## V-5.5-06-apres.png
Même écran Stations (Gazole, carte d'Albi, liste « Moins cher »). Une fiche « LECLERC LE SEQUESTRE » s'ouvre en bas : 1 Rue de Mélaudie, 81990 Le Sequestre, 2,8 km. Gazole 2,38³ €/L ; SP95-E10 non vendu ; SP95 rupture ; SP98 non vendu ; E85 non vendu ; GPLc non vendu ; « Prix du 07/10 · Automate 24/24 ». Aucun bouton « Utiliser » n'est visible dans la fiche. La pastille 2,383 sur la carte est entourée (sélectionnée).
Différence avec la capture d'avant : la fiche « LECLERC LE SEQUESTRE » apparaît en bas de l'écran et masque une partie de la liste ; le cadre noir de la ligne disparaît et la pastille 2,383 est mise en évidence sur la carte.

## V-5.6-01-avant.png
Écran Stations avec bandeau « ● Trajet en cours · 0,97 € », SP95-E10 sélectionné, mode « Moins cher ». Carte centrée sur Albi (pastilles 1,990 ; 2,178 ; 2,182 ; 2,187). Liste : TotalEnergies Albi · Relais des Fo… (4,4 km, prix du 20/10), TotalEnergies Marssac-sur-Tarn (5,3 km), Intermarché Cagnac-les-Mines (8,8 km), Leclerc Albi (970 m, +2,4 c), Intermarché Le Sequestre (2,8 km), Carrefour Albi (coupé). Les cases de prix à droite des lignes sont vides : aucune valeur n'est affichée.

## V-5.6-02-apres.png
Même écran Stations avec le bandeau « ● Trajet en cours · 0,99 € ». La carte est décalée (Castelnau-de-Lévis, Terrasse, Le Sequestre visibles). Les prix sont affichés : TotalEnergies Albi · Relais des Fo… (4,5 km, 1,99⁰), TotalEnergies Marssac-sur-Tarn (5,2 km, 1,99⁰), Intermarché Cagnac-les-Mines (8,8 km, 2,14⁹), Leclerc Albi (1,1 km, 2,17⁸), Intermarché Le Sequestre (2,9 km, 2,17⁸), Carrefour Albi (coupé, 2,18²).
Différence avec la capture d'avant : le bandeau passe de 0,97 à 0,99 € ; les cases de prix se remplissent (1,99⁰, 1,99⁰, 2,14⁹, 2,17⁸, 2,17⁸) ; les distances changent légèrement (4,4 → 4,5 km ; 5,3 → 5,2 km ; 970 m → 1,1 km ; 2,8 → 2,9 km) ; la carte est décalée.

## V-5.6-03-avant.png
Écran Stations avec bandeau « ● Trajet en cours · 1,02 € », SP95-E10 sélectionné, mode « Moins cher ». Carte d'Albi (pastilles 1,990 ; 2,178 ; 2,182 ; 2,187). Liste avec prix : TotalEnergies Albi · Relais des Fo… (4,6 km, 1,99⁰), TotalEnergies Marssac-sur-Tarn (5,1 km, 1,99⁰), Intermarché Cagnac-les-Mines (8,8 km, 2,14⁹), Leclerc Albi (1,2 km, 2,17⁸), Intermarché Le Sequestre (3,0 km, 2,17⁸), Carrefour Albi (coupé).

## V-5.6-04-apres.png
Écran d'enregistrement : pastille « Enregistrement », « Renault Clio ». Vitesse 82 km/h, courbe plate avec un pic à droite. Stats : 6,9 km, 0,52 litres, 1,03 € essence, durée 0:15, 27 km/h moyenne, 7,5 L/100 km. « Prix : mon prix · 1,990 €/L », boutons Pause et Arrêter.
Différence avec la capture d'avant : on quitte l'écran Stations (bandeau 1,02 €, liste de stations) pour l'écran d'enregistrement en cours à 82 km/h (6,9 km, 1,03 € essence).

## V-5.7-01-avant.png
Accueil Trajet : « RENAULT CLIO », « 1.2 · 118 ch · 2017 · SP95-E10 », bouton « Changer », bouton vert « DÉMARRER ». Onglet Trajet actif.

## V-5.7-02-apres.png
Écran Stations, en-tête « Autour de moi », SP95-E10 sélectionné, mode « Moins cher ». Carte centrée sur la région de Barcelone (Hospitalet de Llobregat, Sant Adrià de Besòs) avec de nombreuses pastilles (1,499 ; 1,504 ; 1,553 ; 1,604 ; 1,719 ; 1,789 ; 1,829 ; 1,869…). Liste : Plenergy Hospitalet de Llobregat (5,7 km, date inconnue, −28,1 c vs Espagne, 1,49⁹), Tamoil Hospitalet de Llobregat (6,0 km, 1,49⁹), Plenergy Hospitalet de Llobregat (6,1 km, 1,49⁹), Galp Sant Adrià de Besòs (6,8 km, −26,6 c, 1,51⁴), Alcampo Sant Adrià de Besòs (6,7 km, −25,8 c, 1,52²).
Différence avec la capture d'avant : on passe de l'accueil Trajet à l'écran Stations ; la carte et la liste affichent des stations espagnoles, avec des prix autour de 1,49 à 1,52 €/L.

## V-5.7-03-avant.png
Écran Stations, en-tête « Autour de moi », SP95-E10 sélectionné, mode « Moins cher ». Carte centrée sur Dartford / Bowmans (Royaume-Uni), pastilles 2,086 ; 2,075 ; 2,086 ; 2,051. Liste : Morrisons · MFG Morrisons Grays (7,9 km, 2,02⁷, −4,8 c vs Royaume-Uni), Asda Thurrock Park Way Tilbury (9,4 km, 2,02⁷), TEXACO (9,7 km, hier, 2,02⁷), Asda Crossways Boulevard (4,3 km, 2,05¹), Morrisons Erith (4,4 km, 2,05¹), ESSO MFG Chafford Hogg Lane (coupé).

## V-5.7-04-apres.png
Même écran Stations (Royaume-Uni, SP95-E10, carte de Dartford). Une fiche « MORRISONS · MFG MORRISONS GRAYS, LONDON ROAD, GRAYS » s'ouvre en bas (7,9 km). Prix : Gazole 2,34⁹ €/L, SP95-E10 2,02⁷ €/L, SP95 2,02⁷ €/L, SP98 2,26⁵ €/L, E85 non vendu, GPLc non vendu. Ligne « Gazole 196,9 p/L · SP95-E10 169,9 p/L · SP95 169,9 p/L · SP98 189,9 p/L », « 1 € = 0,8383 £ · BCE 21/10 », « Mis à jour il y a 7 h », bouton noir « Utiliser 2,027 €/L pour mon trajet ».
Différence avec la capture d'avant : la fiche Morrisons (prix détaillés, bouton « Utiliser 2,027 €/L ») apparaît en bas et masque la moitié de la liste.

## V-5.7-05-avant.png
Écran Stations, en-tête « Autour de moi », SP95-E10 sélectionné, mode « Moins cher ». Carte centrée sur Bruxelles avec le bouton blanc « Rechercher dans cette zone » en haut. Message : « Ce pays ne publie pas les prix station par station » et « Moyenne nationale · Belgique · SP95-E10 : 1,989 €/L ». Aucune liste de stations.

## V-5.7-06-apres.png
Écran Stations, en-tête « Autour de Schaerbeek ». La carte est recentrée sur Bruxelles (Schaerbeek, Etterbeek, Woluwe) et le bouton « Rechercher dans cette zone » a disparu. Le message « Ce pays ne publie pas les prix station par station » et « Moyenne nationale · Belgique · SP95-E10 : 1,989 €/L » restent affichés.
Différence avec la capture d'avant : l'en-tête passe de « Autour de moi » à « Autour de Schaerbeek », la carte est recentrée et le bouton « Rechercher dans cette zone » disparaît.

## V-6.1-01-avant.png
Résumé de trajet « ALBI → ALBI », « 5 oct. 2026 · 14 min · Renault Clio ». Tuiles : 0,47 litres, 6,6 km, 7,1 L/100 km moy. SP95-E10 sélectionné, « Moyenne France du jour » 2,15³ €/L. Gros affichage « 1,01 € essence », Personnes à 1, « Seul : tout pour toi. ». Graphiques Vitesse (26 km/h moy. · 4 accélérations) et Consommation (moy. 7,1 · pointe 12,7 L/100). Boutons Supprimer et Enregistrer visibles.

## V-6.1-02-apres.png
Écran Historique : titre « HISTORIQUE », tuiles « 2 trajets », « 9,0 km », « 1,45 € essence ». Section « OCTOBRE 2026 » : Albi → Albi (5 oct. · 6,6 km · SP95-E10 à 2,153 €/L), montant 1,01 €. Section « SEPTEMBRE 2026 » : Albi → Albi (14 sept. · 2,5 km · SP95-E10 à 2,153 €/L), montant 0,44 €. Onglet Historique actif.
Différence avec la capture d'avant : on passe du résumé « ALBI → ALBI » (5 oct., 1,01 €) à la liste Historique qui contient deux trajets (1,01 € et 0,44 €), avec les tuiles 2 trajets / 9,0 km / 1,45 €.

## V-6.1-03-avant.png
Accueil Trajet : « RENAULT CLIO », « 1.2 · 118 ch · 2017 · SP95-E10 », bouton « Changer », bouton vert « DÉMARRER ». Onglet Trajet actif.

## V-6.1-04-apres.png
Écran Historique vide : titre « HISTORIQUE », tuiles « 0 trajets », « 0,0 km », « 0,00 € essence ». Message « Aucun trajet enregistré. ». Onglet Historique actif, aucune ligne de trajet.
Différence avec la capture d'avant : on passe de l'accueil Trajet à l'écran Historique, sans aucun trajet (« Aucun trajet enregistré. »).

## V-6.2-01-avant.png
Écran Historique : titre « HISTORIQUE », tuiles « 4 trajets », « 717 km », « 103,71 € essence ». Section « OCTOBRE 2026 » avec quatre trajets : Albi → Montpellier (16 oct., 243 km, SP95-E10 à 2,154 €/L, 35,07 €), Toulouse → Bordeaux (12 oct., 245 km, 36,42 €), Albi → Cahors (8 oct., 152 km, 21,60 €), Albi → Toulouse (3 oct., 77,0 km, 10,62 €). Onglet Historique actif.

## V-6.2-02-apres.png
Même écran Historique : 4 trajets, 717 km, 103,71 € essence, mêmes quatre lignes (Montpellier 35,07 €, Bordeaux 36,42 €, Cahors 21,60 €, Toulouse 10,62 €).
Différence avec la capture d'avant : aucune différence visible.

## V-6.2-03-avant.png
Détail « ALBI → CAHORS » (« 8 oct. 2026 · 2 h 08 · Renault Clio ») avec le bouton « ← Historique ». Tuiles : 10,03 litres, 152 km, 6,6 L/100 km moy. SP95-E10 sélectionné ; « Mon prix 1,89⁹ €/L » dans une pastille entourée d'un cadre noir (focus), avec « Revenir à la moyenne ». Gros affichage « 19,05 € essence ». Personnes à 1, « Seul : tout pour toi. ». Graphiques Vitesse (71 km/h moy. · 9 accélérations) et Consommation (moy. 6,6 · pointe 7,9 L/100). Onglet Historique actif.

## V-6.2-04-apres.png
Écran Historique : 4 trajets, 717 km, « 101,16 € essence ». La ligne « Albi → Cahors » affiche maintenant « 19,05 € » et « SP95-E10 à 1,899 €/L » (au lieu de 21,60 € et 2,154 €/L). Les trois autres lignes sont inchangées.
Différence avec la capture d'avant : le total passe de 103,71 à 101,16 € ; Albi → Cahors passe de 21,60 € à 19,05 € et de 2,154 à 1,899 €/L, après le détail où le prix 1,89⁹ €/L était saisi (capture 6.2-03).

## V-6.3-01-avant.png
Écran Historique : tuiles « 2 trajets », « 169 km », « 23,38 € essence ». Section « OCTOBRE 2026 » : Toulouse → Albi (19 oct., 76,8 km, SP95-E10 à 2,154 €/L, 10,43 €) et Albi → Rodez (18 oct., 92,4 km, SP95-E10 à 2,154 €/L, 4,32 € chacun, 12,95 €). Aucune ligne n'est mise en évidence. Onglet Historique actif.

## V-6.3-02-apres.png
Même écran Historique (2 trajets, 169 km, 23,38 €). La ligne « Albi → Rodez » est entourée d'un cadre noir (focus).
Différence avec la capture d'avant : apparition d'un cadre noir de focus autour de la ligne « Albi → Rodez » ; aucun chiffre modifié.

## V-6.3-03-avant.png
Même écran Historique (2 trajets, 169 km, 23,38 €). La ligne « Toulouse → Albi » est entourée d'un cadre noir (focus) ; la ligne « Albi → Rodez » n'est plus entourée.

## V-6.3-04-apres.png
Détail « TOULOUSE → ALBI » (« 19 oct. 2026 · 1 h 10 · Renault Clio ») avec le bouton « ← Historique ». Tuiles : 4,84 litres, 76,8 km, 6,3 L/100 km moy. SP95-E10 sélectionné, « Moyenne France du jour » 2,15⁴ €/L. Gros affichage « 10,43 € essence ». Personnes à 1, « Seul : tout pour toi. ». Graphiques Vitesse (66 km/h moy. · 9 accélérations) et Consommation (moy. 6,3 · pointe 7,6 L/100).
Différence avec la capture d'avant : on passe de la liste Historique (deux trajets, Toulouse → Albi en focus) au détail du trajet Toulouse → Albi (4,84 l, 76,8 km, 10,43 €).

## V-6.4-01-avant.png
Détail « TOULOUSE → ALBI » (19 oct. 2026 · 1 h 10 · Renault Clio), bouton « ← Historique » en haut. Tuiles : 4,84 litres, 76,8 km, 6,3 L/100 km moy. SP95-E10 sélectionné, « Moyenne France du jour » 2,15⁴ €/L, gros affichage « 10,43 € essence ». Compteur Personnes à 1 : le bouton « + » est entouré d'un cadre noir (focus). Graphiques Vitesse (66 km/h moy.) et Consommation (moy. 6,3 · pointe 7,6 L/100).

## V-6.4-02-apres.png
Écran Historique : tuiles « 2 trajets », « 169 km », « 24,41 € essence ». Section « OCTOBRE 2026 » : Toulouse → Albi (19 oct., 76,8 km, « Gazole à 2,368 €/L · 5,73 € chacun », 11,46 €) et Albi → Rodez (18 oct., 92,4 km, SP95-E10 à 2,154 €/L, 4,32 € chacun, 12,95 €). Onglet Historique actif.
Différence avec la capture d'avant : retour à la liste Historique ; le trajet Toulouse → Albi passe de 10,43 € (SP95-E10, 1 personne) à 11,46 € (Gazole à 2,368 €/L, 5,73 € chacun) ; le total passe à 24,41 € essence.

## V-6.4-03-avant.png
Détail « ALBI → RODEZ » (« 18 oct. 2026 · 1 h 15 · Renault Clio ») : le titre est en partie tronqué sous l'en-tête. Tuiles : 6,01 litres, 92,4 km, 6,5 L/100 km moy. SP95-E10 sélectionné, « Moyenne France du jour » 2,15⁴ €/L, gros affichage « 12,95 € essence ». Personnes à 3, « 4,32 € chacun ». Graphiques Vitesse (74 km/h moy. · 9 accélérations) et Consommation (moy. 6,5 · pointe 7,8 L/100). Un bouton pleine largeur « Supprimer ce trajet » est affiché en bas.

## V-6.4-04-apres.png
Écran Historique : tuiles « 1 trajet », « 76,8 km », « 11,46 € essence ». Une seule ligne, Toulouse → Albi (19 oct., 76,8 km, Gazole à 2,368 €/L · 5,73 € chacun, 11,46 €). Onglet Historique actif.
Différence avec la capture d'avant : le détail « ALBI → RODEZ » disparaît et le trajet Albi → Rodez n'apparaît plus dans la liste ; il reste un trajet (76,8 km, 11,46 €) ; le total passe de 169 km et 24,41 € à 76,8 km et 11,46 €.

## V1-retraits-01-avant.png
Accueil Trajet : « RENAULT CLIO », « 1.2 · 118 ch · 2017 · SP95-E10 », bouton « Changer », bouton vert « DÉMARRER ». Onglet Trajet actif.

## V1-retraits-02-apres.png
Écran Stations, en-tête « Autour de moi », SP95-E10 sélectionné, mode « Moins cher ». Carte centrée sur Albi avec les pastilles 1,990 ; 2,178 ; 2,182 ; 2,187. Liste : TotalEnergies Albi · Relais des Fo… (2,2 km, prix du 20/10, 1,99⁰), TotalEnergies Marssac-sur-Tarn (9,4 km, 1,99⁰), Intermarché Cagnac-les-Mines (6,8 km, 2,14⁹), Intermarché Le Sequestre (2,3 km, 2,17⁸), Leclerc Albi (3,3 km, 2,17⁸), Carrefour Albi (1,9 km, hier, 2,18²). Onglet Stations actif.
Différence avec la capture d'avant : on passe de l'accueil Trajet à l'écran Stations (carte d'Albi et liste de six stations en SP95-E10).

## V1-retraits-03-avant.png
Page hors application (sans en-tête « PLEIN & TRAJET ») : titre « Table public.moteurs » et tableau à quatre colonnes (service, fournisseur actif, en_service, état). Lignes : prix (officiel, true, ok), moyennes (bulletin-ue, true, ok), itineraire (stadia, true, ok), peages (ptv, false, ok, ligne surlignée en rose), voitures (ademe, true, ok), lieux (photon, true, ok), vehicules (eea-discodata, true, ok). Mention en gris : « Lu le 2026-10-22T06:44:11.120Z par l'API Supabase (rest/v1, rôle service) ; aucune valeur de clé lue ni affichée. »

## V1-retraits-04-apres.png
Page hors application, sans tableau : titre « Service péages, clés et Vault ». Texte : « Ligne peages de public.moteurs : fournisseur ptv, en_service = false » ; « public.cles_fournisseurs : 2 lignes (avant le jalon, relevé r1a 09:45Z : 2) » ; « vault.secrets : 3 secrets, noms : cle_ptv, cle_stadia, sync_prix_secret (avant le jalon : 3) » ; « Inscriptions anonymes : limite 30 par heure ». Mention en gris : « Lu le 2026-10-22T06:44:11.648Z par l'API Supabase (rest/v1 rôle service et API de gestion) ; aucune valeur de clé lue ni affichée. »
Différence avec la capture d'avant : le tableau « Table public.moteurs » est remplacé par un récapitulatif en texte « Service péages, clés et Vault » ; la ligne peages n'est plus un tableau mais une phrase (fournisseur ptv, en_service = false) ; le relevé passe de 06:44:11.120Z à 06:44:11.648Z ; le texte mentionne aussi les clés fournisseurs, le Vault et les inscriptions anonymes, qui ne figurent pas dans le tableau.


Total : 120/120 décrites
