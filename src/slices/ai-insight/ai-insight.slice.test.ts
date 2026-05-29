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
 *   - startConversation (thread creation, activeThreadId$ keyed by growspace)
 *   - sendMessage (appends to correct thread)
 *   - applyAction (exact callService payload)
 *   - fetchAlerts (populates aiAlerts$ keyed by growspace, isolated per growspace)
 *   - resolveAlert (patches resolved flag in keyed map)
 *   - fetchBriefing (keyed by growspace, forceRefresh flag, isolated per growspace)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as hassCall from '../../services/hass-call';
import { WSError } from '../../services/base-api';
import { notification$ } from '../ui';
import { SuggestedActionSchema, TriageAlertSchema, AIBriefingSchema, ResolveAckSchema, ConversationThreadSchema, MAX_PINNED_THREADS, MAX_RECENT_THREADS } from './schema';
import type { ConversationThread } from './schema';
import {
  aiInsight$,
  isAiLoading$,
  aiError$,
  aiEnabled$,
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
  togglePin,
  applyAction,
  fetchAlerts,
  resolveAlert,
  fetchBriefing,
  fetchConversationThreads,
  fetchAiStatus,
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
  aiEnabled$.set(null);
  conversationThreads$.set(new Map());
  activeThreadId$.set(new Map());
  aiAlerts$.set(new Map());
  aiBriefing$.set(new Map());
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

describe('aiBriefing$', () => {
  it('defaults to an empty map', () => {
    expect(aiBriefing$.get()).toBeInstanceOf(Map);
    expect(aiBriefing$.get().size).toBe(0);
  });
});

describe('aiAlerts$', () => {
  it('defaults to an empty map', () => {
    expect(aiAlerts$.get()).toBeInstanceOf(Map);
    expect(aiAlerts$.get().size).toBe(0);
  });
});

describe('activeThreadId$', () => {
  it('defaults to an empty map', () => {
    expect(activeThreadId$.get()).toBeInstanceOf(Map);
    expect(activeThreadId$.get().size).toBe(0);
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

  it('JSON-stringifies inner when response is a non-string non-response object', async () => {
    vi.mocked(hassCall.callServiceReturning).mockResolvedValueOnce({ response: 42 });

    await askGrowAdvice('gs1', 'question');

    expect(aiInsight$.get()).toBe('42');
  });

  it('JSON-stringifies raw when it has no response property', async () => {
    vi.mocked(hassCall.callServiceReturning).mockResolvedValueOnce(42);

    await askGrowAdvice('gs1', 'question');

    expect(aiInsight$.get()).toBe('42');
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

  it('shows a rate-limit toast and does not set aiError$ or throw when rate_limited', async () => {
    vi.mocked(hassCall.callServiceReturning).mockRejectedValueOnce(
      new WSError('rate_limited', 'Rate limit exceeded')
    );
    notification$.set(null);

    await askGrowAdvice('gs1', 'question');

    expect(aiError$.get()).toBeNull();
    expect(notification$.get()).not.toBeNull();
    expect(notification$.get()?.message).toContain('rate limit');
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

  it('shows a rate-limit toast and does not set aiError$ or throw when rate_limited', async () => {
    vi.mocked(hassCall.callServiceReturning).mockRejectedValueOnce(
      new WSError('rate_limited', 'Rate limit exceeded')
    );
    notification$.set(null);

    await analyzeAllGrowspaces();

    expect(aiError$.get()).toBeNull();
    expect(notification$.get()).not.toBeNull();
    expect(notification$.get()?.message).toContain('rate limit');
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
  it('creates a new thread in conversationThreads$ and sets activeThreadId$ for that growspace', async () => {
    vi.mocked(hassCall.hassCall).mockResolvedValueOnce({
      thread_id: 'thread-abc',
      growspace_id: 'gs1',
      messages: [{ role: 'user', text: 'How is my VPD?', timestamp: 1700000000 }],
    });

    await startConversation('gs1', 'How is my VPD?');

    expect(activeThreadId$.get().get('gs1')).toBe('thread-abc');
    expect(conversationThreads$.get().has('thread-abc')).toBe(true);
  });

  it('does not affect the active thread of a different growspace', async () => {
    const existingMap = new Map<string, string | null>([['gs2', 'thread-other']]);
    activeThreadId$.set(existingMap);

    vi.mocked(hassCall.hassCall).mockResolvedValueOnce({
      thread_id: 'thread-abc',
      growspace_id: 'gs1',
      messages: [{ role: 'user', text: 'Hello', timestamp: 1700000000 }],
    });

    await startConversation('gs1', 'Hello');

    expect(activeThreadId$.get().get('gs2')).toBe('thread-other');
  });

  it('sends message and growspace_id fields (not text) in payload', async () => {
    vi.mocked(hassCall.hassCall).mockResolvedValueOnce({
      thread_id: 'thread-abc',
      growspace_id: 'gs1',
      messages: [{ role: 'ai', text: 'Here is advice', timestamp: 1700000001 }],
    });

    await startConversation('gs1', 'How can I optimize?');

    const [cmd, payload] = vi.mocked(hassCall.hassCall).mock.calls[0];
    expect(cmd).toBe('growspace_manager/start_conversation');
    expect(payload).toHaveProperty('message', 'How can I optimize?');
    expect(payload).toHaveProperty('growspace_id', 'gs1');
    expect(payload).not.toHaveProperty('text');
  });

  it('sends image_entities as an array when imageEntityId is provided', async () => {
    vi.mocked(hassCall.hassCall).mockResolvedValueOnce({
      thread_id: 'thread-xyz',
      growspace_id: 'gs1',
      messages: [{ role: 'user', text: 'Check this image', timestamp: 1700000000 }],
    });

    await startConversation('gs1', 'Check this image', 'camera.tent1');

    const [, payload] = vi.mocked(hassCall.hassCall).mock.calls[0];
    expect(payload).toHaveProperty('image_entities', ['camera.tent1']);
    expect(payload).not.toHaveProperty('image_entity_id');
  });

  it('sets pinned: false and a positive updated_at on the new thread', async () => {
    vi.mocked(hassCall.hassCall).mockResolvedValueOnce({
      thread_id: 'thread-abc',
      growspace_id: 'gs1',
      messages: [],
    });

    await startConversation('gs1', 'hello');

    const thread = conversationThreads$.get().get('thread-abc');
    expect(thread?.pinned).toBe(false);
    expect(thread?.updated_at).toBeGreaterThan(0);
  });

  it('calls save_conversation_threads for the growspace after creating a thread', async () => {
    vi.mocked(hassCall.hassCall).mockResolvedValueOnce({
      thread_id: 'thread-abc',
      growspace_id: 'gs1',
      messages: [],
    });

    await startConversation('gs1', 'hello');

    const saveCalls = vi.mocked(hassCall.hassCall).mock.calls.filter(
      ([cmd]) => cmd === 'growspace_manager/save_conversation_threads'
    );
    expect(saveCalls).toHaveLength(1);
    expect(saveCalls[0][1]).toMatchObject({ growspace_id: 'gs1' });
  });

  it('shows a rate-limit toast, does not update thread state, and does not throw when rate_limited', async () => {
    vi.mocked(hassCall.hassCall).mockRejectedValueOnce(new WSError('rate_limited', 'rate_limited'));
    notification$.set(null);

    const result = await startConversation('gs1', 'test message');

    expect(result).toBeUndefined();
    expect(conversationThreads$.get().size).toBe(0);
    expect(activeThreadId$.get().size).toBe(0);
    expect(notification$.get()).not.toBeNull();
    expect(notification$.get()?.message).toContain('rate limit');
  });

  it('rethrows non-rate-limited errors', async () => {
    vi.mocked(hassCall.hassCall).mockRejectedValueOnce(new Error('backend error'));

    await expect(startConversation('gs1', 'hello')).rejects.toThrow('backend error');
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
      pinned: false,
      updated_at: 1700000001,
    };
    conversationThreads$.set(new Map([
      ['other-thread', existingThread],
      ['thread-abc', { thread_id: 'thread-abc', growspace_id: 'gs1', messages: [
        { role: 'user' as const, text: 'First message', timestamp: 1700000000 },
      ], pinned: false, updated_at: 1700000000 }],
    ]));

    vi.mocked(hassCall.hassCall).mockResolvedValueOnce({
      thread_id: 'thread-abc',
      growspace_id: 'gs1',
      messages: [{ role: 'ai', text: 'AI reply', timestamp: 1700000003 }],
    });

    await sendMessage('thread-abc', 'Follow-up');

    const threads = conversationThreads$.get();
    // existing(1) + user message(1) + AI reply(1) = 3
    expect(threads.get('thread-abc')?.messages).toHaveLength(3);
    expect(threads.get('other-thread')).toEqual(existingThread);
  });

  it('updates updated_at on the thread after sending', async () => {
    const originalTime = 1700000000000;
    conversationThreads$.set(new Map([
      ['thread-abc', {
        thread_id: 'thread-abc',
        growspace_id: 'gs1',
        messages: [],
        pinned: false,
        updated_at: originalTime,
      }],
    ]));
    vi.mocked(hassCall.hassCall).mockResolvedValueOnce({
      thread_id: 'thread-abc',
      growspace_id: 'gs1',
      messages: [{ role: 'ai', text: 'reply', timestamp: 1700000001 }],
    });

    await sendMessage('thread-abc', 'follow-up');

    const thread = conversationThreads$.get().get('thread-abc');
    expect(thread?.updated_at).toBeGreaterThan(originalTime);
  });

  it('calls save_conversation_threads after sending a message', async () => {
    conversationThreads$.set(new Map([
      ['thread-abc', {
        thread_id: 'thread-abc',
        growspace_id: 'gs1',
        messages: [],
        pinned: false,
        updated_at: 1700000000000,
      }],
    ]));
    vi.mocked(hassCall.hassCall).mockResolvedValueOnce({
      thread_id: 'thread-abc',
      growspace_id: 'gs1',
      messages: [{ role: 'ai', text: 'reply', timestamp: 1700000001 }],
    });

    await sendMessage('thread-abc', 'follow-up');

    const saveCalls = vi.mocked(hassCall.hassCall).mock.calls.filter(
      ([cmd]) => cmd === 'growspace_manager/save_conversation_threads'
    );
    expect(saveCalls).toHaveLength(1);
    expect(saveCalls[0][1]).toMatchObject({ growspace_id: 'gs1' });
  });

  it('sends conversation_id and message fields (not thread_id or text)', async () => {
    vi.mocked(hassCall.hassCall).mockResolvedValueOnce({
      thread_id: 'thread-abc',
      growspace_id: 'gs1',
      messages: [
        { role: 'user', text: 'Follow-up', timestamp: 1700000002 },
        { role: 'ai', text: 'AI reply', timestamp: 1700000003 },
      ],
    });

    await sendMessage('thread-abc', 'Follow-up');

    const [cmd, payload] = vi.mocked(hassCall.hassCall).mock.calls[0];
    expect(cmd).toBe('growspace_manager/send_message');
    expect(payload).toHaveProperty('conversation_id', 'thread-abc');
    expect(payload).toHaveProperty('message', 'Follow-up');
    expect(payload).not.toHaveProperty('thread_id');
    expect(payload).not.toHaveProperty('text');
  });

  it('shows a rate-limit toast and does not throw when rate_limited', async () => {
    vi.mocked(hassCall.hassCall).mockRejectedValueOnce(new WSError('rate_limited', 'rate_limited'));
    notification$.set(null);

    await sendMessage('thread-abc', 'hello');

    expect(notification$.get()).not.toBeNull();
    expect(notification$.get()?.message).toContain('rate limit');
  });

  it('rethrows non-rate-limited errors', async () => {
    vi.mocked(hassCall.hassCall).mockRejectedValueOnce(new Error('send failed'));

    await expect(sendMessage('thread-abc', 'hello')).rejects.toThrow('send failed');
  });

  it('sends image_entities as an array when imageEntityId is provided', async () => {
    conversationThreads$.set(new Map([
      ['thread-abc', {
        thread_id: 'thread-abc',
        growspace_id: 'gs1',
        messages: [],
        pinned: false,
        updated_at: 1700000000,
      }],
    ]));
    vi.mocked(hassCall.hassCall).mockResolvedValueOnce({
      thread_id: 'thread-abc',
      growspace_id: 'gs1',
      messages: [{ role: 'ai', text: 'reply', timestamp: 1700000001 }],
    });

    await sendMessage('thread-abc', 'Check image', 'camera.tent1');

    const [, payload] = vi.mocked(hassCall.hassCall).mock.calls[0];
    expect(payload).toHaveProperty('image_entities', ['camera.tent1']);
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
  const alert = {
    id: 'alert-1',
    growspace_id: 'gs1',
    type: 'vpd_warning',
    severity: 'info' as const,
    bayesian_reasons: ['humidity too high'],
    ai_reasoning: 'VPD is outside optimal range',
    timestamp: 1700000000,
    resolved: false,
    resolution_note: null,
  };

  it('stores alerts for the given growspace in aiAlerts$', async () => {
    vi.mocked(hassCall.hassCall).mockResolvedValueOnce([alert]);

    await fetchAlerts('gs1');

    expect(aiAlerts$.get().get('gs1')).toEqual([alert]);
  });

  it('calls the correct WS command with growspace_id', async () => {
    vi.mocked(hassCall.hassCall).mockResolvedValueOnce([]);

    await fetchAlerts('gs1');

    expect(hassCall.hassCall).toHaveBeenCalledWith(
      'growspace_manager/get_ai_alerts',
      { growspace_id: 'gs1' },
      expect.anything()
    );
  });

  it('does not overwrite alerts for a different growspace', async () => {
    const gs2Alert = { ...alert, id: 'alert-2', growspace_id: 'gs2' };
    aiAlerts$.set(new Map([['gs2', [gs2Alert]]]));
    vi.mocked(hassCall.hassCall).mockResolvedValueOnce([alert]);

    await fetchAlerts('gs1');

    expect(aiAlerts$.get().get('gs2')).toEqual([gs2Alert]);
    expect(aiAlerts$.get().get('gs1')).toEqual([alert]);
  });
});

// ---------------------------------------------------------------------------
// resolveAlert
// ---------------------------------------------------------------------------

describe('resolveAlert', () => {
  const alert = {
    id: 'alert-1',
    growspace_id: 'gs1',
    type: 'vpd_warning',
    severity: 'warning' as const,
    bayesian_reasons: [],
    ai_reasoning: null,
    timestamp: 1700000000,
    resolved: false,
    resolution_note: null,
  };

  it('calls resolve_ai_alert with the correct schema (ResolveAckSchema, not TriageAlertSchema)', async () => {
    aiAlerts$.set(new Map([['gs1', [alert]]]));
    vi.mocked(hassCall.hassCall).mockResolvedValueOnce({ success: true, alert_id: 'alert-1' });

    await resolveAlert('alert-1');

    const [, , schema] = vi.mocked(hassCall.hassCall).mock.calls[0];
    expect(ResolveAckSchema.safeParse({ success: true, alert_id: 'alert-1' }).success).toBe(true);
    expect(TriageAlertSchema.safeParse({ success: true, alert_id: 'alert-1' }).success).toBe(false);
    expect((schema as typeof ResolveAckSchema).safeParse({ success: true, alert_id: 'alert-1' }).success).toBe(true);
  });

  it('sends resolution_note in the payload when provided', async () => {
    aiAlerts$.set(new Map([['gs1', [alert]]]));
    vi.mocked(hassCall.hassCall).mockResolvedValueOnce({ success: true, alert_id: 'alert-1' });

    await resolveAlert('alert-1', 'Fixed humidity');

    const [, payload] = vi.mocked(hassCall.hassCall).mock.calls[0];
    expect(payload).toHaveProperty('resolution_note', 'Fixed humidity');
    expect(payload).not.toHaveProperty('notes');
  });

  it('patches the resolved flag on the matching alert regardless of growspace', async () => {
    aiAlerts$.set(new Map([['gs1', [alert]]]));
    vi.mocked(hassCall.hassCall).mockResolvedValueOnce({ success: true, alert_id: 'alert-1' });

    await resolveAlert('alert-1', 'Fixed humidity');

    const resolved = aiAlerts$.get().get('gs1')?.find((a) => a.id === 'alert-1');
    expect(resolved?.resolved).toBe(true);
  });

  it('leaves other alerts unchanged', async () => {
    const alertB = { ...alert, id: 'alert-2' };
    aiAlerts$.set(new Map([['gs1', [alert, alertB]]]));
    vi.mocked(hassCall.hassCall).mockResolvedValueOnce({ success: true, alert_id: 'alert-1' });

    await resolveAlert('alert-1');

    expect(aiAlerts$.get().get('gs1')?.find((a) => a.id === 'alert-2')?.resolved).toBe(false);
  });

  it('leaves aiAlerts$ unchanged when alert id is not found in any growspace', async () => {
    aiAlerts$.set(new Map([['gs1', [alert]]]));
    vi.mocked(hassCall.hassCall).mockResolvedValueOnce({ success: true, alert_id: 'nonexistent' });

    await resolveAlert('nonexistent');

    expect(aiAlerts$.get().get('gs1')?.find((a) => a.id === 'alert-1')?.resolved).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// fetchBriefing
// ---------------------------------------------------------------------------

describe('fetchBriefing', () => {
  const briefingPayload = {
    generated_at: 1700000000,
    summary_text: 'Plants are healthy',
    kpis: [{ label: 'VPD', value: '1.2', unit: 'kPa' }],
    recommendations: [{ title: 'Reduce humidity', description: 'Slightly lower RH', impact: 'low' as const }],
    ai_available: true,
  };

  it('stores the briefing keyed by growspaceId', async () => {
    vi.mocked(hassCall.hassCall).mockResolvedValueOnce(briefingPayload);

    await fetchBriefing('gs1');

    expect(aiBriefing$.get().get('gs1')).toEqual(briefingPayload);
  });

  it('does not overwrite the briefing of a different growspace', async () => {
    const gs2Briefing = { ...briefingPayload, summary_text: 'gs2 is healthy' };
    aiBriefing$.set(new Map([['gs2', gs2Briefing]]));
    vi.mocked(hassCall.hassCall).mockResolvedValueOnce(briefingPayload);

    await fetchBriefing('gs1');

    expect(aiBriefing$.get().get('gs2')).toEqual(gs2Briefing);
    expect(aiBriefing$.get().get('gs1')).toEqual(briefingPayload);
  });

  it('passes growspace_id and force_refresh: true when forceRefresh is true', async () => {
    vi.mocked(hassCall.hassCall).mockResolvedValueOnce(briefingPayload);

    await fetchBriefing('gs1', true);

    expect(hassCall.hassCall).toHaveBeenCalledWith(
      'growspace_manager/get_briefing',
      { growspace_id: 'gs1', force_refresh: true },
      expect.anything()
    );
  });

  it('passes growspace_id and omits force_refresh when forceRefresh is false', async () => {
    vi.mocked(hassCall.hassCall).mockResolvedValueOnce(briefingPayload);

    await fetchBriefing('gs1', false);

    expect(hassCall.hassCall).toHaveBeenCalledWith(
      'growspace_manager/get_briefing',
      { growspace_id: 'gs1' },
      expect.anything()
    );
  });
});

// ---------------------------------------------------------------------------
// aiEnabled$
// ---------------------------------------------------------------------------

describe('aiEnabled$', () => {
  it('defaults to null', () => {
    expect(aiEnabled$.get()).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// fetchAiStatus
// ---------------------------------------------------------------------------

describe('fetchAiStatus', () => {
  it('sets aiEnabled$ to true when backend returns ai_enabled: true', async () => {
    vi.mocked(hassCall.hassCall).mockResolvedValueOnce({ ai_enabled: true });

    await fetchAiStatus();

    expect(aiEnabled$.get()).toBe(true);
  });

  it('sets aiEnabled$ to false when backend returns ai_enabled: false', async () => {
    vi.mocked(hassCall.hassCall).mockResolvedValueOnce({ ai_enabled: false });

    await fetchAiStatus();

    expect(aiEnabled$.get()).toBe(false);
  });

  it('calls the correct WS command', async () => {
    vi.mocked(hassCall.hassCall).mockResolvedValueOnce({ ai_enabled: true });

    await fetchAiStatus();

    expect(hassCall.hassCall).toHaveBeenCalledWith(
      'growspace_manager/get_ai_status',
      {},
      expect.anything()
    );
  });

  it('does not update aiEnabled$ when call fails', async () => {
    vi.mocked(hassCall.hassCall).mockRejectedValueOnce(new Error('network'));
    aiEnabled$.set(null);

    await fetchAiStatus();

    expect(aiEnabled$.get()).toBeNull();
  });
});

describe('saveAiSettings', () => {
  beforeEach(() => {
    vi.mocked(hassCall.hassCall).mockResolvedValue({});
  });

  it('calls growspace_manager/save_ai_settings with the draft payload', async () => {
    const { saveAiSettings } = await import('./index');
    const draft = {
      ai_enabled: true,
      assistant_id: 'conversation.claude',
      notification_personality: 'Scientific',
      ai_auto_alerts: false,
      max_response_length: 300,
      vision_checkup_enabled: true,
      ai_task_entity_id: 'ai_task.my_task',
      briefing_interval_minutes: 60,
      briefing_trigger_entities: ['sensor.vpd'],
    };

    await saveAiSettings(draft);

    expect(hassCall.hassCall).toHaveBeenCalledWith(
      'growspace_manager/save_ai_settings',
      draft,
      expect.anything()
    );
  });
});

// ---------------------------------------------------------------------------
// fetchAiSettings
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// togglePin
// ---------------------------------------------------------------------------

describe('togglePin', () => {
  const makeThread = (id: string, pinned: boolean): ConversationThread => ({
    thread_id: id,
    growspace_id: 'gs1',
    messages: [],
    pinned,
    updated_at: 1700000000,
  });

  it('pins an unpinned thread and saves to backend', async () => {
    conversationThreads$.set(new Map([['t1', makeThread('t1', false)]]));

    await togglePin('t1');

    expect(conversationThreads$.get().get('t1')?.pinned).toBe(true);
    const saveCalls = vi.mocked(hassCall.hassCall).mock.calls.filter(
      ([cmd]) => cmd === 'growspace_manager/save_conversation_threads'
    );
    expect(saveCalls).toHaveLength(1);
  });

  it('unpins a pinned thread', async () => {
    conversationThreads$.set(new Map([['t1', makeThread('t1', true)]]));

    await togglePin('t1');

    expect(conversationThreads$.get().get('t1')?.pinned).toBe(false);
  });

  it('does nothing when thread does not exist', async () => {
    conversationThreads$.set(new Map());

    await togglePin('nonexistent-thread');

    expect(conversationThreads$.get().size).toBe(0);
    expect(hassCall.hassCall).not.toHaveBeenCalled();
  });

  it('shows a toast and does not pin when MAX_PINNED_THREADS is reached', async () => {
    const threads = new Map<string, ConversationThread>();
    for (let i = 0; i < MAX_PINNED_THREADS; i++) {
      threads.set(`pinned-${i}`, makeThread(`pinned-${i}`, true));
    }
    threads.set('unpinned', makeThread('unpinned', false));
    conversationThreads$.set(threads);
    notification$.set(null);

    await togglePin('unpinned');

    expect(conversationThreads$.get().get('unpinned')?.pinned).toBe(false);
    expect(notification$.get()).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// fetchConversationThreads
// ---------------------------------------------------------------------------

describe('fetchConversationThreads', () => {
  const thread = {
    thread_id: 'thread-1',
    growspace_id: 'gs1',
    messages: [],
    pinned: true,
    updated_at: 1700000001,
  };

  it('calls the correct WS command and hydrates conversationThreads$ for the growspace', async () => {
    vi.mocked(hassCall.hassCall).mockResolvedValueOnce([thread]);

    await fetchConversationThreads('gs1');

    expect(hassCall.hassCall).toHaveBeenCalledWith(
      'growspace_manager/get_conversation_threads',
      { growspace_id: 'gs1' },
      expect.anything()
    );
    expect(conversationThreads$.get().get('thread-1')).toMatchObject({ pinned: true });
  });

  it('does not overwrite threads of other growspaces', async () => {
    const gs2Thread = { thread_id: 'thread-2', growspace_id: 'gs2', messages: [], pinned: false, updated_at: 1700000000 };
    conversationThreads$.set(new Map([['thread-2', gs2Thread]]));
    vi.mocked(hassCall.hassCall).mockResolvedValueOnce([thread]);

    await fetchConversationThreads('gs1');

    expect(conversationThreads$.get().get('thread-2')).toEqual(gs2Thread);
    expect(conversationThreads$.get().get('thread-1')).toMatchObject({ growspace_id: 'gs1' });
  });
});

// ---------------------------------------------------------------------------
// Thread eviction (via startConversation)
// ---------------------------------------------------------------------------

describe('thread eviction', () => {
  it('drops the oldest unpinned thread when MAX_RECENT_THREADS is exceeded for a growspace', async () => {
    const threads = new Map<string, ConversationThread>();
    for (let i = 0; i < MAX_RECENT_THREADS; i++) {
      threads.set(`t${i}`, {
        thread_id: `t${i}`,
        growspace_id: 'gs1',
        messages: [],
        pinned: false,
        updated_at: 1700000000 + i,
      });
    }
    conversationThreads$.set(threads);

    vi.mocked(hassCall.hassCall).mockResolvedValueOnce({
      thread_id: 'new-thread',
      growspace_id: 'gs1',
      messages: [],
    });

    await startConversation('gs1', 'hello');

    const gs1Threads = [...conversationThreads$.get().values()].filter(
      (t) => t.growspace_id === 'gs1'
    );
    expect(gs1Threads).toHaveLength(MAX_RECENT_THREADS);
    expect(conversationThreads$.get().has('t0')).toBe(false);
    expect(conversationThreads$.get().has('new-thread')).toBe(true);
  });

  it('never evicts pinned threads even when unpinned threads exceed the limit', async () => {
    const threads = new Map<string, ConversationThread>();
    threads.set('pinned-1', {
      thread_id: 'pinned-1',
      growspace_id: 'gs1',
      messages: [],
      pinned: true,
      updated_at: 1700000001,
    });
    for (let i = 0; i < MAX_RECENT_THREADS; i++) {
      threads.set(`t${i}`, {
        thread_id: `t${i}`,
        growspace_id: 'gs1',
        messages: [],
        pinned: false,
        updated_at: 1700000002 + i,
      });
    }
    conversationThreads$.set(threads);

    vi.mocked(hassCall.hassCall).mockResolvedValueOnce({
      thread_id: 'new-thread',
      growspace_id: 'gs1',
      messages: [],
    });

    await startConversation('gs1', 'hello');

    expect(conversationThreads$.get().has('pinned-1')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// ConversationThreadSchema — pinned + updated_at
// ---------------------------------------------------------------------------

describe('ConversationThreadSchema', () => {
  it('accepts a thread with pinned: false and updated_at', () => {
    const result = ConversationThreadSchema.safeParse({
      thread_id: 'thread-1',
      growspace_id: 'gs1',
      messages: [],
      pinned: false,
      updated_at: 1700000000,
    });
    expect(result.success).toBe(true);
  });

  it('defaults pinned to false when not provided', () => {
    const result = ConversationThreadSchema.safeParse({
      thread_id: 'thread-1',
      growspace_id: 'gs1',
      messages: [],
      updated_at: 1700000000,
    });
    expect(result.success).toBe(true);
    expect(result.data?.pinned).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// saveAiAgent
// ---------------------------------------------------------------------------

describe('saveAiAgent', () => {
  const briefingPayload = {
    generated_at: 1700000000,
    summary_text: 'Plants are healthy',
    kpis: [],
    recommendations: [],
    ai_available: true,
  };

  it('calls growspace_manager/save_ai_agent with the agent_id', async () => {
    const { saveAiAgent } = await import('./index');
    vi.mocked(hassCall.hassCall)
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce(briefingPayload);

    await saveAiAgent('conversation.claude', 'gs1');

    const saveCalls = vi.mocked(hassCall.hassCall).mock.calls.filter(
      ([cmd]) => cmd === 'growspace_manager/save_ai_agent'
    );
    expect(saveCalls).toHaveLength(1);
    expect(saveCalls[0][1]).toEqual({ agent_id: 'conversation.claude' });
  });

  it('sets aiEnabled$ to true after saving', async () => {
    const { saveAiAgent } = await import('./index');
    aiEnabled$.set(null);
    vi.mocked(hassCall.hassCall)
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce(briefingPayload);

    await saveAiAgent('conversation.claude', 'gs1');

    expect(aiEnabled$.get()).toBe(true);
  });

  it('calls fetchBriefing with forceRefresh after saving', async () => {
    const { saveAiAgent } = await import('./index');
    vi.mocked(hassCall.hassCall)
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce(briefingPayload);

    await saveAiAgent('conversation.claude', 'gs1');

    const briefingCalls = vi.mocked(hassCall.hassCall).mock.calls.filter(
      ([cmd]) => cmd === 'growspace_manager/get_briefing'
    );
    expect(briefingCalls).toHaveLength(1);
    expect(briefingCalls[0][1]).toMatchObject({ growspace_id: 'gs1', force_refresh: true });
  });
});

describe('fetchAiSettings', () => {
  it('calls growspace_manager/get_ai_settings and returns the settings object', async () => {
    const { fetchAiSettings } = await import('./index');
    const settings = {
      ai_enabled: true,
      assistant_id: 'conversation.claude',
      notification_personality: 'Scientific',
      ai_auto_alerts: true,
      max_response_length: 300,
      vision_checkup_enabled: false,
      ai_task_entity_id: 'todo.grow_tasks',
      briefing_interval_minutes: 60,
      briefing_trigger_entities: ['sensor.vpd'],
    };
    vi.mocked(hassCall.hassCall).mockResolvedValueOnce(settings);

    const result = await fetchAiSettings();

    expect(hassCall.hassCall).toHaveBeenCalledWith(
      'growspace_manager/get_ai_settings',
      {},
      expect.anything()
    );
    expect(result).toEqual(settings);
  });
});
