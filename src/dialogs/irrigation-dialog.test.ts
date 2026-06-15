import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { fixture, html } from '@open-wc/testing-helpers';
import type { LitElement } from 'lit';
import { atom } from 'nanostores';
import { transition } from './irrigation-dialog-sm';
import { cropSteeringHistory$, irrigationConfigs$, setTankLevels, tankLevels$ } from '../slices/irrigation';
import { createGrowspaceDevice } from '../services/types';
import type { IrrigationDialog } from './irrigation-dialog';
import './irrigation-dialog';

// ADR-0019: the Tanks tab Save effect persists via the Growspace slice's
// configureEnvironment. Mock it so the inline-edit test can assert the call.
vi.mock('../slices/growspace', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../slices/growspace')>();
  return { ...actual, configureEnvironment: vi.fn().mockResolvedValue(undefined) };
});
import { configureEnvironment } from '../slices/growspace';

afterEach(() => {
  document.body.innerHTML = '';
  cropSteeringHistory$.set(new Map());
  irrigationConfigs$.set(new Map());
  tankLevels$.set(new Map());
  vi.restoreAllMocks();
});

// Stub any HA-specific custom elements that are not available in the test environment.
const stubTags = ['ha-dialog', 'ha-svg-icon', 'ha-icon', 'gs-dialog'];
for (const tag of stubTags) {
  if (!customElements.get(tag)) {
    customElements.define(tag, class extends HTMLElement {});
  }
}

function makeDevice(overrides: Partial<Parameters<typeof createGrowspaceDevice>[0]> = {}) {
  return createGrowspaceDevice({ deviceId: 'gs1', name: 'Tent 1', ...overrides });
}

// Footer cycle status, Run Now, Behaviour, and Manual Override are only shown
// once an irrigation or drain pump is configured.
function withPump(overrides: Partial<Parameters<typeof createGrowspaceDevice>[0]> = {}) {
  return makeDevice({
    ...overrides,
    irrigationConfig: {
      irrigationTimes: [],
      drainTimes: [],
      irrigationPumpEntity: 'switch.pump',
      ...overrides.irrigationConfig,
    },
  });
}

// Collapse all whitespace runs to a single space for text-content assertions.
function normalize(s: string | null | undefined): string {
  return (s ?? '').replace(/\s+/g, ' ').trim();
}

// ---------------------------------------------------------------------------
// Footer meta – timestamps
// ---------------------------------------------------------------------------

