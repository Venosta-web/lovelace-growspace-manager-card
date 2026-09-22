import { describe, it, expect, afterEach } from 'vitest';
import {
  buildQrTargetUrl,
  deriveLabelFieldValues,
  findLabelPlant,
  formatLabelDate,
} from './print-label-logic';
import { setDevices } from '../slices/grid';

function withPlants(plants: unknown[]) {
  setDevices([
    {
      deviceId: 'dev1',
      name: 'Growspace 1',
      type: 'normal' as any,
      rows: 1,
      plantsPerRow: 1,
      plants: plants as any,
      grid: {},
      biologicalMetrics: {} as any,
      environmentAttributes: {} as any,
      stats: {} as any,
      irrigationConfig: {} as any,
    },
  ] as any);
}

afterEach(() => setDevices([]));

// ---------------------------------------------------------------------------
// findLabelPlant
// ---------------------------------------------------------------------------

describe('findLabelPlant', () => {
  it('returns null when no plantId is given', () => {
    expect(findLabelPlant(undefined)).toBeNull();
  });

  it('finds the plant by its plant_id attribute', () => {
    const plant = {
      entity_id: 'sensor.plant_1',
      state: 'healthy',
      attributes: { plant_id: 'plant_1', strain: 'OG Kush' },
    };
    withPlants([plant]);
    expect(findLabelPlant('plant_1')).toEqual(plant);
  });

  it('falls back to the entity id without its sensor prefix', () => {
    const plant = {
      entity_id: 'sensor.plant_1',
      state: 'healthy',
      attributes: { strain: 'OG Kush' },
    };
    withPlants([plant]);
    expect(findLabelPlant('plant_1')).toEqual(plant);
  });

  it('returns null when no active growspace holds the plant', () => {
    withPlants([]);
    expect(findLabelPlant('plant_1')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// formatLabelDate
// ---------------------------------------------------------------------------

describe('formatLabelDate', () => {
  it('returns an empty string for null or undefined', () => {
    expect(formatLabelDate(null)).toBe('');
    expect(formatLabelDate(undefined)).toBe('');
  });

  it('returns the original string when it will not parse', () => {
    expect(formatLabelDate('invalid-date-string')).toBe('invalid-date-string');
  });

  it('returns the original input when conversion throws', () => {
    const badInput = Symbol('bad') as any;
    expect(formatLabelDate(badInput)).toBe(badInput);
  });

  it('formats a parseable date', () => {
    expect(formatLabelDate('2026-05-01T00:00:00Z')).toBeTruthy();
    expect(formatLabelDate('2026-05-01T00:00:00Z')).not.toBe('2026-05-01T00:00:00Z');
  });
});

// ---------------------------------------------------------------------------
// deriveLabelFieldValues
// ---------------------------------------------------------------------------

describe('deriveLabelFieldValues', () => {
  it('reads every field off the plant attributes', () => {
    withPlants([
      {
        entity_id: 'sensor.plant_1',
        state: 'healthy',
        attributes: {
          plant_id: 'plant_1',
          strain: 'OG Kush',
          phenotype: 'Ph1',
          breeder: 'Barney',
          lineage: 'Kush x OG',
          veg_start: '2026-05-01T00:00:00Z',
          days_in_stage: 5,
          breeder_logo: 'logo.png',
        },
      },
    ]);

    const values = deriveLabelFieldValues('plant_1');
    expect(values.name).toBe('OG Kush');
    expect(values.phenotype).toBe('Ph1');
    expect(values.breeder).toBe('Barney');
    expect(values.lineage).toBe('Kush x OG');
    expect(values.stageAge).toBe('Day 5');
    expect(values.plantId).toBe('plant_1');
    expect(values.logo).toBe('logo.png');
    expect(values.startDate).toBeTruthy();
  });

  it('uses flower_start when the plant has no veg_start', () => {
    withPlants([
      {
        entity_id: 'sensor.plant_1',
        state: 'healthy',
        attributes: { plant_id: 'plant_1', flower_start: '2026-05-01T00:00:00Z' },
      },
    ]);
    expect(deriveLabelFieldValues('plant_1').startDate).toBe(
      formatLabelDate('2026-05-01T00:00:00Z')
    );
  });

  it('leaves the stage dates and optional fields empty when the plant has none', () => {
    withPlants([
      {
        entity_id: 'sensor.plant_1',
        state: 'healthy',
        attributes: { plant_id: 'plant_1' },
      },
    ]);

    expect(deriveLabelFieldValues('plant_1')).toEqual({
      name: '',
      phenotype: '',
      breeder: '',
      lineage: '',
      startDate: '',
      stageAge: '',
      plantId: 'plant_1',
      logo: '',
    });
  });

  it('keeps a zero day count rather than reading it as absent', () => {
    withPlants([
      {
        entity_id: 'sensor.plant_1',
        state: 'healthy',
        attributes: { plant_id: 'plant_1', days_in_stage: 0 },
      },
    ]);
    expect(deriveLabelFieldValues('plant_1').stageAge).toBe('Day 0');
  });

  it('falls back to the caller values only where the plant has nothing', () => {
    withPlants([
      {
        entity_id: 'sensor.plant_1',
        state: 'healthy',
        attributes: { plant_id: 'plant_1', strain: 'OG Kush' },
      },
    ]);

    const values = deriveLabelFieldValues('plant_1', {
      strainName: 'Ignored',
      phenotype: 'Ph2',
      breeder: 'Seedsman',
      lineage: 'A x B',
      breederLogo: 'fallback.png',
    });
    expect(values.name).toBe('OG Kush');
    expect(values.phenotype).toBe('Ph2');
    expect(values.breeder).toBe('Seedsman');
    expect(values.lineage).toBe('A x B');
    expect(values.logo).toBe('fallback.png');
  });

  it('falls back for every field when no plant is found', () => {
    withPlants([]);
    expect(deriveLabelFieldValues('plant_1', { strainName: 'OG Kush' })).toEqual({
      name: 'OG Kush',
      phenotype: '',
      breeder: '',
      lineage: '',
      startDate: '',
      stageAge: '',
      plantId: 'plant_1',
      logo: '',
    });
  });

  it('yields an empty plant id when none was asked for', () => {
    expect(deriveLabelFieldValues(undefined).plantId).toBe('');
  });
});

// ---------------------------------------------------------------------------
// buildQrTargetUrl
// ---------------------------------------------------------------------------

describe('buildQrTargetUrl', () => {
  it('builds the web URL', () => {
    expect(buildQrTargetUrl('plant_1', 'web')).toBe('https://growspace.app/plant/plant_1');
  });

  it('builds the deep link', () => {
    expect(buildQrTargetUrl('plant_1', 'deeplink')).toBe('growspace://plant/plant_1');
  });

  it('encodes an empty id when no plant is known', () => {
    expect(buildQrTargetUrl(undefined, 'web')).toBe('https://growspace.app/plant/');
    expect(buildQrTargetUrl(undefined, 'deeplink')).toBe('growspace://plant/');
  });
});
