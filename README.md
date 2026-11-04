**English** · [Français](README.fr.md)

# Plein & Trajet

Web and Android application that shows **official fuel prices around you** and estimates **the cost of a trip** for your car (consumption, tolls, elevation). It can also record your trips in the background on Android and work out the real cost on arrival.

Prices come from open data (see `docs/SOURCES-DONNEES.md`); the application advertises no brand. The interface is in French.

## What is in the repository
- `src/`: the application (React 18, TypeScript, Vite, MapLibre GL for the map).
- `android/`: the Android wrapper (Capacitor) and the trip recording service in Java.
- `supabase/`: the database (SQL migrations) and the server functions (Deno) that sync prices, geocode, and compute tolls and routes.
- `api/`: two small Vercel relays for foreign sources that do not accept direct calls.
- `scripts/`: function deployment, SQL query, APK build.
- `tests/unit/`: 23 unit test files (Vitest); `tests/fixtures/`: test data sets (open data extracts, test GPX tracks).

## Install and run
Requirements: Node.js 20 or later, and a [Supabase](https://supabase.com) project (the free tier is enough).

1. `npm ci`
2. `cp .env.example .env.local` and fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
3. Database: replace `VOTRE-REF-PROJET` with your project reference in `supabase/migrations/*.sql` (addresses of the scheduled tasks), then apply the migrations in order (`supabase db push`, or `node scripts/sql.mjs -f file.sql`).
4. Functions: `supabase functions deploy <name>` (or `node scripts/deploy-fn.mjs <name>`), then `supabase secrets set SYNC_SECRET=...` and the same secret in Vault under the name `sync_prix_secret` (the first price sync then starts on its own, every 10 minutes).
5. `npm run dev` for development, `npm run build` to produce `dist/`. Site hosting: any static host (`vercel.json` gives an example of security headers).
6. Optional, foreign relays: deploy `api/` on Vercel and set `RELAIS_BASE_URL` on the functions side.
7. Optional, Android: `scripts/build-apk.sh` (JDK 21, Android SDK, **your** keystore; see `.env.example`). The application identifier is `org.example.pleinettrajet`: change it (and the Java folder) before any release.

## Tests
`npm test` runs the unit tests. Some of them call IGN's public geocoder (Internet access required).
The former end-to-end tests (browser and Android emulator) are not provided: they ran against a real deployment.

## Known limits
- End-to-end tests and the continuous build chain are not included.
- The default position (no GPS or remembered city) is the centre of Paris.
- Tolls require a key from a provider (PTV or HERE); without a key, toll costs are not estimated.

## Licenses
Code: Apache 2.0 (`LICENSE`, `NOTICE`). Text and documentation: CC BY 4.0 (`LICENSE-docs`). Data: see `docs/SOURCES-DONNEES.md`; the "© OpenStreetMap contributors" credit stays displayed on the map.
