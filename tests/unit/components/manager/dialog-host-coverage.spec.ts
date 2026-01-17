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
});
