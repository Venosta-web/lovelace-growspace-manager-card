import { defineConfig } from '@playwright/test';
import dotenv from 'dotenv';

// Load .env
dotenv.config({ path: '.env' });

export default defineConfig({
    testDir: './tests',

    // Run your local dev server before starting the tests
    webServer: {
        command: 'python3 -m http.server 8123',
        url: 'http://localhost:8123',
        reuseExistingServer: !process.env.CI,
        timeout: 120 * 1000,
    },

    use: {
        baseURL: 'http://localhost:8123',
        headless: true, // Run headless by default for CI/local testing
        viewport: { width: 1280, height: 900 },
    },

    projects: [
        {
            name: 'mockup',
            testMatch: /mockup\.spec\.ts/,
        },
    ],
});
