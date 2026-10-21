import { defineConfig } from "@playwright/test";

// Specs jouées contre l'appli déployée (base réelle). Jalon 5 (V1) : m2, m3, m4 archivées dans tests/e2e/archive/ (histoires retirées ou
// remplacées) ; m1 (écran Prix devenu T5 Stations) reste à adapter aux routes V1 ; les specs m5 rejouent T1-T6.
// Plus de globalSetup : celui du jalon 3 lisait et restaurait les clés de Vault, la V1 n'y touche pas.
export default defineConfig({
  testDir: "tests/e2e",
  testMatch: [/m1-explore\.spec\.ts$/, /m5-.*\.spec\.ts$/],
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
