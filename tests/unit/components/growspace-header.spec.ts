
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fixture, html, elementUpdated } from '@open-wc/testing-helpers';
import { GrowspaceHeader } from '../../../src/components/growspace-header';
import { MetricsUtils } from '../../../src/utils/metrics-utils';
import { GrowspaceDevice } from '../../../src/types';
import { atom, map } from 'nanostores';

// Helper to silence specific console errors during tests (if needed) or mocks
vi.mock('../../../src/utils/metrics-utils', () => ({
    MetricsUtils: {
        computeHeaderMetrics: vi.fn()
    }
}));

// Mock child components to avoid deep rendering and focus on passing props
vi.mock('../../../src/components/growspace-header/header-hero', () => {
    return {
        GrowspaceHeaderHero: class extends HTMLElement { }
    };
});
vi.mock('../../../src/components/growspace-header/header-stages', () => {
    return {
        GrowspaceHeaderStages: class extends HTMLElement { }
    };
});
vi.mock('../../../src/components/growspace-header/header-actions', () => {
    return {
        GrowspaceHeaderActions: class extends HTMLElement { }
    };
});

// Mock ResizeController
vi.mock('../../../src/controllers/resize-controller', () => {
    return {
        ResizeController: class {
            observe = vi.fn();
            unobserve = vi.fn();
            constructor(host: any, callback: any) { }
        }
    };
});

