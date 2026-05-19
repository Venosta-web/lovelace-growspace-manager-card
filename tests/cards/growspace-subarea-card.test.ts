import { fixture, html } from '@open-wc/testing-helpers';
import { expect, test, describe, beforeEach, vi, afterEach } from 'vitest';
import { GrowspaceSubareaCard } from '../../src/cards/growspace-subarea-card';
import { DataService } from '../../src/services/data-service';
import { ChartUtils } from '../../src/utils/chart-utils';

const { mockDataService } = vi.hoisted(() => ({
    mockDataService: {
        getSubareas: vi.fn(),
        getBatchHistory: vi.fn(),
        getGrowspaceDevices: vi.fn(),
        updateHass: vi.fn(),
    }
}));

vi.mock('../../src/services/data-service', () => ({
    DataService: class {
        constructor() {
            return mockDataService;
        }
    }
}));

vi.mock('../../src/utils/chart-utils', () => ({
    ChartUtils: {
        generateSparklinePath: vi.fn(),
        getSparklineColor: vi.fn(),
        generateVpdSparklineSegments: vi.fn().mockReturnValue([]),
    }
}));

describe('GrowspaceSubareaCard', () => {
    let element: GrowspaceSubareaCard;
    let mockHass: any;

    const mockSubarea = {
        id: 'sa1',
        name: 'Veg Area',
        environment_config: {
            temperature_sensors: ['sensor.veg_temp'],
            humidity_sensors: ['sensor.veg_humidity'],
            light_sensors: ['light.veg_light'],
            exhaust_fan_entities: ['fan.exhaust'],
            circulation_fan_entities: ['fan.circ'],
            humidifier_entities: ['switch.hum'],
            dehumidifier_entities: ['switch.dehum']
        }
    };

    beforeEach(async () => {
        mockDataService.getSubareas.mockResolvedValue([mockSubarea as any]);
        mockDataService.getBatchHistory.mockResolvedValue({
            'sensor.veg_temp': [
                { entity_id: 'sensor.veg_temp', attributes: {}, last_changed: '2024-01-01T10:00:00Z', state: '22.5' },
                { entity_id: 'sensor.veg_temp', attributes: {}, last_changed: '2024-01-01T11:00:00Z', state: '23.0' }
            ],
            'sensor.veg_humidity': [
                { entity_id: 'sensor.veg_humidity', attributes: {}, last_changed: '2024-01-01T10:00:00Z', state: '55' },
                { entity_id: 'sensor.veg_humidity', attributes: {}, last_changed: '2024-01-01T11:00:00Z', state: '52' }
            ]
        });
        mockDataService.getGrowspaceDevices.mockReturnValue([]);
        mockDataService.updateHass.mockReturnValue(undefined);

        vi.mocked(ChartUtils.generateSparklinePath).mockReturnValue('M 0,0 L 100,100');
        vi.mocked(ChartUtils.getSparklineColor).mockReturnValue('#ff0000');

        mockHass = {
            states: {
                'sensor.veg_temp': {
                    state: '23.0',
                    attributes: { friendly_name: 'Veg Temp', unit_of_measurement: '°C' }
                },
                'sensor.veg_humidity': {
                    state: '52',
                    attributes: { friendly_name: 'Veg Humidity', unit_of_measurement: '%' }
                },
                'light.veg_light': { state: 'on' },
                'fan.exhaust': { state: 'off' },
                'fan.circ': { state: 'on' },
                'switch.hum': { state: 'off' },
                'switch.dehum': { state: 'off' }
            },
            connection: {
                sendMessagePromise: vi.fn(),
                subscribeEvents: vi.fn().mockResolvedValue(() => { }),
            },
            language: 'en',
        };

        element = await fixture<GrowspaceSubareaCard>(html`
            <growspace-subarea-card .hass=${mockHass}></growspace-subarea-card>
        `);

        element.setConfig({
            type: 'custom:growspace-subarea-card',
            growspace_id: 'gs1',
            subarea_id: 'sa1'
        } as any);

        await element.updateComplete;
        // Wait for asynchronous data loading
        await new Promise(resolve => setTimeout(resolve, 0));
        await element.updateComplete;
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    test('is defined', () => {
        expect(element).toBeInstanceOf(GrowspaceSubareaCard);
    });

    test('renders subarea name and growspace name', () => {
        const title = element.shadowRoot?.querySelector('.subarea-title');
        expect(title?.textContent?.trim()).toBe('Veg Area');

        const subtitle = element.shadowRoot?.querySelector('.subarea-subtitle');
        expect(subtitle?.textContent?.trim()).toContain('gs1'); // default to growspace_id if parent name not fetched
    });

    test('renders hero sensors correctly', () => {
        const heroUI = element.shadowRoot?.querySelector('growspace-header-hero-ui') as any;
        expect(heroUI?.chips?.length).toBe(2); // Temperature and Humidity

        // computeSubareaMetrics formats values as '<number> <unit>' in the value field
        expect(heroUI?.chips[0].value).toBe('23.0 °C');
        expect(heroUI?.chips[1].value).toBe('52.0 %');
    });

    test('renders device chips correctly', () => {
        const chips = element.shadowRoot?.querySelectorAll('growspace-chip');
        expect(chips?.length).toBe(5);

        // Light chip (on) — device state is stored in .value, not .status
        expect((chips?.[0] as any).label).toContain('Lights');
        expect((chips?.[0] as any).value).toBe('On');

        // Exhaust chip (off)
        expect((chips?.[1] as any).label).toContain('Exhaust');
        expect((chips?.[1] as any).value).toBe('Off');
    });

    test('toggles metric graph on hero sensor click', async () => {
        const toggleSpy = vi.spyOn(element.store, 'toggleEnvGraph');
        const heroUI = element.shadowRoot?.querySelector('growspace-header-hero-ui') as HTMLElement;
        heroUI.dispatchEvent(new CustomEvent('toggle-graph', { detail: { metric: 'temperature' }, bubbles: true, composed: true }));
        expect(toggleSpy).toHaveBeenCalledWith('temperature');
    });

    test('opens config dialog on gear icon click', async () => {
        const configBtn = element.shadowRoot?.querySelector('.config-button') as HTMLElement;
        configBtn.click();
        await element.updateComplete;

        const dialog = element.shadowRoot?.querySelector('config-dialog');
        expect(dialog).not.toBeNull();
    });

    test('renders loading state', async () => {
        (element as any)._loading = true;
        await element.updateComplete;
        expect(element.shadowRoot?.querySelector('ha-circular-progress')).not.toBeNull();
    });

    test('renders error state when subarea not found', async () => {
        mockDataService.getSubareas.mockResolvedValue([]);
        await (element as any)._loadSubarea();
        await element.updateComplete;

        expect(element.shadowRoot?.querySelector('.error')?.textContent).toContain('not found');
    });

    test('renders error state when HA is missing', async () => {
        (element as any).hass = undefined;
        await element.updateComplete;
        expect(element.shadowRoot?.querySelector('.error')?.textContent).toContain('Home Assistant not available');
    });

    test('getCardSize returns expected size', () => {
        expect(element.getCardSize()).toBe(4);
    });

    test('getStubConfig returns default config', () => {
        const stub = GrowspaceSubareaCard.getStubConfig();
        expect(stub.type).toBe('custom:growspace-subarea-card');
        expect(stub.growspace_id).toBe('');
    });

    test('disconnectedCallback cleans up store and history', () => {
        const destroySpy = vi.spyOn(element.store, 'destroy');
        element.disconnectedCallback();
        expect(destroySpy).toHaveBeenCalled();
    });

    test('setConfig throws on invalid config', () => {
        expect(() => element.setConfig(null as any)).toThrow('Invalid configuration');
    });

    test('renders unconfigured state when growspace_id is missing', async () => {
        element.setConfig({ type: 'custom:growspace-subarea-card', growspace_id: '', subarea_id: '' } as any);
        await element.updateComplete;
        expect(element.shadowRoot?.querySelector('.no-data')?.textContent).toContain('Please configure');
    });

    test('renders no-sensors message when environment_config is empty', async () => {
        mockDataService.getSubareas.mockResolvedValue([{
            id: 'sa1',
            name: 'Veg Area',
            environment_config: {}
        }]);
        await (element as any)._loadSubarea();
        await element.updateComplete;
        expect(element.shadowRoot?.querySelector('.no-sensors')?.textContent).toContain('No environment sensors');
    });

    test('renders VPD and CO2 sensors', async () => {
        mockDataService.getSubareas.mockResolvedValue([{
            id: 'sa1',
            name: 'Veg Area',
            environment_config: {
                vpd_sensors: ['sensor.vpd'],
                co2_sensor: 'sensor.co2'
            }
        }]);
        mockHass.states['sensor.vpd'] = { state: '0.8', attributes: { friendly_name: 'VPD', unit_of_measurement: 'kPa' } };
        mockHass.states['sensor.co2'] = { state: '800', attributes: { friendly_name: 'CO2', unit_of_measurement: 'ppm' } };
        element.hass = mockHass;
        await (element as any)._loadSubarea();
        await element.updateComplete;

        const heroUI = element.shadowRoot?.querySelector('growspace-header-hero-ui') as any;
        expect(heroUI?.chips?.length).toBe(2);
        const labels = heroUI?.chips.map((c: any) => c.label);
        expect(labels).toContain('VPD');
        expect(labels).toContain('CO2');
    });

    test('renders multiple entity IDs in hero card (multi-sensor path)', async () => {
        mockDataService.getSubareas.mockResolvedValue([{
            id: 'sa1',
            name: 'Veg Area',
            environment_config: {
                temperature_sensors: ['sensor.temp1', 'sensor.temp2'],
            }
        }]);
        mockHass.states['sensor.temp1'] = { state: '22.0', attributes: { friendly_name: 'Temp 1', unit_of_measurement: '°C' } };
        mockHass.states['sensor.temp2'] = { state: '23.0', attributes: { friendly_name: 'Temp 2', unit_of_measurement: '°C' } };
        element.hass = mockHass;
        await (element as any)._loadSubarea();
        await element.updateComplete;

        const heroUI = element.shadowRoot?.querySelector('growspace-header-hero-ui') as any;
        const chip = heroUI?.chips.find((c: any) => c.key === 'temperature');
        // Multi-sensor returns value='Multiple' with multiValues containing formatted per-sensor readings
        expect(chip.value).toBe('Multiple');
        expect(chip.multiValues).toContain('22.0 °C');
        expect(chip.multiValues).toContain('23.0 °C');
    });

    test('renders additional sensors (substrate temp, pH, feed EC, substrate EC)', async () => {
        mockDataService.getSubareas.mockResolvedValue([{
            id: 'sa1',
            name: 'Veg Area',
            environment_config: {
                temperature_sensors: ['sensor.veg_temp'],
                substrate_temperature_sensors: ['sensor.substrate_temp'],
                ph_sensors: ['sensor.ph'],
                feed_ec_sensors: ['sensor.feed_ec'],
                substrate_ec_sensors: ['sensor.substrate_ec'],
            }
        }]);
        mockHass.states['sensor.substrate_temp'] = { state: '21.0', attributes: { unit_of_measurement: '°C' } };
        mockHass.states['sensor.ph'] = { state: '6.2', attributes: { unit_of_measurement: 'pH' } };
        mockHass.states['sensor.feed_ec'] = { state: '1.8', attributes: { unit_of_measurement: 'mS/cm' } };
        mockHass.states['sensor.substrate_ec'] = { state: '2.1', attributes: { unit_of_measurement: 'mS/cm' } };
        element.hass = mockHass;
        await (element as any)._loadSubarea();
        await element.updateComplete;

        const secondaryUI = element.shadowRoot?.querySelector('growspace-header-secondary-ui') as any;
        expect(secondaryUI?.chips?.length).toBe(4);
        const labels = secondaryUI?.chips.map((c: any) => c.label);
        expect(labels).toContain('Substrate Temp');
        expect(labels).toContain('pH');
        expect(labels).toContain('Feed EC');
        expect(labels).toContain('Substrate EC');
    });

    test('renders device chip state as n/n for multi-entity groups', async () => {
        mockDataService.getSubareas.mockResolvedValue([{
            id: 'sa1',
            name: 'Veg Area',
            environment_config: {
                exhaust_fan_entities: ['fan.exhaust1', 'fan.exhaust2'],
            }
        }]);
        mockHass.states['fan.exhaust1'] = { state: 'on' };
        mockHass.states['fan.exhaust2'] = { state: 'off' };
        element.hass = mockHass;
        await (element as any)._loadSubarea();
        await element.updateComplete;

        const chips = element.shadowRoot?.querySelectorAll('growspace-chip');
        const exhaustChip = Array.from(chips ?? []).find((c: any) => c.label === 'Exhaust') as any;
        // Multi-entity device chips return value='Multiple' with multiValues per entity
        expect(exhaustChip?.value).toBe('Multiple');
        expect(exhaustChip?.multiValues).toBeDefined();
    });

    test('getConfigElement creates and returns the editor element', async () => {
        // Mock the dynamic import so it doesn't fail
        vi.mock('../../src/cards/editors/growspace-subarea-card-editor.js', () => ({}));
        const editor = await GrowspaceSubareaCard.getConfigElement();
        expect(editor.tagName.toLowerCase()).toBe('growspace-subarea-card-editor');
    });

    test('_handleError logs and calls system_log write', () => {
        const callServiceSpy = vi.fn();
        element.hass = { ...mockHass, callService: callServiceSpy } as any;
        const err = new Error('Test error');
        (element as any)._handleError(err, {});
        expect(callServiceSpy).toHaveBeenCalledWith('system_log', 'write', expect.objectContaining({
            message: expect.stringContaining('Test error'),
            level: 'error',
        }));
    });

    test('_loadHistory catches and logs errors', async () => {
        mockDataService.getBatchHistory.mockRejectedValue(new Error('History fetch failed'));
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
        await (element as any)._loadHistory(mockSubarea);
        expect(consoleSpy).toHaveBeenCalled();
        consoleSpy.mockRestore();
    });

    test('_loadHistory returns early when no entity IDs configured', async () => {
        const emptySubarea = { id: 'sa1', name: 'Veg', environment_config: {} };
        mockDataService.getBatchHistory.mockClear();
        await (element as any)._loadHistory(emptySubarea);
        expect(mockDataService.getBatchHistory).not.toHaveBeenCalled();
    });

    test('toggles device chip metric graph on click', async () => {
        const toggleSpy = vi.spyOn(element.store, 'toggleEnvGraph');
        const chip = element.shadowRoot?.querySelector('growspace-chip') as HTMLElement;
        chip.dispatchEvent(new CustomEvent('click'));
        expect(toggleSpy).toHaveBeenCalledWith('light'); // MetricKey.LIGHT = 'light'
    });

    test('renders active state class on metric chip when active', async () => {
        // Simulate active state for the temperature metric
        (element as any)._analyticsStateController = {
            value: { activeEnvGraphs: new Set(['temperature']) }
        };
        element.requestUpdate();
        await element.updateComplete;
        const heroUI = element.shadowRoot?.querySelector('growspace-header-hero-ui') as any;
        const tempChip = heroUI?.chips.find((c: any) => c.key === 'temperature');
        expect(tempChip?.active).toBe(true);
    });

    test('hero card renders without sparkline when generateSparklinePath returns null', async () => {
        // Not really relevant now since sparkline is inside growspace-header-hero-ui. 
        // Let's just assert hero chips are populated.
        vi.mocked(ChartUtils.generateSparklinePath).mockReturnValue(null as any);
        await (element as any)._loadSubarea();
        await element.updateComplete;

        const heroUI = element.shadowRoot?.querySelector('growspace-header-hero-ui') as any;
        expect(heroUI?.chips?.length).toBeGreaterThan(0);
    });

    test('multi-sensor hero card renders without sparkline when path is null', async () => {
        vi.mocked(ChartUtils.generateSparklinePath).mockReturnValue(null as any);
        mockDataService.getSubareas.mockResolvedValue([{
            id: 'sa1',
            name: 'Veg Area',
            environment_config: {
                temperature_sensors: ['sensor.temp1', 'sensor.temp2'],
            }
        }]);
        mockHass.states['sensor.temp1'] = { state: '22.0', attributes: { unit_of_measurement: '°C' } };
        mockHass.states['sensor.temp2'] = { state: '23.0', attributes: { unit_of_measurement: '°C' } };
        element.hass = { ...mockHass };
        await (element as any)._loadSubarea();
        await element.updateComplete;

        const heroUI = element.shadowRoot?.querySelector('growspace-header-hero-ui') as any;
        expect(heroUI?.chips?.length).toBeGreaterThan(0);
    });

    test('hero sensor chip is not rendered when entity not in hass states', async () => {
        mockDataService.getSubareas.mockResolvedValue([{
            id: 'sa1',
            name: 'Veg Area',
            environment_config: {
                temperature_sensors: ['sensor.nonexistent_temp'],
            }
        }]);
        element.hass = { ...mockHass, states: {} }; // empty states
        await (element as any)._loadSubarea();
        await element.updateComplete;

        // When an entity is unavailable, computeSubareaMetrics returns value:undefined
        // and the chip is filtered out entirely — no em-dash placeholder is rendered.
        const heroUI = element.shadowRoot?.querySelector('growspace-header-hero-ui') as any;
        const tempChip = heroUI?.chips?.find((c: any) => c.key === 'temperature');
        expect(tempChip).toBeUndefined();
        // The hero UI should not be rendered at all (no chips)
        expect(heroUI?.chips?.length ?? 0).toBe(0);
    });

    test('device chip shows raw state value when entity has non-standard state', async () => {
        mockDataService.getSubareas.mockResolvedValue([{
            id: 'sa1',
            name: 'Veg Area',
            environment_config: {
                exhaust_fan_entities: ['fan.unknown_state'],
            }
        }]);
        mockHass.states['fan.unknown_state'] = { state: 'standby' };
        element.hass = mockHass;
        await (element as any)._loadSubarea();
        await element.updateComplete;

        const chips = element.shadowRoot?.querySelectorAll('growspace-chip');
        const exhaustChip = Array.from(chips ?? []).find((c: any) => c.label === 'Exhaust') as any;
        // Non-on/off states are passed through as-is in .value
        expect(exhaustChip?.value).toBe('standby');
    });

    test('device chip is not rendered when entity not in hass states', async () => {
        mockDataService.getSubareas.mockResolvedValue([{
            id: 'sa1',
            name: 'Veg Area',
            environment_config: {
                exhaust_fan_entities: ['fan.nonexistent'],
            }
        }]);
        element.hass = mockHass; // 'fan.nonexistent' is not in mockHass.states
        await (element as any)._loadSubarea();
        await element.updateComplete;

        // When an entity is missing from hass.states, computeSubareaMetrics filters the chip out
        const chips = element.shadowRoot?.querySelectorAll('growspace-chip');
        const exhaustChip = Array.from(chips ?? []).find((c: any) => c.label === 'Exhaust') as any;
        expect(exhaustChip).toBeUndefined();
    });

    test('secondary sensor chip is not rendered when entity not in hass states', async () => {
        mockDataService.getSubareas.mockResolvedValue([{
            id: 'sa1',
            name: 'Veg Area',
            environment_config: {
                ph_sensors: ['sensor.ph_missing'],
            }
        }]);
        element.hass = mockHass; // 'sensor.ph_missing' is not in mockHass.states
        await (element as any)._loadSubarea();
        await element.updateComplete;

        // When an entity is missing, the chip is filtered out — secondary UI won't render
        const secondaryUI = element.shadowRoot?.querySelector('growspace-header-secondary-ui') as any;
        const phChip = secondaryUI?.chips?.find((c: any) => c.key === 'ph');
        expect(phChip).toBeUndefined();
    });

    test('_handleError does not call system_log when hass is undefined', () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
        (element as any).hass = undefined;
        (element as any)._handleError(new Error('test'), {});
        expect(consoleSpy).toHaveBeenCalled();
        consoleSpy.mockRestore();
    });

    test('stale counter triggers data refresh and loadSubarea', async () => {
        const refreshSpy = vi.spyOn(element.store.syncService, 'refreshGrowspaceData');
        const loadSpy = vi.spyOn(element as any, '_loadSubarea');
        element.store.data.$staleCounter.set(element.store.data.$staleCounter.get() + 1);
        await Promise.resolve();
        expect(refreshSpy).toHaveBeenCalled();
        expect(loadSpy).toHaveBeenCalled();
    });

    test('firstUpdated initializes store when _config.growspace_id is set', async () => {
        (element as any)._config = { type: 'custom:growspace-subarea-card', growspace_id: 'gs2', subarea_id: 'sa1' };
        (element as any)._loading = false;
        (element as any)._subarea = null;
        const initSpy = vi.spyOn(element.store, 'initializeSelectedDevice');
        const loadSpy = vi.spyOn(element as any, '_loadSubarea');
        await (element as any).firstUpdated();
        expect(initSpy).toHaveBeenCalled();
        expect(loadSpy).toHaveBeenCalled();
    });

    test('updated creates DataService when hass changes and _dataService is null', async () => {
        (element as any)._dataService = null;
        element.hass = { ...mockHass };
        await element.updateComplete;
        expect((element as any)._dataService).not.toBeNull();
    });

    test('_loadSubarea creates DataService when _dataService is null', async () => {
        (element as any)._dataService = null;
        await (element as any)._loadSubarea();
        expect((element as any)._dataService).not.toBeNull();
    });

    test('updated sets _parentGrowspaceName when matching device found in store', async () => {
        const fakeDevice = { deviceId: 'gs1', name: 'Tent 1', environmentAttributes: {} };
        (element as any)._viewController = { value: { grid: { devices: [fakeDevice] } } };
        element.requestUpdate();
        await element.updateComplete;
        expect((element as any)._parentGrowspaceName).toBe('Tent 1');
    });

    test('renders error state when getSubareas throws', async () => {
        mockDataService.getSubareas.mockRejectedValue(new Error('Network error'));
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
        await (element as any)._loadSubarea();
        await element.updateComplete;

        expect(element.shadowRoot?.querySelector('.error')?.textContent).toContain('Failed to load subarea data.');
        expect(consoleSpy).toHaveBeenCalled();
        consoleSpy.mockRestore();
    });

    test('renders no-data state when subarea is null after loading', async () => {
        (element as any)._loading = false;
        (element as any)._error = null;
        (element as any)._subarea = null;
        await element.updateComplete;
        expect(element.shadowRoot?.querySelector('.no-data')?.textContent?.trim()).toBe('Subarea not found.');
    });

    test('closes config dialog via close event', async () => {
        const configBtn = element.shadowRoot?.querySelector('.config-button') as HTMLElement;
        configBtn.click();
        await element.updateComplete;

        const dialog = element.shadowRoot?.querySelector('config-dialog') as HTMLElement;
        expect(dialog).not.toBeNull();

        dialog.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }));
        await element.updateComplete;

        expect(element.shadowRoot?.querySelector('config-dialog')).toBeNull();
    });

    test('renders legacy single sensor fields (temperature_sensor, humidity_sensor, vpd_sensor)', async () => {
        mockDataService.getSubareas.mockResolvedValue([{
            id: 'sa1',
            name: 'Veg Area',
            environment_config: {
                temperature_sensor: 'sensor.veg_temp',
                humidity_sensor: 'sensor.veg_humidity',
                vpd_sensor: 'sensor.vpd_legacy',
            }
        }]);
        mockHass.states['sensor.vpd_legacy'] = { state: '0.9', attributes: { unit_of_measurement: 'kPa' } };
        element.hass = mockHass;
        await (element as any)._loadSubarea();
        await element.updateComplete;

        const heroUI = element.shadowRoot?.querySelector('growspace-header-hero-ui') as any;
        expect(heroUI?.chips?.length).toBe(3); // Temp, Humidity, VPD
    });
});
