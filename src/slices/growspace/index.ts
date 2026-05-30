import { z } from 'zod';
import { atom } from 'nanostores';
import { hassCall, callService } from '../../services/hass-call';
import { mutate } from '../../services/mutate';
import { GrowspaceAdapter } from '../../adapters/growspace-adapter';
import { GrowspaceAPICollectionSchema, GrowReportSchema, type GrowReport } from './schema';
import type { SensorGroup } from '../../features/environment/types';
import type { GrowspaceDevice, GrowspaceAPIResponse } from '../../services/types';

export const growspaceDevices$ = atom<GrowspaceDevice[] | null>(null);

export function getGrowspaceDevices(): GrowspaceDevice[] {
  return growspaceDevices$.get() ?? [];
}

export async function addGrowspace(data: {
  name: string;
  rows: number;
  plantsPerRow: number;
  notificationService?: string;
}): Promise<void> {
  await callService('growspace_manager', 'add_growspace', {
    name: data.name,
    rows: data.rows,
    plants_per_row: data.plantsPerRow,
    notification_target: data.notificationService,
  });
}

export async function removeGrowspace(growspaceId: string): Promise<void> {
  await callService('growspace_manager', 'remove_growspace', { growspace_id: growspaceId });
}

export async function updateGrowspace(data: {
  growspaceId: string;
  name?: string;
  rows?: number;
  plantsPerRow?: number;
  notificationService?: string;
}): Promise<void> {
  const previous = growspaceDevices$.get();

  const payload: Record<string, unknown> = { growspace_id: data.growspaceId };
  if (data.name !== undefined) payload.name = data.name;
  if (data.rows !== undefined) payload.rows = data.rows;
  if (data.plantsPerRow !== undefined) payload.plants_per_row = data.plantsPerRow;
  if (data.notificationService !== undefined) payload.notification_target = data.notificationService;

  await mutate(
    {
      type: 'updateGrowspace',
      optimistic: () => {
        if (!previous) return;
        growspaceDevices$.set(
          previous.map((d) =>
            d.deviceId === data.growspaceId
              ? {
                  ...d,
                  ...(data.name !== undefined && { name: data.name }),
                  ...(data.rows !== undefined && { rows: data.rows }),
                  ...(data.plantsPerRow !== undefined && { plantsPerRow: data.plantsPerRow }),
                  ...(data.notificationService !== undefined && {
                    notificationTarget: data.notificationService,
                  }),
                }
              : d
          )
        );
      },
      inverse: () => growspaceDevices$.set(previous),
      apply: () => callService('growspace_manager', 'update_growspace', payload),
    },
    data.growspaceId
  );
}

export async function exportGrowReport(growspaceId: string): Promise<void> {
  await callService('growspace_manager', 'export_grow_report', {
    growspace_id: growspaceId,
    format: 'json',
  });
}

export async function fetchGrowReport(growspaceId: string): Promise<GrowReport> {
  return hassCall('growspace_manager/get_grow_report', { growspace_id: growspaceId }, GrowReportSchema);
}

export async function removeEnvironment(growspaceId: string): Promise<void> {
  await callService('growspace_manager', 'remove_environment', { growspace_id: growspaceId });
}

export async function resetWaterTracking(growspaceId: string): Promise<void> {
  await callService('growspace_manager', 'reset_water_tracking', { growspace_id: growspaceId });
}

export async function setDehumidifierControl(growspaceId: string, enabled: boolean): Promise<void> {
  await callService('growspace_manager', 'set_dehumidifier_control', {
    growspace_id: growspaceId,
    enabled,
  });
}

export async function setHumidifierControl(growspaceId: string, enabled: boolean): Promise<void> {
  await callService('growspace_manager', 'set_humidifier_control', {
    growspace_id: growspaceId,
    enabled,
  });
}

export async function updateSensorCoordinates(
  growspaceId: string,
  entityId: string,
  x: number,
  y: number,
  zCoord: number,
  rotation?: number
): Promise<void> {
  await hassCall(
    'growspace_manager/update_sensor_coordinates',
    {
      growspace_id: growspaceId,
      entity_id: entityId,
      x: Math.round(x),
      y: Math.round(y),
      z: Math.round(zCoord),
      rotation: rotation !== undefined ? Math.round(rotation) : undefined,
    },
    z.unknown()
  );
}

