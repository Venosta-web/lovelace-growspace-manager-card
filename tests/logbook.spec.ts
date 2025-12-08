import { test, expect } from './coverage-helper';
import { createMockHass } from './mocks/hass';

test.describe('Logbook Dialog', () => {

    test('opens logbook dialog', async ({ coveragePage: page }) => {
        // Enable console logging
        page.on('console', msg => console.log(`BROWSER: ${msg.text()}`));

        const card = page.locator('growspace-manager-card');

        // Create Mock Data
        const mockHass = createMockHass({ growspaceName: '4x4 Tent', rows: 4, cols: 4 });
        const entityId = 'sensor.4x4_tent';
        const hassData = JSON.parse(JSON.stringify(mockHass));

        await page.goto('/');

        // Inject Config and Hass
        await card.evaluate((node: any, { config, hassData }) => {
            node.setConfig(config);
            node.hass = {
                ...hassData,
                callService: async (d: string, s: string, data: any) => {
                    console.log(`[MockHass] Service: ${d}.${s}`, data);
                    return Promise.resolve();
                },
                callWS: async (msg: any) => {
                    console.log(`[MockHass] callWS:`, msg);
                    return Promise.resolve([]);
                },
                connection: {
                    subscribeEvents: () => () => { },
                    sendMessagePromise: (msg: any) => {
                        console.log(`[MockHass] sendMessagePromise:`, msg);
                        return Promise.resolve([]);
                    }
                },
                localize: (key: string) => `[${key}]`,
                callApi: async () => Promise.resolve(),
            };
            // Force selected device
            node.store.handleDeviceChange('4x4_tent');
        }, { config: { type: 'custom:growspace-manager-card', entity: entityId }, hassData });

        // Open Menu
        const menuButton = card.locator('.menu-button');
        await expect(menuButton).toBeVisible();
        await menuButton.click();

        // Click Logbook Item
        const item = card.locator('.menu-item', { hasText: 'Logbook' });
        await expect(item).toBeVisible();
        await item.click();

        // Verify Dialog
        const dialog = page.locator('logbook-dialog ha-dialog');
        await expect(dialog).toBeVisible();
        await expect(dialog.locator('h2.dialog-title')).toContainText('Events Logbook');
    });
});
