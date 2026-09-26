import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.E2E_PORT ?? 4322);
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './test/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  /* One local retry so `trace: 'on-first-retry'` can ever produce a trace.
     Without it a local run records a screenshot and nothing else. */
  retries: process.env.CI ? 2 : 1,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  timeout: 30_000,
  expect: { timeout: 7_000 },
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    /* A real mobile project, not per-spec `test.use`. The only horizontal
       overflow detector in the suite used to run at 1280x720 exclusively, which
       made a real 390px overflow bug structurally invisible. */
    { name: 'mobile-chromium', use: { ...devices['Pixel 7'] } },
  ],
  // Always build + serve a fresh dist so e2e never runs against a stale build.
  // We use a small foreground static server (test/support/static-server.mjs)
  // instead of `astro preview`, which daemonizes and would exit Playwright's
  // webServer supervision.
  webServer: {
    command: `bun run build && node test/support/static-server.mjs ${PORT}`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
    /* `pipe`, not `ignore`. Astro writes build diagnostics to stdout; with
       `ignore` a failed build surfaced only as "Timed out waiting for 120000ms
       from config.webServer" with no indication of the actual error. */
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
