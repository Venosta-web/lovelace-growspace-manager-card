/**
 * AIInsight slice — atoms and mutators for AI-powered cultivation insights.
 *
 * Public API (atoms):
 *   aiInsight$      — read: last AI response text (null if none loaded yet)
 *   isAiLoading$    — read: whether an AI request is in-flight
 *   aiError$        — read: error message from the last failed request (null = none)
 *
 * Public API (mutators):
 *   askGrowAdvice(growspaceId, userQuery) — ask AI for advice on a specific growspace
 *   analyzeAllGrowspaces()               — request AI analysis of all growspaces
 *   dismissInsight()                     — clear the current insight and any error
 *   clearAiError()                       — clear only the error without touching the insight
 *
 * Zod schemas are in ./schema.ts and private to this module.
 */

import { atom } from 'nanostores';
import { callServiceReturning } from '../../services/hass-call';
import { GrowAdviceResponseSchema } from './schema';

// ---------------------------------------------------------------------------
// Atoms (public)
// ---------------------------------------------------------------------------

export const aiInsight$ = atom<string | null>(null);
export const isAiLoading$ = atom<boolean>(false);
export const aiError$ = atom<string | null>(null);

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
      GrowAdviceResponseSchema,
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
      GrowAdviceResponseSchema,
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
