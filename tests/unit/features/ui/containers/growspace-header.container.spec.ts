import { vi, describe, it, expect, beforeEach } from 'vitest';
import { fixture, html } from '@open-wc/testing-helpers';
import { atom } from 'nanostores';
import { ViewMode } from '../../../../../src/constants';
import '../../../../../src/features/ui/containers/growspace-header.container';
import type { GrowspaceHeaderContainer } from '../../../../../src/features/ui/containers/growspace-header.container';

vi.mock('../../../../../src/features/ui/components/growspace-header-ui', () => {
    if (!customElements.get('growspace-header-ui')) {
        customElements.define('growspace-header-ui', class extends HTMLElement {});
    }
    return {};
});

// Mock HeaderDragController since it has side effects
vi.mock('../../../../../src/controllers/header-drag-controller', () => ({
    HeaderDragController: class {
        constructor() {}
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

const buildMockStore = () => ({
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
    openECRampDialog: vi.fn(),
    openGrowReportDialog: vi.fn(),
    handleDeviceChange: vi.fn(),
    toggleEnvGraph: vi.fn(),
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
    $headerState: atom(null),
    $headerActionsState: atom({ viewMode: 'standard', isEditMode: false, selectedPlants: new Set() }),
});

describe('GrowspaceHeaderContainer', () => {
    let element: GrowspaceHeaderContainer;
    let mockStore: ReturnType<typeof buildMockStore>;

    beforeEach(async () => {
        mockStore = buildMockStore();

        element = await fixture<GrowspaceHeaderContainer>(html`<growspace-header></growspace-header>`);
        (element as any).store = mockStore;
        (element as any).device = mockDevice;
        (element as any).hass = { states: {} };
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

    it('_handleToggleGraph with string detail calls store.toggleEnvGraph', () => {
        (element as any)._handleToggleGraph(new CustomEvent('toggle-graph', { detail: 'temperature' }));
        expect(mockStore.toggleEnvGraph).toHaveBeenCalledWith('temperature');
    });

    it('_handleToggleGraph with object detail calls store.toggleEnvGraph with metric', () => {
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

    it('add_plant action calls store.openAddPlantDialog', () => {
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
        expect(mockStore.openTrainingDialog).toHaveBeenCalledWith(
            expect.arrayContaining(['p1', 'p2']),
            'grow1'
        );
    });

    it('training action with no selected plants passes empty array', () => {
        mockStore.ui.$selectedPlants.get.mockReturnValue(new Set());
        (element as any)._handleActionTriggered(
            new CustomEvent('action-triggered', { detail: { action: 'training' } })
        );
        expect(mockStore.openTrainingDialog).toHaveBeenCalledWith([], 'grow1');
    });

    it('nutrients action calls store.openNutrientsDialog', () => {
        (element as any)._handleActionTriggered(
            new CustomEvent('action-triggered', { detail: { action: 'nutrients' } })
        );
        expect(mockStore.openNutrientsDialog).toHaveBeenCalledOnce();
    });

    it('ec_ramp action calls store.openECRampDialog with deviceId', () => {
        (element as any)._handleActionTriggered(
            new CustomEvent('action-triggered', { detail: { action: 'ec_ramp' } })
        );
        expect(mockStore.openECRampDialog).toHaveBeenCalledWith('grow1');
    });

    it('report action calls store.openGrowReportDialog with deviceId', () => {
        (element as any)._handleActionTriggered(
            new CustomEvent('action-triggered', { detail: { action: 'report' } })
        );
        expect(mockStore.openGrowReportDialog).toHaveBeenCalledWith('grow1');
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

    it('unknown action logs a warning and does not throw', () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        (element as any)._handleActionTriggered(
            new CustomEvent('action-triggered', { detail: { action: 'unknown_action' } })
        );
        expect(warnSpy).toHaveBeenCalledWith(
            expect.stringContaining('[GrowspaceHeaderContainer] Unknown action: unknown_action')
        );
        warnSpy.mockRestore();
    });

    it('action does nothing when store is not set', () => {
        (element as any).store = undefined;
        expect(() =>
            (element as any)._handleActionTriggered(
                new CustomEvent('action-triggered', { detail: { action: 'add_plant' } })
            )
        ).not.toThrow();
    });

    // --- _handleChipDrop ---

    it('_handleChipDrop calls dragController.handleDrop', () => {
        const e = new CustomEvent('chip-drop', {
            detail: { event: new MouseEvent('drop'), targetMetric: 'humidity' },
        });
        (element as any)._handleChipDrop(e);
        expect((element as any)._dragController.handleDrop).toHaveBeenCalled();
    });
});
