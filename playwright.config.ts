import { defineConfig } from '@playwright/test';
import dotenv from 'dotenv';

// Load .env
dotenv.config({ path: '.env' });

export default defineConfig({
    testDir: './tests',

    // Run your local dev server before starting the tests
    webServer: {
        command: 'npx -y http-server . -p 8080',
        url: 'http://localhost:8080',
        reuseExistingServer: !process.env.CI,
        timeout: 120 * 1000,
    },

    use: {
        baseURL: 'http://localhost:8080',
        headless: false, // Run headless by default for CI/local testing
        viewport: { width: 1280, height: 900 },
    },

    projects: [
        {
            name: 'mock',
            testMatch: /.*\.spec\.ts/,
        },
    ],
});
