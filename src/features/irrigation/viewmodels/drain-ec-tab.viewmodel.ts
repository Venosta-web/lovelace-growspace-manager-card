/**
 * Drain EC Tab ViewModel (ADR-0019)
 *
 * The pure derivation behind the Irrigation Dialog's Drain EC tab — drain/runoff
 * EC monitoring. **Mixed source**: the monitoring/log draft + the saving/logging
 * sub-state come from the SM (`$sm`-first, `tabs.drain_ec`), while the logged
 * readings list is read from the device's `drainConfig.readings` — the SAME
 * source the former inline `_renderDrainECTab` read (`this.device?.drainConfig`),
 * so the rendered output stays byte-identical.
 *
 * Every threshold/color computation here is **draft-driven** (`draft.enabled`,
 * `draft.maxEcDelta`), matching the former render: the status card, the live EC
 * delta readout, and the per-row table coloring all read the in-flight draft, not
 * the persisted config.
 *
 * Locale/clock-dependent formatting (`toLocaleString` timestamps, `toFixed`
 * digit strings) is deliberately NOT done here: it is presentation, kept in the
 * component's `render()` so this factory is deterministically testable with no
 * clock and no locale. The VM projects raw derived numbers + flags only.
 */

import { computed, type ReadableAtom } from 'nanostores';
import type { GrowspaceDevice, DrainECReading } from '../../../services/types';
import type { DialogSM, DrainEcDraft, DrainEcSubState } from '../../../dialogs/irrigation-dialog-sm';

/** The status banner state (color + message text, derived from the draft + last reading). */
export interface DrainEcStatusVM {
  /** Status dot/border color (CSS color string). */
  color: string;
  /** Status message line. */
  text: string;
  /** The most recent reading (raw, for the "Last reading" line), or null. */
  lastReading: DrainECReading | null;
}

/** One row in the Recent Readings table (raw reading + draft-derived coloring). */
export interface DrainEcReadingRowVM {
  reading: DrainECReading;
  /** `drainEc - feedEc` (signed). */
  delta: number;
  /** True when monitoring is enabled AND the delta exceeds the max delta. */
  overThreshold: boolean;
  /** Runoff % (drain/feed * 100) when both volumes are present, else null. */
  runoffPercent: number | null;
}

/** Complete render input for `<irrigation-drain-ec-tab>`. */
export interface DrainEcTabViewModel {
  /** The monitoring + log-reading draft (mirrored from the SM). */
  draft: DrainEcDraft;
  /** The active saving/logging sub-state (mirrored from the SM). */
  sub: DrainEcSubState;
  /** Status banner projection. */
  status: DrainEcStatusVM;
  /** Recent readings (most-recent first, max 20), draft-derived coloring per row. */
  recent: DrainEcReadingRowVM[];
  /** Total number of logged readings (the "N total" count). */
  totalReadings: number;
}

/**
 * Pure factory: the SM atom (carrying `tabs.drain_ec`) + the device atom (the
 * readings source) → one Drain EC VM atom. `$sm`-first, mixed source (readings
 * from `drainConfig`). No `$caps`. Testable with no DOM, no clock, no locale.
 */
export function createDrainEcTabViewModel(
  $sm: ReadableAtom<DialogSM>,
  $device: ReadableAtom<GrowspaceDevice | undefined>
): ReadableAtom<DrainEcTabViewModel> {
  return computed([$sm, $device], (sm, device) => {
    const draft = sm.tabs.drain_ec.draft;
    const dc = device?.drainConfig;
    const readings: DrainECReading[] = dc?.readings || [];
    const recentReadings = readings.slice(-20).reverse();
    const lastReading = recentReadings[0] ?? null;
    const lastDelta = lastReading ? lastReading.drainEc - lastReading.feedEc : null;
    const isOverThreshold =
      lastDelta !== null && draft.enabled && lastDelta > draft.maxEcDelta;

    const color = !draft.enabled
      ? 'rgba(255,255,255,0.3)'
      : isOverThreshold
        ? '#f44336'
        : lastDelta !== null && lastDelta > draft.maxEcDelta * 0.7
          ? '#FF9800'
          : '#4caf50';

    const text = !draft.enabled
      ? 'Monitoring disabled'
      : lastDelta === null
        ? 'No readings yet'
        : isOverThreshold
          ? `Salt buildup alert — Δ${lastDelta.toFixed(2)} mS/cm above threshold`
          : `EC OK — Δ${lastDelta.toFixed(2)} mS/cm`;

    const recent: DrainEcReadingRowVM[] = recentReadings.map((r) => {
      const delta = r.drainEc - r.feedEc;
      return {
        reading: r,
        delta,
        overThreshold: draft.enabled && delta > draft.maxEcDelta,
        runoffPercent:
          r.feedVolumeMl && r.drainVolumeMl ? (r.drainVolumeMl / r.feedVolumeMl) * 100 : null,
      };
    });

    return {
      draft,
      sub: sm.tabs.drain_ec.sub,
      status: { color, text, lastReading },
      recent,
      totalReadings: readings.length,
    };
  });
}
