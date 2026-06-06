import { describe, it, expect, afterEach } from 'vitest';
import './vpd-optimal-overrides-table';
import type {
  VpdOptimalOverridesTable,
  VpdOptimalOverrides,
} from './vpd-optimal-overrides-table';
import { VPD_OPTIMAL_STAGE_DEFAULTS, FAN_VPD_STAGE_KEYS } from '../constants';

function createElement(overrides: VpdOptimalOverrides = {}): VpdOptimalOverridesTable {
  const el = document.createElement('vpd-optimal-overrides-table') as VpdOptimalOverridesTable;
  el.overrides = overrides;
  document.body.appendChild(el);
  return el;
}

afterEach(() => {
  document.body.innerHTML = '';
});

// ─── Render ──────────────────────────────────────────────────────────────────

describe('VpdOptimalOverridesTable – render', () => {
  it('renders a row for each of the 9 fan VPD stages', async () => {
    const el = createElement();
    await el.updateComplete;
    const rows = el.shadowRoot!.querySelectorAll('.stage-row');
    expect(rows.length).toBe(FAN_VPD_STAGE_KEYS.length);
  });

  it('renders four inputs per stage row', async () => {
    const el = createElement();
    await el.updateComplete;
    const rows = el.shadowRoot!.querySelectorAll('.stage-row');
    rows.forEach((row) => {
      expect(row.querySelectorAll('input[type="number"]').length).toBe(4);
    });
  });

  it('renders a reset button', async () => {
    const el = createElement();
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('.reset-button')).not.toBeNull();
  });
});

// ─── Pre-population ──────────────────────────────────────────────────────────

describe('VpdOptimalOverridesTable – pre-population', () => {
  it('shows built-in defaults when overrides is empty', async () => {
    const el = createElement({});
    await el.updateComplete;
    const rows = el.shadowRoot!.querySelectorAll('.stage-row');
    // First row is seedling: day.low, day.high, night.low, night.high
    const inputs = rows[0].querySelectorAll<HTMLInputElement>('input[type="number"]');
    expect(parseFloat(inputs[0].value)).toBe(VPD_OPTIMAL_STAGE_DEFAULTS.seedling.day.low);
    expect(parseFloat(inputs[1].value)).toBe(VPD_OPTIMAL_STAGE_DEFAULTS.seedling.day.high);
    expect(parseFloat(inputs[2].value)).toBe(VPD_OPTIMAL_STAGE_DEFAULTS.seedling.night.low);
    expect(parseFloat(inputs[3].value)).toBe(VPD_OPTIMAL_STAGE_DEFAULTS.seedling.night.high);
  });

  it('shows override values when a stage is fully overridden', async () => {
    const el = createElement({
      veg: { day: { low: 0.6, high: 1.0 }, night: { low: 0.5, high: 0.9 } },
    });
    await el.updateComplete;
    const rows = el.shadowRoot!.querySelectorAll('.stage-row');
    // veg is the 4th stage (index 3)
    const inputs = rows[3].querySelectorAll<HTMLInputElement>('input[type="number"]');
    expect(parseFloat(inputs[0].value)).toBe(0.6);
    expect(parseFloat(inputs[1].value)).toBe(1.0);
    expect(parseFloat(inputs[2].value)).toBe(0.5);
    expect(parseFloat(inputs[3].value)).toBe(0.9);
  });

  it('falls back to default for stages not in overrides', async () => {
    const el = createElement({
      veg: { day: { low: 0.6, high: 1.0 }, night: { low: 0.5, high: 0.9 } },
    });
    await el.updateComplete;
    const rows = el.shadowRoot!.querySelectorAll('.stage-row');
    // seedling is index 0, not overridden
    const inputs = rows[0].querySelectorAll<HTMLInputElement>('input[type="number"]');
    expect(parseFloat(inputs[0].value)).toBe(VPD_OPTIMAL_STAGE_DEFAULTS.seedling.day.low);
    expect(parseFloat(inputs[1].value)).toBe(VPD_OPTIMAL_STAGE_DEFAULTS.seedling.day.high);
  });
});

// ─── Sparse updates ──────────────────────────────────────────────────────────

