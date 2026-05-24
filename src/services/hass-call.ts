import { HomeAssistant } from 'custom-card-helpers';
import { z } from 'zod';
import { WSError } from './base-api';

let _hass: HomeAssistant | undefined;

/**
 * Call a Home Assistant service through the shared hass reference.
 * Use for fire-and-forget mutations (water_plant, add_plant, etc.).
 */
export async function callService(
  domain: string,
  service: string,
  serviceData: Record<string, unknown> = {},
): Promise<void> {
  if (!_hass) {
    throw new WSError('internal_error', 'callService: hass is not set — call setHass() first');
  }
  await _hass.callService(domain, service, serviceData);
}

/**
 * Inject the current HomeAssistant instance.
 * Called once at card init and again whenever `hass` changes.
 */
export function setHass(hass: HomeAssistant): void {
  _hass = hass;
}

/**
 * Single transport seam to Home Assistant.
 *
 * Sends a WebSocket message, validates the response with a zod schema, and
 * returns the typed result. Throws a typed WSError on backend errors or when
 * the response does not match the schema.
 *
 * @param command - WebSocket message type (e.g. 'growspace_manager/water_plant')
 * @param params  - Additional fields merged into the WebSocket message
 * @param schema  - Zod schema to validate and narrow the response
 */
export async function hassCall<T>(
  command: string,
  params: Record<string, unknown>,
  schema: z.ZodType<T>,
): Promise<T> {
  if (!_hass) {
    throw new WSError('internal_error', 'hassCall: hass is not set — call setHass() first');
  }

  let raw: unknown;
  try {
    raw = await _hass.callWS<unknown>({ type: command, ...params });
  } catch (error: unknown) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      'message' in error &&
      typeof (error as Record<string, unknown>).code === 'string'
    ) {
      const { code, message } = error as { code: string; message: string };
      throw new WSError(
        (['coordinator_not_ready', 'entity_not_found', 'validation_failed', 'internal_error'].includes(code)
          ? code
          : 'internal_error') as ConstructorParameters<typeof WSError>[0],
        message,
      );
    }
    throw new WSError(
      'internal_error',
      error instanceof Error ? error.message : String(error),
    );
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    throw new WSError(
      'internal_error',
      `hassCall: response schema mismatch for "${command}": ${parsed.error.message}`,
    );
  }

  return parsed.data;
}
