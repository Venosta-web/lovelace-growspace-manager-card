import { test, expect } from './coverage-helper';
import { createMockHass } from './mocks/hass';

test.describe('Strain Library Search & Pagination', () => {

    test('paginates and filters strains correctly', async ({ coveragePage: page }) => {
        // Enable console logging
        page.on('console', msg => console.log(`BROWSER: ${msg.text()}`));

        const card = page.locator('growspace-manager-card');

        // Create Mock Data with enough items to trigger pagination (limit appears to be 15)
        // We'll create 20 items.
        const manyStrains: Record<string, any> = {};
        for (let i = 1; i <= 20; i++) {
            manyStrains[`Strain ${i}`] = {
                meta: { breeder: i % 2 === 0 ? "Even Breeder" : "Odd Breeder", type: "Hybrid" },
                phenotypes: {
                    "#1": { description: `Test Strain ${i}`, image_path: "" }
                }
            };
        }

        // Ensure one specific unique strain for search testing
        manyStrains["Unique Kush"] = {
            meta: { breeder: "Rare Seeds", type: "Indica" },
            phenotypes: { "": {} }
        };

        const mockHass = createMockHass({ growspaceName: '4x4 Tent', rows: 4, cols: 4 });
        const entityId = 'sensor.4x4_tent';
        const hassData = JSON.parse(JSON.stringify(mockHass));

        await page.goto('/');

        // Inject Config and Hass
        await card.evaluate((node: any, { config, hassData, strains }) => {
            node.setConfig(config);
            node.hass = {
                ...hassData,
                callService: async (d: string, s: string, data: any) => Promise.resolve(),
                connection: {
                    subscribeEvents: () => () => { },
                    sendMessagePromise: (msg: any) => {
                        if (msg.type === 'call_service' && msg.domain === 'growspace_manager' && msg.service === 'get_strain_library') {
                            return Promise.resolve({ response: strains });
                        }
                        return Promise.resolve();
                    }
                },
                localize: (key: string) => `[${key}]`,
                callApi: async () => Promise.resolve(),
            };
            // Force selected device to ensure menu works
            node.store.handleDeviceChange('4x4_tent');
        }, {
            config: { type: 'custom:growspace-manager-card', entity: entityId },
            hassData,
            strains: manyStrains
        });

        // Open Menu -> Strains
        const menuButton = card.locator('.menu-button');
        await expect(menuButton).toBeVisible();
        await menuButton.click();
        const item = card.locator('.menu-item', { hasText: 'Strains' });
        await item.click();

        // Verify Dialog Open
        const dialog = page.locator('strain-library-dialog ha-dialog');
        await expect(dialog).toBeVisible();

        // 1. Verify Pagination Controls exist (we have 21 items total, page size 15 -> 2 pages)
        const pagContainer = dialog.locator('.pagination-container');
        await expect(pagContainer).toBeVisible();
        await expect(pagContainer).toContainText('Page 1 of 2');

        // Verify some content from page 1
        await expect(dialog.locator('.strain-card', { hasText: 'Strain 1' }).first()).toBeVisible();

        // "Unique Kush" is apt to be at the end if sorted alphabetically, or strictly insertion order? 
        // JS object order is insertion order for string keys generally, but let's just check page 2.

        // 2. Go to Page 2
        const nextBtn = pagContainer.locator('button').last(); // Right arrow is usually the last one
        await nextBtn.click();

        await expect(pagContainer).toContainText('Page 2 of 2');

        // 3. Search / Filter
        const searchInput = dialog.locator('md3-text-input[placeholder*="Search"] input');
        await searchInput.fill('Unique');

        // Should filter down to just "Unique Kush" logic
        // Pagination should disappear or show 1 of 1?
        // Code check: if totalPages > 1 show container. 1 filtered item / 15 = 1 page. So container might hide.

        await expect(dialog.locator('.strain-card', { hasText: 'Unique Kush' })).toBeVisible();
        // Pagination should be gone or update
        const count = await dialog.locator('.strain-card').count();
        expect(count).toBe(1);

        // Search by Breeder
        await searchInput.fill('Even Breeder');
        // strains 2, 4, 6... 20 (10 items)
        // Should be 10 items visible
        await expect(dialog.locator('.strain-card')).toHaveCount(10);
        await expect(dialog.locator('.strain-card', { hasText: 'Strain 2' }).first()).toBeVisible();
        await expect(dialog.locator('.strain-card', { hasText: /^Strain 1 / })).not.toBeVisible();
    });
});
