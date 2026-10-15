import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import { execSync } from "node:child_process";

// Build-Version: wird fest in die App geschrieben (Seitenleiste → Version)
const git = (args: string) => {
  try { return execSync(`git ${args}`, { stdio: ["ignore", "pipe", "ignore"] }).toString().trim(); } catch { return ""; }
};
const commit = git("rev-parse --short HEAD") || "dev";
const dirty = git("status --porcelain") !== "";
const builtAt = new Date().toISOString();
// Eine Build-ID für Bundle UND version.json (gleiche Quelle → vergleichbar)
const APP_VERSION = {
  buildId: `${commit}${dirty ? "-dirty" : ""}-${builtAt.replace(/\D/g, "").slice(0, 14)}`,
  version: process.env.npm_package_version ?? "0.0.0",
  commit,
  dirty,
  builtAt,
};

/** Schreibt dist/version.json mit denselben Werten wie __APP_VERSION__ (nur beim Build) */
const versionFile = (): Plugin => ({
  name: "flagos-version-file",
  apply: "build",
  generateBundle() {
    this.emitFile({ type: "asset", fileName: "version.json", source: JSON.stringify(APP_VERSION, null, 2) + "\n" });
  },
});

export default defineConfig({
  define: { __APP_VERSION__: JSON.stringify(APP_VERSION) },
  plugins: [
    react(),
    tailwindcss(),
    versionFile(),
    VitePWA({
      registerType: "prompt", // „Update verfügbar“ statt stillem Neuladen (src/lib/pwaUpdate.ts)
      useCredentials: true, // Manifest mit Zugangsdaten laden – nötig hinter dem Passwortschutz
      includeAssets: ["favicon.ico", "favicon.svg", "apple-touch-icon.png", "icons/*"],
      manifest: {
        id: "/",
        name: "FlagOS Competition",
        short_name: "Competition",
        description: "Turnier und Spieltag im Flag Football: Spielplan, Ergebnisse, Tabellen und Public Display.",
        lang: "de",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "any",
        background_color: "#06111F",
        theme_color: "#C6FF00",
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "/icons/icon-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
          { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
          { src: "/icons/icon-monochrome-512.png", sizes: "512x512", type: "image/png", purpose: "monochrome" },
        ],
      },
      workbox: {
        // Nur die App-Hülle im Cache. Daten kommen immer frisch von Supabase (kein Offline-Stand für Ergebnisse).
        globPatterns: ["**/*.{js,css,html,svg,png,ico,woff,woff2}"],
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [
          /^\/\.well-known(\/|$)/,
          /^\/assets(\/|$)/,
          /^\/(sw\.js|registerSW\.js|manifest\.webmanifest|version\.json)$/,
        ],
        cleanupOutdatedCaches: true,
      },
      devOptions: { enabled: false },
    }),
  ],
  // 5173 = Competition, 5174 = Broadcast, 5175 = Stadium
  server: { host: true, port: 5173 },
  preview: { port: 5173 },
});
