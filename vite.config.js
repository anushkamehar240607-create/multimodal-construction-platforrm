import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Allows JSX syntax inside plain .js files.
export default defineConfig({
  plugins: [react({ include: /\.(js|jsx)$/ })],
  esbuild: { loader: "jsx", include: /src\/.*\.js$/, exclude: [] },
  optimizeDeps: { esbuildOptions: { loader: { ".js": "jsx" } } },
  server: { port: 5173 },
});
