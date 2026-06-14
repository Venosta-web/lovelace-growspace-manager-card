/**
 * Irrigation Schedules Tab Component — mount-and-assert test (ADR-0019).
 *
 * Mounts the dumb presentational element from a hand-built ViewModel — no state
 * machine, no slices, no host — and asserts both halves of its contract:
 * `{ vm-in }` (manual sections + crop-steering panel render from the VM) and
 * `{ intents-out }` (the semantic Tab Intent CustomEvents it emits). The
 * component holds no `@state()`.
 */
import { describe, it, expect } from 'vitest';
import { fixture, html } from '@open-wc/testing-helpers';
import { IrrigationSchedulesTab } from '../../../../../src/features/irrigation/components/irrigation-schedules-tab';
import type {
  SchedulesTabViewModel,
  ScheduleSectionVM,
  CropSteeringScheduleVM,
} from '../../../../../src/features/irrigation/viewmodels/schedules-tab.viewmodel';

// Stub HA + md3 + the shared chart custom elements unavailable in the test env.
for (const tag of [
  'ha-svg-icon',
  'md3-text-input',
  'md3-number-input',
  'gs-help-tooltip',
  'crop-steering-day-chart',
]) {
  if (!customElements.get(tag)) customElements.define(tag, class extends HTMLElement {});
}
if (!customElements.get('irrigation-schedules-tab')) {
  customElements.define('irrigation-schedules-tab', IrrigationSchedulesTab);
}

function irrigationSection(overrides: Partial<ScheduleSectionVM> = {}): ScheduleSectionVM {
  return {
    type: 'irrigation',
    title: 'Irrigation Schedule',
    color: '#2196F3',
    defaultDuration: 60,
    times: [{ timeStr: '08:00:00', startMin: 480, durationSeconds: 30 }],
    ...overrides,
  };
}

function drainSection(overrides: Partial<ScheduleSectionVM> = {}): ScheduleSectionVM {
  return {
    type: 'drain',
    title: 'Drain Schedule',
    color: '#FF9800',
    defaultDuration: 90,
    times: [{ timeStr: '09:00:00', startMin: 540, durationSeconds: 120 }],
    ...overrides,
  };
}

function cropSteeringPanel(overrides: Partial<CropSteeringScheduleVM> = {}): CropSteeringScheduleVM {
  return {
    configured: true,
    shotCount: 9,
    lightHours: 12,
    lightsOnLabel: '06:00',
    lightsOffLabel: '18:00',
    phases: [
      { id: 'p1', label: 'P1', name: 'Saturation', color: '#4CAF50', target: 'Reach FC', shotCount: null },
      { id: 'p2', label: 'P2', name: 'Maintenance', color: '#2196F3', target: 'Runoff target', shotCount: 9 },
    ],
    hasPoreEc: true,
    hasBulkEc: true,
    ...overrides,
  };
}

function makeVm(overrides: Partial<SchedulesTabViewModel> = {}): SchedulesTabViewModel {
  return {
    isCropSteering: false,
    sub: { kind: 'idle' },
    irrigationSection: irrigationSection(),
    drainSection: null,
    cropSteering: null,
    device: undefined,
    ...overrides,
  };
}

async function mount(vm: SchedulesTabViewModel): Promise<IrrigationSchedulesTab> {
  const el = await fixture<IrrigationSchedulesTab>(
    html`<irrigation-schedules-tab .vm=${vm}></irrigation-schedules-tab>`
  );
  await el.updateComplete;
  return el;
}

const norm = (s: string | null | undefined): string => (s ?? '').replace(/\s+/g, ' ').trim();

async function captureIntent(
  el: IrrigationSchedulesTab,
  type: string,
  act: () => void
): Promise<CustomEvent> {
  return await new Promise<CustomEvent>((resolve) => {
    el.addEventListener(type, (e) => resolve(e as CustomEvent), { once: true });
    act();
  });
}

const byText = (el: IrrigationSchedulesTab, t: string): HTMLButtonElement =>
  Array.from(el.shadowRoot!.querySelectorAll('button')).find((b) =>
    b.textContent?.includes(t)
  ) as HTMLButtonElement;

