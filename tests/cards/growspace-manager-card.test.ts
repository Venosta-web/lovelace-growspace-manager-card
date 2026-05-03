import { fixture } from '@open-wc/testing-helpers';
import { expect, test, describe, beforeEach, vi, afterEach } from 'vitest';
import { html } from 'lit';
import { GrowspaceManagerCard } from '../../src/growspace-manager-card';
import { ViewMode } from '../../src/features/environment/constants';
import type { GrowspaceManagerCardConfig } from '../../src/lib/types/config';

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

  beforeEach(async () => {
    element = await fixture<GrowspaceManagerCard>(
      html`<growspace-manager-card></growspace-manager-card>`
    );
    element.hass = {
      states: {},
      callService: vi.fn(),
      language: 'en',
    } as any;
  });

  afterEach(() => {
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
});
