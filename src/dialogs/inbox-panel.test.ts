import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fixture, html } from '@open-wc/testing-helpers';
import { aiAlerts$, aiMode$, aiInsight$, isAiLoading$, aiError$, aiBriefing$, conversationThreads$, activeThreadId$ } from '../slices/ai-insight';
import './inbox-panel';
import { GmInboxPanel } from './inbox-panel';

vi.mock('../services/hass-call', () => ({
  callService: vi.fn().mockResolvedValue(undefined),
  callServiceReturning: vi.fn().mockResolvedValue({ response: 'ok' }),
  hassCall: vi.fn().mockResolvedValue([]),
  setHass: vi.fn(),
}));

import * as hassCallMod from '../services/hass-call';

const stubTags = ['ha-dialog', 'ha-svg-icon', 'ha-icon'];
for (const tag of stubTags) {
  if (!customElements.get(tag)) {
    customElements.define(tag, class extends HTMLElement {});
  }
}

function normalize(s: string | null | undefined): string {
  return (s ?? '').replace(/\s+/g, ' ').trim();
}

const ALERT_DANGER = {
  id: 'alert-danger',
  growspace_id: 'gs1',
  type: 'vpd_critical',
  severity: 'danger' as const,
  title: 'VPD is critically high',
  description: 'Plants may be stressed',
  bayesian_reasons: ['humidity too low', 'temp too high'],
  ai_reasoning: 'VPD is outside the safe range for this growth stage. Reduce temperature by 2°C.',
  timestamp: 1700000100,
  resolved: false,
  resolution_note: null,
  confidence: 0.9,
  suggested_actions: [
    {
      service: 'climate.set_temperature',
      target_entity_id: 'climate.tent_1',
      service_data: { temperature: 24 },
      description: 'Set temp to 24°C',
    },
  ],
  kpis: [
    { label: 'RH peak', value: '45', unit: '%' },
    { label: 'Dehu duty', value: '72', unit: '%' },
    { label: 'Probe delta', value: '0.8', unit: 'kPa' },
  ],
};

const ALERT_WARNING = {
  id: 'alert-warning',
  growspace_id: 'gs1',
  type: 'ec_drift',
  severity: 'warning' as const,
  title: 'EC drift detected',
  description: 'Nutrient levels drifting',
  bayesian_reasons: ['EC rising over 24h'],
  ai_reasoning: null,
  timestamp: 1700000050,
  resolved: false,
  resolution_note: null,
};

const ALERT_RESOLVED = {
  id: 'alert-resolved',
  growspace_id: 'gs1',
  type: 'temp_spike',
  severity: 'warning' as const,
  title: 'Temperature spike',
  description: 'Brief temp spike detected',
  bayesian_reasons: ['temp > 30°C for 10min'],
  ai_reasoning: null,
  timestamp: 1699999000,
  resolved: true,
  resolution_note: 'Adjusted fan speed',
};

beforeEach(() => {
  aiAlerts$.set([]);
  aiMode$.set('inbox');
  aiInsight$.set(null);
  isAiLoading$.set(false);
  aiError$.set(null);
  aiBriefing$.set(null);
  conversationThreads$.set(new Map());
  activeThreadId$.set(null);
  vi.clearAllMocks();
  // Never-resolving default: prevents connectedCallback's fetchAlerts() from
  // overwriting atom state set by individual tests.
  vi.mocked(hassCallMod.hassCall).mockReturnValue(new Promise(() => {}));
});

afterEach(() => {
  document.body.innerHTML = '';
});

// ---------------------------------------------------------------------------
// Slice 1 — fetchAlerts on connect
// ---------------------------------------------------------------------------

