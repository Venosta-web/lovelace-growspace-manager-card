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
vi.mock('../../src/slices/growspace', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../src/slices/growspace')>()),
  fetchRawCollection: vi.fn(() => new Promise(() => {})),
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
      {
        deviceId: growspace.growspaceId,
        name: growspace.name,
        environmentAttributes: { irrigationTanks: [] },
        plants: [],
      } as any,
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
        {
          deviceId: growspace.growspaceId,
          name: growspace.name,
          environmentAttributes: { irrigationTanks: tanks },
          plants: [],
        } as any,
      ]);
      handle.element.store.grid.$selectedDevice.set(growspace.growspaceId);
      await handle.element.updateComplete;
    });

    test('uses sequential heading levels for the card and its tanks', () => {
      expect(handle.element.shadowRoot?.querySelector('.card-title')?.tagName).toBe('H2');
      expect(handle.element.shadowRoot?.querySelector('.tank-header > h3')?.textContent).toBe(
        'Main Tank'
      );
      expect(handle.element.shadowRoot?.querySelector('.tank-header > h4')).toBeNull();
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

  test('getConfigElement returns growspace-tank-card-editor element', async () => {
    const editor = await GrowspaceTankCard.getConfigElement();
    expect(editor.tagName.toLowerCase()).toBe('growspace-tank-card-editor');
  });

  test('getLayoutOptions returns grid sizing options', async () => {
    const handle = await renderCard<GrowspaceTankCard>('growspace-tank-card', { hass, growspace });
    const opts = handle.element.getLayoutOptions();
    expect(opts).toEqual({
      grid_columns: 4,
      grid_min_columns: 2,
      grid_rows: 6,
      grid_min_rows: 5,
    });
    handle.unmount();
  });

  test('renders error state when devices exist but none matches selectedDevice', async () => {
    const handle = await renderCard<GrowspaceTankCard>('growspace-tank-card', { hass, growspace });
    handle.element.store.ui.$isLoading.set(false);
    setDevices([
      {
        deviceId: 'other-device',
        name: 'Other',
        environmentAttributes: { irrigationTanks: [] },
        plants: [],
      } as any,
    ]);
    handle.element.store.grid.$selectedDevice.set('no-match-device-id');
    await handle.element.updateComplete;

    const errorDiv = handle.element.shadowRoot?.querySelector('.error');
    expect(errorDiv).toBeTruthy();
    expect(errorDiv?.textContent).toContain('No valid growspace selected');
    handle.unmount();
  });

  test('_handleError logs to console.error', async () => {
    const handle = await renderCard<GrowspaceTankCard>('growspace-tank-card', { hass, growspace });
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const testError = new Error('test error');
    (handle.element as any)._handleError(testError, { componentStack: 'test' });
    expect(consoleSpy).toHaveBeenCalledWith('Growspace Tank Card caught error:', testError, {
      componentStack: 'test',
    });
    consoleSpy.mockRestore();
    handle.unmount();
  });

  describe('_renderTank branch coverage', () => {
    const makeDevice = (tanks: IrrigationTank[]) => ({
      deviceId: 'test_tent',
      name: 'Test Tent',
      environmentAttributes: { irrigationTanks: tanks },
      plants: [],
    });

    async function renderWithTanks(tanks: IrrigationTank[]) {
      const handle = await renderCard<GrowspaceTankCard>('growspace-tank-card', {
        hass,
        growspace,
      });
      handle.element.store.ui.$isLoading.set(false);
      setDevices([makeDevice(tanks) as any]);
      handle.element.store.grid.$selectedDevice.set(growspace.growspaceId);
      await handle.element.updateComplete;
      return handle;
    }

    test('depletionStatus refilling shows ↑ Refilling label with refilling class', async () => {
      const handle = await renderWithTanks([
        {
          name: 'Refill Tank',
          fillLevel: 50,
          isWarning: false,
          hoursRemaining: 10,
          volumeLiters: 80,
          depletionStatus: 'refilling',
          warningLevel: 20,
          sensorEntity: 'sensor.refill_tank',
        },
      ]);
      const footer = handle.element.shadowRoot?.querySelector('.tank-footer');
      expect(footer?.textContent).toContain('↑ Refilling');
      const depletionLabel = handle.element.shadowRoot?.querySelector('.depletion-label.refilling');
      expect(depletionLabel).toBeTruthy();
      handle.unmount();
    });

    test('depletionStatus static shows — Stable label', async () => {
      const handle = await renderWithTanks([
        {
          name: 'Static Tank',
          fillLevel: 60,
          isWarning: false,
          hoursRemaining: 20,
          volumeLiters: 100,
          depletionStatus: 'static',
          warningLevel: 20,
          sensorEntity: 'sensor.static_tank',
        },
      ]);
      const footer = handle.element.shadowRoot?.querySelector('.tank-footer');
      expect(footer?.textContent).toContain('— Stable');
      handle.unmount();
    });

    test('depletionStatus unknown renders no depletion label', async () => {
      const handle = await renderWithTanks([
        {
          name: 'Unknown Tank',
          fillLevel: 55,
          isWarning: false,
          hoursRemaining: 12,
          volumeLiters: 100,
          depletionStatus: undefined as any,
          warningLevel: 20,
          sensorEntity: 'sensor.unknown_tank',
        },
      ]);
      const depletionLabel = handle.element.shadowRoot?.querySelector('.depletion-label');
      expect(depletionLabel).toBeNull();
      handle.unmount();
    });

    test('hoursRemaining null renders no time-left text in tank-meta', async () => {
      const handle = await renderWithTanks([
        {
          name: 'No Time Tank',
          fillLevel: 70,
          isWarning: false,
          hoursRemaining: null as any,
          volumeLiters: 100,
          depletionStatus: 'depleting',
          warningLevel: 20,
          sensorEntity: 'sensor.no_time_tank',
        },
      ]);
      const tankMeta = handle.element.shadowRoot?.querySelector('.tank-meta');
      const spans = Array.from(tankMeta?.querySelectorAll('span') ?? []);
      expect(spans.some((s) => s.textContent?.includes('left'))).toBe(false);
      handle.unmount();
    });

    test('fillLevel null shows N/A text in percentage-text', async () => {
      const handle = await renderWithTanks([
        {
          name: 'Empty Data Tank',
          fillLevel: null as any,
          isWarning: false,
          hoursRemaining: 5,
          volumeLiters: 100,
          depletionStatus: 'depleting',
          warningLevel: 20,
          sensorEntity: 'sensor.empty_data_tank',
        },
      ]);
      const percentageText = handle.element.shadowRoot?.querySelector('.percentage-text');
      expect(percentageText?.textContent).toContain('N/A');
      handle.unmount();
    });

    test('volumeLiters null renders no volume span in tank-meta', async () => {
      const handle = await renderWithTanks([
        {
          name: 'No Volume Tank',
          fillLevel: 50,
          isWarning: false,
          hoursRemaining: null as any,
          volumeLiters: null as any,
          depletionStatus: 'depleting',
          warningLevel: 20,
          sensorEntity: 'sensor.no_volume_tank',
        },
      ]);
      const tankMeta = handle.element.shadowRoot?.querySelector('.tank-meta');
      expect(tankMeta?.textContent).not.toContain(' L');
      handle.unmount();
    });

    test('avg-badge shown when no warning tanks but fillLevel data present', async () => {
      const handle = await renderWithTanks([
        {
          name: 'Good Tank',
          fillLevel: 80,
          isWarning: false,
          hoursRemaining: 24,
          volumeLiters: 100,
          depletionStatus: 'depleting',
          warningLevel: 20,
          sensorEntity: 'sensor.good_tank',
        },
      ]);
      const avgBadge = handle.element.shadowRoot?.querySelector('.avg-badge');
      expect(avgBadge).toBeTruthy();
      expect(avgBadge?.textContent).toContain('Avg');
      handle.unmount();
    });

    test('header renders nothing when avgLevel is null (all tanks have null fillLevel)', async () => {
      const handle = await renderWithTanks([
        {
          name: 'Null Fill Tank',
          fillLevel: null as any,
          isWarning: false,
          hoursRemaining: 10,
          volumeLiters: 100,
          depletionStatus: 'depleting',
          warningLevel: 20,
          sensorEntity: 'sensor.null_fill_tank',
        },
      ]);
      const avgBadge = handle.element.shadowRoot?.querySelector('.avg-badge');
      const warningBadge = handle.element.shadowRoot?.querySelector('.warning-badge');
      expect(avgBadge).toBeNull();
      expect(warningBadge).toBeNull();
      handle.unmount();
    });
  });
});
