import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({
  path: process.env.GROWSPACE_E2E_ENV_PATH ?? path.join(__dirname, '.env.test'),
});

const managedOutputRoot = process.env.GROWSPACE_E2E_PLAYWRIGHT_OUTPUT_ROOT;
const testReportsDirectory = managedOutputRoot
  ? path.join(managedOutputRoot, 'test-reports')
  : path.join(__dirname, 'test-reports');
const testResultsDirectory = managedOutputRoot
  ? path.join(managedOutputRoot, 'test-results')
  : path.join(__dirname, 'test-results');

export default defineConfig({
  testDir: './specs',
  globalSetup: path.join(__dirname, 'global-setup.ts'),
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
    // dialogs are portalled outside the card subtree, so a reload destroys them
    // and resets the global activeDialog$ atom to NONE. Blocking service workers
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
    ['html', { outputFolder: path.join(testReportsDirectory, 'html') }],
    ['json', { outputFile: path.join(testReportsDirectory, 'results.json') }],
    ['list'],
  ],

  outputDir: testResultsDirectory,
});
