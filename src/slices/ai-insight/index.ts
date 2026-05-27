/**
 * AIInsight slice — atoms and mutators for AI-powered cultivation insights.
 *
 * Public API (atoms):
 *   aiInsight$            — last AI response text (null if none loaded yet)
 *   isAiLoading$          — whether an AI request is in-flight
 *   aiError$              — error message from the last failed request (null = none)
 *   conversationThreads$  — conversation threads keyed by thread ID
 *   activeThreadId$       — ID of the currently active thread (null = none)
 *   aiAlerts$             — triage alerts fetched from the backend
 *   aiBriefing$           — latest AI briefing (null = none fetched yet)
 *   aiMode$               — current AI panel mode
 *
 * Public API (mutators):
 *   askGrowAdvice(growspaceId, userQuery) — ask AI for advice on a specific growspace
 *   analyzeAllGrowspaces()               — request AI analysis of all growspaces
 *   dismissInsight()                     — clear the current insight and any error
 *   clearAiError()                       — clear only the error without touching the insight
 *   startConversation(growspaceId, text, imageEntityId?) — start a new AI conversation thread
 *   sendMessage(threadId, text, imageEntityId?)          — append a message to an existing thread
 *   applyAction(suggestedAction)                         — execute a suggested service action
 *   fetchAlerts(growspaceId?)                            — fetch triage alerts from the backend
 *   resolveAlert(alertId, note?)                         — mark an alert as resolved
 *   fetchBriefing(forceRefresh?)                         — fetch the latest AI briefing
 *
 * Zod schemas are in ./schema.ts and private to this module.
 */

import { atom } from 'nanostores';
import { z } from 'zod';
import { callService, callServiceReturning, hassCall } from '../../services/hass-call';
import {
  GrowAdviceResponseSchema,
  ConversationThreadSchema,
  TriageAlertSchema,
  ResolveAckSchema,
  AIBriefingSchema,
  type ConversationThread,
  type TriageAlert,
  type AIBriefing,
  type SuggestedAction,
} from './schema';

// ---------------------------------------------------------------------------
// Atoms (public)
// ---------------------------------------------------------------------------

export const aiInsight$ = atom<string | null>(null);
export const isAiLoading$ = atom<boolean>(false);
export const aiError$ = atom<string | null>(null);
export const conversationThreads$ = atom<Map<string, ConversationThread>>(new Map());
export const activeThreadId$ = atom<string | null>(null);
export const aiAlerts$ = atom<TriageAlert[]>([]);
export const aiBriefing$ = atom<AIBriefing | null>(null);
export const aiMode$ = atom<'chat' | 'briefing' | 'inbox'>('briefing');

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/**
 * Extract a plain text string from a GrowAdviceResponse, which the backend
 * may return as a string or as a nested `{ response: string }` object.
 */
function _extractText(raw: unknown): string {
  if (typeof raw === 'string') return raw;
  if (typeof raw === 'object' && raw !== null && 'response' in raw) {
    const inner = (raw as { response: unknown }).response;
    if (typeof inner === 'string') return inner;
    if (typeof inner === 'object' && inner !== null && 'response' in inner) {
      const deepInner = (inner as { response: unknown }).response;
      if (typeof deepInner === 'string') return deepInner;
    }
    return JSON.stringify(inner);
  }
  return JSON.stringify(raw);
}

// ---------------------------------------------------------------------------
// Mutators (public)
// ---------------------------------------------------------------------------

/**
 * Ask the AI for cultivation advice about a specific growspace.
 *
 * Sets isAiLoading$ to true for the duration of the call.
 * On success: stores the response text in aiInsight$.
 * On failure: stores the error message in aiError$ and re-throws.
 */
export async function askGrowAdvice(growspaceId: string, userQuery: string): Promise<void> {
  isAiLoading$.set(true);
  aiError$.set(null);
  try {
    const raw = await callServiceReturning(
      'growspace_manager',
      'ask_grow_advice',
      { growspace_id: growspaceId, user_query: userQuery },
      GrowAdviceResponseSchema
    );
    aiInsight$.set(_extractText(raw));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    aiError$.set(message);
    throw err;
  } finally {
    isAiLoading$.set(false);
  }
}

/**
 * Request an AI analysis that covers all growspaces at once.
 *
 * Sets isAiLoading$ to true for the duration of the call.
 * On success: stores the response text in aiInsight$.
 * On failure: stores the error message in aiError$ and re-throws.
 */
export async function analyzeAllGrowspaces(): Promise<void> {
  isAiLoading$.set(true);
  aiError$.set(null);
  try {
    const raw = await callServiceReturning(
      'growspace_manager',
      'analyze_all_growspaces',
      {},
      GrowAdviceResponseSchema
    );
    aiInsight$.set(_extractText(raw));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    aiError$.set(message);
    throw err;
  } finally {
    isAiLoading$.set(false);
  }
}

