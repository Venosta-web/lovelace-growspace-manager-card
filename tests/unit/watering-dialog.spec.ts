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
        nutrient_presets: {
            'veg1': mockPreset
        },
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
                    get: () => [mockDevice]
                }
            },
            showToast: vi.fn(),
            refreshData: vi.fn()
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

        const addBtn = element.shadowRoot?.querySelector('.add-nutrient-btn') as HTMLElement;
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

        const select = element.shadowRoot?.querySelector('select') as HTMLSelectElement;
        select.value = 'veg1';
        select.dispatchEvent(new Event('change'));
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
        const select = element.shadowRoot?.querySelector('select') as HTMLSelectElement;
        select.value = 'veg1';
        select.dispatchEvent(new Event('change'));
        await element.updateComplete;
        expect((element as any)._nutrients.length).toBe(2);

        // Deselect
        select.value = '';
        select.dispatchEvent(new Event('change'));
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
            expect(mockStore.showToast).toHaveBeenCalledWith(expect.stringContaining('Watered 1 plant'), 'success');
            expect(mockStore.refreshData).toHaveBeenCalled();
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

            const option = element.shadowRoot?.querySelector('option[value="veg1"]');
            expect(option?.textContent).toContain('⭐ (Recommended)');
        });

        it('should not recommend if stage mismatch', async () => {
            // Change plant stage
            mockDevice.plants![0].attributes.stage = 'flower';

            // Refresh mock
            mockStore.data.$devices.get = () => [mockDevice];

            element.open = true;
            element.dialogState = {
                growspaceId: 'gs1',
                mode: 'plant',
                plantIds: ['p1']
            };
            await element.requestUpdate(); // Force re-render with new data
            await element.updateComplete;

            const option = element.shadowRoot?.querySelector('option[value="veg1"]');
            expect(option?.textContent).not.toContain('⭐');

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
            expect(mockWaterPlant).toHaveBeenCalledWith('p1', 1.5, undefined, undefined);
            expect(mockWaterPlant).toHaveBeenCalledWith('p2', 1.5, undefined, undefined);
            expect(mockStore.showToast).toHaveBeenCalledWith('Watered 2 plant(s)', 'success');

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
            const option = element.shadowRoot?.querySelector('option[value="veg1"]');
            expect(option?.textContent).not.toContain('⭐');

            // Restore
            mockDevice.plants = originalPlants;
        });

        it('should handle preset with min_days_in_stage requirement', async () => {
            // Add a preset with min_days_in_stage
            const originalPresets = mockDevice.nutrient_presets;
            mockDevice.nutrient_presets = {
                'veg1': mockPreset,
                'late-veg': {
                    id: 'late-veg',
                    name: 'Late Veg',
                    stage: 'veg',
                    nutrients: [{ name: 'Bloom', dose_ml_l: 3 }],
                    // target_ec removed as it is not in NutrientPreset interface
                    min_days_in_stage: 20
                }
            };

            element.open = true;
            element.dialogState = {
                growspaceId: 'gs1',
                mode: 'plant',
                plantIds: ['p1'] // days_in_stage is 10
            };
            await element.updateComplete;

            // veg1 has no min_days requirement, should be recommended
            const veg1Option = element.shadowRoot?.querySelector('option[value="veg1"]');
            expect(veg1Option?.textContent).toContain('⭐');

            // late-veg requires 20 days, plant has 10, should NOT be recommended
            const lateVegOption = element.shadowRoot?.querySelector('option[value="late-veg"]');
            expect(lateVegOption?.textContent).not.toContain('⭐');

            // Restore
            mockDevice.nutrient_presets = originalPresets;
        });

        it('should handle preset lookup when growspaceId is missing', async () => {
            element.open = true;
            element.dialogState = {
                growspaceId: undefined as any,
                mode: 'growspace'
            };
            await element.updateComplete;

            // Should not crash, preset select should still render
            const select = element.shadowRoot?.querySelector('select');
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
            const select = element.shadowRoot?.querySelector('select');
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

            const option = element.shadowRoot?.querySelector('option[value="veg1"]');
            expect(option?.textContent).toContain('⭐');

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

            // Should use 0 as fallback for days_in_stage
            const option = element.shadowRoot?.querySelector('option[value="veg1"]');
            expect(option?.textContent).toContain('⭐');

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
            const originalPresets = mockDevice.nutrient_presets;
            mockDevice.nutrient_presets = undefined;

            const suggestions = (element as any)._getNutrientSuggestions();
            expect(suggestions).toEqual([]);

            mockDevice.nutrient_presets = originalPresets;
        });

        it('should skip nutrients without names', () => {
            const originalPresets = mockDevice.nutrient_presets;
            mockDevice.nutrient_presets = {
                'bad-preset': {
                    nutrients: [{ name: '', dose_ml_l: 5 }]
                }
            } as any;

            const suggestions = (element as any)._getNutrientSuggestions();
            expect(suggestions).toEqual([]);

            mockDevice.nutrient_presets = originalPresets;
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
    });
});
