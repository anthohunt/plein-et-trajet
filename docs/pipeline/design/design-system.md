# Système de design — Prix carburant & coût de trajet

**Direction** : le monde de la station-service française. Les prix s'affichent sur des **plaques de totem** (panneau sombre, chiffres lumineux verts, troisième décimale plus petite et surélevée, comme sur les totems réels). Tout le reste est sobre, sur fond béton clair (ou asphalte en thème sombre).

- **Accent unique** : vert LED, réservé aux chiffres de prix et au coût du trajet. Jamais sur un bouton ni un titre.
- **Sémantique** : vert = prix bas, orange brûlé = prix haut (pastilles de la carte, écart à la moyenne).
- **Typo** : Big Shoulders Display (titres, style signalétique condensée) · Barlow (texte) · Chivo Mono (tous les chiffres, alignés).
- **Composants** : TotemPrix, SelecteurCarburant (puces), CarteStations, LigneStation, FicheStation (feuille montante), ChampLieu, ChoixVoiture (marque → modèle → motorisation), BoutonPrincipal, Tronçon (dépliable), LigneHistorique, BarreOnglets.
- **Mouvement** : un seul moment — les chiffres des totems défilent quand le carburant change ou qu'un coût est recalculé. Coupé si l'utilisateur réduit les animations.
- Tokens : `tokens.json`.
