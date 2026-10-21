import { defineConfig } from "@playwright/test";

// Captures avant/après de la passe streamline (hors suite) : PHASE=avant|apres, APP_URL=appli locale ou déployée.
export default defineConfig({
  testDir: ".",
  testMatch: [/captures(-r2)?\.spec\.ts$/],
  timeout: 120_000,
  expect: { timeout: 15_000 },
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: process.env.APP_URL ?? "https://plein-et-trajet.vercel.app",
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    locale: "fr-FR",
    timezoneId: "Europe/Paris",
    geolocation: { latitude: 43.9289, longitude: 2.1464 },
    permissions: ["geolocation"],
  },
});
