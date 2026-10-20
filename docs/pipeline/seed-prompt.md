# Seed prompt — maquette

Appli web en français, mobile d'abord, deux onglets en bas : **Prix** et **Trajets**.

Écran Prix : en haut un sélecteur de carburant (Gazole, SP95-E10, SP95, SP98, E85, GPLc) ; une carte des stations autour de l'utilisateur, chaque station portant son prix ; sous la carte, la liste des stations triée par prix (nom, enseigne, distance, prix au litre à trois décimales, ancienneté de la mise à jour). Toucher une station (sur la carte ou dans la liste) ouvre sa fiche : adresse, tous les carburants avec leur prix, heure de mise à jour, services.

Écran Trajets : un formulaire départ / arrivée, la voiture choisie par marque → modèle → motorisation (mémorisée), bouton Calculer. Résultat : coût estimé en euros (chiffre héros), litres, distance, consommation moyenne en L/100 km ; la décomposition par tronçon (autoroute, route, ville, montées) avec la distance, la vitesse typique et les litres de chacun ; le prix au litre utilisé (moyenne nationale du jour du carburant de la voiture) avec un bouton pour saisir son propre prix, qui recalcule. Sous le formulaire, l'historique des derniers trajets ; toucher une ligne la recalcule au prix du jour ; on peut supprimer une ligne.

Direction visuelle : le monde de la station-service française — totems de prix à chiffres lumineux, signalétique routière. Les prix sont l'information centrale et doivent se lire d'un coup d'œil, avec le troisième décimal plus petit comme sur les totems. Données d'exemple réalistes autour d'Albi (Tarn).
