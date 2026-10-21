import { defineConfig } from "@playwright/test";

// Specs jouées contre l'appli déployée (base réelle). Jalon 5 (V1) : m2, m3, m4 archivées dans tests/e2e/archive/ (histoires retirées ou
// remplacées) ; m1 (écran Prix devenu T5 Stations) est adapté aux routes V1 (sa version d'origine est archivée) ;
// m5-regression rejoue les histoires maintenue_v1 de T1, T3, T4, T6 ; m5-explore consolide les extraits du jalon 5 (V-1.1 à V-6.4,
// V1-retraits ; 4 min par test, réglé dans la spec). tests/e2e/archive/ n'est jamais joué.
// Plus de globalSetup : celui du jalon 3 lisait et restaurait les clés de Vault, la V1 n'y touche pas.
export default defineConfig({
  testDir: "tests/e2e",
  testMatch: [/m1-explore\.spec\.ts$/, /m5-.*\.spec\.ts$/],
  testIgnore: ["**/archive/**"],
  timeout: 60_000,
  expect: { timeout: 15_000 },
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: process.env.APP_URL ?? "https://plein-et-trajet.vercel.app",
    viewport: { width: 390, height: 844 },
    locale: "fr-FR",
    timezoneId: "Europe/Paris",
    geolocation: { latitude: 43.9289, longitude: 2.1464 },
    permissions: ["geolocation"],
  },
});
