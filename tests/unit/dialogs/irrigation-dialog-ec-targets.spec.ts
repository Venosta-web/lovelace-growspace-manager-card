/**
 * Substrate & EC tab — feed-EC ranges (decomposed into <irrigation-substrate-ec-tab>, ADR-0019).
 *
 * The per-stage feed-EC table renders in the decomposed child whose VM reads the
 * SM draft; edits flow as `substrate-ec-targets-changed` intents the Dialog Shell
 * translates into `UPDATE_EC_TARGETS_DRAFT`. (Detailed rendering/intent behavior
 * is covered by the VM + component specs; this is the dialog→child→SM integration.)
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { LitElement } from 'lit';
import { IrrigationDialog } from '../../../src/dialogs/irrigation-dialog';
import { GrowspaceDevice } from '../../../src/types';
import { GrowspaceType } from '../../../src/constants';
import { irrigationConfigs$ } from '../../../src/slices/irrigation';

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

// The Substrate & EC tab's immediate-persist path calls the Irrigation slice's
// `updateIrrigationStrategy` mutator (ADR-0017). Spy on the slice mutators while
// keeping the real atoms (`irrigationConfigs$`) the dialog subscribes to.
const sliceMocks = vi.hoisted(() => ({
  updateIrrigationStrategy: vi.fn().mockResolvedValue(undefined),
  getIrrigationAnalytics: vi.fn().mockResolvedValue(null),
}));
vi.mock('../../../src/slices/irrigation', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/slices/irrigation')>();
  return {
    ...actual,
    updateIrrigationStrategy: sliceMocks.updateIrrigationStrategy,
    getIrrigationAnalytics: sliceMocks.getIrrigationAnalytics,
  };
});

function makeMockStore(device: GrowspaceDevice) {
  const $devicesValue = [JSON.parse(JSON.stringify(device))];
  return {
    context: {
      data: { $devices: { get: () => $devicesValue }, patchDeviceIrrigationConfig: vi.fn() },
      showToast: vi.fn(), closeDialog: vi.fn(), refreshData: vi.fn().mockResolvedValue(undefined),
      ui: { showToast: vi.fn() }, history: {}, grid: {}, hass: {}, syncService: {},
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
  // poreEcSensors → substrate_ec tab is visible; feedEcSensors for completeness.
  environmentAttributes: { feedEcSensors: ['sensor.feed_ec'], poreEcSensors: ['sensor.pore_ec'] } as any,
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
  irrigationStrategy: { enabled: true } as any,
};

describe('IrrigationDialog – Substrate & EC tab: feed-EC ranges', () => {
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
    irrigationConfigs$.set(new Map());
    vi.restoreAllMocks();
  });

  async function openOnSubstrateTab() {
    element.open = true;
    (element as any)._sm = { ...(element as any)._sm, activeTab: 'substrate_ec' };
    document.body.appendChild(element);
    await element.updateComplete;
    const tab = element.shadowRoot!.querySelector('irrigation-substrate-ec-tab') as LitElement & {
      shadowRoot: ShadowRoot;
    };
    await tab.updateComplete;
    return tab;
  }

  it('renders five stage rows in the child: Seedling … Late Flower / Flush', async () => {
    const tab = await openOnSubstrateTab();
    const rows = tab.shadowRoot.querySelectorAll('.ec-target-row');
    expect(rows.length).toBe(5);
    const labels = Array.from(rows).map((r) => r.querySelector('.ec-stage-label')?.textContent?.trim());
    expect(labels).toEqual(['Seedling', 'Veg', 'Early Flower', 'Mid Flower', 'Late Flower / Flush']);
  });

  it('loads ecTargetRanges from device config into the child inputs', async () => {
    element.device = {
      ...JSON.parse(JSON.stringify(baseDevice)),
      irrigationConfig: {
        ...baseDevice.irrigationConfig,
        ecTargetRanges: [
          { stage: 'seedling', minEc: 0.8, maxEc: 1.2 },
          { stage: 'veg', minEc: 1.5, maxEc: 2.0 },
          { stage: 'flower_early', minEc: 2.0, maxEc: 2.8 },
          { stage: 'flower_mid', minEc: 2.2, maxEc: 3.0 },
          { stage: 'flower_late', minEc: 0.2, maxEc: 0.5 },
        ],
      },
    };
    (element as any).store = makeMockStore(element.device!);
    const tab = await openOnSubstrateTab();

    const rows = tab.shadowRoot.querySelectorAll('.ec-target-row');
    const inputs = (row: Element) => Array.from(row.querySelectorAll('input[type="number"]')) as HTMLInputElement[];
    expect(inputs(rows[0])[0].value).toBe('0.8');
    expect(inputs(rows[0])[1].value).toBe('1.2');
    expect(inputs(rows[1])[0].value).toBe('1.5');
    expect(inputs(rows[4])[1].value).toBe('0.5');
  });

  it('updates the SM draft when a min EC input changes (buffered, ADR-0017)', async () => {
    const tab = await openOnSubstrateTab();
    const firstMin = tab.shadowRoot.querySelector('.ec-target-row input[type="number"]') as HTMLInputElement;
    firstMin.value = '1.1';
    firstMin.dispatchEvent(new Event('input', { bubbles: true }));
    await element.updateComplete;
    expect((element as any)._sm.tabs.substrate_ec.draft.ecTargetRanges[0].minEc).toBe(1.1);
  });

  it('updates the SM draft when a max EC input changes', async () => {
    const tab = await openOnSubstrateTab();
    const firstMax = tab.shadowRoot.querySelectorAll('.ec-target-row input[type="number"]')[1] as HTMLInputElement;
    firstMax.value = '2.5';
    firstMax.dispatchEvent(new Event('input', { bubbles: true }));
    await element.updateComplete;
    expect((element as any)._sm.tabs.substrate_ec.draft.ecTargetRanges[0].maxEc).toBe(2.5);
  });

  it('persists sizing mode immediately (not buffered) — separate write path (ADR-0017)', async () => {
    element.device = {
      ...JSON.parse(JSON.stringify(baseDevice)),
      volumeModeCapable: true,
      irrigationStrategy: { enabled: true, shotSizingMode: 'seconds' },
    } as any;
    (element as any).store = makeMockStore(element.device!);
    const tab = await openOnSubstrateTab();

    const volumeBtn = tab.shadowRoot.querySelector('button[data-sizing-mode="volume"]') as HTMLButtonElement;
    volumeBtn.click();
    await element.updateComplete;

    expect(sliceMocks.updateIrrigationStrategy).toHaveBeenCalledWith('gs1', { shotSizingMode: 'volume' });
    // and it does NOT land in the buffered draft
    expect((element as any)._sm.tabs.substrate_ec.draft).not.toHaveProperty('shotSizingMode');
  });
});
