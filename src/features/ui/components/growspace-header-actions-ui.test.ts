import { describe, it, expect, afterEach, vi } from 'vitest';
import { fixture, html } from '@open-wc/testing-helpers';
import { GrowspaceHeaderActionsUI } from './growspace-header-actions-ui';
import './growspace-header-actions-ui';

const mockTags = ['scroll-container', 'growspace-chip', 'gs-help-tooltip'];
for (const tag of mockTags) {
  if (!customElements.get(tag)) {
    customElements.define(tag, class extends HTMLElement {});
  }
}

function makeDevice(overrides: Record<string, unknown> = {}) {
  return {
    irrigationConfig: {
      irrigationPumpEntity: '',
      drainPumpEntity: '',
      irrigationTimes: [] as string[],
    },
    environmentAttributes: {
      feedEcSensors: [] as string[],
      runoffEcSensors: [] as string[],
      substrateEcSensors: [] as string[],
    },
    ...overrides,
  };
}

function createElement(props: Partial<GrowspaceHeaderActionsUI> = {}): GrowspaceHeaderActionsUI {
  const el = document.createElement('growspace-header-actions-ui') as GrowspaceHeaderActionsUI;
  Object.assign(el, props);
  return el;
}

// ---------------------------------------------------------------------------
// _chipDraggable
// ---------------------------------------------------------------------------

describe('GrowspaceHeaderActionsUI – _chipDraggable', () => {
  it('returns "true" on desktop regardless of mobileLink', () => {
    const el = createElement({ isMobile: false, mobileLink: false });
    expect((el as any)._chipDraggable).toBe('true');
  });

  it('returns "false" on mobile when mobileLink is off', () => {
    const el = createElement({ isMobile: true, mobileLink: false });
    expect((el as any)._chipDraggable).toBe('false');
  });

  it('returns "true" on mobile when mobileLink is on', () => {
    const el = createElement({ isMobile: true, mobileLink: true });
    expect((el as any)._chipDraggable).toBe('true');
  });
});

// ---------------------------------------------------------------------------
// _showECRamp
// ---------------------------------------------------------------------------

