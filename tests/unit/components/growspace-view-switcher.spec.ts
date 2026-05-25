
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
vi.unmock('../../../src/features/shared/layouts/growspace-view-switcher');
import { fixture, html } from '@open-wc/testing-helpers';
import { GrowspaceViewSwitcher } from '../../../src/features/shared/layouts/growspace-view-switcher';
import { GrowspaceDevice } from '../../../src/types';
import { viewMode$, setViewMode } from '../../../src/slices/ui';
import { ViewMode } from '../../../src/constants';

// Mock the unified view component and its heavy children so we can test
// the switcher's adapter logic in isolation.
vi.mock('../../../src/features/shared/layouts/growspace-view', () => ({
  GrowspaceView: class extends HTMLElement {
    focusPlant = vi.fn();
  },
}));
vi.mock('../../../src/features/shared/ui/error-boundary', () => ({
  ErrorBoundary: class extends HTMLElement {},
}));

describe('GrowspaceViewSwitcher', () => {
  let element: GrowspaceViewSwitcher;
  let mockDevice: GrowspaceDevice;

  beforeEach(async () => {
    viewMode$.set(ViewMode.STANDARD);

    mockDevice = {
      deviceId: 'd1',
      plantsPerRow: 4,
    } as unknown as GrowspaceDevice;

    element = await fixture(html`
      <growspace-view-switcher .device=${mockDevice}></growspace-view-switcher>
    `);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(customElements.get('growspace-view-switcher')).toBeDefined();
    expect(element).toBeInstanceOf(GrowspaceViewSwitcher);
  });

  it('renders growspace-view when device is present', async () => {
    await element.updateComplete;
    const view = element.shadowRoot?.querySelector('growspace-view');
    expect(view).toBeTruthy();
  });

  it('renders nothing if device is undefined', async () => {
    element = await fixture(html`<growspace-view-switcher></growspace-view-switcher>`);
    await element.updateComplete;

    const anyTag = element.shadowRoot?.querySelector('*');
    expect(anyTag).toBeNull();
  });

  it('syncs viewMode to the global atom when viewMode property changes', async () => {
    element.viewMode = ViewMode.COMPACT;
    await element.updateComplete;

    expect(viewMode$.get()).toBe(ViewMode.COMPACT);
  });

  it('passes properties to growspace-view', async () => {
    element.viewMode = ViewMode.STANDARD;
    element.isLoading = true;
    element.rows = 5;
    element.selectedCount = 3;
    await element.updateComplete;

    const view = element.shadowRoot?.querySelector('growspace-view') as any;
    expect(view.isLoading).toBe(true);
    expect(view.rows).toBe(5);
    expect(view.selectedCount).toBe(3);
    expect(view.cols).toBe(4); // from device mock
  });

  it('delegates focusPlant to growspace-view', async () => {
    await element.updateComplete;
    const childMock = element.shadowRoot?.querySelector('growspace-view') as any;
    childMock.focusPlant = vi.fn();

    element.focusPlant(2);
    expect(childMock.focusPlant).toHaveBeenCalledWith(2);
  });

  it('triggers focusPlant when focusedPlantIndex changes', async () => {
    await element.updateComplete;
    const childMock = element.shadowRoot?.querySelector('growspace-view') as any;
    childMock.focusPlant = vi.fn();

    element.focusedPlantIndex = 3;
    await element.updateComplete;

    expect(childMock.focusPlant).toHaveBeenCalledWith(3);
  });

  it('handles focusPlant safely if growspace-view has no focusPlant method', async () => {
    await element.updateComplete;
    const childMock = element.shadowRoot?.querySelector('growspace-view') as any;
    delete childMock.focusPlant;

    expect(() => element.focusPlant(1)).not.toThrow();
  });

  it('propagates batch-add-plants event from growspace-view', async () => {
    await element.updateComplete;
    const view = element.shadowRoot?.querySelector('growspace-view');
    expect(view).toBeTruthy();

    const listener = vi.fn();
    element.addEventListener('batch-add-plants', listener);

    const eventDetail = { quantity: 5, strain: 'Test' };
    view?.dispatchEvent(
      new CustomEvent('batch-add-plants', {
        detail: eventDetail,
        bubbles: false,
        composed: false,
      })
    );

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][0].detail).toEqual(eventDetail);
  });
});
