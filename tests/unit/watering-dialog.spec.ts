import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WateringDialog } from '../../src/dialogs/watering-dialog';
import type { WateringDialogState, NutrientEntry, GrowspaceDevice, NutrientPreset } from '../../src/types';
import type { GrowspaceStore } from '../../src/store/growspace-store';

// Mock dependencies
vi.mock('../../src/components/ui/md3-text-input', () => ({
    Md3TextInput: class extends HTMLElement {
        get value() { return this.getAttribute('value') || ''; }
        set value(v) { this.setAttribute('value', v); }
        set suggestions(s: any) { }
    }
}));
vi.mock('../../src/components/ui/md3-number-input', () => ({
    Md3NumberInput: class extends HTMLElement {
        get value() { return this.getAttribute('value') || ''; }
        set value(v) { this.setAttribute('value', v); }
    }
}));
vi.mock('../../src/components/ui/md3-select', () => ({
    Md3Select: class extends HTMLElement {
        get value() { return this.getAttribute('value') || ''; }
        set value(v) { this.setAttribute('value', v); }
        set options(o: any) { (this as any)._options = o; }
        get options() { return (this as any)._options || []; }
    }
}));

// Mock DataService
const mockWaterPlant = vi.fn();
const mockWaterGrowspace = vi.fn();

vi.mock('../../src/data-service', () => {
    return {
        DataService: class {
            waterPlant = mockWaterPlant;
            waterGrowspace = mockWaterGrowspace;
        }
    };
});

// Mock ha-dialog & icons
class HaDialogMock extends HTMLElement {
    open = false;
}
customElements.define('ha-dialog', HaDialogMock);

class HaSvgIconMock extends HTMLElement {
    path = '';
}
customElements.define('ha-svg-icon', HaSvgIconMock);

