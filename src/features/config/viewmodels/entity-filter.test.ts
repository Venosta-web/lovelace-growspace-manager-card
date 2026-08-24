import { describe, it, expect } from 'vitest';
import { matchesEntityClass, SOIL_MOISTURE_FILTER } from './entity-filter';

describe('matchesEntityClass', () => {
  it('accepts everything when the field has no class requirement', () => {
    expect(matchesEntityClass({}, null)).toBe(true);
    expect(matchesEntityClass({ device_class: 'power' }, null)).toBe(true);
  });

  it('demands an exact match for the bare-string form', () => {
    expect(matchesEntityClass({ device_class: 'temperature' }, 'temperature')).toBe(true);
    expect(matchesEntityClass({ device_class: 'humidity' }, 'temperature')).toBe(false);
    expect(matchesEntityClass({}, 'temperature')).toBe(false);
  });

  it('accepts any listed class', () => {
    const filter = { anyOf: ['moisture', 'humidity'] };
    expect(matchesEntityClass({ device_class: 'moisture' }, filter)).toBe(true);
    expect(matchesEntityClass({ device_class: 'humidity' }, filter)).toBe(true);
    expect(matchesEntityClass({ device_class: 'pressure' }, filter)).toBe(false);
  });

  it('rejects a classless entity when no unit fallback is offered', () => {
    expect(matchesEntityClass({ unit_of_measurement: '%' }, { anyOf: ['moisture'] })).toBe(false);
  });

  it('accepts a classless entity on its unit', () => {
    expect(matchesEntityClass({ unit_of_measurement: '%' }, SOIL_MOISTURE_FILTER)).toBe(true);
    expect(matchesEntityClass({ unit_of_measurement: 'ppm' }, SOIL_MOISTURE_FILTER)).toBe(false);
    expect(matchesEntityClass({}, SOIL_MOISTURE_FILTER)).toBe(false);
  });

  it('never lets a unit override a device class that is present', () => {
    // `device_class: pressure` with a `%` unit is a misconfigured entity, not a
    // soil probe; the explicit class wins.
    expect(
      matchesEntityClass(
        { device_class: 'pressure', unit_of_measurement: '%' },
        SOIL_MOISTURE_FILTER
      )
    ).toBe(false);
  });

  it('treats blank and non-string attributes as absent', () => {
    expect(
      matchesEntityClass({ device_class: '', unit_of_measurement: ' % ' }, SOIL_MOISTURE_FILTER)
    ).toBe(true);
    expect(matchesEntityClass({ device_class: null }, 'temperature')).toBe(false);
    expect(matchesEntityClass({ device_class: 7 }, { anyOf: ['moisture'] })).toBe(false);
  });

  it('offers the real-world soil probe from issue #37', () => {
    // sensor.waveshare001_vwc_links: %, measurement, no device_class.
    expect(matchesEntityClass({ unit_of_measurement: '%' }, SOIL_MOISTURE_FILTER)).toBe(true);
  });
});
