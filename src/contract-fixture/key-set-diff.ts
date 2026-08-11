import type { z } from 'zod';

export type ContractVerdict = 'completeness' | 'backward-safety';

export interface ContractKeyDrift {
  kind: 'fixture-key-not-declared' | 'required-input-key-missing';
  objectPath: string;
  key: string;
  path: string;
}

interface DiffOptions {
  opaquePaths?: ReadonlySet<string>;
}

interface SchemaDefinition {
  type: string;
  element?: z.ZodType;
  getter?: () => z.ZodType;
  innerType?: z.ZodType;
  options?: z.ZodType[];
  out?: z.ZodType;
  shape?: Record<string, z.ZodType>;
  valueType?: z.ZodType;
}

interface WalkState {
  drift: ContractKeyDrift[];
  fixturePath: string;
  opaquePaths: ReadonlySet<string>;
  schemaPath: string;
  verdict: ContractVerdict;
}

/**
 * Regions deliberately left opaque at the get_data boundary (ADR 0031).
 *
 * Their container keys still participate in the diff. Only their user-sized
 * contents are skipped.
 */
export const GROWSPACE_OPAQUE_PATHS: ReadonlySet<string> = new Set([
  '**.active_events',
  '**.daily_readings',
  '**.irrigation_tanks',
  '**.sensor_groups',
]);

const INNER_TYPE_WRAPPERS = new Set([
  'catch',
  'default',
  'nonoptional',
  'nullable',
  'optional',
  'prefault',
  'readonly',
]);

function definition(schema: z.ZodType): SchemaDefinition {
  return schema.def as SchemaDefinition;
}

function structuralSchema(schema: z.ZodType): z.ZodType {
  let current = schema;

  for (;;) {
    const def = definition(current);
    if (INNER_TYPE_WRAPPERS.has(def.type) && def.innerType) {
      current = def.innerType;
      continue;
    }
    if (def.type === 'lazy' && def.getter) {
      current = def.getter();
      continue;
    }
    if (def.type === 'pipe' && def.out) {
      current = def.out;
      continue;
    }
    return current;
  }
}

function inputAcceptsUndefined(schema: z.ZodType): boolean {
  // This probes the schema's input contract. Inspecting z.infer/z.output would
  // incorrectly make optional().default(...) properties look required in Zod 4.
  return schema.safeParse(undefined).success;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function propertyPath(parent: string, key: string): string {
  return /^[A-Za-z_$][\w$]*$/.test(key) ? `${parent}.${key}` : `${parent}[${JSON.stringify(key)}]`;
}

function childState(state: WalkState, key: string): WalkState {
  return {
    ...state,
    fixturePath: propertyPath(state.fixturePath, key),
    schemaPath: propertyPath(state.schemaPath, key),
  };
}

function isOpaquePath(path: string, opaquePaths: ReadonlySet<string>): boolean {
  if (opaquePaths.has(path)) return true;
  for (const pattern of opaquePaths) {
    if (pattern.startsWith('**.') && path.endsWith(pattern.slice(2))) return true;
  }
  return false;
}

function selectUnionOption(options: z.ZodType[], fixture: unknown): z.ZodType | undefined {
  const parsed = options.find((option) => option.safeParse(fixture).success);
  if (parsed) return parsed;

  const fixtureKind = Array.isArray(fixture) ? 'array' : isObject(fixture) ? 'object' : undefined;
  return fixtureKind
    ? options.find((option) => definition(structuralSchema(option)).type === fixtureKind)
    : undefined;
}

function walk(schema: z.ZodType, fixture: unknown, state: WalkState): void {
  if (isOpaquePath(state.schemaPath, state.opaquePaths)) return;

  const current = structuralSchema(schema);
  const def = definition(current);

  if (def.type === 'union' && def.options) {
    const option = selectUnionOption(def.options, fixture);
    if (option) walk(option, fixture, state);
    return;
  }

  if (def.type === 'object' && def.shape && isObject(fixture)) {
    if (state.verdict === 'completeness') {
      for (const key of Object.keys(fixture)) {
        if (!(key in def.shape)) {
          state.drift.push({
            kind: 'fixture-key-not-declared',
            objectPath: state.fixturePath,
            key,
            path: propertyPath(state.fixturePath, key),
          });
        }
      }
    } else {
      for (const [key, propertySchema] of Object.entries(def.shape)) {
        if (!inputAcceptsUndefined(propertySchema) && !(key in fixture)) {
          state.drift.push({
            kind: 'required-input-key-missing',
            objectPath: state.fixturePath,
            key,
            path: propertyPath(state.fixturePath, key),
          });
        }
      }
    }

    for (const [key, propertySchema] of Object.entries(def.shape)) {
      if (key in fixture) walk(propertySchema, fixture[key], childState(state, key));
    }
    return;
  }

  if (def.type === 'array' && def.element && Array.isArray(fixture)) {
    fixture.forEach((value, index) =>
      walk(def.element!, value, {
        ...state,
        fixturePath: `${state.fixturePath}[${index}]`,
        schemaPath: `${state.schemaPath}[]`,
      })
    );
    return;
  }

  if (def.type === 'record' && def.valueType && isObject(fixture)) {
    for (const [key, value] of Object.entries(fixture)) {
      walk(def.valueType, value, {
        ...state,
        fixturePath: propertyPath(state.fixturePath, key),
        schemaPath: `${state.schemaPath}.*`,
      });
    }
  }
}

export function diffContractKeys(
  schema: z.ZodType,
  fixture: unknown,
  verdict: ContractVerdict,
  options: DiffOptions = {}
): ContractKeyDrift[] {
  const drift: ContractKeyDrift[] = [];
  walk(schema, fixture, {
    drift,
    fixturePath: '$',
    opaquePaths: options.opaquePaths ?? GROWSPACE_OPAQUE_PATHS,
    schemaPath: '$',
    verdict,
  });
  return drift;
}

export function formatContractDrift(drift: ContractKeyDrift): string {
  return drift.kind === 'fixture-key-not-declared'
    ? `${drift.objectPath}: fixture key ${JSON.stringify(drift.key)} is not declared by the schema`
    : `${drift.objectPath}: input-required schema key ${JSON.stringify(drift.key)} is missing from the fixture`;
}
