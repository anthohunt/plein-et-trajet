// Métadonnées de test (documentation, non exécutable)
module.exports = {
 "id": "FT-005",
 "title": "Accessibilité et performance",
 "testMode": "browser",
 "screen": null,
 "userStories": [
  "US-A11Y-001",
  "US-A11Y-002",
  "US-A11Y-003",
  "US-A11Y-004",
  "US-PERF-001"
 ],
 "acceptanceCriteria": {
  "US-A11Y-001": [
   "ÉTANT DONNÉ n'importe quel écran, QUAND j'utilise Tab et Maj+Tab, ALORS chaque contrôle reçoit le focus dans l'ordre de lecture avec un contour visible"
  ],
  "US-A11Y-002": [
   "ÉTANT DONNÉ une fiche station ouverte au clavier, QUAND elle s'ouvre, ALORS le focus va sur son titre ; à la fermeture il revient sur l'élément qui l'a ouverte"
  ],
  "US-A11Y-003": [
   "ÉTANT DONNÉ la fiche station ou un tronçon déplié, QUAND j'appuie sur Échap, ALORS la fiche se ferme"
  ],
  "US-A11Y-004": [
   "ÉTANT DONNÉ un lecteur d'écran actif, QUAND je parcours les pastilles et les prix, ALORS chaque pastille annonce station et prix en euros, chaque bouton icône a un libellé"
  ],
  "US-PERF-001": [
   "ÉTANT DONNÉ une connexion 4G, QUAND j'ouvre l'appli, ALORS la liste des stations est affichée en moins de 2,5 s"
  ]
 }
};
