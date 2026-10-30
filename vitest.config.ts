import { fileURLToPath, URL } from "node:url";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    include: ["src/**/*.test.ts"],
    // Rules tests need the Firestore emulator: npm run test:rules.
    exclude: [...configDefaults.exclude, "**/*.rules.test.ts"],
  },
});
