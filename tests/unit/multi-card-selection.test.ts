import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BootstrapController } from '../../src/controllers/bootstrap.controller';
import { makePerCardGridSlice, devices$, setDevices } from '../../src/slices/grid';
import type { GrowspaceManagerCardConfig } from '../../src/types';

vi.mock('../../src/slices/growspace', () => ({
  fetchRawCollection: vi.fn(),
}));

vi.mock('../../src/services/hydrate', () => ({
  hydrate: vi.fn(() => new Set<string>()),
}));

import { fetchRawCollection } from '../../src/slices/growspace';
import { hydrate } from '../../src/services/hydrate';

const DEVICE = {
  deviceId: 'gs1',
  name: 'Tent One',
  rows: 2,
  plantsPerRow: 2,
  plants: [],
} as any;

function aConfig(): GrowspaceManagerCardConfig {
  return { type: 'custom:growspace-tank-card', default_growspace: 'gs1' } as GrowspaceManagerCardConfig;
}

function makeHost() {
  return { addController: vi.fn(), requestUpdate: vi.fn() } as any;
}

/**
 * Regression: each card's BootstrapController has its own _defaultApplied flag.
 * Previously defaultApplied$ was a shared module-global atom, so card A applying
 * its default blocked card B from applying its own default.
 */
describe('multi-card default selection', () => {
  beforeEach(() => {
    setDevices([]);
    vi.clearAllMocks();
    vi.mocked(fetchRawCollection).mockResolvedValue({ gs1: {} as any });
    vi.mocked(hydrate).mockImplementation(() => {
      setDevices([DEVICE]);
      return new Set<string>();
    });
  });

  it('a second card still auto-selects its default when another card applied first', async () => {
    const hostA = makeHost();
    const hostB = makeHost();
    const gridA = makePerCardGridSlice();
    const gridB = makePerCardGridSlice();

    const controllerA = new BootstrapController(hostA, gridA, aConfig());
    const controllerB = new BootstrapController(hostB, gridB, aConfig());

    // Card A hydrates first — sets devices and auto-selects its default
    await controllerA.refresh();

    expect(gridA.$selectedDevice.get()).toBe('gs1');
    // Devices are set in the shared atom
    expect(devices$.get().map((d) => d.deviceId)).toContain('gs1');

    // Card B hydrates second — its own _defaultApplied is still false,
    // so it should also auto-select its default despite card A having already done so
    await controllerB.refresh();

    expect(gridB.$selectedDevice.get()).toBe('gs1');
  });
});
