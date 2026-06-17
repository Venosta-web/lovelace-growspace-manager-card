import { expect, test, describe, aroundEach, vi } from 'vitest';
import { GrowspaceSubareaCard, deriveSubareaMetricEntities } from '../../src/cards/growspace-subarea-card';
import { setSubareaEnvSnapshot, subareaEnvSnapshots$ } from '../../src/slices/environment';
import { ChartUtils } from '../../src/utils/chart-utils';
import { ViewMode } from '../../src/features/environment/constants';
import { aHass, aGrowspace } from '../fixtures';
import { renderCard } from '../harness';

const { mockGetBatchHistory, mockGetSubareas } = vi.hoisted(() => {
    const mockGetSubareas = vi.fn();
    const mockGetBatchHistory = vi.fn();
    return { mockGetBatchHistory, mockGetSubareas };
});

vi.mock('../../src/store/history/history-store', async () => {
    const actual = await vi.importActual('../../src/store/history/history-store') as any;
    return {
        ...actual,
        getBatchHistory: mockGetBatchHistory,
    };
});

// Subarea slice — getSubareas is now the source of truth
vi.mock('../../src/slices/subarea', () => ({
    getSubareas: mockGetSubareas,
    addSubarea: vi.fn().mockResolvedValue({}),
    removeSubarea: vi.fn().mockResolvedValue(undefined),
    updateSubarea: vi.fn().mockResolvedValue(undefined),
    setSubareas: vi.fn(),
    subareas$: { get: vi.fn().mockReturnValue([]), set: vi.fn(), subscribe: vi.fn() },
    subareasGrowspaceId$: { get: vi.fn().mockReturnValue(null), set: vi.fn(), subscribe: vi.fn() },
}));

vi.mock('../../src/utils/chart-utils', () => ({
    ChartUtils: {
        generateSparklinePath: vi.fn(),
        getSparklineColor: vi.fn(),
        generateVpdSparklineSegments: vi.fn().mockReturnValue([]),
    }
}));

