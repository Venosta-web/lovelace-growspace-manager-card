import { describe, it, expect } from 'vitest';
import { getFlowerFlipInfo } from '../../../src/utils/flower-flip';

const TODAY = '2026-05-24';
const TOMORROW = '2026-05-25';
const YESTERDAY = '2026-05-23';

function makePlant(flowerStart: string | null, name = 'Plant A') {
  return {
    attributes: {
      flower_start: flowerStart,
      friendly_name: name,
    },
  } as any;
}

function makeDevice(overrides: Partial<{
  plants: any[];
  deviceId: string;
  vegDayHours: number;
  autoLightTracking: boolean;
}> = {}) {
  return {
    deviceId: overrides.deviceId ?? 'gs1',
    plants: overrides.plants ?? [],
    irrigationConfig: {
      irrigationTimes: [],
      drainTimes: [],
      vegDayHours: overrides.vegDayHours,
    },
    irrigationStrategy: overrides.autoLightTracking !== undefined
      ? { enabled: true, autoLightTracking: overrides.autoLightTracking } as any
      : undefined,
    environmentAttributes: {},
    biologicalMetrics: {},
    stats: {} as any,
    name: 'Test',
    type: 'normal' as any,
    grid: {},
    rows: 1,
    plantsPerRow: 1,
  };
}

describe('getFlowerFlipInfo', () => {
  it('returns null when no plant has flower_start matching today', () => {
    const device = makeDevice({ plants: [makePlant(TOMORROW), makePlant(YESTERDAY)] });
    expect(getFlowerFlipInfo(device, TODAY, {})).toBeNull();
  });

  it('returns null when plants have no flower_start', () => {
    const device = makeDevice({ plants: [makePlant(null)] });
    expect(getFlowerFlipInfo(device, TODAY, {})).toBeNull();
  });

  it('returns FlowerFlipInfo when one plant has flower_start == today', () => {
    const device = makeDevice({ plants: [makePlant(TODAY, 'Blue Dream')] });
    const result = getFlowerFlipInfo(device, TODAY, {});
    expect(result).not.toBeNull();
    expect(result!.plantNames).toEqual(['Blue Dream']);
    expect(result!.flowerStart).toBe(TODAY);
  });

  it('collects all plant names when multiple plants flip today', () => {
    const device = makeDevice({
      plants: [makePlant(TODAY, 'Blue Dream'), makePlant(TODAY, 'OG Kush'), makePlant(TOMORROW, 'Skunk')],
    });
    const result = getFlowerFlipInfo(device, TODAY, {});
    expect(result!.plantNames).toEqual(['Blue Dream', 'OG Kush']);
  });

  it('handles flower_start as full ISO datetime string', () => {
    const device = makeDevice({ plants: [makePlant('2026-05-24T00:00:00Z')] });
    expect(getFlowerFlipInfo(device, TODAY, {})).not.toBeNull();
  });

  it('returns null when dismiss key matches growspaceId + flowerStart', () => {
    const device = makeDevice({ plants: [makePlant(TODAY)] });
    const dismissed = { gs1: TODAY };
    expect(getFlowerFlipInfo(device, TODAY, dismissed)).toBeNull();
  });

  it('returns info when flower_start changed since last dismiss (stale key)', () => {
    const device = makeDevice({ plants: [makePlant(TODAY)] });
    const dismissed = { gs1: YESTERDAY };
    expect(getFlowerFlipInfo(device, TODAY, dismissed)).not.toBeNull();
  });

  it('uses vegDayHours from irrigationConfig, defaulting to 18', () => {
    const withHours = makeDevice({ plants: [makePlant(TODAY)], vegDayHours: 20 });
    expect(getFlowerFlipInfo(withHours, TODAY, {})!.vegDayHours).toBe(20);

    const noHours = makeDevice({ plants: [makePlant(TODAY)] });
    expect(getFlowerFlipInfo(noHours, TODAY, {})!.vegDayHours).toBe(18);
  });

  it('uses flowerDayHours default of 12', () => {
    const device = makeDevice({ plants: [makePlant(TODAY)] });
    expect(getFlowerFlipInfo(device, TODAY, {})!.flowerDayHours).toBe(12);
  });

  it('reflects autoLightTracking from irrigationStrategy', () => {
    const withTracking = makeDevice({ plants: [makePlant(TODAY)], autoLightTracking: true });
    expect(getFlowerFlipInfo(withTracking, TODAY, {})!.autoLightTracking).toBe(true);

    const noTracking = makeDevice({ plants: [makePlant(TODAY)], autoLightTracking: false });
    expect(getFlowerFlipInfo(noTracking, TODAY, {})!.autoLightTracking).toBe(false);

    const noStrategy = makeDevice({ plants: [makePlant(TODAY)] });
    expect(getFlowerFlipInfo(noStrategy, TODAY, {})!.autoLightTracking).toBe(false);
  });

  it('uses device.deviceId as the key in dismissedMap (multiple growspaces)', () => {
    const device1 = makeDevice({ deviceId: 'gs1', plants: [makePlant(TODAY)] });
    const device2 = makeDevice({ deviceId: 'gs2', plants: [makePlant(TODAY)] });
    const dismissed = { gs1: TODAY };

    expect(getFlowerFlipInfo(device1, TODAY, dismissed)).toBeNull();
    expect(getFlowerFlipInfo(device2, TODAY, dismissed)).not.toBeNull();
  });
});
