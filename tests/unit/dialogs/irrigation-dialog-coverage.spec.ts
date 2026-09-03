import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { IrrigationDialog } from '../../../src/dialogs/irrigation-dialog';
import { transition } from '../../../src/dialogs/irrigation-dialog-sm';
import { GrowspaceDevice } from '../../../src/types';
import { GrowspaceType } from '../../../src/constants';
import type { ECRampCurve } from '../../../src/schemas/api-schema';
import { ecRampCurves$ } from '../../../src/slices/nutrient';
import { setTankLevels, tankLevels$ } from '../../../src/slices/irrigation';

vi.mock('../../../src/features/shared/ui/md3-text-input', () => ({
  Md3TextInput: class extends HTMLElement {
    get value() {
      return this.getAttribute('value') || '';
    }
    set value(v: string) {
      this.setAttribute('value', v);
    }
  },
}));
vi.mock('../../../src/features/shared/ui/md3-number-input', () => ({
  Md3NumberInput: class extends HTMLElement {
    get value() {
      return this.getAttribute('value') || '';
    }
    set value(v: string) {
      this.setAttribute('value', v);
    }
  },
}));
vi.mock('../../../src/features/shared/ui/md3-switch', () => ({
  Md3Switch: class extends HTMLElement {
    get checked() {
      return this.hasAttribute('checked');
    }
    set checked(v: boolean) {
      v ? this.setAttribute('checked', '') : this.removeAttribute('checked');
    }
  },
}));

// Stub the slice mutators the dialog calls (ADR-0001) so they don't hit the real
// callService/hassCall seam (no hass in this unit context), while keeping the real
// atoms the dialog subscribes to.
const sliceMocks = vi.hoisted(() => ({
  logDrainReading: vi.fn().mockResolvedValue(undefined),
  configureDrainMonitoring: vi.fn().mockResolvedValue(undefined),
  setEcTargetRanges: vi.fn().mockResolvedValue(undefined),
  getIrrigationAnalytics: vi
    .fn()
    .mockResolvedValue({ growspace_id: 'gs1', stage_aggregates: { veg: 12.5, flower: 30.0 } }),
  resetWaterTracking: vi.fn().mockResolvedValue(undefined),
  saveECRampCurve: vi.fn().mockResolvedValue(undefined),
  removeECRampCurve: vi.fn().mockResolvedValue(undefined),
  fetchECRampCurves: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../../src/slices/irrigation', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/slices/irrigation')>();
  return {
    ...actual,
    logDrainReading: sliceMocks.logDrainReading,
    configureDrainMonitoring: sliceMocks.configureDrainMonitoring,
    setEcTargetRanges: sliceMocks.setEcTargetRanges,
    getIrrigationAnalytics: sliceMocks.getIrrigationAnalytics,
  };
});

vi.mock('../../../src/slices/growspace', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/slices/growspace')>();
  return {
    ...actual,
    resetWaterTracking: sliceMocks.resetWaterTracking,
  };
});

vi.mock('../../../src/slices/nutrient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/slices/nutrient')>();
  return {
    ...actual,
    saveECRampCurve: sliceMocks.saveECRampCurve,
    removeECRampCurve: sliceMocks.removeECRampCurve,
    fetchECRampCurves: sliceMocks.fetchECRampCurves,
  };
});

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
    irrigationTanks: [
      {
        name: 'Tank 1',
        fillLevel: 50,
        isWarning: false,
        hoursRemaining: 48,
        depletionStatus: 'depleting',
      },
    ],
    bulkEcSensors: [{ entity_id: 'sensor.ec1' }],
  } as any,
  waterUsage: {
    litersToday: 10.5,
    litersPerPlantPerDay: 0.65,
    waterEfficiency: 0.85,
  } as any,
  irrigationConfig: {
    irrigationPumpEntity: 'switch.pump1',
    irrigationTimes: [{ time: '08:00', duration: 30 }],
    drainTimes: [{ time: '09:00', duration: 45 }],
    drainDuration: 45,
  } as any,
  drainConfig: {
    enabled: true,
    readings: [
      {
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        feedEc: 1.5,
        drainEc: 1.8,
        feedVolumeMl: 1000,
        drainVolumeMl: 200,
      },
    ],
  } as any,
  stats: {} as any,
};

function makeMockStore(device: GrowspaceDevice) {
  const deviceCopy = JSON.parse(JSON.stringify(device));
  const $devicesValue = [deviceCopy];
  const dataStore = {
    $devices: { get: () => $devicesValue },
    patchDeviceIrrigationConfig: vi.fn((gsId: string, patch: any) => {
      const d = $devicesValue.find((x: any) => x.deviceId === gsId);
      if (d) Object.assign(d.irrigationConfig, patch);
    }),
  };
  return {
    context: {
      data: dataStore,
      showToast: vi.fn(),
      closeDialog: vi.fn(),
      refreshData: vi.fn().mockResolvedValue(undefined),
      ui: { showToast: vi.fn() },
      history: {},
      grid: {},
      hass: {},
      syncService: {},
    },
    data: dataStore,
    actions: {},
    ui: { showToast: vi.fn() },
  };
}

