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
import { SuggestedActionSchema, TriageAlertSchema, AIBriefingSchema, ResolveAckSchema } from './schema';
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
  applyAction,
  fetchAlerts,
  resolveAlert,
  fetchBriefing,
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
    conversationThreads$.set(new Map([
      ['other-thread', existingThread],
      ['thread-abc', { thread_id: 'thread-abc', growspace_id: 'gs1', messages: [
        { role: 'user' as const, text: 'First message', timestamp: 1700000000 },
      ] }],
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
