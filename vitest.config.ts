import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';

export default defineConfig({
    test: {
        // Per-test retry absorbs transient in-context flakes (spy timing etc.).
        // It does NOT absorb the browser-mode module-mock race (vitest-dev/
        // vitest#8339, our issue #453): when a file's hoisted vi.mock factory
        // fails to apply, the poisoned module graph persists for the file's
        // whole lifetime and every retry fails identically (verified 2026-07-07:
        // camera.slice failed the same lines across all 3 attempts). That class
        // is absorbed in CI by re-running the whole vitest process (test.yml
        // retry step) and measured by the flake-hunter workflow with --retry=0.
        retry: 2,
        fileParallelism: false,
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
            'tests/fixtures/**/*.{test,spec}.ts',
            'src/**/*.{test,spec}.ts'
        ],
        coverage: {
            provider: 'v8',
            enabled: false,
            clean: true,
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
