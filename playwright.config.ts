import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';

// Load .env
dotenv.config({ path: '.env' });

export default defineConfig({
    testDir: './tests',
    outputDir: './test-results', // Explicitly set output directory to avoid Windows path issues
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,

    // Run your local dev server before starting the tests
    webServer: {
        command: 'npx -y http-server . -p 8080',
        url: 'http://localhost:8080',
        reuseExistingServer: !process.env.CI,
        timeout: 120 * 1000,
        stdout: 'ignore',
        stderr: 'pipe',
    },

    use: {
        baseURL: 'http://localhost:8080',
        headless: true, // Run headless by default for CI/local testing
        viewport: { width: 1280, height: 900 },
        // Enable coverage collection
        trace: 'on-first-retry',
    },

    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
            testMatch: /.*\.spec\.ts/,
        },
    ],

    // Reporter configuration for coverage
    reporter: [
        ['list'],
        ['html', { outputFolder: 'playwright-report' }],
    ],
});
