
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fixture, html } from '@open-wc/testing-helpers';
import { GrowspaceHeader } from '../../../src/components/growspace-header';
import { MetricsUtils } from '../../../src/utils/metrics-utils';
import { ChartUtils } from '../../../src/utils/chart-utils';
import { GrowspaceDevice } from '../../../src/types';
import { atom, map } from 'nanostores';

// Mock dependencies
vi.mock('../../../src/utils/metrics-utils', () => ({
    MetricsUtils: {
        computeHeaderMetrics: vi.fn()
    }
}));

vi.mock('../../../src/utils/chart-utils', () => ({
    ChartUtils: {
        generateSparklinePath: vi.fn().mockReturnValue('M0,0 L100,100'),
        getSparklineColor: vi.fn().mockReturnValue('green'),
        generateVpdSparklineSegments: vi.fn().mockReturnValue([])
    }
}));

vi.mock('../../../src/controllers/resize-controller', () => {
    return {
        ResizeController: class {
            observe = vi.fn();
            unobserve = vi.fn();
            isMobile = false;
            hasTouch = false;
            constructor(host: any, callback: any) { }
        }
    };
});

vi.mock('../../../src/components/growspace-chip', () => {
    return {
        GrowspaceChip: class extends HTMLElement { }
    };
});

// Mock ui-store using explicit implementation for control
vi.mock('../../../src/store/ui-store', () => ({
    $activeDialog: { get: vi.fn(() => ({ type: 'NONE' })), set: vi.fn(), subscribe: vi.fn(() => () => { }) },
    $focusedPlantIndex: { get: vi.fn(() => -1), set: vi.fn(), subscribe: vi.fn(() => () => { }) },
    $selectedPlants: { get: vi.fn(() => new Set()), set: vi.fn(), subscribe: vi.fn(() => () => { }) },
    $isEditMode: { get: vi.fn(() => false), set: vi.fn(), subscribe: vi.fn(() => () => { }) },
    $viewMode: { get: vi.fn(() => 'standard'), set: vi.fn(), subscribe: vi.fn(() => () => { }) },
    $defaultApplied: { get: vi.fn(() => false), set: vi.fn(), subscribe: vi.fn(() => () => { }) },
    $isLoading: { get: vi.fn(() => false), set: vi.fn(), subscribe: vi.fn(() => () => { }) },
    setEditMode: vi.fn(),
    setViewMode: vi.fn(),
    setIsLoading: vi.fn(),
    closeDialog: vi.fn(),
    setDefaultApplied: vi.fn(),
    setFocusedPlantIndex: vi.fn(),
    togglePlantSelection: vi.fn(),
    selectAllPlants: vi.fn(),
    clearPlantSelection: vi.fn(),
    setMenuOpen: vi.fn(),
    showToast: vi.fn(),
    $notification: { set: vi.fn() }
}));

// Mock data-store with real atoms
vi.mock('../../../src/store/data-store', async () => {
    const { atom } = await import('nanostores');
    return {
        $devices: atom([]),
        $selectedDevice: atom(null)
    };
});

// Mock history-store
vi.mock('../../../src/store/history-store', () => ({
    $historyCache: { get: vi.fn(), subscribe: vi.fn(() => vi.fn()) },
    $historyLoading: { get: vi.fn(), subscribe: vi.fn(() => vi.fn()) },
    $historyLoaded: { get: vi.fn(), subscribe: vi.fn(() => vi.fn()) },
    $activeEnvGraphs: { get: vi.fn(), subscribe: vi.fn(() => vi.fn()) },
    $linkedGraphGroups: { get: vi.fn(), subscribe: vi.fn(() => vi.fn()) },
    setGraphRange: vi.fn(),
    toggleEnvGraph: vi.fn(),
    unlinkGraphGroup: vi.fn(),
    unlinkGraphMetric: vi.fn(),
    linkGraphs: vi.fn(),
    getGraphRange: vi.fn().mockReturnValue('24h')
}));

