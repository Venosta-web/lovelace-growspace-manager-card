
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NutrientDialog } from '../../../../src/dialogs/nutrient-dialog';
// Import the component to register it
import '../../../../src/dialogs/nutrient-dialog';

describe('NutrientDialog', () => {
    let element: NutrientDialog;

    beforeEach(async () => {
        element = new NutrientDialog();
        element.hass = {} as any;
        element.store = {
            data: {
                $nutrientPresets: {
                    get: () => ({}),
                    subscribe: (fn: any) => { fn({}); return () => { }; },
                    listen: () => () => {}
                },
                $nutrientInventory: {
                    get: () => null,
                    subscribe: (fn: any) => { fn(null); return () => { }; },
                    listen: () => () => {}
                }
            },
            fetchNutrientPresets: vi.fn(),
            fetchNutrientInventory: vi.fn()
        } as any;
        document.body.appendChild(element);
        await element.updateComplete;
    });

    afterEach(() => {
        if (element && element.isConnected) {
            document.body.removeChild(element);
        }
    });

    it('should not render content when closed', async () => {
        element.open = false;
        await element.updateComplete;
        const dialog = element.shadowRoot?.querySelector('gs-dialog');
        expect(dialog).toBeNull();
    });

    it('should render content when open', async () => {
        element.open = true;
        await element.updateComplete;
        const dialog = element.shadowRoot?.querySelector('gs-dialog');
        expect(dialog).not.toBeNull();
    });

    it('should switch tabs', async () => {
        element.open = true;
        await element.updateComplete;

        // Default tab is inventory
        let inventory = element.shadowRoot?.querySelector('growspace-nutrient-inventory-dialog-ui');
        expect(inventory).not.toBeNull();

        // Switch to presets
        const presetsTab = element.shadowRoot?.querySelectorAll('.tab')[1] as HTMLElement;
        expect(presetsTab.textContent).toContain('Presets');
        presetsTab.click();

        await element.updateComplete;

        const presetsEditor = element.shadowRoot?.querySelector('growspace-nutrient-presets-editor');
        expect(presetsEditor).not.toBeNull();
        expect(element.shadowRoot?.querySelector('growspace-nutrient-inventory-dialog-ui')).toBeNull();

        // Switch back to inventory
        const inventoryTab = element.shadowRoot?.querySelectorAll('.tab')[0] as HTMLElement;
        expect(inventoryTab.textContent).toContain('Inventory');
        inventoryTab.click();

        await element.updateComplete;
        expect(element.shadowRoot?.querySelector('growspace-nutrient-inventory-dialog-ui')).not.toBeNull();
        expect(element.shadowRoot?.querySelector('growspace-nutrient-presets-editor')).toBeNull();
    });

    it('should dispatch close event on close button click', async () => {
        element.open = true;
        await element.updateComplete;

        const closeSpy = vi.fn();
        element.addEventListener('close', closeSpy);

        const gsDialog = element.shadowRoot?.querySelector('gs-dialog');
        const closeButton = (gsDialog as any)?.shadowRoot?.querySelector('button.dialog-close-btn') as HTMLElement;
        closeButton.click();

        expect(closeSpy).toHaveBeenCalled();
    });

    it('should dispatch close event on gs-dialog close', async () => {
        element.open = true;
        await element.updateComplete;

        const closeSpy = vi.fn();
        element.addEventListener('close', closeSpy);

        const gsDialog = element.shadowRoot?.querySelector('gs-dialog');
        gsDialog?.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }));

        expect(closeSpy).toHaveBeenCalled();
    });
});
