import { test, expect } from './coverage-helper';
import { createMockHass } from './mocks/hass';

test.describe('Strain Library Edit', () => {

    test('can edit an existing strain', async ({ coveragePage: page }) => {
        // Enable console logging
        page.on('console', msg => console.log(`BROWSER: ${msg.text()}`));

        const card = page.locator('growspace-manager-card');
        const serviceCalls: any[] = [];

        await page.exposeFunction('trackServiceCall', (domain: string, service: string, data: any) => {
            serviceCalls.push({ domain, service, data });
        });

        const mockStrains = {
            "Original Strain": {
                meta: { breeder: "Old Breeder", type: "Hybrid" },
                phenotypes: {
                    "#1": { description: "Original Description", image_path: "" }
                }
            }
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
                callService: async (d: string, s: string, data: any) => {
                    (window as any).trackServiceCall(d, s, data);
                    return Promise.resolve();
                },
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
            node.store.handleDeviceChange('4x4_tent');
        }, {
            config: { type: 'custom:growspace-manager-card', entity: entityId },
            hassData,
            strains: mockStrains
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

        // Find and click the existing strain card
        const strainCard = dialog.locator('.strain-card', { hasText: 'Original Strain' }).first();
        await expect(strainCard).toBeVisible();
        await strainCard.click();

        // Verify Editor View
        // Header should not be "Strain Library" anymore, but maybe "Edit Strain" or just "Strain Library" again? 
        // Based on implementation, _view switches to 'editor'.
        // Let's verify an input has the old value.

        // Breeder Input
        // Label might be "Breeder *"
        const breederInput = dialog.locator('.sd-form-group', { hasText: 'Breeder' }).locator('input');
        await expect(breederInput).toBeVisible();
        await expect(breederInput).toHaveValue('Old Breeder');

        // Edit Breeder
        await breederInput.fill('New Updated Breeder');

        // Save
        const saveBtn = dialog.locator('.md3-button.primary', { hasText: 'Save Strain' });
        await expect(saveBtn).toBeVisible();
        await saveBtn.click();

        // Verify Service Call
        const saveCall = serviceCalls.find(c => c.service === 'add_strain');
        expect(saveCall).toBeTruthy();
        expect(saveCall.data.strain).toBe('Original Strain'); // Should keep original name if not changed
        expect(saveCall.data.breeder).toBe('New Updated Breeder');
        expect(saveCall.data.phenotype).toBe('#1');
    });
});
