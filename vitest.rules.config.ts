import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vitest/config";

/** Firestore rules tests. Start the emulator first: npm run emulator. */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    include: ["src/**/*.rules.test.ts"],
    fileParallelism: false,
    testTimeout: 15000,
  },
});
