import { expect, test, describe, vi } from 'vitest';
import { GrowspaceLogbookCard } from '../../src/cards/growspace-logbook-card';
import { aHass, aGrowspace } from '../fixtures';
import { renderCard } from '../harness';

if (!customElements.get('growspace-logbook-card')) {
  customElements.define('growspace-logbook-card', GrowspaceLogbookCard);
}

vi.mock('../../src/features/shared/ui/growspace-logbook', () => ({
  GrowspaceLogbook: class extends HTMLElement {},
}));
vi.mock('../../src/features/shared/ui/growspace-timeline', () => ({
  GrowspaceTimeline: class extends HTMLElement {},
}));
vi.mock('../../src/cards/editors/growspace-logbook-card-editor', () => ({
  GrowspaceLogbookCardEditor: class extends HTMLElement {},
}));

describe('GrowspaceLogbookCard', () => {
  const growspace = aGrowspace();
  const hass = aHass({ growspaces: [growspace] });

  test('renders without crash', async () => {
    const handle = await renderCard<GrowspaceLogbookCard>('growspace-logbook-card', { hass, growspace });
    expect(handle.element).toBeInstanceOf(GrowspaceLogbookCard);
    handle.unmount();
  });

  test('throws error on invalid config', async () => {
    const handle = await renderCard<GrowspaceLogbookCard>('growspace-logbook-card', { hass, growspace });
    expect(() => handle.element.setConfig(undefined as any)).toThrowError('Invalid configuration');
    handle.unmount();
  });

  test('initializes default_view from config', async () => {
    const handle = await renderCard<GrowspaceLogbookCard>('growspace-logbook-card', { hass, growspace });
    handle.element.setConfig({ type: 'custom:growspace-logbook-card', default_view: 'timeline' });
    expect((handle.element as any)._activeTab).toBe('timeline');
    handle.unmount();
  });

  test('provides fallback stub config', () => {
    const stub = GrowspaceLogbookCard.getStubConfig();
    expect(stub.type).toBe('custom:growspace-logbook-card');
    expect(stub.default_view).toBe('list');
  });

  test('returns standard card size', async () => {
    const handle = await renderCard<GrowspaceLogbookCard>('growspace-logbook-card', { hass, growspace });
    expect(handle.element.getCardSize()).toBe(5);
    handle.unmount();
  });

  test('renders logbook card with tab bar when valid device selected', async () => {
    const handle = await renderCard<GrowspaceLogbookCard>('growspace-logbook-card', { hass, growspace });
    (handle.element as any)._viewController = {
      value: {
        grid: { devices: [{ deviceId: growspace.growspaceId }], selectedDevice: growspace.growspaceId },
        ui: { isLoading: false },
      },
    };
    await handle.element.requestUpdate();
    await handle.element.updateComplete;

    const tabBar = handle.element.shadowRoot?.querySelector('.tab-bar');
    expect(tabBar).toBeTruthy();
    handle.unmount();
  });

  describe('list ↔ timeline toggle', () => {
    test('toggleLogbookView switches from list to timeline', async () => {
      const handle = await renderCard<GrowspaceLogbookCard>('growspace-logbook-card', { hass, growspace });
      (handle.element as any)._viewController = {
        value: {
          grid: { devices: [{ deviceId: growspace.growspaceId }], selectedDevice: growspace.growspaceId },
          ui: { isLoading: false },
        },
      };
      await handle.element.requestUpdate();
      await handle.element.updateComplete;

      // Default is 'list'; toggling should switch to 'timeline'
      expect((handle.element as any)._activeTab).toBe('list');
      handle.toggleLogbookView();
      await handle.element.updateComplete;

      expect((handle.element as any)._activeTab).toBe('timeline');
      expect(handle.element.shadowRoot?.querySelector('growspace-timeline')).toBeTruthy();
      handle.unmount();
    });

    test('toggleLogbookView switches from timeline back to list', async () => {
      const handle = await renderCard<GrowspaceLogbookCard>('growspace-logbook-card', { hass, growspace });
      handle.element.setConfig({ type: 'custom:growspace-logbook-card', default_view: 'timeline' });
      (handle.element as any)._viewController = {
        value: {
          grid: { devices: [{ deviceId: growspace.growspaceId }], selectedDevice: growspace.growspaceId },
          ui: { isLoading: false },
        },
      };
      await handle.element.requestUpdate();
      await handle.element.updateComplete;

      handle.toggleLogbookView();
      await handle.element.updateComplete;

      expect((handle.element as any)._activeTab).toBe('list');
      expect(handle.element.shadowRoot?.querySelector('growspace-logbook')).toBeTruthy();
      handle.unmount();
    });
  });

  test('disconnectedCallback destroys store', async () => {
    const handle = await renderCard<GrowspaceLogbookCard>('growspace-logbook-card', { hass, growspace });
    const spy = vi.spyOn((handle.element as any)._store, 'destroy');
    handle.element.disconnectedCallback();
    expect(spy).toHaveBeenCalled();
  });

  test('gets config element correctly', async () => {
    const editor = await GrowspaceLogbookCard.getConfigElement();
    expect(editor.tagName.toLowerCase()).toBe('growspace-logbook-card-editor');
  });
});
