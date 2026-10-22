# Paquet de livraison — Plein & Trajet (V1, 22/10/2026)

Appli : https://plein-et-trajet.vercel.app (commit 116357c) · APK Android : https://projets.ingevision.cloud/plein-et-trajet/plein-et-trajet.apk (run CI 39710484157, commit 71f19b3 — sans les correctifs du durcissement, CI bloquée par la facturation GitHub).

## Pour un lecteur humain
• `user-journey-walkthrough.html` — le parcours illustré, autonome (captures embarquées, 16,5 Mo) : 6 jalons, 63 histoires, 231 étapes ; 207 captures de la passe finale, 14 captures Android de la CI du jalon 6 (signalées sous l'image), 10 étapes de l'écran Moteurs non rejouées (écriture de clés de production interdite, signalées).
• `screenshots/` — les 221 captures embarquées (207 de `tests/e2e/final/` + 14 Android).
• `m1..m6-delivery-report.html` — rapports de chaque jalon, au moment du build.

## Pour un agent
• `docs/pipeline/spec-final.md` — ce que l'appli fait (vérité).
• `docs/pipeline/reconciliation-report.md` — prévu contre livré : 40 inchangées, 18 modifiées, 4 nouvelles, 39 retirées.
• `docs/pipeline/decisions-log.md` — pourquoi c'est construit ainsi.
• `docs/pipeline/project-memory.md` — résumé de l'état.
• `tests/e2e/use-cases/m1..m6-use-case.md` — plans de cas d'usage alignés sur la V1.

## Preuves
• `docs/pipeline/final-verification.md` — passe finale (Playwright 102/103 sur la prod, l'échec unique transitoire rejoué 5/5) ; `tests/e2e/final/` (captures + `screenshot-manifest.md`).
• `docs/pipeline/final-audit.md` — audit indépendant : **4/5, PASS**.
• Graphe de connaissances : **non produit** (graphify absent du serveur ; facultatif).

## Ce qui a été écarté
• Estimation d'un trajet avant de partir et péages / vignettes : sortis de la V1 par décision d'Anthony du 21/10 (« on va rester à ça pour une version 1 ») ; code et clés gardés, rien n'est effacé.
• Écran Moteurs : hors navigation, joignable à /admin et /moteurs.
• Durcissement : P2 différés D12-D14, D16-D22 ; 23 P3 acceptés (`docs/pipeline/hardening-r1-consolidated.md`).

## Reste à faire hors pipeline
• Régler la facturation GitHub, reconstruire l'APK (correctifs du durcissement), corriger l'écart de distance de la notification après relance du service.
• Trancher : libellé « Clio IV / TCe 120 », fond de carte OpenFreeMap.
• Essai réel sur le OnePlus : installation par le lien, 30 min écran éteint avec Waze, tunnel, notification ; carte (WebGL2) sur le téléphone.
• Capture V-4.4-04 (plafond à 9 personnes) à refaire : seul trou de preuve visuelle relevé par l'audit.
