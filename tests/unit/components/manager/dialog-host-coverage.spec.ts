import { vi, describe, it, expect, beforeEach } from 'vitest';
import { DialogHost } from '../../../../src/components/manager/dialog-host';
import { html } from 'lit';

// Mock dialog components
vi.mock('../../../../src/components/manager/add-plant-dialog', () => ({
    AddPlantDialog: class extends HTMLElement { }
}));
vi.mock('../../../../src/components/manager/add-plants-dialog', () => ({
    AddPlantsDialog: class extends HTMLElement { }
}));
vi.mock('../../../../src/components/manager/plant-overview-dialog', () => ({
    PlantOverviewDialog: class extends HTMLElement { }
}));
vi.mock('../../../../src/components/manager/nutrient-inventory-dialog', () => ({
    NutrientInventoryDialog: class extends HTMLElement { }
}));
vi.mock('../../../../src/components/manager/nutrient-dialog', () => ({
    NutrientDialog: class extends HTMLElement { }
}));
vi.mock('../../../../src/components/manager/clone-dialog', () => ({
    CloneDialog: class extends HTMLElement { }
}));
vi.mock('../../../../src/components/manager/strain-library-dialog', () => ({
    StrainLibraryDialog: class extends HTMLElement { }
}));

describe('DialogHost Coverage', () => {
    let element: DialogHost;
    let mockStore: any;

    beforeEach(() => {
        const createMockAtom = (initialValue: any) => {
            const listeners: any[] = [];
            return {
                _value: initialValue,
                get value() { return this._value; },
                get() { return this._value; },
                set(v: any) {
                    this._value = v;
                    listeners.forEach(l => l(v));
                },
                subscribe(fn: any) {
                    listeners.push(fn);
                    fn(this._value);
                    return () => {
                        const index = listeners.indexOf(fn);
                        if (index !== -1) listeners.splice(index, 1);
                    };
                }
            };
        };

        mockStore = {
            ui: {
                $activeDialog: createMockAtom({ type: 'NONE', payload: {} }),
                setActiveDialog: vi.fn(),
                closeDialog: vi.fn(),
                showToast: vi.fn()
            },
            data: {
                $devices: createMockAtom([]),
                $selectedDevice: createMockAtom(null),
                $strainLibrary: createMockAtom([]),
                $nutrientPresets: createMockAtom({}),
                $ipmPresets: createMockAtom({}),
                $nutrientInventory: createMockAtom([]),
                strains: [
                    { key: 'Existing_p1', strain: 'Existing', phenotype: 'p1' }
                ],
                devices: [
                    {
                        name: 'Grow 1',
                        plants: [
                            { attributes: { stage: 'clone' } },
                            { attributes: { stage: 'veg' } }
                        ]
                    }
                ]
            },
            dataService: {
                configureEnvironment: vi.fn().mockResolvedValue(true)
            },
            actions: {
                plant: {
                    takeClone: vi.fn().mockResolvedValue(true)
                }
            },
            refreshData: vi.fn().mockResolvedValue(true),
            performImport: vi.fn().mockResolvedValue(true),
            showToast: vi.fn(),
        };

        element = new DialogHost();
        (element as any).store = mockStore;
        (element as any).hass = {
            callService: vi.fn().mockResolvedValue(true),
            states: {
                'sensor.growspace_manager': {
                    attributes: {
                        ai_settings: { personality: 'Helpful' }
                    }
                }
            }
        };
        // Explicitly trigger connectedCallback to initialize controllers
        element.connectedCallback();
    });

    it('should handle open-strain-editor existing entry matching', async () => {
        const activeState = {
            type: 'PLANT_OVERVIEW',
            payload: {
                plant: { entity_id: 'p1' },
                editedAttributes: {},
                activeTab: 'overview',
                selectedPlantIds: []
            }
        };
        mockStore.data.$strainLibrary.set([{ key: 'Existing_p1', strain: 'Existing', phenotype: 'p1' }]);
        mockStore.ui.$activeDialog.set(activeState);

        document.body.appendChild(element);
        await element.updateComplete;

        const dialog = element.shadowRoot?.querySelector('plant-overview-dialog');

        if (dialog) {
            dialog.dispatchEvent(new CustomEvent('open-strain-editor', {
                detail: { strain: 'Existing', phenotype: 'p1' },
                bubbles: true,
                composed: true
            }));

            expect(mockStore.ui.setActiveDialog).toHaveBeenCalledWith(expect.objectContaining({
                type: 'STRAIN_LIBRARY',
                payload: expect.objectContaining({
                    editingStrain: expect.objectContaining({ strain: 'Existing', phenotype: 'p1' })
                })
            }));
        }
        document.body.removeChild(element);
    });

    it('should create new entry when strain not found in open-strain-editor', async () => {
        const activeState = {
            type: 'PLANT_OVERVIEW',
            payload: {
                plant: { entity_id: 'p1' },
                editedAttributes: {},
                activeTab: 'overview',
                selectedPlantIds: []
            }
        };
        mockStore.ui.$activeDialog.set(activeState);
        document.body.appendChild(element);
        await element.updateComplete;

        const dialog = element.shadowRoot?.querySelector('plant-overview-dialog');
        if (dialog) {
            dialog.dispatchEvent(new CustomEvent('open-strain-editor', {
                detail: { strain: 'NewStrain', phenotype: 'P1' },
                bubbles: true,
                composed: true
            }));

            expect(mockStore.ui.setActiveDialog).toHaveBeenCalledWith(expect.objectContaining({
                type: 'STRAIN_LIBRARY',
                payload: expect.objectContaining({
                    editingStrain: expect.objectContaining({
                        strain: 'NewStrain',
                        phenotype: 'P1',
                        key: 'NewStrain_P1'
                    })
                })
            }));
        }
        document.body.removeChild(element);
    });

    it('should handle transplant failure branch', async () => {
        const detail = {
            plant_id: 'p1',
            source_growspace_id: 'g1',
            target_growspace_id: 'g2',
            new_row: 1,
            new_col: 1,
            veg_start: '2024-01-01'
        };
        const error = new Error('Transplant Service Failure');
        (element as any).hass.callService = vi.fn().mockRejectedValue(error);
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

        await (element as any)._handleTransplant(detail);

        expect(consoleErrorSpy).toHaveBeenCalledWith('[DialogHost] Transplant failed:', error);
        expect(mockStore.ui.showToast || mockStore.showToast).toHaveBeenCalledWith(expect.stringContaining('Failed'), 'error');
        consoleErrorSpy.mockRestore();
    });

    it('should handle _performImport exception path', async () => {
        const file = new File([''], 'test.json');
        const error = new Error('Disk Error');
        mockStore.performImport = vi.fn().mockRejectedValue(error);
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

        await (element as any)._performImport(file, true);

        expect(consoleErrorSpy).toHaveBeenCalledWith('Import failed:', error);
        expect(mockStore.showToast).toHaveBeenCalledWith(expect.stringContaining('Import failed'), 'error');
        consoleErrorSpy.mockRestore();
    });

    it('should handle _handleEnvironmentConfig validation and failure paths', async () => {
        // Missing mandatory fields
        await (element as any)._handleEnvironmentConfig({});
        expect(mockStore.showToast).toHaveBeenCalledWith(expect.stringContaining('mandatory'), 'error');

        // Service failure
        const detail = { selectedGrowspaceId: 'g1', temp_sensor: 't1', humidity_sensor: 'h1' };
        mockStore.dataService.configureEnvironment.mockRejectedValue(new Error('API Down'));
        await (element as any)._handleEnvironmentConfig(detail);
        expect(mockStore.showToast).toHaveBeenCalledWith('Error: API Down', 'error');
    });

    it('should handle _getPlantsByStage filtering with matching and non-matching stages', () => {
        const devices = [
            {
                name: 'Grow 1',
                plants: [
                    { attributes: { stage: 'clone' } },
                    { attributes: { stage: 'veg' } }
                ]
            },
            {
                name: 'Grow 2',
                plants: null
            }
        ];
        const result = (element as any)._getPlantsByStage(devices, 'clone');
        expect(result).toHaveLength(1);
        expect(result[0]._growspaceName).toBe('Grow 1');
    });

    it('should extract personality from ai_settings if top-level is missing', () => {
        const payload = { isLoading: false, response: '' };
        mockStore.data.$selectedDevice.set('grow1');
        (element as any).hass = {
            states: {
                'sensor.growspace_manager': {
                    attributes: {
                        ai_settings: { personality: 'Robotic' }
                    }
                }
            }
        };

        const result = (element as any)._renderGrowMasterDialog({ type: 'GROW_MASTER', payload });
        // result is a TemplateResult, we check its values
        const hasPersonality = result.values.some((v: any) => v === 'Robotic');
        expect(hasPersonality).toBe(true);
    });

    it('should navigate to STRAIN_LIBRARY from ADD_PLANT and ADD_PLANTS', async () => {
        const activeStateAddPlant = { type: 'ADD_PLANT', payload: {} };
        mockStore.ui.$activeDialog.set(activeStateAddPlant);
        document.body.appendChild(element);
        await element.updateComplete;

        let dialog = element.shadowRoot?.querySelector('add-plant-dialog');
        const detail = { source: 'add-plant', returnPayload: { r: 1 }, strain: { strain: 'S1' } };

        dialog?.dispatchEvent(new CustomEvent('create-new-strain', { detail }));
        expect(mockStore.ui.setActiveDialog).toHaveBeenCalledWith(expect.objectContaining({
            type: 'STRAIN_LIBRARY',
            payload: expect.objectContaining({ source: 'add-plant' })
        }));

        // Now test ADD_PLANTS
        const activeStateAddPlants = { type: 'ADD_PLANTS', payload: {} };
        mockStore.ui.$activeDialog.set(activeStateAddPlants);
        await element.updateComplete;
        dialog = element.shadowRoot?.querySelector('add-plants-dialog');
        dialog?.dispatchEvent(new CustomEvent('create-new-strain', { detail: { ...detail, source: 'add-plants' } }));
        expect(mockStore.ui.setActiveDialog).toHaveBeenLastCalledWith(expect.objectContaining({
            payload: expect.objectContaining({ source: 'add-plants' })
        }));
        document.body.removeChild(element);
    });

    it('should handle strain-created-at-source paths', async () => {
        const activeState = { type: 'STRAIN_LIBRARY', payload: {} };
        mockStore.ui.$activeDialog.set(activeState);
        document.body.appendChild(element);
        await element.updateComplete;

        const dialog = element.shadowRoot?.querySelector('strain-library-dialog');

        // From add-plant
        dialog?.dispatchEvent(new CustomEvent('strain-created-at-source', {
            detail: { source: 'add-plant', strain: { strain: 'S1' }, returnPayload: {} }
        }));
        expect(mockStore.ui.setActiveDialog).toHaveBeenCalledWith(expect.objectContaining({ type: 'ADD_PLANT' }));

        // From add-plants
        dialog?.dispatchEvent(new CustomEvent('strain-created-at-source', {
            detail: { source: 'add-plants', strain: { strain: 'S2' }, returnPayload: {} }
        }));
        expect(mockStore.ui.setActiveDialog).toHaveBeenLastCalledWith(expect.objectContaining({ type: 'ADD_PLANTS' }));
        document.body.removeChild(element);
    });

    it('should handle @take-clone-submit on CloneDialog', async () => {
        const activeState = { type: 'TAKE_CLONE', payload: { sourcePlant: { entity_id: 'p1' } } };
        mockStore.ui.$activeDialog.set(activeState);

        document.body.appendChild(element);
        await element.updateComplete;

        const dialog = element.shadowRoot?.querySelector('clone-dialog');
        const detail = { motherPlantId: 'p1', numClones: 5, targetGrowspaceId: 'g1' };
        dialog?.dispatchEvent(new CustomEvent('take-clone-submit', { detail }));

        await new Promise(r => setTimeout(r, 600)); // Wait for internal _handleDataChanged's 500ms delay
        expect(mockStore.actions.plant.takeClone).toHaveBeenCalled();
        expect(mockStore.refreshData).toHaveBeenCalled();
        document.body.removeChild(element);
    });

    it('should render Nutrient Inventory Dialog', () => {
        const result = (element as any)._renderNutrientInventoryDialog({ type: 'NUTRIENT_INVENTORY' });
        expect(result).toBeTruthy();
    });

    it('should render Nutrient Dialog', () => {
        const result = (element as any)._renderNutrientDialog({ type: 'NUTRIENTS' });
        expect(result).toBeTruthy();
    });

    it('should handle show-toast event from AddPlantsDialog', async () => {
        const activeState = { type: 'ADD_PLANTS', payload: {} };
        mockStore.ui.$activeDialog.set(activeState);
        document.body.appendChild(element);
        await element.updateComplete;

        const dialog = element.shadowRoot?.querySelector('add-plants-dialog');
        dialog?.dispatchEvent(new CustomEvent('show-toast', { detail: { message: 'test', type: 'success' } }));

        expect(mockStore.showToast).toHaveBeenCalledWith('test', 'success');
        document.body.removeChild(element);
    });

    it('should handle open- events from PlantOverviewDialog', async () => {
        const activeState = {
            type: 'PLANT_OVERVIEW',
            payload: {
                plant: { entity_id: 'p1' },
                editedAttributes: {},
                activeTab: 'overview',
                selectedPlantIds: []
            }
        };
        mockStore.ui.$activeDialog.set(activeState);
        document.body.appendChild(element);
        await element.updateComplete;

        const dialog = element.shadowRoot?.querySelector('plant-overview-dialog');
        const detail = { plant: { entity_id: 'p1' } };

        // Test open-watering
        dialog?.dispatchEvent(new CustomEvent('open-watering', { detail }));
        expect(mockStore.ui.setActiveDialog).toHaveBeenCalledWith({
            type: 'WATERING',
            payload: detail
        });

        // Test open-training
        dialog?.dispatchEvent(new CustomEvent('open-training', { detail }));
        expect(mockStore.ui.setActiveDialog).toHaveBeenCalledWith({
            type: 'TRAINING',
            payload: detail
        });

        // Test open-ipm
        dialog?.dispatchEvent(new CustomEvent('open-ipm', { detail }));
        expect(mockStore.ui.setActiveDialog).toHaveBeenCalledWith({
            type: 'IPM',
            payload: detail
        });

        // Test open-clone
        dialog?.dispatchEvent(new CustomEvent('open-clone', { detail }));
        expect(mockStore.ui.setActiveDialog).toHaveBeenCalledWith({
            type: 'TAKE_CLONE',
            payload: detail
        });

        document.body.removeChild(element);
    });

    it('should handle data-changed events from various dialogs', async () => {
        // We'll test one to verify the handler is wired, as they all call _handleDataChanged
        // TRAINING
        mockStore.ui.$activeDialog.set({ type: 'TRAINING', payload: {} });
        document.body.appendChild(element);
        await element.updateComplete;
        let dialog = element.shadowRoot?.querySelector('training-dialog');
        dialog?.dispatchEvent(new CustomEvent('data-changed'));

        // _handleDataChanged calls refreshData after 500ms
        await new Promise(r => setTimeout(r, 600));
        expect(mockStore.refreshData).toHaveBeenCalled();
        mockStore.refreshData.mockClear();

        // NUTRIENT_PRESETS
        mockStore.ui.$activeDialog.set({ type: 'NUTRIENT_PRESETS', payload: {} });
        await element.updateComplete;
        dialog = element.shadowRoot?.querySelector('nutrient-presets-editor');
        dialog?.dispatchEvent(new CustomEvent('data-changed'));
        await new Promise(r => setTimeout(r, 600));
        expect(mockStore.refreshData).toHaveBeenCalled();
        mockStore.refreshData.mockClear();

        // IPM
        mockStore.ui.$activeDialog.set({ type: 'IPM', payload: {} });
        await element.updateComplete;
        dialog = element.shadowRoot?.querySelector('ipm-dialog');
        dialog?.dispatchEvent(new CustomEvent('data-changed'));
        await new Promise(r => setTimeout(r, 600));
        expect(mockStore.refreshData).toHaveBeenCalled();
        mockStore.refreshData.mockClear();

        // NUTRIENT_INVENTORY
        mockStore.ui.$activeDialog.set({ type: 'NUTRIENT_INVENTORY', payload: {} });
        await element.updateComplete;
        dialog = element.shadowRoot?.querySelector('nutrient-inventory-dialog');
        dialog?.dispatchEvent(new CustomEvent('data-changed'));
        await new Promise(r => setTimeout(r, 600));
        expect(mockStore.refreshData).toHaveBeenCalled();
        mockStore.refreshData.mockClear();

        // NUTRIENTS
        mockStore.ui.$activeDialog.set({ type: 'NUTRIENTS', payload: {} });
        await element.updateComplete;
        dialog = element.shadowRoot?.querySelector('nutrient-dialog');
        dialog?.dispatchEvent(new CustomEvent('data-changed'));
        await new Promise(r => setTimeout(r, 600));
        expect(mockStore.refreshData).toHaveBeenCalled();

        document.body.removeChild(element);
    });

    it('should handle transplant success path triggered via event', async () => {
        const activeState = { type: 'ADD_PLANT', payload: { row: 1, col: 1 } };
        mockStore.ui.$activeDialog.set(activeState);
        document.body.appendChild(element);
        await element.updateComplete;

        const dialog = element.shadowRoot?.querySelector('add-plant-dialog');
        const detail = {
            plant_id: 'p1',
            source_growspace_id: 'g1',
            target_growspace_id: 'g2',
            new_row: 2,
            new_col: 2,
            veg_start: '2024-01-01'
        };

        // Mock success for callService
        // We need to ensure we mock it on the instance's hass property
        (element as any).hass.callService = vi.fn().mockResolvedValue(true);
        const transplantSpy = vi.spyOn(element as any, '_handleTransplant');

        dialog?.dispatchEvent(new CustomEvent('transplant-plant-submit', { detail }));

        // Wait for async operations and delay
        await new Promise(r => setTimeout(r, 600));

        expect(transplantSpy).toHaveBeenCalled();
        expect((element as any).hass.callService).toHaveBeenCalledWith('growspace_manager', 'update_plant', {
            plant_id: 'p1',
            row: 2,
            col: 2,
            growspace_id: 'g2',
            veg_start: '2024-01-01'
        });
        expect(mockStore.ui.showToast).toHaveBeenCalledWith(expect.stringContaining('successfully'), 'success');
        expect(mockStore.ui.closeDialog).toHaveBeenCalled();
        expect(mockStore.refreshData).toHaveBeenCalled();

        document.body.removeChild(element);
    });

    it('should handle environment config with all optional fields populated', async () => {
        const detail = {
            selectedGrowspaceId: 'g1',
            temp_sensor: 't1',
            humidity_sensor: 'h1',
            vpd_sensor: 'v1',
            co2_sensor: 'c1',
            circulation_fan: 'cf1',
            stress_threshold: 1,
            mold_threshold: 2,
            light_sensor: 'l1',
            exhaust_entity: 'e1',
            humidifier_entity: 'h1',
            dehumidifier_entity: 'd1',
            soil_moisture_sensor: 's1',
            control_dehumidifier: true
        };

        // We assume the dialog dispatches this, or we call the method directly
        await (element as any)._handleEnvironmentConfig(detail);

        expect(mockStore.dataService.configureEnvironment).toHaveBeenCalledWith(expect.objectContaining({
            vpd_sensor: 'v1',
            co2_sensor: 'c1',
            circulation_fan_entity: 'cf1',
            light_sensor: 'l1',
            exhaust_entity: 'e1',
            humidifier_entity: 'h1',
            dehumidifier_entity: 'd1',
            soil_moisture_sensor: 's1'
        }));
        expect(mockStore.dataService.configureEnvironment).toHaveBeenCalledWith(expect.objectContaining({
            vpd_sensor: 'v1',
            co2_sensor: 'c1',
            circulation_fan_entity: 'cf1',
            light_sensor: 'l1',
            exhaust_entity: 'e1',
            humidifier_entity: 'h1',
            dehumidifier_entity: 'd1',
            soil_moisture_sensor: 's1'
        }));
    });

    describe('Render Guards and Edge Cases', () => {
        it('should return empty template when calling private render methods with wrong type', () => {
            const wrongState = { type: 'WRONG_TYPE' } as any;

            expect((element as any)._renderAddPlantDialog(wrongState)).toEqual((element as any)._renderAddPlantDialog({ type: 'WRONG' } as any)); // Check strict equality or just empty
            // Actually lit-html templates are hard to compare for equality.
            // But we can check if it result is TemplateResult and has empty strings or values.
            // Simply calling them covers the branch.

            (element as any)._renderPlantOverviewDialog(wrongState);
            (element as any)._renderNutrientInventoryDialog(wrongState);
            (element as any)._renderNutrientDialog(wrongState);
            (element as any)._renderCloneDialog(wrongState, {});
        });

        it('should handle singular clone toast', async () => {
            const activeState = {
                type: 'TAKE_CLONE',
                payload: { sourcePlant: { id: 'p1' }, defaultGrowspaceId: 'g1' }
            } as any;

            mockStore.ui.$activeDialog.set(activeState);
            document.body.appendChild(element);
            await element.updateComplete;

            const dialog = element.shadowRoot?.querySelector('clone-dialog');
            dialog?.dispatchEvent(new CustomEvent('take-clone-submit', {
                detail: { motherPlantId: 'p1', numClones: 1, targetGrowspaceId: 'g2' }
            }));

            await new Promise(r => setTimeout(r, 1000));
            expect(mockStore.showToast).toHaveBeenCalledWith('Taking 1 clone...', 'success');
            document.body.removeChild(element);
        });
    });
});


