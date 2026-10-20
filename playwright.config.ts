import { defineConfig } from "@playwright/test";

// Specs consolidées des jalons 1 et 2 et extraits du jalon 3 (un fichier par histoire), joués contre l'appli déployée (base réelle).
export default defineConfig({
  testDir: "tests/e2e",
  globalSetup: "./tests/e2e/exploration/m3-global.mjs", // lit les vraies clés en mémoire et les restaure après les tests
  testMatch: /(m[12]-explore\.spec|m3-test-snippets\/US-[^/]+\.test)\.ts$/,
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
