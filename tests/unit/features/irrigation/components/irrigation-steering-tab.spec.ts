/**
 * Irrigation Steering Tab Component — mount-and-assert test (ADR-0019 + ADR-0012/0014/0017).
 *
 * Mounts the dumb element from a hand-built ViewModel — no SM, no slices, no host.
 * The crux: the steering UI writes TWO drafts, surfaced as DISTINCT intents
 * (`steering-draft-changed` vs `steering-config-changed`), and the two confirm
 * flows emit request / confirmed / cancelled intents. The component holds no
 * `@state()`.
 */
import { describe, it, expect } from 'vitest';
import { fixture, html } from '@open-wc/testing-helpers';
import { render, type TemplateResult } from 'lit';
import { IrrigationSteeringTab } from '../../../../../src/features/irrigation/components/irrigation-steering-tab';
import type {
  SteeringTabViewModel,
  PhaseShotDescriptor,
  TimingExplainerVM,
} from '../../../../../src/features/irrigation/viewmodels/steering-tab.viewmodel';
import { TIMING, DOSING, ADAPTIVE } from '../../../../../src/features/irrigation/help-copy';
import type { HelpCopy } from '../../../../../src/features/shared/ui/gs-help-tooltip';

for (const tag of [
  'ha-svg-icon',
  'md3-number-input',
  'md3-switch',
  'md3-text-input',
  'gs-help-tooltip',
]) {
  if (!customElements.get(tag)) customElements.define(tag, class extends HTMLElement {});
}
// `gs-dialog` slots its content; give the stub a shadow root with a <slot> so the
// confirm-overlay markup (and its buttons) is actually projected and queryable.
if (!customElements.get('gs-dialog')) {
  customElements.define(
    'gs-dialog',
    class extends HTMLElement {
      constructor() {
        super();
        this.attachShadow({ mode: 'open' }).appendChild(document.createElement('slot'));
      }
    }
  );
}
if (!customElements.get('irrigation-steering-tab')) {
  customElements.define('irrigation-steering-tab', IrrigationSteeringTab);
}

function secondsPhaseShots(): PhaseShotDescriptor[] {
  return [
    {
      id: 'p1',
      label: 'P1',
      sizeField: 'p1ShotDurationSeconds',
      sizeLabel: 'P1 Shot Duration (sec)',
      sizeValue: 15,
      intervalField: 'p1ShotIntervalMinutes',
      intervalValue: 15,
      isVolume: false,
    },
    {
      id: 'p2',
      label: 'P2',
      sizeField: 'p2ShotDurationSeconds',
      sizeLabel: 'P2 Shot Duration (sec)',
      sizeValue: 15,
      intervalField: 'p2ShotIntervalMinutes',
      intervalValue: 15,
      isVolume: false,
    },
  ];
}

function volumePhaseShots(): PhaseShotDescriptor[] {
  return secondsPhaseShots().map((p) => ({
    ...p,
    sizeField: `${p.id}ShotVolumePercent` as PhaseShotDescriptor['sizeField'],
    sizeLabel: `${p.label} Shot Size (%)`,
    isVolume: true,
  }));
}

/** A derived Timing explainer for a 06:00 → 18:00 day with the shipped defaults. */
function timingExplainer(overrides: Partial<TimingExplainerVM> = {}): TimingExplainerVM {
  return {
    segments: [
      { id: 'p0', label: 'P0', weight: 60 },
      { id: 'p1', label: 'P1', weight: 198 },
      { id: 'p2', label: 'P2', weight: 342 },
      { id: 'p3', label: 'P3', weight: 120 },
    ],
    boundaries: [
      { id: 'lightsOn', time: '06:00' },
      { id: 'p0End', time: '07:00' },
      { id: 'scheduledP3', time: '16:00' },
      { id: 'lightsOff', time: '18:00' },
    ],
    ...overrides,
  };
}