describe('IrrigationDialog – footer meta timestamps', () => {
  it('shows a formatted last-cycle time when lastCycleTimestamp is set', async () => {
    const device = withPump({ lastCycleTimestamp: '2026-05-23T14:30:00.000Z' });
    const el = await fixture<IrrigationDialog>(html`
      <irrigation-dialog .open=${true} .device=${device} growspaceName="Tent 1"></irrigation-dialog>
    `);
    await el.updateComplete;

    const meta = el.shadowRoot!.querySelector('.dlg-footer-meta');
    const text = normalize(meta?.textContent);
    // Formatted timestamp includes HH:MM, so a colon should appear after "Last cycle"
    expect(text).toMatch(/Last cycle.+:/);
  });

  it('shows "—" for last-cycle when lastCycleTimestamp is null', async () => {
    const device = withPump({ lastCycleTimestamp: null });
    const el = await fixture<IrrigationDialog>(html`
      <irrigation-dialog .open=${true} .device=${device} growspaceName="Tent 1"></irrigation-dialog>
    `);
    await el.updateComplete;

    const meta = el.shadowRoot!.querySelector('.dlg-footer-meta');
    expect(normalize(meta?.textContent)).toContain('Last cycle —');
  });

  it('shows a formatted next-cycle time when nextScheduledCycle is set', async () => {
    const device = withPump({ nextScheduledCycle: '2026-05-24T06:00:00.000Z' });
    const el = await fixture<IrrigationDialog>(html`
      <irrigation-dialog .open=${true} .device=${device} growspaceName="Tent 1"></irrigation-dialog>
    `);
    await el.updateComplete;

    const meta = el.shadowRoot!.querySelector('.dlg-footer-meta');
    const text = normalize(meta?.textContent);
    expect(text).toMatch(/Next.+:/);
  });

  it('shows "—" for next-cycle when nextScheduledCycle is null', async () => {
    const device = withPump({ nextScheduledCycle: null });
    const el = await fixture<IrrigationDialog>(html`
      <irrigation-dialog .open=${true} .device=${device} growspaceName="Tent 1"></irrigation-dialog>
    `);
    await el.updateComplete;

    const meta = el.shadowRoot!.querySelector('.dlg-footer-meta');
    expect(normalize(meta?.textContent)).toContain('Next —');
  });

  it('hides the footer meta block when no irrigation or drain pump is configured', async () => {
    const device = makeDevice();
    const el = await fixture<IrrigationDialog>(html`
      <irrigation-dialog .open=${true} .device=${device} growspaceName="Tent 1"></irrigation-dialog>
    `);
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector('.dlg-footer-meta')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Footer Run Now button
// ---------------------------------------------------------------------------

describe('IrrigationDialog – Run Now button', () => {
  it('clicking Run Now triggers saving state then clears it', async () => {
    const device = withPump();

    const el = await fixture<IrrigationDialog>(html`
      <irrigation-dialog .open=${true} .device=${device}></irrigation-dialog>
    `);
    await el.updateComplete;

    const btn = Array.from(el.shadowRoot!.querySelectorAll('button.md3-button')).find(
      (b) => b.textContent?.trim() === 'Run Now'
    ) as HTMLButtonElement | undefined;

    expect(btn).toBeTruthy();
    expect(btn!.disabled).toBe(false);

    // Click and absorb the service error (hass not set in unit tests).
    // The mutation-errors test file verifies the actual callService dispatch.
    btn!.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await el.updateComplete;

    // After the attempt (success or failure), saving state is cleared.
    expect((el as any)._sm.status.kind).not.toBe('run_now_saving');
  });

  it('shows "Starting…" and disables the button while the request is in flight', async () => {
    const device = withPump();
    const el = await fixture<IrrigationDialog>(html`
      <irrigation-dialog .open=${true} .device=${device}></irrigation-dialog>
    `);

    // ADR-0015: run-now in-flight is now the `applying { action: 'run-now' }`
    // status owned by the MutationRunController.
    (el as any)._sm = transition((el as any)._sm, {
      type: 'SaveRequested',
      action: 'run-now',
      params: null,
    });
    await el.updateComplete;

    const btn = Array.from(el.shadowRoot!.querySelectorAll('button.md3-button')).find((b) =>
      b.textContent?.includes('Starting')
    ) as HTMLButtonElement | undefined;

    expect(btn).toBeTruthy();
    expect(btn!.disabled).toBe(true);
  });

  it('hides the footer Run Now button when no irrigation or drain pump is configured', async () => {
    const device = makeDevice();
    const el = await fixture<IrrigationDialog>(html`
      <irrigation-dialog .open=${true} .device=${device}></irrigation-dialog>
    `);
    await el.updateComplete;

    const btn = Array.from(el.shadowRoot!.querySelectorAll('button.md3-button')).find(
      (b) => b.textContent?.trim() === 'Run Now'
    );

    expect(btn).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Config tab: Behaviour / Manual Override panels (gated on pump configuration)
// ---------------------------------------------------------------------------

describe('IrrigationDialog – Config tab: pump-gated panels', () => {
  // The Config tab is decomposed (ADR-0019): its panels render in the child
  // <irrigation-config-tab> shadow, so pierce it. When no pump is configured the
  // Config tab is still shown but the child renders only the Pump Configuration
  // card (Behaviour / Manual Override are gated off), so an absent child = no panels.
  function configHeadings(el: IrrigationDialog) {
    const child = el.shadowRoot!.querySelector('irrigation-config-tab');
    if (!child?.shadowRoot) return [];
    return Array.from(child.shadowRoot.querySelectorAll('.detail-card h3')).map((h) =>
      normalize(h.textContent)
    );
  }

  it('shows the Behaviour and Manual Override panels when a pump is configured', async () => {
    const device = withPump();
    const el = await fixture<IrrigationDialog>(html`
      <irrigation-dialog .open=${true} .device=${device} .initialTab=${'config'}></irrigation-dialog>
    `);
    await el.updateComplete;

    const headings = configHeadings(el);
    expect(headings).toContain('Behaviour');
    expect(headings).toContain('Manual Override');
  });

  it('hides the Behaviour and Manual Override panels when no pump is configured', async () => {
    const device = makeDevice();
    const el = await fixture<IrrigationDialog>(html`
      <irrigation-dialog .open=${true} .device=${device}></irrigation-dialog>
    `);
    await el.updateComplete;

    const headings = configHeadings(el);
    expect(headings).not.toContain('Behaviour');
    expect(headings).not.toContain('Manual Override');
  });

  it('shows a setup hint covering Schedules, manual run controls, and behaviour settings when no pump is configured', async () => {
    const device = makeDevice();
    const el = await fixture<IrrigationDialog>(html`
      <irrigation-dialog .open=${true} .device=${device}></irrigation-dialog>
    `);
    await el.updateComplete;

    const hints = Array.from(el.shadowRoot!.querySelectorAll('.setup-hint')).map((h) =>
      normalize(h.textContent)
    );
    expect(
      hints.some((h) =>
        h.includes(
          'Configure an irrigation or drain pump in Irrigation Settings to enable Schedules, manual run controls, and behaviour settings.'
        )
      )
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// initialTab + scrollToField
// ---------------------------------------------------------------------------

describe('IrrigationDialog – initialTab', () => {
  it('defaults to the config tab when no initialTab is given and no pump is configured', async () => {
    const el = await fixture<IrrigationDialog>(html`
      <irrigation-dialog .open=${true}></irrigation-dialog>
    `);
    await el.updateComplete;
    expect((el as any)._sm.activeTab).toBe('config');
  });

  it('activates the given initialTab when the dialog opens', async () => {
    // 'config' is always visible regardless of device state
    const el = await fixture<IrrigationDialog>(html`
      <irrigation-dialog .open=${true} .initialTab=${'config'}></irrigation-dialog>
    `);
    await el.updateComplete;
    expect((el as any)._sm.activeTab).toBe('config');
  });

  it('activates initialTab when open transitions from false to true', async () => {
    const el = await fixture<IrrigationDialog>(html`
      <irrigation-dialog .open=${false} .initialTab=${'config'}></irrigation-dialog>
    `);
    await el.updateComplete;
    expect((el as any)._sm.activeTab).toBe('config');

    el.open = true;
    await el.updateComplete;
    expect((el as any)._sm.activeTab).toBe('config');
  });

  it('does not change tab when initialTab is not a visible tab', async () => {
    // 'steering' requires device with pump + soil moisture sensor; without device it falls back to config
    const el = await fixture<IrrigationDialog>(html`
      <irrigation-dialog .open=${true} .initialTab=${'steering'}></irrigation-dialog>
    `);
    await el.updateComplete;
    expect((el as any)._sm.activeTab).toBe('config');
  });
});

// ---------------------------------------------------------------------------
// scrollToField
// ---------------------------------------------------------------------------

describe('IrrigationDialog – scrollToField', () => {
  it('queries for the scrollToField target and adds field-pulse class when the dialog opens', async () => {
    const el = await fixture<IrrigationDialog>(html`
      <irrigation-dialog .open=${false} .scrollToField=${'testField'}></irrigation-dialog>
    `);
    await el.updateComplete;

    // Create a target element and stub querySelector to return it
    const target = document.createElement('div');
    target.setAttribute('data-scroll-target', 'testField');
    target.scrollIntoView = vi.fn();

    const querySpy = vi.spyOn(el.shadowRoot!, 'querySelector').mockImplementation((sel: string) => {
      if (sel === '[data-scroll-target="testField"]') return target;
      return null;
    });

    el.open = true;
    await el.updateComplete;

    expect(querySpy).toHaveBeenCalledWith('[data-scroll-target="testField"]');
    expect(target.classList.contains('field-pulse')).toBe(true);

    querySpy.mockRestore();
  });

  it('does nothing when scrollToField matches no element', async () => {
    // Should not throw when the target element does not exist
    const el = await fixture<IrrigationDialog>(html`
      <irrigation-dialog .open=${false} .scrollToField=${'nonExistentField'}></irrigation-dialog>
    `);
    await el.updateComplete;

    el.open = true;
    await el.updateComplete;
    // No error thrown and no unexpected side effects — just verify the element is open
    expect((el as any).open).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Steering tab – auto light tracking
// ---------------------------------------------------------------------------

function makeSteeringDevice(overrides: Partial<Parameters<typeof createGrowspaceDevice>[0]> = {}) {
  return createGrowspaceDevice({
    deviceId: 'gs1',
    name: 'Tent 1',
    irrigationConfig: {
      irrigationPumpEntity: 'switch.pump',
      irrigationTimes: [],
      drainTimes: [],
    },
    environmentAttributes: {
      soilMoistureSensor: 'sensor.soil',
    },
    ...overrides,
  });
}

function makeStrategy(
  overrides: Partial<NonNullable<Parameters<typeof createGrowspaceDevice>[0]['irrigationStrategy']>> = {}
) {
  return {
    enabled: true,
    lightsOnTime: '06:00:00',
    p0DurationMinutes: 60,
    p2StopBeforeLightsOffMinutes: 120,
    targetVwcPercent: 55,
    maintenanceDrybackPercent: 2,
    shotDurationSeconds: 10,
    shotIntervalMinutes: 15,
    ...overrides,
  };
}

function makeMetrics(
  overrides: Partial<NonNullable<Parameters<typeof createGrowspaceDevice>[0]['steeringMetrics']>> = {}
) {
  return {
    overnightDryback: null,
    latestOvernightEvent: null,
    incycleDrybackCount: 0,
    incycleDrybackAvg: null,
    ecTrend: null,
    ecTrendAvailable: false,
    score: 0,
    measuredClassification: 'balanced' as const,
    intentDeviation: null,
    shotComposition: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Overview tab (Crop Steering Command Center)
// ---------------------------------------------------------------------------

// The Overview tab is decomposed (ADR-0019): its content renders inside the
// child `<irrigation-overview-tab>`'s own shadow root, so assertions pierce one
// level deeper than the dialog's shadow root.
async function overviewRoot(el: IrrigationDialog): Promise<ShadowRoot> {
  const tab = el.shadowRoot!.querySelector('irrigation-overview-tab') as LitElement | null;
  if (!tab) throw new Error('irrigation-overview-tab not rendered');
  await tab.updateComplete;
  return tab.shadowRoot!;
}

// The Schedules tab is likewise decomposed (ADR-0019): its content (the
// <crop-steering-day-chart> host + the legend "not configured" notes) renders
// inside the child `<irrigation-schedules-tab>`'s own shadow root.
async function schedulesTabRoot(el: IrrigationDialog): Promise<ShadowRoot> {
  const tab = el.shadowRoot!.querySelector('irrigation-schedules-tab') as LitElement | null;
  if (!tab) throw new Error('irrigation-schedules-tab not rendered');
  await tab.updateComplete;
  return tab.shadowRoot!;
}

describe('IrrigationDialog – Overview tab (Crop Steering Command Center)', () => {
  it('opens on the Overview tab via initialTab when crop steering is available', async () => {
    const device = makeSteeringDevice();
    const el = await fixture<IrrigationDialog>(html`
      <irrigation-dialog
        .open=${true}
        .device=${device}
        .initialTab=${'overview'}
      ></irrigation-dialog>
    `);
    await el.updateComplete;
    expect((el as any)._sm.activeTab).toBe('overview');
  });

  it('shows the data-unavailable placeholder when no steering metrics are in the payload', async () => {
    const device = makeSteeringDevice();
    const el = await fixture<IrrigationDialog>(html`
      <irrigation-dialog
        .open=${true}
        .device=${device}
        .initialTab=${'overview'}
      ></irrigation-dialog>
    `);
    await el.updateComplete;
    expect(normalize((await overviewRoot(el)).textContent)).toContain(
      'Crop steering data is currently unavailable'
    );
  });

  it('renders the measured score, declared mode, and measured classification from the payload', async () => {
    const device = makeSteeringDevice({
      irrigationStrategy: makeStrategy({ declaredSteeringMode: 'generative' }),
      steeringMetrics: makeMetrics({
        score: 0.6,
        measuredClassification: 'generative',
        intentDeviation: 'on_target',
      }),
    });
    const el = await fixture<IrrigationDialog>(html`
      <irrigation-dialog
        .open=${true}
        .device=${device}
        .initialTab=${'overview'}
      ></irrigation-dialog>
    `);
    await el.updateComplete;

    const text = normalize((await overviewRoot(el)).textContent);
    expect(text).toContain('+0.60');
    expect(text).toContain('GENERATIVE');
    // Measured classification surfaces alongside the declared intent.
    expect(text.toLowerCase()).toContain('measured');
  });

  it('contrasts declared intent against the measured classification on deviation', async () => {
    const device = makeSteeringDevice({
      irrigationStrategy: makeStrategy({ declaredSteeringMode: 'generative' }),
      steeringMetrics: makeMetrics({
        score: -0.5,
        measuredClassification: 'vegetative',
        intentDeviation: 'more_vegetative',
      }),
    });
    const el = await fixture<IrrigationDialog>(html`
      <irrigation-dialog
        .open=${true}
        .device=${device}
        .initialTab=${'overview'}
      ></irrigation-dialog>
    `);
    await el.updateComplete;

    const text = normalize((await overviewRoot(el)).textContent).toLowerCase();
    // The deviation banner names both the declared intent and what the substrate reads.
    expect(text).toContain('generative');
    expect(text).toContain('vegetative');
    expect(text).toMatch(/intend|declared|reads/);
  });

  it('reads steering metrics from the payload, not hass.states', async () => {
    const device = makeSteeringDevice({
      irrigationStrategy: makeStrategy({ declaredSteeringMode: 'balanced' }),
      steeringMetrics: makeMetrics({ score: 0.1, measuredClassification: 'balanced' }),
    });
    const el = await fixture<IrrigationDialog>(html`
      <irrigation-dialog
        .open=${true}
        .device=${device}
        .initialTab=${'overview'}
      ></irrigation-dialog>
    `);
    // A contradictory sensor state must be ignored — the payload is the source.
    (el as any).hass = {
      states: { 'sensor.tent_1_crop_steering': { state: '99', attributes: {} } },
    };
    (el as any).requestUpdate('hass');
    await el.updateComplete;

    const text = normalize((await overviewRoot(el)).textContent);
    expect(text).toContain('+0.10');
    expect(text).not.toContain('99');
  });

  it('renders the overnight dryback in absolute VWC points with peak/trough context', async () => {
    const device = makeSteeringDevice({
      irrigationStrategy: makeStrategy(),
      steeringMetrics: makeMetrics({
        overnightDryback: 12.5,
        latestOvernightEvent: {
          peakVwc: 55.2,
          troughVwc: 42.7,
          dryback: 12.5,
          peakTimestamp: '2026-06-13T06:00:00+00:00',
          troughTimestamp: '2026-06-13T18:00:00+00:00',
        },
      }),
    });
    const el = await fixture<IrrigationDialog>(html`
      <irrigation-dialog
        .open=${true}
        .device=${device}
        .initialTab=${'overview'}
      ></irrigation-dialog>
    `);
    await el.updateComplete;

    const text = normalize((await overviewRoot(el)).textContent);
    expect(text.toLowerCase()).toContain('overnight');
    // Absolute VWC points, not a percent-of-peak.
    expect(text).toContain('12.5');
    // Peak/trough context surfaces.
    expect(text).toContain('55.2');
    expect(text).toContain('42.7');
  });

  it('shows an em dash for overnight dryback when no window has completed', async () => {
    const device = makeSteeringDevice({
      irrigationStrategy: makeStrategy(),
      steeringMetrics: makeMetrics({ overnightDryback: null, latestOvernightEvent: null }),
    });
    const el = await fixture<IrrigationDialog>(html`
      <irrigation-dialog
        .open=${true}
        .device=${device}
        .initialTab=${'overview'}
      ></irrigation-dialog>
    `);
    await el.updateComplete;

    const card = (await overviewRoot(el)).querySelector('[data-metric="overnight-dryback"]');
    expect(card).not.toBeNull();
    expect(normalize(card!.textContent)).toContain('—');
  });

  it('summarises today’s in-cycle shot count and average P2 dryback', async () => {
    const device = makeSteeringDevice({
      irrigationStrategy: makeStrategy(),
      steeringMetrics: makeMetrics({ incycleDrybackCount: 6, incycleDrybackAvg: 3.4 }),
    });
    const el = await fixture<IrrigationDialog>(html`
      <irrigation-dialog
        .open=${true}
        .device=${device}
        .initialTab=${'overview'}
      ></irrigation-dialog>
    `);
    await el.updateComplete;

    const card = (await overviewRoot(el)).querySelector('[data-metric="incycle-dryback"]');
    expect(card).not.toBeNull();
    const text = normalize(card!.textContent);
    expect(text).toContain('6');
    expect(text).toContain('3.4');
    expect(text.toLowerCase()).toContain('shot');
  });

  it('shows an em dash for the in-cycle average when no shots have fired today', async () => {
    const device = makeSteeringDevice({
      irrigationStrategy: makeStrategy(),
      steeringMetrics: makeMetrics({ incycleDrybackCount: 0, incycleDrybackAvg: null }),
    });
    const el = await fixture<IrrigationDialog>(html`
      <irrigation-dialog
        .open=${true}
        .device=${device}
        .initialTab=${'overview'}
      ></irrigation-dialog>
    `);
    await el.updateComplete;

    const card = (await overviewRoot(el)).querySelector('[data-metric="incycle-dryback"]');
    expect(normalize(card!.textContent)).toContain('—');
  });

  it('renders the measured EC trend direction when pore-EC is available', async () => {
    const device = makeSteeringDevice({
      irrigationStrategy: makeStrategy(),
      steeringMetrics: makeMetrics({ ecTrend: 'rising', ecTrendAvailable: true }),
    });
    const el = await fixture<IrrigationDialog>(html`
      <irrigation-dialog
        .open=${true}
        .device=${device}
        .initialTab=${'overview'}
      ></irrigation-dialog>
    `);
    await el.updateComplete;

    const card = (await overviewRoot(el)).querySelector('[data-metric="ec-trend"]');
    expect(card).not.toBeNull();
    expect(card!.classList.contains('cs-metric-locked')).toBe(false);
    expect(normalize(card!.textContent).toUpperCase()).toContain('RISING');
  });

  it('renders EC trend visible-but-locked with an unlock hint when no pore-EC sensors report', async () => {
    const device = makeSteeringDevice({
      irrigationStrategy: makeStrategy(),
      steeringMetrics: makeMetrics({ ecTrend: null, ecTrendAvailable: false }),
    });
    const el = await fixture<IrrigationDialog>(html`
      <irrigation-dialog
        .open=${true}
        .device=${device}
        .initialTab=${'overview'}
      ></irrigation-dialog>
    `);
    await el.updateComplete;

    const card = (await overviewRoot(el)).querySelector('[data-metric="ec-trend"]');
    // Visible-but-locked: the card is present (never hidden), flagged locked,
    // with a one-line hint pointing at the missing prerequisite.
    expect(card).not.toBeNull();
    expect(card!.classList.contains('cs-metric-locked')).toBe(true);
    const text = normalize(card!.textContent).toLowerCase();
    expect(text).toContain('pore');
    expect(text).not.toContain('stable');
  });

  it('renders the current phase state and shot composition diagnostics', async () => {
    const device = makeSteeringDevice({
      irrigationConfig: {
        irrigationPumpEntity: 'switch.pump',
        irrigationTimes: [],
        drainTimes: [],
        activeSteeringPhase: 'p2',
      },
      irrigationStrategy: makeStrategy(),
      steeringMetrics: makeMetrics({
        shotComposition: {
          ec_modulation_enabled: true,
          ec_modulation_available: true,
          current_vwc_factor: 1.2,
          last_shot: {
            phase: 'p2',
            base_seconds: 10,
            vwc_factor: 1.2,
            ec_factor: 0.9,
            ec_modulation_available: true,
            composed_seconds: 11,
            effective_seconds: 11,
            capped: false,
            timestamp: '2026-06-13T12:00:00+00:00',
          },
        },
      }),
    });
    const el = await fixture<IrrigationDialog>(html`
      <irrigation-dialog
        .open=${true}
        .device=${device}
        .initialTab=${'overview'}
      ></irrigation-dialog>
    `);
    await el.updateComplete;

    const panel = (await overviewRoot(el)).querySelector('[data-metric="shot-composition"]');
    expect(panel).not.toBeNull();
    const text = normalize(panel!.textContent);
    // Current phase surfaces.
    expect(text.toUpperCase()).toContain('P2');
    // Composition factors surface so a shot is explainable.
    expect(text).toContain('1.2');
    expect(text).toContain('0.9');
  });

  it('omits the shot composition panel on time-based irrigation (no composition)', async () => {
    const device = makeSteeringDevice({
      irrigationStrategy: makeStrategy(),
      steeringMetrics: makeMetrics({ shotComposition: null }),
    });
    const el = await fixture<IrrigationDialog>(html`
      <irrigation-dialog
        .open=${true}
        .device=${device}
        .initialTab=${'overview'}
      ></irrigation-dialog>
    `);
    await el.updateComplete;

    expect((await overviewRoot(el)).querySelector('[data-metric="shot-composition"]')).toBeNull();
  });
});

describe('IrrigationDialog – Steering tab: auto light tracking', () => {
  it('does not show auto-track toggle when device has no light sensors', async () => {
    const device = makeSteeringDevice();
    const el = await fixture<IrrigationDialog>(html`
      <irrigation-dialog
        .open=${true}
        .device=${device}
        .initialTab=${'steering'}
      ></irrigation-dialog>
    `);
    await el.updateComplete;

    const toggle = el.shadowRoot!.querySelector('[data-field="autoLightTracking"]');
    expect(toggle).toBeNull();
  });

  it('shows auto-track toggle when device has at least one light sensor', async () => {
    const device = makeSteeringDevice({
      environmentAttributes: {
        soilMoistureSensor: 'sensor.soil',
        lightSensors: ['sensor.light_1'],
      },
    });
    const el = await fixture<IrrigationDialog>(html`
      <irrigation-dialog
        .open=${true}
        .device=${device}
        .initialTab=${'steering'}
      ></irrigation-dialog>
    `);
    await el.updateComplete;

    const toggle = el.shadowRoot!.querySelector('[data-field="autoLightTracking"]');
    expect(toggle).not.toBeNull();
  });

  it('toggling auto-track switch sets autoLightTracking on strategy', async () => {
    const device = makeSteeringDevice({
      environmentAttributes: {
        soilMoistureSensor: 'sensor.soil',
        lightSensors: ['sensor.light_1'],
      },
    });
    const el = await fixture<IrrigationDialog>(html`
      <irrigation-dialog
        .open=${true}
        .device=${device}
        .initialTab=${'steering'}
      ></irrigation-dialog>
    `);
    await el.updateComplete;

    const toggle = el.shadowRoot!.querySelector('[data-field="autoLightTracking"]') as any;
    expect(toggle).not.toBeNull();

    toggle.checked = true;
    toggle.dispatchEvent(new Event('change'));
    await el.updateComplete;

    expect((el as any)._sm.tabs.steering.draft.autoLightTracking).toBe(true);
  });

  it('renders the Adaptive Shot Control toggle and tunables, and toggles off', async () => {
    const el = await fixture<IrrigationDialog>(html`
      <irrigation-dialog
        .open=${true}
        .device=${makeSteeringDevice()}
        .initialTab=${'steering'}
      ></irrigation-dialog>
    `);
    await el.updateComplete;

    const toggle = el.shadowRoot!.querySelector('[data-field="dynamicShotEnabled"]') as any;
    expect(toggle).not.toBeNull();
    // Tunables visible while enabled (defaults on).
    expect(el.shadowRoot!.querySelector('[data-field="dynamicAggressiveness"]')).not.toBeNull();
    expect(el.shadowRoot!.querySelector('[data-field="dynamicIntervalCeiling"]')).not.toBeNull();

    toggle.checked = false;
    toggle.dispatchEvent(new Event('change'));
    await el.updateComplete;

    expect((el as any)._sm.tabs.steering.draft.dynamicShotEnabled).toBe(false);
    // Tunables hidden once disabled.
    expect(el.shadowRoot!.querySelector('[data-field="dynamicAggressiveness"]')).toBeNull();
  });

  it('edits an Adaptive Shot Control tunable into the steering draft', async () => {
    const el = await fixture<IrrigationDialog>(html`
      <irrigation-dialog
        .open=${true}
        .device=${makeSteeringDevice()}
        .initialTab=${'steering'}
      ></irrigation-dialog>
    `);
    await el.updateComplete;

    const input = el.shadowRoot!.querySelector('[data-field="dynamicAggressiveness"]') as HTMLElement;
    expect(input).not.toBeNull();

    input.dispatchEvent(new CustomEvent('change', { detail: '2.5' }));
    await el.updateComplete;

    expect((el as any)._sm.tabs.steering.draft.dynamicAggressiveness).toBe(2.5);
  });

  it('does not show detected-time badge when detectedLightsOnTime is null', async () => {
    const device = makeSteeringDevice({
      irrigationStrategy: {
        enabled: true,
        lightsOnTime: '06:00:00',
        p0DurationMinutes: 30,
        p2StopBeforeLightsOffMinutes: 60,
        targetVwcPercent: 65,
        maintenanceDrybackPercent: 3,
        shotDurationSeconds: 30,
        shotIntervalMinutes: 20,
        autoLightTracking: false,
        detectedLightsOnTime: null,
      },
    });
    const el = await fixture<IrrigationDialog>(html`
      <irrigation-dialog
        .open=${true}
        .device=${device}
        .initialTab=${'steering'}
      ></irrigation-dialog>
    `);
    await el.updateComplete;

    const badge = el.shadowRoot!.querySelector('.auto-lights-badge');
    expect(badge).toBeNull();
  });

  it('shows "auto: HH:MM" badge next to lightsOnTime when detectedLightsOnTime is set', async () => {
    const device = makeSteeringDevice({
      irrigationStrategy: {
        enabled: true,
        lightsOnTime: '06:00:00',
        p0DurationMinutes: 30,
        p2StopBeforeLightsOffMinutes: 60,
        targetVwcPercent: 65,
        maintenanceDrybackPercent: 3,
        shotDurationSeconds: 30,
        shotIntervalMinutes: 20,
        autoLightTracking: true,
        detectedLightsOnTime: '07:30',
      },
    });
    const el = await fixture<IrrigationDialog>(html`
      <irrigation-dialog
        .open=${true}
        .device=${device}
        .initialTab=${'steering'}
      ></irrigation-dialog>
    `);
    await el.updateComplete;

    const badge = el.shadowRoot!.querySelector('.auto-lights-badge');
    expect(badge).not.toBeNull();
    expect(badge!.textContent?.trim()).toBe('auto: 07:30');
  });
});

// ---------------------------------------------------------------------------
// Steering tab – Steering Mode selector + stamp
// ---------------------------------------------------------------------------

function makeSteeringModeStore(applyFn = vi.fn().mockResolvedValue(undefined)) {
  return {
    context: {
      dataService: {},
      ui: { showToast: vi.fn() },
      data: {},
      grid: {},
      closeDialog: vi.fn(),
      refreshData: vi.fn().mockResolvedValue(undefined),
    },
    actions: {
      irrigation: {
        fetchCropSteeringHistory: vi.fn().mockResolvedValue(undefined),
        applySteeringMode: applyFn,
      },
    },
    data: {},
    ui: { showToast: vi.fn() },
  };
}

function steeringStrategy(overrides: Record<string, unknown> = {}) {
  return {
    enabled: true,
    lightsOnTime: '06:00:00',
    p0DurationMinutes: 30,
    p2StopBeforeLightsOffMinutes: 60,
    targetVwcPercent: 65,
    maintenanceDrybackPercent: 3,
    shotDurationSeconds: 30,
    shotIntervalMinutes: 20,
    ...overrides,
  };
}

describe('IrrigationDialog – Steering tab: Steering Mode selector', () => {
  it('renders the three steering-mode options', async () => {
    const device = makeSteeringDevice({ irrigationStrategy: steeringStrategy() });
    const el = await fixture<IrrigationDialog>(html`
      <irrigation-dialog .open=${true} .device=${device} .initialTab=${'steering'}></irrigation-dialog>
    `);
    await el.updateComplete;

    const modes = [...el.shadowRoot!.querySelectorAll('[data-steering-mode]')].map((n) =>
      n.getAttribute('data-steering-mode')
    );
    expect(modes).toEqual(['vegetative', 'balanced', 'generative']);
  });

  it('marks the declared mode as active', async () => {
    const device = makeSteeringDevice({
      irrigationStrategy: steeringStrategy({ declaredSteeringMode: 'generative' }),
    });
    const el = await fixture<IrrigationDialog>(html`
      <irrigation-dialog .open=${true} .device=${device} .initialTab=${'steering'}></irrigation-dialog>
    `);
    await el.updateComplete;

    const active = el.shadowRoot!.querySelector('[data-steering-mode].active');
    expect(active?.getAttribute('data-steering-mode')).toBe('generative');
  });

  it('opens a confirm step before stamping (does not stamp immediately)', async () => {
    const applyFn = vi.fn().mockResolvedValue(undefined);
    const device = makeSteeringDevice({ irrigationStrategy: steeringStrategy() });
    const el = await fixture<IrrigationDialog>(html`
      <irrigation-dialog
        .open=${true}
        .device=${device}
        .store=${makeSteeringModeStore(applyFn) as any}
        .initialTab=${'steering'}
      ></irrigation-dialog>
    `);
    await el.updateComplete;

    const option = el.shadowRoot!.querySelector('[data-steering-mode="vegetative"]') as HTMLElement;
    option.click();
    await el.updateComplete;

    expect(applyFn).not.toHaveBeenCalled();
    expect((el as any)._sm.tabs.steering.sub).toEqual({
      kind: 'confirm-mode',
      pending: 'vegetative',
    });
  });

  it('stamps the chosen mode through the slice action on confirm', async () => {
    const applyFn = vi.fn().mockResolvedValue(undefined);
    const device = makeSteeringDevice({ irrigationStrategy: steeringStrategy() });
    const el = await fixture<IrrigationDialog>(html`
      <irrigation-dialog
        .open=${true}
        .device=${device}
        .store=${makeSteeringModeStore(applyFn) as any}
        .initialTab=${'steering'}
      ></irrigation-dialog>
    `);
    await el.updateComplete;

    (el.shadowRoot!.querySelector('[data-steering-mode="generative"]') as HTMLElement).click();
    await el.updateComplete;

    const confirmBtn = el.shadowRoot!.querySelector('[data-action="confirm-steering-mode"]') as HTMLElement;
    confirmBtn.click();
    await el.updateComplete;

    expect(applyFn).toHaveBeenCalledWith('gs1', 'generative');
  });
});

// ---------------------------------------------------------------------------
// Steering tab – per-phase shot params
// ---------------------------------------------------------------------------

describe('IrrigationDialog – Steering tab: per-phase shot params', () => {
  it('labels P1/P2 shot sizes in seconds when sizing mode is seconds', async () => {
    const device = makeSteeringDevice({
      irrigationStrategy: steeringStrategy({ shotSizingMode: 'seconds' }),
    });
    const el = await fixture<IrrigationDialog>(html`
      <irrigation-dialog .open=${true} .device=${device} .initialTab=${'steering'}></irrigation-dialog>
    `);
    await el.updateComplete;

    const p1 = el.shadowRoot!.querySelector('[data-field="p1ShotDurationSeconds"]');
    const p2 = el.shadowRoot!.querySelector('[data-field="p2ShotDurationSeconds"]');
    expect(p1?.getAttribute('label')).toContain('sec');
    expect(p2?.getAttribute('label')).toContain('sec');
    expect(el.shadowRoot!.querySelector('[data-field="p1ShotVolumePercent"]')).toBeNull();
  });

  it('labels P1/P2 shot sizes in percent when sizing mode is volume', async () => {
    const device = makeSteeringDevice({
      irrigationStrategy: steeringStrategy({ shotSizingMode: 'volume' }),
    });
    const el = await fixture<IrrigationDialog>(html`
      <irrigation-dialog .open=${true} .device=${device} .initialTab=${'steering'}></irrigation-dialog>
    `);
    await el.updateComplete;

    const p1 = el.shadowRoot!.querySelector('[data-field="p1ShotVolumePercent"]');
    const p2 = el.shadowRoot!.querySelector('[data-field="p2ShotVolumePercent"]');
    expect(p1?.getAttribute('label')).toContain('%');
    expect(p2?.getAttribute('label')).toContain('%');
    expect(el.shadowRoot!.querySelector('[data-field="p1ShotDurationSeconds"]')).toBeNull();
  });

  it('edits a per-phase shot field into the steering draft', async () => {
    const device = makeSteeringDevice({
      irrigationStrategy: steeringStrategy({ shotSizingMode: 'seconds', p2ShotIntervalMinutes: 30 }),
    });
    const el = await fixture<IrrigationDialog>(html`
      <irrigation-dialog .open=${true} .device=${device} .initialTab=${'steering'}></irrigation-dialog>
    `);
    await el.updateComplete;

    const input = el.shadowRoot!.querySelector('[data-field="p2ShotIntervalMinutes"]') as any;
    input.dispatchEvent(new CustomEvent('change', { detail: '45' }));
    await el.updateComplete;

    expect((el as any)._sm.tabs.steering.draft.p2ShotIntervalMinutes).toBe(45);
  });
});

// ---------------------------------------------------------------------------
// Substrate & EC tab
// ---------------------------------------------------------------------------

/** A device that surfaces the substrate_ec tab (needs an EC sensor) with a strategy. */
function makeSubstrateEcDevice(
  strategyOverrides: Record<string, unknown> = {},
  envOverrides: Record<string, unknown> = {},
  deviceOverrides: Partial<Parameters<typeof createGrowspaceDevice>[0]> = {}
) {
  return createGrowspaceDevice({
    deviceId: 'gs1',
    name: 'Tent 1',
    irrigationConfig: {
      irrigationPumpEntity: 'switch.pump',
      irrigationTimes: [],
      drainTimes: [],
    },
    irrigationStrategy: steeringStrategy(strategyOverrides) as any,
    environmentAttributes: {
      soilMoistureSensor: 'sensor.soil',
      feedEcSensors: ['sensor.feed_ec'],
      ...envOverrides,
    } as any,
    ...deviceOverrides,
  });
}

// ADR-0019: the Substrate & EC tab renders in the decomposed
// <irrigation-substrate-ec-tab> child; DOM queries pierce its shadow.
async function mountSubstrateEc(device: ReturnType<typeof createGrowspaceDevice>) {
  const el = await fixture<IrrigationDialog>(html`
    <irrigation-dialog .open=${true} .device=${device} .initialTab=${'substrate_ec'}></irrigation-dialog>
  `);
  await el.updateComplete;
  const tab = el.shadowRoot!.querySelector('irrigation-substrate-ec-tab') as LitElement & {
    shadowRoot: ShadowRoot;
  };
  await tab.updateComplete;
  return { el, tab };
}

describe('IrrigationDialog – Substrate & EC tab', () => {
  it('locks Volume Mode with a "liters per pot" hint when no profile is configured', async () => {
    const { tab } = await mountSubstrateEc(makeSubstrateEcDevice({}, {}, { volumeModeCapable: false }));
    const volumeBtn = tab.shadowRoot.querySelector('[data-sizing-mode="volume"]') as HTMLButtonElement;
    expect(volumeBtn.disabled).toBe(true);
    const hint = tab.shadowRoot.querySelector('.capability-unlock-hint')?.textContent ?? '';
    expect(hint).toContain('liters per pot');
  });

  it('locks Volume Mode with a "pump flow rate" hint once liters-per-pot is set but still not capable', async () => {
    const { tab } = await mountSubstrateEc(
      makeSubstrateEcDevice(
        { substrateProfile: { mediaType: 'coco', litersPerPot: 5 } },
        {},
        { volumeModeCapable: false }
      )
    );
    const volumeBtn = tab.shadowRoot.querySelector('[data-sizing-mode="volume"]') as HTMLButtonElement;
    expect(volumeBtn.disabled).toBe(true);
    const hint = tab.shadowRoot.querySelector('.capability-unlock-hint')?.textContent ?? '';
    expect(hint).toContain('pump flow rate');
  });

  it('enables the Volume Mode toggle when the backend reports it capable', async () => {
    const { tab } = await mountSubstrateEc(
      makeSubstrateEcDevice(
        { substrateProfile: { mediaType: 'coco', litersPerPot: 5 } },
        {},
        { volumeModeCapable: true }
      )
    );
    const volumeBtn = tab.shadowRoot.querySelector('[data-sizing-mode="volume"]') as HTMLButtonElement;
    expect(volumeBtn.disabled).toBe(false);
  });

  it('locks EC Modulation with a hint when no pore-EC sensors are configured', async () => {
    const { tab } = await mountSubstrateEc(makeSubstrateEcDevice());
    const toggle = tab.shadowRoot.querySelector('[data-field="ec_modulation_enabled"]') as any;
    expect(toggle.disabled).toBe(true);
    const hints = Array.from(tab.shadowRoot.querySelectorAll('.capability-unlock-hint')).map(
      (n) => n.textContent ?? ''
    );
    expect(hints.some((h) => h.includes('pore EC sensor'))).toBe(true);
  });

  it('enables EC Modulation when pore-EC sensors are configured', async () => {
    const { tab } = await mountSubstrateEc(
      makeSubstrateEcDevice({}, { poreEcSensors: ['sensor.pore_ec'] })
    );
    const toggle = tab.shadowRoot.querySelector('[data-field="ec_modulation_enabled"]') as any;
    expect(toggle.disabled).toBe(false);
  });

  it('renders the pore-EC band and the feed-EC ranges as distinct sections', async () => {
    const { tab } = await mountSubstrateEc(makeSubstrateEcDevice());
    expect(tab.shadowRoot.querySelector('[data-field="pore_ec_target_min"]')).not.toBeNull();
    expect(tab.shadowRoot.querySelector('[data-field="pore_ec_target_max"]')).not.toBeNull();
    // The feed-EC ranges remain as their own per-stage table.
    expect(tab.shadowRoot.querySelector('.ec-target-row')).not.toBeNull();
  });

  it('buffers a pore-EC band edit into the substrate_ec draft', async () => {
    const { el, tab } = await mountSubstrateEc(makeSubstrateEcDevice());
    const minInput = tab.shadowRoot.querySelector('[data-field="pore_ec_target_min"]') as any;
    minInput.dispatchEvent(new CustomEvent('change', { detail: '2.5' }));
    await el.updateComplete;
    expect((el as any)._sm.tabs.substrate_ec.draft.poreEcMin).toBe(2.5);
  });

  it('blocks save and toasts when the pore-EC band is inverted (min >= max)', async () => {
    const { el } = await mountSubstrateEc(makeSubstrateEcDevice());
    (el as any)._sm = transition((el as any)._sm, {
      type: 'UPDATE_PORE_EC_BAND',
      min: 3.0,
      max: 2.0,
    });
    await el.updateComplete;

    (el as any)._saveAll();
    await el.updateComplete;

    expect((el as any)._sm.toast).toBeDefined();
    expect((el as any)._sm.toast).toContain('pore EC');
    // No save effect should have been requested.
    expect((el as any)._sm.status.kind).not.toBe('applying');
  });

  it('allows save when the pore-EC band is valid (min < max)', async () => {
    const { el } = await mountSubstrateEc(makeSubstrateEcDevice());
    (el as any)._sm = transition((el as any)._sm, {
      type: 'UPDATE_PORE_EC_BAND',
      min: 2.0,
      max: 3.0,
    });
    await el.updateComplete;

    (el as any)._saveAll();
    await el.updateComplete;

    expect((el as any)._sm.toast ?? '').not.toContain('pore EC');
  });
});

// ---------------------------------------------------------------------------
// EC Ramp tab
// ---------------------------------------------------------------------------

function makeEcRampStore(fetchFn = vi.fn().mockResolvedValue(undefined)) {
  return {
    context: {
      dataService: {},
      ui: { showToast: vi.fn() },
      data: {},
      grid: {},
      closeDialog: vi.fn(),
      refreshData: vi.fn().mockResolvedValue(undefined),
    },
    actions: {
      library: {
        fetchECRampCurves: fetchFn,
        saveECRampCurve: vi.fn().mockResolvedValue(undefined),
        removeECRampCurve: vi.fn().mockResolvedValue(undefined),
      },
      irrigation: {
        fetchCropSteeringHistory: vi.fn().mockResolvedValue(undefined),
      },
    },
    data: {
      $ecRampCurves: atom<Record<string, unknown>>({}),
    },
    ui: { showToast: vi.fn() },
  };
}

function makeEcRampDevice() {
  return makeDevice({
    irrigationConfig: {
      irrigationPumpEntity: 'switch.pump',
      irrigationTimes: [{ time: '08:00:00', duration: 60 }],
      drainTimes: [],
    },
    environmentAttributes: {
      feedEcSensors: ['sensor.ec1'],
    },
  });
}

describe('IrrigationDialog – EC Ramp tab visibility', () => {
  it('shows ec_ramp nav item when pump, schedule, and EC sensor are all present', async () => {
    const device = makeEcRampDevice();
    const el = await fixture<IrrigationDialog>(html`
      <irrigation-dialog .open=${true} .device=${device} growspaceName="Tent 1"></irrigation-dialog>
    `);
    await el.updateComplete;

    const tabIds = [...el.shadowRoot!.querySelectorAll('[data-tab]')].map((n) =>
      n.getAttribute('data-tab')
    );
    expect(tabIds).toContain('ec_ramp');
  });

  it('hides ec_ramp nav item when pump is missing', async () => {
    const device = makeDevice({
      irrigationConfig: { irrigationTimes: [{ time: '08:00:00', duration: 60 }], drainTimes: [] },
      environmentAttributes: { feedEcSensors: ['sensor.ec1'] },
    });
    const el = await fixture<IrrigationDialog>(html`
      <irrigation-dialog .open=${true} .device=${device} growspaceName="Tent 1"></irrigation-dialog>
    `);
    await el.updateComplete;

    const tabIds = [...el.shadowRoot!.querySelectorAll('[data-tab]')].map((n) =>
      n.getAttribute('data-tab')
    );
    expect(tabIds).not.toContain('ec_ramp');
  });

  it('hides ec_ramp nav item when there are no irrigation schedules', async () => {
    const device = makeDevice({
      irrigationConfig: {
        irrigationPumpEntity: 'switch.pump',
        irrigationTimes: [],
        drainTimes: [],
      },
      environmentAttributes: { feedEcSensors: ['sensor.ec1'] },
    });
    const el = await fixture<IrrigationDialog>(html`
      <irrigation-dialog .open=${true} .device=${device} growspaceName="Tent 1"></irrigation-dialog>
    `);
    await el.updateComplete;

    const tabIds = [...el.shadowRoot!.querySelectorAll('[data-tab]')].map((n) =>
      n.getAttribute('data-tab')
    );
    expect(tabIds).not.toContain('ec_ramp');
  });

  it('hides ec_ramp nav item when no EC sensors are configured', async () => {
    const device = makeDevice({
      irrigationConfig: {
        irrigationPumpEntity: 'switch.pump',
        irrigationTimes: [{ time: '08:00:00', duration: 60 }],
        drainTimes: [],
      },
      environmentAttributes: {},
    });
    const el = await fixture<IrrigationDialog>(html`
      <irrigation-dialog .open=${true} .device=${device} growspaceName="Tent 1"></irrigation-dialog>
    `);
    await el.updateComplete;

    const tabIds = [...el.shadowRoot!.querySelectorAll('[data-tab]')].map((n) =>
      n.getAttribute('data-tab')
    );
    expect(tabIds).not.toContain('ec_ramp');
  });
});

describe('IrrigationDialog – EC Ramp tab content', () => {
  it('renders list view with empty-state message when no curves exist', async () => {
    const store = makeEcRampStore();
    const device = makeEcRampDevice();
    const el = await fixture<IrrigationDialog>(html`
      <irrigation-dialog
        .open=${true}
        .device=${device}
        .store=${store as any}
        .initialTab=${'ec_ramp'}
        growspaceName="Tent 1"
      ></irrigation-dialog>
    `);
    await el.updateComplete;

    // ADR-0019: the EC Ramp tab renders in the decomposed child; pierce its shadow.
    const tab = el.shadowRoot!.querySelector('irrigation-ec-ramp-tab') as LitElement & {
      shadowRoot: ShadowRoot;
    };
    await tab.updateComplete;
    expect(tab.shadowRoot.textContent).toMatch(/no ec ramp curves/i);
  });

  it('lazily fetches curves on first navigation to ec_ramp tab', async () => {
    const fetchFn = vi.fn().mockResolvedValue(undefined);
    const store = makeEcRampStore(fetchFn);
    const device = makeEcRampDevice();
    const el = await fixture<IrrigationDialog>(html`
      <irrigation-dialog
        .open=${true}
        .device=${device}
        .store=${store as any}
        growspaceName="Tent 1"
      ></irrigation-dialog>
    `);
    await el.updateComplete;
    expect(fetchFn).not.toHaveBeenCalled();

    // Navigate to ec_ramp tab
    const ecRampNavItem = el.shadowRoot!.querySelector('[data-tab="ec_ramp"]') as HTMLElement;
    ecRampNavItem.click();
    await el.updateComplete;
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(fetchFn).toHaveBeenCalledOnce();
  });

  it('resets editor to the list view when navigating away and back (SM-owned)', async () => {
    const store = makeEcRampStore();
    const device = makeEcRampDevice();
    const el = await fixture<IrrigationDialog>(html`
      <irrigation-dialog
        .open=${true}
        .device=${device}
        .store=${store as any}
        .initialTab=${'ec_ramp'}
        growspaceName="Tent 1"
      ></irrigation-dialog>
    `);
    await el.updateComplete;

    // Enter the editor (ADR-0019: the draft lives in the SM, not a component flag)
    (el as any).dispatch({ type: 'EC_RAMP_START_NEW' });
    await el.updateComplete;
    expect((el as any)._sm.tabs.ec_ramp.sub.kind).toBe('editing');

    // Navigate away then back — SWITCH_TAB resets the tab to its list view.
    (el.shadowRoot!.querySelector('[data-tab="schedules"]') as HTMLElement).click();
    await el.updateComplete;
    (el.shadowRoot!.querySelector('[data-tab="ec_ramp"]') as HTMLElement).click();
    await el.updateComplete;

    expect((el as any)._sm.tabs.ec_ramp.sub.kind).toBe('list');
  });
});

// ---------------------------------------------------------------------------
// Tanks tab – inline edit
// ---------------------------------------------------------------------------

function makeTankDevice() {
  return makeDevice({
    environmentAttributes: {
      irrigationTanks: [
        {
          sensorEntity: 'sensor.tank_a',
          name: 'Tank A',
          warningLevel: 20,
          fillLevel: 75,
          isWarning: false,
          volumeLiters: 200,
        },
        {
          sensorEntity: 'sensor.tank_b',
          name: 'Tank B',
          warningLevel: 30,
          fillLevel: 15,
          isWarning: true,
          volumeLiters: null,
        },
      ],
    },
  });
}

// ---------------------------------------------------------------------------
// Crop Steering History: lazy fetch + polling lifecycle
// ---------------------------------------------------------------------------

function makeCropHistoryStore(fetchFn = vi.fn().mockResolvedValue(undefined)) {
  return {
    context: {
      dataService: {},
      ui: { showToast: vi.fn() },
      data: {},
      grid: {},
      closeDialog: vi.fn(),
      refreshData: vi.fn().mockResolvedValue(undefined),
    },
    actions: {
      library: {
        fetchECRampCurves: vi.fn().mockResolvedValue(undefined),
        saveECRampCurve: vi.fn().mockResolvedValue(undefined),
        removeECRampCurve: vi.fn().mockResolvedValue(undefined),
      },
      irrigation: {
        fetchCropSteeringHistory: fetchFn,
      },
    },
    data: {
      $cropSteeringHistory: atom<Map<string, unknown>>(new Map()),
    },
    ui: { showToast: vi.fn() },
  };
}

function makeCropHistoryDevice() {
  return makeSteeringDevice({
    irrigationStrategy: {
      enabled: true,
      lightsOnTime: '06:00:00',
      p0DurationMinutes: 30,
      p2StopBeforeLightsOffMinutes: 60,
      targetVwcPercent: 65,
      maintenanceDrybackPercent: 3,
      shotDurationSeconds: 30,
      shotIntervalMinutes: 20,
    },
  });
}

describe('IrrigationDialog – Crop Steering History: fetch lifecycle', () => {
  it('does not fetch crop steering history before the Schedules tab is first activated', async () => {
    const fetchFn = vi.fn().mockResolvedValue(undefined);
    const store = makeCropHistoryStore(fetchFn);
    const device = makeCropHistoryDevice();
    const el = await fixture<IrrigationDialog>(html`
      <irrigation-dialog
        .open=${true}
        .device=${device}
        .store=${store as any}
        .initialTab=${'config'}
        growspaceName="Tent 1"
      ></irrigation-dialog>
    `);
    await el.updateComplete;

    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('fetches crop steering history on first Schedules-tab activation', async () => {
    const fetchFn = vi.fn().mockResolvedValue(undefined);
    const store = makeCropHistoryStore(fetchFn);
    const device = makeCropHistoryDevice();
    const el = await fixture<IrrigationDialog>(html`
      <irrigation-dialog
        .open=${true}
        .device=${device}
        .store=${store as any}
        .initialTab=${'config'}
        growspaceName="Tent 1"
      ></irrigation-dialog>
    `);
    await el.updateComplete;
    expect(fetchFn).not.toHaveBeenCalled();

    const schedulesNav = el.shadowRoot!.querySelector('[data-tab="schedules"]') as HTMLElement;
    schedulesNav.click();
    await el.updateComplete;
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(fetchFn).toHaveBeenCalledOnce();
    expect(fetchFn).toHaveBeenCalledWith('gs1');
  });

  it('starts the PollingController when the Schedules tab activates', async () => {
    const fetchFn = vi.fn().mockResolvedValue(undefined);
    const store = makeCropHistoryStore(fetchFn);
    const device = makeCropHistoryDevice();
    const el = await fixture<IrrigationDialog>(html`
      <irrigation-dialog
        .open=${true}
        .device=${device}
        .store=${store as any}
        .initialTab=${'config'}
        growspaceName="Tent 1"
      ></irrigation-dialog>
    `);
    await el.updateComplete;

    const schedulesNav = el.shadowRoot!.querySelector('[data-tab="schedules"]') as HTMLElement;
    schedulesNav.click();
    await el.updateComplete;
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect((el as any)._cropSteeringPoller?.running).toBe(true);
  });

  it('stops the PollingController when navigating away from the Schedules tab', async () => {
    const store = makeCropHistoryStore();
    const device = makeCropHistoryDevice();
    const el = await fixture<IrrigationDialog>(html`
      <irrigation-dialog
        .open=${true}
        .device=${device}
        .store=${store as any}
        .initialTab=${'schedules'}
        growspaceName="Tent 1"
      ></irrigation-dialog>
    `);
    await el.updateComplete;
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect((el as any)._cropSteeringPoller?.running).toBe(true);

    const configNav = el.shadowRoot!.querySelector('[data-tab="config"]') as HTMLElement;
    configNav.click();
    await el.updateComplete;

    expect((el as any)._cropSteeringPoller?.running).toBe(false);
  });

  it('does not fetch again on subsequent Schedules-tab re-activations', async () => {
    const fetchFn = vi.fn().mockResolvedValue(undefined);
    const store = makeCropHistoryStore(fetchFn);
    const device = makeCropHistoryDevice();
    const el = await fixture<IrrigationDialog>(html`
      <irrigation-dialog
        .open=${true}
        .device=${device}
        .store=${store as any}
        .initialTab=${'schedules'}
        growspaceName="Tent 1"
      ></irrigation-dialog>
    `);
    await el.updateComplete;
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(fetchFn).toHaveBeenCalledOnce();

    // Navigate away then back
    const configNav = el.shadowRoot!.querySelector('[data-tab="config"]') as HTMLElement;
    configNav.click();
    await el.updateComplete;

    const schedulesNav = el.shadowRoot!.querySelector('[data-tab="schedules"]') as HTMLElement;
    schedulesNav.click();
    await el.updateComplete;
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(fetchFn).toHaveBeenCalledOnce();
  });
});


// ---------------------------------------------------------------------------
// Tanks tab inline edit (decomposed into <irrigation-tanks-tab> — ADR-0019)
// ---------------------------------------------------------------------------

describe('IrrigationDialog – Tanks tab inline edit', () => {
  // The Tanks tab renders in the decomposed child whose VM reads tankLevels$
  // (seeded here as sync-service does in prod). The edit draft lives in the SM;
  // Save persists through the Growspace slice's configureEnvironment (mocked).
  async function mountTanks() {
    const device = makeTankDevice();
    setTankLevels('gs1', device.environmentAttributes!.irrigationTanks as never);
    const el = await fixture<IrrigationDialog>(html`
      <irrigation-dialog
        .open=${true}
        .device=${device}
        .initialTab=${'tanks'}
        growspaceName="Tent 1"
      ></irrigation-dialog>
    `);
    await el.updateComplete;
    const tab = el.shadowRoot!.querySelector('irrigation-tanks-tab') as LitElement & {
      shadowRoot: ShadowRoot;
    };
    await tab.updateComplete;
    return { el, tab };
  }

  const openEditor = async (
    tab: { shadowRoot: ShadowRoot; updateComplete: Promise<unknown> },
    el: IrrigationDialog
  ) => {
    (tab.shadowRoot.querySelector('button.tank-edit-btn') as HTMLButtonElement).click();
    await el.updateComplete;
    await tab.updateComplete;
  };

  it('renders a pencil button for each tank row', async () => {
    const { tab } = await mountTanks();
    expect(tab.shadowRoot.querySelectorAll('button.tank-edit-btn').length).toBe(2);
  });

  it('clicking pencil reveals an inline edit form', async () => {
    const { el, tab } = await mountTanks();
    expect(tab.shadowRoot.querySelector('.tank-edit-form')).toBeNull();
    await openEditor(tab, el);
    expect(tab.shadowRoot.querySelector('.tank-edit-form')).not.toBeNull();
  });

  it("edit form pre-populates with the tank's current values", async () => {
    const { el, tab } = await mountTanks();
    await openEditor(tab, el);
    const inputs = tab.shadowRoot.querySelectorAll('input.md3-input');
    expect((inputs[0] as HTMLInputElement).value).toBe('sensor.tank_a');
    expect((inputs[1] as HTMLInputElement).value).toBe('Tank A');
    expect((inputs[2] as HTMLInputElement).value).toBe('200');
    expect((inputs[3] as HTMLInputElement).value).toBe('20');
  });

  it('clicking Cancel hides the edit form', async () => {
    const { el, tab } = await mountTanks();
    await openEditor(tab, el);
    expect(tab.shadowRoot.querySelector('.tank-edit-form')).not.toBeNull();
    const cancelBtn = Array.from(tab.shadowRoot.querySelectorAll('.tank-edit-form button')).find(
      (b) => b.textContent?.trim() === 'Cancel'
    ) as HTMLButtonElement;
    cancelBtn.click();
    await el.updateComplete;
    await tab.updateComplete;
    expect(tab.shadowRoot.querySelector('.tank-edit-form')).toBeNull();
  });

  it('clicking Save calls configureEnvironment with the updated tank and closes the form', async () => {
    vi.mocked(configureEnvironment).mockClear();
    const { el, tab } = await mountTanks();
    await openEditor(tab, el);

    // Change warning level (4th input)
    const form = tab.shadowRoot.querySelector('.tank-edit-form')!;
    const warningInput = form.querySelectorAll('input.md3-input')[3] as HTMLInputElement;
    warningInput.value = '25';
    warningInput.dispatchEvent(new Event('input'));
    await el.updateComplete;
    await tab.updateComplete;

    const saveBtn = Array.from(form.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Save'
    ) as HTMLButtonElement;
    saveBtn.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await el.updateComplete;
    await tab.updateComplete;

    expect(configureEnvironment).toHaveBeenCalledOnce();
    const [call] = vi.mocked(configureEnvironment).mock.calls;
    expect((call[0] as { growspaceId: string }).growspaceId).toBe('gs1');
    const tanks = (call[0] as { irrigationTanks: Array<{ warningLevel: number; name: string }> })
      .irrigationTanks;
    expect(tanks[0].warningLevel).toBe(25);
    expect(tanks[1].name).toBe('Tank B'); // other tank unchanged

    expect(tab.shadowRoot.querySelector('.tank-edit-form')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Crop Steering Schedule: real VWC trace rendering
// ---------------------------------------------------------------------------

const LIGHTS_ON_UTC = '2024-06-01T06:00:00+00:00';

function makeSoilBuckets(count: number, baseValue = 42.0, nullAt?: number) {
  const anchor = new Date('2024-06-01T04:00:00+00:00').getTime();
  return Array.from({ length: count }, (_, i) => ({
    timestamp: new Date(anchor + i * 5 * 60 * 1000).toISOString(),
    value: i === nullAt ? null : baseValue + i * 0.1,
  }));
}

function makeHistoryResponse(overrides: { soil_moisture?: Array<{ timestamp: string; value: number | null }> } = {}) {
  return {
    growspace_id: 'gs1',
    lights_on: LIGHTS_ON_UTC,
    soil_moisture: overrides.soil_moisture ?? makeSoilBuckets(10),
  };
}

function makeVwcRenderStore() {
  return {
    context: {
      dataService: {},
      ui: { showToast: vi.fn() },
      data: {},
      grid: {},
      closeDialog: vi.fn(),
      refreshData: vi.fn().mockResolvedValue(undefined),
    },
    actions: {
      library: {
        fetchECRampCurves: vi.fn().mockResolvedValue(undefined),
        saveECRampCurve: vi.fn().mockResolvedValue(undefined),
        removeECRampCurve: vi.fn().mockResolvedValue(undefined),
      },
      irrigation: {
        fetchCropSteeringHistory: vi.fn().mockResolvedValue(undefined),
      },
    },
    ui: { showToast: vi.fn() },
  };
}

describe('IrrigationDialog – Crop Steering Schedule: real VWC trace', () => {
  beforeEach(() => {
    cropSteeringHistory$.set(new Map());
  });

  // The substrate model itself (title, readout, target labels, traces, scrub
  // tooltip) is now owned by <crop-steering-day-chart> — see
  // crop-steering-day-chart.test.ts. The dialog only renders the host element
  // and the legend ("not configured" notes), exercised below.

  it('renders the <crop-steering-day-chart> with the active device', async () => {
    const history = makeHistoryResponse();
    cropSteeringHistory$.set(new Map([['gs1', history as any]]));

    const device = makeCropHistoryDevice();
    const el = await fixture<IrrigationDialog>(html`
      <irrigation-dialog
        .open=${true}
        .device=${device}
        .store=${makeVwcRenderStore() as any}
        .initialTab=${'schedules'}
        growspaceName="Tent 1"
      ></irrigation-dialog>
    `);
    await el.updateComplete;

    const chart = (await schedulesTabRoot(el)).querySelector('crop-steering-day-chart') as any;
    expect(chart).not.toBeNull();
    expect(chart.device?.deviceId).toBe(device.deviceId);
  });

  it('renders "not configured" notes for Pore EC and Bulk EC when both are absent from history', async () => {
    const history = makeHistoryResponse();
    cropSteeringHistory$.set(new Map([['gs1', history as any]]));

    const device = makeCropHistoryDevice();
    const el = await fixture<IrrigationDialog>(html`
      <irrigation-dialog
        .open=${true}
        .device=${device}
        .store=${makeVwcRenderStore() as any}
        .initialTab=${'schedules'}
        growspaceName="Tent 1"
      ></irrigation-dialog>
    `);
    await el.updateComplete;

    const legend = (await schedulesTabRoot(el)).querySelectorAll('.cs-legend')[0];
    const text = normalize(legend?.textContent);
    expect(text).toContain('Pore EC not configured');
    expect(text).toContain('Bulk EC not configured');
  });
});


// ---------------------------------------------------------------------------
// _saveAll validation: P2 Direct Trigger vs Saturation Target
// ---------------------------------------------------------------------------

describe('IrrigationDialog – save validation: P2 Direct Trigger > Saturation Target', () => {
  it('shows error toast and blocks save when soilTriggerPercent exceeds targetVwcPercent', async () => {
    const device = makeSteeringDevice({
      irrigationStrategy: {
        enabled: true,
        lightsOnTime: '07:00:00',
        p0DurationMinutes: 60,
        p2StopBeforeLightsOffMinutes: 120,
        targetVwcPercent: 50,
        maintenanceDrybackPercent: 2,
        shotDurationSeconds: 3,
        shotIntervalMinutes: 15,
      },
      irrigationConfig: {
        irrigationPumpEntity: 'switch.pump',
        soilTriggerPercent: 60,
        irrigationTimes: [],
        drainTimes: [],
      },
    });
    const el = await fixture<IrrigationDialog>(html`
      <irrigation-dialog .open=${true} .device=${device}></irrigation-dialog>
    `);
    await el.updateComplete;

    // Trigger save
    await (el as any)._saveAll();
    await el.updateComplete;

    // A toast should be set with a message about the trigger exceeding the target
    expect((el as any)._sm.toast).toBeDefined();
    expect((el as any)._sm.toast).toContain('P2 Direct Trigger');
    expect((el as any)._sm.toast).toContain('Saturation Target');
  });

  it('allows save when soilTriggerPercent is below targetVwcPercent', async () => {
    const device = makeSteeringDevice({
      irrigationStrategy: {
        enabled: true,
        lightsOnTime: '07:00:00',
        p0DurationMinutes: 60,
        p2StopBeforeLightsOffMinutes: 120,
        targetVwcPercent: 50,
        maintenanceDrybackPercent: 2,
        shotDurationSeconds: 3,
        shotIntervalMinutes: 15,
      },
      irrigationConfig: {
        irrigationPumpEntity: 'switch.pump',
        soilTriggerPercent: 48,
        irrigationTimes: [],
        drainTimes: [],
      },
    });
    const el = await fixture<IrrigationDialog>(html`
      <irrigation-dialog .open=${true} .device=${device}></irrigation-dialog>
    `);
    await el.updateComplete;

    // ADR-0015: _saveAll is a synchronous dispatcher; the P2 validation runs in
    // the handler, then the MutationRunController runs the effect post-render.
    // Let the controller cycle complete. The save itself may fail without hass,
    // surfacing a separate save-failure toast — assert the *validation* toast is
    // specifically absent rather than no toast at all.
    (el as any)._saveAll();
    await el.updateComplete;
    await new Promise((resolve) => setTimeout(resolve, 0));
    await el.updateComplete;

    expect((el as any)._sm.toast ?? '').not.toContain('P2 Direct Trigger');
  });

  it('allows save when soilTriggerPercent is null (not set)', async () => {
    const device = makeSteeringDevice({
      irrigationStrategy: {
        enabled: true,
        lightsOnTime: '07:00:00',
        p0DurationMinutes: 60,
        p2StopBeforeLightsOffMinutes: 120,
        targetVwcPercent: 50,
        maintenanceDrybackPercent: 2,
        shotDurationSeconds: 3,
        shotIntervalMinutes: 15,
      },
    });
    const el = await fixture<IrrigationDialog>(html`
      <irrigation-dialog .open=${true} .device=${device}></irrigation-dialog>
    `);
    await el.updateComplete;

    (el as any)._saveAll();
    await el.updateComplete;
    await new Promise((resolve) => setTimeout(resolve, 0));
    await el.updateComplete;

    // The P2 guard must not block the save. The save itself may fail without hass
    // in the test env, which now surfaces a separate save-failure toast — so assert
    // the *validation* toast specifically is absent rather than no toast at all.
    expect((el as any)._sm.toast ?? '').not.toContain('P2 Direct Trigger');
  });
});

// ---------------------------------------------------------------------------
// Crop Steering Day Chart: EC trace rendering
// ---------------------------------------------------------------------------

function makeEcChartStore() {
  return {
    context: {
      dataService: {},
      ui: { showToast: vi.fn() },
      data: {},
      grid: {},
      closeDialog: vi.fn(),
      refreshData: vi.fn().mockResolvedValue(undefined),
    },
    actions: {
      library: {
        fetchECRampCurves: vi.fn().mockResolvedValue(undefined),
        saveECRampCurve: vi.fn().mockResolvedValue(undefined),
        removeECRampCurve: vi.fn().mockResolvedValue(undefined),
      },
      irrigation: {
        fetchCropSteeringHistory: vi.fn().mockResolvedValue(undefined),
      },
    },
    data: {},
    ui: { showToast: vi.fn() },
  };
}

function makeEcChartDevice() {
  return makeSteeringDevice({
    irrigationStrategy: {
      enabled: true,
      lightsOnTime: '06:00:00',
      p0DurationMinutes: 30,
      p2StopBeforeLightsOffMinutes: 60,
      targetVwcPercent: 65,
      maintenanceDrybackPercent: 3,
      shotDurationSeconds: 30,
      shotIntervalMinutes: 20,
    },
  });
}

const LIGHTS_ON_ISO = '2024-01-15T06:00:00.000Z';

function mkBucket(minutesAfterLightsOn: number, v: number | null) {
  return {
    timestamp: new Date(Date.parse(LIGHTS_ON_ISO) + minutesAfterLightsOn * 60000).toISOString(),
    value: v,
  };
}

// Per-series EC trace rendering (paths, readout) now lives in
// <crop-steering-day-chart> — see crop-steering-day-chart.test.ts. The dialog's
// concern is the legend's "not configured" notes, derived from the same shared
// history atom, exercised below.
describe('IrrigationDialog – Crop Steering Day Chart legend: EC sensor presence', () => {
  it('shows no "not configured" notes when both EC series are present', async () => {
    cropSteeringHistory$.set(new Map([['gs1', {
      growspace_id: 'gs1',
      lights_on: LIGHTS_ON_ISO,
      soil_moisture: [mkBucket(0, 55), mkBucket(5, 57)],
      pore_ec: [mkBucket(0, 2.1), mkBucket(5, 2.2)],
      bulk_ec: [mkBucket(0, 1.8), mkBucket(5, 1.9)],
    }]]));

    const el = await fixture<IrrigationDialog>(html`
      <irrigation-dialog
        .open=${true}
        .device=${makeEcChartDevice()}
        .store=${makeEcChartStore() as any}
        .initialTab=${'schedules'}
        growspaceName="Tent 1"
      ></irrigation-dialog>
    `);
    await el.updateComplete;
    await new Promise((resolve) => setTimeout(resolve, 0));
    await el.updateComplete;

    const legend = (await schedulesTabRoot(el)).querySelectorAll('.cs-legend')[0];
    const text = normalize(legend?.textContent);
    expect(text).not.toContain('Pore EC not configured');
    expect(text).not.toContain('Bulk EC not configured');
  });

  it('shows a "Pore EC not configured" note when pore_ec is absent', async () => {
    cropSteeringHistory$.set(new Map([['gs1', {
      growspace_id: 'gs1',
      lights_on: LIGHTS_ON_ISO,
      soil_moisture: [mkBucket(0, 55), mkBucket(5, 57)],
      bulk_ec: [mkBucket(0, 1.8), mkBucket(5, 1.9)],
    }]]));

    const el = await fixture<IrrigationDialog>(html`
      <irrigation-dialog
        .open=${true}
        .device=${makeEcChartDevice()}
        .store=${makeEcChartStore() as any}
        .initialTab=${'schedules'}
        growspaceName="Tent 1"
      ></irrigation-dialog>
    `);
    await el.updateComplete;
    await new Promise((resolve) => setTimeout(resolve, 0));
    await el.updateComplete;

    const legend = (await schedulesTabRoot(el)).querySelectorAll('.cs-legend')[0];
    const text = normalize(legend?.textContent);
    expect(text).toContain('Pore EC not configured');
    expect(text).not.toContain('Bulk EC not configured');
  });

  it('shows both "not configured" notes when both EC series are absent', async () => {
    cropSteeringHistory$.set(new Map([['gs1', {
      growspace_id: 'gs1',
      lights_on: LIGHTS_ON_ISO,
      soil_moisture: [mkBucket(0, 55), mkBucket(5, 57)],
    }]]));

    const el = await fixture<IrrigationDialog>(html`
      <irrigation-dialog
        .open=${true}
        .device=${makeEcChartDevice()}
        .store=${makeEcChartStore() as any}
        .initialTab=${'schedules'}
        growspaceName="Tent 1"
      ></irrigation-dialog>
    `);
    await el.updateComplete;
    await new Promise((resolve) => setTimeout(resolve, 0));
    await el.updateComplete;

    const legend = (await schedulesTabRoot(el)).querySelectorAll('.cs-legend')[0];
    const text = normalize(legend?.textContent);
    expect(text).toContain('Pore EC not configured');
    expect(text).toContain('Bulk EC not configured');
  });
});
