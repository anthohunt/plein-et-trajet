// Moteurs : fournisseurs, clés, test, bascule — script Playwright. Sélecteurs à confirmer en explorant l'appli déployée (explore-first).
module.exports = async function(page) {
  const results = [];
  const base = process.env.APP_URL;
  await page.goto(base);
  // US-5.1 AC-1 : ÉTANT DONNÉ je suis connecté comme administrateur, QUAND je touche le bouton moteurs ⚙, ALORS l'écran Moteurs liste les 6 services avec leur fournisseur et leur état
  results.push({ id: 'US-5.1-AC-1', criterion: "ÉTANT DONNÉ je suis connecté comme administrateur, QUAND je touche le bouton moteurs ⚙, ALORS l'écran Moteurs liste les 6 services avec leur fournisseur et leur état", status: 'todo', detail: 'à écrire après exploration de l’appli déployée', duration: 0 });
  // US-5.2 AC-1 : ÉTANT DONNÉ l'écran Moteurs, QUAND je choisis HERE au lieu de PTV pour les péages dans le choix du fournisseur, ALORS l'état passe à « Clé à coller » si HERE demande une clé, sinon « Prêt · sans clé »
  results.push({ id: 'US-5.2-AC-1', criterion: "ÉTANT DONNÉ l'écran Moteurs, QUAND je choisis HERE au lieu de PTV pour les péages dans le choix du fournisseur, ALORS l'état passe à « Clé à coller » si HERE demande une clé, sinon « Prêt · sans clé »", status: 'todo', detail: 'à écrire après exploration de l’appli déployée', duration: 0 });
  // US-5.3 AC-1 : ÉTANT DONNÉ le champ clé des péages, QUAND je colle une clé et j'enregistre, ALORS la clé est stockée chiffrée côté serveur et le champ n'affiche plus que ses 4 derniers caractères
  results.push({ id: 'US-5.3-AC-1', criterion: "ÉTANT DONNÉ le champ clé des péages, QUAND je colle une clé et j'enregistre, ALORS la clé est stockée chiffrée côté serveur et le champ n'affiche plus que ses 4 derniers caractères", status: 'todo', detail: 'à écrire après exploration de l’appli déployée', duration: 0 });
  // US-5.3 AC-2 : ÉTANT DONNÉ une clé enregistrée, QUAND je recharge l'écran, ALORS la clé complète n'apparaît nulle part, ni dans la page ni dans les réponses réseau
  results.push({ id: 'US-5.3-AC-2', criterion: "ÉTANT DONNÉ une clé enregistrée, QUAND je recharge l'écran, ALORS la clé complète n'apparaît nulle part, ni dans la page ni dans les réponses réseau", status: 'todo', detail: 'à écrire après exploration de l’appli déployée', duration: 0 });
  // US-5.4 AC-1 : ÉTANT DONNÉ une clé PTV valide collée, QUAND je touche Tester la connexion, ALORS un vrai calcul de test est envoyé à PTV et l'état affiche « Connecté »
  results.push({ id: 'US-5.4-AC-1', criterion: "ÉTANT DONNÉ une clé PTV valide collée, QUAND je touche Tester la connexion, ALORS un vrai calcul de test est envoyé à PTV et l'état affiche « Connecté »", status: 'todo', detail: 'à écrire après exploration de l’appli déployée', duration: 0 });
  // US-5.5 AC-1 : ÉTANT DONNÉ le moteur péages basculé sur HERE et enregistré, QUAND je calcule Albi → Barcelone, ALORS les péages viennent de HERE sans redéploiement de l'appli
  results.push({ id: 'US-5.5-AC-1', criterion: "ÉTANT DONNÉ le moteur péages basculé sur HERE et enregistré, QUAND je calcule Albi → Barcelone, ALORS les péages viennent de HERE sans redéploiement de l'appli", status: 'todo', detail: 'à écrire après exploration de l’appli déployée', duration: 0 });
  // US-5.E1 AC-1 : ÉTANT DONNÉ un appareil non administrateur, QUAND l'appli s'ouvre, ALORS le bouton moteurs n'est pas affiché et toute lecture ou écriture de la table des moteurs est refusée par le serveur
  results.push({ id: 'US-5.E1-AC-1', criterion: "ÉTANT DONNÉ un appareil non administrateur, QUAND l'appli s'ouvre, ALORS le bouton moteurs n'est pas affiché et toute lecture ou écriture de la table des moteurs est refusée par le serveur", status: 'todo', detail: 'à écrire après exploration de l’appli déployée', duration: 0 });
  // US-5.E2 AC-1 : ÉTANT DONNÉ une clé invalide collée, QUAND je touche Tester la connexion, ALORS l'état affiche « Clé refusée par PTV (401) » et Enregistrer garde l'ancien fournisseur actif
  results.push({ id: 'US-5.E2-AC-1', criterion: "ÉTANT DONNÉ une clé invalide collée, QUAND je touche Tester la connexion, ALORS l'état affiche « Clé refusée par PTV (401) » et Enregistrer garde l'ancien fournisseur actif", status: 'todo', detail: 'à écrire après exploration de l’appli déployée', duration: 0 });
  // US-5.E3 AC-1 : ÉTANT DONNÉ PTV en panne et HERE enregistré en secours, QUAND je calcule un trajet, ALORS les péages viennent de HERE et l'écran Moteurs note la bascule avec l'heure
  results.push({ id: 'US-5.E3-AC-1', criterion: "ÉTANT DONNÉ PTV en panne et HERE enregistré en secours, QUAND je calcule un trajet, ALORS les péages viennent de HERE et l'écran Moteurs note la bascule avec l'heure", status: 'todo', detail: 'à écrire après exploration de l’appli déployée', duration: 0 });
  return results;
};