function makeVm(overrides: Partial<SteeringTabViewModel> = {}): SteeringTabViewModel {
  return {
    declaredMode: null,
    modes: [
      { id: 'vegetative', name: 'Vegetative', desc: 'veg' },
      { id: 'balanced', name: 'Balanced', desc: 'bal' },
      { id: 'generative', name: 'Generative', desc: 'gen' },
    ],
    confirmMode: null,
    confirmPhase: null,
    activePhase: 'p2',
    draft: {
      enabled: true,
      autoLightTracking: false,
      targetVwcPercent: 45,
      maintenanceDrybackPercent: 3,
      lightsOnTime: '06:00:00',
      p0DurationMinutes: 60,
      p2StopBeforeLightsOffMinutes: 120,
      dynamicShotEnabled: true,
      dynamicAggressiveness: 1.0,
      dynamicRecovery: 0.1,
      dynamicShotSizeFloor: 0.5,
      dynamicIntervalCeiling: 1.5,
      detectedLightsOnTime: null,
    },
    hasLightSensors: true,
    detectedLightsOnTime: null,
    phaseShots: secondsPhaseShots(),
    resolvedDayHours: 12,
    timingExplainer: null,
    adaptiveEnabled: true,
    soilTriggerPercent: null,
    autoAdvanceP1ToP2: false,
    autoAdvanceP2ToP3: false,
    haltOnRunoffEcThreshold: null,
    ...overrides,
  };
}