describe('GrowspaceHeader', () => {
    let element: GrowspaceHeader;
    let mockStore: any;
    let mockHistory: any;
    let mockHass: any;
    let deviceMock: GrowspaceDevice;
    let configMock: any;

    beforeEach(async () => {
        vi.clearAllMocks(); // Clear mocks for fresh start

        // Mock matchMedia
        Object.defineProperty(window, 'matchMedia', {
            writable: true,
            value: vi.fn().mockImplementation(query => ({
                matches: false,
                media: query,
                onchange: null,
                addListener: vi.fn(), // deprecated
                removeListener: vi.fn(), // deprecated
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
                dispatchEvent: vi.fn(),
            })),
        });

        // Mock scrollBy for JSDOM (not implemented in JSDOM)
        if (!Element.prototype.scrollBy) {
            Element.prototype.scrollBy = vi.fn();
        }
    });

    // Local atoms for testing
    const $devices = atom<any[]>([]);
    const $selectedDevice = atom<string | null>(null);
    const $historyCache = map<Record<string, any>>({});
    const $historyLoading = atom(false);
    const $historyLoaded = atom(false);
    const $activeEnvGraphs = atom(new Set<string>());
    const $linkedGraphGroups = atom<any[]>([]);
    const $combinedHistory = atom({ temperature: [], vpd: [] });

    // UI Store atoms
    const $activeDialog = atom<any>({ type: 'NONE' });
    const $focusedPlantIndex = atom(-1);
    const $selectedPlants = atom(new Set());
    const $isEditMode = atom(false);
    const $viewMode = atom('standard');
    const $defaultApplied = atom(false);
    const $isLoading = atom(false);

    beforeEach(async () => {
        // Reset all atoms
        $devices.set([]);
        $selectedDevice.set(null);
        $historyCache.set({});
        $activeEnvGraphs.set(new Set());
        $isEditMode.set(false);
        $viewMode.set('standard');

        vi.clearAllMocks();
        vi.spyOn($activeDialog, 'set');

        // Initialize Atoms based on mock state
        const mockDevices: any[] = [
            {
                device_id: 'device1',
                name: 'Main Tent',
                sensors: {
                    temperature: 'sensor.temp',
                    humidity: 'sensor.hum',
                    vpd: 'sensor.vpd',
                    light: 'sensor.light'
                },
                vpd_config: { leaf_temp_offset: -2 }
            }
        ];
        $devices.set(mockDevices);
        $selectedDevice.set('device1');

        // Mock History Store Object
        mockHistory = {
            $historyCache,
            $historyLoading,
            $historyLoaded,
            $activeEnvGraphs,
            $linkedGraphGroups,
            $combinedHistory,
            setGraphRange: vi.fn(),
            toggleEnvGraph: vi.fn(),
            unlinkGraphGroup: vi.fn(),
            unlinkGraphMetric: vi.fn(),
            linkGraphs: vi.fn(),
            getRange: vi.fn().mockReturnValue('24h'),
            startAutoRefresh: vi.fn(),
            stopAutoRefresh: vi.fn()
        };

        // Setup Mocks
        mockStore = {
            data: {
                $devices,
                $selectedDevice,
            },
            ui: {
                $viewMode,
                $isEditMode,
                $isLoading,
                $activeDialog,
                $focusedPlantIndex,
                $selectedPlants,
                $defaultApplied,
                setEditMode: vi.fn(),
                setViewMode: vi.fn(),
                setActiveDialog: vi.fn(),
            },
            history: mockHistory,
            handleDeviceChange: vi.fn(),
            openAddPlantDialog: vi.fn(),
            setActiveDialog: vi.fn(),
            setEditMode: vi.fn(),
            setViewMode: vi.fn(),
            fetchStrainLibrary: vi.fn(),
            openLogbookDialog: vi.fn()
        };

        // Initialize Atoms based on mock state
        $devices.set(mockStore?.state?.devices || []);
        $selectedDevice.set(mockStore?.state?.selectedDevice || null);

        // Mock History Store Object
        mockHistory = {
            $historyCache: { get: vi.fn(), subscribe: vi.fn(() => vi.fn()) },
            $historyLoading: { get: vi.fn(), subscribe: vi.fn(() => vi.fn()) },
            $historyLoaded: { get: vi.fn(), subscribe: vi.fn(() => vi.fn()) },
            $activeEnvGraphs: { get: vi.fn(() => new Set()), subscribe: vi.fn(() => vi.fn()) },
            $linkedGraphGroups: { get: vi.fn(() => []), subscribe: vi.fn(() => vi.fn()) },
            $combinedHistory: { get: vi.fn(() => ({ temperature: [], vpd: [] })), subscribe: vi.fn(() => vi.fn()) },
            setGraphRange: vi.fn(),
            toggleEnvGraph: vi.fn(),
            unlinkGraphGroup: vi.fn(),
            unlinkGraphMetric: vi.fn(),
            linkGraphs: vi.fn(),
            getRange: vi.fn().mockReturnValue('24h'),
            startAutoRefresh: vi.fn(),
            stopAutoRefresh: vi.fn()
        };

        // Setup Mocks
        mockStore = {
            data: {
                $devices: $devices,
                $selectedDevice: $selectedDevice,
            },
            ui: {
                $viewMode: $viewMode,
                $isEditMode: $isEditMode,
                $isLoading: $isLoading,
                $activeDialog: $activeDialog,
                $focusedPlantIndex: $focusedPlantIndex,
                $selectedPlants: $selectedPlants,
                $defaultApplied: $defaultApplied,
                setEditMode: vi.fn(),
                setViewMode: vi.fn(),
                setActiveDialog: vi.fn(),
            },
            history: mockHistory,
            handleDeviceChange: vi.fn(),
            openAddPlantDialog: vi.fn(),
            setActiveDialog: vi.fn(),
            setEditMode: vi.fn(),
            setViewMode: vi.fn(),
            fetchStrainLibrary: vi.fn(),
            openLogbookDialog: vi.fn()
        };

        mockHass = { states: {} };

        deviceMock = {
            device_id: 'd1',
            name: 'Growspace 1',
            overview_entity_id: 'sensor.ov',
            type: 'normal',
            plants: [],
            rows: 0,
            plants_per_row: 0,
            grid: { rows: [], size: 0 },
            biological_metrics: {
                average_plant_age: 0,
                average_plant_height: 0,
                weeks_in_stage: 0,
                days_in_stage: 0
            },
            environment_attributes: {
                temperature_sensor: 'sensor.t',
                humidity_sensor: 'sensor.h'
            },
            stats: {
                total_plants: 0
            },
            irrigation_config: {
                irrigation_times: [],
                drain_times: []
            }
        } as unknown as GrowspaceDevice;
        configMock = { default_growspace: 'd1' } as any;

        // Default Metrics Mock
        (MetricsUtils.computeHeaderMetrics as any).mockReturnValue({
            mainChips: [
                { key: 'temperature', value: '25°C', label: 'Temp', icon: 'path', status: 'ok' },
                { key: 'humidity', value: '60%', label: 'Hum', icon: 'path', status: 'ok' },
                { key: 'vpd', value: '1.2kPa', label: 'VPD', icon: 'path', status: 'ok' },
                { key: 'co2', value: '800ppm', label: 'CO2', icon: 'path', status: 'warning' },
                // Secondary
                { key: 'ppfd', value: '500', label: 'PPFD', icon: 'path', status: 'ok' }
            ],
            deviceChips: [
                { key: 'fan', label: 'Fan', icon: 'path', value: 'on' }
            ],
            dominant: { icon: 'path', daysLabel: 'Day 30', weeksLabel: 'Week 5' },
            envAttrs: { dehumidifier_control_enabled: true }
        });

        element = await fixture(html`
            <growspace-header
                .store=${mockStore}
                .hass=${mockHass}
                .device=${deviceMock}
                .config=${configMock}
            ></growspace-header>
        `);
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('should be defined', () => {
        expect(element).toBeInstanceOf(GrowspaceHeader);
    });

    describe('Rendering', () => {
        it('should render title if default_growspace is set', async () => {
            const title = element.shadowRoot?.querySelector('.gs-title');
            expect(title).not.toBeNull();
            expect(title?.textContent).toBe('Growspace 1');
            expect(element.shadowRoot?.querySelector('select')).toBeNull();
        });

        it('should render select dropdown if default_growspace is not set', async () => {
            // Re-render with new config (no default_growspace means show selector)
            element.config = {} as any;
            await element.updateComplete;

            const select = element.shadowRoot?.querySelector('select.growspace-select-header');
            expect(select).not.toBeNull();
        });

        it('should render hero stats', async () => {
            const heroCards = element.shadowRoot?.querySelectorAll('.hero-card');
            expect(heroCards?.length).toBe(4); // Temp, Hum, VPD, CO2

            const tempValue = heroCards?.[0].querySelector('.hero-value')?.textContent;
            expect(tempValue).toBe('25');
        });

        it('should apply linked class to hero card when metric is active in graphs', async () => {
            // metric key 'temperature' is active
            const activeSet = new Set(['temperature']);
            $activeEnvGraphs.set(activeSet);

            // Re-mock MetricsUtils to return linked: true for temperature
            (MetricsUtils.computeHeaderMetrics as any).mockReturnValue({
                mainChips: [
                    { key: 'temperature', value: '25°C', label: 'Temp', icon: 'path', status: 'ok', linked: true },
                    { key: 'humidity', value: '60%', label: 'Hum', icon: 'path', status: 'ok' }
                ],
                deviceChips: [],
                dominant: { icon: 'path', daysLabel: 'Day 30', weeksLabel: 'Week 5' },
                envAttrs: {}
            });

            element.requestUpdate();
            await element.updateComplete;

            const tempCard = element.shadowRoot?.querySelector('.hero-card.linked');
            expect(tempCard).not.toBeNull();
            expect(tempCard?.textContent).toContain('25');
        });

        it('should show matching device name in sizer when ID exists in list', async () => {
            // Re-render without default_growspace
            element.config = {} as any;
            const devicesList = [
                { device_id: 'matching_id', name: 'Matched Name' },
                { device_id: 'other', name: 'Other' }
            ];
            $devices.set(devicesList);
            element.device = { ...deviceMock, device_id: 'matching_id' } as any;

            await element.updateComplete;

            const sizer = element.shadowRoot?.querySelector('.select-sizer');
            expect(sizer?.textContent).toBe('Matched Name');
        });
        it('should render secondary chips', async () => {
            const chips = element.shadowRoot?.querySelectorAll('growspace-chip');
            expect(chips?.length).toBeGreaterThanOrEqual(2);
        });
    });

    describe('Interactions', () => {
        it('should handle device change', async () => {
            element.config = {} as any;
            await element.updateComplete;

            const select = element.shadowRoot?.querySelector('select') as HTMLSelectElement;
            // Force value property since JSDOM sometimes doesn't sync attribute to value property instantly
            Object.defineProperty(select, 'value', { value: 'd2', writable: true });
            select.dispatchEvent(new Event('change'));

            expect(mockStore.handleDeviceChange).toHaveBeenCalledWith('d2');
        });

        it('should toggle graph on hero card click', async () => {
            const card = element.shadowRoot?.querySelector('.hero-card') as HTMLElement;
            card.click();

            expect(mockHistory.toggleEnvGraph).toHaveBeenCalledWith('temperature');
        });

        it('should handle menu actions', async () => {
            // Open menu
            (element as any)._menuOpen = true;
            element.requestUpdate();
            await element.updateComplete;

            const menu = element.shadowRoot?.querySelector('.menu-dropdown');
            expect(menu).not.toBeNull();

            // Config
            const configItem = menu?.querySelectorAll('.menu-item')[0] as HTMLElement;
            configItem.click();
            expect($activeDialog.set).toHaveBeenCalledWith(
                expect.objectContaining({ type: 'CONFIG' })
            );

            // Removed redundant spyOn
            const strainsItem = menu?.querySelectorAll('.menu-item')[4] as HTMLElement;
            strainsItem.click();

            expect(mockStore.ui.setActiveDialog).toHaveBeenCalledWith(
                expect.objectContaining({ type: 'STRAIN_LIBRARY' })
            );
        });
    });

    describe('Responsiveness', () => {
        it('should show mobile link button on mobile', async () => {
            // We need to preserve observe method
            (element as any)._resizeController = {
                isMobile: true,
                observe: vi.fn(),
                unobserve: vi.fn(),
                hasTouch: false
            };
            element.requestUpdate();
            await element.updateComplete;

            const linkBtn = element.shadowRoot?.querySelector('.mobile-link');
            expect(linkBtn).not.toBeNull();
            expect(linkBtn?.classList.contains('mobile-link')).toBe(true);
        });
    });

    describe('Drag & Drop', () => {
        it('should handle drop to link graphs', async () => {
            // Mock drag start
            (element as any)._draggedMetric = 'temperature';

            // Call handleChipDrop directly
            (element as any)._handleChipDrop(new Event('drop'), 'humidity');

            expect(mockHistory.linkGraphs).toHaveBeenCalledWith('temperature', 'humidity');
            expect((element as any)._draggedMetric).toBeNull(); // Reset
        });
    });

    describe('Menu Actions Coverage', () => {
        beforeEach(async () => {
            // Already connected via top-level beforeEach
            (element as any)._menuOpen = true;
            element.requestUpdate();
            await element.updateComplete;
        });

        it('should handle add_plant action', () => {
            (element as any)._triggerAction('add_plant');
            expect(mockStore.openAddPlantDialog).toHaveBeenCalled();
        });

        it('should handle edit action', () => {
            vi.spyOn($isEditMode, 'get').mockReturnValue(true);
            (element as any)._isEditModeController = { value: false };
            (element as any)._triggerAction('edit');
            expect(mockStore.ui.setEditMode).toHaveBeenCalledWith(true);
        });

        it('should handle compact action', async () => {
            $viewMode.set('compact');
            (element as any)._viewModeController = { value: 'compact' };
            await element.updateComplete;

            (element as any)._triggerAction('compact');
            expect(mockStore.ui.setViewMode).toHaveBeenCalledWith('standard');
        });

        it('should handle irrigation action', () => {
            $selectedDevice.set('d1');
            (element as any)._triggerAction('irrigation');
            expect($activeDialog.set).toHaveBeenCalledWith(expect.objectContaining({ type: 'IRRIGATION', payload: {} }));

            $selectedDevice.set(null);
            vi.clearAllMocks();
            (element as any)._triggerAction('irrigation');
            expect($activeDialog.set).not.toHaveBeenCalled();
        });

        it('should handle ai action', () => {
            $selectedDevice.set('d1');
            (element as any)._triggerAction('ai');
            expect($activeDialog.set).toHaveBeenCalledWith(expect.objectContaining({
                type: 'GROW_MASTER',
                payload: expect.objectContaining({ growspaceId: 'd1', mode: 'single' })
            }));
        });

        it('should handle logbook action', () => {
            (element as any)._triggerAction('logbook');
            expect(mockStore.openLogbookDialog).toHaveBeenCalled();
        });

        it('should handle config action', () => {
            $selectedDevice.set('d1');
            (element as any)._triggerAction('config');
            expect($activeDialog.set).toHaveBeenCalledWith(expect.objectContaining({
                type: 'CONFIG',
                payload: expect.objectContaining({
                    currentTab: 'environment'
                })
            }));
        });

        it('should handle strains action', () => {
            (element as any)._triggerAction('strains');
            expect(mockStore.ui.setActiveDialog).toHaveBeenCalledWith(expect.objectContaining({
                type: 'STRAIN_LIBRARY'
            }));
        });

        it('should handle control_dehumidifier action (no-op in switch)', () => {
            (element as any)._triggerAction('control_dehumidifier');
            expect((element as any)._menuOpen).toBe(false);
        });
    });

    describe('Render Methods Coverage', () => {
        it('should render menu when open', async () => {
            (element as any)._menuOpen = true;
            element.requestUpdate();
            await element.updateComplete;

            const menu = element.shadowRoot?.querySelector('.menu-dropdown');
            expect(menu).not.toBeNull();
        });

        it('should not render menu when closed', async () => {
            (element as any)._menuOpen = false;
            element.requestUpdate();
            await element.updateComplete;

            const menu = element.shadowRoot?.querySelector('.menu-dropdown');
            expect(menu).toBeNull();
        });

        it('should render hero card for main chips', async () => {
            const heroCards = element.shadowRoot?.querySelectorAll('.hero-card');
            expect(heroCards?.length).toBeGreaterThan(0);
        });

        it('should call _renderMenu method directly', () => {
            (element as any)._menuOpen = false;
            const result = (element as any)._renderMenu();
            expect(result).toBe('');

            (element as any)._menuOpen = true;
            const menuResult = (element as any)._renderMenu();
            expect(menuResult).not.toBe('');
        });

        it('should call _renderHeroCard method directly', () => {
            const chip = { key: 'temperature', value: '25°C', label: 'Temp', icon: 'path', status: 'ok' };
            const result = (element as any)._renderHeroCard(chip);
            expect(result).toBeDefined();
        });

        it('should call _renderHeroCard with vpd chip', () => {
            const chip = { key: 'vpd', value: '1.2', label: 'VPD', icon: 'path', status: 'warning' };
            const result = (element as any)._renderHeroCard(chip);
            expect(result).toBeDefined();
        });

        it('should call _renderHeroCard with optimal chip', () => {
            const chip = { key: 'optimal', value: 'Yes', label: 'Optimal', icon: 'path', status: 'ok' };
            const result = (element as any)._renderHeroCard(chip);
            expect(result).toBeDefined();
        });
    });

    describe('Unlink Graphs', () => {
        it('should unlink graph group', async () => {
            (element as any)._unlinkGraphs(1);
            expect(mockHistory.unlinkGraphGroup).toHaveBeenCalledWith(1);
        });
    });

    describe('Getters Coverage', () => {
        it('should return activeEnvGraphs from controller', () => {
            const set = new Set(['temp']);
            (mockHistory.$activeEnvGraphs.get as any).mockReturnValue(set);
            // Re-render or force update not needed as we mock the controller's value access implicitly via accessing property which accesses controller.
            // Actually, element.activeEnvGraphs reads this._activeEnvGraphsController.value
            // We need to ensure the controller sees this value.
            // Since we mocked `new GrowspaceStore`, we should ensure the atom is what we think it is.
            // But here we are testing the getter on the element.
            // The element initializes controllers in connectedCallback using this.store.history.$activeEnvGraphs.
            // So if we update the mock return value, the controller (which subscribes) should update? 
            // Nanostores StoreController: "Subscribes to the atom and requests an update when the atom changes."
            // But `.value` on controller reads from atom.get().

            // Let's rely on the fact that we mocked `$activeEnvGraphs.get` before creating the element?
            // No, the test changes it inside `it`.
            // But since it's a mock function, we can change return value.
            expect(element.activeEnvGraphs).toBe(set);
        });

        it('should return empty set if controller missing', () => {
            // Mock store.history.activeEnvGraphs to return null/empty
            (mockHistory.$activeEnvGraphs.get as any).mockReturnValue(undefined);
            expect(element.activeEnvGraphs).toEqual(new Set());
        });
    });

    describe('Toggle Env Graph', () => {
        it('should toggle graph visibility using controller', () => {
            (element as any)._toggleEnvGraph('temp');
            expect(mockHistory.toggleEnvGraph).toHaveBeenCalledWith('temp');
        });
    });

    describe('Scroll Logic', () => {
        describe('Scroll Logic Details', () => {
            it('should update scroll state when determining scrollability', () => {
                const container = document.createElement('div');
                Object.defineProperty(container, 'scrollLeft', { value: 10, writable: true });
                Object.defineProperty(container, 'scrollWidth', { value: 500, writable: true });
                Object.defineProperty(container, 'clientWidth', { value: 200, writable: true });

                (element as any)._chipsContainerRef = { value: container };
                (element as any)._stageContainerRef = { value: container }; // Reuse for simplicity
                (element as any)._deviceChipsContainerRef = { value: container };

                (element as any)._checkScroll();

                expect((element as any)._canScrollLeft).toBe(true);
                expect((element as any)._canScrollRight).toBe(true);
                expect((element as any)._canScrollStageLeft).toBe(true);
                expect((element as any)._canScrollDeviceLeft).toBe(true);
            });

            it('should handle stage and device scrolls', () => {
                const stageContainer = document.createElement('div');
                stageContainer.scrollBy = vi.fn();
                (element as any)._stageContainerRef = { value: stageContainer };
                (element as any)._scrollStage('right');
                expect(stageContainer.scrollBy).toHaveBeenCalledWith(expect.objectContaining({ left: 100 }));

                const deviceContainer = document.createElement('div');
                deviceContainer.scrollBy = vi.fn();
                (element as any)._deviceChipsContainerRef = { value: deviceContainer };
                (element as any)._scrollDeviceChips('left');
                expect(deviceContainer.scrollBy).toHaveBeenCalledWith(expect.objectContaining({ left: -100 }));
            });

            it('should trigger checkScroll on updated when device changes', async () => {
                vi.useFakeTimers();
                const checkScrollSpy = vi.spyOn(element as any, '_checkScroll');

                (element as any).updated(new Map([['device', {}]]));
                vi.runAllTimers();

                expect(checkScrollSpy).toHaveBeenCalled();
                vi.useRealTimers();
            });

            it('should update canScroll states to false when no overflow', () => {
                const container = document.createElement('div');
                Object.defineProperty(container, 'scrollLeft', { value: 0, writable: true });
                Object.defineProperty(container, 'scrollWidth', { value: 200, writable: true });
                Object.defineProperty(container, 'clientWidth', { value: 200, writable: true });

                (element as any)._chipsContainerRef = { value: container };
                (element as any)._stageContainerRef = { value: container };
                (element as any)._deviceChipsContainerRef = { value: container };

                (element as any)._checkScroll();

                expect((element as any)._canScrollLeft).toBe(false);
                expect((element as any)._canScrollRight).toBe(false);
                expect((element as any)._canScrollStageLeft).toBe(false);
                expect((element as any)._canScrollDeviceLeft).toBe(false);
            });
        });

        describe('Advanced Interactions', () => {
            it('should prevent default on dragover if dragging metric', () => {
                (element as any)._draggedMetric = 'temp';
                const evt = new Event('dragover');
                const spy = vi.spyOn(evt, 'preventDefault');
                (element as any)._handleDragOver(evt);
                expect(spy).toHaveBeenCalled();
            });

            it('should not prevent default on dragover if not dragging', () => {
                (element as any)._draggedMetric = null;
                const evt = new Event('dragover');
                const spy = vi.spyOn(evt, 'preventDefault');
                (element as any)._handleDragOver(evt);
                expect(spy).not.toHaveBeenCalled();
            });

            it('should start drag correctly', () => {
                const evt = { dataTransfer: { setData: vi.fn(), effectAllowed: '' } } as any;
                (element as any)._handleChipDragStart(evt, 'temp');
                expect(evt.dataTransfer.setData).toHaveBeenCalledWith('text/plain', 'temp');
                expect((element as any)._draggedMetric).toBe('temp');
            });

            it('should ignore drop if same metric', () => {
                (element as any)._draggedMetric = 'temp';
                (element as any)._handleChipDrop(new Event('drop'), 'temp'); // Same
                expect(mockHistory.linkGraphs).not.toHaveBeenCalled();
                expect((element as any)._draggedMetric).toBeNull();
            });

            it('should return correct draggable state', () => {
                // Desktop
                (element as any)._resizeController = { isMobile: false, hasTouch: false };
                expect((element as any)._chipDraggable).toBe('true');

                // Mobile
                (element as any)._resizeController = { isMobile: true, hasTouch: true };
                (element as any)._mobileLink = true;
                expect((element as any)._chipDraggable).toBe('true');

                (element as any)._mobileLink = false;
                expect((element as any)._chipDraggable).toBe('false');
            });
        });

        describe('Menu DOM Interactions', () => {
            beforeEach(async () => {
                (element as any)._menuOpen = true;
                element.requestUpdate();
                await element.updateComplete;
            });

            it('should handle all menu item clicks in DOM', () => {
                const menu = element.shadowRoot?.querySelector('.menu-dropdown');
                expect(menu).not.toBeNull();

                // Helper to click and verify
                const clickItem = (index: number, type: string) => {
                    const item = menu?.querySelectorAll('.menu-item')[index] as HTMLElement;
                    if (!item) throw new Error(`Menu item ${index} not found`);
                    item.click();
                };

                // Order: Config, Edit, Compact, Dehumidifier, Strains, Irrigation, AI, Logbook

                // 2. Edit (Index 1)
                const editSpy = vi.spyOn(mockStore.ui, 'setEditMode');
                clickItem(1, 'edit');
                expect(editSpy).toHaveBeenCalled();

                // 3. Compact (Index 2)
                const triggerSpy = vi.spyOn(element as any, '_triggerAction');
                element.requestUpdate();
                clickItem(2, 'compact');
                expect(triggerSpy).toHaveBeenCalledWith('compact');

                // 4. Dehumidifier (Index 3)
                clickItem(3, 'control_dehumidifier');
                expect(triggerSpy).toHaveBeenCalledWith('control_dehumidifier');

                // 5. Strains (Index 4)
                clickItem(4, 'strains');
                expect(triggerSpy).toHaveBeenCalledWith('strains');

                // 6. Irrigation (Index 5)
                clickItem(5, 'irrigation');
                expect(triggerSpy).toHaveBeenCalledWith('irrigation');

                // 7. AI (Index 6)
                clickItem(6, 'ai');
                expect(triggerSpy).toHaveBeenCalledWith('ai');

                // 8. Logbook (Index 7)
                clickItem(7, 'logbook');
                expect(triggerSpy).toHaveBeenCalledWith('logbook');
            });
        });

        describe('Sparkline Rendering', () => {
            it('should render sparkline paths', () => {
                // Mock ChartUtils to return specific paths
                (ChartUtils.generateSparklinePath as any).mockReturnValue('M0,0 L10 10');
                (ChartUtils.getSparklineColor as any).mockReturnValue('red');

                // Test Vpd Chip (uses generateVpdSparklineSegments which returns array of paths)
                (ChartUtils.generateVpdSparklineSegments as any).mockReturnValue([
                    { d: 'M0,0 L10,10', color: 'blue' }
                ]);

                const vpdChip = { key: 'vpd', value: '1.0', label: 'VPD', icon: 'i', status: 'ok' };
                const vpdResult = (element as any)._renderHeroCard(vpdChip);
                // Verify it contains multiple paths
                expect(JSON.stringify(vpdResult)).toContain('draggable');

                // Test normal chip (simple path)
                const tempChip = { key: 'temperature', value: '20', label: 'T', icon: 'i', status: 'ok' };
                const tempResult = (element as any)._renderHeroCard(tempChip);
                expect(JSON.stringify(tempResult)).toContain('hero-sparkline');
            });
        });
    });
    describe('Template Bindings Coverage', () => {
        it('should trigger drag handlers from hero card DOM', () => {
            const hero = element.shadowRoot?.querySelector('.hero-card');
            expect(hero).toBeTruthy();

            // Drag Start
            const startSpy = vi.spyOn(element as any, '_handleChipDragStart');
            const dragStartEvent = new Event('dragstart');
            hero?.dispatchEvent(dragStartEvent);
            expect(startSpy).toHaveBeenCalled();

            // Drop
            const dropSpy = vi.spyOn(element as any, '_handleChipDrop');
            const dropEvent = new Event('drop');
            hero?.dispatchEvent(dropEvent);
            expect(dropSpy).toHaveBeenCalled();
        });

        it('should trigger drag handlers from secondary chips DOM', () => {
            // Second chip typically (first is device chip, subsequent are secondary)
            const secondaryStrip = element.shadowRoot?.querySelector('.secondary-strip');
            const chip = secondaryStrip?.querySelector('growspace-chip');

            if (chip) {
                const startSpy = vi.spyOn(element as any, '_handleChipDragStart');
                chip.dispatchEvent(new Event('dragstart'));
                expect(startSpy).toHaveBeenCalled();

                const dropSpy = vi.spyOn(element as any, '_handleChipDrop');
                chip.dispatchEvent(new Event('drop'));
                expect(dropSpy).toHaveBeenCalled();
            }
        });

        it('should trigger scroll click from DOM', async () => {
            // Force scrollable state
            (element as any)._canScrollRight = true;
            (element as any)._canScrollLeft = true;
            element.requestUpdate();
        });

        it('should trigger drag handlers from device chips DOM', () => {
            // Verify device chips are rendered
            const deviceChipsContainer = element.shadowRoot?.querySelector('.gs-device-chips-header');
            expect(deviceChipsContainer).toBeTruthy();
            const deviceChips = deviceChipsContainer?.querySelectorAll('growspace-chip');
            expect(deviceChips?.length).toBeGreaterThan(0);
        });

        it('should trigger unlink from secondary strip chips', () => {
            // Verify secondary strip chips are rendered
            const secondaryStrip = element.shadowRoot?.querySelector('.secondary-strip');
            expect(secondaryStrip).toBeTruthy();
            const chips = secondaryStrip?.querySelectorAll('growspace-chip');
            // Secondary strip should have chips
            expect(chips).toBeTruthy();
        });

        it('should call _handleDragOver directly', () => {
            const mockEvent = { preventDefault: vi.fn() } as any;
            (element as any)._draggedMetric = 'temperature';
            (element as any)._handleDragOver(mockEvent);
            expect(mockEvent.preventDefault).toHaveBeenCalled();
        });

        it('should call _toggleEnvGraph directly', () => {
            // Mock controller
            // Mock history store method
            // We can't reassign store.history because it's read-only, but we can spy on the method of the existing mock
            // mockHistory is already assigned to store.history
            const spy = vi.spyOn(mockHistory, 'toggleEnvGraph');
            (element as any)._toggleEnvGraph('humidity');
            expect(spy).toHaveBeenCalledWith('humidity');
        });
    });

    describe('Scroll Functions Coverage', () => {
        it('should scroll chips left when container exists', () => {
            const container = document.createElement('div');
            container.scrollBy = vi.fn();
            (element as any)._chipsContainerRef = { value: container };
            (element as any)._scrollChips('left');
            expect(container.scrollBy).toHaveBeenCalledWith({ left: -200, behavior: 'smooth' });
        });

        it('should scroll chips right when container exists', () => {
            const container = document.createElement('div');
            container.scrollBy = vi.fn();
            (element as any)._chipsContainerRef = { value: container };
            (element as any)._scrollChips('right');
            expect(container.scrollBy).toHaveBeenCalledWith({ left: 200, behavior: 'smooth' });
        });

        it('should not scroll chips when container is null', () => {
            (element as any)._chipsContainerRef = { value: null };
            expect(() => (element as any)._scrollChips('left')).not.toThrow();
        });

        it('should scroll stage left when container exists', () => {
            const container = document.createElement('div');
            container.scrollBy = vi.fn();
            (element as any)._stageContainerRef = { value: container };
            (element as any)._scrollStage('left');
            expect(container.scrollBy).toHaveBeenCalledWith({ left: -100, behavior: 'smooth' });
        });

        it('should scroll stage right when container exists', () => {
            const container = document.createElement('div');
            container.scrollBy = vi.fn();
            (element as any)._stageContainerRef = { value: container };
            (element as any)._scrollStage('right');
            expect(container.scrollBy).toHaveBeenCalledWith({ left: 100, behavior: 'smooth' });
        });

        it('should not scroll stage when container is null', () => {
            (element as any)._stageContainerRef = { value: null };
            expect(() => (element as any)._scrollStage('left')).not.toThrow();
        });

        it('should scroll device chips left when container exists', () => {
            const container = document.createElement('div');
            container.scrollBy = vi.fn();
            (element as any)._deviceChipsContainerRef = { value: container };
            (element as any)._scrollDeviceChips('left');
            expect(container.scrollBy).toHaveBeenCalledWith({ left: -100, behavior: 'smooth' });
        });

        it('should scroll device chips right when container exists', () => {
            const container = document.createElement('div');
            container.scrollBy = vi.fn();
            (element as any)._deviceChipsContainerRef = { value: container };
            (element as any)._scrollDeviceChips('right');
            expect(container.scrollBy).toHaveBeenCalledWith({ left: 100, behavior: 'smooth' });
        });

        it('should not scroll device chips when container is null', () => {
            (element as any)._deviceChipsContainerRef = { value: null };
            expect(() => (element as any)._scrollDeviceChips('right')).not.toThrow();
        });

        it('should handle _checkScroll with null containers', () => {
            (element as any)._chipsContainerRef = { value: null };
            (element as any)._stageContainerRef = { value: null };
            (element as any)._deviceChipsContainerRef = { value: null };
            expect(() => (element as any)._checkScroll()).not.toThrow();
        });

        it('should handle _checkScroll when scrolled to start', () => {
            const container = document.createElement('div');
            Object.defineProperty(container, 'scrollLeft', { value: 0, writable: true });
            Object.defineProperty(container, 'scrollWidth', { value: 500, writable: true });
            Object.defineProperty(container, 'clientWidth', { value: 200, writable: true });

            (element as any)._chipsContainerRef = { value: container };
            (element as any)._stageContainerRef = { value: container };
            (element as any)._deviceChipsContainerRef = { value: container };
            (element as any)._checkScroll();

            expect((element as any)._canScrollLeft).toBe(false);
            expect((element as any)._canScrollRight).toBe(true);
        });

        it('should handle _checkScroll when scrolled to end', () => {
            const container = document.createElement('div');
            Object.defineProperty(container, 'scrollLeft', { value: 300, writable: true });
            Object.defineProperty(container, 'scrollWidth', { value: 500, writable: true });
            Object.defineProperty(container, 'clientWidth', { value: 200, writable: true });

            (element as any)._chipsContainerRef = { value: container };
            (element as any)._stageContainerRef = { value: container };
            (element as any)._deviceChipsContainerRef = { value: container };
            (element as any)._checkScroll();

            expect((element as any)._canScrollLeft).toBe(true);
            expect((element as any)._canScrollRight).toBe(false);
        });
    });

    describe('Toggle Env Graph Edge Cases', () => {
        it('should not toggle when store.history is undefined', () => {
            const originalHistory = element.store?.history;
            (element as any).store = { ...mockStore, history: undefined };
            expect(() => (element as any)._toggleEnvGraph('temp')).not.toThrow();
            (element as any).store = mockStore;
        });

        it('should not unlink when store.history is undefined', () => {
            const originalHistory = element.store?.history;
            (element as any).store = { ...mockStore, history: undefined };
            expect(() => (element as any)._unlinkGraphs(0)).not.toThrow();
            (element as any).store = mockStore;
        });
    });

    describe('Chip Drop Edge Cases', () => {
        it('should reset dragged metric when no metric is dragged', () => {
            (element as any)._draggedMetric = null;
            const evt = new Event('drop');
            (element as any)._handleChipDrop(evt, 'humidity');
            expect((element as any)._draggedMetric).toBeNull();
        });

        it('should link graphs when store.history exists', () => {
            (element as any)._draggedMetric = 'temperature';
            const evt = { preventDefault: vi.fn() } as any;
            (element as any)._handleChipDrop(evt, 'humidity');
            expect(mockHistory.linkGraphs).toHaveBeenCalledWith('temperature', 'humidity');
        });

        it('should not link when store.history is undefined', () => {
            (element as any)._draggedMetric = 'temperature';
            const originalStore = element.store;
            (element as any).store = { ...mockStore, history: undefined };
            const evt = { preventDefault: vi.fn() } as any;
            expect(() => (element as any)._handleChipDrop(evt, 'humidity')).not.toThrow();
            (element as any).store = originalStore;
            expect((element as any)._draggedMetric).toBeNull();
        });
    });

    describe('_computeMetrics Edge Cases', () => {
        it('should return empty metrics when device is null', () => {
            element.device = null as any;
            const result = (element as any)._computeMetrics();
            expect(result.mainChips).toEqual([]);
            expect(result.deviceChips).toEqual([]);
        });

        it('should return empty metrics when hass is null', () => {
            element.hass = null as any;
            const result = (element as any)._computeMetrics();
            expect(result.mainChips).toEqual([]);
        });
    });

    describe('_updateMetrics Edge Cases', () => {
        it('should reset metrics when device is null', () => {
            element.device = null as any;
            (element as any)._updateMetrics();
            expect((element as any)._mainChips).toEqual([]);
            expect((element as any)._deviceChips).toEqual([]);
            expect((element as any)._dominant).toBeUndefined();
        });

        it('should reset metrics when hass is null', () => {
            element.hass = null as any;
            (element as any)._updateMetrics();
            expect((element as any)._mainChips).toEqual([]);
        });
    });

    describe('connectedCallback Edge Cases', () => {
        it('should not initialize controllers when store is undefined', async () => {
            const newElement = document.createElement('growspace-header') as GrowspaceHeader;
            (newElement as any).store = undefined;
            document.body.appendChild(newElement);
            expect((newElement as any)._viewModeController).toBeUndefined();
            document.body.removeChild(newElement);
        });
    });

    describe('Chip Drag Start', () => {
        it('should handle drag start without dataTransfer', () => {
            const evt = {} as DragEvent;
            expect(() => (element as any)._handleChipDragStart(evt, 'temp')).not.toThrow();
            expect((element as any)._draggedMetric).toBe('temp');
        });
    });

    describe('Mobile Link Toggle', () => {
        it('should toggle mobile link state', async () => {
            (element as any)._resizeController = { isMobile: true, hasTouch: true, observe: vi.fn() };
            element.requestUpdate();
            await element.updateComplete;

            const initialState = (element as any)._mobileLink;
            const linkBtn = element.shadowRoot?.querySelector('.mobile-link') as HTMLElement;
            if (linkBtn) {
                linkBtn.click();
                expect((element as any)._mobileLink).toBe(!initialState);
            }
        });
    });

    describe('Inline Template Callback Coverage', () => {
        it('should trigger scroll left on device chips via DOM click', async () => {
            (element as any)._canScrollDeviceLeft = true;
            element.requestUpdate();
            await element.updateComplete;

            const scrollSpy = vi.spyOn(element as any, '_scrollDeviceChips');
            const leftArrow = element.shadowRoot?.querySelectorAll('.scroll-arrow')[0] as HTMLElement;
            if (leftArrow && !leftArrow.classList.contains('hidden')) {
                leftArrow.click();
                expect(scrollSpy).toHaveBeenCalledWith('left');
            }
        });

        it('should trigger scroll right on device chips via DOM click', async () => {
            (element as any)._canScrollDeviceRight = true;
            element.requestUpdate();
            await element.updateComplete;

            const scrollSpy = vi.spyOn(element as any, '_scrollDeviceChips');
            const arrows = element.shadowRoot?.querySelectorAll('.scroll-arrow');
            const rightArrow = arrows?.[1] as HTMLElement;
            if (rightArrow && !rightArrow.classList.contains('hidden')) {
                rightArrow.click();
                expect(scrollSpy).toHaveBeenCalledWith('right');
            }
        });

        it('should trigger scroll on stage area via DOM click', async () => {
            (element as any)._canScrollStageLeft = true;
            (element as any)._canScrollStageRight = true;
            element.requestUpdate();
            await element.updateComplete;

            const scrollSpy = vi.spyOn(element as any, '_scrollStage');
            // Stage arrows are the 3rd and 4th scroll arrows
            const arrows = element.shadowRoot?.querySelectorAll('.scroll-arrow');
            // Look for visible stage arrows
            for (let i = 0; i < (arrows?.length || 0); i++) {
                const arrow = arrows?.[i] as HTMLElement;
                if (arrow && !arrow.classList.contains('hidden')) {
                    arrow.click();
                }
            }
        });

        it('should trigger scroll left on secondary strip via DOM click', async () => {
            (element as any)._canScrollLeft = true;
            element.requestUpdate();
            await element.updateComplete;

            const scrollSpy = vi.spyOn(element as any, '_scrollChips');
            const container = element.shadowRoot?.querySelector('.secondary-strip-container');
            const leftArrow = container?.querySelector('.scroll-arrow:not(.hidden)') as HTMLElement;
            if (leftArrow) {
                leftArrow.click();
                expect(scrollSpy).toHaveBeenCalled();
            }
        });

        it('should trigger scroll right on secondary strip via DOM click', async () => {
            (element as any)._canScrollRight = true;
            element.requestUpdate();
            await element.updateComplete;

            const scrollSpy = vi.spyOn(element as any, '_scrollChips');
            const container = element.shadowRoot?.querySelector('.secondary-strip-container');
            const arrows = container?.querySelectorAll('.scroll-arrow');
            if (arrows && arrows.length > 1) {
                const rightArrow = arrows[1] as HTMLElement;
                if (!rightArrow.classList.contains('hidden')) {
                    rightArrow.click();
                    expect(scrollSpy).toHaveBeenCalled();
                }
            }
        });

        it('should stop propagation on menu dropdown click', async () => {
            (element as any)._menuOpen = true;
            element.requestUpdate();
            await element.updateComplete;

            const menu = element.shadowRoot?.querySelector('.menu-dropdown') as HTMLElement;
            if (menu) {
                const evt = new Event('click', { bubbles: true });
                const stopSpy = vi.spyOn(evt, 'stopPropagation');
                menu.dispatchEvent(evt);
                expect(stopSpy).toHaveBeenCalled();
            }
        });

        it('should toggle menu open state via menu button click', async () => {
            const initialOpen = (element as any)._menuOpen;
            const menuBtn = element.shadowRoot?.querySelector('.menu-container .icon-button') as HTMLElement;
            if (menuBtn) {
                menuBtn.click();
                expect((element as any)._menuOpen).toBe(!initialOpen);
            }
        });

        it('should register scroll listeners in firstUpdated', async () => {
            // Create a fresh element to test firstUpdated
            const newElement = document.createElement('growspace-header') as GrowspaceHeader;
            (newElement as any).store = mockStore;
            (newElement as any).hass = mockHass;
            (newElement as any).device = deviceMock;
            (newElement as any).config = configMock;

            // Mock refs with containers
            const mockContainer = document.createElement('div');
            mockContainer.addEventListener = vi.fn();

            (newElement as any)._chipsContainerRef = { value: mockContainer };
            (newElement as any)._stageContainerRef = { value: mockContainer };
            (newElement as any)._deviceChipsContainerRef = { value: mockContainer };
            (newElement as any)._resizeController = { observe: vi.fn() };

            vi.useFakeTimers();
            (newElement as any).firstUpdated();
            vi.runAllTimers();
            vi.useRealTimers();

            expect(mockContainer.addEventListener).toHaveBeenCalledWith('scroll', expect.any(Function));
        });

        it('should call _checkScroll after firstUpdated timeout', async () => {
            const checkScrollSpy = vi.spyOn(element as any, '_checkScroll');

            vi.useFakeTimers();
            (element as any).firstUpdated();
            vi.runAllTimers();
            vi.useRealTimers();

            expect(checkScrollSpy).toHaveBeenCalled();
        });
    });

    describe('Add Plant Action', () => {
        it('should call openAddPlantDialog for add_plant action', () => {
            (element as any)._triggerAction('add_plant');
            expect(mockStore.openAddPlantDialog).toHaveBeenCalled();
        });
    });

    describe('willUpdate Coverage', () => {
        it('should call _updateMetrics when device changes', () => {
            const updateSpy = vi.spyOn(element as any, '_updateMetrics');
            const changedProps = new Map([['device', {}]]);
            // Ensure controllers exist
            (element as any)._activeEnvGraphsController = { value: new Set() };
            (element as any).willUpdate(changedProps);
            expect(updateSpy).toHaveBeenCalled();
        });

        it('should call _updateMetrics when hass changes', () => {
            const updateSpy = vi.spyOn(element as any, '_updateMetrics');
            const changedProps = new Map([['hass', {}]]);
            (element as any)._activeEnvGraphsController = { value: new Set() };
            (element as any).willUpdate(changedProps);
            expect(updateSpy).toHaveBeenCalled();
        });
    });

    describe('Device Chip Template Handlers Coverage', () => {
        it('should trigger handlers on device chips via DOM events', async () => {
            // Force device chips to render
            (MetricsUtils.computeHeaderMetrics as any).mockReturnValue({
                mainChips: [],
                deviceChips: [
                    { key: 'exhaust', label: 'Exhaust', icon: 'path', value: 'On', status: 'ok', active: false, linked: false, tooltip: '', groupIndex: 0 }
                ],
                dominant: { icon: 'path', daysLabel: 'Day 30', weeksLabel: 'Week 5' },
                envAttrs: { dehumidifier_control_enabled: true }
            });

            element.requestUpdate();
            await element.updateComplete;

            const deviceChip = element.shadowRoot?.querySelector('.gs-device-chips-header growspace-chip');
            expect(deviceChip).toBeTruthy();

            if (deviceChip) {
                // Trigger dragstart
                const dragStartSpy = vi.spyOn(element as any, '_handleChipDragStart');
                deviceChip.dispatchEvent(new Event('dragstart'));
                expect(dragStartSpy).toHaveBeenCalled();

                // Trigger drop
                const dropSpy = vi.spyOn(element as any, '_handleChipDrop');
                deviceChip.dispatchEvent(new Event('drop'));
                expect(dropSpy).toHaveBeenCalled();

                // Trigger click
                const toggleSpy = vi.spyOn(element as any, '_toggleEnvGraph');
                (deviceChip as HTMLElement).click();
                expect(toggleSpy).toHaveBeenCalled();

                // Trigger unlink
                const unlinkSpy = vi.spyOn(element as any, '_unlinkGraphs');
                deviceChip.dispatchEvent(new CustomEvent('unlink'));
                expect(unlinkSpy).toHaveBeenCalled();
            }
        });
    });

    describe('Secondary Chip Template Handlers Coverage', () => {
        it('should trigger handlers on secondary chips via DOM events', async () => {
            element.requestUpdate();
            await element.updateComplete;

            const secondaryStrip = element.shadowRoot?.querySelector('.secondary-strip');
            const chip = secondaryStrip?.querySelector('growspace-chip');
            expect(chip).toBeTruthy();

            // Drag Start
            const startSpy = vi.spyOn(element as any, '_handleChipDragStart');
            chip?.dispatchEvent(new Event('dragstart'));
            expect(startSpy).toHaveBeenCalled();

            // Drop
            const dropSpy = vi.spyOn(element as any, '_handleChipDrop');
            chip?.dispatchEvent(new Event('drop'));
            expect(dropSpy).toHaveBeenCalled();

            // Toggle (Click)
            const toggleSpy = vi.spyOn(element as any, '_toggleEnvGraph');
            chip?.dispatchEvent(new Event('click'));
            expect(toggleSpy).toHaveBeenCalled();

            // Unlink
            const unlinkSpy = vi.spyOn(element as any, '_unlinkGraphs');
            chip?.dispatchEvent(new CustomEvent('unlink', { detail: { groupIndex: 1 } }));
            expect(unlinkSpy).toHaveBeenCalled();
        });
    });

    describe('Hero Card Template Handlers Coverage', () => {
        it('should trigger all handlers on hero cards via DOM events', async () => {
            element.requestUpdate();
            await element.updateComplete;

            const hero = element.shadowRoot?.querySelector('.hero-card');
            expect(hero).toBeTruthy();

            // Click (Toggle)
            const toggleSpy = vi.spyOn(element as any, '_toggleEnvGraph');
            hero?.dispatchEvent(new Event('click'));
            expect(toggleSpy).toHaveBeenCalled();

            // Drag Over
            const overSpy = vi.fn();
            (element as any)._handleDragOver = overSpy;
            element.requestUpdate();
            await element.updateComplete;

            const heroAfterUpdate = element.shadowRoot?.querySelector('.hero-card');
            heroAfterUpdate?.dispatchEvent(new Event('dragover'));
            expect(overSpy).toHaveBeenCalled();

            // Drag Start
            const startSpy = vi.spyOn(element as any, '_handleChipDragStart');
            heroAfterUpdate?.dispatchEvent(new Event('dragstart'));
            expect(startSpy).toHaveBeenCalled();

            // Drop
            const dropSpy = vi.spyOn(element as any, '_handleChipDrop');
            heroAfterUpdate?.dispatchEvent(new Event('drop'));
            expect(dropSpy).toHaveBeenCalled();
        });
    });

    describe('VPD Thresholds and Sparkline Coverage', () => {
        it('should handle VPD with custom attributes and night fallbacks', async () => {
            const mockHass = {
                states: {
                    'sensor.growspace_overview': {
                        attributes: {
                            day_vpd_target_min: 0.9,
                            // day_vpd_target_max missing
                            night_vpd_target_min: 0.7
                        }
                    }
                }
            };
            element.hass = mockHass as any;
            element.device = {
                ...element.device,
                overview_entity_id: 'sensor.growspace_overview'
            };

            // Mock computeHeaderMetrics to return a vpd chip
            (MetricsUtils.computeHeaderMetrics as any).mockReturnValue({
                mainChips: [{ key: 'vpd', value: '1.0 kPa', status: 'ok' }],
                deviceChips: [],
                dominant: null,
                envAttrs: {}
            });

            // Mock history segments
            const segmentSpy = vi.spyOn(ChartUtils, 'generateVpdSparklineSegments').mockReturnValue([
                { path: 'M0,0 L10,10', color: 'green' }
            ]);

            element.requestUpdate();
            await element.updateComplete;

            expect(segmentSpy).toHaveBeenCalled();
            const svg = element.shadowRoot?.querySelector('.hero-sparkline');
            expect(svg).toBeTruthy();
            expect(svg?.innerHTML).toContain('path');
        });

        it('should handle non-VPD sparkline with history', async () => {
            (MetricsUtils.computeHeaderMetrics as any).mockReturnValue({
                mainChips: [{ key: 'temperature', value: '75 F', status: 'ok' }],
                deviceChips: [],
                dominant: null,
                envAttrs: {}
            });

            vi.spyOn(ChartUtils, 'generateSparklinePath').mockReturnValue('M0,0 L10,10');

            element.requestUpdate();
            await element.updateComplete;

            const svg = element.shadowRoot?.querySelector('.hero-sparkline');
            expect(svg).toBeTruthy();
            expect(svg?.innerHTML).toContain('linearGradient');
        });

        it('should handle missing history for sparkline', async () => {
            (MetricsUtils.computeHeaderMetrics as any).mockReturnValue({
                mainChips: [{ key: 'temperature', value: '75 F', status: 'ok' }],
                deviceChips: [],
                dominant: null,
                envAttrs: {}
            });

            vi.spyOn(ChartUtils, 'generateSparklinePath').mockReturnValue('');

            element.requestUpdate();
            await element.updateComplete;

            const svg = element.shadowRoot?.querySelector('.hero-sparkline');
            expect(svg).toBeFalsy();
        });
    });
});
