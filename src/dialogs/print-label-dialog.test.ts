import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { fixture, html } from '@open-wc/testing-helpers';
import { PrintLabelDialog } from './print-label-dialog';
import './print-label-dialog';
import type { LabelFieldVisibility } from '../lib/types/dialog';
import { setDevices } from '../slices/grid';
import { printLabel } from '../slices/plant';

// The dialog now calls the Plant slice `printLabel` mutator directly.
vi.mock('../slices/plant', () => ({
  printLabel: vi.fn().mockResolvedValue(undefined),
}));

beforeEach(() => {
  vi.mocked(printLabel).mockReset().mockResolvedValue(undefined);
});

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
    const statesDuringPrint: string[] = [];
    const mockStore = makeMockStore();
    const el = createElement(mockStore);
    vi.mocked(printLabel).mockImplementation(async () => {
      statesDuringPrint.push((el as any)._printState);
    });
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

    expect(printLabel).toHaveBeenCalledTimes(3);
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

    expect(printLabel).toHaveBeenCalledWith(
      expect.objectContaining({
        plantId: 'p1',
        fields,
        sizeId: '40x30',
        density: 'high',
        qrTarget: 'deeplink',
        deviceId: 'image.printer_a_last_label_made',
      })
    );
  });

  it('passes undefined deviceId when none selected', async () => {
    const mockStore = makeMockStore();
    const el = createElement(mockStore);
    (el as any).dialogState = { plantId: 'p1' };
    (el as any)._selectedDeviceId = '';
    (el as any)._copies = 1;

    await (el as any)._submit();

    const call = vi.mocked(printLabel).mock.calls[0][0];
    expect(call.deviceId).toBeUndefined();
  });

  it('sets _printState to error when printLabel rejects', async () => {
    const mockStore = makeMockStore();
    vi.mocked(printLabel).mockRejectedValue(new Error('printer offline'));
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

    const calls = vi.mocked(printLabel).mock.calls;
    expect(calls.every((c) => !c[0].preview)).toBe(true);
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

  it('renders printer options when printers are present in hass', async () => {
    const el = await fixture<PrintLabelDialog>(html`
      <print-label-dialog .open=${true} .hass=${makeHass()} .store=${makeMockStore()}></print-label-dialog>
    `);
    await el.updateComplete;
    const select = el.shadowRoot!.querySelector('md3-select[label="Niimbot Printer"]') as any;
    expect(select).not.toBeNull();
    expect(select.options).toContainEqual({ label: 'Printer A', value: 'image.printer_a_last_label_made' });
    expect(select.options).toContainEqual({ label: 'Printer B', value: 'image.printer_b_last_label_made' });
  });

  it('renders fallback sizeLabel when sizeId is not found in LABEL_SIZES', async () => {
    const el = await fixture<PrintLabelDialog>(html`
      <print-label-dialog .open=${true}></print-label-dialog>
    `);
    (el as any)._sizeId = 'custom-size';
    await el.updateComplete;
    const footer = el.shadowRoot!.querySelector('.footer-meta') as HTMLElement;
    expect(footer?.textContent).toContain('custom-size');
  });
});

// ---------------------------------------------------------------------------
// _getPlant & _getFieldValues
// ---------------------------------------------------------------------------

