import { test, expect } from '@playwright/test';
import { createMockHass } from './mocks/hass';

test.describe('Strain Library', () => {

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
                    (window as any).trackServiceCall(d, s, data);
                    return Promise.resolve();
                },
                connection: {
                    subscribeEvents: () => () => { },
                    sendMessagePromise: (msg: any) => {
                        console.log('[MockHass] sendMessagePromise:', msg);
                        if (msg.type === 'call_service' && msg.domain === 'growspace_manager' && msg.service === 'get_strain_library') {
                            return Promise.resolve({
                                response: {
                                    "Gorilla Glue": {
                                        meta: { breeder: "GG Strains", type: "Hybrid" },
                                        phenotypes: {
                                            "#4": { description: "Sticky and pungent", image_path: "/local/gg4.jpg" }
                                        }
                                    },
                                    "Blue Dream": {
                                        meta: { breeder: "Humboldt", type: "Sativa" },
                                        phenotypes: {
                                            "": { description: "Sweet berry aroma", image_path: "/local/bd.jpg" }
                                        }
                                    }
                                }
                            });
                        }
                        return Promise.resolve();
                    }
                },
                localize: (key: string) => `[${key}]`,
            };
        }, { config: { type: 'custom:growspace-manager-card', entity: 'sensor.4x4_tent', compact: true }, hassData });
    });

    test('can add and remove a strain', async ({ page }) => {
        page.on('console', msg => console.log(`[Browser] ${msg.text()}`));
        const card = page.locator('growspace-manager-card');
        const serviceCalls: any[] = [];

        await page.exposeFunction('trackServiceCall', (domain: string, service: string, data: any) => {
            serviceCalls.push({ domain, service, data });
        });

        // 1. Open Strain Library
        // The current UI has a direct "Strains" button in the header (in compact mode)
        // It is not in a menu yet.
        const strainsBtn = card.locator('button.action-button', { hasText: 'Strains' });
        await expect(strainsBtn).toBeVisible();
        await strainsBtn.click();

        const dialog = page.locator('ha-dialog[open]');
        await expect(dialog).toBeVisible();

        // 2. Click "New Strain" button
        const newStrainBtn = dialog.locator('.sd-btn.primary', { hasText: 'New Strain' });
        await expect(newStrainBtn).toBeVisible();
        await newStrainBtn.click();

        // 3. Add a new strain
        const newStrainName = 'New Test Strain';
        const newPheno = '#1';

        // Find inputs based on labels in dialog-renderer.ts
        // Strain Name *
        const strainInput = dialog.locator('.sd-form-group', { hasText: 'Strain Name *' }).locator('input');
        await strainInput.fill(newStrainName);

        // Phenotype
        const phenoInput = dialog.locator('.sd-form-group', { hasText: 'Phenotype' }).locator('input');
        await phenoInput.fill(newPheno);

        // Save Strain
        const saveBtn = dialog.locator('.sd-btn.primary', { hasText: 'Save Strain' });
        await saveBtn.click();

        // 4. Verify Service Call for Add
        // Wait a bit for the service call
        await page.waitForTimeout(500);
        const addCall = serviceCalls.find(c => c.service === 'add_strain');
        expect(addCall).toBeTruthy();
        expect(addCall.data).toHaveProperty('strain', newStrainName);
        expect(addCall.data).toHaveProperty('phenotype', newPheno);

        // 5. Remove a strain
        // Note: Since we are mocking, the list won't update unless we update the mock data.
        // So we can't click the *new* strain card to delete it unless we mock the update.
        // However, we can try to delete an *existing* strain from the mock data.
        // The mock data has "Gorilla Glue" and "Blue Dream".

        const existingStrainCard = dialog.locator('.strain-card', { hasText: 'Gorilla Glue' }).first();
        // Let's verify we are in browse view (header says "Strain Library")
        const headerTitle = dialog.locator('.sd-title');
        await expect(headerTitle).toHaveText('Strain Library');

        await expect(existingStrainCard).toBeVisible();

        // Hover to see actions or just force click the delete button if it's hidden
        // The delete button is .sc-action-btn inside .sc-actions
        const deleteBtn = existingStrainCard.locator('.sc-action-btn').first();

        // Playwright can click hidden elements if we force it, or we can hover first.
        await existingStrainCard.hover();
        await deleteBtn.click();

        // 6. Verify Service Call for Remove
        await page.waitForTimeout(500);
        const removeCall = serviceCalls.find(c => c.service === 'remove_strain');
        expect(removeCall).toBeTruthy();
        expect(removeCall.data).toHaveProperty('strain', 'Gorilla Glue');
        expect(removeCall.data).toHaveProperty('phenotype', '#4');
    });
});
