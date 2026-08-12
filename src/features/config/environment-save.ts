/**
 * Environment Save Composer (ADR-0019, "Applied to Config Dialog")
 *
 * The single pure place that turns the Config Dialog's [[Shared Environment
 * Draft]] into the outbound `configure-environment-submit` event detail. It
 * exists because the backend applies **patch semantics** (GSM ADR-0026): an
 * omitted field keeps its stored value, while a present field — including an
 * empty list — is a deliberate set/clear. The Shared Environment Draft is
 * seeded complete by `envDraftFromDevice`, so composing the *whole* draft on
 * every env-tab save delivers every field explicitly: edits land, clears land
 * (present-empty), and nothing is left to the backend's keep-on-omit default.
 * That completeness is the property the unit test pins down.
 *
 * Architecture note: the Config Dialog persists the environment by dispatching
 * `configure-environment-submit`, which the Growspace Dialog Host fulfils as
 * `configure_environment` + a conditional, last-dispatched `configure_exhaust_fan`
 * (the host owns the detail→service mapping and the two-call orchestration — the
 * dialog does not call the service directly). So this composer produces the
 * **event detail**, not the `configure_environment` service payload. `needsExhaustCall`
 * is the shared predicate gating that second call; the host is its caller.
 */

import type { EnvironmentDraft } from '../../dialogs/config-dialog-sm';
import type { EnvironmentConfigEventDetail } from '../../lib/types/dialog';
import { bandSavePayload } from './moisture-band';

/** The two control-toggle flags that live on the dialog, outside the draft. */
export interface EnvironmentControlFlags {
  humidifierControlEnabled: boolean;
  dehumidifierControlEnabled: boolean;
}

/**
 * Pure composer: the whole Shared Environment Draft (+ the dialog's two control
 * toggles) → the `configure-environment-submit` event detail. Every field is
 * copied so the full-replace save never drops one.
 */
export function composeEnvironmentConfig(
  draft: EnvironmentDraft,
  flags: EnvironmentControlFlags
): EnvironmentConfigEventDetail {
  // Null when the band is mid-edit and incomplete: omitting both keys leaves
  // the stored band untouched (patch semantics) instead of sending a lone
  // bound, which the backend rejects — failing the entire environment save.
  const band = bandSavePayload({ min: draft.soilMoistureMin, max: draft.soilMoistureMax });

  return {
    selectedGrowspaceId: draft.selectedGrowspaceId,
    temperatureSensors: draft.temperatureSensors,
    humiditySensors: draft.humiditySensors,
    vpdSensors: draft.vpdSensors,
    co2Sensor: draft.co2Sensor,
    circulationFanEntities: draft.circulationFanEntities,
    stressThreshold: draft.stressThreshold,
    moldThreshold: draft.moldThreshold,
    lightSensors: draft.lightSensors,
    exhaustFanEntities: draft.exhaustFanEntities,
    exhaustFanAcInfinityDevices: draft.exhaustFanAcInfinityDevices,
    circulationFanAcInfinityDevices: draft.circulationFanAcInfinityDevices,
    humidifierEntities: draft.humidifierEntities,
    humidifierThresholds: draft.humidifierThresholds,
    humidifierControlEnabled: flags.humidifierControlEnabled,
    humidifierAcInfinityDevices: draft.humidifierAcInfinityDevices,
    dehumidifierEntities: draft.dehumidifierEntities,
    dehumidifierThresholds: draft.dehumidifierThresholds,
    dehumidifierControlEnabled: flags.dehumidifierControlEnabled,
    dehumidifierAcInfinityDevices: draft.dehumidifierAcInfinityDevices,
    soilMoistureSensor: draft.soilMoistureSensor,
    // Atomic pair, or omitted entirely while the draft is mid-edit — an
    // unfinished band must not destroy the stored one or fail the whole save.
    ...(band ? { soilMoistureMin: band.min, soilMoistureMax: band.max } : {}),
    sensorGroups: draft.sensorGroups,
    sensorCoordinates: draft.sensorCoordinates,
    irrigationTanks: draft.irrigationTanks,
    cameraEntities: draft.cameraEntities,
    lungroomTempSensors: draft.lungroomTempSensors,
    substrateTemperatureSensors: draft.substrateTemperatureSensors,
    phSensors: draft.phSensors,
    feedEcSensors: draft.feedEcSensors,
    bulkEcSensors: draft.bulkEcSensors,
    poreEcSensors: draft.poreEcSensors,
    runoffEcSensors: draft.runoffEcSensors,
    drainVolumeSensors: draft.drainVolumeSensors,
    irrigationFlowSensors: draft.irrigationFlowSensors,
    powerSensors: draft.powerSensors,
    energySensors: draft.energySensors,
    circulationFanConfig: draft.circulationFanConfig,
    exhaustFanConfig: draft.exhaustFanConfig,
    growlightEntities: draft.growlightEntities,
    growlightAcInfinityDevices: draft.growlightAcInfinityDevices,
    growlightConfig: draft.growlightConfig,
    vpdOptimalOverrides: draft.vpdOptimalOverrides,
    lstOffset: draft.lstOffset,
  };
}

/**
 * Whether a composed env payload needs the dedicated `configure_exhaust_fan`
 * second call — true exactly when it carries an exhaust fan config (the backend
 * `configure_environment` cannot persist `exhaust_fan_config`). The Growspace
 * Dialog Host is the caller; the Climate tab (#359) is the primary producer of
 * a non-default exhaust config.
 */
export function needsExhaustCall(
  payload: Pick<EnvironmentConfigEventDetail, 'exhaustFanConfig'>
): boolean {
  return Boolean(payload.exhaustFanConfig);
}
