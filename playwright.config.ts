import { defineConfig, devices } from "@playwright/test";
const port = Number(process.env.QA_PORT ?? 4173);
export default defineConfig({
  testDir: "./tests",
  snapshotPathTemplate: "{testDir}/{testFilePath}-snapshots/{arg}{ext}",
  fullyParallel: false,
  workers: 2,
  outputDir: process.env.QA_OUTPUT_DIR ?? "test-results",
  reporter: [
    [process.env.CI ? "dot" : "list"],
    ...(process.env.CI ? [["github"] as [string]] : []),
    ["./scripts/timing-reporter.ts"],
  ],
  use: {
    baseURL: `http://127.0.0.1:${port}/multiplayer-test/`,
    trace: "retain-on-failure",
  },
  webServer: {
    command: `npm run preview -- --host 127.0.0.1 --port ${port} --strictPort`,
    url: `http://127.0.0.1:${port}/multiplayer-test/`,
    reuseExistingServer: false,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
