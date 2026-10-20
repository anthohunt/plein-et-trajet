import { defineConfig } from "@playwright/test";

// Extraits Playwright du jalon 1, joués contre l'appli déployée (base réelle).
export default defineConfig({
  testDir: "tests/e2e/exploration/m1-test-snippets",
  testMatch: /US-.*\.test\.ts$/,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  workers: 2,
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