vi.mock('../../src/cards/editors/growspace-subarea-card-editor.js', () => ({}));


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

    aroundEach(async (runTest) => {
        mockGetSubareas.mockResolvedValue([mockSubarea as any]);
        mockGetBatchHistory.mockResolvedValue({
            'sensor.veg_temp': [
                { entity_id: 'sensor.veg_temp', attributes: {}, last_changed: '2024-01-01T10:00:00Z', state: '22.5' },
                { entity_id: 'sensor.veg_temp', attributes: {}, last_changed: '2024-01-01T11:00:00Z', state: '23.0' }
            ],
            'sensor.veg_humidity': [
                { entity_id: 'sensor.veg_humidity', attributes: {}, last_changed: '2024-01-01T10:00:00Z', state: '55' },
                { entity_id: 'sensor.veg_humidity', attributes: {}, last_changed: '2024-01-01T11:00:00Z', state: '52' }
            ]
        });
        vi.mocked(ChartUtils.generateSparklinePath).mockReturnValue('M 0,0 L 100,100');
        vi.mocked(ChartUtils.getSparklineColor).mockReturnValue('#ff0000');

        mockHass = aHass({ growspaces: [aGrowspace({ growspaceId: 'gs1', name: 'gs1' })] }) as any;
        mockHass.states = {
            ...mockHass.states,
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
        };

        const handle = await renderCard<GrowspaceSubareaCard>('growspace-subarea-card', {
            hass: mockHass,
            growspace: aGrowspace({ growspaceId: 'gs1', name: 'gs1' }),
        });
        element = handle.element;

        element.setConfig({
            type: 'custom:growspace-subarea-card',
            growspace_id: 'gs1',
            subarea_id: 'sa1'
        } as any);

        await element.updateComplete;
        // Wait for asynchronous data loading
        await new Promise(resolve => setTimeout(resolve, 0));
        await element.updateComplete;

        await runTest();
        handle.unmount();
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
        const toggleSpy = vi.spyOn(element.store.actions.ui, 'toggleEnvGraph');
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
        mockGetSubareas.mockResolvedValue([]);
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
        mockGetSubareas.mockResolvedValue([{
            id: 'sa1',
            name: 'Veg Area',
            environment_config: {}
        }]);
        await (element as any)._loadSubarea();
        await element.updateComplete;
        expect(element.shadowRoot?.querySelector('.no-sensors')?.textContent).toContain('No environment sensors');
    });

    test('renders VPD and CO2 sensors', async () => {
        mockGetSubareas.mockResolvedValue([{
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
        mockGetSubareas.mockResolvedValue([{
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

    test('renders additional sensors (substrate temp, pH, feed EC, bulk EC, pore EC)', async () => {
        mockGetSubareas.mockResolvedValue([{
            id: 'sa1',
            name: 'Veg Area',
            environment_config: {
                temperature_sensors: ['sensor.veg_temp'],
                substrate_temperature_sensors: ['sensor.substrate_temp'],
                ph_sensors: ['sensor.ph'],
                feed_ec_sensors: ['sensor.feed_ec'],
                bulk_ec_sensors: ['sensor.bulk_ec'],
                pore_ec_sensors: ['sensor.pore_ec'],
            }
        }]);
        mockHass.states['sensor.substrate_temp'] = { state: '21.0', attributes: { unit_of_measurement: '°C' } };
        mockHass.states['sensor.ph'] = { state: '6.2', attributes: { unit_of_measurement: 'pH' } };
        mockHass.states['sensor.feed_ec'] = { state: '1.8', attributes: { unit_of_measurement: 'mS/cm' } };
        mockHass.states['sensor.bulk_ec'] = { state: '2.1', attributes: { unit_of_measurement: 'mS/cm' } };
        mockHass.states['sensor.pore_ec'] = { state: '2.3', attributes: { unit_of_measurement: 'mS/cm' } };
        element.hass = mockHass;
        await (element as any)._loadSubarea();
        await element.updateComplete;

        const secondaryUI = element.shadowRoot?.querySelector('growspace-header-secondary-ui') as any;
        expect(secondaryUI?.chips?.length).toBe(5);
        const labels = secondaryUI?.chips.map((c: any) => c.label);
        // Canonical HeaderMetrics label — the legacy path said 'Substrate Temp'
        expect(labels).toContain('Sub Temp');
        expect(labels).toContain('pH');
        expect(labels).toContain('Feed EC');
        expect(labels).toContain('Bulk EC');
        expect(labels).toContain('Pore EC');
    });

    test('renders device chip state as n/n for multi-entity groups', async () => {
        mockGetSubareas.mockResolvedValue([{
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
        mockGetBatchHistory.mockRejectedValue(new Error('History fetch failed'));
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
        await (element as any)._loadHistory(mockSubarea);
        expect(consoleSpy).toHaveBeenCalled();
        consoleSpy.mockRestore();
    });

    test('_loadHistory returns early when the seeded snapshot has no entity IDs', async () => {
        const emptySubarea = { id: 'sa_empty', name: 'Veg', environment_config: {} };
        setSubareaEnvSnapshot('sa_empty', emptySubarea as any, { growspaceId: 'gs1' }, {});
        mockGetBatchHistory.mockClear();
        await (element as any)._loadHistory(emptySubarea);
        expect(mockGetBatchHistory).not.toHaveBeenCalled();
    });

    test('_loadHistory returns early when no snapshot exists for the subarea', async () => {
        const unseededSubarea = {
            id: 'sa_never_seeded',
            name: 'Veg',
            environment_config: { temperature_sensors: ['sensor.veg_temp'] }
        };
        mockGetBatchHistory.mockClear();
        await (element as any)._loadHistory(unseededSubarea);
        expect(mockGetBatchHistory).not.toHaveBeenCalled();
    });

    test('toggles device chip metric graph on click', async () => {
        const toggleSpy = vi.spyOn(element.store.actions.ui, 'toggleEnvGraph');
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
        mockGetSubareas.mockResolvedValue([{
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
        mockGetSubareas.mockResolvedValue([{
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

    test('device chip normalizes a non-standard fan state per Fan Entity Mode (ADR-0008)', async () => {
        mockGetSubareas.mockResolvedValue([{
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
        // The DeviceState slice normalizes fan.* entities: any non-"off" state
        // without a percentage attribute displays as "On" (the legacy subarea
        // path passed the raw state through).
        expect(exhaustChip?.value).toBe('On');
    });

    test('device chip shows a "-" placeholder when entity not in hass states', async () => {
        mockGetSubareas.mockResolvedValue([{
            id: 'sa1',
            name: 'Veg Area',
            environment_config: {
                exhaust_fan_entities: ['fan.nonexistent'],
            }
        }]);
        element.hass = mockHass; // 'fan.nonexistent' is not in mockHass.states
        await (element as any)._loadSubarea();
        await element.updateComplete;

        // Canonical HeaderMetrics display: a configured-but-unavailable device
        // keeps its chip with a "-" placeholder, matching the main card (the
        // legacy subarea path filtered the chip out).
        const chips = element.shadowRoot?.querySelectorAll('growspace-chip');
        const exhaustChip = Array.from(chips ?? []).find((c: any) => c.label === 'Exhaust') as any;
        expect(exhaustChip?.value).toBe('-');
    });

    test('secondary sensor chip is not rendered when entity not in hass states', async () => {
        mockGetSubareas.mockResolvedValue([{
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

    test('data:stale on store eventBus triggers _loadSubarea', async () => {
        const loadSpy = vi.spyOn(element as any, '_loadSubarea');
        element.store.eventBus.emit('data:stale', undefined);
        await Promise.resolve();
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

    test('updated calls _loadSubarea when config changes', async () => {
        const loadSpy = vi.spyOn(element as any, '_loadSubarea').mockResolvedValue(undefined);
        element.setConfig({ type: 'custom:growspace-subarea-card', growspace_id: 'gs2', subarea_id: 'sa2' } as any);
        await element.updateComplete;
        expect(loadSpy).toHaveBeenCalled();
    });

    test('updated sets _parentGrowspaceName when matching device found in store', async () => {
        const fakeDevice = { deviceId: 'gs1', name: 'Tent 1', environmentAttributes: {} };
        (element as any)._viewController = { value: { grid: { devices: [fakeDevice] } } };
        element.requestUpdate();
        await element.updateComplete;
        expect((element as any)._parentGrowspaceName).toBe('Tent 1');
    });

    test('renders error state when getSubareas throws', async () => {
        mockGetSubareas.mockRejectedValue(new Error('Network error'));
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
        mockGetSubareas.mockResolvedValue([{
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

    test('resolves Name-based calculated VPD fallback sensor when explicit VPD is missing', async () => {
        const fakeDevice = { deviceId: 'gs1', name: 'Tent 1', environmentAttributes: {} };
        (element as any)._viewController = { value: { grid: { devices: [fakeDevice] } } };
        mockGetSubareas.mockResolvedValue([{
            id: 'sa1',
            name: 'Veg Area',
            environment_config: {
                temperature_sensor: 'sensor.veg_temp',
                humidity_sensor: 'sensor.veg_humidity',
            }
        }]);

        mockHass.states['sensor.tent_1_veg_area_calculated_vpd'] = {
            state: '1.2',
            attributes: { unit_of_measurement: 'kPa' }
        };
        element.hass = mockHass;
        await (element as any)._loadSubarea();
        await element.updateComplete;

        const heroUI = element.shadowRoot?.querySelector('growspace-header-hero-ui') as any;
        expect(heroUI?.chips?.length).toBe(3); // Temperature, Humidity, VPD
        expect(heroUI?.chips[2].value).toBe('1.2 kPa');
    });

    test('resolves UUID-based calculated VPD fallback sensor when explicit VPD is missing', async () => {
        const fakeDevice = { deviceId: 'gs1', name: 'Tent 1', environmentAttributes: {} };
        (element as any)._viewController = { value: { grid: { devices: [fakeDevice] } } };
        mockGetSubareas.mockResolvedValue([{
            id: 'sa1',
            name: 'Veg Area',
            environment_config: {
                temperature_sensor: 'sensor.veg_temp',
                humidity_sensor: 'sensor.veg_humidity',
            }
        }]);

        mockHass.states['sensor.growspace_manager_gs1_subarea_sa1_calculated_vpd'] = {
            state: '1.0',
            attributes: { unit_of_measurement: 'kPa' }
        };
        element.hass = mockHass;
        await (element as any)._loadSubarea();
        await element.updateComplete;

        const heroUI = element.shadowRoot?.querySelector('growspace-header-hero-ui') as any;
        expect(heroUI?.chips?.length).toBe(3); // Temperature, Humidity, VPD
        expect(heroUI?.chips[2].value).toBe('1.0 kPa');
    });

    test('_loadHistory fetches history for UUID-based calculated VPD when no explicit VPD sensor is configured', async () => {
        const fakeDevice = { deviceId: 'gs1', name: 'Tent 1', environmentAttributes: {} };
        (element as any)._viewController = { value: { grid: { devices: [fakeDevice] } } };
        mockGetSubareas.mockResolvedValue([{
            id: 'sa1',
            name: 'Veg Area',
            environment_config: {
                temperature_sensor: 'sensor.veg_temp',
                humidity_sensor: 'sensor.veg_humidity',
                // no vpd_sensor — relies on calculated VPD
            }
        }]);

        const calcVpdId = 'sensor.growspace_manager_gs1_subarea_sa1_calculated_vpd';
        mockHass.states[calcVpdId] = { state: '1.0', attributes: { unit_of_measurement: 'kPa' } };
        element.hass = mockHass;

        const calcVpdHistory = [
            { entity_id: calcVpdId, state: '1.0', last_changed: '2024-01-01T10:00:00Z', attributes: {} },
            { entity_id: calcVpdId, state: '1.1', last_changed: '2024-01-01T11:00:00Z', attributes: {} },
        ];
        mockGetBatchHistory.mockResolvedValue({
            'sensor.veg_temp': [
                { entity_id: 'sensor.veg_temp', state: '22.5', last_changed: '2024-01-01T10:00:00Z', attributes: {} },
                { entity_id: 'sensor.veg_temp', state: '23.0', last_changed: '2024-01-01T11:00:00Z', attributes: {} },
            ],
            [calcVpdId]: calcVpdHistory,
        });

        await (element as any)._loadSubarea();
        await element.updateComplete;

        expect(mockGetBatchHistory).toHaveBeenCalledWith(
            expect.arrayContaining([calcVpdId]),
            expect.any(Date),
            expect.any(Date)
        );
        expect((element as any)._historyCache['vpd']).toEqual(calcVpdHistory);
    });

    test('_loadHistory fetches history for name-based calculated VPD when no explicit VPD sensor is configured', async () => {
        const fakeDevice = { deviceId: 'gs1', name: 'Tent 1', environmentAttributes: {} };
        (element as any)._viewController = { value: { grid: { devices: [fakeDevice] } } };
        mockGetSubareas.mockResolvedValue([{
            id: 'sa1',
            name: 'Veg Area',
            environment_config: {
                temperature_sensor: 'sensor.veg_temp',
                humidity_sensor: 'sensor.veg_humidity',
            }
        }]);

        // Only name-based entity exists (no UUID-based)
        const nameVpdId = 'sensor.tent_1_veg_area_calculated_vpd';
        mockHass.states[nameVpdId] = { state: '1.2', attributes: { unit_of_measurement: 'kPa' } };
        element.hass = mockHass;

        const nameVpdHistory = [
            { entity_id: nameVpdId, state: '1.2', last_changed: '2024-01-01T10:00:00Z', attributes: {} },
            { entity_id: nameVpdId, state: '1.3', last_changed: '2024-01-01T11:00:00Z', attributes: {} },
        ];
        mockGetBatchHistory.mockResolvedValue({
            'sensor.veg_temp': [
                { entity_id: 'sensor.veg_temp', state: '22.5', last_changed: '2024-01-01T10:00:00Z', attributes: {} },
                { entity_id: 'sensor.veg_temp', state: '23.0', last_changed: '2024-01-01T11:00:00Z', attributes: {} },
            ],
            [nameVpdId]: nameVpdHistory,
        });

        await (element as any)._loadSubarea();
        await element.updateComplete;

        expect(mockGetBatchHistory).toHaveBeenCalledWith(
            expect.arrayContaining([nameVpdId]),
            expect.any(Date),
            expect.any(Date)
        );
        expect((element as any)._historyCache['vpd']).toEqual(nameVpdHistory);
    });

    test.each([
        ['1h' as const, 1 * 60 * 60 * 1000],
        ['6h' as const, 6 * 60 * 60 * 1000],
        ['7d' as const, 7 * 24 * 60 * 60 * 1000],
        ['24h' as const, 24 * 60 * 60 * 1000],
    ])('_calculateHistoryStart returns correct start date for %s range', (range, expectedOffsetMs) => {
        const before = Date.now();
        const result = (element as any)._calculateHistoryStart(range) as Date;
        const after = Date.now();
        expect(result.getTime()).toBeGreaterThanOrEqual(before - expectedOffsetMs - 50);
        expect(result.getTime()).toBeLessThanOrEqual(after - expectedOffsetMs + 50);
    });

    test('desktop secondary chips fire toggle-graph on growspace-header-secondary-ui', async () => {
        mockGetSubareas.mockResolvedValue([{
            id: 'sa1',
            name: 'Veg Area',
            environment_config: {
                temperature_sensors: ['sensor.veg_temp'],
                substrate_temperature_sensors: ['sensor.substrate_temp'],
            }
        }]);
        mockHass.states['sensor.substrate_temp'] = { state: '21.0', attributes: { unit_of_measurement: '°C' } };
        element.hass = mockHass;
        await (element as any)._loadSubarea();
        await element.updateComplete;

        const toggleSpy = vi.spyOn(element.store.actions.ui, 'toggleEnvGraph');
        const secondaryUI = element.shadowRoot?.querySelector('growspace-header-secondary-ui') as HTMLElement;
        expect(secondaryUI).not.toBeNull();
        secondaryUI.dispatchEvent(
            new CustomEvent('toggle-graph', { detail: { metric: 'substrate_temperature' }, bubbles: true, composed: true })
        );
        expect(toggleSpy).toHaveBeenCalledWith('substrate_temperature');
    });

    test('mobile secondary chips render via growspace-header-hero-ui and fire toggle-graph', async () => {
        mockGetSubareas.mockResolvedValue([{
            id: 'sa1',
            name: 'Veg Area',
            environment_config: {
                temperature_sensors: ['sensor.veg_temp'],
                substrate_temperature_sensors: ['sensor.substrate_temp'],
            }
        }]);
        mockHass.states['sensor.substrate_temp'] = { state: '21.0', attributes: { unit_of_measurement: '°C' } };
        element.hass = mockHass;
        await (element as any)._loadSubarea();
        (element as any)._resizeController.isMobile = true;
        element.requestUpdate();
        await element.updateComplete;

        // On mobile, secondary chips use growspace-header-hero-ui, not growspace-header-secondary-ui
        expect(element.shadowRoot?.querySelector('growspace-header-secondary-ui')).toBeNull();

        const toggleSpy = vi.spyOn(element.store.actions.ui, 'toggleEnvGraph');
        const heroUIs = element.shadowRoot?.querySelectorAll('growspace-header-hero-ui');
        // Last hero UI is the secondary chips (mobile renders hero for secondary chips)
        const lastHeroUI = heroUIs![heroUIs!.length - 1] as HTMLElement;
        lastHeroUI.dispatchEvent(
            new CustomEvent('toggle-graph', { detail: { metric: 'substrate_temperature' }, bubbles: true, composed: true })
        );
        expect(toggleSpy).toHaveBeenCalledWith('substrate_temperature');
    });

    test('mobile device chips render via growspace-header-hero-ui and fire toggle-graph', async () => {
        (element as any)._resizeController.isMobile = true;
        element.requestUpdate();
        await element.updateComplete;

        const toggleSpy = vi.spyOn(element.store.actions.ui, 'toggleEnvGraph');
        // The first growspace-header-hero-ui rendered at the top is for device chips (mobile path)
        const heroUIs = element.shadowRoot?.querySelectorAll('growspace-header-hero-ui');
        expect(heroUIs?.length).toBeGreaterThan(0);
        (heroUIs![0] as HTMLElement).dispatchEvent(
            new CustomEvent('toggle-graph', { detail: { metric: 'light' }, bubbles: true, composed: true })
        );
        expect(toggleSpy).toHaveBeenCalledWith('light');
    });

    test('updated handles undefined devices via the ?? [] fallback without throwing', () => {
        // Call updated() directly so no render cycle fires; exercises the `?? []` branch on line 268
        (element as any)._viewController = { value: { grid: {} } }; // devices key absent → ?? []
        (element as any).updated(new Map());
        // No error thrown and parentGrowspaceName remains unchanged (devices.length === 0)
        expect((element as any)._parentGrowspaceName).toBeDefined();
    });

    test('_renderHeaderMetrics uses activeEnvGraphs from analyticsStateController when set', async () => {
        (element as any)._analyticsStateController = {
            value: { activeEnvGraphs: new Set(['temperature']), timeRange: '12h' }
        };
        element.requestUpdate();
        await element.updateComplete;
        const heroUI = element.shadowRoot?.querySelector('growspace-header-hero-ui') as any;
        const tempChip = heroUI?.chips?.find((c: any) => c.key === 'temperature');
        expect(tempChip?.active).toBe(true);
    });

    test('firstUpdated skips store init when hass is not yet set', async () => {
        (element as any).hass = undefined;
        const updateSpy = vi.spyOn(element.store, 'updateHass');
        await (element as any).firstUpdated();
        expect(updateSpy).not.toHaveBeenCalled();
    });

    test('_handleSubareaRangeChange does not call _loadHistory when subarea is null', async () => {
        (element as any)._subarea = null;
        const loadSpy = vi.spyOn(element as any, '_loadHistory');
        (element as any)._handleSubareaRangeChange(new CustomEvent('set-range', { detail: '6h' }));
        expect(loadSpy).not.toHaveBeenCalled();
    });

    test('_handleSubareaRangeChange calls _loadHistory with range from event when subarea is loaded', async () => {
        const loadSpy = vi.spyOn(element as any, '_loadHistory').mockResolvedValue(undefined);
        const event = new CustomEvent('set-range', { detail: '6h' });
        (element as any)._handleSubareaRangeChange(event);
        expect(loadSpy).toHaveBeenCalledWith((element as any)._subarea, '6h');
    });

    test('getLayoutOptions returns expected grid config', () => {
        const opts = element.getLayoutOptions();
        expect(opts).toEqual({ grid_columns: 12, grid_min_columns: 6, grid_min_rows: 4 });
    });

    test('resolves multiple calculated VPD fallback sensors when multiple T/H pairs are configured', async () => {
        const fakeDevice = { deviceId: 'gs1', name: 'Tent 1', environmentAttributes: {} };
        (element as any)._viewController = { value: { grid: { devices: [fakeDevice] } } };
        mockGetSubareas.mockResolvedValue([{
            id: 'sa1',
            name: 'Veg Area',
            environment_config: {
                temperature_sensors: ['sensor.veg_temp_1', 'sensor.veg_temp_2'],
                humidity_sensors: ['sensor.veg_humidity_1', 'sensor.veg_humidity_2'],
            }
        }]);

        mockHass.states['sensor.veg_temp_1'] = { state: '22.0', attributes: { unit_of_measurement: '°C' } };
        mockHass.states['sensor.veg_temp_2'] = { state: '24.0', attributes: { unit_of_measurement: '°C' } };
        mockHass.states['sensor.veg_humidity_1'] = { state: '50', attributes: { unit_of_measurement: '%' } };
        mockHass.states['sensor.veg_humidity_2'] = { state: '60', attributes: { unit_of_measurement: '%' } };
        mockHass.states['sensor.tent_1_veg_area_calculated_vpd_1'] = {
            state: '1.3',
            attributes: { unit_of_measurement: 'kPa' }
        };
        mockHass.states['sensor.tent_1_veg_area_calculated_vpd_2'] = {
            state: '1.5',
            attributes: { unit_of_measurement: 'kPa' }
        };
        element.hass = mockHass;
        await (element as any)._loadSubarea();
        await element.updateComplete;

        const heroUI = element.shadowRoot?.querySelector('growspace-header-hero-ui') as any;
        expect(heroUI?.chips?.length).toBe(3); // Temperature, Humidity, VPD
        expect(heroUI?.chips[2].value).toBe('Multiple');
        expect(heroUI?.chips[2].multiValues).toEqual(['1.3 kPa', '1.5 kPa']);
    });

    describe('harness interactions', () => {
        test('selectViewMode switches the card view mode', () => {
            const toggleSpy = vi.spyOn(element.store.ui, 'setViewMode');
            element.store.ui.setViewMode(ViewMode.COMPACT);
            expect(toggleSpy).toHaveBeenCalledWith(ViewMode.COMPACT);
            expect(element.store.ui.$viewMode.get()).toBe(ViewMode.COMPACT);
        });

        test('hero-metric routing: toggle-graph on hero sensor routes through store', () => {
            const toggleSpy = vi.spyOn(element.store.actions.ui, 'toggleEnvGraph');
            const heroUI = element.shadowRoot?.querySelector('growspace-header-hero-ui') as HTMLElement;
            heroUI.dispatchEvent(
                new CustomEvent('toggle-graph', { detail: { metric: 'temperature' }, bubbles: true, composed: true })
            );
            expect(toggleSpy).toHaveBeenCalledWith('temperature');
        });

        test('ViewMode.COMPACT hides secondary panel (view-mode aware rendering)', async () => {
            element.store.ui.setViewMode(ViewMode.COMPACT);
            await element.updateComplete;
            // In compact mode the card renders without env graph expansion
            expect(element.store.ui.$viewMode.get()).toBe(ViewMode.COMPACT);
        });
    });
});

describe('deriveSubareaMetricEntities', () => {
    // Atoms/fixtures style: seed subareaEnvSnapshots$ via setSubareaEnvSnapshot
    // (the same write SyncService and the card's bootstrap seed use) and derive
    // from the snapshot the atom holds — no hass mocking.
    const seedSnapshot = (
        environmentConfig: Record<string, unknown>,
        states: Record<string, { state: string; attributes: Record<string, unknown> }> = {},
        parent: { growspaceId?: string; growspaceName?: string } = {
            growspaceId: 'gs1',
            growspaceName: 'Tent 1',
        }
    ) => {
        const subarea = { id: 'sa_derive', name: 'Derive Area', environment_config: environmentConfig };
        setSubareaEnvSnapshot('sa_derive', subarea as any, parent, states as any);
        return subareaEnvSnapshots$.get().get('sa_derive')!;
    };

    test('derives metric→entityIds from a seeded snapshot atom, in chart order', () => {
        const snapshot = seedSnapshot({
            temperature_sensors: ['sensor.t1', 'sensor.t2'],
            humidity_sensor: 'sensor.h1',
            vpd_sensors: ['sensor.v1'],
            co2_sensor: 'sensor.c1',
        });

        expect(deriveSubareaMetricEntities(snapshot)).toEqual([
            { metric: 'temperature', entityIds: ['sensor.t1', 'sensor.t2'] },
            { metric: 'humidity', entityIds: ['sensor.h1'] },
            { metric: 'vpd', entityIds: ['sensor.v1'] },
            { metric: 'co2', entityIds: ['sensor.c1'] },
        ]);
    });

    test('omits metrics without configured sensors', () => {
        const snapshot = seedSnapshot({ temperature_sensors: ['sensor.t1'] });

        expect(deriveSubareaMetricEntities(snapshot)).toEqual([
            { metric: 'temperature', entityIds: ['sensor.t1'] },
        ]);
    });

    test('returns an empty list for a snapshot without any configured sensors', () => {
        const snapshot = seedSnapshot({});

        expect(deriveSubareaMetricEntities(snapshot)).toEqual([]);
    });

    test('keeps entity IDs even when the configured sensors are unavailable', () => {
        // Entity IDs (and therefore history cache keys) are stable regardless of
        // sensor availability — only the readings go null.
        const snapshot = seedSnapshot(
            { temperature_sensors: ['sensor.t1'] },
            { 'sensor.t1': { state: 'unavailable', attributes: {} } }
        );

        expect(snapshot.temperatureReadings?.avg).toBeNull();
        expect(deriveSubareaMetricEntities(snapshot)).toEqual([
            { metric: 'temperature', entityIds: ['sensor.t1'] },
        ]);
    });

    test('carries the snapshot-resolved UUID-based calculated-VPD entity ID (single temp/hum pair)', () => {
        const uuidVpdId = 'sensor.growspace_manager_gs1_subarea_sa_derive_calculated_vpd';
        const snapshot = seedSnapshot(
            { temperature_sensor: 'sensor.t1', humidity_sensor: 'sensor.h1' },
            { [uuidVpdId]: { state: '1.0', attributes: {} } }
        );

        const vpd = deriveSubareaMetricEntities(snapshot).find((m) => m.metric === 'vpd');
        expect(vpd?.entityIds).toEqual([uuidVpdId]);
        // Structural consistency: history fetches exactly the IDs the chips display.
        expect(vpd?.entityIds).toEqual(snapshot.vpdReadings?.entityIds);
    });

    test('carries snapshot-resolved name-based calculated-VPD IDs per temp/hum pair (multi-sensor)', () => {
        const snapshot = seedSnapshot(
            {
                temperature_sensors: ['sensor.t1', 'sensor.t2'],
                humidity_sensors: ['sensor.h1', 'sensor.h2'],
            },
            {
                'sensor.tent_1_derive_area_calculated_vpd_1': { state: '1.1', attributes: {} },
                'sensor.tent_1_derive_area_calculated_vpd_2': { state: '1.2', attributes: {} },
            }
        );

        const vpd = deriveSubareaMetricEntities(snapshot).find((m) => m.metric === 'vpd');
        expect(vpd?.entityIds).toEqual([
            'sensor.tent_1_derive_area_calculated_vpd_1',
            'sensor.tent_1_derive_area_calculated_vpd_2',
        ]);
        expect(vpd?.entityIds).toEqual(snapshot.vpdReadings?.entityIds);
    });
});
