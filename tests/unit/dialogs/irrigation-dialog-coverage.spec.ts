
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { atom } from 'nanostores';
import { IrrigationDialog } from '../../../src/dialogs/irrigation-dialog';
import { transition } from '../../../src/dialogs/irrigation-dialog-sm';
import { GrowspaceDevice } from '../../../src/types';
import { GrowspaceType } from '../../../src/constants';
import type { ECRampCurve } from '../../../src/schemas/api-schema';

vi.mock('../../../src/features/shared/ui/md3-text-input', () => ({
  Md3TextInput: class extends HTMLElement {
    get value() { return this.getAttribute('value') || ''; }
    set value(v: string) { this.setAttribute('value', v); }
  },
}));
vi.mock('../../../src/features/shared/ui/md3-number-input', () => ({
  Md3NumberInput: class extends HTMLElement {
    get value() { return this.getAttribute('value') || ''; }
    set value(v: string) { this.setAttribute('value', v); }
  },
}));
vi.mock('../../../src/features/shared/ui/md3-switch', () => ({
  Md3Switch: class extends HTMLElement {
    get checked() { return this.hasAttribute('checked'); }
    set checked(v: boolean) { v ? this.setAttribute('checked', '') : this.removeAttribute('checked'); }
  },
}));

const mocks = vi.hoisted(() => ({
  logDrainReading: vi.fn().mockResolvedValue(undefined),
  configureDrainMonitoring: vi.fn().mockResolvedValue(true),
  configureEnvironment: vi.fn().mockResolvedValue(true),
  fetchGrowspace: vi.fn(),
  setIrrigationStrategy: vi.fn().mockResolvedValue(true),
  saveSettings: vi.fn(),
  resetWaterTracking: vi.fn().mockResolvedValue(undefined),
  removeDrainTime: vi.fn().mockResolvedValue(true),
  addDrainTime: vi.fn().mockResolvedValue(true),
  removeIrrigationTime: vi.fn().mockResolvedValue(true),
  addIrrigationTime: vi.fn().mockResolvedValue(true),
  getIrrigationAnalytics: vi.fn().mockResolvedValue({ growspace_id: 'gs1', stage_aggregates: { veg: 12.5, flower: 30.0 } }),
}));

vi.mock('../../../src/services/data-service', () => ({
  DataService: class {
    constructor() { return mocks; }
  },
}));

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
      { name: 'Tank 1', fillLevel: 50, isWarning: false, hoursRemaining: 48, depletionStatus: 'depleting' },
    ],
    substrateEcSensors: [{ entity_id: 'sensor.ec1' }],
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

