/** Home Assistant wire translation for draft plans and narrow tank changes. */

import {
  type EnvironmentDraft,
  type EnvironmentDraftKey,
  type EnvironmentWritePlan,
} from './environment-draft';
import type { IrrigationTank } from '../../services/types';
import { bandSavePayload } from './moisture-band';

export interface TankConfigChange {
  growspaceId: string;
  irrigationTanks: readonly IrrigationTank[];
}

export interface ConfigureEnvironmentActionData extends Record<string, unknown> {
  growspace_id: string;
}

export interface ConfigureExhaustFanActionData extends Record<string, unknown> {
  growspace_id: string;
}

export interface EnvironmentChangeAdapter {
  configureEnvironment(payload: ConfigureEnvironmentActionData): Promise<void>;
  configureExhaustFan(payload: ConfigureExhaustFanActionData): Promise<void>;
}

function tankConfigs(value: unknown): unknown {
  return (value as readonly IrrigationTank[]).map((tank) => ({
    sensor_entity: tank.sensorEntity,
    name: tank.name,
    warning_level: tank.warningLevel,
    ...(tank.volumeLiters != null ? { volume_liters: tank.volumeLiters } : {}),
    ...(tank.staleAfterMinutes != null ? { stale_after_minutes: tank.staleAfterMinutes } : {}),
  }));
}

/** Most buffered field names map mechanically; these are wire contract exceptions. */
function wireKey(key: EnvironmentDraftKey): string {
  return key === 'lungroomTempSensors'
    ? 'lung_room_temp_sensors'
    : key.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
}

function wireValue(key: EnvironmentDraftKey, value: unknown): unknown {
  if (key === 'co2Sensor' || key === 'soilMoistureSensor') return value || null;
  if (key === 'irrigationTanks') return tankConfigs(value);
  return value;
}

function wireEnvironment(
  fields: Readonly<Partial<EnvironmentDraft>>,
  growspaceId: string
): ConfigureEnvironmentActionData {
  const payload: ConfigureEnvironmentActionData = { growspace_id: growspaceId };
  for (const key of Object.keys(fields) as EnvironmentDraftKey[]) {
    if (key === 'soilMoistureMin' || key === 'soilMoistureMax') continue;
    const value = fields[key];
    if ((key === 'stressThreshold' || key === 'moldThreshold') && value == null) continue;
    payload[wireKey(key)] = wireValue(key, value);
  }
  if ('soilMoistureMin' in fields || 'soilMoistureMax' in fields) {
    const band = bandSavePayload({
      min: fields.soilMoistureMin ?? null,
      max: fields.soilMoistureMax ?? null,
    });
    if (!band) throw new Error('Invalid planned moisture band');
    payload.soil_moisture_min = band.min;
    payload.soil_moisture_max = band.max;
  }
  return payload;
}

export async function executeEnvironmentWritePlan(
  plan: EnvironmentWritePlan,
  adapter: EnvironmentChangeAdapter
): Promise<void> {
  for (const command of plan) {
    if (command.kind === 'configure-environment') {
      await adapter.configureEnvironment(wireEnvironment(command.fields, command.growspaceId));
    } else {
      await adapter.configureExhaustFan({ growspace_id: command.growspaceId, ...command.config });
    }
  }
}

/** The Irrigation Dialog writes Tank Config without a Shared Environment Draft. */
export async function applyTankConfigChange(
  change: TankConfigChange,
  adapter: EnvironmentChangeAdapter
): Promise<void> {
  if (!change.growspaceId) throw new Error('Tank Config Change requires a growspace');
  await adapter.configureEnvironment({
    growspace_id: change.growspaceId,
    irrigation_tanks: tankConfigs(change.irrigationTanks),
  });
}
