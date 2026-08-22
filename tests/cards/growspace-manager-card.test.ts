import { expect, test, describe, aroundEach, vi } from 'vitest';
import { GrowspaceManagerCard } from '../../src/growspace-manager-card';
import { ViewMode, MetricKey } from '../../src/features/environment/constants';
import type { GrowspaceManagerCardConfig } from '../../src/lib/types/config';
import { aHass, aGrowspace, aPlant } from '../fixtures';
import { renderCard } from '../harness';
import { gridInteraction$ } from '../../src/slices/grid-interaction';

if (!customElements.get('growspace-manager-card')) {
  customElements.define('growspace-manager-card', GrowspaceManagerCard);
}

vi.mock('../../src/features/ui/containers/growspace-dialog-host.container', () => ({}));
vi.mock('../../src/features/ui/containers/growspace-toast.container', () => ({}));
vi.mock('../../src/features/shared/layouts/growspace-view-switcher', () => ({}));
vi.mock('../../src/features/shared/ui/error-boundary', () => ({
  ErrorBoundary: class extends HTMLElement {},
}));
vi.mock('../../src/growspace-manager-card-editor.js', () => ({}));

describe('GrowspaceManagerCard', () => {
  let element: GrowspaceManagerCard;

  aroundEach(async (runTest) => {
    const handle = await renderCard<GrowspaceManagerCard>('growspace-manager-card', {
      hass: aHass(),
      growspace: aGrowspace(),
    });
    element = handle.element;
    await runTest();
    handle.unmount();
    vi.restoreAllMocks();
  });

  test('is defined', () => {
    expect(element).toBeInstanceOf(GrowspaceManagerCard);
  });

  test('loads the dialog host only when a dialog opens', async () => {
    expect((element as any)._dialogPortal).toBeNull();

    element.store.ui.setActiveDialog({ type: 'ADD_PLANT', payload: { row: 0, col: 0 } });

    await vi.waitFor(() => expect((element as any)._dialogPortal).not.toBeNull());
  });

  test('throws error on invalid config', () => {
    expect(() => element.setConfig(undefined as any)).toThrowError('Invalid configuration');
  });

  test('selectedDevice comes from _viewController.grid', () => {
    // _viewController must be the source of selectedDevice — not a separate atom controller
    expect((element as any)._viewController).toBeDefined();
    expect((element as any)._selectedDeviceController).toBeUndefined();
    expect(element.selectedDevice).toBe((element as any)._viewController.value.grid.selectedDevice);
  });

  test('devices getter returns active (filtered) devices from _viewController.grid', () => {
    expect((element as any)._viewController).toBeDefined();
    expect((element as any)._devicesController).toBeUndefined();
    expect(element.devices).toBe((element as any)._viewController.value.grid.devices);
  });

  test('selectedCount uses selectedPlants from $cardViewState — no separate _selectedPlantsController', () => {
    expect((element as any)._selectedPlantsController).toBeUndefined();
    // selectedPlants is available via $cardViewState
    expect(element.store.ui.$cardViewState.get().selectedPlants).toBeInstanceOf(Set);
  });

  test('sets view mode from config on setConfig', () => {
    const config: GrowspaceManagerCardConfig = {
      type: 'custom:growspace-manager-card',
      default_growspace: 'tent',
      compact: false,
      initial_view_mode: ViewMode.COMPACT,
    };
    const spy = vi.spyOn(element.store.ui, 'setViewMode');
    element.setConfig(config);
    expect(spy).toHaveBeenCalledWith(ViewMode.COMPACT);
  });

  test('_handleToggleExpansion switches from header view to standard view', () => {
    element.store.ui.setViewMode(ViewMode.HEADER);
    (element as any)._handleToggleExpansion();
    expect(element.store.ui.$viewMode.get()).toBe(ViewMode.STANDARD);
  });

  test('_handleToggleExpansion switches from standard view to header view', () => {
    element.store.ui.setViewMode(ViewMode.STANDARD);
    (element as any)._handleToggleExpansion();
    expect(element.store.ui.$viewMode.get()).toBe(ViewMode.HEADER);
  });

  test('expand button: view mode stays standard after user switches from compact, even when setConfig is called again', () => {
    const config: GrowspaceManagerCardConfig = {
      type: 'custom:growspace-manager-card',
      default_growspace: 'tent',
      initial_view_mode: ViewMode.COMPACT,
    };
    element.setConfig(config);
    expect(element.store.ui.$viewMode.get()).toBe(ViewMode.COMPACT);

    // User clicks the expand button → view-mode-changed fires → setViewMode('standard')
    element.store.ui.setViewMode(ViewMode.STANDARD);
    expect(element.store.ui.$viewMode.get()).toBe(ViewMode.STANDARD);

    // HA calls setConfig again (e.g., reconnect, editor save) — view mode must NOT reset
    element.setConfig(config);
    expect(element.store.ui.$viewMode.get()).toBe(ViewMode.STANDARD);
  });

  test('initial_view_mode is applied on first setConfig but ignored on subsequent calls', () => {
    const config: GrowspaceManagerCardConfig = {
      type: 'custom:growspace-manager-card',
      default_growspace: 'tent',
      initial_view_mode: ViewMode.COMPACT,
    };

    element.setConfig(config);
    expect(element.store.ui.$viewMode.get()).toBe(ViewMode.COMPACT);

    element.store.ui.setViewMode(ViewMode.STANDARD);

    const updatedConfig: GrowspaceManagerCardConfig = {
      ...config,
      keyboard_rotate_enabled: true,
    };
    element.setConfig(updatedConfig);
    expect(element.store.ui.$viewMode.get()).toBe(ViewMode.STANDARD);
  });

  test('scoped Escape cancels Compare and announces that prior state was restored', async () => {
    element.store.ui.startCompare(0);
    (element as any)._handleKeyboardNav(new KeyboardEvent('keydown', { key: 'Escape' }));
    await element.updateComplete;

    expect(element.store.ui.$taskState.get()).toEqual({ kind: 'idle' });
    expect(element.store.ui.$announcement.get().message).toContain('Compare cancelled');
  });

  test('Compare cannot be cancelled or submitted twice while its save is in flight', async () => {
    let resolveSave!: () => void;
    const pendingSave = new Promise<void>((resolve) => {
      resolveSave = resolve;
    });
    const saveSpy = vi.spyOn(element.store.comparisons, 'save').mockReturnValue(pendingSave);
    element.store.ui.startCompare(0);
    element.store.ui.toggleComparisonMetric('humidity', 'Humidity', true, null);
    element.store.ui.toggleComparisonMetric('temperature', 'Temperature', true, null);

    const firstSave = (element as any)._handleTaskDone() as Promise<void>;
    await Promise.resolve();
    expect(element.store.ui.$taskState.get()).toMatchObject({
      kind: 'compare',
      status: 'saving',
    });

    (element as any)._handleKeyboardNav(new KeyboardEvent('keydown', { key: 'Escape' }));
    (element as any)._handleTaskCancel();
    await (element as any)._handleTaskDone();

    expect(saveSpy).toHaveBeenCalledOnce();
    expect(element.store.ui.$taskState.get()).toMatchObject({
      kind: 'compare',
      status: 'saving',
    });

    resolveSave();
    await firstSave;
    expect(element.store.ui.$taskState.get()).toEqual({ kind: 'idle' });
    expect(element.store.ui.$announcement.get().message).toContain('Metric Comparison saved');
  });

  test('Done activates the env graphs for a saved Comparison, even for a metric already displayed standalone', async () => {
    element.store.history.toggleEnvGraph('humidity');
    vi.spyOn(element.store.comparisons, 'save').mockResolvedValue(undefined);
    element.store.ui.startCompare(0);
    element.store.ui.toggleComparisonMetric('humidity', 'Humidity', true, null);
    element.store.ui.toggleComparisonMetric('temperature', 'Temperature', true, null);

    await (element as any)._handleTaskDone();

    const activeEnvGraphs = element.store.history.$activeEnvGraphs.get();
    expect(activeEnvGraphs.has('humidity')).toBe(true);
    expect(activeEnvGraphs.has('temperature')).toBe(true);
  });

  test('Done exits an unchanged Arrange draft without a backend write', async () => {
    const callWS = (element.hass as any).callWS as ReturnType<typeof vi.fn>;
    callWS.mockClear();
    element.store.ui.startArrange([aPlant({ row: 0, col: 0 })], 7);

    await (element as any)._handleTaskDone();

    expect(callWS).not.toHaveBeenCalled();
    expect(element.store.ui.$taskState.get()).toEqual({ kind: 'idle' });
    expect(element.store.ui.$announcement.get().message).toContain('Arrangement unchanged');
  });

  test('Escape discards an Arrange draft and restores the previous view', async () => {
    element.store.ui.setViewMode(ViewMode.HEADER);
    element.store.ui.startArrange([aPlant({ row: 0, col: 0 })], 7);

    (element as any)._handleKeyboardNav(new KeyboardEvent('keydown', { key: 'Escape' }));
    await element.updateComplete;

    expect(element.store.ui.$taskState.get()).toEqual({ kind: 'idle' });
    expect(element.store.ui.$viewMode.get()).toBe(ViewMode.HEADER);
    expect(element.store.ui.$announcement.get().message).toContain('Arrange cancelled');
  });

  test('Done exits Select plants and clears its provisional selection state', async () => {
    element.store.ui.startSelectPlants();
    element.store.ui.togglePlantSelection('plant-1');
    await (element as any)._handleTaskDone();

    expect(element.store.ui.$taskState.get()).toEqual({ kind: 'idle' });
    expect(element.store.ui.$selectedPlants.get().size).toBe(0);
    expect(element.store.ui.$announcement.get().message).toContain('Select plants complete');
  });

  describe('harness tracer', () => {
    let handle: Awaited<ReturnType<typeof renderCard<GrowspaceManagerCard>>>;

    aroundEach(async (runTest) => {
      handle = await renderCard<GrowspaceManagerCard>('growspace-manager-card', {
        hass: aHass(),
        growspace: aGrowspace(),
      });
      await runTest();
      handle.unmount();
    });

    test('renders without crash', () => {
      expect(handle.element).toBeInstanceOf(GrowspaceManagerCard);
    });

    test('chip click opens env graph for that metric', () => {
      handle.clickChip(MetricKey.TEMPERATURE);
      handle.expectEnvGraph(MetricKey.TEMPERATURE);
    });

    test('hero click opens env graph for that metric', () => {
      handle.clickHero(MetricKey.HUMIDITY);
      handle.expectEnvGraph(MetricKey.HUMIDITY);
    });

    test('plant-cell click transitions GridInteraction to selected', () => {
      handle.clickPlantCell(1, 1);
      const state = gridInteraction$.get();
      expect(state.status).toBe('selected');
      if (state.status === 'selected') {
        expect(state.plantId).toBe(`${aGrowspace().growspaceId}_plant_1`);
      }
    });

    test('linkChips groups two metrics in linkedGraphGroups', () => {
      handle.linkChips(MetricKey.TEMPERATURE, MetricKey.HUMIDITY);
      const groups: string[][] = handle.element.store.history.$linkedGraphGroups.get();
      expect(
        groups.some((g) => g.includes(MetricKey.TEMPERATURE) && g.includes(MetricKey.HUMIDITY))
      ).toBe(true);
    });

    test('openGrowmaster opens the Growmaster Dialog', () => {
      handle.openGrowmaster();
      handle.expectGrowmasterOpen();
    });
  });
});
