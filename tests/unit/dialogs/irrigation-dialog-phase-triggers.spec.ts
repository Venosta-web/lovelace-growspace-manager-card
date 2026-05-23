
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { IrrigationDialog } from '../../../src/dialogs/irrigation-dialog';
import { GrowspaceDevice } from '../../../src/types';
import { GrowspaceType } from '../../../src/constants';

vi.mock('../../../src/features/shared/ui/md3-text-input', () => ({
    Md3TextInput: class extends HTMLElement {
        get value() { return this.getAttribute('value') || ''; }
        set value(v: string) { this.setAttribute('value', v); }
    }
}));
vi.mock('../../../src/features/shared/ui/md3-number-input', () => ({
    Md3NumberInput: class extends HTMLElement {
        get value() { return this.getAttribute('value') || ''; }
        set value(v: string) { this.setAttribute('value', v); }
    }
}));
vi.mock('../../../src/features/shared/ui/md3-switch', () => ({
    Md3Switch: class extends HTMLElement {
        get checked() { return this.hasAttribute('checked'); }
        set checked(v: boolean) { v ? this.setAttribute('checked', '') : this.removeAttribute('checked'); }
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
    configureDrainMonitoring: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../../src/services/data-service', () => ({
    DataService: class {
        constructor() { return mocks; }
    }
}));

class HaDialogMock extends HTMLElement { open = false; }
if (!customElements.get('ha-dialog')) customElements.define('ha-dialog', HaDialogMock);

function makeDevice(overrides: Partial<GrowspaceDevice['irrigationConfig']> = {}): GrowspaceDevice {
    return {
        deviceId: 'gs-pt',
        name: 'Phase Trigger Test',
        type: GrowspaceType.NORMAL,
        rows: 4,
        plantsPerRow: 4,
        plants: [],
        grid: {},
        biologicalMetrics: { flowerWeek: 0, vegWeek: 1 } as any,
        environmentAttributes: {
            soilMoistureSensor: 'sensor.sm1',
            irrigationTanks: [],
            substrateEcSensors: [],
        } as any,
        stats: {} as any,
        waterUsage: { litersToday: 0 } as any,
        drainConfig: { enabled: false, readings: [] } as any,
        irrigationConfig: {
            irrigationPumpEntity: 'switch.pump',
            drainPumpEntity: '',
            irrigationDuration: 60,
            drainDuration: 60,
            irrigationTimes: [],
            drainTimes: [],
            ...overrides,
        },
        irrigationStrategy: {
            enabled: true,
            lightsOnTime: '06:00:00',
            p0DurationMinutes: 60,
            p2StopBeforeLightsOffMinutes: 120,
            targetVwcPercent: 45,
            maintenanceDrybackPercent: 3,
            shotDurationSeconds: 15,
            shotIntervalMinutes: 15,
        },
    } as GrowspaceDevice;
}

function makeMockStore(device: GrowspaceDevice) {
    const $devicesValue = [JSON.parse(JSON.stringify(device))];
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
            optimisticManager: {
                applyOptimisticUpdate: vi.fn().mockImplementation(async (_type: any, _payload: any, applyFn: any) => {
                    await applyFn(_payload);
                    return 'mock-id';
                }),
                confirmUpdate: vi.fn(),
                rollbackUpdate: vi.fn(),
            },
            undoRedoManager: { pushAction: vi.fn(), canUndo: false, canRedo: false },
            showToast: vi.fn(),
            closeDialog: vi.fn(),
            refreshData: vi.fn().mockResolvedValue(undefined),
            ui: { showToast: vi.fn() },
            history: {}, grid: {}, hass: {}, syncService: {},
        },
        ui: { showToast: vi.fn() },
    };
}

async function openOnSteeringTab(element: IrrigationDialog): Promise<void> {
    element.open = true;
    document.body.appendChild(element);
    await element.updateComplete;
    // Navigate to Steering tab (index 1)
    const tabs = element.shadowRoot?.querySelectorAll('.v1-nav-item');
    (tabs?.[1] as HTMLElement)?.click();
    await element.updateComplete;
}

