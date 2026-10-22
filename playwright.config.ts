import { defineConfig } from "@playwright/test";

const PORT = 3111;
// In CI browsers are installed by `playwright install`; locally set PW_CHROMIUM_PATH to use an existing Chromium.
const executablePath = process.env.PW_CHROMIUM_PATH || undefined;

export default defineConfig({
  testDir: "e2e",
  // The ~120 MB export test takes ~2 minutes; run it with `npm run test:e2e:large`.
  testIgnore: process.env.RUN_LARGE ? [] : ["**/large-files.spec.ts"],
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: { baseURL: `http://localhost:${PORT}`, acceptDownloads: true, launchOptions: { executablePath }, trace: "retain-on-failure" },
  webServer: {
    command: `npm run build && npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
  },
});
