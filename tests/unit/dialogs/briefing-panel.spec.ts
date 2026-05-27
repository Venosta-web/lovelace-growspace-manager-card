import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { GmBriefingPanel } from '../../../src/dialogs/briefing-panel';
import '../../../src/dialogs/briefing-panel';
import { aiBriefing$, isAiLoading$ } from '../../../src/slices/ai-insight';
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
    aiBriefing$.set(STUB_BRIEFING);
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
    aiBriefing$.set(STUB_BRIEFING);
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