describe('PrintLabelDialog – _getPlant & _getFieldValues', () => {
  afterEach(() => {
    setDevices([]);
    vi.restoreAllMocks();
  });

  it('returns null if plantId is missing', () => {
    const el = createElement();
    expect((el as any)._getPlant(undefined)).toBeNull();
  });

  it('returns plant if found by plant_id attribute', () => {
    const mockPlant = {
      entity_id: 'sensor.plant_1',
      state: 'healthy',
      attributes: {
        plant_id: 'plant_1',
        strain: 'OG Kush',
        phenotype: 'Ph1',
        veg_start: '2026-05-01T00:00:00Z',
        days_in_stage: 5,
      }
    };
    setDevices([{
      deviceId: 'dev1',
      name: 'Growspace 1',
      type: 'normal' as any,
      rows: 1,
      plantsPerRow: 1,
      plants: [mockPlant] as any,
      grid: {},
      biologicalMetrics: {} as any,
      environmentAttributes: {} as any,
      stats: {} as any,
      irrigationConfig: {} as any
    }]);

    const el = createElement();
    expect((el as any)._getPlant('plant_1')).toEqual(mockPlant);
  });

  it('returns plant if found by entity_id fallback', () => {
    const mockPlant = {
      entity_id: 'sensor.plant_1',
      state: 'healthy',
      attributes: {
        strain: 'OG Kush',
        phenotype: 'Ph1',
      }
    };
    setDevices([{
      deviceId: 'dev1',
      name: 'Growspace 1',
      type: 'normal' as any,
      rows: 1,
      plantsPerRow: 1,
      plants: [mockPlant] as any,
      grid: {},
      biologicalMetrics: {} as any,
      environmentAttributes: {} as any,
      stats: {} as any,
      irrigationConfig: {} as any
    }]);

    const el = createElement();
    expect((el as any)._getPlant('plant_1')).toEqual(mockPlant);
  });

  it('returns null if plant is not found', () => {
    setDevices([{
      deviceId: 'dev1',
      name: 'Growspace 1',
      type: 'normal' as any,
      rows: 1,
      plantsPerRow: 1,
      plants: [],
      grid: {},
      biologicalMetrics: {} as any,
      environmentAttributes: {} as any,
      stats: {} as any,
      irrigationConfig: {} as any
    }]);

    const el = createElement();
    expect((el as any)._getPlant('plant_1')).toBeNull();
  });

  it('formats field values correctly using veg_start date', () => {
    const mockPlant = {
      entity_id: 'sensor.plant_1',
      state: 'healthy',
      attributes: {
        plant_id: 'plant_1',
        strain: 'OG Kush',
        phenotype: 'Ph1',
        breeder: 'Barney',
        lineage: 'Kush x OG',
        veg_start: '2026-05-01T00:00:00Z',
        days_in_stage: 5,
        breeder_logo: 'logo.png'
      }
    };
    setDevices([{
      deviceId: 'dev1',
      name: 'Growspace 1',
      type: 'normal' as any,
      rows: 1,
      plantsPerRow: 1,
      plants: [mockPlant] as any,
      grid: {},
      biologicalMetrics: {} as any,
      environmentAttributes: {} as any,
      stats: {} as any,
      irrigationConfig: {} as any
    }]);

    const el = createElement();
    el.dialogState = { plantId: 'plant_1' };
    const values = (el as any)._getFieldValues();
    expect(values.name).toBe('OG Kush');
    expect(values.phenotype).toBe('Ph1');
    expect(values.breeder).toBe('Barney');
    expect(values.lineage).toBe('Kush x OG');
    expect(values.stageAge).toBe('Day 5');
    expect(values.logo).toBe('logo.png');
    expect(values.startDate).toBeTruthy();
  });

  it('formats field values correctly using flower_start date', () => {
    const mockPlant = {
      entity_id: 'sensor.plant_1',
      state: 'healthy',
      attributes: {
        plant_id: 'plant_1',
        flower_start: '2026-05-01T00:00:00Z',
      }
    };
    setDevices([{
      deviceId: 'dev1',
      name: 'Growspace 1',
      type: 'normal' as any,
      rows: 1,
      plantsPerRow: 1,
      plants: [mockPlant] as any,
      grid: {},
      biologicalMetrics: {} as any,
      environmentAttributes: {} as any,
      stats: {} as any,
      irrigationConfig: {} as any
    }]);

    const el = createElement();
    el.dialogState = { plantId: 'plant_1' };
    const values = (el as any)._getFieldValues();
    expect(values.startDate).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// _formatDate
// ---------------------------------------------------------------------------

describe('PrintLabelDialog – _formatDate', () => {
  it('returns empty string for null or undefined', () => {
    const el = createElement();
    expect((el as any)._formatDate(null)).toBe('');
    expect((el as any)._formatDate(undefined)).toBe('');
  });

  it('returns original string if parsing throws an error', () => {
    const el = createElement();
    expect((el as any)._formatDate('invalid-date-string')).toBe('invalid-date-string');
  });

  it('returns original input if conversion/parsing throws an error', () => {
    const el = createElement();
    const badInput = Symbol('bad') as any;
    expect((el as any)._formatDate(badInput)).toBe(badInput);
  });
});

// ---------------------------------------------------------------------------
// DOM Interactive Tests
// ---------------------------------------------------------------------------

describe('PrintLabelDialog – DOM interactions', () => {
  it('toggles non-locked fields on click in DOM', async () => {
    const el = await fixture<PrintLabelDialog>(html`
      <print-label-dialog .open=${true}></print-label-dialog>
    `);
    const phenotypeRow = Array.from(el.shadowRoot!.querySelectorAll('.field-toggle-row'))
      .find(row => row.querySelector('.field-toggle-label')?.textContent?.trim() === 'Phenotype') as HTMLElement;
    
    expect((el as any)._fields.phenotype).toBe(true);
    phenotypeRow.click();
    await el.updateComplete;
    expect((el as any)._fields.phenotype).toBe(false);
  });

  it('does not toggle locked fields on click in DOM', async () => {
    const el = await fixture<PrintLabelDialog>(html`
      <print-label-dialog .open=${true}></print-label-dialog>
    `);
    const nameRow = Array.from(el.shadowRoot!.querySelectorAll('.field-toggle-row'))
      .find(row => row.querySelector('.field-toggle-label')?.textContent?.trim() === 'Strain name') as HTMLElement;
    
    expect((el as any)._fields.name).toBe(true);
    nameRow.click();
    await el.updateComplete;
    expect((el as any)._fields.name).toBe(true);
  });

  it('toggles mobile settings panel on pill click', async () => {
    const el = await fixture<PrintLabelDialog>(html`
      <print-label-dialog .open=${true}></print-label-dialog>
    `);
    const pill = el.shadowRoot!.querySelector('.mobile-pill-toggle') as HTMLButtonElement;
    const settingsCol = el.shadowRoot!.querySelector('.settings-col') as HTMLElement;
    
    expect((el as any)._settingsOpen).toBe(false);
    expect(settingsCol.classList.contains('mobile-open')).toBe(false);
    
    pill.click();
    await el.updateComplete;
    
    expect((el as any)._settingsOpen).toBe(true);
    expect(settingsCol.classList.contains('mobile-open')).toBe(true);
  });

  it('updates qrTarget when md3-select changes', async () => {
    const el = await fixture<PrintLabelDialog>(html`
      <print-label-dialog .open=${true}></print-label-dialog>
    `);
    (el as any)._fields = {
      name: true,
      phenotype: true,
      breeder: true,
      lineage: true,
      startDate: true,
      stageAge: true,
      plantId: true,
      logo: true,
      qr: true,
    };
    await el.updateComplete;
    
    const select = el.shadowRoot!.querySelector('.qr-target-card md3-select') as any;
    expect(select).not.toBeNull();
    
    select.dispatchEvent(new CustomEvent('change', { detail: 'deeplink' }));
    await el.updateComplete;
    
    expect((el as any)._qrTarget).toBe('deeplink');
  });

  it('decrements and increments copies on button click within boundaries', async () => {
    const el = await fixture<PrintLabelDialog>(html`
      <print-label-dialog .open=${true}></print-label-dialog>
    `);
    (el as any)._copies = 2;
    await el.updateComplete;
    
    const decBtn = el.shadowRoot!.querySelectorAll('.copies-stepper button')[0] as HTMLButtonElement;
    const incBtn = el.shadowRoot!.querySelectorAll('.copies-stepper button')[1] as HTMLButtonElement;
    
    incBtn.click();
    await el.updateComplete;
    expect((el as any)._copies).toBe(3);
    
    decBtn.click();
    await el.updateComplete;
    expect((el as any)._copies).toBe(2);

    (el as any)._copies = 1;
    await el.updateComplete;
    decBtn.click();
    await el.updateComplete;
    expect((el as any)._copies).toBe(1);

    (el as any)._copies = 50;
    await el.updateComplete;
    incBtn.click();
    await el.updateComplete;
    expect((el as any)._copies).toBe(50);
  });

  it('changes density when density segment button is clicked', async () => {
    const el = await fixture<PrintLabelDialog>(html`
      <print-label-dialog .open=${true}></print-label-dialog>
    `);
    (el as any)._density = 'normal';
    await el.updateComplete;
    
    const lightBtn = el.shadowRoot!.querySelectorAll('.density-seg button')[0] as HTMLButtonElement;
    lightBtn.click();
    await el.updateComplete;
    
    expect((el as any)._density).toBe('low');
  });

  it('changes sizeId when size chip is clicked', async () => {
    const el = await fixture<PrintLabelDialog>(html`
      <print-label-dialog .open=${true}></print-label-dialog>
    `);
    (el as any)._sizeId = '50x30';
    await el.updateComplete;
    
    const chip40x30 = Array.from(el.shadowRoot!.querySelectorAll('.size-chip'))
      .find(btn => btn.textContent?.trim() === '40×30') as HTMLButtonElement;
      
    expect(chip40x30).not.toBeNull();
    chip40x30.click();
    await el.updateComplete;
    
    expect((el as any)._sizeId).toBe('40x30');
  });

  it('updates selectedDeviceId when printer select changes', async () => {
    const el = await fixture<PrintLabelDialog>(html`
      <print-label-dialog .open=${true} .hass=${makeHass()}></print-label-dialog>
    `);
    await el.updateComplete;
    
    const select = el.shadowRoot!.querySelector('md3-select[label="Niimbot Printer"]') as any;
    expect(select).not.toBeNull();
    
    select.dispatchEvent(new CustomEvent('change', { detail: 'image.printer_b_last_label_made' }));
    await el.updateComplete;
    
    expect((el as any)._selectedDeviceId).toBe('image.printer_b_last_label_made');
  });
});
