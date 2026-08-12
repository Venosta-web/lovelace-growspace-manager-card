/**
 * Shared Config Dialog capabilities (ADR-0019).
 *
 * Cross-tab save gates belong here so the shell's affordances and submit paths
 * consume the same derivation instead of rebuilding policy independently.
 */

import type { EnvironmentDraft } from '../../../dialogs/config-dialog-sm';

export type EnvironmentSaveBlockReason =
  | 'growspace'
  | 'temperature'
  | 'humidity'
  | 'temperature-and-humidity';

export interface ConfigDialogCapabilities {
  canSaveEnvironment: boolean;
  environmentSaveBlockReason: EnvironmentSaveBlockReason | null;
}

type EnvironmentSaveInputs = Pick<
  EnvironmentDraft,
  'selectedGrowspaceId' | 'temperatureSensors' | 'humiditySensors'
>;

/** Derive the Config Dialog's cross-tab environment-save capabilities once. */
export function deriveConfigDialogCapabilities(
  draft: EnvironmentSaveInputs
): ConfigDialogCapabilities {
  if (!draft.selectedGrowspaceId) {
    return { canSaveEnvironment: false, environmentSaveBlockReason: 'growspace' };
  }

  const missingTemperature = draft.temperatureSensors.length === 0;
  const missingHumidity = draft.humiditySensors.length === 0;
  if (missingTemperature && missingHumidity) {
    return {
      canSaveEnvironment: false,
      environmentSaveBlockReason: 'temperature-and-humidity',
    };
  }
  if (missingTemperature) {
    return { canSaveEnvironment: false, environmentSaveBlockReason: 'temperature' };
  }
  if (missingHumidity) {
    return { canSaveEnvironment: false, environmentSaveBlockReason: 'humidity' };
  }
  return { canSaveEnvironment: true, environmentSaveBlockReason: null };
}