/**
 * Clear the current insight and any error state.
 * Use this when the user dismisses the AI response panel.
 */
export function dismissInsight(): void {
  aiInsight$.set(null);
  aiError$.set(null);
}

/**
 * Clear only the error without touching the current insight.
 */
export function clearAiError(): void {
  aiError$.set(null);
}

// ---------------------------------------------------------------------------
// Conversation mutators
// ---------------------------------------------------------------------------

/**
 * Start a new AI conversation thread for a growspace.
 *
 * Creates the thread entry in conversationThreads$ and sets activeThreadId$.
 */
export async function startConversation(
  growspaceId: string,
  text: string,
  imageEntityId?: string
): Promise<ConversationThread> {
  const userMessage = { role: 'user' as const, text, timestamp: Date.now() };
  const raw = await hassCall(
    'growspace_manager/start_conversation',
    {
      growspace_id: growspaceId,
      message: text,
      ...(imageEntityId ? { image_entities: [imageEntityId] } : {}),
    },
    ConversationThreadSchema
  );
  const thread: ConversationThread = { ...raw, messages: [userMessage, ...raw.messages] };
  const threads = new Map(conversationThreads$.get());
  threads.set(thread.thread_id, thread);
  conversationThreads$.set(threads);
  activeThreadId$.set(thread.thread_id);
  return thread;
}

/**
 * Send a message in an existing conversation thread.
 *
 * Appends the AI response message to the thread. Other threads are unchanged.
 */
export async function sendMessage(
  threadId: string,
  text: string,
  imageEntityId?: string
): Promise<void> {
  const existingThread = conversationThreads$.get().get(threadId);
  const growspaceId = existingThread?.growspace_id ?? '';
  const userMessage = { role: 'user' as const, text, timestamp: Date.now() };
  const raw = await hassCall(
    'growspace_manager/send_message',
    {
      conversation_id: threadId,
      growspace_id: growspaceId,
      message: text,
      ...(imageEntityId ? { image_entities: [imageEntityId] } : {}),
    },
    ConversationThreadSchema
  );
  const threads = new Map(conversationThreads$.get());
  const existingMessages = threads.get(threadId)?.messages ?? [];
  threads.set(raw.thread_id, {
    ...raw,
    messages: [...existingMessages, userMessage, ...raw.messages],
  });
  conversationThreads$.set(threads);
}

/**
 * Execute a suggested service action.
 *
 * Calls the HA service specified in the action payload.
 */
export async function applyAction(action: SuggestedAction): Promise<void> {
  await callService(action.service, action.target_entity_id, action.service_data);
}

// ---------------------------------------------------------------------------
// Alert mutators
// ---------------------------------------------------------------------------

/**
 * Fetch triage alerts from the backend, optionally scoped to a growspace.
 */
export async function fetchAlerts(growspaceId?: string): Promise<void> {
  const AlertsResponseSchema = TriageAlertSchema.array();
  const alerts = await hassCall(
    'growspace_manager/get_ai_alerts',
    { ...(growspaceId ? { growspace_id: growspaceId } : {}) },
    AlertsResponseSchema
  );
  aiAlerts$.set(alerts);
}

/**
 * Mark an alert as resolved. Patches the matching alert in aiAlerts$ and
 * calls the backend to persist the resolution.
 */
export async function resolveAlert(alertId: string, note?: string): Promise<void> {
  await hassCall(
    'growspace_manager/resolve_ai_alert',
    { alert_id: alertId, ...(note ? { resolution_note: note } : {}) },
    ResolveAckSchema
  );
  aiAlerts$.set(
    aiAlerts$.get().map((a) => (a.id === alertId ? { ...a, resolved: true, resolution_note: note ?? null } : a))
  );
}

// ---------------------------------------------------------------------------
// Briefing mutators
// ---------------------------------------------------------------------------

/**
 * Fetch the latest AI briefing, optionally forcing a backend refresh.
 */
export async function fetchBriefing(forceRefresh?: boolean): Promise<void> {
  const briefing = await hassCall(
    'growspace_manager/get_briefing',
    { ...(forceRefresh ? { force_refresh: true } : {}) },
    AIBriefingSchema
  );
  aiBriefing$.set(briefing);
}

/**
 * Persist a conversation agent selection and enable AI in the integration.
 *
 * Saves the chosen entity ID to the backend config entry, then refreshes the
 * briefing atom so panels drop their unconfigured state without a page reload.
 */
export async function saveAiAgent(agentEntityId: string): Promise<void> {
  await hassCall('growspace_manager/save_ai_agent', { agent_id: agentEntityId }, z.unknown());
  await fetchBriefing(true);
}
