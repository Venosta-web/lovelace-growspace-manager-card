import { z } from 'zod';
import { hassCall } from '../../../services/hass-call';
import {
  SupplementalLightSchema,
  SupplementalLightStatusSchema,
  type SupplementalLight,
  type SupplementalLightWindow,
} from '../../../slices/growspace/schema';

export interface SupplementalWindowPreview {
  valid: boolean;
  startTime: string;
  endTime: string;
  error: string | null;
}

export interface SupplementalReleaseBlocker {
  entity_id: string;
  reason: string;
  message: string;
}

const SaveSupplementalLightsResponseSchema = z.discriminatedUnion('status', [
  z.object({
    status: z.literal('saved'),
    supplemental_lights: z.array(SupplementalLightSchema),
    statuses: z.array(SupplementalLightStatusSchema),
  }),
  z.object({
    status: z.literal('needs_confirmation'),
    blockers: z.array(
      z.object({
        entity_id: z.string(),
        reason: z.string(),
        message: z.string(),
      })
    ),
  }),
]);
export type SaveSupplementalLightsResponse = z.infer<
  typeof SaveSupplementalLightsResponseSchema
>;

/** Parse `HH:MM[:SS]` into minutes since midnight (defaults to 06:00). */
export function parseLightsOnMinutes(lightsOnTime: string | null): number {
  if (!lightsOnTime) return 6 * 60;
  const parts = lightsOnTime.split(':').map((p) => Number.parseInt(p, 10));
  const hours = Number.isFinite(parts[0]) ? parts[0] : 6;
  const minutes = Number.isFinite(parts[1]) ? parts[1] : 0;
  return (((hours * 60 + minutes) % 1440) + 1440) % 1440;
}

/** Format minutes since cycle-day midnight into `HH:MM` (appending ` (+1d)` if past midnight). */
export function formatClockMinutes(totalMinutes: number): string {
  const dayOffset = Math.floor(totalMinutes / 1440);
  const mod = ((totalMinutes % 1440) + 1440) % 1440;
  const hh = String(Math.floor(mod / 60)).padStart(2, '0');
  const mm = String(mod % 60).padStart(2, '0');
  if (dayOffset > 0) return `${hh}:${mm} (+${dayOffset}d)`;
  if (dayOffset < 0) return `${hh}:${mm} (${dayOffset}d)`;
  return `${hh}:${mm}`;
}

/** Resolve a Supplemental Light Window's endpoints in local wall-clock time and validate it. */
export function resolveSupplementalWindowPreview(
  win: SupplementalLightWindow,
  lightsOnTime: string | null,
  photoperiodHours: number
): SupplementalWindowPreview {
  const cycleMinutes = Math.round(photoperiodHours * 60);
  const startBase = win.start_anchor === 'lights_on' ? 0 : cycleMinutes;
  const endBase = win.end_anchor === 'lights_on' ? 0 : cycleMinutes;
  const startCycleMin = startBase + win.start_offset_minutes;
  const endCycleMin = endBase + win.end_offset_minutes;

  const lightsOnMin = parseLightsOnMinutes(lightsOnTime);
  const startTime = formatClockMinutes(lightsOnMin + startCycleMin);
  const endTime = formatClockMinutes(lightsOnMin + endCycleMin);

  let error: string | null = null;
  if (cycleMinutes <= 0 || cycleMinutes > 1440) {
    error = 'Main light cycle duration must be between 1 minute and 24 hours.';
  } else if (startCycleMin < 0) {
    error = 'Window starts before planned main lights-on.';
  } else if (startCycleMin >= cycleMinutes) {
    error = 'Window starts at or after planned main lights-off.';
  } else if (endCycleMin > cycleMinutes) {
    error = 'Window ends after planned main lights-off.';
  } else if (endCycleMin <= startCycleMin) {
    error = 'Window end must be after window start.';
  }

  return {
    valid: error === null,
    startTime,
    endTime,
    error,
  };
}

/** Format an ISO timestamp into local `HH:MM` for compact window status display. */
export function formatWindowTimestamp(iso: string | null | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

export async function saveSupplementalLights(
  growspaceId: string,
  supplementalLights: SupplementalLight[],
  releaseAnyway = false
): Promise<SaveSupplementalLightsResponse> {
  return hassCall(
    'growspace_manager/save_supplemental_lights',
    {
      growspace_id: growspaceId,
      supplemental_lights: supplementalLights,
      release_anyway: releaseAnyway,
    },
    SaveSupplementalLightsResponseSchema
  );
}
