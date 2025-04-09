import { defineConfig } from "vite";

export default defineConfig({
  base: "/html-playable/",
  build: {
    outDir: "dist",
    assetsDir: "assets",
  },
});
