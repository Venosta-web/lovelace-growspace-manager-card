import { describe, it, expect } from 'vitest';
import { atom } from 'nanostores';
import { createDialogCapabilities } from './dialog-capabilities';
import { createGrowspaceDevice } from '../../../services/types';
import type { GrowspaceDevice, IrrigationConfig } from '../../../services/types';

function caps(device: GrowspaceDevice | undefined) {
  const $device = atom<GrowspaceDevice | undefined>(device);
  const $configs = atom<Map<string, IrrigationConfig>>(new Map());
  return createDialogCapabilities($device, $configs).get();
}

const tank = {
  sensorEntity: 'sensor.tank',
  name: 'Tank',
  warningLevel: 10,
  fillLevel: 53,
  isWarning: false,
};

describe('dialog-capabilities – irrigationMethod', () => {
  it("derives 'pump' when a pump entity is configured", () => {
    const device = createGrowspaceDevice({
      deviceId: 'gs1',
      name: 'Tent',
      irrigationConfig: {
        irrigationPumpEntity: 'switch.pump',
        irrigationTimes: [],
        drainTimes: [],
      },
    });
    const c = caps(device);
    expect(c.hasPump).toBe(true);
    expect(c.irrigationMethod).toBe('pump');
  });

  it("derives 'tank' for a gravity/manual setup — tanks present, no pump", () => {
    const device = createGrowspaceDevice({
      deviceId: 'gs1',
      name: 'Tent',
      environmentAttributes: { irrigationTanks: [tank] },
    });
    const c = caps(device);
    expect(c.hasPump).toBe(false);
    expect(c.hasTank).toBe(true);
    expect(c.irrigationMethod).toBe('tank');
  });

  it("derives 'none' when neither a pump nor a tank is configured", () => {
    const device = createGrowspaceDevice({ deviceId: 'gs1', name: 'Tent' });
    const c = caps(device);
    expect(c.irrigationMethod).toBe('none');
  });

  it("prefers 'pump' over 'tank' when both a pump and tanks exist", () => {
    const device = createGrowspaceDevice({
      deviceId: 'gs1',
      name: 'Tent',
      irrigationConfig: {
        irrigationPumpEntity: 'switch.pump',
        irrigationTimes: [],
        drainTimes: [],
      },
      environmentAttributes: { irrigationTanks: [tank] },
    });
    expect(caps(device).irrigationMethod).toBe('pump');
  });
});
