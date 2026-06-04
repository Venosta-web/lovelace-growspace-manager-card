import { describe, it, expect } from 'vitest';
import {
  getFlowerVegPlants,
  getPlantLabel,
} from '../../../src/dialogs/seeds-genetics-tab-logic';
import type { GrowspaceDevice } from '../../../src/types';

function makePlant(overrides: Record<string, unknown> = {}) {
  return {
    entity_id: 'sensor.plant_1',
    state: 'veg',
    attributes: {
      plant_id: 'p1',
      strain: 'Zkittlez',
      phenotype: '',
      stage: 'veg',
      ...overrides,
    },
  };
}

function makeDevice(name: string, plants: ReturnType<typeof makePlant>[]): GrowspaceDevice {
  return { name, plants, deviceId: 'd1' } as unknown as GrowspaceDevice;
}

// ─── getFlowerVegPlants ───────────────────────────────────────────────────────

describe('getFlowerVegPlants', () => {
  it('returns plants in veg stage', () => {
    const device = makeDevice('Tent A', [makePlant({ stage: 'veg', plant_id: 'p1' })]);
    const result = getFlowerVegPlants([device]);
    expect(result).toHaveLength(1);
    expect(result[0].plant_id).toBe('p1');
  });

  it('returns plants in flower stage', () => {
    const device = makeDevice('Tent A', [makePlant({ stage: 'flower', plant_id: 'p2' })]);
    const result = getFlowerVegPlants([device]);
    expect(result[0].plant_id).toBe('p2');
  });

  it('excludes seedling, clone, and harvest stages', () => {
    const device = makeDevice('Tent A', [
      makePlant({ stage: 'seedling', plant_id: 'p-seed' }),
      makePlant({ stage: 'clone', plant_id: 'p-clone' }),
      makePlant({ stage: 'harvest', plant_id: 'p-harvest' }),
    ]);
    expect(getFlowerVegPlants([device])).toEqual([]);
  });

  it('includes stage days in the label when present', () => {
    const device = makeDevice('Tent A', [
      makePlant({ stage: 'veg', veg_days: 14, strain: 'Blue Dream' }),
    ]);
    const [entry] = getFlowerVegPlants([device]);
    expect(entry.label).toContain('Day 14');
  });

  it('omits stage days from label when null', () => {
    const device = makeDevice('Tent A', [
      makePlant({ stage: 'veg', veg_days: null, strain: 'Blue Dream' }),
    ]);
    const [entry] = getFlowerVegPlants([device]);
    expect(entry.label).not.toContain('Day');
  });

  it('includes phenotype in label when set', () => {
    const device = makeDevice('Tent A', [
      makePlant({ stage: 'flower', strain: 'Zkittlez', phenotype: 'P3' }),
    ]);
    const [entry] = getFlowerVegPlants([device]);
    expect(entry.label).toContain('(P3)');
  });

  it('includes device name in label', () => {
    const device = makeDevice('Room 2', [makePlant({ stage: 'veg' })]);
    const [entry] = getFlowerVegPlants([device]);
    expect(entry.label).toContain('Room 2');
  });

  it('flattens plants across multiple devices', () => {
    const d1 = makeDevice('Tent A', [makePlant({ stage: 'veg', plant_id: 'pa' })]);
    const d2 = makeDevice('Tent B', [makePlant({ stage: 'flower', plant_id: 'pb' })]);
    expect(getFlowerVegPlants([d1, d2])).toHaveLength(2);
  });

  it('returns empty array when devices list is empty', () => {
    expect(getFlowerVegPlants([])).toEqual([]);
  });

  it('uses empty string for strain when strain is undefined', () => {
    const device = makeDevice('Tent A', [
      makePlant({ stage: 'veg', strain: undefined, plant_id: 'p-no-strain' }),
    ]);
    const [entry] = getFlowerVegPlants([device]);
    expect(entry.label).toContain('veg');
    expect(entry.label).not.toContain('undefined');
  });
});

// ─── getPlantLabel ────────────────────────────────────────────────────────────

describe('getPlantLabel', () => {
  const devices = [
    makeDevice('Tent A', [
      makePlant({ plant_id: 'p1', strain: 'Blueberry', phenotype: '' }),
      makePlant({ plant_id: 'p2', strain: 'Zkittlez', phenotype: 'P3' }),
    ]),
  ];

  it('returns strain name for a known plant', () => {
    expect(getPlantLabel(devices as GrowspaceDevice[], 'p1')).toBe('Blueberry');
  });

  it('appends phenotype in parentheses when set', () => {
    expect(getPlantLabel(devices as GrowspaceDevice[], 'p2')).toBe('Zkittlez (P3)');
  });

  it('falls back to plant_id when plant is not found', () => {
    expect(getPlantLabel(devices as GrowspaceDevice[], 'unknown-id')).toBe('unknown-id');
  });

  it('parses "strain||phenotype" library-keyed IDs', () => {
    expect(getPlantLabel([], 'Blue Dream||P4')).toBe('Blue Dream (P4)');
  });

  it('parses "strain||" library-keyed IDs with no phenotype', () => {
    expect(getPlantLabel([], 'Blue Dream||')).toBe('Blue Dream');
  });

  it('returns raw plant_id when no match and no || separator', () => {
    expect(getPlantLabel([], 'random-id')).toBe('random-id');
  });

  it('searches across all devices', () => {
    const d1 = makeDevice('A', [makePlant({ plant_id: 'p-a', strain: 'Strain A', phenotype: '' })]);
    const d2 = makeDevice('B', [makePlant({ plant_id: 'p-b', strain: 'Strain B', phenotype: '' })]);
    expect(getPlantLabel([d1, d2] as GrowspaceDevice[], 'p-b')).toBe('Strain B');
  });

  it('returns plant_id when plant strain is empty and no phenotype', () => {
    const device = makeDevice('Tent', [makePlant({ plant_id: 'p-empty', strain: '', phenotype: '' })]);
    expect(getPlantLabel([device] as GrowspaceDevice[], 'p-empty')).toBe('p-empty');
  });

  it('falls back to plant_id when library-keyed ID has empty strain and no phenotype', () => {
    expect(getPlantLabel([], '||')).toBe('||');
  });
});
