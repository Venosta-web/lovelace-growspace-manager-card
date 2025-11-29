import { test, expect } from '@playwright/test';
import { createMockHass } from './mocks/hass';

test.describe('Mobile Debug Tests', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        const card = page.locator('growspace-manager-card');
        await expect(card).toBeAttached();

        const mockHass = createMockHass({ growspaceName: '4x4 Tent', rows: 4, cols: 4 });
        const hassData = JSON.parse(JSON.stringify(mockHass));

        await card.evaluate((node: any, { config, hassData }) => {
            node.setConfig(config);
            node.hass = {
                ...hassData,
                callService: async (d: string, s: string, data: any) => {
                    console.log(`Service called: ${d}.${s}`, data);
                    return Promise.resolve();
                },
                connection: { subscribeEvents: () => () => { }, sendMessagePromise: () => Promise.resolve() },
                localize: (key: string) => `[${key}]`,
            };
        }, { config: { type: 'custom:growspace-manager-card', entity: 'sensor.4x4_tent' }, hassData });
    });

    test('Debug mobile layout - inspect computed styles', async ({ page }) => {
        // Set mobile viewport
        await page.setViewportSize({ width: 375, height: 667 });

        const growspaceCard = page.locator('growspace-manager-card').first();
        await expect(growspaceCard).toBeVisible();

        // Find plant card
        const plantCard = growspaceCard.locator('.plant-card-rich', { hasText: 'Gorilla Glue' }).first();
        await expect(plantCard).toBeVisible();

        // Get all the elements
        const content = plantCard.locator('.plant-card-content');
        const info = plantCard.locator('.pc-info');
        const name = plantCard.locator('.pc-strain-name');
        const bg = plantCard.locator('.plant-card-bg');

        // Check if image is present
        const hasImage = await bg.count() > 0;
        console.log('\n=== IMAGE PRESENT ===');
        console.log('Has .plant-card-bg:', hasImage);

        let bgStyles = null;
        if (hasImage) {
            bgStyles = await bg.evaluate((el) => {
                const computed = window.getComputedStyle(el);
                return {
                    width: computed.width,
                    height: computed.height,
                    position: computed.position,
                    display: computed.display
                };
            });
        }

        // Get computed styles
        const plantCardStyles = await plantCard.evaluate((el) => {
            const computed = window.getComputedStyle(el);
            return {
                width: computed.width,
                display: computed.display,
                flexDirection: computed.flexDirection,
                position: computed.position,
                boxSizing: computed.boxSizing
            };
        });

        const contentStyles = await content.evaluate((el) => {
            const computed = window.getComputedStyle(el);
            return {
                width: computed.width,
                display: computed.display,
                flexDirection: computed.flexDirection,
                position: computed.position,
                zIndex: computed.zIndex,
                flex: computed.flex,
                minWidth: computed.minWidth
            };
        });

        const infoStyles = await info.evaluate((el) => {
            const computed = window.getComputedStyle(el);
            return {
                width: computed.width,
                display: computed.display,
                flexDirection: computed.flexDirection,
                flex: computed.flex
            };
        });

        const nameStyles = await name.evaluate((el) => {
            const computed = window.getComputedStyle(el);
            return {
                width: computed.width,
                color: computed.color,
                fontSize: computed.fontSize,
                display: computed.display
            };
        });

        // Log everything
        console.log('=== PLANT CARD STYLES ===');
        console.log(JSON.stringify(plantCardStyles, null, 2));

        if (bgStyles) {
            console.log('\n=== BG IMAGE STYLES ===');
            console.log(JSON.stringify(bgStyles, null, 2));
        }

        console.log('\n=== CONTENT STYLES ===');
        console.log(JSON.stringify(contentStyles, null, 2));

        console.log('\n=== INFO STYLES ===');
        console.log(JSON.stringify(infoStyles, null, 2));

        console.log('\n=== NAME STYLES ===');
        console.log(JSON.stringify(nameStyles, null, 2));

        // Get bounding boxes
        const contentBox = await content.boundingBox();
        const infoBox = await info.boundingBox();
        const nameBox = await name.boundingBox();

        console.log('\n=== BOUNDING BOXES ===');
        console.log('Content:', contentBox);
        console.log('Info:', infoBox);
        console.log('Name:', nameBox);

        // Take screenshot
        await page.screenshot({ path: 'test-results/mobile-debug-screenshot.png', fullPage: true });

        // Assert to fail the test so we see the output
        expect(contentStyles.width).not.toBe('0px');
    });
});
