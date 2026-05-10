import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';

// Load .env
dotenv.config({ path: '.env' });

// Config for mock-based tests that use a local http-server (no HA instance required)
export default defineConfig({
    testDir: './tests',
    outputDir: './test-results-mock',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: 1,

    webServer: {
        command: 'npx -y http-server . -p 8080',
        url: 'http://127.0.0.1:8080',
        reuseExistingServer: true,
        timeout: 120 * 1000,
        stdout: 'ignore',
        stderr: 'pipe',
    },

    timeout: 30000,
    expect: {
        timeout: 10000,
    },

    use: {
        baseURL: 'http://127.0.0.1:8080',
        headless: true,
        viewport: { width: 1280, height: 900 },
        trace: 'on-first-retry',
        actionTimeout: 0,
        navigationTimeout: 0,
    },

    projects: [
        {
            name: 'chromium',
            use: {
                ...devices['Desktop Chrome'],
                headless: true,
            },
            testMatch: /.*\.spec\.ts/,
        },
    ],

    reporter: [
        ['list'],
        ['html', { outputFolder: 'playwright-report-mock' }],
    ],
});
