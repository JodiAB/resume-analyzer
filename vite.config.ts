import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, type Plugin } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

const ignoreWellKnown: Plugin = {
  name: 'ignore-well-known',
  configureServer({ middlewares }) {
    middlewares.use((req, res, next) => {
      if (req.url?.startsWith('/.well-known/')) { res.statusCode = 404; res.end(); return; }
      next();
    });
  },
};
export default defineConfig({ plugins: [tailwindcss(), reactRouter(), tsconfigPaths(), ignoreWellKnown] });
