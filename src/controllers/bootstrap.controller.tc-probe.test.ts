import { expect, test, vi, beforeEach, afterEach } from 'vitest';

import { BootstrapController } from './bootstrap.controller';
import { hassCall } from '../services/hass-call';
import { resetTcPresence, tcPresence$ } from '../slices/tc';
import type { GridSliceRef } from '../slices/grid';
import type { GrowspaceManagerCardConfig } from '../lib/types/config';

vi.mock('../services/hass-call', () => ({
  hassCall: vi.fn(),
  callService: vi.fn(),
  callFetch: vi.fn(),
  setHass: vi.fn(),
}));

// Hydration is not what this file is about, and letting it run would drag the
// whole collection fetch in behind it.
vi.mock('../slices/growspace', () => ({ fetchRawCollection: vi.fn().mockResolvedValue({}) }));
vi.mock('../services/hydrate', () => ({ hydrate: vi.fn(() => new Set<string>()) }));

const hassCallMock = vi.mocked(hassCall);

const host = () => ({
  addController: vi.fn(),
  removeController: vi.fn(),
  requestUpdate: vi.fn(),
  updateComplete: Promise.resolve(true),
});

beforeEach(() => {
  resetTcPresence();
  vi.clearAllMocks();
});

afterEach(() => {
  resetTcPresence();
});

/**
 * One probe per page (ADR 0057), started where the transport first becomes
 * usable. The manager card has no other moment to ask from, and it must not
 * wait for the Growspace collection to hydrate first — a dashboard whose
 * collection fetch is slow would otherwise have no menu item until it finished.
 */
test('the manager card probes for TC as soon as it has a transport', async () => {
  hassCallMock.mockResolvedValue({
    contract_version: 1,
    integration_version: '0.1.0',
    features: ['culture_lines'],
    collections: {},
  });
  const controller = new BootstrapController(
    host(),
    { setDevices: vi.fn(), $selectedDevice: { get: () => null } } as unknown as GridSliceRef,
    {} as GrowspaceManagerCardConfig
  );

  await controller.updateHass({ states: {} } as never);
  await vi.waitFor(() => expect(tcPresence$.get().status).toBe('present'));

  expect(hassCallMock.mock.calls.map(([command]) => command)).toContain(
    'growspace_manager_tc/get_manifest'
  );
});

test('a second hass does not re-probe', async () => {
  hassCallMock.mockRejectedValue(new Error('Unknown command growspace_manager_tc/get_manifest'));
  const controller = new BootstrapController(
    host(),
    { setDevices: vi.fn(), $selectedDevice: { get: () => null } } as unknown as GridSliceRef,
    {} as GrowspaceManagerCardConfig
  );

  await controller.updateHass({ states: {} } as never);
  await vi.waitFor(() => expect(tcPresence$.get().status).toBe('absent'));
  const probes = hassCallMock.mock.calls.filter(
    ([command]) => command === 'growspace_manager_tc/get_manifest'
  ).length;

  await controller.updateHass({ states: {} } as never);
  await controller.updateHass({ states: {} } as never);

  // Cached in both directions, a transient failure included: the browser reload
  // is the only recheck, and that is the whole of the policy.
  expect(
    hassCallMock.mock.calls.filter(([command]) => command === 'growspace_manager_tc/get_manifest')
  ).toHaveLength(probes);
});
