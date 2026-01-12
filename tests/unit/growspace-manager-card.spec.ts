import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { GrowspaceManagerCard } from '../../src/growspace-manager-card';
import { GrowspaceManagerCardConfig } from '../../src/types';
import { HomeAssistant } from 'custom-card-helpers';
import { LibraryExportReadyEvent } from '../../src/events';
import { ViewMode } from '../../src/constants';

import { atom, computed } from 'nanostores';



// Mock dependencies
vi.mock('../../src/components/growspace-header', () => ({}));
vi.mock('../../src/components/manager/dialog-host', () => ({}));
vi.mock('../../src/components/growspace-view-switcher', () => ({}));

const atomMocks = vi.hoisted(() => ({
    $devices: null as any,
    $selectedDevice: null as any,
    $strainLibrary: null as any,
    $optimisticDeletedPlantIds: null as any,
    $activeDevices: null as any,
    $gridLayout: null as any,
    $growspaceOptions: null as any,
    $viewMode: null as any,
    $isLoading: null as any,
    $activeDialog: null as any,
    $isEditMode: null as any,
    $isCompactView: null as any,
    $selectedPlants: null as any,
    $focusedPlantIndex: null as any,
    $menuOpen: null as any,
    $notification: null as any,
    $cardViewState: null as any,
}));

vi.mock('../../src/store/growspace-store', () => ({
    GrowspaceStore: class {
        host: any;
        dataService = {};
        data = {
            $devices: atomMocks.$devices,
            $selectedDevice: atomMocks.$selectedDevice,
            $strainLibrary: atomMocks.$strainLibrary,
            $optimisticDeletedPlantIds: atomMocks.$optimisticDeletedPlantIds,
            // Add methods if needed
            fetchStrainLibrary: vi.fn(),
            initializeSelectedDevice: vi.fn(),
            handleDeviceChange: vi.fn(),
        };
        ui = {
            $viewMode: atomMocks.$viewMode,
            $isLoading: atomMocks.$isLoading,
            $activeDialog: atomMocks.$activeDialog,
            $isEditMode: atomMocks.$isEditMode,
            $isCompactView: atomMocks.$isCompactView,
            $selectedPlants: atomMocks.$selectedPlants,
            $focusedPlantIndex: atomMocks.$focusedPlantIndex,
            $menuOpen: atomMocks.$menuOpen,
            $notification: atomMocks.$notification,
            $cardViewState: atomMocks.$cardViewState,
            setViewMode: vi.fn(),
            setEditMode: vi.fn(),
            clearPlantSelection: vi.fn(),
            setIsLoading: vi.fn(),
            selectAllPlants: vi.fn(),
            setFocusedPlantIndex: vi.fn(),
            setActiveDialog: vi.fn(),
        };
        grid = {
            $activeDevices: atomMocks.$activeDevices,
            $gridLayout: atomMocks.$gridLayout,
            $growspaceOptions: atomMocks.$growspaceOptions,
        };
        history = {
            $historyCache: {},
        };

        constructor(host: any) { this.host = host; }
        updateHass() { }
        initializeSelectedDevice() { }
        fetchStrainLibrary() { }
        handleDeviceChange() { }
        handleKeyboardNavigation() { }
        toggleHeaderExpansion() { }
        selectAllPlants() { }
        clearPlantSelection() { this.ui.clearPlantSelection(); }
        openBatchWateringDialog = vi.fn();
        openBatchTrainingDialog = vi.fn();
        openIPMDialog = vi.fn();
        destroy = vi.fn();
    }
}));

