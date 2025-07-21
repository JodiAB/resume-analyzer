import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tailwindcss(), reactRouter(), tsconfigPaths()],
  server: {
    // Remove middlewareMode and middleware array
    // Use configureServer to add middleware
    configureServer: ({ middlewares }) => {
      middlewares.use((req, res, next) => {
        // Ignore requests to /.well-known/*
        if (req.url?.startsWith("/.well-known/")) {
          res.statusCode = 404;
          res.end();
          return;
        }
        next();
      });
    },
  },
});