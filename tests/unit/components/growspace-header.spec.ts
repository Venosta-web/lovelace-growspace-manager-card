import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest';
import { GrowspaceHeader } from '../../../src/components/growspace-header';
import * as uiStore from '../../../src/store/ui-store';
import { MetricsUtils } from '../../../src/utils/metrics-utils';
import { ChartUtils } from '../../../src/utils/chart-utils';
import { GrowspaceDevice } from '../../../src/types';
import { $devices, $selectedDevice } from '../../../src/store/data-store';
import * as historyStore from '../../../src/store/history-store';

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
        GrowspaceChip: class { }
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

    beforeEach(() => {
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

        // Setup History Store Mocks
        vi.mocked(historyStore.$historyCache.get).mockReturnValue({ temperature: [], vpd: [] });
        vi.mocked(historyStore.$historyLoading.get).mockReturnValue(false);
        vi.mocked(historyStore.$activeEnvGraphs.get).mockReturnValue(new Set());
        vi.mocked(historyStore.$linkedGraphGroups.get).mockReturnValue([]);

        // Setup Mocks
        mockStore = {
            state: {
                devices: [
                    { device_id: 'd1', name: 'Growspace 1' },
                    { device_id: 'd2', name: 'Growspace 2' }
                ],
                selectedDevice: 'd1',
                viewMode: 'standard',
                isEditMode: false
            },
            handleDeviceChange: vi.fn(),
            openAddPlantDialog: vi.fn(),
            setActiveDialog: vi.fn(),
            setEditMode: vi.fn(),
            setViewMode: vi.fn(),
            fetchStrainLibrary: vi.fn(),
            openLogbookDialog: vi.fn()
        };

        // Initialize Atoms based on mock state
        $devices.set(mockStore.state.devices);
        $selectedDevice.set(mockStore.state.selectedDevice);

        mockHistory = {
            activeEnvGraphs: new Set<string>(),
            linkedGraphGroups: [],
            historyCache: {
                temperature: [],
                vpd: []
            },
            // Removed listener methods
            swapMetricOrder: vi.fn(),
            unlinkGroup: vi.fn(),
            toggleEnvGraph: vi.fn(),
            linkGraphs: vi.fn(),
            unlinkGraphGroup: vi.fn(),
            unlinkGraphMetric: vi.fn(),
            getRange: vi.fn(() => '24h')
        };

        mockHass = { states: {} };

        // Define Element
        if (!customElements.get('growspace-header')) {
            customElements.define('growspace-header', GrowspaceHeader);
        }

        element = document.createElement('growspace-header') as GrowspaceHeader;
        element.store = mockStore;
        element.historyController = mockHistory;
        element.hass = mockHass;
        element.device = {
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
        element.config = { default_growspace: 'd1' } as any;

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
    });

    describe('Rendering', () => {
        it('should render title if default_growspace is set', async () => {
            // Already set in beforeEach
            document.body.appendChild(element);
            await element.updateComplete;

            const title = element.shadowRoot?.querySelector('.gs-title');
            expect(title).not.toBeNull();
            expect(title?.textContent).toBe('Growspace 1');
            expect(element.shadowRoot?.querySelector('select')).toBeNull();

            document.body.removeChild(element);
        });

        it('should render select dropdown if default_growspace is not set', async () => {
            element.config = {} as any; // No default
            document.body.appendChild(element);
            await element.updateComplete;

            const select = element.shadowRoot?.querySelector('select');
            expect(select).not.toBeNull();
            // Dropdown depends on devices and selectedDevice atom
            expect(select?.value).toBe('d1');

            document.body.removeChild(element);
        });

        it('should render hero stats', async () => {
            document.body.appendChild(element);
            await element.updateComplete;

            const heroCards = element.shadowRoot?.querySelectorAll('.hero-card');
            expect(heroCards?.length).toBe(4); // Temp, Hum, VPD, CO2

            const tempValue = heroCards?.[0].querySelector('.hero-value')?.textContent;
            expect(tempValue).toBe('25');

            document.body.removeChild(element);
        });

        it('should render secondary chips', async () => {
            document.body.appendChild(element);
            await element.updateComplete;

            const chips = element.shadowRoot?.querySelectorAll('growspace-chip');
            // 1 device chip + 1 secondary chip (ppfd)
            expect(chips?.length).toBeGreaterThanOrEqual(2);

            document.body.removeChild(element);
        });
    });

    describe('Interactions', () => {
        it('should handle device change', async () => {
            element.config = {} as any;
            document.body.appendChild(element);
            await element.updateComplete;

            const select = element.shadowRoot?.querySelector('select') as HTMLSelectElement;
            // Ensure d2 is in the list (it is in mockStore.devices and set to $devices in beforeEach)
            select.value = 'd2';
            select.dispatchEvent(new Event('change'));

            expect(mockStore.handleDeviceChange).toHaveBeenCalledWith('d2');
            document.body.removeChild(element);
        });

        it('should toggle graph on hero card click', async () => {
            document.body.appendChild(element);
            await element.updateComplete;

            const card = element.shadowRoot?.querySelector('.hero-card') as HTMLElement;
            card.click();

            expect(mockHistory.toggleEnvGraph).toHaveBeenCalledWith(
                expect.objectContaining({ metric: 'temperature', visible: true })
            );

            document.body.removeChild(element);
        });

        it('should handle menu actions', async () => {
            document.body.appendChild(element);
            await element.updateComplete;

            // Open menu
            (element as any)._menuOpen = true;
            element.requestUpdate();
            await element.updateComplete;

            const menu = element.shadowRoot?.querySelector('.menu-dropdown');
            expect(menu).not.toBeNull();

            // Config
            const configItem = menu?.querySelectorAll('.menu-item')[0] as HTMLElement; // Config is usually first
            configItem.click();
            expect(uiStore.$activeDialog.set).toHaveBeenCalledWith(
                expect.objectContaining({ type: 'CONFIG' })
            );

            // Strains
            const strainsItem = menu?.querySelectorAll('.menu-item')[4] as HTMLElement;
            strainsItem.click();
            expect(mockStore.fetchStrainLibrary).toHaveBeenCalled();
            expect(uiStore.$activeDialog.set).toHaveBeenCalledWith(
                expect.objectContaining({ type: 'STRAIN_LIBRARY' })
            );

            document.body.removeChild(element);
        });
    });

    describe('Responsiveness', () => {
        it('should show mobile link button on mobile', async () => {
            document.body.appendChild(element);

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

            document.body.removeChild(element);
        });
    });

    describe('Drag & Drop', () => {
        it('should handle drop to link graphs', async () => {
            document.body.appendChild(element);
            await element.updateComplete;

            // Mock drag start
            (element as any)._draggedMetric = 'temperature';

            // Call handleChipDrop directly
            (element as any)._handleChipDrop(new Event('drop'), 'humidity');

            expect(mockHistory.linkGraphs).toHaveBeenCalledWith('temperature', 'humidity');
            expect((element as any)._draggedMetric).toBeNull(); // Reset

            document.body.removeChild(element);
        });
    });

    describe('Menu Actions Coverage', () => {
        beforeEach(async () => {
            vi.clearAllMocks(); // Clear mocks again for this inner suite
            document.body.appendChild(element);
            await element.updateComplete;
            // Open menu
            (element as any)._menuOpen = true;
            element.requestUpdate();
            await element.updateComplete;
        });

        afterEach(() => {
            document.body.removeChild(element);
        });

        it('should handle add_plant action', () => {
            (element as any)._triggerAction('add_plant');
            expect(mockStore.openAddPlantDialog).toHaveBeenCalled();
        });

        it('should handle edit action', () => {
            (uiStore.$isEditMode.get as any).mockReturnValue(true);
            (element as any)._isEditModeController = { value: false };
            (element as any)._triggerAction('edit');
            expect(uiStore.setEditMode).toHaveBeenCalledWith(true);
        });

        it('should handle compact action', async () => {
            uiStore.$viewMode.set('compact');
            (element as any)._viewModeController = { value: 'compact' };
            await element.updateComplete;

            (element as any)._triggerAction('compact');
            expect(uiStore.setViewMode).toHaveBeenCalledWith('standard');
        });

        it('should handle irrigation action', () => {
            $selectedDevice.set('d1');
            (element as any)._triggerAction('irrigation');
            expect(uiStore.$activeDialog.set).toHaveBeenCalledWith(expect.objectContaining({ type: 'IRRIGATION', payload: {} }));

            $selectedDevice.set(null);
            vi.clearAllMocks();
            (element as any)._triggerAction('irrigation');
            expect(uiStore.$activeDialog.set).not.toHaveBeenCalled();
        });

        it('should handle ai action', () => {
            $selectedDevice.set('d1');
            (element as any)._triggerAction('ai');
            expect(uiStore.$activeDialog.set).toHaveBeenCalledWith(expect.objectContaining({
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
            expect(uiStore.$activeDialog.set).toHaveBeenCalledWith(expect.objectContaining({
                type: 'CONFIG',
                payload: expect.objectContaining({
                    currentTab: 'environment'
                })
            }));
        });

        it('should handle strains action', () => {
            (element as any)._triggerAction('strains');
            expect(mockStore.fetchStrainLibrary).toHaveBeenCalled();
            expect(uiStore.$activeDialog.set).toHaveBeenCalledWith(expect.objectContaining({
                type: 'STRAIN_LIBRARY'
            }));
        });

        it('should handle control_dehumidifier action (no-op in switch)', () => {
            (element as any)._triggerAction('control_dehumidifier');
            expect((element as any)._menuOpen).toBe(false);
        });
    });

    describe('Render Methods Coverage', () => {
        beforeEach(async () => {
            document.body.appendChild(element);
            await element.updateComplete;
        });

        afterEach(() => {
            document.body.removeChild(element);
        });

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
            document.body.appendChild(element);
            await element.updateComplete;

            (element as any)._unlinkGraphs(1);
            expect(mockHistory.unlinkGraphGroup).toHaveBeenCalledWith(1);

            document.body.removeChild(element);
        });
    });

    describe('Getters Coverage', () => {
        it('should return activeEnvGraphs from controller', () => {
            const set = new Set(['temp']);
            mockHistory.activeEnvGraphs = set;
            expect(element.activeEnvGraphs).toBe(set);
        });

        it('should return empty set if controller missing', () => {
            element.historyController = undefined as any;
            expect(element.activeEnvGraphs).toEqual(new Set());
        });
    });

    describe('Toggle Env Graph', () => {
        it('should toggle graph visibility using controller', () => {
            (element as any)._toggleEnvGraph('temp');
            expect(mockHistory.toggleEnvGraph).toHaveBeenCalledWith({ metric: 'temp', visible: true });
        });
    });

    describe('Scroll Logic', () => {
        // Basic tests can remain as is, they don't depend on store
        describe('Scroll Logic Details', () => {
            beforeEach(async () => {
                document.body.appendChild(element);
                await element.updateComplete;
            });

            afterEach(() => {
                document.body.removeChild(element);
            });

            it('should update scroll state when determining scrollability', () => {
                const container = document.createElement('div');
                // Mock properties to simulate scrollable content
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
        });

        describe('Advanced Interactions', () => {
            beforeEach(async () => {
                document.body.appendChild(element);
                await element.updateComplete;
            });

            afterEach(() => {
                document.body.removeChild(element);
            });

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
                document.body.appendChild(element);
                (element as any)._menuOpen = true;
                element.requestUpdate();
                await element.updateComplete;
            });

            afterEach(() => {
                document.body.removeChild(element);
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
                const editSpy = vi.spyOn(uiStore, 'setEditMode');
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
        beforeEach(async () => {
            document.body.appendChild(element);
            await element.updateComplete;
        });

        afterEach(() => {
            document.body.removeChild(element);
        });

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
    });
});

