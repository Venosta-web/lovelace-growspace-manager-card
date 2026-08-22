import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';

import { BROWSER_TEST_INCLUDE, browserTestBatch } from './scripts/browser-test-batches.mjs';

const selectedBatchId = process.env.VITEST_BROWSER_BATCH;
const selectedBatch = selectedBatchId ? browserTestBatch(selectedBatchId) : undefined;
const chromiumExecutablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;

if (selectedBatchId && !selectedBatch) {
    throw new Error(`Unknown browser test batch: ${selectedBatchId}`);
}

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
            provider: playwright({
                contextOptions: { viewport: { width: 1280, height: 720 } },
                launchOptions: chromiumExecutablePath
                    ? { executablePath: chromiumExecutablePath }
                    : undefined,
            }),
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
        include: selectedBatch?.include ?? BROWSER_TEST_INCLUDE,
        exclude: selectedBatch?.exclude ?? [],
        coverage: {
            provider: 'v8',
            enabled: false,
            clean: true,
            // Batch coverage maps are carried in Vitest's blob reports. Only
            // the final merge writes reports, so every batch contributes.
            reporter: selectedBatch ? [] : ['text', 'json', 'html'],
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
