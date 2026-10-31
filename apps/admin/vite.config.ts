import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import adminHandler from "./server/admin-api.mjs";
import musicApi from "../web/server/music-api.mjs";

export default defineConfig(() => ({
  envDir: path.resolve(__dirname, "../.."),
  server: {
    host: "::",
    port: 8081,
  },
  plugins: [react(), {
    name: "admin-api",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url?.startsWith("/api/admin")) return adminHandler(req, res);
        if (req.url?.startsWith("/api/v1/")) return musicApi(req, res);
        next();
      });
    },
  }],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@guruplay/ui": path.resolve(__dirname, "../../packages/ui/src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("/node_modules/recharts/") || id.includes("/node_modules/victory-vendor/") || id.includes("/node_modules/d3-")) return "charts";
          if (id.includes("/node_modules/@supabase/")) return "supabase";
          if (id.includes("/node_modules/react-dom/") || id.includes("/node_modules/react/") || id.includes("/node_modules/react-router")) return "react";
        },
      },
    },
  },
}));