describe('GmInboxPanel — fetchAlerts on connect', () => {
  it('calls fetchAlerts (growspace_manager/get_ai_alerts) when connected', async () => {
    // Let hassCall resolve immediately for this slice so the call is recorded.
    vi.mocked(hassCallMod.hassCall).mockResolvedValueOnce([]);
    await fixture<GmInboxPanel>(html`
      <gm-inbox-panel growspaceid="gs1"></gm-inbox-panel>
    `);

    expect(hassCallMod.hassCall).toHaveBeenCalledWith(
      'growspace_manager/get_ai_alerts',
      expect.any(Object),
      expect.anything()
    );
  });

  it('passes growspaceid when fetching alerts', async () => {
    vi.mocked(hassCallMod.hassCall).mockResolvedValueOnce([]);
    await fixture<GmInboxPanel>(html`
      <gm-inbox-panel growspaceid="gs1"></gm-inbox-panel>
    `);

    expect(hassCallMod.hassCall).toHaveBeenCalledWith(
      'growspace_manager/get_ai_alerts',
      expect.objectContaining({ growspace_id: 'gs1' }),
      expect.anything()
    );
  });
});

// ---------------------------------------------------------------------------
// Slice 2 — filter strip
// ---------------------------------------------------------------------------

describe('GmInboxPanel — filter strip', () => {
  it('renders All / Action / Watch filter pills', async () => {
    const el = await fixture<GmInboxPanel>(html`
      <gm-inbox-panel growspaceid="gs1"></gm-inbox-panel>
    `);
    await el.updateComplete;

    const pills = el.shadowRoot!.querySelectorAll('.inbox-filter-pill');
    const labels = Array.from(pills).map((p) => normalize(p.textContent));
    expect(labels.some((l) => l.startsWith('All'))).toBe(true);
    expect(labels.some((l) => l.startsWith('Action'))).toBe(true);
    expect(labels.some((l) => l.startsWith('Watch'))).toBe(true);
  });

  it('All filter is active by default', async () => {
    const el = await fixture<GmInboxPanel>(html`
      <gm-inbox-panel growspaceid="gs1"></gm-inbox-panel>
    `);
    await el.updateComplete;

    const activePill = el.shadowRoot!.querySelector('.inbox-filter-pill[aria-pressed="true"]');
    expect(normalize(activePill?.textContent)).toMatch(/^All/);
  });

  it('Action filter shows count of unresolved danger alerts', async () => {
    aiAlerts$.set([ALERT_DANGER, ALERT_WARNING, ALERT_RESOLVED]);
    const el = await fixture<GmInboxPanel>(html`
      <gm-inbox-panel growspaceid="gs1"></gm-inbox-panel>
    `);
    await el.updateComplete;

    const pills = el.shadowRoot!.querySelectorAll('.inbox-filter-pill');
    const actionPill = Array.from(pills).find((p) => normalize(p.textContent).startsWith('Action'));
    expect(normalize(actionPill?.textContent)).toContain('1');
  });

  it('Watch filter shows count of unresolved warning alerts', async () => {
    aiAlerts$.set([ALERT_DANGER, ALERT_WARNING, ALERT_RESOLVED]);
    const el = await fixture<GmInboxPanel>(html`
      <gm-inbox-panel growspaceid="gs1"></gm-inbox-panel>
    `);
    await el.updateComplete;

    const pills = el.shadowRoot!.querySelectorAll('.inbox-filter-pill');
    const watchPill = Array.from(pills).find((p) => normalize(p.textContent).startsWith('Watch'));
    expect(normalize(watchPill?.textContent)).toContain('1');
  });
});

// ---------------------------------------------------------------------------
// Slice 3 — alert list rows
// ---------------------------------------------------------------------------

