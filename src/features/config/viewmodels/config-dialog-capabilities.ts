/**
 * Shared Config Dialog capabilities (ADR-0019).
 *
 * Cross-tab save gates belong here so the shell's affordances and submit paths
 * consume the same derivation instead of rebuilding policy independently.
 */

import type { EnvironmentDraft } from '../../../dialogs/config-dialog-sm';
import {
  environmentChangeVerdict,
  type EnvironmentChangeBlockReason,
  type EnvironmentDraftKey,
} from '../environment-change';

export type EnvironmentSaveBlockReason = EnvironmentChangeBlockReason;

export interface ConfigDialogCapabilities {
  canSaveEnvironment: boolean;
  environmentSaveBlockReason: EnvironmentSaveBlockReason | null;
}

type EnvironmentSaveInputs = Pick<
  EnvironmentDraft,
  'selectedGrowspaceId' | 'temperatureSensors' | 'humiditySensors'
> &
  Partial<Pick<EnvironmentDraft, 'soilMoistureMin' | 'soilMoistureMax'>>;

/** Derive the Config Dialog's cross-tab Environment Change capabilities once. */
export function deriveConfigDialogCapabilities(
  draft: EnvironmentSaveInputs,
  dirty: ReadonlySet<EnvironmentDraftKey> = new Set()
): ConfigDialogCapabilities {
  const verdict = environmentChangeVerdict({
    kind: 'shared-environment-draft',
    draft,
    dirty,
  });
  return verdict.ok
    ? { canSaveEnvironment: true, environmentSaveBlockReason: null }
    : { canSaveEnvironment: false, environmentSaveBlockReason: verdict.reason };
}
