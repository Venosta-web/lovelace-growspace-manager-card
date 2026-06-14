import { describe, it, expect, beforeEach } from 'vitest';
import { GrowspaceStore } from '../../src/store/core/growspace-store';
import { GrowspaceSharedStore } from '../../src/store/core/growspace-shared-store';
import { devices$, setDevices } from '../../src/slices/grid';
import { defaultApplied$ } from '../../src/slices/ui';
import type { GrowspaceManagerCardConfig } from '../../src/types';

/**
 * Regression for the dashboard bug where the tank/logbook cards render
 * "Please select a growspace in the card configuration." even though a
 * growspace is configured.
 *
 * Root cause: `selectedDevice` is a per-card atom (makePerCardGridSlice) but
 * `defaultApplied` was a module-global atom. Once the first card auto-applies
 * its default and flips the shared `defaultApplied` to true, a second card whose
 * own `selectedDevice` is still null bails out of auto-select and never picks a
 * device — so `devices.find(d => d.deviceId === null)` is undefined and the card
 * shows the error.
 */

const WS_DATA: Record<string, any> = {
  gs1: {
    identity: { growspace_id: 'gs1', name: 'Tent One', overview_entity_id: 'sensor.gs1' },
  },
};

function aConfig(): GrowspaceManagerCardConfig {
  return { type: 'custom:growspace-tank-card', default_growspace: 'gs1' } as GrowspaceManagerCardConfig;
}

describe('multi-card default selection', () => {
  beforeEach(() => {
    setDevices([]);
    defaultApplied$.set(false);
  });

  it('a second card still auto-selects its default when another card applied first', () => {
    const shared = new GrowspaceSharedStore();
    const cardA = new GrowspaceStore(shared);
    const cardB = new GrowspaceStore(shared);

    // Both cards receive their config while no growspace data has loaded yet
    // (hass not set → empty cache → no selection, defaultApplied reset to false).
    cardA.initializeSelectedDevice(aConfig());
    cardB.initializeSelectedDevice(aConfig());

    expect(cardA.grid.$selectedDevice.get()).toBeNull();
    expect(cardB.grid.$selectedDevice.get()).toBeNull();

    // Data arrives. Card A's sync cycle runs first and applies its default.
    (cardA.syncService as any)._cache = WS_DATA;
    cardA.syncService.updateDevicesState();

    // Card B's sync cycle runs second (e.g. a later hass update). No setConfig
    // happens in between, so the shared defaultApplied flag is still true.
    (cardB.syncService as any)._cache = WS_DATA;
    cardB.syncService.updateDevicesState();

    expect(devices$.get().map((d) => d.deviceId)).toContain('gs1');
    expect(cardA.grid.$selectedDevice.get()).toBe('gs1');
    expect(cardB.grid.$selectedDevice.get()).toBe('gs1');
  });
});
