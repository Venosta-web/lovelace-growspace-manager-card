/**
 * AIInsight slice — zod schemas for backend response validation.
 *
 * GrowAdviceResponseSchema validates the payload returned by the
 * ask_grow_advice and analyze_all_growspaces HA services.
 *
 * New schemas cover the conversation, triage-alert, and briefing
 * WebSocket commands added in issue #159.
 */

import { z } from 'zod';

// The backend returns either a plain string or a nested { response: string }
// object (sometimes double-nested). We accept both shapes and let the slice
// extract the text.
const responseBody = z.union([
  z.string(),
  z.object({ response: z.union([z.string(), z.record(z.unknown())]) }),
]);

export const GrowAdviceResponseSchema = z.union([
  z.string(),
  z.object({ response: responseBody }),
  z.record(z.unknown()),
]);

export type GrowAdviceResponsePayload = z.infer<typeof GrowAdviceResponseSchema>;

// ---------------------------------------------------------------------------
// SuggestedAction
// ---------------------------------------------------------------------------

export const SuggestedActionSchema = z.object({
  service: z.string(),
  target_entity_id: z.string(),
  service_data: z.record(z.unknown()),
  description: z.string(),
  confidence: z.number().optional(),
});

export type SuggestedAction = z.infer<typeof SuggestedActionSchema>;

// ---------------------------------------------------------------------------
// TriageAlert
// ---------------------------------------------------------------------------

export const TriageAlertSchema = z.object({
  id: z.string(),
  growspace_id: z.string(),
  type: z.string(),
  bayesian_reasons: z.array(z.string()),
  ai_reasoning: z.string().nullable(),
  timestamp: z.number(),
  resolved: z.boolean(),
  resolution_note: z.string().nullable(),
});

export type TriageAlert = z.infer<typeof TriageAlertSchema>;

// ---------------------------------------------------------------------------
// ConversationMessage
// ---------------------------------------------------------------------------

export const ConversationMessageSchema = z.object({
  role: z.enum(['user', 'ai']),
  text: z.string(),
  timestamp: z.number().nonnegative(),
  suggestedAction: z
    .object({
      service: z.string(),
      target_entity_id: z.string(),
      service_data: z.record(z.unknown()),
      description: z.string(),
      confidence: z.number().optional(),
    })
    .optional(),
  confidence: z.number().optional(),
  imageEntityId: z.string().optional(),
});

export type ConversationMessage = z.infer<typeof ConversationMessageSchema>;

// ---------------------------------------------------------------------------
// ConversationThread
// ---------------------------------------------------------------------------

export const ConversationThreadSchema = z.object({
  thread_id: z.string(),
  growspace_id: z.string(),
  messages: z.array(ConversationMessageSchema),
});

export type ConversationThread = z.infer<typeof ConversationThreadSchema>;

// ---------------------------------------------------------------------------
// AIBriefing
// ---------------------------------------------------------------------------

export const AIBriefingSchema = z.object({
  generated_at: z.number().nonnegative(),
  summary_text: z.string(),
  kpis: z.array(z.unknown()),
  recommendations: z.array(z.string()),
  ai_available: z.boolean(),
});

export type AIBriefing = z.infer<typeof AIBriefingSchema>;
