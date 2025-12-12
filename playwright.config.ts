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
        timeout: 0, // No timeout for webserver start
        stdout: 'ignore',
        stderr: 'pipe',
    },

    timeout: 0, // No global test timeout
    expect: {
        timeout: 0, // No expect timeout
    },

    use: {
        baseURL: 'http://localhost:8080',
        headless: true, // Run headless by default for CI/local testing
        viewport: { width: 1280, height: 900 },
        // Enable coverage collection
        trace: 'on-first-retry',
        actionTimeout: 0,
        navigationTimeout: 0,
    },

    projects: [
        {
            name: 'setup',
            testMatch: /auth\.setup\.ts/,
            use: {
                baseURL: 'http://localhost:8123', // Setup needs to hit HA directly
            },
        },
        {
            name: 'chromium',
            use: {
                ...devices['Desktop Chrome'],
                headless: true,
                storageState: 'playwright/.auth/user.json',
                baseURL: 'http://localhost:8123', // Ensure tests start against HA
            },
            dependencies: ['setup'],
            testMatch: /.*\.spec\.ts/,
        },
    ],

    // Reporter configuration for coverage
    reporter: [
        ['list'],
        ['html', { outputFolder: 'playwright-report' }],
    ],
});
