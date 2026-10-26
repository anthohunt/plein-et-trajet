/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1200,
  },
  test: {
    include: ["tests/unit/**/*.test.ts"],
    environment: "node",
    // valeurs factices : les tests unitaires n'appellent jamais la base
    env: { VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL ?? "https://exemple.supabase.co", VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY ?? "cle-factice" },
  },
});
