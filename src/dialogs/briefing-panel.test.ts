import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fixture, html } from '@open-wc/testing-helpers';
import {
  aiBriefing$,
  aiMode$,
  isAiLoading$,
  aiError$,
  conversationThreads$,
  activeThreadId$,
  aiAlerts$,
  aiInsight$,
} from '../slices/ai-insight';
import './briefing-panel';
import { GmBriefingPanel } from './briefing-panel';

vi.mock('../services/hass-call', () => ({
  callService: vi.fn().mockResolvedValue(undefined),
  callServiceReturning: vi.fn().mockResolvedValue({ response: 'ok' }),
  hassCall: vi.fn().mockResolvedValue({}),
  setHass: vi.fn(),
}));

import * as hassCallMod from '../services/hass-call';

const stubTags = ['ha-dialog', 'ha-svg-icon', 'ha-icon'];
for (const tag of stubTags) {
  if (!customElements.get(tag)) {
    customElements.define(tag, class extends HTMLElement {});
  }
}

const BRIEFING = {
  generated_at: 1700000000,
  summary_text: 'Plants are healthy and VPD is optimal.',
  headline: 'Morning briefing — everything looks good',
  confidence: 0.87,
  drawn_from: '24h sensor data',
  kpis: [
    { label: 'Avg VPD', value: '1.2', unit: 'kPa', delta: '+0.1' },
    { label: 'Water use', value: '4.5', unit: 'L', delta: '-0.3' },
    { label: 'Open issues', value: '2', unit: '' },
  ],
  recommendations: [
    {
      title: 'Lower daytime temp',
      description: 'Reduce by 2°C to improve VPD',
      impact: 'high' as const,
      suggested_action: {
        service: 'climate.set_temperature',
        target_entity_id: 'climate.tent_1',
        service_data: { temperature: 24 },
        description: 'Set temp to 24°C',
      },
    },
    {
      title: 'Check root zone',
      description: 'Slight EC drift detected',
      impact: 'medium' as const,
    },
    {
      title: 'Good canopy coverage',
      description: 'No action needed',
      impact: 'low' as const,
    },
  ],
  ai_available: true,
};

beforeEach(() => {
  aiBriefing$.set(null);
  aiMode$.set('briefing');
  isAiLoading$.set(false);
  aiError$.set(null);
  conversationThreads$.set(new Map());
  activeThreadId$.set(null);
  aiAlerts$.set([]);
  aiInsight$.set(null);
  vi.clearAllMocks();
  // Default: never resolves so connectedCallback's fetchBriefing() doesn't overwrite test state.
  // Tests that need hassCall to return a value override it explicitly.
  vi.mocked(hassCallMod.hassCall).mockReturnValue(new Promise(() => {}));
});

afterEach(() => {
  document.body.innerHTML = '';
});

// ---------------------------------------------------------------------------
// Slice 1 — Loading state
// ---------------------------------------------------------------------------

