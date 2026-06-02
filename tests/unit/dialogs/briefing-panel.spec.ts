import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { GmBriefingPanel } from '../../../src/dialogs/briefing-panel';
import '../../../src/dialogs/briefing-panel';
import { aiBriefing$, isAiLoading$, saveAiAgent } from '../../../src/slices/ai-insight';
import type { AIBriefing } from '../../../src/slices/ai-insight/schema';

vi.mock('../../../src/services/hass-call', () => ({
  callService: vi.fn().mockResolvedValue(undefined),
  callServiceReturning: vi.fn().mockResolvedValue({ response: 'ok' }),
  hassCall: vi.fn().mockResolvedValue({}),
  setHass: vi.fn(),
}));

vi.mock('../../../src/slices/ai-insight', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/slices/ai-insight')>();
  return {
    ...actual,
    fetchBriefing: vi.fn().mockResolvedValue(undefined),
    applyAction: vi.fn().mockResolvedValue(undefined),
    startConversation: vi.fn().mockResolvedValue(undefined),
    saveAiAgent: vi.fn().mockResolvedValue(undefined),
  };
});

const STUB_BRIEFING: AIBriefing = {
  generated_at: 1700000000,
  summary_text: 'Plants look great overall.',
  headline: 'Morning Briefing',
  confidence: 0.9,
  drawn_from: '24h sensor data',
  kpis: [{ label: 'VPD', value: 1.2, unit: 'kPa' }],
  recommendations: [
    { title: 'Raise dehumidifier', description: 'RH is high at lights-off.', impact: 'high' },
    { title: 'Check pH', description: 'pH drifted slightly.', impact: 'medium' },
  ],
  ai_available: true,
};

describe('GmBriefingPanel — tab rail', () => {
  let element: GmBriefingPanel;

  beforeEach(async () => {
    isAiLoading$.set(false);
    aiBriefing$.set(new Map([['', STUB_BRIEFING]]));
    element = document.createElement('gm-briefing-panel') as GmBriefingPanel;
    document.body.appendChild(element);
    await element.updateComplete;
  });

  afterEach(() => {
    if (element.isConnected) document.body.removeChild(element);
    vi.restoreAllMocks();
  });

  it('renders all four briefing tab buttons', () => {
    const buttons = element.shadowRoot?.querySelectorAll('.v1-nav-item');
    expect(buttons?.length).toBe(4);
  });

  it('first tab starts as active (aria-pressed="true")', () => {
    const buttons = element.shadowRoot?.querySelectorAll('.v1-nav-item');
    expect(buttons?.[0].getAttribute('aria-pressed')).toBe('true');
    expect(buttons?.[1].getAttribute('aria-pressed')).toBe('false');
    expect(buttons?.[2].getAttribute('aria-pressed')).toBe('false');
    expect(buttons?.[3].getAttribute('aria-pressed')).toBe('false');
  });

  it('clicking "Risk watch" makes it active and deactivates "Morning briefing"', async () => {
    const buttons = element.shadowRoot?.querySelectorAll('.v1-nav-item');
    (buttons?.[1] as HTMLElement).click();
    await element.updateComplete;

    expect(buttons?.[0].getAttribute('aria-pressed')).toBe('false');
    expect(buttons?.[1].getAttribute('aria-pressed')).toBe('true');
  });

  it('clicking "What\'s going well" makes it active', async () => {
    const buttons = element.shadowRoot?.querySelectorAll('.v1-nav-item');
    (buttons?.[2] as HTMLElement).click();
    await element.updateComplete;

    expect(buttons?.[2].getAttribute('aria-pressed')).toBe('true');
    expect(buttons?.[0].getAttribute('aria-pressed')).toBe('false');
  });

  it('clicking "7-day forecast" makes it active', async () => {
    const buttons = element.shadowRoot?.querySelectorAll('.v1-nav-item');
    (buttons?.[3] as HTMLElement).click();
    await element.updateComplete;

    expect(buttons?.[3].getAttribute('aria-pressed')).toBe('true');
    expect(buttons?.[0].getAttribute('aria-pressed')).toBe('false');
  });

  it('can switch back to "Morning briefing" after switching away', async () => {
    const buttons = element.shadowRoot?.querySelectorAll('.v1-nav-item');
    (buttons?.[2] as HTMLElement).click();
    await element.updateComplete;
    (buttons?.[0] as HTMLElement).click();
    await element.updateComplete;

    expect(buttons?.[0].getAttribute('aria-pressed')).toBe('true');
    expect(buttons?.[2].getAttribute('aria-pressed')).toBe('false');
  });
});

