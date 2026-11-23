import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3100);

/**
 * End-to-end tests run against a production build in sample mode (no API key, no network),
 * with the worker inside the web process. Needs DATABASE_URL and AUTH_SECRET (from .env or CI).
 */
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: process.env.CI ? "retain-on-failure" : "off",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: process.env.E2E_SKIP_BUILD ? "pnpm start" : "pnpm build && pnpm start",
    url: `http://localhost:${PORT}/api/health`,
    timeout: 300_000,
    reuseExistingServer: !process.env.CI,
    env: {
      PORT: String(PORT),
      LLM_MODE: "mock",
      RUN_WORKER_IN_WEB: "true",
      MOCK_PLANNER_DELAY_MS: "250",
      // Every test run comes from the same IP; don't let the guest limit trip us up.
      GENERATIONS_PER_DAY_IP: "1000",
      EDITS_PER_DAY_IP: "1000",
      APP_URL: `http://localhost:${PORT}`,
      AUTH_URL: `http://localhost:${PORT}`,
    },
  },
});
