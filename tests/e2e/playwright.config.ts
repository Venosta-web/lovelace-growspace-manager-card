import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '.env.test') });

export default defineConfig({
  testDir: './specs',
  timeout: 15000,
  retries: 2,
  workers: 1, // Sequential execution for config entry isolation

  use: {
    baseURL: process.env.HA_BASE_URL || 'http://localhost:8123',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry',
    // Home Assistant's frontend registers a service worker and reloads the page
    // via `location.reload()` as soon as it takes control (`controllerchange`).
    // Every Playwright context starts with an empty SW registry, so that reload
    // fires ~2s into each test and tears down any dialog that was just opened —
    // dialogs are portalled into document.body, so a reload destroys them and
    // resets the global activeDialog$ atom to NONE. Blocking service workers
    // removes the reload entirely; nothing under test depends on the SW.
    serviceWorkers: 'block',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  reporter: [
    ['html', { outputFolder: 'test-reports/html' }],
    ['json', { outputFile: 'test-reports/results.json' }],
    ['list'],
  ],

  outputDir: 'test-results',
});
