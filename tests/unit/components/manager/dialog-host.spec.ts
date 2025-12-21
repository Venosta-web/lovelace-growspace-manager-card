
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DialogHost } from '../../../../src/components/manager/dialog-host';
// We don't need to import actual dialogs if we just check for their tag presence
// in the shadow DOM, assuming JSDOM treats them as generic elements.

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

    beforeEach(() => {
        mockStore = {
            state: {
                activeDialog: { type: 'NONE' },
                devices: [],
                selectedDevice: 'd1'
            },
            closeActiveDialog: vi.fn(),
            confirmAddPlant: vi.fn(),
            updatePlantFromDialog: vi.fn(),
            handleDeletePlant: vi.fn(),
            harvestPlant: vi.fn(),
            finishDryingPlant: vi.fn(),
            clonePlant: vi.fn(),
            movePlantToGrowspace: vi.fn(),
            addStrain: vi.fn(),
            removeStrain: vi.fn(),
            handleExportLibrary: vi.fn(),
            showToast: vi.fn(),
            fetchStrainLibrary: vi.fn(),
            handleAddGrowspace: vi.fn(),
            handleUpdateGrowspace: vi.fn(),
            dataService: {
                importStrainLibrary: vi.fn().mockResolvedValue({ imported_count: 5 }),
                configureEnvironment: vi.fn().mockResolvedValue({})
            },
            analyzeGrowspace: vi.fn(),
            getStrainRecommendation: vi.fn(),
            refreshData: vi.fn()
        };

        mockHass = {
            states: {}
        };

        // Ensure custom element is defined (if import didn't do it)
        if (!customElements.get('growspace-dialog-host')) {
            customElements.define('growspace-dialog-host', DialogHost);
        }

        element = document.createElement('growspace-dialog-host') as DialogHost;
        (element as any).store = mockStore;
        element.hass = mockHass;
    });

    it('should be defined', () => {
        expect(element).toBeDefined();
    });

    it('should render nothing when dialog type is NONE', async () => {
        element.activeDialogState = { type: 'NONE' } as any;
        document.body.appendChild(element);
        await element.updateComplete;

        expect(element.shadowRoot?.innerHTML).toContain('<!---->');
        // Or check no dialog elements
        expect(element.shadowRoot?.children.length).toBe(0);
        expect(element.shadowRoot?.querySelector('add-plant-dialog')).toBeNull();

        document.body.removeChild(element);
    });

    it('should render ADD_PLANT dialog', async () => {
        element.activeDialogState = {
            type: 'ADD_PLANT',
            payload: { row: 1, col: 2 }
        } as any;

        document.body.appendChild(element);
        await element.updateComplete;

        const dialog = element.shadowRoot?.querySelector('add-plant-dialog');
        expect(dialog).not.toBeNull();
        expect((dialog as any).row).toBe(1);

        document.body.removeChild(element);
    });

    it('should handle ADD_PLANT event', async () => {
        element.activeDialogState = { type: 'ADD_PLANT', payload: {} } as any;
        document.body.appendChild(element);
        await element.updateComplete;

        const dialog = element.shadowRoot?.querySelector('add-plant-dialog') as HTMLElement;
        const detail = { plant: 'foo' };
        dialog.dispatchEvent(new CustomEvent('add-plant-submit', { detail }));

        expect(mockStore.confirmAddPlant).toHaveBeenCalledWith(detail);
        document.body.removeChild(element);
    });

    it('should render PLANT_OVERVIEW dialog', async () => {
        element.activeDialogState = {
            type: 'PLANT_OVERVIEW',
            payload: {
                plant: {
                    id: 'p1',
                    entity_id: 'sensor.p1',
                    attributes: { plant_id: 'p1', strain: 'Blueberry', stage: 'veg' }
                }
            }
        } as any;

        document.body.appendChild(element);
        await element.updateComplete;

        expect(element.shadowRoot?.querySelector('plant-overview-dialog')).not.toBeNull();
        document.body.removeChild(element);
    });

    it('should handle PLANT_OVERVIEW events', async () => {
        element.activeDialogState = {
            type: 'PLANT_OVERVIEW',
            payload: {
                plant: {
                    id: 'p1',
                    entity_id: 'sensor.p1',
                    attributes: { plant_id: 'p1', strain: 'Blueberry', stage: 'veg' }
                }
            }
        } as any;
        document.body.appendChild(element);
        await element.updateComplete;

        const dialog = element.shadowRoot?.querySelector('plant-overview-dialog') as HTMLElement;

        // Harvest
        dialog.dispatchEvent(new CustomEvent('harvest-plant', { detail: { plant: 'p1' } }));
        expect(mockStore.harvestPlant).toHaveBeenCalledWith('p1');

        document.body.removeChild(element);
    });

    it('should handle environment config submission', async () => {
        element.activeDialogState = { type: 'CONFIG', payload: {} } as any;
        document.body.appendChild(element);
        await element.updateComplete;

        const dialog = element.shadowRoot?.querySelector('config-dialog') as HTMLElement;
        const detail = {
            selectedGrowspaceId: 'g1',
            temp_sensor: 't1',
            humidity_sensor: 'h1'
        };

        dialog.dispatchEvent(new CustomEvent('configure-environment-submit', { detail }));

        await new Promise(r => setTimeout(r, 0));

        expect(mockStore.dataService.configureEnvironment).toHaveBeenCalled();
        expect(mockStore.showToast).toHaveBeenCalledWith(expect.stringContaining('successfully'), 'success');

        document.body.removeChild(element);
    });

    it('should validate environment config', async () => {
        element.activeDialogState = { type: 'CONFIG', payload: {} } as any;
        document.body.appendChild(element);
        await element.updateComplete;

        const dialog = element.shadowRoot?.querySelector('config-dialog') as HTMLElement;
        const detail = { selectedGrowspaceId: null }; // Invalid

        dialog.dispatchEvent(new CustomEvent('configure-environment-submit', { detail }));

        await new Promise(r => setTimeout(r, 0));

        expect(mockStore.dataService.configureEnvironment).not.toHaveBeenCalled();
        expect(mockStore.showToast).toHaveBeenCalledWith(expect.stringContaining('mandatory'), 'error');

        document.body.removeChild(element);
    });

    it('should render STRAIN_LIBRARY dialog', async () => {
        element.activeDialogState = { type: 'STRAIN_LIBRARY', payload: {} } as any;
        document.body.appendChild(element);
        await element.updateComplete;
        expect(element.shadowRoot?.querySelector('strain-library-dialog')).not.toBeNull();
        document.body.removeChild(element);
    });

    it('should render GROW_MASTER dialog', async () => {
        element.activeDialogState = {
            type: 'GROW_MASTER',
            payload: { isLoading: false, response: '' }
        } as any;
        document.body.appendChild(element);
        await element.updateComplete;
        expect(element.shadowRoot?.querySelector('grow-master-dialog')).not.toBeNull();
        document.body.removeChild(element);
    });

    it('should render LOGBOOK dialog', async () => {
        element.activeDialogState = {
            type: 'LOGBOOK',
            payload: { growspaceId: 'g1' }
        } as any;
        document.body.appendChild(element);
        await element.updateComplete;
        expect(element.shadowRoot?.querySelector('logbook-dialog')).not.toBeNull();
        document.body.removeChild(element);
    });

    it('should render IRRIGATION dialog', async () => {
        element.activeDialogState = { type: 'IRRIGATION', payload: {} } as any;
        document.body.appendChild(element);
        await element.updateComplete;
        expect(element.shadowRoot?.querySelector('irrigation-dialog')).not.toBeNull();
        document.body.removeChild(element);
    });

    describe('Enhanced Coverage Tests', () => {
        it('should handle import library success', async () => {
            element.activeDialogState = { type: 'STRAIN_LIBRARY', payload: {} } as any;
            document.body.appendChild(element);
            await element.updateComplete;

            const dialog = element.shadowRoot?.querySelector('strain-library-dialog') as HTMLElement;
            const file = new File([''], 'test.zip');

            dialog.dispatchEvent(new CustomEvent('import-library', {
                detail: { file, replace: true }
            }));

            await new Promise(r => setTimeout(r, 0));

            expect(mockStore.dataService.importStrainLibrary).toHaveBeenCalledWith(file, true);
            expect(mockStore.showToast).toHaveBeenCalledWith(expect.stringContaining('successful'), 'success');
            expect(mockStore.fetchStrainLibrary).toHaveBeenCalled();

            document.body.removeChild(element);
        });

        it('should handle import library failure', async () => {
            mockStore.dataService.importStrainLibrary.mockRejectedValue(new Error('Fail'));

            element.activeDialogState = { type: 'STRAIN_LIBRARY', payload: {} } as any;
            document.body.appendChild(element);
            await element.updateComplete;

            const dialog = element.shadowRoot?.querySelector('strain-library-dialog') as HTMLElement;
            dialog.dispatchEvent(new CustomEvent('import-library', { detail: { file: new File([''], 'f'), replace: false } }));

            await new Promise(r => setTimeout(r, 0));

            expect(mockStore.showToast).toHaveBeenCalledWith(expect.stringContaining('Fail'), 'error');
            document.body.removeChild(element);
        });

        it('should calculate stress state for Grow Master', async () => {
            // Mock selected device
            mockStore.state.selectedDevice = 'd1';
            // Mock hass states
            mockHass.states = {
                'binary_sensor.d1_stress': { state: 'on' },
                'sensor.growspace_manager': { attributes: { ai_settings: { personality: 'Sassy' } } }
            };
            // Ensure store has access to hass for this logic
            mockStore.hass = mockHass;

            element.activeDialogState = { type: 'GROW_MASTER', payload: { isLoading: false } } as any;
            document.body.appendChild(element);
            await element.updateComplete;

            const dialog = element.shadowRoot?.querySelector('grow-master-dialog') as any;
            expect(dialog.isStressed).toBe(true);
            expect(dialog.personality).toBe('Sassy');

            document.body.removeChild(element);
        });

        it('should handle all Plant Overview events', async () => {
            const mockPlant = {
                id: 'p1',
                entity_id: 'sensor.p1',
                attributes: { plant_id: 'p1', strain: 'Kush' }
            };

            element.activeDialogState = { type: 'PLANT_OVERVIEW', payload: { plant: mockPlant } } as any;
            document.body.appendChild(element);
            await element.updateComplete;

            const dialog = element.shadowRoot?.querySelector('plant-overview-dialog') as HTMLElement;

            // Delete
            dialog.dispatchEvent(new CustomEvent('delete-plant', { detail: { plantId: 'p1' } }));
            expect(mockStore.handleDeletePlant).toHaveBeenCalledWith('p1');

            // Finish Drying
            dialog.dispatchEvent(new CustomEvent('finish-drying', { detail: { plant: 'p1' } }));
            expect(mockStore.finishDryingPlant).toHaveBeenCalledWith('p1');

            // Take Clone
            dialog.dispatchEvent(new CustomEvent('take-clone', { detail: { plant: 'p1', numClones: 2 } }));
            expect(mockStore.clonePlant).toHaveBeenCalledWith('p1', 2);

            // Move Clone
            dialog.dispatchEvent(new CustomEvent('move-clone', { detail: { plant: 'p1', targetGrowspace: 'g2' } }));
            expect(mockStore.movePlantToGrowspace).toHaveBeenCalledWith('p1', 'g2');

            // Update Plant
            dialog.dispatchEvent(new CustomEvent('update-plant', { detail: { notes: 'Hi' } }));
            expect(mockStore.updatePlantFromDialog).toHaveBeenCalledWith(expect.objectContaining({
                editedAttributes: { notes: 'Hi' }
            }));

            document.body.removeChild(element);
        });

        it('should handle Strain Recommendation events', async () => {
            element.activeDialogState = { type: 'STRAIN_RECOMMENDATION', payload: { isLoading: false } } as any;
            document.body.appendChild(element);
            await element.updateComplete;

            const dialog = element.shadowRoot?.querySelector('strain-recommendation-dialog') as HTMLElement;
            dialog.dispatchEvent(new CustomEvent('get-recommendation', { detail: { query: 'Sleep' } }));

            expect(mockStore.getStrainRecommendation).toHaveBeenCalledWith('Sleep');
            document.body.removeChild(element);
        });

        it('should guard against null file in import', async () => {
            element.activeDialogState = { type: 'STRAIN_LIBRARY', payload: {} } as any;
            document.body.appendChild(element);
            await element.updateComplete;

            const dialog = element.shadowRoot?.querySelector('strain-library-dialog') as HTMLElement;
            dialog.dispatchEvent(new CustomEvent('import-library', { detail: { file: null } }));

            await new Promise(r => setTimeout(r, 0));
            expect(mockStore.dataService.importStrainLibrary).not.toHaveBeenCalled();

            document.body.removeChild(element);
        });
    });

    describe('Closure Coverage Tests', () => {
        it('should close irrigation dialog events', async () => {
            element.activeDialogState = { type: 'IRRIGATION', payload: {} } as any;
            document.body.appendChild(element);
            await element.updateComplete;

            const dialog = element.shadowRoot?.querySelector('irrigation-dialog') as HTMLElement;
            dialog.dispatchEvent(new CustomEvent('close'));
            expect(mockStore.closeActiveDialog).toHaveBeenCalledTimes(1);

            dialog.dispatchEvent(new CustomEvent('closed')); // Also triggers close
            expect(mockStore.closeActiveDialog).toHaveBeenCalledTimes(2);

            document.body.removeChild(element);
        });

        it('should close logbook dialog', async () => {
            element.activeDialogState = { type: 'LOGBOOK', payload: { growspaceId: 'g1' } } as any;
            document.body.appendChild(element);
            await element.updateComplete;

            const dialog = element.shadowRoot?.querySelector('logbook-dialog') as HTMLElement;
            dialog.dispatchEvent(new CustomEvent('close'));
            expect(mockStore.closeActiveDialog).toHaveBeenCalled();

            document.body.removeChild(element);
        });

        it('should close add-plant dialog', async () => {
            element.activeDialogState = { type: 'ADD_PLANT', payload: {} } as any;
            document.body.appendChild(element);
            await element.updateComplete;

            const dialog = element.shadowRoot?.querySelector('add-plant-dialog') as HTMLElement;
            // Ensure dialog is rendered first
            expect(dialog).not.toBeNull();
            dialog!.dispatchEvent(new CustomEvent('close'));
            expect(mockStore.closeActiveDialog).toHaveBeenCalled();

            document.body.removeChild(element);
        });
    });
});
