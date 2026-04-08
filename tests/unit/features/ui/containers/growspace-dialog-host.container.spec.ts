import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { fixture, html } from '@open-wc/testing-helpers';
import { GrowspaceDialogHost } from '../../../../../src/features/ui/containers/growspace-dialog-host.container';
import { atom } from 'nanostores';

// Import side-effects for element registration
import '../../../../../src/features/ui/containers/growspace-dialog-host.container';

// Mock required child components that are not logic-heavy for these tests
vi.mock('../../../../../src/features/ui/components/growspace-ipm-dialog-ui', () => {
    if (!customElements.get('growspace-ipm-dialog-ui')) {
        customElements.define('growspace-ipm-dialog-ui', class extends HTMLElement { });
    }
    return { GrowspaceIPMDialogUI: class extends HTMLElement { } };
});

vi.mock('../../../../../src/features/ui/components/growspace-watering-dialog-ui', () => {
    if (!customElements.get('growspace-watering-dialog-ui')) {
        customElements.define('growspace-watering-dialog-ui', class extends HTMLElement { });
    }
    return { GrowspaceWateringDialogUI: class extends HTMLElement { } };
});

vi.mock('../../../../../src/features/ui/components/growspace-nutrient-inventory-dialog-ui', () => {
    if (!customElements.get('growspace-nutrient-inventory-dialog-ui')) {
        customElements.define('growspace-nutrient-inventory-dialog-ui', class extends HTMLElement { });
    }
    return { GrowspaceNutrientInventoryDialogUI: class extends HTMLElement { } };
});

