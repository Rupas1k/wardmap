import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, "index.html"),
        elevationEditor: resolve(import.meta.dirname, "elevation-editor.html"),
      },
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/ol/")) {
            return "openlayers";
          }
          if (id.includes("node_modules/@turf/") || id.includes("visibility-polygon")) {
            return "geometry";
          }

          return undefined;
        },
      },
    },
  },
  server: {
    strictPort: true,
  },
});
