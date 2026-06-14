/**
 * Dialog Capabilities atom (ADR-0019)
 *
 * The single shared `computed` for the Irrigation Dialog's cross-tab derived
 * state: rail-group visibility gates (ADR-0016), the server-authoritative
 * `volumeModeCapable` flag (ADR-0017), and cross-tab labels (Sizing-Mode).
 *
 * It is a peer input to both the Dialog Shell's shell ViewModel and every Tab
 * ViewModel — **never** re-derived per tab. This is the seam that lets per-tab
 * ViewModels exist without re-fragmenting the cross-tab coupling ADR-0016/0017
 * deliberately consolidated.
 *
 * Overview is read-only, so this first slice only exercises the Crop-Steering
 * rail-group gate. The remaining fields are wired here so later tabs (steering,
 * substrate_ec) read them from the same atom instead of re-deriving inline.
 */

import { computed, type ReadableAtom } from 'nanostores';
import type { GrowspaceDevice, IrrigationConfig } from '../../../services/types';

/**
 * Cross-tab derived capabilities for the Irrigation Dialog.
 */
export interface DialogCapabilities {
  /** An irrigation or drain pump is configured. */
  hasPump: boolean;
  /** A soil-moisture sensor is configured. */
  hasSoilMoisture: boolean;
  /** An irrigation strategy is enabled. */
  hasStrategy: boolean;
  /**
   * Crop-Steering rail-group gate (ADR-0016): the Overview + Steering tabs share
   * one gate, `(hasSoilMoisture || hasStrategy) && hasPump`.
   */
  cropSteeringGroupVisible: boolean;
  /**
   * Server-authoritative Volume Mode gate (ADR-0017). The card never recomputes
   * this — it reads the flag directly.
   */
  volumeModeCapable: boolean;
  /** Current shot-sizing mode label, used to relabel the Steering tab's shot fields. */
  sizingModeLabel: 'Seconds' | 'Volume';
}

function deriveCapabilities(
  device: GrowspaceDevice | undefined,
  liveConfig: IrrigationConfig | undefined
): DialogCapabilities {
  const env = device?.environmentAttributes;
  const cfg = liveConfig ?? device?.irrigationConfig;

  const hasPump = !!(cfg?.irrigationPumpEntity || cfg?.drainPumpEntity);
  const hasSoilMoisture =
    !!env?.soilMoistureSensor || (env?.soilMoistureSensors?.length ?? 0) > 0;
  const hasStrategy = !!device?.irrigationStrategy?.enabled;

  const sizingMode = device?.irrigationStrategy?.shotSizingMode ?? 'seconds';

  return {
    hasPump,
    hasSoilMoisture,
    hasStrategy,
    cropSteeringGroupVisible: (hasSoilMoisture || hasStrategy) && hasPump,
    volumeModeCapable: device?.volumeModeCapable ?? false,
    sizingModeLabel: sizingMode === 'volume' ? 'Volume' : 'Seconds',
  };
}

/**
 * Build the shared Dialog Capabilities atom from the dialog's device prop atom
 * and the live irrigation-configs slice atom.
 */
export function createDialogCapabilities(
  $device: ReadableAtom<GrowspaceDevice | undefined>,
  $irrigationConfigs: ReadableAtom<Map<string, IrrigationConfig>>
): ReadableAtom<DialogCapabilities> {
  return computed([$device, $irrigationConfigs], (device, configs) => {
    const liveConfig = device?.deviceId ? configs.get(device.deviceId) : undefined;
    return deriveCapabilities(device, liveConfig);
  });
}
