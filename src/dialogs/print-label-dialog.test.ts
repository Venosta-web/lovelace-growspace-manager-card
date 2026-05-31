import { describe, it, expect, vi, afterEach } from 'vitest';
import { fixture, html } from '@open-wc/testing-helpers';
import { PrintLabelDialog } from './print-label-dialog';
import './print-label-dialog';
import type { LabelFieldVisibility } from '../lib/types/dialog';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockTags = ['ha-dialog', 'ha-svg-icon', 'md3-select', 'label-preview', 'printer-status-strip'];
for (const tag of mockTags) {
  if (!customElements.get(tag)) {
    customElements.define(tag, class extends HTMLElement {});
  }
}

function makeMockStore(overrides: Record<string, unknown> = {}) {
  return {
    actions: {
      ui: { toast: vi.fn() },
      plant: { printLabel: vi.fn().mockResolvedValue(undefined) },
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
      'binary_sensor.printer_a_connection': { state: 'on', attributes: {} },
      'sensor.printer_a_battery': { state: '80', attributes: {} },
      'binary_sensor.printer_a_paper_loaded': { state: 'on', attributes: {} },
      ...extraStates,
    },
  };
}

function createElement(mockStore = makeMockStore(), hass = makeHass()) {
  const el = document.createElement('print-label-dialog') as PrintLabelDialog;
  (el as any).store = mockStore;
  (el as any).hass = hass;
  return el;
}

// ---------------------------------------------------------------------------
// _resetForm — auto-select printer on open
// ---------------------------------------------------------------------------

describe('PrintLabelDialog – _resetForm auto-select printer', () => {
  afterEach(() => vi.restoreAllMocks());

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

  it('leaves deviceId empty when no printers exist', () => {
    const hass = { states: {} } as any;
    const el = createElement(makeMockStore(), hass);
    (el as any)._selectedDeviceId = '';
    (el as any)._resetForm();
    expect((el as any)._selectedDeviceId).toBe('');
  });
});

// ---------------------------------------------------------------------------
// _resetForm — applies defaultFields from dialogState
// ---------------------------------------------------------------------------

