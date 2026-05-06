import {
  mdiThermometer,
  mdiWaterPercent,
  mdiCloudOutline,
  mdiWeatherCloudy,
  mdiLightbulbOn,
  mdiLightbulbOff,
  mdiWater,
  mdiRadioboxMarked,
  mdiRadioboxBlank,
  mdiFan,
  mdiAirHumidifier,
  mdiAirHumidifierOff,
  mdiWaterMinus,
  mdiBarrel,
  mdiWeatherSunny,
  mdiSprout,
  mdiFlash,
} from '@mdi/js';
import { HomeAssistant } from 'custom-card-helpers';
import { HassEntity } from 'home-assistant-js-websocket';
import { DateTime } from 'luxon';
import { GrowspaceDevice, IrrigationTime, SerializedEnvironmentAttributes, EnvironmentAttributes } from '../types';
import { MetricKey, EntityState, StatusLevel } from '../constants';
import { PlantUtils } from './plant-utils';

/** Represents a chip displayed in the header */
export interface HeaderChip {
  key: string;
  icon: string;
  value: string;
  multiValues?: string[];
  entityIds?: string[];
  label?: string;
  status?: string;
  tooltip?: string;
  active: boolean;
  linked: boolean;
  groupIndex: number;
}

/** Represents the dominant plant stage info */
export interface DominantStageInfo {
  icon: string;
  daysLabel: string;
  weeksLabel: string;
}

export class MetricsUtils {
  private static _getAttributeValue(ent: HassEntity | undefined, key: string): unknown {
    if (!ent || !ent.attributes) return undefined;
    if (ent.attributes[key] !== undefined) return ent.attributes[key];
    if (ent.attributes.observations && typeof ent.attributes.observations === 'object') {
      return ent.attributes.observations[key];
    }
    return undefined;
  }

  private static _isMetricLinked(
    metric: string,
    linkedGraphGroups: string[][]
  ): { linked: boolean; groupIndex: number } {
    if (!linkedGraphGroups) return { linked: false, groupIndex: -1 };

    for (let i = 0; i < linkedGraphGroups.length; i++) {
      if (linkedGraphGroups[i].includes(metric)) {
        return { linked: true, groupIndex: i };
      }
    }
    return { linked: false, groupIndex: -1 };
  }

