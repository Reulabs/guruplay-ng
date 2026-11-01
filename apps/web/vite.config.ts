import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import musicApi from "./server/music-api.mjs";
import "../../packages/common/server/env.mjs";

export default defineConfig(() => ({
  envDir: path.resolve(__dirname, "../.."),
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), {
    name: "music-api",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
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
