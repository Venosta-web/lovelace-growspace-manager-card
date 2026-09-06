/**
 * Irrigation read model — the two atoms every irrigation configuration write
 * touches, and the merge helpers that write them.
 *
 * Split out of `index.ts` so the [[Irrigation Command]] module can project onto
 * the read model without importing the slice whose named mutators are built on
 * top of it. Hydration stays in `index.ts`: `setIrrigationConfig` and
 * `setIrrigationStrategy` are the SyncService's bootstrap writes and are not a
 * write seam anything else goes through.
 *
 * The two `read*` helpers exist because a growspace the card has never synced
 * still has to answer "what would this field be" for an optimistic projection
 * and its inverse. They default; they never write.
 */

import { atom } from 'nanostores';
import type { IrrigationConfig, IrrigationStrategy } from '../../services/types';

export const irrigationConfigs$ = atom<Map<string, IrrigationConfig>>(new Map());
export const irrigationStrategies$ = atom<Map<string, IrrigationStrategy>>(new Map());

export function readIrrigationConfig(growspaceId: string): IrrigationConfig {
  return irrigationConfigs$.get().get(growspaceId) ?? { irrigationTimes: [], drainTimes: [] };
}

export function readIrrigationStrategy(growspaceId: string): IrrigationStrategy {
  return (
    irrigationStrategies$.get().get(growspaceId) ?? {
      enabled: false,
      lightsOnTime: '06:00',
      p0DurationMinutes: 60,
      p2StopBeforeLightsOffMinutes: 120,
      targetVwcPercent: 65,
      maintenanceDrybackPercent: 3,
      shotDurationSeconds: 30,
      shotIntervalMinutes: 15,
    }
  );
}

export function patchIrrigationConfig(growspaceId: string, patch: Partial<IrrigationConfig>): void {
  const updated = new Map(irrigationConfigs$.get());
  updated.set(growspaceId, { ...readIrrigationConfig(growspaceId), ...patch });
  irrigationConfigs$.set(updated);
}

export function patchIrrigationStrategy(
  growspaceId: string,
  patch: Partial<IrrigationStrategy>
): void {
  const updated = new Map(irrigationStrategies$.get());
  updated.set(growspaceId, { ...readIrrigationStrategy(growspaceId), ...patch });
  irrigationStrategies$.set(updated);
}
