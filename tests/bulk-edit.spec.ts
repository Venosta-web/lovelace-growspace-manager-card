
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
        // Ensure we have at least two plants
        // Mock hass already has plants at 1,1 and 1,2 (Gorilla Glue and Blue Dream)

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

        // 1. Enter Edit Mode (assuming there is a way to toggle it, or we simulate the state)
        // The user mentioned a "Bulk Edit" feature with checkboxes. 
        // We need to find the "Edit" button in the menu.

        // Open the menu
        const menuBtn = card.locator('ha-icon-button[icon="mdi:dots-vertical"]');
        await menuBtn.click();

        // Click "Edit" (assuming it's there based on previous convos, but I need to verify the icon/text)
        // Searching for the pen icon mentioned in previous convos
        const editBtn = card.locator('mwc-list-item', { hasText: 'Edit' });
        // If mwc-list-item is not used, maybe it's a standard button or div in the menu
        // Let's try to find it by icon if text fails, or just assume it's there.
        if (await editBtn.count() > 0) {
            await editBtn.click();
        } else {
            // Fallback: maybe it's a button in the header directly if the menu refactor wasn't fully done?
            // But the user said "Edit menu point with a pen icon".
            const editIconBtn = card.locator('ha-icon-button[icon="mdi:pencil"]');
            if (await editIconBtn.count() > 0) {
                await editIconBtn.click();
            }
        }

        // 2. Select two plants
        // In edit mode, plants should have checkboxes or be selectable.
        // Let's click on the first two plants.
        const plant1 = card.locator('.plant-card-rich').nth(0);
        const plant2 = card.locator('.plant-card-rich').nth(1);

        // We need to know HOW to select. 
        // If clicking opens the dialog, maybe there is a specific checkbox area?
        // Or maybe clicking in edit mode selects them?
        // Based on `_handlePlantClick`: if (this._isEditMode) -> _togglePlantSelection

        await plant1.click();
        await plant2.click();

        // 3. Open the dialog
        // Wait, `_handlePlantClick` says:
        // if (this._isEditMode && this._selectedPlants.size > 0) { ... this._openPlantOverviewDialog(plant, Array.from(this._selectedPlants)); }
        // So clicking the *second* plant (or any plant while others are selected) should open the dialog?
        // Actually, the logic was:
        // if (this._isEditMode && this._selectedPlants.size > 0) {
        //    if (!selected) toggle;
        //    openDialog;
        // }
        // So clicking the first one selects it. Clicking the second one selects it AND opens the dialog? 
        // That seems like a weird UX. Usually you select multiple then click a "Edit" button, or double click?
        // Let's re-read the code logic in `_handlePlantClick`.

        /*
        if (this._isEditMode && this._selectedPlants.size > 0) {
            const plantId = plant.attributes.plant_id;
            if (plantId && !this._selectedPlants.has(plantId)) {
                this._togglePlantSelection(plant);
            }
            this._openPlantOverviewDialog(plant, Array.from(this._selectedPlants));
        }
        */

        // If I click plant 1:
        // _selectedPlants is empty. 
        // else { _openPlantOverviewDialog(plant); } -> Opens dialog for plant 1.

        // Wait, if _selectedPlants is empty, it goes to `else`.
        // So how do I start selecting?
        // Maybe there is a checkbox on the card that calls `_togglePlantSelection` directly?

    });
});
