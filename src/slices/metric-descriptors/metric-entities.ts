/**
 * Metric → entity resolution (ADR-0030).
 *
 * The Metric Descriptor is the owner of "which entities back this metric".
 * `history-store` delegates here rather than resolving its own list, so the
 * entities a descriptor describes and the entities a history is fetched for
 * cannot drift — a drift that would fail silently, as a blank or duplicated
 * series rather than an error.
 *
 * The mapping itself is a behaviour-preserving move of `history-store`'s
 * former `getEntityIdsForMetric`, down to its plural, snake_case and
 * per-metric special cases. `METRIC_ENTITY_KEYS` retires with the `':'`-joined
 * history keys in #473.
 */

import { METRIC_ENTITY_KEYS } from '../../features/environment/constants';
import type { GrowspaceDevice } from '../../services/types';

/** A states snapshot, passed in so resolution stays free of an injected `hass`. */
export type MetricEntityStates = Record<string, unknown>;

/**
 * Every entity backing `metricKey` on `device`, in the order a caller should
 * present them.
 *
 * `hassStates` is consulted only for the calculated-VPD fallback, which exists
 * only when the entity is actually present.
 */
export function resolveMetricEntityIds(
  device: GrowspaceDevice,
  metricKey: string,
  hassStates: MetricEntityStates = {}
): string[] {
  const ids: string[] = [];

  if (metricKey === 'optimal') {
    let slug = device.name.toLowerCase().replace(/\s+/g, '_');
    const overviewId =
      device.overviewEntityId ||
      ((device as unknown as Record<string, unknown>).overview_entity_id as string);

    if (overviewId) {
      slug = overviewId.replace('sensor.', '').replace(/_overview$/, '');
    }
    let optimalId = `binary_sensor.${slug}_optimal_conditions`;
    if (slug === 'cure') optimalId = `binary_sensor.cure_optimal_curing`;
    else if (slug === 'dry') optimalId = `binary_sensor.dry_optimal_drying`;

    ids.push(optimalId);
    return ids;
  }

  const mapping = METRIC_ENTITY_KEYS[metricKey];
  if (!mapping) return ids;

  const envAttrs = (device.environmentAttributes ||
    (device as unknown as Record<string, unknown>).environment_attributes ||
    {}) as Record<string, unknown>;

  // Primary key is already a string[] (e.g. energySensors, powerSensors)
  const directValue = envAttrs[mapping.primary];
  if (
    Array.isArray(directValue) &&
    (directValue.length === 0 || typeof directValue[0] === 'string')
  ) {
    return directValue as string[];
  }

  // 1. Try plural keys first
  const pluralKey = mapping.primary.endsWith('Sensor')
    ? mapping.primary.replace('Sensor', 'Sensors')
    : `${mapping.primary}s`;

  let pluralIds = envAttrs[pluralKey] as string[] | undefined;
  if (!pluralIds && /[A-Z]/.test(pluralKey)) {
    const snakePlural = pluralKey.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
    pluralIds = envAttrs[snakePlural] as string[] | undefined;
  }

  if (pluralIds && Array.isArray(pluralIds) && pluralIds.length > 0) {
    return pluralIds;
  }

  // 2. Fallback to single primary/fallback
  if (mapping.source === 'irrigation') {
    const config = (device.irrigationConfig ||
      (device as unknown as Record<string, unknown>).irrigation_config) as unknown as Record<
      string,
      unknown
    >;
    if (!config) return ids;

    let entityId = config[mapping.primary];
    if (!entityId && /[A-Z]/.test(mapping.primary)) {
      const snakeKey = mapping.primary.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
      entityId = config[snakeKey];
    }
    if (typeof entityId === 'string') ids.push(entityId);
  } else {
    let entityId = envAttrs[mapping.primary] as string | undefined;
    if (!entityId && mapping.fallback) {
      entityId = envAttrs[mapping.fallback] as string | undefined;
    }
    if (!entityId && /[A-Z]/.test(mapping.primary)) {
      const snakeKey = mapping.primary.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
      entityId = envAttrs[snakeKey] as string | undefined;
    }

    // Special fallback for VPD calculated sensor
    if (!entityId && metricKey === 'vpd' && device.name) {
      const slugify = (text: string) =>
        text
          .toString()
          .toLowerCase()
          .replace(/\s+/g, '_')
          .replace(/[^\w-]+/g, '')
          .replace(/--+/g, '_')
          .replace(/^-+/, '')
          .replace(/-+$/, '');
      const calcName = `${device.name} Calculated VPD`;
      const calculatedId = `sensor.${slugify(calcName)}`;
      if (hassStates[calculatedId]) {
        entityId = calculatedId;
      }
    }
    if (entityId) ids.push(entityId);
  }

  // Special case for irrigation_tank_level - extract sensor entities from tanks array
  if (metricKey === 'irrigation_tank_level') {
    const tanks =
      (envAttrs['irrigationTanks'] as unknown as Array<{ sensorEntity?: string }>) || [];
    return tanks.map((t) => t.sensorEntity).filter(Boolean) as string[];
  }

  return ids;
}
