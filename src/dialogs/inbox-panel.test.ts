import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fixture, html } from '@open-wc/testing-helpers';
import { aiAlerts$, aiEnabled$ } from '../slices/ai-insight';
import type { TriageAlert } from '../slices/ai-insight/schema';
/* eslint-disable import/no-duplicates */
import './inbox-panel';
import { GmInboxPanel } from './inbox-panel';
/* eslint-enable import/no-duplicates */

vi.mock('../slices/ai-insight', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../slices/ai-insight')>();
  return {
    ...actual,
    fetchAlerts: vi.fn(),
    resolveAlert: vi.fn().mockResolvedValue(undefined),
    applyAction: vi.fn().mockResolvedValue(undefined),
  };
});

import * as aiInsightMod from '../slices/ai-insight';

const stubTags = ['ha-svg-icon', 'ha-icon'];
for (const tag of stubTags) {
  if (!customElements.get(tag)) {
    customElements.define(tag, class extends HTMLElement {});
  }
}

const NOW_S = Math.floor(Date.now() / 1000);

const ALERT_DANGER: TriageAlert = {
  id: 'a1',
  growspace_id: 'gs1',
  type: 'high_temp',
  severity: 'danger',
  title: 'Temperature too high',
  description: 'Daytime temp exceeded threshold',
  bayesian_reasons: ['Sensor reading 32°C', 'VPD out of range'],
  ai_reasoning: null,
  timestamp: NOW_S - 30,
  resolved: false,
  resolution_note: null,
  suggested_actions: [
    {
      service: 'climate.set_temperature',
      target_entity_id: 'climate.tent_1',
      service_data: { temperature: 24 },
      description: 'Lower temp to 24°C',
    },
  ],
  kpis: [
    { label: 'Temp', value: '32', unit: '°C' },
    { label: 'VPD', value: '1.8', unit: 'kPa' },
  ],
};

const ALERT_WARNING: TriageAlert = {
  id: 'a2',
  growspace_id: 'gs1',
  type: 'low_humidity',
  severity: 'warning',
  title: 'Humidity drifting low',
  description: 'RH below 50%',
  bayesian_reasons: ['RH at 48%'],
  ai_reasoning: null,
  timestamp: NOW_S - 3700,
  resolved: false,
  resolution_note: null,
};

const ALERT_RESOLVED: TriageAlert = {
  id: 'a3',
  growspace_id: 'gs1',
  type: 'info',
  severity: 'info',
  title: 'All clear',
  description: null,
  bayesian_reasons: [],
  ai_reasoning: null,
  timestamp: NOW_S - 100,
  resolved: true,
  resolution_note: null,
};

const ALERT_AI: TriageAlert = {
  id: 'a4',
  growspace_id: 'gs1',
  type: 'nutrient_deficiency',
  severity: 'warning',
  title: 'Possible N deficiency',
  description: 'Yellowing detected',
  bayesian_reasons: [],
  ai_reasoning: 'The leaf yellowing pattern is consistent with nitrogen deficiency.',
  timestamp: NOW_S - 7200,
  resolved: false,
  resolution_note: null,
};

beforeEach(() => {
  aiAlerts$.set(new Map());
  aiEnabled$.set(null);
  vi.clearAllMocks();
  vi.mocked(aiInsightMod.fetchAlerts).mockReturnValue(undefined as unknown as Promise<void>);
});

afterEach(() => {
  document.body.innerHTML = '';
});

// ---------------------------------------------------------------------------
// Slice 1 — connectedCallback
// ---------------------------------------------------------------------------

describe('GmInboxPanel — connectedCallback', () => {
  it('calls fetchAlerts with growspaceid on connect', async () => {
    await fixture<GmInboxPanel>(html`
      <gm-inbox-panel growspaceid="gs1"></gm-inbox-panel>
    `);

    expect(aiInsightMod.fetchAlerts).toHaveBeenCalledWith('gs1');
  });
});