describe('irrigation-schedules-tab', () => {
  it('holds no @state() of its own — only the `vm` reactive property', () => {
    const props = (IrrigationSchedulesTab as unknown as {
      elementProperties: Map<string, { state?: boolean }>;
    }).elementProperties;
    const stateProps = [...props.entries()].filter(([, def]) => def.state === true);
    expect(stateProps).toEqual([]);
  });

  it('renders the manual irrigation section and its time chip', async () => {
    const el = await mount(makeVm());
    const text = norm(el.shadowRoot!.textContent);
    expect(text).toContain('Irrigation Schedule');
    expect(text).toContain('08:00');
    // Manual mode shows the "enable crop steering" nudge.
    expect(text).toContain('Enable Crop Steering');
  });

  it('renders the drain section when present', async () => {
    const el = await mount(makeVm({ drainSection: drainSection() }));
    expect(norm(el.shadowRoot!.textContent)).toContain('Drain Schedule');
  });

  it('emits schedules-begin-add from the ADD TIME button', async () => {
    const el = await mount(makeVm());
    const evt = await captureIntent(el, 'schedules-begin-add', () =>
      byText(el, 'ADD TIME').click()
    );
    expect(evt.detail).toEqual({ type: 'irrigation', time: '12:00', duration: 60 });
  });

  it('emits schedules-begin-edit from an event block click', async () => {
    const el = await mount(makeVm());
    const block = el.shadowRoot!.querySelector('.timeline-event') as HTMLElement;
    const evt = await captureIntent(el, 'schedules-begin-edit', () => block.click());
    expect(evt.detail).toEqual({ type: 'irrigation', timeStr: '08:00:00', duration: 30 });
  });

  it('emits schedules-remove-time from the chip × button', async () => {
    const el = await mount(makeVm());
    const removeBtn = el.shadowRoot!.querySelector('.chip-remove') as HTMLButtonElement;
    const evt = await captureIntent(el, 'schedules-remove-time', () => removeBtn.click());
    expect(evt.detail).toEqual({ type: 'irrigation', timeStr: '08:00:00' });
  });

  it('emits schedules-open-steering from the nudge link', async () => {
    const el = await mount(makeVm());
    const link = el.shadowRoot!.querySelector('a') as HTMLAnchorElement;
    const evt = await captureIntent(el, 'schedules-open-steering', () => link.click());
    expect(evt.type).toBe('schedules-open-steering');
  });

  it('renders the add overlay and emits update/save/cancel intents', async () => {
    const el = await mount(
      makeVm({ sub: { kind: 'adding-irrigation', time: '12:00', duration: 60 } })
    );
    expect(el.shadowRoot!.querySelector('.overlay-backdrop')).toBeTruthy();

    // The handler reads `(e.target).value || e.detail` (verbatim from the former
    // inline render): a real md3-text-input updates its `.value` before firing
    // change, so mirror that on the stub.
    const timeInput = el.shadowRoot!.querySelector('md3-text-input') as HTMLInputElement;
    timeInput.value = '14:30';
    const upd = await captureIntent(el, 'schedules-update-add', () =>
      timeInput.dispatchEvent(new CustomEvent('change', { detail: '14:30' }))
    );
    expect(upd.detail).toEqual({ type: 'irrigation', time: '14:30' });

    const save = await captureIntent(el, 'schedules-save-add', () => byText(el, 'Add Schedule').click());
    expect(save.detail).toEqual({ type: 'irrigation', time: '12:00', duration: 60 });

    const cancel = await captureIntent(el, 'schedules-cancel-inline', () => byText(el, 'Cancel').click());
    expect(cancel.type).toBe('schedules-cancel-inline');
  });

  it('renders the edit overlay and emits save/delete intents', async () => {
    const el = await mount(
      makeVm({
        sub: {
          kind: 'editing-irrigation',
          originalTime: '08:00:00',
          originalDuration: 30,
          time: '08:00',
          duration: 30,
        },
      })
    );
    const save = await captureIntent(el, 'schedules-save-edit', () =>
      byText(el, 'Save Changes').click()
    );
    expect(save.detail).toEqual({ type: 'irrigation' });

    const del = await captureIntent(el, 'schedules-delete-from-edit', () =>
      byText(el, 'Delete').click()
    );
    expect(del.detail).toEqual({ type: 'irrigation' });
  });

  it('renders the crop-steering panel hosting the chart in crop-steering mode', async () => {
    const el = await mount(
      makeVm({
        isCropSteering: true,
        irrigationSection: null,
        cropSteering: cropSteeringPanel(),
      })
    );
    const text = norm(el.shadowRoot!.textContent);
    expect(text).toContain('Crop Steering Schedule');
    expect(text).toContain('9 shots');
    expect(text).toContain('Crop Steering is active');
    expect(el.shadowRoot!.querySelector('crop-steering-day-chart')).toBeTruthy();
    // No irrigation section in crop-steering mode.
    expect(text).not.toContain('Enable Crop Steering');
    // The read-only crop-steering panel has no ADD TIME button.
    const addTime = Array.from(el.shadowRoot!.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('ADD TIME')
    );
    expect(addTime).toBeUndefined();
  });

  it('shows the crop-steering empty state when not configured', async () => {
    const el = await mount(
      makeVm({
        isCropSteering: true,
        irrigationSection: null,
        cropSteering: cropSteeringPanel({ configured: false }),
      })
    );
    expect(norm(el.shadowRoot!.textContent)).toContain(
      'No strategy configured — set Lights On Time'
    );
  });

  it('flags missing pore/bulk EC sensors in the legend', async () => {
    const el = await mount(
      makeVm({
        isCropSteering: true,
        irrigationSection: null,
        cropSteering: cropSteeringPanel({ hasPoreEc: false, hasBulkEc: false }),
      })
    );
    const text = norm(el.shadowRoot!.textContent);
    expect(text).toContain('Pore EC not configured');
    expect(text).toContain('Bulk EC not configured');
  });
});