describe('GmBriefingPanel — loading state', () => {
  it('renders .briefing-loading when isAiLoading$ is true and aiBriefing$ is null', async () => {
    isAiLoading$.set(true);

    const el = await fixture<GmBriefingPanel>(html`
      <gm-briefing-panel></gm-briefing-panel>
    `);
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector('.briefing-loading')).not.toBeNull();
  });

  it('hides .briefing-loading when aiBriefing$ is set', async () => {
    isAiLoading$.set(true);
    aiBriefing$.set(BRIEFING);

    const el = await fixture<GmBriefingPanel>(html`
      <gm-briefing-panel></gm-briefing-panel>
    `);
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector('.briefing-loading')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Slice 2 — TL;DR card: headline and summary paragraph
// ---------------------------------------------------------------------------

describe('GmBriefingPanel — TL;DR card', () => {
  beforeEach(() => {
    aiBriefing$.set(BRIEFING);
  });

  it('renders .insight-head when briefing is loaded', async () => {
    const el = await fixture<GmBriefingPanel>(html`
      <gm-briefing-panel></gm-briefing-panel>
    `);
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector('.insight-head')).not.toBeNull();
  });

  it('renders the briefing headline in .insight-head h3', async () => {
    const el = await fixture<GmBriefingPanel>(html`
      <gm-briefing-panel></gm-briefing-panel>
    `);
    await el.updateComplete;

    const h3 = el.shadowRoot!.querySelector<HTMLElement>('.insight-head h3');
    expect(h3).not.toBeNull();
    expect(h3!.textContent).toContain('Morning briefing');
  });

  it('renders summary_text as a paragraph in .insight-head', async () => {
    const el = await fixture<GmBriefingPanel>(html`
      <gm-briefing-panel></gm-briefing-panel>
    `);
    await el.updateComplete;

    const p = el.shadowRoot!.querySelector<HTMLElement>('.insight-head p');
    expect(p).not.toBeNull();
    expect(p!.textContent).toContain('Plants are healthy');
  });
});

// ---------------------------------------------------------------------------
// Slice 3 — Confidence meter
// ---------------------------------------------------------------------------

describe('GmBriefingPanel — confidence meter', () => {
  it('renders .conf-meter when briefing has confidence', async () => {
    aiBriefing$.set(BRIEFING);

    const el = await fixture<GmBriefingPanel>(html`
      <gm-briefing-panel></gm-briefing-panel>
    `);
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector('.conf-meter')).not.toBeNull();
  });

  it('does not render .conf-meter when confidence is absent', async () => {
    const { confidence: _c, ...noConf } = BRIEFING;
    aiBriefing$.set({ ...noConf, kpis: BRIEFING.kpis, recommendations: BRIEFING.recommendations });

    const el = await fixture<GmBriefingPanel>(html`
      <gm-briefing-panel></gm-briefing-panel>
    `);
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector('.conf-meter')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Slice 4 — KPI row
// ---------------------------------------------------------------------------

describe('GmBriefingPanel — KPI row', () => {
  beforeEach(() => {
    aiBriefing$.set(BRIEFING);
  });

  it('renders .kpi-row when briefing is loaded', async () => {
    const el = await fixture<GmBriefingPanel>(html`
      <gm-briefing-panel></gm-briefing-panel>
    `);
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector('.kpi-row')).not.toBeNull();
  });

  it('renders one .kpi-card per KPI entry', async () => {
    const el = await fixture<GmBriefingPanel>(html`
      <gm-briefing-panel></gm-briefing-panel>
    `);
    await el.updateComplete;

    const cards = el.shadowRoot!.querySelectorAll('.kpi-card');
    expect(cards.length).toBe(3);
  });

  it('renders KPI label and value inside .kpi-card', async () => {
    const el = await fixture<GmBriefingPanel>(html`
      <gm-briefing-panel></gm-briefing-panel>
    `);
    await el.updateComplete;

    const firstCard = el.shadowRoot!.querySelector<HTMLElement>('.kpi-card');
    expect(firstCard!.textContent).toContain('Avg VPD');
    expect(firstCard!.textContent).toContain('1.2');
  });
});

// ---------------------------------------------------------------------------
// Slice 5 — Recommendation rows
// ---------------------------------------------------------------------------

describe('GmBriefingPanel — recommendation rows', () => {
  beforeEach(() => {
    aiBriefing$.set(BRIEFING);
  });

  it('renders one .reco-row per recommendation', async () => {
    const el = await fixture<GmBriefingPanel>(html`
      <gm-briefing-panel></gm-briefing-panel>
    `);
    await el.updateComplete;

    const rows = el.shadowRoot!.querySelectorAll('.reco-row');
    expect(rows.length).toBe(3);
  });

  it('renders title and description in each .reco-row', async () => {
    const el = await fixture<GmBriefingPanel>(html`
      <gm-briefing-panel></gm-briefing-panel>
    `);
    await el.updateComplete;

    const firstRow = el.shadowRoot!.querySelector<HTMLElement>('.reco-row');
    expect(firstRow!.textContent).toContain('Lower daytime temp');
    expect(firstRow!.textContent).toContain('Reduce by 2°C');
  });
});

// ---------------------------------------------------------------------------
// Slice 6 — Impact badge colours
// ---------------------------------------------------------------------------

describe('GmBriefingPanel — impact badge colours', () => {
  beforeEach(() => {
    aiBriefing$.set(BRIEFING);
  });

  it('high impact badge has data-impact="high"', async () => {
    const el = await fixture<GmBriefingPanel>(html`
      <gm-briefing-panel></gm-briefing-panel>
    `);
    await el.updateComplete;

    const rows = el.shadowRoot!.querySelectorAll('.reco-row');
    const badge = rows[0].querySelector('[data-impact="high"]');
    expect(badge).not.toBeNull();
  });

  it('medium impact badge has data-impact="medium"', async () => {
    const el = await fixture<GmBriefingPanel>(html`
      <gm-briefing-panel></gm-briefing-panel>
    `);
    await el.updateComplete;

    const rows = el.shadowRoot!.querySelectorAll('.reco-row');
    const badge = rows[1].querySelector('[data-impact="medium"]');
    expect(badge).not.toBeNull();
  });

  it('low impact badge has data-impact="low"', async () => {
    const el = await fixture<GmBriefingPanel>(html`
      <gm-briefing-panel></gm-briefing-panel>
    `);
    await el.updateComplete;

    const rows = el.shadowRoot!.querySelectorAll('.reco-row');
    const badge = rows[2].querySelector('[data-impact="low"]');
    expect(badge).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Slice 7 — Apply button calls applyAction
// ---------------------------------------------------------------------------

describe('GmBriefingPanel — Apply button', () => {
  beforeEach(() => {
    aiBriefing$.set(BRIEFING);
  });

  it('renders Apply button only on recommendations with suggested_action', async () => {
    const el = await fixture<GmBriefingPanel>(html`
      <gm-briefing-panel></gm-briefing-panel>
    `);
    await el.updateComplete;

    const applyBtns = el.shadowRoot!.querySelectorAll('.reco-apply');
    expect(applyBtns.length).toBe(1);
  });

  it('Apply button calls callService with the suggested_action payload', async () => {
    const el = await fixture<GmBriefingPanel>(html`
      <gm-briefing-panel></gm-briefing-panel>
    `);
    await el.updateComplete;

    const applyBtn = el.shadowRoot!.querySelector<HTMLElement>('.reco-apply');
    applyBtn!.click();
    await new Promise((r) => setTimeout(r, 20));

    expect(hassCallMod.callService).toHaveBeenCalledWith(
      'climate.set_temperature',
      'climate.tent_1',
      { temperature: 24 },
    );
  });
});

// ---------------------------------------------------------------------------
// Slice 8 — Regenerate button
// ---------------------------------------------------------------------------

describe('GmBriefingPanel — Regenerate button', () => {
  beforeEach(() => {
    aiBriefing$.set(BRIEFING);
  });

  it('renders a Regenerate button', async () => {
    const el = await fixture<GmBriefingPanel>(html`
      <gm-briefing-panel></gm-briefing-panel>
    `);
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector('.briefing-regenerate')).not.toBeNull();
  });

  it('Regenerate calls hassCall with get_briefing + force_refresh: true', async () => {
    const el = await fixture<GmBriefingPanel>(html`
      <gm-briefing-panel></gm-briefing-panel>
    `);
    await el.updateComplete;

    el.shadowRoot!.querySelector<HTMLElement>('.briefing-regenerate')!.click();
    await new Promise((r) => setTimeout(r, 20));

    expect(hassCallMod.hassCall).toHaveBeenCalledWith(
      'growspace_manager/get_briefing',
      { force_refresh: true },
      expect.anything(),
    );
  });
});

// ---------------------------------------------------------------------------
// Slice 9 — Follow-up input
// ---------------------------------------------------------------------------

describe('GmBriefingPanel — follow-up input', () => {
  beforeEach(() => {
    aiBriefing$.set(BRIEFING);
  });

  it('renders .follow-up input', async () => {
    const el = await fixture<GmBriefingPanel>(html`
      <gm-briefing-panel growspaceid="gs1"></gm-briefing-panel>
    `);
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector('.follow-up')).not.toBeNull();
  });

  it('Enter in follow-up calls hassCall with start_conversation', async () => {
    vi.mocked(hassCallMod.hassCall).mockResolvedValue({
      thread_id: 't1', growspace_id: 'gs1', messages: [],
    });

    const el = await fixture<GmBriefingPanel>(html`
      <gm-briefing-panel growspaceid="gs1"></gm-briefing-panel>
    `);
    await el.updateComplete;

    const input = el.shadowRoot!.querySelector<HTMLInputElement>('.follow-up');
    input!.value = 'Why is VPD rising?';
    input!.dispatchEvent(new Event('input'));
    await el.updateComplete;

    input!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await new Promise((r) => setTimeout(r, 50));

    expect(hassCallMod.hassCall).toHaveBeenCalledWith(
      'growspace_manager/start_conversation',
      expect.objectContaining({ growspace_id: 'gs1', text: 'Why is VPD rising?' }),
      expect.anything(),
    );
  });

  it('Enter in follow-up switches aiMode$ to chat', async () => {
    vi.mocked(hassCallMod.hassCall).mockResolvedValue({
      thread_id: 't1', growspace_id: 'gs1', messages: [],
    });

    const el = await fixture<GmBriefingPanel>(html`
      <gm-briefing-panel growspaceid="gs1"></gm-briefing-panel>
    `);
    await el.updateComplete;

    const input = el.shadowRoot!.querySelector<HTMLInputElement>('.follow-up');
    input!.value = 'Why is VPD rising?';
    input!.dispatchEvent(new Event('input'));
    await el.updateComplete;

    input!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await new Promise((r) => setTimeout(r, 50));

    expect(aiMode$.get()).toBe('chat');
  });
});
