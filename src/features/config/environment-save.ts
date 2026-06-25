/**
 * Environment Save Composer (ADR-0019, "Applied to Config Dialog")
 *
 * The single pure place that turns the Config Dialog's [[Shared Environment
 * Draft]] into the outbound `configure-environment-submit` event detail. It
 * exists because `configure_environment` is a **full replace** — the backend
 * rebuilds `EnvironmentConfig` and silently resets any field absent from the
 * payload. The Shared Environment Draft is seeded complete by `envDraftFromDevice`,
 * so composing the *whole* draft on every env-tab save re-sends a complete
 * config; a sensor-only edit never clobbers fan/irrigation/exhaust fields. That
 * full-replace safety is the property the unit test pins down.
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
    humidifierEntities: draft.humidifierEntities,
    humidifierThresholds: draft.humidifierThresholds,
    humidifierControlEnabled: flags.humidifierControlEnabled,
    dehumidifierEntities: draft.dehumidifierEntities,
    dehumidifierThresholds: draft.dehumidifierThresholds,
    dehumidifierControlEnabled: flags.dehumidifierControlEnabled,
    soilMoistureSensor: draft.soilMoistureSensor,
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
