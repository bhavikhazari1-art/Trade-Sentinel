/**
 * Vercel build configuration.
 *
 * This config is intentionally separate from vite.config.ts (which requires
 * Replit-injected PORT and BASE_PATH env vars and loads Replit-specific
 * plugins).  Vercel runs:
 *   pnpm --filter @workspace/trading-journal run build:vercel
 * which points here.
 */
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  // SPA served from the root on Vercel — no sub-path prefix needed.
  base: "/",

  plugins: [
    react(),
    tailwindcss(),
    // No Replit-specific plugins here (runtime-error-modal, cartographer, dev-banner)
  ],

  resolve: {
    alias: {
      // "@" resolves to src/ for all app imports
      "@": path.resolve(import.meta.dirname, "src"),
      // NOTE: the "@assets" alias points to attached_assets/ which is a
      // Replit-only directory.  It is not used in the app source, so it is
      // intentionally omitted here.
    },
    dedupe: ["react", "react-dom"],
  },

  root: path.resolve(import.meta.dirname),

  build: {
    // Vercel picks up the output from this directory (see root vercel.json)
    outDir: path.resolve(import.meta.dirname, "dist"),
    emptyOutDir: true,
    // Reasonable chunk size warning threshold
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        // Split vendor chunks for better long-term caching
        manualChunks: {
          react:    ["react", "react-dom"],
          firebase: ["firebase/app", "firebase/auth", "firebase/firestore", "firebase/storage"],
          recharts: ["recharts"],
        },
      },
    },
  },
});
