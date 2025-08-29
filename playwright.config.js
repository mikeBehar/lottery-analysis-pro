// @ts-check
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests-e2e', // Directory for E2E tests
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://127.0.0.1:5500', // Base URL of the dev server
    trace: 'on-first-retry',
  },

  // Configure projects for major browsers
  projects: [
    {
      name: 'Brave',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome', // Important: use chrome channel for Brave
        launchOptions: {
          executablePath: 'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
          args: ['--incognito']
        }
      },
    },
    {
      name: 'Chrome',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome',
      },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],

  // Run your local dev server before starting the tests
  webServer: {
    command: 'python -m http.server 5500',
    url: 'http://127.0.0.1:5500',
    reuseExistingServer: !process.env.CI,
    stdout: 'pipe', // Re-add stdout pipe for python server
    timeout: 120 * 1000,
  },
});