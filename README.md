# Plein & Trajet

Application web et Android qui montre **les prix officiels des carburants autour de vous** et estime **le coût d'un trajet** selon votre voiture (consommation, péages, dénivelé). Elle peut aussi enregistrer vos trajets en arrière-plan sur Android et calculer le coût réel à l'arrivée.

Les prix viennent de données ouvertes (voir `docs/SOURCES-DONNEES.md`) ; l'application ne fait de publicité pour aucune enseigne.

## Ce que contient le dépôt
• `src/` : l'application (React 18, TypeScript, Vite, MapLibre GL pour la carte).
• `android/` : l'enveloppe Android (Capacitor) et le service d'enregistrement de trajet en Java.
• `supabase/` : la base (migrations SQL) et les fonctions serveur (Deno) qui synchronisent les prix, géocodent, calculent péages et itinéraires.
• `api/` : deux petits relais Vercel pour des sources étrangères qui n'acceptent pas les appels directs.
• `scripts/` : déploiement d'une fonction, requête SQL, construction de l'APK.
• `tests/unit/` : 23 fichiers de tests unitaires (Vitest) ; `tests/fixtures/` : jeux de données de test (extraits de données ouvertes, tracés GPX de test).

## Installer et lancer
Prérequis : Node.js 20 ou plus, et un projet [Supabase](https://supabase.com) (offre gratuite suffisante).

1. `npm ci`
2. `cp .env.example .env.local` et renseigner `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`.
3. Base de données : remplacer `VOTRE-REF-PROJET` par la référence de votre projet dans `supabase/migrations/*.sql` (adresses des tâches planifiées), puis appliquer les migrations dans l'ordre (`supabase db push`, ou `node scripts/sql.mjs -f fichier.sql`).
4. Fonctions : `supabase functions deploy <nom>` (ou `node scripts/deploy-fn.mjs <nom>`), puis `supabase secrets set SYNC_SECRET=...` et le même secret dans Vault sous le nom `sync_prix_secret` (la première synchronisation des prix se lance alors toute seule toutes les 10 minutes).
5. `npm run dev` pour développer, `npm run build` pour produire `dist/`. Hébergement du site : n'importe quel hébergeur statique (`vercel.json` donne un exemple d'en-têtes de sécurité).
6. Optionnel, relais étrangers : déployer `api/` sur Vercel et définir `RELAIS_BASE_URL` côté fonctions.
7. Optionnel, Android : `scripts/build-apk.sh` (JDK 21, SDK Android, **votre** magasin de clés ; voir `.env.example`). L'identifiant de l'application est `org.example.pleinettrajet` : changez-le (et le dossier Java) avant toute publication.

## Tester
`npm test` lance les tests unitaires. Certains appellent le géocodeur public de l'IGN (accès Internet nécessaire).
Les anciens tests de bout en bout (navigateur et émulateur Android) ne sont pas fournis : ils jouaient contre un déploiement réel.

## Limites connues
• Les tests de bout en bout et la chaîne de construction continue ne sont pas inclus.
• La position par défaut (sans GPS ni ville mémorisée) est le centre de Paris.
• Les péages demandent une clé chez un fournisseur (PTV ou HERE) ; sans clé, le coût des péages n'est pas estimé.

## Licences
Code : Apache 2.0 (`LICENSE`, `NOTICE`). Textes et documentation : CC BY 4.0 (`LICENSE-docs`). Données : voir `docs/SOURCES-DONNEES.md` ; la mention « © contributeurs OpenStreetMap » reste affichée sur la carte.