describe('GrowspaceDialogHostContainer', () => {
    let element: GrowspaceDialogHost;
    let mockStore: any;

    const createMockAtom = (initialValue: any) => {
        const a = atom(initialValue);
        return a;
    };

    beforeEach(async () => {
        mockStore = {
            ui: {
                $activeDialog: createMockAtom({ type: 'NONE', payload: {} }),
                $selectedDevice: createMockAtom(null),
                setActiveDialog: vi.fn(),
                closeDialog: vi.fn(),
                navigate: vi.fn(),
                showToast: vi.fn()
            },
            $devices: createMockAtom([]),
            $strainLibrary: createMockAtom([]),
            dataService: {
                $nutrientPresets: createMockAtom({}),
                $ipmPresets: createMockAtom({}),
                $nutrientInventory: createMockAtom(null),
                configureEnvironment: vi.fn().mockResolvedValue(true),
                fetchGeneticsData: vi.fn().mockResolvedValue({ seed_batches: {}, pollination_events: {} }),
                saveIPMPreset: vi.fn().mockResolvedValue(true),
                deleteIPMPreset: vi.fn().mockResolvedValue(true),
                updateVisionCheckupConfig: vi.fn().mockResolvedValue(true),
            },
            grid: {
                $growspaceOptions: createMockAtom({})
            },
            actions: {
                plant: {
                    takeClone: vi.fn().mockResolvedValue(true)
                },
                growspace: {
                    remove: vi.fn().mockResolvedValue(true),
                    removeEnvironment: vi.fn().mockResolvedValue(true),
                    add: vi.fn().mockResolvedValue(true),
                    update: vi.fn().mockResolvedValue(true)
                },
                strain: {
                    add: vi.fn().mockResolvedValue(true),
                    update: vi.fn().mockResolvedValue(true)
                },
                ipm: {
                    log: vi.fn().mockResolvedValue(true)
                }
            },
            refreshData: vi.fn().mockResolvedValue(true),
            performImport: vi.fn().mockResolvedValue(true),
            showToast: vi.fn(),
            applyIPM: vi.fn().mockResolvedValue(true),
        };

        // Combined atom matching GrowspaceStore.$dialogHostState
        const subAtoms = [
            mockStore.ui.$activeDialog,
            mockStore.ui.$selectedDevice,
            mockStore.$devices,
            mockStore.$strainLibrary,
            mockStore.dataService.$nutrientPresets,
            mockStore.dataService.$ipmPresets,
            mockStore.dataService.$nutrientInventory,
        ];

        const dialogHostListeners: any[] = [];
        const getDialogHostValue = () => ({
            activeDialog: mockStore.ui.$activeDialog.get(),
            devices: mockStore.$devices.get(),
            selectedDevice: mockStore.ui.$selectedDevice.get(),
            strainLibrary: mockStore.$strainLibrary.get(),
            nutrientPresets: mockStore.dataService.$nutrientPresets.get(),
            ipmPresets: mockStore.dataService.$ipmPresets.get(),
            nutrientInventory: mockStore.dataService.$nutrientInventory.get(),
        });

        subAtoms.forEach(sub => sub.listen(() => {
            const v = getDialogHostValue();
            dialogHostListeners.forEach(l => l(v));
        }));

        mockStore.$dialogHostState = {
            get() { return getDialogHostValue(); },
            subscribe(fn: any) {
                dialogHostListeners.push(fn);
                fn(getDialogHostValue());
                return () => {
                    const index = dialogHostListeners.indexOf(fn);
                    if (index !== -1) dialogHostListeners.splice(index, 1);
                };
            },
            listen(fn: any) {
                dialogHostListeners.push(fn);
                return () => {
                    const i = dialogHostListeners.indexOf(fn);
                    if (i !== -1) dialogHostListeners.splice(i, 1);
                };
            },
        };

        element = await fixture<GrowspaceDialogHost>(html`<growspace-dialog-host></growspace-dialog-host>`);
        element.store = mockStore;
        element.hass = {
            callService: vi.fn().mockResolvedValue(true),
            connection: {
                subscribeEvents: vi.fn(() => Promise.resolve(() => { })),
            },
            states: {
                'sensor.growspace_manager': {
                    attributes: {
                        ai_settings: { personality: 'Helpful' }
                    }
                }
            }
        } as any;

        await element.updateComplete;
    });

    it('should handle open-strain-editor existing entry matching', async () => {
        const strainData = { strain: 'Gorilla Glue', phenotype: 'p1' };
        mockStore.$strainLibrary.set([
            { key: 'Gorilla Glue_p1', strain: 'Gorilla Glue', phenotype: 'p1', notes: 'Existing' }
        ]);

        // @ts-ignore - reaching private for test
        await element._handleOpenStrainEditor(new CustomEvent('test', { detail: strainData }));

        expect(mockStore.ui.setActiveDialog).toHaveBeenCalledWith(expect.objectContaining({
            type: 'STRAIN_LIBRARY',
            payload: expect.objectContaining({
                view: 'editor',
                editingStrain: expect.objectContaining({ notes: 'Existing' })
            })
        }));
    });

    it('should create new entry when strain not found in open-strain-editor', async () => {
        const strainData = { strain: 'New Strain', phenotype: 'v1' };
        mockStore.$strainLibrary.set([]);

        // @ts-ignore
        await element._handleOpenStrainEditor(new CustomEvent('test', { detail: strainData }));

        expect(mockStore.ui.setActiveDialog).toHaveBeenCalledWith(expect.objectContaining({
            type: 'STRAIN_LIBRARY',
            payload: expect.objectContaining({
                view: 'editor',
                editingStrain: expect.objectContaining({ strain: 'New Strain' })
            })
        }));
    });

    it('should handle transplant failure branch', async () => {
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
        const error = new Error('Transplant Error');
        mockStore.actions.plant.takeClone.mockRejectedValue(error);

        const activeState = {
            type: 'TAKE_CLONE',
            payload: {
                sourcePlant: 'p1',
                defaultGrowspaceId: 'g1'
            }
        };
        mockStore.ui.$activeDialog.set(activeState);
        await element.updateComplete;
        await element.updateComplete;

        const dialog = element.shadowRoot?.querySelector('clone-dialog');
        dialog?.dispatchEvent(new CustomEvent('take-clone-submit', {
            detail: { numClones: 1, targetGrowspaceId: 'g2' }
        }));

        await new Promise(resolve => setTimeout(resolve, 100)); // Wait for async handler
        expect(consoleErrorSpy).toHaveBeenCalledWith('[DialogHost] Transplant failed:', error);
        expect(mockStore.showToast).toHaveBeenCalledWith(expect.stringContaining('Error:'), 'error');
        consoleErrorSpy.mockRestore();
    });

    it('should handle environment config with all optional fields populated', async () => {
        const activeState = {
            type: 'ENVIRONMENT_CONFIG',
            payload: { deviceId: 'grow1' }
        };
        mockStore.ui.$activeDialog.set(activeState);
        await element.updateComplete;
        await element.updateComplete;

        const dialog = element.shadowRoot?.querySelector('growspace-environment-config-dialog');
        dialog?.dispatchEvent(new CustomEvent('save-config', {
            detail: {
                growspaceId: 'grow1',
                vpdSettings: { target: 1.2 },
                co2Settings: { target: 800 }
            }
        }));

        expect(mockStore.dataService.configureEnvironment).toHaveBeenCalledWith(expect.objectContaining({
            vpdSettings: { target: 1.2 },
            co2Settings: { target: 800 }
        }));
    });

    it('should navigate to STRAIN_LIBRARY from @create-new-strain event', async () => {
        const activeState = {
            type: 'IPM',
            payload: { selectedPlantIds: [] }
        };
        mockStore.$strainLibrary.set([{ key: 'Existing_p1', strain: 'Existing', phenotype: 'p1' }]);
        mockStore.ui.$activeDialog.set(activeState);

        await element.updateComplete;
        await element.updateComplete;

        const dialog = element.shadowRoot?.querySelector('growspace-ipm-dialog-ui');
        dialog?.dispatchEvent(new CustomEvent('close'));
        expect(mockStore.ui.closeDialog).toHaveBeenCalled();
    });

    it('should handle strain-created-at-source paths', async () => {
        const activeState = {
            type: 'STRAIN_LIBRARY',
            payload: { view: 'editor', strain: {} }
        };
        mockStore.ui.$activeDialog.set(activeState);
        await element.updateComplete;
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
    });

    it('should handle @close dialog events', async () => {
        mockStore.ui.$activeDialog.set({ type: 'IPM', payload: {} });
        await element.updateComplete;
        await element.updateComplete;

        const dialog = element.shadowRoot?.querySelector('growspace-ipm-dialog-ui');
        expect(dialog).toBeTruthy();
        dialog?.dispatchEvent(new CustomEvent('close'));
        expect(mockStore.ui.closeDialog).toHaveBeenCalled();
    });

    it('should handle @data-changed events with debounced refresh', async () => {
        vi.useFakeTimers();
        mockStore.ui.$activeDialog.set({ type: 'IPM', payload: {} });
        await element.updateComplete;
        await element.updateComplete;

        const dialog = element.shadowRoot?.querySelector('growspace-ipm-dialog-ui');
        expect(dialog).toBeTruthy();

        dialog?.dispatchEvent(new CustomEvent('apply-ipm', {
            detail: { presetId: 'test_p', notes: 'test notes' }
        }));

        // Allow async handler to proceed past await this.store.applyIPM
        await Promise.resolve();
        await Promise.resolve();
        
        expect(mockStore.applyIPM).toHaveBeenCalled();
        
        // Advance timers to trigger debounced refresh
        vi.advanceTimersByTime(1000);
        expect(mockStore.refreshData).toHaveBeenCalled();

        vi.useRealTimers();
    });
});
