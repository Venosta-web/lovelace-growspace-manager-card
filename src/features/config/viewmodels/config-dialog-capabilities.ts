/**
 * Shared Config Dialog capabilities (ADR-0019).
 *
 * Cross-tab save gates belong here so the shell's affordances and submit paths
 * consume the same derivation instead of rebuilding policy independently.
 */

import type { EnvironmentDraft } from '../../../dialogs/config-dialog-sm';
import type { EnvironmentDraftKey } from '../environment-persistence';
import { isEnvironmentSaveBlockedByBand } from '../environment-save';

export type EnvironmentSaveBlockReason =
  | 'growspace'
  | 'temperature'
  | 'humidity'
  | 'temperature-and-humidity'
  | 'moisture-band';

export interface ConfigDialogCapabilities {
  canSaveEnvironment: boolean;
  environmentSaveBlockReason: EnvironmentSaveBlockReason | null;
}

type EnvironmentSaveInputs = Pick<
  EnvironmentDraft,
  'selectedGrowspaceId' | 'temperatureSensors' | 'humiditySensors'
> &
  Partial<Pick<EnvironmentDraft, 'soilMoistureMin' | 'soilMoistureMax'>>;

/** Derive the Config Dialog's cross-tab environment-save capabilities once. */
export function deriveConfigDialogCapabilities(
  draft: EnvironmentSaveInputs,
  dirty: ReadonlySet<EnvironmentDraftKey> = new Set()
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
  // A dirty but half-complete or inverted Acceptable Moisture Band blocks the
  // whole save (ADR-0032) — the backend rejects a lone bound and fails every
  // other field along with it, so the dialog must not let the save start.
  if (
    isEnvironmentSaveBlockedByBand(
      { soilMoistureMin: draft.soilMoistureMin ?? null, soilMoistureMax: draft.soilMoistureMax ?? null },
      dirty
    )
  ) {
    return { canSaveEnvironment: false, environmentSaveBlockReason: 'moisture-band' };
  }
  return { canSaveEnvironment: true, environmentSaveBlockReason: null };
}
