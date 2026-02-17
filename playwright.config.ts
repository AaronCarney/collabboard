import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  // Run all tests in parallel
  fullyParallel: true,
  // Fail the build if test.only is left in source
  forbidOnly: !!process.env["CI"],
  // Retry on CI only
  retries: process.env["CI"] ? 2 : 0,
  // Limit parallel workers in CI to avoid resource contention
  workers: process.env["CI"] ? 2 : undefined,
  reporter: [
    ["html", { outputFolder: "playwright-report" }],
    process.env["CI"] ? ["github"] : ["list"],
  ],
  use: {
    // Base URL for all page.goto("/path") calls
    baseURL: "http://localhost:3000",
    // Collect trace when retrying a failed test
    trace: "on-first-retry",
    // Record video on first retry (helps debug CI failures)
    video: "on-first-retry",
    // Take screenshot on failure
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "Desktop Chrome",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "Desktop Firefox",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "Desktop Safari",
      use: { ...devices["Desktop Safari"] },
    },
    {
      name: "Mobile Chrome",
      use: { ...devices["Pixel 5"] },
    },
  ],
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env["CI"],
    timeout: 120 * 1000, // 120 seconds for Next.js cold start
    stdout: "pipe",
    stderr: "pipe",
  },
});
