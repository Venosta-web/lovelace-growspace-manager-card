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
  setIrrigationStrategy: vi.fn().mockResolvedValue(undefined),
  configureDrainMonitoring: vi.fn().mockResolvedValue(undefined),
  setEcTargetRanges: vi.fn().mockResolvedValue(undefined),
  getIrrigationAnalytics: vi.fn().mockResolvedValue(null),
  addIrrigationTime: vi.fn().mockResolvedValue(undefined),
  removeIrrigationTime: vi.fn().mockResolvedValue(undefined),
  addDrainTime: vi.fn().mockResolvedValue(undefined),
  removeDrainTime: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../../src/services/data-service', () => ({
  DataService: class {
    constructor() { return mocks; }
  }
}));

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

const baseDevice: GrowspaceDevice = {
  deviceId: 'gs1',
  name: 'Growspace 1',
  type: GrowspaceType.NORMAL,
  rows: 4,
  plantsPerRow: 4,
  plants: [],
  grid: {},
  biologicalMetrics: {} as any,
  environmentAttributes: { feedEcSensors: ['sensor.feed_ec'] } as any,
  stats: {} as any,
  waterUsage: { litersToday: 0 } as any,
  drainConfig: null as any,
  irrigationConfig: {
    irrigationPumpEntity: '',
    drainPumpEntity: '',
    irrigationDuration: 60,
    drainDuration: 60,
    irrigationTimes: [],
    drainTimes: [],
  },
  irrigationStrategy: undefined as any,
};

describe('IrrigationDialog – EC Targets tab', () => {
  let element: IrrigationDialog;

  beforeEach(() => {
    vi.clearAllMocks();
    element = new IrrigationDialog();
    element.device = JSON.parse(JSON.stringify(baseDevice));
    (element as any).store = makeMockStore(baseDevice);
    element.hass = {} as any;
  });

  afterEach(() => {
    if (element.isConnected) document.body.removeChild(element);
    vi.restoreAllMocks();
  });

  async function openOnEcTargetsTab() {
    element.open = true;
    (element as any)._sm = { ...(element as any)._sm, activeTab: 'ec_targets' };
    document.body.appendChild(element);
    await element.updateComplete;
  }

  // ── Tracer bullet ─────────────────────────────────────────────────────────

  it('renders five stage rows: Seedling, Veg, Early Flower, Mid Flower, Late Flower / Flush', async () => {
    await openOnEcTargetsTab();

    const rows = element.shadowRoot!.querySelectorAll('.ec-target-row');
    expect(rows.length).toBe(5);

    const labels = Array.from(rows).map((r) => r.querySelector('.ec-stage-label')?.textContent?.trim());
    expect(labels).toEqual(['Seedling', 'Veg', 'Early Flower', 'Mid Flower', 'Late Flower / Flush']);
  });

  // ── Payload loading ───────────────────────────────────────────────────────

  it('loads ecTargetRanges from device into inputs', async () => {
    element.device = {
      ...JSON.parse(JSON.stringify(baseDevice)),
      irrigationConfig: {
        ...baseDevice.irrigationConfig,
        ecTargetRanges: [
          { stage: 'seedling',     minEc: 0.8, maxEc: 1.2 },
          { stage: 'veg',          minEc: 1.5, maxEc: 2.0 },
          { stage: 'flower_early', minEc: 2.0, maxEc: 2.8 },
          { stage: 'flower_mid',   minEc: 2.2, maxEc: 3.0 },
          { stage: 'flower_late',  minEc: 0.2, maxEc: 0.5 },
        ],
      },
    };
    (element as any).store = makeMockStore(element.device!);
    await openOnEcTargetsTab();

    const rows = element.shadowRoot!.querySelectorAll('.ec-target-row');
    const getInputs = (row: Element) => Array.from(row.querySelectorAll('input[type="number"]')) as HTMLInputElement[];

    expect(getInputs(rows[0])[0].value).toBe('0.8');  // seedling min
    expect(getInputs(rows[0])[1].value).toBe('1.2');  // seedling max
    expect(getInputs(rows[1])[0].value).toBe('1.5');  // veg min
    expect(getInputs(rows[4])[1].value).toBe('0.5');  // flower_late max
  });

  // ── State mutation ─────────────────────────────────────────────────────────

  it('updates internal state when min EC input changes', async () => {
    await openOnEcTargetsTab();

    const firstRow = element.shadowRoot!.querySelector('.ec-target-row')!;
    const minInput = firstRow.querySelector('input[type="number"]') as HTMLInputElement;
    minInput.value = '1.1';
    minInput.dispatchEvent(new Event('input', { bubbles: true }));
    await element.updateComplete;

    const state = (element as any)._sm.tabs.ec_targets.draft as Array<{ stage: string; minEc: number; maxEc: number }>;
    expect(state[0].minEc).toBe(1.1);
  });

  it('updates internal state when max EC input changes', async () => {
    await openOnEcTargetsTab();

    const firstRow = element.shadowRoot!.querySelector('.ec-target-row')!;
    const maxInput = firstRow.querySelectorAll('input[type="number"]')[1] as HTMLInputElement;
    maxInput.value = '2.5';
    maxInput.dispatchEvent(new Event('input', { bubbles: true }));
    await element.updateComplete;

    const state = (element as any)._sm.tabs.ec_targets.draft as Array<{ stage: string; minEc: number; maxEc: number }>;
    expect(state[0].maxEc).toBe(2.5);
  });

  // ── Save operation ─────────────────────────────────────────────────────────

  it('calls setEcTargetRanges via dataService when _saveAll is called', async () => {
    element.device = {
      ...JSON.parse(JSON.stringify(baseDevice)),
      irrigationConfig: {
        ...baseDevice.irrigationConfig,
        ecTargetRanges: [
          { stage: 'seedling',     minEc: 0.8, maxEc: 1.2 },
          { stage: 'veg',          minEc: 1.5, maxEc: 2.0 },
          { stage: 'flower_early', minEc: 2.0, maxEc: 2.8 },
          { stage: 'flower_mid',   minEc: 2.2, maxEc: 3.0 },
          { stage: 'flower_late',  minEc: 0.2, maxEc: 0.5 },
        ],
      },
    };
    (element as any).store = makeMockStore(element.device!);
    await openOnEcTargetsTab();

    await (element as any)._saveAll();

    expect(mocks.setEcTargetRanges).toHaveBeenCalledWith('gs1', [
      { stage: 'seedling',     minEc: 0.8, maxEc: 1.2 },
      { stage: 'veg',          minEc: 1.5, maxEc: 2.0 },
      { stage: 'flower_early', minEc: 2.0, maxEc: 2.8 },
      { stage: 'flower_mid',   minEc: 2.2, maxEc: 3.0 },
      { stage: 'flower_late',  minEc: 0.2, maxEc: 0.5 },
    ]);
  });

  // ── Placeholder removed ────────────────────────────────────────────────────

  it('does not render "Coming soon" placeholder text', async () => {
    await openOnEcTargetsTab();

    const text = element.shadowRoot!.textContent ?? '';
    expect(text).not.toContain('Coming soon');
    expect(text).not.toContain('coming soon');
  });
});