describe('IrrigationDialog - Coverage', () => {
  let element: IrrigationDialog;
  let mockStore: ReturnType<typeof makeMockStore>;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockStore = makeMockStore(mockDevice);
    element = new IrrigationDialog();
    element.device = JSON.parse(JSON.stringify(mockDevice));
    (element as any).store = mockStore;
    element.hass = {
      states: {
        'switch.pump1': {
          entity_id: 'switch.pump1',
          state: 'on',
          attributes: { friendly_name: 'Pump 1' },
        },
        'sensor.ec1': {
          entity_id: 'sensor.ec1',
          state: '1.5',
          attributes: { friendly_name: 'EC Sensor' },
        },
      },
    } as any;
    element.open = true;
    document.body.appendChild(element);
    await element.updateComplete;
  });

  afterEach(() => {
    if (element.isConnected) document.body.removeChild(element);
    tankLevels$.set(new Map());
    vi.restoreAllMocks();
  });

  // ─── Tabs 0–7: schedules, steering, config, tanks, water_analytics, drain_ec, ec_targets, ec_ramp

  async function switchToTab(index: number) {
    const tabs = element.shadowRoot?.querySelectorAll('.v1-nav-item');
    (tabs?.[index] as HTMLElement)?.click();
    await element.updateComplete;
  }

  // ─── Discard Changes Dialog (lines 1600–1623) ─────────────────────────────

  describe('Discard Changes Dialog', () => {
    beforeEach(async () => {
      // Put SM into confirm-discard state by directly updating it
      (element as any)._sm = {
        ...(element as any)._sm,
        status: { kind: 'confirm-discard', pendingTab: 'steering' },
      };
      await element.updateComplete;
    });

    it('renders the discard-changes dialog when status is confirm-discard', () => {
      const discardDialog = element.shadowRoot?.querySelector(
        'gs-dialog[heading="Discard Changes?"]'
      );
      expect(discardDialog).toBeTruthy();
      const text = element.shadowRoot?.textContent;
      expect(text).toContain('You have unsaved changes');
    });

    it('cancels tab switch via dialog @close event (line 1600)', async () => {
      const gsDialog = element.shadowRoot?.querySelector(
        'gs-dialog[heading="Discard Changes?"]'
      ) as HTMLElement;
      expect(gsDialog).toBeTruthy();
      gsDialog.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }));
      await element.updateComplete;
      expect((element as any)._sm.status.kind).toBe('idle');
    });

    it('cancels tab switch via Stay button (line 1615)', async () => {
      // Find the "Stay" button inside the discard dialog
      const buttons = Array.from(element.shadowRoot?.querySelectorAll('button') ?? []);
      const stayBtn = buttons.find((b) => b.textContent?.trim() === 'Stay') as HTMLElement;
      expect(stayBtn).toBeTruthy();
      stayBtn.click();
      await element.updateComplete;
      expect((element as any)._sm.status.kind).toBe('idle');
    });

    it('discards changes and switches tab via Discard & Switch button (line 1623)', async () => {
      const buttons = Array.from(element.shadowRoot?.querySelectorAll('button') ?? []);
      const discardBtn = buttons.find((b) => b.textContent?.includes('Discard')) as HTMLElement;
      expect(discardBtn).toBeTruthy();
      discardBtn.click();
      await element.updateComplete;
      // After discard, should have switched to the pending tab (steering) and status reset
      expect((element as any)._sm.status.kind).toBe('idle');
      expect((element as any)._sm.activeTab).toBe('steering');
    });
  });

  // ─── Tank Edit Form Inputs (decomposed — ADR-0019) ────────────────────────
  // The editor lives in <irrigation-tanks-tab>; field edits flow as Tab Intents
  // that the dialog translates into UPDATE_TANK_DRAFT, so the draft lands in the
  // SM (`_sm.tabs.tanks.sub.draft`), not a component field.

  describe('Tank Edit Form Inputs', () => {
    let tab: any;
    const EDIT_TANK = {
      sensorEntity: 'sensor.tank_old',
      name: 'Tank 1',
      volumeLiters: 200,
      warningLevel: 25,
      fillLevel: 50,
      isWarning: false,
      hoursRemaining: 48,
      depletionStatus: 'depleting',
    };
    const draftOf = () => (element as any)._sm.tabs.tanks.sub.draft;
    const tankInput = (placeholder: string): HTMLInputElement => {
      const inputs = Array.from(tab.shadowRoot.querySelectorAll('input')) as HTMLInputElement[];
      return inputs.find((i) => i.getAttribute('placeholder') === placeholder)!;
    };

    beforeEach(async () => {
      setTankLevels('gs1', [EDIT_TANK] as any);
      // Switch to Tanks by label — indices shifted when the overview tab was added.
      const navs = Array.from(element.shadowRoot?.querySelectorAll('.v1-nav-item') ?? []);
      (navs.find((t) => t.textContent?.includes('Tanks')) as HTMLElement)?.click();
      await element.updateComplete;
      tab = element.shadowRoot!.querySelector('irrigation-tanks-tab');
      await tab.updateComplete;
      // Open the editor via the edit button (emits edit-tank-requested).
      tab.shadowRoot.querySelector('.tank-edit-btn').click();
      await element.updateComplete;
      await tab.updateComplete;
    });

    it('opens the editor in the SM seeded from the tank', () => {
      const sub = (element as any)._sm.tabs.tanks.sub;
      expect(sub.kind).toBe('editing');
      expect(sub.index).toBe(0);
      expect(sub.draft.name).toBe('Tank 1');
    });

    it('updates sensorEntity when the picker commits an entity', async () => {
      // The picker itself is HA's; what the dialog owns is the `entity-picked`
      // wiring, so the intent is driven straight from the picker element.
      const picker = tab.shadowRoot.querySelector('gm-entity-picker')!;
      picker.dispatchEvent(
        new CustomEvent('entity-picked', {
          detail: 'sensor.new_entity',
          bubbles: true,
          composed: true,
        })
      );
      await element.updateComplete;
      expect(draftOf().sensorEntity).toBe('sensor.new_entity');
    });

    it('updates name on input', async () => {
      const input = tankInput('e.g. Main Tank');
      Object.defineProperty(input, 'value', { value: 'Nutrient Tank B', writable: true });
      input.dispatchEvent(new Event('input'));
      await element.updateComplete;
      expect(draftOf().name).toBe('Nutrient Tank B');
    });

    it('updates volumeLiters with valid number on input', async () => {
      const input = tankInput('e.g. 200');
      Object.defineProperty(input, 'value', { value: '350', writable: true });
      input.dispatchEvent(new Event('input'));
      await element.updateComplete;
      expect(draftOf().volumeLiters).toBe(350);
    });

    it('sets volumeLiters to null when input is empty/NaN', async () => {
      const input = tankInput('e.g. 200');
      Object.defineProperty(input, 'value', { value: '', writable: true });
      input.dispatchEvent(new Event('input'));
      await element.updateComplete;
      expect(draftOf().volumeLiters).toBeNull();
    });
  });

  // ─── Water Analytics – Crop Steering Schedule Summary (lines 3508–3557) ───

  describe('Water Analytics – Crop Steering with Shots and Drain', () => {
    beforeEach(async () => {
      // Enable crop steering with enough config to produce shots
      (element as any)._sm = transition((element as any)._sm, {
        type: 'UPDATE_STEERING_DRAFT',
        partial: {
          enabled: true,
          lightsOnTime: '06:00:00',
          shotIntervalMinutes: 60,
          shotDurationSeconds: 30,
          p0DurationMinutes: 60,
          p2StopBeforeLightsOffMinutes: 60,
        },
      });
      // Ensure device has drain times so totalDrain > 0
      element.device = {
        ...JSON.parse(JSON.stringify(mockDevice)),
        irrigationConfig: {
          ...mockDevice.irrigationConfig,
          drainTimes: [
            { time: '09:00', duration: 45 },
            { time: '15:00', duration: 45 },
          ],
          drainDuration: 45,
        },
      } as any;
      await element.updateComplete;
      // Select the Water Analytics tab by LABEL (overview/steering shifted indices).
      const navs = element.shadowRoot?.querySelectorAll('.v1-nav-item');
      const waNav = Array.from(navs ?? []).find((t) => t.textContent?.includes('Water Analytics'));
      (waNav as HTMLElement)?.click();
      await element.updateComplete;
    });

    // ADR-0019: the crop-steering schedule summary renders inside the decomposed
    // `<irrigation-water-analytics-tab>` child shadow; the "edit in Steering →"
    // link emits a `water-analytics-open-steering` Tab Intent that the Dialog
    // Shell translates to the steering tab switch.
    async function waChild(): Promise<ShadowRoot> {
      const tab = element.shadowRoot?.querySelector('irrigation-water-analytics-tab') as any;
      await tab?.updateComplete;
      return tab.shadowRoot as ShadowRoot;
    }

    it('renders crop steering shots list with "edit in Steering" link', async () => {
      const text = (await waChild()).textContent ?? '';
      expect(text).toContain('shots/day');
      expect(text).toContain('edit in Steering');
    });

    it('clicking "edit in Steering" link switches to steering tab via the Tab Intent', async () => {
      const root = await waChild();
      const links = Array.from(root.querySelectorAll('a'));
      const steeringLink = links.find((l) => l.textContent?.includes('edit in Steering'));
      expect(steeringLink).toBeTruthy();
      steeringLink!.dispatchEvent(
        new MouseEvent('click', { bubbles: true, composed: true, cancelable: true })
      );
      await element.updateComplete;
      expect((element as any)._sm.activeTab).toBe('steering');
    });

    it('renders drain events section with count and times when totalDrain > 0', async () => {
      const text = (await waChild()).textContent ?? '';
      expect(text).toContain('events/day');
      expect(text).toContain('09:00');
    });
  });

  // ─── EC Ramp tab (decomposed into <irrigation-ec-ramp-tab> — ADR-0019) ──────
  // The tab renders in the child whose VM reads the Nutrient slice's
  // ecRampCurves$ (seeded here). Edit/point/validation logic is unit-tested in
  // the SM + VM specs; these cover the dialog→child→effect integration only.
  describe('EC Ramp tab (decomposed)', () => {
    const sampleCurve: ECRampCurve = {
      id: 'curve-1',
      name: 'Veg Ramp',
      stage: 'veg',
      points: [
        { day: 1, target_ec: 1.0 },
        { day: 14, target_ec: 1.8 },
      ],
    };

    async function openEcRampTab() {
      ecRampCurves$.set({ 'curve-1': sampleCurve });
      const navs = Array.from(element.shadowRoot?.querySelectorAll('.v1-nav-item') ?? []);
      (navs.find((t) => t.textContent?.includes('EC Ramp')) as HTMLElement)?.click();
      await element.updateComplete;
      const tab = element.shadowRoot!.querySelector('irrigation-ec-ramp-tab') as any;
      await tab.updateComplete;
      return tab;
    }

    afterEach(() => {
      ecRampCurves$.set(null);
    });

    it('renders the saved curves (read from ecRampCurves$) in the child', async () => {
      const tab = await openEcRampTab();
      const text = (tab.shadowRoot.textContent ?? '').replace(/\s+/g, ' ');
      expect(text).toContain('Veg Ramp');
      expect(text).toContain('2 point');
    });

    it('clicking a curve opens the editor (draft lands in the SM)', async () => {
      const tab = await openEcRampTab();
      (tab.shadowRoot.querySelector('.curve-item') as HTMLElement).click();
      await element.updateComplete;
      const sub = (element as any)._sm.tabs.ec_ramp.sub;
      expect(sub.kind).toBe('editing');
      expect(sub.draft.name).toBe('Veg Ramp');
    });

    it('confirmed delete calls removeECRampCurve through the effect', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      const tab = await openEcRampTab();
      (tab.shadowRoot.querySelector('button[title="Delete"]') as HTMLElement).click();
      await new Promise((resolve) => setTimeout(resolve, 0));
      await element.updateComplete;
      expect(sliceMocks.removeECRampCurve).toHaveBeenCalledWith('curve-1');
    });

    it('cancelled delete does not call removeECRampCurve', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(false);
      const tab = await openEcRampTab();
      (tab.shadowRoot.querySelector('button[title="Delete"]') as HTMLElement).click();
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(sliceMocks.removeECRampCurve).not.toHaveBeenCalled();
    });

    it('a failing delete surfaces an error toast (MutationRunController)', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      sliceMocks.removeECRampCurve.mockRejectedValueOnce(new Error('boom'));
      const tab = await openEcRampTab();
      (tab.shadowRoot.querySelector('button[title="Delete"]') as HTMLElement).click();
      await new Promise((resolve) => setTimeout(resolve, 0));
      await element.updateComplete;
      expect((element as any)._sm.toast).toBe('Failed to delete EC ramp curve');
    });

    it('save composes the curve and calls saveECRampCurve through the effect', async () => {
      const tab = await openEcRampTab();
      (tab.shadowRoot.querySelector('.curve-item') as HTMLElement).click();
      await element.updateComplete;
      await tab.updateComplete;
      const saveBtn = Array.from(tab.shadowRoot.querySelectorAll('button')).find((b: Element) =>
        b.textContent?.includes('Save Curve')
      ) as HTMLElement;
      saveBtn.click();
      await new Promise((resolve) => setTimeout(resolve, 0));
      await element.updateComplete;
      expect(sliceMocks.saveECRampCurve).toHaveBeenCalledOnce();
      const [arg] = sliceMocks.saveECRampCurve.mock.calls[0];
      expect(arg.name).toBe('Veg Ramp');
      expect(arg.curve_id).toBe('curve-1');
      // editor closed after save
      expect((element as any)._sm.tabs.ec_ramp.sub.kind).toBe('list');
    });
  });
});
