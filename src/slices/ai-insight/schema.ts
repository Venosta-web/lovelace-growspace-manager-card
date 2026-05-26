/**
 * AIInsight slice — zod schemas for backend response validation.
 *
 * GrowAdviceResponseSchema validates the payload returned by the
 * ask_grow_advice and analyze_all_growspaces HA services.
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
