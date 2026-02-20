import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';

export default defineConfig({
    test: {
        browser: {
            enabled: true,
            provider: playwright(),
            instances: [
                { browser: 'chromium' },
            ],
            headless: true,
        },
        setupFiles: ['./tests/setup.ts'],
        include: [
            'tests/unit/**/*.{test,spec}.ts',
            'tests/cards/**/*.{test,spec}.ts',
            'src/**/*.{test,spec}.ts'
        ],
        coverage: {
            provider: 'v8',
            enabled: true,
            reporter: ['text', 'json', 'html'],
            include: ['src/**/*.ts'],
            exclude: ['src/**/*.spec.ts', 'src/types.ts']
        },
        // Fix for loading assets like CSS or images in tests if needed
        server: {
            deps: {
                inline: ['@material/web']
            }
        }
    },
});
