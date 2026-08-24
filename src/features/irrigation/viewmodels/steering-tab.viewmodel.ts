/**
 * Steering Tab ViewModel (ADR-0019 + ADR-0012 + ADR-0014 + ADR-0017)
 *
 * The pure derivation behind the Irrigation Dialog's Steering tab — the hardest
 * fan-out slice of ADR-0019. It is `$sm`-first and a `$caps` consumer, and it is
 * the tab that writes TWO different drafts:
 *
 *   - **Steering draft** (`tabs.steering.draft`, written via `UPDATE_STEERING_DRAFT`)
 *     — the VWC strategy fields, timing, per-phase shot params, and the Adaptive
 *     Shot Control tunables (ADR-0014).
 *   - **Config draft** (`tabs.config.draft`, written via `UPDATE_CONFIG_DRAFT`) —
 *     the P2 Direct Trigger and the three Phase-Trigger toggles (Auto-advance
 *     P1→P2, Auto-advance P2→P3, Halt on Runoff EC). These live in the steering UI
 *     but persist through the config draft; the Dialog Shell routes their dedicated
 *     intent to `UPDATE_CONFIG_DRAFT`.
 *
 * **Cross-tab Sizing-Mode read (ADR-0017/0019).** The per-phase shot fields switch
 * between "Shot Duration (sec)" and "Shot Size (%)" based on the live sizing mode.
 * This VM reads that from the shared Dialog Capabilities atom
 * (`$caps.sizingModeLabel === 'Volume'`) — the canonical cross-tab seam — never
 * from a steering-draft field (sizing mode persists immediately on the Substrate &
 * EC tab, ADR-0017). The field key/label/parse logic is preserved byte-for-byte:
 * `${p.id}ShotVolumePercent` vs `${p.id}ShotDurationSeconds`, "P1 Shot Size (%)"
 * vs "P1 Shot Duration (sec)", parseFloat vs parseInt (parse stays in the
 * component, keyed off the descriptor's `isVolume`).
 *
 * **Confirm flows (ADR-0012).** Both the Steering Mode selector and the Phase card
 * gesture open a confirm overlay. The VM only projects the confirm sub-state
 * (`confirmMode` / `confirmPhase`); the Shell keeps the confirm side-effects (the
 * `applySteeringMode` store action and `_saveSettings`).
 *
 * Number-string formatting (`String(value)` / `parseFloat` / `parseInt`) stays in
 * the component's `render()` so this factory is deterministically testable with no
 * DOM.
 */

import { computed, type ReadableAtom } from 'nanostores';
import type { GrowspaceDevice, IrrigationStrategy, SteeringMode } from '../../../services/types';
import type { DialogSM, Phase, ConfigDraft } from '../../../dialogs/irrigation-dialog-sm';
import type { DialogCapabilities } from './dialog-capabilities';

/** Per-phase (P1/P2) shot field descriptor. The component picks parseFloat/parseInt off `isVolume`. */
export interface PhaseShotDescriptor {
  /** Phase id ('p1' | 'p2'). */
  id: 'p1' | 'p2';
  /** Phase label ('P1' | 'P2'). */
  label: string;
  /** Strategy draft key for the size field — volume-% or duration-seconds. */
  sizeField: keyof IrrigationStrategy;
  /** Size-field label, switched by sizing mode. */
  sizeLabel: string;
  /** Current size-field value (raw draft value; component stringifies). */
  sizeValue: number | string | undefined;
  /** Strategy draft key for the interval field (always minutes). */
  intervalField: keyof IrrigationStrategy;
  /** Current interval value. */
  intervalValue: number | string | undefined;
  /** True when sizing mode is Volume → parseFloat into `sizeField`; false → parseInt. */
  isVolume: boolean;
}

/** Steering Mode option (selector). */
export interface SteeringModeOption {
  id: SteeringMode;
  name: string;
  desc: string;
}

/** Complete render input for `<irrigation-steering-tab>`. */
export interface SteeringTabViewModel {
  // ── Mode selector (ADR-0012) ──
  /** Declared steering-mode intent (null = none declared). */
  declaredMode: SteeringMode | null;
  /** The three selectable modes (id/name/desc). */
  modes: SteeringModeOption[];

  // ── Confirm sub-state (ADR-0012) — null when no overlay is open ──
  /** Pending mode when the mode-confirm overlay is open, else null. */
  confirmMode: SteeringMode | null;
  /** Pending phase when the phase-confirm overlay is open, else null. */
  confirmPhase: Phase | null;
  /** The currently active phase (for the phase-confirm copy and active phase card). */
  activePhase: Phase;

