/**
 * Grow Runs — the Active Run in the header, and starting one (GSM#668).
 *
 * The read side is Home Assistant entity state: the backend publishes one
 * `sensor.<growspace>_active_run` per growspace, found here through the entity
 * and device registries by its language-independent `translation_key` and the
 * growspace device identifier, never by guessing an entity ID from a name.
 *
 * The write side lives in `./start`, `./completion` and `./finalization`,
 * which only their lazy dialogs load. The header asks for the Run list alone,
 * to offer finalizing a Completed Run (GSM#673).
 */

import type { HomeAssistant } from 'custom-card-helpers';
import { hassCall } from '../../services/hass-call';
import { localize, localizePlural, localizeWithParams } from '../../localize/localize';
import {
  ActiveRunSensorSchema,
  GetGrowRunResultSchema,
  ListGrowRunsResultSchema,
  type GetGrowRunResult,
  type ListGrowRunsResult,
} from './schema';

export type { GetGrowRunResult } from './schema';

const DOMAIN = 'growspace_manager';
const TRANSLATION_KEY = 'active_run';

interface RegistryEntity {
  device_id?: string | null;
  platform?: string;
  translation_key?: string | null;
}

interface RegistryDevice {
  identifiers?: [string, string][];
}

const resolved = new WeakMap<object, WeakMap<object, Map<string, string | null>>>();

/**
 * Find a growspace's Active Run Sensor. Memoised on the two registry
 * snapshots, which Home Assistant replaces rather than mutates, because the
 * header re-renders on every state change.
 */
export function resolveActiveRunSensor(
  growspaceId: string,
  hass: HomeAssistant | undefined
): string | null {
  const registries = hass as unknown as
    | { entities?: Record<string, RegistryEntity>; devices?: Record<string, RegistryDevice> }
    | undefined;
  const entities = registries?.entities;
  const devices = registries?.devices;
  if (!entities || !devices || !growspaceId) return null;

  let byDevices = resolved.get(entities);
  if (!byDevices) resolved.set(entities, (byDevices = new WeakMap()));
  let byGrowspace = byDevices.get(devices);
  if (!byGrowspace) byDevices.set(devices, (byGrowspace = new Map()));
  if (byGrowspace.has(growspaceId)) return byGrowspace.get(growspaceId) ?? null;

  const deviceIds = new Set(
    Object.entries(devices)
      .filter(([, device]) =>
        device.identifiers?.some(([domain, id]) => domain === DOMAIN && id === growspaceId)
      )
      .map(([id]) => id)
  );
  const found =
    Object.entries(entities).find(
      ([entityId, entry]) =>
        entry.platform === DOMAIN &&
        entry.translation_key === TRANSLATION_KEY &&
        !!entry.device_id &&
        deviceIds.has(entry.device_id) &&
        entityId.startsWith('sensor.')
    )?.[0] ?? null;
  byGrowspace.set(growspaceId, found);
  return found;
}

/** A sensor the card cannot read is shown as such, never as "no run". */
type RunViewState = 'none' | 'active' | 'unavailable';

export interface RunView {
  growspaceId: string;
  entityId: string;
  runId: string | null;
  state: RunViewState;
  sequenceNumber: number | null;
  label: string | null;
  startedAt: string | null;
  durationDays: number | null;
  participantCount: number | null;
  /** The revision a Start must name; `null` while the sensor is unreadable. */
  runRevision: number | null;
  /** What the chip says: `Run #4 · 61 days · 17 plants`, or `Start run`. */
  summary: string;
}

/**
 * Derive a growspace's Active Run view, or `null` when the backend publishes
 * no Active Run Sensor for it (a release before GSM#668).
 */
export function deriveRunView(
  growspaceId: string,
  hass: HomeAssistant | undefined,
  language = 'en'
): RunView | null {
  const entityId = resolveActiveRunSensor(growspaceId, hass);
  if (!hass || !entityId) return null;
  const parsed = ActiveRunSensorSchema.safeParse(hass.states[entityId]);
  const base = { growspaceId, entityId };
  if (!parsed.success) {
    return {
      ...base,
      runId: null,
      state: 'unavailable',
      sequenceNumber: null,
      label: null,
      startedAt: null,
      durationDays: null,
      participantCount: null,
      runRevision: null,
      summary: localize('grow_run.unavailable', '', '', language),
    };
  }
  const { state, attributes } = parsed.data;
  if (state === 'none') {
    return {
      ...base,
      runId: null,
      state: 'none',
      sequenceNumber: null,
      label: null,
      startedAt: null,
      durationDays: null,
      participantCount: null,
      runRevision: attributes.run_revision,
      summary: localize('grow_run.start', '', '', language),
    };
  }
  const sequenceNumber = Number(state);
  const view: RunView = {
    ...base,
    runId: attributes.run_id,
    state: 'active',
    sequenceNumber,
    label: attributes.label,
    startedAt: attributes.started_at,
    durationDays: attributes.duration_days,
    participantCount: attributes.participant_count,
    runRevision: attributes.run_revision,
    summary: '',
  };
  view.summary = runSummaryText(view, language);
  return view;
}

function runSummaryText(view: RunView, language: string): string {
  const name = view.label
    ? localizeWithParams(
        'grow_run.chip_active_label',
        { number: view.sequenceNumber ?? '', label: view.label },
        language
      )
    : localizeWithParams('grow_run.chip_active', { number: view.sequenceNumber ?? '' }, language);
  const parts = [name];
  if (view.durationDays !== null) {
    parts.push(localizePlural('grow_run.days', view.durationDays, {}, language));
  }
  if (view.participantCount !== null) {
    parts.push(localizePlural('grow_run.plants', view.participantCount, {}, language));
  }
  return parts.join(' · ');
}

/** Read the selected Run's durable movement and participation projection. */
export function getGrowRun(growspaceId: string, runId: string): Promise<GetGrowRunResult> {
  return hassCall(
    'growspace_manager/get_grow_run',
    { growspace_id: growspaceId, run_id: runId },
    GetGrowRunResultSchema
  );
}

/** Every Run a growspace's ledger holds, newest first (GSM#673). */
export function listGrowRuns(growspaceId: string): Promise<ListGrowRunsResult> {
  return hassCall(
    'growspace_manager/list_grow_runs',
    { growspace_id: growspaceId },
    ListGrowRunsResultSchema
  );
}
