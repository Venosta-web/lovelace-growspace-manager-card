
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { IrrigationDialog } from '../../../src/dialogs/irrigation-dialog';
import { transition } from '../../../src/dialogs/irrigation-dialog-sm';
import { GrowspaceDevice } from '../../../src/types';
import { GrowspaceType } from '../../../src/constants';
import { irrigationConfigs$, setTankLevels, tankLevels$ } from '../../../src/slices/irrigation';

/** Helper: read a deeply-nested SM field without triggering any reactivity. */
function smRead(el: IrrigationDialog, path: string): unknown {
  return path.split('.').reduce((obj: any, key) => obj?.[key], (el as any)._sm);
}
/** Helper: write a deeply-nested SM field by reassigning _sm so Lit re-renders. */
function smWrite(el: IrrigationDialog, update: (sm: any) => any): void {
  (el as any)._sm = update((el as any)._sm);
}

/**
 * ADR-0019: the Steering tab renders in the decomposed <irrigation-steering-tab>
 * child. Selects the Steering tab by LABEL and returns the child's shadow root so
 * DOM queries pierce it; SM assertions still read el._sm (the Shell updates it
 * from the child's Tab Intents).
 */
async function steeringChild(el: IrrigationDialog): Promise<ShadowRoot> {
  const tabs = el.shadowRoot?.querySelectorAll('.v1-nav-item');
  const steeringTab = Array.from(tabs ?? []).find((t) => t.textContent?.includes('Steering'));
  (steeringTab as HTMLElement | undefined)?.click();
  await el.updateComplete;
  const child = el.shadowRoot?.querySelector('irrigation-steering-tab') as
    | (HTMLElement & { updateComplete: Promise<boolean>; shadowRoot: ShadowRoot })
    | null;
  await child?.updateComplete;
  return child!.shadowRoot;
}

// Mock dependencies
vi.mock('../../../src/features/shared/ui/md3-text-input', () => ({
    Md3TextInput: class extends HTMLElement {
        get value() { return this.getAttribute('value') || ''; }
        set value(v) { this.setAttribute('value', v); }
    }
}));
vi.mock('../../../src/features/shared/ui/md3-number-input', () => ({
    Md3NumberInput: class extends HTMLElement {
        get value() { return this.getAttribute('value') || ''; }
        set value(v) { this.setAttribute('value', v); }
    }
}));
vi.mock('../../../src/features/shared/ui/md3-switch', () => ({
    Md3Switch: class extends HTMLElement {
        get checked() { return this.hasAttribute('checked'); }
        set checked(v) { v ? this.setAttribute('checked', '') : this.removeAttribute('checked'); }
    }
}));

