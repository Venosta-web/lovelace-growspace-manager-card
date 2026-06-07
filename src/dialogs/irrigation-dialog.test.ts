import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { fixture, html } from '@open-wc/testing-helpers';
import { atom } from 'nanostores';
import { transition } from './irrigation-dialog-sm';
import { cropSteeringHistory$ } from '../slices/irrigation';

afterEach(() => {
  document.body.innerHTML = '';
  cropSteeringHistory$.set(new Map());
});
import { createGrowspaceDevice } from '../services/types';
import type { IrrigationDialog } from './irrigation-dialog';
import './irrigation-dialog';

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

function makeMockStore(runCycleFn = vi.fn().mockResolvedValue(undefined)) {
  return {
    context: {
      dataService: { runIrrigationCycle: runCycleFn },
      ui: { showToast: vi.fn() },
      data: {},
      undoRedoManager: {},
      optimisticManager: {},
      grid: {},
      closeDialog: vi.fn(),
      refreshData: vi.fn().mockResolvedValue(undefined),
    },
  };
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
    const device = makeDevice({ lastCycleTimestamp: '2026-05-23T14:30:00.000Z' });
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
    const device = makeDevice({ lastCycleTimestamp: null });
    const el = await fixture<IrrigationDialog>(html`
      <irrigation-dialog .open=${true} .device=${device} growspaceName="Tent 1"></irrigation-dialog>
    `);
    await el.updateComplete;

    const meta = el.shadowRoot!.querySelector('.dlg-footer-meta');
    expect(normalize(meta?.textContent)).toContain('Last cycle —');
  });

  it('shows a formatted next-cycle time when nextScheduledCycle is set', async () => {
    const device = makeDevice({ nextScheduledCycle: '2026-05-24T06:00:00.000Z' });
    const el = await fixture<IrrigationDialog>(html`
      <irrigation-dialog .open=${true} .device=${device} growspaceName="Tent 1"></irrigation-dialog>
    `);
    await el.updateComplete;

    const meta = el.shadowRoot!.querySelector('.dlg-footer-meta');
    const text = normalize(meta?.textContent);
    expect(text).toMatch(/Next.+:/);
  });

  it('shows "—" for next-cycle when nextScheduledCycle is null', async () => {
    const device = makeDevice({ nextScheduledCycle: null });
    const el = await fixture<IrrigationDialog>(html`
      <irrigation-dialog .open=${true} .device=${device} growspaceName="Tent 1"></irrigation-dialog>
    `);
    await el.updateComplete;

    const meta = el.shadowRoot!.querySelector('.dlg-footer-meta');
    expect(normalize(meta?.textContent)).toContain('Next —');
  });
});

// ---------------------------------------------------------------------------
// Footer Run Now button
// ---------------------------------------------------------------------------

