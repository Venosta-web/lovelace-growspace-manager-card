import { expect, test, describe, vi } from 'vitest';
import { GrowspaceAnalyticsCard } from '../../src/cards/growspace-analytics-card';
import { ViewMode } from '../../src/features/environment/constants';
import { aHass, aGrowspace } from '../fixtures';
import { renderCard } from '../harness';
import { setDevices } from '../../src/slices/grid';
import * as uiSlice from '../../src/slices/ui';

// Chip clicks toggle env graphs through the slice op the card calls directly.
// `{ spy: true }` keeps every real atom/mutator while recording calls.
vi.mock('../../src/slices/ui', { spy: true });

if (!customElements.get('growspace-analytics-card')) {
  customElements.define('growspace-analytics-card', GrowspaceAnalyticsCard);
}

vi.mock('../../src/features/ui/containers/growspace-analytics.container', () => ({}));
vi.mock('../../src/features/shared/ui/error-boundary', () => ({
  ErrorBoundary: class extends HTMLElement {},
}));
vi.mock('../../src/cards/editors/growspace-analytics-card-editor', () => ({
  GrowspaceAnalyticsCardEditor: class extends HTMLElement {},
}));
vi.mock('../../src/slices/growspace', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../src/slices/growspace')>()),
  fetchRawCollection: vi.fn(() => new Promise(() => {})),
}));

