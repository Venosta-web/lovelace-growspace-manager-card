/**
 * Environment Save Composer (ADR-0032, superseding ADR-0019's full-draft note)
 *
 * The single pure place that turns the Config Dialog's [[Shared Environment
 * Draft]] plus its dirty write set into the outbound
 * `configure-environment-submit` event detail.
 *
 * The backend applies **patch semantics** (GSM ADR-0026): an omitted field
 * keeps its stored value, while a present field — including `null`, `''`, `[]`,
 * or `{}` — is a deliberate set or clear. The composer therefore emits the
 * growspace routing ID plus *only the dirty persisted keys*. A field nobody
 * edited never appears in the payload, so it can never be overwritten with the
 * default the draft merely displays. That is the property the old whole-draft
 * composer could not offer: it made every seeding gap a silent data loss.
 *
 * Consequences worth remembering:
 *
 * - Dirtiness is user intent, not difference from the seeded value. A dirty key
 *   whose value is empty stays in the patch and expresses a clear.
 * - `soilMoistureMin`/`soilMoistureMax` are one atomic group. Both or neither
 *   reach the wire; an incomplete or invalid dirty pair blocks Save outright
 *   rather than being silently dropped, because a lone bound fails the entire
 *   `configure_environment` call.
 * - The humidity control flags are immediate-persist and never ride this patch.
 *
 * Architecture note: the Config Dialog persists the environment by dispatching
 * `configure-environment-submit`, which the Growspace Dialog Host fulfils as
 * `configure_environment` plus a conditional `configure_exhaust_fan` (the host
 * owns the detail→service mapping). So this composer produces the **event
 * detail**, not the `configure_environment` service payload. `needsExhaustCall`
 * is the shared predicate gating that second call.
 */

import type { EnvironmentDraft } from '../../dialogs/config-dialog-sm';
import type { EnvironmentConfigEventDetail } from '../../lib/types/dialog';
import { bandSavePayload } from './moisture-band';
import {
  ENV_PERSISTENCE,
  bufferedDirtyKeys,
  isGroupDirty,
  type EnvironmentDraftKey,
} from './environment-persistence';

/** Draft keys the composer never copies verbatim — they need their own handling. */
const MANUALLY_COMPOSED: ReadonlySet<EnvironmentDraftKey> = new Set([
  'soilMoistureMin',
  'soilMoistureMax',
]);

/**
 * Whether the dirty moisture band can be saved.
 *
 * Only meaningful when the group is dirty: an untouched band is simply omitted.
 * A dirty band that is half-filled or inverted must block Save, since the
 * backend rejects a lone bound and fails the whole environment save with it.
 */
export function isEnvironmentSaveBlockedByBand(
  draft: Pick<EnvironmentDraft, 'soilMoistureMin' | 'soilMoistureMax'>,
  dirty: ReadonlySet<EnvironmentDraftKey>
): boolean {
  if (!isGroupDirty(dirty, ['soilMoistureMin', 'soilMoistureMax'])) return false;
  return bandSavePayload({ min: draft.soilMoistureMin, max: draft.soilMoistureMax }) === null;
}

/**
 * Pure composer: the Shared Environment Draft plus its dirty write set → the
 * sparse `configure-environment-submit` event detail.
 */
export function composeEnvironmentConfig(
  draft: EnvironmentDraft,
  dirty: ReadonlySet<EnvironmentDraftKey>
): EnvironmentConfigEventDetail {
  const detail: Record<string, unknown> = {
    // Routing metadata: always present, never a patch field.
    selectedGrowspaceId: draft.selectedGrowspaceId,
  };

  for (const key of bufferedDirtyKeys(dirty)) {
    if (MANUALLY_COMPOSED.has(key)) continue;
    detail[key] = draft[key];
  }

  // Atomic pair. `bandSavePayload` returns both bounds for a valid custom pair
  // or a clean two-null clear, and null for an incomplete/invalid pair — which
  // `isEnvironmentSaveBlockedByBand` has already turned into a blocked Save.
  if (isGroupDirty(dirty, ['soilMoistureMin', 'soilMoistureMax'])) {
    const band = bandSavePayload({ min: draft.soilMoistureMin, max: draft.soilMoistureMax });
    if (band) {
      detail.soilMoistureMin = band.min;
      detail.soilMoistureMax = band.max;
    }
  }

  // The exhaust config rides the detail so the host can forward it to its
  // dedicated service, but only when the user actually edited it.
  if (dirty.has('exhaustFanConfig') && ENV_PERSISTENCE.exhaustFanConfig === 'dedicated') {
    detail.exhaustFanConfig = draft.exhaustFanConfig;
  }

  return detail as unknown as EnvironmentConfigEventDetail;
}

/**
 * Whether a composed env payload needs the dedicated `configure_exhaust_fan`
 * second call — true exactly when the composer emitted an exhaust fan config,
 * i.e. the user edited it. `configure_environment` cannot persist
 * `exhaust_fan_config`, and under patch semantics it preserves the stored one,
 * so an unrelated edit must not trigger this call.
 */
export function needsExhaustCall(
  payload: Pick<EnvironmentConfigEventDetail, 'exhaustFanConfig'>
): boolean {
  return 'exhaustFanConfig' in payload && payload.exhaustFanConfig !== undefined;
}