export async function configureEnvironment(data: {
  growspaceId: string;
  temperatureSensors?: string[];
  humiditySensors?: string[];
  vpdSensors?: string[];
  co2Sensor?: string;
  circulationFanEntity?: string;
  circulationFanEntities?: string[];
  stressThreshold?: number;
  moldThreshold?: number;
  lightSensor?: string;
  lightSensors?: string[];
  exhaustEntity?: string;
  exhaustFanEntities?: string[];
  humidifierEntity?: string;
  humidifierEntities?: string[];
  humidifierThresholds?: Record<string, Record<string, { on: number; off: number }>>;
  controlHumidifier?: boolean;
  dehumidifierEntity?: string;
  dehumidifierEntities?: string[];
  dehumidifierThresholds?: Record<string, Record<string, { on: number; off: number }>>;
  soilMoistureSensor?: string;
  controlDehumidifier?: boolean;
  vegDayHours?: number;
  flowerEarlyDayHours?: number;
  flowerMidDayHours?: number;
  flowerLateDayHours?: number;
  minimumSourceAirTemperature?: number;
  sensorGroups?: SensorGroup[];
  sensorCoordinates?: Record<string, { x: number; y: number; z: number; rotation?: number }>;
  irrigationTanks?: { sensorEntity: string; name: string; warningLevel: number; volumeLiters?: number | null }[];
  cameraEntities?: string[];
  lungroomTempSensors?: string[];
  substrateTemperatureSensors?: string[];
  phSensors?: string[];
  feedEcSensors?: string[];
  substrateEcSensors?: string[];
  runoffEcSensors?: string[];
  drainVolumeSensors?: string[];
  irrigationFlowSensors?: string[];
  powerSensors?: string[];
  energySensors?: string[];
}): Promise<void> {
  const payload: Record<string, unknown> = { growspace_id: data.growspaceId };

  if (data.temperatureSensors?.length) payload.temperature_sensors = data.temperatureSensors;
  if (data.humiditySensors?.length) payload.humidity_sensors = data.humiditySensors;
  if (data.vpdSensors?.length) payload.vpd_sensors = data.vpdSensors;
  if (data.co2Sensor) payload.co2_sensor = data.co2Sensor;
  if (data.circulationFanEntity) payload.circulation_fan_entity = data.circulationFanEntity;
  if (data.circulationFanEntities) payload.circulation_fan_entities = data.circulationFanEntities;
  if (data.stressThreshold) payload.stress_threshold = data.stressThreshold;
  if (data.moldThreshold) payload.mold_threshold = data.moldThreshold;
  if (data.lightSensor) payload.light_sensor = data.lightSensor;
  if (data.lightSensors) payload.light_sensors = data.lightSensors;
  if (data.exhaustEntity) payload.exhaust_entity = data.exhaustEntity;
  if (data.exhaustFanEntities) payload.exhaust_fan_entities = data.exhaustFanEntities;
  if (data.humidifierEntity) payload.humidifier_entity = data.humidifierEntity;
  if (data.humidifierEntities) payload.humidifier_entities = data.humidifierEntities;
  if (data.humidifierThresholds) payload.humidifier_thresholds = data.humidifierThresholds;
  if (data.controlHumidifier !== undefined) payload.control_humidifier = data.controlHumidifier;
  if (data.dehumidifierEntity) payload.dehumidifier_entity = data.dehumidifierEntity;
  if (data.dehumidifierEntities) payload.dehumidifier_entities = data.dehumidifierEntities;
  if (data.dehumidifierThresholds) payload.dehumidifier_thresholds = data.dehumidifierThresholds;
  if (data.soilMoistureSensor) payload.soil_moisture_sensor = data.soilMoistureSensor;
  if (data.controlDehumidifier !== undefined) payload.control_dehumidifier = data.controlDehumidifier;
  if (data.vegDayHours) payload.veg_day_hours = data.vegDayHours;
  if (data.flowerEarlyDayHours) payload.flower_early_day_hours = data.flowerEarlyDayHours;
  if (data.flowerMidDayHours) payload.flower_mid_day_hours = data.flowerMidDayHours;
  if (data.flowerLateDayHours) payload.flower_late_day_hours = data.flowerLateDayHours;
  if (data.minimumSourceAirTemperature) payload.minimum_source_air_temperature = data.minimumSourceAirTemperature;
  if (data.sensorGroups) payload.sensor_groups = data.sensorGroups;
  if (data.sensorCoordinates) payload.sensor_coordinates = data.sensorCoordinates;
  if (data.irrigationTanks?.length) {
    payload.irrigation_tanks = data.irrigationTanks.map((t) => ({
      sensor_entity: t.sensorEntity,
      name: t.name,
      warning_level: t.warningLevel,
      ...(t.volumeLiters != null ? { volume_liters: t.volumeLiters } : {}),
    }));
  }
  if (data.cameraEntities) payload.camera_entities = data.cameraEntities;
  if (data.lungroomTempSensors) payload.lung_room_temp_sensors = data.lungroomTempSensors;
  if (data.substrateTemperatureSensors?.length) payload.substrate_temperature_sensors = data.substrateTemperatureSensors;
  if (data.phSensors?.length) payload.ph_sensors = data.phSensors;
  if (data.feedEcSensors?.length) payload.feed_ec_sensors = data.feedEcSensors;
  if (data.substrateEcSensors?.length) payload.substrate_ec_sensors = data.substrateEcSensors;
  if (data.runoffEcSensors?.length) payload.runoff_ec_sensors = data.runoffEcSensors;
  if (data.drainVolumeSensors?.length) payload.drain_volume_sensors = data.drainVolumeSensors;
  if (data.irrigationFlowSensors?.length) payload.irrigation_flow_sensors = data.irrigationFlowSensors;
  if (data.powerSensors?.length) payload.power_sensors = data.powerSensors;
  if (data.energySensors?.length) payload.energy_sensors = data.energySensors;

  await callService('growspace_manager', 'configure_environment', payload);
}

export async function fetchGrowspaceData(): Promise<void> {
  const collection = await hassCall('growspace_manager/get_data', {}, GrowspaceAPICollectionSchema);
  const devices = Object.values(collection)
    .map((wsData) => GrowspaceAdapter.transformGrowspace(null, wsData as GrowspaceAPIResponse))
    .filter((d): d is GrowspaceDevice => d !== null);
  growspaceDevices$.set(devices);
}
