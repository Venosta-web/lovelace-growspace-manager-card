
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { IrrigationDialog } from '../../../src/dialogs/irrigation-dialog';
import { transition } from '../../../src/dialogs/irrigation-dialog-sm';
import { GrowspaceDevice } from '../../../src/types';
import { GrowspaceType } from '../../../src/constants';
import { irrigationConfigs$ } from '../../../src/slices/irrigation';

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

// Stub the Irrigation slice mutators the dialog calls (ADR-0001) so they don't
// hit the real callService/hassCall seam (no hass in this unit context), while
// keeping the real atoms the dialog subscribes to.
const sliceMocks = vi.hoisted(() => ({
    getIrrigationAnalytics: vi.fn().mockResolvedValue(null),
    configureDrainMonitoring: vi.fn().mockResolvedValue(undefined),
    setEcTargetRanges: vi.fn().mockResolvedValue(undefined),
    logDrainReading: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../../src/slices/irrigation', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../../../src/slices/irrigation')>();
    return {
        ...actual,
        getIrrigationAnalytics: sliceMocks.getIrrigationAnalytics,
        configureDrainMonitoring: sliceMocks.configureDrainMonitoring,
        setEcTargetRanges: sliceMocks.setEcTargetRanges,
        logDrainReading: sliceMocks.logDrainReading,
    };
});

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
    // Select the Steering tab by LABEL (not index — nav order is gate-dependent).
    const tabs = element.shadowRoot?.querySelectorAll('.v1-nav-item');
    const steeringTab = Array.from(tabs ?? []).find((t) =>
        t.textContent?.includes('Steering')
    ) as HTMLElement | undefined;
    steeringTab?.click();
    await element.updateComplete;
}

/**
 * ADR-0019: the Steering tab renders in the decomposed <irrigation-steering-tab>
 * child. Returns its shadow root so DOM queries pierce the child; SM assertions
 * still read element._sm, which the Dialog Shell updates from the child's intents.
 */