// ---------------------------------------------------------------------------
// Slice 2 — formatRelative (via rendered DOM)
// ---------------------------------------------------------------------------

describe('GmInboxPanel — formatRelative timestamps', () => {
  it('shows seconds-ago label for a very recent alert', async () => {
    aiAlerts$.set(new Map([['gs1', [{ ...ALERT_DANGER, timestamp: Math.floor(Date.now() / 1000) - 10 }]]]));

    const el = await fixture<GmInboxPanel>(html`
      <gm-inbox-panel growspaceid="gs1"></gm-inbox-panel>
    `);
    await el.updateComplete;

    const time = el.shadowRoot!.querySelector<HTMLElement>('.inbox-row-time');
    expect(time!.textContent).toMatch(/s ago/);
  });

  it('shows minutes-ago label for an alert ~2 min old', async () => {
    aiAlerts$.set(new Map([['gs1', [{ ...ALERT_DANGER, timestamp: Math.floor(Date.now() / 1000) - 120 }]]]));

    const el = await fixture<GmInboxPanel>(html`
      <gm-inbox-panel growspaceid="gs1"></gm-inbox-panel>
    `);
    await el.updateComplete;

    const time = el.shadowRoot!.querySelector<HTMLElement>('.inbox-row-time');
    expect(time!.textContent).toMatch(/m ago/);
  });

  it('shows hours-ago label for an alert ~2 h old', async () => {
    aiAlerts$.set(new Map([['gs1', [{ ...ALERT_WARNING, timestamp: Math.floor(Date.now() / 1000) - 7200 }]]]));

    const el = await fixture<GmInboxPanel>(html`
      <gm-inbox-panel growspaceid="gs1"></gm-inbox-panel>
    `);
    await el.updateComplete;

    const time = el.shadowRoot!.querySelector<HTMLElement>('.inbox-row-time');
    expect(time!.textContent).toMatch(/h ago/);
  });

  it('shows days-ago label for an alert >24 h old', async () => {
    aiAlerts$.set(new Map([['gs1', [{ ...ALERT_DANGER, timestamp: Math.floor(Date.now() / 1000) - 90000 }]]]));

    const el = await fixture<GmInboxPanel>(html`
      <gm-inbox-panel growspaceid="gs1"></gm-inbox-panel>
    `);
    await el.updateComplete;

    const time = el.shadowRoot!.querySelector<HTMLElement>('.inbox-row-time');
    expect(time!.textContent).toMatch(/d ago/);
  });
});

// ---------------------------------------------------------------------------
// Slice 3 — Alert list rows
// ---------------------------------------------------------------------------

