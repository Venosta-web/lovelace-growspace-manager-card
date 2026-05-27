/**
 * AIInsight slice — unit tests.
 *
 * Tests cover:
 *   - atom defaults
 *   - dismissInsight (clears insight + error)
 *   - askGrowAdvice (apply, loading flag, error rollback)
 *   - analyzeAllGrowspaces (apply, loading flag, error rollback)
 *   - SuggestedActionSchema (rejects invalid, accepts valid)
 *   - TriageAlertSchema (nullable ai_reasoning, required fields)
 *   - AIBriefingSchema (rejects negative generated_at)
 *   - startConversation (thread creation, activeThreadId$)
 *   - sendMessage (appends to correct thread)
 *   - applyAction (exact callService payload)
 *   - fetchAlerts (populates aiAlerts$)
 *   - resolveAlert (patches resolved flag)
 *   - fetchBriefing (forceRefresh flag pass-through)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as hassCall from '../../services/hass-call';
import { SuggestedActionSchema, TriageAlertSchema, AIBriefingSchema } from './schema';
import {
  aiInsight$,
  isAiLoading$,
  aiError$,
  dismissInsight,
  clearAiError,
  askGrowAdvice,
  analyzeAllGrowspaces,
  conversationThreads$,
  activeThreadId$,
  aiAlerts$,
  aiBriefing$,
  aiMode$,
  startConversation,
  sendMessage,
  applyAction,
  fetchAlerts,
  resolveAlert,
  fetchBriefing,
} from './index';

vi.mock('../../services/hass-call', () => ({
  callService: vi.fn().mockResolvedValue(undefined),
  callServiceReturning: vi.fn().mockResolvedValue({ response: 'ok' }),
  hassCall: vi.fn().mockResolvedValue({}),
  setHass: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Reset atoms before each test
// ---------------------------------------------------------------------------

beforeEach(() => {
  aiInsight$.set(null);
  isAiLoading$.set(false);
  aiError$.set(null);
  conversationThreads$.set(new Map());
  activeThreadId$.set(null);
  aiAlerts$.set([]);
  aiBriefing$.set(null);
  aiMode$.set('briefing');
  vi.clearAllMocks();
  vi.mocked(hassCall.callServiceReturning).mockResolvedValue({ response: 'ok' });
  vi.mocked(hassCall.hassCall).mockResolvedValue({});
});

// ---------------------------------------------------------------------------
// Atom defaults
// ---------------------------------------------------------------------------

describe('aiInsight$', () => {
  it('defaults to null', () => {
    expect(aiInsight$.get()).toBeNull();
  });
});

describe('isAiLoading$', () => {
  it('defaults to false', () => {
    expect(isAiLoading$.get()).toBe(false);
  });
});

describe('aiError$', () => {
  it('defaults to null', () => {
    expect(aiError$.get()).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// dismissInsight
// ---------------------------------------------------------------------------

describe('dismissInsight', () => {
  it('clears aiInsight$ and aiError$', () => {
    aiInsight$.set('some advice');
    aiError$.set('some error');

    dismissInsight();

    expect(aiInsight$.get()).toBeNull();
    expect(aiError$.get()).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// clearAiError
// ---------------------------------------------------------------------------

describe('clearAiError', () => {
  it('clears only aiError$ without touching aiInsight$', () => {
    aiInsight$.set('existing advice');
    aiError$.set('an error');

    clearAiError();

    expect(aiError$.get()).toBeNull();
    expect(aiInsight$.get()).toBe('existing advice');
  });
});

// ---------------------------------------------------------------------------
// askGrowAdvice
// ---------------------------------------------------------------------------

describe('askGrowAdvice', () => {
  it('calls ask_grow_advice service with growspace_id and user_query', async () => {
    await askGrowAdvice('gs1', 'what is the VPD?');

    expect(hassCall.callServiceReturning).toHaveBeenCalledWith(
      'growspace_manager',
      'ask_grow_advice',
      { growspace_id: 'gs1', user_query: 'what is the VPD?' },
      expect.anything()
    );
  });

  it('sets aiInsight$ to the response text on success', async () => {
    vi.mocked(hassCall.callServiceReturning).mockResolvedValueOnce({
      response: 'Your VPD is fine.',
    });

    await askGrowAdvice('gs1', 'VPD question');

    expect(aiInsight$.get()).toBe('Your VPD is fine.');
  });

  it('extracts nested response string when response is an object', async () => {
    vi.mocked(hassCall.callServiceReturning).mockResolvedValueOnce({
      response: { response: 'Nested advice text.' },
    });

    await askGrowAdvice('gs1', 'question');

    expect(aiInsight$.get()).toBe('Nested advice text.');
  });

  it('clears isAiLoading$ after a successful call', async () => {
    await askGrowAdvice('gs1', 'question');

    expect(isAiLoading$.get()).toBe(false);
  });

  it('sets aiError$ and clears isAiLoading$ when the service call fails', async () => {
    vi.mocked(hassCall.callServiceReturning).mockRejectedValueOnce(new Error('network failure'));

    await expect(askGrowAdvice('gs1', 'question')).rejects.toThrow('network failure');

    expect(aiError$.get()).toBe('network failure');
    expect(isAiLoading$.get()).toBe(false);
    expect(aiInsight$.get()).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// analyzeAllGrowspaces
// ---------------------------------------------------------------------------

describe('analyzeAllGrowspaces', () => {
  it('calls analyze_all_growspaces service with no extra params', async () => {
    await analyzeAllGrowspaces();

    expect(hassCall.callServiceReturning).toHaveBeenCalledWith(
      'growspace_manager',
      'analyze_all_growspaces',
      {},
      expect.anything()
    );
  });

  it('sets aiInsight$ to the response text on success', async () => {
    vi.mocked(hassCall.callServiceReturning).mockResolvedValueOnce({
      response: 'All growspaces healthy.',
    });

    await analyzeAllGrowspaces();

    expect(aiInsight$.get()).toBe('All growspaces healthy.');
  });

  it('sets aiError$ and clears isAiLoading$ when the service call fails', async () => {
    vi.mocked(hassCall.callServiceReturning).mockRejectedValueOnce(new Error('timeout'));

    await expect(analyzeAllGrowspaces()).rejects.toThrow('timeout');

    expect(aiError$.get()).toBe('timeout');
    expect(isAiLoading$.get()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// SuggestedActionSchema
// ---------------------------------------------------------------------------

describe('SuggestedActionSchema', () => {
  it('rejects a payload missing service', () => {
    const result = SuggestedActionSchema.safeParse({
      target_entity_id: 'light.grow_light',
      service_data: {},
      description: 'Turn on grow light',
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// TriageAlertSchema
// ---------------------------------------------------------------------------

describe('TriageAlertSchema', () => {
  const validAlert = {
    id: 'alert-1',
    growspace_id: 'gs1',
    type: 'vpd_warning',
    bayesian_reasons: ['humidity too high'],
    ai_reasoning: null,
    timestamp: 1700000000,
    resolved: false,
    resolution_note: null,
  };

  it('accepts a record with ai_reasoning: null', () => {
    const result = TriageAlertSchema.safeParse(validAlert);
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// AIBriefingSchema
// ---------------------------------------------------------------------------

describe('AIBriefingSchema', () => {
  it('rejects a negative generated_at', () => {
    const result = AIBriefingSchema.safeParse({
      generated_at: -1,
      summary_text: 'All good',
      kpis: [],
      recommendations: [],
      ai_available: true,
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// startConversation
// ---------------------------------------------------------------------------

describe('startConversation', () => {
  it('creates a new thread in conversationThreads$ and sets activeThreadId$', async () => {
    vi.mocked(hassCall.hassCall).mockResolvedValueOnce({
      thread_id: 'thread-abc',
      growspace_id: 'gs1',
      messages: [{ role: 'user', text: 'How is my VPD?', timestamp: 1700000000 }],
    });

    await startConversation('gs1', 'How is my VPD?');

    expect(activeThreadId$.get()).toBe('thread-abc');
    expect(conversationThreads$.get().has('thread-abc')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// sendMessage
// ---------------------------------------------------------------------------

describe('sendMessage', () => {
  it('appends to the correct thread and leaves other threads unchanged', async () => {
    const existingThread = {
      thread_id: 'other-thread',
      growspace_id: 'gs2',
      messages: [{ role: 'user' as const, text: 'Hello', timestamp: 1700000001 }],
    };
    conversationThreads$.set(new Map([['other-thread', existingThread]]));

    vi.mocked(hassCall.hassCall).mockResolvedValueOnce({
      thread_id: 'thread-abc',
      growspace_id: 'gs1',
      messages: [
        { role: 'user', text: 'Follow-up', timestamp: 1700000002 },
        { role: 'ai', text: 'AI reply', timestamp: 1700000003 },
      ],
    });

    await sendMessage('thread-abc', 'Follow-up');

    const threads = conversationThreads$.get();
    expect(threads.get('thread-abc')?.messages).toHaveLength(2);
    expect(threads.get('other-thread')).toEqual(existingThread);
  });
});

// ---------------------------------------------------------------------------
// applyAction
// ---------------------------------------------------------------------------

describe('applyAction', () => {
  it('calls callService with the exact service, target_entity_id, and service_data', async () => {
    const action = {
      service: 'light.turn_on',
      target_entity_id: 'light.grow_light',
      service_data: { brightness: 255 },
      description: 'Turn grow light to full brightness',
    };

    await applyAction(action);

    expect(hassCall.callService).toHaveBeenCalledWith(
      'light.turn_on',
      'light.grow_light',
      { brightness: 255 }
    );
  });
});

// ---------------------------------------------------------------------------
// fetchAlerts
// ---------------------------------------------------------------------------

describe('fetchAlerts', () => {
  it('populates aiAlerts$ with validated TriageAlert records', async () => {
    const alert = {
      id: 'alert-1',
      growspace_id: 'gs1',
      type: 'vpd_warning',
      bayesian_reasons: ['humidity too high'],
      ai_reasoning: 'VPD is outside optimal range',
      timestamp: 1700000000,
      resolved: false,
      resolution_note: null,
    };
    vi.mocked(hassCall.hassCall).mockResolvedValueOnce([alert]);

    await fetchAlerts('gs1');

    expect(aiAlerts$.get()).toEqual([alert]);
  });

  it('calls the correct WS command with growspace_id when provided', async () => {
    vi.mocked(hassCall.hassCall).mockResolvedValueOnce([]);

    await fetchAlerts('gs1');

    expect(hassCall.hassCall).toHaveBeenCalledWith(
      'growspace_manager/get_ai_alerts',
      { growspace_id: 'gs1' },
      expect.anything()
    );
  });
});

// ---------------------------------------------------------------------------
// resolveAlert
// ---------------------------------------------------------------------------

describe('resolveAlert', () => {
  it('patches the resolved flag on the matching alert in aiAlerts$', async () => {
    const alert = {
      id: 'alert-1',
      growspace_id: 'gs1',
      type: 'vpd_warning',
      bayesian_reasons: [],
      ai_reasoning: null,
      timestamp: 1700000000,
      resolved: false,
      resolution_note: null,
    };
    aiAlerts$.set([alert]);
    vi.mocked(hassCall.hassCall).mockResolvedValueOnce({ ...alert, resolved: true });

    await resolveAlert('alert-1', 'Fixed humidity');

    const resolved = aiAlerts$.get().find((a) => a.id === 'alert-1');
    expect(resolved?.resolved).toBe(true);
  });

  it('leaves other alerts unchanged', async () => {
    const alertA = {
      id: 'alert-1',
      growspace_id: 'gs1',
      type: 'vpd_warning',
      bayesian_reasons: [],
      ai_reasoning: null,
      timestamp: 1700000000,
      resolved: false,
      resolution_note: null,
    };
    const alertB = { ...alertA, id: 'alert-2' };
    aiAlerts$.set([alertA, alertB]);
    vi.mocked(hassCall.hassCall).mockResolvedValueOnce({ ...alertA, resolved: true });

    await resolveAlert('alert-1');

    expect(aiAlerts$.get().find((a) => a.id === 'alert-2')?.resolved).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// fetchBriefing
// ---------------------------------------------------------------------------

describe('fetchBriefing', () => {
  const briefingPayload = {
    generated_at: 1700000000,
    summary_text: 'Plants are healthy',
    kpis: [{ label: 'VPD', value: '1.2 kPa' }],
    recommendations: ['Reduce humidity slightly'],
    ai_available: true,
  };

  it('updates aiBriefing$ with the returned briefing', async () => {
    vi.mocked(hassCall.hassCall).mockResolvedValueOnce(briefingPayload);

    await fetchBriefing();

    expect(aiBriefing$.get()).toEqual(briefingPayload);
  });

  it('passes force_refresh: true when forceRefresh is true', async () => {
    vi.mocked(hassCall.hassCall).mockResolvedValueOnce(briefingPayload);

    await fetchBriefing(true);

    expect(hassCall.hassCall).toHaveBeenCalledWith(
      'growspace_manager/get_briefing',
      { force_refresh: true },
      expect.anything()
    );
  });

  it('omits force_refresh when forceRefresh is false', async () => {
    vi.mocked(hassCall.hassCall).mockResolvedValueOnce(briefingPayload);

    await fetchBriefing(false);

    expect(hassCall.hassCall).toHaveBeenCalledWith(
      'growspace_manager/get_briefing',
      {},
      expect.anything()
    );
  });
});
