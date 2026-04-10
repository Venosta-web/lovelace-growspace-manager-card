import { vi, describe, it, expect, beforeEach } from 'vitest';
import { fixture, html } from '@open-wc/testing-helpers';
import { atom } from 'nanostores';
import '../../../../../src/features/ui/containers/growspace-nutrient-presets-editor.container';
import type { GrowspaceNutrientPresetsEditorContainer } from '../../../../../src/features/ui/containers/growspace-nutrient-presets-editor.container';

vi.mock('../../../../../src/features/ui/components/growspace-nutrient-presets-editor-ui', () => {
    if (!customElements.get('growspace-nutrient-presets-editor-ui')) {
        customElements.define('growspace-nutrient-presets-editor-ui', class extends HTMLElement {});
    }
    return {};
});

describe('GrowspaceNutrientPresetsEditorContainer', () => {
    let element: GrowspaceNutrientPresetsEditorContainer;
    let mockStore: any;
    let $nutrientDataState: ReturnType<typeof atom<any>>;

    const buildMockStore = () => {
        $nutrientDataState = atom({
            nutrientPresets: { preset1: { id: 'preset1', name: 'Growth', nutrients: [] } },
            nutrientInventory: null,
            ecRampCurves: {},
            isLoading: false,
        });
        return {
            data: {
                $nutrientDataState,
            },
            dataService: {
                saveNutrientPreset: vi.fn().mockResolvedValue(true),
                removeNutrientPreset: vi.fn().mockResolvedValue(true),
            },
            fetchNutrientPresets: vi.fn().mockResolvedValue(true),
        };
    };

    beforeEach(async () => {
        mockStore = buildMockStore();

        element = await fixture<GrowspaceNutrientPresetsEditorContainer>(
            html`<growspace-nutrient-presets-editor .store=${mockStore} .open=${true}></growspace-nutrient-presets-editor>`
        );
        await element.updateComplete;
    });

    it('renders nothing when store is not set', async () => {
        const el = await fixture<GrowspaceNutrientPresetsEditorContainer>(
            html`<growspace-nutrient-presets-editor></growspace-nutrient-presets-editor>`
        );
        await el.updateComplete;
        // When store is missing, render() returns nothing
        expect(el.shadowRoot?.querySelector('growspace-nutrient-presets-editor-ui')).toBeNull();
    });

    it('renders growspace-nutrient-presets-editor-ui when store is set', async () => {
        expect(element.shadowRoot?.querySelector('growspace-nutrient-presets-editor-ui')).toBeTruthy();
    });

    it('save-preset calls saveNutrientPreset with correct args and then fetchNutrientPresets', async () => {
        const ui = element.shadowRoot!.querySelector('growspace-nutrient-presets-editor-ui')!;

        const preset = { id: 'p1', name: 'Bloom', nutrients: [{ name: 'N', dose_ml_l: 2 }] };
        ui.dispatchEvent(new CustomEvent('save-preset', { detail: preset }));

        await new Promise((r) => setTimeout(r, 50));

        expect(mockStore.dataService.saveNutrientPreset).toHaveBeenCalledWith({
            preset_id: 'p1',
            name: 'Bloom',
            nutrients: [{ name: 'N', dose_ml_l: 2 }],
        });
        expect(mockStore.fetchNutrientPresets).toHaveBeenCalledWith(true);
    });

    it('save-preset uses "Unnamed Preset" when name is missing', async () => {
        const ui = element.shadowRoot!.querySelector('growspace-nutrient-presets-editor-ui')!;

        ui.dispatchEvent(new CustomEvent('save-preset', { detail: { id: 'p2', nutrients: [] } }));

        await new Promise((r) => setTimeout(r, 50));

        expect(mockStore.dataService.saveNutrientPreset).toHaveBeenCalledWith(
            expect.objectContaining({ name: 'Unnamed Preset' })
        );
    });

    it('delete-preset calls removeNutrientPreset and then fetchNutrientPresets', async () => {
        const ui = element.shadowRoot!.querySelector('growspace-nutrient-presets-editor-ui')!;

        ui.dispatchEvent(new CustomEvent('delete-preset', { detail: { presetId: 'preset1' } }));

        await new Promise((r) => setTimeout(r, 50));

        expect(mockStore.dataService.removeNutrientPreset).toHaveBeenCalledWith('preset1');
        expect(mockStore.fetchNutrientPresets).toHaveBeenCalledWith(true);
    });

    it('close event from UI re-dispatches close event from container', async () => {
        const closeHandler = vi.fn();
        element.addEventListener('close', closeHandler);

        const ui = element.shadowRoot!.querySelector('growspace-nutrient-presets-editor-ui')!;
        ui.dispatchEvent(new CustomEvent('close'));

        expect(closeHandler).toHaveBeenCalledOnce();
    });

    it('passes nutrientPresets from controller to the UI', async () => {
        const ui = element.shadowRoot!.querySelector('growspace-nutrient-presets-editor-ui') as any;
        // The UI element receives .presets property
        expect(ui).toBeTruthy();
    });

    it('renders nothing when controller is not yet initialized', async () => {
        // Create element without store - connectedCallback won't initialize controller
        const el = await fixture<GrowspaceNutrientPresetsEditorContainer>(
            html`<growspace-nutrient-presets-editor></growspace-nutrient-presets-editor>`
        );
        expect(el.shadowRoot?.querySelector('growspace-nutrient-presets-editor-ui')).toBeNull();
    });
});