  static computeHeaderMetrics(
    hass: HomeAssistant,
    device: GrowspaceDevice,
    activeEnvGraphs: Set<string>,
    linkedGraphGroups: string[][]
  ): {
    mainChips: HeaderChip[];
    deviceChips: HeaderChip[];
    dominant: DominantStageInfo | undefined;
    envAttrs: SerializedEnvironmentAttributes;
  } {
    if (!device || !hass)
      return { mainChips: [], deviceChips: [], dominant: undefined, envAttrs: {} };

    const dominantRaw = PlantUtils.getDominantStage(device.plants);
    let dominant;
    if (dominantRaw) {
      const stageName = dominantRaw.stage.charAt(0).toUpperCase() + dominantRaw.stage.slice(1);
      const weeks = Math.floor((dominantRaw.days - 1) / 7) + 1;
      const icon = PlantUtils.getPlantStageIcon(dominantRaw.stage);

      dominant = {
        icon,
        daysLabel: `${dominantRaw.days} Day${dominantRaw.days !== 1 ? 's' : ''} ${stageName}`,
        weeksLabel: `${weeks} Week${weeks !== 1 ? 's' : ''} ${stageName}`,
      };
    }

    // Fetch Environmental Data
    let slug = device.name.toLowerCase().replace(/\s+/g, '_');
    if (device.overviewEntityId) {
      slug = device.overviewEntityId.replace('sensor.', '').replace(/_overview$/, '');
    }

    let envEntityId = `binary_sensor.${slug}_optimal_conditions`;
    const isCure = slug === 'cure';
    const isDry = slug === 'dry';

    if (isCure) {
      envEntityId = `binary_sensor.cure_optimal_curing`;
    } else if (isDry) {
      envEntityId = `binary_sensor.dry_optimal_drying`;
    }

    const envEntity = hass.states[envEntityId];
    const overviewEntity = device.overviewEntityId
      ? hass.states[device.overviewEntityId]
      : undefined;
    const envAttrs: EnvironmentAttributes =
      device.environmentAttributes ||
      (overviewEntity?.attributes as unknown as EnvironmentAttributes) ||
      {};

    const temp = this._getAttributeValue(envEntity, 'temperature');
    const hum = this._getAttributeValue(envEntity, 'humidity');
    let vpd = this._getAttributeValue(envEntity, 'vpd');

    // VPD Fallback Logic
    if (vpd === undefined || vpd === null) {
      if (envAttrs.vpdSensor) {
        const vpdState = hass.states[envAttrs.vpdSensor];
        if (
          vpdState &&
          vpdState.state !== EntityState.UNKNOWN &&
          vpdState.state !== EntityState.UNAVAILABLE
        ) {
          const val = parseFloat(vpdState.state);
          if (!isNaN(val)) vpd = val;
        }
      }
      if (vpd === undefined || vpd === null) {
        // Calculated VPD fallback
        // 1. Try Name-based ID (New Standard)
        const slugify = (text: string) =>
          text
            .toString()
            .toLowerCase()
            .replace(/\s+/g, '_')
            .replace(/[^\w-]+/g, '')
            .replace(/[_-]+/g, '_')
            .replace(/^[_-]+/, '')
            .replace(/[_-]+$/, '');

        const calcName = `${device.name} Calculated VPD`;
        const calculatedId = `sensor.${slugify(calcName)}`;
        let vpdState = hass.states[calculatedId];

        // 2. Try UUID-based ID (Old Legacy)
        if (
          !vpdState ||
          vpdState.state === EntityState.UNKNOWN ||
          vpdState.state === EntityState.UNAVAILABLE
        ) {
          const oldId = `sensor.${device.deviceId}_calculated_vpd`;
          const oldState = hass.states[oldId];
          if (
            oldState &&
            oldState.state !== EntityState.UNKNOWN &&
            oldState.state !== EntityState.UNAVAILABLE
          ) {
            vpdState = oldState;
          }
        }

        if (
          vpdState &&
          vpdState.state !== EntityState.UNKNOWN &&
          vpdState.state !== EntityState.UNAVAILABLE
        ) {
          const val = parseFloat(vpdState.state);
          if (!isNaN(val)) vpd = val;
        }
      }
    }

    let vpdStatus = overviewEntity?.attributes?.vpd_status;
    const vpdTargetMin = overviewEntity?.attributes?.vpd_target_min;
    const vpdTargetMax = overviewEntity?.attributes?.vpd_target_max;
    const vpdDangerMin = overviewEntity?.attributes?.vpd_danger_min;
    const vpdDangerMax = overviewEntity?.attributes?.vpd_danger_max;

    if (
      (!vpdStatus || vpdStatus === EntityState.UNKNOWN) &&
      vpd !== undefined &&
      vpd !== null &&
      vpdTargetMin !== undefined &&
      vpdTargetMax !== undefined &&
      vpdDangerMin !== undefined &&
      vpdDangerMax !== undefined
    ) {
      if (vpd < vpdDangerMin || vpd > vpdDangerMax) {
        vpdStatus = StatusLevel.DANGER;
      } else if (vpd < vpdTargetMin || vpd > vpdTargetMax) {
        vpdStatus = StatusLevel.WARNING;
      } else {
        vpdStatus = StatusLevel.OPTIMAL;
      }
    }

    const isSpecialGrowspace = isCure || isDry;
    const co2Value = this._getAttributeValue(envEntity, 'co2');
    const co2 =
      isSpecialGrowspace || co2Value === undefined || co2Value === null ? undefined : co2Value;

    const isLightsOnValue = this._getAttributeValue(envEntity, 'is_lights_on');
    const hasLightSensor =
      !isSpecialGrowspace && isLightsOnValue !== undefined && isLightsOnValue !== null;
    const isLightsOn = isLightsOnValue === true;

    const getNextEvent = (times?: IrrigationTime[]): string | undefined => {
      if (!times || !times.length) return undefined;
      const now = DateTime.now();
      const upcoming = times
        .filter((t) => t && (t.time || t.start_time)) // Support both time and start_time
        .map((t) => {
          // Handle both 'time' and 'start_time' properties
          const timeStr = (t.time || t.start_time)!; // Non-null assertion safe due to filter
          // Handle both HH:MM and HH:MM:SS formats
          const parts = timeStr.split(':');
          const h = Number(parts[0]);
          const m = Number(parts[1]);
          let dt = now.set({ hour: h, minute: m, second: 0 });
          if (dt < now) dt = dt.plus({ days: 1 });
          return dt;
        })
        .sort((a, b) => a.toMillis() - b.toMillis())[0];
      return upcoming?.toFormat('HH:mm');
    };

    const nextIrrigation = getNextEvent(device.irrigationConfig?.irrigationTimes);
    const nextDrain = getNextEvent(device.irrigationConfig?.drainTimes);

    // Aggregate core sensors
    const getAggregateSensorState = (
      single: string | undefined,
      multi: string[] | undefined,
      unit: string,
      fallbackValue?: string | number
    ): { value: string | undefined; multiValues?: string[]; entityIds?: string[] } => {
      const ids = new Set<string>();
      if (multi && multi.length > 0) multi.forEach((id) => ids.add(id));
      else if (single) ids.add(single);

      if (ids.size === 0) {
        if (fallbackValue !== undefined && fallbackValue !== null) {
          const sVal = String(fallbackValue);
          const fVal = parseFloat(sVal);
          const isValid =
            !isNaN(fVal) || sVal === EntityState.UNKNOWN || sVal === EntityState.UNAVAILABLE || sVal === '';

          if (isValid) {
            return { value: fallbackValue + unit, entityIds: [] };
          }
        }
        return { value: undefined, entityIds: [] };
      }

      const states: string[] = [];
      const entityIds: string[] = Array.from(ids);

      ids.forEach((id) => {
        const s = hass.states[id];
        if (
          s &&
          s.state &&
          s.state !== EntityState.UNAVAILABLE &&
          s.state !== EntityState.UNKNOWN
        ) {
          const fVal = parseFloat(s.state);
          if (!isNaN(fVal) || s.state === '') {
            states.push(s.state + unit);
          } else {
            states.push('-');
          }
        } else {
          states.push('-');
        }
      });

      if (ids.size > 1) {
        return { value: 'Multiple', multiValues: states, entityIds };
      }

      let singleValue = states[0] !== '-' ? states[0] : undefined;
      if (singleValue === undefined && fallbackValue !== undefined && fallbackValue !== null) {
        const sVal = String(fallbackValue);
        const fVal = parseFloat(sVal);
        const isValid =
          !isNaN(fVal) || sVal === EntityState.UNKNOWN || sVal === EntityState.UNAVAILABLE || sVal === '';

        if (isValid) {
          singleValue = sVal + unit;
        }
      }

      return { value: singleValue, entityIds };
    };

    const tempAgg = getAggregateSensorState(
      envAttrs.temperatureSensor,
      envAttrs.temperatureSensors,
      '°C',
      temp as string | number | undefined
    );
    const humAgg = getAggregateSensorState(
      envAttrs.humiditySensor,
      envAttrs.humiditySensors,
      '%',
      hum as string | number | undefined
    );
    const vpdAgg = getAggregateSensorState(
      envAttrs.vpdSensor,
      envAttrs.vpdSensors,
      ' kPa',
      vpd as string | number | undefined
    );
    const co2Agg = getAggregateSensorState(
      envAttrs.co2Sensor,
      envAttrs.co2Sensors,
      ' ppm',
      co2 as string | number | undefined
    );
    const soilAgg = getAggregateSensorState(
      envAttrs.soilMoistureSensor,
      envAttrs.soilMoistureSensors,
      '%',
      this._getAttributeValue(overviewEntity, 'soil_moisture_value') as string | number | undefined
    );

    // Calculate aggregate irrigation tank level with depletion time
    const tanks = envAttrs.irrigationTanks || [];
    let tankLevelValue: string | undefined;
    let tankEntityIds: string[] = [];
    let tankMultiValues: string[] | undefined;
    let tankStatus: string | undefined;
    let tankTooltip: string | undefined;

    // New metrics: DLI, Crop Steering, Substrate Temp, Energy, Water
    const dliEntityId = `sensor.${slug}_dli`;
    const dliState = hass.states[dliEntityId];
    const dliValue = dliState && dliState.state !== EntityState.UNKNOWN && dliState.state !== EntityState.UNAVAILABLE
      ? dliState.state
      : undefined;

    const cropSteeringEntityId = `sensor.${slug}_crop_steering`;
    const cropSteeringState = hass.states[cropSteeringEntityId];
    const cropSteeringValue = cropSteeringState && cropSteeringState.state !== EntityState.UNKNOWN && cropSteeringState.state !== EntityState.UNAVAILABLE
      ? cropSteeringState.state
      : undefined;

    const energyValue = device.energyTracking?.dailyKwh != null
      ? device.energyTracking.dailyKwh.toFixed(2)
      : undefined;

    const waterValue = device.waterUsage?.litersToday != null
      ? device.waterUsage.litersToday.toFixed(1)
      : undefined;

    const substrateTempAgg = getAggregateSensorState(
      undefined,
      envAttrs.substrateTemperatureSensors,
      '°C'
    );

    if (tanks.length > 0) {
      tankEntityIds = tanks.map(t => t.sensorEntity).filter(Boolean);

      // Helper: Format hours remaining as "Xh" or "Xd"
      const formatTimeRemaining = (hours: number | null | undefined): string => {
        if (hours === null || hours === undefined) return '';
        if (hours >= 48) {
          const days = Math.floor(hours / 24);
          return ` ${days}d`;
        }
        return ` ${Math.round(hours)}h`;
      };

      // Helper: Determine status color based on hours remaining
      const getTankDepletionStatus = (
        hoursRemaining: number | null | undefined,
        depletionStatus: string | null | undefined
      ): string | undefined => {
        // No color if no data or not depleting
        if (depletionStatus === 'insufficient_data' || depletionStatus === null) return undefined;
        if (depletionStatus === 'static' || depletionStatus === 'refilling') return StatusLevel.OPTIMAL;

        if (hoursRemaining === null || hoursRemaining === undefined) return undefined;

        if (hoursRemaining < 12) return StatusLevel.DANGER;
        if (hoursRemaining < 24) return StatusLevel.WARNING;
        if (hoursRemaining >= 48) return StatusLevel.OPTIMAL;

        return undefined; // 24-48 hours = no special color
      };

      if (tanks.length === 1) {
        const tank = tanks[0];
        if (tank.fillLevel !== null && tank.fillLevel !== undefined) {
          const fillPct = Math.round(tank.fillLevel);
          const timeStr = formatTimeRemaining(tank.hoursRemaining);
          tankLevelValue = `${fillPct}%${timeStr}`;
          tankStatus = getTankDepletionStatus(tank.hoursRemaining, tank.depletionStatus);

          // Build tooltip
          if (tank.hoursRemaining !== null && tank.hoursRemaining !== undefined) {
            tankTooltip = `${tank.name}: ${fillPct}% (${Math.round(tank.hoursRemaining)}h remaining)`;
          }
        }
      } else {
        // Multiple tanks - compute average and show individual values
        const validLevels = tanks.filter(t => t.fillLevel !== null && t.fillLevel !== undefined);
        if (validLevels.length > 0) {
          tankMultiValues = validLevels.map(t => {
            const fillPct = Math.round(t.fillLevel!);
            const timeStr = formatTimeRemaining(t.hoursRemaining);
            return `${fillPct}%${timeStr}`;
          });

          const avg = validLevels.reduce((sum, t) => sum + t.fillLevel!, 0) / validLevels.length;
          tankLevelValue = `${Math.round(avg)}%`;

          // Use most urgent status
          const statuses = tanks
            .map(t => getTankDepletionStatus(t.hoursRemaining, t.depletionStatus))
            .filter(Boolean);

          if (statuses.includes(StatusLevel.DANGER)) {
            tankStatus = StatusLevel.DANGER;
          } else if (statuses.includes(StatusLevel.WARNING)) {
            tankStatus = StatusLevel.WARNING;
          } else if (statuses.includes(StatusLevel.OPTIMAL)) {
            tankStatus = StatusLevel.OPTIMAL;
          }

          tankTooltip = `${tanks.length} tanks`;
        }
      }
    }

    // Build Chips
    const createChipData = (
      key: string,
      icon: string,
      value: string | undefined,
      multiValues: string[] | undefined,
      entityIds?: string[],
      label?: string,
      status?: string,
      tooltip?: string
    ) => {
      if (value === undefined && (!multiValues || multiValues.length === 0)) return null;
      const { linked, groupIndex } = this._isMetricLinked(key, linkedGraphGroups);
      const hasCompositeActive = Array.from(activeEnvGraphs).some((k) => k.startsWith(`${key}:`));
      const active = activeEnvGraphs.has(key) || hasCompositeActive;
      return {
        key,
        icon,
        value: value || '',
        multiValues,
        entityIds,
        label,
        status,
        tooltip,
        active,
        linked,
        groupIndex,
      };
    };

    let optimalLabel = 'Optimal Conditions';
    if (envEntity && envEntity.state !== EntityState.ON) {
      const reasons = envEntity.attributes.reasons;
      if (reasons && reasons.length > 0) {
        const reasonText = Array.isArray(reasons) ? reasons.join(', ') : reasons;
        optimalLabel = `Not Optimal: ${reasonText}`;
      } else {
        optimalLabel = 'Not Optimal';
      }
    }

    const mainChips = [
      createChipData(
        MetricKey.TEMPERATURE,
        mdiThermometer,
        tempAgg.value,
        tempAgg.multiValues,
        tempAgg.entityIds,
        undefined,
        undefined,
        'Current air temperature in the grow space. Optimal range: 20–28°C (68–82°F) during lights-on.'
      ),
      createChipData(
        MetricKey.HUMIDITY,
        mdiWaterPercent,
        humAgg.value,
        humAgg.multiValues,
        humAgg.entityIds,
        undefined,
        undefined,
        'Relative humidity (RH). Target depends on growth stage — veg: 50–70%, flower: 40–55%, late flower: 35–45%.'
      ),
      createChipData(
        MetricKey.VPD,
        mdiCloudOutline,
        vpdAgg.value,
        vpdAgg.multiValues,
        vpdAgg.entityIds,
        undefined,
        vpdStatus,
        vpdTargetMin !== undefined && vpdTargetMax !== undefined
          ? `VPD: ${vpd} kPa (Target: ${vpdTargetMin}-${vpdTargetMax})`
          : 'Vapour Pressure Deficit — the balance between temperature and humidity. The key metric for transpiration. Veg: 0.8–1.2 kPa, flower: 1.0–1.6 kPa.'
      ),
      createChipData(
        MetricKey.CO2,
        mdiWeatherCloudy,
        co2Agg.value,
        co2Agg.multiValues,
        co2Agg.entityIds,
        undefined,
        undefined,
        'CO₂ concentration. Ambient is ~400 ppm. Enriched grows target 800–1200 ppm with lights on for enhanced growth.'
      ),
      createChipData(
        MetricKey.IRRIGATION_TANK_LEVEL,
        mdiBarrel,
        tankLevelValue,
        tankMultiValues,
        tankEntityIds,
        'Tank',
        tankStatus,
        tankTooltip
      ),
      createChipData(
        MetricKey.SOIL_MOISTURE,
        mdiWaterPercent,
        soilAgg.value,
        soilAgg.multiValues,
        soilAgg.entityIds,
        'Moisture'
      ),
      createChipData(MetricKey.SUBSTRATE_TEMPERATURE, mdiThermometer, substrateTempAgg.value, substrateTempAgg.multiValues, substrateTempAgg.entityIds),
      createChipData(MetricKey.IRRIGATION, mdiWater, nextIrrigation, undefined, undefined, 'Next'),
      createChipData(MetricKey.DRAIN, mdiWaterMinus, nextDrain, undefined, undefined, 'Next'),
      envEntity
        ? createChipData(
          MetricKey.OPTIMAL,
          envEntity.state === EntityState.ON ? mdiRadioboxMarked : mdiRadioboxBlank,
          optimalLabel,
          undefined,
          undefined,
          undefined,
          envEntity.state === EntityState.ON ? StatusLevel.OPTIMAL : StatusLevel.WARNING
        )
        : null,
      createChipData(
        MetricKey.DLI,
        mdiWeatherSunny,
        dliValue,
        undefined,
        [dliEntityId],
        undefined,
        undefined,
        'Daily Light Integral — total light energy received in a day (mol/m²/day). Veg: 20–40, flower: 40–65.'
      ),
      createChipData(
        MetricKey.CROP_STEERING,
        mdiSprout,
        cropSteeringValue,
        undefined,
        [cropSteeringEntityId],
        undefined,
        undefined,
        'Crop steering score: positive = generative (flowering focus), negative = vegetative (growth focus).'
      ),
      createChipData(MetricKey.ENERGY, mdiFlash, energyValue, undefined, envAttrs.energySensors),
      createChipData(MetricKey.WATER, mdiWaterMinus, waterValue, undefined, undefined),
    ].filter((c): c is NonNullable<typeof c> => c !== null);

    // Device Chips
    const getAggregateState = (
      single: string | undefined,
      multi: string[] | undefined,
      sensor: string | undefined
    ): { value: string | undefined; multiValues?: string[]; entityIds?: string[] } => {
      const ids = new Set<string>();
      // Optional: Filter by active graphs if needed in future

      if (multi && multi.length > 0) {
        multi.forEach((id) => ids.add(id));
      } else if (single) {
        ids.add(single);
      }
      // Sensor overrides/augments? For simplicity, prefer controlled entities, but if nothing else, use sensor.
      if (ids.size === 0 && sensor) ids.add(sensor);

      if (ids.size === 0) return { value: undefined, entityIds: [] };

      const states: string[] = [];
      const entityIds: string[] = Array.from(ids);

      ids.forEach((id) => {
        const s = hass.states[id];
        if (
          s &&
          s.state &&
          s.state !== EntityState.UNAVAILABLE &&
          s.state !== EntityState.UNKNOWN
        ) {
          states.push(s.state);
        } else {
          states.push('-');
        }
      });

      if (ids.size > 1) {
        return { value: 'Multiple', multiValues: states, entityIds };
      }

      // Single device logic
      return { value: states[0], entityIds };
    };

    const exhaustState = getAggregateState(
      envAttrs.exhaustEntity,
      envAttrs.exhaustFanEntities,
      envAttrs.exhaustSensor
    );

    const humidifierState = getAggregateState(
      envAttrs.humidifierEntity,
      envAttrs.humidifierEntities,
      envAttrs.humidifierSensor
    );

    const dehumidifierState = getAggregateState(
      envAttrs.dehumidifierEntity,
      envAttrs.dehumidifierEntities,
      undefined
    );

    const circulationFanState = getAggregateState(
      envAttrs.circulationFanEntity,
      envAttrs.circulationFanEntities,
      undefined
    );

    const lightState = getAggregateState(envAttrs.lightSensor, envAttrs.lightSensors, undefined);

    // Determine light chip value: prefer numeric sensor value over On/Off
    let lightChipValue: string | undefined;
    let lightChipIcon = isLightsOn ? mdiLightbulbOn : mdiLightbulbOff;

    if (lightState.entityIds?.length === 1 && lightState.value !== undefined) {
      const numVal = parseFloat(lightState.value);
      if (!isNaN(numVal)) {
        const lightEnt = hass.states[lightState.entityIds[0]];
        const unit = lightEnt?.attributes?.unit_of_measurement;
        lightChipValue = unit === '%' ? `${numVal}%` : lightState.value;
        lightChipIcon = numVal > 0 ? mdiLightbulbOn : mdiLightbulbOff;
      }
    }
    if (!lightChipValue) {
      lightChipValue = hasLightSensor ? (isLightsOn ? 'On' : 'Off') : undefined;
    }

    const deviceChips = [
      // Moved light chip here per request
      createChipData(
        MetricKey.LIGHT,
        lightChipIcon,
        lightChipValue,
        lightState.multiValues,
        lightState.entityIds
      ),
      createChipData(
        MetricKey.EXHAUST,
        mdiFan,
        exhaustState.value,
        exhaustState.multiValues,
        exhaustState.entityIds,
        'Exhaust'
      ),
      createChipData(
        MetricKey.CIRCULATION_FAN,
        mdiFan,
        circulationFanState.value,
        circulationFanState.multiValues,
        circulationFanState.entityIds,
        'Fan'
      ),
      createChipData(
        MetricKey.HUMIDIFIER,
        mdiAirHumidifier,
        humidifierState.value,
        humidifierState.multiValues,
        humidifierState.entityIds,
        'Humidifier'
      ),
      createChipData(
        MetricKey.DEHUMIDIFIER,
        mdiAirHumidifierOff,
        dehumidifierState.value,
        dehumidifierState.multiValues,
        dehumidifierState.entityIds,
        'Dehumidifier'
      ),
    ].filter((c): c is NonNullable<typeof c> => c !== null);

    return { mainChips, deviceChips, dominant, envAttrs };
  }

