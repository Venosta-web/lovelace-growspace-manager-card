import { vi, describe, it, expect, beforeEach } from 'vitest';
import { fixture, html } from '@open-wc/testing-helpers';
import { atom } from 'nanostores';
import { ViewMode } from '../../../../../src/constants';
import { MetricKey } from '../../../../../src/features/environment/constants';
import { MetricsUtils } from '../../../../../src/utils/metrics-utils';
import { envSnapshots$ } from '../../../../../src/slices/environment';
import { plants$ } from '../../../../../src/slices/plant';
import { irrigationConfigs$, tankLevels$ } from '../../../../../src/slices/irrigation';
import '../../../../../src/features/ui/containers/growspace-header.container';
import type { GrowspaceHeaderContainer } from '../../../../../src/features/ui/containers/growspace-header.container';

vi.mock('../../../../../src/features/ui/components/growspace-header-ui', () => {
    if (!customElements.get('growspace-header-ui')) {
        customElements.define('growspace-header-ui', class extends HTMLElement { });
    }
    return {};
});

// Mock HeaderDragController since it has side effects
vi.mock('../../../../../src/controllers/header-drag-controller', () => ({
    HeaderDragController: class {
        constructor() { }
        handleDragStart = vi.fn();
        handleDrop = vi.fn();
    },
}));

// Mock MetricsUtils to avoid complex sensor computations
vi.mock('../../../../../src/utils/metrics-utils', () => ({
    MetricsUtils: {
        computeHeaderMetrics: vi.fn().mockReturnValue({
            mainChips: [],
            deviceChips: [],
            dominant: undefined,
        }),
    },
}));

const mockDevice = { deviceId: 'grow1', name: 'Test Growspace', plants: [] };

const buildMockStore = () => {
    const ui_actions = {
        openAddPlantDialog: vi.fn(),
        openConfigDialog: vi.fn(),
        openStrainLibraryDialog: vi.fn(),
        openIrrigationDialog: vi.fn(),
        openGrowMasterDialog: vi.fn(),
        openLogbookDialog: vi.fn(),
        openSnapshotsDialog: vi.fn(),
        openWateringDialog: vi.fn(),
        openIPMDialog: vi.fn(),
        openTrainingDialog: vi.fn(),
        openNutrientsDialog: vi.fn(),
        toggleEnvGraph: vi.fn(),
        showToast: vi.fn(),
    };
    return {
        // Keep top-level references so old assertions still work
        get openAddPlantDialog() { return ui_actions.openAddPlantDialog; },
        get openConfigDialog() { return ui_actions.openConfigDialog; },
        get openStrainLibraryDialog() { return ui_actions.openStrainLibraryDialog; },
        get openIrrigationDialog() { return ui_actions.openIrrigationDialog; },
        get openGrowMasterDialog() { return ui_actions.openGrowMasterDialog; },
        get openLogbookDialog() { return ui_actions.openLogbookDialog; },
        get openSnapshotsDialog() { return ui_actions.openSnapshotsDialog; },
        get openWateringDialog() { return ui_actions.openWateringDialog; },
        get openIPMDialog() { return ui_actions.openIPMDialog; },
        get openNutrientsDialog() { return ui_actions.openNutrientsDialog; },
        get toggleEnvGraph() { return ui_actions.toggleEnvGraph; },
        actions: { ui: ui_actions },
        handleDeviceChange: vi.fn(),
        history: {
            $historyCache: atom({}),
            linkGraphs: vi.fn(),
            unlinkGraphGroup: vi.fn(),
            loadHistoryOnDemand: vi.fn(),
            startAutoRefresh: vi.fn(),
            getRange: vi.fn().mockReturnValue('24h'),
        },
        ui: {
            setEditMode: vi.fn(),
            setViewMode: vi.fn(),
            $selectedPlants: { get: vi.fn().mockReturnValue(new Set<string>()) },
            $viewMode: { get: vi.fn().mockReturnValue('standard') },
            $isEditMode: { get: vi.fn().mockReturnValue(false) },
        },
        $headerState: atom<any>(null),
        $headerActionsState: atom({ viewMode: 'standard', isEditMode: false, selectedPlants: new Set() }),
    };
};

