import { describe, it, expect, afterEach } from 'vitest';
import './stage-vpd-overrides-table';
import type { StageVpdOverridesTable, StageVpdOverrides } from './stage-vpd-overrides-table';
import { FAN_VPD_STAGE_DEFAULTS, FAN_VPD_STAGE_KEYS } from '../constants';

function createElement(overrides: StageVpdOverrides = {}): StageVpdOverridesTable {
  const el = document.createElement('stage-vpd-overrides-table') as StageVpdOverridesTable;
  el.overrides = overrides;
  document.body.appendChild(el);
  return el;
}

afterEach(() => {
  document.body.innerHTML = '';
});

// ─── Conditional visibility ───────────────────────────────────────────────────

describe('StageVpdOverridesTable – render', () => {
  it('renders a row for each of the 9 fan VPD stages', async () => {
    const el = createElement();
    await el.updateComplete;
    const rows = el.shadowRoot!.querySelectorAll('.stage-row');
    expect(rows.length).toBe(FAN_VPD_STAGE_KEYS.length);
  });

  it('renders a reset button', async () => {
    const el = createElement();
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('.reset-button')).not.toBeNull();
  });
});

// ─── Value pre-population ────────────────────────────────────────────────────

describe('StageVpdOverridesTable – pre-population', () => {
  it('shows built-in defaults when overrides is empty', async () => {
    const el = createElement({});
    await el.updateComplete;
    const inputs = el.shadowRoot!.querySelectorAll<HTMLInputElement>('input[type="number"]');
    // First row is seedling: day=0.6, night=0.6
    expect(parseFloat(inputs[0].value)).toBe(FAN_VPD_STAGE_DEFAULTS.seedling.day);
    expect(parseFloat(inputs[1].value)).toBe(FAN_VPD_STAGE_DEFAULTS.seedling.night);
  });

  it('shows override value when one is set for a stage', async () => {
    const el = createElement({ veg: { day: 0.9, night: 0.8 } });
    await el.updateComplete;
    const rows = el.shadowRoot!.querySelectorAll('.stage-row');
    // veg is the 4th stage (index 3)
    const vegInputs = rows[3].querySelectorAll<HTMLInputElement>('input[type="number"]');
    expect(parseFloat(vegInputs[0].value)).toBe(0.9);
    expect(parseFloat(vegInputs[1].value)).toBe(0.8);
  });

  it('falls back to default for stages not in overrides', async () => {
    const el = createElement({ veg: { day: 0.9, night: 0.8 } });
    await el.updateComplete;
    const rows = el.shadowRoot!.querySelectorAll('.stage-row');
    // seedling is index 0, not overridden
    const seedlingInputs = rows[0].querySelectorAll<HTMLInputElement>('input[type="number"]');
    expect(parseFloat(seedlingInputs[0].value)).toBe(FAN_VPD_STAGE_DEFAULTS.seedling.day);
  });
});

// ─── Sparse update behaviour ─────────────────────────────────────────────────

describe('StageVpdOverridesTable – sparse updates', () => {
  it('emits overrides-change with the edited stage entry on input change', async () => {
    const el = createElement({});
    await el.updateComplete;

    const received: StageVpdOverrides[] = [];
    el.addEventListener('overrides-change', (e: Event) => {
      received.push((e as CustomEvent<StageVpdOverrides>).detail);
    });

    const rows = el.shadowRoot!.querySelectorAll('.stage-row');
    const seedlingDayInput = rows[0].querySelectorAll<HTMLInputElement>('input[type="number"]')[0];
    seedlingDayInput.value = '0.75';
    seedlingDayInput.dispatchEvent(new Event('change'));

    expect(received).toHaveLength(1);
    expect(received[0].seedling?.day).toBe(0.75);
  });

  it('preserves existing overrides when a different stage is edited', async () => {
    const el = createElement({ veg: { day: 0.9, night: 0.8 } });
    await el.updateComplete;

    const received: StageVpdOverrides[] = [];
    el.addEventListener('overrides-change', (e: Event) => {
      received.push((e as CustomEvent<StageVpdOverrides>).detail);
    });

    const rows = el.shadowRoot!.querySelectorAll('.stage-row');
    // Edit seedling (index 0) day
    const seedlingDayInput = rows[0].querySelectorAll<HTMLInputElement>('input[type="number"]')[0];
    seedlingDayInput.value = '0.65';
    seedlingDayInput.dispatchEvent(new Event('change'));

    expect(received[0].veg).toEqual({ day: 0.9, night: 0.8 });
    expect(received[0].seedling?.day).toBe(0.65);
  });

  it('fires no event when clearing an input that had no prior override', async () => {
    const el = createElement({});
    await el.updateComplete;

    const received: StageVpdOverrides[] = [];
    el.addEventListener('overrides-change', (e: Event) => {
      received.push((e as CustomEvent<StageVpdOverrides>).detail);
    });

    const input = el.shadowRoot!.querySelector<HTMLInputElement>('input[type="number"]')!;
    input.value = '';
    input.dispatchEvent(new Event('change'));

    expect(received).toHaveLength(0);
  });

  it('removes the entire stage key when either slot is cleared', async () => {
    const el = createElement({ veg: { day: 0.9, night: 0.8 } });
    await el.updateComplete;

    const received: StageVpdOverrides[] = [];
    el.addEventListener('overrides-change', (e: Event) => {
      received.push((e as CustomEvent<StageVpdOverrides>).detail);
    });

    const rows = el.shadowRoot!.querySelectorAll('.stage-row');
    const vegDayInput = rows[3].querySelectorAll<HTMLInputElement>('input[type="number"]')[0];
    vegDayInput.value = '';
    vegDayInput.dispatchEvent(new Event('change'));

    expect(received).toHaveLength(1);
    expect(received[0]).not.toHaveProperty('veg');
  });
});

// ─── Reset functionality ──────────────────────────────────────────────────────

describe('StageVpdOverridesTable – reset', () => {
  it('emits overrides-change with empty dict on reset click', async () => {
    const el = createElement({ veg: { day: 0.9, night: 0.8 }, seedling: { day: 0.7, night: 0.7 } });
    await el.updateComplete;

    const received: StageVpdOverrides[] = [];
    el.addEventListener('overrides-change', (e: Event) => {
      received.push((e as CustomEvent<StageVpdOverrides>).detail);
    });

    const resetBtn = el.shadowRoot!.querySelector<HTMLButtonElement>('.reset-button')!;
    resetBtn.click();

    expect(received).toHaveLength(1);
    expect(received[0]).toEqual({});
  });

  it('displays default values after reset is applied', async () => {
    const el = createElement({ veg: { day: 0.9, night: 0.8 } });
    await el.updateComplete;

    // Simulate parent applying the reset by setting overrides to {}
    el.overrides = {};
    await el.updateComplete;

    const rows = el.shadowRoot!.querySelectorAll('.stage-row');
    const vegInputs = rows[3].querySelectorAll<HTMLInputElement>('input[type="number"]');
    expect(parseFloat(vegInputs[0].value)).toBe(FAN_VPD_STAGE_DEFAULTS.veg.day);
    expect(parseFloat(vegInputs[1].value)).toBe(FAN_VPD_STAGE_DEFAULTS.veg.night);
  });
});