describe('GmInboxPanel — alert list rows', () => {
  it('renders one .inbox-row per unresolved alert under All filter', async () => {
    aiAlerts$.set(new Map([['gs1', [ALERT_DANGER, ALERT_WARNING, ALERT_RESOLVED]]]));

    const el = await fixture<GmInboxPanel>(html`
      <gm-inbox-panel growspaceid="gs1"></gm-inbox-panel>
    `);
    await el.updateComplete;

    const rows = el.shadowRoot!.querySelectorAll('.inbox-row');
    expect(rows.length).toBe(2);
  });

  it('renders .inbox-empty when no unresolved alerts exist', async () => {
    aiAlerts$.set(new Map([['gs1', [ALERT_RESOLVED]]]));

    const el = await fixture<GmInboxPanel>(html`
      <gm-inbox-panel growspaceid="gs1"></gm-inbox-panel>
    `);
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector('.inbox-empty')).not.toBeNull();
    expect(el.shadowRoot!.querySelectorAll('.inbox-row').length).toBe(0);
  });

  it('renders .inbox-unread-dot on unread alerts', async () => {
    aiAlerts$.set(new Map([['gs1', [ALERT_DANGER]]]));

    const el = await fixture<GmInboxPanel>(html`
      <gm-inbox-panel growspaceid="gs1"></gm-inbox-panel>
    `);
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector('.inbox-unread-dot')).not.toBeNull();
  });

  it('sets correct data-severity on the severity bar', async () => {
    aiAlerts$.set(new Map([['gs1', [ALERT_DANGER]]]));

    const el = await fixture<GmInboxPanel>(html`
      <gm-inbox-panel growspaceid="gs1"></gm-inbox-panel>
    `);
    await el.updateComplete;

    const bar = el.shadowRoot!.querySelector<HTMLElement>('.inbox-severity-bar');
    expect(bar!.dataset.severity).toBe('danger');
  });

  it('renders the alert title in the row', async () => {
    aiAlerts$.set(new Map([['gs1', [ALERT_DANGER]]]));

    const el = await fixture<GmInboxPanel>(html`
      <gm-inbox-panel growspaceid="gs1"></gm-inbox-panel>
    `);
    await el.updateComplete;

    const title = el.shadowRoot!.querySelector<HTMLElement>('.inbox-row-title');
    expect(title!.textContent).toContain('Temperature too high');
  });

  it('renders .inbox-row-desc when description is present', async () => {
    aiAlerts$.set(new Map([['gs1', [ALERT_DANGER]]]));

    const el = await fixture<GmInboxPanel>(html`
      <gm-inbox-panel growspaceid="gs1"></gm-inbox-panel>
    `);
    await el.updateComplete;

    const desc = el.shadowRoot!.querySelector<HTMLElement>('.inbox-row-desc');
    expect(desc).not.toBeNull();
    expect(desc!.textContent).toContain('Daytime temp exceeded threshold');
  });
});

// ---------------------------------------------------------------------------
// Slice 4 — Filter strip
// ---------------------------------------------------------------------------

describe('GmInboxPanel — filter strip', () => {
  beforeEach(() => {
    aiAlerts$.set(new Map([['gs1', [ALERT_DANGER, ALERT_WARNING]]]));
  });

  it('renders three filter pills', async () => {
    const el = await fixture<GmInboxPanel>(html`
      <gm-inbox-panel growspaceid="gs1"></gm-inbox-panel>
    `);
    await el.updateComplete;

    const pills = el.shadowRoot!.querySelectorAll('.inbox-filter-pill');
    expect(pills.length).toBe(3);
  });

  it('All pill is aria-pressed=true by default', async () => {
    const el = await fixture<GmInboxPanel>(html`
      <gm-inbox-panel growspaceid="gs1"></gm-inbox-panel>
    `);
    await el.updateComplete;

    const allPill = el.shadowRoot!.querySelector<HTMLButtonElement>('.inbox-filter-pill');
    expect(allPill!.getAttribute('aria-pressed')).toBe('true');
  });

  it('clicking Action pill shows only danger alerts', async () => {
    const el = await fixture<GmInboxPanel>(html`
      <gm-inbox-panel growspaceid="gs1"></gm-inbox-panel>
    `);
    await el.updateComplete;

    const pills = el.shadowRoot!.querySelectorAll<HTMLButtonElement>('.inbox-filter-pill');
    pills[1].click();
    await el.updateComplete;

    const rows = el.shadowRoot!.querySelectorAll('.inbox-row');
    expect(rows.length).toBe(1);
    const bar = rows[0].querySelector<HTMLElement>('.inbox-severity-bar');
    expect(bar!.dataset.severity).toBe('danger');
  });

  it('clicking Watch pill shows only warning alerts', async () => {
    const el = await fixture<GmInboxPanel>(html`
      <gm-inbox-panel growspaceid="gs1"></gm-inbox-panel>
    `);
    await el.updateComplete;

    const pills = el.shadowRoot!.querySelectorAll<HTMLButtonElement>('.inbox-filter-pill');
    pills[2].click();
    await el.updateComplete;

    const rows = el.shadowRoot!.querySelectorAll('.inbox-row');
    expect(rows.length).toBe(1);
    const bar = rows[0].querySelector<HTMLElement>('.inbox-severity-bar');
    expect(bar!.dataset.severity).toBe('warning');
  });

  it('pill-count shows correct count for each filter', async () => {
    const el = await fixture<GmInboxPanel>(html`
      <gm-inbox-panel growspaceid="gs1"></gm-inbox-panel>
    `);
    await el.updateComplete;

    const counts = el.shadowRoot!.querySelectorAll<HTMLElement>('.pill-count');
    expect(counts[0].textContent?.trim()).toBe('2'); // All
    expect(counts[1].textContent?.trim()).toBe('1'); // Action
    expect(counts[2].textContent?.trim()).toBe('1'); // Watch
  });
});