async function mount(vm: SteeringTabViewModel): Promise<IrrigationSteeringTab> {
  const el = await fixture<IrrigationSteeringTab>(
    html`<irrigation-steering-tab .vm=${vm}></irrigation-steering-tab>`
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

describe('irrigation-steering-tab', () => {
  it('holds no @state() of its own — only the `vm` reactive property', () => {
    const props = (
      IrrigationSteeringTab as unknown as {
        elementProperties: Map<string, { state?: boolean }>;
      }
    ).elementProperties;
    expect([...props.entries()].filter(([, d]) => d.state === true)).toEqual([]);
  });

  it('renders the mode selector, phase cards, VWC config and phase triggers', async () => {
    const el = await mount(makeVm());
    const text = norm(el.shadowRoot!.textContent);
    expect(text).toContain('Steering Mode');
    expect(text).toContain('Crop Steering Phases');
    expect(text).toContain('VWC Strategy Configuration');
    expect(text).toContain('Phase Triggers');
    expect(text).toContain('Adaptive Shot Control');
  });

  // ── Steering-draft intents (UPDATE_STEERING_DRAFT) ──

  it('emits steering-draft-changed when Enable VWC Steering toggles', async () => {
    const el = await mount(makeVm());
    const sw = el.shadowRoot!.querySelector('[data-field="enabled"]') as HTMLElement & {
      checked: boolean;
    };
    const evt = await captureIntent(el, 'steering-draft-changed', () => {
      (sw as unknown as { checked: boolean }).checked = false;
      sw.dispatchEvent(new Event('change'));
    });
    expect(evt.detail).toEqual({ partial: { enabled: false } });
  });

  it('emits steering-draft-changed parsing P1 shot duration with parseInt (Seconds mode)', async () => {
    const el = await mount(makeVm());
    const input = el.shadowRoot!.querySelector(
      '[data-field="p1ShotDurationSeconds"]'
    ) as HTMLElement;
    const evt = await captureIntent(el, 'steering-draft-changed', () =>
      input.dispatchEvent(new CustomEvent('change', { detail: '22.7' }))
    );
    expect(evt.detail).toEqual({ partial: { p1ShotDurationSeconds: 22 } });
  });

  it('emits steering-draft-changed parsing the shot size with parseFloat (Volume mode)', async () => {
    const volShots: PhaseShotDescriptor[] = [
      {
        id: 'p1',
        label: 'P1',
        sizeField: 'p1ShotVolumePercent',
        sizeLabel: 'P1 Shot Size (%)',
        sizeValue: 4,
        intervalField: 'p1ShotIntervalMinutes',
        intervalValue: 15,
        isVolume: true,
      },
      {
        id: 'p2',
        label: 'P2',
        sizeField: 'p2ShotVolumePercent',
        sizeLabel: 'P2 Shot Size (%)',
        sizeValue: 4,
        intervalField: 'p2ShotIntervalMinutes',
        intervalValue: 15,
        isVolume: true,
      },
    ];
    const el = await mount(makeVm({ phaseShots: volShots }));
    const input = el.shadowRoot!.querySelector('[data-field="p1ShotVolumePercent"]') as HTMLElement;
    const evt = await captureIntent(el, 'steering-draft-changed', () =>
      input.dispatchEvent(new CustomEvent('change', { detail: '4.5' }))
    );
    expect(evt.detail).toEqual({ partial: { p1ShotVolumePercent: 4.5 } });
  });

  it('hides the Adaptive Shot tunables when adaptiveEnabled is false', async () => {
    const el = await mount(
      makeVm({ adaptiveEnabled: false, draft: { ...makeVm().draft, dynamicShotEnabled: false } })
    );
    expect(el.shadowRoot!.querySelector('[data-field="dynamicAggressiveness"]')).toBeNull();
  });

  // ── Config-draft intents (UPDATE_CONFIG_DRAFT) — the second write path ──

  it('emits steering-config-changed for the P2 Direct Trigger field', async () => {
    const el = await mount(makeVm());
    // P2 Direct Trigger is the md3-number-input with placeholder "Off".
    const inputs = Array.from(el.shadowRoot!.querySelectorAll('md3-number-input')) as HTMLElement[];
    const p2direct = inputs.find((i) => i.getAttribute('placeholder') === 'Off')!;
    const evt = await captureIntent(el, 'steering-config-changed', () =>
      p2direct.dispatchEvent(new CustomEvent('change', { detail: '38' }))
    );
    expect(evt.detail).toEqual({ partial: { soilTriggerPercent: 38 } });
  });

  it('emits steering-config-changed when Auto-advance P1 → P2 toggles', async () => {
    const el = await mount(makeVm());
    const sw = el.shadowRoot!.querySelector('[data-field="autoAdvanceP1ToP2"]') as HTMLElement & {
      checked: boolean;
    };
    const evt = await captureIntent(el, 'steering-config-changed', () => {
      (sw as unknown as { checked: boolean }).checked = true;
      sw.dispatchEvent(new Event('change'));
    });
    expect(evt.detail).toEqual({ partial: { autoAdvanceP1ToP2: true } });
  });

  it('emits steering-config-changed setting the halt-EC threshold to 4.0 on enable', async () => {
    const el = await mount(makeVm({ haltOnRunoffEcThreshold: null }));
    const sw = el.shadowRoot!.querySelector('[data-field="haltOnRunoffEc"]') as HTMLElement & {
      checked: boolean;
    };
    const evt = await captureIntent(el, 'steering-config-changed', () => {
      (sw as unknown as { checked: boolean }).checked = true;
      sw.dispatchEvent(new Event('change'));
    });
    expect(evt.detail).toEqual({ partial: { haltOnRunoffEcThreshold: 4.0 } });
  });

  // ── Steering Mode confirm flow (ADR-0012) ──

  it('emits steering-mode-requested when a mode card is clicked', async () => {
    const el = await mount(makeVm());
    const card = el.shadowRoot!.querySelector('[data-steering-mode="generative"]') as HTMLElement;
    const evt = await captureIntent(el, 'steering-mode-requested', () => card.click());
    expect(evt.detail).toEqual({ mode: 'generative' });
  });

  it('renders the mode-confirm overlay and emits confirmed / cancelled', async () => {
    const el = await mount(makeVm({ confirmMode: 'balanced' }));
    const apply = el.shadowRoot!.querySelector(
      '[data-action="confirm-steering-mode"]'
    ) as HTMLButtonElement;
    // The mode overlay is the gs-dialog that owns the Apply button.
    const modeOverlay = apply.closest('gs-dialog')!;
    expect(modeOverlay.getAttribute('heading')).toBe('Apply Steering Mode');
    expect(norm(modeOverlay.textContent)).toContain('Apply the balanced preset?');
    const confirmed = await captureIntent(el, 'steering-mode-confirmed', () => apply.click());
    expect(confirmed.type).toBe('steering-mode-confirmed');

    const cancel = modeOverlay.querySelector('.md3-button.tonal') as HTMLButtonElement;
    const cancelled = await captureIntent(el, 'steering-mode-cancelled', () => cancel.click());
    expect(cancelled.type).toBe('steering-mode-cancelled');
  });

  // ── Phase change confirm flow (ADR-0012) ──

  it('emits phase-change-requested when a non-active phase card is clicked', async () => {
    const el = await mount(makeVm({ activePhase: 'p2' }));
    const cards = Array.from(el.shadowRoot!.querySelectorAll('.phase-card')) as HTMLElement[];
    // The P1 phase card (not a mode card) — find by its label text.
    const p1Card = cards.find((c) => norm(c.textContent).includes('Saturation'))!;
    const evt = await captureIntent(el, 'phase-change-requested', () => p1Card.click());
    expect(evt.detail).toEqual({ phase: 'p1' });
  });

  it('does NOT emit phase-change-requested when the active phase card is clicked', async () => {
    const el = await mount(makeVm({ activePhase: 'p2' }));
    const cards = Array.from(el.shadowRoot!.querySelectorAll('.phase-card')) as HTMLElement[];
    const p2Card = cards.find((c) => norm(c.textContent).includes('Maintenance'))!;
    let fired = false;
    el.addEventListener('phase-change-requested', () => {
      fired = true;
    });
    p2Card.click();
    await el.updateComplete;
    expect(fired).toBe(false);
  });

  it('renders the phase-confirm overlay and emits confirmed / cancelled', async () => {
    const el = await mount(makeVm({ activePhase: 'p2', confirmPhase: 'p1' }));
    const buttons = Array.from(
      el.shadowRoot!.querySelectorAll('.md3-button')
    ) as HTMLButtonElement[];
    const confirmBtn = buttons.find((b) => norm(b.textContent) === 'Confirm')!;
    const phaseOverlay = confirmBtn.closest('gs-dialog')!;
    expect(phaseOverlay.getAttribute('heading')).toBe('Confirm Phase Transition');
    expect(norm(phaseOverlay.textContent)).toContain('transition from P2 to P1');
    const confirmed = await captureIntent(el, 'phase-change-confirmed', () => confirmBtn.click());
    expect(confirmed.type).toBe('phase-change-confirmed');

    const cancelBtn = phaseOverlay.querySelector('.md3-button.tonal') as HTMLButtonElement;
    const cancelled = await captureIntent(el, 'phase-change-cancelled', () => cancelBtn.click());
    expect(cancelled.type).toBe('phase-change-cancelled');
  });
  // ─── Field help copy ──────────────────────────────────────────────────────
  //
  // These assert copy IDENTITY, not merely presence: the realistic failure for
  // a dozen hand-wired tooltips is a copy/paste that puts P1's sentence on P2's
  // field. Comparing against the imported constant is what catches that.
  //
  // Lit's property binding assigns straight onto the element, so the plain
  // `md3-number-input` stub records `.help` without needing to declare it.

  describe('field help copy', () => {
    const helpOf = (el: IrrigationSteeringTab, field: string): HelpCopy | undefined =>
      (
        el.shadowRoot!.querySelector(`md3-number-input[data-field="${field}"]`) as unknown as {
          help?: HelpCopy;
        } | null
      )?.help;

    const helpByLabel = (el: IrrigationSteeringTab, label: string): Element | undefined =>
      Array.from(el.shadowRoot!.querySelectorAll('gs-help-tooltip')).find(
        (t) => t.getAttribute('label') === label
      );

    it('wires each Timing field to its own copy', async () => {
      const el = await mount(makeVm());
      // P0 Duration and P2 Stop Buffer carry no data-field, so query by label.
      const inputs = Array.from(el.shadowRoot!.querySelectorAll('md3-number-input')) as unknown as {
        label?: string;
        getAttribute(n: string): string | null;
        help?: HelpCopy;
      }[];
      const byLabel = (label: string) =>
        inputs.find((i) => i.getAttribute('label') === label)?.help;

      expect(byLabel('P0 Duration (min)')).toBe(TIMING.p0Duration);
      expect(byLabel('P2 Stop Buffer (min)')).toBe(TIMING.p2StopBuffer);
    });

    it('gives read-only Lights On Time its own tooltip, alongside the navigational hint', async () => {
      const el = await mount(makeVm());
      const tip = helpByLabel(el, TIMING.lightsOnTime.label);
      expect(tip?.getAttribute('content')).toBe(TIMING.lightsOnTime.content);
      // The visible hint answers a different question and must survive.
      expect(norm(el.shadowRoot!.querySelector('.lights-on-hint')?.textContent)).toBe(
        'Set in Config → Growlights.'
      );
    });

    it('renders a section explainer for Timing and for Dosing', async () => {
      const el = await mount(makeVm());
      expect(helpByLabel(el, TIMING.section.label)).toBeTruthy();
      expect(helpByLabel(el, DOSING.section.label)).toBeTruthy();
    });

    it('wires each phase shot interval to its own copy', async () => {
      const el = await mount(makeVm());
      expect(helpOf(el, 'p1ShotIntervalMinutes')).toBe(DOSING.p1Interval);
      expect(helpOf(el, 'p2ShotIntervalMinutes')).toBe(DOSING.p2Interval);
    });

    it('picks duration-mode shot-size copy when the sizing mode is seconds', async () => {
      const el = await mount(makeVm({ phaseShots: secondsPhaseShots() }));
      expect(helpOf(el, 'p1ShotDurationSeconds')).toBe(DOSING.p1Size.duration);
      expect(helpOf(el, 'p2ShotDurationSeconds')).toBe(DOSING.p2Size.duration);
    });

    it('picks volume-mode shot-size copy when the sizing mode is volume', async () => {
      const el = await mount(makeVm({ phaseShots: volumePhaseShots() }));
      expect(helpOf(el, 'p1ShotVolumePercent')).toBe(DOSING.p1Size.volume);
      expect(helpOf(el, 'p2ShotVolumePercent')).toBe(DOSING.p2Size.volume);
    });

    it('wires each Adaptive Shot Control tunable to its own copy', async () => {
      const el = await mount(makeVm({ adaptiveEnabled: true }));
      expect(helpOf(el, 'dynamicAggressiveness')).toBe(ADAPTIVE.aggressiveness);
      expect(helpOf(el, 'dynamicRecovery')).toBe(ADAPTIVE.recovery);
      expect(helpOf(el, 'dynamicShotSizeFloor')).toBe(ADAPTIVE.sizeFloor);
      expect(helpOf(el, 'dynamicIntervalCeiling')).toBe(ADAPTIVE.intervalCeiling);
    });
  });
  // ── Timing explainer — this growspace's own boundaries (issue #43) ──

  describe('the Timing explainer', () => {
    /**
     * The explainer is handed to `gs-help-tooltip` as a `TemplateResult`, and the
     * stub tooltip here never renders it. Take it off the property and render it
     * directly — the assertions are about the markup the tab composes, not about
     * the popover mechanics the tooltip's own spec covers.
     */
    const explainerOf = async (vm: SteeringTabViewModel): Promise<HTMLElement> => {
      const el = await mount(vm);
      const tip = Array.from(el.shadowRoot!.querySelectorAll('gs-help-tooltip')).find(
        (t) => t.getAttribute('label') === TIMING.section.label
      ) as (Element & { content?: TemplateResult }) | undefined;
      const host = document.createElement('div');
      render(tip!.content!, host);
      return host;
    };

    const rows = (host: HTMLElement): Array<[string, string, string]> =>
      Array.from(host.querySelectorAll('[data-boundary]')).map((time) => [
        time.getAttribute('data-boundary')!,
        norm(time.textContent),
        norm(time.nextElementSibling?.textContent),
      ]);

    it("names each derived boundary with its time and the glossary's wording", async () => {
      const host = await explainerOf(makeVm({ timingExplainer: timingExplainer() }));
      expect(rows(host)).toEqual([
        ['lightsOn', '06:00', TIMING.boundaries.lightsOn],
        ['p0End', '07:00', TIMING.boundaries.p0End],
        ['scheduledP3', '16:00', TIMING.boundaries.scheduledP3],
        ['lightsOff', '18:00', TIMING.boundaries.lightsOff],
      ]);
    });

    it('distinguishes the Actual P3 Boundary from the scheduled one', async () => {
      const host = await explainerOf(
        makeVm({
          timingExplainer: timingExplainer({
            boundaries: [
              { id: 'actualP3', time: '15:20' },
              { id: 'scheduledP3', time: '16:00' },
            ],
          }),
        })
      );
      expect(rows(host)).toEqual([
        ['actualP3', '15:20', TIMING.boundaries.actualP3],
        ['scheduledP3', '16:00', TIMING.boundaries.scheduledP3],
      ]);
    });

    it('sizes the day bar from the derived windows', async () => {
      const host = await explainerOf(makeVm({ timingExplainer: timingExplainer() }));
      const segments = Array.from(host.querySelectorAll<HTMLElement>('[data-phase]'));
      expect(segments.map((seg) => seg.getAttribute('data-phase'))).toEqual([
        'p0',
        'p1',
        'p2',
        'p3',
      ]);
      expect(segments.map((seg) => seg.style.flexGrow)).toEqual(['60', '198', '342', '120']);
    });

    it('keeps the schematic bar, with no times at all, when nothing anchors the day', async () => {
      const host = await explainerOf(makeVm({ timingExplainer: null }));
      expect(host.querySelectorAll('[data-boundary]')).toHaveLength(0);
      // No placeholder times either — the bar and its end captions are the whole answer.
      expect(norm(host.textContent)).not.toMatch(/\d\d:\d\d/);
      const segments = Array.from(host.querySelectorAll<HTMLElement>('[data-phase]'));
      expect(segments.map((seg) => seg.style.flexGrow)).toEqual(['0.7', '1.5', '2.6', '1.2']);
      expect(norm(host.textContent)).toContain('lights on');
      expect(norm(host.textContent)).toContain('lights off');
    });
  });
});
