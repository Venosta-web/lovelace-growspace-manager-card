import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReactiveControllerHost } from 'lit';
import { HomeAssistant } from 'custom-card-helpers';
import { BootstrapController } from '../../../src/controllers/bootstrap.controller';
import { setDevices } from '../../../src/slices/grid';
import { isLoading$, setIsLoading } from '../../../src/slices/ui';
import type { GridSliceRef } from '../../../src/slices/grid';
import type { GrowspaceManagerCardConfig } from '../../../src/lib/types/config';

vi.mock('../../../src/slices/growspace', () => ({
  fetchRawCollection: vi.fn().mockResolvedValue({
    'gs-1': { identity: { growspace_id: 'gs-1', name: 'Tent A', type: 'flower' } },
  }),
}));

vi.mock('../../../src/services/hydrate', () => ({
  hydrate: vi.fn(() => new Set(['sensor.plant_1'])),
}));

import { fetchRawCollection } from '../../../src/slices/growspace';
import { hydrate } from '../../../src/services/hydrate';

function makeHost(): ReactiveControllerHost {
  return {
    addController: vi.fn(),
    requestUpdate: vi.fn(),
    updateComplete: Promise.resolve(true),
  } as unknown as ReactiveControllerHost;
}

function makeGrid(selectedDevice: string | null = null): GridSliceRef {
  return {
    $selectedDevice: { get: () => selectedDevice },
    setSelectedDevice: vi.fn(),
  } as unknown as GridSliceRef;
}

function makeHass(states: Record<string, unknown> = {}): HomeAssistant {
  return { states } as unknown as HomeAssistant;
}

beforeEach(() => {
  setDevices([]);
  setIsLoading(true);
  vi.clearAllMocks();
});

describe('BootstrapController', () => {
  describe('updateHass() — first call (no collection cached)', () => {
    it('fetches the raw collection and hydrates', async () => {
      const host = makeHost();
      const grid = makeGrid();
      const ctrl = new BootstrapController(host, grid, {} as GrowspaceManagerCardConfig);

      await ctrl.updateHass(makeHass());

      expect(fetchRawCollection).toHaveBeenCalledOnce();
      expect(hydrate).toHaveBeenCalledOnce();
    });

    it('drives the isLoading$ store atom: true during fetch, false after', async () => {
      const host = makeHost();
      const grid = makeGrid();
      const ctrl = new BootstrapController(host, grid, {} as GrowspaceManagerCardConfig);

      let loadingDuringFetch = false;
      vi.mocked(fetchRawCollection).mockImplementationOnce(async () => {
        loadingDuringFetch = isLoading$.get();
        return { 'gs-1': { identity: { growspace_id: 'gs-1', name: 'Tent A', type: 'flower' } } };
      });

      await ctrl.updateHass(makeHass());

      expect(loadingDuringFetch).toBe(true);
      // The cards gate their spinner on this atom; it must clear once hydrated.
      expect(isLoading$.get()).toBe(false);
    });

    it('auto-selects the first device when no device is selected', async () => {
      const host = makeHost();
      const grid = makeGrid(null);
      const ctrl = new BootstrapController(host, grid, {} as GrowspaceManagerCardConfig);

      vi.mocked(hydrate).mockImplementationOnce(() => {
        setDevices([{ deviceId: 'gs-1', name: 'Tent A' } as never]);
        return new Set();
      });

      await ctrl.updateHass(makeHass());

      expect(grid.setSelectedDevice).toHaveBeenCalledWith('gs-1');
    });

    it('auto-selects the default_growspace device when configured', async () => {
      const host = makeHost();
      const grid = makeGrid(null);
      const ctrl = new BootstrapController(host, grid, {
        default_growspace: 'Tent B',
      } as GrowspaceManagerCardConfig);

      vi.mocked(hydrate).mockImplementationOnce(() => {
        setDevices([
          { deviceId: 'gs-1', name: 'Tent A' } as never,
          { deviceId: 'gs-2', name: 'Tent B' } as never,
        ]);
        return new Set();
      });

      await ctrl.updateHass(makeHass());

      expect(grid.setSelectedDevice).toHaveBeenCalledWith('gs-2');
    });
  });

  describe('updateHass() — subsequent calls', () => {
    it('re-hydrates from cached collection when a watched entity changes', async () => {
      const host = makeHost();
      const grid = makeGrid('gs-1');
      const ctrl = new BootstrapController(host, grid, {} as GrowspaceManagerCardConfig);

      vi.mocked(hydrate).mockReturnValue(new Set(['sensor.plant_1']));

      await ctrl.updateHass(makeHass({ 'sensor.plant_1': { state: 'on' } as never }));
      vi.clearAllMocks();

      await ctrl.updateHass(makeHass({ 'sensor.plant_1': { state: 'off' } as never }));

      expect(fetchRawCollection).not.toHaveBeenCalled();
      expect(hydrate).toHaveBeenCalledOnce();
    });

    it('skips re-hydration when no watched entities changed', async () => {
      const host = makeHost();
      const grid = makeGrid('gs-1');
      const ctrl = new BootstrapController(host, grid, {} as GrowspaceManagerCardConfig);

      const hassState = { state: 'on' } as never;
      vi.mocked(hydrate).mockReturnValue(new Set(['sensor.plant_1']));

      const hass1 = makeHass({ 'sensor.plant_1': hassState });
      await ctrl.updateHass(hass1);
      vi.clearAllMocks();

      const hass2 = makeHass({ 'sensor.plant_1': hassState });
      await ctrl.updateHass(hass2);

      expect(hydrate).not.toHaveBeenCalled();
    });
  });
});
