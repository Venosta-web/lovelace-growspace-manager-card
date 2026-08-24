/**
 * Schedules Tab ViewModel (ADR-0019)
 *
 * The pure derivation behind the Irrigation Dialog's Schedules tab — the largest
 * tab adapter. It projects two render modes from the SM atom:
 *
 *   - **Manual** (Crop Steering disabled): the Irrigation + Drain schedule
 *     sections — each a list of scheduled times read from the device's
 *     `irrigationConfig` (the SAME source the former inline render read, so the
 *     output stays byte-identical) — plus the inline add/edit sub-state.
 *   - **Crop Steering** (steering draft `enabled`): a read-only panel that hosts
 *     the shared `<crop-steering-day-chart>` and a legend. The shots/phases come
 *     from the PURE `crop-steering-model` helpers (called here, not in the
 *     component), the sensor-presence flags from the Irrigation slice's
 *     `cropSteeringHistory$`.
 *
 * `$sm`-first: the SM carries `tabs.schedules` (durations/draft + inline sub) AND
 * `tabs.steering.draft` (the cross-tab read for shot/phase computation — expected
 * per ADR-0019, the VM reads `$sm`; steering state is never duplicated). The
 * device atom supplies the schedule rows, `flowerWeek`, `irrigationConfig` (for
 * phase boundaries) and is passed through for the chart. The history atom supplies
 * the legend's "sensor not configured" flags.
 *
 * Time-of-day (`now` / `isPast` / the now-line) is deliberately NOT derived here:
 * it is view geometry that depends on `Date.now()`, so it stays in the component's
 * `render()` to keep this factory deterministically testable with no clock.
 */

import { computed, type ReadableAtom } from 'nanostores';
import { token } from '../../../styles/variables.generated';
import type { GrowspaceDevice, IrrigationStrategy, IrrigationTime } from '../../../services/types';
import type { CropSteeringHistory } from '../../../schemas/api-schema';
import type { DialogSM, SchedulesSubState } from '../../../dialogs/irrigation-dialog-sm';
import {
  computeCropSteeringCycle,
  computePhases,
  fmtMinuteOfDay,
  type CropSteeringShot,
  type CropSteeringPhase,
} from '../../../features/environment/crop-steering-model';

/** One scheduled time block (config row, formatted for the timeline + chips). */
export interface ScheduleTimeVM {
  /** The raw `HH:MM[:SS]` time string — the identity remove/edit are keyed by. */
  timeStr: string;
  /** Minute-of-day start (0–1439). */
  startMin: number;
  /** Effective duration in seconds (falls back to the section default). */
  durationSeconds: number;
}

/** One manual schedule section (irrigation or drain). */
export interface ScheduleSectionVM {
  type: 'irrigation' | 'drain';
  title: string;
  /** Section accent color. */
  color: string;
  /** Default duration shown in the add overlay. */
  defaultDuration: number;
  /** Valid time blocks for the timeline + chips. */
  times: ScheduleTimeVM[];
}

/** A phase chip in the crop-steering legend (label/name/color/target precomputed). */
export interface CropSteeringPhaseChipVM {
  id: string;
  label: string;
  name: string;
  color: string;
  target: string;
  /** Shot count appended to the P2 chip only (per the former inline render). */
  shotCount: number | null;
}

/** The read-only crop-steering schedule panel projection. */
export interface CropSteeringScheduleVM {
  /** Null when no strategy is configured (the "set Lights On Time" empty state). */
  configured: boolean;
  /** Number of P2 shots (the cycle length). */
  shotCount: number;
  lightHours: number;
  /** "HH:MM" lights-on / lights-off, preformatted for the photoperiod chip. */
  lightsOnLabel: string;
  lightsOffLabel: string;
  /** Phase legend chips. */
  phases: CropSteeringPhaseChipVM[];
  /** Sensor-presence flags driving the "not configured" legend chips. */
  hasPoreEc: boolean;
  hasBulkEc: boolean;
}

/** Complete render input for `<irrigation-schedules-tab>`. */
export interface SchedulesTabViewModel {
  /** True when the steering draft is enabled → render the crop-steering panel. */
  isCropSteering: boolean;
  /** The active inline add/edit sub-state (mirrored from the SM). */
  sub: SchedulesSubState;
  /** Irrigation section (manual mode only; null in crop-steering mode). */
  irrigationSection: ScheduleSectionVM | null;
  /** Drain section, present in both modes when a drain pump entity is configured. */
  drainSection: ScheduleSectionVM | null;
  /** Crop-steering panel data (crop-steering mode only; null in manual mode). */
  cropSteering: CropSteeringScheduleVM | null;
  /** Passed straight through so the component can host `<crop-steering-day-chart>`. */
  device: GrowspaceDevice | undefined;
}

