import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';

export default defineConfig({
    test: {
        browser: {
            enabled: true,
            provider: playwright({ contextOptions: { viewport: { width: 1280, height: 720 } } }),
            instances: [
                { browser: 'chromium' },
            ],
            headless: true,
            viewport: { width: 1280, height: 720 },
            expect: {
                toMatchScreenshot: {
                    comparatorName: 'pixelmatch',
                    comparatorOptions: {
                        allowedMismatchedPixelRatio: 0.002,
                    },
                },
            },
        },
        setupFiles: ['./tests/setup.ts'],
        include: [
            'tests/unit/**/*.{test,spec}.ts',
            'tests/cards/**/*.{test,spec}.ts',
            'tests/components/**/*.{test,spec}.ts',
            'src/**/*.{test,spec}.ts'
        ],
        coverage: {
            provider: 'v8',
            enabled: true,
            clean: false,
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
