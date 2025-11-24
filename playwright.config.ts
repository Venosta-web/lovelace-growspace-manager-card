import { defineConfig } from '@playwright/test';
import dotenv from 'dotenv';

// Load .env
console.log('Current working directory:', process.cwd());
dotenv.config({ path: '.env' });

export default defineConfig({
    testDir: './tests',

    use: {
        baseURL: process.env.HA_URL ?? 'http://homeassistant.local:8123',
        headless: false,
        viewport: { width: 1280, height: 900 },
    },

    projects: [
        {
            name: 'setup',
            testMatch: /ha-auth\.setup\.ts/,
        },
        {
            name: 'e2e',
            testMatch: /.*\.spec\.ts/,
            dependencies: ['setup'],
            use: { storageState: 'ha-auth.json' },
        },
    ],
});
