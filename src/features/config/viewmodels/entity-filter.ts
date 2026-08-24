/**
 * How a config field narrows the entity list beyond its domains.
 *
 * Most fields want exactly one `device_class` and say so with a bare string.
 * The object form exists for fields whose real hardware does not reliably
 * carry one: ESPHome and template soil probes overwhelmingly ship with no
 * `device_class` at all, and many report `humidity`, so demanding `moisture`
 * hides the very sensor the grower already configured (issue #37).
 *
 * Keeping the rule here rather than inline in the dialog's hass adapter means
 * it is testable against plain attribute bags, with no `hass` and no DOM.
 */

/** The attributes this predicate reads — the shape `hass.states[id].attributes` has. */
export interface EntityAttributes {
  device_class?: unknown;
  unit_of_measurement?: unknown;
}

/** A field's device-class requirement. `null` accepts every entity in the domains. */
export type EntityClassFilter =
  | string
  | null
  | {
      /** Accept an entity carrying any one of these device classes. */
      anyOf: string[];
      /**
       * Also accept an entity carrying *no* device class, when its unit is one
       * of these. Only reachable for an entity with no class at all — a class
       * that is present and not in `anyOf` is an explicit statement that the
       * entity measures something else, and is never overridden by its unit.
       */
      orUnclassedUnits?: string[];
    };

function attribute(attributes: EntityAttributes, key: keyof EntityAttributes): string | null {
  const raw = attributes[key];
  return typeof raw === 'string' && raw.trim() !== '' ? raw.trim() : null;
}

/** Whether an entity with these attributes is offerable for a field with this filter. */
export function matchesEntityClass(
  attributes: EntityAttributes,
  filter: EntityClassFilter
): boolean {
  if (!filter) return true;

  const deviceClass = attribute(attributes, 'device_class');
  if (typeof filter === 'string') return deviceClass === filter;
  if (deviceClass !== null) return filter.anyOf.includes(deviceClass);

  const units = filter.orUnclassedUnits;
  if (!units) return false;
  const unit = attribute(attributes, 'unit_of_measurement');
  return unit !== null && units.includes(unit);
}

/**
 * The soil-moisture field's filter. `moisture` is the correct modern class and
 * `humidity` is what a great many probes actually report; a probe with no class
 * is accepted on the same `%` evidence the Acceptable Moisture Band already
 * uses to decide it can interpret a reading at all.
 */
export const SOIL_MOISTURE_FILTER: EntityClassFilter = {
  anyOf: ['moisture', 'humidity'],
  orUnclassedUnits: ['%'],
};
