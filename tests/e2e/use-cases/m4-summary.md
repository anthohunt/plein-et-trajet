# Milestone 4 Summary

## Known Limitations
- Aucun trajet réellement roulé : le trajet montré (Albi → Toulouse, 77 km, 72 min) est un tracé GPX fabriqué à partir d'un vrai itinéraire routier, rejoué en temps réel sur la prod. GPS bruité, vrais tunnels, téléphone en veille et onglet en arrière-plan n'ont pas été testés.
- Verrou d'écran : vérifié dans Chromium avec la permission accordée par le banc de test, jamais sur un vrai téléphone. Le message de repli est testé à part.
- Pendant le trajet, les litres et le coût en direct ne comptent pas les montées ; l'écran le dit, et le résultat final les ajoute (montée tirée de l'altitude depuis le correctif post-audit : Albi → Toulouse 4,84 L, 12,15 €).
- L'estimation d'un trajet européen (jalon 3) compte encore la montée par la méthode Valhalla surestimée (« Montée 111 km » sur Albi → Londres) : même biais que celui corrigé pour les trajets enregistrés, non corrigé ici.
- Royaume-Uni : le service officiel Fuel Finder n'est pas branché (API réservée aux comptes GOV.UK One Login, fichier public chiffré côté navigateur). Source utilisée : les flux ouverts de 4 distributeurs (Asda, Esso, Motor Fuel Group, SGN Retail), environ 2 300 stations sur à peu près 8 000. Couvrir tout le pays est une décision qui revient à Anthony.
- Le prix E10 britannique est aussi affiché comme SP95 (héritage du jalon 3).
- Péages britanniques : seul Dartford est au montant officiel (3,50 £ sans TVA) ; Silvertown Tunnel n'est pas tarifé ; la TVA des autres péages tarifés par PTV n'est pas vérifiée. Ferry et navette sous la Manche ne sont comptés ni en km, ni en carburant, ni en péage, et l'écran le dit.
- Une pause de plus de 3 minutes vide la courbe du direct, qui repart à la reprise ; un tronçon de quelques dizaines de mètres peut apparaître dans la liste des tronçons.
- Captures prises avant les correctifs post-audit : US-6.E3-02 montre encore le bouton « Enregistrer en roulant » actif à côté du bandeau de reprise (il est désormais désactivé, avec un message, vérifié en prod) ; les litres des captures US-6.5 sont ceux d'avant le calcul de la montée par l'altitude (5,3 L / 13,03 € au lieu de 4,84 L / 12,15 €).
- Test M1 US-1.E4 toujours rouge : aucune rupture réelle de gazole dans le rayon autour d'Albi (la seule est à Réalmont, environ 17 km). Les 2 tests HERE restent ignorés faute de clé.
- Plan gratuit PTV réservé aux tests (environ 500 appels par jour) : décision du plan payant toujours en attente.

## What's Next
- Feuille de route terminée : les 4 jalons sont construits. Étape suivante de la pipeline : durcissement qualité (performance, stabilité, accessibilité, sécurité).
