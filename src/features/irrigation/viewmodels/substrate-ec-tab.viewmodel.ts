/**
 * Substrate & EC Tab ViewModel (ADR-0019 + ADR-0017)
 *
 * The pure derivation behind the Irrigation Dialog's Substrate & EC tab — the
 * canonical `$caps` consumer (ADR-0019) and the FIRST tab with ADR-0017's
 * deliberate **mixed persistence**:
 *
 *   - **Immediate-persist** capability-affecting fields — Shot Sizing Mode,
 *     Substrate Profile (media type + liters per pot), and the EC Modulation
 *     toggle — are projected as their CURRENT live values (read from the device's
 *     `irrigationStrategy`). They are NOT part of the buffered draft; the Dialog
 *     Shell writes them straight to the strategy the moment the user edits.
 *   - **Buffered** fields — the Pore EC Target Band (min/max) and the per-stage
 *     feed-EC ranges — come from the SM draft (`tabs.substrate_ec.draft`) and are
 *     written through the unified footer `save-all`.
 *
 * **Capability gates stay server-authoritative.** `volumeModeCapable` and
 * `sizingModeLabel` are read from the shared Dialog Capabilities atom (`$caps`) —
 * never re-derived here (ADR-0017). The EC-modulation sensor gate is the presence
 * of pore-EC sensors on the device. The ONLY client-side deduction is the
 * locked-hint TEXT (which prerequisite to name), branched on the persisted
 * profile's `litersPerPot` exactly as the former inline `_renderSubstrateEcTab`.
 *
 * Number-string formatting (`String(value)` / `parseFloat`) stays in the
 * component's `render()` so this factory is deterministically testable with no
 * DOM.
 */

import { computed, type ReadableAtom } from 'nanostores';
import type {
  GrowspaceDevice,
  SubstrateProfile,
  ShotSizingMode,
} from '../../../services/types';
import type { DialogSM, SubstrateEcDraft } from '../../../dialogs/irrigation-dialog-sm';
import type { DialogCapabilities } from './dialog-capabilities';

/** Complete render input for `<irrigation-substrate-ec-tab>`. */
export interface SubstrateEcTabViewModel {
  // ── Immediate-persist (current live values, NOT the buffered draft) ──
  /** Live substrate profile (media type + liters per pot). */
  profile: SubstrateProfile;
  /** Live shot-sizing mode ('seconds' | 'volume'). */
  sizingMode: ShotSizingMode;
  /** Live EC Modulation opt-in. */
  ecModulationEnabled: boolean;

  // ── Server-authoritative capability gates (from `$caps` / device) ──
  /** Volume Mode unlock gate (server-authoritative, from `$caps`). */
  volumeModeCapable: boolean;
  /** Sizing-mode label from `$caps` ('Seconds' | 'Volume'); 'Volume' marks the toggle active. */
  sizingModeLabel: 'Seconds' | 'Volume';
  /** True when at least one pore-EC sensor is configured → EC Modulation unlocks. */
  hasPoreEcSensors: boolean;
  /** Client-deduced Volume Mode lock-hint text (the one allowed client deduction). */
  volumeLockHint: string;

  // ── Buffered draft (footer save-all) ──
  /** Pore EC band draft (min/max, mS/cm); null = unset. */
  poreEcMin: number | null;
  poreEcMax: number | null;
  /** True when both band edges are set and inverted (min ≥ max) — inline error. */
  poreBandInverted: boolean;
  /** Per-stage feed-EC ranges draft. */
  ecTargetRanges: SubstrateEcDraft['ecTargetRanges'];
}

/**
 * Pure factory: the SM atom (carrying the buffered `tabs.substrate_ec` draft),
 * the shared Dialog Capabilities atom (`volumeModeCapable` + `sizingModeLabel`,
 * ADR-0017), and the device atom (live immediate-persist values + pore-EC sensor
 * gate) → one Substrate & EC VM atom. `$sm`-first, `$caps` second per the
 * documented ADR-0019 seam. Testable with no DOM.
 */
export function createSubstrateEcTabViewModel(
  $sm: ReadableAtom<DialogSM>,
  $caps: ReadableAtom<DialogCapabilities>,
  $device: ReadableAtom<GrowspaceDevice | undefined>
): ReadableAtom<SubstrateEcTabViewModel> {
  return computed([$sm, $caps, $device], (sm, caps, device) => {
    const strat = device?.irrigationStrategy;
    const draft = sm.tabs.substrate_ec.draft;

    const profile: SubstrateProfile = strat?.substrateProfile ?? {
      mediaType: 'coco',
      litersPerPot: 0,
    };
    const hasPoreEcSensors =
      (device?.environmentAttributes?.poreEcSensors?.length ?? 0) > 0;

    // Deduced Volume Mode lock hint (ADR-0017): the server bool is the gate; we
    // only branch the hint text on liters-per-pot to name the missing prereq.
    const volumeLockHint =
      (profile.litersPerPot ?? 0) > 0
        ? 'Set a pump flow rate to enable Volume Mode'
        : 'Set liters per pot to enable Volume Mode';

    const poreEcMin = draft.poreEcMin;
    const poreEcMax = draft.poreEcMax;
    const poreBandInverted = poreEcMin != null && poreEcMax != null && poreEcMin >= poreEcMax;

    return {
      profile,
      sizingMode: strat?.shotSizingMode ?? 'seconds',
      ecModulationEnabled: !!strat?.ecModulationEnabled,
      volumeModeCapable: caps.volumeModeCapable,
      sizingModeLabel: caps.sizingModeLabel,
      hasPoreEcSensors,
      volumeLockHint,
      poreEcMin,
      poreEcMax,
      poreBandInverted,
      ecTargetRanges: draft.ecTargetRanges,
    };
  });
}
