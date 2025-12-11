import { defineConfig, devices } from '@playwright/test';

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
    testDir: './tests/e2e',
    /* Run tests in files in parallel */
    fullyParallel: false, // Serial for E2E often safer with single HA instance
    /* Fail the build on CI if you accidentally left test.only in the source code. */
    forbidOnly: !!process.env.CI,
    /* Retry on CI only */
    retries: process.env.CI ? 2 : 0,
    /* Opt out of parallel tests on CI. */
    workers: 1, // Limit workers to avoid race conditions on single HA instance
    /* Reporter to use. See https://playwright.dev/docs/test-reporters */
    reporter: 'html',

    timeout: 60 * 1000,

    /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
    use: {
        /* Base URL to use in actions like `await page.goto('/')`. */
        baseURL: 'http://localhost:8123',

        /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
        trace: 'on-first-retry',
    },

    /* Configure projects for major browsers */
    projects: [
        {
            name: 'setup',
            testMatch: /auth\.setup\.ts/,
        },
        {
            name: 'chromium',
            use: {
                ...devices['Desktop Chrome'],
                storageState: 'playwright/.auth/user.json',
            },
            dependencies: ['setup'],
        },
    ],

    /* Run your local dev server before starting the tests */
    webServer: {
        command: 'docker compose -f tests/e2e/docker-compose.test.yml up',
        url: 'http://localhost:8123',
        reuseExistingServer: !process.env.CI,
        timeout: 120 * 1000, // Give docker plenty of time to pull and start
        stdout: 'pipe',
        stderr: 'pipe',
    },
});
