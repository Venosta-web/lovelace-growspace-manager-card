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
import { WSError } from '../../services/base-api';
import { callService, callServiceReturning, hassCall } from '../../services/hass-call';
import { showToast } from '../ui';
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
export const aiEnabled$ = atom<boolean | null>(null);
export const conversationThreads$ = atom<Map<string, ConversationThread>>(new Map());
export const activeThreadId$ = atom<Map<string, string | null>>(new Map());
export const aiAlerts$ = atom<Map<string, TriageAlert[]>>(new Map());
export const aiBriefing$ = atom<Map<string, AIBriefing>>(new Map());
export const aiMode$ = atom<'chat' | 'briefing' | 'inbox' | 'settings'>('briefing');

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
    if (err instanceof WSError && err.code === 'rate_limited') {
      showToast('AI rate limit reached — please wait a moment before trying again', 'error');
      return;
    }
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
    if (err instanceof WSError && err.code === 'rate_limited') {
      showToast('AI rate limit reached — please wait a moment before trying again', 'error');
      return;
    }
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
): Promise<ConversationThread | undefined> {
  const userMessage = { role: 'user' as const, text, timestamp: Date.now() };
  try {
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
    const activeMap = new Map(activeThreadId$.get());
    activeMap.set(growspaceId, thread.thread_id);
    activeThreadId$.set(activeMap);
    return thread;
  } catch (err) {
    if (err instanceof WSError && err.code === 'rate_limited') {
      showToast('AI rate limit reached — please wait a moment before trying again', 'error');
      return undefined;
    }
    throw err;
  }
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
  try {
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
  } catch (err) {
    if (err instanceof WSError && err.code === 'rate_limited') {
      showToast('AI rate limit reached — please wait a moment before trying again', 'error');
      return;
    }
    throw err;
  }
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
 * Fetch triage alerts for a specific growspace and store them in aiAlerts$
 * keyed by growspaceId. Other growspaces' alerts are unaffected.
 */
export async function fetchAlerts(growspaceId: string): Promise<void> {
  const AlertsResponseSchema = TriageAlertSchema.array();
  try {
    const alerts = await hassCall(
      'growspace_manager/get_ai_alerts',
      { growspace_id: growspaceId },
      AlertsResponseSchema
    );
    const updated = new Map(aiAlerts$.get());
    updated.set(growspaceId, alerts);
    aiAlerts$.set(updated);
  } catch {
    // Silently ignore — connection errors or schema mismatches leave existing data intact
  }
}

/**
 * Mark an alert as resolved. Searches across all growspaces in aiAlerts$,
 * patches the matching alert, and calls the backend to persist the resolution.
 */
export async function resolveAlert(alertId: string, note?: string): Promise<void> {
  await hassCall(
    'growspace_manager/resolve_ai_alert',
    { alert_id: alertId, ...(note ? { resolution_note: note } : {}) },
    ResolveAckSchema
  );
  const currentMap = aiAlerts$.get();
  const updated = new Map(currentMap);
  for (const [gsId, alerts] of updated) {
    const idx = alerts.findIndex((a) => a.id === alertId);
    if (idx !== -1) {
      const patched = [...alerts];
      patched[idx] = { ...alerts[idx], resolved: true, resolution_note: note ?? null };
      updated.set(gsId, patched);
      break;
    }
  }
  aiAlerts$.set(updated);
}

// ---------------------------------------------------------------------------
// Briefing mutators
// ---------------------------------------------------------------------------

/**
 * Fetch the AI briefing for a specific growspace and store it in aiBriefing$
 * keyed by growspaceId. Other growspaces' briefings are unaffected.
 * Pass forceRefresh=true to bypass the backend cache.
 */
export async function fetchBriefing(growspaceId: string, forceRefresh?: boolean): Promise<void> {
  try {
    const briefing = await hassCall(
      'growspace_manager/get_briefing',
      { growspace_id: growspaceId, ...(forceRefresh ? { force_refresh: true } : {}) },
      AIBriefingSchema
    );
    const updated = new Map(aiBriefing$.get());
    updated.set(growspaceId, briefing);
    aiBriefing$.set(updated);
  } catch {
    // Silently ignore — connection errors or schema mismatches leave existing data intact
  }
}

/**
 * Fetch the component-level AI enabled flag and store it in aiEnabled$.
 * Silently ignores errors so the atom stays at its previous value.
 */
export async function fetchAiStatus(): Promise<void> {
  const AiStatusSchema = z.object({ ai_enabled: z.boolean() });
  try {
    const result = await hassCall('growspace_manager/get_ai_status', {}, AiStatusSchema);
    aiEnabled$.set(result.ai_enabled);
  } catch {
    // Silently ignore — leave aiEnabled$ unchanged
  }
}

/**
 * Persist a conversation agent selection and enable AI in the integration.
 *
 * Saves the chosen entity ID to the backend config entry, then refreshes the
 * briefing atom so panels drop their unconfigured state without a page reload.
 */
export async function saveAiAgent(agentEntityId: string, growspaceId: string): Promise<void> {
  await hassCall('growspace_manager/save_ai_agent', { agent_id: agentEntityId }, z.unknown());
  aiEnabled$.set(true);
  await fetchBriefing(growspaceId, true);
}

export type AiSettingsDraft = {
  ai_enabled?: boolean;
  assistant_id?: string | null;
  notification_personality?: string;
  ai_auto_alerts?: boolean;
  max_response_length?: number;
  vision_checkup_enabled?: boolean;
  ai_task_entity_id?: string | null;
  briefing_interval_minutes?: number;
  briefing_trigger_entities?: string[];
};

export async function saveAiSettings(draft: AiSettingsDraft): Promise<void> {
  await hassCall('growspace_manager/save_ai_settings', draft as Record<string, unknown>, z.unknown());
}

/**
 * Fetch the current AI settings from the integration config entry.
 *
 * Returns the full ai_settings dict so the Growmaster Settings Panel can
 * pre-populate its draft when the settings tab is opened.
 */
export async function fetchAiSettings(): Promise<AiSettingsDraft> {
  const result = await hassCall('growspace_manager/get_ai_settings', {}, z.record(z.unknown()));
  return result as AiSettingsDraft;
}
