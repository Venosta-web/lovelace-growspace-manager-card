import type { CirculationFanConfig, ExhaustFanConfig } from '../../slices/growspace/schema';

export const DEFAULT_CRITICAL_TEMP_LOW_C = 18;
export const DEFAULT_CRITICAL_TEMP_HIGH_C = 32;

export type CriticalTemperatureBound = 'low' | 'high';

type CriticalTemperatureConfig = Pick<
  CirculationFanConfig | ExhaustFanConfig,
  'critical_temp_low' | 'critical_temp_high'
>;

export interface CriticalTemperatureEditResult {
  patch: { critical_temp_low: number | null; critical_temp_high: number | null } | null;
  error: string | null;
}

const PRESSURE_PER_KPA: Record<string, number> = {
  Pa: 1000,
  hPa: 10,
  kPa: 1,
  bar: 0.01,
  cbar: 0.1,
  mbar: 10,
  inHg: 0.2952998307,
  psi: 0.1450377377,
  mmHg: 7.500616827,
};

function rounded(value: number, digits = 6): number {
  return Number(value.toFixed(digits));
}

export function normalizedTemperatureUnit(unit: string | undefined): string {
  return unit === '°F' ? '°F' : '°C';
}

export function normalizedPressureUnit(unit: string | undefined): string {
  return unit && PRESSURE_PER_KPA[unit] ? unit : 'kPa';
}

export function temperatureFromCelsius(value: number, unit: string, difference = false): number {
  if (normalizedTemperatureUnit(unit) === '°C') return rounded(value);
  return rounded(value * (9 / 5) + (difference ? 0 : 32));
}

export function temperatureToCelsius(value: number, unit: string, difference = false): number {
  if (normalizedTemperatureUnit(unit) === '°C') return rounded(value);
  return rounded((value - (difference ? 0 : 32)) * (5 / 9));
}

export function pressureFromKpa(value: number, unit: string): number {
  return rounded(value * PRESSURE_PER_KPA[normalizedPressureUnit(unit)]);
}

export function pressureToKpa(value: number, unit: string): number {
  return rounded(value / PRESSURE_PER_KPA[normalizedPressureUnit(unit)], 3);
}

export function pressureStep(unit: string): string {
  return String(rounded(0.01 * PRESSURE_PER_KPA[normalizedPressureUnit(unit)], 4));
}

export function temperatureStep(unit: string): string {
  return String(temperatureFromCelsius(0.1, unit, true));
}

export function displayTemperature(
  value: number | null | undefined,
  unit: string,
  difference = false
): number | '' {
  return value == null ? '' : temperatureFromCelsius(value, unit, difference);
}

export function editCriticalTemperatureBound(
  config: CriticalTemperatureConfig,
  bound: CriticalTemperatureBound,
  raw: string,
  unit: string
): CriticalTemperatureEditResult {
  if (raw.trim() === '') {
    return {
      patch: { critical_temp_low: null, critical_temp_high: null },
      error: null,
    };
  }

  const displayed = Number.parseFloat(raw);
  if (!Number.isFinite(displayed)) {
    return { patch: null, error: 'Enter a temperature or clear the field to disable the cutoff.' };
  }

  const value = temperatureToCelsius(displayed, unit);
  const low = bound === 'low' ? value : (config.critical_temp_low ?? DEFAULT_CRITICAL_TEMP_LOW_C);
  const high =
    bound === 'high' ? value : (config.critical_temp_high ?? DEFAULT_CRITICAL_TEMP_HIGH_C);

  if (bound === 'low' && (value < 10 || value > 40)) {
    return {
      patch: null,
      error: `Low cutoff must be between ${temperatureFromCelsius(10, unit)}${normalizedTemperatureUnit(unit)} and ${temperatureFromCelsius(40, unit)}${normalizedTemperatureUnit(unit)}.`,
    };
  }
  if (bound === 'high' && (value < 10 || value > 50)) {
    return {
      patch: null,
      error: `High cutoff must be between ${temperatureFromCelsius(10, unit)}${normalizedTemperatureUnit(unit)} and ${temperatureFromCelsius(50, unit)}${normalizedTemperatureUnit(unit)}.`,
    };
  }
  if (low >= high) {
    return {
      patch: null,
      error:
        bound === 'low'
          ? 'Low cutoff must be lower than the high cutoff.'
          : 'High cutoff must be higher than the low cutoff.',
    };
  }

  return {
    patch: { critical_temp_low: low, critical_temp_high: high },
    error: null,
  };
}
