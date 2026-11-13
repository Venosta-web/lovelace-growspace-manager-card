import { z } from 'zod';
import { hassCall } from '../../services/hass-call';

const anchorSchema = z.enum(['lights_on', 'lights_off']);
const endpointSchema = z.object({ anchor: anchorSchema, offset_minutes: z.number().int() });
const windowSchema = z.object({ start: endpointSchema, end: endpointSchema });
const lightSchema = z.object({
  entity_id: z.string(),
  enabled: z.boolean(),
  windows: z.array(windowSchema),
});
const scheduleSchema = z.object({
  cycle: z
    .object({ start_minute: z.number().int(), duration_minutes: z.number().int() })
    .nullable(),
  lights: z.array(
    z.object({
      light: lightSchema,
      state: z.string(),
      active: z.boolean(),
      window: z.object({ start: z.string(), end: z.string() }).nullable(),
      reason: z.string().nullable(),
      warnings: z.array(z.string()),
    })
  ),
});
const saveResultSchema = z.object({
  release_required: z.object({ entity_id: z.string(), reason: z.string() }).nullable(),
});

export type SupplementalLight = z.infer<typeof lightSchema>;
export type SupplementalLightSchedule = z.infer<typeof scheduleSchema>;

export interface SupplementalLightEdit {
  original?: string;
  light: SupplementalLight;
  saving?: boolean;
  error?: string;
  release?: { entityId: string; reason: string; remove: boolean };
}

export function getSupplementalLights(growspaceId: string): Promise<SupplementalLightSchedule> {
  return hassCall(
    'growspace_manager/get_supplemental_lights',
    { growspace_id: growspaceId },
    scheduleSchema
  );
}

export function saveSupplementalLight(
  growspaceId: string,
  originalEntity: string | undefined,
  light: SupplementalLight | undefined,
  releaseAnyway: boolean
) {
  return hassCall(
    'growspace_manager/save_supplemental_light',
    {
      growspace_id: growspaceId,
      ...(originalEntity && { original_entity: originalEntity }),
      ...(light && { light }),
      release_anyway: releaseAnyway,
    },
    saveResultSchema
  );
}