describe('PrintLabelDialog – _resetForm defaultFields', () => {
  afterEach(() => vi.restoreAllMocks());

  it('uses defaultFields from dialogState when provided', () => {
    const el = createElement();
    (el as any).dialogState = {
      plantId: 'p1',
      defaultFields: { phenotype: false, breeder: false },
    };
    (el as any)._resetForm();
    const fields: LabelFieldVisibility = (el as any)._fields;
    expect(fields.phenotype).toBe(false);
    expect(fields.breeder).toBe(false);
    expect(fields.name).toBe(true);
  });

  it('defaults all fields to true when no defaultFields given', () => {
    const el = createElement();
    (el as any).dialogState = { plantId: 'p1' };
    (el as any)._resetForm();
    const fields: LabelFieldVisibility = (el as any)._fields;
    expect(fields.name).toBe(true);
    expect(fields.phenotype).toBe(true);
    expect(fields.qr).toBe(true);
  });

  it('applies defaultSizeId when provided', () => {
    const el = createElement();
    (el as any).dialogState = { defaultSizeId: '50x80' };
    (el as any)._resetForm();
    expect((el as any)._sizeId).toBe('50x80');
  });

  it('applies defaultDensity when provided', () => {
    const el = createElement();
    (el as any).dialogState = { defaultDensity: 'high' };
    (el as any)._resetForm();
    expect((el as any)._density).toBe('high');
  });

  it('applies defaultQrTarget when provided', () => {
    const el = createElement();
    (el as any).dialogState = { defaultQrTarget: 'deeplink' };
    (el as any)._resetForm();
    expect((el as any)._qrTarget).toBe('deeplink');
  });

  it('resets to default values when dialogState has no overrides', () => {
    const el = createElement();
    (el as any)._sizeId = '50x80';
    (el as any)._density = 'high';
    (el as any)._qrTarget = 'deeplink';
    (el as any)._copies = 5;
    (el as any).dialogState = {};
    (el as any)._resetForm();
    expect((el as any)._sizeId).toBe('50x30');
    expect((el as any)._density).toBe('normal');
    expect((el as any)._qrTarget).toBe('web');
    expect((el as any)._copies).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// _toggleField — field visibility
// ---------------------------------------------------------------------------

describe('PrintLabelDialog – _toggleField', () => {
  afterEach(() => vi.restoreAllMocks());

  it('toggles a field from true to false', () => {
    const el = createElement();
    (el as any)._fields = { name: true, phenotype: true, breeder: true, lineage: true, startDate: true, stageAge: true, plantId: true, logo: true, qr: true };
    (el as any)._toggleField('phenotype');
    expect((el as any)._fields.phenotype).toBe(false);
  });

  it('toggles a field from false to true', () => {
    const el = createElement();
    (el as any)._fields = { name: true, phenotype: false, breeder: true, lineage: true, startDate: true, stageAge: true, plantId: true, logo: true, qr: true };
    (el as any)._toggleField('phenotype');
    expect((el as any)._fields.phenotype).toBe(true);
  });

  it('does not toggle name — it is always locked on', () => {
    const el = createElement();
    (el as any)._fields = { name: true, phenotype: true, breeder: true, lineage: true, startDate: true, stageAge: true, plantId: true, logo: true, qr: true };
    (el as any)._toggleField('name');
    expect((el as any)._fields.name).toBe(true);
  });

  it('toggling qr to false hides qr target selector', () => {
    const el = createElement();
    (el as any)._fields = { name: true, phenotype: true, breeder: true, lineage: true, startDate: true, stageAge: true, plantId: true, logo: true, qr: true };
    (el as any)._toggleField('qr');
    expect((el as any)._fields.qr).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// _submit — print flow states
// ---------------------------------------------------------------------------

describe('PrintLabelDialog – _submit print flow', () => {
  afterEach(() => vi.restoreAllMocks());

  it('does nothing when store is missing', async () => {
    const el = createElement();
    (el as any).store = null;
    (el as any).dialogState = { plantId: 'p1' };
    await (el as any)._submit();
    expect((el as any)._printState).toBe('idle');
  });

  it('sets _printState to printing during submit and done after', async () => {
    let statesDuringPrint: string[] = [];
    const mockStore = makeMockStore({
      actions: {
        ui: { toast: vi.fn() },
        plant: {
          printLabel: vi.fn().mockImplementation(async () => {
            statesDuringPrint.push((el as any)._printState);
          }),
        },
      },
    });
    const el = createElement(mockStore);
    (el as any).dialogState = { plantId: 'p1' };
    (el as any)._copies = 1;

    await (el as any)._submit();

    expect(statesDuringPrint).toContain('printing');
    expect((el as any)._printState).toBe('done');
  });

  it('calls printLabel once per copy', async () => {
    const mockStore = makeMockStore();
    const el = createElement(mockStore);
    (el as any).dialogState = { plantId: 'p1' };
    (el as any)._copies = 3;

    await (el as any)._submit();

    expect(mockStore.actions.plant.printLabel).toHaveBeenCalledTimes(3);
  });

  it('passes fields, sizeId, density, qrTarget, deviceId to printLabel', async () => {
    const mockStore = makeMockStore();
    const el = createElement(mockStore);
    const fields = { name: true, phenotype: false, breeder: true, lineage: false, startDate: true, stageAge: false, plantId: true, logo: false, qr: true };
    (el as any).dialogState = { plantId: 'p1' };
    (el as any)._fields = fields;
    (el as any)._sizeId = '40x30';
    (el as any)._density = 'high';
    (el as any)._qrTarget = 'deeplink';
    (el as any)._selectedDeviceId = 'image.printer_a_last_label_made';
    (el as any)._copies = 1;

    await (el as any)._submit();

    expect(mockStore.actions.plant.printLabel).toHaveBeenCalledWith({
      plantId: 'p1',
      fields,
      sizeId: '40x30',
      density: 'high',
      qrTarget: 'deeplink',
      deviceId: 'image.printer_a_last_label_made',
    });
  });

  it('passes undefined deviceId when none selected', async () => {
    const mockStore = makeMockStore();
    const el = createElement(mockStore);
    (el as any).dialogState = { plantId: 'p1' };
    (el as any)._selectedDeviceId = '';
    (el as any)._copies = 1;

    await (el as any)._submit();

    const call = mockStore.actions.plant.printLabel.mock.calls[0][0];
    expect(call.deviceId).toBeUndefined();
  });

  it('sets _printState to error when printLabel rejects', async () => {
    const mockStore = makeMockStore({
      actions: {
        ui: { toast: vi.fn() },
        plant: { printLabel: vi.fn().mockRejectedValue(new Error('printer offline')) },
      },
    });
    const el = createElement(mockStore);
    (el as any).dialogState = { plantId: 'p1' };
    (el as any)._copies = 1;

    await (el as any)._submit();

    expect((el as any)._printState).toBe('error');
  });

  it('updates _printProgress each iteration', async () => {
    const mockStore = makeMockStore();
    const el = createElement(mockStore);
    (el as any).dialogState = { plantId: 'p1' };
    (el as any)._copies = 4;

    await (el as any)._submit();

    expect((el as any)._printProgress).toBe(100);
  });
});

// ---------------------------------------------------------------------------
// _submit — no backend call on preview mechanism
// ---------------------------------------------------------------------------

describe('PrintLabelDialog – no preview backend call', () => {
  afterEach(() => vi.restoreAllMocks());

  it('never calls printLabel with preview:true', async () => {
    const mockStore = makeMockStore();
    const el = createElement(mockStore);
    (el as any).dialogState = { plantId: 'p1' };
    (el as any)._copies = 2;

    await (el as any)._submit();

    const calls = mockStore.actions.plant.printLabel.mock.calls;
    expect(calls.every((c: any[]) => !c[0].preview)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// willUpdate — calls _resetForm on open
// ---------------------------------------------------------------------------

describe('PrintLabelDialog – willUpdate', () => {
  it('calls _resetForm when open changes to true', () => {
    const el = createElement();
    const spy = vi.spyOn(el as any, '_resetForm');
    el.open = true;
    (el as any).willUpdate(new Map([['open', false]]));
    expect(spy).toHaveBeenCalled();
  });

  it('does not call _resetForm when open changes to false', () => {
    const el = createElement();
    const spy = vi.spyOn(el as any, '_resetForm');
    el.open = false;
    (el as any).willUpdate(new Map([['open', true]]));
    expect(spy).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// _close
// ---------------------------------------------------------------------------

describe('PrintLabelDialog – _close', () => {
  it('dispatches a close CustomEvent', () => {
    const el = createElement();
    const events: Event[] = [];
    el.addEventListener('close', (e) => events.push(e));
    (el as any)._close();
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('close');
  });
});

// ---------------------------------------------------------------------------
// render
// ---------------------------------------------------------------------------

describe('PrintLabelDialog – render', () => {
  it('renders nothing when closed', async () => {
    const el = await fixture<PrintLabelDialog>(html`
      <print-label-dialog .open=${false}></print-label-dialog>
    `);
    expect(el.shadowRoot!.querySelector('gs-dialog')).toBeNull();
  });

  it('renders gs-dialog when open', async () => {
    const el = await fixture<PrintLabelDialog>(html`
      <print-label-dialog .open=${true} .dialogState=${{ plantId: 'p1' }}></print-label-dialog>
    `);
    expect(el.shadowRoot!.querySelector('gs-dialog')).not.toBeNull();
  });

  it('renders label-preview in the left column', async () => {
    const el = await fixture<PrintLabelDialog>(html`
      <print-label-dialog .open=${true}></print-label-dialog>
    `);
    expect(el.shadowRoot!.querySelector('label-preview')).not.toBeNull();
  });

  it('renders printer-status-strip', async () => {
    const el = await fixture<PrintLabelDialog>(html`
      <print-label-dialog .open=${true}></print-label-dialog>
    `);
    expect(el.shadowRoot!.querySelector('printer-status-strip')).not.toBeNull();
  });

  it('hides QR target selector when qr field is off', async () => {
    const el = await fixture<PrintLabelDialog>(html`
      <print-label-dialog .open=${true}></print-label-dialog>
    `);
    (el as any)._fields = { name: true, phenotype: true, breeder: true, lineage: true, startDate: true, stageAge: true, plantId: true, logo: true, qr: false };
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('.qr-target-card')).toBeNull();
  });

  it('shows QR target selector when qr field is on', async () => {
    const el = await fixture<PrintLabelDialog>(html`
      <print-label-dialog .open=${true}></print-label-dialog>
    `);
    (el as any)._fields = { name: true, phenotype: true, breeder: true, lineage: true, startDate: true, stageAge: true, plantId: true, logo: true, qr: true };
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('.qr-target-card')).not.toBeNull();
  });

  it('disables Print Now button during printing', async () => {
    const el = await fixture<PrintLabelDialog>(html`
      <print-label-dialog .open=${true}></print-label-dialog>
    `);
    (el as any)._printState = 'printing';
    await el.updateComplete;
    const btn = el.shadowRoot!.querySelector('.btn-print') as HTMLButtonElement;
    expect(btn?.disabled).toBe(true);
  });

  it('shows done footer text after successful print', async () => {
    const el = await fixture<PrintLabelDialog>(html`
      <print-label-dialog .open=${true}></print-label-dialog>
    `);
    (el as any)._printState = 'done';
    (el as any)._copies = 2;
    await el.updateComplete;
    const footer = el.shadowRoot!.querySelector('.footer-meta') as HTMLElement;
    expect(footer?.textContent).toContain('Printed 2');
  });

  it('shows error footer text on error state', async () => {
    const el = await fixture<PrintLabelDialog>(html`
      <print-label-dialog .open=${true}></print-label-dialog>
    `);
    (el as any)._printState = 'error';
    await el.updateComplete;
    const footer = el.shadowRoot!.querySelector('.footer-meta') as HTMLElement;
    expect(footer?.textContent).toContain('offline');
  });
});
