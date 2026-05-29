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
// KPI (shared by TriageAlert and AIBriefing)
// ---------------------------------------------------------------------------

export const KPISchema = z.object({
  label: z.string(),
  value: z.union([z.number(), z.string()]),
  unit: z.string().optional(),
  delta: z.string().optional(),
});

export type KPI = z.infer<typeof KPISchema>;

// ---------------------------------------------------------------------------
// TriageAlert
// ---------------------------------------------------------------------------

export const TriageAlertSchema = z.object({
  id: z.string(),
  growspace_id: z.string(),
  type: z.string(),
  severity: z.enum(['info', 'warning', 'danger']).default('info'),
  title: z.string().optional(),
  description: z.string().nullable().optional(),
  bayesian_reasons: z.array(z.string()),
  ai_reasoning: z.string().nullable(),
  timestamp: z.number(),
  resolved: z.boolean(),
  resolution_note: z.string().nullable(),
  confidence: z.number().optional(),
  suggested_actions: z.array(SuggestedActionSchema).optional(),
  kpis: z.array(KPISchema).optional(),
  snapshot_entity_id: z.string().nullable().optional(),
});

export type TriageAlert = z.infer<typeof TriageAlertSchema>;

// ---------------------------------------------------------------------------
// ResolveAck
// ---------------------------------------------------------------------------

export const ResolveAckSchema = z.object({
  success: z.boolean(),
  alert_id: z.string(),
});

export type ResolveAck = z.infer<typeof ResolveAckSchema>;

// ---------------------------------------------------------------------------
// ConversationMessage
// ---------------------------------------------------------------------------

export const SensorSnapshotItemSchema = z.object({
  label: z.string(),
  value: z.string(),
  unit: z.string(),
  delta: z.string().optional(),
});

export type SensorSnapshotItem = z.infer<typeof SensorSnapshotItemSchema>;

export const CitationSchema = z.object({
  label: z.string(),
  source: z.enum(['sensor', 'logbook']),
});

export type Citation = z.infer<typeof CitationSchema>;

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
  sensorSnapshot: z.array(SensorSnapshotItemSchema).optional(),
  citations: z.array(CitationSchema).optional(),
});

export type ConversationMessage = z.infer<typeof ConversationMessageSchema>;

// ---------------------------------------------------------------------------
// ConversationThread
// ---------------------------------------------------------------------------

export const MAX_PINNED_THREADS = 10;
export const MAX_RECENT_THREADS = 20;

export const ConversationThreadSchema = z.object({
  thread_id: z.string(),
  growspace_id: z.string(),
  messages: z.array(ConversationMessageSchema),
  pinned: z.boolean().default(false),
  updated_at: z.number().nonnegative().default(0),
});

export type ConversationThread = z.infer<typeof ConversationThreadSchema>;

// ---------------------------------------------------------------------------
// AIBriefing
// ---------------------------------------------------------------------------

export const RecommendationSchema = z.object({
  title: z.string(),
  description: z.string(),
  impact: z.enum(['high', 'medium', 'low']),
  suggested_action: SuggestedActionSchema.optional(),
  action_type: z.enum(['apply', 'plan', 'remind']).optional(),
});

export type Recommendation = z.infer<typeof RecommendationSchema>;

export const AIBriefingSchema = z.object({
  generated_at: z.number().nonnegative(),
  summary_text: z.string(),
  headline: z.string().optional(),
  confidence: z.number().optional(),
  drawn_from: z.string().optional(),
  kpis: z.array(KPISchema),
  recommendations: z.array(RecommendationSchema),
  ai_available: z.boolean(),
});

export type AIBriefing = z.infer<typeof AIBriefingSchema>;
