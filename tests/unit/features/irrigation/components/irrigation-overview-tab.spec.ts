/**
 * Irrigation Overview Tab Component — mount-and-assert test (ADR-0019, AC4).
 *
 * Mounts the dumb presentational element from a hand-built ViewModel — no state
 * machine, no slices, no host. The component holds no `@state()` of its own;
 * its entire contract is `{ vm-in }` (overview is read-only, so no intents-out).
 */
import { describe, it, expect } from 'vitest';
import { fixture, html } from '@open-wc/testing-helpers';
import { IrrigationOverviewTab } from '../../../../../src/features/irrigation/components/irrigation-overview-tab';
import type {
  OverviewTabViewModel,
  DialogCapabilitiesLike,
} from './overview-vm-fixtures';
import { makeOverviewVm } from './overview-vm-fixtures';

// Stub the HA icon element that is unavailable in the test environment.
if (!customElements.get('ha-svg-icon')) {
  customElements.define('ha-svg-icon', class extends HTMLElement {});
}
if (!customElements.get('irrigation-overview-tab')) {
  customElements.define('irrigation-overview-tab', IrrigationOverviewTab);
}

async function mount(vm: OverviewTabViewModel): Promise<IrrigationOverviewTab> {
  const el = await fixture<IrrigationOverviewTab>(
    html`<irrigation-overview-tab .vm=${vm}></irrigation-overview-tab>`
  );
  await el.updateComplete;
  return el;
}

const norm = (s: string | null | undefined): string => (s ?? '').replace(/\s+/g, ' ').trim();

describe('irrigation-overview-tab', () => {
  it('holds no @state() of its own — only the `vm` reactive property', () => {
    const props = (IrrigationOverviewTab as unknown as {
      elementProperties: Map<string, { state?: boolean }>;
    }).elementProperties;
    const stateProps = [...props.entries()].filter(([, def]) => def.state === true);
    expect(stateProps).toEqual([]);
  });

  it('renders the data-unavailable placeholder when the VM is unavailable', async () => {
    const el = await mount(makeOverviewVm({ unavailable: true }));
    expect(norm(el.shadowRoot!.textContent)).toContain(
      'Crop steering data is currently unavailable'
    );
  });

  it('renders the signed score, declared and measured badges from the VM', async () => {
    const el = await mount(
      makeOverviewVm({ scoreText: '+0.60', declared: 'generative', measured: 'generative' })
    );
    const text = norm(el.shadowRoot!.textContent);
    expect(text).toContain('+0.60');
    expect(text).toContain('Declared: GENERATIVE');
    expect(text).toContain('Measured: GENERATIVE');
  });

  it('shows the on-target intent banner', async () => {
    const el = await mount(
      makeOverviewVm({ declared: 'generative', intentBanner: 'ontarget' })
    );
    expect(norm(el.shadowRoot!.textContent).toLowerCase()).toContain('on target');
  });

  it('renders the three metric cards driven by the VM', async () => {
    const el = await mount(
      makeOverviewVm({
        overnightDryback: { value: '12.5 pts', sub: 'peak 55.2% → trough 42.7%' },
        inCycleDryback: { value: '3.4 pts', sub: '6 shots today' },
        ecTrend: { locked: false, value: 'RISING', icon: 'M', color: 'red' },
      })
    );
    const root = el.shadowRoot!;
    expect(norm(root.querySelector('[data-metric="overnight-dryback"]')!.textContent)).toContain(
      '12.5 pts'
    );
    expect(norm(root.querySelector('[data-metric="incycle-dryback"]')!.textContent)).toContain(
      '6 shots today'
    );
    const ecCard = root.querySelector('[data-metric="ec-trend"]')!;
    expect(ecCard.classList.contains('cs-metric-locked')).toBe(false);
    expect(norm(ecCard.textContent)).toContain('RISING');
  });

  it('renders the EC-trend card visible-but-locked when the VM marks it locked', async () => {
    const el = await mount(
      makeOverviewVm({ ecTrend: { locked: true, value: 'Locked', icon: 'M', color: 'grey' } })
    );
    const card = el.shadowRoot!.querySelector('[data-metric="ec-trend"]')!;
    expect(card.classList.contains('cs-metric-locked')).toBe(true);
    expect(norm(card.textContent).toLowerCase()).toContain('pore');
  });

  it('renders the shot-composition rows and phase from the VM', async () => {
    const el = await mount(
      makeOverviewVm({
        shotComposition: {
          phaseLabel: 'P2',
          rows: [
            { label: 'Base', value: '10s' },
            { label: 'VWC factor', value: '×1.2' },
            { label: 'EC factor', value: '×0.9' },
            { label: 'Effective', value: '11s' },
          ],
        },
      })
    );
    const panel = el.shadowRoot!.querySelector('[data-metric="shot-composition"]')!;
    const text = norm(panel.textContent);
    expect(text).toContain('P2');
    expect(text).toContain('×1.2');
    expect(text).toContain('11s');
    // The Effective row is the running total.
    expect(panel.querySelector('.cs-shot-total')!.textContent).toContain('Effective');
  });

  it('omits the shot-composition panel when the VM has none', async () => {
    const el = await mount(makeOverviewVm({ shotComposition: null }));
    expect(el.shadowRoot!.querySelector('[data-metric="shot-composition"]')).toBeNull();
  });

  // Keep a reference so the imported type stays exercised by the test module.
  it('accepts a hand-built capabilities peer with no slices', async () => {
    const caps: DialogCapabilitiesLike = {
      hasPump: true,
      hasSoilMoisture: true,
      hasStrategy: true,
      cropSteeringGroupVisible: true,
      volumeModeCapable: false,
      sizingModeLabel: 'Seconds',
    };
    const el = await mount(makeOverviewVm({ caps }));
    expect(el.vm.caps.cropSteeringGroupVisible).toBe(true);
  });
});