describe('IrrigationDialog – Phase Triggers', () => {
    let element: IrrigationDialog;
    let originalGBCR: any;

    beforeEach(() => {
        vi.clearAllMocks();
        originalGBCR = Element.prototype.getBoundingClientRect;
        Element.prototype.getBoundingClientRect = vi.fn(() => ({
            width: 100, height: 10, top: 0, left: 0, bottom: 0, right: 0, x: 0, y: 0, toJSON: () => {}
        }));
    });

    afterEach(() => {
        if (element?.isConnected) document.body.removeChild(element);
        Element.prototype.getBoundingClientRect = originalGBCR;
        vi.restoreAllMocks();
    });

    // ─── Slice 1: fields load from payload ──────────────────────────────────

    it('loads autoAdvanceP1ToP2=true from device payload', async () => {
        element = new IrrigationDialog();
        element.device = makeDevice({ autoAdvanceP1ToP2: true });
        (element as any).store = makeMockStore(element.device!);
        element.hass = {} as any;

        await openOnSteeringTab(element);

        expect((element as any)._autoAdvanceP1ToP2).toBe(true);
    });

    it('loads autoAdvanceP2ToP3=true from device payload', async () => {
        element = new IrrigationDialog();
        element.device = makeDevice({ autoAdvanceP2ToP3: true });
        (element as any).store = makeMockStore(element.device!);
        element.hass = {} as any;

        await openOnSteeringTab(element);

        expect((element as any)._autoAdvanceP2ToP3).toBe(true);
    });

    it('loads haltOnRunoffEcThreshold from device payload', async () => {
        element = new IrrigationDialog();
        element.device = makeDevice({ haltOnRunoffEcThreshold: 3.5 });
        (element as any).store = makeMockStore(element.device!);
        element.hass = {} as any;

        await openOnSteeringTab(element);

        expect((element as any)._haltOnRunoffEcThreshold).toBe(3.5);
    });

    it('defaults all Phase Trigger fields to off when absent from payload', async () => {
        element = new IrrigationDialog();
        element.device = makeDevice();
        (element as any).store = makeMockStore(element.device!);
        element.hass = {} as any;

        await openOnSteeringTab(element);

        expect((element as any)._autoAdvanceP1ToP2).toBe(false);
        expect((element as any)._autoAdvanceP2ToP3).toBe(false);
        expect((element as any)._haltOnRunoffEcThreshold).toBeNull();
    });

    // ─── Slice 2: toggles are interactive ────────────────────────────────────

    it('toggle for Auto-advance P1→P2 updates local state', async () => {
        element = new IrrigationDialog();
        element.device = makeDevice();
        (element as any).store = makeMockStore(element.device!);
        element.hass = {} as any;

        await openOnSteeringTab(element);

        const toggle = element.shadowRoot?.querySelector(
            'md3-switch[data-field="autoAdvanceP1ToP2"]'
        ) as any;
        expect(toggle).toBeTruthy();
        toggle.checked = true;
        toggle.dispatchEvent(new Event('change', { bubbles: true }));
        await element.updateComplete;

        expect((element as any)._autoAdvanceP1ToP2).toBe(true);
    });

    it('toggle for Auto-advance P2→P3 updates local state', async () => {
        element = new IrrigationDialog();
        element.device = makeDevice();
        (element as any).store = makeMockStore(element.device!);
        element.hass = {} as any;

        await openOnSteeringTab(element);

        const toggle = element.shadowRoot?.querySelector(
            'md3-switch[data-field="autoAdvanceP2ToP3"]'
        ) as any;
        expect(toggle).toBeTruthy();
        toggle.checked = true;
        toggle.dispatchEvent(new Event('change', { bubbles: true }));
        await element.updateComplete;

        expect((element as any)._autoAdvanceP2ToP3).toBe(true);
    });

    it('Halt on Runoff EC toggle sets threshold to 4.0 when enabled, null when disabled', async () => {
        element = new IrrigationDialog();
        element.device = makeDevice();
        (element as any).store = makeMockStore(element.device!);
        element.hass = {} as any;

        await openOnSteeringTab(element);

        const toggle = element.shadowRoot?.querySelector(
            'md3-switch[data-field="haltOnRunoffEc"]'
        ) as any;
        expect(toggle).toBeTruthy();

        // Enable
        toggle.checked = true;
        toggle.dispatchEvent(new Event('change', { bubbles: true }));
        await element.updateComplete;
        expect((element as any)._haltOnRunoffEcThreshold).toBe(4.0);

        // Disable
        toggle.checked = false;
        toggle.dispatchEvent(new Event('change', { bubbles: true }));
        await element.updateComplete;
        expect((element as any)._haltOnRunoffEcThreshold).toBeNull();
    });

    // ─── Slice 3: threshold input reveals when halt is enabled ───────────────

    it('threshold number input is shown when haltOnRunoffEcThreshold is set', async () => {
        element = new IrrigationDialog();
        element.device = makeDevice({ haltOnRunoffEcThreshold: 4.0 });
        (element as any).store = makeMockStore(element.device!);
        element.hass = {} as any;

        await openOnSteeringTab(element);

        const thresholdInput = element.shadowRoot?.querySelector(
            '[data-field="haltOnRunoffEcValue"]'
        );
        expect(thresholdInput).toBeTruthy();
    });

    it('threshold number input is hidden when haltOnRunoffEcThreshold is null', async () => {
        element = new IrrigationDialog();
        element.device = makeDevice(); // no threshold
        (element as any).store = makeMockStore(element.device!);
        element.hass = {} as any;

        await openOnSteeringTab(element);

        const thresholdInput = element.shadowRoot?.querySelector(
            '[data-field="haltOnRunoffEcValue"]'
        );
        expect(thresholdInput).toBeNull();
    });

    // ─── Slice 4: save dispatches correct values ──────────────────────────────

    it('save dispatches autoAdvanceP1ToP2 after toggle', async () => {
        element = new IrrigationDialog();
        element.device = makeDevice();
        (element as any).store = makeMockStore(element.device!);
        element.hass = {} as any;

        await openOnSteeringTab(element);

        const toggle = element.shadowRoot?.querySelector(
            'md3-switch[data-field="autoAdvanceP1ToP2"]'
        ) as any;
        toggle.checked = true;
        toggle.dispatchEvent(new Event('change', { bubbles: true }));
        await element.updateComplete;

        const saveBtn = element.shadowRoot?.querySelector('button.primary');
        (saveBtn as HTMLElement).click();
        await element.updateComplete;
        await new Promise(r => setTimeout(r, 0));

        expect(mocks.setIrrigationSettings).toHaveBeenCalledWith(
            expect.objectContaining({ autoAdvanceP1ToP2: true })
        );
    });

    it('save dispatches autoAdvanceP2ToP3 after toggle', async () => {
        element = new IrrigationDialog();
        element.device = makeDevice();
        (element as any).store = makeMockStore(element.device!);
        element.hass = {} as any;

        await openOnSteeringTab(element);

        const toggle = element.shadowRoot?.querySelector(
            'md3-switch[data-field="autoAdvanceP2ToP3"]'
        ) as any;
        toggle.checked = true;
        toggle.dispatchEvent(new Event('change', { bubbles: true }));
        await element.updateComplete;

        const saveBtn = element.shadowRoot?.querySelector('button.primary');
        (saveBtn as HTMLElement).click();
        await element.updateComplete;
        await new Promise(r => setTimeout(r, 0));

        expect(mocks.setIrrigationSettings).toHaveBeenCalledWith(
            expect.objectContaining({ autoAdvanceP2ToP3: true })
        );
    });

    it('save dispatches haltOnRunoffEcThreshold after enabling halt toggle', async () => {
        element = new IrrigationDialog();
        element.device = makeDevice();
        (element as any).store = makeMockStore(element.device!);
        element.hass = {} as any;

        await openOnSteeringTab(element);

        const toggle = element.shadowRoot?.querySelector(
            'md3-switch[data-field="haltOnRunoffEc"]'
        ) as any;
        toggle.checked = true;
        toggle.dispatchEvent(new Event('change', { bubbles: true }));
        await element.updateComplete;

        const saveBtn = element.shadowRoot?.querySelector('button.primary');
        (saveBtn as HTMLElement).click();
        await element.updateComplete;
        await new Promise(r => setTimeout(r, 0));

        expect(mocks.setIrrigationSettings).toHaveBeenCalledWith(
            expect.objectContaining({ haltOnRunoffEcThreshold: 4.0 })
        );
    });

    it('save dispatches haltOnRunoffEcThreshold=null when halt is disabled', async () => {
        element = new IrrigationDialog();
        element.device = makeDevice({ haltOnRunoffEcThreshold: 4.0 });
        (element as any).store = makeMockStore(element.device!);
        element.hass = {} as any;

        await openOnSteeringTab(element);

        const toggle = element.shadowRoot?.querySelector(
            'md3-switch[data-field="haltOnRunoffEc"]'
        ) as any;
        toggle.checked = false;
        toggle.dispatchEvent(new Event('change', { bubbles: true }));
        await element.updateComplete;

        const saveBtn = element.shadowRoot?.querySelector('button.primary');
        (saveBtn as HTMLElement).click();
        await element.updateComplete;
        await new Promise(r => setTimeout(r, 0));

        expect(mocks.setIrrigationSettings).toHaveBeenCalledWith(
            expect.objectContaining({ haltOnRunoffEcThreshold: null })
        );
    });

    // ─── Stub cleanup ─────────────────────────────────────────────────────────

    it('Phase Triggers section has no "Coming soon" badge', async () => {
        element = new IrrigationDialog();
        element.device = makeDevice();
        (element as any).store = makeMockStore(element.device!);
        element.hass = {} as any;

        await openOnSteeringTab(element);

        const badges = Array.from(
            element.shadowRoot?.querySelectorAll('.stub-badge') ?? []
        ).filter(el => el.textContent?.includes('Coming soon'));
        expect(badges.length).toBe(0);
    });
});
