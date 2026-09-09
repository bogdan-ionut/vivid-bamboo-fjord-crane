import { resolve } from "node:path";
import tailwindcss from "@tailwindcss/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  root: resolve(import.meta.dirname, "pages"),
  base: "./",
  publicDir: resolve(import.meta.dirname, "public"),
  resolve: {
    alias: {
      "@": resolve(import.meta.dirname, "src"),
    },
  },
  plugins: [tailwindcss(), viteReact()],
  build: {
    outDir: resolve(import.meta.dirname, "dist-pages"),
    emptyOutDir: true,
  },
  preview: {
    host: "127.0.0.1",
    port: 8082,
    strictPort: true,
  },
});
