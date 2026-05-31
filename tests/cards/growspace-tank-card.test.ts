import { expect, test, describe, beforeEach, afterEach, vi } from 'vitest';
import { GrowspaceTankCard } from '../../src/cards/growspace-tank-card';
import type { IrrigationTank } from '../../src/services/types';
import { aHass, aGrowspace } from '../fixtures';
import { setDevices } from '../../src/slices/grid';
import { renderCard } from '../harness';

if (!customElements.get('growspace-tank-card')) {
  customElements.define('growspace-tank-card', GrowspaceTankCard);
}

vi.mock('../../src/features/shared/ui/error-boundary', () => ({
  ErrorBoundary: class extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' }).innerHTML = '<slot></slot>';
    }
  },
}));
vi.mock('../../src/cards/editors/growspace-tank-card-editor', () => ({
  GrowspaceTankCardEditor: class extends HTMLElement {},
}));

describe('GrowspaceTankCard', () => {
  const growspace = aGrowspace();
  const hass = aHass({ growspaces: [growspace] });

  afterEach(() => {
    setDevices([]);
  });

  test('renders without crash', async () => {
    const handle = await renderCard<GrowspaceTankCard>('growspace-tank-card', { hass, growspace });
    expect(handle.element).toBeInstanceOf(GrowspaceTankCard);
    handle.unmount();
  });

  test('throws error on invalid config', async () => {
    const handle = await renderCard<GrowspaceTankCard>('growspace-tank-card', { hass, growspace });
    expect(() => handle.element.setConfig(undefined as any)).toThrowError('Invalid configuration');
    handle.unmount();
  });

  test('renders error state when hass is missing', async () => {
    const handle = await renderCard<GrowspaceTankCard>('growspace-tank-card', { hass, growspace });
    handle.element.hass = undefined as any;
    await handle.element.updateComplete;

    const errorDiv = handle.element.shadowRoot?.querySelector('.error');
    expect(errorDiv).toBeTruthy();
    expect(errorDiv?.textContent).toContain('Home Assistant not available');
    handle.unmount();
  });

  test('renders loading state when store is loading and no devices', async () => {
    const handle = await renderCard<GrowspaceTankCard>('growspace-tank-card', { hass, growspace });
    handle.element.store.ui.$isLoading.set(true);
    setDevices([]);
    await handle.element.updateComplete;

    const loader = handle.element.shadowRoot?.querySelector('ha-circular-progress');
    expect(loader).toBeTruthy();
    handle.unmount();
  });

  test('renders no-data state when devices array is empty', async () => {
    const handle = await renderCard<GrowspaceTankCard>('growspace-tank-card', { hass, growspace });
    handle.element.store.ui.$isLoading.set(false);
    setDevices([]);
    await handle.element.updateComplete;

    const noData = handle.element.shadowRoot?.querySelector('.no-data');
    expect(noData).toBeTruthy();
    expect(noData?.textContent).toContain('No growspace devices found.');
    handle.unmount();
  });

  test('renders empty state when no tanks configured', async () => {
    const handle = await renderCard<GrowspaceTankCard>('growspace-tank-card', { hass, growspace });
    handle.element.store.ui.$isLoading.set(false);
    setDevices([
      { deviceId: growspace.growspaceId, name: growspace.name, environmentAttributes: { irrigationTanks: [] }, plants: [] } as any,
    ]);
    handle.element.store.grid.$selectedDevice.set(growspace.growspaceId);
    await handle.element.updateComplete;

    const emptyState = handle.element.shadowRoot?.querySelector('.empty-state');
    expect(emptyState).toBeTruthy();
    expect(emptyState?.textContent).toContain('No irrigation tanks configured');
    handle.unmount();
  });

  describe('depletion countdown', () => {
    let handle: Awaited<ReturnType<typeof renderCard<GrowspaceTankCard>>>;
    const tanks: IrrigationTank[] = [
      {
        name: 'Main Tank',
        fillLevel: 80,
        isWarning: false,
        hoursRemaining: 48,
        volumeLiters: 100,
        depletionStatus: 'depleting',
        warningLevel: 20,
        sensorEntity: 'sensor.main_tank',
      },
      {
        name: 'Low Tank',
        fillLevel: 15,
        isWarning: true,
        hoursRemaining: 4,
        volumeLiters: 50,
        depletionStatus: 'depleting',
        warningLevel: 20,
        sensorEntity: 'sensor.low_tank',
      },
    ];

    beforeEach(async () => {
      handle = await renderCard<GrowspaceTankCard>('growspace-tank-card', { hass, growspace });
      handle.element.store.ui.$isLoading.set(false);
      setDevices([
        { deviceId: growspace.growspaceId, name: growspace.name, environmentAttributes: { irrigationTanks: tanks }, plants: [] } as any,
      ]);
      handle.element.store.grid.$selectedDevice.set(growspace.growspaceId);
      await handle.element.updateComplete;
    });

    test('shows depletion countdown for main tank as days', () => {
      const tankCards = handle.element.shadowRoot?.querySelectorAll('.tank-card');
      expect(tankCards?.length).toBe(2);
      expect(tankCards?.[0].querySelector('.tank-meta')?.textContent).toContain('2d left');
    });

    test('shows depletion countdown for low tank as hours', () => {
      const tankCards = handle.element.shadowRoot?.querySelectorAll('.tank-card');
      expect(tankCards?.[1].querySelector('.tank-meta')?.textContent).toContain('4h left');
    });

    test('warning badge shows count of low tanks', () => {
      const warningBadge = handle.element.shadowRoot?.querySelector('.warning-badge');
      expect(warningBadge?.textContent).toContain('1 low');
    });

    test('cleanup', () => {
      handle.unmount();
    });
  });

  test('getCardSize returns expected size', async () => {
    const handle = await renderCard<GrowspaceTankCard>('growspace-tank-card', { hass, growspace });
    expect(handle.element.getCardSize()).toBe(3);
    handle.unmount();
  });

  test('getStubConfig returns expected config', () => {
    expect(GrowspaceTankCard.getStubConfig()).toEqual({
      type: 'custom:growspace-tank-card',
      default_growspace: '',
    });
  });

  test('disconnectedCallback destroys store', async () => {
    const handle = await renderCard<GrowspaceTankCard>('growspace-tank-card', { hass, growspace });
    const spy = vi.spyOn(handle.element.store, 'destroy');
    handle.element.disconnectedCallback();
    expect(spy).toHaveBeenCalled();
  });
});