describe('GrowspaceHeaderActionsUI – _showECRamp', () => {
  it('returns false when device is undefined', () => {
    const el = createElement();
    expect((el as any)._showECRamp()).toBe(false);
  });

  it('returns false when pump present but no schedule', () => {
    const el = createElement({
      device: makeDevice({
        irrigationConfig: {
          irrigationPumpEntity: 'switch.pump',
          drainPumpEntity: '',
          irrigationTimes: [],
        },
        environmentAttributes: {
          feedEcSensors: ['sensor.ec'],
          runoffEcSensors: [],
          substrateEcSensors: [],
        },
      }) as any,
    });
    expect((el as any)._showECRamp()).toBe(false);
  });

  it('returns false when pump and schedule present but no EC sensor', () => {
    const el = createElement({
      device: makeDevice({
        irrigationConfig: {
          irrigationPumpEntity: 'switch.pump',
          drainPumpEntity: '',
          irrigationTimes: ['08:00'],
        },
        environmentAttributes: {
          feedEcSensors: [],
          runoffEcSensors: [],
          substrateEcSensors: [],
        },
      }) as any,
    });
    expect((el as any)._showECRamp()).toBe(false);
  });

  it('returns true with irrigation pump, schedule, and feed EC sensor', () => {
    const el = createElement({
      device: makeDevice({
        irrigationConfig: {
          irrigationPumpEntity: 'switch.pump',
          drainPumpEntity: '',
          irrigationTimes: ['08:00'],
        },
        environmentAttributes: {
          feedEcSensors: ['sensor.feed_ec'],
          runoffEcSensors: [],
          substrateEcSensors: [],
        },
      }) as any,
    });
    expect((el as any)._showECRamp()).toBe(true);
  });

  it('returns true with drain pump, schedule, and runoff EC sensor', () => {
    const el = createElement({
      device: makeDevice({
        irrigationConfig: {
          irrigationPumpEntity: '',
          drainPumpEntity: 'switch.drain',
          irrigationTimes: ['08:00'],
        },
        environmentAttributes: {
          feedEcSensors: [],
          runoffEcSensors: ['sensor.runoff_ec'],
          substrateEcSensors: [],
        },
      }) as any,
    });
    expect((el as any)._showECRamp()).toBe(true);
  });

  it('returns true with substrate EC sensor', () => {
    const el = createElement({
      device: makeDevice({
        irrigationConfig: {
          irrigationPumpEntity: 'switch.pump',
          drainPumpEntity: '',
          irrigationTimes: ['08:00'],
        },
        environmentAttributes: {
          feedEcSensors: [],
          runoffEcSensors: [],
          substrateEcSensors: ['sensor.substrate_ec'],
        },
      }) as any,
    });
    expect((el as any)._showECRamp()).toBe(true);
  });

  it('returns false when no pump entity is set', () => {
    const el = createElement({
      device: makeDevice({
        irrigationConfig: {
          irrigationPumpEntity: '',
          drainPumpEntity: '',
          irrigationTimes: ['08:00'],
        },
        environmentAttributes: {
          feedEcSensors: ['sensor.ec'],
          runoffEcSensors: [],
          substrateEcSensors: [],
        },
      }) as any,
    });
    expect((el as any)._showECRamp()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// render – desktop vs mobile structure
// ---------------------------------------------------------------------------

describe('GrowspaceHeaderActionsUI – desktop render', () => {
  afterEach(() => vi.restoreAllMocks());

  it('renders device chips container on desktop', async () => {
    const el = await fixture<GrowspaceHeaderActionsUI>(html`
      <growspace-header-actions-ui .isMobile=${false}></growspace-header-actions-ui>
    `);
    expect(el.shadowRoot!.querySelector('.gs-device-chips-container')).not.toBeNull();
  });

  it('does not render mobile-link button on desktop', async () => {
    const el = await fixture<GrowspaceHeaderActionsUI>(html`
      <growspace-header-actions-ui .isMobile=${false}></growspace-header-actions-ui>
    `);
    expect(el.shadowRoot!.querySelector('.mobile-link')).toBeNull();
  });

  it('renders heatmap and settings icon buttons on desktop', async () => {
    const el = await fixture<GrowspaceHeaderActionsUI>(html`
      <growspace-header-actions-ui .isMobile=${false}></growspace-header-actions-ui>
    `);
    const buttons = el.shadowRoot!.querySelectorAll('.icon-button');
    const labels = Array.from(buttons).map((b) => (b as HTMLElement).title);
    expect(labels).toContain('3D Heatmap');
    expect(labels).toContain('Settings');
  });

  it('renders edit button on desktop', async () => {
    const el = await fixture<GrowspaceHeaderActionsUI>(html`
      <growspace-header-actions-ui .isMobile=${false}></growspace-header-actions-ui>
    `);
    const buttons = el.shadowRoot!.querySelectorAll('.icon-button');
    const labels = Array.from(buttons).map((b) => (b as HTMLElement).title);
    expect(labels).toContain('Edit Mode');
  });

  it('does not show Growspace menu section on desktop', async () => {
    const el = await fixture<GrowspaceHeaderActionsUI>(html`
      <growspace-header-actions-ui .isMobile=${false}></growspace-header-actions-ui>
    `);
    const headers = el.shadowRoot!.querySelectorAll('.menu-header');
    const texts = Array.from(headers).map((h) => h.textContent?.trim());
    expect(texts).not.toContain('Growspace');
  });
});

describe('GrowspaceHeaderActionsUI – mobile render', () => {
  afterEach(() => vi.restoreAllMocks());

  it('hides device chips container on mobile', async () => {
    const el = await fixture<GrowspaceHeaderActionsUI>(html`
      <growspace-header-actions-ui .isMobile=${true}></growspace-header-actions-ui>
    `);
    expect(el.shadowRoot!.querySelector('.gs-device-chips-container')).toBeNull();
  });

  it('renders mobile-link toggle button on mobile', async () => {
    const el = await fixture<GrowspaceHeaderActionsUI>(html`
      <growspace-header-actions-ui .isMobile=${true}></growspace-header-actions-ui>
    `);
    expect(el.shadowRoot!.querySelector('.mobile-link')).not.toBeNull();
  });

  it('does not render heatmap and settings as toolbar icon buttons on mobile', async () => {
    const el = await fixture<GrowspaceHeaderActionsUI>(html`
      <growspace-header-actions-ui .isMobile=${true}></growspace-header-actions-ui>
    `);
    const buttons = el.shadowRoot!.querySelectorAll('.icon-button');
    const labels = Array.from(buttons).map((b) => (b as HTMLElement).title);
    expect(labels).not.toContain('3D Heatmap');
    expect(labels).not.toContain('Settings');
  });

  it('still renders edit button on mobile', async () => {
    const el = await fixture<GrowspaceHeaderActionsUI>(html`
      <growspace-header-actions-ui .isMobile=${true}></growspace-header-actions-ui>
    `);
    const buttons = el.shadowRoot!.querySelectorAll('.icon-button');
    const labels = Array.from(buttons).map((b) => (b as HTMLElement).title);
    expect(labels).toContain('Edit Mode');
  });

  it('shows Growspace menu section with Settings and Heatmap on mobile', async () => {
    const el = await fixture<GrowspaceHeaderActionsUI>(html`
      <growspace-header-actions-ui .isMobile=${true}></growspace-header-actions-ui>
    `);
    const headers = el.shadowRoot!.querySelectorAll('.menu-header');
    const headerTexts = Array.from(headers).map((h) => h.textContent?.trim());
    expect(headerTexts).toContain('Growspace');

    const items = el.shadowRoot!.querySelectorAll('.menu-item .menu-item-label');
    const itemTexts = Array.from(items).map((i) => i.textContent?.trim());
    expect(itemTexts).toContain('Settings');
    expect(itemTexts).toContain('3D Heatmap');
  });
});

// ---------------------------------------------------------------------------
// mobile-link toggle button state
// ---------------------------------------------------------------------------

describe('GrowspaceHeaderActionsUI – mobile-link button active state', () => {
  it('applies active class when mobileLink is true', async () => {
    const el = await fixture<GrowspaceHeaderActionsUI>(html`
      <growspace-header-actions-ui
        .isMobile=${true}
        .mobileLink=${true}
      ></growspace-header-actions-ui>
    `);
    const btn = el.shadowRoot!.querySelector('.mobile-link');
    expect(btn?.classList.contains('active')).toBe(true);
  });

  it('does not apply active class when mobileLink is false', async () => {
    const el = await fixture<GrowspaceHeaderActionsUI>(html`
      <growspace-header-actions-ui
        .isMobile=${true}
        .mobileLink=${false}
      ></growspace-header-actions-ui>
    `);
    const btn = el.shadowRoot!.querySelector('.mobile-link');
    expect(btn?.classList.contains('active')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// event dispatching
// ---------------------------------------------------------------------------

describe('GrowspaceHeaderActionsUI – events', () => {
  afterEach(() => vi.restoreAllMocks());

  it('dispatches toggle-mobile-link when mobile-link button is clicked', async () => {
    const el = await fixture<GrowspaceHeaderActionsUI>(html`
      <growspace-header-actions-ui .isMobile=${true}></growspace-header-actions-ui>
    `);
    const events: Event[] = [];
    el.addEventListener('toggle-mobile-link', (e) => events.push(e));

    const btn = el.shadowRoot!.querySelector('.mobile-link') as HTMLButtonElement;
    btn.click();

    expect(events).toHaveLength(1);
  });

  it('dispatches action-triggered with action "edit" when edit button is clicked', async () => {
    const el = await fixture<GrowspaceHeaderActionsUI>(html`
      <growspace-header-actions-ui .isMobile=${false}></growspace-header-actions-ui>
    `);
    const events: CustomEvent[] = [];
    el.addEventListener('action-triggered', (e) => events.push(e as CustomEvent));

    const editBtn = Array.from(el.shadowRoot!.querySelectorAll('.icon-button')).find(
      (b) => (b as HTMLElement).title === 'Edit Mode'
    ) as HTMLButtonElement;
    editBtn.click();

    expect(events).toHaveLength(1);
    expect(events[0].detail).toEqual({ action: 'edit' });
  });

  it('edit button has active class when isEditMode is true', async () => {
    const el = await fixture<GrowspaceHeaderActionsUI>(html`
      <growspace-header-actions-ui
        .isMobile=${false}
        .isEditMode=${true}
      ></growspace-header-actions-ui>
    `);
    const editBtn = Array.from(el.shadowRoot!.querySelectorAll('.icon-button')).find(
      (b) => (b as HTMLElement).title === 'Edit Mode'
    );
    expect(editBtn?.classList.contains('active')).toBe(true);
  });

  it('dispatches action-triggered with "water Selected" label when plants are selected', async () => {
    const el = await fixture<GrowspaceHeaderActionsUI>(html`
      <growspace-header-actions-ui
        .isMobile=${false}
        .selectedPlants=${new Set(['p1', 'p2'])}
      ></growspace-header-actions-ui>
    `);
    const waterItem = Array.from(el.shadowRoot!.querySelectorAll('.menu-item-label')).find((i) =>
      i.textContent?.includes('Water Selected')
    );
    expect(waterItem).not.toBeNull();
  });

  it('shows "Water Growspace" label when no plants are selected', async () => {
    const el = await fixture<GrowspaceHeaderActionsUI>(html`
      <growspace-header-actions-ui
        .isMobile=${false}
        .selectedPlants=${new Set()}
      ></growspace-header-actions-ui>
    `);
    const waterItem = Array.from(el.shadowRoot!.querySelectorAll('.menu-item-label')).find((i) =>
      i.textContent?.includes('Water Growspace')
    );
    expect(waterItem).not.toBeNull();
  });
});
