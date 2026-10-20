// Métadonnées de test (documentation, non exécutable)
module.exports = {
 "id": "FT-006",
 "title": "Moteurs : fournisseurs, clés, test, bascule",
 "testMode": "browser",
 "screen": "S5",
 "userStories": [
  "US-5.1",
  "US-5.2",
  "US-5.3",
  "US-5.4",
  "US-5.5",
  "US-5.E1",
  "US-5.E2",
  "US-5.E3"
 ],
 "acceptanceCriteria": {
  "US-5.1": [
   "ÉTANT DONNÉ je suis connecté comme administrateur, QUAND je touche le bouton moteurs ⚙, ALORS l'écran Moteurs liste les 6 services avec leur fournisseur et leur état"
  ],
  "US-5.2": [
   "ÉTANT DONNÉ l'écran Moteurs, QUAND je choisis HERE au lieu de PTV pour les péages dans le choix du fournisseur, ALORS l'état passe à « Clé à coller » si HERE demande une clé, sinon « Prêt · sans clé »"
  ],
  "US-5.3": [
   "ÉTANT DONNÉ le champ clé des péages, QUAND je colle une clé et j'enregistre, ALORS la clé est stockée chiffrée côté serveur et le champ n'affiche plus que ses 4 derniers caractères",
   "ÉTANT DONNÉ une clé enregistrée, QUAND je recharge l'écran, ALORS la clé complète n'apparaît nulle part, ni dans la page ni dans les réponses réseau"
  ],
  "US-5.4": [
   "ÉTANT DONNÉ une clé PTV valide collée, QUAND je touche Tester la connexion, ALORS un vrai calcul de test est envoyé à PTV et l'état affiche « Connecté »"
  ],
  "US-5.5": [
   "ÉTANT DONNÉ le moteur péages basculé sur HERE et enregistré, QUAND je calcule Albi → Barcelone, ALORS les péages viennent de HERE sans redéploiement de l'appli"
  ],
  "US-5.E1": [
   "ÉTANT DONNÉ un appareil non administrateur, QUAND l'appli s'ouvre, ALORS le bouton moteurs n'est pas affiché et toute lecture ou écriture de la table des moteurs est refusée par le serveur"
  ],
  "US-5.E2": [
   "ÉTANT DONNÉ une clé invalide collée, QUAND je touche Tester la connexion, ALORS l'état affiche « Clé refusée par PTV (401) » et Enregistrer garde l'ancien fournisseur actif"
  ],
  "US-5.E3": [
   "ÉTANT DONNÉ PTV en panne et HERE enregistré en secours, QUAND je calcule un trajet, ALORS les péages viennent de HERE et l'écran Moteurs note la bascule avec l'heure"
  ]
 }
};
