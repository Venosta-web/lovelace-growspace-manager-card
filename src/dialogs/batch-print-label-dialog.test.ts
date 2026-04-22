import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { fixture, html } from '@open-wc/testing-helpers';
import { GrowspaceStore } from '../store/core/growspace-store';
import { openBatchPrintLabelsDialog } from '../store/ui/ui-actions';
import { GrowspaceUIStore } from '../store/ui/ui-store';
import { BatchPrintLabelDialog } from './batch-print-label-dialog';
import './batch-print-label-dialog';

// ---------------------------------------------------------------------------
// openBatchPrintLabelsDialog action
// ---------------------------------------------------------------------------

describe('openBatchPrintLabelsDialog', () => {
  let ui: GrowspaceUIStore;
  let ctx: { ui: GrowspaceUIStore };

  beforeEach(() => {
    ui = new GrowspaceUIStore();
    ctx = { ui } as any;
  });

  it('opens BATCH_PRINT_LABELS dialog with selected plant IDs', () => {
    ui.$selectedPlants.set(new Set(['plant-1', 'plant-2', 'plant-3']));

    openBatchPrintLabelsDialog(ctx as any);

    const active = ui.$activeDialog.get();
    expect(active.type).toBe('BATCH_PRINT_LABELS');
    if (active.type === 'BATCH_PRINT_LABELS') {
      expect(active.payload.plantIds).toHaveLength(3);
      expect(active.payload.plantIds).toContain('plant-1');
      expect(active.payload.plantIds).toContain('plant-2');
      expect(active.payload.plantIds).toContain('plant-3');
    }
  });

  it('does nothing when no plants are selected', () => {
    ui.$selectedPlants.set(new Set());

    openBatchPrintLabelsDialog(ctx as any);

    expect(ui.$activeDialog.get().type).toBe('NONE');
  });

  it('opens dialog with a single selected plant', () => {
    ui.$selectedPlants.set(new Set(['solo-plant']));

    openBatchPrintLabelsDialog(ctx as any);

    const active = ui.$activeDialog.get();
    expect(active.type).toBe('BATCH_PRINT_LABELS');
    if (active.type === 'BATCH_PRINT_LABELS') {
      expect(active.payload.plantIds).toEqual(['solo-plant']);
    }
  });
});

// ---------------------------------------------------------------------------
// GrowspaceStore.openBatchPrintLabelsDialog
// ---------------------------------------------------------------------------

describe('GrowspaceStore.openBatchPrintLabelsDialog', () => {
  let store: GrowspaceStore;

  beforeEach(() => {
    store = new GrowspaceStore();
  });

  it('opens BATCH_PRINT_LABELS dialog via store method', () => {
    store.ui.$selectedPlants.set(new Set(['p1', 'p2']));

    store.openBatchPrintLabelsDialog();

    const active = store.ui.$activeDialog.get();
    expect(active.type).toBe('BATCH_PRINT_LABELS');
    if (active.type === 'BATCH_PRINT_LABELS') {
      expect(active.payload.plantIds).toContain('p1');
      expect(active.payload.plantIds).toContain('p2');
    }
  });

  it('does not open dialog when no plants are selected', () => {
    store.openBatchPrintLabelsDialog();

    expect(store.ui.$activeDialog.get().type).toBe('NONE');
  });

  it('dialog payload contains all selected plants', () => {
    const ids = ['alpha', 'beta', 'gamma', 'delta'];
    store.ui.$selectedPlants.set(new Set(ids));

    store.openBatchPrintLabelsDialog();

    const active = store.ui.$activeDialog.get();
    if (active.type === 'BATCH_PRINT_LABELS') {
      expect(active.payload.plantIds).toHaveLength(ids.length);
      for (const id of ids) {
        expect(active.payload.plantIds).toContain(id);
      }
    }
  });

  it('reflects dialogHostState after opening', () => {
    store.ui.$selectedPlants.set(new Set(['p1']));

    store.openBatchPrintLabelsDialog();

    expect(store.$dialogHostState.get().activeDialog.type).toBe('BATCH_PRINT_LABELS');
  });
});

// ---------------------------------------------------------------------------
// BatchPrintLabelDialog component
// ---------------------------------------------------------------------------

const mockTags = ['ha-dialog', 'ha-svg-icon', 'md3-select'];
for (const tag of mockTags) {
  if (!customElements.get(tag)) {
    customElements.define(tag, class extends HTMLElement {});
  }
}