const mocks = vi.hoisted(() => ({
    setIrrigationSettings: vi.fn().mockResolvedValue(undefined),
    addIrrigationTime: vi.fn().mockResolvedValue(undefined),
    removeIrrigationTime: vi.fn().mockResolvedValue(undefined),
    addDrainTime: vi.fn().mockResolvedValue(undefined),
    removeDrainTime: vi.fn().mockResolvedValue(undefined),
    setIrrigationStrategy: vi.fn().mockResolvedValue(undefined),
    getIrrigationAnalytics: vi.fn().mockResolvedValue(null),
    setEcTargetRanges: vi.fn().mockResolvedValue(undefined),
    configureDrainMonitoring: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../../src/services/data-service', () => {
    return {
        DataService: class {
            constructor() {
                return mocks;
            }
        }
    };
});

// Mock ha-dialog
class HaDialogMock extends HTMLElement {
    open = false;
}
customElements.define('ha-dialog', HaDialogMock);

describe('IrrigationDialog', () => {
    let element: IrrigationDialog;
    const mockDevice: GrowspaceDevice = {
        deviceId: 'gs1',
        name: 'Growspace 1',
        type: GrowspaceType.NORMAL,
        rows: 4,
        plantsPerRow: 4,
        plants: [],
        grid: {},
        biologicalMetrics: {} as any,
        environmentAttributes: {
            soilMoistureSensor: 'sensor.sm1',
            irrigationTanks: [{ name: 'Tank 1' }],
            bulkEcSensors: [{ entity_id: 'sensor.ec1' }]
        } as any,
        stats: {} as any,
        waterUsage: {
            litersToday: 10
        } as any,
        drainConfig: {
            enabled: true,
            readings: [{}]
        } as any,
        irrigationConfig: {
            irrigationPumpEntity: 'switch.pump',
            drainPumpEntity: 'switch.drain',
            irrigationDuration: 60,
            drainDuration: 60,
            irrigationTimes: [{ time: '08:00', duration: 60 }],
            drainTimes: [{ time: '08:30', duration: 60 }]
        },
        irrigationStrategy: {
            enabled: false,
            lightsOnTime: '06:00',
            p0DurationMinutes: 60,
            p2StopBeforeLightsOffMinutes: 120,
            targetVwcPercent: 45,
            maintenanceDrybackPercent: 3,
            shotDurationSeconds: 15,
            shotIntervalMinutes: 15
        }
    };

    let originalGetBoundingClientRect: any;

    function makeMockStore(device: GrowspaceDevice) {
        const deviceCopy = JSON.parse(JSON.stringify(device));
        const $devicesValue = [deviceCopy];
        return {
            context: {
                dataService: mocks,
                data: {
                    $devices: { get: () => $devicesValue },
                    patchDeviceIrrigationConfig: vi.fn((gsId: string, patch: any) => {
                        const d = $devicesValue.find((x: any) => x.deviceId === gsId);
                        if (d) Object.assign(d.irrigationConfig, patch);
                    }),
                },
                showToast: vi.fn(),
                closeDialog: vi.fn(),
                refreshData: vi.fn().mockResolvedValue(undefined),
                ui: {
                    showToast: vi.fn(),
                },
                history: {}, grid: {}, hass: {}, syncService: {},
            },
            ui: {
                showToast: vi.fn(),
            },
        };
    }

    beforeEach(() => {
        vi.clearAllMocks();
        element = new IrrigationDialog();
        element.device = JSON.parse(JSON.stringify(mockDevice)); // Deep copy
        (element as any).store = makeMockStore(mockDevice);
        element.hass = {} as any;

        originalGetBoundingClientRect = Element.prototype.getBoundingClientRect;
        Element.prototype.getBoundingClientRect = vi.fn(() => ({
            width: 100, height: 10, top: 0, left: 0, bottom: 0, right: 0, x: 0, y: 0, toJSON: () => { }
        }));
    });

    afterEach(() => {
        if (element.isConnected) document.body.removeChild(element);
        if (originalGetBoundingClientRect) {
            Element.prototype.getBoundingClientRect = originalGetBoundingClientRect;
        }
        irrigationConfigs$.set(new Map());
        tankLevels$.set(new Map());
        vi.restoreAllMocks();
    });

    it('should render gs-dialog when open', async () => {
        element.open = true;
        document.body.appendChild(element);
        await element.updateComplete;

        const dialog = element.shadowRoot?.querySelector('gs-dialog');
        expect(dialog).toBeTruthy();
    });

    describe('Schedules Tab', () => {
        beforeEach(async () => {
            element.open = true;
            document.body.appendChild(element);
            await element.updateComplete;
        });

        it('should render existing times', async () => {
            // ADR-0019: timeline events render inside the child schedules tab shadow.
            const tab = element.shadowRoot?.querySelector('irrigation-schedules-tab') as any;
            await tab?.updateComplete;
            const markers = tab.shadowRoot?.querySelectorAll('.timeline-event');
            expect(markers?.length).toBe(2); // 1 irrigation + 1 drain
        });

    });

    describe('Edge Cases', () => {
        it('should initialize state correctly without device', () => {
            element.device = undefined;
            // Should just return safely without throwing
            expect(() => (element as any)._initializeState()).not.toThrow();
        });

        it('should initialize state with empty config', () => {
            element.device = { deviceId: '1' } as any;
            (element as any)._initializeState();
            expect((element as any)._sm.tabs.schedules.draft.irrigationPumpEntity).toBe('');
            expect((element as any)._sm.tabs.schedules.draft.irrigationDuration).toBe(60);
        });

        it('should NOT overwrite state on subsequent device property changes if already open', async () => {
            document.body.appendChild(element); // Connect to DOM
            element.open = true;
            await element.updateComplete;

            expect((element as any)._sm.tabs.schedules.draft.irrigationDuration).toBe(60);

            element.device = {
                ...mockDevice,
                irrigationConfig: { ...mockDevice.irrigationConfig, irrigationDuration: 999 }
            } as any;
            await element.updateComplete;

            expect((element as any)._sm.tabs.schedules.draft.irrigationDuration).toBe(60);
        });

        it('should create DataService if missing when hass changes', async () => {
            document.body.appendChild(element); // Connect to DOM
            // force dataService undefined
            (element as any)._dataService = undefined;
            element.hass = { ...element.hass }; // Trigger update
            await element.updateComplete;

            expect((element as any)._dataService).toBeDefined();
        });

        // ADR-0019: the add-time overlay open/cancel/backdrop + time-bar-click
        // gestures are exercised in the component mount-and-assert spec
        // (irrigation-schedules-tab.spec.ts) and the end-to-end add/cancel wiring in
        // irrigation-dialog-extra.spec.ts. Removed here to avoid duplicate coverage.

        it('should handle API calls safely if device/service is missing', async () => {
            element.device = undefined;
            const consoleSpy = vi.spyOn(console, 'error');

            // ADR-0015: _saveSettings / _saveAll are synchronous dispatchers; with no
            // device they return early without dispatching, so no effect runs.
            (element as any)._saveSettings();
            await (element as any)._addIrrigationTime('12:00');
            await (element as any)._removeIrrigationTime('12:00');
            await (element as any)._addDrainTime('12:00');
            await (element as any)._removeDrainTime('12:00');
            (element as any)._saveAll();

            // Should simply return without error/call
            expect(mocks.setIrrigationSettings).not.toHaveBeenCalled();
        });
    });

    describe('Additional Interactions', () => {
        beforeEach(async () => {
            element.open = true;
            document.body.appendChild(element);
            await element.updateComplete;
        });

        it('should switch tabs back and forth', async () => {
            const tabs = element.shadowRoot?.querySelectorAll('.v1-nav-item') as NodeListOf<HTMLElement>;

            // Click Steering
            tabs[1].click();
            await element.updateComplete;
            expect((element as any)._sm.activeTab).toBe('steering');
            expect(element.shadowRoot?.querySelector('.phase-grid')).toBeTruthy();

            // Click Schedules
            tabs[0].click();
            await element.updateComplete;
            expect((element as any)._sm.activeTab).toBe('schedules');
            expect(element.shadowRoot?.querySelector('.timeline-track')).toBeTruthy();
        });

        it('should dispatch close event with composed: true', async () => {
            let capturedEvent: Event | undefined;
            element.addEventListener('close', (e) => { capturedEvent = e; });

            const closeBtn = Array.from(element.shadowRoot?.querySelectorAll('button') || [])
                .find((b) => b.textContent?.trim() === 'Close');
            (closeBtn as HTMLElement).click();

            expect(capturedEvent).toBeDefined();
            expect((capturedEvent as CustomEvent).composed).toBe(true);
        });

    });

    describe('Coverage Gap Fillers', () => {
        it('should not add irrigation time without device', async () => {
            (element as any).device = undefined;
            await (element as any)._addIrrigationTime('10:00');

            expect(mocks.addIrrigationTime).not.toHaveBeenCalled();
        });

        it('should not add drain time without device', async () => {
            (element as any).device = undefined;
            await (element as any)._addDrainTime('10:00');

            expect(mocks.addDrainTime).not.toHaveBeenCalled();
        });

        it('should not remove drain time without device', async () => {
            (element as any).device = undefined;
            await (element as any)._removeDrainTime('08:30');

            expect(mocks.removeDrainTime).not.toHaveBeenCalled();
        });
    });

    describe('Drain Add Dialog', () => {
        // ADR-0019: the drain add overlay cancel/backdrop/field-update gestures are
        // covered by the component mount-and-assert spec + irrigation-dialog-extra.spec
        // (end-to-end wiring). Only the cross-tab/real-data cases that the hand-built
        // VM specs can't cover are kept and migrated to the child shadow below.

        it('should update lights_on_time using event detail fallback', async () => {
            document.body.appendChild(element);
            element.open = true;
            (element as any)._sm = { ...(element as any)._sm, activeTab: 'steering' };
            await element.updateComplete;

            const child = element.shadowRoot?.querySelector('irrigation-steering-tab') as any;
            await child?.updateComplete;
            const dateInput = child.shadowRoot?.querySelector('md3-text-input[label="Lights On Time"]');
            expect(dateInput).toBeTruthy();

            // Simulate event where target.value is empty but e.detail has value
            const evt = new CustomEvent('change', { detail: '07:00' });
            // We can't easily force target.value to be empty if it's bound, but we can dispatch against a fake target
            // Or just mock the event target
            Object.defineProperty(evt, 'target', { value: { value: '' }, writable: true });

            dateInput?.dispatchEvent(evt);
            await element.updateComplete;

            expect((element as any)._sm.tabs.steering.draft.lightsOnTime).toBe('07:00');
            document.body.removeChild(element);
        });

        it('should handle drain time bar click', async () => {
            document.body.appendChild(element);
            element.open = true;
            await element.updateComplete;

            const tab = element.shadowRoot?.querySelector('irrigation-schedules-tab') as any;
            await tab?.updateComplete;
            const drainTimeBar = (tab.shadowRoot as ShadowRoot).querySelector('.drain-time-bar');
            expect(drainTimeBar).toBeTruthy();
            (drainTimeBar as HTMLElement).click();
            await element.updateComplete;

            expect((element as any)._sm.tabs.schedules.sub.kind).toBe('adding-drain');
            document.body.removeChild(element);
        });

        it('should render time item using default duration when missing in object', async () => {
            document.body.appendChild(element);
            const deviceWithMissionDuration = {
                ...mockDevice,
                irrigationConfig: {
                    ...mockDevice.irrigationConfig!,
                    irrigationTimes: [{ time: '09:00' }] // no duration
                }
            };
            element.device = deviceWithMissionDuration as any;
            element.open = true;
            await element.updateComplete;

            const tab = element.shadowRoot?.querySelector('irrigation-schedules-tab') as any;
            await tab?.updateComplete;
            const markers = (tab.shadowRoot as ShadowRoot).querySelectorAll('.timeline-event');
            // Default duration (60s) is used when not specified in the event block title.
            expect(markers?.[0]?.getAttribute('title')).toContain('09:00');
            expect(markers?.[0]?.getAttribute('title')).toContain('60');

            document.body.removeChild(element);
        });
    });

    describe('Branch Coverage (v2)', () => {
        it('should handle willUpdate with various property changes', async () => {
            document.body.appendChild(element);

            const initSpy = vi.spyOn(element as any, '_initializeState');

            // 1. open becomes true
            element.open = true;
            await element.updateComplete;
            expect(initSpy).toHaveBeenCalledTimes(1);
            initSpy.mockClear();

            // Trigger update by changing a property that is NOT 'open'
            element.hass = { ...element.hass };
            await element.updateComplete;
            expect(initSpy).not.toHaveBeenCalled();

            // 2. device changes while already open
            element.device = { ...mockDevice, name: 'New Name' };
            await element.updateComplete;
            expect(initSpy).not.toHaveBeenCalled();
        });

        it('should fallback to defaults in _initializeState when strategy fields are missing', async () => {
            element.device = {
                ...mockDevice,
                irrigationStrategy: { enabled: true } as any // missing other fields
            };
            (element as any)._initializeState();

            expect((element as any)._sm.tabs.steering.draft.lightsOnTime).toBe('06:00:00');
            expect((element as any)._sm.tabs.steering.draft.p0DurationMinutes).toBe(60);
        });

        it('routes a steering-draft-changed Tab Intent into the steering draft', async () => {
            // ADR-0019: the former private _updateStrategyField is gone; the steering
            // draft now updates via the child's `steering-draft-changed` intent.
            element.open = true;
            document.body.appendChild(element);
            await element.updateComplete;
            (element as any)._sm = { ...(element as any)._sm, activeTab: 'steering' };
            await element.updateComplete;
            const child = element.shadowRoot!.querySelector('irrigation-steering-tab')!;
            child.dispatchEvent(
                new CustomEvent('steering-draft-changed', {
                    detail: { partial: { enabled: true } },
                    bubbles: true,
                    composed: true,
                })
            );
            await element.updateComplete;
            expect((element as any)._sm.tabs.steering.draft.enabled).toBe(true);
            document.body.removeChild(element);
        });
    });

    describe('Configuration Tab', () => {
        beforeEach(async () => {
            // Setup Hass with mock entities
            element.hass = {
                states: {
                    'switch.pump1': { entity_id: 'switch.pump1', attributes: { friendly_name: 'Pump 1' } },
                    'input_boolean.valve': { entity_id: 'input_boolean.valve', attributes: { friendly_name: 'Valve A' } },
                    'light.grow': { entity_id: 'light.grow', attributes: { friendly_name: 'Grow Light' } }, // Should be filtered out
                    'switch.pump2': { entity_id: 'switch.pump2', attributes: { friendly_name: 'Pump 2' } },
                    'switch.bare': { entity_id: 'switch.bare', attributes: {} }
                }
            } as any;

            element.open = true;
            document.body.appendChild(element);
            await element.updateComplete;

            // Switch to Config Tab — select by LABEL (decomposition shifted indices).
            const configItem = Array.from(
                element.shadowRoot?.querySelectorAll('.v1-nav-item') ?? []
            ).find(el => el.textContent?.includes('Configuration'));
            (configItem as HTMLElement).click();
            await element.updateComplete;
        });

        // The Config tab is decomposed (ADR-0019): the markup lives in the child
        // <irrigation-config-tab> shadow, fed by the host's mirrored pump options.
        function configChild() {
            return element.shadowRoot?.querySelector('irrigation-config-tab') as
                | HTMLElement
                | null
                | undefined;
        }

        it('should render configuration tab content', () => {
            const child = configChild();
            expect(child).toBeTruthy();
            const section = child!.shadowRoot?.querySelector('.detail-card');
            expect(section).toBeTruthy();
            expect(child!.shadowRoot?.innerHTML).toContain('Pump Configuration');
        });

        it('should populate entity selects with filtered and sorted entities', () => {
            const selects = configChild()!.shadowRoot?.querySelectorAll('select');
            const pumpSelect = selects?.[0]; // Irrigation Pump

            const options = Array.from(pumpSelect?.querySelectorAll('option') || []).map(o => o.value).filter(v => v);

            // Should contain switches and input_booleans, but not lights
            expect(options).toContain('switch.pump1');
            expect(options).toContain('input_boolean.valve');
            expect(options).toContain('switch.pump2');
            expect(options).toContain('switch.bare');
            expect(options).not.toContain('light.grow');
            // Check sorting if needed, but existence is key for coverage
        });

        it('should handle missing hass safely (empty pump options)', async () => {
            element.hass = undefined as any;
            await element.requestUpdate();
            await element.updateComplete;

            const selects = configChild()!.shadowRoot?.querySelectorAll('select');
            expect(selects?.length).toBeGreaterThan(0);
            const options = selects?.[0]?.querySelectorAll('option');
            // Should have 1 option (None)
            expect(options?.length).toBe(1);
        });
    });

    describe('Tanks Tab', () => {
        // ADR-0019: tanks render in the decomposed <irrigation-tanks-tab> child,
        // whose VM reads from the Irrigation slice's tankLevels$ (seeded here as
        // sync-service does in production), not from the device prop.
        const TANKS = [
            { sensorEntity: 'sensor.main', name: 'Main Tank', fillLevel: 75, isWarning: false, warningLevel: 20 },
            { sensorEntity: 'sensor.reserve', name: 'Reserve Tank', fillLevel: 15, isWarning: true, warningLevel: 20 },
            { sensorEntity: 'sensor.empty', name: 'Empty Tank', fillLevel: null, isWarning: true, warningLevel: 10 },
        ];
        const tanksRoot = () =>
            element.shadowRoot!.querySelector('irrigation-tanks-tab')!.shadowRoot!;
        const renderTanks = async () => {
            const child = element.shadowRoot!.querySelector('irrigation-tanks-tab') as any;
            await child.updateComplete;
        };

        beforeEach(async () => {
            element.open = true;
            element.device = {
                ...mockDevice,
                environmentAttributes: {
                    ...mockDevice.environmentAttributes,
                    irrigationTanks: TANKS,
                }
            } as any;
            setTankLevels('gs1', TANKS as any);
            document.body.appendChild(element);
            await element.updateComplete;

            // Switch to Tanks Tab
            const tabs = element.shadowRoot?.querySelectorAll('.v1-nav-item');
            (Array.from(tabs ?? []).find((t) => t.textContent?.includes('Tanks')) as HTMLElement)?.click();
            await element.updateComplete;
            await renderTanks();
        });

        it('should render tank cards', () => {
            const tankCards = tanksRoot().querySelectorAll('.tank-row');
            expect(tankCards?.length).toBe(3);
        });

        it('should render main tank with correct level', () => {
            const mainTank = tanksRoot().querySelector('.tank-row:nth-child(1)');
            expect(mainTank?.textContent).toContain('Main Tank');
            expect(mainTank?.querySelector('.tank-row-pct')?.textContent).toContain('75%');
            expect(mainTank?.classList.contains('warning')).toBe(false);
        });

        it('should render reserve tank with warning', () => {
            const reserveTank = tanksRoot().querySelector('.tank-row:nth-child(2)');
            expect(reserveTank?.textContent).toContain('Reserve Tank');
            expect(reserveTank?.querySelector('.tank-row-pct')?.textContent).toContain('15%');
            expect(reserveTank?.classList.contains('warning')).toBe(true);
            expect(reserveTank?.querySelector('.tank-row-pct')?.textContent).toContain('⚠');
        });

        it('should handle null fill level', () => {
            const emptyTank = tanksRoot().querySelector('.tank-row:nth-child(3)');
            const percentageText = emptyTank?.querySelector('.tank-row-pct');
            // We want to make sure it contains 'N/A' and NOT '0%'
            expect(percentageText?.textContent).toContain('N/A');
            expect(percentageText?.textContent).not.toContain('0%');
        });

        it('should hide Tanks tab when no tanks configured', async () => {
            element.device = {
                ...mockDevice,
                environmentAttributes: { ...mockDevice.environmentAttributes, irrigationTanks: [] }
            } as any;
            await element.updateComplete;

            const tabs = element.shadowRoot?.querySelectorAll('.v1-nav-item');
            const labels = Array.from(tabs || []).map(t => (t.querySelector('span:first-of-type') as HTMLElement)?.textContent?.trim());
            expect(labels).not.toContain('Tanks');
        });

        it('should fallback to config when current tab is hidden', async () => {
            // Start on tanks tab (index 3 with all features)
            const tabs = element.shadowRoot?.querySelectorAll('.v1-nav-item');
            (Array.from(tabs ?? []).find((t) => t.textContent?.includes('Tanks')) as HTMLElement)?.click();
            await element.updateComplete;
            expect((element as any)._sm.activeTab).toBe('tanks');

            // Hide tanks
            element.device = {
                ...mockDevice,
                environmentAttributes: { ...mockDevice.environmentAttributes, irrigationTanks: [] }
            } as any;
            await element.updateComplete;

            expect((element as any)._sm.activeTab).toBe('config');
        });
    });

    describe('Additional Branch Coverage', () => {
        it('should notify data changed', () => {
            const spy = vi.fn();
            element.addEventListener('data-changed', spy);
            (element as any)._notifyDataChanged();
            expect(spy).toHaveBeenCalled();
        });

        it('should sort entities by friendly name or entity_id', async () => {
            element.hass = {
                states: {
                    'switch.z_last': { entity_id: 'switch.z_last', attributes: { friendly_name: 'Z' } },
                    'switch.a_first': { entity_id: 'switch.a_first', attributes: { friendly_name: 'A' } },
                    'switch.id_only': { entity_id: 'switch.id_only', attributes: {} },
                    'switch.another_id': { entity_id: 'switch.another_id', attributes: {} }
                }
            } as any;

            const entities = (element as any)._getEntities(['switch']);
            // A first (by friendly name)
            expect(entities[0].attributes.friendly_name).toBe('A');
            // another_id (by entity_id as no friendly_name)
            expect(entities[1].entity_id).toBe('switch.another_id');
            // id_only (by entity_id)
            expect(entities[2].entity_id).toBe('switch.id_only');
            // Z (by friendly name)
            expect(entities[3].attributes.friendly_name).toBe('Z');
        });

        it('should handle start_time in schedules', async () => {
            element.open = true;
            element.device = {
                ...mockDevice,
                irrigationConfig: {
                    ...mockDevice.irrigationConfig!,
                    irrigationTimes: [{ start_time: '11:00' } as any] // Using start_time instead of time
                }
            } as any;
            document.body.appendChild(element);
            await element.updateComplete;

            const tab = element.shadowRoot?.querySelector('irrigation-schedules-tab') as any;
            await tab?.updateComplete;
            const markers = (tab.shadowRoot as ShadowRoot).querySelectorAll('.timeline-event');
            expect(markers?.length).toBeGreaterThan(0);
            expect(markers?.[0].getAttribute('title')).toContain('11:00');
        });

        it('should handle both time and start_time fallback in filter', async () => {
            element.hass = {} as any;
            element.open = true;
            element.device = {
                ...mockDevice,
                irrigationConfig: {
                    ...mockDevice.irrigationConfig!,
                    irrigationTimes: [
                        { time: '10:00' },
                        { start_time: '11:00' } as any,
                        { something_else: '12:00' } as any // should be filtered out
                    ]
                }
            } as any;
            document.body.appendChild(element);
            await element.updateComplete;

            const tab = element.shadowRoot?.querySelector('irrigation-schedules-tab') as any;
            await tab?.updateComplete;
            const irrigationBar = (tab.shadowRoot as ShadowRoot).querySelector('.irrigation-time-bar');
            const markers = irrigationBar?.querySelectorAll('.timeline-event');
            expect(markers?.length).toBe(2);
            document.body.removeChild(element);
        });

    });

    describe('Context-Aware Tab Visibility', () => {
        beforeEach(async () => {
            element.open = true;
            document.body.appendChild(element);
            await element.updateComplete;
        });

        it('should show only minimal tabs (Schedules, Config) when no sensors are present', async () => {
            element.device = {
                ...mockDevice,
                environmentAttributes: {} as any,
                waterUsage: { litersToday: 0 } as any,
                drainConfig: { enabled: false, readings: [] } as any,
                irrigationStrategy: { enabled: false } as any
            } as any;
            await element.updateComplete;

            const tabs = element.shadowRoot?.querySelectorAll('.v1-nav-item');
            // Extract only the label span text (first span), ignoring any badge number
            const labels = Array.from(tabs || []).map(t => (t.querySelector('span:first-of-type') as HTMLElement)?.textContent?.trim());

            expect(labels).toContain('Schedules');
            expect(labels).toContain('Configuration');
            expect(labels).not.toContain('Crop Steering');
            expect(labels).not.toContain('Tanks');
            expect(labels).not.toContain('Water Analytics');
            expect(labels).not.toContain('Drain EC');
        });

        it('should show Steering tab when soil moisture sensor is present', async () => {
            element.device = {
                ...mockDevice,
                environmentAttributes: { soilMoistureSensor: 'sensor.sm1' } as any,
                irrigationStrategy: { enabled: false } as any,
                waterUsage: { litersToday: 0 } as any,
                drainConfig: { enabled: false, readings: [] } as any
            } as any;
            await element.updateComplete;

            const tabs = element.shadowRoot?.querySelectorAll('.v1-nav-item');
            const labels = Array.from(tabs || []).map(t => (t.querySelector('span:first-of-type') as HTMLElement)?.textContent?.trim());
            expect(labels).toContain('Crop Steering');
        });

        it('should show Tanks tab when irrigation tanks are configured', async () => {
            element.device = {
                ...mockDevice,
                environmentAttributes: { irrigationTanks: [{ name: 'Tank 1' }] } as any,
                waterUsage: { litersToday: 0 } as any,
                drainConfig: { enabled: false, readings: [] } as any,
                irrigationStrategy: { enabled: false } as any
            } as any;
            await element.updateComplete;

            const tabs = element.shadowRoot?.querySelectorAll('.v1-nav-item');
            const labels = Array.from(tabs || []).map(t => (t.querySelector('span:first-of-type') as HTMLElement)?.textContent?.trim());
            expect(labels).toContain('Tanks');
        });

        it('should show Analytics tab when water usage is recorded', async () => {
            element.device = {
                ...mockDevice,
                environmentAttributes: {} as any,
                waterUsage: { litersToday: 5.5 } as any,
                drainConfig: { enabled: false, readings: [] } as any,
                irrigationStrategy: { enabled: false } as any
            } as any;
            await element.updateComplete;

            const tabs = element.shadowRoot?.querySelectorAll('.v1-nav-item');
            const labels = Array.from(tabs || []).map(t => (t.querySelector('span:first-of-type') as HTMLElement)?.textContent?.trim());
            expect(labels).toContain('Water Analytics');
        });

        it('should fallback to Config tab if active tab becomes hidden', async () => {
            // Start with all capabilities
            element.device = { ...mockDevice };
            (element as any)._sm = { ...(element as any)._sm, activeTab: 'tanks' };
            await element.updateComplete;
            expect((element as any)._sm.activeTab).toBe('tanks');

            // Remove tank capability
            element.device = {
                ...mockDevice,
                environmentAttributes: { ...mockDevice.environmentAttributes, irrigationTanks: [] }
            } as any;
            await element.updateComplete;

            expect((element as any)._sm.activeTab).toBe('config');
        });
    });

    describe('Setup Hints', () => {
        beforeEach(async () => {
            element.open = true;
            document.body.appendChild(element);
            await element.updateComplete;
        });

        it('should render setup hints when features are hidden', async () => {
            element.device = {
                ...mockDevice,
                environmentAttributes: {} as any,
                waterUsage: { litersToday: 0 } as any,
                drainConfig: { enabled: false, readings: [] } as any,
                irrigationStrategy: { enabled: false } as any
            } as any;
            await element.updateComplete;

            const hints = element.shadowRoot?.querySelectorAll('.setup-hint');
            expect(hints?.length).toBeGreaterThan(0);
            
            const hintText = element.shadowRoot?.querySelector('.setup-hints')?.textContent;
            expect(hintText).toContain('Configure a soil moisture sensor');
            expect(hintText).toContain('Add irrigation tanks');
            expect(hintText).toContain('Configure EC/pH sensors');
        });

        it('should not render setup hints when all features are enabled', async () => {
            element.device = { ...mockDevice };
            await element.updateComplete;

            const hints = element.shadowRoot?.querySelector('.setup-hints');
            expect(hints).toBeFalsy();
        });
    });

    describe('Sidebar Nav', () => {
        beforeEach(async () => {
            element.open = true;
            document.body.appendChild(element);
            await element.updateComplete;
        });

        it('should render a sidebar rail instead of a horizontal tab bar', () => {
            const rail = element.shadowRoot?.querySelector('.v1-rail');
            expect(rail).toBeTruthy();
            const tabsRow = element.shadowRoot?.querySelector('.tabs-row');
            expect(tabsRow).toBeFalsy();
        });

        it('should render Schedules as the first nav item and mark it active by default', () => {
            const navItems = element.shadowRoot?.querySelectorAll('.v1-nav-item');
            expect(navItems?.length).toBeGreaterThan(0);
            const first = navItems![0];
            expect(first.textContent).toContain('Schedules');
            expect(first.classList.contains('active')).toBe(true);
        });

        it('should switch content section when a nav item is clicked', async () => {
            const configItem = Array.from(
                element.shadowRoot?.querySelectorAll('.v1-nav-item') ?? []
            ).find(el => el.textContent?.includes('Configuration'));
            expect(configItem).toBeTruthy();
            (configItem as HTMLElement).click();
            await element.updateComplete;
            expect(configItem!.classList.contains('active')).toBe(true);
        });
    });

    // ADR-0019: the schedules timeline/chips render inside the child
    // <irrigation-schedules-tab> shadow. The granular render + gesture coverage now
    // lives in the component mount-and-assert spec; these stay as thin dialog-level
    // smokes that the child renders real device data through the real container.
    async function schedulesChildRoot(): Promise<ShadowRoot> {
        const tab = element.shadowRoot?.querySelector('irrigation-schedules-tab') as any;
        await tab?.updateComplete;
        return tab.shadowRoot as ShadowRoot;
    }

    describe('Timeline Event Blocks', () => {
        beforeEach(async () => {
            element.open = true;
            document.body.appendChild(element);
            await element.updateComplete;
        });

        it('should render one event block per scheduled irrigation time', async () => {
            const irrigationTrack = (await schedulesChildRoot()).querySelector('.irrigation-time-bar');
            const blocks = irrigationTrack?.querySelectorAll('.timeline-event');
            expect(blocks?.length).toBe(1);
        });
    });

    describe('Time Chips', () => {
        beforeEach(async () => {
            element.open = true;
            document.body.appendChild(element);
            await element.updateComplete;
        });

        it('should render a time chip for each scheduled time plus a New chip', async () => {
            // 1 irrigation + 1 drain time → 4 chips total (1 real + 1 New per section).
            const chips = (await schedulesChildRoot()).querySelectorAll('.time-chips .time-chip');
            expect(chips?.length).toBe(4);
        });

        it('should render remove buttons on each scheduled time chip', async () => {
            const removeButtons = (await schedulesChildRoot()).querySelectorAll(
                '.time-chips .time-chip .chip-remove'
            );
            expect(removeButtons?.length).toBe(2); // 1 irrigation + 1 drain real chip
        });
    });

    describe('Footer Save Changes', () => {
        beforeEach(async () => {
            element.open = true;
            document.body.appendChild(element);
            await element.updateComplete;
        });

        it('should render a single Save Changes button in the footer', () => {
            const footer = element.shadowRoot?.querySelector('.dlg-footer');
            expect(footer).toBeTruthy();
            const saveBtn = footer?.querySelector('.btn-save-all');
            expect(saveBtn).toBeTruthy();
            expect(saveBtn?.textContent).toContain('Save');
        });

        it('should not render per-tab save buttons inside the dialog body', () => {
            // Old pattern: separate "Save Strategy" / "Save Configuration" buttons inside body
            const body = element.shadowRoot?.querySelector('.dialog-body, .v1-content');
            const innerSaveBtns = body?.querySelectorAll('button.md3-button.primary');
            // Any save buttons inside the body (not footer) should be gone
            const bodyPrimaryBtns = Array.from(innerSaveBtns ?? []).filter(
                b => b.textContent?.includes('Save')
            );
            expect(bodyPrimaryBtns.length).toBe(0);
        });

    });

    describe('Footer Next Display', () => {
        function footerNextText(): string | null | undefined {
            const spans = element.shadowRoot?.querySelectorAll('.dlg-footer-meta span');
            const nextSpan = Array.from(spans ?? []).find((s) => s.textContent?.trim().startsWith('Next'));
            return nextSpan?.textContent;
        }

        function fmt(iso: string): string {
            return new Date(iso).toLocaleString(undefined, {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
            });
        }

        it('renders the projected shot window as a range when crop steering is enabled', async () => {
            const start = '2026-06-07T09:45:00+00:00';
            const end = '2026-06-07T18:00:00+00:00';
            element.device = JSON.parse(JSON.stringify({
                ...mockDevice,
                irrigationStrategy: { ...mockDevice.irrigationStrategy, enabled: true },
                projectedShotWindow: { start, end },
            }));
            (element as any).store = makeMockStore(element.device);
            element.open = true;
            document.body.appendChild(element);
            await element.updateComplete;

            const text = footerNextText();
            expect(text).toContain(fmt(start));
            expect(text).toContain(fmt(end));
            expect(text).toMatch(/–/);
        });

        it('renders — when crop steering is enabled but no projected window is available', async () => {
            element.device = JSON.parse(JSON.stringify({
                ...mockDevice,
                irrigationStrategy: { ...mockDevice.irrigationStrategy, enabled: true },
                projectedShotWindow: null,
            }));
            (element as any).store = makeMockStore(element.device);
            element.open = true;
            document.body.appendChild(element);
            await element.updateComplete;

            expect(footerNextText()).toContain('—');
        });

        it('renders the scheduled point time in manual mode, ignoring projectedShotWindow', async () => {
            const nextScheduledCycle = '2026-06-07T08:00:00+00:00';
            element.device = JSON.parse(JSON.stringify({
                ...mockDevice,
                irrigationStrategy: { ...mockDevice.irrigationStrategy, enabled: false },
                nextScheduledCycle,
                projectedShotWindow: { start: '2026-06-07T09:45:00+00:00', end: '2026-06-07T18:00:00+00:00' },
            }));
            (element as any).store = makeMockStore(element.device);
            element.open = true;
            document.body.appendChild(element);
            await element.updateComplete;

            const text = footerNextText();
            expect(text).toContain(fmt(nextScheduledCycle));
            expect(text).not.toMatch(/–/);
        });
    });

    describe('Crop Steering Schedule Display', () => {
        const steeringStrategy = {
            enabled: true,
            lightsOnTime: '06:00:00',
            p0DurationMinutes: 60,
            p2StopBeforeLightsOffMinutes: 120,
            targetVwcPercent: 45,
            maintenanceDrybackPercent: 3,
            shotDurationSeconds: 15,
            shotIntervalMinutes: 30,
        };

        function makeSteeringDevice(overrides: Partial<GrowspaceDevice> = {}): GrowspaceDevice {
            return {
                ...JSON.parse(JSON.stringify(mockDevice)),
                irrigationStrategy: steeringStrategy,
                irrigationConfig: { irrigationTimes: [], drainTimes: [], irrigationPumpEntity: 'switch.pump', drainPumpEntity: 'switch.drain' },
                ...overrides,
            };
        }

        beforeEach(async () => {
            element.device = makeSteeringDevice();
            (element as any).store = makeMockStore(element.device!);
            element.open = true;
            document.body.appendChild(element);
            await element.updateComplete;
        });

        // ADR-0019: the crop-steering panel renders inside the child schedules tab.
        async function csChildRoot(): Promise<ShadowRoot> {
            const tab = element.shadowRoot?.querySelector('irrigation-schedules-tab') as any;
            await tab?.updateComplete;
            return tab.shadowRoot as ShadowRoot;
        }

        it('renders Crop Steering Schedule heading on the schedules tab', async () => {
            const headings = Array.from((await csChildRoot()).querySelectorAll('h3'));
            const csHeading = headings.find((h) => h.textContent?.includes('Crop Steering Schedule'));
            expect(csHeading).toBeTruthy();
        });

        it('does not show ADD TIME inside the crop steering schedule section', async () => {
            const csSection = (await csChildRoot()).querySelector('.crop-steering-schedule');
            expect(csSection).toBeTruthy();
            const addBtns = Array.from(csSection?.querySelectorAll('button') ?? []);
            const hasAddTime = addBtns.some((b) => b.textContent?.includes('ADD TIME'));
            expect(hasAddTime).toBe(false);
        });

        it('still shows drain schedule ADD TIME button when crop steering is active', async () => {
            const root = await csChildRoot();
            const drainSection = root.querySelector('.drain-time-bar')?.closest('.detail-card');
            expect(drainSection).toBeTruthy();
            const drainAddBtn = Array.from(drainSection?.querySelectorAll('button') ?? []).find((b) =>
                b.textContent?.includes('ADD TIME')
            );
            expect(drainAddBtn).toBeTruthy();
        });

        it('computes ≤12 shots for a flower-stage growspace (12h light window, 60min interval)', async () => {
            element.device = makeSteeringDevice({
                biologicalMetrics: {
                    ...mockDevice.biologicalMetrics,
                    flowerWeek: 4,
                    vegWeek: 0,
                } as any,
                irrigationStrategy: {
                    ...steeringStrategy,
                    p0DurationMinutes: 0,
                    p2StopBeforeLightsOffMinutes: 0,
                    shotIntervalMinutes: 60,
                },
            });
            (element as any).store = makeMockStore(element.device!);
            // Re-trigger _initializeState so _strategy reflects the new device
            element.open = false;
            await element.updateComplete;
            element.open = true;
            await element.updateComplete;

            const csSection = (await csChildRoot()).querySelector('.crop-steering-schedule');
            expect(csSection).toBeTruthy();
            const chart = csSection?.querySelector('crop-steering-day-chart') as
                | (HTMLElement & { updateComplete: Promise<unknown> })
                | null
                | undefined;
            expect(chart).toBeTruthy();
            await chart?.updateComplete;
            const events = chart?.shadowRoot?.querySelectorAll('.cs-event');
            expect(events?.length).toBeGreaterThan(0);
            expect(events?.length).toBeLessThanOrEqual(12);
        });
    });

    describe('Uncovered Lines Coverage', () => {
        describe('_renderActiveTab default branch (line 1401)', () => {
            it('should return nothing when _activeTab is set to an unknown value', () => {
                // willUpdate resets an unknown _activeTab, so we call the method directly
                // to exercise the default: return nothing branch
                (element as any)._sm = { ...(element as any)._sm, activeTab: 'nonexistent_tab_xyz' };
                const result = (element as any)._renderActiveTab('#2196F3');
                // Lit's `nothing` is returned — just verify it's the sentinel (not a TemplateResult)
                expect(result).not.toHaveProperty('strings');
            });
        });

        describe('Crop steering schedule with no lightsOnTime (line 1467)', () => {
            it('should show "No strategy configured" when lightsOnTime is cleared', async () => {
                element.device = {
                    ...mockDevice,
                    irrigationStrategy: { enabled: true, lightsOnTime: '06:00:00', shotDurationSeconds: 15, shotIntervalMinutes: 30 } as any,
                };
                element.open = true;
                document.body.appendChild(element);
                await element.updateComplete;

                // Clear lightsOnTime after initialization to trigger the null-phases branch
                (element as any)._sm = transition((element as any)._sm, { type: 'UPDATE_STEERING_DRAFT', partial: { lightsOnTime: '' } });
                await element.updateComplete;

                // The CS panel renders inside the child schedules tab shadow.
                const childTab = element.shadowRoot?.querySelector('irrigation-schedules-tab') as any;
                await childTab?.updateComplete;
                const csSection = childTab.shadowRoot?.querySelector('.crop-steering-schedule');
                expect(csSection?.textContent).toContain('No strategy configured');

                document.body.removeChild(element);
            });
        });

        // KEPT (ADR-0019): the banner/nudge "Open Crop Steering →" links are emitted
        // by the child but the requestTabSwitch wiring (→ activeTab='steering') is
        // dialog-level integration the hand-built-VM component spec can't cover.
        describe('Crop Steering link clicks (lines 1675, 1696)', () => {
            async function clickOpenSteeringLink(): Promise<void> {
                const tab = element.shadowRoot?.querySelector('irrigation-schedules-tab') as any;
                await tab?.updateComplete;
                const links = Array.from((tab.shadowRoot as ShadowRoot).querySelectorAll('a'));
                const csLink = links.find((a) => a.textContent?.includes('Open Crop Steering'));
                expect(csLink).toBeTruthy();
                (csLink as HTMLAnchorElement).click();
                await element.updateComplete;
            }

            it('should switch to steering tab when clicking the crop-steering banner link (strategy enabled)', async () => {
                element.device = {
                    ...mockDevice,
                    irrigationStrategy: {
                        enabled: true,
                        lightsOnTime: '06:00:00',
                        p0DurationMinutes: 60,
                        p2StopBeforeLightsOffMinutes: 120,
                        shotDurationSeconds: 15,
                        shotIntervalMinutes: 30,
                    } as any,
                };
                element.open = true;
                document.body.appendChild(element);
                await element.updateComplete;

                await clickOpenSteeringLink();
                expect((element as any)._sm.activeTab).toBe('steering');

                document.body.removeChild(element);
            });

            it('should switch to steering tab when clicking the nudge banner link (strategy disabled)', async () => {
                // mockDevice has strategy disabled — nudge banner renders on the schedules tab
                element.open = true;
                document.body.appendChild(element);
                await element.updateComplete;

                await clickOpenSteeringLink();
                expect((element as any)._sm.activeTab).toBe('steering');

                document.body.removeChild(element);
            });
        });

        describe('Halt on Runoff EC input (lines 2148-2149)', () => {
            beforeEach(async () => {
                element.open = true;
                document.body.appendChild(element);
                await element.updateComplete;

                const tabs = element.shadowRoot?.querySelectorAll('.v1-nav-item');
                const steeringTab = Array.from(tabs ?? []).find((t) => t.textContent?.includes('Crop Steering'));
                (steeringTab as HTMLElement)?.click();
                await element.updateComplete;
            });

            it('should update _haltOnRunoffEcThreshold when number input changes', async () => {
                (element as any)._sm = transition((element as any)._sm, { type: 'UPDATE_CONFIG_DRAFT', partial: { haltOnRunoffEcThreshold: 4.0 } });
                await element.updateComplete;

                const sr = await steeringChild(element);
                const haltInput = sr.querySelector('md3-number-input[data-field="haltOnRunoffEcValue"]') as any;
                expect(haltInput).toBeTruthy();

                haltInput.dispatchEvent(new CustomEvent('change', { detail: '5.5' }));
                await element.updateComplete;

                expect((element as any)._sm.tabs.config.draft.haltOnRunoffEcThreshold).toBe(5.5);
            });

            it('should not update _haltOnRunoffEcThreshold when NaN value is provided', async () => {
                (element as any)._sm = transition((element as any)._sm, { type: 'UPDATE_CONFIG_DRAFT', partial: { haltOnRunoffEcThreshold: 4.0 } });
                await element.updateComplete;

                const sr = await steeringChild(element);
                const haltInput = sr.querySelector('md3-number-input[data-field="haltOnRunoffEcValue"]') as any;
                haltInput.dispatchEvent(new CustomEvent('change', { detail: 'not-a-number' }));
                await element.updateComplete;

                expect((element as any)._sm.tabs.config.draft.haltOnRunoffEcThreshold).toBe(4.0);
            });
        });

        describe('Config tab cycle parameter inputs (lines 2218-2247)', () => {
            beforeEach(async () => {
                element.open = true;
                document.body.appendChild(element);
                await element.updateComplete;

                const tabs = element.shadowRoot?.querySelectorAll('.v1-nav-item');
                const configTab = Array.from(tabs ?? []).find((t) => t.textContent?.includes('Configuration'));
                (configTab as HTMLElement)?.click();
                await element.updateComplete;

                // Safety Caps only render when crop steering is ON
                (element as any)._sm = transition((element as any)._sm, { type: 'UPDATE_STEERING_DRAFT', partial: { enabled: true } });
                await element.updateComplete;
            });

            it('should update _soilTriggerPercent from the P2 Direct Trigger input', async () => {
                // P2 Direct Trigger lives in the Steering tab (decomposed child, ADR-0019).
                const sr = await steeringChild(element);
                const soilInput = Array.from(sr.querySelectorAll('md3-number-input'))
                    .find(i => i.getAttribute('label') === 'P2 Direct Trigger (%)') as any;
                expect(soilInput).toBeTruthy();

                soilInput.dispatchEvent(new CustomEvent('change', { detail: '65' }));
                await element.updateComplete;

                expect((element as any)._sm.tabs.config.draft.soilTriggerPercent).toBe(65);
            });

            it('should set _soilTriggerPercent to null when input is cleared', async () => {
                const sr = await steeringChild(element);
                (element as any)._sm = transition((element as any)._sm, { type: 'UPDATE_CONFIG_DRAFT', partial: { soilTriggerPercent: 50 } });
                await element.updateComplete;

                const soilInput = Array.from(sr.querySelectorAll('md3-number-input'))
                    .find(i => i.getAttribute('label') === 'P2 Direct Trigger (%)') as any;
                expect(soilInput).toBeTruthy();
                soilInput.dispatchEvent(new CustomEvent('change', { detail: '' }));
                await element.updateComplete;

                expect((element as any)._sm.tabs.config.draft.soilTriggerPercent).toBeNull();
            });

            // The cycle-param inputs (Daily Volume Cap, Max Cycles) are decomposed
            // (ADR-0019): they render in the child <irrigation-config-tab> shadow and
            // emit `config-draft-changed`. Pierce the child; assert the host wires the
            // intent into the SM draft.
            function configChild() {
                return element.shadowRoot?.querySelector('irrigation-config-tab') as HTMLElement;
            }

            it('should update _dailyVolumeCapLiters from the Daily Volume Cap input', async () => {
                const volInput = configChild().shadowRoot?.querySelector('input[step="0.1"]') as HTMLInputElement;
                expect(volInput).toBeTruthy();

                volInput.value = '20.5';
                volInput.dispatchEvent(new Event('change'));
                await element.updateComplete;

                expect((element as any)._sm.tabs.config.draft.dailyVolumeCapLiters).toBeCloseTo(20.5);
            });

            it('should set _dailyVolumeCapLiters to null when input is cleared', async () => {
                (element as any)._sm = transition((element as any)._sm, { type: 'UPDATE_CONFIG_DRAFT', partial: { dailyVolumeCapLiters: 10 } });
                await element.updateComplete;

                const volInput = configChild().shadowRoot?.querySelector('input[step="0.1"]') as HTMLInputElement;
                volInput.value = '';
                volInput.dispatchEvent(new Event('change'));
                await element.updateComplete;

                expect((element as any)._sm.tabs.config.draft.dailyVolumeCapLiters).toBeNull();
            });

            it('should update _maxCyclesPerDay from the Max Cycles input', async () => {
                // Max Cycles input: min="0" step="1" without max attribute
                const allNumberInputs = Array.from(configChild().shadowRoot?.querySelectorAll('input[type="number"]') ?? []) as HTMLInputElement[];
                const maxCyclesInput = allNumberInputs.find((i) => i.getAttribute('step') === '1' && !i.getAttribute('max'));
                expect(maxCyclesInput).toBeTruthy();

                maxCyclesInput!.value = '8';
                maxCyclesInput!.dispatchEvent(new Event('change'));
                await element.updateComplete;

                expect((element as any)._sm.tabs.config.draft.maxCyclesPerDay).toBe(8);
            });

            it('should set _maxCyclesPerDay to null when input is cleared', async () => {
                (element as any)._sm = transition((element as any)._sm, { type: 'UPDATE_CONFIG_DRAFT', partial: { maxCyclesPerDay: 5 } });
                await element.updateComplete;

                const allNumberInputs = Array.from(configChild().shadowRoot?.querySelectorAll('input[type="number"]') ?? []) as HTMLInputElement[];
                const maxCyclesInput = allNumberInputs.find((i) => i.getAttribute('step') === '1' && !i.getAttribute('max'));
                maxCyclesInput!.value = '';
                maxCyclesInput!.dispatchEvent(new Event('change'));
                await element.updateComplete;

                expect((element as any)._sm.tabs.config.draft.maxCyclesPerDay).toBeNull();
            });
        });

        describe('Config tab behaviour toggles (lines 2261-2283)', () => {
            beforeEach(async () => {
                element.open = true;
                document.body.appendChild(element);
                await element.updateComplete;

                const tabs = element.shadowRoot?.querySelectorAll('.v1-nav-item');
                const configTab = Array.from(tabs ?? []).find((t) => t.textContent?.includes('Configuration'));
                (configTab as HTMLElement)?.click();
                await element.updateComplete;
            });

            // Behaviour toggles are decomposed: pierce the child <irrigation-config-tab>
            // shadow and assert the host wires `config-draft-changed` into the SM.
            function behaviourSwitches() {
                const child = element.shadowRoot?.querySelector('irrigation-config-tab') as HTMLElement;
                return child.shadowRoot?.querySelectorAll('.stub-row md3-switch');
            }

            it('should update _skipDuringDark when first behaviour switch fires change', async () => {
                const sw = behaviourSwitches()?.[0] as any;
                expect(sw).toBeTruthy();

                sw.checked = true;
                sw.dispatchEvent(new Event('change'));
                await element.updateComplete;

                expect((element as any)._sm.tabs.config.draft.skipDuringDark).toBe(true);
            });

            it('should update _pauseOnLowTank when second behaviour switch fires change', async () => {
                const sw = behaviourSwitches()?.[1] as any;
                expect(sw).toBeTruthy();

                sw.checked = false;
                sw.dispatchEvent(new Event('change'));
                await element.updateComplete;

                expect((element as any)._sm.tabs.config.draft.pauseOnLowTank).toBe(false);
            });

            it('should update _logToLogbook when third behaviour switch fires change', async () => {
                const sw = behaviourSwitches()?.[2] as any;
                expect(sw).toBeTruthy();

                sw.checked = false;
                sw.dispatchEvent(new Event('change'));
                await element.updateComplete;

                expect((element as any)._sm.tabs.config.draft.logToLogbook).toBe(false);
            });
        });

        describe('Config tab conditional display based on crop steering', () => {
            beforeEach(async () => {
                element.open = true;
                document.body.appendChild(element);
                await element.updateComplete;

                const tabs = element.shadowRoot?.querySelectorAll('.v1-nav-item');
                const configTab = Array.from(tabs ?? []).find((t) => t.textContent?.includes('Configuration'));
                (configTab as HTMLElement)?.click();
                await element.updateComplete;
            });

            // The config tab content is decomposed (ADR-0019): assert against the
            // child <irrigation-config-tab> shadow instead of the host innerHTML.
            function childHtml() {
                const child = element.shadowRoot?.querySelector('irrigation-config-tab') as HTMLElement | null;
                return child?.shadowRoot?.innerHTML ?? '';
            }
            function configSwitches() {
                const child = element.shadowRoot?.querySelector('irrigation-config-tab') as HTMLElement;
                return child.shadowRoot?.querySelectorAll('.stub-row md3-switch');
            }

            it('hides Safety Caps when crop steering is OFF', async () => {
                (element as any)._sm = transition((element as any)._sm, { type: 'UPDATE_STEERING_DRAFT', partial: { enabled: false } });
                await element.updateComplete;

                expect(childHtml()).not.toContain('Safety Caps');
            });

            it('shows Safety Caps when crop steering is ON', async () => {
                (element as any)._sm = transition((element as any)._sm, { type: 'UPDATE_STEERING_DRAFT', partial: { enabled: true } });
                await element.updateComplete;

                expect(childHtml()).toContain('Safety Caps');
            });

            it('shows Skip During Dark when crop steering is OFF', async () => {
                (element as any)._sm = transition((element as any)._sm, { type: 'UPDATE_STEERING_DRAFT', partial: { enabled: false } });
                await element.updateComplete;

                expect(childHtml()).toContain('Skip During Dark Period');
            });

            it('hides Skip During Dark when crop steering is ON', async () => {
                (element as any)._sm = transition((element as any)._sm, { type: 'UPDATE_STEERING_DRAFT', partial: { enabled: true } });
                await element.updateComplete;

                expect(childHtml()).not.toContain('Skip During Dark Period');
            });

            it('always shows Pause on Tank Low regardless of crop steering', async () => {
                (element as any)._sm = transition((element as any)._sm, { type: 'UPDATE_STEERING_DRAFT', partial: { enabled: false } });
                await element.updateComplete;
                expect(childHtml()).toContain('Pause on Tank Low');

                (element as any)._sm = transition((element as any)._sm, { type: 'UPDATE_STEERING_DRAFT', partial: { enabled: true } });
                await element.updateComplete;
                expect(childHtml()).toContain('Pause on Tank Low');
            });

            it('always shows Log to Logbook regardless of crop steering', async () => {
                (element as any)._sm = transition((element as any)._sm, { type: 'UPDATE_STEERING_DRAFT', partial: { enabled: false } });
                await element.updateComplete;
                expect(childHtml()).toContain('Log to Logbook');

                (element as any)._sm = transition((element as any)._sm, { type: 'UPDATE_STEERING_DRAFT', partial: { enabled: true } });
                await element.updateComplete;
                expect(childHtml()).toContain('Log to Logbook');
            });

            it('shows correct switch count when crop steering is OFF (3 switches)', async () => {
                (element as any)._sm = transition((element as any)._sm, { type: 'UPDATE_STEERING_DRAFT', partial: { enabled: false } });
                await element.updateComplete;

                expect(configSwitches()?.length).toBe(3); // skipDuringDark + pauseOnLowTank + logToLogbook
            });

            it('shows correct switch count when crop steering is ON (2 switches)', async () => {
                (element as any)._sm = transition((element as any)._sm, { type: 'UPDATE_STEERING_DRAFT', partial: { enabled: true } });
                await element.updateComplete;

                expect(configSwitches()?.length).toBe(2); // pauseOnLowTank + logToLogbook
            });
        });

        describe('Crop Steering tab VWC group title', () => {
            beforeEach(async () => {
                element.open = true;
                document.body.appendChild(element);
                await element.updateComplete;
            });

            it('labels the first VWC targets group "P1 Thresholds"', async () => {
                const sr = await steeringChild(element);
                const titles = sr.querySelectorAll('.vwc-targets-group-title');
                expect(titles?.[0]?.textContent?.trim()).toBe('P1 Thresholds');
            });

            it('labels the second VWC targets group "P2 Thresholds"', async () => {
                const sr = await steeringChild(element);
                const titles = sr.querySelectorAll('.vwc-targets-group-title');
                expect(titles?.[1]?.textContent?.trim()).toBe('P2 Thresholds');
            });
        });

        // ADR-0019: the Tanks tab empty-state moved into <irrigation-tanks-tab>
        // and is covered by tests/unit/features/irrigation/components/
        // irrigation-tanks-tab.spec.ts ("renders the empty state when the VM has
        // no tanks") — the private `_renderTanksTab` no longer exists.

        describe('Water analytics with tank history (lines 2420-2424, 2527-2545)', () => {
            const recentTimestamp = new Date(Date.now() - 30 * 60 * 1000).toISOString();
            const oldTimestamp = '2000-01-01T00:00:00Z';
            const todayKey = new Date().toISOString().slice(0, 10);

            const tankWithHistory = {
                name: 'Main Tank',
                sensorEntity: 'sensor.tank_level',
                volumeLiters: 100,
                fillLevel: 80,
                isWarning: false,
                warningLevel: 20,
                waterHistory: {
                    events: [
                        { event_type: 'consumption', timestamp: recentTimestamp, liters: 2.5 },
                        { event_type: 'refill', timestamp: recentTimestamp, liters: 10 },
                        { event_type: 'consumption', timestamp: oldTimestamp, liters: 1 },
                    ],
                    daily_7d: [{ date: todayKey, consumed: 5 }],
                },
            };

            beforeEach(async () => {
                element.device = {
                    ...mockDevice,
                    environmentAttributes: {
                        ...mockDevice.environmentAttributes,
                        irrigationTanks: [tankWithHistory as any],
                    },
                } as any;
                element.open = true;
                document.body.appendChild(element);
                await element.updateComplete;

                const tabs = element.shadowRoot?.querySelectorAll('.v1-nav-item');
                const analyticsTab = Array.from(tabs ?? []).find((t) => t.textContent?.includes('Water Analytics'));
                (analyticsTab as HTMLElement)?.click();
                await element.updateComplete;
            });

            // ADR-0019: the Tank-Derived Water Usage section + consumption chart
            // now render inside the decomposed `<irrigation-water-analytics-tab>`
            // child shadow, so pierce it. The clock-dependent 24h bucketing is
            // kept in the component (the VM stays deterministic).
            async function waChild(): Promise<ShadowRoot> {
                const tab = element.shadowRoot?.querySelector('irrigation-water-analytics-tab') as any;
                await tab?.updateComplete;
                return tab.shadowRoot as ShadowRoot;
            }

            it('should render the Tank-Derived Water Usage section with consumption chart', async () => {
                const root = await waChild();
                expect(root.textContent).toContain('Tank-Derived Water Usage');
            });

            it('should render consumption buckets chart bars for the last 24 hours', async () => {
                const root = await waChild();
                // The chart bars are flex-child divs inside the consumption chart container
                const allDivs = root.querySelectorAll('div[title]');
                const chartBars = Array.from(allDivs ?? []).filter((d) => d.getAttribute('title')?.includes('—'));
                expect(chartBars.length).toBeGreaterThan(0);
            });
        });

        describe('Stage aggregates sort (lines 2610-2611)', () => {
            it('should sort and render stage aggregates in descending order', async () => {
                element.open = true;
                document.body.appendChild(element);
                await element.updateComplete;

                const tabs = element.shadowRoot?.querySelectorAll('.v1-nav-item');
                const analyticsTab = Array.from(tabs ?? []).find((t) => t.textContent?.includes('Water Analytics'));
                (analyticsTab as HTMLElement)?.click();
                await element.updateComplete;

                (element as any)._sm = transition((element as any)._sm, { type: 'SET_STAGE_AGGREGATES', data: { seedling: 3, veg: 15, flower: 25 } });
                await element.updateComplete;

                // ADR-0019: stage aggregates render inside the child shadow.
                const tab = element.shadowRoot?.querySelector('irrigation-water-analytics-tab') as any;
                await tab?.updateComplete;
                const content = tab.shadowRoot as ShadowRoot;
                expect(content?.textContent).toContain('Water Usage by Growth Stage');
                expect(content?.textContent).toContain('25.0 L');
                expect(content?.textContent).toContain('flower');

                document.body.removeChild(element);
            });
        });
    });
});

