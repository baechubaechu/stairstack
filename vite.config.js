import { fileURLToPath, URL } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import wasm from "vite-plugin-wasm";

// The itch.io copy (`npm run build:itch`, mode "itch") is English only: the page's language, title
// and description are swapped to English along with the game's text (see i18n.js).
const ITCH_TITLE = "STAIRSTACK — Stack it, climb it, outlast the lava";
const ITCH_DESCRIPTION =
  "Drop building materials from a crane with a failing brake, and build the way up for a worker trapped above the rising lava. A browser game, open beta.";
const englishPage = {
  name: "stairstack-english-page",
  transformIndexHtml: (html) =>
    html
      .replace('<html lang="ko">', '<html lang="en">')
      .replace(/<title>[^<]*<\/title>/, `<title>${ITCH_TITLE}</title>`)
      .replace(/(name="description"\s+content=")[^"]*"/, `$1${ITCH_DESCRIPTION}"`)
      .replace(/(property="og:title" content=")[^"]*"/, `$1${ITCH_TITLE}"`)
      .replace(/(property="og:description" content=")[^"]*"/, `$1${ITCH_DESCRIPTION}"`),
};

export default defineConfig(({ mode }) => ({
  // Rapier's standard build imports its .wasm as an ES module (and awaits it at the top level,
  // which Vite's default browser targets support natively).
  plugins: [wasm(), react(), ...(mode === "itch" ? [englishPage] : [])],
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
}));