describe('VpdOptimalOverridesTable – sparse updates', () => {
  it('emits overrides-change with the edited slot on input change', async () => {
    const el = createElement({});
    await el.updateComplete;

    const received: VpdOptimalOverrides[] = [];
    el.addEventListener('overrides-change', (e: Event) => {
      received.push((e as CustomEvent<VpdOptimalOverrides>).detail);
    });

    const rows = el.shadowRoot!.querySelectorAll('.stage-row');
    // Edit seedling day.low (first input of first row)
    const input = rows[0].querySelectorAll<HTMLInputElement>('input[type="number"]')[0];
    input.value = '0.5';
    input.dispatchEvent(new Event('change'));

    expect(received).toHaveLength(1);
    expect(received[0].seedling?.day.low).toBe(0.5);
  });

  it('preserves existing overrides when a different stage is edited', async () => {
    const el = createElement({
      veg: { day: { low: 0.6, high: 1.0 }, night: { low: 0.5, high: 0.9 } },
    });
    await el.updateComplete;

    const received: VpdOptimalOverrides[] = [];
    el.addEventListener('overrides-change', (e: Event) => {
      received.push((e as CustomEvent<VpdOptimalOverrides>).detail);
    });

    const rows = el.shadowRoot!.querySelectorAll('.stage-row');
    // Edit seedling (index 0) day.low
    const input = rows[0].querySelectorAll<HTMLInputElement>('input[type="number"]')[0];
    input.value = '0.5';
    input.dispatchEvent(new Event('change'));

    expect(received[0].veg).toEqual({
      day: { low: 0.6, high: 1.0 },
      night: { low: 0.5, high: 0.9 },
    });
    expect(received[0].seedling?.day.low).toBe(0.5);
  });

  it('snaps a cleared slot to its default while preserving sibling slots', async () => {
    const el = createElement({
      veg: { day: { low: 0.6, high: 1.0 }, night: { low: 0.5, high: 0.9 } },
    });
    await el.updateComplete;

    const received: VpdOptimalOverrides[] = [];
    el.addEventListener('overrides-change', (e: Event) => {
      received.push((e as CustomEvent<VpdOptimalOverrides>).detail);
    });

    const rows = el.shadowRoot!.querySelectorAll('.stage-row');
    // Clear veg day.low (index 3, first input)
    const input = rows[3].querySelectorAll<HTMLInputElement>('input[type="number"]')[0];
    input.value = '';
    input.dispatchEvent(new Event('change'));

    expect(received).toHaveLength(1);
    expect(received[0].veg?.day.low).toBe(VPD_OPTIMAL_STAGE_DEFAULTS.veg.day.low);
    expect(received[0].veg?.day.high).toBe(1.0);
    expect(received[0].veg?.night.low).toBe(0.5);
    expect(received[0].veg?.night.high).toBe(0.9);
  });

  it('snaps all slots to default for a stage with no prior override when cleared', async () => {
    const el = createElement({});
    await el.updateComplete;

    const received: VpdOptimalOverrides[] = [];
    el.addEventListener('overrides-change', (e: Event) => {
      received.push((e as CustomEvent<VpdOptimalOverrides>).detail);
    });

    const input = el.shadowRoot!.querySelector<HTMLInputElement>('input[type="number"]')!;
    input.value = '';
    input.dispatchEvent(new Event('change'));

    expect(received).toHaveLength(1);
    expect(received[0].seedling?.day.low).toBe(VPD_OPTIMAL_STAGE_DEFAULTS.seedling.day.low);
    expect(received[0].seedling?.day.high).toBe(VPD_OPTIMAL_STAGE_DEFAULTS.seedling.day.high);
    expect(received[0].seedling?.night.low).toBe(VPD_OPTIMAL_STAGE_DEFAULTS.seedling.night.low);
    expect(received[0].seedling?.night.high).toBe(VPD_OPTIMAL_STAGE_DEFAULTS.seedling.night.high);
  });
});

// ─── Reset ───────────────────────────────────────────────────────────────────

describe('VpdOptimalOverridesTable – reset', () => {
  it('emits overrides-change with empty dict on reset click', async () => {
    const el = createElement({
      veg: { day: { low: 0.6, high: 1.0 }, night: { low: 0.5, high: 0.9 } },
      seedling: { day: { low: 0.5, high: 0.9 }, night: { low: 0.5, high: 0.9 } },
    });
    await el.updateComplete;

    const received: VpdOptimalOverrides[] = [];
    el.addEventListener('overrides-change', (e: Event) => {
      received.push((e as CustomEvent<VpdOptimalOverrides>).detail);
    });

    const resetBtn = el.shadowRoot!.querySelector<HTMLButtonElement>('.reset-button')!;
    resetBtn.click();

    expect(received).toHaveLength(1);
    expect(received[0]).toEqual({});
  });

  it('displays default values after reset is applied', async () => {
    const el = createElement({
      veg: { day: { low: 0.6, high: 1.0 }, night: { low: 0.5, high: 0.9 } },
    });
    await el.updateComplete;

    el.overrides = {};
    await el.updateComplete;

    const rows = el.shadowRoot!.querySelectorAll('.stage-row');
    const inputs = rows[3].querySelectorAll<HTMLInputElement>('input[type="number"]');
    expect(parseFloat(inputs[0].value)).toBe(VPD_OPTIMAL_STAGE_DEFAULTS.veg.day.low);
    expect(parseFloat(inputs[1].value)).toBe(VPD_OPTIMAL_STAGE_DEFAULTS.veg.day.high);
    expect(parseFloat(inputs[2].value)).toBe(VPD_OPTIMAL_STAGE_DEFAULTS.veg.night.low);
    expect(parseFloat(inputs[3].value)).toBe(VPD_OPTIMAL_STAGE_DEFAULTS.veg.night.high);
  });
});