function makeMockStore(overrides: Record<string, unknown> = {}) {
  return {
    printLabel: vi.fn().mockResolvedValue(undefined),
    actions: {
      ui: {
        toast: vi.fn(),
      },
    },
    ...overrides,
  };
}

function makeHass(extraStates: Record<string, unknown> = {}) {
  return {
    states: {
      'image.printer_a_last_label_made': {
        attributes: { friendly_name: 'Printer A Last Label Made' },
      },
      'image.printer_b_last_label_made': {
        attributes: { friendly_name: 'Printer B Last Label Made' },
      },
      'sensor.temperature': { attributes: {} },
      ...extraStates,
    },
  };
}

function createElement(mockStore = makeMockStore(), hass = makeHass()) {
  const el = document.createElement('batch-print-label-dialog') as BatchPrintLabelDialog;
  (el as any).store = mockStore;
  (el as any).hass = hass;
  return el;
}

describe('BatchPrintLabelDialog – _getPrinters', () => {
  afterEach(() => vi.restoreAllMocks());

  it('returns only image entities containing _last_label_made', () => {
    const el = createElement();
    const printers = (el as any)._getPrinters();
    expect(printers).toHaveLength(2);
    expect(printers.every((p: { value: string }) => p.value.startsWith('image.'))).toBe(true);
    expect(printers.every((p: { value: string }) => p.value.includes('_last_label_made'))).toBe(true);
  });

  it('strips " Last Label Made" suffix from friendly name', () => {
    const el = createElement();
    const printers = (el as any)._getPrinters();
    const labels = printers.map((p: { label: string }) => p.label);
    expect(labels).toContain('Printer A');
    expect(labels).toContain('Printer B');
  });

  it('returns empty array when hass is not set', () => {
    const el = document.createElement('batch-print-label-dialog') as BatchPrintLabelDialog;
    (el as any).hass = null;
    expect((el as any)._getPrinters()).toEqual([]);
  });

  it('returns empty array when no matching entities exist', () => {
    const hass = { states: { 'sensor.temp': { attributes: {} } } } as any;
    const el = createElement(makeMockStore(), hass);
    expect((el as any)._getPrinters()).toEqual([]);
  });

  it('uses entity ID when friendly name is missing', () => {
    const hass = {
      states: {
        'image.no_name_last_label_made': { attributes: {} },
      },
    } as any;
    const el = createElement(makeMockStore(), hass);
    const printers = (el as any)._getPrinters();
    expect(printers[0].label).toBe('image.no_name_last_label_made');
  });
});

describe('BatchPrintLabelDialog – _resetForm', () => {
  afterEach(() => vi.restoreAllMocks());

  it('resets copies, isSubmitting and progress to defaults', () => {
    const el = createElement();
    (el as any)._copies = 5;
    (el as any)._isSubmitting = true;
    (el as any)._progress = 80;

    (el as any)._resetForm();

    expect((el as any)._copies).toBe(1);
    expect((el as any)._isSubmitting).toBe(false);
    expect((el as any)._progress).toBe(0);
  });

  it('auto-selects the first printer when none is selected', () => {
    const el = createElement();
    (el as any)._selectedDeviceId = '';

    (el as any)._resetForm();

    expect((el as any)._selectedDeviceId).toBe('image.printer_a_last_label_made');
  });

  it('keeps existing selected device when already set', () => {
    const el = createElement();
    (el as any)._selectedDeviceId = 'image.printer_b_last_label_made';

    (el as any)._resetForm();

    expect((el as any)._selectedDeviceId).toBe('image.printer_b_last_label_made');
  });
});

describe('BatchPrintLabelDialog – _close', () => {
  afterEach(() => vi.restoreAllMocks());

  it('dispatches a "close" CustomEvent', () => {
    const el = createElement();
    const events: Event[] = [];
    el.addEventListener('close', (e) => events.push(e));

    (el as any)._close();

    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('close');
  });
});

