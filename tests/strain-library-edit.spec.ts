import { test, expect } from './coverage-helper';
import { createMockHass } from './mocks/hass';

test.describe('Strain Library Edit', () => {

    test('save shows loading state and navigates only after save completes', async ({ coveragePage: page }) => {
        page.on('console', msg => console.log(`BROWSER: ${msg.text()}`));

        const card = page.locator('growspace-manager-card');

        // Expose a notifier so the test runner knows the save WS call is in-flight
        let resolveSave!: () => void;
        const saveGate = new Promise<void>(res => { resolveSave = res; });
        await page.exposeFunction('notifySaveCalled', () => { resolveSave(); });

        const mockStrains = {
            "Blue Dream": {
                meta: { breeder: "Humboldt", type: "Sativa" },
                phenotypes: { "": { description: "Sweet berry", image_path: "" } },
            },
        };

        const mockHass = createMockHass({ growspaceName: '4x4 Tent', rows: 4, cols: 4 });
        const hassData = JSON.parse(JSON.stringify(mockHass));

        await page.goto('/');

        // Set up card + hass; callService for add_strain/update_strain_meta hangs so we can
        // inspect the loading state before it resolves.
        await card.evaluate((node: any, { config, hassData, strains }) => {
            node.setConfig(config);
            node.hass = {
                ...hassData,
                callService: async (d: string, s: string, _data: any) => {
                    if (d === 'growspace_manager' && (s === 'add_strain' || s === 'update_strain_meta')) {
                        (window as any).notifySaveCalled();
                        await new Promise(() => {}); // hang until test ends
                    }
                    return Promise.resolve();
                },
                connection: {
                    subscribeEvents: () => () => {},
                    sendMessagePromise: (msg: any) => {
                        if (msg.type === 'growspace_manager/get_strain_library') {
                            return Promise.resolve(strains);
                        }
                        return Promise.resolve({});
                    },
                },
                callWS: async () => Promise.resolve({}),
                localize: (key: string) => `[${key}]`,
                callApi: async () => Promise.resolve(),
            };
            // Propagate hass to store immediately (normally happens in updated() async lifecycle)
            node.store.updateHass(node.hass);
            node.store.handleDeviceChange('4x4_tent');
            node.store.actions.library.fetchStrains(true);

            // Open strain library directly via the store to avoid relying on menu UI selectors
            node.store.actions.ui.openStrainLibraryDialog();
        }, {
            config: { type: 'custom:growspace-manager-card', entity: 'sensor.4x4_tent' },
            hassData,
            strains: mockStrains,
        });

        const dialog = page.locator('strain-library-dialog ha-dialog');
        await expect(dialog).toBeVisible();

        // Click the "Blue Dream" strain card to open the editor
        await dialog.locator('.strain-card', { hasText: 'Blue Dream' }).first().click();

        const strainNameInput = dialog.locator('.sd-form-group', { hasText: 'Strain Name' }).locator('input');
        await expect(strainNameInput).toBeVisible();

        // Trigger save
        const saveBtn = dialog.locator('.md3-button.primary', { hasText: 'Save Strain' });
        await expect(saveBtn).toBeVisible();
        await saveBtn.click();

        // Wait until callService is called (save is in-flight)
        await saveGate;

        // Give LitElement time to flush any pending re-renders before asserting
        await page.waitForTimeout(300);

        // ASSERT: editor must still be visible — navigation must NOT happen before save completes
        await expect(strainNameInput).toBeVisible({ timeout: 100 });

        // ASSERT: save button must show loading state while save is pending
        await expect(dialog.locator('.md3-button.primary', { hasText: 'Saving' })).toBeVisible({ timeout: 100 });
    });

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
        const menuButton = card.locator('#menu-trigger');
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
