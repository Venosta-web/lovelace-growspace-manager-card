import {
    mdiThermometer,
    mdiWaterPercent,
    mdiCloudOutline,
    mdiWeatherCloudy,
    mdiLightbulbOn,
    mdiWater,
    mdiFan,
    mdiAirHumidifier,
    mdiAirHumidifierOff,
    mdiRadioboxMarked,
    mdiMagnify,
    mdiCalculator,
    mdiAirFilter
} from '@mdi/js';

export const METRIC_SORT_ORDER = [
    'temperature',
    'humidity',
    'vpd',
    'co2',
    'light',
    'soil_moisture',
    'irrigation',
    'drain',
    'optimal',
    'exhaust',
    'circulation_fan',
    'humidifier',
    'dehumidifier'
];

export interface MetricConfigItem {
    color: string;
    title: string;
    unit: string;
    icon: string;
    type?: 'line' | 'step';
}

export const METRIC_CONFIG: Record<string, MetricConfigItem> = {
    temperature: { color: '#ff5252', title: 'Temperature', unit: '°C', icon: mdiThermometer },
    humidity: { color: '#2196f3', title: 'Humidity', unit: '%', icon: mdiWaterPercent },
    vpd: { color: '#9c27b0', title: 'VPD', unit: 'kPa', icon: mdiCloudOutline },
    calculated_vpd: { color: '#ab47bc', title: 'Calc. VPD', unit: 'kPa', icon: mdiCalculator },
    co2: { color: '#4caf50', title: 'CO2', unit: 'ppm', icon: mdiWeatherCloudy },
    air_exchange: { color: '#8d6e63', title: 'Air Exchange', unit: 'm³/h', icon: mdiAirFilter },
    soil_moisture: { color: '#03a9f4', title: 'Soil Moisture', unit: '%', icon: mdiWaterPercent },
    light: { color: '#ffc107', title: 'Light', unit: 'state', icon: mdiLightbulbOn, type: 'step' },
    irrigation: { color: '#03a9f4', title: 'Irrigation', unit: 'state', icon: mdiWater, type: 'step' },
    drain: { color: '#ff9800', title: 'Drain', unit: 'state', icon: mdiWater, type: 'step' },
    exhaust: { color: '#795548', title: 'Exhaust', unit: '', icon: mdiFan },
    circulation_fan: {
        color: '#607d8b',
        title: 'Circulation Fan',
        unit: '',
        icon: mdiFan
    },
    humidifier: { color: '#607d8b', title: 'Humidifier', unit: '', icon: mdiAirHumidifier },
    dehumidifier: { color: '#546e7a', title: 'Dehumidifier', unit: 'state', icon: mdiAirHumidifierOff, type: 'step' },
    optimal: { color: '#4caf50', title: 'Optimal Conditions', unit: 'state', icon: mdiRadioboxMarked, type: 'step' }
};

export const DEFAULT_METRIC_CONFIG: MetricConfigItem = {
    color: '#fff',
    title: 'Unknown',
    unit: '',
    icon: mdiMagnify,
    type: 'line'
};

export const SENSOR_CHART_DEFAULTS: Record<string, { min?: number; max?: number; disablePadding?: boolean; unit?: string; binary?: boolean }> = {
    exhaust: { min: 0, max: 10, disablePadding: true, unit: 'state' },
    dehumidifier: { min: 0, max: 1, disablePadding: true, binary: true },
    humidifier: { min: 0, max: 10, disablePadding: true, unit: 'state' },
    circulation_fan: { min: 0, max: 10, disablePadding: true, unit: 'state' },
    optimizer: { min: 0, max: 1, disablePadding: true, binary: true, unit: 'state' }
};

export const DOMAIN = 'growspace_manager';
export const WS_TYPE_GET_DATA = 'growspace_manager/get_data';

export const SERVICES = {
    GET_STRAIN_LIBRARY: 'get_strain_library',
    ADD_PLANT: 'add_plant',
    UPDATE_PLANT: 'update_plant',
    REMOVE_PLANT: 'remove_plant',
    HARVEST_PLANT: 'harvest_plant',
    TAKE_CLONE: 'take_clone',
    SWITCH_PLANTS: 'switch_plants',
    MOVE_CLONE: 'move_clone',
    SET_DEHUMIDIFIER_CONTROL: 'set_dehumidifier_control',
    SET_IRRIGATION_SETTINGS: 'set_irrigation_settings',
    ADD_IRRIGATION_TIME: 'add_irrigation_time',
    REMOVE_IRRIGATION_TIME: 'remove_irrigation_time',
    SET_IRRIGATION_STRATEGY: 'set_irrigation_strategy',
    ADD_DRAIN_TIME: 'add_drain_time',
    REMOVE_DRAIN_TIME: 'remove_drain_time',
    EXPORT_STRAIN_LIBRARY: 'export_strain_library',
    ADD_STRAIN: 'add_strain',
    REMOVE_STRAIN: 'remove_strain',
    CLEAR_STRAIN_LIBRARY: 'clear_strain_library',
    ADD_GROWSPACE: 'add_growspace',
    UPDATE_GROWSPACE: 'update_growspace',
    REMOVE_GROWSPACE: 'remove_growspace',
    CONFIGURE_ENVIRONMENT: 'configure_environment',
    ASK_GROW_ADVICE: 'ask_grow_advice',
    ANALYZE_ALL_GROWSPACES: 'analyze_all_growspaces',
    STRAIN_RECOMMENDATION: 'strain_recommendation'
};