/** Builds the time-block list for one schedule section (transcribed verbatim). */
function deriveTimes(times: IrrigationTime[], defaultDuration: number): ScheduleTimeVM[] {
  return times
    .filter((t) => t && (t.time || t.start_time))
    .map((t) => {
      const timeStr = (t.time || t.start_time)!;
      const [hh, mm] = timeStr.split(':').map(Number);
      return {
        timeStr,
        startMin: hh * 60 + (mm || 0),
        durationSeconds: t.duration || t.duration_seconds || defaultDuration,
      };
    });
}

function deriveCropSteeringPanel(
  device: GrowspaceDevice | undefined,
  strategy: Partial<IrrigationStrategy>,
  history: CropSteeringHistory | undefined
): CropSteeringScheduleVM {
  const dayHours = device?.irrigationConfig?.resolvedDayHours ?? 12;
  const shots: CropSteeringShot[] = computeCropSteeringCycle(
    strategy as IrrigationStrategy,
    dayHours
  );
  const phases = computePhases(strategy as IrrigationStrategy, dayHours, device?.irrigationConfig);

  if (!phases) {
    return {
      configured: false,
      shotCount: 0,
      lightHours: 0,
      lightsOnLabel: '',
      lightsOffLabel: '',
      phases: [],
      hasPoreEc: false,
      hasBulkEc: false,
    };
  }

  const shotCount = shots.length;
  return {
    configured: true,
    shotCount,
    lightHours: phases.lightHours,
    lightsOnLabel: fmtMinuteOfDay(phases.lightsOnMin),
    lightsOffLabel: fmtMinuteOfDay(phases.lightsOffMin),
    phases: phases.phases.map(
      (p: CropSteeringPhase): CropSteeringPhaseChipVM => ({
        id: p.id,
        label: p.label,
        name: p.name,
        color: p.color,
        target: p.target,
        shotCount: p.id === 'p2' ? shotCount : null,
      })
    ),
    hasPoreEc: history?.pore_ec !== undefined,
    hasBulkEc: history?.bulk_ec !== undefined,
  };
}

/**
 * Pure factory: the SM atom (carrying both `tabs.schedules` and the cross-tab
 * `tabs.steering.draft`), the device atom (schedule rows + chart + phase config),
 * and the Irrigation slice's `cropSteeringHistory$` → one Schedules VM atom.
 * No `$caps` (the Schedules tab has no nav-visibility capability gating).
 * Testable with no DOM and no clock.
 */
export function createSchedulesTabViewModel(
  $sm: ReadableAtom<DialogSM>,
  $device: ReadableAtom<GrowspaceDevice | undefined>,
  $cropSteeringHistory: ReadableAtom<Map<string, CropSteeringHistory>>
): ReadableAtom<SchedulesTabViewModel> {
  return computed([$sm, $device, $cropSteeringHistory], (sm, device, history) => {
    const draft = sm.tabs.schedules.draft;
    const steeringDraft = sm.tabs.steering.draft;
    const isCropSteering = !!steeringDraft.enabled;

    const irrigationTimes = device?.irrigationConfig?.irrigationTimes || [];
    const drainTimes = device?.irrigationConfig?.drainTimes || [];

    const drainSection: ScheduleSectionVM | null = draft.drainPumpEntity
      ? {
          type: 'drain' as const,
          title: 'Drain Schedule',
          // Six-digit hex through the token map, not var(): the tab concatenates
          // `40`, `99` and `55` onto this (ADR 0045 §1).
          color: token['--metric-drain'],
          defaultDuration: draft.drainDuration,
          times: deriveTimes(drainTimes, draft.drainDuration),
        }
      : null;

    return {
      isCropSteering,
      sub: sm.tabs.schedules.sub,
      irrigationSection: isCropSteering
        ? null
        : {
            type: 'irrigation' as const,
            title: 'Irrigation Schedule',
            color: token['--metric-irrigation'],
            defaultDuration: draft.irrigationDuration,
            times: deriveTimes(irrigationTimes, draft.irrigationDuration),
          },
      drainSection,
      cropSteering: isCropSteering
        ? deriveCropSteeringPanel(device, steeringDraft, history.get(device?.deviceId ?? ''))
        : null,
      device,
    };
  });
}
