/**
 * Irrigation Tanks Tab Component — mount-and-assert test (ADR-0019, AC5).
 *
 * Mounts the dumb presentational element from a hand-built ViewModel — no state
 * machine, no slices, no host — and asserts both halves of its contract:
 * `{ vm-in }` (rows + edit form render from the VM) and `{ intents-out }` (the
 * semantic Tab Intent CustomEvents it emits on each gesture). The component
 * holds no `@state()` of its own.
 */
import { describe, it, expect } from 'vitest';
import { fixture, html } from '@open-wc/testing-helpers';
import { IrrigationTanksTab } from '../../../../../src/features/irrigation/components/irrigation-tanks-tab';
import type { TanksTabViewModel, TankRowVM } from '../../../../../src/features/irrigation/viewmodels/tanks-tab.viewmodel';
import type { TankDraft } from '../../../../../src/dialogs/irrigation-dialog-sm';

if (!customElements.get('ha-svg-icon')) {
  customElements.define('ha-svg-icon', class extends HTMLElement {});
}
if (!customElements.get('irrigation-tanks-tab')) {
  customElements.define('irrigation-tanks-tab', IrrigationTanksTab);
}

function row(overrides: Partial<TankRowVM> = {}): TankRowVM {
  return {
    index: 0,
    name: 'Tank A',
    isWarning: false,
    color: '#4caf50',
    barWidthPct: 73,
    fillLabel: '73%',
    subLine: '↓ Depleting · 10h left',
    ...overrides,
  };
}

const draft: TankDraft = { sensorEntity: 'sensor.tank_a', name: 'Tank A', volumeLiters: 200, warningLevel: 30 };

function makeVm(overrides: Partial<TanksTabViewModel> = {}): TanksTabViewModel {
  return { tanks: [row()], editing: null, ...overrides };
}

async function mount(vm: TanksTabViewModel): Promise<IrrigationTanksTab> {
  const el = await fixture<IrrigationTanksTab>(
    html`<irrigation-tanks-tab .vm=${vm}></irrigation-tanks-tab>`
  );
  await el.updateComplete;
  return el;
}

const norm = (s: string | null | undefined): string => (s ?? '').replace(/\s+/g, ' ').trim();

/** Capture the next CustomEvent of `type` while `act` runs the gesture. */
async function captureIntent(
  el: IrrigationTanksTab,
  type: string,
  act: () => void
): Promise<CustomEvent> {
  return await new Promise<CustomEvent>((resolve) => {
    el.addEventListener(type, (e) => resolve(e as CustomEvent), { once: true });
    act();
  });
}

describe('irrigation-tanks-tab', () => {
  it('holds no @state() of its own — only the `vm` reactive property', () => {
    const props = (IrrigationTanksTab as unknown as {
      elementProperties: Map<string, { state?: boolean }>;
    }).elementProperties;
    const stateProps = [...props.entries()].filter(([, def]) => def.state === true);
    expect(stateProps).toEqual([]);
  });

  it('renders the empty state when the VM has no tanks', async () => {
    const el = await mount(makeVm({ tanks: [] }));
    expect(norm(el.shadowRoot!.textContent)).toContain('No irrigation tanks configured');
  });

  it('renders a row per tank from the VM', async () => {
    const el = await mount(makeVm({ tanks: [row({ name: 'Tank A' }), row({ index: 1, name: 'Tank B' })] }));
    const text = norm(el.shadowRoot!.textContent);
    expect(text).toContain('Tank A');
    expect(text).toContain('Tank B');
    expect(text).toContain('73%');
    expect(text).toContain('↓ Depleting · 10h left');
  });

  it('emits edit-tank-requested with the row index on the edit button', async () => {
    const el = await mount(makeVm({ tanks: [row({ index: 2 })] }));
    const btn = el.shadowRoot!.querySelector<HTMLButtonElement>('.tank-edit-btn')!;
    const evt = await captureIntent(el, 'edit-tank-requested', () => btn.click());
    expect(evt.detail).toEqual({ index: 2 });
  });

  it('renders the edit form from vm.editing and lists the entity options', async () => {
    const el = await mount(makeVm({ editing: { index: 0, draft, entityOptions: ['sensor.tank_a', 'sensor.tank_b'] } }));
    expect(el.shadowRoot!.querySelector('.tank-edit-form')).toBeTruthy();
    const options = [...el.shadowRoot!.querySelectorAll('datalist option')].map((o) => o.getAttribute('value'));
    expect(options).toEqual(['sensor.tank_a', 'sensor.tank_b']);
  });

  it('emits tank-draft-changed with the field partial on input', async () => {
    const el = await mount(makeVm({ editing: { index: 0, draft, entityOptions: [] } }));
    const nameInput = el.shadowRoot!.querySelectorAll<HTMLInputElement>('.md3-input')[1];
    const evt = await captureIntent(el, 'tank-draft-changed', () => {
      nameInput.value = 'Renamed';
      nameInput.dispatchEvent(new Event('input'));
    });
    expect(evt.detail).toEqual({ partial: { name: 'Renamed' } });
  });

  it('emits tank-draft-changed with null volume when the field is cleared', async () => {
    const el = await mount(makeVm({ editing: { index: 0, draft, entityOptions: [] } }));
    const volInput = el.shadowRoot!.querySelectorAll<HTMLInputElement>('.md3-input[type="number"]')[0];
    const evt = await captureIntent(el, 'tank-draft-changed', () => {
      volInput.value = '';
      volInput.dispatchEvent(new Event('input'));
    });
    expect(evt.detail).toEqual({ partial: { volumeLiters: null } });
  });

  it('emits cancel-tank-edit and save-tank-requested from the form buttons', async () => {
    const el = await mount(makeVm({ editing: { index: 0, draft, entityOptions: [] } }));
    const cancelBtn = el.shadowRoot!.querySelector<HTMLButtonElement>('.button-group .tonal')!;
    const cancel = await captureIntent(el, 'cancel-tank-edit', () => cancelBtn.click());
    expect(cancel.type).toBe('cancel-tank-edit');

    const saveBtn = el.shadowRoot!.querySelector<HTMLButtonElement>('.button-group .primary')!;
    const save = await captureIntent(el, 'save-tank-requested', () => saveBtn.click());
    expect(save.type).toBe('save-tank-requested');
  });
});