async function steeringChild(element: IrrigationDialog): Promise<ShadowRoot> {
    const child = element.shadowRoot?.querySelector('irrigation-steering-tab') as
        | (HTMLElement & { updateComplete: Promise<boolean>; shadowRoot: ShadowRoot })
        | null;
    await child?.updateComplete;
    return child!.shadowRoot;
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
        irrigationConfigs$.set(new Map());
        vi.restoreAllMocks();
    });

    // ─── Slice 1: fields load from payload ──────────────────────────────────

    it('loads autoAdvanceP1ToP2=true from device payload', async () => {
        element = new IrrigationDialog();
        element.device = makeDevice({ autoAdvanceP1ToP2: true });
        (element as any).store = makeMockStore(element.device!);
        element.hass = {} as any;

        await openOnSteeringTab(element);

        expect((element as any)._sm.tabs.config.draft.autoAdvanceP1ToP2).toBe(true);
    });

    it('loads autoAdvanceP2ToP3=true from device payload', async () => {
        element = new IrrigationDialog();
        element.device = makeDevice({ autoAdvanceP2ToP3: true });
        (element as any).store = makeMockStore(element.device!);
        element.hass = {} as any;

        await openOnSteeringTab(element);

        expect((element as any)._sm.tabs.config.draft.autoAdvanceP2ToP3).toBe(true);
    });

    it('loads haltOnRunoffEcThreshold from device payload', async () => {
        element = new IrrigationDialog();
        element.device = makeDevice({ haltOnRunoffEcThreshold: 3.5 });
        (element as any).store = makeMockStore(element.device!);
        element.hass = {} as any;

        await openOnSteeringTab(element);

        expect((element as any)._sm.tabs.config.draft.haltOnRunoffEcThreshold).toBe(3.5);
    });

    it('defaults all Phase Trigger fields to off when absent from payload', async () => {
        element = new IrrigationDialog();
        element.device = makeDevice();
        (element as any).store = makeMockStore(element.device!);
        element.hass = {} as any;

        await openOnSteeringTab(element);

        expect((element as any)._sm.tabs.config.draft.autoAdvanceP1ToP2).toBe(false);
        expect((element as any)._sm.tabs.config.draft.autoAdvanceP2ToP3).toBe(false);
        expect((element as any)._sm.tabs.config.draft.haltOnRunoffEcThreshold).toBeNull();
    });

    // ─── Slice 2: toggles are interactive ────────────────────────────────────

    it('toggle for Auto-advance P1→P2 updates local state', async () => {
        element = new IrrigationDialog();
        element.device = makeDevice();
        (element as any).store = makeMockStore(element.device!);
        element.hass = {} as any;

        await openOnSteeringTab(element);

        const sr = await steeringChild(element);
        const toggle = sr.querySelector('md3-switch[data-field="autoAdvanceP1ToP2"]') as any;
        expect(toggle).toBeTruthy();
        toggle.checked = true;
        toggle.dispatchEvent(new Event('change', { bubbles: true }));
        await element.updateComplete;

        expect((element as any)._sm.tabs.config.draft.autoAdvanceP1ToP2).toBe(true);
    });

    it('toggle for Auto-advance P2→P3 updates local state', async () => {
        element = new IrrigationDialog();
        element.device = makeDevice();
        (element as any).store = makeMockStore(element.device!);
        element.hass = {} as any;

        await openOnSteeringTab(element);

        const sr = await steeringChild(element);
        const toggle = sr.querySelector('md3-switch[data-field="autoAdvanceP2ToP3"]') as any;
        expect(toggle).toBeTruthy();
        toggle.checked = true;
        toggle.dispatchEvent(new Event('change', { bubbles: true }));
        await element.updateComplete;

        expect((element as any)._sm.tabs.config.draft.autoAdvanceP2ToP3).toBe(true);
    });

    it('Halt on Runoff EC toggle sets threshold to 4.0 when enabled, null when disabled', async () => {
        element = new IrrigationDialog();
        element.device = makeDevice();
        (element as any).store = makeMockStore(element.device!);
        element.hass = {} as any;

        await openOnSteeringTab(element);

        const sr = await steeringChild(element);
        const toggle = sr.querySelector('md3-switch[data-field="haltOnRunoffEc"]') as any;
        expect(toggle).toBeTruthy();

        // Enable
        toggle.checked = true;
        toggle.dispatchEvent(new Event('change', { bubbles: true }));
        await element.updateComplete;
        expect((element as any)._sm.tabs.config.draft.haltOnRunoffEcThreshold).toBe(4.0);

        // Disable
        toggle.checked = false;
        toggle.dispatchEvent(new Event('change', { bubbles: true }));
        await element.updateComplete;
        expect((element as any)._sm.tabs.config.draft.haltOnRunoffEcThreshold).toBeNull();
    });

    // ─── Slice 3: threshold input reveals when halt is enabled ───────────────

    it('threshold number input is shown when haltOnRunoffEcThreshold is set', async () => {
        element = new IrrigationDialog();
        element.device = makeDevice({ haltOnRunoffEcThreshold: 4.0 });
        (element as any).store = makeMockStore(element.device!);
        element.hass = {} as any;

        await openOnSteeringTab(element);

        const sr = await steeringChild(element);
        const thresholdInput = sr.querySelector('[data-field="haltOnRunoffEcValue"]');
        expect(thresholdInput).toBeTruthy();
    });

    it('threshold number input is hidden when haltOnRunoffEcThreshold is null', async () => {
        element = new IrrigationDialog();
        element.device = makeDevice(); // no threshold
        (element as any).store = makeMockStore(element.device!);
        element.hass = {} as any;

        await openOnSteeringTab(element);

        const sr = await steeringChild(element);
        const thresholdInput = sr.querySelector('[data-field="haltOnRunoffEcValue"]');
        expect(thresholdInput).toBeNull();
    });

    // ─── Crop Steering Phase Transitions (Confirmation Dialog) ────────────────

    it('clicking the active phase card is a no-op', async () => {
        element = new IrrigationDialog();
        element.device = makeDevice();
        (element as any).store = makeMockStore(element.device!);
        element.hass = {} as any;

        await openOnSteeringTab(element);

        (element as any)._sm = { ...(element as any)._sm, tabs: { ...(element as any)._sm.tabs, steering: { ...(element as any)._sm.tabs.steering, phase: 'p2' } } };
        await element.updateComplete;

        const sr = await steeringChild(element);
        const phaseCards = sr.querySelectorAll('.phase-card');
        const activeCard = Array.from(phaseCards ?? []).find((card: Element) => card.textContent?.includes('Phase · P2')) as HTMLElement;
        expect(activeCard).toBeTruthy();
        activeCard.click();
        await element.updateComplete;

        expect((element as any)._sm.tabs.steering.sub.kind).toBe('idle');
        expect((element as any)._sm.tabs.steering.phase).toBe('p2');
    });

    it('clicking an inactive phase card opens the confirmation dialog without updating active phase state immediately', async () => {
        element = new IrrigationDialog();
        element.device = makeDevice();
        (element as any).store = makeMockStore(element.device!);
        element.hass = {} as any;

        await openOnSteeringTab(element);

        (element as any)._sm = { ...(element as any)._sm, tabs: { ...(element as any)._sm.tabs, steering: { ...(element as any)._sm.tabs.steering, phase: 'p2' } } };
        await element.updateComplete;

        const sr = await steeringChild(element);
        const phaseCards = sr.querySelectorAll('.phase-card');
        const inactiveCard = Array.from(phaseCards ?? []).find((card: Element) => card.textContent?.includes('Phase · P1')) as HTMLElement;
        expect(inactiveCard).toBeTruthy();
        inactiveCard.click();
        await element.updateComplete;

        expect((element as any)._sm.tabs.steering.sub.kind).toBe('confirm-phase');
        expect((element as any)._sm.tabs.steering.sub.kind === 'confirm-phase' ? (element as any)._sm.tabs.steering.sub.pending : undefined).toBe('p1');
        expect((element as any)._sm.tabs.steering.phase).toBe('p2');
    });

    it('calling _cancelPhaseChange closes the dialog and keeps the active phase unchanged', async () => {
        element = new IrrigationDialog();
        element.device = makeDevice();
        (element as any).store = makeMockStore(element.device!);
        element.hass = {} as any;

        await openOnSteeringTab(element);

        (element as any)._sm = { ...(element as any)._sm, tabs: { ...(element as any)._sm.tabs, steering: { ...(element as any)._sm.tabs.steering, phase: 'p2' } } };
        (element as any)._sm = transition((element as any)._sm, { type: 'REQUEST_PHASE_CHANGE', phase: 'p1' });
        await element.updateComplete;

        // The cancel gesture now flows as a Tab Intent the Shell translates.
        const child = element.shadowRoot!.querySelector('irrigation-steering-tab')!;
        child.dispatchEvent(new CustomEvent('phase-change-cancelled', { bubbles: true, composed: true }));
        await element.updateComplete;

        expect((element as any)._sm.tabs.steering.sub.kind).toBe('idle');
        expect((element as any)._sm.tabs.steering.phase).toBe('p2');
    });

    it('calling _confirmPhaseChange closes the dialog and correctly updates the _activePhase state', async () => {
        element = new IrrigationDialog();
        element.device = makeDevice();
        (element as any).store = makeMockStore(element.device!);
        element.hass = {} as any;

        await openOnSteeringTab(element);

        (element as any)._sm = { ...(element as any)._sm, tabs: { ...(element as any)._sm.tabs, steering: { ...(element as any)._sm.tabs.steering, phase: 'p2' } } };
        (element as any)._sm = transition((element as any)._sm, { type: 'REQUEST_PHASE_CHANGE', phase: 'p1' });
        await element.updateComplete;

        // The confirm gesture now flows as a Tab Intent the Shell translates
        // (CONFIRM_PHASE_CHANGE + _saveSettings).
        const child = element.shadowRoot!.querySelector('irrigation-steering-tab')!;
        child.dispatchEvent(new CustomEvent('phase-change-confirmed', { bubbles: true, composed: true }));
        await element.updateComplete;

        expect((element as any)._sm.tabs.steering.sub.kind).toBe('idle');
        expect((element as any)._sm.tabs.steering.phase).toBe('p1');
    });

    it('clicking Cancel button in dialog closes the dialog and keeps active phase unchanged', async () => {
        element = new IrrigationDialog();
        element.device = makeDevice();
        (element as any).store = makeMockStore(element.device!);
        element.hass = {} as any;

        await openOnSteeringTab(element);

        (element as any)._sm = { ...(element as any)._sm, tabs: { ...(element as any)._sm.tabs, steering: { ...(element as any)._sm.tabs.steering, phase: 'p2' } } };
        await element.updateComplete;

        const sr = await steeringChild(element);
        const phaseCards = sr.querySelectorAll('.phase-card');
        const inactiveCard = Array.from(phaseCards ?? []).find((card: Element) => card.textContent?.includes('Phase · P1')) as HTMLElement;
        expect(inactiveCard).toBeTruthy();
        inactiveCard.click();
        await element.updateComplete;

        expect((element as any)._sm.tabs.steering.sub.kind).toBe('confirm-phase');

        const sr2 = await steeringChild(element);
        // The phase-confirm overlay is the gs-dialog owning the Confirm button.
        const phaseConfirmBtn = Array.from(sr2.querySelectorAll('gs-dialog button.primary')).find(
            (b) => b.textContent?.trim() === 'Confirm'
        ) as HTMLElement;
        const cancelBtn = phaseConfirmBtn.closest('gs-dialog')!.querySelector('button.tonal') as HTMLElement;
        expect(cancelBtn).toBeTruthy();
        cancelBtn.click();
        await element.updateComplete;

        expect((element as any)._sm.tabs.steering.sub.kind).toBe('idle');
        expect((element as any)._sm.tabs.steering.phase).toBe('p2');
    });

    it('clicking Confirm button in dialog closes the dialog and updates active phase', async () => {
        element = new IrrigationDialog();
        element.device = makeDevice();
        (element as any).store = makeMockStore(element.device!);
        element.hass = {} as any;

        await openOnSteeringTab(element);

        (element as any)._sm = { ...(element as any)._sm, tabs: { ...(element as any)._sm.tabs, steering: { ...(element as any)._sm.tabs.steering, phase: 'p2' } } };
        await element.updateComplete;

        const sr = await steeringChild(element);
        const phaseCards = sr.querySelectorAll('.phase-card');
        const inactiveCard = Array.from(phaseCards ?? []).find((card: Element) => card.textContent?.includes('Phase · P1')) as HTMLElement;
        expect(inactiveCard).toBeTruthy();
        inactiveCard.click();
        await element.updateComplete;

        expect((element as any)._sm.tabs.steering.sub.kind).toBe('confirm-phase');

        const sr2 = await steeringChild(element);
        const confirmBtn = Array.from(sr2.querySelectorAll('gs-dialog button.primary')).find(
            (b) => b.textContent?.trim() === 'Confirm'
        ) as HTMLElement;
        expect(confirmBtn).toBeTruthy();
        confirmBtn.click();
        await element.updateComplete;

        expect((element as any)._sm.tabs.steering.sub.kind).toBe('idle');
        expect((element as any)._sm.tabs.steering.phase).toBe('p1');
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