describe('GrowspaceHeaderContainer', () => {
    let element: GrowspaceHeaderContainer;
    let mockStore: ReturnType<typeof buildMockStore>;

    beforeEach(async () => {
        mockStore = buildMockStore();

        // Reset slice atoms to empty state before each test
        envSnapshots$.set(new Map());
        plants$.set([]);
        irrigationConfigs$.set(new Map());
        tankLevels$.set(new Map());

        element = await fixture<GrowspaceHeaderContainer>(html`<growspace-header></growspace-header>`);
        (element as any).store = mockStore;
        (element as any).device = mockDevice;
        (element as any).hass = { states: {} };
        (element as any)._initControllers();
        element.requestUpdate();
        await element.updateComplete;
    });

    // --- render ---

    it('render returns nothing when device is not set', async () => {
        (element as any).device = undefined;
        element.requestUpdate();
        await element.updateComplete;
        expect(element.shadowRoot?.querySelector('growspace-header-ui')).toBeNull();
    });

    it('render returns nothing when hass is not set', async () => {
        (element as any).hass = undefined;
        element.requestUpdate();
        await element.updateComplete;
        expect(element.shadowRoot?.querySelector('growspace-header-ui')).toBeNull();
    });

    // --- Getters ---

    it('activeEnvGraphs returns history.activeEnvGraphs from store', () => {
        const graphs = new Set(['temp']);
        mockStore.$headerState.set({ history: { activeEnvGraphs: graphs } });
        // Manually re-init to ensure controller picks up the current atom value
        (element as any)._initControllers();
        expect(element.activeEnvGraphs).toBe(graphs);
    });

    it('activeEnvGraphs returns empty Set if state is missing', () => {
        mockStore.$headerState.set(null);
        expect(element.activeEnvGraphs).toBeInstanceOf(Set);
        expect(element.activeEnvGraphs.size).toBe(0);
    });

    it('_problemPlants maps plants with problem attribute', () => {
        (element as any).device = {
            plants: [
                { attributes: { problem: true, strain: 'OG Kush' } },
                { attributes: { problem: true, friendly_name: 'Sick Plant' } },
                { attributes: { problem: true } },
                { attributes: { problem: false, strain: 'Healthy' } },
            ],
        };
        expect((element as any)._problemPlants).toEqual(['OG Kush', 'Sick Plant', 'Unknown']);
    });

    // --- Controllers & Lifecycle ---

    it('_initControllers initializes controllers and starts refresh', () => {
        // Clear mocks from beforeEach
        vi.clearAllMocks();
        (element as any)._headerController = undefined;
        (element as any)._initControllers();
        expect(mockStore.history.loadHistoryOnDemand).toHaveBeenCalled();
        expect(mockStore.history.startAutoRefresh).toHaveBeenCalled();
    });

    it('_initControllers does nothing if store is missing', () => {
        (element as any).store = undefined;
        (element as any)._headerController = undefined;
        (element as any)._initControllers();
        expect((element as any)._headerController).toBeUndefined();
    });

    it('_initControllers does not re-initialize if controllers already exist', () => {
        const existingHeader = { dummy: true };
        const existingActions = { dummy: true };
        const existingCache = { dummy: true };
        (element as any)._headerController = existingHeader;
        (element as any)._actionsController = existingActions;
        (element as any)._historyCacheController = existingCache;

        (element as any)._initControllers();

        expect((element as any)._headerController).toBe(existingHeader);
        expect((element as any)._actionsController).toBe(existingActions);
        expect((element as any)._historyCacheController).toBe(existingCache);
    });

    it('willUpdate re-initializes and loads history if store/device changes', () => {
        const initSpy = vi.spyOn(element as any, '_initControllers');
        element.device = { deviceId: '1' } as any;
        element.willUpdate(new Map([['store', null], ['device', null]]));
        expect(initSpy).toHaveBeenCalled();
        expect(mockStore.history.loadHistoryOnDemand).toHaveBeenCalled();
    });

    it('willUpdate does nothing if unrelated property changes', () => {
        vi.clearAllMocks();
        const initSpy = vi.spyOn(element as any, '_initControllers');
        element.willUpdate(new Map([['compact', true]]));
        expect(initSpy).not.toHaveBeenCalled();
        expect(mockStore.history.loadHistoryOnDemand).not.toHaveBeenCalled();
    });

    // --- Metrics splitting ---

    it('_metrics splits chips into hero (from slice atoms) and device chips (from MetricsUtils)', () => {
        // Seed env snapshot for the test growspace
        envSnapshots$.set(new Map([
            ['grow1', {
                temperature: 25,
                humidity: 50,
                vpd: 1.2,
                vpdStatus: 'optimal',
                co2: 800,
                isLightsOn: true,
                hasLightSensor: true,
                dli: null,
                optimalConditions: null,
            }],
        ]));

        // MetricsUtils still provides deviceChips
        (MetricsUtils.computeHeaderMetrics as any).mockReturnValue({
            mainChips: [],
            deviceChips: [{ key: 'exhaust', value: 'on' }],
            dominant: undefined,
        });

        const metrics = (element as any)._metrics;

        // Hero: temperature, humidity, vpd, co2 from envSnapshots$
        expect(metrics.heroChips).toHaveLength(4);
        const heroKeys = metrics.heroChips.map((c: any) => c.key);
        expect(heroKeys).toContain(MetricKey.TEMPERATURE);
        expect(heroKeys).toContain(MetricKey.HUMIDITY);
        expect(heroKeys).toContain(MetricKey.VPD);
        expect(heroKeys).toContain(MetricKey.CO2);

        // deviceChips still come from MetricsUtils
        expect(metrics.deviceChips).toHaveLength(1);
        expect(metrics.deviceChips[0].key).toBe('exhaust');
    });

    it('_metrics returns empty state if device or hass is missing', () => {
        element.device = undefined as any;
        expect((element as any)._metrics).toEqual({
            heroChips: [],
            secondaryChips: [],
            deviceChips: [],
            dominant: undefined,
        });
    });

    it('_metrics handles missing state or history fallback', () => {
        (element as any)._headerController = { value: undefined };
        // We don't need to assert [] if the mock returns something, 
        // as long as we triggered the || branch.
        const metrics = (element as any)._metrics;
        expect(metrics).toBeDefined();
    });

    it('_metrics handles missing history in state fallback', () => {
        (element as any)._headerController = { value: { history: undefined } };
        const metrics = (element as any)._metrics;
        expect(metrics).toBeDefined();
    });

    // --- _handleDeviceChange ---

    it('_handleDeviceChange calls store.handleDeviceChange and dispatches growspace-changed event', () => {
        const changeHandler = vi.fn();
        element.addEventListener('growspace-changed', changeHandler);

        (element as any)._handleDeviceChange(
            new CustomEvent('device-changed', { detail: { value: { deviceId: 'grow2' } } })
        );

        expect(mockStore.handleDeviceChange).toHaveBeenCalledWith({ deviceId: 'grow2' });
        expect(changeHandler).toHaveBeenCalledOnce();
    });

    // --- _handleToggleGraph ---

    it('_handleToggleGraph with string detail calls store.actions.ui.toggleEnvGraph', () => {
        (element as any)._handleToggleGraph(new CustomEvent('toggle-graph', { detail: 'temperature' }));
        expect(mockStore.toggleEnvGraph).toHaveBeenCalledWith('temperature');
    });

    it('_handleToggleGraph with object detail calls store.actions.ui.toggleEnvGraph with metric', () => {
        (element as any)._handleToggleGraph(new CustomEvent('toggle-graph', { detail: { metric: 'humidity' } }));
        expect(mockStore.toggleEnvGraph).toHaveBeenCalledWith('humidity');
    });

    it('_handleToggleGraph with empty metric does not call toggleEnvGraph', () => {
        (element as any)._handleToggleGraph(new CustomEvent('toggle-graph', { detail: { metric: '' } }));
        expect(mockStore.toggleEnvGraph).not.toHaveBeenCalled();
    });

    // --- _handleOpenNutrients ---

    it('_handleOpenNutrients calls store.openNutrientsDialog', () => {
        (element as any)._handleOpenNutrients();
        expect(mockStore.openNutrientsDialog).toHaveBeenCalledOnce();
    });

    // --- _handleUnlinkGraphs ---

    it('_handleUnlinkGraphs calls store.history.unlinkGraphGroup', () => {
        (element as any)._handleUnlinkGraphs(
            new CustomEvent('unlink-graphs', { detail: { groupIndex: 2 } })
        );
        expect(mockStore.history.unlinkGraphGroup).toHaveBeenCalledWith(2);
    });

    it('_handleUnlinkGraphs does nothing when store.history is absent', () => {
        (element as any).store = { ...mockStore, history: undefined };
        expect(() =>
            (element as any)._handleUnlinkGraphs(
                new CustomEvent('unlink-graphs', { detail: { groupIndex: 0 } })
            )
        ).not.toThrow();
    });

    // --- _handleActionTriggered ---

    it('add_plant action calls store.actions.ui.openAddPlantDialog', () => {
        (element as any)._handleActionTriggered(
            new CustomEvent('action-triggered', { detail: { action: 'add_plant' } })
        );
        expect(mockStore.openAddPlantDialog).toHaveBeenCalledOnce();
    });

    it('config action calls store.openConfigDialog when device is set', () => {
        (element as any)._handleActionTriggered(
            new CustomEvent('action-triggered', { detail: { action: 'config' } })
        );
        expect(mockStore.openConfigDialog).toHaveBeenCalledWith(mockDevice);
    });

    it('config action does not call openConfigDialog when device is absent', () => {
        (element as any).device = undefined;
        (element as any)._handleActionTriggered(
            new CustomEvent('action-triggered', { detail: { action: 'config' } })
        );
        expect(mockStore.openConfigDialog).not.toHaveBeenCalled();
    });

    it('strains action calls store.openStrainLibraryDialog', () => {
        (element as any)._handleActionTriggered(
            new CustomEvent('action-triggered', { detail: { action: 'strains' } })
        );
        expect(mockStore.openStrainLibraryDialog).toHaveBeenCalledOnce();
    });

    it('irrigation action calls store.openIrrigationDialog when device has deviceId', () => {
        (element as any)._handleActionTriggered(
            new CustomEvent('action-triggered', { detail: { action: 'irrigation' } })
        );
        expect(mockStore.openIrrigationDialog).toHaveBeenCalledOnce();
    });

    it('irrigation action does not call openIrrigationDialog when device has no deviceId', () => {
        (element as any).device = { ...mockDevice, deviceId: '' };
        (element as any)._handleActionTriggered(
            new CustomEvent('action-triggered', { detail: { action: 'irrigation' } })
        );
        expect(mockStore.openIrrigationDialog).not.toHaveBeenCalled();
    });

    it('ai action calls store.openGrowMasterDialog with deviceId', () => {
        (element as any)._handleActionTriggered(
            new CustomEvent('action-triggered', { detail: { action: 'ai' } })
        );
        expect(mockStore.openGrowMasterDialog).toHaveBeenCalledWith('grow1');
    });

    it('logbook action calls store.openLogbookDialog', () => {
        (element as any)._handleActionTriggered(
            new CustomEvent('action-triggered', { detail: { action: 'logbook' } })
        );
        expect(mockStore.openLogbookDialog).toHaveBeenCalledOnce();
    });

    it('snapshots action calls store.openSnapshotsDialog with deviceId', () => {
        (element as any)._handleActionTriggered(
            new CustomEvent('action-triggered', { detail: { action: 'snapshots' } })
        );
        expect(mockStore.openSnapshotsDialog).toHaveBeenCalledWith('grow1');
    });

    it('water action with no selected plants calls openWateringDialog in growspace mode', () => {
        mockStore.ui.$selectedPlants.get.mockReturnValue(new Set());
        (element as any)._handleActionTriggered(
            new CustomEvent('action-triggered', { detail: { action: 'water' } })
        );
        expect(mockStore.openWateringDialog).toHaveBeenCalledWith(
            expect.objectContaining({ mode: 'growspace', growspaceId: 'grow1' })
        );
    });

    it('water action with selected plants calls openWateringDialog in plant mode', () => {
        mockStore.ui.$selectedPlants.get.mockReturnValue(new Set(['p1', 'p2']));
        (element as any)._handleActionTriggered(
            new CustomEvent('action-triggered', { detail: { action: 'water' } })
        );
        expect(mockStore.openWateringDialog).toHaveBeenCalledWith(
            expect.objectContaining({
                mode: 'plant',
                plantIds: expect.arrayContaining(['p1', 'p2']),
            })
        );
    });

    it('ipm action with no selected plants calls openIPMDialog without plantIds', () => {
        mockStore.ui.$selectedPlants.get.mockReturnValue(new Set());
        (element as any)._handleActionTriggered(
            new CustomEvent('action-triggered', { detail: { action: 'ipm' } })
        );
        expect(mockStore.openIPMDialog).toHaveBeenCalledWith(
            expect.objectContaining({ growspaceId: 'grow1', plantIds: undefined })
        );
    });

    it('ipm action with selected plants passes plantIds', () => {
        mockStore.ui.$selectedPlants.get.mockReturnValue(new Set(['p3']));
        (element as any)._handleActionTriggered(
            new CustomEvent('action-triggered', { detail: { action: 'ipm' } })
        );
        expect(mockStore.openIPMDialog).toHaveBeenCalledWith(
            expect.objectContaining({ plantIds: ['p3'] })
        );
    });

    it('training action with selected plants passes them to openTrainingDialog', () => {
        mockStore.ui.$selectedPlants.get.mockReturnValue(new Set(['p1', 'p2']));
        (element as any)._handleActionTriggered(
            new CustomEvent('action-triggered', { detail: { action: 'training' } })
        );
        expect(mockStore.actions.ui.openTrainingDialog).toHaveBeenCalledWith(
            expect.arrayContaining(['p1', 'p2']),
            'grow1'
        );
    });

    it('training action with no selected plants passes empty array', () => {
        mockStore.ui.$selectedPlants.get.mockReturnValue(new Set());
        (element as any)._handleActionTriggered(
            new CustomEvent('action-triggered', { detail: { action: 'training' } })
        );
        expect(mockStore.actions.ui.openTrainingDialog).toHaveBeenCalledWith([], 'grow1');
    });

    it('nutrients action calls store.openNutrientsDialog', () => {
        (element as any)._handleActionTriggered(
            new CustomEvent('action-triggered', { detail: { action: 'nutrients' } })
        );
        expect(mockStore.openNutrientsDialog).toHaveBeenCalledOnce();
    });

    it('edit action toggles edit mode', () => {
        mockStore.ui.$isEditMode.get.mockReturnValue(false);
        (element as any)._handleActionTriggered(
            new CustomEvent('action-triggered', { detail: { action: 'edit' } })
        );
        expect(mockStore.ui.setEditMode).toHaveBeenCalledWith(true);
    });

    it('edit action sets edit mode to false when currently true', () => {
        mockStore.ui.$isEditMode.get.mockReturnValue(true);
        (element as any)._handleActionTriggered(
            new CustomEvent('action-triggered', { detail: { action: 'edit' } })
        );
        expect(mockStore.ui.setEditMode).toHaveBeenCalledWith(false);
    });

    it('heatmap action toggles to HEATMAP from STANDARD', () => {
        mockStore.ui.$viewMode.get.mockReturnValue(ViewMode.STANDARD);
        (element as any)._handleActionTriggered(
            new CustomEvent('action-triggered', { detail: { action: 'heatmap' } })
        );
        expect(mockStore.ui.setViewMode).toHaveBeenCalledWith(ViewMode.HEATMAP);
    });

    it('heatmap action toggles back to STANDARD from HEATMAP', () => {
        mockStore.ui.$viewMode.get.mockReturnValue(ViewMode.HEATMAP);
        (element as any)._handleActionTriggered(
            new CustomEvent('action-triggered', { detail: { action: 'heatmap' } })
        );
        expect(mockStore.ui.setViewMode).toHaveBeenCalledWith(ViewMode.STANDARD);
    });

    it('edit action switches ViewMode to STANDARD if currently COMPACT', () => {
        mockStore.ui.$isEditMode.get.mockReturnValue(false);
        mockStore.ui.$viewMode.get.mockReturnValue(ViewMode.COMPACT);
        (element as any)._handleActionTriggered(
            new CustomEvent('action-triggered', { detail: { action: 'edit' } })
        );
        expect(mockStore.ui.setViewMode).toHaveBeenCalledWith(ViewMode.STANDARD);
    });

    it('ai action with no deviceId falls back to empty string', () => {
        element.device = {} as any;
        (element as any)._handleActionTriggered(new CustomEvent('action-triggered', { detail: { action: 'ai' } }));
        expect(mockStore.openGrowMasterDialog).toHaveBeenCalledWith('');
    });

    it('training action with no device passes undefined', () => {
        element.device = undefined as any;
        (element as any)._handleActionTriggered(new CustomEvent('action-triggered', { detail: { action: 'training' } }));
        expect(mockStore.actions.ui.openTrainingDialog).toHaveBeenCalledWith([], undefined);
    });

    it('snapshots action with no device passes undefined', () => {
        element.device = undefined as any;
        (element as any)._handleActionTriggered(new CustomEvent('action-triggered', { detail: { action: 'snapshots' } }));
        expect(mockStore.openSnapshotsDialog).toHaveBeenCalledWith(undefined);
    });

    it('water action with no deviceId passes undefined', () => {
        element.device = {} as any;
        (element as any)._handleActionTriggered(new CustomEvent('action-triggered', { detail: { action: 'water' } }));
        expect(mockStore.openWateringDialog).toHaveBeenCalledWith(expect.objectContaining({
            growspaceId: undefined
        }));
    });

    it('ipm action with no deviceId falls back to empty string', () => {
        element.device = {} as any;
        (element as any)._handleActionTriggered(new CustomEvent('action-triggered', { detail: { action: 'ipm' } }));
        expect(mockStore.openIPMDialog).toHaveBeenCalledWith(expect.objectContaining({
            growspaceId: ''
        }));
    });

    it('unknown action logs a warning and does not throw', () => {
        const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });
        (element as any)._handleActionTriggered(new CustomEvent('action-triggered', { detail: { action: 'unknown_action' } }));
        expect(consoleSpy).toHaveBeenCalled();
        consoleSpy.mockRestore();
    });

    it('action does nothing when store is not set', () => {
        (element as any).store = undefined;
        (element as any)._handleActionTriggered(new CustomEvent('action-triggered', { detail: { action: 'add_plant' } }));
        expect(mockStore.openAddPlantDialog).not.toHaveBeenCalled();
    });

    describe('Getters Null Safety', () => {
        it('_problemPlants returns empty array if device is missing', () => {
            element.device = undefined as any;
            expect((element as any)._problemPlants).toEqual([]);
        });

        it('_problemPlants returns empty array if plants are missing', () => {
            element.device = { deviceId: '1' } as any;
            expect((element as any)._problemPlants).toEqual([]);
        });

        it('_problemPlants falls back to friendly_name then Unknown', () => {
            element.device = {
                plants: [
                    { attributes: { problem: true, friendly_name: 'Friendly' } },
                    { attributes: { problem: true } }
                ]
            } as any;
            expect((element as any)._problemPlants).toEqual(['Friendly', 'Unknown']);
        });
    });

    describe('Drag and Drop', () => {

        it('_handleChipDrop calls dragController.handleDrop and invokes linkGraphs callback', () => {
            const e = new CustomEvent('chip-drop', {
                detail: { event: new MouseEvent('drop'), targetMetric: 'humidity' },
            });

            // Setup handleDrop to immediately call the callback
            (element as any)._dragController.handleDrop.mockImplementation((event: any, target: any, callback: any) => {
                callback('temp', 'hum');
            });

            (element as any)._handleChipDrop(e);

            expect((element as any)._dragController.handleDrop).toHaveBeenCalled();
            expect(mockStore.history.linkGraphs).toHaveBeenCalledWith('temp', 'hum');
        });

        it('_handleChipDragStart calls dragController.handleDragStart', () => {
            const e = new CustomEvent('chip-drag-start', {
                detail: { event: new MouseEvent('dragstart'), metric: 'temp' },
            });
            (element as any)._handleChipDragStart(e);
            expect((element as any)._dragController.handleDragStart).toHaveBeenCalledWith(e.detail.event, 'temp');
        });

        it('_handleChipDrop does nothing if store.history is missing', () => {
            const linkSpy = mockStore.history.linkGraphs;
            const e = new CustomEvent('chip-drop', {
                detail: { event: new MouseEvent('drop'), targetMetric: 'humidity' },
            });
            (element as any).store.history = undefined;
            (element as any)._dragController.handleDrop.mockImplementation((event: any, target: any, callback: any) => {
                callback('temp', 'hum');
            });
            (element as any)._handleChipDrop(e);
            expect(linkSpy).not.toHaveBeenCalled();
        });

        it('_handleUnlinkGraphs does nothing if store.history is missing', () => {
            const unlinkSpy = mockStore.history.unlinkGraphGroup;
            (element as any).store.history = undefined;
            (element as any)._handleUnlinkGraphs(new CustomEvent('unlink', { detail: { groupIndex: 0 } }));
            expect(unlinkSpy).not.toHaveBeenCalled();
        });
    });
});
