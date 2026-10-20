**Jalon 1 « Les prix autour de moi » construit, contrôlé et en ligne.**

- Appli en ligne : **https://plein-et-trajet.vercel.app**, avec les vrais prix officiels (**9 815 stations**, mises à jour toutes les 10 min)

- Les deux lancements précédents s'étaient coupés à la connexion sans rien faire : **tout a été repris de zéro**, base de données et hébergement compris

- Contrôle qualité : **refusé deux fois, accepté au troisième tour**. Les défauts trouvés portaient surtout sur des captures qui ne prouvaient pas leur étape, et sur la navigation au clavier

- Tests automatiques : **24 tests unitaires et 25 parcours sur l'appli en ligne, tous au vert**. Seules deux pannes (source injoignable, aucune station E85) sont simulées

- Rapport de livraison avec **55 captures encadrées en rouge**, une boîte de commentaire par étape : à relire (docs/delivery/m1-delivery-report.html)

- Reste un défaut moyen : après avoir glissé la carte, **deux pastilles hors écran restent parfois atteignables au clavier** pendant quelques secondes

- La feuille de route compte **3 jalons**, pas 2 : le prochain lancement fait le jalon 2 « Le coût d'un trajet »