describe('GrowspaceAnalyticsCard', () => {
  const growspace = aGrowspace();
  const hass = aHass({ growspaces: [growspace] });

  test('renders without crash', async () => {
    const handle = await renderCard<GrowspaceAnalyticsCard>('growspace-analytics-card', { hass, growspace });
    expect(handle.element).toBeInstanceOf(GrowspaceAnalyticsCard);
    handle.unmount();
  });

  test('throws error on invalid config', async () => {
    const handle = await renderCard<GrowspaceAnalyticsCard>('growspace-analytics-card', { hass, growspace });
    expect(() => handle.element.setConfig(undefined as any)).toThrowError('Invalid configuration');
    handle.unmount();
  });

  test('initializes default growspace from config', async () => {
    const handle = await renderCard<GrowspaceAnalyticsCard>('growspace-analytics-card', { hass, growspace });
    handle.element.setConfig({ type: 'custom:growspace-analytics-card', default_growspace: growspace.growspaceId });
    expect(handle.element._config?.default_growspace).toBe(growspace.growspaceId);
    expect((handle.element.store as any)._refreshCallback).toBeDefined();
    handle.unmount();
  });

  test('renders error state when hass is missing', async () => {
    const handle = await renderCard<GrowspaceAnalyticsCard>('growspace-analytics-card', { hass, growspace });
    handle.element.hass = undefined as any;
    await handle.element.updateComplete;

    const errorDiv = handle.element.shadowRoot?.querySelector('.error');
    expect(errorDiv).toBeTruthy();
    expect(errorDiv?.textContent).toContain('Home Assistant not available');
    handle.unmount();
  });

  test('provides fallback stub config', () => {
    const stub = GrowspaceAnalyticsCard.getStubConfig();
    expect(stub.type).toBe('custom:growspace-analytics-card');
    expect(stub).toHaveProperty('default_growspace');
  });

  test('returns standard card size', async () => {
    const handle = await renderCard<GrowspaceAnalyticsCard>('growspace-analytics-card', { hass, growspace });
    expect(handle.element.getCardSize()).toBe(4);
    handle.unmount();
  });

  test('renders loading state when store is loading', async () => {
    const handle = await renderCard<GrowspaceAnalyticsCard>('growspace-analytics-card', { hass, growspace });
    handle.element.store.ui.$isLoading.set(true);
    handle.element.store.ui.$isEditMode.set(false);
    handle.element.store.ui.$viewMode.set(ViewMode.STANDARD);
    handle.element.store.ui.$focusedPlantIndex.set(-1);
    await handle.element.updateComplete;

    const loader = handle.element.shadowRoot?.querySelector('.loading-spinner');
    expect(loader).toBeTruthy();
    handle.unmount();
  });

  test('renders no-data state when devices array is empty', async () => {
    const handle = await renderCard<GrowspaceAnalyticsCard>('growspace-analytics-card', { hass, growspace });
    handle.element.store.ui.$isLoading.set(false);
    setDevices([]);
    await handle.element.updateComplete;

    const noData = handle.element.shadowRoot?.querySelector('.no-data');
    expect(noData).toBeTruthy();
    expect(noData?.textContent).toContain('No growspace devices found.');
    handle.unmount();
  });

  test('renders analytics view when valid device selected', async () => {
    const handle = await renderCard<GrowspaceAnalyticsCard>('growspace-analytics-card', { hass, growspace });
    handle.element.store.ui.$isLoading.set(false);
    setDevices([
      { deviceId: growspace.growspaceId, name: growspace.name, plants: [] } as any,
    ]);
    handle.element.store.grid.$selectedDevice.set(growspace.growspaceId);
    await handle.element.updateComplete;

    const cardContainer = handle.element.shadowRoot?.querySelector('.unified-growspace-card');
    expect(cardContainer).toBeTruthy();
    handle.unmount();
  });

  describe('chip-driven chart', () => {
    test('clickChip calls toggleEnvGraph for the selected metric', async () => {
      const handle = await renderCard<GrowspaceAnalyticsCard>('growspace-analytics-card', { hass, growspace });
      handle.element.store.ui.$isLoading.set(false);
      setDevices([
        { deviceId: growspace.growspaceId, name: growspace.name, plants: [] } as any,
      ]);
      handle.element.store.grid.$selectedDevice.set(growspace.growspaceId);
      await handle.element.updateComplete;

      vi.mocked(uiSlice.toggleEnvGraph).mockClear();
      handle.clickChip('vpd');
      expect(uiSlice.toggleEnvGraph).toHaveBeenCalledWith('vpd', handle.element.store.history);
      handle.unmount();
    });
  });

  test('disconnectedCallback destroys store', async () => {
    const handle = await renderCard<GrowspaceAnalyticsCard>('growspace-analytics-card', { hass, growspace });
    const spy = vi.spyOn(handle.element.store, 'destroy');
    handle.element.disconnectedCallback();
    expect(spy).toHaveBeenCalled();
  });

  test('gets config element correctly', async () => {
    const editor = await GrowspaceAnalyticsCard.getConfigElement();
    expect(editor.tagName.toLowerCase()).toBe('growspace-analytics-card-editor');
  });

  test('getLayoutOptions returns grid sizing options', async () => {
    const handle = await renderCard<GrowspaceAnalyticsCard>('growspace-analytics-card', { hass, growspace });
    const opts = handle.element.getLayoutOptions();
    expect(opts).toEqual({
      grid_columns: 8,
      grid_min_columns: 4,
      grid_rows: 5,
      grid_min_rows: 4,
    });
    handle.unmount();
  });

  test('renders error state when devices exist but none matches selectedDevice', async () => {
    const handle = await renderCard<GrowspaceAnalyticsCard>('growspace-analytics-card', { hass, growspace });
    handle.element.store.ui.$isLoading.set(false);
    setDevices([
      { deviceId: 'other-device', name: 'Other', plants: [] } as any,
    ]);
    handle.element.store.grid.$selectedDevice.set('no-match-device-id');
    await handle.element.updateComplete;

    const errorDiv = handle.element.shadowRoot?.querySelector('.error');
    expect(errorDiv).toBeTruthy();
    expect(errorDiv?.textContent).toContain('No valid growspace selected');
    handle.unmount();
  });

  test('_handleError calls console.error and hass.callService', async () => {
    const handle = await renderCard<GrowspaceAnalyticsCard>('growspace-analytics-card', { hass, growspace });
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const testError = new Error('analytics error');
    (handle.element as any)._handleError(testError, { componentStack: 'test' });
    expect(consoleSpy).toHaveBeenCalledWith(
      'Growspace Analytics Card caught error:',
      testError,
      { componentStack: 'test' }
    );
    expect(hass.callService).toHaveBeenCalledWith(
      'system_log',
      'write',
      expect.objectContaining({ message: expect.stringContaining('analytics error') })
    );
    consoleSpy.mockRestore();
    handle.unmount();
  });

  test('firstUpdated does not reset graphs when they are already active', async () => {
    // Pre-populate graphs before the card mounts so the if-branch is skipped
    const handle = await renderCard<GrowspaceAnalyticsCard>('growspace-analytics-card', { hass, growspace });
    // After first render, graphs are already set by firstUpdated (truthy-branch covered elsewhere).
    // Now manually add an extra graph and call firstUpdated again to exercise the falsy branch.
    handle.element.store.history.toggleEnvGraph('co2');
    const sizeBefore = handle.element.store.history.$activeEnvGraphs.get().size;
    // Trigger firstUpdated-equivalent: call it directly — the store already has graphs so
    // the inner if is false and no reset happens.
    (handle.element as any).firstUpdated();
    const sizeAfter = handle.element.store.history.$activeEnvGraphs.get().size;
    expect(sizeAfter).toBe(sizeBefore);
    handle.unmount();
  });
});
