import { defineConfig } from "vitest/config";
import path from "node:path";

/** Live checks against the official DOJ pages. Needs the network, so it is not part of `npm test`. */
export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  test: { include: ["tests/live/**/*.test.ts"], environment: "node", testTimeout: 300_000, hookTimeout: 300_000 },
});
