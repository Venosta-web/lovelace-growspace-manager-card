import { expect, test, describe, aroundEach, vi } from 'vitest';
import { GrowspaceManagerCard } from '../../src/growspace-manager-card';
import { ViewMode, MetricKey } from '../../src/features/environment/constants';
import type { GrowspaceManagerCardConfig } from '../../src/lib/types/config';
import { aHass, aGrowspace } from '../fixtures';
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
      expect(groups.some((g) => g.includes(MetricKey.TEMPERATURE) && g.includes(MetricKey.HUMIDITY))).toBe(true);
    });

    test('openGrowmaster opens the Growmaster Dialog', () => {
      handle.openGrowmaster();
      handle.expectGrowmasterOpen();
    });
  });
});
