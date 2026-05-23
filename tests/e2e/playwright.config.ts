import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '.env.test') });

export default defineConfig({
  testDir: './specs',
  timeout: 7500,
  retries: 2,
  workers: 1, // Sequential execution for config entry isolation

  use: {
    baseURL: process.env.HA_BASE_URL || 'http://localhost:8123',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry',
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
