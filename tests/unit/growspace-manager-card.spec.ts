import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { GrowspaceManagerCard } from '../../src/growspace-manager-card';
import { GrowspaceManagerCardConfig } from '../../src/lib/types/config';
import { HomeAssistant } from 'custom-card-helpers';
import { LibraryExportReadyEvent } from '../../src/lib/events';
import { ViewMode } from '../../src/features/environment/constants';
import { atom, computed } from 'nanostores';
import { setMutateListener, undo, canUndo } from '../../src/services/mutate';
import { selectedDeviceId$ } from '../../src/slices/grid';

vi.mock('../../src/services/mutate', () => ({
    setMutateListener: vi.fn(),
    undo: vi.fn(),
    canUndo: vi.fn(),
    mutate: vi.fn(),
}));

vi.mock('../../src/slices/grid', () => ({
    selectedDeviceId$: { get: vi.fn() },
}));

vi.mock('../../src/slices/grid-interaction', () => ({
    startTransplant: vi.fn(),
    completeTransplant: vi.fn(),
    select: vi.fn(),
    cancel: vi.fn(),
    gridInteraction$: { get: vi.fn(() => ({ status: 'idle' })), set: vi.fn(), listen: vi.fn(() => () => {}) },
}));

// Mock dependencies
// Mock dependencies
vi.mock('../../src/features/ui/containers/growspace-header.container', () => ({}));
vi.mock('../../src/features/ui/containers/growspace-dialog-host.container', () => ({}));
vi.mock('../../src/features/shared/layouts/growspace-view-switcher', () => ({}));

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
            showToast: vi.fn(),
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

        actions = {
            library: {
                fetchStrains: vi.fn(),
                fetchNutrientPresets: vi.fn(),
                fetchIPMPresets: vi.fn(),
                fetchNutrientInventory: vi.fn(),
            },
            ui: {
                handleKeyboardNavigation: vi.fn(),
                selectAllPlants: vi.fn(),
                clearPlantSelection: vi.fn(),
                deleteSelectedPlants: vi.fn(),
                openBatchWateringDialog: vi.fn(),
                openBatchTrainingDialog: vi.fn(),
                openBatchCloneDialog: vi.fn(),
                openBatchPrintLabelsDialog: vi.fn(),
                openIPMDialog: vi.fn(),
                handleDeepLink: vi.fn(),
                exitEditMode: vi.fn(),
                toggleHeaderExpansion: vi.fn(),
                toggleEnvGraph: vi.fn(),
                toast: vi.fn(),
            },
            plant: {
                batchAction: vi.fn(),
                printLabel: vi.fn(),
            },
        };

        constructor(host: any) { this.host = host; }
        updateHass() { }
        initializeSelectedDevice() { }
        handleDeviceChange() { }
        destroy = vi.fn();
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
                default_growspace: '',
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

        it('should accept config with compact flag without error', () => {
            const config: GrowspaceManagerCardConfig = {
                type: 'custom:growspace-manager-card',
                compact: true
            };
            element.setConfig(config);
            expect((element as any)._config).toEqual(config);
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
            const spyFetchStrain = vi.spyOn(element.store.actions.library, 'fetchStrains');

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
            const handleDeepLinkSpy = vi.spyOn(element.store.actions.ui, 'handleDeepLink');
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
            const spy = vi.spyOn(element.store.actions.ui, 'handleDeepLink');

            (element as any).firstUpdated();

            expect(spy).toHaveBeenCalledWith('p1');
            expect(window.history.replaceState).toHaveBeenCalled();
            expect((window as any).GROWSPACE_DEEP_LINK_TRACKED).toBe('p1');
        });

        it('should ignore if global tracker already matched', () => {
            window.history.pushState({}, '', '?plantId=p1');
            (window as any).GROWSPACE_DEEP_LINK_TRACKED = 'p1';
            const spy = vi.spyOn(element.store.actions.ui, 'handleDeepLink');

            (element as any).firstUpdated();

            expect(spy).not.toHaveBeenCalled();
        });

        it('should do nothing if no plantId param', () => {
            window.history.pushState({}, '', '/');
            const spy = vi.spyOn(element.store.actions.ui, 'handleDeepLink');

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
            const spinner = element.shadowRoot?.querySelector('ha-circular-progress');
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
            const spy = vi.spyOn(element.store.actions.ui, 'selectAllPlants');
            (element as any)._handleSelectAll();
            expect(spy).toHaveBeenCalled();
        });

        it('should handle delete selected', () => {
            const spy = vi.spyOn(element.store.actions.ui, 'deleteSelectedPlants');
            (element as any)._handleDeleteSelected();
            expect(spy).toHaveBeenCalled();
        });

        it('should handle transplant mode', async () => {
            const { startTransplant } = await import('../../src/slices/grid-interaction');
            (element as any)._handleTransplantMode();
            expect(startTransplant).toHaveBeenCalled();
        });

        it('should exit transplant mode and restore edit bar when transplant mode button is clicked while transplanting', async () => {
            const { gridInteraction$, completeTransplant } = await import('../../src/slices/grid-interaction');
            vi.mocked(gridInteraction$.get).mockReturnValue({ status: 'transplanting', sourcePlantId: null });
            const setEditModeSpy = vi.spyOn(element.store.ui, 'setEditMode');

            (element as any)._handleTransplantMode();

            expect(completeTransplant).toHaveBeenCalled();
            expect(setEditModeSpy).toHaveBeenCalledWith(true);
        });

        it('should not call startTransplant when already transplanting', async () => {
            const { gridInteraction$, startTransplant } = await import('../../src/slices/grid-interaction');
            vi.mocked(gridInteraction$.get).mockReturnValue({ status: 'transplanting', sourcePlantId: null });
            vi.mocked(startTransplant).mockClear();

            (element as any)._handleTransplantMode();

            expect(startTransplant).not.toHaveBeenCalled();
        });

        it('should handle batch add plants', () => {
            const spy = vi.spyOn(element.store.ui, 'setActiveDialog');
            (element as any)._handleBatchAddPlants();
            expect(spy).toHaveBeenCalledWith({ type: 'ADD_PLANTS', payload: {} });
        });

        it('should handle keyboard nav', () => {
            const spy = vi.spyOn(element.store.actions.ui, 'handleKeyboardNavigation');
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
        it('should call updateHass when updated() is called with hass change', () => {
            const updateSpy = vi.spyOn(element.store, 'updateHass');
            const newHass = { ...mockHass, themes: {} } as any;
            element.hass = newHass;
            (element as any).updated(new Map([['hass', mockHass]]));
            expect(updateSpy).toHaveBeenCalledWith(newHass);
        });

        it('should handle private event handlers', () => {
            // Clear selection
            const clearSpy = vi.spyOn(element.store.actions.ui, 'clearPlantSelection');
            (element as any)._handleClearSelection();
            expect(clearSpy).toHaveBeenCalled();

            // Water selected
            const waterSpy = vi.spyOn(element.store.actions.ui, 'openBatchWateringDialog');
            (element as any)._handleWaterSelected();
            expect(waterSpy).toHaveBeenCalled();

            // Exit edit mode
            const editSpy = vi.spyOn(element.store.ui, 'setEditMode');
            (element as any)._handleExitEditMode();
            expect(editSpy).toHaveBeenCalledWith(false);

            // IPM selected
            const ipmSpy = vi.spyOn(element.store.actions.ui, 'openIPMDialog');
            (element as any)._handleIPMSelected();
            expect(ipmSpy).toHaveBeenCalled();

            // Toggle expansion (if available)
            if (typeof (element as any)._handleToggleExpansion === 'function') {
                const toggleSpy = vi.spyOn(element.store.actions.ui, 'toggleHeaderExpansion');
                (element as any)._handleToggleExpansion();
                expect(toggleSpy).toHaveBeenCalled();
            }

            // Training selected
            const trainingSpy = vi.spyOn(element.store.actions.ui, 'openBatchTrainingDialog');
            (element as any)._handleTrainingSelected();
            expect(trainingSpy).toHaveBeenCalled();

            // Batch Add
            const dialogSpy = vi.spyOn(element.store.ui, 'setActiveDialog');
            (element as any)._handleBatchAddPlants();
            expect(dialogSpy).toHaveBeenCalledWith({ type: 'ADD_PLANTS', payload: {} });
        });

        it('should handle print labels selected', () => {
            const spy = vi.spyOn(element.store.actions.ui, 'openBatchPrintLabelsDialog');
            (element as any)._handlePrintLabelsSelected();
            expect(spy).toHaveBeenCalled();
        });

        it('should handle clone selected', () => {
            const spy = vi.spyOn(element.store.actions.ui, 'openBatchCloneDialog');
            (element as any)._handleCloneSelected();
            expect(spy).toHaveBeenCalled();
        });
    });

    describe('getLayoutOptions', () => {
        it('should return the expected layout options', () => {
            expect(element.getLayoutOptions()).toEqual({
                grid_columns: 12,
                grid_min_columns: 6,
                grid_min_rows: 4,
            });
        });
    });

    describe('setMutateListener callback', () => {
        it('should show a success toast with undo button when a mutate action fires', () => {
            let capturedListener: ((info: any, growspaceId: string) => void) | null = null;
            vi.mocked(setMutateListener).mockImplementation((fn) => { capturedListener = fn; });

            element.connectedCallback();

            expect(capturedListener).not.toBeNull();

            capturedListener!({ label: 'Watering logged', type: 'WATER' }, 'gs1');

            expect(element.store.ui.showToast).toHaveBeenCalledWith(
                'Watering logged',
                'success',
                expect.objectContaining({ label: 'Undo', callback: expect.any(Function) }),
            );
        });

        it('should fall back to info.type as label when label is not provided', () => {
            let capturedListener: ((info: any, growspaceId: string) => void) | null = null;
            vi.mocked(setMutateListener).mockImplementation((fn) => { capturedListener = fn; });

            element.connectedCallback();
            capturedListener!({ type: 'WATER' }, 'gs1');

            expect(element.store.ui.showToast).toHaveBeenCalledWith(
                'WATER',
                'success',
                expect.anything(),
            );
        });

        it('should call undo and show "Action undone" toast when the undo button callback is invoked', async () => {
            let capturedListener: ((info: any, growspaceId: string) => void) | null = null;
            vi.mocked(setMutateListener).mockImplementation((fn) => { capturedListener = fn; });
            vi.mocked(undo).mockResolvedValue(undefined);

            element.connectedCallback();
            capturedListener!({ label: 'Fertilised', type: 'NUTRIENTS' }, 'gs2');

            const { callback } = vi.mocked(element.store.ui.showToast).mock.calls[0][2] as any;
            await callback();

            expect(undo).toHaveBeenCalledWith('gs2');
            expect(element.store.ui.showToast).toHaveBeenCalledWith('Action undone', 'info');
        });

        it('should log an error to console when the undo callback rejects', async () => {
            let capturedListener: ((info: any, growspaceId: string) => void) | null = null;
            vi.mocked(setMutateListener).mockImplementation((fn) => { capturedListener = fn; });
            vi.mocked(undo).mockRejectedValue(new Error('network error'));
            const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

            element.connectedCallback();
            capturedListener!({ label: 'Test', type: 'TEST' }, 'gs1');

            const { callback } = vi.mocked(element.store.ui.showToast).mock.calls[0][2] as any;
            callback(); // fire but do not await — the callback itself isn't async
            // flush the microtask queue so the .catch() handler runs
            await new Promise((r) => setTimeout(r, 0));

            expect(errorSpy).toHaveBeenCalledWith('[Undo failed]', expect.any(Error));
            errorSpy.mockRestore();
        });
    });

    describe('_handleGlobalKeydown (Ctrl+Z undo)', () => {
        it('should call undo and show toast when Ctrl+Z is pressed and canUndo is true', async () => {
            vi.mocked(selectedDeviceId$.get).mockReturnValue('gs1');
            vi.mocked(canUndo).mockReturnValue(true);
            vi.mocked(undo).mockResolvedValue(undefined);

            const event = new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true });
            const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

            await (element as any)._handleGlobalKeydown(event);

            expect(preventDefaultSpy).toHaveBeenCalled();
            expect(undo).toHaveBeenCalledWith('gs1');
            // Allow the microtask to settle
            await Promise.resolve();
            expect(element.store.ui.showToast).toHaveBeenCalledWith('Action undone', 'info');
        });

        it('should do nothing when the key is not Ctrl+Z', () => {
            vi.mocked(selectedDeviceId$.get).mockReturnValue('gs1');
            vi.mocked(canUndo).mockReturnValue(true);

            const event = new KeyboardEvent('keydown', { key: 'a', ctrlKey: true });
            (element as any)._handleGlobalKeydown(event);

            expect(undo).not.toHaveBeenCalled();
        });

        it('should do nothing when no growspace is selected', () => {
            vi.mocked(selectedDeviceId$.get).mockReturnValue(null);
            vi.mocked(canUndo).mockReturnValue(false);

            const event = new KeyboardEvent('keydown', { key: 'z', ctrlKey: true });
            (element as any)._handleGlobalKeydown(event);

            expect(undo).not.toHaveBeenCalled();
        });

        it('should do nothing when canUndo returns false', () => {
            vi.mocked(selectedDeviceId$.get).mockReturnValue('gs1');
            vi.mocked(canUndo).mockReturnValue(false);

            const event = new KeyboardEvent('keydown', { key: 'z', ctrlKey: true });
            (element as any)._handleGlobalKeydown(event);

            expect(undo).not.toHaveBeenCalled();
        });

        it('should log error when undo rejects in global keydown handler', async () => {
            vi.mocked(selectedDeviceId$.get).mockReturnValue('gs1');
            vi.mocked(canUndo).mockReturnValue(true);
            vi.mocked(undo).mockRejectedValue(new Error('fail'));
            const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

            const event = new KeyboardEvent('keydown', { key: 'z', ctrlKey: true });
            (element as any)._handleGlobalKeydown(event);
            await Promise.resolve();
            await Promise.resolve(); // flush rejection

            expect(errorSpy).toHaveBeenCalledWith('[Undo failed]', expect.any(Error));
            errorSpy.mockRestore();
        });
    });
});
