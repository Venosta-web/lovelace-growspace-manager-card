
import { test, expect } from '@playwright/test';
import { createMockHass } from './mocks/hass';

test.describe('Growspace Manager Card - Bulk Edit', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto('/');
    });

    test('allows selecting multiple plants and bulk editing them', async ({ page }) => {
        const card = page.locator('growspace-manager-card');
        const serviceCalls: any[] = [];

        await page.exposeFunction('trackServiceCall', (domain: string, service: string, data: any) => {
            serviceCalls.push({ domain, service, data });
        });

        const mockHass = createMockHass({ growspaceName: '4x4 Tent', rows: 4, cols: 4 });
        const hassData = JSON.parse(JSON.stringify(mockHass));

        await card.evaluate((node: any, { config, hassData }) => {
            node.setConfig(config);
            node.hass = {
                ...hassData,
                callService: async (d: string, s: string, data: any) => {
                    await (window as any).trackServiceCall(d, s, data);
                    return Promise.resolve();
                },
                connection: { subscribeEvents: () => () => { }, sendMessagePromise: () => Promise.resolve() },
                localize: (key: string) => `[${key}]`,
            };
        }, { config: { type: 'custom:growspace-manager-card', entity: 'sensor.4x4_tent' }, hassData });

        // 1. Enter Edit Mode
        const menuBtn = card.locator('.menu-button');
        await expect(menuBtn).toBeVisible();
        await menuBtn.click();

        const editBtn = card.locator('.menu-item', { hasText: 'Edit' });
        await expect(editBtn).toBeVisible();
        await editBtn.click();

        const banner = card.locator('.edit-mode-banner');
        await expect(banner).toBeVisible();

        // 2. Select two plants
        const plant1 = card.locator('.plant-card-rich').nth(0);
        const plant2 = card.locator('.plant-card-rich').nth(1);

        const checkbox1 = plant1.locator('.plant-card-checkbox');
        await checkbox1.click();

        const checkbox2 = plant2.locator('.plant-card-checkbox');
        await checkbox2.click();

        await expect(banner).toContainText('2 plant(s) selected');

        // 3. Open the dialog
        await plant1.click({ position: { x: 50, y: 50 } });

        // 4. Verify Dialog is Open
        const haDialog = card.locator('ha-dialog[open]');
        await expect(haDialog).toBeVisible();

        // 5. Perform Bulk Edit
        const saveBtn = haDialog.locator('button.md3-button', { hasText: 'Save Changes' });
        await saveBtn.click();

        // 6. Verify Service Calls
        await page.waitForTimeout(500);

        const updateCalls = serviceCalls.filter(c => c.service === 'update_plant');
        expect(updateCalls.length).toBe(2);

        // The mock data in tests/mocks/hass.ts defines these IDs
        const plant1Id = 'mock_plant_uuid_1';
        const plant2Id = 'mock_plant_uuid_2';

        const calledIds = updateCalls.map(c => c.data.plant_id);
        expect(calledIds).toContain(plant1Id);
        expect(calledIds).toContain(plant2Id);
    });
});