function makeMockStore(device: GrowspaceDevice, ecRampCurvesAtom = atom<Record<string, ECRampCurve>>({})) {
  const deviceCopy = JSON.parse(JSON.stringify(device));
  const $devicesValue = [deviceCopy];
  const dataStore = {
    $devices: { get: () => $devicesValue },
    $ecRampCurves: ecRampCurvesAtom,
    patchDeviceIrrigationConfig: vi.fn((gsId: string, patch: any) => {
      const d = $devicesValue.find((x: any) => x.deviceId === gsId);
      if (d) Object.assign(d.irrigationConfig, patch);
    }),
  };
  return {
    context: {
      dataService: mocks,
      data: dataStore,
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
    data: dataStore,
    actions: {
      library: {
        fetchECRampCurves: vi.fn().mockResolvedValue(undefined),
        saveECRampCurve: vi.fn().mockResolvedValue(undefined),
        removeECRampCurve: vi.fn().mockResolvedValue(undefined),
      },
    },
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
      'switch.pump1': { entity_id: 'switch.pump1', state: 'on', attributes: { friendly_name: 'Pump 1' } },
      'sensor.ec1': { entity_id: 'sensor.ec1', state: '1.5', attributes: { friendly_name: 'EC Sensor' } },
    },
  } as any;
    element.open = true;
    document.body.appendChild(element);
    await element.updateComplete;
  });

  afterEach(() => {
    if (element.isConnected) document.body.removeChild(element);
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
      const discardDialog = element.shadowRoot?.querySelector('gs-dialog[heading="Discard Changes?"]');
      expect(discardDialog).toBeTruthy();
      const text = element.shadowRoot?.textContent;
      expect(text).toContain('You have unsaved changes');
    });

    it('cancels tab switch via dialog @close event (line 1600)', async () => {
      const gsDialog = element.shadowRoot?.querySelector('gs-dialog[heading="Discard Changes?"]') as HTMLElement;
      expect(gsDialog).toBeTruthy();
      gsDialog.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }));
      await element.updateComplete;
      expect((element as any)._sm.status.kind).toBe('idle');
    });

    it('cancels tab switch via Stay button (line 1615)', async () => {
      // Find the "Stay" button inside the discard dialog
      const buttons = Array.from(element.shadowRoot?.querySelectorAll('button') ?? []);
      const stayBtn = buttons.find(b => b.textContent?.trim() === 'Stay') as HTMLElement;
      expect(stayBtn).toBeTruthy();
      stayBtn.click();
      await element.updateComplete;
      expect((element as any)._sm.status.kind).toBe('idle');
    });

    it('discards changes and switches tab via Discard & Switch button (line 1623)', async () => {
      const buttons = Array.from(element.shadowRoot?.querySelectorAll('button') ?? []);
      const discardBtn = buttons.find(b => b.textContent?.includes('Discard')) as HTMLElement;
      expect(discardBtn).toBeTruthy();
      discardBtn.click();
      await element.updateComplete;
      // After discard, should have switched to the pending tab (steering) and status reset
      expect((element as any)._sm.status.kind).toBe('idle');
      expect((element as any)._sm.activeTab).toBe('steering');
    });
  });

  // ─── Tank Edit Form Input Handlers (lines 2993–3029) ──────────────────────

  describe('Tank Edit Form Inputs', () => {
    beforeEach(async () => {
      await switchToTab(3); // Tanks tab
      // Open tank edit form
      (element as any)._openTankEdit(0);
      await element.updateComplete;
    });

    it('updates sensorEntity on input (line 2993)', async () => {
      const inputs = Array.from(element.shadowRoot?.querySelectorAll('input') ?? []);
      const sensorInput = inputs.find(i => i.getAttribute('placeholder') === 'Search entity...') as HTMLInputElement;
      expect(sensorInput).toBeTruthy();

      Object.defineProperty(sensorInput, 'value', { value: 'sensor.new_entity', writable: true });
      sensorInput.dispatchEvent(new Event('input'));
      await element.updateComplete;

      expect((element as any)._tankDraft.sensorEntity).toBe('sensor.new_entity');
    });

    it('updates name on input (line 3011)', async () => {
      const inputs = Array.from(element.shadowRoot?.querySelectorAll('input') ?? []);
      const nameInput = inputs.find(i => i.getAttribute('placeholder') === 'e.g. Main Tank') as HTMLInputElement;
      expect(nameInput).toBeTruthy();

      Object.defineProperty(nameInput, 'value', { value: 'Nutrient Tank B', writable: true });
      nameInput.dispatchEvent(new Event('input'));
      await element.updateComplete;

      expect((element as any)._tankDraft.name).toBe('Nutrient Tank B');
    });

    it('updates volumeLiters with valid number on input (line 3029)', async () => {
      const inputs = Array.from(element.shadowRoot?.querySelectorAll('input') ?? []);
      const volInput = inputs.find(i => i.getAttribute('placeholder') === 'e.g. 200') as HTMLInputElement;
      expect(volInput).toBeTruthy();

      Object.defineProperty(volInput, 'value', { value: '350', writable: true });
      volInput.dispatchEvent(new Event('input'));
      await element.updateComplete;

      expect((element as any)._tankDraft.volumeLiters).toBe(350);
    });

    it('sets volumeLiters to null when input is empty/NaN (line 3031)', async () => {
      const inputs = Array.from(element.shadowRoot?.querySelectorAll('input') ?? []);
      const volInput = inputs.find(i => i.getAttribute('placeholder') === 'e.g. 200') as HTMLInputElement;
      expect(volInput).toBeTruthy();

      Object.defineProperty(volInput, 'value', { value: '', writable: true });
      volInput.dispatchEvent(new Event('input'));
      await element.updateComplete;

      expect((element as any)._tankDraft.volumeLiters).toBeNull();
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
          drainTimes: [{ time: '09:00', duration: 45 }, { time: '15:00', duration: 45 }],
          drainDuration: 45,
        },
      } as any;
      await switchToTab(4); // Water Analytics tab
    });

    it('renders crop steering shots list with "edit in Steering" link (line 3508)', () => {
      const text = element.shadowRoot?.textContent ?? '';
      expect(text).toContain('shots/day');
      expect(text).toContain('edit in Steering');
    });

    it('clicking "edit in Steering" link switches to steering tab (line 3509)', async () => {
      const links = Array.from(element.shadowRoot?.querySelectorAll('a') ?? []);
      const steeringLink = links.find(l => l.textContent?.includes('edit in Steering'));
      expect(steeringLink).toBeTruthy();
      steeringLink!.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true, cancelable: true }));
      await element.updateComplete;
      expect((element as any)._sm.activeTab).toBe('steering');
    });

    it('renders drain events section with count and times when totalDrain > 0 (lines 3537–3557)', () => {
      const text = element.shadowRoot?.textContent ?? '';
      expect(text).toContain('events/day');
      expect(text).toContain('09:00');
    });
  });

  // ─── EC Ramp Tab – List View with Curves (lines 4269–4298) ────────────────

  describe('EC Ramp Tab – List View', () => {
    let ecRampAtom: ReturnType<typeof atom<Record<string, ECRampCurve>>>;

    const sampleCurve: ECRampCurve = {
      id: 'curve-1',
      name: 'Veg Ramp',
      stage: 'veg',
      points: [
        { day: 1, target_ec: 1.0 },
        { day: 14, target_ec: 1.8 },
      ],
    };

    beforeEach(async () => {
      ecRampAtom = atom({ 'curve-1': sampleCurve });
      mockStore = makeMockStore(mockDevice, ecRampAtom);
      (element as any).store = mockStore;
      await switchToTab(7); // EC Ramp tab (index 7)
      // The controller is created; manually force the controller to use the atom's value
      if (!(element as any)._ecRampCurvesController) {
        (element as any)._ecRampCurvesController = { value: { 'curve-1': sampleCurve } };
      }
      await element.updateComplete;
    });

    it('renders curve list when curves are present (line 4269)', () => {
      const text = element.shadowRoot?.textContent ?? '';
      expect(text).toContain('Veg Ramp');
      expect(text).toContain('2 point');
    });

    it('shows singular "point" label when curve has exactly 1 point (line 4277)', async () => {
      (element as any)._ecRampCurvesController = {
        value: {
          'curve-single': { id: 'curve-single', name: 'Single Point', stage: 'veg', points: [{ day: 1, target_ec: 1.0 }] },
        },
      };
      element.requestUpdate();
      await element.updateComplete;
      const text = element.shadowRoot?.textContent ?? '';
      // "1 point" without trailing "s" (the plural branch is "points")
      expect(text).toContain('1 point');
      expect(text).not.toMatch(/1 points/);
    });

    it('clicking a curve item opens edit form (line 4273)', async () => {
      const curveItem = element.shadowRoot?.querySelector('.curve-item') as HTMLElement;
      expect(curveItem).toBeTruthy();
      curveItem.click();
      await element.updateComplete;
      expect((element as any)._ecRampView).toBe('EDIT');
      expect((element as any)._ecRampEditingCurve?.name).toBe('Veg Ramp');
    });

    it('clicking edit button opens edit form and stops propagation (lines 4287–4289)', async () => {
      (element as any)._ecRampEditCurve = vi.fn();
      const editBtn = element.shadowRoot?.querySelector('.curve-item .curve-actions button[title="Edit"]') as HTMLElement;
      expect(editBtn).toBeTruthy();
      const clickEvent = new MouseEvent('click', { bubbles: true, composed: true });
      const stopSpy = vi.spyOn(clickEvent, 'stopPropagation');
      editBtn.dispatchEvent(clickEvent);
      await element.updateComplete;
      expect(stopSpy).toHaveBeenCalled();
    });

    it('clicking delete button calls _ecRampDeleteCurve with curve id (line 4298)', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      const deleteBtn = element.shadowRoot?.querySelector('.curve-item .curve-actions button[title="Delete"]') as HTMLElement;
      expect(deleteBtn).toBeTruthy();
      deleteBtn.click();
      await new Promise(r => setTimeout(r, 10));
      expect(mockStore.actions.library.removeECRampCurve).toHaveBeenCalledWith('curve-1');
    });

    it('does not delete when user cancels confirm dialog (line 4433)', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(false);
      const deleteBtn = element.shadowRoot?.querySelector('.curve-item .curve-actions button[title="Delete"]') as HTMLElement;
      expect(deleteBtn).toBeTruthy();
      deleteBtn.click();
      await new Promise(r => setTimeout(r, 10));
      expect(mockStore.actions.library.removeECRampCurve).not.toHaveBeenCalled();
    });

    it('sets _ecRampError when delete fails (line 4437)', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      mockStore.actions.library.removeECRampCurve.mockRejectedValueOnce(new Error('Delete failed'));
      const deleteBtn = element.shadowRoot?.querySelector('.curve-item .curve-actions button[title="Delete"]') as HTMLElement;
      deleteBtn.click();
      await new Promise(r => setTimeout(r, 20));
      await element.updateComplete;
      expect((element as any)._ecRampError).toBe('Delete failed');
    });
  });

  // ─── EC Ramp Private Methods (lines 4322, 4333–4491) ──────────────────────

  describe('EC Ramp – _ecRampStartNew', () => {
    it('initializes a new empty curve and switches to EDIT view', async () => {
      await switchToTab(7);
      (element as any)._ecRampStartNew();
      await element.updateComplete;
      expect((element as any)._ecRampView).toBe('EDIT');
      const curve = (element as any)._ecRampEditingCurve;
      expect(curve.name).toBe('');
      expect(curve.stage).toBe('flower');
      expect(curve.points).toEqual([{ day: 1, target_ec: 1.0 }]);
    });
  });

  describe('EC Ramp – Edit Form Rendering and Interactions (lines 4322–4413)', () => {
    const editingCurve: ECRampCurve = {
      id: 'curve-2',
      name: 'Bloom Ramp',
      stage: 'flower',
      points: [
        { day: 1, target_ec: 1.2 },
        { day: 21, target_ec: 2.0 },
      ],
    };

    beforeEach(async () => {
      await switchToTab(7);
      (element as any)._ecRampEditingCurve = { ...editingCurve, points: [...editingCurve.points] };
      (element as any)._ecRampView = 'EDIT';
      await element.updateComplete;
    });

    it('renders edit form with curve details (line 4322)', () => {
      const text = element.shadowRoot?.textContent ?? '';
      expect(text).toContain('Ramp Points');
      expect(text).toContain('Curve Info');
    });

    it('updates curve name on @change event (line 4333)', async () => {
      const nameInput = element.shadowRoot?.querySelector('md3-text-input[label="Curve Name"]') as any;
      expect(nameInput).toBeTruthy();
      nameInput.dispatchEvent(new CustomEvent('change', { detail: 'New Name' }));
      await element.updateComplete;
      expect((element as any)._ecRampEditingCurve.name).toBe('New Name');
    });

    it('updates stage on @change event (line 4347)', async () => {
      const stageSelect = element.shadowRoot?.querySelector('md3-select[label="Growth Stage"]') as any;
      expect(stageSelect).toBeTruthy();
      stageSelect.dispatchEvent(new CustomEvent('change', { detail: 'veg' }));
      await element.updateComplete;
      expect((element as any)._ecRampEditingCurve.stage).toBe('veg');
    });

    it('adds a new point when Add Point is clicked (line 4355)', async () => {
      const addBtn = Array.from(element.shadowRoot?.querySelectorAll('button') ?? []).find(
        b => b.textContent?.includes('Add Point')
      ) as HTMLElement;
      expect(addBtn).toBeTruthy();
      addBtn.click();
      await element.updateComplete;
      expect((element as any)._ecRampEditingCurve.points).toHaveLength(3);
      // New point should be day 21 + 7 = 28
      expect((element as any)._ecRampEditingCurve.points[2].day).toBe(28);
    });

    it('updates point day on @change event (line 4368)', async () => {
      const dayInputs = element.shadowRoot?.querySelectorAll('md3-number-input[label="Day"]') as any;
      expect(dayInputs?.length).toBeGreaterThan(0);
      dayInputs[0].dispatchEvent(new CustomEvent('change', { detail: '5' }));
      await element.updateComplete;
      expect((element as any)._ecRampEditingCurve.points[0].day).toBe(5);
    });

    it('updates point target_ec on @change event (line 4375)', async () => {
      const ecInputs = element.shadowRoot?.querySelectorAll('md3-number-input[label="Target EC (mS/cm)"]') as any;
      expect(ecInputs?.length).toBeGreaterThan(0);
      ecInputs[0].dispatchEvent(new CustomEvent('change', { detail: '1.8' }));
      await element.updateComplete;
      expect((element as any)._ecRampEditingCurve.points[0].target_ec).toBe(1.8);
    });

    it('removes a point when delete button is clicked (line 4383)', async () => {
      const deleteButtons = Array.from(element.shadowRoot?.querySelectorAll('.point-row button') ?? []);
      expect(deleteButtons.length).toBeGreaterThan(0);
      (deleteButtons[0] as HTMLElement).click();
      await element.updateComplete;
      expect((element as any)._ecRampEditingCurve.points).toHaveLength(1);
    });

    it('disables remove button when only one point remains (?disabled branch)', async () => {
      (element as any)._ecRampEditingCurve = {
        id: 'c1',
        name: 'Solo',
        stage: 'veg',
        points: [{ day: 1, target_ec: 1.0 }], // only 1 point
      };
      (element as any)._ecRampView = 'EDIT';
      await element.updateComplete;
      const deleteButtons = Array.from(element.shadowRoot?.querySelectorAll('.point-row button') ?? []);
      expect(deleteButtons.length).toBeGreaterThan(0);
      expect((deleteButtons[0] as HTMLButtonElement).disabled).toBe(true);
    });

    it('returns to LIST view when Back button is clicked (line 4400)', async () => {
      const backBtn = Array.from(element.shadowRoot?.querySelectorAll('button') ?? []).find(
        b => b.textContent?.includes('Back')
      ) as HTMLElement;
      expect(backBtn).toBeTruthy();
      backBtn.click();
      await element.updateComplete;
      expect((element as any)._ecRampView).toBe('LIST');
      expect((element as any)._ecRampEditingCurve).toBeNull();
      expect((element as any)._ecRampError).toBeNull();
    });
  });

  // ─── _ecRampSaveCurve (lines 4469–4492) ───────────────────────────────────

  describe('_ecRampSaveCurve', () => {
    beforeEach(async () => {
      await switchToTab(7);
    });

    it('sets error when curve name is empty (line 4472)', async () => {
      (element as any)._ecRampEditingCurve = { name: '', stage: 'flower', points: [{ day: 1, target_ec: 1.0 }] };
      await (element as any)._ecRampSaveCurve();
      expect((element as any)._ecRampError).toBe('Curve name is required');
    });

    it('sets error when no valid EC points exist (line 4477)', async () => {
      (element as any)._ecRampEditingCurve = {
        name: 'Valid Name',
        stage: 'flower',
        points: [{ day: -1, target_ec: 0 }], // invalid point (day < 0 or target_ec <= 0)
      };
      await (element as any)._ecRampSaveCurve();
      expect((element as any)._ecRampError).toBe('At least one valid EC point is required');
    });

    it('saves curve successfully and returns to list view (line 4481)', async () => {
      (element as any)._ecRampEditingCurve = {
        name: 'Test Curve',
        stage: 'flower',
        points: [{ day: 1, target_ec: 1.5 }, { day: 14, target_ec: 2.0 }],
      };
      (element as any)._ecRampView = 'EDIT';
      await (element as any)._ecRampSaveCurve();
      await element.updateComplete;
      expect(mockStore.actions.library.saveECRampCurve).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Test Curve',
          stage: 'flower',
          points: expect.arrayContaining([{ day: 1, target_ec: 1.5 }]),
        })
      );
      expect((element as any)._ecRampView).toBe('LIST');
      expect((element as any)._ecRampEditingCurve).toBeNull();
      expect((element as any)._ecRampError).toBeNull();
    });

    it('sets _ecRampError when save fails (line 4491)', async () => {
      mockStore.actions.library.saveECRampCurve.mockRejectedValueOnce(new Error('Save error'));
      (element as any)._ecRampEditingCurve = {
        name: 'Test Curve',
        stage: 'flower',
        points: [{ day: 1, target_ec: 1.5 }],
      };
      await (element as any)._ecRampSaveCurve();
      await element.updateComplete;
      expect((element as any)._ecRampError).toBe('Save error');
    });
  });

  // ─── _ecRampAddPoint with empty points array (line 4445–4450) ─────────────

  describe('_ecRampAddPoint edge cases', () => {
    it('adds first point with default values when points array is empty', async () => {
      await switchToTab(7);
      (element as any)._ecRampEditingCurve = { name: 'Ramp', stage: 'flower', points: [] };
      (element as any)._ecRampAddPoint();
      expect((element as any)._ecRampEditingCurve.points).toHaveLength(1);
      expect((element as any)._ecRampEditingCurve.points[0]).toEqual({ day: 7, target_ec: 1.2 });
    });

    it('does nothing when _ecRampEditingCurve is null', async () => {
      await switchToTab(7);
      (element as any)._ecRampEditingCurve = null;
      (element as any)._ecRampAddPoint(); // should not throw
      expect((element as any)._ecRampEditingCurve).toBeNull();
    });
  });

  // ─── _ecRampRemovePoint and _ecRampUpdatePoint guards ─────────────────────

  describe('_ecRampRemovePoint and _ecRampUpdatePoint guards', () => {
    it('_ecRampRemovePoint does nothing when curve is null', async () => {
      (element as any)._ecRampEditingCurve = null;
      (element as any)._ecRampRemovePoint(0); // should not throw
    });

    it('_ecRampUpdatePoint does nothing when curve is null', async () => {
      (element as any)._ecRampEditingCurve = null;
      (element as any)._ecRampUpdatePoint(0, { day: 5 }); // should not throw
    });

    it('_ecRampUpdatePoint merges partial updates into point', async () => {
      (element as any)._ecRampEditingCurve = {
        name: 'X',
        stage: 'veg',
        points: [{ day: 1, target_ec: 1.0 }],
      };
      (element as any)._ecRampUpdatePoint(0, { day: 7 });
      expect((element as any)._ecRampEditingCurve.points[0]).toEqual({ day: 7, target_ec: 1.0 });
    });
  });

  // ─── _ecRampSaveCurve branch coverage ─────────────────────────────────────

  describe('_ecRampSaveCurve – branch coverage', () => {
    beforeEach(async () => {
      await switchToTab(7);
    });

    it('uses fallback empty array when curve.points is undefined (line 4475)', async () => {
      (element as any)._ecRampEditingCurve = { name: 'Ramp', stage: 'flower', points: undefined };
      await (element as any)._ecRampSaveCurve();
      // No valid points after filter → error
      expect((element as any)._ecRampError).toBe('At least one valid EC point is required');
    });

    it('uses "flower" fallback when curve.stage is undefined (line 4484)', async () => {
      (element as any)._ecRampEditingCurve = {
        name: 'Stageless Curve',
        stage: undefined,
        points: [{ day: 1, target_ec: 1.5 }],
      };
      await (element as any)._ecRampSaveCurve();
      expect(mockStore.actions.library.saveECRampCurve).toHaveBeenCalledWith(
        expect.objectContaining({ stage: 'flower' })
      );
    });

    it('sets generic error message when thrown error is not an Error instance (line 4491)', async () => {
      mockStore.actions.library.saveECRampCurve.mockRejectedValueOnce('plain string error');
      (element as any)._ecRampEditingCurve = {
        name: 'Test',
        stage: 'veg',
        points: [{ day: 1, target_ec: 1.0 }],
      };
      await (element as any)._ecRampSaveCurve();
      expect((element as any)._ecRampError).toBe('Unknown error');
    });
  });

  // ─── _ecRampDeleteCurve – non-Error exception branch ──────────────────────

  describe('_ecRampDeleteCurve – non-Error exception', () => {
    it('sets generic error when delete throws a non-Error value', async () => {
      await switchToTab(7);
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      mockStore.actions.library.removeECRampCurve.mockRejectedValueOnce('string error');
      await (element as any)._ecRampDeleteCurve('some-id');
      expect((element as any)._ecRampError).toBe('Unknown error');
    });
  });

  // ─── _ecRampAddPoint – undefined points fallback ──────────────────────────

  describe('_ecRampAddPoint – undefined points fallback', () => {
    it('uses empty array fallback when curve.points is undefined', async () => {
      (element as any)._ecRampEditingCurve = { name: 'Ramp', stage: 'flower' }; // no points property
      (element as any)._ecRampAddPoint();
      expect((element as any)._ecRampEditingCurve.points).toHaveLength(1);
      expect((element as any)._ecRampEditingCurve.points[0]).toEqual({ day: 7, target_ec: 1.2 });
    });
  });

  // ─── _ecRampRemovePoint – undefined points fallback ──────────────────────

  describe('_ecRampRemovePoint – undefined points fallback', () => {
    it('uses empty array fallback when curve.points is undefined', async () => {
      (element as any)._ecRampEditingCurve = { name: 'Ramp', stage: 'flower' }; // no points
      (element as any)._ecRampRemovePoint(0); // splice on empty — no throw
      expect((element as any)._ecRampEditingCurve.points).toHaveLength(0);
    });
  });

  // ─── _ecRampUpdatePoint – undefined points fallback ──────────────────────

  describe('_ecRampUpdatePoint – undefined points fallback', () => {
    it('uses empty array fallback when curve.points is undefined', async () => {
      (element as any)._ecRampEditingCurve = { name: 'Ramp', stage: 'flower' }; // no points
      // index 0 on empty array just sets undefined, should not throw
      (element as any)._ecRampUpdatePoint(0, { day: 5 });
      expect((element as any)._ecRampEditingCurve.points).toHaveLength(1);
    });
  });
});
