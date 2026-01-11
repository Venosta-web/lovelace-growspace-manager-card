
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DialogHost } from '../../../../src/components/manager/dialog-host';
import { html } from 'lit';
import { atom } from 'nanostores';
import { ActiveDialogState } from '../../../../src/ui-state';
import { GrowspaceDevice } from '../../../../src/types';

// Mock styles
vi.mock('../../../../src/styles/shared.styles', () => ({
    sharedStyles: { cssText: '' }
}));
vi.mock('../../../../src/styles/variables', () => ({
    variables: { cssText: '' }
}));

describe('DialogHost', () => {
    let element: DialogHost;
    let mockStore: any;
    let mockHass: any;

    // Local atoms
    const $activeDialog = atom<ActiveDialogState>({ type: 'NONE' });
    const $devices = atom<any[]>([]);
    const $selectedDevice = atom<string | null>(null);
    const $nutrientPresets = atom<Record<string, any>>({});
    const $ipmPresets = atom<Record<string, any>>({});

    beforeEach(() => {
        vi.clearAllMocks();

        // Ensure custom element is defined
        if (!customElements.get('growspace-dialog-host')) {
            customElements.define('growspace-dialog-host', DialogHost);
        }

        element = document.createElement('growspace-dialog-host') as DialogHost;

        mockStore = {
            ui: {
                $activeDialog: $activeDialog,
                closeDialog: vi.fn(),
                setActiveDialog: vi.fn(),
                showToast: vi.fn()
            },
            data: {
                $devices: $devices,
                $selectedDevice: $selectedDevice,
                $strainLibrary: atom([]),
                $nutrientPresets: $nutrientPresets,
                $ipmPresets: $ipmPresets
            },
            actions: {
                plant: {
                    update: vi.fn(),
                    delete: vi.fn(),
                    move: vi.fn(),
                    drop: vi.fn(),
                    nextStage: vi.fn(),
                    takeClone: vi.fn(),
                    updateFromDialog: vi.fn(),
                    add: vi.fn()
                },
                growspace: {
                    add: vi.fn(),
                    update: vi.fn(),
                    remove: vi.fn()
                },
                strain: {
                    add: vi.fn(),
                    remove: vi.fn()
                },
                history: {
                    undo: vi.fn(),
                    redo: vi.fn(),
                    canUndo: vi.fn(),
                    canRedo: vi.fn()
                }
            },
            closeActiveDialog: vi.fn(),
            confirmAddPlant: vi.fn(),
            confirmAddPlants: vi.fn(),
            updatePlantFromDialog: vi.fn(),
            handleDeletePlant: vi.fn(),
            harvestPlant: vi.fn(),
            finishDryingPlant: vi.fn(),
            handleTakeClone: vi.fn(),
            movePlantToGrowspace: vi.fn(),
            addStrain: vi.fn(),
            removeStrain: vi.fn(),
            performImport: vi.fn().mockResolvedValue(undefined),
            handleExportLibrary: vi.fn(),
            openStrainRecommendationDialog: vi.fn(),
            handleAddGrowspace: vi.fn(),
            handleUpdateGrowspace: vi.fn(),
            showToast: vi.fn(),
            dataService: {
                configureEnvironment: vi.fn()
            },
            analyzeGrowspace: vi.fn(),
            getStrainRecommendation: vi.fn(),
            archivePlant: vi.fn(),
            refreshData: vi.fn(),
        };

        (element as any).store = mockStore;

        mockHass = {
            states: {}
        };
        element.hass = mockHass;

        // Reset atoms
        $activeDialog.set({ type: 'NONE' });
        $devices.set([]);
        $selectedDevice.set(null);
        $nutrientPresets.set({});
        $ipmPresets.set({});
    });

    afterEach(() => {
        if (element.isConnected) {
            document.body.removeChild(element);
        }
    });

    it('should be defined', () => {
        expect(element).toBeDefined();
    });

    it('should render nothing when dialog type is NONE', async () => {
        $activeDialog.set({ type: 'NONE' });
        document.body.appendChild(element);
        await element.updateComplete;

        expect(element.shadowRoot?.innerHTML).toContain('<!---->');
    });

    it('should render ADD_PLANT dialog', async () => {
        $activeDialog.set({
            type: 'ADD_PLANT',
            payload: { row: 1, col: 2 }
        });

        document.body.appendChild(element);
        await element.updateComplete;

        const dialog = element.shadowRoot?.querySelector('add-plant-dialog');
        expect(dialog).not.toBeNull();
        expect((dialog as any).row).toBe(1);
    });

    it('should handle ADD_PLANT event', async () => {
        $activeDialog.set({ type: 'ADD_PLANT', payload: { row: 1, col: 1 } });
        document.body.appendChild(element);
        await element.updateComplete;

        const dialog = element.shadowRoot?.querySelector('add-plant-dialog') as HTMLElement;
        const detail = { plant: 'foo' };
        dialog.dispatchEvent(new CustomEvent('add-plant-submit', { detail }));

        expect(mockStore.confirmAddPlant).toHaveBeenCalledWith(detail);
    });

    it('should render PLANT_OVERVIEW dialog', async () => {
        $activeDialog.set({
            type: 'PLANT_OVERVIEW',
            payload: {
                plant: {
                    entity_id: 'sensor.p1',
                    attributes: { plant_id: 'p1', strain: 'Blueberry', stage: 'veg' }
                } as any,
                editedAttributes: { plant_id: 'p1', strain: 'Blueberry', stage: 'veg' } as any,
                activeTab: 'dashboard',
                selectedPlantIds: []
            }
        });

        document.body.appendChild(element);
        await element.updateComplete;

        expect(element.shadowRoot?.querySelector('plant-overview-dialog')).not.toBeNull();
    });

    it('should handle environment config submission', async () => {
        $activeDialog.set({
            type: 'CONFIG',
            payload: {
                currentTab: 'environment',
                environmentData: {
                    selectedGrowspaceId: 'g1'
                } as any
            }
        });
        document.body.appendChild(element);
        await element.updateComplete;

        const dialog = element.shadowRoot?.querySelector('config-dialog') as HTMLElement;
        const detail = {
            selectedGrowspaceId: 'g1',
            temp_sensor: 't1',
            humidity_sensor: 'h1'
        };

        // We fake the private method call internal to dialog host OR just check if handling works
        // The dialog host calls `_handleEnvironmentConfig` which calls `store.dataService.configureEnvironment`

        dialog.dispatchEvent(new CustomEvent('configure-environment-submit', { detail }));

        // Allow async handling
        await new Promise(r => setTimeout(r, 0));

        expect(mockStore.dataService.configureEnvironment).toHaveBeenCalled();
        expect(mockStore.showToast).toHaveBeenCalledWith(expect.stringContaining('successfully'), 'success');
    });

    it('should close dialog when requested', async () => {
        $activeDialog.set({ type: 'ADD_PLANT', payload: { row: 1, col: 1 } });
        document.body.appendChild(element);
        await element.updateComplete;

        const dialog = element.shadowRoot?.querySelector('add-plant-dialog') as HTMLElement;
        dialog.dispatchEvent(new CustomEvent('close'));

        expect(mockStore.ui.closeDialog).toHaveBeenCalled();
    });

    it('should validate environment config missing fields', async () => {
        // Access private method or simulate event
        // Since we can't easily access private methods in tests without casting, 
        // we can trigger the event on the dialog if we could simulate the dialog being open.
        // But simpler is to cast element to any and call the method.
        await (element as any)._handleEnvironmentConfig({});
        expect(mockStore.showToast).toHaveBeenCalledWith(expect.stringContaining('mandatory'), 'error');
    });

    it('should handle environment config API failure', async () => {
        const detail = {
            selectedGrowspaceId: 'g1',
            temp_sensor: 'sensor.temp',
            humidity_sensor: 'sensor.hum'
        };
        (mockStore.dataService.configureEnvironment as any).mockRejectedValue(new Error('Config failed'));

        await (element as any)._handleEnvironmentConfig(detail);

        expect(mockStore.showToast).toHaveBeenCalledWith(expect.stringContaining('Config failed'), 'error');
    });

    it('should render STRAIN_LIBRARY dialog and handle events', async () => {
        $activeDialog.set({ type: 'STRAIN_LIBRARY', payload: {} });
        document.body.appendChild(element);
        await element.updateComplete;

        const dialog = element.shadowRoot?.querySelector('strain-library-dialog') as HTMLElement;
        expect(dialog).toBeTruthy();

        dialog.dispatchEvent(new CustomEvent('save-strain', { detail: { name: 'S1' } }));
        expect(mockStore.actions.strain.add).toHaveBeenCalledWith({ name: 'S1' });

        dialog.dispatchEvent(new CustomEvent('delete-strain', { detail: { key: 'k1' } }));
        expect(mockStore.actions.strain.remove).toHaveBeenCalledWith('k1');

        dialog.dispatchEvent(new CustomEvent('export-library'));
        expect(mockStore.handleExportLibrary).toHaveBeenCalled();

        dialog.dispatchEvent(new CustomEvent('get-recommendation'));
        expect(mockStore.openStrainRecommendationDialog).toHaveBeenCalled();

        // Import
        const file = new File([''], 'test.json');
        dialog.dispatchEvent(new CustomEvent('import-library', { detail: { file, replace: true } }));
        expect(mockStore.performImport).toHaveBeenCalledWith(file, true);

        // Null file import coverage
        await (element as any)._performImport(null);
        expect(mockStore.performImport).toHaveBeenCalledTimes(1); // Still 1
    });

    it('should handle import library failure', async () => {
        vi.mocked(mockStore.performImport).mockRejectedValueOnce(new Error('Import failed'));
        const file = new File([''], 'test.json');
        await (element as any)._performImport(file, false);
        expect(mockStore.showToast).toHaveBeenCalledWith(expect.stringContaining('Import failed'), 'error');
    });

    it('should render GROW_MASTER dialog', async () => {
        $activeDialog.set({ type: 'GROW_MASTER', payload: { isLoading: false, response: '' } as any });
        document.body.appendChild(element);
        await element.updateComplete;
        expect(element.shadowRoot?.querySelector('grow-master-dialog')).toBeTruthy();
    });


    it('should render GROW_MASTER dialog with stress', async () => {
        // Setup mock hass with stress entities
        element.hass = {
            states: {
                'binary_sensor.g1_stress': { state: 'on' },
                'binary_sensor.g1_plants_under_stress': { state: 'off' },
                'sensor.growspace_manager': { attributes: { ai_settings: { personality: 'strict' } } }
            }
        } as any;

        // Connect element first
        document.body.appendChild(element);

        // Update state
        $selectedDevice.set('g1');
        $activeDialog.set({
            type: 'GROW_MASTER',
            payload: { isLoading: false, response: '' } as any
        });

        // Use a small timeout + updateComplete loop to ensure stability
        await new Promise(r => setTimeout(r, 0));
        await element.updateComplete;

        const dialog = element.shadowRoot?.querySelector('grow-master-dialog');
        expect(dialog).toBeTruthy();
        expect((dialog as any).isStressed).toBe(true);
        expect((dialog as any).personality).toBe('strict');

        // Test events
        dialog?.dispatchEvent(new CustomEvent('analyze-growspace', { detail: { query: 'test' } }));
        expect(mockStore.analyzeGrowspace).toHaveBeenCalledWith('test', false);

        dialog?.dispatchEvent(new CustomEvent('analyze-all-growspaces', { detail: { query: 'test' } }));
        expect(mockStore.analyzeGrowspace).toHaveBeenCalledWith('test', true);
    });

    it('should handle connectedCallback without store', () => {
        const el = document.createElement('growspace-dialog-host') as DialogHost;
        // @ts-ignore
        el.store = undefined;
        el.connectedCallback();
        // Should not have initialized controllers
        expect((el as any)._activeDialogController).toBeUndefined();
    });

    it('should map growspace options correctly in render', async () => {
        $devices.set([
            { device_id: 'd1', name: 'Grow 1' } as any,
            { device_id: 'd2', name: 'Grow 2' } as any
        ]);
        $activeDialog.set({
            type: 'CONFIG',
            payload: { currentTab: 'environment', environmentData: {} as any }
        });

        document.body.appendChild(element);
        await element.updateComplete;

        const dialog = element.shadowRoot?.querySelector('config-dialog') as any;
        expect(dialog.growspaceOptions).toEqual({
            'd1': 'Grow 1',
            'd2': 'Grow 2'
        });
    });

    it('should render STRAIN_RECOMMENDATION dialog', async () => {
        $activeDialog.set({ type: 'STRAIN_RECOMMENDATION', payload: { isLoading: false, response: '' } });
        document.body.appendChild(element);
        await element.updateComplete;
        expect(element.shadowRoot?.querySelector('strain-recommendation-dialog')).toBeTruthy();
    });

    it('should render IRRIGATION dialog', async () => {
        $activeDialog.set({ type: 'IRRIGATION', payload: { device: {} as any } });
        document.body.appendChild(element);
        await element.updateComplete;
        expect(element.shadowRoot?.querySelector('irrigation-dialog')).toBeTruthy();
    });

    it('should render LOGBOOK dialog', async () => {
        $activeDialog.set({ type: 'LOGBOOK', payload: { growspaceId: 'g1' } });
        document.body.appendChild(element);
        await element.updateComplete;
        expect(element.shadowRoot?.querySelector('logbook-dialog')).toBeTruthy();
    });

    it('should handle delete-plant event', async () => {
        $activeDialog.set({
            type: 'PLANT_OVERVIEW',
            payload: {
                plant: {
                    entity_id: 'sensor.p1',
                    attributes: { plant_id: 'p1', strain: 'Test', stage: 'veg' }
                } as any,
                activeTab: 'dashboard',
                editedAttributes: {},
                selectedPlantIds: []
            }
        });
        document.body.appendChild(element);
        await element.updateComplete;

        const dialog = element.shadowRoot?.querySelector('plant-overview-dialog');
        const detail = { plantId: 'p1' };
        dialog?.dispatchEvent(new CustomEvent('delete-plant', { detail }));

        expect(mockStore.actions.plant.delete).toHaveBeenCalledWith('p1');
        // It does NOT automatically close dialog in the listener, it just calls store handler.
        // Store handler might close it.
    });

    it('should handle close event on IRRIGATION dialog', async () => {
        $activeDialog.set({ type: 'IRRIGATION', payload: { device: {} as any } });
        document.body.appendChild(element);
        await element.updateComplete;

        const dialog = element.shadowRoot?.querySelector('irrigation-dialog');
        dialog?.dispatchEvent(new CustomEvent('close'));

        expect(mockStore.ui.closeDialog).toHaveBeenCalled();
    });

    it('should handle closed event on IRRIGATION dialog', async () => {
        $activeDialog.set({ type: 'IRRIGATION', payload: { device: {} as any } });
        document.body.appendChild(element);
        await element.updateComplete;

        const dialog = element.shadowRoot?.querySelector('irrigation-dialog');
        dialog?.dispatchEvent(new CustomEvent('closed'));

        expect(mockStore.ui.closeDialog).toHaveBeenCalled();
    });

    it('should handle close event on LOGBOOK dialog', async () => {
        $activeDialog.set({ type: 'LOGBOOK', payload: { growspaceId: 'g1' } });
        document.body.appendChild(element);
        await element.updateComplete;

        const dialog = element.shadowRoot?.querySelector('logbook-dialog');
        dialog?.dispatchEvent(new CustomEvent('close'));

        expect(mockStore.ui.closeDialog).toHaveBeenCalled();
    });

    it('should handle get-recommendation event on STRAIN_RECOMMENDATION dialog', async () => {
        $activeDialog.set({ type: 'STRAIN_RECOMMENDATION', payload: { isLoading: false, response: '' } });
        document.body.appendChild(element);
        await element.updateComplete;

        const dialog = element.shadowRoot?.querySelector('strain-recommendation-dialog');
        dialog?.dispatchEvent(new CustomEvent('get-recommendation', { detail: { query: 'indica strain' } }));

        expect(mockStore.getStrainRecommendation).toHaveBeenCalledWith('indica strain');
    });

    it('should handle close event on CONFIG dialog', async () => {
        $activeDialog.set({
            type: 'CONFIG',
            payload: { currentTab: 'environment', environmentData: {} as any }
        });
        document.body.appendChild(element);
        await element.updateComplete;

        const dialog = element.shadowRoot?.querySelector('config-dialog');
        dialog?.dispatchEvent(new CustomEvent('close'));

        expect(mockStore.ui.closeDialog).toHaveBeenCalled();
    });

    it('should handle close event on GROW_MASTER dialog', async () => {
        $activeDialog.set({ type: 'GROW_MASTER', payload: { isLoading: false, response: '' } as any });
        document.body.appendChild(element);
        await element.updateComplete;

        const dialog = element.shadowRoot?.querySelector('grow-master-dialog');
        dialog?.dispatchEvent(new CustomEvent('close'));

        expect(mockStore.ui.closeDialog).toHaveBeenCalled();
    });

    it('should handle close event on STRAIN_RECOMMENDATION dialog', async () => {
        $activeDialog.set({ type: 'STRAIN_RECOMMENDATION', payload: { isLoading: false, response: '' } });
        document.body.appendChild(element);
        await element.updateComplete;

        const dialog = element.shadowRoot?.querySelector('strain-recommendation-dialog');
        dialog?.dispatchEvent(new CustomEvent('close'));

        expect(mockStore.ui.closeDialog).toHaveBeenCalled();
    });

    it('should handle close event on PLANT_OVERVIEW dialog', async () => {
        $activeDialog.set({
            type: 'PLANT_OVERVIEW',
            payload: {
                plant: {
                    entity_id: 'sensor.p1',
                    attributes: { plant_id: 'p1', strain: 'Test', stage: 'veg' }
                } as any,
                activeTab: 'dashboard',
                editedAttributes: {},
                selectedPlantIds: []
            }
        });
        document.body.appendChild(element);
        await element.updateComplete;

        const dialog = element.shadowRoot?.querySelector('plant-overview-dialog');
        dialog?.dispatchEvent(new CustomEvent('close'));

        expect(mockStore.ui.closeDialog).toHaveBeenCalled();
    });

    it('should handle update-plant event on PLANT_OVERVIEW dialog', async () => {
        $activeDialog.set({
            type: 'PLANT_OVERVIEW',
            payload: {
                plant: {
                    entity_id: 'sensor.p1',
                    attributes: { plant_id: 'p1', strain: 'Test', stage: 'veg' }
                } as any,
                activeTab: 'dashboard',
                editedAttributes: {},
                selectedPlantIds: ['p1']
            }
        });
        document.body.appendChild(element);
        await element.updateComplete;

        const dialog = element.shadowRoot?.querySelector('plant-overview-dialog');
        const updatedAttrs = { strain: 'Updated Strain' };
        dialog?.dispatchEvent(new CustomEvent('update-plant', { detail: updatedAttrs }));

        expect(mockStore.updatePlantFromDialog).toHaveBeenCalledWith(expect.objectContaining({
            editedAttributes: updatedAttrs,
            selectedPlantIds: ['p1']
        }));
    });

    it('should handle harvest-plant event on PLANT_OVERVIEW dialog', async () => {
        $activeDialog.set({
            type: 'PLANT_OVERVIEW',
            payload: {
                plant: {
                    entity_id: 'sensor.p1',
                    attributes: { plant_id: 'p1', strain: 'Test', stage: 'flower' }
                } as any,
                activeTab: 'dashboard',
                editedAttributes: {},
                selectedPlantIds: []
            }
        });
        document.body.appendChild(element);
        await element.updateComplete;

        const mockPlant = { entity_id: 'sensor.p1' } as any;
        const dialog = element.shadowRoot?.querySelector('plant-overview-dialog');
        dialog?.dispatchEvent(new CustomEvent('harvest-plant', { detail: { plant: mockPlant } }));

        expect(mockStore.actions.plant.nextStage).toHaveBeenCalledWith(mockPlant);
    });

    it('should handle finish-drying event on PLANT_OVERVIEW dialog', async () => {
        $activeDialog.set({
            type: 'PLANT_OVERVIEW',
            payload: {
                plant: {
                    entity_id: 'sensor.p1',
                    attributes: { plant_id: 'p1', strain: 'Test', stage: 'drying' }
                } as any,
                activeTab: 'dashboard',
                editedAttributes: {},
                selectedPlantIds: []
            }
        });
        document.body.appendChild(element);
        await element.updateComplete;

        const mockPlant = { entity_id: 'sensor.p1' } as any;
        const dialog = element.shadowRoot?.querySelector('plant-overview-dialog');
        dialog?.dispatchEvent(new CustomEvent('finish-drying', { detail: { plant: mockPlant } }));

        expect(mockStore.finishDryingPlant).toHaveBeenCalledWith(mockPlant);
    });

    it('should handle take-clone event on PLANT_OVERVIEW dialog', async () => {
        $activeDialog.set({
            type: 'PLANT_OVERVIEW',
            payload: {
                plant: {
                    entity_id: 'sensor.p1',
                    attributes: { plant_id: 'p1', strain: 'Test', stage: 'veg' }
                } as any,
                activeTab: 'dashboard',
                editedAttributes: {},
                selectedPlantIds: []
            }
        });
        document.body.appendChild(element);
        await element.updateComplete;

        const mockPlant = { entity_id: 'sensor.p1' } as any;
        const dialog = element.shadowRoot?.querySelector('plant-overview-dialog');
        dialog?.dispatchEvent(new CustomEvent('take-clone', { detail: { plant: mockPlant, numClones: 3 } }));

        expect(mockStore.actions.plant.takeClone).toHaveBeenCalledWith(mockPlant, 3);
    });
    it('should handle move-clone event on PLANT_OVERVIEW dialog', async () => {
        $activeDialog.set({
            type: 'PLANT_OVERVIEW',
            payload: {
                plant: {
                    entity_id: 'sensor.p1',
                    attributes: { plant_id: 'p1', strain: 'Test', stage: 'veg' }
                } as any,
                activeTab: 'dashboard',
                editedAttributes: {},
                selectedPlantIds: []
            }
        });
        document.body.appendChild(element);
        await element.updateComplete;

        const dialog = element.shadowRoot?.querySelector('plant-overview-dialog');
        const mockPlant = { entity_id: 'sensor.p1' } as any;
        dialog?.dispatchEvent(new CustomEvent('move-clone', { detail: { plant: mockPlant, targetGrowspace: 'g2' } }));

        expect(mockStore.actions.plant.move).toHaveBeenCalledWith(mockPlant, 'g2');
    });

    it('should handle close event on STRAIN_LIBRARY dialog', async () => {
        $activeDialog.set({ type: 'STRAIN_LIBRARY', payload: {} });
        document.body.appendChild(element);
        await element.updateComplete;

        const dialog = element.shadowRoot?.querySelector('strain-library-dialog');
        dialog?.dispatchEvent(new CustomEvent('close'));

        expect(mockStore.ui.closeDialog).toHaveBeenCalled();
    });

    it('should handle add-growspace-submit event on CONFIG dialog', async () => {
        $activeDialog.set({
            type: 'CONFIG',
            payload: { currentTab: 'add_growspace', environmentData: {} as any }
        });
        document.body.appendChild(element);
        await element.updateComplete;

        const dialog = element.shadowRoot?.querySelector('config-dialog');
        const detail = { name: 'New Growspace', rows: 4, cols: 4 };
        dialog?.dispatchEvent(new CustomEvent('add-growspace-submit', { detail }));

        expect(mockStore.actions.growspace.add).toHaveBeenCalledWith(detail);
    });

    it('should handle edit-growspace-submit event on CONFIG dialog', async () => {
        $activeDialog.set({
            type: 'CONFIG',
            payload: { currentTab: 'add_growspace', environmentData: {} as any }
        });
        document.body.appendChild(element);
        await element.updateComplete;

        const dialog = element.shadowRoot?.querySelector('config-dialog');
        const detail = { device_id: 'g1', name: 'Updated Growspace' };
        dialog?.dispatchEvent(new CustomEvent('edit-growspace-submit', { detail }));

        expect(mockStore.actions.growspace.update).toHaveBeenCalledWith(detail);
    });

    // Note: navigate event handler does not exist in DialogHost, so no test needed.

    it('should return empty template for mismatched dialog types in render helpers', async () => {
        const wrongType: ActiveDialogState = { type: 'NONE' };
        expect((element as any)._renderAddPlantDialog(wrongType, [])).toEqual(html``);
        expect((element as any)._renderAddPlantsDialog(wrongType, [], {})).toEqual(html``);

        expect((element as any)._renderPlantOverviewDialog(wrongType, {})).toEqual(html``);
        expect((element as any)._renderStrainLibraryDialog(wrongType, [])).toEqual(html``);
        expect((element as any)._renderConfigDialog(wrongType, {})).toEqual(html``);
        expect((element as any)._renderGrowMasterDialog(wrongType)).toEqual(html``);
        expect((element as any)._renderStrainRecommendationDialog(wrongType)).toEqual(html``);
        expect((element as any)._renderIrrigationDialog(wrongType)).toEqual(html``);
        expect((element as any)._renderLogbookDialog(wrongType)).toEqual(html``);
        expect((element as any)._renderWateringDialog(wrongType)).toEqual(html``);
        expect((element as any)._renderNutrientPresetsDialog(wrongType)).toEqual(html``);
        expect((element as any)._renderTrainingDialog(wrongType)).toEqual(html``);
        expect((element as any)._renderIPMDialog(wrongType)).toEqual(html``);
    });

    it('should return empty template for unknown dialog type', async () => {
        $activeDialog.set({ type: 'UNKNOWN' as any });
        document.body.appendChild(element);
        await element.updateComplete;
        expect(element.render()).toEqual(html``);
    });

    it('should render WATERING dialog', async () => {
        $devices.set([{ device_id: 'g1', name: 'Grow 1' } as any]);
        $selectedDevice.set('g1');
        $activeDialog.set({
            type: 'WATERING',
            payload: {
                growspaceId: 'g1',
                mode: 'growspace'
            }
        });
        document.body.appendChild(element);
        await element.updateComplete;

        const dialog = element.shadowRoot?.querySelector('watering-dialog');
        expect(dialog).toBeTruthy();
        expect((dialog as any).growspaceName).toBe('Grow 1');
    });

    it('should handle close event on WATERING dialog', async () => {
        $activeDialog.set({
            type: 'WATERING',
            payload: { growspaceId: 'g1', mode: 'growspace' }
        });
        document.body.appendChild(element);
        await element.updateComplete;

        const dialog = element.shadowRoot?.querySelector('watering-dialog');
        dialog?.dispatchEvent(new CustomEvent('close'));

        expect(mockStore.ui.closeDialog).toHaveBeenCalled();
    });

    it('should handle data-changed event on WATERING dialog', async () => {
        $activeDialog.set({
            type: 'WATERING',
            payload: { growspaceId: 'g1', mode: 'growspace' }
        });
        document.body.appendChild(element);
        await element.updateComplete;

        const dialog = element.shadowRoot?.querySelector('watering-dialog');
        dialog?.dispatchEvent(new CustomEvent('data-changed'));

        expect(mockStore.refreshData).toHaveBeenCalled();
    });

    it('should render NUTRIENT_PRESETS dialog', async () => {
        $devices.set([{
            device_id: 'g1',
            name: 'Grow 1'
        } as any]);
        $nutrientPresets.set({ 'p1': { id: 'p1', name: 'Preset 1', nutrients: [] } });
        $selectedDevice.set('g1');
        $activeDialog.set({
            type: 'NUTRIENT_PRESETS',
            payload: {}
        });
        document.body.appendChild(element);
        await element.updateComplete;

        const dialog = element.shadowRoot?.querySelector('nutrient-presets-editor');
        expect(dialog).toBeTruthy();
    });

    it('should handle data-changed event on NUTRIENT_PRESETS dialog', async () => {
        $devices.set([{ device_id: 'g1', name: 'Grow 1', nutrient_presets: {} } as any]);
        $selectedDevice.set('g1');
        $activeDialog.set({ type: 'NUTRIENT_PRESETS', payload: {} });
        document.body.appendChild(element);
        await element.updateComplete;

        const dialog = element.shadowRoot?.querySelector('nutrient-presets-editor');
        dialog?.dispatchEvent(new CustomEvent('data-changed'));

        expect(mockStore.refreshData).toHaveBeenCalled();
    });

    it('should render TRAINING dialog', async () => {
        $activeDialog.set({
            type: 'TRAINING',
            payload: { plantIds: ['p1'], growspaceId: 'g1', isOpen: true }
        });
        document.body.appendChild(element);
        await element.updateComplete;

        const dialog = element.shadowRoot?.querySelector('training-dialog');
        expect(dialog).toBeTruthy();

        dialog?.dispatchEvent(new CustomEvent('close'));
        expect(mockStore.ui.closeDialog).toHaveBeenCalled();
    });

    it('should render IPM dialog and handle events', async () => {
        $devices.set([{ device_id: 'g1', name: 'Grow 1' } as any]);
        $ipmPresets.set({});
        $selectedDevice.set('g1');
        $activeDialog.set({
            type: 'IPM',
            payload: { growspaceId: 'g1', plantIds: ['p1'] }
        });
        document.body.appendChild(element);
        await element.updateComplete;

        const dialog = element.shadowRoot?.querySelector('ipm-dialog');
        expect(dialog).toBeTruthy();
        expect((dialog as any).plantIds).toEqual(['p1']);

        dialog?.dispatchEvent(new CustomEvent('close'));
        expect(mockStore.ui.closeDialog).toHaveBeenCalled();

        dialog?.dispatchEvent(new CustomEvent('data-changed'));
        expect(mockStore.refreshData).toHaveBeenCalled();
    });

    it('should handle optional fields in IPM and Nutrient Presets rendering', async () => {
        $selectedDevice.set('unknown');
        $activeDialog.set({ type: 'IPM', payload: { growspaceId: 'g1' } }); // missing plantIds
        document.body.appendChild(element);
        await element.updateComplete;
        const ipm = element.shadowRoot?.querySelector('ipm-dialog') as any;
        expect(ipm).toBeTruthy();
        expect(ipm.plantIds).toEqual([]);

        $activeDialog.set({ type: 'NUTRIENT_PRESETS', payload: {} });
        await element.updateComplete;
        const np = element.shadowRoot?.querySelector('nutrient-presets-editor') as any;
        expect(np).toBeTruthy();
    });

    it('should guard STRAIN_LIBRARY close if dialog type changed', async () => {
        $activeDialog.set({ type: 'STRAIN_LIBRARY', payload: {} });
        document.body.appendChild(element);
        await element.updateComplete;

        const dialog = element.shadowRoot?.querySelector('strain-library-dialog');

        // Change dialog type before close
        $activeDialog.set({ type: 'CONFIG', payload: { currentTab: 'environment', environmentData: {} as any } });

        dialog?.dispatchEvent(new CustomEvent('close'));
        expect(mockStore.ui.closeDialog).not.toHaveBeenCalled();
    });

    it('should handle data-changed event on IRRIGATION dialog', async () => {
        $activeDialog.set({ type: 'IRRIGATION', payload: { device: {} as any } });
        document.body.appendChild(element);
        await element.updateComplete;

        const dialog = element.shadowRoot?.querySelector('irrigation-dialog');
        dialog?.dispatchEvent(new CustomEvent('data-changed'));

        expect(mockStore.refreshData).toHaveBeenCalled();
    });

    it('should handle close event on NUTRIENT_PRESETS dialog', async () => {
        $devices.set([{ device_id: 'g1', name: 'Grow 1', nutrient_presets: {} } as any]);
        $selectedDevice.set('g1');
        $activeDialog.set({ type: 'NUTRIENT_PRESETS', payload: {} });
        document.body.appendChild(element);
        await element.updateComplete;

        const dialog = element.shadowRoot?.querySelector('nutrient-presets-editor');
        dialog?.dispatchEvent(new CustomEvent('close'));

        expect(mockStore.ui.closeDialog).toHaveBeenCalled();
    });

    it('should cover growspace_manager sensor attributes in GROW_MASTER', async () => {
        $selectedDevice.set('g1');
        mockHass.states['sensor.growspace_manager'] = {
            attributes: {
                ai_settings: { personality: 'Helpful' },
                personality: 'Expert'
            }
        };
        $activeDialog.set({ type: 'GROW_MASTER', payload: { isLoading: false, growspaceId: 'g1', response: null, mode: 'single' } });
        document.body.appendChild(element);
        element.requestUpdate();
        await element.updateComplete;
        const gm = element.shadowRoot?.querySelector('grow-master-dialog') as any;
        expect(gm.personality).toBe('Expert');

        mockHass.states['sensor.growspace_manager'].attributes.personality = undefined;
        $activeDialog.set({ type: 'GROW_MASTER', payload: { isLoading: false, growspaceId: 'g1', response: null, mode: 'single' } }); // trigger re-render
        await element.updateComplete;
        expect(gm.personality).toBe('Helpful');
    });

    it('should render ADD_PLANTS dialog', async () => {
        $activeDialog.set({ type: 'ADD_PLANTS', payload: { growspaceId: 'g1' } });
        document.body.appendChild(element);
        await element.updateComplete;

        const dialog = element.shadowRoot?.querySelector('add-plants-dialog');
        expect(dialog).toBeTruthy();
    });

    it('should handle add-plants-submit event', async () => {
        $activeDialog.set({ type: 'ADD_PLANTS', payload: { growspaceId: 'g1' } });
        document.body.appendChild(element);
        await element.updateComplete;

        const dialog = element.shadowRoot?.querySelector('add-plants-dialog');
        const detail = { plants: [] };
        dialog?.dispatchEvent(new CustomEvent('add-plants-submit', { detail }));

        expect(mockStore.confirmAddPlants).toHaveBeenCalledWith(detail);
    });

    it('should handle close event on ADD_PLANTS dialog', async () => {
        $activeDialog.set({ type: 'ADD_PLANTS', payload: { growspaceId: 'g1' } });
        document.body.appendChild(element);
        await element.updateComplete;

        const dialog = element.shadowRoot?.querySelector('add-plants-dialog');
        dialog?.dispatchEvent(new CustomEvent('close'));

        expect(mockStore.ui.closeDialog).toHaveBeenCalled();
    });

    it('should handle open-watering event on PLANT_OVERVIEW dialog', async () => {
        $activeDialog.set({
            type: 'PLANT_OVERVIEW',
            payload: {
                plant: { entity_id: 'p1' } as any,
                activeTab: 'dashboard',
                editedAttributes: {},
                selectedPlantIds: []
            }
        });
        document.body.appendChild(element);
        await element.updateComplete;

        const dialog = element.shadowRoot?.querySelector('plant-overview-dialog');
        const payload = { plantId: 'p1' };
        dialog?.dispatchEvent(new CustomEvent('open-watering', { detail: payload }));

        expect(mockStore.ui.setActiveDialog).toHaveBeenCalledWith({
            type: 'WATERING',
            payload
        });
    });

    it('should handle open-training event on PLANT_OVERVIEW dialog', async () => {
        $activeDialog.set({
            type: 'PLANT_OVERVIEW',
            payload: {
                plant: { entity_id: 'p1' } as any,
                activeTab: 'dashboard',
                editedAttributes: {},
                selectedPlantIds: []
            }
        });
        document.body.appendChild(element);
        await element.updateComplete;

        const dialog = element.shadowRoot?.querySelector('plant-overview-dialog');
        const payload = { plantId: 'p1' };
        dialog?.dispatchEvent(new CustomEvent('open-training', { detail: payload }));

        expect(mockStore.ui.setActiveDialog).toHaveBeenCalledWith({
            type: 'TRAINING',
            payload
        });
    });

    it('should handle open-ipm event on PLANT_OVERVIEW dialog', async () => {
        $activeDialog.set({
            type: 'PLANT_OVERVIEW',
            payload: {
                plant: { entity_id: 'p1' } as any,
                activeTab: 'dashboard',
                editedAttributes: {},
                selectedPlantIds: []
            }
        });
        document.body.appendChild(element);
        await element.updateComplete;

        const dialog = element.shadowRoot?.querySelector('plant-overview-dialog');
        const payload = { plantId: 'p1' };
        dialog?.dispatchEvent(new CustomEvent('open-ipm', { detail: payload }));

        expect(mockStore.ui.setActiveDialog).toHaveBeenCalledWith({
            type: 'IPM',
            payload
        });
    });

    it('should handle undefined strainLibrary', async () => {
        $activeDialog.set({ type: 'ADD_PLANT', payload: { row: 1, col: 1 } });
        // @ts-ignore
        element.strainLibrary = undefined;
        document.body.appendChild(element);
        await element.updateComplete;

        const dialog = element.shadowRoot?.querySelector('add-plant-dialog');
        expect(dialog).toBeTruthy();
        expect((dialog as any).strainLibrary).toEqual([]);
    });

    it('should guard PLANT_OVERVIEW close if dialog type changed', async () => {
        $activeDialog.set({
            type: 'PLANT_OVERVIEW',
            payload: {
                plant: { entity_id: 'p1' } as any,
                activeTab: 'dashboard',
                editedAttributes: {},
                selectedPlantIds: []
            }
        });
        document.body.appendChild(element);
        await element.updateComplete;

        const dialog = element.shadowRoot?.querySelector('plant-overview-dialog');

        // Change active dialog type
        $activeDialog.set({ type: 'STRAIN_RECOMMENDATION', payload: { isLoading: false, response: '' } });

        // Dispatch close on the old dialog element
        dialog?.dispatchEvent(new CustomEvent('close'));

        expect(mockStore.ui.closeDialog).not.toHaveBeenCalled();
    });

    it('should extract personality when ai_settings present', async () => {
        $activeDialog.set({ type: 'GROW_MASTER', payload: { isLoading: false, response: '', growspaceId: 'g1', mode: 'single' } });
        const devices: GrowspaceDevice[] = [{ device_id: 'g1', name: 'Grow 1', sensors: {} } as any];
        (mockStore.data.$devices as any).set(devices);
        (mockStore.data.$selectedDevice as any).set('g1');

        element.hass = {
            states: {
                'sensor.growspace_manager': {
                    state: 'idle',
                    attributes: {
                        personality: 'Friendly',
                        ai_settings: {}
                    }
                }
            } as any
        } as any;

        document.body.appendChild(element);
        await element.updateComplete;

        const dialog = element.shadowRoot?.querySelector('grow-master-dialog');
        expect((dialog as any).personality).toBe('Friendly');
    });

    it('should handle missing attributes in GROW_MASTER', async () => {
        $activeDialog.set({ type: 'GROW_MASTER', payload: { isLoading: false, response: '', growspaceId: 'g1', mode: 'single' } });
        const devices: GrowspaceDevice[] = [{ device_id: 'g1', name: 'Grow 1', sensors: {} } as any];
        (mockStore.data.$devices as any).set(devices);
        (mockStore.data.$selectedDevice as any).set('g1');

        element.hass = {
            states: {
                'sensor.growspace_manager': {
                    state: 'idle',
                    // attributes missing
                }
            } as any
        } as any;

        document.body.appendChild(element);
        await element.updateComplete;

        const dialog = element.shadowRoot?.querySelector('grow-master-dialog');
        expect((dialog as any).personality).toBeUndefined();
    });
});