describe('GmBriefingPanel — tab content', () => {
  let element: GmBriefingPanel;

  beforeEach(async () => {
    isAiLoading$.set(false);
    aiBriefing$.set(new Map([['', STUB_BRIEFING]]));
    element = document.createElement('gm-briefing-panel') as GmBriefingPanel;
    document.body.appendChild(element);
    await element.updateComplete;
  });

  afterEach(() => {
    if (element.isConnected) document.body.removeChild(element);
    vi.restoreAllMocks();
  });

  it('shows morning briefing content on first tab (insight-head visible)', () => {
    expect(element.shadowRoot?.querySelector('.insight-head')).toBeTruthy();
  });

  it('shows risk watch content when "Risk watch" tab is selected', async () => {
    const buttons = element.shadowRoot?.querySelectorAll('.v1-nav-item');
    (buttons?.[1] as HTMLElement).click();
    await element.updateComplete;

    expect(element.shadowRoot?.querySelector('.risk-watch-content')).toBeTruthy();
    expect(element.shadowRoot?.querySelector('.insight-head')).toBeFalsy();
  });

  it('shows whats going well content when that tab is selected', async () => {
    const buttons = element.shadowRoot?.querySelectorAll('.v1-nav-item');
    (buttons?.[2] as HTMLElement).click();
    await element.updateComplete;

    expect(element.shadowRoot?.querySelector('.going-well-content')).toBeTruthy();
    expect(element.shadowRoot?.querySelector('.insight-head')).toBeFalsy();
  });

  it('shows forecast content when "7-day forecast" tab is selected', async () => {
    const buttons = element.shadowRoot?.querySelectorAll('.v1-nav-item');
    (buttons?.[3] as HTMLElement).click();
    await element.updateComplete;

    expect(element.shadowRoot?.querySelector('.forecast-content')).toBeTruthy();
    expect(element.shadowRoot?.querySelector('.insight-head')).toBeFalsy();
  });
});

describe('GmBriefingPanel — going-well tab', () => {
  let element: GmBriefingPanel;

  afterEach(() => {
    if (element.isConnected) document.body.removeChild(element);
    vi.restoreAllMocks();
  });

  it('renders low-impact recommendation rows when they exist', async () => {
    const briefingWithLow: AIBriefing = {
      ...STUB_BRIEFING,
      recommendations: [
        { title: 'Great humidity', description: 'Humidity is optimal.', impact: 'low' },
      ],
    };
    isAiLoading$.set(false);
    aiBriefing$.set(new Map([['', briefingWithLow]]));
    element = document.createElement('gm-briefing-panel') as GmBriefingPanel;
    document.body.appendChild(element);
    await element.updateComplete;

    const buttons = element.shadowRoot?.querySelectorAll('.v1-nav-item');
    (buttons?.[2] as HTMLElement).click();
    await element.updateComplete;

    expect(element.shadowRoot?.querySelector('.going-well-content .reco-row')).toBeTruthy();
  });

  it('shows empty placeholder when no low-impact recommendations', async () => {
    isAiLoading$.set(false);
    aiBriefing$.set(new Map([['', STUB_BRIEFING]]));
    element = document.createElement('gm-briefing-panel') as GmBriefingPanel;
    document.body.appendChild(element);
    await element.updateComplete;

    const buttons = element.shadowRoot?.querySelectorAll('.v1-nav-item');
    (buttons?.[2] as HTMLElement).click();
    await element.updateComplete;

    const placeholder = element.shadowRoot?.querySelector('.going-well-content .tab-placeholder');
    expect(placeholder?.textContent?.trim()).toBe("Nothing flagged as low-impact — keep it up!");
  });
});

describe('GmBriefingPanel — agent setup', () => {
  let element: GmBriefingPanel;

  const UNAVAILABLE_BRIEFING: AIBriefing = {
    ...STUB_BRIEFING,
    ai_available: false,
  };

  beforeEach(async () => {
    isAiLoading$.set(false);
    aiBriefing$.set(new Map([['', UNAVAILABLE_BRIEFING]]));
    element = document.createElement('gm-briefing-panel') as GmBriefingPanel;
    document.body.appendChild(element);
    await element.updateComplete;
  });

  afterEach(() => {
    if (element.isConnected) document.body.removeChild(element);
    vi.restoreAllMocks();
  });

  it('value-changed on ha-entity-picker enables the save button', async () => {
    const picker = element.shadowRoot?.querySelector('ha-entity-picker');
    picker?.dispatchEvent(new CustomEvent('value-changed', { detail: { value: 'conversation.home_assistant' } }));
    await element.updateComplete;

    const btn = element.shadowRoot?.querySelector('.agent-save-btn') as HTMLButtonElement;
    expect(btn?.disabled).toBe(false);
  });

  it('_saveAgent happy path: resolves without error message', async () => {
    const picker = element.shadowRoot?.querySelector('ha-entity-picker');
    picker?.dispatchEvent(new CustomEvent('value-changed', { detail: { value: 'conversation.home_assistant' } }));
    await element.updateComplete;

    const btn = element.shadowRoot?.querySelector('.agent-save-btn') as HTMLButtonElement;
    btn.click();
    await new Promise(resolve => setTimeout(resolve, 0));
    await element.updateComplete;

    expect(vi.mocked(saveAiAgent)).toHaveBeenCalledWith('conversation.home_assistant', '');
    expect(element.shadowRoot?.querySelector('.agent-setup-error')).toBeFalsy();
    expect(btn.textContent?.trim()).toBe('Enable AI');
  });

  it('_saveAgent error path: shows error message on failure', async () => {
    vi.mocked(saveAiAgent).mockRejectedValueOnce(new Error('Network error'));

    const picker = element.shadowRoot?.querySelector('ha-entity-picker');
    picker?.dispatchEvent(new CustomEvent('value-changed', { detail: { value: 'conversation.home_assistant' } }));
    await element.updateComplete;

    const btn = element.shadowRoot?.querySelector('.agent-save-btn') as HTMLButtonElement;
    btn.click();
    await new Promise(resolve => setTimeout(resolve, 0));
    await element.updateComplete;

    const errorEl = element.shadowRoot?.querySelector('.agent-setup-error');
    expect(errorEl?.textContent?.trim()).toBe('Network error');
    expect(btn.disabled).toBe(false);
  });
});
