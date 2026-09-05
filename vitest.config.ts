import { defineConfig } from "vitest/config";
import { fileURLToPath } from "url";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "!src/**/*.integration.test.ts"],
    coverage: {
      reporter: ["text", "html"],
    },
  },
  esbuild: {
    // Keep JSX/TSX support if any component is later imported into tests.
    jsx: "automatic",
  },
});