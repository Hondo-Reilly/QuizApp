import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import electron from "vite-plugin-electron/simple";
import path from "node:path";

const web = process.env.QUIZAPP_WEB === "1";

export default defineConfig({
  base: web ? "/QuizApp/" : "/",
  plugins: [
    react(),
    ...(web
      ? []
      : [
          electron({
            main: {
              entry: "electron/main.ts",
            },
            preload: {
              input: path.join(__dirname, "electron/preload.ts"),
            },
            renderer: {},
          }),
        ]),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@shared": path.resolve(__dirname, "shared"),
    },
  },
  build: {
    outDir: "dist",
    rollupOptions: {
      input: web
        ? { main: path.resolve(__dirname, "index.html") }
        : {
            main: path.resolve(__dirname, "index.html"),
            mobile: path.resolve(__dirname, "mobile.html"),
          },
    },
  },
});
