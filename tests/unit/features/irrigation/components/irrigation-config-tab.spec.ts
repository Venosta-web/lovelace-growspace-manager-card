/**
 * Irrigation Config Tab Component — mount-and-assert test (ADR-0019).
 *
 * Mounts the dumb presentational element from a hand-built ViewModel — no state
 * machine, no slices, no host — and asserts both halves of its contract:
 * `{ vm-in }` (pump selects + caps + behaviour + manual override render from the
 * VM, gated on `steeringEnabled` / `hasPump`) and `{ intents-out }` (the semantic
 * Tab Intent CustomEvents it emits). The component holds no `@state()`.
 */
import { describe, it, expect } from 'vitest';
import { fixture, html } from '@open-wc/testing-helpers';
import { IrrigationConfigTab } from '../../../../../src/features/irrigation/components/irrigation-config-tab';
import type {
  ConfigTabViewModel,
  PumpEntityOptionVM,
} from '../../../../../src/features/irrigation/viewmodels/config-tab.viewmodel';
import type { ConfigDraft } from '../../../../../src/dialogs/irrigation-dialog-sm';

// Stub md3 / shared custom elements unavailable in the test environment. They are
// inert hosts; the component listens for `change` CustomEvents on them.
for (const tag of ['md3-switch', 'gs-help-tooltip']) {
  if (!customElements.get(tag)) customElements.define(tag, class extends HTMLElement {});
}
if (!customElements.get('irrigation-config-tab')) {
  customElements.define('irrigation-config-tab', IrrigationConfigTab);
}

function draft(overrides: Partial<ConfigDraft> = {}): ConfigDraft {
  return {
    pumpFlowRateMlPerSec: 0,
    soilTriggerPercent: null,
    dailyVolumeCapLiters: null,
    maxCyclesPerDay: null,
    skipDuringDark: false,
    pauseOnLowTank: true,
    logToLogbook: true,
    autoAdvanceP1ToP2: false,
    autoAdvanceP2ToP3: false,
    haltOnRunoffEcThreshold: null,
    ...overrides,
  };
}

function makeVm(overrides: Partial<ConfigTabViewModel> = {}): ConfigTabViewModel {
  return {
    draft: draft(),
    irrigationPumpEntity: '',
    drainPumpEntity: '',
    pumpEntityOptions: [],
    steeringEnabled: false,
    hasPump: false,
    isRunningNow: false,
    isApplying: false,
    irrigationMethod: 'none',
    ...overrides,
  };
}

async function mount(vm: ConfigTabViewModel): Promise<IrrigationConfigTab> {
  const el = await fixture<IrrigationConfigTab>(
    html`<irrigation-config-tab .vm=${vm}></irrigation-config-tab>`
  );
  await el.updateComplete;
  return el;
}

const norm = (s: string | null | undefined): string => (s ?? '').replace(/\s+/g, ' ').trim();

async function captureIntent(
  el: IrrigationConfigTab,
  type: string,
  act: () => void
): Promise<CustomEvent> {
  return await new Promise<CustomEvent>((resolve) => {
    el.addEventListener(type, (e) => resolve(e as CustomEvent), { once: true });
    act();
  });
}

const OPTS: PumpEntityOptionVM[] = [
  { value: 'switch.pump1', label: 'Pump 1 (switch.pump1)' },
  { value: 'input_boolean.valve', label: 'Valve A (input_boolean.valve)' },
];

