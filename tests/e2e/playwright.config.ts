import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.test' });

export default defineConfig({
  testDir: './specs',
  timeout: 30000,
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
    ['html', { outputFolder: 'test-results/html' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['list'],
  ],

  outputDir: 'test-results',
});
