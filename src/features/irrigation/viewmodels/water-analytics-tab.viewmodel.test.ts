import { describe, expect, it } from 'vitest';
import { atom } from 'nanostores';
import { createInitialSM } from '../../../dialogs/irrigation-dialog-sm';
import type { GrowspaceDevice, IrrigationConfig } from '../../../services/types';
import { createWaterAnalyticsTabViewModel } from './water-analytics-tab.viewmodel';

function capLabel(
  volume: number,
  cycles: number,
  dailyVolumeCapLiters?: number | null,
  maxCyclesPerDay?: number | null
): string {
  const device = {
    volumeDispensedToday: volume,
    cyclesToday: cycles,
    irrigationConfig: {
      irrigationPumpEntity: 'switch.pump',
      dailyVolumeCapLiters,
      maxCyclesPerDay,
    } as IrrigationConfig,
  } as GrowspaceDevice;
  return createWaterAnalyticsTabViewModel(atom(createInitialSM()), atom(device)).get()
    .dispensedTodayLabel;
}

describe('dispensed volume cap label', () => {
  it('shows progress against both caps', () => {
    expect(capLabel(3.2, 4, 10, 12)).toBe('Toward daily cap 3.2 / 10 L · 4 / 12 cycles');
  });

  it('uses the plain label when neither cap is set', () => {
    expect(capLabel(3.2, 4, null, null)).toBe('Dispensed today');
  });

  it('shows only the configured cap', () => {
    expect(capLabel(3.2, 4, 10, null)).toBe('Toward daily cap 3.2 / 10 L');
    expect(capLabel(3.2, 4, null, 12)).toBe('Toward daily cap 4 / 12 cycles');
  });

  it('shows the reached cap without treating it as unset', () => {
    expect(capLabel(10, 12, 10, 12)).toBe('Toward daily cap 10 / 10 L · 12 / 12 cycles');
  });
});
