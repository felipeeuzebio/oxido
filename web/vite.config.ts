import { resolve } from "node:path";
import { reactRouter } from "@react-router/dev/vite";
import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
import { CONTENT } from "./app/features/content/content.server.ts";
import { contentReload } from "./app/features/content/content-reload.ts";

const base = `${(process.env.BASE_PATH ?? "").replace(/\/+$/, "")}/`;

// Vitest renders components on their own, without React Router's build plugin.
const plugins = process.env.VITEST
  ? [react()]
  : [
      tailwindcss(),
      // React Compiler (automatic memoization) runs through Babel and must come
      // before React Router's plugin. Everything else is compiled by Oxc.
      babel({ presets: [reactCompilerPreset()] }),
      reactRouter(),
      contentReload(CONTENT),
    ];

export default defineConfig({
  base,
  plugins,
  resolve: { alias: { "@": resolve(import.meta.dirname, "app") } },
  build: {
    // Fonts stay separate files, each loaded only when a page shows a
    // character it covers. Inlined, they would all land in the stylesheet.
    assetsInlineLimit: (file) => (/\.woff2?$/.test(file) ? false : undefined),
  },
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
    // During `bun run dev`, API calls go to a running `oxido serve --dev`.
    proxy: { "/api": { target: "http://127.0.0.1:7878", changeOrigin: true } },
  },
  test: {
    environment: "jsdom",
    // Tests next to the app code and this config. Repository checks run from the root.
    include: ["app/**/*.test.{ts,tsx}", "*.test.ts"],
    setupFiles: ["app/test-setup.ts"],
  },
});