describe('GrowspaceHeader', () => {
    let element: GrowspaceHeader;
    let mockStore: any;
    let mockHass: any;
    let deviceMock: GrowspaceDevice;

    // Atoms
    const $devices = atom<any[]>([]);
    const $selectedDevice = atom<string | null>(null);
    const $activeEnvGraphs = atom(new Set<string>());
    const $linkedGraphGroups = atom<any[]>([]);

    beforeEach(async () => {
        vi.clearAllMocks();

        // Initialize Atoms
        const mockDevices: any[] = [
            {
                deviceId: 'd1',
                name: 'Growspace 1',
                type: 'normal',
                plants: [],
                grid: {},
                biologicalMetrics: {},
                environmentAttributes: {},
                stats: {}
            },
            {
                deviceId: 'd2',
                name: 'Growspace 2',
                type: 'normal',
                plants: [],
                grid: {},
                biologicalMetrics: {},
                environmentAttributes: {},
                stats: {}
            }
        ];
        $devices.set(mockDevices);
        $selectedDevice.set('d1');

        mockStore = {
            data: {
                $devices,
                $selectedDevice,
                $nutrientInventory: atom(null),
            },
            ui: {
                $viewMode: atom('standard'),
                $isEditMode: atom(false),
                $selectedPlants: atom(new Set()),
                $gridOverlayMode: atom('none'),
            },
            history: {
                $historyCache: map({}),
                $historyLoading: atom(false),
                $activeEnvGraphs,
                $linkedGraphGroups,
                linkGraphs: vi.fn(),
                unlinkGraphGroup: vi.fn(),
            },
            handleDeviceChange: vi.fn(),
            toggleEnvGraph: vi.fn(),
            openNutrientsDialog: vi.fn(),
        };

        mockHass = { states: {}, callService: vi.fn() };

        deviceMock = mockDevices[0];

        // Default Metrics Mock
        (MetricsUtils.computeHeaderMetrics as any).mockReturnValue({
            mainChips: [{ key: 'temp', value: '25' }],
            deviceChips: [{ key: 'fan', value: 'on' }],
            dominant: { label: 'Day 30' },
            envAttrs: {}
        });

        element = await fixture(html`
            <growspace-header
                .store=${mockStore}
                .hass=${mockHass}
                .device=${deviceMock}
                .config=${{}}
            ></growspace-header>
        `);
    });

    it('should be defined', () => {
        expect(element).toBeInstanceOf(GrowspaceHeader);
    });

    it('should render child components', () => {
        const hero = element.shadowRoot?.querySelector('growspace-header-hero');
        const stages = element.shadowRoot?.querySelector('growspace-header-stages');
        const actions = element.shadowRoot?.querySelector('growspace-header-actions');

        expect(hero).not.toBeNull();
        expect(stages).not.toBeNull();
        expect(actions).not.toBeNull();
    });

    it('should render device selector when no default_growspace is set', () => {
        // If config is empty, select should be present
        const select = element.shadowRoot?.querySelector('select.growspace-select-header');
        expect(select).not.toBeNull();
    });

    it('should handle device change', async () => {
        const select = element.shadowRoot?.querySelector('select.growspace-select-header') as HTMLSelectElement;
        // Mock change
        select.value = 'd2';
        select.dispatchEvent(new Event('change'));
        expect(mockStore.handleDeviceChange).toHaveBeenCalledWith('d2');
    });

    it('should update metrics when device changes', async () => {
        // Since we mock computeHeaderMetrics, we check if it was called
        expect(MetricsUtils.computeHeaderMetrics).toHaveBeenCalled();

        // Update device
        element.device = { ...deviceMock, name: 'New Device' };
        await element.updateComplete;

        expect(MetricsUtils.computeHeaderMetrics).toHaveBeenCalled();
    });

    describe('Actions and Events', () => {
        it('should handle chip drag start with native event', () => {
            const dragEvent = { dataTransfer: { effectAllowed: '', setData: vi.fn() } } as any;
            (element as any)._handleChipDragStart(dragEvent, 'vpd');
            expect((element as any)._dragController.draggedMetric).toBe('vpd');
            expect(dragEvent.dataTransfer.effectAllowed).toBe('move');
            expect(dragEvent.dataTransfer.setData).toHaveBeenCalledWith('text/plain', 'vpd');
        });

        it('should handle chip drop edge cases', () => {
            mockStore.history.linkGraphs = vi.fn();

            // Case 1: Same metric
            const dragController = (element as any)._dragController;
            // set private state via cast or method
            dragController['handleDragStart']({ dataTransfer: { setData: () => { } } } as any, 'temp');

            (element as any)._handleChipDrop(null, 'temp');
            expect(mockStore.history.linkGraphs).not.toHaveBeenCalled();
            expect(dragController.draggedMetric).toBeNull();

            // Case 2: No dragged metric
            // Ensure null
            if (dragController.draggedMetric) dragController['handleDrop'](null, '', () => { });

            (element as any)._handleChipDrop(null, 'vpd');
            expect(mockStore.history.linkGraphs).not.toHaveBeenCalled();
            expect(dragController.draggedMetric).toBeNull();
        });

        it('should call store.openNutrientsDialog', () => {
            const secondary = element.shadowRoot?.querySelector('growspace-header-secondary');
            secondary?.dispatchEvent(new CustomEvent('open-nutrients'));
            expect(mockStore.openNutrientsDialog).toHaveBeenCalled();
        });
    });

    describe('Rendering Branches', () => {
        it('should render title instead of select when default_growspace is set', async () => {
            element.config = { default_growspace: 'd1' } as any;
            await elementUpdated(element);
            const title = element.shadowRoot?.querySelector('h1.gs-title');
            const select = element.shadowRoot?.querySelector('select');
            expect(title).not.toBeNull();
            expect(select).toBeNull();
        });

        it('should call _unlinkGraphs direktly', () => {
            (element as any)._unlinkGraphs(1);
            expect(mockStore.history.unlinkGraphGroup).toHaveBeenCalledWith(1);
        });

        it('should call _handleToggleMobileLink direktly', () => {
            (element as any)._mobileLink = false;
            (element as any)._handleToggleMobileLink();
            expect((element as any)._mobileLink).toBe(true);
        });

        it('should split chips correctly', async () => {
            (MetricsUtils.computeHeaderMetrics as any).mockReturnValue({
                mainChips: [
                    { key: 'temperature', value: '25' },
                    { key: 'co2', value: '800' },
                    { key: 'lux', value: '5000' }
                ],
                deviceChips: [],
                dominant: undefined,
                envAttrs: {}
            });
            element.requestUpdate();
            await elementUpdated(element);

            const hero = element.shadowRoot?.querySelector('growspace-header-hero') as any;
            const secondary = element.shadowRoot?.querySelector('growspace-header-secondary') as any;

            expect(hero.chips.length).toBe(2); // temperature, co2
            expect(secondary.chips.length).toBe(1); // lux
        });
        it('should handle all events from all child components', async () => {
            const el = await fixture<GrowspaceHeader>(html`
            <growspace-header .hass=${mockHass} .device=${deviceMock} .store=${mockStore}></growspace-header>
        `);

            const storeSpy = vi.spyOn(mockStore, 'toggleEnvGraph');
            const nutrientsSpy = vi.spyOn(mockStore, 'openNutrientsDialog');
            const historySpy = vi.spyOn(mockStore.history, 'linkGraphs');
            const unlinkSpy = vi.spyOn(mockStore.history, 'unlinkGraphGroup');
            const updateSpy = vi.spyOn(el as any, '_handleToggleMobileLink'); // Spy on method itself

            // 1. Actions
            const actions = el.shadowRoot!.querySelector('growspace-header-actions') as any;
            actions.dispatchEvent(new CustomEvent('toggle-graph', { detail: { metric: 'temp' } }));
            expect(storeSpy).toHaveBeenCalledWith('temp');

            actions.dispatchEvent(new CustomEvent('toggle-mobile-link'));
            expect(updateSpy).toHaveBeenCalled();

            actions.dispatchEvent(new CustomEvent('chip-drag-start', { detail: { metric: 'humi' } }));
            expect((el as any)._dragController.draggedMetric).toBe('humi');

            actions.dispatchEvent(new CustomEvent('chip-drop', { detail: { targetMetric: 'vpd' } }));
            expect(historySpy).toHaveBeenCalledWith('humi', 'vpd');

            // 2. Secondary
            const secondary = el.shadowRoot!.querySelector('growspace-header-secondary') as any;
            secondary.dispatchEvent(new CustomEvent('open-nutrients'));
            expect(nutrientsSpy).toHaveBeenCalled();

            secondary.dispatchEvent(new CustomEvent('toggle-graph', { detail: { metric: 'co2' } }));
            expect(storeSpy).toHaveBeenCalledWith('co2');

            secondary.dispatchEvent(new CustomEvent('unlink-graphs', { detail: { groupIndex: 1 } }));
            expect(unlinkSpy).toHaveBeenCalledWith(1);

            // Reset dragged metric for secondary drop test
            const controller = (el as any)._dragController;
            controller.handleDragStart({ dataTransfer: { setData: () => { } } } as any, 'temp');
            secondary.dispatchEvent(new CustomEvent('chip-drag-start', { detail: { metric: 'temp' } }));
            secondary.dispatchEvent(new CustomEvent('chip-drop', { detail: { targetMetric: 'co2' } }));
            expect(historySpy).toHaveBeenCalledWith('temp', 'co2');

            // 3. Hero
            const hero = el.shadowRoot!.querySelector('growspace-header-hero') as any;
            hero.dispatchEvent(new CustomEvent('toggle-graph', { detail: { metric: 'vpd' } }));
            expect(storeSpy).toHaveBeenCalledWith('vpd');

            expect(updateSpy).toHaveBeenCalledTimes(1);

            (el as any)._dragController.handleDragStart({ dataTransfer: { setData: () => { } } } as any, 'humi');
            hero.dispatchEvent(new CustomEvent('chip-drag-start', { detail: { metric: 'humi' } }));
            hero.dispatchEvent(new CustomEvent('chip-drop', { detail: { targetMetric: 'temp' } }));
            expect(historySpy).toHaveBeenCalledWith('humi', 'temp');
        });

        it('should handle device change from select', async () => {
            // Need config with NO default_growspace to show select
            const el = await fixture<GrowspaceHeader>(html`
            <growspace-header .hass=${mockHass} .device=${deviceMock} .store=${mockStore} .config=${{}}></growspace-header>
        `);

            const spy = vi.spyOn(mockStore, 'handleDeviceChange');
            const select = el.shadowRoot!.querySelector('select');
            expect(select).not.toBeNull();

            if (select) {
                select.value = 'd2';
                select.dispatchEvent(new Event('change'));
                expect(spy).toHaveBeenCalledWith('d2');
            }
        });

        it('should handle missing device or hass', async () => {
            const el = await fixture<GrowspaceHeader>(html`
            <growspace-header></growspace-header>
        `);
            expect(el.shadowRoot!.innerHTML).toContain('<!---->');
        });
    });

    describe('Store Integration', () => {
        it('should handle connectedCallback without store', async () => {
            const detached = document.createElement('growspace-header') as GrowspaceHeader;
            // store is undefined
            document.body.appendChild(detached);
            expect((detached as any)._viewModeController).toBeUndefined();
            document.body.removeChild(detached);
        });

        it('should handle toggle-graph event from children', () => {
            mockStore.toggleEnvGraph = vi.fn();
            const hero = element.shadowRoot?.querySelector('growspace-header-hero');
            hero?.dispatchEvent(new CustomEvent('toggle-graph', { detail: { metric: 'vpd' } }));
            expect(mockStore.toggleEnvGraph).toHaveBeenCalledWith('vpd');
        });
    });

    describe('Branch Coverage Edge Cases', () => {
        it('should safely handle _toggleEnvGraph when store is missing', () => {
            (element as any).store = undefined;
            (element as any)._toggleEnvGraph('kPa');
            // Should not throw
        });

        it('should safely handle _unlinkGraphs when store or history is missing', () => {
            (element as any).store = undefined;
            (element as any)._unlinkGraphs(1);
            // Should not throw

            (element as any).store = { history: undefined };
            (element as any)._unlinkGraphs(1);
            // Should not throw
        });

        it('should safely handle _handleChipDragStart with null event or missing dataTransfer', () => {
            (element as any)._handleChipDragStart(null, 'metric');
            expect((element as any)._dragController.draggedMetric).toBe('metric');

            (element as any)._handleChipDragStart({} as any, 'metric');
            expect((element as any)._dragController.draggedMetric).toBe('metric');
        });

        it('should safely handle _handleChipDrop interaction with store', () => {
            const dragController = (element as any)._dragController;

            // Case 1: Store missing
            (element as any).store = undefined;
            dragController.handleDragStart({ dataTransfer: { setData: () => { } } } as any, 'source');
            (element as any)._handleChipDrop(new DragEvent('drop'), 'target');
            expect(dragController.draggedMetric).toBeNull();

            // Case 2: History missing
            (element as any).store = { history: undefined };
            dragController.handleDragStart({ dataTransfer: { setData: () => { } } } as any, 'source');
            (element as any)._handleChipDrop(new DragEvent('drop'), 'target');
            expect(dragController.draggedMetric).toBeNull();
        });

        it('should return default Set for activeEnvGraphs when controller is missing', () => {
            (element as any)._activeEnvGraphsController = undefined;
            expect(element.activeEnvGraphs).toBeInstanceOf(Set);
            expect(element.activeEnvGraphs.size).toBe(0);
        });

        it('should handle missing config in render', async () => {
            (element as any).config = undefined;
            await elementUpdated(element);
            // Should assume !config.default_growspace is true/undefined -> check for Select
            const select = element.shadowRoot?.querySelector('select.growspace-select-header');
            expect(select).not.toBeNull();
        });

        it('should fallback to Select Growspace if device name is empty', async () => {
            element.device = { ...element.device, name: '' };
            await elementUpdated(element);
            const sizer = element.shadowRoot?.querySelector('.select-sizer');
            expect(sizer?.textContent).toBe('Select Growspace');
        });

        it('should handle null nutrient inventory in render', async () => {
            // Already null in default setup, but verifying render pass
            const secondary = element.shadowRoot?.querySelector('growspace-header-secondary');
            expect((secondary as any).inventory).toBeNull();
        });

        it('should return safely if updateMetrics called without device or hass', () => {
            (element as any).device = undefined;
            (element as any)._updateMetrics();
            expect((element as any)._mainChips).toEqual([]);

            (element as any).device = deviceMock;
            (element as any).hass = undefined;
            (element as any)._updateMetrics();
            expect((element as any)._mainChips).toEqual([]);
        });

        it('should handle missing linkedGraphGroupsController value safely', () => {
            // In _updateMetrics: this._linkedGraphGroupsController?.value || []
            (element as any)._linkedGraphGroupsController = undefined;
            (element as any)._updateMetrics();
            // Should verify it didn't throw and ran with []
            expect(MetricsUtils.computeHeaderMetrics).toHaveBeenCalled();
        });

        it('should render nothing if device or hass is missing', async () => {
            (element as any).device = undefined;
            await elementUpdated(element);
            expect(element.shadowRoot?.innerHTML).toContain('<!---->');
        });
    });
});
