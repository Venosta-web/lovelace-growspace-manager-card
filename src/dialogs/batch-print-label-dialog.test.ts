import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { fixture, html } from '@open-wc/testing-helpers';
import { page } from 'vitest/browser';
import { GrowspaceSharedStore } from '../store/core/growspace-shared-store';
import { GrowspaceStore } from '../store/core/growspace-store';
import { BatchPrintLabelDialog } from './batch-print-label-dialog';
import './batch-print-label-dialog';
import { __resetUiSliceForTests, notification$ } from '../slices/ui';
import { printLabel } from '../slices/plant';
import { getPrinters } from '../features/shared/ui/printer-status-strip';
import { setDevices } from '../slices/grid';
import {
  buildQrTargetUrl,
  DEFAULT_LABEL_FIELDS,
  deriveLabelFieldValues,
} from './print-label-logic';

vi.mock('../slices/plant', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../slices/plant')>()),
  printLabel: vi.fn().mockResolvedValue(undefined),
}));

afterEach(() => {
  setDevices([]);
});

// ---------------------------------------------------------------------------
// GrowspaceStore.openBatchPrintLabelsDialog
// ---------------------------------------------------------------------------

describe('GrowspaceStore.openBatchPrintLabelsDialog', () => {
  let store: GrowspaceStore;

  beforeEach(() => {
    __resetUiSliceForTests();
    store = new GrowspaceStore(new GrowspaceSharedStore());
  });

  it('opens BATCH_PRINT_LABELS dialog via store method', () => {
    store.ui.$selectedPlants.set(new Set(['p1', 'p2']));

    store.ui.openBatchPrintLabelsDialog();

    const active = store.ui.$activeDialog.get();
    expect(active.type).toBe('BATCH_PRINT_LABELS');
    if (active.type === 'BATCH_PRINT_LABELS') {
      expect(active.payload.plantIds).toContain('p1');
      expect(active.payload.plantIds).toContain('p2');
    }
  });

  it('does not open dialog when no plants are selected', () => {
    store.ui.openBatchPrintLabelsDialog();

    expect(store.ui.$activeDialog.get().type).toBe('NONE');
  });

  it('dialog payload contains all selected plants', () => {
    const ids = ['alpha', 'beta', 'gamma', 'delta'];
    store.ui.$selectedPlants.set(new Set(ids));

    store.ui.openBatchPrintLabelsDialog();

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

    store.ui.openBatchPrintLabelsDialog();

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

function deferred() {
  let fulfill!: () => void;
  let fail!: (reason: Error) => void;
  const promise = new Promise<void>((resolve, reject) => {
    fulfill = resolve;
    fail = reject;
  });
  return { promise, resolve: fulfill, reject: fail };
}

describe('BatchPrintLabelDialog – printer list', () => {
  afterEach(() => vi.restoreAllMocks());

  it('lists the printers the shared helper discovers, in its shape', async () => {
    const hass = makeHass() as any;
    const el = await fixture<BatchPrintLabelDialog>(html`
      <batch-print-label-dialog .open=${true} .hass=${hass}></batch-print-label-dialog>
    `);
    await el.updateComplete;

    const select = el.shadowRoot!.querySelector('md3-select') as any;
    expect(select.options).toEqual([
      { label: 'Default / Auto', value: '' },
      ...getPrinters(hass).map((printer) => ({ label: printer.name, value: printer.id })),
    ]);
    expect(select.options.slice(1).map((o: { label: string }) => o.label)).toEqual([
      'Printer A',
      'Printer B',
    ]);
  });

  it('offers only the default option when no printers exist', async () => {
    const hass = { states: { 'sensor.temp': { attributes: {} } } } as any;
    const el = await fixture<BatchPrintLabelDialog>(html`
      <batch-print-label-dialog .open=${true} .hass=${hass}></batch-print-label-dialog>
    `);
    await el.updateComplete;

    const select = el.shadowRoot!.querySelector('md3-select') as any;
    expect(select.options).toEqual([{ label: 'Default / Auto', value: '' }]);
  });

  it('selects no printer on open when hass is not set', () => {
    const el = document.createElement('batch-print-label-dialog') as BatchPrintLabelDialog;
    (el as any).hass = undefined;
    (el as any)._selectedDeviceId = '';

    (el as any)._resetForm();

    expect((el as any)._selectedDeviceId).toBe('');
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

  it('resets sizeId to 50x30 and density to normal', () => {
    const el = createElement();
    (el as any)._sizeId = '50x80';
    (el as any)._density = 'high';

    (el as any)._resetForm();

    expect((el as any)._sizeId).toBe('50x30');
    expect((el as any)._density).toBe('normal');
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
  beforeEach(() => {
    vi.mocked(printLabel).mockReset().mockResolvedValue(undefined);
  });
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

    expect(printLabel).not.toHaveBeenCalled();
  });

  it('performs warm-up call with preview:true before batch', async () => {
    const mockStore = makeMockStore();
    const el = createElement(mockStore);
    (el as any).dialogState = { plantIds: ['plant-1', 'plant-2'] };
    (el as any)._selectedDeviceId = 'image.printer_a_last_label_made';

    await (el as any)._submit();

    expect(printLabel).toHaveBeenNthCalledWith(1, {
      plantId: 'plant-1',
      deviceId: 'image.printer_a_last_label_made',
      preview: true,
      baseUrl: window.location.origin + window.location.pathname,
    });
  });

  it('continues batch even when warm-up fails', async () => {
    const mockStore = makeMockStore();
    vi.mocked(printLabel)
      .mockRejectedValueOnce(new Error('warm-up error'))
      .mockResolvedValue(undefined);
    const el = createElement(mockStore);
    (el as any).dialogState = { plantIds: ['plant-1'] };

    await (el as any)._submit();

    // warm-up + 1 batch call
    expect(printLabel).toHaveBeenCalledTimes(2);
    expect(notification$.get()?.type).toBe('success');
    expect(notification$.get()?.message).toContain('1 label');
  });

  it('prints each plant for each copy', async () => {
    const mockStore = makeMockStore();
    const el = createElement(mockStore);
    (el as any).dialogState = { plantIds: ['p1', 'p2'] };
    (el as any)._copies = 3;

    await (el as any)._submit();

    // 1 warm-up + 3 copies × 2 plants = 7 total calls
    expect(printLabel).toHaveBeenCalledTimes(7);
  });

  it('shows success toast when all prints succeed', async () => {
    const mockStore = makeMockStore();
    const el = createElement(mockStore);
    (el as any).dialogState = { plantIds: ['p1', 'p2'] };
    (el as any)._copies = 2;

    await (el as any)._submit();

    expect(notification$.get()).toEqual({
      message: 'Printed 4 label(s) successfully',
      type: 'success',
    });
  });

  it('shows error toast when some prints fail', async () => {
    let callCount = 0;
    const mockStore = makeMockStore();
    vi.mocked(printLabel).mockImplementation(() => {
      callCount++;
      // warm-up succeeds, first batch print fails
      if (callCount === 2) return Promise.reject(new Error('print error'));
      return Promise.resolve(undefined);
    });
    const el = createElement(mockStore);
    (el as any).dialogState = { plantIds: ['p1', 'p2'] };

    await (el as any)._submit();

    expect(notification$.get()?.type).toBe('error');
    expect(notification$.get()?.message).toContain('1 error');
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

    const batchCall = vi.mocked(printLabel).mock.calls[1];
    expect(batchCall[0].deviceId).toBeUndefined();
  });

  it('passes the previewed fields, QR target, size and density to every batch label', async () => {
    const mockStore = makeMockStore();
    const el = await fixture<BatchPrintLabelDialog>(html`
      <batch-print-label-dialog
        .open=${true}
        .dialogState=${{ plantIds: ['p1', 'p2'] }}
      ></batch-print-label-dialog>
    `);
    (el as any).store = mockStore;
    (el as any)._sizeId = '40x30';
    (el as any)._density = 'high';
    (el as any)._copies = 2;
    await el.updateComplete;

    const preview = el.shadowRoot!.querySelector('label-preview') as any;
    const previewContract = {
      fields: preview.fields,
      sizeId: preview.sizeId,
      density: preview.density,
      qrValue: preview.qrValue,
    };

    await (el as any)._submit();

    const batchCalls = vi
      .mocked(printLabel)
      .mock.calls.slice(1)
      .map(([params]) => params);
    expect(batchCalls).toHaveLength(4);
    for (const call of batchCalls) {
      expect(call.fields).toEqual(previewContract.fields);
      expect(call.sizeId).toBe(previewContract.sizeId);
      expect(call.density).toBe(previewContract.density);
      expect(call.qrTarget).toBe('web');
      expect(buildQrTargetUrl('p1', 'web')).toBe(previewContract.qrValue);
    }
  });

  it('keeps the mounted preview and progress synchronized with every pending print', async () => {
    setDevices([
      {
        deviceId: 'dev1',
        name: 'Growspace 1',
        type: 'normal' as any,
        rows: 1,
        plantsPerRow: 2,
        plants: [
          {
            entity_id: 'sensor.plant_1',
            state: 'healthy',
            attributes: { plant_id: 'plant_1', strain: 'OG Kush' },
          },
          {
            entity_id: 'sensor.plant_2',
            state: 'healthy',
            attributes: { plant_id: 'plant_2', strain: 'Blue Dream' },
          },
        ] as any,
        grid: {},
        biologicalMetrics: {} as any,
        environmentAttributes: {} as any,
        stats: {} as any,
        irrigationConfig: {} as any,
      },
    ] as any);

    const pending: ReturnType<typeof deferred>[] = [];
    vi.mocked(printLabel).mockImplementation((request) => {
      if (request.preview) return Promise.resolve();
      const call = deferred();
      pending.push(call);
      return call.promise;
    });

    const el = await fixture<BatchPrintLabelDialog>(html`
      <batch-print-label-dialog
        .open=${true}
        .hass=${makeHass()}
        .dialogState=${{ plantIds: ['plant_1', 'plant_2'] }}
      ></batch-print-label-dialog>
    `);
    (el as any).store = makeMockStore();
    (el as any)._copies = 2;
    (el as any)._sizeId = '40x30';
    (el as any)._density = 'high';
    (el as any)._selectedDeviceId = 'image.printer_b_last_label_made';
    await el.updateComplete;

    const close = vi.fn();
    el.addEventListener('close', close);
    const submission = (el as any)._submit() as Promise<void>;
    const expectedPlants = ['plant_1', 'plant_2', 'plant_1', 'plant_2'];
    const expectedProgress = [0, 25, 50, 75];

    for (let index = 0; index < expectedPlants.length; index++) {
      await vi.waitFor(() => expect(pending).toHaveLength(index + 1));
      await el.updateComplete;

      const plantId = expectedPlants[index];
      const request = vi.mocked(printLabel).mock.calls[index + 1][0];
      const preview = el.shadowRoot!.querySelector('label-preview') as any;
      const navigation = el.shadowRoot!.querySelectorAll(
        '.preview-nav button'
      ) as NodeListOf<HTMLButtonElement>;

      expect(request).toMatchObject({
        plantId,
        fields: DEFAULT_LABEL_FIELDS,
        deviceId: 'image.printer_b_last_label_made',
        sizeId: '40x30',
        density: 'high',
        qrTarget: 'web',
        preview: false,
      });
      expect(preview.values).toEqual(deriveLabelFieldValues(plantId));
      expect(preview.qrValue).toBe(buildQrTargetUrl(plantId, 'web'));
      expect(preview.sizeId).toBe(request.sizeId);
      expect(preview.density).toBe(request.density);
      expect((el as any)._progress).toBe(expectedProgress[index]);
      expect(Array.from(navigation).every((button) => button.disabled)).toBe(true);

      if (index === 0) {
        el.dialogState = { plantIds: ['replacement'] };
        (el as any)._copies = 9;
        (el as any)._sizeId = '50x80';
        (el as any)._density = 'low';
        (el as any)._selectedDeviceId = 'image.printer_a_last_label_made';
        pending[index].resolve();

        await vi.waitFor(() => expect(pending).toHaveLength(2));
        await el.updateComplete;
        const secondPreview = el.shadowRoot!.querySelector('label-preview') as any;
        const selectedSize = el.shadowRoot!.querySelector('.size-chip.active');
        const selectedDensity = el.shadowRoot!.querySelector('.density-seg .active');
        const copies = el.shadowRoot!.querySelector('.copies-input') as HTMLInputElement;
        const printer = el.shadowRoot!.querySelector('md3-select') as any;
        expect(secondPreview.values).toEqual(deriveLabelFieldValues('plant_2'));
        expect((el as any)._previewIndex).toBe(1);
        expect(selectedSize?.textContent?.trim()).toBe('40×30');
        expect(selectedDensity?.textContent?.trim()).toBe('Dark');
        expect(copies.value).toBe('2');
        expect(printer.value).toBe('image.printer_b_last_label_made');
        continue;
      }

      if (index === 1) pending[index].reject(new Error('paper jam'));
      else pending[index].resolve();
    }

    await submission;
    await el.updateComplete;

    expect((el as any)._progress).toBe(100);
    expect(close).toHaveBeenCalledOnce();
    expect(notification$.get()).toEqual({ message: 'Printed with 1 error(s)', type: 'error' });
  });

  it('warm-up call does not include sizeId or density', async () => {
    const mockStore = makeMockStore();
    const el = createElement(mockStore);
    (el as any).dialogState = { plantIds: ['p1'] };
    (el as any)._sizeId = '50x50';
    (el as any)._density = 'low';

    await (el as any)._submit();

    const warmUpCall = vi.mocked(printLabel).mock.calls[0][0];
    expect(warmUpCall.preview).toBe(true);
    expect(warmUpCall.sizeId).toBeUndefined();
    expect(warmUpCall.density).toBeUndefined();
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

  it('resets preview position on reopen and clamps it when the selection shrinks', () => {
    const el = createElement();
    (el as any)._previewIndex = 2;
    el.dialogState = { plantIds: ['p1'] };
    (el as any).willUpdate(new Map([['dialogState', { plantIds: ['p1', 'p2', 'p3'] }]]));
    expect((el as any)._previewIndex).toBe(0);

    (el as any)._previewIndex = 2;
    el.open = true;
    (el as any).willUpdate(new Map([['open', false]]));
    expect((el as any)._previewIndex).toBe(0);
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
      <batch-print-label-dialog
        .open=${true}
        .dialogState=${{ plantIds: ['p1'] }}
      ></batch-print-label-dialog>
    `);
    expect(el.shadowRoot!.querySelector('gs-dialog')).not.toBeNull();
    const gsDialog = el.shadowRoot!.querySelector('gs-dialog') as any;
    await gsDialog?.updateComplete;
    expect(gsDialog?.shadowRoot?.querySelector('.dialog-subtitle')?.textContent).toContain(
      '1 plant(s) selected'
    );
  });

  it('previews the first selected plant with the shared label presentation', async () => {
    setDevices([
      {
        deviceId: 'dev1',
        name: 'Growspace 1',
        type: 'normal' as any,
        rows: 1,
        plantsPerRow: 1,
        plants: [
          {
            entity_id: 'sensor.plant_1',
            state: 'healthy',
            attributes: { plant_id: 'plant_1', strain: 'OG Kush', days_in_stage: 5 },
          },
        ] as any,
        grid: {},
        biologicalMetrics: {} as any,
        environmentAttributes: {} as any,
        stats: {} as any,
        irrigationConfig: {} as any,
      },
    ] as any);

    const el = await fixture<BatchPrintLabelDialog>(html`
      <batch-print-label-dialog
        .open=${true}
        .dialogState=${{ plantIds: ['plant_1', 'plant_2'] }}
      ></batch-print-label-dialog>
    `);
    const preview = el.shadowRoot!.querySelector('label-preview') as any;

    expect(preview).not.toBeNull();
    expect(preview.values).toEqual(deriveLabelFieldValues('plant_1'));
    expect(preview.values.name).toBe('OG Kush');
    expect(preview.fields).toEqual(DEFAULT_LABEL_FIELDS);
    expect(preview.qrValue).toBe(buildQrTargetUrl('plant_1', 'web'));
    expect(preview.sizeId).toBe('50x30');
    expect(preview.density).toBe('normal');
  });

  it('steps through every selected plant without changing the print settings', async () => {
    setDevices([
      {
        deviceId: 'dev1',
        name: 'Growspace 1',
        type: 'normal' as any,
        rows: 1,
        plantsPerRow: 3,
        plants: [
          {
            entity_id: 'sensor.plant_1',
            state: 'healthy',
            attributes: { plant_id: 'plant_1', strain: 'OG Kush' },
          },
          {
            entity_id: 'sensor.plant_2',
            state: 'healthy',
            attributes: { plant_id: 'plant_2', strain: 'Blue Dream' },
          },
          {
            entity_id: 'sensor.plant_3',
            state: 'healthy',
            attributes: { plant_id: 'plant_3', strain: 'Northern Lights' },
          },
        ] as any,
        grid: {},
        biologicalMetrics: {} as any,
        environmentAttributes: {} as any,
        stats: {} as any,
        irrigationConfig: {} as any,
      },
    ] as any);

    const el = await fixture<BatchPrintLabelDialog>(html`
      <batch-print-label-dialog
        .open=${true}
        .dialogState=${{ plantIds: ['plant_1', 'plant_2', 'plant_3'] }}
      ></batch-print-label-dialog>
    `);
    (el as any)._sizeId = '40x30';
    (el as any)._density = 'high';
    await el.updateComplete;

    const nav = el.shadowRoot!.querySelector('.preview-nav')!;
    const buttons = nav.querySelectorAll('button') as NodeListOf<HTMLButtonElement>;
    expect(nav.querySelector('.preview-position')?.textContent).toContain('1 of 3');
    expect(buttons[0].disabled).toBe(true);
    expect(buttons[1].disabled).toBe(false);

    buttons[1].click();
    await el.updateComplete;
    const preview = el.shadowRoot!.querySelector('label-preview') as any;
    expect(nav.querySelector('.preview-position')?.textContent).toContain('2 of 3');
    expect(preview.values.name).toBe('Blue Dream');
    expect(preview.qrValue).toBe(buildQrTargetUrl('plant_2', 'web'));

    const sizeChips = el.shadowRoot!.querySelectorAll(
      '.size-chip'
    ) as NodeListOf<HTMLButtonElement>;
    const densityButtons = el.shadowRoot!.querySelectorAll(
      '.density-seg button'
    ) as NodeListOf<HTMLButtonElement>;
    sizeChips[2].click();
    densityButtons[0].click();
    await el.updateComplete;
    expect(preview.sizeId).toBe('50x50');
    expect(preview.density).toBe('low');

    buttons[1].click();
    await el.updateComplete;
    expect(nav.querySelector('.preview-position')?.textContent).toContain('3 of 3');
    expect(buttons[1].disabled).toBe(true);
    expect(preview.values.name).toBe('Northern Lights');
    expect(preview.qrValue).toBe(buildQrTargetUrl('plant_3', 'web'));
    expect(preview.sizeId).toBe('50x50');
    expect(preview.density).toBe('low');

    buttons[0].click();
    await el.updateComplete;
    expect(nav.querySelector('.preview-position')?.textContent).toContain('2 of 3');
    expect((el as any)._sizeId).toBe('50x50');
    expect((el as any)._density).toBe('low');
  });

  it('keeps a single-plant preview simple without navigation controls', async () => {
    const el = await fixture<BatchPrintLabelDialog>(html`
      <batch-print-label-dialog
        .open=${true}
        .dialogState=${{ plantIds: ['plant_1'] }}
      ></batch-print-label-dialog>
    `);

    expect(el.shadowRoot!.querySelector('.preview-nav')).toBeNull();
    expect((el as any)._previewIndex).toBe(0);
  });

  it('prints selected plants in their original order for every copy', async () => {
    const mockStore = makeMockStore();
    const el = createElement(mockStore);
    (el as any).dialogState = { plantIds: ['third', 'first', 'second'] };
    (el as any)._copies = 2;
    (el as any)._previewIndex = 2;
    vi.mocked(printLabel).mockClear();

    await (el as any)._submit();

    const printedPlantIds = vi
      .mocked(printLabel)
      .mock.calls.slice(1)
      .map(([params]) => params.plantId);
    expect(printedPlantIds).toEqual(['third', 'first', 'second', 'third', 'first', 'second']);
  });

  it('updates the rendered preview when size and density change', async () => {
    const el = await fixture<BatchPrintLabelDialog>(html`
      <batch-print-label-dialog
        .open=${true}
        .dialogState=${{ plantIds: ['plant_1'] }}
      ></batch-print-label-dialog>
    `);
    const sizeChips = el.shadowRoot!.querySelectorAll(
      '.size-chip'
    ) as NodeListOf<HTMLButtonElement>;
    const densityButtons = el.shadowRoot!.querySelectorAll(
      '.density-seg button'
    ) as NodeListOf<HTMLButtonElement>;

    sizeChips[3].click();
    densityButtons[2].click();
    await el.updateComplete;

    const preview = el.shadowRoot!.querySelector('label-preview') as any;
    expect(preview.sizeId).toBe('50x80');
    expect(preview.density).toBe('high');
    expect(el.shadowRoot!.querySelector('.preview-meta')?.textContent).toContain('50×80');
  });

  it('lays preview beside settings on desktop and above them on mobile', async () => {
    try {
      await page.viewport(1280, 720);
      const desktopEl = await fixture<BatchPrintLabelDialog>(html`
        <batch-print-label-dialog .open=${true}></batch-print-label-dialog>
      `);
      const desktopLayout = desktopEl.shadowRoot!.querySelector('.two-col') as HTMLElement;
      const desktopPreview = desktopLayout.children[0] as HTMLElement;
      const desktopSettings = desktopLayout.children[1] as HTMLElement;
      expect(getComputedStyle(desktopLayout).display).toBe('grid');
      expect(desktopPreview.getBoundingClientRect().right).toBeLessThanOrEqual(
        desktopSettings.getBoundingClientRect().left
      );

      await page.viewport(390, 844);
      const mobileEl = await fixture<BatchPrintLabelDialog>(html`
        <batch-print-label-dialog .open=${true}></batch-print-label-dialog>
      `);
      const mobileLayout = mobileEl.shadowRoot!.querySelector('.two-col') as HTMLElement;
      const mobilePreview = mobileLayout.children[0] as HTMLElement;
      const mobileSettings = mobileLayout.children[1] as HTMLElement;
      expect(getComputedStyle(mobileLayout).display).toBe('flex');
      expect(getComputedStyle(mobileLayout).flexDirection).toBe('column');
      expect(mobilePreview.getBoundingClientRect().bottom).toBeLessThanOrEqual(
        mobileSettings.getBoundingClientRect().top
      );
    } finally {
      await page.viewport(1280, 720);
    }
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
    expect(bar.style.transform).toBe('scaleX(0.45)');
  });

  it('handles printer selection and copies input', async () => {
    const hass = makeHass();
    const el = await fixture<BatchPrintLabelDialog>(html`
      <batch-print-label-dialog
        .open=${true}
        .hass=${hass}
        .growspaceOptions=${{ 'gs-1': 'Tent 1' }}
      ></batch-print-label-dialog>
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

  it('renders printer-status-strip above the printer selector', async () => {
    const hass = makeHass();
    const el = await fixture<BatchPrintLabelDialog>(html`
      <batch-print-label-dialog .open=${true} .hass=${hass}></batch-print-label-dialog>
    `);
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('printer-status-strip')).not.toBeNull();
  });

  it('does not show inline "No Niimbot printers" warning (covered by status strip)', async () => {
    const hass = { states: {} } as any;
    const el = await fixture<BatchPrintLabelDialog>(html`
      <batch-print-label-dialog .open=${true} .hass=${hass}></batch-print-label-dialog>
    `);
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('.form-section')?.textContent).not.toContain(
      'No Niimbot printers discovered'
    );
  });

  it('renders size chip buttons for all five label sizes', async () => {
    const el = await fixture<BatchPrintLabelDialog>(html`
      <batch-print-label-dialog .open=${true}></batch-print-label-dialog>
    `);
    await el.updateComplete;
    const chips = el.shadowRoot!.querySelectorAll('.size-chip');
    expect(chips.length).toBe(5);
  });

  it('marks 50x30 size chip as active by default', async () => {
    const el = await fixture<BatchPrintLabelDialog>(html`
      <batch-print-label-dialog .open=${true}></batch-print-label-dialog>
    `);
    await el.updateComplete;
    const activeChip = el.shadowRoot!.querySelector('.size-chip.active');
    expect(activeChip?.textContent?.trim()).toBe('50×30');
  });

  it('renders density segmented control with three buttons', async () => {
    const el = await fixture<BatchPrintLabelDialog>(html`
      <batch-print-label-dialog .open=${true}></batch-print-label-dialog>
    `);
    await el.updateComplete;
    const seg = el.shadowRoot!.querySelector('.density-seg');
    expect(seg).not.toBeNull();
    expect(seg!.querySelectorAll('button').length).toBe(3);
  });

  it('marks Normal density as active by default', async () => {
    const el = await fixture<BatchPrintLabelDialog>(html`
      <batch-print-label-dialog .open=${true}></batch-print-label-dialog>
    `);
    await el.updateComplete;
    const activeBtn = el.shadowRoot!.querySelector('.density-seg button.active');
    expect(activeBtn?.textContent?.trim()).toBe('Normal');
  });

  it('clicking a size chip updates _sizeId', async () => {
    const el = await fixture<BatchPrintLabelDialog>(html`
      <batch-print-label-dialog .open=${true}></batch-print-label-dialog>
    `);
    await el.updateComplete;
    const chips = el.shadowRoot!.querySelectorAll('.size-chip') as NodeListOf<HTMLButtonElement>;
    // click the second chip (40x30)
    chips[1].click();
    await el.updateComplete;
    expect((el as any)._sizeId).toBe('40x30');
    expect(chips[1].classList.contains('active')).toBe(true);
  });

  it('clicking a density button updates _density', async () => {
    const el = await fixture<BatchPrintLabelDialog>(html`
      <batch-print-label-dialog .open=${true}></batch-print-label-dialog>
    `);
    await el.updateComplete;
    const btns = el.shadowRoot!.querySelectorAll(
      '.density-seg button'
    ) as NodeListOf<HTMLButtonElement>;
    // click "Light" (index 0)
    btns[0].click();
    await el.updateComplete;
    expect((el as any)._density).toBe('low');
    expect(btns[0].classList.contains('active')).toBe(true);
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
    const gsDialog = el.shadowRoot!.querySelector('gs-dialog') as any;
    await gsDialog?.updateComplete;
    expect(gsDialog?.shadowRoot?.querySelector('.dialog-subtitle')?.textContent).toContain(
      '0 plant(s) selected'
    );
  });

  it('renders printing label text during submission', async () => {
    const el = await fixture<BatchPrintLabelDialog>(html`
      <batch-print-label-dialog
        .open=${true}
        .dialogState=${{ plantIds: ['p1'] }}
      ></batch-print-label-dialog>
    `);
    (el as any)._isSubmitting = true;
    (el as any)._progress = 75;
    await el.updateComplete;

    const btn = el.shadowRoot!.querySelector('button.primary') as HTMLElement;
    expect(btn.textContent).toContain('Printing... 75%');
  });
});
