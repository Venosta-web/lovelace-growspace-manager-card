/**
 * Irrigation Drain EC Tab Component — mount-and-assert test (ADR-0019).
 *
 * Mounts the dumb presentational element from a hand-built ViewModel — no state
 * machine, no slices, no host — and asserts both halves of its contract:
 * `{ vm-in }` (status banner + config + log form + readings table render from the
 * VM) and `{ intents-out }` (the semantic Tab Intent CustomEvents it emits). The
 * component holds no `@state()`.
 */
import { describe, it, expect } from 'vitest';
import { fixture, html } from '@open-wc/testing-helpers';
import { IrrigationDrainEcTab } from '../../../../../src/features/irrigation/components/irrigation-drain-ec-tab';
import type {
  DrainEcTabViewModel,
  DrainEcReadingRowVM,
} from '../../../../../src/features/irrigation/viewmodels/drain-ec-tab.viewmodel';
import type { DrainEcDraft } from '../../../../../src/dialogs/irrigation-dialog-sm';
import type { DrainECReading } from '../../../../../src/services/types';

// Stub md3 custom elements unavailable in the test environment. They are inert
// hosts; the component listens for `change` CustomEvents on them.
for (const tag of ['md3-number-input', 'md3-switch']) {
  if (!customElements.get(tag)) customElements.define(tag, class extends HTMLElement {});
}
if (!customElements.get('irrigation-drain-ec-tab')) {
  customElements.define('irrigation-drain-ec-tab', IrrigationDrainEcTab);
}

function draft(overrides: Partial<DrainEcDraft> = {}): DrainEcDraft {
  return {
    enabled: false,
    maxEcDelta: 1.0,
    targetRunoffPercent: 20,
    logFeedEc: 2.0,
    logDrainEc: 2.5,
    logFeedVolume: 0,
    logDrainVolume: 0,
    ...overrides,
  };
}

function reading(overrides: Partial<DrainECReading> = {}): DrainECReading {
  return {
    timestamp: '2026-01-01T12:00:00Z',
    feedEc: 2.0,
    drainEc: 2.5,
    feedVolumeMl: null,
    drainVolumeMl: null,
    ...overrides,
  } as DrainECReading;
}

function row(overrides: Partial<DrainEcReadingRowVM> = {}): DrainEcReadingRowVM {
  return {
    reading: reading(),
    delta: 0.5,
    overThreshold: false,
    runoffPercent: null,
    ...overrides,
  };
}

function makeVm(overrides: Partial<DrainEcTabViewModel> = {}): DrainEcTabViewModel {
  return {
    draft: draft(),
    sub: { kind: 'idle' },
    status: { color: 'rgba(255,255,255,0.3)', text: 'Monitoring disabled', lastReading: null },
    recent: [],
    totalReadings: 0,
    ...overrides,
  };
}

async function mount(vm: DrainEcTabViewModel): Promise<IrrigationDrainEcTab> {
  const el = await fixture<IrrigationDrainEcTab>(
    html`<irrigation-drain-ec-tab .vm=${vm}></irrigation-drain-ec-tab>`
  );
  await el.updateComplete;
  return el;
}

const norm = (s: string | null | undefined): string => (s ?? '').replace(/\s+/g, ' ').trim();

async function captureIntent(
  el: IrrigationDrainEcTab,
  type: string,
  act: () => void
): Promise<CustomEvent> {
  return await new Promise<CustomEvent>((resolve) => {
    el.addEventListener(type, (e) => resolve(e as CustomEvent), { once: true });
    act();
  });
}

describe('irrigation-drain-ec-tab', () => {
  it('holds no @state() of its own — only the `vm` reactive property', () => {
    const props = (
      IrrigationDrainEcTab as unknown as {
        elementProperties: Map<string, { state?: boolean }>;
      }
    ).elementProperties;
    const stateProps = [...props.entries()].filter(([, def]) => def.state === true);
    expect(stateProps).toEqual([]);
  });

  it('renders the status banner text from the VM', async () => {
    const el = await mount(
      makeVm({
        status: {
          color: '#f44336',
          text: 'Salt buildup alert — Δ0.50 mS/cm above threshold',
          lastReading: null,
        },
      })
    );
    expect(norm(el.shadowRoot!.textContent)).toContain('Salt buildup alert');
  });

  it('renders the empty readings state when recent is empty', async () => {
    const el = await mount(makeVm());
    expect(norm(el.shadowRoot!.textContent)).toContain('No readings logged yet');
  });

  it('renders a row per recent reading with the total count', async () => {
    const el = await mount(
      makeVm({
        recent: [
          row({ reading: reading({ feedEc: 2.0, drainEc: 2.6 }), delta: 0.6, runoffPercent: 20 }),
        ],
        totalReadings: 3,
      })
    );
    const text = norm(el.shadowRoot!.textContent);
    expect(text).toContain('3 total');
    expect(text).toContain('2.00'); // feedEc
    expect(text).toContain('2.60'); // drainEc
    expect(text).toContain('+0.60'); // delta
    expect(text).toContain('20.0%'); // runoff
  });

  it('emits drain-ec-draft-changed when the monitoring switch toggles', async () => {
    const el = await mount(makeVm());
    const sw = el.shadowRoot!.querySelector('md3-switch') as HTMLInputElement;
    sw.checked = true;
    const evt = await captureIntent(el, 'drain-ec-draft-changed', () =>
      sw.dispatchEvent(new Event('change'))
    );
    expect(evt.detail).toEqual({ partial: { enabled: true } });
  });

  it('emits drain-ec-draft-changed with the parsed Max EC Delta', async () => {
    const el = await mount(makeVm({ draft: draft({ enabled: true }) }));
    const input = el.shadowRoot!.querySelector('md3-number-input[label*="Max EC Delta"]')!;
    const evt = await captureIntent(el, 'drain-ec-draft-changed', () =>
      input.dispatchEvent(new CustomEvent('change', { detail: '1.2' }))
    );
    expect(evt.detail).toEqual({ partial: { maxEcDelta: 1.2 } });
  });

  it('emits drain-ec-draft-changed for the log Feed EC field', async () => {
    const el = await mount(makeVm());
    const input = el.shadowRoot!.querySelector('md3-number-input[label*="Feed EC"]')!;
    const evt = await captureIntent(el, 'drain-ec-draft-changed', () =>
      input.dispatchEvent(new CustomEvent('change', { detail: '3.0' }))
    );
    expect(evt.detail).toEqual({ partial: { logFeedEc: 3.0 } });
  });

  it('emits drain-ec-log-reading from the Log Reading button', async () => {
    const el = await mount(makeVm({ draft: draft({ logFeedEc: 2.0, logDrainEc: 2.5 }) }));
    const btn = Array.from(el.shadowRoot!.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Log Reading')
    )!;
    const evt = await captureIntent(el, 'drain-ec-log-reading', () => btn.click());
    expect(evt.type).toBe('drain-ec-log-reading');
  });

  it('disables the Log Reading button when feed/drain EC are not both > 0', async () => {
    const el = await mount(makeVm({ draft: draft({ logFeedEc: 0, logDrainEc: 2.5 }) }));
    const btn = Array.from(el.shadowRoot!.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Log Reading')
    ) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it('shows the Logging… label while the sub-state is logging', async () => {
    const el = await mount(
      makeVm({ sub: { kind: 'logging' }, draft: draft({ logFeedEc: 2.0, logDrainEc: 2.5 }) })
    );
    expect(norm(el.shadowRoot!.textContent)).toContain('Logging…');
  });
});
