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
    mdiMagnify
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
    co2: { color: '#4caf50', title: 'CO2', unit: 'ppm', icon: mdiWeatherCloudy },
    soil_moisture: { color: '#03a9f4', title: 'Soil Moisture', unit: '%', icon: mdiWaterPercent },
    light: { color: '#ffc107', title: 'Light', unit: 'state', icon: mdiLightbulbOn, type: 'step' },
    irrigation: { color: '#03a9f4', title: 'Irrigation', unit: 'state', icon: mdiWater, type: 'step' },
    drain: { color: '#ff9800', title: 'Drain', unit: 'state', icon: mdiWater, type: 'step' },
    exhaust: { color: '#795548', title: 'Exhaust', unit: '', icon: mdiFan },
    humidifier: { color: '#607d8b', title: 'Humidifier', unit: '', icon: mdiAirHumidifier },
    dehumidifier: { color: '#546e7a', title: 'Dehumidifier', unit: '', icon: mdiAirHumidifierOff },
    optimal: { color: '#4caf50', title: 'Optimal Conditions', unit: 'state', icon: mdiRadioboxMarked, type: 'step' }
};

export const DEFAULT_METRIC_CONFIG: MetricConfigItem = {
    color: '#fff',
    title: 'Unknown',
    unit: '',
    icon: mdiMagnify,
    type: 'line'
};
