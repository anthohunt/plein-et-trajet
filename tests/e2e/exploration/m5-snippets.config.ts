// Config ad hoc pour rejouer les extraits du jalon 5 contre la prod : npx playwright test --config tests/e2e/exploration/m5-snippets.config.ts
import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./m5-test-snippets",
  testMatch: /.*\.test\.ts$/, timeout: 240_000, expect: { timeout: 15_000 }, workers: 1, reporter: [["list"]],
  use: { baseURL: "https://plein-et-trajet.vercel.app", viewport: { width: 390, height: 844 }, hasTouch: true, locale: "fr-FR", timezoneId: "Europe/Paris", geolocation: { latitude: 43.92833, longitude: 2.145916 }, permissions: ["geolocation"] },
});
