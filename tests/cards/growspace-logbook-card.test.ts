import { fixture } from '@open-wc/testing-helpers';
import { expect, test, describe, beforeEach, vi, afterEach } from 'vitest';
import { html } from 'lit';
import { GrowspaceLogbookCard } from '../../src/cards/growspace-logbook-card';
import type { GrowspaceManagerCardConfig } from '../../src/lib/types/config';

// Ensure the custom element is defined
if (!customElements.get('growspace-logbook-card')) {
  customElements.define('growspace-logbook-card', GrowspaceLogbookCard);
}

// Mock sub-components
vi.mock('../../src/components/ui/growspace-logbook', () => ({
  GrowspaceLogbook: class extends HTMLElement { }
}));
vi.mock('../../src/components/ui/growspace-timeline', () => ({
  GrowspaceTimeline: class extends HTMLElement { }
}));
vi.mock('../../src/cards/editors/growspace-logbook-card-editor', () => ({
  GrowspaceLogbookCardEditor: class extends HTMLElement { }
}));

describe('GrowspaceLogbookCard', () => {
  let element: GrowspaceLogbookCard;

  beforeEach(async () => {
    const mockHass = {
      states: {},
      callService: vi.fn(),
      language: 'en',
      connection: {
        sendMessagePromise: vi.fn(),
        subscribeEvents: vi.fn(),
      }
    } as any;
    element = await fixture<GrowspaceLogbookCard>(html`<growspace-logbook-card .hass=${mockHass}></growspace-logbook-card>`);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('is defined', () => {
    expect(element).toBeInstanceOf(GrowspaceLogbookCard);
  });

  test('initializes default growspace from config', () => {
    const config: GrowspaceManagerCardConfig = {
      type: 'custom:growspace-logbook-card',
      default_growspace: 'test_tent',
      default_view: 'timeline'
    };

    const initSpy = vi.spyOn((element as any)._store, 'initializeSelectedDevice');
    element.setConfig(config);

    expect((element as any)._config?.default_growspace).toBe('test_tent');
    expect((element as any)._activeTab).toBe('timeline');
    expect(initSpy).toHaveBeenCalledWith(config);
  });

  test('throws error on invalid config', () => {
    expect(() => element.setConfig(undefined as any)).toThrowError('Invalid configuration');
  });

  test('renders nothing when hass is missing', async () => {
    const el = await fixture<GrowspaceLogbookCard>(html`<growspace-logbook-card></growspace-logbook-card>`);
    el.hass = undefined as any;
    await el.updateComplete;

    expect(el.shadowRoot?.innerHTML).toContain('<!---->');
  });

  test('provides fallback stub config', () => {
    const stub = GrowspaceLogbookCard.getStubConfig();
    expect(stub.type).toBe('custom:growspace-logbook-card');
    expect(stub.default_view).toBe('list');
  });

  test('returns standard card size', () => {
    expect(element.getCardSize()).toBe(5);
  });

  test('calls store updateHass on updated', async () => {
    const spy = vi.spyOn((element as any)._store, 'updateHass');
    element.hass = { ...element.hass, language: 'de' } as any;
    await element.updateComplete;
    expect(spy).toHaveBeenCalled();
  });

  test('disconnectedCallback destroys store', async () => {
    const spy = vi.spyOn((element as any)._store, 'destroy');
    element.disconnectedCallback();
    expect(spy).toHaveBeenCalled();
  });

  test('renders loading state when store is loading', async () => {
    (element as any)._viewController = { value: { grid: { devices: [] }, ui: { isLoading: true } } };
    (element as any)._config = { type: 'custom:growspace-logbook-card' };
    await element.requestUpdate();
    await element.updateComplete;
    
    const loader = element.shadowRoot?.querySelector('.loading');
    expect(loader).toBeTruthy();
  });

  test('renders error state when selected device is not found', async () => {
    (element as any)._viewController = { 
      value: { 
        grid: { devices: [{ deviceId: 'wrong_device' }], selectedDevice: 'selected_tent' }, 
        ui: { isLoading: false } 
      } 
    };
    (element as any)._config = { type: 'custom:growspace-logbook-card' };
    await element.requestUpdate();
    await element.updateComplete;

    const errorDiv = element.shadowRoot?.querySelector('.error');
    expect(errorDiv).toBeTruthy();
    expect(errorDiv?.textContent).toContain('Please select a growspace in the card configuration.');
  });

  test('renders logbook card with tab bar when valid device selected', async () => {
    (element as any)._viewController = { 
      value: { 
        grid: { devices: [{ deviceId: 'selected_tent' }], selectedDevice: 'selected_tent' }, 
        ui: { isLoading: false } 
      } 
    };
    (element as any)._config = { type: 'custom:growspace-logbook-card' };
    await element.requestUpdate();
    await element.updateComplete;
    
    const tabBar = element.shadowRoot?.querySelector('.tab-bar');
    expect(tabBar).toBeTruthy();
    
    const listTab = element.shadowRoot?.querySelector('.tab.active');
    expect(listTab?.textContent).toMatch(/List View/);
    
    const logbook = element.shadowRoot?.querySelector('growspace-logbook');
    expect(logbook).toBeTruthy();
  });

  test('respects default_view: timeline config', async () => {
    (element as any)._viewController = { 
      value: { 
        grid: { devices: [{ deviceId: 'selected_tent' }], selectedDevice: 'selected_tent' }, 
        ui: { isLoading: false } 
      } 
    };
    element.setConfig({ type: 'custom:growspace-logbook-card', default_view: 'timeline' });
    await element.requestUpdate();
    await element.updateComplete;
    
    const timelineTab = element.shadowRoot?.querySelector('.tab.active');
    expect(timelineTab?.textContent).toMatch(/Timeline/);
    
    const timeline = element.shadowRoot?.querySelector('growspace-timeline');
    expect(timeline).toBeTruthy();
  });

  test('tab click switches active view', async () => {
    (element as any)._viewController = { 
      value: { 
        grid: { devices: [{ deviceId: 'selected_tent' }], selectedDevice: 'selected_tent' }, 
        ui: { isLoading: false } 
      } 
    };
    (element as any)._config = { type: 'custom:growspace-logbook-card' };
    await element.requestUpdate();
    await element.updateComplete;
    
    const tabs = element.shadowRoot?.querySelectorAll('.tab');
    (tabs[1] as HTMLElement).click();
    await element.updateComplete;
    
    expect((element as any)._activeTab).toBe('timeline');
    expect(element.shadowRoot?.querySelector('growspace-timeline')).toBeTruthy();
  });

  test('gets config element correctly', async () => {
    const editor = await GrowspaceLogbookCard.getConfigElement();
    expect(editor.tagName.toLowerCase()).toBe('growspace-logbook-card-editor');
  });
});
