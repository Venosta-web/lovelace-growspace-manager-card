import { fixture, html } from '@open-wc/testing-helpers';
import { expect, test, vi } from 'vitest';
import { page } from 'vitest/browser';
import { GrowspaceSubareaCard } from '../../../src/cards/growspace-subarea-card';
import { DataService } from '../../../src/services/data-service';
import { ChartUtils } from '../../../src/utils/chart-utils';
import { createMockHass } from '../../mocks/hass';

const { mockDataService } = vi.hoisted(() => ({
    mockDataService: {
        getSubareas: vi.fn(),
        getBatchHistory: vi.fn(),
        getGrowspaceDevices: vi.fn(),
        updateHass: vi.fn(),
    }
}));

vi.mock('../../../src/services/data-service', () => ({
    DataService: class {
        constructor() { return mockDataService; }
    }
}));

vi.mock('../../../src/utils/chart-utils', () => ({
    ChartUtils: {
        generateSparklinePath: vi.fn(),
        getSparklineColor: vi.fn(),
        generateVpdSparklineSegments: vi.fn().mockReturnValue([]),
    }
}));

vi.mock('../../../src/cards/editors/growspace-subarea-card-editor.js', () => ({}));

if (!customElements.get('growspace-subarea-card')) {
    customElements.define('growspace-subarea-card', GrowspaceSubareaCard);
}

test('growspace-subarea-card visual snapshot', async () => {
    mockDataService.getSubareas.mockResolvedValue([{
        id: 'sa1',
        name: 'Veg Area',
        environment_config: {
            temperature_sensors: ['sensor.veg_temp'],
            humidity_sensors: ['sensor.veg_humidity'],
            light_sensors: ['light.veg_light'],
            exhaust_fan_entities: ['fan.exhaust'],
            circulation_fan_entities: ['fan.circ'],
            humidifier_entities: ['switch.hum'],
            dehumidifier_entities: ['switch.dehum'],
        }
    }]);
    mockDataService.getBatchHistory.mockResolvedValue({
        'sensor.veg_temp': [
            { entity_id: 'sensor.veg_temp', attributes: {}, last_changed: '2026-05-20T10:00:00Z', state: '22.5' },
            { entity_id: 'sensor.veg_temp', attributes: {}, last_changed: '2026-05-20T11:00:00Z', state: '23.0' },
        ],
        'sensor.veg_humidity': [
            { entity_id: 'sensor.veg_humidity', attributes: {}, last_changed: '2026-05-20T10:00:00Z', state: '55' },
            { entity_id: 'sensor.veg_humidity', attributes: {}, last_changed: '2026-05-20T11:00:00Z', state: '52' },
        ],
    });
    mockDataService.getGrowspaceDevices.mockReturnValue([]);
    mockDataService.updateHass.mockReturnValue(undefined);
    vi.mocked(ChartUtils.generateSparklinePath).mockReturnValue('M 0,0 L 100,100');
    vi.mocked(ChartUtils.getSparklineColor).mockReturnValue('#4caf50');

    const mockHass = createMockHass();
    Object.assign(mockHass.states, {
        'sensor.veg_temp': { state: '23.0', attributes: { friendly_name: 'Veg Temp', unit_of_measurement: '°C' } },
        'sensor.veg_humidity': { state: '52', attributes: { friendly_name: 'Veg Humidity', unit_of_measurement: '%' } },
        'light.veg_light': { state: 'on' },
        'fan.exhaust': { state: 'off' },
        'fan.circ': { state: 'on' },
        'switch.hum': { state: 'off' },
        'switch.dehum': { state: 'off' },
    });

    const element = await fixture<GrowspaceSubareaCard>(html`
        <growspace-subarea-card .hass=${mockHass}></growspace-subarea-card>
    `);
    element.setConfig({ type: 'custom:growspace-subarea-card', growspace_id: 'gs1', subarea_id: 'sa1' } as any);
    await element.updateComplete;
    await new Promise(resolve => setTimeout(resolve, 0));
    await element.updateComplete;

    await expect(page.elementLocator(element)).toMatchScreenshot();
});