describe('BatchPrintLabelDialog – _submit', () => {
  afterEach(() => vi.restoreAllMocks());

  it('does nothing when store is missing', async () => {
    const el = createElement();
    (el as any).store = null;
    (el as any).dialogState = { plantIds: ['p1'] };

    await (el as any)._submit();

    // No throw, no state change
    expect((el as any)._isSubmitting).toBe(false);
  });

  it('does nothing when dialogState is missing', async () => {
    const el = createElement();
    (el as any).dialogState = undefined;

    await (el as any)._submit();

    expect((el as any)._isSubmitting).toBe(false);
  });

  it('does nothing when plantIds is empty', async () => {
    const mockStore = makeMockStore();
    const el = createElement(mockStore);
    (el as any).dialogState = { plantIds: [] };

    await (el as any)._submit();

    expect(mockStore.printLabel).not.toHaveBeenCalled();
  });

  it('performs warm-up call with preview:true before batch', async () => {
    const mockStore = makeMockStore();
    const el = createElement(mockStore);
    (el as any).dialogState = { plantIds: ['plant-1', 'plant-2'] };
    (el as any)._selectedDeviceId = 'image.printer_a_last_label_made';

    await (el as any)._submit();

    expect(mockStore.printLabel).toHaveBeenNthCalledWith(1, {
      plantId: 'plant-1',
      deviceId: 'image.printer_a_last_label_made',
      preview: true,
    });
  });

  it('continues batch even when warm-up fails', async () => {
    const mockStore = makeMockStore({
      printLabel: vi.fn()
        .mockRejectedValueOnce(new Error('warm-up error'))
        .mockResolvedValue(undefined),
    });
    const el = createElement(mockStore);
    (el as any).dialogState = { plantIds: ['plant-1'] };

    await (el as any)._submit();

    // warm-up + 1 batch call
    expect(mockStore.printLabel).toHaveBeenCalledTimes(2);
    expect(mockStore.actions.ui.toast).toHaveBeenCalledWith(expect.stringContaining('1 label'), 'success');
  });

  it('prints each plant for each copy', async () => {
    const mockStore = makeMockStore();
    const el = createElement(mockStore);
    (el as any).dialogState = { plantIds: ['p1', 'p2'] };
    (el as any)._copies = 3;

    await (el as any)._submit();

    // 1 warm-up + 3 copies × 2 plants = 7 total calls
    expect(mockStore.printLabel).toHaveBeenCalledTimes(7);
  });

  it('shows success toast when all prints succeed', async () => {
    const mockStore = makeMockStore();
    const el = createElement(mockStore);
    (el as any).dialogState = { plantIds: ['p1', 'p2'] };
    (el as any)._copies = 2;

    await (el as any)._submit();

    expect(mockStore.actions.ui.toast).toHaveBeenCalledWith('Printed 4 label(s) successfully', 'success');
  });

  it('shows error toast when some prints fail', async () => {
    let callCount = 0;
    const mockStore = makeMockStore({
      printLabel: vi.fn().mockImplementation(() => {
        callCount++;
        // warm-up succeeds, first batch print fails
        if (callCount === 2) return Promise.reject(new Error('print error'));
        return Promise.resolve(undefined);
      }),
    });
    const el = createElement(mockStore);
    (el as any).dialogState = { plantIds: ['p1', 'p2'] };

    await (el as any)._submit();

    expect(mockStore.actions.ui.toast).toHaveBeenCalledWith(expect.stringContaining('1 error'), 'error');
  });

  it('reaches 100% progress after all labels are printed', async () => {
    const mockStore = makeMockStore();
    const el = createElement(mockStore);
    (el as any).dialogState = { plantIds: ['p1', 'p2', 'p3'] };
    (el as any)._copies = 1;

    await (el as any)._submit();

    expect((el as any)._progress).toBe(100);
  });

  it('dispatches close event after submission completes', async () => {
    const mockStore = makeMockStore();
    const el = createElement(mockStore);
    (el as any).dialogState = { plantIds: ['p1'] };
    const events: Event[] = [];
    el.addEventListener('close', (e) => events.push(e));

    await (el as any)._submit();

    expect(events).toHaveLength(1);
  });

  it('passes undefined deviceId when no device is selected', async () => {
    const mockStore = makeMockStore();
    const el = createElement(mockStore);
    (el as any).dialogState = { plantIds: ['p1'] };
    (el as any)._selectedDeviceId = '';

    await (el as any)._submit();

    const batchCall = mockStore.printLabel.mock.calls[1];
    expect(batchCall[0].deviceId).toBeUndefined();
  });
});

