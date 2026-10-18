import { fileURLToPath, URL } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import wasm from "vite-plugin-wasm";

export default defineConfig({
  // Rapier's standard build imports its .wasm as an ES module (and awaits it at the top level,
  // which Vite's default browser targets support natively).
  plugins: [wasm(), react()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    // Tests run Rapier through rapier3d-compat (same version and wasm as the game's rapier3d, but
    // loadable in Node). Its package.json says "type": "module" yet points `main` at a CommonJS
    // file, so point straight at its self-contained ES build.
    alias: {
      "@dimforge/rapier3d-compat": fileURLToPath(
        new URL("./node_modules/@dimforge/rapier3d-compat/rapier.es.js", import.meta.url),
      ),
    },
  },
});
