/**
 * Irrigation Substrate & EC Tab Component — mount-and-assert test (ADR-0019 + ADR-0017).
 *
 * Mounts the dumb element from a hand-built ViewModel — no SM, no slices, no host.
 * The crux: the two ADR-0017 write paths surface as DISTINCT intents — the
 * immediate-persist gestures (profile / sizing mode / EC modulation) vs. the
 * buffered gestures (pore band / per-stage ranges). The component holds no
 * `@state()`.
 */
import { describe, it, expect } from 'vitest';
import { fixture, html } from '@open-wc/testing-helpers';
import { IrrigationSubstrateEcTab } from '../../../../../src/features/irrigation/components/irrigation-substrate-ec-tab';
import type { SubstrateEcTabViewModel } from '../../../../../src/features/irrigation/viewmodels/substrate-ec-tab.viewmodel';

for (const tag of ['ha-svg-icon', 'md3-number-input', 'md3-switch']) {
  if (!customElements.get(tag)) customElements.define(tag, class extends HTMLElement {});
}
if (!customElements.get('irrigation-substrate-ec-tab')) {
  customElements.define('irrigation-substrate-ec-tab', IrrigationSubstrateEcTab);
}

function makeVm(overrides: Partial<SubstrateEcTabViewModel> = {}): SubstrateEcTabViewModel {
  return {
    profile: { mediaType: 'coco', litersPerPot: 5 },
    sizingMode: 'seconds',
    ecModulationEnabled: false,
    volumeModeCapable: true,
    sizingModeLabel: 'Seconds',
    hasPoreEcSensors: true,
    volumeLockHint: 'Set a pump flow rate to enable Volume Mode',
    poreEcMin: null,
    poreEcMax: null,
    poreBandInverted: false,
    ecTargetRanges: [
      { stage: 'seedling', minEc: 0.8, maxEc: 1.2 },
      { stage: 'veg', minEc: 1.5, maxEc: 2.0 },
    ],
    ...overrides,
  };
}

async function mount(vm: SubstrateEcTabViewModel): Promise<IrrigationSubstrateEcTab> {
  const el = await fixture<IrrigationSubstrateEcTab>(
    html`<irrigation-substrate-ec-tab .vm=${vm}></irrigation-substrate-ec-tab>`
  );
  await el.updateComplete;
  return el;
}

async function captureIntent(el: HTMLElement, type: string, act: () => void): Promise<CustomEvent> {
  return await new Promise<CustomEvent>((resolve) => {
    el.addEventListener(type, (e) => resolve(e as CustomEvent), { once: true });
    act();
  });
}

const norm = (s: string | null | undefined): string => (s ?? '').replace(/\s+/g, ' ').trim();

describe('irrigation-substrate-ec-tab', () => {
  it('holds no @state() of its own — only the `vm` reactive property', () => {
    const props = (IrrigationSubstrateEcTab as unknown as {
      elementProperties: Map<string, { state?: boolean }>;
    }).elementProperties;
    expect([...props.entries()].filter(([, d]) => d.state === true)).toEqual([]);
  });

  it('renders all four panels and the per-stage EC table from the VM', async () => {
    const el = await mount(makeVm());
    const text = norm(el.shadowRoot!.textContent);
    expect(text).toContain('Substrate Profile');
    expect(text).toContain('Shot Sizing Mode');
    expect(text).toContain('Pore EC Target Band');
    expect(text).toContain('EC Modulation');
    expect(text).toContain('Feed EC Targets per Stage');
    expect(el.shadowRoot!.querySelectorAll('.ec-target-row').length).toBe(2);
  });

  // ── Immediate-persist intents (ADR-0017: write straight to the strategy) ──

  it('emits substrate-ec-profile-changed with the media-type partial', async () => {
    const el = await mount(makeVm());
    const select = el.shadowRoot!.querySelector('select[data-field="substrate_media_type"]') as HTMLSelectElement;
    const evt = await captureIntent(el, 'substrate-ec-profile-changed', () => {
      select.value = 'rockwool';
      select.dispatchEvent(new Event('change'));
    });
    expect(evt.detail).toEqual({ partial: { mediaType: 'rockwool' } });
  });

  it('emits substrate-ec-sizing-mode-changed when Volume is clicked (and it is capable)', async () => {
    const el = await mount(makeVm({ sizingMode: 'seconds', volumeModeCapable: true }));
    const volumeBtn = el.shadowRoot!.querySelector('button[data-sizing-mode="volume"]') as HTMLButtonElement;
    const evt = await captureIntent(el, 'substrate-ec-sizing-mode-changed', () => volumeBtn.click());
    expect(evt.detail).toEqual({ mode: 'volume' });
  });

  it('disables the Volume button and shows the lock hint when not capable', async () => {
    const el = await mount(makeVm({ volumeModeCapable: false, volumeLockHint: 'Set liters per pot to enable Volume Mode' }));
    const volumeBtn = el.shadowRoot!.querySelector('button[data-sizing-mode="volume"]') as HTMLButtonElement;
    expect(volumeBtn.disabled).toBe(true);
    expect(norm(el.shadowRoot!.textContent)).toContain('Set liters per pot to enable Volume Mode');
  });

  it('emits substrate-ec-modulation-toggled when the switch changes (sensors present)', async () => {
    const el = await mount(makeVm({ hasPoreEcSensors: true }));
    const sw = el.shadowRoot!.querySelector('[data-field="ec_modulation_enabled"]') as HTMLElement & { checked: boolean };
    const evt = await captureIntent(el, 'substrate-ec-modulation-toggled', () => {
      (sw as unknown as { checked: boolean }).checked = true;
      sw.dispatchEvent(new Event('change'));
    });
    expect(evt.detail).toEqual({ enabled: true });
  });

  // ── Buffered intents (ADR-0017: SM draft → footer save-all) ──

  it('emits substrate-ec-pore-band-changed carrying both edges', async () => {
    const el = await mount(makeVm({ poreEcMin: null, poreEcMax: 3 }));
    const minInput = el.shadowRoot!.querySelector('[data-field="pore_ec_target_min"]') as HTMLElement;
    const evt = await captureIntent(el, 'substrate-ec-pore-band-changed', () =>
      minInput.dispatchEvent(new CustomEvent('change', { detail: '1.5' }))
    );
    expect(evt.detail).toEqual({ min: 1.5, max: 3 });
  });

  it('emits substrate-ec-targets-changed with the full updated ranges on a stage edit', async () => {
    const el = await mount(makeVm());
    const firstMin = el.shadowRoot!.querySelectorAll('.ec-target-row input[type="number"]')[0] as HTMLInputElement;
    const evt = await captureIntent(el, 'substrate-ec-targets-changed', () => {
      firstMin.value = '1.1';
      firstMin.dispatchEvent(new Event('input'));
    });
    expect(evt.detail.ranges[0]).toEqual({ stage: 'seedling', minEc: 1.1, maxEc: 1.2 });
    expect(evt.detail.ranges[1]).toEqual({ stage: 'veg', minEc: 1.5, maxEc: 2.0 });
  });

  it('shows the inverted-band error when poreBandInverted is set', async () => {
    const el = await mount(makeVm({ poreEcMin: 2.5, poreEcMax: 1.5, poreBandInverted: true }));
    expect(norm(el.shadowRoot!.textContent)).toContain('Min must be below max');
  });
});
