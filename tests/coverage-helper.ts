import { test as base, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

// Extend Playwright test with coverage collection
export const test = base.extend<{ coveragePage: Page }>({
    coveragePage: async ({ page }, use) => {
        // Enable JavaScript coverage
        await page.coverage.startJSCoverage({ resetOnNavigation: false });

        await use(page);

        // Stop coverage and save results
        const coverage = await page.coverage.stopJSCoverage();

        // Filter to only our application code
        const appCoverage = coverage.filter(entry =>
            entry.url.includes('growspace-manager-card') &&
            !entry.url.includes('node_modules')
        );

        if (appCoverage.length > 0) {
            // Ensure coverage directory exists
            const coverageDir = path.join(process.cwd(), '.nyc_output');
            if (!fs.existsSync(coverageDir)) {
                fs.mkdirSync(coverageDir, { recursive: true });
            }

            // Convert to V8 coverage format and save
            const timestamp = Date.now();
            const coverageFile = path.join(coverageDir, `coverage-${timestamp}.json`);

            // NYC expects V8 coverage format
            const nycCoverage = {
                result: appCoverage.map(entry => ({
                    scriptId: entry.scriptId,
                    url: entry.url,
                    source: entry.source,
                    functions: entry.functions
                }))
            };

            fs.writeFileSync(coverageFile, JSON.stringify(nycCoverage, null, 2));
            console.log(`✓ Coverage data saved to ${path.relative(process.cwd(), coverageFile)}`);
        }
    },
});

export { expect } from '@playwright/test';