  static computeSubareaMetrics(
    hass: HomeAssistant,
    ec: import('../services/types').EnvironmentConfig,
    activeEnvGraphs: Set<string>
  ): {
    heroChips: HeaderChip[];
    secondaryChips: HeaderChip[];
    deviceChips: HeaderChip[];
  } {
    const createChipData = (
      key: string,
      icon: string,
      value: string | undefined,
      multiValues: string[] | undefined,
      entityIds?: string[],
      label?: string,
      status?: string,
      tooltip?: string
    ) => {
      if (value === undefined && (!multiValues || multiValues.length === 0)) return null;
      const hasCompositeActive = Array.from(activeEnvGraphs).some((k) => k.startsWith(`${key}:`));
      const active = activeEnvGraphs.has(key) || hasCompositeActive;
      return {
        key,
        icon,
        value: value || '',
        multiValues,
        entityIds,
        label,
        status,
        tooltip,
        active,
        linked: false,
        groupIndex: -1,
      };
    };

    const getAggregateState = (
      single: string | undefined | null,
      multi: string[] | undefined | null,
      unit: string = ''
    ): { value: string | undefined; multiValues?: string[]; entityIds?: string[] } => {
      const ids = new Set<string>();
      if (multi && multi.length > 0) multi.forEach((id) => ids.add(id));
      else if (single) ids.add(single);

      if (ids.size === 0) return { value: undefined, entityIds: [] };

      const states: string[] = [];
      const entityIds: string[] = Array.from(ids);

      ids.forEach((id) => {
        const s = hass.states[id];
        if (
          s &&
          s.state &&
          s.state !== EntityState.UNAVAILABLE &&
          s.state !== EntityState.UNKNOWN
        ) {
          const fVal = parseFloat(s.state);
          if (!isNaN(fVal) || s.state === '') {
            states.push(unit ? `${parseFloat(s.state).toFixed(1)} ${unit}`.trim() : s.state);
          } else {
            states.push('-');
          }
        } else {
          states.push('-');
        }
      });

      if (ids.size > 1) {
        return { value: 'Multiple', multiValues: states, entityIds };
      }

      return { value: states[0] !== '-' ? states[0] : undefined, entityIds };
    };

    const tempAgg = getAggregateState(ec.temperature_sensor, ec.temperature_sensors, '°C');
    const humAgg = getAggregateState(ec.humidity_sensor, ec.humidity_sensors, '%');
    const vpdAgg = getAggregateState(ec.vpd_sensor, ec.vpd_sensors, 'kPa');
    const co2Agg = getAggregateState(ec.co2_sensor, undefined, 'ppm');

    const heroChips = [
      createChipData(MetricKey.TEMPERATURE, mdiThermometer, tempAgg.value, tempAgg.multiValues, tempAgg.entityIds, 'Temperature'),
      createChipData(MetricKey.HUMIDITY, mdiWaterPercent, humAgg.value, humAgg.multiValues, humAgg.entityIds, 'Humidity'),
      createChipData(MetricKey.VPD, mdiCloudOutline, vpdAgg.value, vpdAgg.multiValues, vpdAgg.entityIds, 'VPD'),
      createChipData(MetricKey.CO2, mdiWeatherCloudy, co2Agg.value, co2Agg.multiValues, co2Agg.entityIds, 'CO2'),
    ].filter((c): c is NonNullable<typeof c> => c !== null);

    const subTempAgg = getAggregateState(undefined, ec.substrate_temperature_sensors, '°C');
    const phAgg = getAggregateState(undefined, ec.ph_sensors, '');
    const feedEcAgg = getAggregateState(undefined, ec.feed_ec_sensors, '');
    const subEcAgg = getAggregateState(undefined, ec.substrate_ec_sensors, '');

    const secondaryChips = [
      createChipData(MetricKey.SUBSTRATE_TEMPERATURE, '', subTempAgg.value, subTempAgg.multiValues, subTempAgg.entityIds, 'Substrate Temp'),
      createChipData('ph', '', phAgg.value, phAgg.multiValues, phAgg.entityIds, 'pH'),
      createChipData('feed_ec', '', feedEcAgg.value, feedEcAgg.multiValues, feedEcAgg.entityIds, 'Feed EC'),
      createChipData('substrate_ec', '', subEcAgg.value, subEcAgg.multiValues, subEcAgg.entityIds, 'Substrate EC'),
    ].filter((c): c is NonNullable<typeof c> => c !== null);

    const getAggregateDeviceState = (
      entities: string[] | undefined | null
    ): { value: string | undefined; multiValues?: string[]; entityIds?: string[] } => {
      const ids = new Set<string>();
      if (entities && entities.length > 0) entities.forEach((id) => ids.add(id));
      if (ids.size === 0) return { value: undefined, entityIds: [] };

      const states: string[] = [];
      const entityIds: string[] = Array.from(ids);
      ids.forEach((id) => {
        const s = hass.states[id];
        states.push(s && s.state && s.state !== EntityState.UNAVAILABLE && s.state !== EntityState.UNKNOWN ? s.state : '-');
      });

      if (ids.size > 1) return { value: 'Multiple', multiValues: states, entityIds };
      return { value: states[0] !== '-' ? (states[0] === 'on' ? 'On' : states[0] === 'off' ? 'Off' : states[0]) : undefined, entityIds };
    };

    const lightState = getAggregateDeviceState(ec.light_sensors);
    const exhaustState = getAggregateDeviceState(ec.exhaust_fan_entities);
    const circFanState = getAggregateDeviceState(ec.circulation_fan_entities);
    const humState = getAggregateDeviceState(ec.humidifier_entities);
    const dehumState = getAggregateDeviceState(ec.dehumidifier_entities);

    // Format light sensor value with % for power_factor/% unit sensors
    let subareaLightValue = lightState.value;
    let subareaLightIcon = mdiLightbulbOn;
    if (lightState.entityIds?.length === 1 && lightState.value !== undefined) {
      const numVal = parseFloat(lightState.value);
      if (!isNaN(numVal)) {
        const lightEnt = hass.states[lightState.entityIds[0]];
        const unit = lightEnt?.attributes?.unit_of_measurement;
        subareaLightValue = unit === '%' ? `${numVal}%` : lightState.value;
        subareaLightIcon = numVal > 0 ? mdiLightbulbOn : mdiLightbulbOff;
      }
    }

    const deviceChips = [
      createChipData(MetricKey.LIGHT, subareaLightIcon, subareaLightValue, lightState.multiValues, lightState.entityIds, 'Lights'),
      createChipData(MetricKey.EXHAUST, mdiFan, exhaustState.value, exhaustState.multiValues, exhaustState.entityIds, 'Exhaust'),
      createChipData(MetricKey.CIRCULATION_FAN, mdiFan, circFanState.value, circFanState.multiValues, circFanState.entityIds, 'Fan'),
      createChipData(MetricKey.HUMIDIFIER, mdiAirHumidifier, humState.value, humState.multiValues, humState.entityIds, 'Humidifier'),
      createChipData(MetricKey.DEHUMIDIFIER, mdiAirHumidifierOff, dehumState.value, dehumState.multiValues, dehumState.entityIds, 'Dehumidifier'),
    ].filter((c): c is NonNullable<typeof c> => c !== null);

    return { heroChips, secondaryChips, deviceChips };
  }
}
