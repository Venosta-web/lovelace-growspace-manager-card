
import { GrowspaceDevice } from '../types';

export class SensorTypeUtils {
    static isLight(device: GrowspaceDevice | undefined, hass: any, entityId: string): boolean {
        if (!device || !entityId) return false;

        // Priority 1: Explicit mapping
        const sensorTypes = device.environmentAttributes?.sensorTypes;
        if (sensorTypes && sensorTypes[entityId]) {
            return sensorTypes[entityId] === 'light';
        }

        // Priority 2: Heuristics
        if (!hass) return false;
        const state = hass.states[entityId];
        if (!state) return false;

        const deviceClass = state.attributes.device_class;
        const unit = state.attributes.unit_of_measurement;
        const lowerId = entityId.toLowerCase();

        const isIlluminance = deviceClass === 'illuminance' || (unit && (unit.includes('lx') || unit.includes('fc') || unit.toLowerCase().includes('lux')));
        const isLightId = lowerId.includes('light_sensor') || lowerId.includes('illuminance') || (lowerId.includes('light') && !lowerId.includes('humidifier_light') && !lowerId.includes('vpd'));

        return isIlluminance || isLightId;
    }

    static isTemperature(device: GrowspaceDevice | undefined, hass: any, entityId: string): boolean {
        if (!device || !entityId) return false;
        const sensorTypes = device.environmentAttributes?.sensorTypes;
        if (sensorTypes && sensorTypes[entityId]) return sensorTypes[entityId] === 'temperature';

        if (!hass) return false;
        const state = hass.states[entityId];
        if (!state) return false;
        const deviceClass = state.attributes.device_class;
        const unit = state.attributes.unit_of_measurement;
        const lowerId = entityId.toLowerCase();
        return deviceClass === 'temperature' || (unit && unit.includes('°')) || lowerId.includes('temp');
    }

    static isHumidity(device: GrowspaceDevice | undefined, hass: any, entityId: string): boolean {
        if (!device || !entityId) return false;
        const sensorTypes = device.environmentAttributes?.sensorTypes;
        if (sensorTypes && sensorTypes[entityId]) return sensorTypes[entityId] === 'humidity';

        if (this.isLight(device, hass, entityId)) return false;

        if (!hass) return false;
        const state = hass.states[entityId];
        if (!state) return false;
        const deviceClass = state.attributes.device_class;
        const unit = state.attributes.unit_of_measurement;
        const lowerId = entityId.toLowerCase();
        return (deviceClass === 'humidity' || (unit && unit.includes('%')) || lowerId.includes('humi') || lowerId.includes('humid'));
    }

    static isVPD(device: GrowspaceDevice | undefined, hass: any, entityId: string): boolean {
        if (!device || !entityId) return false;
        const sensorTypes = device.environmentAttributes?.sensorTypes;
        if (sensorTypes && sensorTypes[entityId]) return sensorTypes[entityId] === 'vpd';

        if (!hass) return false;
        const state = hass.states[entityId];
        if (!state) return false;
        const deviceClass = state.attributes.device_class;
        const unit = state.attributes.unit_of_measurement;
        const lowerId = entityId.toLowerCase();
        return deviceClass === 'pressure' || (unit && (unit.includes('Pa') || unit.includes('vpd'))) || lowerId.includes('vpd') || lowerId.includes('calculated_vpd') || lowerId.includes('deficit');
    }

    static isFan(device: GrowspaceDevice | undefined, entityId: string): boolean {
        if (!device) return false;
        const env = device.environmentAttributes;
        const fanEntities = env?.circulationFanEntities || (env?.circulationFanEntity ? [env.circulationFanEntity] : []);
        return fanEntities.includes(entityId);
    }

    static isExhaust(device: GrowspaceDevice | undefined, entityId: string): boolean {
        if (!device) return false;
        const env = device.environmentAttributes;
        const exhaustEntities = env?.exhaustFanEntities || (env?.exhaustEntity ? [env.exhaustEntity] : []);
        return exhaustEntities.includes(entityId);
    }

    static isSoilMoisture(device: GrowspaceDevice | undefined, entityId: string): boolean {
        if (!device) return false;
        const env = device.environmentAttributes;
        const types = env?.sensorTypes || {};
        return !!(env?.soilMoistureSensors?.includes(entityId) || env?.soilMoistureSensor === entityId || types[entityId] === 'soil_moisture');
    }

    static isIrrigationPump(device: GrowspaceDevice | undefined, entityId: string): boolean {
        if (!device) return false;
        const types = device.environmentAttributes?.sensorTypes || {};
        return device.irrigationConfig?.irrigationPumpEntity === entityId || types[entityId] === 'irrigation_pump';
    }

    static isDrainPump(device: GrowspaceDevice | undefined, entityId: string): boolean {
        if (!device) return false;
        const types = device.environmentAttributes?.sensorTypes || {};
        return device.irrigationConfig?.drainPumpEntity === entityId || types[entityId] === 'drain_pump';
    }

    static isCO2(device: GrowspaceDevice | undefined, entityId: string): boolean {
        if (!device) return false;
        const env = device.environmentAttributes;
        const types = env?.sensorTypes || {};
        return !!(env?.co2Sensors?.includes(entityId) || env?.co2Sensor === entityId || types[entityId] === 'co2' || entityId.toLowerCase().includes('co2'));
    }

    static isHumidifier(device: GrowspaceDevice | undefined, entityId: string): boolean {
        if (!device) return false;
        const env = device.environmentAttributes;
        const types = env?.sensorTypes || {};
        return !!(env?.humidifierEntities?.includes(entityId) || env?.humidifierEntity === entityId || types[entityId] === 'humidifier');
    }

    static isDehumidifier(device: GrowspaceDevice | undefined, entityId: string): boolean {
        if (!device) return false;
        const env = device.environmentAttributes;
        const types = env?.sensorTypes || {};
        return !!(env?.dehumidifierEntities?.includes(entityId) || env?.dehumidifierEntity === entityId || types[entityId] === 'dehumidifier');
    }

    static isIrrigationTank(device: GrowspaceDevice | undefined, entityId: string): boolean {
        if (!device) return false;
        const env = device.environmentAttributes;
        const types = env?.sensorTypes || {};
        return !!(env?.irrigationTanks?.some(t => t.sensorEntity === entityId) || types[entityId] === 'irrigation_tank' || entityId.toLowerCase().includes('tank'));
    }

    static getSensorIcon(device: GrowspaceDevice | undefined, hass: any, entityId: string): string {
        if (this.isTemperature(device, hass, entityId)) return 'mdi:thermometer';
        if (this.isHumidity(device, hass, entityId)) return 'mdi:water-percent';
        if (this.isVPD(device, hass, entityId)) return 'mdi:cloud-outline';
        if (this.isLight(device, hass, entityId)) return 'mdi:lightbulb-on';
        if (this.isFan(device, entityId)) return 'mdi:fan';
        if (this.isExhaust(device, entityId)) return 'mdi:fan';

        if (this.isSoilMoisture(device, entityId)) return 'mdi:water-percent';
        if (this.isIrrigationPump(device, entityId)) return 'mdi:water';
        if (this.isDrainPump(device, entityId)) return 'mdi:water-minus';
        if (this.isCO2(device, entityId)) return 'mdi:weather-cloudy';
        if (this.isHumidifier(device, entityId)) return 'mdi:air-humidifier';
        if (this.isDehumidifier(device, entityId)) return 'mdi:air-humidifier-off';
        if (this.isIrrigationTank(device, entityId)) return 'mdi:barrel';

        return 'mdi:sensor';
    }
}