describe('irrigation-config-tab', () => {
  it('holds no @state() of its own — only the `vm` reactive property', () => {
    const props = (
      IrrigationConfigTab as unknown as {
        elementProperties: Map<string, { state?: boolean }>;
      }
    ).elementProperties;
    const stateProps = [...props.entries()].filter(([, def]) => def.state === true);
    expect(stateProps).toEqual([]);
  });

  it('always renders the Pump Configuration card with its entity options', async () => {
    const el = await mount(makeVm({ pumpEntityOptions: OPTS }));
    expect(norm(el.shadowRoot!.textContent)).toContain('Pump Configuration');
    const selects = el.shadowRoot!.querySelectorAll('select');
    expect(selects.length).toBe(2);
    const opts = Array.from(selects[0].querySelectorAll('option'))
      .map((o) => o.value)
      .filter((v) => v);
    expect(opts).toEqual(['switch.pump1', 'input_boolean.valve']);
  });

  it('renders and edits the pump flow rate required by Volume Mode', async () => {
    const el = await mount(makeVm({ draft: draft({ pumpFlowRateMlPerSec: 12.5 }) }));
    const input = el.shadowRoot!.querySelector(
      '[data-field="pump_flow_rate_ml_per_sec"]'
    ) as HTMLInputElement;
    expect(input.value).toBe('12.5');
    expect(input.min).toBe('0');
    expect(input.step).toBe('0.1');

    input.value = '15.5';
    const evt = await captureIntent(el, 'config-draft-changed', () =>
      input.dispatchEvent(new Event('change'))
    );
    expect(evt.detail).toEqual({ partial: { pumpFlowRateMlPerSec: 15.5 } });
  });

  it('hides the Safety Caps card when steering is disabled, shows it when enabled', async () => {
    expect(norm((await mount(makeVm())).shadowRoot!.textContent)).not.toContain('Safety Caps');
    const el = await mount(makeVm({ steeringEnabled: true }));
    expect(norm(el.shadowRoot!.textContent)).toContain('Safety Caps');
  });

  it('hides Behaviour + Manual Override when no pump is configured', async () => {
    const text = norm((await mount(makeVm({ hasPump: false }))).shadowRoot!.textContent);
    expect(text).not.toContain('Behaviour');
    expect(text).not.toContain('Manual Override');
  });

  it('shows Behaviour + Manual Override when a pump is configured', async () => {
    const text = norm((await mount(makeVm({ hasPump: true }))).shadowRoot!.textContent);
    expect(text).toContain('Behaviour');
    expect(text).toContain('Manual Override');
  });

  it('shows Skip During Dark only when steering is disabled', async () => {
    const off = norm((await mount(makeVm({ hasPump: true }))).shadowRoot!.textContent);
    expect(off).toContain('Skip During Dark');
    const on = norm(
      (await mount(makeVm({ hasPump: true, steeringEnabled: true }))).shadowRoot!.textContent
    );
    expect(on).not.toContain('Skip During Dark');
  });

  it('emits config-pump-changed for the irrigation pump select', async () => {
    const el = await mount(makeVm({ pumpEntityOptions: OPTS }));
    const select = el.shadowRoot!.querySelectorAll('select')[0];
    select.value = 'switch.pump1';
    const evt = await captureIntent(el, 'config-pump-changed', () =>
      select.dispatchEvent(new Event('change'))
    );
    expect(evt.detail).toEqual({ which: 'irrigation', value: 'switch.pump1' });
  });

  it('emits config-pump-changed for the drain pump select', async () => {
    const el = await mount(makeVm({ pumpEntityOptions: OPTS }));
    const select = el.shadowRoot!.querySelectorAll('select')[1];
    select.value = 'input_boolean.valve';
    const evt = await captureIntent(el, 'config-pump-changed', () =>
      select.dispatchEvent(new Event('change'))
    );
    expect(evt.detail).toEqual({ which: 'drain', value: 'input_boolean.valve' });
  });

  it('emits config-draft-changed with the parsed Daily Volume Cap', async () => {
    const el = await mount(makeVm({ steeringEnabled: true }));
    const input = el.shadowRoot!.querySelector(
      '[data-field="daily_volume_cap_liters"]'
    ) as HTMLInputElement;
    input.value = '12.5';
    const evt = await captureIntent(el, 'config-draft-changed', () =>
      input.dispatchEvent(new Event('change'))
    );
    expect(evt.detail).toEqual({ partial: { dailyVolumeCapLiters: 12.5 } });
  });

  it('emits config-draft-changed when the Pause on Tank Low switch toggles', async () => {
    const el = await mount(makeVm({ hasPump: true }));
    const sw = Array.from(el.shadowRoot!.querySelectorAll('md3-switch')).find((s) =>
      s.closest('.stub-row')?.textContent?.includes('Pause on Tank Low')
    ) as HTMLInputElement;
    sw.checked = false;
    const evt = await captureIntent(el, 'config-draft-changed', () =>
      sw.dispatchEvent(new Event('change'))
    );
    expect(evt.detail).toEqual({ partial: { pauseOnLowTank: false } });
  });

  it('emits config-run-now from the Run Now button', async () => {
    const el = await mount(makeVm({ hasPump: true }));
    const btn = Array.from(el.shadowRoot!.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Run Now')
    )!;
    const evt = await captureIntent(el, 'config-run-now', () => btn.click());
    expect(evt.type).toBe('config-run-now');
  });

  it('disables the Run Now button and shows Starting… while applying', async () => {
    const el = await mount(makeVm({ hasPump: true, isApplying: true, isRunningNow: true }));
    const btn = Array.from(el.shadowRoot!.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Starting')
    ) as HTMLButtonElement;
    expect(btn).toBeTruthy();
    expect(btn.disabled).toBe(true);
  });
});
