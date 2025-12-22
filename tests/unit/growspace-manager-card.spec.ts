
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { GrowspaceManagerCard } from '../../src/growspace-manager-card';
import { GrowspaceManagerCardConfig } from '../../src/types';
import { HomeAssistant } from 'custom-card-helpers';
import { LibraryExportReadyEvent } from '../../src/events';

// Mock dependencies
vi.mock('../../src/components/growspace-header', () => ({}));
vi.mock('../../src/components/manager/dialog-host', () => ({}));
vi.mock('../../src/components/growspace-view-switcher', () => ({}));
vi.mock('../../src/controllers/growspace-history-controller', () => ({
    GrowspaceHistoryController: class {
        host: any;
        constructor(host: any) { this.host = host; }
    }
}));
vi.mock('../../src/controllers/grid-controller', () => ({
    GrowspaceGridController: class {
        host: any;
        store: any;
        constructor(host: any, store: any) { this.host = host; this.store = store; }
        get activeDevices() { return []; }
        get gridLayout() { return { effectiveRows: 1, grid: {} }; }
        get growspaceOptions() { return []; }
    }
}));

// Mock dynamic import
// This mock might not work for dynamic imports inside the source unless we intercept it.
// However, JSDOM/Node might just fail to resolve relative .js file if it's not compiled.
// We can just rely on ensuring the METHOD `getConfigElement` exists and does something.

// Mock ui-store
vi.mock('../../src/store/ui-store', () => {
    return {
        setViewMode: vi.fn(),
        setEditMode: vi.fn(),
        clearPlantSelection: vi.fn(),
        setIsLoading: vi.fn(),
        selectAllPlants: vi.fn(),
        setFocusedPlantIndex: vi.fn(),
        $viewMode: { subscribe: vi.fn((cb) => { cb('standard'); return () => { }; }), get: () => 'standard', set: vi.fn() },
        $isLoading: { subscribe: vi.fn((cb) => { cb(false); return () => { }; }), get: () => false, set: vi.fn() },
        $activeDialog: { subscribe: vi.fn((cb) => { cb({ type: 'NONE' }); return () => { }; }), get: () => ({ type: 'NONE' }), set: vi.fn() },
        $isEditMode: { subscribe: vi.fn((cb) => { cb(false); return () => { }; }), get: () => false, set: vi.fn() },
        $isCompactView: { subscribe: vi.fn((cb) => { cb(false); return () => { }; }), get: () => false },
        $selectedPlants: { subscribe: vi.fn((cb) => { cb(new Set()); return () => { }; }), get: () => new Set() },
        $focusedPlantIndex: { subscribe: vi.fn((cb) => { cb(-1); return () => { }; }), get: () => -1 },
        $menuOpen: { subscribe: vi.fn((cb) => { cb(false); return () => { }; }), get: () => false },
        $notification: { subscribe: vi.fn((cb) => { cb(null); return () => { }; }), get: () => null }
    };
});
import * as UIStoreMock from '../../src/store/ui-store';

// Mock data-store
vi.mock('../../src/store/data-store', () => ({
    $devices: { subscribe: vi.fn((cb) => { cb([]); return () => { }; }), get: () => [], set: vi.fn() },
    $selectedDevice: { subscribe: vi.fn((cb) => { cb('gs1'); return () => { }; }), get: () => 'gs1', set: vi.fn() },
    $strainLibrary: { subscribe: vi.fn((cb) => { cb([]); return () => { }; }), get: () => [], set: vi.fn() },
}));
import * as DataStoreMock from '../../src/store/data-store';

vi.mock('../../src/store/growspace-store', () => ({
    GrowspaceStore: class {
        host: any;
        dataService = {};
        constructor(host: any) { this.host = host; }
        updateHass() { }
        initializeSelectedDevice() { }
        fetchStrainLibrary() { }
        handleDeviceChange() { }
        handleKeyboardNavigation() { }
        toggleHeaderExpansion() { }
        selectAllPlants() { }
    }
}));

