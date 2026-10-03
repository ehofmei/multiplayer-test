import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// Each build gets a visible identity, including local/uncommitted builds.
const buildTime =
  new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
const revision = process.env.GITHUB_SHA?.slice(0, 7);
const buildId = `${buildTime}${revision ? ` · ${revision}` : " · local"}`;

export default defineConfig({
  define: { __BUILD_ID__: JSON.stringify(buildId) },
  base: "/multiplayer-test/",
  plugins: [
    react(),
    VitePWA({
      registerType: "prompt",
      includeAssets: ["icon-192.png", "icon-512.png"],
      manifest: {
        name: "P2P Game Lab",
        short_name: "Game Lab",
        description: "A shared grid over local Wi-Fi.",
        start_url: "./",
        scope: "./",
        display: "standalone",
        background_color: "#f5f4ee",
        theme_color: "#122c29",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          {
            src: "icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,png,ico}"],
        navigateFallback: "index.html",
      },
    }),
  ],
  test: { include: ["src/**/*.test.ts"] },
});
