import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;
const configuredWebKitLaunchTimeout = Number(
  process.env.PLAYWRIGHT_WEBKIT_LAUNCH_TIMEOUT_MS || 180_000,
);
if (!Number.isFinite(configuredWebKitLaunchTimeout) || configuredWebKitLaunchTimeout <= 0) {
  throw new Error('PLAYWRIGHT_WEBKIT_LAUNCH_TIMEOUT_MS must be a positive number');
}

export default defineConfig({
  testDir: './test/browser',
  fullyParallel: false,
  workers: 1,
  forbidOnly: true,
  retries: 0,
  reporter: 'line',
  timeout: 60_000,
  expect: { timeout: 8_000 },
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  webServer: {
    command: `node scripts/serve_browser_tests.mjs --port ${PORT}`,
    url: `http://127.0.0.1:${PORT}/healthz`,
    reuseExistingServer: false,
    timeout: 15_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
        // WebKit can be slow to establish its inspector pipe on constrained
        // review hosts. Keep that exception out of Chromium and Firefox, and
        // allow CI to tune it without weakening test/assertion timeouts.
        launchOptions: { timeout: configuredWebKitLaunchTimeout },
      },
    },
  ],
});