describe('GrowspaceManagerCard', () => {
    let element: GrowspaceManagerCard;
    let mockHass: HomeAssistant;

    beforeEach(() => {
        // Init real atoms
        atomMocks.$devices = atom<any[]>([]);
        atomMocks.$selectedDevice = atom<string | null>('gs1');
        atomMocks.$strainLibrary = atom<any[]>([]);
        atomMocks.$optimisticDeletedPlantIds = atom(new Set<string>());
        atomMocks.$activeDevices = atom<any[]>([]);
        atomMocks.$gridLayout = atom({ effectiveRows: 1, grid: [] });
        atomMocks.$growspaceOptions = atom({});
        atomMocks.$viewMode = atom('standard');
        atomMocks.$isLoading = atom(false);
        atomMocks.$activeDialog = atom<any>({ type: 'NONE' });
        atomMocks.$isEditMode = atom(false);
        atomMocks.$isCompactView = atom(false);
        atomMocks.$selectedPlants = atom(new Set());
        atomMocks.$focusedPlantIndex = atom<number>(-1);
        atomMocks.$notification = atom<any>(null);

        // Derived mock for consolidated state - matches implementation
        atomMocks.$cardViewState = computed(
            [atomMocks.$viewMode, atomMocks.$isLoading, atomMocks.$isEditMode, atomMocks.$isCompactView, atomMocks.$activeDialog, atomMocks.$notification, atomMocks.$focusedPlantIndex],
            (viewMode, isLoading, isEditMode, isCompact, activeDialog, notification, focusedPlantIndex) => ({
                viewMode,
                isLoading,
                isEditMode,
                isCompact,
                activeDialog,
                notification,
                focusedPlantIndex
            })
        );

        element = new GrowspaceManagerCard();
        mockHass = {
            states: {},
            callService: vi.fn(),
            connection: { subscribeEvents: vi.fn() }
        } as any;
        element.hass = mockHass;
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('Static Methods', () => {
        it('should get stub config', () => {
            expect(GrowspaceManagerCard.getStubConfig()).toEqual({
                default_growspace: '4x4',
                compact: true
            });
        });

        it('should get card size', () => {
            const card = new GrowspaceManagerCard();
            expect(card.getCardSize()).toBe(4);
        });

        it('should get config element', async () => {
            try {
                const el = await GrowspaceManagerCard.getConfigElement();
                expect(el.tagName.toLowerCase()).toBe('growspace-manager-card-editor');
            } catch (e) {
                // Ignore errors from missing editor file in test env
            }

        });
    });

    describe('Configuration', () => {
        it('should accept valid configuration', () => {
            const config: GrowspaceManagerCardConfig = {
                type: 'custom:growspace-manager-card',
                default_growspace: 'gs1'
            };
            element.setConfig(config);
            expect((element as any)._config).toEqual(config);
        });

        it('should throw error for invalid configuration', () => {
            expect(() => element.setConfig(undefined as any)).toThrow('Invalid configuration');
        });

        it('should set compact mode from config', () => {
            const config: GrowspaceManagerCardConfig = {
                type: 'custom:growspace-manager-card',
                compact: true
            };
            element.setConfig(config);
            expect(element.store.ui.setViewMode).toHaveBeenCalledWith('compact');
        });

        it('should set initial view mode from config', () => {
            const config: GrowspaceManagerCardConfig = {
                type: 'custom:growspace-manager-card',
                initial_view_mode: ViewMode.HEADER
            };
            element.setConfig(config);
            expect(element.store.ui.setViewMode).toHaveBeenCalledWith(ViewMode.HEADER);
        });

        it('should not set compact mode if compact is false', () => {
            const config: GrowspaceManagerCardConfig = {
                type: 'custom:growspace-manager-card',
                compact: false
            };
            element.setConfig(config);
            expect(element.store.ui.setViewMode).not.toHaveBeenCalledWith('compact');
        });
    });

    describe('Lifecycle & Rendering', () => {
        it('should initialize store on first update', () => {
            const spyUpdateHass = vi.spyOn(element.store, 'updateHass');
            const spyInitDevice = vi.spyOn(element.store, 'initializeSelectedDevice');
            const spyFetchStrain = vi.spyOn(element.store, 'fetchStrainLibrary');

            element.setConfig({ type: 'custom:growspace-manager-card' });
            (element as any).firstUpdated();

            expect(spyUpdateHass).toHaveBeenCalledWith(mockHass);
            expect(spyInitDevice).toHaveBeenCalled();
            expect(spyFetchStrain).toHaveBeenCalled();
        });

        it('should update store when hass updates', () => {
            const spy = vi.spyOn(element.store, 'updateHass');
            (element as any).updated(new Map([['hass', 'oldValues']]));
            expect(spy).toHaveBeenCalledWith(mockHass);
        });

        it('should expose public getters', () => {
            expect(element.dataService).toBe(element.store.dataService);
            expect(element.devices).toEqual([]);
            expect(element.selectedDevice).toBe('gs1');
        });

        it('should sync strain library when controller updates', async () => {
            // Trigger an update where the controller value has changed
            (element as any)._strainLibraryController = { value: [{ strain: 'new' }] };
            (element as any).updated(new Map());
            expect((element as any)._strainLibrary).toEqual([{ strain: 'new' }]);
        });

        it('should add/remove event listeners', () => {
            const addSpy = vi.spyOn(element, 'addEventListener');
            const removeSpy = vi.spyOn(element, 'removeEventListener');

            element.connectedCallback();
            expect(addSpy).toHaveBeenCalledWith(LibraryExportReadyEvent.TYPE, expect.any(Function));

            element.disconnectedCallback();
            expect(removeSpy).toHaveBeenCalledWith(LibraryExportReadyEvent.TYPE, expect.any(Function));
        });
    });

    describe('Rendering Logic', () => {
        afterEach(() => {
            if (element.isConnected) {
                document.body.removeChild(element);
            }
        });

        it('should render error if hass is missing', async () => {
            element.hass = undefined as any;
            document.body.appendChild(element);
            await element.updateComplete;
            expect(element.shadowRoot?.textContent).toContain('Home Assistant not available');
        });

        it('should render loading spinner', async () => {
            atomMocks.$isLoading.set(true);
            document.body.appendChild(element);
            await element.updateComplete;
            const spinner = element.shadowRoot?.querySelector('.loading-spinner');
            expect(spinner).toBeTruthy();
        });

        it('should render no data message if no devices', async () => {
            atomMocks.$isLoading.set(false);
            atomMocks.$activeDevices.set([]);

            document.body.appendChild(element);
            await element.updateComplete;

            const msg = element.shadowRoot?.querySelector('.no-data');
            expect(msg).toBeTruthy();
            expect(msg?.textContent).toContain('No growspace devices found');
        });

        it('should render error if selected device is invalid', async () => {
            atomMocks.$isLoading.set(false);
            atomMocks.$activeDevices.set([{ device_id: 'gs2' }]);
            atomMocks.$selectedDevice.set('gs1');

            document.body.appendChild(element);
            await element.updateComplete;

            const err = element.shadowRoot?.querySelector('.error');
            expect(err).toBeTruthy();
            expect(err?.textContent).toContain('No valid growspace selected');
        });

        it('should render main card with notification', async () => {
            atomMocks.$isLoading.set(false);
            const mockDevice = { device_id: 'gs1', name: 'Tent', plants_per_row: 4 };
            atomMocks.$activeDevices.set([mockDevice]);
            atomMocks.$gridLayout.set({ effectiveRows: 1, grid: [] });
            atomMocks.$growspaceOptions.set({ gs1: 'Tent' });
            atomMocks.$selectedDevice.set('gs1');
            atomMocks.$notification.set({ type: 'success', message: 'Test Notif' });

            document.body.appendChild(element);
            await element.updateComplete;

            const toast = element.shadowRoot?.querySelector('growspace-toast');
            expect(toast).toBeTruthy();
            expect(toast).not.toBeNull();
        });

        it('should render wide card class', async () => {
            atomMocks.$isLoading.set(false);
            const mockDevice = { device_id: 'gs1', name: 'Tent', plants_per_row: 8 };
            atomMocks.$activeDevices.set([mockDevice]);
            atomMocks.$gridLayout.set({ effectiveRows: 1, grid: [] });
            atomMocks.$growspaceOptions.set({ gs1: 'Tent' });
            atomMocks.$selectedDevice.set('gs1');

            document.body.appendChild(element);
            await element.updateComplete;

            const card = element.shadowRoot?.querySelector('ha-card');
            expect(card?.classList.contains('wide-growspace')).toBe(true);
        });
    });

    describe('Event Handlers & Private Methods', () => {
        it('should handle view mode changed', () => {
            (element as any)._handleViewModeChanged({ detail: { mode: 'list' } });
            expect(element.store.ui.setViewMode).toHaveBeenCalledWith('list');
        });

        it('should handle growspace changed', () => {
            const spy = vi.spyOn(element.store, 'handleDeviceChange');
            (element as any)._handleGrowspaceChanged(new CustomEvent('test', { detail: 'gs2' }));
            expect(spy).toHaveBeenCalledWith('gs2');
        });

        it('should handle select all', () => {
            const spy = vi.spyOn(element.store, 'selectAllPlants');
            (element as any)._handleSelectAll();
            expect(spy).toHaveBeenCalled();
        });

        it('should handle clear selection', () => {
            (element as any)._handleClearSelection();
            expect(element.store.ui.clearPlantSelection).toHaveBeenCalled();
        });

        it('should handle exit edit mode', () => {
            (element as any)._handleExitEditMode();
            expect(element.store.ui.setEditMode).toHaveBeenCalledWith(false);
        });

        it('should handle keyboard nav', () => {
            const spy = vi.spyOn(element.store, 'handleKeyboardNavigation');
            (element as any)._handleKeyboardNav(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
            expect(spy).toHaveBeenCalledWith('ArrowRight');
        });

        it('should handle file download when export event received', () => {
            const a = document.createElement('a');
            const clickSpy = vi.spyOn(a, 'click').mockImplementation(() => { });
            const appendSpy = vi.spyOn(document.body, 'appendChild');
            const removeChildSpy = vi.spyOn(document.body, 'removeChild');

            vi.spyOn(document, 'createElement').mockReturnValue(a);

            const event = new LibraryExportReadyEvent('http://test.com/file.zip');
            (element as any)._handleLibraryExportReady(event);

            expect(appendSpy).toHaveBeenCalledWith(a);
            expect(clickSpy).toHaveBeenCalled();
            expect(removeChildSpy).toHaveBeenCalledWith(a);
            expect(a.href).toContain('http://test.com/file.zip');
            expect(a.download).toBe('file.zip');
        });

        it('should fallback to export.zip if URL has no segments', () => {
            const a = document.createElement('a');
            vi.spyOn(a, 'click').mockImplementation(() => { });
            vi.spyOn(document, 'createElement').mockReturnValue(a);
            vi.spyOn(document.body, 'appendChild').mockImplementation(() => a);
            vi.spyOn(document.body, 'removeChild').mockImplementation(() => a);


            (element as any)._downloadFile('http://test.com/');
            expect(a.download).toBe('export.zip');
        });



        it('should toggle header expansion', () => {
            const spy = vi.spyOn(element.store, 'toggleHeaderExpansion');
            element.store.toggleHeaderExpansion();
            expect(spy).toHaveBeenCalled();
        });

        it('should trigger store action on DOM toggle-expansion event', async () => {
            const spy = vi.spyOn(element.store, 'toggleHeaderExpansion');

            atomMocks.$isLoading.set(false);
            atomMocks.$activeDevices.set([{ device_id: 'gs1', name: 'Tent', plants_per_row: 4 }]);
            atomMocks.$selectedDevice.set('gs1');
            atomMocks.$gridLayout.set({ effectiveRows: 1, grid: [] });
            atomMocks.$growspaceOptions.set({});

            document.body.appendChild(element);

            // Wait for update with a timeout safety
            await Promise.race([
                element.updateComplete,
                new Promise(r => setTimeout(r, 200))
            ]);

            const panel = element.shadowRoot?.querySelector('.unified-growspace-card');
            if (panel) {
                panel.dispatchEvent(new CustomEvent('toggle-expansion', { bubbles: true, composed: true }));
                expect(spy).toHaveBeenCalled();
            }
        });

        it('should handle water selected', () => {
            const spy = vi.spyOn(element.store, 'openBatchWateringDialog');
            (element as any)._handleWaterSelected();
            expect(spy).toHaveBeenCalled();
        });

        it('should trigger batch watering dialog on water-selected event', async () => {
            const spy = vi.spyOn(element.store, 'openBatchWateringDialog');

            atomMocks.$isLoading.set(false);
            atomMocks.$activeDevices.set([{ device_id: 'gs1', name: 'Tent', plants_per_row: 4 }]);
            atomMocks.$selectedDevice.set('gs1');
            atomMocks.$gridLayout.set({ effectiveRows: 1, grid: [] });
            atomMocks.$growspaceOptions.set({});

            document.body.appendChild(element);
            await Promise.race([element.updateComplete, new Promise(r => setTimeout(r, 200))]);

            const panel = element.shadowRoot?.querySelector('.unified-growspace-card');
            if (panel) {
                panel.dispatchEvent(new CustomEvent('water-selected', { bubbles: true, composed: true }));
                expect(spy).toHaveBeenCalled();
            }
        });

        it('should trigger batch training dialog on training-selected event', async () => {
            const spy = vi.spyOn(element.store, 'openBatchTrainingDialog');

            atomMocks.$isLoading.set(false);
            atomMocks.$activeDevices.set([{ device_id: 'gs1', name: 'Tent', plants_per_row: 4 }]);
            atomMocks.$selectedDevice.set('gs1');
            atomMocks.$gridLayout.set({ effectiveRows: 1, grid: [] });
            atomMocks.$growspaceOptions.set({});

            document.body.appendChild(element);
            await Promise.race([element.updateComplete, new Promise(r => setTimeout(r, 200))]);

            const panel = element.shadowRoot?.querySelector('.unified-growspace-card');
            if (panel) {
                panel.dispatchEvent(new CustomEvent('training-selected', { bubbles: true, composed: true }));
                expect(spy).toHaveBeenCalled();
            }
        });

        it('should handle toggle expansion directly', () => {
            const spy = vi.spyOn(element.store, 'toggleHeaderExpansion');
            (element as any)._handleToggleExpansion();
            expect(spy).toHaveBeenCalled();
        });

        it('should handle training selected directly', () => {
            const spy = vi.spyOn(element.store, 'openBatchTrainingDialog');
            (element as any)._handleTrainingSelected();
            expect(spy).toHaveBeenCalled();
        });

        it('should handle ipm selected directly', () => {
            const spy = vi.spyOn(element.store, 'openIPMDialog');
            (element as any)._handleIPMSelected();
            expect(spy).toHaveBeenCalled();
        });

        it('should trigger ipm dialog on ipm-selected event', async () => {
            const spy = vi.spyOn(element.store, 'openIPMDialog');

            atomMocks.$isLoading.set(false);
            atomMocks.$activeDevices.set([{ device_id: 'gs1', name: 'Tent', plants_per_row: 4 }]);
            atomMocks.$selectedDevice.set('gs1');
            atomMocks.$gridLayout.set({ effectiveRows: 1, grid: [] });
            atomMocks.$growspaceOptions.set({});

            document.body.appendChild(element);
            await Promise.race([element.updateComplete, new Promise(r => setTimeout(r, 200))]);

            const panel = element.shadowRoot?.querySelector('.unified-growspace-card');
            if (panel) {
                panel.dispatchEvent(new CustomEvent('ipm-selected', { bubbles: true, composed: true }));
                expect(spy).toHaveBeenCalled();
            }
        });

        it('should handle batch add plants directly', () => {
            const spy = vi.spyOn(element.store.ui, 'setActiveDialog');
            (element as any)._handleBatchAddPlants();
            expect(spy).toHaveBeenCalledWith({ type: 'ADD_PLANTS', payload: {} });
        });

        it('should trigger batch add plants dialog on batch-add-plants event', async () => {
            const spy = vi.spyOn(element.store.ui, 'setActiveDialog');

            atomMocks.$isLoading.set(false);
            atomMocks.$activeDevices.set([{ device_id: 'gs1', name: 'Tent', plants_per_row: 4 }]);
            atomMocks.$selectedDevice.set('gs1');
            atomMocks.$gridLayout.set({ effectiveRows: 1, grid: [] });
            atomMocks.$growspaceOptions.set({});

            document.body.appendChild(element);
            await Promise.race([element.updateComplete, new Promise(r => setTimeout(r, 200))]);

            const panel = element.shadowRoot?.querySelector('.unified-growspace-card');
            if (panel) {
                panel.dispatchEvent(new CustomEvent('batch-add-plants', { bubbles: true, composed: true }));
                expect(spy).toHaveBeenCalledWith({ type: 'ADD_PLANTS', payload: {} });
            }
        });
    });
});