describe('IrrigationDialog – Run Now button', () => {
  it('clicking Run Now dispatches runIrrigationCycle for the current growspace', async () => {
    const mockRunCycle = vi.fn().mockResolvedValue(undefined);
    const device = makeDevice();
    const store = makeMockStore(mockRunCycle);

    const el = await fixture<IrrigationDialog>(html`
      <irrigation-dialog .open=${true} .device=${device} .store=${store as any}></irrigation-dialog>
    `);
    await el.updateComplete;

    const btn = Array.from(el.shadowRoot!.querySelectorAll('button.md3-button')).find(
      (b) => b.textContent?.trim() === 'Run Now'
    ) as HTMLButtonElement | undefined;

    expect(btn).toBeTruthy();
    expect(btn!.disabled).toBe(false);

    btn!.click();
    // Flush the microtask queue so the async handler runs.
    await new Promise((r) => setTimeout(r, 0));

    expect(mockRunCycle).toHaveBeenCalledWith({ growspaceId: 'gs1' });
  });

  it('shows "Starting…" and disables the button while the request is in flight', async () => {
    const device = makeDevice();
    const el = await fixture<IrrigationDialog>(html`
      <irrigation-dialog .open=${true} .device=${device}></irrigation-dialog>
    `);

    (el as any)._sm = transition((el as any)._sm, { type: 'SET_RUN_NOW_SAVING', saving: true });
    await el.updateComplete;

    const btn = Array.from(el.shadowRoot!.querySelectorAll('button.md3-button')).find((b) =>
      b.textContent?.includes('Starting')
    ) as HTMLButtonElement | undefined;

    expect(btn).toBeTruthy();
    expect(btn!.disabled).toBe(true);
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

describe('IrrigationDialog – Crop Steering Schedule: phase anchor', () => {
  it('anchors phases on detectedLightsOnTime when set, not the configured lightsOnTime', async () => {
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
        detectedLightsOnTime: '07:30:00',
      },
    });
    const el = await fixture<IrrigationDialog>(html`
      <irrigation-dialog
        .open=${true}
        .device=${device}
        .initialTab=${'schedules'}
      ></irrigation-dialog>
    `);
    await el.updateComplete;

    const schedule = el.shadowRoot!.querySelector('.crop-steering-schedule');
    expect(schedule).not.toBeNull();
    // P1 (Saturation) should start at the detected lights-on time (07:30), not the configured one (06:00).
    const text = normalize(schedule!.textContent);
    expect(text).toContain('07:30–08:00 · Reach FC');
    expect(text).not.toContain('06:00–06:30 · Reach FC');
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
// EC Ramp tab
// ---------------------------------------------------------------------------

function makeEcRampStore(fetchFn = vi.fn().mockResolvedValue(undefined)) {
  return {
    context: {
      dataService: {},
      ui: { showToast: vi.fn() },
      data: {},
      undoRedoManager: {},
      optimisticManager: {},
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

    const content = el.shadowRoot!.querySelector('.v1-content');
    expect(content?.textContent).toMatch(/no ec ramp curves/i);
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
    await new Promise((r) => setTimeout(r, 0));

    expect(fetchFn).toHaveBeenCalledOnce();
  });

  it('resets view to LIST when navigating away and back to ec_ramp tab', async () => {
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

    // Simulate entering EDIT view
    (el as any)._ecRampView = 'EDIT';
    await el.updateComplete;

    // Navigate away then back
    const schedulesNav = el.shadowRoot!.querySelector('[data-tab="schedules"]') as HTMLElement;
    schedulesNav.click();
    await el.updateComplete;

    const ecRampNav = el.shadowRoot!.querySelector('[data-tab="ec_ramp"]') as HTMLElement;
    ecRampNav.click();
    await el.updateComplete;

    expect((el as any)._ecRampView).toBe('LIST');
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
      undoRedoManager: {},
      optimisticManager: {},
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
    await new Promise((r) => setTimeout(r, 0));

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
    await new Promise((r) => setTimeout(r, 0));

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
    await new Promise((r) => setTimeout(r, 0));
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
    await new Promise((r) => setTimeout(r, 0));
    expect(fetchFn).toHaveBeenCalledOnce();

    // Navigate away then back
    const configNav = el.shadowRoot!.querySelector('[data-tab="config"]') as HTMLElement;
    configNav.click();
    await el.updateComplete;

    const schedulesNav = el.shadowRoot!.querySelector('[data-tab="schedules"]') as HTMLElement;
    schedulesNav.click();
    await el.updateComplete;
    await new Promise((r) => setTimeout(r, 0));

    expect(fetchFn).toHaveBeenCalledOnce();
  });
});

describe('IrrigationDialog – Tanks tab inline edit', () => {
  it('renders a pencil button for each tank row', async () => {
    const device = makeTankDevice();
    const el = await fixture<IrrigationDialog>(html`
      <irrigation-dialog
        .open=${true}
        .device=${device}
        .initialTab=${'tanks'}
        growspaceName="Tent 1"
      ></irrigation-dialog>
    `);
    await el.updateComplete;

    const pencilBtns = el.shadowRoot!.querySelectorAll('button.tank-edit-btn');
    expect(pencilBtns.length).toBe(2);
  });

  it('clicking pencil reveals an inline edit form', async () => {
    const device = makeTankDevice();
    const el = await fixture<IrrigationDialog>(html`
      <irrigation-dialog
        .open=${true}
        .device=${device}
        .initialTab=${'tanks'}
        growspaceName="Tent 1"
      ></irrigation-dialog>
    `);
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector('.tank-edit-form')).toBeNull();

    const firstPencil = el.shadowRoot!.querySelector('button.tank-edit-btn') as HTMLButtonElement;
    firstPencil.click();
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector('.tank-edit-form')).not.toBeNull();
  });

  it('edit form pre-populates with the tank\'s current values', async () => {
    const device = makeTankDevice();
    const el = await fixture<IrrigationDialog>(html`
      <irrigation-dialog
        .open=${true}
        .device=${device}
        .initialTab=${'tanks'}
        growspaceName="Tent 1"
      ></irrigation-dialog>
    `);
    await el.updateComplete;

    const pencilBtns = el.shadowRoot!.querySelectorAll('button.tank-edit-btn');
    (pencilBtns[0] as HTMLButtonElement).click();
    await el.updateComplete;

    const form = el.shadowRoot!.querySelector('.tank-edit-form')!;
    const inputs = form.querySelectorAll('input.md3-input');
    // sensorEntity, name, volume, warningLevel
    expect((inputs[0] as HTMLInputElement).value).toBe('sensor.tank_a');
    expect((inputs[1] as HTMLInputElement).value).toBe('Tank A');
    expect((inputs[2] as HTMLInputElement).value).toBe('200');
    expect((inputs[3] as HTMLInputElement).value).toBe('20');
  });

  it('clicking Cancel hides the edit form', async () => {
    const device = makeTankDevice();
    const el = await fixture<IrrigationDialog>(html`
      <irrigation-dialog
        .open=${true}
        .device=${device}
        .initialTab=${'tanks'}
        growspaceName="Tent 1"
      ></irrigation-dialog>
    `);
    await el.updateComplete;

    (el.shadowRoot!.querySelector('button.tank-edit-btn') as HTMLButtonElement).click();
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('.tank-edit-form')).not.toBeNull();

    const cancelBtn = Array.from(
      el.shadowRoot!.querySelectorAll('.tank-edit-form button')
    ).find((b) => b.textContent?.trim() === 'Cancel') as HTMLButtonElement;
    cancelBtn.click();
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector('.tank-edit-form')).toBeNull();
  });

  it('clicking Save calls configureEnvironment with the updated tank and closes the form', async () => {
    const device = makeTankDevice();
    const configureEnvironment = vi.fn().mockResolvedValue(undefined);

    const el = await fixture<IrrigationDialog>(html`
      <irrigation-dialog
        .open=${true}
        .device=${device}
        .initialTab=${'tanks'}
        growspaceName="Tent 1"
      ></irrigation-dialog>
    `);
    await el.updateComplete;

    // Inject mock data service
    (el as any)._dataService = { configureEnvironment };

    // Open edit for Tank A (index 0)
    (el.shadowRoot!.querySelector('button.tank-edit-btn') as HTMLButtonElement).click();
    await el.updateComplete;

    // Change warning level
    const form = el.shadowRoot!.querySelector('.tank-edit-form')!;
    const warningInput = form.querySelectorAll('input.md3-input')[3] as HTMLInputElement;
    warningInput.value = '25';
    warningInput.dispatchEvent(new Event('input'));
    await el.updateComplete;

    const saveBtn = Array.from(form.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Save'
    ) as HTMLButtonElement;
    saveBtn.click();
    await new Promise((r) => setTimeout(r, 0));
    await el.updateComplete;

    expect(configureEnvironment).toHaveBeenCalledOnce();
    const [call] = configureEnvironment.mock.calls;
    expect(call[0].growspaceId).toBe('gs1');
    expect(call[0].irrigationTanks[0].warningLevel).toBe(25);
    // Other tank unchanged
    expect(call[0].irrigationTanks[1].name).toBe('Tank B');

    // Form dismissed
    expect(el.shadowRoot!.querySelector('.tank-edit-form')).toBeNull();
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
      undoRedoManager: {},
      optimisticManager: {},
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

  it('renders "Substrate VWC" (not "modeled") as the trace label', async () => {
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

    const schedule = el.shadowRoot!.querySelector('.crop-steering-schedule');
    expect(normalize(schedule!.textContent)).toContain('Substrate VWC');
    expect(normalize(schedule!.textContent)).not.toContain('modeled');
  });

  it('renders multiple <path> elements when soil_moisture has a null-gap', async () => {
    const soil_moisture = makeSoilBuckets(12, 42.0, 5);
    const history = makeHistoryResponse({ soil_moisture });
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

    const vwcSvg = el.shadowRoot!.querySelector('.cs-model svg');
    expect(vwcSvg).not.toBeNull();
    const paths = vwcSvg!.querySelectorAll('path[stroke]');
    expect(paths.length).toBeGreaterThan(1);
  });

  it('shows "Target X%" and "P3 trigger X%" reference labels on the substrate model', async () => {
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

    const model = el.shadowRoot!.querySelector('.cs-model');
    expect(model).not.toBeNull();
    const labels = Array.from(model!.querySelectorAll('.cm-target')).map((t) => t.textContent ?? '');
    expect(labels.some((l) => l.includes('Target') && l.includes('%'))).toBe(true);
    expect(labels.some((l) => l.includes('P3 trigger') && l.includes('%'))).toBe(true);
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

    const legend = el.shadowRoot!.querySelectorAll('.cs-legend')[0];
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

    // Trigger save — should NOT set a toast
    await (el as any)._saveAll();
    await el.updateComplete;

    expect((el as any)._sm.toast).toBeUndefined();
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

    await (el as any)._saveAll();
    await el.updateComplete;

    expect((el as any)._sm.toast).toBeUndefined();
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
      undoRedoManager: {},
      optimisticManager: {},
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

describe('IrrigationDialog – Crop Steering Day Chart EC traces', () => {
  it('renders Pore EC and Bulk EC paths when both series are present', async () => {
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
    await new Promise((r) => setTimeout(r, 0));
    await el.updateComplete;

    const svg = el.shadowRoot!.querySelector('.cs-model svg');
    const strokes = Array.from(svg?.querySelectorAll('path') ?? []).map((p) =>
      p.getAttribute('stroke')
    );
    expect(strokes).toContain('#ef5350');
    expect(strokes).toContain('#ff7043');

    const legend = el.shadowRoot!.querySelectorAll('.cs-legend')[0];
    expect(normalize(legend?.textContent)).toContain('Pore EC · mS/cm');
    expect(normalize(legend?.textContent)).toContain('Bulk EC · mS/cm');
  });

  it('omits Pore EC path and shows "not configured" note when pore_ec is absent', async () => {
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
    await new Promise((r) => setTimeout(r, 0));
    await el.updateComplete;

    const svg = el.shadowRoot!.querySelector('.cs-model svg');
    const strokes = Array.from(svg?.querySelectorAll('path') ?? []).map((p) =>
      p.getAttribute('stroke')
    );
    expect(strokes).not.toContain('#ef5350');
    expect(strokes).toContain('#ff7043');

    const legend = el.shadowRoot!.querySelectorAll('.cs-legend')[0];
    const text = normalize(legend?.textContent);
    expect(text).toContain('Pore EC not configured');
    expect(text).toContain('Bulk EC · mS/cm');
  });

  it('omits both EC paths and shows two "not configured" notes when both EC series are absent', async () => {
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
    await new Promise((r) => setTimeout(r, 0));
    await el.updateComplete;

    const svg = el.shadowRoot!.querySelector('.cs-model svg');
    const strokes = Array.from(svg?.querySelectorAll('path') ?? []).map((p) =>
      p.getAttribute('stroke')
    );
    expect(strokes).not.toContain('#ef5350');
    expect(strokes).not.toContain('#ff7043');

    const legend = el.shadowRoot!.querySelectorAll('.cs-legend')[0];
    const text = normalize(legend?.textContent);
    expect(text).toContain('Pore EC not configured');
    expect(text).toContain('Bulk EC not configured');
  });
});