describe('BatchPrintLabelDialog – willUpdate', () => {
  it('calls _resetForm when "open" changes to true', () => {
    const el = createElement();
    const resetFormSpy = vi.spyOn(el as any, '_resetForm');
    const changedProps = new Map([['open', false]]);
    el.open = true;
    (el as any).willUpdate(changedProps);
    expect(resetFormSpy).toHaveBeenCalled();
  });

  it('does nothing if open changed to false', () => {
    const el = createElement();
    const resetFormSpy = vi.spyOn(el as any, '_resetForm');
    const changedProps = new Map([['open', true]]);
    el.open = false;
    (el as any).willUpdate(changedProps);
    expect(resetFormSpy).not.toHaveBeenCalled();
  });
});

describe('BatchPrintLabelDialog – render', () => {
  it('renders nothing when closed', async () => {
    const el = await fixture<BatchPrintLabelDialog>(html`
      <batch-print-label-dialog .open=${false}></batch-print-label-dialog>
    `);
    expect(el.shadowRoot!.querySelector('ha-dialog')).toBeNull();
  });

  it('renders dialog when open', async () => {
    const el = await fixture<BatchPrintLabelDialog>(html`
      <batch-print-label-dialog .open=${true} .dialogState=${{ plantIds: ['p1'] }}></batch-print-label-dialog>
    `);
    expect(el.shadowRoot!.querySelector('ha-dialog')).not.toBeNull();
    expect(el.shadowRoot!.querySelector('.dialog-subtitle')?.textContent).toContain('1 plant(s) selected');
  });

  it('renders submission progress bar', async () => {
    const el = await fixture<BatchPrintLabelDialog>(html`
      <batch-print-label-dialog .open=${true}></batch-print-label-dialog>
    `);
    (el as any)._isSubmitting = true;
    (el as any)._progress = 45;
    await el.updateComplete;
    const bar = el.shadowRoot!.querySelector('.progress-bar') as HTMLElement;
    expect(bar).not.toBeNull();
    expect(bar.style.width).toBe('45%');
  });

  it('handles printer selection and copies input', async () => {
    const hass = makeHass();
    const el = await fixture<BatchPrintLabelDialog>(html`
      <batch-print-label-dialog .open=${true} .hass=${hass} .growspaceOptions=${{ 'gs-1': 'Tent 1' }}></batch-print-label-dialog>
    `);
    await el.updateComplete;

    const select = el.shadowRoot!.querySelector('md3-select') as any;
    select.dispatchEvent(new CustomEvent('change', { detail: 'image.printer_b_last_label_made' }));
    expect((el as any)._selectedDeviceId).toBe('image.printer_b_last_label_made');

    const input = el.shadowRoot!.querySelector('input.copies-input') as HTMLInputElement;
    input.value = '10';
    input.dispatchEvent(new Event('input'));
    expect((el as any)._copies).toBe(10);
  });

  it('shows warning when no printers discovered', async () => {
    const hass = { states: {} } as any;
    const el = await fixture<BatchPrintLabelDialog>(html`
      <batch-print-label-dialog .open=${true} .hass=${hass}></batch-print-label-dialog>
    `);
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('.form-section')?.textContent).toContain('No Niimbot printers discovered');
  });

  it('ignores invalid copies input', async () => {
    const el = await fixture<BatchPrintLabelDialog>(html`
      <batch-print-label-dialog .open=${true}></batch-print-label-dialog>
    `);
    await el.updateComplete;
    
    (el as any)._copies = 1;
    const input = el.shadowRoot!.querySelector('input.copies-input') as HTMLInputElement;
    
    input.value = 'abc';
    input.dispatchEvent(new Event('input'));
    expect((el as any)._copies).toBe(1);
    
    input.value = '0';
    input.dispatchEvent(new Event('input'));
    expect((el as any)._copies).toBe(1);
  });

  it('renders with undefined dialogState', async () => {
    const el = await fixture<BatchPrintLabelDialog>(html`
      <batch-print-label-dialog .open=${true} .dialogState=${undefined}></batch-print-label-dialog>
    `);
    expect(el.shadowRoot!.querySelector('.dialog-subtitle')?.textContent).toContain('0 plant(s) selected');
  });

  it('renders printing label text during submission', async () => {
    const el = await fixture<BatchPrintLabelDialog>(html`
      <batch-print-label-dialog .open=${true} .dialogState=${{ plantIds: ['p1'] }}></batch-print-label-dialog>
    `);
    (el as any)._isSubmitting = true;
    (el as any)._progress = 75;
    await el.updateComplete;

    const btn = el.shadowRoot!.querySelector('button.primary') as HTMLElement;
    expect(btn.textContent).toContain('Printing... 75%');
  });
});
