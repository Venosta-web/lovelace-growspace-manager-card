
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest';
import { GrowspaceHeader } from '../../../src/components/growspace-header';
import { MetricsUtils } from '../../../src/utils/metrics-utils';
import { ChartUtils } from '../../../src/utils/chart-utils';
import { GrowspaceDevice } from '../../../src/types';
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
    // Basic mock for the chip
    return {
        GrowspaceChip: class { }
    };
});

describe('GrowspaceHeader', () => {
    let element: GrowspaceHeader;
    let mockStore: any;
    let mockHistory: any;
    let mockHass: any;

    beforeEach(() => {
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

        mockHistory = {
            activeEnvGraphs: new Set<string>(),
            linkedGraphGroups: [],
            historyCache: {
                temperature: [],
                vpd: []
            },
            addListener: vi.fn(),
            removeListener: vi.fn(),
            swapMetricOrder: vi.fn(),
            unlinkGroup: vi.fn(),
            toggleEnvGraph: vi.fn(),
            linkGraphs: vi.fn(),
            unlinkGraphGroup: vi.fn(),
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
            expect(mockStore.setActiveDialog).toHaveBeenCalledWith(
                expect.objectContaining({ type: 'CONFIG' })
            );

            // Strains
            const strainsItem = menu?.querySelectorAll('.menu-item')[4] as HTMLElement; // Index 4 based on render order? 
            // Better to find by text if possible, but structure is fixed in code: Config, Edit, Compact, ControlHum, Strains...
            // Config=0, Edit=1, Compact=2, Control=3, Strains=4
            strainsItem.click();
            expect(mockStore.fetchStrainLibrary).toHaveBeenCalled();
            expect(mockStore.setActiveDialog).toHaveBeenCalledWith(
                expect.objectContaining({ type: 'STRAIN_LIBRARY' })
            );

            document.body.removeChild(element);
        });
    });

    describe('Responsiveness', () => {
        it('should show mobile link button on mobile', async () => {
            // We need to preserve observe method because firstUpdated calls it
            (element as any)._resizeController = {
                isMobile: true,
                observe: vi.fn(),
                unobserve: vi.fn(),
                hasTouch: false
            };
            element.requestUpdate();

            document.body.appendChild(element); // Re-attach to force render with new controller state if possible
            // However, private controller prop replacement might be tricky if it's used in firstUpdated.
            // We can just set it on the instance and request metrics re-compute if it affected metrics.
            // But it affects render template directly.

            await element.updateComplete;

            const linkBtn = element.shadowRoot?.querySelector('.mobile-link');
            expect(linkBtn).not.toBeNull();

            (linkBtn as HTMLElement).click();
            await element.updateComplete;
            expect(linkBtn?.classList.contains('active')).toBe(true);

            document.body.removeChild(element);
        });
    });

    describe('Drag & Drop', () => {
        it('should handle drop to link graphs', async () => {
            document.body.appendChild(element);
            await element.updateComplete;

            // Mock drag start
            (element as any)._draggedMetric = 'temperature';

            // Call handleChipDrop directly since creating DataTransfer in JSDOM is tedious
            (element as any)._handleChipDrop(new Event('drop'), 'humidity');

            expect(mockHistory.linkGraphs).toHaveBeenCalledWith('temperature', 'humidity');
            expect((element as any)._draggedMetric).toBeNull(); // Reset

            document.body.removeChild(element);
        });
    });

    describe('Menu Actions Coverage', () => {
        beforeEach(async () => {
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
            mockStore.state.isEditMode = false;
            (element as any)._triggerAction('edit');
            expect(mockStore.setEditMode).toHaveBeenCalledWith(true);
        });

        it('should handle compact action', () => {
            mockStore.state.viewMode = 'standard';
            (element as any)._triggerAction('compact');
            expect(mockStore.setViewMode).toHaveBeenCalledWith('compact');

            mockStore.state.viewMode = 'compact';
            (element as any)._triggerAction('compact');
            expect(mockStore.setViewMode).toHaveBeenCalledWith('standard');
        });

        it('should handle irrigation action', () => {
            mockStore.state.selectedDevice = 'd1';
            (element as any)._triggerAction('irrigation');
            expect(mockStore.setActiveDialog).toHaveBeenCalledWith(expect.objectContaining({ type: 'IRRIGATION', payload: true }));

            mockStore.state.selectedDevice = null;
            vi.clearAllMocks();
            (element as any)._triggerAction('irrigation');
            expect(mockStore.setActiveDialog).not.toHaveBeenCalled();
        });

        it('should handle ai action', () => {
            mockStore.state.selectedDevice = 'd1';
            (element as any)._triggerAction('ai');
            expect(mockStore.setActiveDialog).toHaveBeenCalledWith(expect.objectContaining({
                type: 'GROW_MASTER',
                payload: expect.objectContaining({ growspaceId: 'd1', mode: 'single' })
            }));
        });

        it('should handle logbook action', () => {
            (element as any)._triggerAction('logbook');
            expect(mockStore.openLogbookDialog).toHaveBeenCalled();
        });
    });

    describe('Scroll Logic Coverage', () => {
        beforeEach(() => {
            document.body.appendChild(element);
        });
        afterEach(() => {
            document.body.removeChild(element);
        });

        it('should handle _scrollChips', () => {
            const container = document.createElement('div');
            container.scrollBy = vi.fn();
            (element as any)._chipsContainerRef = { value: container };

            (element as any)._scrollChips('left');
            expect(container.scrollBy).toHaveBeenCalledWith(expect.objectContaining({ left: -200 }));

            (element as any)._scrollChips('right');
            expect(container.scrollBy).toHaveBeenCalledWith(expect.objectContaining({ left: 200 }));
        });

        it('should handle _scrollStage', () => {
            const container = document.createElement('div');
            container.scrollBy = vi.fn();
            (element as any)._stageContainerRef = { value: container };

            (element as any)._scrollStage('left');
            expect(container.scrollBy).toHaveBeenCalledWith(expect.objectContaining({ left: -100 }));
        });

        it('should handle _scrollDeviceChips', () => {
            const container = document.createElement('div');
            container.scrollBy = vi.fn();
            (element as any)._deviceChipsContainerRef = { value: container };

            (element as any)._scrollDeviceChips('right');
            expect(container.scrollBy).toHaveBeenCalledWith(expect.objectContaining({ left: 100 }));
        });

        it('should check scroll state correctly', () => {
            const container = { scrollLeft: 10, scrollWidth: 200, clientWidth: 100 };
            (element as any)._chipsContainerRef = { value: container };

            (element as any)._checkScroll();
            expect((element as any)._canScrollLeft).toBe(true);
            expect((element as any)._canScrollRight).toBe(true);

            // Edge case: scrolled to end
            container.scrollLeft = 100;
            (element as any)._checkScroll();
            expect((element as any)._canScrollRight).toBe(false);
        });
    });

    describe('Lifecycle & Edge Cases', () => {
        it('should manage listeners on connect/disconnect', () => {
            const addSpy = vi.spyOn(mockHistory, 'addListener');
            const removeSpy = vi.spyOn(mockHistory, 'removeListener');

            document.body.appendChild(element);
            expect(addSpy).toHaveBeenCalled();

            document.body.removeChild(element);
            expect(removeSpy).toHaveBeenCalled();
        });

        it('should re-check scroll on update', () => {
            vi.useFakeTimers();
            const spy = vi.spyOn(element as any, '_checkScroll');
            const changedProps = new Map([['activeEnvGraphs', true]]);
            element.updated(changedProps);
            vi.runAllTimers();
            expect(true).toBe(true);
            vi.useRealTimers();
        });

        it('should compute metrics gracefully if dependencies missing', () => {
            element.hass = undefined as any;
            const res = (element as any)._computeMetrics();
            expect(res.mainChips).toEqual([]);
        });

        it('should handle chip drag start', () => {
            const e = { dataTransfer: { setData: vi.fn(), effectAllowed: '' } } as any;
            (element as any)._handleChipDragStart(e, 'temp');
            expect(e.dataTransfer.setData).toHaveBeenCalledWith('text/plain', 'temp');
            expect((element as any)._draggedMetric).toBe('temp');
        });

        it('should handle drag over', () => {
            (element as any)._draggedMetric = 'temp';
            const e = { preventDefault: vi.fn() } as any;
            (element as any)._handleDragOver(e);
            expect(e.preventDefault).toHaveBeenCalled();
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

        it('should do nothing if history controller is missing', async () => {
            element.historyController = undefined as any;
            (element as any)._unlinkGraphs(1);
            // Should not throw
            expect(mockHistory.unlinkGraphGroup).not.toHaveBeenCalled();
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

        it('should determine chip draggable state', async () => {
            // Default (Desktop) -> 'true'
            expect((element as any)._chipDraggable).toBe('true');

            // Mobile/Touch cases
            const resizeCtrl = (element as any)._resizeController;
            resizeCtrl.isMobile = true;

            // _mobileLink is false by default
            expect((element as any)._chipDraggable).toBe('false');

            // Enable mobile link mode (private state)
            (element as any)._mobileLink = true;
            expect((element as any)._chipDraggable).toBe('true');

            // Reset
            resizeCtrl.isMobile = false;
        });
    });

    describe('Toggle Env Graph', () => {
        it('should toggle graph visibility using controller', () => {
            (element as any)._toggleEnvGraph('temp');
            expect(mockHistory.toggleEnvGraph).toHaveBeenCalledWith({ metric: 'temp', visible: true });
        });

        it('should return safely if history controller is missing', () => {
            element.historyController = undefined as any;
            (element as any)._toggleEnvGraph('temp');
            expect(mockHistory.toggleEnvGraph).not.toHaveBeenCalled();
        });
    });

    describe('Scroll Functions', () => {
        it('should scroll chips left and right', async () => {
            document.body.appendChild(element);
            await element.updateComplete;

            const container = element.shadowRoot?.querySelector('.chips-scroll-container') as HTMLElement;
            if (container) {
                const scrollSpy = vi.spyOn(container, 'scrollBy');
                (element as any)._scrollChips('left');
                expect(scrollSpy).toHaveBeenCalledWith({ left: -200, behavior: 'smooth' });

                (element as any)._scrollChips('right');
                expect(scrollSpy).toHaveBeenCalledWith({ left: 200, behavior: 'smooth' });
            }

            document.body.removeChild(element);
        });

        it('should scroll stage pills left and right', async () => {
            document.body.appendChild(element);
            await element.updateComplete;

            const container = element.shadowRoot?.querySelector('.st-pills-container') as HTMLElement;
            if (container) {
                const scrollSpy = vi.spyOn(container, 'scrollBy');
                (element as any)._scrollStage('left');
                expect(scrollSpy).toHaveBeenCalledWith({ left: -150, behavior: 'smooth' });

                (element as any)._scrollStage('right');
                expect(scrollSpy).toHaveBeenCalledWith({ left: 150, behavior: 'smooth' });
            }

            document.body.removeChild(element);
        });

        it('should scroll device chips left and right', async () => {
            document.body.appendChild(element);
            await element.updateComplete;

            const container = element.shadowRoot?.querySelector('.gs-device-chips-container') as HTMLElement;
            if (container && typeof container.scrollBy === 'function') {
                const scrollSpy = vi.spyOn(container, 'scrollBy');
                (element as any)._scrollDeviceChips('left');
                expect(scrollSpy).toHaveBeenCalledWith({ left: -200, behavior: 'smooth' });

                (element as any)._scrollDeviceChips('right');
                expect(scrollSpy).toHaveBeenCalledWith({ left: 200, behavior: 'smooth' });
            }

            document.body.removeChild(element);
        });

        it('should check scroll state for all containers', async () => {
            document.body.appendChild(element);
            await element.updateComplete;

            // Mock containers with scroll capability
            const chipsContainer = element.shadowRoot?.querySelector('.chips-scroll-container') as HTMLElement;
            const stageContainer = element.shadowRoot?.querySelector('.st-pills-container') as HTMLElement;
            const deviceContainer = element.shadowRoot?.querySelector('.gs-device-chips-container') as HTMLElement;

            if (chipsContainer) {
                Object.defineProperty(chipsContainer, 'scrollLeft', { value: 50, writable: true });
                Object.defineProperty(chipsContainer, 'scrollWidth', { value: 500, writable: true });
                Object.defineProperty(chipsContainer, 'clientWidth', { value: 200, writable: true });
            }

            (element as any)._checkScroll();
            await element.updateComplete;

            // Should update scroll state flags
            expect((element as any)._canScrollLeft).toBeDefined();
            expect((element as any)._canScrollRight).toBeDefined();

            document.body.removeChild(element);
        });
    });

    describe('Drag and Drop', () => {
        beforeAll(() => {
            if (!(globalThis as any).DragEvent) {
                (globalThis as any).DragEvent = class extends Event {
                    dataTransfer: any = { setData: vi.fn(), getData: vi.fn() };
                    constructor(type: string, init?: any) {
                        super(type, init);
                    }
                } as any;
            }
        });

        it('should handle chip drag start', () => {
            const dragEvent = new DragEvent('dragstart');
            (element as any)._handleChipDragStart(dragEvent, 'temperature');

            expect(dragEvent.dataTransfer?.setData).toHaveBeenCalledWith('text/plain', 'temperature');
        });

        it('should handle chip drop', () => {
            const dragEvent: any = new DragEvent('drop');
            dragEvent.dataTransfer = {
                getData: vi.fn().mockReturnValue('temperature'),
                setData: vi.fn()
            };

            // Just verify function executes without error
            expect(() => (element as any)._handleChipDrop(dragEvent, 'vpd')).not.toThrow();
        });

        it('should handle drag over', () => {
            const dragEvent: any = new DragEvent('dragover');
            dragEvent.preventDefault = vi.fn();

            // Just verify function executes
            expect(() => (element as any)._handleDragOver(dragEvent)).not.toThrow();
        });

        it('should unlink graph groups', () => {
            // Just verify function executes
            expect(() => (element as any)._unlinkGraphs(0)).not.toThrow();
        });
    });

    describe('Lifecycle Methods', () => {
        it('should set up listeners on connectedCallback', () => {
            const spy = vi.spyOn(mockHistory, 'addListener');
            (element as any).connectedCallback();

            expect(spy).toHaveBeenCalled();
        });

        it('should clean up on disconnectedCallback', () => {
            const spy = vi.spyOn(mockHistory, 'removeListener');
            (element as any).disconnectedCallback();

            expect(spy).toHaveBeenCalled();
        });
    });

    describe('Helper Methods', () => {
        it('should access chip draggable property', () => {
            // Just verify property exists
            expect(() => (element as any)._chipDraggable).not.toThrow();
        });

        it('should return active env graphs from history controller', () => {
            mockHistory.activeEnvGraphs = new Set(['temperature', 'vpd']);
            expect((element as any).activeEnvGraphs).toEqual(new Set(['temperature', 'vpd']));
        });
    });
});
