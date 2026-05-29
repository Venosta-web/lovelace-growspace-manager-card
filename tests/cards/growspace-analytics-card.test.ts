import { expect, test, describe, vi } from 'vitest';
import { GrowspaceAnalyticsCard } from '../../src/cards/growspace-analytics-card';
import { ViewMode } from '../../src/features/environment/constants';
import { aHass, aGrowspace } from '../fixtures';
import { renderCard } from '../harness';

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
    const initSpy = vi.spyOn(handle.element.store, 'initializeSelectedDevice');
    handle.element.setConfig({ type: 'custom:growspace-analytics-card', default_growspace: growspace.growspaceId });
    expect(handle.element._config?.default_growspace).toBe(growspace.growspaceId);
    expect(initSpy).toHaveBeenCalled();
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
    handle.element.store.data.$devices.set([]);
    await handle.element.updateComplete;

    const noData = handle.element.shadowRoot?.querySelector('.no-data');
    expect(noData).toBeTruthy();
    expect(noData?.textContent).toContain('No growspace devices found.');
    handle.unmount();
  });

  test('renders analytics view when valid device selected', async () => {
    const handle = await renderCard<GrowspaceAnalyticsCard>('growspace-analytics-card', { hass, growspace });
    handle.element.store.ui.$isLoading.set(false);
    handle.element.store.data.$devices.set([
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
      handle.element.store.data.$devices.set([
        { deviceId: growspace.growspaceId, name: growspace.name, plants: [] } as any,
      ]);
      handle.element.store.grid.$selectedDevice.set(growspace.growspaceId);
      await handle.element.updateComplete;

      const spy = vi.spyOn(handle.element.store.actions.ui, 'toggleEnvGraph');
      handle.clickChip('vpd');
      expect(spy).toHaveBeenCalledWith('vpd');
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
});
