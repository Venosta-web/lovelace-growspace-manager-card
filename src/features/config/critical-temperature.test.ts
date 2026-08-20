import { describe, expect, it } from 'vitest';
import {
  editCriticalTemperatureBound,
  pressureFromKpa,
  pressureToKpa,
  temperatureFromCelsius,
  temperatureStep,
  temperatureToCelsius,
} from './critical-temperature';

describe('critical temperature pairing', () => {
  it('materialises the partner default when the first bound is entered', () => {
    expect(
      editCriticalTemperatureBound(
        { critical_temp_low: null, critical_temp_high: null },
        'low',
        '20',
        '°C'
      )
    ).toEqual({
      patch: { critical_temp_low: 20, critical_temp_high: 32 },
      error: null,
    });
  });

  it('rejects an inverted pair with an error for the bound that caused it', () => {
    expect(
      editCriticalTemperatureBound(
        { critical_temp_low: 18, critical_temp_high: 32 },
        'high',
        '17',
        '°C'
      )
    ).toEqual({
      patch: null,
      error: 'High cutoff must be higher than the low cutoff.',
    });
  });

  it('clears both bounds when either field is emptied', () => {
    expect(
      editCriticalTemperatureBound(
        { critical_temp_low: 18, critical_temp_high: 32 },
        'low',
        '',
        '°C'
      )
    ).toEqual({
      patch: { critical_temp_low: null, critical_temp_high: null },
      error: null,
    });
  });
});

describe('climate unit conversion', () => {
  it('round-trips absolute temperatures and temperature differences', () => {
    expect(temperatureFromCelsius(20, '°F')).toBe(68);
    expect(temperatureToCelsius(68, '°F')).toBe(20);
    expect(temperatureFromCelsius(1, '°F', true)).toBe(1.8);
    expect(temperatureToCelsius(1.8, '°F', true)).toBe(1);
    expect(temperatureStep('°F')).toBe('0.18');
  });

  it('round-trips VPD through Home Assistant pressure units', () => {
    expect(pressureFromKpa(1.2, 'Pa')).toBe(1200);
    expect(pressureToKpa(1200, 'Pa')).toBe(1.2);
    expect(pressureToKpa(pressureFromKpa(1.2, 'inHg'), 'inHg')).toBe(1.2);
  });
});
