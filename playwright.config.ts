import { defineConfig } from "@playwright/test";

// Specs consolidées des jalons 1, 2 et 3 et extraits du jalon 4, joués contre l'appli déployée (base réelle).
export default defineConfig({
  testDir: "tests/e2e",
  globalSetup: "./tests/e2e/exploration/m3-global.mjs", // lit les vraies clés en mémoire et les restaure après les tests
  // jalons 1-3 : specs consolidées ; jalon 4 : extraits de exploration/m4-test-snippets/ (trajet GPX rejoué en temps réel)
  testMatch: [/m[123]-explore\.spec\.ts$/, /exploration\/m4-test-snippets\/US-[^/]+\.test\.ts$/],
  timeout: 60_000,
  expect: { timeout: 15_000 },
  workers: 1, // jalon 3 : les histoires qui modifient la table moteurs ne tournent jamais en parallèle d'un calcul de trajet
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