describe('GmInboxPanel — alert list rows', () => {
  it('renders one .inbox-row per unresolved alert under All filter', async () => {
    aiAlerts$.set([ALERT_DANGER, ALERT_WARNING, ALERT_RESOLVED]);
    const el = await fixture<GmInboxPanel>(html`
      <gm-inbox-panel growspaceid="gs1"></gm-inbox-panel>
    `);
    await el.updateComplete;

    const rows = el.shadowRoot!.querySelectorAll('.inbox-row');
    expect(rows.length).toBe(2); // resolved excluded from All
  });

  it('each row shows the alert title', async () => {
    aiAlerts$.set([ALERT_DANGER]);
    const el = await fixture<GmInboxPanel>(html`
      <gm-inbox-panel growspaceid="gs1"></gm-inbox-panel>
    `);
    await el.updateComplete;

    const row = el.shadowRoot!.querySelector('.inbox-row');
    expect(normalize(row?.textContent)).toContain('VPD is critically high');
  });

  it('each row has a severity bar with data-severity attribute', async () => {
    aiAlerts$.set([ALERT_DANGER]);
    const el = await fixture<GmInboxPanel>(html`
      <gm-inbox-panel growspaceid="gs1"></gm-inbox-panel>
    `);
    await el.updateComplete;

    const severityBar = el.shadowRoot!.querySelector('.inbox-severity-bar');
    expect(severityBar?.getAttribute('data-severity')).toBe('danger');
  });

  it('shows unread indicator dot on alerts not yet opened', async () => {
    aiAlerts$.set([ALERT_DANGER]);
    const el = await fixture<GmInboxPanel>(html`
      <gm-inbox-panel growspaceid="gs1"></gm-inbox-panel>
    `);
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector('.inbox-unread-dot')).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Slice 4 — clicking a row opens the detail pane
// ---------------------------------------------------------------------------

describe('GmInboxPanel — detail pane', () => {
  it('clicking a row renders detail pane (.inbox-detail-head)', async () => {
    aiAlerts$.set([ALERT_DANGER]);
    const el = await fixture<GmInboxPanel>(html`
      <gm-inbox-panel growspaceid="gs1"></gm-inbox-panel>
    `);
    await el.updateComplete;

    const row = el.shadowRoot!.querySelector<HTMLElement>('.inbox-row');
    row?.click();
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector('.inbox-detail-head')).not.toBeNull();
  });

  it('detail header shows alert title', async () => {
    aiAlerts$.set([ALERT_DANGER]);
    const el = await fixture<GmInboxPanel>(html`
      <gm-inbox-panel growspaceid="gs1"></gm-inbox-panel>
    `);
    await el.updateComplete;

    el.shadowRoot!.querySelector<HTMLElement>('.inbox-row')?.click();
    await el.updateComplete;

    const head = el.shadowRoot!.querySelector('.inbox-detail-head');
    expect(normalize(head?.textContent)).toContain('VPD is critically high');
  });

  it('detail header shows severity pill', async () => {
    aiAlerts$.set([ALERT_DANGER]);
    const el = await fixture<GmInboxPanel>(html`
      <gm-inbox-panel growspaceid="gs1"></gm-inbox-panel>
    `);
    await el.updateComplete;

    el.shadowRoot!.querySelector<HTMLElement>('.inbox-row')?.click();
    await el.updateComplete;

    const pill = el.shadowRoot!.querySelector('.inbox-severity-pill');
    expect(pill?.getAttribute('data-severity')).toBe('danger');
  });

  it('unread dot disappears after the alert is opened', async () => {
    aiAlerts$.set([ALERT_DANGER]);
    const el = await fixture<GmInboxPanel>(html`
      <gm-inbox-panel growspaceid="gs1"></gm-inbox-panel>
    `);
    await el.updateComplete;

    el.shadowRoot!.querySelector<HTMLElement>('.inbox-row')?.click();
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector('.inbox-unread-dot')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Slice 5 — reasoning block
// ---------------------------------------------------------------------------

describe('GmInboxPanel — reasoning block', () => {
  it('shows AI reasoning text when ai_reasoning is present', async () => {
    aiAlerts$.set([ALERT_DANGER]);
    const el = await fixture<GmInboxPanel>(html`
      <gm-inbox-panel growspaceid="gs1"></gm-inbox-panel>
    `);
    await el.updateComplete;
    el.shadowRoot!.querySelector<HTMLElement>('.inbox-row')?.click();
    await el.updateComplete;

    const reasoning = el.shadowRoot!.querySelector('.reasoning');
    expect(normalize(reasoning?.textContent)).toContain('VPD is outside the safe range');
  });

  it('falls back to bayesian_reasons when ai_reasoning is null', async () => {
    aiAlerts$.set([ALERT_WARNING]);
    const el = await fixture<GmInboxPanel>(html`
      <gm-inbox-panel growspaceid="gs1"></gm-inbox-panel>
    `);
    await el.updateComplete;
    el.shadowRoot!.querySelector<HTMLElement>('.inbox-row')?.click();
    await el.updateComplete;

    const reasoning = el.shadowRoot!.querySelector('.reasoning');
    expect(normalize(reasoning?.textContent)).toContain('EC rising over 24h');
  });

  it('shows evidence photo section only when ai_reasoning is present', async () => {
    aiAlerts$.set([ALERT_DANGER]);
    const el = await fixture<GmInboxPanel>(html`
      <gm-inbox-panel growspaceid="gs1"></gm-inbox-panel>
    `);
    await el.updateComplete;
    el.shadowRoot!.querySelector<HTMLElement>('.inbox-row')?.click();
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector('.photo-evid')).not.toBeNull();
  });

  it('hides evidence photo section when ai_reasoning is null', async () => {
    aiAlerts$.set([ALERT_WARNING]);
    const el = await fixture<GmInboxPanel>(html`
      <gm-inbox-panel growspaceid="gs1"></gm-inbox-panel>
    `);
    await el.updateComplete;
    el.shadowRoot!.querySelector<HTMLElement>('.inbox-row')?.click();
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector('.photo-evid')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Slice 6 — KPI row and suggested actions
// ---------------------------------------------------------------------------

describe('GmInboxPanel — KPI row', () => {
  it('renders KPI cards when alert has kpis', async () => {
    aiAlerts$.set([ALERT_DANGER]);
    const el = await fixture<GmInboxPanel>(html`
      <gm-inbox-panel growspaceid="gs1"></gm-inbox-panel>
    `);
    await el.updateComplete;
    el.shadowRoot!.querySelector<HTMLElement>('.inbox-row')?.click();
    await el.updateComplete;

    const kpiCards = el.shadowRoot!.querySelectorAll('.kpi-card');
    expect(kpiCards.length).toBe(3);
  });
});

describe('GmInboxPanel — suggested actions', () => {
  it('renders .reco-row for each suggested action', async () => {
    aiAlerts$.set([ALERT_DANGER]);
    const el = await fixture<GmInboxPanel>(html`
      <gm-inbox-panel growspaceid="gs1"></gm-inbox-panel>
    `);
    await el.updateComplete;
    el.shadowRoot!.querySelector<HTMLElement>('.inbox-row')?.click();
    await el.updateComplete;

    expect(el.shadowRoot!.querySelectorAll('.reco-row').length).toBe(1);
  });

  it('Apply button calls applyAction with the suggested action', async () => {
    aiAlerts$.set([ALERT_DANGER]);
    const el = await fixture<GmInboxPanel>(html`
      <gm-inbox-panel growspaceid="gs1"></gm-inbox-panel>
    `);
    await el.updateComplete;
    el.shadowRoot!.querySelector<HTMLElement>('.inbox-row')?.click();
    await el.updateComplete;

    const applyBtn = el.shadowRoot!.querySelector<HTMLElement>('.reco-row .apply-btn');
    applyBtn?.click();
    await el.updateComplete;

    expect(hassCallMod.callService).toHaveBeenCalledWith(
      'climate.set_temperature',
      'climate.tent_1',
      { temperature: 24 }
    );
  });
});

// ---------------------------------------------------------------------------
// Slice 7 — resolve flow
// ---------------------------------------------------------------------------

describe('GmInboxPanel — resolve flow', () => {
  it('Resolve button calls resolveAlert(id)', async () => {
    aiAlerts$.set([ALERT_DANGER]);
    const el = await fixture<GmInboxPanel>(html`
      <gm-inbox-panel growspaceid="gs1"></gm-inbox-panel>
    `);
    await el.updateComplete;
    el.shadowRoot!.querySelector<HTMLElement>('.inbox-row')?.click();
    await el.updateComplete;

    // Set mock AFTER fixture so connectedCallback's fetchAlerts doesn't consume it.
    vi.mocked(hassCallMod.hassCall).mockResolvedValueOnce({ ...ALERT_DANGER, resolved: true });
    const resolveBtn = el.shadowRoot!.querySelector<HTMLElement>('.action-ribbon .resolve-btn');
    resolveBtn?.click();
    await el.updateComplete;

    expect(hassCallMod.hassCall).toHaveBeenCalledWith(
      'growspace_manager/resolve_ai_alert',
      expect.objectContaining({ alert_id: 'alert-danger' }),
      expect.anything()
    );
  });

  it('resolved alert no longer appears in the All filter list', async () => {
    aiAlerts$.set([ALERT_DANGER]);
    const el = await fixture<GmInboxPanel>(html`
      <gm-inbox-panel growspaceid="gs1"></gm-inbox-panel>
    `);
    await el.updateComplete;
    el.shadowRoot!.querySelector<HTMLElement>('.inbox-row')?.click();
    await el.updateComplete;

    vi.mocked(hassCallMod.hassCall).mockResolvedValueOnce({ ...ALERT_DANGER, resolved: true });
    el.shadowRoot!.querySelector<HTMLElement>('.action-ribbon .resolve-btn')?.click();
    await el.updateComplete;
    // Wait for async resolveAlert to complete and atom to update
    await new Promise((r) => setTimeout(r, 50));
    await el.updateComplete;

    expect(el.shadowRoot!.querySelectorAll('.inbox-row').length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Slice 8 — add note flow
// ---------------------------------------------------------------------------

describe('GmInboxPanel — add note flow', () => {
  it('clicking Add note shows an inline text input', async () => {
    aiAlerts$.set([ALERT_DANGER]);
    const el = await fixture<GmInboxPanel>(html`
      <gm-inbox-panel growspaceid="gs1"></gm-inbox-panel>
    `);
    await el.updateComplete;
    el.shadowRoot!.querySelector<HTMLElement>('.inbox-row')?.click();
    await el.updateComplete;

    el.shadowRoot!.querySelector<HTMLElement>('.action-ribbon .add-note-btn')?.click();
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector('.note-input')).not.toBeNull();
  });

  it('submitting the note calls resolveAlert(id, note)', async () => {
    aiAlerts$.set([ALERT_DANGER]);
    const el = await fixture<GmInboxPanel>(html`
      <gm-inbox-panel growspaceid="gs1"></gm-inbox-panel>
    `);
    await el.updateComplete;
    el.shadowRoot!.querySelector<HTMLElement>('.inbox-row')?.click();
    await el.updateComplete;

    el.shadowRoot!.querySelector<HTMLElement>('.action-ribbon .add-note-btn')?.click();
    await el.updateComplete;

    const noteInput = el.shadowRoot!.querySelector<HTMLInputElement>('.note-input');
    if (noteInput) noteInput.value = 'Fixed it';
    noteInput?.dispatchEvent(new Event('input'));

    // Set mock AFTER fixture so connectedCallback's fetchAlerts doesn't consume it.
    vi.mocked(hassCallMod.hassCall).mockResolvedValueOnce({ ...ALERT_DANGER, resolved: true, resolution_note: 'Fixed it' });
    el.shadowRoot!.querySelector<HTMLElement>('.note-submit-btn')?.click();
    await el.updateComplete;

    expect(hassCallMod.hassCall).toHaveBeenCalledWith(
      'growspace_manager/resolve_ai_alert',
      expect.objectContaining({ alert_id: 'alert-danger', resolution_note: 'Fixed it' }),
      expect.anything()
    );
  });
});

// ---------------------------------------------------------------------------
// Slice 9 — filter routing (Action / Watch)
// ---------------------------------------------------------------------------

describe('GmInboxPanel — filter routing', () => {
  it('Action filter shows only unresolved danger alerts', async () => {
    aiAlerts$.set([ALERT_DANGER, ALERT_WARNING, ALERT_RESOLVED]);
    const el = await fixture<GmInboxPanel>(html`
      <gm-inbox-panel growspaceid="gs1"></gm-inbox-panel>
    `);
    await el.updateComplete;

    const pills = el.shadowRoot!.querySelectorAll<HTMLElement>('.inbox-filter-pill');
    const actionPill = Array.from(pills).find((p) => normalize(p.textContent).startsWith('Action'));
    actionPill?.click();
    await el.updateComplete;

    const rows = el.shadowRoot!.querySelectorAll('.inbox-row');
    expect(rows.length).toBe(1);
    expect(el.shadowRoot!.querySelector('.inbox-severity-bar')?.getAttribute('data-severity')).toBe('danger');
  });

  it('Watch filter shows only unresolved warning alerts', async () => {
    aiAlerts$.set([ALERT_DANGER, ALERT_WARNING, ALERT_RESOLVED]);
    const el = await fixture<GmInboxPanel>(html`
      <gm-inbox-panel growspaceid="gs1"></gm-inbox-panel>
    `);
    await el.updateComplete;

    const pills = el.shadowRoot!.querySelectorAll<HTMLElement>('.inbox-filter-pill');
    const watchPill = Array.from(pills).find((p) => normalize(p.textContent).startsWith('Watch'));
    watchPill?.click();
    await el.updateComplete;

    const rows = el.shadowRoot!.querySelectorAll('.inbox-row');
    expect(rows.length).toBe(1);
    expect(el.shadowRoot!.querySelector('.inbox-severity-bar')?.getAttribute('data-severity')).toBe('warning');
  });
});

// ---------------------------------------------------------------------------
// Slice 10 — empty state
// ---------------------------------------------------------------------------

describe('GmInboxPanel — empty state', () => {
  it('shows empty state when filtered list is empty', async () => {
    aiAlerts$.set([ALERT_RESOLVED]);
    const el = await fixture<GmInboxPanel>(html`
      <gm-inbox-panel growspaceid="gs1"></gm-inbox-panel>
    `);
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector('.inbox-empty')).not.toBeNull();
  });

  it('empty state is visible when Action filter has no matches', async () => {
    aiAlerts$.set([ALERT_WARNING]); // only warning, no danger
    const el = await fixture<GmInboxPanel>(html`
      <gm-inbox-panel growspaceid="gs1"></gm-inbox-panel>
    `);
    await el.updateComplete;

    const pills = el.shadowRoot!.querySelectorAll<HTMLElement>('.inbox-filter-pill');
    const actionPill = Array.from(pills).find((p) => normalize(p.textContent).startsWith('Action'));
    actionPill?.click();
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector('.inbox-empty')).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Slice 11 — persistence: aiAlerts$ survives disconnect
// ---------------------------------------------------------------------------

describe('GmInboxPanel — atom persistence', () => {
  it('aiAlerts$ is not cleared when the panel disconnects', async () => {
    aiAlerts$.set([ALERT_DANGER]);

    const el = await fixture<GmInboxPanel>(html`
      <gm-inbox-panel growspaceid="gs1"></gm-inbox-panel>
    `);
    await el.updateComplete;
    el.remove();

    expect(aiAlerts$.get()).toEqual([ALERT_DANGER]);
  });
});