// ---------------------------------------------------------------------------
// Slice 5 — selectAlert + mark-as-read
// ---------------------------------------------------------------------------

describe('GmInboxPanel — selectAlert', () => {
  beforeEach(() => {
    aiAlerts$.set(new Map([['gs1', [ALERT_DANGER]]]));
  });

  it('clicking a row renders the detail pane with .inbox-detail-head', async () => {
    const el = await fixture<GmInboxPanel>(html`
      <gm-inbox-panel growspaceid="gs1"></gm-inbox-panel>
    `);
    await el.updateComplete;

    el.shadowRoot!.querySelector<HTMLElement>('.inbox-row')!.click();
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector('.inbox-detail-head')).not.toBeNull();
  });

  it('removes .inbox-unread-dot after selecting the row', async () => {
    const el = await fixture<GmInboxPanel>(html`
      <gm-inbox-panel growspaceid="gs1"></gm-inbox-panel>
    `);
    await el.updateComplete;

    el.shadowRoot!.querySelector<HTMLElement>('.inbox-row')!.click();
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector('.inbox-unread-dot')).toBeNull();
  });

  it('sets aria-selected=true on the selected row', async () => {
    const el = await fixture<GmInboxPanel>(html`
      <gm-inbox-panel growspaceid="gs1"></gm-inbox-panel>
    `);
    await el.updateComplete;

    el.shadowRoot!.querySelector<HTMLElement>('.inbox-row')!.click();
    await el.updateComplete;

    const row = el.shadowRoot!.querySelector<HTMLElement>('.inbox-row');
    expect(row!.getAttribute('aria-selected')).toBe('true');
  });
});

// ---------------------------------------------------------------------------
// Slice 6 — Detail pane: no selection
// ---------------------------------------------------------------------------

