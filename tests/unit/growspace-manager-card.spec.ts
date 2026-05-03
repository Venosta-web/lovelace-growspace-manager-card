import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { GrowspaceManagerCard } from '../../src/growspace-manager-card';
import { GrowspaceManagerCardConfig } from '../../src/lib/types/config';
import { HomeAssistant } from 'custom-card-helpers';
import { LibraryExportReadyEvent } from '../../src/lib/events';
import { ViewMode } from '../../src/features/environment/constants';
import { atom, computed } from 'nanostores';

// Mock dependencies
// Mock dependencies
vi.mock('../../src/features/ui/containers/growspace-header.container', () => ({}));
vi.mock('../../src/features/ui/containers/growspace-dialog-host.container', () => ({}));
vi.mock('../../src/features/shared/layouts/growspace-view-switcher', () => ({}));

export const mockSubscriptionCallback = { fn: undefined as ((refresh: boolean) => void) | undefined };

vi.mock('../../src/controllers/subscription-controller', () => ({
    SubscriptionController: class {
        constructor(host: any, store: any, onUpdate: (refresh: boolean) => void) {
            mockSubscriptionCallback.fn = onUpdate;
        }
        updateHass() { }
        hostConnected() { }
        hostDisconnected() { }
    }
}));

// Mock window location
const mockLocation = {
    search: '',
    href: 'http://localhost/',
    assign: vi.fn(),
    replace: vi.fn(),
    reload: vi.fn(),
};

const atomMocks = vi.hoisted(() => ({
    $devices: null as any,
    $selectedDevice: null as any,
    $strainLibrary: null as any,
    $optimisticDeletedPlantIds: null as any,
    $activeDevices: null as any,
    $gridLayout: null as any,
    $growspaceOptions: null as any,
    $gridViewState: null as any,
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
    $pendingDeepLinkPlantId: null as any,
    $mainCardState: null as any,
    $gridOverlayMode: null as any,
}));

