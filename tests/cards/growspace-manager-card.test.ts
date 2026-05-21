import { fixture } from '@open-wc/testing-helpers';
import { expect, test, describe, aroundEach, vi } from 'vitest';
import { page } from 'vitest/browser';
import { html } from 'lit';
import { GrowspaceManagerCard } from '../../src/growspace-manager-card';
import { ViewMode } from '../../src/features/environment/constants';
import type { GrowspaceManagerCardConfig } from '../../src/lib/types/config';
import { createMockHass } from '../mocks/hass';

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
    element = await fixture<GrowspaceManagerCard>(
      html`<growspace-manager-card></growspace-manager-card>`
    );
    element.hass = createMockHass() as any;
    await runTest();
    vi.restoreAllMocks();
  });

  test('is defined', () => {
    expect(element).toBeInstanceOf(GrowspaceManagerCard);
  });

  test('renders error state when hass is missing', async () => {
    const el = await fixture<GrowspaceManagerCard>(
      html`<growspace-manager-card></growspace-manager-card>`
    );
    el.hass = undefined as any;
    await el.updateComplete;
    const errorDiv = el.shadowRoot?.querySelector('.error');
    expect(errorDiv?.textContent).toContain('Home Assistant not available');
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

  test('matches visual snapshot', async () => {
    element.store.ui.$isLoading.set(false);
    element.store.data.$devices.set([
      { deviceId: 'test_tent', name: 'Test Tent', plantsPerRow: 4, rows: 2, plants: [], environmentAttributes: {} } as any
    ]);
    element.store.grid.$selectedDevice.set('test_tent');
    await element.updateComplete;
    await expect(page.elementLocator(element)).toMatchScreenshot();
  });
});