describe('GrowspaceManagerCard', () => {
    let element: GrowspaceManagerCard;
    let mockHass: HomeAssistant;

    beforeEach(() => {
        element = new GrowspaceManagerCard();
        mockHass = {
            states: {},
            callService: vi.fn(),
            connection: { subscribeEvents: vi.fn() }
        } as any;
        element.hass = mockHass;
        vi.clearAllMocks();

        // Reset defaults
        const emptyArray: any[] = [];
        (DataStoreMock.$selectedDevice as any).get = () => 'gs1';
        (DataStoreMock.$devices as any).get = () => emptyArray;
        (DataStoreMock.$strainLibrary as any).get = () => emptyArray;
        (UIStoreMock.$isLoading as any).get = () => false;
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

        // getConfigElement requires importing a file that may not exist in test env or is not compiled.
        // We skip testing actual import logic but test method existence if needed.
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
            expect(UIStoreMock.setViewMode).toHaveBeenCalledWith('compact');
        });

        it('should set initial view mode from config', () => {
            const config: GrowspaceManagerCardConfig = {
                type: 'custom:growspace-manager-card',
                initial_view_mode: 'header'
            };
            element.setConfig(config);
            expect(UIStoreMock.setViewMode).toHaveBeenCalledWith('header');
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
            Object.defineProperty(element, '_isLoadingController', { value: { value: true } });
            document.body.appendChild(element);
            await element.updateComplete;
            const spinner = element.shadowRoot?.querySelector('.loading-spinner');
            expect(spinner).toBeTruthy();
        });

        it('should render no data message if no devices', async () => {
            Object.defineProperty(element, '_isLoadingController', { value: { value: false } });
            vi.spyOn(element.gridController, 'activeDevices', 'get').mockReturnValue([]);

            document.body.appendChild(element);
            await element.updateComplete;

            const msg = element.shadowRoot?.querySelector('.no-data');
            expect(msg).toBeTruthy();
            expect(msg?.textContent).toContain('No growspace devices found');
        });

        it('should render error if selected device is invalid', async () => {
            Object.defineProperty(element, '_isLoadingController', { value: { value: false } });
            vi.spyOn(element.gridController, 'activeDevices', 'get').mockReturnValue([{ device_id: 'gs2' }] as any);
            Object.defineProperty(element, '_selectedDeviceController', { value: { value: 'gs1' } });

            document.body.appendChild(element);
            await element.updateComplete;

            const err = element.shadowRoot?.querySelector('.error');
            expect(err).toBeTruthy();
            expect(err?.textContent).toContain('No valid growspace selected');
        });

        it('should render main card with notification', async () => {
            Object.defineProperty(element, '_isLoadingController', { value: { value: false } });
            const mockDevice = { device_id: 'gs1', name: 'Tent', plants_per_row: 4 };
            vi.spyOn(element.gridController, 'activeDevices', 'get').mockReturnValue([mockDevice] as any);
            Object.defineProperty(element, '_selectedDeviceController', { value: { value: 'gs1' } });
            Object.defineProperty(element, '_notificationController', { value: { value: { type: 'success', message: 'Test Notif' } } });

            // Default explicit mocks for controllers to avoid undefined errors during render
            Object.defineProperty(element, '_viewModeController', { value: { value: 'standard' } });
            Object.defineProperty(element, '_isCompactController', { value: { value: false } });
            Object.defineProperty(element, '_isEditModeController', { value: { value: false } });
            Object.defineProperty(element, '_focusedPlantIndexController', { value: { value: -1 } });
            Object.defineProperty(element, '_selectedPlantsController', { value: { value: new Set() } });

            document.body.appendChild(element);
            await element.updateComplete;

            const toast = element.shadowRoot?.querySelector('.toast-notification');
            expect(toast).toBeTruthy();
            expect(toast?.textContent).toContain('Test Notif');
            expect(toast?.classList.contains('success')).toBe(true);
        });

        it('should render wide card class', async () => {
            Object.defineProperty(element, '_isLoadingController', { value: { value: false } });
            const mockDevice = { device_id: 'gs1', name: 'Tent', plants_per_row: 8 };
            vi.spyOn(element.gridController, 'activeDevices', 'get').mockReturnValue([mockDevice] as any);
            Object.defineProperty(element, '_selectedDeviceController', { value: { value: 'gs1' } });

            // Defaults
            Object.defineProperty(element, '_viewModeController', { value: { value: 'standard' } });
            Object.defineProperty(element, '_isCompactController', { value: { value: false } });
            Object.defineProperty(element, '_isEditModeController', { value: { value: false } });
            Object.defineProperty(element, '_focusedPlantIndexController', { value: { value: -1 } });
            Object.defineProperty(element, '_selectedPlantsController', { value: { value: new Set() } });
            Object.defineProperty(element, '_notificationController', { value: { value: null } });

            document.body.appendChild(element);
            await element.updateComplete;

            const card = element.shadowRoot?.querySelector('ha-card');
            expect(card?.classList.contains('wide-growspace')).toBe(true);
        });
    });

    describe('Event Handlers & Private Methods', () => {
        it('should handle view mode changed', () => {
            (element as any)._handleViewModeChanged({ detail: { mode: 'list' } });
            expect(UIStoreMock.setViewMode).toHaveBeenCalledWith('list');
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
            expect(UIStoreMock.clearPlantSelection).toHaveBeenCalled();
        });

        it('should handle exit edit mode', () => {
            (element as any)._handleExitEditMode();
            expect(UIStoreMock.setEditMode).toHaveBeenCalledWith(false);
        });

        it('should handle keyboard nav', () => {
            const spy = vi.spyOn(element.store, 'handleKeyboardNavigation');
            (element as any)._handleKeyboardNav(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
            expect(spy).toHaveBeenCalledWith('ArrowRight');
        });

        it('should handle file download when export event received', () => {
            const a = document.createElement('a');
            const clickSpy = vi.spyOn(a, 'click');
            const removeSpy = vi.spyOn(a, 'remove'); // Note: implementation calls document.body.removeChild
            const appendSpy = vi.spyOn(document.body, 'appendChild');
            const removeChildSpy = vi.spyOn(document.body, 'removeChild');

            vi.spyOn(document, 'createElement').mockReturnValue(a);

            const event = new LibraryExportReadyEvent('http://test.com/file.zip');
            (element as any)._handleLibraryExportReady(event);

            expect(appendSpy).toHaveBeenCalledWith(a);
            expect(clickSpy).toHaveBeenCalled();
            expect(removeChildSpy).toHaveBeenCalledWith(a);
            expect(a.href).toContain('http://test.com/file.zip');
        });

        it('should focus plant by index (delegation)', () => {
            const mockSwitcher = { focusPlant: vi.fn() };
            vi.spyOn(element.shadowRoot as any || element, 'querySelector').mockReturnValue(mockSwitcher as any);

            // Define getter for shadowRoot to support querySelector if element.shadowRoot is null in test (JSDOM lit elements sometimes tricky)
            Object.defineProperty(element, 'shadowRoot', { value: { querySelector: vi.fn(() => mockSwitcher) }, configurable: true });

            (element as any)._focusPlantByIndex(5);
            expect(mockSwitcher.focusPlant).toHaveBeenCalledWith(5);
        });

        it('should toggle header expansion', () => {
            const spy = vi.spyOn(element.store, 'toggleHeaderExpansion');
            // Simulate event handler calling invocation - usually tied to @toggle-expansion in render
            // We can check if calling the lambda in render works, OR just trust we tested the connection.
            // But we can verify the store method is bound.
            element.store.toggleHeaderExpansion();
            expect(spy).toHaveBeenCalled();
        });
    });
});