  // ── Steering draft (UPDATE_STEERING_DRAFT) ──
  /** Whole steering draft — the component reads individual fields from here. */
  draft: Partial<IrrigationStrategy>;
  /** Auto-track-from-light-sensor switch is only shown when a light sensor is configured. */
  hasLightSensors: boolean;
  /** Detected lights-on time badge value (null/undefined hides the badge). */
  detectedLightsOnTime: string | null | undefined;
  /** Per-phase P1/P2 shot field descriptors (sizing-mode aware). */
  phaseShots: PhaseShotDescriptor[];

  // ── Adaptive Shot Control (ADR-0014) ──
  /** Master toggle (defaults true). Tunables are hidden while disabled. */
  adaptiveEnabled: boolean;

  // ── Config draft (UPDATE_CONFIG_DRAFT) — fields living in the steering UI ──
  /** P2 Direct Trigger (%); null = Off. */
  soilTriggerPercent: number | null;
  /** Auto-advance P1 → P2 toggle. */
  autoAdvanceP1ToP2: boolean;
  /** Auto-advance P2 → P3 toggle. */
  autoAdvanceP2ToP3: boolean;
  /** Halt-on-Runoff-EC threshold; null = disabled (toggle off). */
  haltOnRunoffEcThreshold: number | null;
}

const MODES: SteeringModeOption[] = [
  {
    id: 'vegetative',
    name: 'Vegetative',
    desc: 'Frequent shots, small dryback — vegetative push.',
  },
  {
    id: 'balanced',
    name: 'Balanced',
    desc: 'Middle ground between vegetative and generative.',
  },
  {
    id: 'generative',
    name: 'Generative',
    desc: 'Fewer, larger shots and deeper dryback — generative push.',
  },
];

const PHASES: Array<{ id: 'p1' | 'p2'; label: string }> = [
  { id: 'p1', label: 'P1' },
  { id: 'p2', label: 'P2' },
];

/**
 * Pure factory: the SM atom (carrying both the steering draft and the config
 * draft fields surfaced in the steering UI), the shared Dialog Capabilities atom
 * (`sizingModeLabel`, ADR-0017), and the device atom (light-sensor gate) → one
 * Steering VM atom. `$sm`-first, `$caps` second per the documented ADR-0019 seam.
 * Testable with no DOM.
 */
export function createSteeringTabViewModel(
  $sm: ReadableAtom<DialogSM>,
  $caps: ReadableAtom<DialogCapabilities>,
  $device: ReadableAtom<GrowspaceDevice | undefined>
): ReadableAtom<SteeringTabViewModel> {
  return computed([$sm, $caps, $device], (sm, caps, device) => {
    const steering = sm.tabs.steering;
    const draft = steering.draft;
    const config: ConfigDraft = sm.tabs.config.draft;
    const sub = steering.sub;

    // Cross-tab sizing-mode read (ADR-0017/0019): the canonical seam is `$caps`,
    // which derives the label from the live strategy. Equivalent to the old inline
    // `device.irrigationStrategy.shotSizingMode === 'volume'` read.
    const isVolume = caps.sizingModeLabel === 'Volume';

    const phaseShots: PhaseShotDescriptor[] = PHASES.map((p) => {
      const sizeField = (
        isVolume ? `${p.id}ShotVolumePercent` : `${p.id}ShotDurationSeconds`
      ) as keyof IrrigationStrategy;
      const sizeLabel = isVolume ? `${p.label} Shot Size (%)` : `${p.label} Shot Duration (sec)`;
      const intervalField = `${p.id}ShotIntervalMinutes` as keyof IrrigationStrategy;
      return {
        id: p.id,
        label: p.label,
        sizeField,
        sizeLabel,
        sizeValue: draft[sizeField] as number | string | undefined,
        intervalField,
        intervalValue: draft[intervalField] as number | string | undefined,
        isVolume,
      };
    });

    return {
      declaredMode: draft.declaredSteeringMode ?? null,
      modes: MODES,
      confirmMode: sub.kind === 'confirm-mode' ? sub.pending : null,
      confirmPhase: sub.kind === 'confirm-phase' ? sub.pending : null,
      activePhase: steering.phase,
      draft,
      hasLightSensors: (device?.environmentAttributes?.lightSensors?.length ?? 0) > 0,
      detectedLightsOnTime: draft.detectedLightsOnTime,
      phaseShots,
      adaptiveEnabled: draft.dynamicShotEnabled ?? true,
      soilTriggerPercent: config.soilTriggerPercent,
      autoAdvanceP1ToP2: config.autoAdvanceP1ToP2,
      autoAdvanceP2ToP3: config.autoAdvanceP2ToP3,
      haltOnRunoffEcThreshold: config.haltOnRunoffEcThreshold,
    };
  });
}
