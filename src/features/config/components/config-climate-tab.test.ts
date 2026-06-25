import { describe, it, expect, afterEach } from 'vitest';
import './config-climate-tab';
import type { ConfigClimateTab } from './config-climate-tab';
import { createInitialSM } from '../../../dialogs/config-dialog-sm';
import type { ClimateTabViewModel } from '../viewmodels/climate-tab.viewmodel';
import type { EnvironmentDraft } from '../../../dialogs/config-dialog-sm';

const defaults = createInitialSM().environmentDraft;

function makeVm(over: Partial<ClimateTabViewModel> = {}): ClimateTabViewModel {
  return {
    control: {
      exhaustFanEntities: [],
      exhaustFanOptions: [],
      circulationFanEntities: [],
      circulationFanOptions: [],
      stressThreshold: 0.7,
      moldThreshold: 0.85,
      canRemoveEnvironment: true,
      ...over.control,
    },
    fan: {
      config: defaults.circulationFanConfig,
      disabled: false,
      mode: 'vpd',
      showStageVpd: true,
      showStageVpdTable: false,
      vpdTargetLabel: 'VPD Target (kPa)',
      vpdTargetDimmed: false,
      showTempOverride: true,
      tempOverrideExpanded: false,
      showWind: false,
      ...over.fan,
    },
    exhaust: {
      config: defaults.exhaustFanConfig,
      disabled: false,
      showStageVpdTable: false,
      vpdTargetLabel: 'VPD Target (kPa)',
      vpdTargetDimmed: false,
      criticalTempExpanded: false,
      ...over.exhaust,
    },
  };
}

async function mount(vm: ClimateTabViewModel): Promise<ConfigClimateTab> {
  const el = document.createElement('config-climate-tab') as ConfigClimateTab;
  el.vm = vm;
  document.body.appendChild(el);
  await el.updateComplete;
  return el;
}

function listenPartials(el: HTMLElement): Array<Partial<EnvironmentDraft>> {
  const received: Array<Partial<EnvironmentDraft>> = [];
  el.addEventListener('env-draft-changed', (e: Event) =>
    received.push((e as CustomEvent).detail.partial)
  );
  return received;
}

function listen<T = unknown>(el: HTMLElement, type: string): T[] {
  const received: T[] = [];
  el.addEventListener(type, (e: Event) => received.push((e as CustomEvent).detail as T));
  return received;
}

function checkbox(el: ConfigClimateTab, labelText: string): HTMLInputElement {
  const label = [...el.shadowRoot!.querySelectorAll('label.checkbox-label')].find((l) =>
    l.textContent?.includes(labelText)
  )!;
  return label.querySelector('input[type="checkbox"]')!;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('ConfigClimateTab — render', () => {
  it('renders the three section headers', async () => {
    const el = await mount(makeVm());
    const headers = [...el.shadowRoot!.querySelectorAll('h3')].map((h) => h.textContent);
    expect(headers).toEqual(['Climate Control', 'Fan Controller', 'Exhaust Fan Controller']);
  });

  it('shows the stage-vpd table only when the fan VM says so', async () => {
    const without = await mount(makeVm());
    expect(without.shadowRoot!.querySelector('stage-vpd-overrides-table')).toBeNull();
    document.body.innerHTML = '';
    const withTable = await mount(makeVm({ fan: { ...makeVm().fan, showStageVpdTable: true } }));
    expect(withTable.shadowRoot!.querySelector('stage-vpd-overrides-table')).not.toBeNull();
  });

  it('uses the Fallback label the VM provides', async () => {
    const el = await mount(makeVm({ fan: { ...makeVm().fan, vpdTargetLabel: 'Fallback VPD Target (kPa)' } }));
    const labels = [...el.shadowRoot!.querySelectorAll('md3-number-input')].map((n) => n.getAttribute('label'));
    expect(labels).toContain('Fallback VPD Target (kPa)');
  });
});

describe('ConfigClimateTab — intents out', () => {
  it('forwards the circulation fan enabled toggle as a fan-config partial', async () => {
    const el = await mount(makeVm());
    const received = listen<{ partial: Record<string, unknown> }>(el, 'fan-config-changed');
    checkbox(el, 'Enabled').checked = false; // first Enabled is the fan controller's
    checkbox(el, 'Enabled').dispatchEvent(new Event('change'));
    expect(received).toEqual([{ partial: { enabled: false } }]);
  });

  it('forwards the regulation mode change as a fan-config partial', async () => {
    const el = await mount(makeVm());
    const received = listen<{ partial: Record<string, unknown> }>(el, 'fan-config-changed');
    const select = el.shadowRoot!.querySelector('md3-select')!;
    select.dispatchEvent(new CustomEvent('change', { detail: 'humidity', bubbles: true, composed: true }));
    expect(received).toEqual([{ partial: { regulation_mode: 'humidity' } }]);
  });

  it('forwards an exhaust-config edit as an exhaust-config partial', async () => {
    const el = await mount(makeVm());
    const received = listen<{ partial: Record<string, unknown> }>(el, 'exhaust-config-changed');
    // The exhaust panel's Enabled is the second checkbox with that label.
    const exhaustEnabled = [...el.shadowRoot!.querySelectorAll('label.checkbox-label')]
      .filter((l) => l.textContent?.includes('Enabled'))[1]
      .querySelector('input[type="checkbox"]') as HTMLInputElement;
    exhaustEnabled.checked = true;
    exhaustEnabled.dispatchEvent(new Event('change'));
    expect(received).toEqual([{ partial: { enabled: true } }]);
  });

  it('emits the two expander toggle intents', async () => {
    const el = await mount(makeVm());
    let fanToggle = 0;
    let exhaustToggle = 0;
    el.addEventListener('toggle-fan-temp-override', () => fanToggle++);
    el.addEventListener('toggle-exhaust-critical-temp', () => exhaustToggle++);
    const btn = (t: string) =>
      [...el.shadowRoot!.querySelectorAll('button')].find((b) => b.textContent?.includes(t))!;
    btn('Temperature Override').click();
    btn('Critical Temperature').click();
    expect(fanToggle).toBe(1);
    expect(exhaustToggle).toBe(1);
  });

  it('emits remove-environment-requested', async () => {
    const el = await mount(makeVm());
    let fired = 0;
    el.addEventListener('remove-environment-requested', () => fired++);
    [...el.shadowRoot!.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Remove Environment')!.click();
    expect(fired).toBe(1);
  });

  it('emits a top-level threshold change', async () => {
    const el = await mount(makeVm());
    const received = listenPartials(el);
    const stress = [...el.shadowRoot!.querySelectorAll('md3-number-input')].find(
      (n) => n.getAttribute('label') === 'Stress Threshold %'
    )!;
    stress.dispatchEvent(new CustomEvent('change', { detail: '0.9', bubbles: true, composed: true }));
    expect(received).toEqual([{ stressThreshold: 0.9 }]);
  });
});