describe('GmInboxPanel — detail pane (no selection)', () => {
  it('shows .inbox-no-selection placeholder when nothing is selected', async () => {
    aiAlerts$.set(new Map([['gs1', [ALERT_DANGER]]]));

    const el = await fixture<GmInboxPanel>(html`
      <gm-inbox-panel growspaceid="gs1"></gm-inbox-panel>
    `);
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector('.inbox-no-selection')).not.toBeNull();
    expect(el.shadowRoot!.querySelector('.inbox-detail')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Slice 7 — Detail pane: header and meta
// ---------------------------------------------------------------------------

describe('GmInboxPanel — detail pane header', () => {
  beforeEach(async () => {
    aiAlerts$.set(new Map([['gs1', [ALERT_DANGER]]]));
  });

  it('renders the alert title in .inbox-detail-head h3', async () => {
    const el = await fixture<GmInboxPanel>(html`
      <gm-inbox-panel growspaceid="gs1"></gm-inbox-panel>
    `);
    await el.updateComplete;
    el.shadowRoot!.querySelector<HTMLElement>('.inbox-row')!.click();
    await el.updateComplete;

    const h3 = el.shadowRoot!.querySelector<HTMLElement>('.inbox-detail-head h3');
    expect(h3!.textContent).toContain('Temperature too high');
  });

  it('renders .inbox-severity-pill with correct data-severity', async () => {
    const el = await fixture<GmInboxPanel>(html`
      <gm-inbox-panel growspaceid="gs1"></gm-inbox-panel>
    `);
    await el.updateComplete;
    el.shadowRoot!.querySelector<HTMLElement>('.inbox-row')!.click();
    await el.updateComplete;

    const pill = el.shadowRoot!.querySelector<HTMLElement>('.inbox-severity-pill');
    expect(pill!.dataset.severity).toBe('danger');
  });
});

// ---------------------------------------------------------------------------
// Slice 8 — Detail pane: reasoning (bayesian vs AI)
// ---------------------------------------------------------------------------

describe('GmInboxPanel — detail pane reasoning', () => {
  it('renders bayesian_reasons as .reasoning-bayesian-item when ai_reasoning is null', async () => {
    aiAlerts$.set(new Map([['gs1', [ALERT_DANGER]]]));

    const el = await fixture<GmInboxPanel>(html`
      <gm-inbox-panel growspaceid="gs1"></gm-inbox-panel>
    `);
    await el.updateComplete;
    el.shadowRoot!.querySelector<HTMLElement>('.inbox-row')!.click();
    await el.updateComplete;

    const items = el.shadowRoot!.querySelectorAll('.reasoning-bayesian-item');
    expect(items.length).toBe(2);
    expect(items[0].textContent).toContain('Sensor reading 32°C');
  });

  it('renders .reasoning-text when ai_reasoning is present', async () => {
    aiAlerts$.set(new Map([['gs1', [ALERT_AI]]]));

    const el = await fixture<GmInboxPanel>(html`
      <gm-inbox-panel growspaceid="gs1"></gm-inbox-panel>
    `);
    await el.updateComplete;
    el.shadowRoot!.querySelector<HTMLElement>('.inbox-row')!.click();
    await el.updateComplete;

    const text = el.shadowRoot!.querySelector<HTMLElement>('.reasoning-text');
    expect(text).not.toBeNull();
    expect(text!.textContent).toContain('nitrogen deficiency');
  });

  it('renders .photo-evid only when ai_reasoning is present', async () => {
    aiAlerts$.set(new Map([['gs1', [ALERT_AI]]]));

    const el = await fixture<GmInboxPanel>(html`
      <gm-inbox-panel growspaceid="gs1"></gm-inbox-panel>
    `);
    await el.updateComplete;
    el.shadowRoot!.querySelector<HTMLElement>('.inbox-row')!.click();
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector('.photo-evid')).not.toBeNull();
  });

  it('does not render .photo-evid when ai_reasoning is null', async () => {
    aiAlerts$.set(new Map([['gs1', [ALERT_DANGER]]]));

    const el = await fixture<GmInboxPanel>(html`
      <gm-inbox-panel growspaceid="gs1"></gm-inbox-panel>
    `);
    await el.updateComplete;
    el.shadowRoot!.querySelector<HTMLElement>('.inbox-row')!.click();
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector('.photo-evid')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Slice 9 — Detail pane: KPI row
// ---------------------------------------------------------------------------

describe('GmInboxPanel — detail pane KPI row', () => {
  it('renders one .kpi-card per KPI when alert has kpis', async () => {
    aiAlerts$.set(new Map([['gs1', [ALERT_DANGER]]]));

    const el = await fixture<GmInboxPanel>(html`
      <gm-inbox-panel growspaceid="gs1"></gm-inbox-panel>
    `);
    await el.updateComplete;
    el.shadowRoot!.querySelector<HTMLElement>('.inbox-row')!.click();
    await el.updateComplete;

    const cards = el.shadowRoot!.querySelectorAll('.kpi-card');
    expect(cards.length).toBe(2);
    expect(cards[0].textContent).toContain('Temp');
    expect(cards[0].textContent).toContain('32');
  });

  it('does not render .kpi-row when alert has no kpis', async () => {
    aiAlerts$.set(new Map([['gs1', [ALERT_WARNING]]]));

    const el = await fixture<GmInboxPanel>(html`
      <gm-inbox-panel growspaceid="gs1"></gm-inbox-panel>
    `);
    await el.updateComplete;
    el.shadowRoot!.querySelector<HTMLElement>('.inbox-row')!.click();
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector('.kpi-row')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Slice 10 — Detail pane: suggested actions
// ---------------------------------------------------------------------------

describe('GmInboxPanel — detail pane suggested actions', () => {
  it('renders one .reco-row per suggested action', async () => {
    aiAlerts$.set(new Map([['gs1', [ALERT_DANGER]]]));

    const el = await fixture<GmInboxPanel>(html`
      <gm-inbox-panel growspaceid="gs1"></gm-inbox-panel>
    `);
    await el.updateComplete;
    el.shadowRoot!.querySelector<HTMLElement>('.inbox-row')!.click();
    await el.updateComplete;

    const rows = el.shadowRoot!.querySelectorAll('.reco-row');
    expect(rows.length).toBe(1);
    expect(rows[0].textContent).toContain('Lower temp to 24°C');
  });

  it('Apply button calls applyAction with the action payload', async () => {
    aiAlerts$.set(new Map([['gs1', [ALERT_DANGER]]]));

    const el = await fixture<GmInboxPanel>(html`
      <gm-inbox-panel growspaceid="gs1"></gm-inbox-panel>
    `);
    await el.updateComplete;
    el.shadowRoot!.querySelector<HTMLElement>('.inbox-row')!.click();
    await el.updateComplete;

    el.shadowRoot!.querySelector<HTMLElement>('.apply-btn')!.click();
    await new Promise((r) => setTimeout(r, 20));

    expect(aiInsightMod.applyAction).toHaveBeenCalledWith(ALERT_DANGER.suggested_actions![0]);
  });

  it('does not render .reco-row when alert has no suggested_actions', async () => {
    aiAlerts$.set(new Map([['gs1', [ALERT_WARNING]]]));

    const el = await fixture<GmInboxPanel>(html`
      <gm-inbox-panel growspaceid="gs1"></gm-inbox-panel>
    `);
    await el.updateComplete;
    el.shadowRoot!.querySelector<HTMLElement>('.inbox-row')!.click();
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector('.reco-row')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Slice 11 — Action ribbon: resolve
// ---------------------------------------------------------------------------

describe('GmInboxPanel — action ribbon: resolve', () => {
  it('Resolve button calls resolveAlert with the alert id', async () => {
    aiAlerts$.set(new Map([['gs1', [ALERT_DANGER]]]));

    const el = await fixture<GmInboxPanel>(html`
      <gm-inbox-panel growspaceid="gs1"></gm-inbox-panel>
    `);
    await el.updateComplete;
    el.shadowRoot!.querySelector<HTMLElement>('.inbox-row')!.click();
    await el.updateComplete;

    el.shadowRoot!.querySelector<HTMLElement>('.resolve-btn')!.click();
    await new Promise((r) => setTimeout(r, 20));

    expect(aiInsightMod.resolveAlert).toHaveBeenCalledWith('a1', undefined);
  });

  it('after resolve the detail pane returns to no-selection state', async () => {
    vi.mocked(aiInsightMod.resolveAlert).mockResolvedValue(undefined);
    aiAlerts$.set(new Map([['gs1', [ALERT_DANGER]]]));

    const el = await fixture<GmInboxPanel>(html`
      <gm-inbox-panel growspaceid="gs1"></gm-inbox-panel>
    `);
    await el.updateComplete;
    el.shadowRoot!.querySelector<HTMLElement>('.inbox-row')!.click();
    await el.updateComplete;

    el.shadowRoot!.querySelector<HTMLElement>('.resolve-btn')!.click();
    await new Promise((r) => setTimeout(r, 20));
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector('.inbox-no-selection')).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Slice 12 — Action ribbon: add note
// ---------------------------------------------------------------------------

describe('GmInboxPanel — action ribbon: add note', () => {
  beforeEach(() => {
    aiAlerts$.set(new Map([['gs1', [ALERT_DANGER]]]));
  });

  it('clicking Add note reveals .note-input', async () => {
    const el = await fixture<GmInboxPanel>(html`
      <gm-inbox-panel growspaceid="gs1"></gm-inbox-panel>
    `);
    await el.updateComplete;
    el.shadowRoot!.querySelector<HTMLElement>('.inbox-row')!.click();
    await el.updateComplete;

    el.shadowRoot!.querySelector<HTMLElement>('.add-note-btn')!.click();
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector('.note-input')).not.toBeNull();
  });

  it('submitting a note calls resolveAlert with the note text', async () => {
    const el = await fixture<GmInboxPanel>(html`
      <gm-inbox-panel growspaceid="gs1"></gm-inbox-panel>
    `);
    await el.updateComplete;
    el.shadowRoot!.querySelector<HTMLElement>('.inbox-row')!.click();
    await el.updateComplete;

    el.shadowRoot!.querySelector<HTMLElement>('.add-note-btn')!.click();
    await el.updateComplete;

    const input = el.shadowRoot!.querySelector<HTMLInputElement>('.note-input')!;
    input.value = 'Fixed manually';
    input.dispatchEvent(new Event('input'));
    await el.updateComplete;

    el.shadowRoot!.querySelector<HTMLElement>('.note-submit-btn')!.click();
    await new Promise((r) => setTimeout(r, 20));

    expect(aiInsightMod.resolveAlert).toHaveBeenCalledWith('a1', 'Fixed manually');
  });
});

// ---------------------------------------------------------------------------
// Slice 13 — AI unavailable banner
// ---------------------------------------------------------------------------

describe('GmInboxPanel — AI unavailable banner', () => {
  it('renders .ai-unavailable-banner when aiEnabled$ is false', async () => {
    aiEnabled$.set(false);

    const el = await fixture<GmInboxPanel>(html`
      <gm-inbox-panel growspaceid="gs1"></gm-inbox-panel>
    `);
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector('.ai-unavailable-banner')).not.toBeNull();
  });

  it('does not render .ai-unavailable-banner when aiEnabled$ is true', async () => {
    aiEnabled$.set(true);

    const el = await fixture<GmInboxPanel>(html`
      <gm-inbox-panel growspaceid="gs1"></gm-inbox-panel>
    `);
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector('.ai-unavailable-banner')).toBeNull();
  });

  it('does not render .ai-unavailable-banner when aiEnabled$ is null', async () => {
    aiEnabled$.set(null);

    const el = await fixture<GmInboxPanel>(html`
      <gm-inbox-panel growspaceid="gs1"></gm-inbox-panel>
    `);
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector('.ai-unavailable-banner')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Slice 14 — setFilter clears selection
// ---------------------------------------------------------------------------

describe('GmInboxPanel — setFilter clears selection', () => {
  it('switching filter deselects the current alert', async () => {
    aiAlerts$.set(new Map([['gs1', [ALERT_DANGER, ALERT_WARNING]]]));

    const el = await fixture<GmInboxPanel>(html`
      <gm-inbox-panel growspaceid="gs1"></gm-inbox-panel>
    `);
    await el.updateComplete;

    el.shadowRoot!.querySelector<HTMLElement>('.inbox-row')!.click();
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector('.inbox-detail')).not.toBeNull();

    const pills = el.shadowRoot!.querySelectorAll<HTMLButtonElement>('.inbox-filter-pill');
    pills[1].click();
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector('.inbox-no-selection')).not.toBeNull();
  });
});
