/**
 * Irrigation EC Ramp Tab Component — mount-and-assert test (ADR-0019).
 *
 * Mounts the dumb presentational element from a hand-built ViewModel — no state
 * machine, no slices, no host — and asserts both halves of its contract:
 * `{ vm-in }` (list + edit form render from the VM) and `{ intents-out }` (the
 * semantic Tab Intent CustomEvents it emits). The component holds no `@state()`.
 */
import { describe, it, expect } from 'vitest';
import { fixture, html } from '@open-wc/testing-helpers';
import { IrrigationEcRampTab } from '../../../../../src/features/irrigation/components/irrigation-ec-ramp-tab';
import type {
  EcRampTabViewModel,
  EcRampCurveRowVM,
} from '../../../../../src/features/irrigation/viewmodels/ec-ramp-tab.viewmodel';
import type { EcRampCurveDraft } from '../../../../../src/dialogs/irrigation-dialog-sm';

// Stub HA + md3 custom elements unavailable in the test environment. The md3
// stubs are inert hosts; the component listens for `change` CustomEvents on them.
for (const tag of ['ha-svg-icon', 'md3-text-input', 'md3-select', 'md3-number-input']) {
  if (!customElements.get(tag)) customElements.define(tag, class extends HTMLElement {});
}
if (!customElements.get('irrigation-ec-ramp-tab')) {
  customElements.define('irrigation-ec-ramp-tab', IrrigationEcRampTab);
}

function row(overrides: Partial<EcRampCurveRowVM> = {}): EcRampCurveRowVM {
  return { id: 'c1', name: 'Veg Ramp', summary: '2 points • Day 1–14', ...overrides };
}

const draft: EcRampCurveDraft = {
  id: 'c1',
  name: 'Veg Ramp',
  stage: 'veg',
  points: [{ day: 1, target_ec: 1.0 }],
};

function makeVm(overrides: Partial<EcRampTabViewModel> = {}): EcRampTabViewModel {
  return { curves: [row()], editing: null, error: null, ...overrides };
}

async function mount(vm: EcRampTabViewModel): Promise<IrrigationEcRampTab> {
  const el = await fixture<IrrigationEcRampTab>(
    html`<irrigation-ec-ramp-tab .vm=${vm}></irrigation-ec-ramp-tab>`
  );
  await el.updateComplete;
  return el;
}

const norm = (s: string | null | undefined): string => (s ?? '').replace(/\s+/g, ' ').trim();

async function captureIntent(
  el: IrrigationEcRampTab,
  type: string,
  act: () => void
): Promise<CustomEvent> {
  return await new Promise<CustomEvent>((resolve) => {
    el.addEventListener(type, (e) => resolve(e as CustomEvent), { once: true });
    act();
  });
}

describe('irrigation-ec-ramp-tab', () => {
  it('holds no @state() of its own — only the `vm` reactive property', () => {
    const props = (
      IrrigationEcRampTab as unknown as {
        elementProperties: Map<string, { state?: boolean }>;
      }
    ).elementProperties;
    const stateProps = [...props.entries()].filter(([, def]) => def.state === true);
    expect(stateProps).toEqual([]);
  });

  it('renders the empty state when the VM has no curves', async () => {
    const el = await mount(makeVm({ curves: [] }));
    expect(norm(el.shadowRoot!.textContent)).toContain('No EC ramp curves defined yet');
  });

  it('renders a row per curve with its summary', async () => {
    const el = await mount(
      makeVm({ curves: [row({ name: 'Veg Ramp' }), row({ id: 'c2', name: 'Bloom' })] })
    );
    const text = norm(el.shadowRoot!.textContent);
    expect(text).toContain('Veg Ramp');
    expect(text).toContain('Bloom');
    expect(text).toContain('2 points • Day 1–14');
  });

  it('emits ec-ramp-new-curve from the New Curve button', async () => {
    const el = await mount(makeVm());
    const btn = Array.from(el.shadowRoot!.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('New Curve')
    )!;
    const evt = await captureIntent(el, 'ec-ramp-new-curve', () => btn.click());
    expect(evt.type).toBe('ec-ramp-new-curve');
  });

  it('emits ec-ramp-edit-curve with the curve id from the Edit button', async () => {
    const el = await mount(makeVm({ curves: [row({ id: 'cX' })] }));
    const editBtn = el.shadowRoot!.querySelector('button[title="Edit"]') as HTMLButtonElement;
    const evt = await captureIntent(el, 'ec-ramp-edit-curve', () => editBtn.click());
    expect(evt.detail).toEqual({ id: 'cX' });
  });

  it('emits ec-ramp-delete-curve with the curve id from the Delete button', async () => {
    const el = await mount(makeVm({ curves: [row({ id: 'cY' })] }));
    const delBtn = el.shadowRoot!.querySelector('button[title="Delete"]') as HTMLButtonElement;
    const evt = await captureIntent(el, 'ec-ramp-delete-curve', () => delBtn.click());
    expect(evt.detail).toEqual({ id: 'cY' });
  });

  it('renders the edit form from vm.editing and surfaces the error bar', async () => {
    const el = await mount(
      makeVm({ editing: { draft, points: draft.points! }, error: 'Curve name is required' })
    );
    expect(el.shadowRoot!.querySelector('.preset-form')).toBeTruthy();
    expect(el.shadowRoot!.querySelector('md3-text-input')).toBeTruthy();
    expect(norm(el.shadowRoot!.textContent)).toContain('Curve name is required');
  });

  it('emits ec-ramp-curve-changed when the name input fires change', async () => {
    const el = await mount(makeVm({ editing: { draft, points: draft.points! } }));
    const nameInput = el.shadowRoot!.querySelector('md3-text-input')!;
    const evt = await captureIntent(el, 'ec-ramp-curve-changed', () =>
      nameInput.dispatchEvent(new CustomEvent('change', { detail: 'Bloom' }))
    );
    expect(evt.detail).toEqual({ partial: { name: 'Bloom' } });
  });

  it('emits ec-ramp-update-point with the parsed day on a point change', async () => {
    const el = await mount(makeVm({ editing: { draft, points: draft.points! } }));
    const dayInput = el.shadowRoot!.querySelector('md3-number-input')!;
    const evt = await captureIntent(el, 'ec-ramp-update-point', () =>
      dayInput.dispatchEvent(new CustomEvent('change', { detail: '5' }))
    );
    expect(evt.detail).toEqual({ index: 0, partial: { day: 5 } });
  });

  it('emits ec-ramp-add-point, ec-ramp-cancel-edit and ec-ramp-save-curve', async () => {
    const el = await mount(makeVm({ editing: { draft, points: draft.points! } }));
    const byText = (t: string) =>
      Array.from(el.shadowRoot!.querySelectorAll('button')).find((b) =>
        b.textContent?.includes(t)
      )!;

    const add = await captureIntent(el, 'ec-ramp-add-point', () => byText('Add Point').click());
    expect(add.type).toBe('ec-ramp-add-point');
    const back = await captureIntent(el, 'ec-ramp-cancel-edit', () => byText('Back').click());
    expect(back.type).toBe('ec-ramp-cancel-edit');
    const save = await captureIntent(el, 'ec-ramp-save-curve', () => byText('Save Curve').click());
    expect(save.type).toBe('ec-ramp-save-curve');
  });
});
