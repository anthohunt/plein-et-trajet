import type { CapacitorConfig } from "@capacitor/cli";

// Appli Android (jalon 6) : le site construit (dist) embarqué dans l'APK ; les appels Supabase restent en ligne.
const config: CapacitorConfig = {
  appId: "org.example.pleinettrajet",
  appName: "Plein & Trajet",
  webDir: "dist",
  android: { allowMixedContent: false },
};

export default config;
