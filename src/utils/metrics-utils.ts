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
} from '@mdi/js';
import { HomeAssistant } from 'custom-card-helpers';
import { DateTime } from 'luxon';
import { GrowspaceDevice, IrrigationTime } from '../types';
import { PlantUtils } from './plant-utils';

export class MetricsUtils {
    private static _getAttributeValue(ent: any, key: string) {
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
        mainChips: any[];
        deviceChips: any[];
        dominant: any;
        envAttrs: any;
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
                weeksLabel: `${weeks} Week${weeks !== 1 ? 's' : ''} ${stageName}`
            };
        }

        // Fetch Environmental Data
        let slug = device.name.toLowerCase().replace(/\s+/g, '_');
        if (device.overview_entity_id) {
            slug = device.overview_entity_id.replace('sensor.', '');
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
        const overviewEntity = device.overview_entity_id
            ? hass.states[device.overview_entity_id]
            : undefined;
        const envAttrs =
            device.environment_attributes || overviewEntity?.attributes || ({} as any);

        const temp = this._getAttributeValue(envEntity, 'temperature');
        const hum = this._getAttributeValue(envEntity, 'humidity');
        let vpd = this._getAttributeValue(envEntity, 'vpd');

        // VPD Fallback Logic
        if (vpd === undefined || vpd === null) {
            if (envAttrs.vpd_sensor) {
                const vpdState = hass.states[envAttrs.vpd_sensor];
                if (vpdState && vpdState.state !== 'unknown' && vpdState.state !== 'unavailable') {
                    const val = parseFloat(vpdState.state);
                    if (!isNaN(val)) vpd = val;
                }
            }
            if (vpd === undefined || vpd === null) {
                // Calculated VPD fallback
                const slugify = (text: string) =>
                    text
                        .toString()
                        .toLowerCase()
                        .replace(/\s+/g, '_')
                        .replace(/[^\w\-]+/g, '')
                        .replace(/\-\-+/g, '_')
                        .replace(/^-+/, '')
                        .replace(/-+$/, '');
                const calcName = `${device.name} Calculated VPD`;
                const calculatedId = `sensor.${slugify(calcName)}`;
                const vpdState = hass.states[calculatedId];
                if (vpdState && vpdState.state !== 'unknown' && vpdState.state !== 'unavailable') {
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
            (!vpdStatus || vpdStatus === 'unknown') &&
            vpd !== undefined &&
            vpdTargetMin !== undefined &&
            vpdTargetMax !== undefined &&
            vpdDangerMin !== undefined &&
            vpdDangerMax !== undefined
        ) {
            if (vpd < vpdDangerMin || vpd > vpdDangerMax) {
                vpdStatus = 'danger';
            } else if (vpd < vpdTargetMin || vpd > vpdTargetMax) {
                vpdStatus = 'warning';
            } else {
                vpdStatus = 'optimal';
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
                .map((t) => {
                    const [h, m] = t.time.split(':').map(Number);
                    let dt = now.set({ hour: h, minute: m, second: 0 });
                    if (dt < now) dt = dt.plus({ days: 1 });
                    return dt;
                })
                .sort((a, b) => a.toMillis() - b.toMillis())[0];
            return upcoming ? upcoming.toFormat('HH:mm') : undefined;
        };

        const nextIrrigation = getNextEvent(device.irrigation_times);
        const nextDrain = getNextEvent(device.drain_times);

        // Build Chips
        const createChipData = (
            key: string,
            icon: string,
            value: string | undefined,
            label?: string,
            status?: string,
            tooltip?: string
        ) => {
            if (value === undefined) return null;
            const { linked, groupIndex } = this._isMetricLinked(key, linkedGraphGroups);
            const active = activeEnvGraphs.has(key);
            return { key, icon, value, label, status, tooltip, active, linked, groupIndex };
        };

        const mainChips = [
            createChipData('temperature', mdiThermometer, temp !== undefined ? `${temp}°C` : undefined),
            createChipData('humidity', mdiWaterPercent, hum !== undefined ? `${hum}%` : undefined),
            createChipData(
                'vpd',
                mdiCloudOutline,
                vpd !== undefined ? `${vpd} kPa` : undefined,
                undefined,
                vpdStatus,
                vpdTargetMin !== undefined && vpdTargetMax !== undefined
                    ? `VPD: ${vpd} kPa (Target: ${vpdTargetMin}-${vpdTargetMax})`
                    : ''
            ),
            createChipData('co2', mdiWeatherCloudy, co2 !== undefined ? `${co2} ppm` : undefined),
            createChipData(
                'light',
                isLightsOn ? mdiLightbulbOn : mdiLightbulbOff,
                hasLightSensor ? (isLightsOn ? 'On' : 'Off') : undefined
            ),
            createChipData(
                'soil_moisture',
                mdiWaterPercent,
                this._getAttributeValue(overviewEntity, 'soil_moisture_value') !== undefined
                    ? `${this._getAttributeValue(overviewEntity, 'soil_moisture_value')}%`
                    : undefined,
                'Moisture'
            ),
            createChipData('irrigation', mdiWater, nextIrrigation, 'Next'),
            createChipData('drain', mdiWater, nextDrain, 'Next'),
            envEntity
                ? createChipData(
                    'optimal',
                    envEntity.state === 'on' ? mdiRadioboxMarked : mdiRadioboxBlank,
                    envEntity.state === 'on'
                        ? 'Optimal Conditions'
                        : envEntity.attributes.reasons || 'Not Optimal',
                    undefined,
                    envEntity.state === 'on' ? 'optimal' : 'warning'
                )
                : null,
        ].filter((c): c is NonNullable<typeof c> => c !== null);

        // Device Chips
        const exhaustId = envAttrs.exhaust_entity;
        const exhaustSensor = envAttrs.exhaust_sensor;
        const exhaustState =
            exhaustId && hass.states[exhaustId]
                ? hass.states[exhaustId].state
                : exhaustSensor && hass.states[exhaustSensor]
                    ? hass.states[exhaustSensor].state
                    : undefined;

        const humidifierId = envAttrs.humidifier_entity;
        const humidifierSensor = envAttrs.humidifier_sensor;
        const humidifierState =
            humidifierId && hass.states[humidifierId]
                ? hass.states[humidifierId].state
                : humidifierSensor && hass.states[humidifierSensor]
                    ? hass.states[humidifierSensor].state
                    : undefined;

        const dehumidifierId = envAttrs.dehumidifier_entity;
        const dehumidifierState =
            dehumidifierId && hass.states[dehumidifierId]
                ? hass.states[dehumidifierId].state
                : undefined;

        const circulationFanId = envAttrs.circulation_fan_entity;
        const circulationFanState =
            circulationFanId && hass.states[circulationFanId]
                ? hass.states[circulationFanId].state
                : undefined;

        const deviceChips = [
            createChipData(
                'exhaust',
                mdiFan,
                exhaustId || exhaustSensor ? `${exhaustState ?? '-'}` : undefined,
                'Exhaust'
            ),
            createChipData(
                'circulation_fan',
                mdiFan,
                circulationFanId ? `${circulationFanState ?? '-'}` : undefined,
                'Fan'
            ),
            createChipData(
                'humidifier',
                mdiAirHumidifier,
                humidifierId || humidifierSensor ? `${humidifierState ?? '-'}` : undefined,
                'Humidifier'
            ),
            createChipData(
                'dehumidifier',
                mdiAirHumidifierOff,
                dehumidifierId ? `${dehumidifierState ?? '-'}` : undefined,
                'Dehumidifier'
            ),
        ].filter((c): c is NonNullable<typeof c> => c !== null);

        return { mainChips, deviceChips, dominant, envAttrs };
    }
}