describe('WateringDialog', () => {
    let element: WateringDialog;
    let mockStore: any;
    let mockHass: any;

    const mockPreset: NutrientPreset = {
        id: 'veg1',
        name: 'Veg Week 1',
        stage: 'veg',
        nutrients: [
            { name: 'Base A', dose_ml_l: 2 },
            { name: 'Base B', dose_ml_l: 2 }
        ]
    };

    const mockDevice: Partial<GrowspaceDevice> = {
        device_id: 'gs1',
        name: 'Tent 1',
        plants: [
            {
                entity_id: 'sensor.plant1',
                attributes: { plant_id: 'p1', stage: 'veg', days_in_stage: 10 } as any,
                state: 'ok',
                last_updated: '',
                last_changed: '',
                context: { id: '1', parent_id: null, user_id: null }
            }
        ]
    };

    beforeEach(async () => {
        vi.clearAllMocks();

        mockHass = {
            callService: vi.fn(),
            states: {}
        } as any;

        mockStore = {
            data: {
                $devices: {
                    get: () => [mockDevice],
                    subscribe: vi.fn()
                },
                $nutrientPresets: {
                    get: () => ({ 'veg1': mockPreset }),
                    subscribe: vi.fn()
                },
                $selectedDevice: {
                    get: () => 'gs1',
                    subscribe: vi.fn()
                },
                $ipmPresets: {
                    get: () => ({}),
                    subscribe: vi.fn()
                },
                $nutrientInventory: {
                    get: () => ({}),
                    subscribe: vi.fn()
                }
            },
            showToast: vi.fn(),
            refreshData: vi.fn(),
            waterPlant: mockWaterPlant,
            waterGrowspace: mockWaterGrowspace,
            dataService: {
                fetchNutrientPresets: vi.fn(),
                fetchIPMPresets: vi.fn()
            }
        };

        element = new WateringDialog();
        element.hass = mockHass;
        element.store = mockStore as GrowspaceStore;

        document.body.appendChild(element);
        await element.updateComplete;
    });

    afterEach(() => {
        if (element.isConnected) document.body.removeChild(element);
    });

    it('should render nothing when closed', async () => {
        element.open = false;
        await element.updateComplete;
        expect(element.shadowRoot?.querySelector('ha-dialog')).toBeNull();
    });

    it('should render when open', async () => {
        element.open = true;
        await element.updateComplete;
        expect(element.shadowRoot?.querySelector('ha-dialog')).toBeTruthy();
    });

    it('should reset form on open', async () => {
        // Dirty the state
        (element as any)._volume = 99;
        (element as any)._nutrients = [{ name: 'dirty', concentration: 99 }];

        // Close and reopen
        element.open = false;
        await element.updateComplete;
        element.open = true;
        await element.updateComplete;

        const volInput = element.shadowRoot?.querySelector('md3-number-input[label="Volume (Liters)"]') as any;
        expect(String(volInput.value)).toBe('1');
        expect((element as any)._nutrients.length).toBe(0);
    });

    it('should handle volume changes', async () => {
        element.open = true;
        await element.updateComplete;

        const volInput = element.shadowRoot?.querySelector('md3-number-input[label="Volume (Liters)"]') as any;
        volInput.dispatchEvent(new CustomEvent('change', { detail: '5.5' }));
        await element.updateComplete;

        expect((element as any)._volume).toBe(5.5);
    });

    it('should add and remove nutrients manually', async () => {
        element.open = true;
        await element.updateComplete;

        const addBtn = Array.from(element.shadowRoot?.querySelectorAll('button') || []).find(b => b.textContent?.includes('Add')) as HTMLElement;
        addBtn.click();
        await element.updateComplete;

        expect((element as any)._nutrients.length).toBe(1);

        const nameInput = element.shadowRoot?.querySelector('md3-text-input[label="Nutrient Name"]') as any;
        const concInput = element.shadowRoot?.querySelector('md3-number-input[label="ml/L"]') as any;

        nameInput.dispatchEvent(new CustomEvent('change', { detail: 'CalMag' }));
        concInput.dispatchEvent(new CustomEvent('change', { detail: '1.5' }));
        await element.updateComplete;

        expect((element as any)._nutrients[0]).toEqual({ name: 'CalMag', concentration: 1.5 });

        // Remove
        const removeBtn = element.shadowRoot?.querySelector('button.icon') as HTMLElement;
        removeBtn.click();
        await element.updateComplete;

        expect((element as any)._nutrients.length).toBe(0);
    });

    it('should populate nutrients from preset', async () => {
        element.open = true;
        element.growspaceName = 'Tent 1';
        element.dialogState = {
            growspaceId: 'gs1',
            mode: 'growspace'
        };
        await element.updateComplete;

        const select = element.shadowRoot?.querySelector('md3-select') as any;
        select.dispatchEvent(new CustomEvent('change', { detail: 'veg1' }));
        await element.updateComplete;

        expect((element as any)._nutrients.length).toBe(2);
        expect((element as any)._nutrients[0].name).toBe('Base A');
        expect((element as any)._nutrients[0].concentration).toBe(2);
        expect((element as any)._selectedPresetId).toBe('veg1');
    });

    it('should clear nutrients when preset deselected', async () => {
        element.open = true;
        element.dialogState = { growspaceId: 'gs1', mode: 'growspace' };
        await element.updateComplete;

        // Select first
        const select = element.shadowRoot?.querySelector('md3-select') as any;
        select.dispatchEvent(new CustomEvent('change', { detail: 'veg1' }));
        await element.updateComplete;
        expect((element as any)._nutrients.length).toBe(2);

        // Deselect
        select.dispatchEvent(new CustomEvent('change', { detail: '' }));
        await element.updateComplete;
        expect((element as any)._nutrients.length).toBe(0);
    });

    it('should show calculations', async () => {
        element.open = true;
        await element.updateComplete;

        (element as any)._volume = 10;
        (element as any)._nutrients = [{ name: 'A', concentration: 2 }];
        await element.updateComplete;

        const preview = element.shadowRoot?.querySelector('.calculation-preview');
        expect(preview).toBeTruthy();
        expect(preview?.textContent).toContain('20.0 ml'); // 10 * 2
    });

    describe('Submission Logic', () => {
        it('should submit for single plant', async () => {
            element.open = true;
            await element.updateComplete;
            element.dialogState = {
                growspaceId: 'gs1',
                mode: 'plant',
                plantIds: ['p1']
            };
            await element.updateComplete;

            (element as any)._volume = 2;
            (element as any)._nutrients = [{ name: 'A', concentration: 1 }];
            await element.updateComplete;

            const submitBtn = element.shadowRoot?.querySelector('button.primary') as HTMLElement;
            submitBtn.click();

            // Wait for async submit
            await new Promise(r => setTimeout(r, 0));

            expect(mockWaterPlant).toHaveBeenCalledWith(
                'p1',
                2,
                { 'A': 1 },
                undefined
            );
        });

        it('should submit for growspace', async () => {
            element.open = true;
            element.dialogState = {
                growspaceId: 'gs1',
                mode: 'growspace'
            };
            await element.updateComplete;

            (element as any)._volume = 100;
            await element.updateComplete;

            const submitBtn = element.shadowRoot?.querySelector('button.primary') as HTMLElement;
            submitBtn.click();

            await new Promise(r => setTimeout(r, 0));

            expect(mockWaterGrowspace).toHaveBeenCalledWith(
                'gs1',
                100,
                undefined,
                undefined
            );
        });

        it('should handle submission errors', async () => {
            element.open = true;
            element.dialogState = { growspaceId: 'gs1', mode: 'growspace' };
            mockWaterGrowspace.mockRejectedValue(new Error('Network Fail'));

            await element.updateComplete;
            const submitBtn = element.shadowRoot?.querySelector('button.primary') as HTMLElement;
            submitBtn.click();

            await new Promise(r => setTimeout(r, 0));

            expect(mockStore.showToast).toHaveBeenCalledWith('Error: Network Fail', 'error');
            expect((element as any)._isSubmitting).toBe(false);
        });

        it('should dispatch close on cancel', async () => {
            element.open = true;
            await element.updateComplete;

            const listener = vi.fn();
            element.addEventListener('close', listener);

            const cancelBtn = element.shadowRoot?.querySelector('button.tonal') as HTMLElement;
            cancelBtn.click();

            expect(listener).toHaveBeenCalled();
        });
    });

    describe('Recommendations', () => {
        it('should mark preset as recommended if stage matches', async () => {
            element.open = true;
            element.dialogState = {
                growspaceId: 'gs1',
                mode: 'plant',
                plantIds: ['p1'] // matches veg stage of preset
            };
            await element.updateComplete;

            const select = element.shadowRoot?.querySelector('md3-select') as any;
            const option = select.options.find((o: any) => o.value === 'veg1');
            expect(option?.label).toContain('⭐(Recommended)');
        });

        it('should not recommend if stage mismatch', async () => {
            // Change plant stage
            mockDevice.plants![0].attributes.stage = 'flower';

            // Refresh mock
            mockStore.data.$devices.get = () => [mockDevice];
            mockStore.data.$nutrientPresets.get = () => ({ 'veg1': mockPreset });

            element.open = true;
            element.dialogState = {
                growspaceId: 'gs1',
                mode: 'plant',
                plantIds: ['p1']
            };
            await element.requestUpdate(); // Force re-render with new data
            await element.updateComplete;

            const select = element.shadowRoot?.querySelector('md3-select') as any;
            const option = select.options.find((o: any) => o.value === 'veg1');
            expect(option?.label).not.toContain('⭐');

            // Reset for other tests
            mockDevice.plants![0].attributes.stage = 'veg';
        });
    });

    it('should generate nutrient suggestions', () => {
        const suggestions = (element as any)._getNutrientSuggestions();
        expect(suggestions).toContain('Base A');
        expect(suggestions).toContain('Base B');
    });

    describe('Branch Coverage', () => {
        it('should submit without nutrients if all have empty names or zero concentration', async () => {
            element.open = true;
            element.dialogState = {
                growspaceId: 'gs1',
                mode: 'plant',
                plantIds: ['p1']
            };
            await element.updateComplete;

            (element as any)._volume = 2;
            (element as any)._nutrients = [
                { name: '', concentration: 1 },
                { name: 'Valid', concentration: 0 }
            ];
            await element.updateComplete;

            const submitBtn = element.shadowRoot?.querySelector('button.primary') as HTMLElement;
            submitBtn.click();
            await new Promise(r => setTimeout(r, 0));

            // Should have been called with undefined nutrients since all are invalid
            expect(mockWaterPlant).toHaveBeenCalledWith('p1', 2, undefined, undefined);
        });

        it('should handle batch watering of multiple plants', async () => {
            // Add a second plant to the mock device
            const originalPlants = mockDevice.plants;
            mockDevice.plants = [
                ...(originalPlants || []),
                {
                    entity_id: 'sensor.plant2',
                    attributes: { plant_id: 'p2', stage: 'veg', days_in_stage: 5 } as any,
                    state: 'ok',
                    last_updated: '',
                    last_changed: '',
                    context: { id: '2', parent_id: null, user_id: null }
                }
            ];

            element.open = true;
            element.dialogState = {
                growspaceId: 'gs1',
                mode: 'plant',
                plantIds: ['p1', 'p2']
            };
            await element.updateComplete;

            (element as any)._volume = 1.5;
            await element.updateComplete;

            const submitBtn = element.shadowRoot?.querySelector('button.primary') as HTMLElement;
            submitBtn.click();
            await new Promise(r => setTimeout(r, 0));

            expect(mockWaterPlant).toHaveBeenCalledTimes(2);
            expect(mockWaterPlant).toHaveBeenCalledWith('p1', 0.75, undefined, undefined);
            expect(mockWaterPlant).toHaveBeenCalledWith('p2', 0.75, undefined, undefined);

            // Restore
            mockDevice.plants = originalPlants;
        });

        it('should not show recommendations for heterogeneous plant stages', async () => {
            // Add a second plant with different stage
            const originalPlants = mockDevice.plants;
            mockDevice.plants = [
                {
                    entity_id: 'sensor.plant1',
                    attributes: { plant_id: 'p1', stage: 'veg', days_in_stage: 10 } as any,
                    state: 'ok',
                    last_updated: '',
                    last_changed: '',
                    context: { id: '3', parent_id: null, user_id: null }
                },
                {
                    entity_id: 'sensor.plant2',
                    attributes: { plant_id: 'p2', stage: 'flower', days_in_stage: 5 } as any,
                    state: 'ok',
                    last_updated: '',
                    last_changed: '',
                    context: { id: '4', parent_id: null, user_id: null }
                }
            ];

            element.open = true;
            element.dialogState = {
                growspaceId: 'gs1',
                mode: 'plant',
                plantIds: ['p1', 'p2']
            };
            await element.updateComplete;

            // When stages are mixed, no preset should be marked as recommended
            const select = element.shadowRoot?.querySelector('md3-select') as any;
            const option = select.options.find((o: any) => o.value === 'veg1');
            expect(option?.label).not.toContain('⭐');

            // Restore
            mockDevice.plants = originalPlants;
        });

        it('should handle preset with min_days_in_stage requirement', async () => {
            // Add a preset with min_days_in_stage
            mockStore.data.$nutrientPresets.get = () => ({
                'veg1': mockPreset,
                'late-veg': {
                    id: 'late-veg',
                    name: 'Late Veg',
                    stage: 'veg',
                    nutrients: [{ name: 'Bloom', dose_ml_l: 3 }],
                    min_days_in_stage: 20
                }
            });

            element.open = true;
            element.dialogState = {
                growspaceId: 'gs1',
                mode: 'plant',
                plantIds: ['p1'] // days_in_stage is 10
            };
            await element.updateComplete;

            // veg1 has no min_days requirement, should be recommended
            const select = element.shadowRoot?.querySelector('md3-select') as any;
            const veg1Option = select.options.find((o: any) => o.value === 'veg1');
            expect(veg1Option?.label).toContain('⭐');

            // late-veg requires 20 days, plant has 10, should NOT be recommended
            const lateVegOption = select.options.find((o: any) => o.value === 'late-veg');
            expect(lateVegOption?.label).not.toContain('⭐');

            // Restore
            mockStore.data.$nutrientPresets.get = () => ({ 'veg1': mockPreset });
        });

        it('should handle preset lookup when growspaceId is missing', async () => {
            element.open = true;
            element.dialogState = {
                growspaceId: undefined as any,
                mode: 'growspace'
            };
            await element.updateComplete;

            // Should not crash, preset select should still render
            const select = element.shadowRoot?.querySelector('md3-select');
            expect(select).toBeTruthy();
        });

        it('should handle empty plants array in device', async () => {
            const originalPlants = mockDevice.plants;
            mockDevice.plants = [];

            element.open = true;
            element.dialogState = {
                growspaceId: 'gs1',
                mode: 'plant',
                plantIds: ['nonexistent']
            };
            await element.updateComplete;

            // Should not crash
            const select = element.shadowRoot?.querySelector('md3-select');
            expect(select).toBeTruthy();

            // Restore
            mockDevice.plants = originalPlants;
        });

        it('should handle plant_id fallback to entity_id in recommendations', async () => {
            // Mock plant without plant_id but with entity_id
            const originalPlants = mockDevice.plants;
            mockDevice.plants = [
                {
                    entity_id: 'sensor.p1_entity',
                    attributes: { stage: 'veg', days_in_stage: 10 } as any,
                    state: 'ok',
                    last_updated: '',
                    last_changed: '',
                    context: { id: '5', parent_id: null, user_id: null }
                }
            ];

            element.open = true;
            element.dialogState = {
                growspaceId: 'gs1',
                mode: 'plant',
                plantIds: ['p1_entity'] // should match entity_id.replace('sensor.', '')
            };
            await element.updateComplete;

            const select = element.shadowRoot?.querySelector('md3-select') as any;
            const option = select.options.find((o: any) => o.value === 'veg1');
            expect(option?.label).toContain('⭐');

            // Restore
            mockDevice.plants = originalPlants;
        });

        it('should handle missing days_in_stage in recommendations', async () => {
            const originalPlants = mockDevice.plants;
            mockDevice.plants = [
                {
                    entity_id: 'sensor.plant1',
                    attributes: { plant_id: 'p1', stage: 'veg' } as any, // missing days_in_stage
                    state: 'ok',
                    last_updated: '',
                    last_changed: '',
                    context: { id: '6', parent_id: null, user_id: null }
                }
            ];

            element.open = true;
            element.dialogState = {
                growspaceId: 'gs1',
                mode: 'plant',
                plantIds: ['p1']
            };
            await element.updateComplete;

            const select = element.shadowRoot?.querySelector('md3-select') as any;
            const option = select.options.find((o: any) => o.value === 'veg1');
            expect(option?.label).toContain('⭐');

            // Restore
            mockDevice.plants = originalPlants;
        });
    });

    describe('Nutrient Suggestions Edge Cases', () => {
        it('should return empty suggestions if store is missing', () => {
            (element as any).store = undefined;
            const suggestions = (element as any)._getNutrientSuggestions();
            expect(suggestions).toEqual([]);
        });

        it('should return empty suggestions if store data is missing', () => {
            (element as any).store.data = undefined;
            const suggestions = (element as any)._getNutrientSuggestions();
            expect(suggestions).toEqual([]);
        });

        it('should skip devices without nutrient presets', () => {
            mockStore.data.$nutrientPresets.get = () => ({});

            const suggestions = (element as any)._getNutrientSuggestions();
            expect(suggestions).toEqual([]);

            mockStore.data.$nutrientPresets.get = () => ({ 'veg1': mockPreset });
        });

        it('should skip nutrients without names', () => {
            mockStore.data.$nutrientPresets.get = () => ({
                'bad-preset': {
                    nutrients: [{ name: '', dose_ml_l: 5 }]
                }
            } as any);

            const suggestions = (element as any)._getNutrientSuggestions();
            expect(suggestions).toEqual([]);

            mockStore.data.$nutrientPresets.get = () => ({ 'veg1': mockPreset });
        });
    });

    describe('Ultimate Branch Coverage', () => {
        it('should return early in _submit if dataService or dialogState missing', async () => {
            (element as any)._dataService = null;
            await (element as any)._submit();
            expect(mockWaterPlant).not.toHaveBeenCalled();

            (element as any)._dataService = { waterPlant: mockWaterPlant };
            element.dialogState = undefined;
            await (element as any)._submit();
            expect(mockWaterPlant).not.toHaveBeenCalled();
        });

        it('should fallback to 0 for invalid volume', async () => {
            element.open = true;
            await element.updateComplete;
            const volInput = element.shadowRoot?.querySelector('md3-number-input[label="Volume (Liters)"]') as any;

            volInput.dispatchEvent(new CustomEvent('change', { detail: 'invalid' }));
            expect((element as any)._volume).toBe(0);
        });

        it('should fallback to 0 for invalid nutrient concentration', async () => {
            element.open = true;
            await element.updateComplete;
            (element as any)._addNutrient();
            await element.updateComplete;

            const concInput = element.shadowRoot?.querySelector('md3-number-input[label="ml/L"]') as any;
            concInput.dispatchEvent(new CustomEvent('change', { detail: 'invalid' }));
            expect((element as any)._nutrients[0].concentration).toBe(0);
        });

        it('should handle name change with target value fallback', async () => {
            element.open = true;
            await element.updateComplete;
            (element as any)._addNutrient();
            await element.updateComplete;

            const nameInput = element.shadowRoot?.querySelector('md3-text-input[label="Nutrient Name"]') as any;
            // Mock target.value
            Object.defineProperty(nameInput, 'value', { value: 'TargetVal' });

            nameInput.dispatchEvent(new CustomEvent('change', { detail: '' }));
            expect((element as any)._nutrients[0].name).toBe('TargetVal');
        });
        it('should handle non-existent preset ID in _handlePresetChange', async () => {
            element.open = true;
            await element.updateComplete;

            const select = element.shadowRoot?.querySelector('md3-select') as any;
            select.dispatchEvent(new CustomEvent('change', { detail: 'non-existent' }));
            await element.updateComplete;

            // Should not crash and nutrients should remain empty (or unchanged from initial)
            expect((element as any)._nutrients.length).toBe(0);
        });

        it('should render nothing in _renderPresetOptions if presets are missing', async () => {
            mockStore.data.$nutrientPresets.get = () => null;
            element.open = true;
            await element.updateComplete;

            const select = element.shadowRoot?.querySelector('md3-select') as any;
            // If presets are null, only the "Manual" option should be there
            expect(select?.options?.length).toBe(1);
        });

        it('should handle missing selectedDevice in _renderPresetOptions', async () => {
            mockStore.data.$devices.get = () => []; // No devices
            element.open = true;
            element.dialogState = {
                growspaceId: 'gs1',
                mode: 'plant',
                plantIds: ['p1']
            };
            await element.updateComplete;

            const select = element.shadowRoot?.querySelector('md3-select') as any;
            expect(select).toBeTruthy();
            // Should not crash and should not show recommendations
            const anyRecommended = select?.options?.some((o: any) => o.label.includes('⭐'));
            expect(anyRecommended).toBe(false);
        });
    });
});