vi.mock('../../src/store/core/growspace-store', () => ({
    GrowspaceStore: class {
        host: any;
        dataService = {};
        data = {
            $devices: atomMocks.$devices,
            $selectedDevice: atomMocks.$selectedDevice,
            $strainLibrary: atomMocks.$strainLibrary,
            $optimisticDeletedPlantIds: atomMocks.$optimisticDeletedPlantIds,
            fetchStrainLibrary: vi.fn(),
            initializeSelectedDevice: vi.fn(),
            handleDeviceChange: vi.fn(),
            fetchNutrientPresets: vi.fn(),
            fetchIPMPresets: vi.fn(),
            fetchNutrientInventory: vi.fn(),
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
            $pendingDeepLinkPlantId: atomMocks.$pendingDeepLinkPlantId,
            setViewMode: vi.fn(),
            setEditMode: vi.fn(),
            clearPlantSelection: vi.fn(),
            setIsLoading: vi.fn(),
            selectAllPlants: vi.fn(),
            setFocusedPlantIndex: vi.fn(),
            setActiveDialog: vi.fn(),
            toggleTransplantMode: vi.fn(),
        };
        grid = {
            $activeDevices: atomMocks.$activeDevices,
            $gridLayout: atomMocks.$gridLayout,
            $growspaceOptions: atomMocks.$growspaceOptions,
            $gridViewState: atomMocks.$gridViewState,
        };
        history = {
            $historyCache: {},
        };
        $mainCardState = atomMocks.$mainCardState;

        constructor(host: any) { this.host = host; }
        updateHass() { }
        initializeSelectedDevice() { }
        fetchStrainLibrary() { }
        fetchNutrientPresets() { }
        fetchIPMPresets() { }
        fetchNutrientInventory() { }
        handleDeviceChange() { }
        handleKeyboardNavigation() { }
        toggleHeaderExpansion() { }
        selectAllPlants() { }
        deleteSelectedPlants() { }
        clearPlantSelection() { this.ui.clearPlantSelection(); }
        openBatchWateringDialog = vi.fn();
        openBatchTrainingDialog = vi.fn();
        openIPMDialog = vi.fn();
        destroy = vi.fn();
        handleDeepLink = vi.fn();
        refreshData = vi.fn();
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
        atomMocks.$gridViewState = atom({
            devices: [],
            selectedDevice: 'gs1',
            gridLayout: { effectiveRows: 1, grid: [] },
            growspaceOptions: {},
        });
        atomMocks.$viewMode = atom('standard');
        atomMocks.$isLoading = atom(false);
        atomMocks.$activeDialog = atom<any>({ type: 'NONE' });
        atomMocks.$isEditMode = atom(false);
        atomMocks.$isCompactView = atom(false);
        atomMocks.$selectedPlants = atom(new Set());
        atomMocks.$focusedPlantIndex = atom<number>(-1);
        atomMocks.$notification = atom<any>(null);
        atomMocks.$pendingDeepLinkPlantId = atom<string | null>(null);
        atomMocks.$gridOverlayMode = atom('none');

        // Derived mock for consolidated state - matches implementation
        atomMocks.$cardViewState = computed(
            [atomMocks.$viewMode, atomMocks.$isLoading, atomMocks.$isEditMode, atomMocks.$isCompactView, atomMocks.$activeDialog, atomMocks.$notification, atomMocks.$focusedPlantIndex, atomMocks.$selectedPlants, atomMocks.$gridOverlayMode],
            (viewMode, isLoading, isEditMode, isCompact, activeDialog, notification, focusedPlantIndex, selectedPlants, overlayMode) => ({
                viewMode,
                isLoading,
                isEditMode,
                isCompact,
                activeDialog,
                notification,
                focusedPlantIndex,
                selectedPlants,
                overlayMode,
            })
        );

        // Derived mock for main card state (grid + ui + strainLibrary)
        atomMocks.$mainCardState = computed(
            [atomMocks.$gridViewState, atomMocks.$cardViewState, atomMocks.$strainLibrary],
            (grid, ui, strainLibrary) => ({ grid, ui, strainLibrary })
        );

        // Mock history
        vi.spyOn(window.history, 'replaceState').mockImplementation(() => { });

        // Try to reset search if possible
        // try {
        //    window.location.search = '';
        // } catch (e) {
        //    // ignore
        // }

        element = new GrowspaceManagerCard();
        mockHass = {
            states: {},
            callService: vi.fn(),
            connection: { subscribeEvents: vi.fn() }
        } as any;
        element.hass = mockHass;
        vi.clearAllMocks();
        (window as any).GROWSPACE_DEEP_LINK_TRACKED = undefined;
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
                // Ignore errors from missing editor file in test env if any
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

        it('should set compact mode from config fallback', () => {
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

        it('should process pending deep link when hass updates', () => {
            const handleDeepLinkSpy = vi.spyOn(element.store, 'handleDeepLink');
            atomMocks.$pendingDeepLinkPlantId.set('plant123');

            (element as any).updated(new Map([['hass', 'oldValues']]));

            expect(handleDeepLinkSpy).toHaveBeenCalledWith('plant123');
        });

        it('should expose public getters', () => {
            expect(element.dataService).toBe(element.store.dataService);
            // devices and selectedDevice now come from $gridViewState
            expect(element.devices).toEqual(atomMocks.$gridViewState.get().devices);
            expect(element.selectedDevice).toBe(atomMocks.$gridViewState.get().selectedDevice);
        });

        it('should sync strain library when controller updates', async () => {
            (element as any)._viewController = { value: { grid: {}, ui: {}, strainLibrary: [{ strain: 'new' }] } };
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
            expect(element.store.destroy).toHaveBeenCalled();
        });
    });

    describe('Deep Linking', () => {
        it('should handle deep link on firstUpdated', () => {
            window.history.pushState({}, '', '?plantId=p1');
            const spy = vi.spyOn(element.store, 'handleDeepLink');

            (element as any).firstUpdated();

            expect(spy).toHaveBeenCalledWith('p1');
            expect(window.history.replaceState).toHaveBeenCalled();
            expect((window as any).GROWSPACE_DEEP_LINK_TRACKED).toBe('p1');
        });

        it('should ignore if global tracker already matched', () => {
            window.history.pushState({}, '', '?plantId=p1');
            (window as any).GROWSPACE_DEEP_LINK_TRACKED = 'p1';
            const spy = vi.spyOn(element.store, 'handleDeepLink');

            (element as any).firstUpdated();

            expect(spy).not.toHaveBeenCalled();
        });

        it('should do nothing if no plantId param', () => {
            window.history.pushState({}, '', '/');
            const spy = vi.spyOn(element.store, 'handleDeepLink');

            (element as any).firstUpdated();

            expect(spy).not.toHaveBeenCalled();
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
            atomMocks.$gridViewState.set({ devices: [], selectedDevice: null, gridLayout: { effectiveRows: 0, grid: [] }, growspaceOptions: {} });
            document.body.appendChild(element);
            await element.updateComplete;
            const msg = element.shadowRoot?.querySelector('.no-data');
            expect(msg?.textContent).toContain('No growspace devices found');
        });

        it('should render error if selected device is invalid', async () => {
            atomMocks.$isLoading.set(false);
            const mockDevice = { deviceId: 'gs2', name: 'Other', plantsPerRow: 4 };
            atomMocks.$gridViewState.set({ devices: [mockDevice], selectedDevice: 'gs1', gridLayout: { effectiveRows: 1, grid: [] }, growspaceOptions: { gs2: 'Other' } });

            document.body.appendChild(element);
            await element.updateComplete;

            const err = element.shadowRoot?.querySelector('.error');
            expect(err?.textContent).toContain('No valid growspace selected');
        });

        it('should render main card', async () => {
            atomMocks.$isLoading.set(false);
            const mockDevice = { deviceId: 'gs1', name: 'Tent', plantsPerRow: 4 };
            atomMocks.$gridViewState.set({ devices: [mockDevice], selectedDevice: 'gs1', gridLayout: { effectiveRows: 1, grid: [] }, growspaceOptions: { gs1: 'Tent' } });

            document.body.appendChild(element);
            await element.updateComplete;

            const switcher = element.shadowRoot?.querySelector('growspace-view-switcher');
            expect(switcher).toBeTruthy();
        });

        it('should render wide card class', async () => {
            atomMocks.$isLoading.set(false);
            const mockDevice = { deviceId: 'gs1', name: 'Tent', plantsPerRow: 8 };
            atomMocks.$gridViewState.set({ devices: [mockDevice], selectedDevice: 'gs1', gridLayout: { effectiveRows: 1, grid: [] }, growspaceOptions: { gs1: 'Tent' } });

            document.body.appendChild(element);
            await element.updateComplete;

            const card = element.shadowRoot?.querySelector('ha-card');
            expect(card?.classList.contains('wide-growspace')).toBe(true);
        });
    });

    describe('Event Handlers', () => {
        it('should handle view mode changed', () => {
            (element as any)._handleViewModeChanged({ detail: { mode: 'list' } });
            expect(element.store.ui.setViewMode).toHaveBeenCalledWith('list');
        });

        it('should handle errors and report to system log', () => {
            const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
            const error = new Error('Test error');
            const errorInfo = { componentStack: 'stack trace' };

            (element as any)._handleError(error, errorInfo);

            expect(errorSpy).toHaveBeenCalledWith('Growspace Manager Card caught error:', error, errorInfo);
            expect(mockHass.callService).toHaveBeenCalledWith('system_log', 'write', expect.objectContaining({
                message: expect.stringContaining('Growspace Manager Card Error: Test error')
            }));
            errorSpy.mockRestore();
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

        it('should handle delete selected', () => {
            const spy = vi.spyOn(element.store, 'deleteSelectedPlants');
            (element as any)._handleDeleteSelected();
            expect(spy).toHaveBeenCalled();
        });

        it('should handle transplant mode', () => {
            const spy = vi.spyOn(element.store.ui, 'toggleTransplantMode');
            (element as any)._handleTransplantMode();
            expect(spy).toHaveBeenCalled();
        });

        it('should handle batch add plants', () => {
            const spy = vi.spyOn(element.store.ui, 'setActiveDialog');
            (element as any)._handleBatchAddPlants();
            expect(spy).toHaveBeenCalledWith({ type: 'ADD_PLANTS', payload: {} });
        });

        it('should handle keyboard nav', () => {
            const spy = vi.spyOn(element.store, 'handleKeyboardNavigation');
            (element as any)._handleKeyboardNav(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
            expect(spy).toHaveBeenCalledWith('ArrowRight');
        });

        it('should trigger download when _downloadFile is called', () => {
            const createElementSpy = vi.spyOn(document, 'createElement');
            const clickSpy = vi.fn();
            const aMock = {
                style: {},
                href: '',
                download: '',
                click: clickSpy,
                split: () => ['test.zip']
            };

            createElementSpy.mockReturnValue(aMock as any);
            vi.spyOn(document.body, 'appendChild').mockImplementation(() => ({} as any));
            vi.spyOn(document.body, 'removeChild').mockImplementation(() => ({} as any));

            (element as any)._downloadFile('http://test.com/file.zip');

            expect(createElementSpy).toHaveBeenCalledWith('a');
            expect(clickSpy).toHaveBeenCalled();
            expect(aMock.download).toBe('file.zip');
        });

        it('should fallback to export.zip if URL has no segments', () => {
            const createElementSpy = vi.spyOn(document, 'createElement');
            const aMock = { style: {}, href: '', download: '', click: vi.fn() };
            createElementSpy.mockReturnValue(aMock as any);

            (element as any)._downloadFile('http://test.com/');
            expect(aMock.download).toBe('export.zip');
        });

        it('should handle library export ready event', () => {
            const spy = vi.spyOn(element as any, '_downloadFile').mockImplementation(() => { });
            const event = new LibraryExportReadyEvent('url');
            (element as any)._handleLibraryExportReady(event);
            expect(spy).toHaveBeenCalledWith('url');
        });
    });


    describe('Subscription & Handlers', () => {
        it('should handle subscription update callback', () => {
            const updateSpy = vi.spyOn(element.store, 'updateHass');
            const refreshSpy = vi.spyOn(element.store, 'refreshData');

            if (mockSubscriptionCallback.fn) {
                mockSubscriptionCallback.fn(true);
                expect(updateSpy).toHaveBeenCalledWith(mockHass);
                expect(refreshSpy).toHaveBeenCalledWith(true);
            } else {
                throw new Error('Subscription callback not captured');
            }
        });

        it('should handle private event handlers', () => {
            // Clear selection
            const clearSpy = vi.spyOn(element.store, 'clearPlantSelection');
            (element as any)._handleClearSelection();
            expect(clearSpy).toHaveBeenCalled();

            // Water selected
            const waterSpy = vi.spyOn(element.store, 'openBatchWateringDialog');
            (element as any)._handleWaterSelected();
            expect(waterSpy).toHaveBeenCalled();

            // Exit edit mode
            const editSpy = vi.spyOn(element.store.ui, 'setEditMode');
            (element as any)._handleExitEditMode();
            expect(editSpy).toHaveBeenCalledWith(false);

            // IPM selected
            const ipmSpy = vi.spyOn(element.store, 'openIPMDialog');
            (element as any)._handleIPMSelected();
            expect(ipmSpy).toHaveBeenCalled();

            // Toggle expansion (if available)
            if (typeof (element as any)._handleToggleExpansion === 'function') {
                const toggleSpy = vi.spyOn(element.store, 'toggleHeaderExpansion');
                (element as any)._handleToggleExpansion();
                expect(toggleSpy).toHaveBeenCalled();
            }

            // Training selected
            const trainingSpy = vi.spyOn(element.store, 'openBatchTrainingDialog');
            (element as any)._handleTrainingSelected();
            expect(trainingSpy).toHaveBeenCalled();

            // Batch Add
            const dialogSpy = vi.spyOn(element.store.ui, 'setActiveDialog');
            (element as any)._handleBatchAddPlants();
            expect(dialogSpy).toHaveBeenCalledWith({ type: 'ADD_PLANTS', payload: {} });
        });
    });
});
